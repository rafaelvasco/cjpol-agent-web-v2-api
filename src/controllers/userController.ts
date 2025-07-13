/// <reference path="../types/express.d.ts" />
import { Request, Response, NextFunction } from 'express';
import { getUserById, updateUser, getAllUsers } from '../services/userService';
import { BadRequestError, ForbiddenError } from '../utils/errors';
import logger from '../config/logger';

/**
 * Get current user profile
 * @route GET /api/users/me
 */
export const getCurrentUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new BadRequestError('User not authenticated');
    }
    
    const user = await getUserById(req.user.id);
    
    res.status(200).json({
      status: 'success',
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          credits: user.credits,
          subscription: user.subscription,
          active: user.active,
          picture: user.picture,
          created_at: user.created_at,
          updated_at: user.updated_at
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update current user profile
 * @route PATCH /api/users/me
 */
export const updateCurrentUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new BadRequestError('User not authenticated');
    }
    
    // Only allow updating certain fields
    const { name } = req.body;
    
    // Validate input
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      throw new BadRequestError('Valid name is required');
    }
    
    // Update user
    const updatedUser = await updateUser(req.user.id, { name });
    
    // Log user update
    logger.info('User profile updated', { userId: req.user.id });
    
    res.status(200).json({
      status: 'success',
      data: {
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          name: updatedUser.name,
          role: updatedUser.role,
          credits: updatedUser.credits,
          subscription: updatedUser.subscription,
          active: updatedUser.active,
          picture: updatedUser.picture,
          created_at: updatedUser.created_at,
          updated_at: updatedUser.updated_at
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get user by ID (admin only)
 * @route GET /api/users/:id
 */
export const getUserByIdAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new BadRequestError('User not authenticated');
    }
    
    // Check if user is admin
    if (req.user.role !== 'admin') {
      throw new ForbiddenError('Admin access required');
    }
    
    const { id } = req.params;
    const user = await getUserById(id);
    
    res.status(200).json({
      status: 'success',
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          credits: user.credits,
          subscription: user.subscription,
          active: user.active,
          wordpress_id: user.wordpress_id,
          created_at: user.created_at,
          updated_at: user.updated_at
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all users (admin only)
 * @route GET /api/users
 */
export const getAllUsersAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new BadRequestError('User not authenticated');
    }
    
    // Check if user is admin
    if (req.user.role !== 'admin') {
      throw new ForbiddenError('Admin access required');
    }
    
    const users = await getAllUsers();
    
    res.status(200).json({
      status: 'success',
      data: {
        users: users.map(user => ({
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          credits: user.credits,
          subscription: user.subscription,
          active: user.active,
          wordpress_id: user.wordpress_id,
          created_at: user.created_at,
          updated_at: user.updated_at
        }))
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update user by ID (admin only)
 * @route PATCH /api/users/:id
 */
export const updateUserAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new BadRequestError('User not authenticated');
    }
    
    // Check if user is admin
    if (req.user.role !== 'admin') {
      throw new ForbiddenError('Admin access required');
    }
    
    const { id } = req.params;
    const { name, role, credits, subscription, active } = req.body;
    
    // Update user
    const updatedUser = await updateUser(id, {
      ...(name && { name }),
      ...(role && { role }),
      ...(credits !== undefined && { credits }),
      ...(subscription && { subscription }),
      ...(active !== undefined && { active })
    });
    
    // Log admin update
    logger.info('User updated by admin', { 
      adminId: req.user.id,
      userId: id,
      changes: req.body
    });
    
    res.status(200).json({
      status: 'success',
      data: {
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          name: updatedUser.name,
          role: updatedUser.role,
          credits: updatedUser.credits,
          subscription: updatedUser.subscription,
          active: updatedUser.active,
          wordpress_id: updatedUser.wordpress_id,
          created_at: updatedUser.created_at,
          updated_at: updatedUser.updated_at
        }
      }
    });
  } catch (error) {
    next(error);
  }
};