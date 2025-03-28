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

    return res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
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

    logger.debug(`Login successful for user: ${email}`);
    return res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
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