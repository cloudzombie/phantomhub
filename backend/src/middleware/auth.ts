/**
 * Authentication Middleware
 * 
 * Enterprise-grade authentication with RBAC, rate limiting,
 * token blacklisting, and comprehensive security measures
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import { Redis } from 'ioredis';
import logger from '../utils/logger';
import User from '../models/User';
import { RateLimiterRedis } from 'rate-limiter-flexible';

// Initialize Redis client for token blacklist and rate limiting
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT || 6379),
  password: process.env.REDIS_PASSWORD || undefined,
  enableReadyCheck: true,
  maxRetriesPerRequest: 3
});

// Rate limiter configuration
const rateLimiter = new RateLimiterRedis({
  storeClient: redis,
  keyPrefix: 'middleware',
  points: 10, // 10 requests
  duration: 1, // per 1 second
});

interface JwtPayload {
  id: string;
  email: string;
  role: UserRole;
  sessionId: string;
  exp?: number;  // JWT expiration timestamp
  iat?: number;  // JWT issued at timestamp
}

// Extend Express Request type to include user
export interface AuthRequest extends Request {
  user?: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    permissions: string[];
  };
}

// Define user roles and their hierarchy
export type UserRole = 'admin' | 'operator' | 'user';
const roleHierarchy: Record<UserRole, number> = {
  admin: 3,
  operator: 2,
  user: 1
};

// Define permissions for each role
const rolePermissions: Record<UserRole, string[]> = {
  admin: ['*'], // Admin has all permissions
  operator: [
    'read:devices',
    'write:devices',
    'read:payloads',
    'write:payloads',
    'read:deployments',
    'write:deployments'
  ],
  user: [
    'read:devices',
    'read:payloads',
    'read:deployments'
  ]
};

// Check if a role has a specific permission
const hasPermission = (role: UserRole, requiredPermission: string): boolean => {
  const permissions = rolePermissions[role];
  return permissions.includes('*') || permissions.includes(requiredPermission);
};

// Rate limiting middleware
export const rateLimitMiddleware = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later'
});

// Token blacklist check
const isTokenBlacklisted = async (token: string): Promise<boolean> => {
  const blacklisted = await redis.get(`blacklist:${token}`);
  return !!blacklisted;
};

// Authentication middleware
export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Rate limiting
    try {
      await rateLimiter.consume(req.ip || 'unknown');
    } catch (error) {
      res.status(429).json({ error: 'Too many requests' });
      return;
    }

    console.log('Running authenticate middleware');
    console.log('Headers:', JSON.stringify(req.headers));
    
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      console.log('No authorization header found');
      res.status(401).json({ error: 'No authorization header' });
      return;
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      console.log('No token provided in Authorization header');
      res.status(401).json({ error: 'No token provided' });
      return;
    }
    
    console.log('Token received, checking blacklist');

    // Check if token is blacklisted
    if (await isTokenBlacklisted(token)) {
      console.log('Token is blacklisted');
      res.status(401).json({ error: 'Token has been revoked' });
      return;
    }

    console.log('Verifying token with JWT_SECRET');
    
    // Verify token
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'your-secret-key'
    ) as JwtPayload;
    
    console.log('Token decoded successfully:', JSON.stringify(decoded));
    
    // Find user and include their permissions
    const user = await User.findByPk(decoded.id);
    if (!user) {
      console.log(`User with ID ${decoded.id} not found`);
      res.status(401).json({ error: 'User not found' });
      return;
    }

    // Check if user is active
    if (!user.isActive) {
      console.log(`User ${user.id} is inactive`);
      res.status(401).json({ error: 'User account is inactive' });
      return;
    }

    console.log(`User found: ${user.id}, role: ${user.role}`);
    
    // Attach user and their permissions to request
    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      permissions: rolePermissions[user.role]
    };

    // Update last activity
    await user.update({ lastLogin: new Date() });
    
    console.log('Authentication successful, proceeding to next middleware/handler');
    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    console.error('Authentication error details:', error);
    
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({ error: 'Token has expired' });
    } else if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({ error: 'Invalid token' });
    } else {
      res.status(401).json({ error: 'Authentication failed' });
    }
  }
};

// Permission middleware factory
export const requirePermission = (permission: string) => {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    if (!hasPermission(req.user.role, permission)) {
      res.status(403).json({ error: `Required permission: ${permission}` });
      return;
    }

    next();
  };
};

// Role middleware factory
export const requireRole = (minimumRole: UserRole) => {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const userRoleLevel = roleHierarchy[req.user.role];
    const requiredRoleLevel = roleHierarchy[minimumRole];

    if (userRoleLevel < requiredRoleLevel) {
      res.status(403).json({ error: `Required role: ${minimumRole}` });
      return;
    }

    next();
  };
};

// Convenience middleware for common roles
export const isAdmin = requireRole('admin');
export const isOperator = requireRole('operator');

// Token blacklisting (for logout)
export const blacklistToken = async (token: string): Promise<void> => {
  try {
    const decoded = jwt.decode(token) as JwtPayload;
    if (decoded && decoded.exp) {
      const timeToExpiry = decoded.exp - Math.floor(Date.now() / 1000);
      await redis.setex(`blacklist:${token}`, timeToExpiry, 'true');
    }
  } catch (error) {
    logger.error('Error blacklisting token:', error);
    throw error;
  }
}; 