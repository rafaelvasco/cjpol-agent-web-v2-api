# CJPol Agent Web v2 API

A secure Node.js/TypeScript API backend for the CJPol Agent Web application, providing authentication, user management, and conversation handling with WordPress integration.

## Features

- **WordPress Authentication Integration** - Seamless integration with WordPress user accounts
- **Secure Session Management** - PostgreSQL-backed session storage with configurable security
- **User Management** - Complete user lifecycle management with membership levels
- **Conversation System** - Full conversation and message management
- **Admin Panel Support** - Administrative endpoints for user and system management
- **Rate Limiting** - Built-in rate limiting for API protection
- **CSRF Protection** - Cross-site request forgery protection
- **Security Headers** - Comprehensive security headers with Helmet.js
- **Development Mode** - Special development authentication for testing
- **Logging System** - Winston-based logging with configurable levels

## Tech Stack

- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL with Supabase
- **Authentication**: JWT tokens with session management
- **Security**: Helmet, CORS, CSRF protection, rate limiting
- **Logging**: Winston
- **Development**: Nodemon, ts-node

## Prerequisites

- Node.js 16+
- PostgreSQL database
- Supabase account (optional but recommended)
- WordPress site (for authentication integration)

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd cjpol-agent-web-v2-api
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

4. Configure your `.env` file with the required values (see [Configuration](#configuration) section)

5. Set up the database using the provided SQL script in `docs/DATABASE_SETUP.md`

## Configuration

### Environment Variables

Copy `.env.example` to `.env` and configure the following variables:

#### Server Configuration
- `PORT`: Server port (default: 4000)
- `NODE_ENV`: Environment mode (development/production)

#### Database Configuration
- `DATABASE_URL`: PostgreSQL connection string for session storage
- `SUPABASE_URL`: Supabase project URL
- `SUPABASE_ANON_KEY`: Supabase anonymous key
- `SUPABASE_SERVICE_KEY`: Supabase service role key (for admin operations)

#### WordPress Integration
- `WORDPRESS_URL`: Your WordPress site URL

#### Authentication
- `JWT_SECRET`: Secret key for JWT token signing
- `JWT_EXPIRATION`: JWT token expiration time in seconds
- `SESSION_SECRET`: Secret for session encryption
- `SESSION_COOKIE_NAME`: Name of the session cookie
- `SESSION_COOKIE_MAX_AGE`: Session cookie max age in milliseconds

#### Security
- `CORS_ORIGIN`: Allowed CORS origin (frontend URL)
- `RATE_LIMIT_WINDOW_MS`: Rate limiting window in milliseconds
- `RATE_LIMIT_MAX_REQUESTS`: Maximum requests per window

#### Development Mode
- `DEV_MODE_EMAIL`: Development mode user email
- `DEV_MODE_PASSWORD`: Development mode user password (minimum 12 characters)
- `DEV_MODE_USER_ID`: Development mode user ID
- `DEV_MODE_USER_NAME`: Development mode user display name
- `DEV_MODE_CREDITS`: Starting credits for development user

## Database Setup

The application uses PostgreSQL with Supabase. See `docs/DATABASE_SETUP.md` for detailed setup instructions.

Key database tables:
- `cjpol_users` - User accounts and WordPress integration data
- `cjpol_conversations` - Conversation metadata
- `cjpol_messages` - Individual messages within conversations
- `session` - Express session storage
- `csrf_tokens` - CSRF token storage

## API Endpoints

### Health Check
- `GET /api/health` - API health status

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user info

### Users
- `GET /api/users/profile` - Get user profile
- `PATCH /api/users/profile` - Update user profile
- `GET /api/users/credits` - Get user credits
- `POST /api/users/credits` - Update user credits

### Conversations
- `GET /api/conversations` - Get user conversations
- `POST /api/conversations` - Create new conversation
- `GET /api/conversations/:id` - Get specific conversation
- `DELETE /api/conversations/:id` - Delete conversation

### Messages
- `GET /api/messages/:conversationId` - Get conversation messages
- `POST /api/messages` - Send new message

### Admin
- `GET /api/admin/users` - Get all users (admin only)
- `PATCH /api/admin/users/:id` - Update user (admin only)
- `DELETE /api/admin/users/:id` - Delete user (admin only)

## Development

### Running the Development Server

```bash
npm run dev
```

This starts the server with hot-reload using nodemon and ts-node.

### Building for Production

```bash
npm run build
```

This compiles TypeScript to JavaScript in the `dist/` directory.

### Running in Production

```bash
npm start
```

This runs the compiled JavaScript from the `dist/` directory.

### Testing the API

A test script is provided:

```bash
node test-api.js
```

## Project Structure

```
src/
├── config/          # Configuration files
├── controllers/     # Route controllers
├── middleware/      # Express middleware
├── routes/          # API route definitions
├── services/        # Business logic services
├── types/           # TypeScript type definitions
├── utils/           # Utility functions
└── index.ts         # Application entry point
```

## Security Features

- **Helmet.js** - Security headers
- **CORS** - Cross-origin resource sharing configuration
- **Rate Limiting** - Request rate limiting
- **CSRF Protection** - Cross-site request forgery protection
- **Session Security** - Secure session management with PostgreSQL storage
- **JWT Authentication** - JSON Web Token authentication
- **Input Validation** - Request validation and sanitization

## Logging

The application uses Winston for logging with different levels:
- `error` - Error messages
- `warn` - Warning messages
- `info` - Informational messages
- `debug` - Debug messages

Logs are written to files in the `logs/` directory and also output to the console in development mode.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

ISC

## Author

Rafael Vasco <rafaelvasco87@gmail.com>
