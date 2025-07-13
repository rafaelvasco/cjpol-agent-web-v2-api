/**
 * Custom error classes for the API
 */

// Base API error class
export class ApiError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    
    // Capture stack trace
    Error.captureStackTrace(this, this.constructor);
    
    // Set prototype explicitly for better instanceof behavior
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

// 400 Bad Request
export class BadRequestError extends ApiError {
  constructor(message = 'Bad request') {
    super(message, 400);
    Object.setPrototypeOf(this, BadRequestError.prototype);
  }
}

// 401 Unauthorized
export class UnauthorizedError extends ApiError {
  constructor(message = 'Unauthorized') {
    super(message, 401);
    Object.setPrototypeOf(this, UnauthorizedError.prototype);
  }
}

// 403 Forbidden
export class ForbiddenError extends ApiError {
  constructor(message = 'Forbidden') {
    super(message, 403);
    Object.setPrototypeOf(this, ForbiddenError.prototype);
  }
}

// 404 Not Found
export class NotFoundError extends ApiError {
  constructor(message = 'Resource not found') {
    super(message, 404);
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

// 409 Conflict
export class ConflictError extends ApiError {
  constructor(message = 'Resource conflict') {
    super(message, 409);
    Object.setPrototypeOf(this, ConflictError.prototype);
  }
}

// 429 Too Many Requests
export class TooManyRequestsError extends ApiError {
  constructor(message = 'Too many requests') {
    super(message, 429);
    Object.setPrototypeOf(this, TooManyRequestsError.prototype);
  }
}

// 500 Internal Server Error
export class InternalServerError extends ApiError {
  constructor(message = 'Internal server error', isOperational = false) {
    super(message, 500, isOperational);
    Object.setPrototypeOf(this, InternalServerError.prototype);
  }
}

// Helper function to determine if an error is an instance of ApiError
export const isApiError = (error: any): error is ApiError => {
  return error instanceof ApiError;
};

// Helper function to convert unknown errors to ApiError
export const toApiError = (error: any): ApiError => {
  if (isApiError(error)) {
    return error;
  }
  
  // Convert Error objects
  if (error instanceof Error) {
    // Check for database connection errors
    if (
      error.message.includes('database') ||
      error.message.includes('connection') ||
      error.message.includes('ECONNREFUSED') ||
      error.message.includes('pg') ||
      error.message.includes('postgres')
    ) {
      return new InternalServerError(`Database connection error: ${error.message}`, true);
    }
    
    // Check for JWT errors
    if (
      error.name === 'JsonWebTokenError' ||
      error.name === 'TokenExpiredError' ||
      error.message.includes('jwt') ||
      error.message.includes('token')
    ) {
      return new UnauthorizedError(`Authentication error: ${error.message}`);
    }
    
    // Set isOperational to true for better error handling
    return new InternalServerError(error.message, true);
  }
  
  // Convert string errors
  if (typeof error === 'string') {
    return new InternalServerError(error, true);
  }
  
  // Handle objects with error information
  if (typeof error === 'object' && error !== null) {
    const errorMessage = error.message || error.error || JSON.stringify(error).substring(0, 100);
    return new InternalServerError(errorMessage, true);
  }
  
  // Default case
  return new InternalServerError('An unknown error occurred', true);
};