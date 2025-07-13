/// <reference path="../types/express.d.ts" />
import { Request, Response, NextFunction } from 'express';
import * as conversationService from '../services/conversationService';
import { ApiError } from '../utils/errors';

/**
 * Create a new conversation
 */
export const createConversation = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { title, sessionId } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return next(new ApiError('User not authenticated', 401));
    }

    if (!title) {
      return next(new ApiError('Title is required', 400));
    }

    const conversation = await conversationService.createConversation(userId, title, sessionId);

    res.status(201).json({
      status: 'success',
      data: {
        conversation
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all conversations for the current user
 */
export const getUserConversations = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return next(new ApiError('User not authenticated', 401));
    }

    const conversations = await conversationService.getUserConversations(userId);

    res.status(200).json({
      status: 'success',
      data: {
        conversations
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get a conversation by ID
 */
export const getConversationById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return next(new ApiError('User not authenticated', 401));
    }

    const conversation = await conversationService.getConversationById(id);

    if (!conversation) {
      return next(new ApiError('Conversation not found', 404));
    }

    // Check if the conversation belongs to the user or user is admin
    if (conversation.user_id !== userId && req.user?.role !== 'admin') {
      return next(new ApiError('Not authorized to access this conversation', 403));
    }

    res.status(200).json({
      status: 'success',
      data: {
        conversation
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get a conversation by session ID
 */
export const getConversationBySessionId = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return next(new ApiError('User not authenticated', 401));
    }

    const conversation = await conversationService.getConversationBySessionId(sessionId);

    if (!conversation) {
      return next(new ApiError('Conversation not found', 404));
    }

    // Check if the conversation belongs to the user or user is admin
    if (conversation.user_id !== userId && req.user?.role !== 'admin') {
      return next(new ApiError('Not authorized to access this conversation', 403));
    }

    res.status(200).json({
      status: 'success',
      data: {
        conversation
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update a conversation
 */
export const updateConversation = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return next(new ApiError('User not authenticated', 401));
    }

    // Get the conversation to check ownership
    const existingConversation = await conversationService.getConversationById(id);

    if (!existingConversation) {
      return next(new ApiError('Conversation not found', 404));
    }

    // Check if the conversation belongs to the user or user is admin
    if (existingConversation.user_id !== userId && req.user?.role !== 'admin') {
      return next(new ApiError('Not authorized to update this conversation', 403));
    }

    const conversation = await conversationService.updateConversation(id, updates);

    res.status(200).json({
      status: 'success',
      data: {
        conversation
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a conversation
 */
export const deleteConversation = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return next(new ApiError('User not authenticated', 401));
    }

    // Get the conversation to check ownership
    const existingConversation = await conversationService.getConversationById(id);

    if (!existingConversation) {
      return next(new ApiError('Conversation not found', 404));
    }

    // Check if the conversation belongs to the user or user is admin
    if (existingConversation.user_id !== userId && req.user?.role !== 'admin') {
      return next(new ApiError('Not authorized to delete this conversation', 403));
    }

    await conversationService.deleteConversation(id);

    res.status(200).json({
      status: 'success',
      data: null
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all conversations (admin only)
 */
export const getAllConversations = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Check if user is admin
    if (req.user?.role !== 'admin') {
      return next(new ApiError('Not authorized to access all conversations', 403));
    }

    const conversations = await conversationService.getAllConversations();

    res.status(200).json({
      status: 'success',
      data: {
        conversations
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get conversations by user ID (admin only)
 */
export const getConversationsByUserId = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.params;

    // Check if user is admin
    if (req.user?.role !== 'admin') {
      return next(new ApiError('Not authorized to access user conversations', 403));
    }

    const conversations = await conversationService.getConversationsByUserId(userId);

    res.status(200).json({
      status: 'success',
      data: {
        conversations
      }
    });
  } catch (error) {
    next(error);
  }
};