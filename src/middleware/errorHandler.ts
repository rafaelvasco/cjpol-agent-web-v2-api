import { Request, Response, NextFunction } from 'express';
import { isApiError, toApiError, ApiError } from '../utils/errors';
import logger from '../config/logger';
import { IS_PRODUCTION } from '../config/env';

/**
 * Global error handling middleware
 */
export const errorHandler = (
  err: Error | ApiError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Check if response has already been sent
  if (res.headersSent) {
    return next(err);
  }

  // Convert to ApiError if it's not already
  const error = isApiError(err) ? err : toApiError(err);
  
  // Log error with more detailed information
  if (error.statusCode >= 500) {
    logger.error(`Server error: ${error.message}`, {
      stack: error.stack,
      path: req.path,
      method: req.method,
      statusCode: error.statusCode,
      isOperational: error.isOperational,
      originalError: err instanceof Error ? err.message : undefined,
      originalStack: err instanceof Error ? err.stack : undefined,
      query: req.query,
      body: req.body ? JSON.stringify(req.body).substring(0, 200) : undefined, // Truncate for safety
      headers: {
        contentType: req.headers['content-type'],
        userAgent: req.headers['user-agent'],
        authorization: req.headers.authorization ? 'Present (redacted)' : 'Not present'
      }
    });
  } else {
    logger.warn(`Client error: ${error.message}`, {
      path: req.path,
      method: req.method,
      statusCode: error.statusCode,
      isOperational: error.isOperational,
      query: req.query
    });
  }
  
  // Prepare response
  const response: {
    status: string;
    message: string;
    stack?: string;
    code?: string;
    path?: string;
    method?: string;
  } = {
    status: 'error',
    message: error.message
  };
  
  // Include stack trace and additional info in development mode
  if (!IS_PRODUCTION) {
    if (error.stack) {
      response.stack = error.stack;
    }
    response.path = req.path;
    response.method = req.method;
    
    // Add error code if available
    if ('code' in error && typeof error.code === 'string') {
      response.code = error.code;
    }
  }
  
  // Send response
  res.status(error.statusCode).json(response);
};

/**
 * Middleware to handle 404 errors for routes that don't exist
 */
export const notFoundHandler = (req: Request, res: Response, next: NextFunction): void => {
  const error = new ApiError(`Not Found - ${req.originalUrl}`, 404);
  next(error);
};

/**
 * Middleware to handle uncaught exceptions and unhandled rejections
 */
export const setupUnhandledErrorHandlers = (): void => {
  // Handle uncaught exceptions
  process.on('uncaughtException', (error: Error) => {
    logger.error('Uncaught Exception', { error: error.stack });
    
    // In production, we might want to attempt a graceful shutdown
    if (IS_PRODUCTION) {
      logger.error('Uncaught exception, shutting down');
      process.exit(1);
    }
  });
  
  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
    logger.error('Unhandled Rejection', { reason, promise });
    
    // In production, we might want to attempt a graceful shutdown
    if (IS_PRODUCTION) {
      logger.error('Unhandled rejection, shutting down');
      process.exit(1);
    }
  });
};