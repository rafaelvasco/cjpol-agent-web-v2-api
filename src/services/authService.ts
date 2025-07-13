import { verifyWordPressCredentials, getMembershipLevel, WordPressUser, WordPressMembership } from '../utils/wordpressAuth';
import { generateToken, JwtUserPayload } from '../utils/jwt';
import { getUserOrCreateFromWordPress, updateUserMembership, User } from './userService';
import { UnauthorizedError, BadRequestError } from '../utils/errors';
import logger from '../config/logger';

/**
 * Authenticate user with WordPress credentials
 * @param username WordPress username or email
 * @param password WordPress password
 * @returns Authentication result with user and tokens
 */
/**
 * Authenticate user with WordPress credentials
 * @param username WordPress email address
 * @param password WordPress password
 * @param req Express request object for IP checking
 * @returns Authentication result with user and tokens
 */
export const authenticateWithWordPress = async (
  username: string, // This is actually the email
  password: string,
  req?: any // Express request object for IP checking
): Promise<{
  user: User;
  accessToken: string;
}> => {
  try {
    if (!username || !password) {
      throw new BadRequestError('Email and password are required');
    }

    // Verify WordPress credentials using email
    const wpUser: WordPressUser = await verifyWordPressCredentials(username, password, req);
    
    // Get or create user in our database
    const user = await getUserOrCreateFromWordPress(wpUser);
    
    // Check if user is active
    if (!user.active) {
      throw new UnauthorizedError('User account is inactive');
    }
    
    // Get membership level using the WordPress user object
    // This will use the membership data directly from the WordPress user response if available
    const membershipLevel = await getMembershipLevel(wpUser);
    
    // Update user with membership data
    await updateUserMembership(user.id, membershipLevel);
    
    // Log the membership level used for this user
    logger.info('User authenticated with membership level', {
      userId: user.id,
      email: user.email,
      membershipId: membershipLevel.id,
      membershipName: membershipLevel.name
    });
    
    // Generate JWT token
    const payload: JwtUserPayload = {
      id: user.id,
      email: user.email,
      role: user.role
    };
    
    const accessToken = generateToken(payload);
    
    // Log successful authentication
    logger.info('User authenticated with WordPress', {
      userId: user.id,
      email: user.email,
      role: user.role,
      membership: membershipLevel.name
    });
    
    return {
      user,
      accessToken
    };
  } catch (error) {
    // Log authentication failure
    logger.error('WordPress authentication failed', {
      username,
      error: error instanceof Error ? error.message : String(error)
    });
    
    // Re-throw the error
    if (error instanceof UnauthorizedError || error instanceof BadRequestError) {
      throw error;
    }
    
    throw new UnauthorizedError('Authentication failed');
  }
};

/**
 * Create session data for the client
 * @param user User object
 * @returns Session data for client
 */
export const createSessionData = (user: User): {
  id: string;
  email: string;
  name: string;
  role: string;
  credits: number;
  subscription: string;
  active: boolean;
  picture?: string;
} => {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    credits: user.credits,
    subscription: user.subscription,
    active: user.active,
    picture: user.picture
  };
};

/**
 * Validate session
 * @param userId User ID from session
 * @returns User object if session is valid
 * @throws UnauthorizedError if session is invalid
 */
export const validateSession = async (userId: string): Promise<User> => {
  try {
    // This would typically check if the session is still valid in a database
    // For now, we'll just check if the user exists and is active
    const { getUserById } = await import('./userService');
    const user = await getUserById(userId);
    
    if (!user.active) {
      throw new UnauthorizedError('User account is inactive');
    }
    
    return user;
  } catch (error) {
    logger.error('Session validation failed', { userId, error });
    throw new UnauthorizedError('Invalid session');
  }
};