import { Request, Response, NextFunction } from 'express';
import { verifyToken, extractTokenFromHeader } from '../utils/jwt';
import { UnauthorizedError, ForbiddenError } from '../utils/errors';
import logger from '../config/logger';
import { SessionData } from 'express-session';

// Extend SessionData interface to include csrfToken
declare module 'express-session' {
  interface SessionData {
    csrfToken?: string;
    userId?: string;
  }
}

// User type is now defined in src/types/express.d.ts

/**
 * Middleware to authenticate requests using JWT
 */
export const authenticate = (req: Request, res: Response, next: NextFunction): void => {
  try {
    // Check for token in authorization header
    const authHeader = req.headers.authorization;
    const token = extractTokenFromHeader(authHeader);
    
    // Check for token in cookies as fallback
    const cookieToken = req.cookies?.access_token;
    
    // If no token found in either place
    if (!token && !cookieToken) {
      // For session and examples endpoints, continue without authentication
      if (req.path === '/session' || req.path === '/messages/examples') {
        logger.debug('No token found, but continuing for special endpoint', { path: req.path });
        return next();
      }
      throw new UnauthorizedError('Authentication required');
    }
    
    // Verify the token (prioritize header token over cookie)
    const tokenToVerify = token || cookieToken;
    
    try {
      const decoded = verifyToken(tokenToVerify);
      
      // Attach user to request
      req.user = {
        id: decoded.id,
        email: decoded.email,
        role: decoded.role
      };
      
      logger.debug('User authenticated successfully', {
        userId: decoded.id,
        path: req.path
      });
      
      next();
    } catch (tokenError) {
      logger.warn(`Token verification failed: ${tokenError instanceof Error ? tokenError.message : 'Unknown error'}`, {
        path: req.path,
        method: req.method
      });
      
      // For session endpoint, continue without authentication
      if (req.path === '/session' || req.path === '/messages/examples') {
        logger.debug('Token verification failed, but continuing for special endpoint', { path: req.path });
        return next();
      }
      
      throw new UnauthorizedError('Invalid authentication token');
    }
  } catch (error) {
    // For any error in the authentication process, pass it to the next middleware
    next(error);
  }
};

/**
 * Middleware to check if user has admin role
 */
export const requireAdmin = (req: Request, res: Response, next: NextFunction): void => {
  try {
    // First ensure user is authenticated
    if (!req.user) {
      throw new UnauthorizedError('Authentication required');
    }
    
    // Check if user has admin role
    if (req.user.role !== 'admin') {
      logger.warn('Unauthorized admin access attempt', { 
        userId: req.user.id,
        email: req.user.email,
        path: req.path
      });
      throw new ForbiddenError('Admin access required');
    }
    
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware to validate CSRF token
 */
export const validateCsrf = (req: Request, res: Response, next: NextFunction): void => {
  try {
    // Skip CSRF validation for non-mutating methods
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      return next();
    }
    
    // Get CSRF token from headers
    const csrfToken = req.headers['x-csrf-token'] as string;
    
    // Get expected CSRF token from session
    const expectedCsrfToken = req.session?.csrfToken;
    
    // Validate CSRF token
    if (!csrfToken || !expectedCsrfToken || csrfToken !== expectedCsrfToken) {
      logger.warn('CSRF validation failed', { 
        path: req.path,
        method: req.method,
        ip: req.ip
      });
      throw new ForbiddenError('Invalid or missing CSRF token');
    }
    
    next();
  } catch (error) {
    next(error);
  }
};