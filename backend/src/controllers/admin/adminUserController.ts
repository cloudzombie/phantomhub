import { Request, Response } from 'express';
import User from '../../models/User';
import { Op } from 'sequelize';
import bcrypt from 'bcryptjs';
import logger from '../../utils/logger';

// Interface for the authenticated request with user info
interface AuthRequest extends Request {
  user?: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

/**
 * Get all users with pagination and filtering
 */
export const getAllUsers = async (req: Request, res: Response): Promise<Response> => {
  try {
    // Parse query parameters
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = req.query.search as string || '';
    const role = req.query.role as string || '';
    const sortBy = req.query.sortBy as string || 'createdAt';
    const sortOrder = req.query.sortOrder as string || 'DESC';
    
    // Calculate offset for pagination
    const offset = (page - 1) * limit;
    
    // Build where clause for filtering
    const whereClause: any = {};
    
    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } }
      ];
    }
    
    if (role) {
      whereClause.role = role;
    }
    
    // Query users with pagination and filtering
    const { count, rows } = await User.findAndCountAll({
      where: whereClause,
      order: [[sortBy, sortOrder]],
      limit,
      offset,
      attributes: { exclude: ['password'] } // Exclude password from results
    });
    
    // Calculate pagination metadata
    const totalPages = Math.ceil(count / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;
    
    logger.info(`Admin requested user list. Found ${count} users.`);
    
    return res.status(200).json({
      success: true,
      data: rows,
      pagination: {
        totalItems: count,
        totalPages,
        currentPage: page,
        hasNextPage,
        hasPrevPage
      }
    });
  } catch (error) {
    logger.error('Error getting users:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve users'
    });
  }
};

/**
 * Get detailed user information by ID
 */
export const getUserById = async (req: Request, res: Response): Promise<Response> => {
  try {
    const userId = req.params.id;
    
    // Find user by ID
    const user = await User.findByPk(userId, {
      attributes: { exclude: ['password'] } // Exclude password from results
    });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    logger.info(`Admin viewed user details for user ID: ${userId}`);
    
    return res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    logger.error(`Error getting user by ID: ${req.params.id}`, error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve user information'
    });
  }
};

/**
 * Create a new user
 */
export const createUser = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { name, email, password, role } = req.body;
    
    // Validate required fields
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and password are required'
      });
    }
    
    // Check if user with this email already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create new user
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role: role || 'user',
      isActive: true,
      failedLoginAttempts: 0,
      mfaEnabled: false,
      sessionTimeout: 3600,
      requirePasswordChange: true
    });
    
    // Log action
    const adminUser = (req as AuthRequest).user;
    logger.info(`Admin ${adminUser?.name} (${adminUser?.id}) created new user: ${email} with role: ${role || 'user'}`);
    
    return res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    logger.error('Error creating user:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create user'
    });
  }
};

/**
 * Update user information
 */
export const updateUser = async (req: Request, res: Response): Promise<Response> => {
  try {
    const userId = req.params.id;
    const { name, email, isActive } = req.body;
    
    // Find user by ID
    const user = await User.findByPk(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Update user fields
    if (name) user.name = name;
    if (email) user.email = email;
    if (isActive !== undefined) user.isActive = isActive;
    
    await user.save();
    
    // Log action
    const adminUser = (req as AuthRequest).user;
    logger.info(`Admin ${adminUser?.name} (${adminUser?.id}) updated user: ${userId}`);
    
    return res.status(200).json({
      success: true,
      message: 'User updated successfully',
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        updatedAt: user.updatedAt
      }
    });
  } catch (error) {
    logger.error(`Error updating user: ${req.params.id}`, error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update user'
    });
  }
};

/**
 * Delete or deactivate a user
 */
export const deleteUser = async (req: Request, res: Response): Promise<Response> => {
  try {
    const userId = req.params.id;
    const hardDelete = req.query.hard === 'true';
    
    // Find user by ID
    const user = await User.findByPk(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Check if trying to delete the only admin
    if (user.role === 'admin') {
      const adminCount = await User.count({ where: { role: 'admin' } });
      if (adminCount <= 1) {
        return res.status(400).json({
          success: false,
          message: 'Cannot delete the only admin user'
        });
      }
    }
    
    // Log action
    const adminUser = (req as AuthRequest).user;
    
    if (hardDelete) {
      // Permanently delete the user
      await user.destroy();
      logger.warn(`Admin ${adminUser?.name} (${adminUser?.id}) permanently deleted user: ${userId}`);
      
      return res.status(200).json({
        success: true,
        message: 'User permanently deleted'
      });
    } else {
      // Soft delete by deactivating the user
      user.isActive = false;
      await user.save();
      
      logger.info(`Admin ${adminUser?.name} (${adminUser?.id}) deactivated user: ${userId}`);
      
      return res.status(200).json({
        success: true,
        message: 'User deactivated successfully'
      });
    }
  } catch (error) {
    logger.error(`Error deleting user: ${req.params.id}`, error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete user'
    });
  }
};

/**
 * Change user role
 */
export const changeUserRole = async (req: Request, res: Response): Promise<Response> => {
  try {
    const userId = req.params.id;
    const { role } = req.body;
    
    // Validate role
    const validRoles = ['user', 'operator', 'admin'];
    if (!role || !validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role. Must be one of: user, operator, admin'
      });
    }
    
    // Find user by ID
    const user = await User.findByPk(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Check if trying to demote the only admin
    if (user.role === 'admin' && role !== 'admin') {
      const adminCount = await User.count({ where: { role: 'admin' } });
      if (adminCount <= 1) {
        return res.status(400).json({
          success: false,
          message: 'Cannot demote the only admin user'
        });
      }
    }
    
    // Update user role
    user.role = role;
    await user.save();
    
    // Log action
    const adminUser = (req as AuthRequest).user;
    logger.info(`Admin ${adminUser?.name} (${adminUser?.id}) changed role of user ${userId} to ${role}`);
    
    return res.status(200).json({
      success: true,
      message: `User role updated to ${role}`,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        updatedAt: user.updatedAt
      }
    });
  } catch (error) {
    logger.error(`Error changing user role: ${req.params.id}`, error);
    return res.status(500).json({
      success: false,
      message: 'Failed to change user role'
    });
  }
};

/**
 * Force password reset for a user
 */
export const resetUserPassword = async (req: Request, res: Response): Promise<Response> => {
  try {
    const userId = req.params.id;
    const { newPassword } = req.body;
    
    // Validate new password
    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 8 characters long'
      });
    }
    
    // Find user by ID
    const user = await User.findByPk(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Update user password
    user.password = hashedPassword;
    user.requirePasswordChange = true;
    await user.save();
    
    // Log action
    const adminUser = (req as AuthRequest).user;
    logger.warn(`Admin ${adminUser?.name} (${adminUser?.id}) reset password for user: ${userId}`);
    
    return res.status(200).json({
      success: true,
      message: 'User password reset successfully'
    });
  } catch (error) {
    logger.error(`Error resetting user password: ${req.params.id}`, error);
    return res.status(500).json({
      success: false,
      message: 'Failed to reset user password'
    });
  }
};
