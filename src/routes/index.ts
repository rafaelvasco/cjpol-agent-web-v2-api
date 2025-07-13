import { Router } from 'express';
import authRoutes from './authRoutes';
import userRoutes from './userRoutes';
import conversationRoutes from './conversationRoutes';
import messageRoutes from './messageRoutes';
import adminRoutes from './adminRoutes';

const router = Router();

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'API is running',
    timestamp: new Date().toISOString()
  });
});

// Mount routes
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/conversations', conversationRoutes);
router.use('/messages', messageRoutes);
router.use('/admin', adminRoutes);

export default router;