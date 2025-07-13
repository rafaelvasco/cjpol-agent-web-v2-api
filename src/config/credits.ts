/**
 * Credit configuration
 * This file contains constants related to user credits and membership levels
 */

// Default credits for different scenarios
export const DEFAULT_CREDITS_FREE = 5;
export const DEFAULT_CREDITS_NEW_USER = 5;

// Credits for each membership level (daily credits)
export const MEMBERSHIP_CREDITS = {
  FREE: 5,        // No membership or level < 1
  BASIC: 10,      // Level 1
  COMPLETE: 20,   // Level 2
  DEVELOPER: 500, // Special level for development mode
};

// Membership level IDs
export const MEMBERSHIP_LEVELS = {
  FREE: 0,
  BASIC: 1,
  COMPLETE: 2,
  DEVELOPER: 999, // Special level for development mode
};

// Membership level names
export const MEMBERSHIP_NAMES = {
  FREE: 'free',
  BASIC: 'basic',
  COMPLETE: 'complete',
  DEVELOPER: 'developer', // Special level for development mode
};