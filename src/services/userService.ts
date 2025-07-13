import { v4 as uuidv4 } from 'uuid';
import { supabase, supabaseAdmin } from '../config/supabase';
import { WordPressUser, WordPressMembership, getMembershipLevel } from '../utils/wordpressAuth';
import { NotFoundError, ConflictError, InternalServerError } from '../utils/errors';
import logger from '../config/logger';
import { IS_DEVELOPMENT, DEV_MODE_EMAIL, DEV_MODE_CREDITS } from '../config/env';
import {
  DEFAULT_CREDITS_FREE,
  DEFAULT_CREDITS_NEW_USER,
  MEMBERSHIP_CREDITS,
  MEMBERSHIP_LEVELS,
  MEMBERSHIP_NAMES
} from '../config/credits';
import { USER_ROLES, WP_ROLE_MAPPING } from '../config/roles';

// Define user interface
export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  credits: number;
  subscription: string;
  active: boolean;
  wordpress_id?: string;
  picture?: string;
  wordpress_membership_id?: number;
  wordpress_membership_name?: string;
  wordpress_membership_updated?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Get user by ID
 * @param id User ID
 * @returns User object
 * @throws NotFoundError if user not found
 */
export const getUserById = async (id: string): Promise<User> => {
  // Use supabaseAdmin to bypass RLS policies
  const { data, error } = await supabaseAdmin
    .from('cjpol_users')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) {
    logger.error('Error fetching user by ID', { error, id });
    throw new NotFoundError(`User with ID ${id} not found`);
  }

  return data as User;
};

/**
 * Get user by email
 * @param email User email
 * @returns User object or null if not found
 */
export const getUserByEmail = async (email: string): Promise<User | null> => {
  // Use supabaseAdmin to bypass RLS policies
  const { data, error } = await supabaseAdmin
    .from('cjpol_users')
    .select('*')
    .eq('email', email)
    .single();

  if (error || !data) {
    return null;
  }

  return data as User;
};

/**
 * Create a new user
 * @param userData User data to create
 * @returns Created user object
 * @throws ConflictError if user with email already exists
 */
export const createUser = async (userData: {
  email: string;
  name: string;
  wordpress_id?: string;
  picture?: string;
  role?: string;
  active?: boolean;
  credits?: number;
  subscription?: string;
  wordpress_membership_id?: number;
  wordpress_membership_name?: string;
  wordpress_membership_updated?: string;
}): Promise<User> => {
  // Check if user with email already exists
  const existingUser = await getUserByEmail(userData.email);
  if (existingUser) {
    throw new ConflictError(`User with email ${userData.email} already exists`);
  }

  const newUserId = uuidv4();
  const now = new Date().toISOString();

  const { data, error } = await supabaseAdmin
    .from('cjpol_users')
    .insert({
      id: newUserId,
      email: userData.email,
      name: userData.name,
      wordpress_id: userData.wordpress_id || null,
      picture: userData.picture || null,
      password_hash: '', // Not needed for OAuth users
      role: userData.role || USER_ROLES.USER,
      active: userData.active !== undefined ? userData.active : true,
      credits: userData.credits !== undefined ? userData.credits : 0, // Default to 0 credits if not specified
      subscription: userData.subscription || MEMBERSHIP_NAMES.FREE, // Default to free subscription if not specified
      wordpress_membership_id: userData.wordpress_membership_id || null,
      wordpress_membership_name: userData.wordpress_membership_name || null,
      wordpress_membership_updated: userData.wordpress_membership_updated || null,
      created_at: now,
      updated_at: now
    })
    .select()
    .single();

  if (error || !data) {
    logger.error('Error creating user', { error, userData });
    throw new InternalServerError('Failed to create user');
  }

  return data as User;
};

/**
 * Update user information
 * @param id User ID
 * @param userData User data to update
 * @returns Updated user object
 * @throws NotFoundError if user not found
 */
