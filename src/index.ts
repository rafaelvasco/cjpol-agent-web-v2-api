import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import pg from 'pg';
import connectPgSimple from 'connect-pg-simple';
import routes from './routes';
import { 
  PORT, 
  CORS_ORIGIN, 
  SESSION_SECRET, 
  SESSION_COOKIE_NAME, 
  SESSION_COOKIE_MAX_AGE,
  DATABASE_URL,
  IS_PRODUCTION 
} from './config/env';
import { errorHandler, notFoundHandler, setupUnhandledErrorHandlers } from './middleware/errorHandler';
import logger from './config/logger';

// Initialize Express app
const app = express();

// Import error utilities
import { InternalServerError } from './utils/errors';

// Set up session store
let sessionStore;

// Require DATABASE_URL to be defined for PostgreSQL session store
if (!DATABASE_URL) {
  const errorMessage = 'DATABASE_URL environment variable is not defined';
  logger.error(errorMessage);
  throw new InternalServerError(errorMessage, true);
}

// Set up PostgreSQL session store
const PgSession = connectPgSimple(session);
try {
  const pgPool = new pg.Pool({
    connectionString: DATABASE_URL
  });
  
  // Test the connection
  pgPool.query('SELECT NOW()')
    .then(() => {
      logger.info('Successfully connected to PostgreSQL database');
    })
    .catch((err) => {
      const errorMessage = `Database connection error: ${err.message}`;
      logger.error(errorMessage);
      // Shutdown the application with a non-zero exit code
      process.exit(1);
    });
  
  // Create PostgreSQL session store
  sessionStore = new PgSession({
    pool: pgPool,
    tableName: 'session',
    createTableIfMissing: true
  });
  
} catch (error) {
  const errorMessage = 'Failed to create database pool: ' +
    (error instanceof Error ? error.message : String(error));
  logger.error(errorMessage);
  throw new InternalServerError(errorMessage, true);
}

// Set security HTTP headers
app.use(helmet());

// Parse JSON request body
app.use(express.json({ limit: '10kb' }));

// Parse URL-encoded request body
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Parse cookies
app.use(cookieParser());

// Enable CORS
app.use(cors({
  origin: CORS_ORIGIN,
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'X-Requested-With'],
  exposedHeaders: ['X-CSRF-Token'],
  preflightContinue: false,
  optionsSuccessStatus: 200
}));

// Set up session
app.use(session({
  store: sessionStore, // PostgreSQL session store is required
  name: SESSION_COOKIE_NAME,
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: IS_PRODUCTION,
    sameSite: IS_PRODUCTION ? 'none' : 'lax',
    maxAge: SESSION_COOKIE_MAX_AGE
  }
}));

// Mount API routes
app.use('/api', routes);

// Handle 404 errors
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

// Set up handlers for uncaught exceptions and unhandled rejections
setupUnhandledErrorHandlers();

// Start server
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
});

// Export app for testing
export default app;