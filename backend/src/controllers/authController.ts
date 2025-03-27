import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import logger from '../utils/logger';

// Extend Request type to include user
interface AuthenticatedRequest extends Request {
  user?: User;
}

// Register a new user
export const register = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { name, email, password, role } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists',
      });
    }

    // Create new user with validated role
    const user = await User.create({
      name,
      email,
      password,
      role: role || 'user',
      isActive: true,
      failedLoginAttempts: 0,
      mfaEnabled: false,
      sessionTimeout: 3600,
      requirePasswordChange: true
    });

    // Generate JWT token
    const secret = process.env.JWT_SECRET || 'default_secret';
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      secret,
      { expiresIn: '7d' }
    );

    // Set HTTP-only cookie with the token
    res.cookie('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // Secure in production
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
      path: '/',
      domain: process.env.NODE_ENV === 'production' ? '.herokuapp.com' : undefined
    });

    return res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token, // Still include token in response for backward compatibility
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    logger.error('Registration error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error registering user',
    });
  }
};

// Login
export const login = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { email, password } = req.body;
    logger.debug(`Login attempt for email: ${email}`);

    // Find user by email
    const user = await User.findOne({ where: { email } });
    if (!user) {
      logger.debug(`No user found with email: ${email}`);
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    // Verify password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      logger.debug(`Invalid password for user: ${email}`);
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate JWT token
    const secret = process.env.JWT_SECRET || 'default_secret';
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      secret,
      { expiresIn: '7d' }
    );

    // Set HTTP-only cookie with the token
    res.cookie('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // Secure in production
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
      path: '/',
      domain: process.env.NODE_ENV === 'production' ? '.herokuapp.com' : undefined
    });

    logger.debug(`Login successful for user: ${email}`);
    return res.status(200).json({
      success: true,
      message: 'Login successful',
      token, // Still include token in response for backward compatibility
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    logger.error('Login error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error during login',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// Sync token endpoint to persist authentication tokens on the server
export const syncToken = async (req: Request, res: Response): Promise<Response> => {
  try {
    // Get token from either request body or cookie
    let token = req.body.token;
    
    // If no token in body, try to get from cookie
    if (!token && req.cookies && req.cookies.auth_token) {
      token = req.cookies.auth_token;
    }
    
    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Token is required'
      });
    }
    
    // Verify the token is valid before storing it
    try {
      const secret = process.env.JWT_SECRET || 'default_secret';
      const decoded = jwt.verify(token, secret);
      const userId = (decoded as any).id;
      
      if (!userId) {
        return res.status(400).json({
          success: false,
          message: 'Invalid token format'
        });
      }
      
      // Set HTTP-only cookie with the token if it came from body
      if (req.body.token) {
        res.cookie('auth_token', token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
          path: '/',
          domain: process.env.NODE_ENV === 'production' ? '.herokuapp.com' : undefined
        });
      }
      
      // Find the user to ensure they exist
      const user = await User.findByPk(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }
      
      // Store the token in user's session data (you could create a Session model for this)
      // For now, we'll just update a lastActive timestamp as a simple way to track sessions
      await user.update({ 
        lastLogin: new Date(),
        sessionToken: token // Adding token to user record for persistence
      });
      
      logger.info(`Token synchronized for user ${userId}`);
      return res.status(200).json({
        success: true,
        message: 'Token synchronized successfully'
      });
    } catch (jwtError) {
      logger.error('Token sync error - Invalid token:', jwtError);
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
  } catch (error) {
    logger.error('Token sync error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error synchronizing token'
    });
  }
};

// Check authentication status
export const checkAuth = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
  try {
    // If the request made it past the authentication middleware,
    // the user is authenticated
    if (req.user) {
      return res.status(200).json({
        success: true,
        message: 'Authenticated',
        user: {
          id: req.user.id,
          name: req.user.name,
          email: req.user.email,
          role: req.user.role
        }
      });
    } else {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated'
      });
    }
  } catch (error) {
    logger.error('Error checking authentication:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error checking authentication'
    });
  }
};

// Get current user
export const getCurrentUser = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated',
      });
    }

    return res.status(200).json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        lastLogin: user.lastLogin,
      },
    });
  } catch (error) {
    logger.error('Get current user error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching user data',
    });
  }
};

// Logout user
export const logout = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
  try {
    // Clear the auth cookie
    res.clearCookie('auth_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      domain: process.env.NODE_ENV === 'production' ? '.herokuapp.com' : undefined
    });
    
    // Also clear any theme or preference cookies
    res.clearCookie('theme_preference', {
      path: '/',
      domain: process.env.NODE_ENV === 'production' ? '.herokuapp.com' : undefined
    });
    
    return res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    logger.error('Logout error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error during logout'
    });
  }
};