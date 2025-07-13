import { Router } from 'express';
import { wordpressAuth, getSession, logout } from '../controllers/authController';
import { authenticate, validateCsrf } from '../middleware/auth';
import { authLimiter } from '../middleware/rateLimit';

const router = Router();

/**
 * @route POST /api/auth/login
 * @desc Authenticate with WordPress credentials
 * @access Public
 */
router.post('/login', authLimiter, wordpressAuth);

/**
 * @route GET /api/auth/session
 * @desc Get current user session
 * @access Private
 */
router.get('/session', authenticate, getSession);

/**
 * @route POST /api/auth/logout
 * @desc Logout user
 * @access Private
 */
router.post('/logout', authenticate, validateCsrf, logout);

export default router;