import { Router } from 'express';
import * as messageController from '../controllers/messageController';
import { authenticate } from '../middleware/auth';

const router = Router();

// Message examples are now defined locally in the frontend

// Apply authentication middleware to all other routes
router.use(authenticate);

// Get messages for a conversation
router.get('/conversation/:conversationId', messageController.getConversationMessages);

// Get messages by session ID
router.get('/session/:sessionId', messageController.getMessagesBySessionId);

// Send a message to the AI
router.post('/send', messageController.sendMessageToAI);

// Update messages with missing fields
router.post('/update/:sessionId/:conversationId', messageController.updateN8NMessages);

export default router;