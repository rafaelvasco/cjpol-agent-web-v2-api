import jwt from 'jsonwebtoken';
import { JWT_SECRET, JWT_EXPIRATION } from '../config/env';
import { UnauthorizedError } from './errors';

// Define user payload type for JWT
export interface JwtUserPayload {
  id: string;
  email: string;
  role: string;
}

/**
 * Generate a JWT token for a user
 * @param user User data to include in the token
 * @returns JWT token string
 */
export const generateToken = (user: JwtUserPayload): string => {
  return jwt.sign(user, JWT_SECRET, {
    expiresIn: JWT_EXPIRATION
  });
};

/**
 * Verify and decode a JWT token
 * @param token JWT token to verify
 * @returns Decoded user payload
 * @throws UnauthorizedError if token is invalid
 */
export const verifyToken = (token: string): JwtUserPayload => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtUserPayload;
    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new UnauthorizedError('Token expired');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new UnauthorizedError('Invalid token');
    }
    throw new UnauthorizedError('Token verification failed');
  }
};

/**
 * Extract token from authorization header
 * @param authHeader Authorization header value
 * @returns Token string or null if not found
 */
export const extractTokenFromHeader = (authHeader?: string): string | null => {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  return authHeader.substring(7); // Remove 'Bearer ' prefix
};