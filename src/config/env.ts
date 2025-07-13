import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Server configuration
export const PORT = process.env.PORT || 4000;
export const NODE_ENV = process.env.NODE_ENV || 'production'; // Default to production for security
export const IS_PRODUCTION = NODE_ENV === 'production';
export const IS_DEVELOPMENT = NODE_ENV === 'development';

// Supabase configuration
export const SUPABASE_URL = process.env.SUPABASE_URL || '';
export const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';
export const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';

// WordPress configuration
export const WORDPRESS_URL = process.env.WORDPRESS_URL || 'https://cjpol.com.br';
// WORDPRESS_APP_USERNAME and WORDPRESS_APP_PASSWORD removed as they are no longer needed

// Development mode authentication
export const DEV_MODE_EMAIL = process.env.DEV_MODE_EMAIL || 'dev@example.com';
export const DEV_MODE_PASSWORD = process.env.DEV_MODE_PASSWORD || 'devpassword';
export const DEV_MODE_USER_ID = process.env.DEV_MODE_USER_ID || 'dev-user-id';
export const DEV_MODE_USER_NAME = process.env.DEV_MODE_USER_NAME || 'Development User';
export const DEV_MODE_CREDITS = parseInt(process.env.DEV_MODE_CREDITS || '1000', 10); // Default to 1000 credits for dev mode

// JWT configuration
export const JWT_SECRET = process.env.JWT_SECRET || 'default_jwt_secret_dev_only';
export const JWT_EXPIRATION = parseInt(process.env.JWT_EXPIRATION || '86400', 10); // 24 hours in seconds

// Session configuration
export const SESSION_SECRET = process.env.SESSION_SECRET || 'default_session_secret_dev_only';
export const SESSION_COOKIE_NAME = process.env.SESSION_COOKIE_NAME || 'cjpol_session';
export const SESSION_COOKIE_MAX_AGE = parseInt(process.env.SESSION_COOKIE_MAX_AGE || '86400000', 10); // 24 hours in milliseconds

// CORS configuration
export const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:3000';

// Rate limiting
export const RATE_LIMIT_WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10); // 15 minutes
export const RATE_LIMIT_MAX_REQUESTS = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10); // 100 requests per window

// Database connection for session store
export const DATABASE_URL = process.env.DATABASE_URL || '';

// Validate required environment variables
const validateEnv = (): void => {
  const requiredEnvVars = [
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_KEY',
    'WORDPRESS_URL',
    'JWT_SECRET',
    'SESSION_SECRET'
  ];

  const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

  if (missingEnvVars.length > 0) {
    if (IS_PRODUCTION) {
      throw new Error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
    } else {
      console.warn(`Warning: Missing recommended environment variables: ${missingEnvVars.join(', ')}`);
      console.warn('Using default values for development. DO NOT use default values in production!');
    }
  }
};

// Validate environment variables on import
validateEnv();