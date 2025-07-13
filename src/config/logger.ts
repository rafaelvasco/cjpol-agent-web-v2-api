import winston from 'winston';
import path from 'path';
import { IS_PRODUCTION } from './env';

// Define log directory
const logDir = path.join(__dirname, '../../logs');

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Create console format with colors for development
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    // Ensure message is a string
    const formattedMessage = typeof message === 'object'
      ? JSON.stringify(message, null, 2)
      : message;
      
    // Format metadata
    const metaString = Object.keys(meta).length
      ? JSON.stringify(meta, null, 2)
      : '';
      
    return `${timestamp} ${level}: ${formattedMessage} ${metaString}`;
  })
);

// Create logger instance
const logger = winston.createLogger({
  level: IS_PRODUCTION ? 'info' : 'debug',
  format: logFormat,
  defaultMeta: { service: 'cjpol-api' },
  transports: [
    // Write all logs with level 'error' and below to error.log
    new winston.transports.File({ 
      filename: path.join(logDir, 'error.log'), 
      level: 'error',
      // Create directory if it doesn't exist
      options: { flags: 'a', mkdir: true }
    }),
    
    // Write all logs to combined.log
    new winston.transports.File({ 
      filename: path.join(logDir, 'combined.log'),
      options: { flags: 'a', mkdir: true }
    })
  ]
});

// Add console transport for non-production environments
if (!IS_PRODUCTION) {
  logger.add(new winston.transports.Console({
    format: consoleFormat
  }));
}

// Create a stream object for Morgan integration
export const stream = {
  write: (message: string) => {
    logger.info(message.trim());
  }
};

// Export logger
export default logger;