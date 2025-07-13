import { Router } from 'express';
import * as conversationController from '../controllers/conversationController';
import { authenticate } from '../middleware/auth';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticate);

// Get all conversations for the current user
router.get('/', conversationController.getUserConversations);

// Create a new conversation
router.post('/', conversationController.createConversation);

// Get a conversation by ID
router.get('/:id', conversationController.getConversationById);

// Update a conversation
router.patch('/:id', conversationController.updateConversation);

// Delete a conversation
router.delete('/:id', conversationController.deleteConversation);

// Get a conversation by session ID
router.get('/session/:sessionId', conversationController.getConversationBySessionId);

// Admin routes
router.get('/admin/all', conversationController.getAllConversations);
router.get('/admin/user/:userId', conversationController.getConversationsByUserId);

export default router;