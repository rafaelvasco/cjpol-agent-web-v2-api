import { Router } from 'express';
import { 
  getSystemStats,
  getUserActivityMetrics,
  getAIPerformanceMetrics
} from '../controllers/adminController';
import { authenticate, requireAdmin } from '../middleware/auth';
import { apiLimiter } from '../middleware/rateLimit';

const router = Router();

/**
 * @route GET /api/admin/stats
 * @desc Get system statistics
 * @access Admin
 */
router.get('/stats', authenticate, requireAdmin, apiLimiter, getSystemStats);

/**
 * @route GET /api/admin/user-activity
 * @desc Get user activity metrics
 * @access Admin
 */
router.get('/user-activity', authenticate, requireAdmin, apiLimiter, getUserActivityMetrics);

/**
 * @route GET /api/admin/ai-performance
 * @desc Get AI performance metrics
 * @access Admin
 */
router.get('/ai-performance', authenticate, requireAdmin, apiLimiter, getAIPerformanceMetrics);

export default router;