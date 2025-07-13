import axios from 'axios';
import { UnauthorizedError, BadRequestError } from './errors';
import logger from '../config/logger';
import {
  WORDPRESS_URL,
  IS_DEVELOPMENT,
  DEV_MODE_EMAIL,
  DEV_MODE_PASSWORD,
  DEV_MODE_USER_ID,
  DEV_MODE_USER_NAME,
  DEV_MODE_CREDITS
} from '../config/env';
import { MEMBERSHIP_LEVELS, MEMBERSHIP_NAMES } from '../config/credits';
// We'll use axios for direct API calls instead of a library

// Define WordPress user info interface
export interface WordPressUser {
  id: string;          // WordPress user ID
  email: string;       // User's email address
  name: string;        // User's display name
  roles: string[];     // User's roles
  avatar_urls?: {      // User's avatar URLs
    [size: string]: string;
  };
  pmpro_membership?: {  // User's PaidMembership Pro data
    id: string;
    name: string;
    level: string;
    initial_payment: number;
    billing_amount: number;
    cycle_number: string;
    cycle_period: string;
    expiration: string | null;
  };
}

// Define WordPress membership level interface
export interface WordPressMembership {
  id: number;
  name: string;
  description?: string;
  confirmation?: string;
  initial_payment?: number;
  billing_amount?: number;
  cycle_number?: number;
  cycle_period?: string;
  expiration_number?: number;
  expiration_period?: string;
  allow_signups?: boolean;
}

/**
 * Verify WordPress credentials
 * @param username WordPress username or email
 * @param password WordPress password
 * @returns Verified user information
 * @throws UnauthorizedError if credentials are invalid
 */
/**
 * Verify WordPress credentials using REST API with JWT Auth plugin
 */
/**
 * Verify WordPress credentials using REST API with JWT Auth plugin
 * @param username The user's email address
 * @param password The user's password
 */
