/// <reference path="../types/express.d.ts" />
import { Request, Response, NextFunction } from 'express';
import * as messageService from '../services/messageService';
import * as conversationService from '../services/conversationService';
import * as userService from '../services/userService';
import { ApiError } from '../utils/errors';
import logger from '../config/logger';
import { Conversation } from '../services/conversationService'; // Assuming Conversation type is exported

/**
 * Get messages for a conversation
 */
export const getConversationMessages = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return next(new ApiError('User not authenticated', 401));
    }

    // Check if the conversation exists and belongs to the user
    const conversation = await conversationService.getConversationById(conversationId);
    
    if (!conversation) {
      return next(new ApiError('Conversation not found', 404));
    }

    // Check if the conversation belongs to the user or user is admin
    if (conversation.user_id !== userId && req.user?.role !== 'admin') {
      return next(new ApiError('Not authorized to access this conversation', 403));
    }

    const messages = await messageService.getConversationMessages(conversationId);

    res.status(200).json({
      status: 'success',
      data: {
        messages
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get messages by session ID
 */
export const getMessagesBySessionId = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return next(new ApiError('User not authenticated', 401));
    }

    // Check if the conversation exists and belongs to the user
    const conversation = await conversationService.getConversationBySessionId(sessionId);
    
    if (!conversation) {
      return next(new ApiError('Conversation not found', 404));
    }

    // Check if the conversation belongs to the user or user is admin
    if (conversation.user_id !== userId && req.user?.role !== 'admin') {
      return next(new ApiError('Not authorized to access this conversation', 403));
    }

    const messages = await messageService.getMessagesBySessionId(sessionId);

    res.status(200).json({
      status: 'success',
      data: {
        messages
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Send a message to the AI
 */
export const sendMessageToAI = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { conversationId, content, sessionId: sessionIdFromRequest } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return next(new ApiError('User not authenticated', 401));
    }

    if (!content) {
      return next(new ApiError('Message content is required', 400));
    }

    let existingConversation: Conversation | null = null;
    let finalSessionId: string;
    let finalConversationId: string | null = null;

    if (conversationId) {
      // Existing conversation flow
      logger.info(`sendMessageToAI: Existing conversation flow for ID: ${conversationId}`);
      const fetchedConversation = await conversationService.getConversationById(conversationId);
      if (!fetchedConversation) {
        logger.warn(`sendMessageToAI: Conversation not found for ID: ${conversationId}`);
        return next(new ApiError('Conversation not found', 404));
      }
      if (fetchedConversation.user_id !== userId) {
        logger.warn(`sendMessageToAI: User ${userId} not authorized for conversation ${conversationId}`);
        return next(new ApiError('Not authorized to send messages to this conversation', 403));
      }
      existingConversation = fetchedConversation;
      finalSessionId = existingConversation.session_id;
      finalConversationId = existingConversation.id;
    } else {
      // New conversation flow
      logger.info(`sendMessageToAI: New conversation flow.`);
      if (!sessionIdFromRequest) {
        logger.warn(`sendMessageToAI: Session ID is required for new conversation from user ${userId}`);
        return next(new ApiError('Session ID is required for new conversations', 400));
      }
      finalSessionId = sessionIdFromRequest;
      // finalConversationId remains null for new conversations until created by frontend post-response
    }
    
    logger.info(`sendMessageToAI: Using Session ID: ${finalSessionId} and Conversation ID: ${finalConversationId || 'N/A (new)'}`);

    // Check if the user has enough credits
    const hasCredits = await userService.consumeCredits(userId, 1);
    if (!hasCredits) {
      logger.warn(`sendMessageToAI: User ${userId} has not enough credits.`);
      return next(new ApiError('Not enough credits to send message', 402));
    }

    // Send the message to the AI
    const result = await messageService.sendMessageToAI(
      finalConversationId, // This can be null for new conversations
      finalSessionId,
      content
    );

    res.status(200).json({
      status: 'success',
      data: result
    });
  } catch (error) {
    logger.error('Error in sendMessageToAI controller:', error);
    next(error);
  }
};

/**
 * Update messages with missing fields
 */
export const updateN8NMessages = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sessionId, conversationId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return next(new ApiError('User not authenticated', 401));
    }

    // Check if the conversation exists and belongs to the user
    const conversation = await conversationService.getConversationById(conversationId);
    
    if (!conversation) {
      return next(new ApiError('Conversation not found', 404));
    }

    // Check if the conversation belongs to the user or user is admin
    if (conversation.user_id !== userId && req.user?.role !== 'admin') {
      return next(new ApiError('Not authorized to update messages for this conversation', 403));
    }

    await messageService.updateN8NMessages(sessionId, conversationId);

    res.status(200).json({
      status: 'success',
      message: 'Messages updated successfully'
    });
  } catch (error) {
    next(error);
  }
};

// Message examples are now defined locally in the frontend