export const updateUser = async (
  id: string,
  userData: Partial<Omit<User, 'id' | 'created_at'>>
): Promise<User> => {
  // Check if user exists
  await getUserById(id);

  const { data, error } = await supabaseAdmin
    .from('cjpol_users')
    .update({
      ...userData,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single();

  if (error || !data) {
    logger.error('Error updating user', { error, id, userData });
    throw new InternalServerError('Failed to update user');
  }

  return data as User;
};

/**
 * Get user by WordPress ID
 * @param wordpressId WordPress user ID
 * @returns User object or null if not found
 */
export const getUserByWordPressId = async (wordpressId: string): Promise<User | null> => {
  // Use supabaseAdmin to bypass RLS policies
  const { data, error } = await supabaseAdmin
    .from('cjpol_users')
    .select('*')
    .eq('wordpress_id', wordpressId)
    .single();

  if (error || !data) {
    return null;
  }

  return data as User;
};

/**
 * Get or create user from WordPress authentication
 * @param wpUser WordPress user information
 * @returns User object
 */
export const getUserOrCreateFromWordPress = async (wpUser: WordPressUser): Promise<User> => {
  // First, try to find user by WordPress ID
  const userByWordPressId = await getUserByWordPressId(wpUser.id);
  
  if (userByWordPressId) {
    // Check if this is a dev mode user
    const isDevModeUser = IS_DEVELOPMENT && wpUser.email === DEV_MODE_EMAIL;
    
    // Determine user role from WordPress roles
    const userRole = isDevModeUser ? USER_ROLES.ADMIN : determineUserRole(wpUser.roles);
    
    // Update user info if needed
    if (userByWordPressId.name !== wpUser.name ||
        userByWordPressId.email !== wpUser.email ||
        userByWordPressId.role !== userRole ||
        (isDevModeUser && userByWordPressId.credits !== DEV_MODE_CREDITS)) {
      
      logger.info('Updating existing user with WordPress data', {
        userId: userByWordPressId.id,
        email: wpUser.email,
        wpRoles: wpUser.roles,
        assignedRole: userRole
      });
      
      return await updateUser(userByWordPressId.id, {
        name: wpUser.name,
        email: wpUser.email,
        role: userRole,
        picture: wpUser.avatar_urls?.['96'] || userByWordPressId.picture,
        credits: isDevModeUser ? DEV_MODE_CREDITS : undefined, // Update credits for dev mode user
        subscription: isDevModeUser ? MEMBERSHIP_NAMES.DEVELOPER : undefined // Update subscription for dev mode user
      });
    }
    
    return userByWordPressId;
  }
  
  // If not found by WordPress ID, try by email as fallback
  const userByEmail = await getUserByEmail(wpUser.email);
  
  if (userByEmail) {
    // Check if this is a dev mode user
    const isDevModeUser = IS_DEVELOPMENT && wpUser.email === DEV_MODE_EMAIL;
    
    // Determine user role from WordPress roles
    const userRole = isDevModeUser ? USER_ROLES.ADMIN : determineUserRole(wpUser.roles);
    
    logger.info('Found user by email, updating with WordPress data', {
      userId: userByEmail.id,
      email: wpUser.email,
      wpRoles: wpUser.roles,
      assignedRole: userRole
    });
    
    // Update WordPress ID and return the user
    return await updateUser(userByEmail.id, {
      wordpress_id: wpUser.id,
      name: wpUser.name,
      role: userRole,
      picture: wpUser.avatar_urls?.['96'] || userByEmail.picture,
      credits: isDevModeUser ? DEV_MODE_CREDITS : undefined, // Update credits for dev mode user
      subscription: isDevModeUser ? MEMBERSHIP_NAMES.DEVELOPER : undefined // Update subscription for dev mode user
    });
  }
  
  // If user doesn't exist, create a new one
  // Check if this is a dev mode user and set credits accordingly
  const isDevModeUser = IS_DEVELOPMENT && wpUser.email === DEV_MODE_EMAIL;
  
  // Determine user role from WordPress roles
  const userRole = isDevModeUser ? USER_ROLES.ADMIN : determineUserRole(wpUser.roles);
  
  logger.info('Creating new user from WordPress data', {
    email: wpUser.email,
    wpRoles: wpUser.roles,
    assignedRole: userRole
  });
  
  // Get membership level to set initial credits
  let initialCredits: number | undefined;
  let initialSubscription: string | undefined;
  let membershipId: number | undefined;
  let membershipName: string | undefined;
  
  try {
    // Get membership level from WordPress
    // Pass the WordPress user object to use membership data directly if available
    const membershipLevel = await getMembershipLevel(wpUser);
    
    // Map membership level to credits
    initialCredits = isDevModeUser ? DEV_MODE_CREDITS : mapMembershipToCredits(membershipLevel);
    
    // Map membership level ID to subscription name
    if (isDevModeUser) {
      initialSubscription = MEMBERSHIP_NAMES.DEVELOPER;
    } else if (membershipLevel.id === MEMBERSHIP_LEVELS.COMPLETE) {
      initialSubscription = MEMBERSHIP_NAMES.COMPLETE;
    } else if (membershipLevel.id === MEMBERSHIP_LEVELS.BASIC) {
      initialSubscription = MEMBERSHIP_NAMES.BASIC;
    } else {
      initialSubscription = MEMBERSHIP_NAMES.FREE;
    }
    
    membershipId = membershipLevel.id;
    membershipName = initialSubscription; // Use our mapped subscription name
    
    logger.info('Setting initial credits for new user', {
      email: wpUser.email,
      credits: initialCredits,
      subscription: initialSubscription
    });
  } catch (error) {
    // If there's an error getting membership level, use default values
    logger.warn('Failed to get initial membership level for new user', {
      email: wpUser.email,
      error: error instanceof Error ? error.message : String(error)
    });
    
    initialCredits = isDevModeUser ? DEV_MODE_CREDITS : DEFAULT_CREDITS_NEW_USER;
    initialSubscription = isDevModeUser ? MEMBERSHIP_NAMES.DEVELOPER : MEMBERSHIP_NAMES.FREE;
    membershipId = MEMBERSHIP_LEVELS.FREE;
    membershipName = initialSubscription; // Use our mapped subscription name
  }
  
  // Create the new user with appropriate credits and subscription
  const newUser = await createUser({
    email: wpUser.email,
    name: wpUser.name,
    wordpress_id: wpUser.id,
    picture: wpUser.avatar_urls?.['96'],
    role: userRole,
    credits: initialCredits,
    subscription: initialSubscription,
    wordpress_membership_id: membershipId,
    wordpress_membership_name: membershipName,
    wordpress_membership_updated: new Date().toISOString()
  });
  
  return newUser;
};

/**
 * Map membership level to credits
 * @param membershipLevel WordPress membership level
 * @returns Number of credits
 */
export const mapMembershipToCredits = (membershipLevel: WordPressMembership): number => {
  // Check for developer level (special case)
  if (membershipLevel.id === MEMBERSHIP_LEVELS.DEVELOPER) {
    return MEMBERSHIP_CREDITS.DEVELOPER;
  }
  
  // Map based on membership level ID
  const levelId = membershipLevel.id;
  
  if (levelId === MEMBERSHIP_LEVELS.COMPLETE) {
    return MEMBERSHIP_CREDITS.COMPLETE;
  } else if (levelId === MEMBERSHIP_LEVELS.BASIC) {
    return MEMBERSHIP_CREDITS.BASIC;
  } else {
    // Default to FREE for any other level or if level is less than 1
    return MEMBERSHIP_CREDITS.FREE;
  }
};

/**
 * Determine user role from WordPress roles
 * @param wpRoles Array of WordPress roles
 * @returns User role (admin or user)
 */
export const determineUserRole = (wpRoles: string[]): string => {
  // Check if user has administrator role
  if (wpRoles.includes(WP_ROLE_MAPPING.ADMIN)) {
    logger.info('User has administrator role, setting role to admin');
    return USER_ROLES.ADMIN;
  }
  
  // Default to regular user
  return USER_ROLES.USER;
};

/**
 * Update user membership information
 * @param userId User ID
 * @param membershipLevel WordPress membership level
 * @returns Updated user object
 */
export const updateUserMembership = async (userId: string, membershipLevel: WordPressMembership): Promise<User> => {
  // Map membership level to credits
  const credits = mapMembershipToCredits(membershipLevel);
  
  // Map membership level ID to subscription name
  let subscription: string;
  if (membershipLevel.id === MEMBERSHIP_LEVELS.COMPLETE) {
    subscription = MEMBERSHIP_NAMES.COMPLETE;
  } else if (membershipLevel.id === MEMBERSHIP_LEVELS.BASIC) {
    subscription = MEMBERSHIP_NAMES.BASIC;
  } else if (membershipLevel.id === MEMBERSHIP_LEVELS.DEVELOPER) {
    subscription = MEMBERSHIP_NAMES.DEVELOPER;
  } else {
    subscription = MEMBERSHIP_NAMES.FREE;
  }
  
  logger.info('Updating user membership', {
    userId,
    membershipId: membershipLevel.id,
    mappedSubscription: subscription,
    credits
  });
  
  // Update user in Supabase database
  // Use updateUser which already uses supabaseAdmin
  return await updateUser(userId, {
    credits,
    subscription,
    wordpress_membership_id: membershipLevel.id,
    wordpress_membership_name: subscription, // Use our mapped subscription name
    wordpress_membership_updated: new Date().toISOString()
  });
};

/**
 * Get all users (admin only)
 * @returns Array of User objects
 */
export const getAllUsers = async (): Promise<User[]> => {
  // Use supabaseAdmin to bypass RLS policies
  const { data, error } = await supabaseAdmin
    .from('cjpol_users')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    logger.error('Error fetching all users', { error });
    throw new InternalServerError('Failed to fetch users');
  }

  return (data || []) as User[];
};

/**
 * Consume user credits
 * @param userId User ID
 * @param amount Amount of credits to consume (default: 1)
 * @returns Boolean indicating if credits were successfully consumed
 */
export const consumeCredits = async (userId: string, amount: number = 1): Promise<boolean> => {
  try {
    // Get current user to check credits
    const user = await getUserById(userId);
    
    // Check if user has enough credits
    if (user.credits < amount) {
      return false;
    }
    
    // Update user credits
    await updateUser(userId, {
      credits: user.credits - amount
    });
    
    return true;
  } catch (error) {
    logger.error('Error consuming credits', { error, userId, amount });
    return false;
  }
};