export const verifyWordPressCredentialsWithJWT = async (
  username: string, // This is actually the email
  password: string
): Promise<WordPressUser> => {
  if (!username || !password) {
    throw new BadRequestError('Email and password are required');
  }

  try {
    // We're always using email as the username
    // Make a request to WordPress REST API to get a token
    const tokenResponse = await axios.post(
      `${WORDPRESS_URL}/wp-json/jwt-auth/v1/token`,
      {
        username, // This is actually the email
        password
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (!tokenResponse.data || !tokenResponse.data.token) {
      throw new UnauthorizedError('Invalid credentials');
    }
    
    // Get user data using the token
    const userResponse = await axios.get(
      `${WORDPRESS_URL}/wp-json/wp/v2/users/me`,
      {
        headers: {
          'Authorization': `Bearer ${tokenResponse.data.token}`
        }
      }
    );
    
    if (!userResponse.data || !userResponse.data.id) {
      throw new UnauthorizedError('Failed to retrieve user data');
    }
    
    // Log the WordPress user data for debugging
    logger.info('WordPress user data received', {
      id: userResponse.data.id,
      email: userResponse.data.email,
      name: userResponse.data.name,
      display_name: userResponse.data.display_name,
      roles: userResponse.data.roles,
      avatar_urls: userResponse.data.avatar_urls,
      // Log membership data if available
      pmpro_membership: userResponse.data.pmpro_membership,
      // Log additional fields that might be useful
      capabilities: userResponse.data.capabilities,
      meta: userResponse.data.meta,
      link: userResponse.data.link,
      // Log the full response in development mode
      fullResponse: IS_DEVELOPMENT ? userResponse.data : undefined
    });
    
    // Convert roles from object format to array if needed
    let roles: string[] = [];
    if (userResponse.data.roles) {
      if (Array.isArray(userResponse.data.roles)) {
        roles = userResponse.data.roles;
      } else if (typeof userResponse.data.roles === 'object') {
        // Handle the case where roles is an object with numeric keys
        roles = Object.values(userResponse.data.roles);
      }
    }
    
    // Log the roles conversion
    logger.info('Converting WordPress roles', {
      originalRoles: userResponse.data.roles,
      convertedRoles: roles
    });
    
    // Map WordPress user data to our interface
    const wpUser: WordPressUser = {
      id: userResponse.data.id.toString(),
      email: userResponse.data.email,
      name: userResponse.data.name || userResponse.data.display_name,
      roles: roles,
      avatar_urls: userResponse.data.avatar_urls,
      pmpro_membership: userResponse.data.pmpro_membership
    };
    
    // Log membership information if available
    if (wpUser.pmpro_membership) {
      logger.info('User has membership data directly from WordPress API', {
        userId: wpUser.id,
        email: wpUser.email,
        membershipId: wpUser.pmpro_membership.id,
        membershipName: wpUser.pmpro_membership.name,
        membershipLevel: wpUser.pmpro_membership.level
      });
    } else {
      logger.info('User has no membership data from WordPress API', {
        userId: wpUser.id,
        email: wpUser.email
      });
    }
    
    return wpUser;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      // Log detailed error information
      logger.error('WordPress JWT authentication error (Axios)', {
        username,
        url: `${WORDPRESS_URL}/wp-json/jwt-auth/v1/token`,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message,
        code: error.code,
        headers: error.response?.headers
      });
      
      if (error.response?.status === 403 || error.response?.status === 401) {
        throw new UnauthorizedError('Invalid credentials');
      }
      
      if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
        throw new UnauthorizedError('Could not connect to WordPress site. Please check the WORDPRESS_URL configuration.');
      }
    } else {
      logger.error('WordPress JWT authentication error (non-Axios)', {
        username,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
    }
    
    // Check if JWT Auth plugin is installed
    try {
      const response = await axios.get(`${WORDPRESS_URL}/wp-json`);
      const routes = response.data?.routes || {};
      const hasJwtAuthRoute = Object.keys(routes).some(route => route.includes('jwt-auth'));
      
      if (!hasJwtAuthRoute) {
        logger.error('JWT Authentication for WP REST API plugin not found', {
          availableRoutes: Object.keys(routes)
        });
        throw new UnauthorizedError('WordPress JWT Authentication plugin not installed or activated');
      }
    } catch (e) {
      logger.error('Error checking WordPress API routes', {
        error: e instanceof Error ? e.message : String(e)
      });
    }
    
    throw new UnauthorizedError('Authentication failed. Please check server logs for details.');
  }
};

// Basic Authentication method removed as we're now using only JWT Authentication


/**
 * Verify WordPress credentials using predefined dev mode credentials (DEV MODE ONLY)
 * This method checks against predefined dev mode email and password in environment variables
 * @param username The user's email address
 * @param password The user's password
 */
export const verifyWordPressCredentialsDevMode = async (
  username: string, // This is actually the email
  password: string,
  req?: any // Optional request object for IP checking
): Promise<WordPressUser> => {
  if (!username || !password) {
    throw new BadRequestError('Email and password are required');
  }

  // Only allow this method in development mode
  if (!IS_DEVELOPMENT) {
    // Log potential exploitation attempt
    logger.warn('Attempted to use dev mode authentication in production', {
      email: username,
      ip: req?.ip || 'unknown'
    });
    throw new UnauthorizedError('Dev mode authentication is only available in development environment');
  }

  // Check if dev mode credentials are properly configured
  if (!DEV_MODE_EMAIL || !DEV_MODE_PASSWORD || DEV_MODE_PASSWORD.length < 12) {
    logger.error('Dev mode credentials are not properly configured', {
      emailConfigured: !!DEV_MODE_EMAIL,
      passwordConfigured: !!DEV_MODE_PASSWORD,
      passwordSecure: DEV_MODE_PASSWORD && DEV_MODE_PASSWORD.length >= 12
    });
    throw new UnauthorizedError('Dev mode authentication is not properly configured');
  }

  // IP restriction - only allow localhost and private network IPs
  if (req && req.ip) {
    const ip = req.ip;
    const isLocalhost = ip === '127.0.0.1' || ip === '::1';
    const isPrivateNetwork = ip.startsWith('10.') || ip.startsWith('172.16.') || ip.startsWith('192.168.');
    
    if (!isLocalhost && !isPrivateNetwork) {
      logger.warn('Attempted to use dev mode authentication from non-local IP', { ip });
      throw new UnauthorizedError('Dev mode authentication is only available from local networks');
    }
  }

  try {
    // Check if the provided credentials match the dev mode credentials
    if (username === DEV_MODE_EMAIL && password === DEV_MODE_PASSWORD) {
      logger.warn('DEV MODE: Using development mode credentials', {
        email: username,
        ip: req?.ip || 'unknown'
      });
      
      // Return a predefined user with mock membership data
      const wpUser: WordPressUser = {
        id: DEV_MODE_USER_ID,
        email: DEV_MODE_EMAIL,
        name: DEV_MODE_USER_NAME,
        roles: ['administrator'],
        avatar_urls: {},
        // Add mock membership data for dev mode
        pmpro_membership: {
          id: MEMBERSHIP_LEVELS.DEVELOPER.toString(), // Developer tier
          name: "Developer Plan",
          level: MEMBERSHIP_LEVELS.DEVELOPER.toString(),
          initial_payment: 0,
          billing_amount: 0,
          cycle_number: "0",
          cycle_period: "month",
          expiration: null
        }
      };
      
      // Log that we're using dev mode with the specified number of credits and membership
      logger.info(`DEV MODE: User created with ${DEV_MODE_CREDITS} credits and Developer Plan membership`, {
        membershipId: wpUser.pmpro_membership?.id,
        membershipName: wpUser.pmpro_membership?.name
      });
      
      return wpUser;
    }
    
    // If credentials don't match, log the attempt and throw an error
    logger.warn('Failed dev mode authentication attempt', {
      email: username,
      ip: req?.ip || 'unknown'
    });
    
    // Implement a small delay to prevent brute force attacks
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    throw new UnauthorizedError('Invalid development mode credentials');
  } catch (error) {
    logger.error('WordPress Dev Mode authentication error', {
      username,
      error: error instanceof Error ? error.message : String(error)
    });
    
    throw new UnauthorizedError('Authentication failed in dev mode');
  }
};

/**
 * Verify WordPress credentials using JWT Authentication
 */
/**
 * Verify WordPress credentials using JWT Authentication
 * @param username The user's email address
 * @param password The user's password
 * @param req Optional request object for IP checking
 * @returns Verified user information
 */
export const verifyWordPressCredentials = async (
  username: string, // This is actually the email
  password: string,
  req?: any // Optional request object for IP checking
): Promise<WordPressUser> => {
  if (!username || !password) {
    throw new BadRequestError('Email and password are required');
  }

  // Try JWT Authentication
  try {
    return await verifyWordPressCredentialsWithJWT(username, password);
  } catch (error) {
    // Log the JWT authentication error
    logger.error('JWT authentication failed', {
      username,
      error: error instanceof Error ? error.message : String(error)
    });
    
    // In development mode, try the dev mode authentication as a fallback
    if (IS_DEVELOPMENT) {
      logger.warn('JWT authentication failed, trying dev mode authentication', { username });
      try {
        return await verifyWordPressCredentialsDevMode(username, password, req);
      } catch (devError) {
        logger.error('Dev mode authentication failed', {
          username,
          error: devError instanceof Error ? devError.message : String(devError)
        });
      }
    }
    
    // Authentication failed
    throw new UnauthorizedError('Authentication failed. Please check server logs for details.');
  }
};

/**
 * Get membership level for a user by email
 * @param email User's email address
 * @returns Membership level information
 * @throws Error if membership level cannot be retrieved
 */
/**
 * Get membership level for a user
 * @param wpUser WordPress user object
 * @returns Membership level information
 */
export const getMembershipLevel = async (wpUser: WordPressUser): Promise<WordPressMembership> => {
  // Check if the user has membership data
  if (wpUser.pmpro_membership) {
    const membership = wpUser.pmpro_membership;
    const membershipId = parseInt(membership.level, 10);
    
    // Determine the appropriate membership level based on the ID
    let mappedId, mappedName;
    
    if (membershipId === MEMBERSHIP_LEVELS.COMPLETE) {
      mappedId = MEMBERSHIP_LEVELS.COMPLETE;
      mappedName = MEMBERSHIP_NAMES.COMPLETE;
    } else if (membershipId === MEMBERSHIP_LEVELS.BASIC) {
      mappedId = MEMBERSHIP_LEVELS.BASIC;
      mappedName = MEMBERSHIP_NAMES.BASIC;
    } else {
      // Default to FREE for any other level or if level is less than 1
      mappedId = MEMBERSHIP_LEVELS.FREE;
      mappedName = MEMBERSHIP_NAMES.FREE;
    }
    
    logger.info('Using membership data from WordPress user object', {
      userId: wpUser.id,
      email: wpUser.email,
      originalMembershipId: membership.id,
      originalMembershipLevel: membership.level,
      mappedMembershipId: mappedId,
      mappedMembershipName: mappedName
    });
    
    // Convert the pmpro_membership data to WordPressMembership format with mapped values
    return {
      id: mappedId,
      name: mappedName,
      description: '',
      initial_payment: membership.initial_payment,
      billing_amount: membership.billing_amount,
      cycle_number: parseInt(membership.cycle_number, 10),
      cycle_period: membership.cycle_period,
      expiration_number: 0,
      expiration_period: '',
      allow_signups: true
    };
  }
  
  // If the user doesn't have membership data, return a default "free" level
  logger.info('User has no membership data, using default free level', {
    userId: wpUser.id,
    email: wpUser.email
  });
  
  return {
    id: MEMBERSHIP_LEVELS.FREE,
    name: MEMBERSHIP_NAMES.FREE
  };
};