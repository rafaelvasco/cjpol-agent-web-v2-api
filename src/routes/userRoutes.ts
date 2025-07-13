import { Router } from 'express';
import { 
  getCurrentUser, 
  updateCurrentUser, 
  getUserByIdAdmin, 
  updateUserAdmin,
  getAllUsersAdmin
} from '../controllers/userController';
import { authenticate, requireAdmin, validateCsrf } from '../middleware/auth';
import { apiLimiter, sensitiveOpLimiter } from '../middleware/rateLimit';

const router = Router();

/**
 * @route GET /api/users
 * @desc Get all users (admin only)
 * @access Admin
 */
router.get('/', authenticate, requireAdmin, apiLimiter, getAllUsersAdmin);

/**
 * @route GET /api/users/me
 * @desc Get current user profile
 * @access Private
 */
router.get('/me', authenticate, apiLimiter, getCurrentUser);

/**
 * @route PATCH /api/users/me
 * @desc Update current user profile
 * @access Private
 */
router.patch('/me', authenticate, validateCsrf, apiLimiter, updateCurrentUser);

/**
 * @route GET /api/users/:id
 * @desc Get user by ID (admin only)
 * @access Admin
 */
router.get('/:id', authenticate, requireAdmin, apiLimiter, getUserByIdAdmin);

/**
 * @route PATCH /api/users/:id
 * @desc Update user by ID (admin only)
 * @access Admin
 */
router.patch(
  '/:id', 
  authenticate, 
  requireAdmin, 
  validateCsrf, 
  sensitiveOpLimiter, 
  updateUserAdmin
);

export default router;