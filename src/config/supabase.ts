import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_KEY } from './env';

/**
 * We maintain both supabase clients for flexibility, but in this backend API
 * we primarily use supabaseAdmin for all operations for the following reasons:
 *
 * 1. This is a backend API where all database access is controlled by the server code
 * 2. The server code itself handles authentication and authorization
 * 3. Using only the admin client simplifies the code and reduces errors
 * 4. It avoids issues with RLS policies blocking legitimate access
 *
 * Security is maintained through proper API authorization checks rather than RLS.
 */

import logger from './logger';

// Create Supabase clients with error handling
const createSupabaseClient = (url: string, key: string, isAdmin = false) => {
  try {
    const client = createClient(url, key, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
    
    // Test the connection
    client.auth.getSession()
      .then(() => {
        logger.info(`Supabase ${isAdmin ? 'admin' : 'anonymous'} client initialized successfully`);
      })
      .catch((error) => {
        logger.error(`Error connecting to Supabase with ${isAdmin ? 'admin' : 'anonymous'} client`, {
          error: error instanceof Error ? error.message : String(error)
        });
      });
      
    return client;
  } catch (error) {
    logger.error(`Failed to create Supabase ${isAdmin ? 'admin' : 'anonymous'} client`, {
      error: error instanceof Error ? error.message : String(error)
    });
    
    // Return a mock client that logs errors instead of crashing
    return createMockSupabaseClient(isAdmin);
  }
};

// Create a mock Supabase client that logs errors instead of crashing
const createMockSupabaseClient = (isAdmin: boolean) => {
  const mockClient = {
    from: (table: string) => {
      const logError = () => {
        logger.error(`Attempted to use Supabase ${isAdmin ? 'admin' : 'anonymous'} client that failed to initialize`, {
          table
        });
        return {
          data: null,
          error: new Error('Supabase client not available')
        };
      };
      
      return {
        select: () => ({
          eq: () => ({
            single: async () => logError()
          }),
          single: async () => logError()
        }),
        insert: () => ({
          select: () => ({
            single: async () => logError()
          })
        }),
        update: () => ({
          eq: () => ({
            select: () => ({
              single: async () => logError()
            })
          })
        })
      };
    },
    auth: {
      getSession: async () => ({
        data: { session: null },
        error: new Error('Supabase client not available')
      })
    }
  };
  
  return mockClient as any;
};

// Create a Supabase client with anonymous key (limited permissions)
export const supabase = createSupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Create a Supabase service client with service key (admin privileges)
// This client bypasses Row Level Security (RLS) policies
export const supabaseAdmin = createSupabaseClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, true);

// Define database types (similar to the frontend)
export interface Database {
  public: {
    Tables: {
      cjpol_users: {
        Row: {
          id: string;
          name: string;
          email: string;
          password_hash: string | null;
          wordpress_id: string | null;
          wordpress_membership_id: number | null;
          wordpress_membership_name: string | null;
          wordpress_membership_updated: string | null;
          picture: string | null;
          credits: number;
          subscription: string;
          active: boolean;
          role: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          email: string;
          password_hash?: string | null;
          wordpress_id?: string | null;
          wordpress_membership_id?: number | null;
          wordpress_membership_name?: string | null;
          wordpress_membership_updated?: string | null;
          picture?: string | null;
          credits?: number;
          subscription?: string;
          active?: boolean;
          role?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          email?: string;
          password_hash?: string | null;
          wordpress_id?: string | null;
          wordpress_membership_id?: number | null;
          wordpress_membership_name?: string | null;
          wordpress_membership_updated?: string | null;
          picture?: string | null;
          credits?: number;
          subscription?: string;
          active?: boolean;
          role?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      cjpol_conversations: {
        Row: {
          id: string;
          created_at: string;
          title: string;
          session_id: string;
          user_id: string;
        };
        Insert: {
          id?: string;
          created_at?: string;
          title: string;
          session_id: string;
          user_id: string;
        };
        Update: {
          id?: string;
          created_at?: string;
          title?: string;
          session_id?: string;
          user_id?: string;
        };
      };
      cjpol_messages: {
        Row: {
          id: string;
          conversation_id: string;
          session_id: string;
          client_ip: string;
          message: any;
          timestamp: string;
          from_ai: boolean;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          session_id: string;
          message: any;
          timestamp?: string;
          from_ai?: boolean;
        };
        Update: {
          id?: string;
          conversation_id?: string;
          session_id?: string;
          message?: any;
          timestamp?: string;
          from_ai?: boolean;
        };
      };
    };
  };
}