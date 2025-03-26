/**
 * Rate Limiter Middleware
 * 
 * Implements API rate limiting for protecting endpoints from abuse
 * and ensuring fair usage of the API.
 */

import { Request, Response, NextFunction } from 'express';
import { RateLimiterRedis } from 'rate-limiter-flexible';
import { Redis } from 'ioredis';
import rateLimit from 'express-rate-limit';
import logger from '../utils/logger';

// Import parse REDIS_URL function
// Parse REDIS_URL if available (Heroku provides this)
const getRedisConfig = () => {
  if (process.env.REDIS_URL) {
    try {
      const redisUrl = new URL(process.env.REDIS_URL);
      // For secure Redis connections (rediss://)
      const isSecureRedis = process.env.REDIS_URL.startsWith('rediss://');
      
      return {
        host: redisUrl.hostname,
        port: Number(redisUrl.port),
        password: redisUrl.password,
        tls: isSecureRedis || process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined
      };
    } catch (error) {
      console.error('Error parsing REDIS_URL:', error);
    }
  }
  return {
    host: process.env.REDIS_HOST || 'localhost',
    port: Number(process.env.REDIS_PORT || 6379),
    password: process.env.REDIS_PASSWORD || undefined
  };
};

// Initialize Redis client for rate limiting
const redis = new Redis(getRedisConfig());

// Type for API routes
export type ApiEndpoint = 'auth' | 'devices' | 'payloads' | 'deployments' | 'system' | 'users' | 'scripts';

// Advanced rate limiter configuration
interface RateLimiterConfig {
  points: number;      // Maximum number of requests
  duration: number;    // Time window in seconds
  blockDuration?: number; // Block duration in seconds
  keyPrefix: string;   // Prefix for Redis keys
  errorMessage: string; // Error message to return
}

// Configure rate limits for different endpoint groups
const rateLimiterConfigs: Record<ApiEndpoint, RateLimiterConfig> = {
  auth: {
    points: 5,           // 5 requests
    duration: 60,        // per 60 seconds (1 minute)
    blockDuration: 300,  // Block for 5 minutes after exceeding limit
    keyPrefix: 'rl:auth',
    errorMessage: 'Too many authentication attempts, please try again later'
  },
  devices: {
    points: 30,         // 30 requests
    duration: 60,       // per 60 seconds
    keyPrefix: 'rl:devices',
    errorMessage: 'Rate limit exceeded for device operations'
  },
  payloads: {
    points: 20,         // 20 requests
    duration: 60,       // per 60 seconds
    keyPrefix: 'rl:payloads',
    errorMessage: 'Rate limit exceeded for payload operations'
  },
  deployments: {
    points: 15,         // 15 requests
    duration: 60,       // per 60 seconds
    keyPrefix: 'rl:deployments',
    errorMessage: 'Rate limit exceeded for deployment operations'
  },
  system: {
    points: 10,         // 10 requests
    duration: 60,       // per 60 seconds
    keyPrefix: 'rl:system',
    errorMessage: 'Rate limit exceeded for system operations'
  },
  users: {
    points: 20,         // 20 requests
    duration: 60,       // per 60 seconds
    keyPrefix: 'rl:users',
    errorMessage: 'Rate limit exceeded for user operations'
  },
  scripts: {
    points: 25,         // 25 requests
    duration: 60,       // per 60 seconds
    keyPrefix: 'rl:scripts',
    errorMessage: 'Rate limit exceeded for script operations'
  }
};

// Create rate limiters for each endpoint group
const rateLimiters: Record<ApiEndpoint, RateLimiterRedis> = Object.entries(rateLimiterConfigs)
  .reduce((acc, [endpoint, config]) => {
    acc[endpoint as ApiEndpoint] = new RateLimiterRedis({
      storeClient: redis,
      keyPrefix: config.keyPrefix,
      points: config.points,
      duration: config.duration,
      blockDuration: config.blockDuration,
    });
    return acc;
  }, {} as Record<ApiEndpoint, RateLimiterRedis>);

/**
 * Creates a rate limiter middleware for a specific API endpoint
 * 
 * @param endpoint The API endpoint to create rate limiter for
 */
export const createRateLimiterMiddleware = (endpoint: ApiEndpoint) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Use IP and user ID (if authenticated) for rate limiting
      const userId = (req as any).user?.id || 'anonymous';
      const key = `${req.ip || 'unknown'}:${userId}`;
      
      await rateLimiters[endpoint].consume(key);
      next();
    } catch (error) {
      logger.warn(`Rate limit exceeded for ${endpoint} endpoint by ${req.ip}`);
      res.status(429).json({ 
        success: false,
        message: rateLimiterConfigs[endpoint].errorMessage
      });
    }
  };
};

// Fallback rate limiter using express-rate-limit (doesn't require Redis)
export const fallbackRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // limit each IP to 30 requests per minute
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Global rate limiter to protect against DoS attacks
export const globalRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 500, // limit each IP to 500 requests per 5 minutes
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false,
}); 