/// <reference path="../types/express.d.ts" />
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { authenticateWithWordPress, createSessionData } from '../services/authService';
import { BadRequestError } from '../utils/errors';
import { SESSION_COOKIE_MAX_AGE } from '../config/env';
import logger from '../config/logger';

/**
 * Get current user session
 * @route GET /api/auth/session
 */
export const getSession = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Check if user is authenticated
    if (!req.user) {
      // Return empty session data with 200 status instead of error
      res.status(200).json({
        status: 'success',
        data: {
          user: null,
          authenticated: false
        }
      });
      return;
    }
    
    try {
      // Get user data
      try {
        const { getUserById } = await import('../services/userService');
        const user = await getUserById(req.user.id);
        
        // Create session data for client
        const sessionData = createSessionData(user);
        
        // Generate new CSRF token
        const csrfToken = uuidv4();
        req.session.csrfToken = csrfToken;
        
        res.status(200).json({
          status: 'success',
          data: {
            user: sessionData,
            authenticated: true,
            csrfToken
          }
        });
      } catch (userError) {
        logger.error('Error in getSession', {
          userId: req.user.id,
          error: userError instanceof Error ? userError.message : 'Unknown error'
        });
        
        // Instead of throwing the error, return a response indicating authentication issue
        res.status(200).json({
          status: 'success',
          data: {
            user: null,
            authenticated: false,
            message: 'Failed to retrieve user data'
          }
        });
      }
    } catch (userError) {
      logger.error('Unexpected error in getSession', {
        userId: req.user?.id,
        error: userError instanceof Error ? userError.message : 'Unknown error'
      });
      
      // Return a generic response instead of throwing
      res.status(200).json({
        status: 'success',
        data: {
          user: null,
          authenticated: false,
          message: 'Session error'
        }
      });
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Logout user
 * @route POST /api/auth/logout
 */
export const logout = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    // Clear session
    req.session.destroy((err) => {
      if (err) {
        logger.error('Error destroying session', { error: err });
        return next(err);
      }
      
      // Clear access token cookie
      res.clearCookie('access_token');
      
      // Log successful logout
      if (req.user) {
        logger.info('User logged out', { userId: req.user.id });
      }
      
      res.status(200).json({
        status: 'success',
        message: 'Logged out successfully'
      });
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handle WordPress authentication
 * @route POST /api/auth/login
 */
export const wordpressAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { username, password } = req.body; // username is actually the email
    
    if (!username || !password) {
      throw new BadRequestError('Email and password are required');
    }
    
    try {
      // Authenticate with WordPress using email
      const { user, accessToken } = await authenticateWithWordPress(username, password, req);
      
      // Generate CSRF token
      const csrfToken = uuidv4();
      
      // Store user ID and CSRF token in session
      req.session.userId = user.id;
      req.session.csrfToken = csrfToken;
      
      // Create session data for client
      const sessionData = createSessionData(user);
      
      // Set HTTP-only cookie with access token
      res.cookie('access_token', accessToken, {
        httpOnly: true,
        secure: req.secure || req.headers['x-forwarded-proto'] === 'https',
        sameSite: 'strict',
        maxAge: SESSION_COOKIE_MAX_AGE
      });
      
      // Log successful authentication
      logger.info('User authenticated successfully', {
        userId: user.id,
        method: 'wordpress'
      });
      
      // Return user data and CSRF token
      res.status(200).json({
        status: 'success',
        data: {
          user: sessionData,
          csrfToken
        }
      });
    } catch (authError) {
      logger.error('Authentication error', {
        email: username,
        error: authError instanceof Error ? authError.message : 'Unknown error'
      });
      throw authError;
    }
  } catch (error) {
    next(error);
  }
};