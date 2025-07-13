# CJPol Database Setup

## Overview

This document describes the database setup for the CJPol Agent Web application. Since we're starting the database from scratch, we've consolidated all SQL code into a single comprehensive script.

## Database Schema

The database consists of the following main tables:

1. **cjpol_users** - Stores user information including WordPress authentication data
2. **cjpol_conversations** - Stores conversation metadata
3. **cjpol_messages** - Stores individual messages within conversations
4. **session** - Stores session data for express-session
5. **csrf_tokens** - Stores CSRF tokens for security

## Setup Script

The `cjpol_database_setup.sql` script is organized into the following sections:

1. **Table Creation** - Creates all necessary tables with appropriate columns and constraints
2. **Index Creation** - Creates indexes for performance optimization
3. **Row Level Security (RLS) Setup** - Configures security policies for data access
4. **Functions and Triggers** - Sets up utility functions and triggers
5. **Initial Data (Optional)** - Contains commented code for initial data setup

## WordPress Authentication

The database is designed to work with WordPress authentication:

- The `cjpol_users` table includes columns for WordPress-related data:
  - `wordpress_id` - WordPress user ID
  - `wordpress_membership_id` - Membership level ID from WordPress
  - `wordpress_membership_name` - Membership level name
  - `wordpress_membership_updated` - When membership data was last updated
  - `picture` - User's profile picture URL

- RLS policies are configured to work with WordPress authentication:
  - The insert policy requires `wordpress_id IS NOT NULL`
  - Additional policies for service roles and admin users

## How to Apply the Setup

You can run the SQL script using one of these methods:

1. **Supabase SQL Editor**: Copy and paste the SQL into the Supabase SQL Editor
2. **Supabase CLI**: Use `supabase db push -f cjpol_database_setup.sql`
3. **Supabase REST API**: Use the API with the service key

## Supabase Service Key

The application uses two different Supabase keys:

1. **SUPABASE_ANON_KEY**: Used for operations that respect Row Level Security (RLS) policies
2. **SUPABASE_SERVICE_KEY**: Used for admin operations that bypass RLS policies

The service key is used in the backend API to perform operations that require admin privileges, such as:

- Creating new users
- Updating user membership information
- Managing conversations and messages across users
- Performing administrative tasks

Make sure to set both keys in your `.env` file:

```
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_KEY=your_supabase_service_key
```

The application primarily uses the `supabaseAdmin` client for all database operations in the backend API. This approach was chosen for the following reasons:

1. **Simplicity and Reliability**: Using a single client with admin privileges simplifies the code and reduces the chance of errors related to RLS policies.
2. **Backend Control**: Since this is a backend API, all database access is controlled by the server code, not by RLS policies.
3. **Consistent Access**: Ensures that the backend can always access the data it needs without being blocked by RLS policies.
4. **Performance**: Bypassing RLS policies may provide slight performance benefits.

Security is maintained through proper API authorization checks in the server code rather than relying on RLS policies.

## Credits Configuration

Credit values for different membership levels are configured in `src/config/credits.ts`:

```typescript
// Default credits for different scenarios
export const DEFAULT_CREDITS_FREE = 5;
export const DEFAULT_CREDITS_NEW_USER = 5;

// Credits for each membership level
export const MEMBERSHIP_CREDITS = {
  FREE: 10,        // Level 1
  BASIC: 50,       // Level 2
  PREMIUM: 100,    // Level 3
  ENTERPRISE: 500, // Level 4
};
```

## Security Considerations

The database setup includes several security features:

1. **Row Level Security (RLS)** - Restricts access to data based on user identity
2. **CSRF Protection** - Includes a table for storing CSRF tokens
3. **Session Management** - Secure session storage with automatic cleanup
4. **Role-Based Access Control** - Different policies for users and administrators
5. **Service Role Access** - Appropriate use of service role key for admin operations