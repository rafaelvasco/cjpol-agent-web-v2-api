import rateLimit from 'express-rate-limit';
import { RATE_LIMIT_WINDOW_MS, RATE_LIMIT_MAX_REQUESTS, IS_PRODUCTION } from '../config/env';
import { TooManyRequestsError } from '../utils/errors';
import logger from '../config/logger';

/**
 * Create a rate limiter middleware
 * @param options Custom options to override defaults
 * @returns Rate limiter middleware
 */
export const createRateLimiter = (options?: {
  windowMs?: number;
  max?: number;
  message?: string;
  path?: string;
}) => {
  return rateLimit({
    windowMs: options?.windowMs || RATE_LIMIT_WINDOW_MS,
    max: options?.max || RATE_LIMIT_MAX_REQUESTS,
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: false,
    
    // Custom handler for rate limit exceeded
    handler: (req, res, next, options) => {
      const error = new TooManyRequestsError(
        options?.message || 'Too many requests, please try again later'
      );
      
      logger.warn('Rate limit exceeded', {
        path: req.path,
        method: req.method,
        ip: req.ip,
        limit: options.max,
        windowMs: options.windowMs
      });
      
      next(error);
    },
    
    // Skip rate limiting in development mode
    skip: (req, res) => !IS_PRODUCTION,
    
    // Custom key generator based on IP and user ID if available
    keyGenerator: (req, res) => {
      const userId = req.user?.id || 'anonymous';
      return `${req.ip}-${userId}`;
    }
  });
};

/**
 * Default API rate limiter
 */
export const apiLimiter = createRateLimiter();

/**
 * More strict rate limiter for authentication endpoints
 */
export const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 requests per window
  message: 'Too many authentication attempts, please try again later'
});

/**
 * Very strict rate limiter for sensitive operations
 */
export const sensitiveOpLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 requests per window
  message: 'Too many sensitive operations, please try again later'
});