/// <reference path="../types/express.d.ts" />
import { Request, Response, NextFunction } from 'express';
import { BadRequestError, ForbiddenError } from '../utils/errors';
import { supabaseAdmin } from '../config/supabase';
import logger from '../config/logger';

/**
 * Get system statistics
 * @route GET /api/admin/stats
 */
export const getSystemStats = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new BadRequestError('User not authenticated');
    }
    
    // Check if user is admin
    if (req.user.role !== 'admin') {
      throw new ForbiddenError('Admin access required');
    }

    // Get total users count
    const { count: totalUsers, error: usersError } = await supabaseAdmin
      .from('cjpol_users')
      .select('*', { count: 'exact', head: true });

    if (usersError) {
      logger.error('Error counting total users', { error: usersError });
      throw new Error('Failed to get users count');
    }

    // Get active users count (users who are active)
    const { count: activeUsers, error: activeUsersError } = await supabaseAdmin
      .from('cjpol_users')
      .select('*', { count: 'exact', head: true })
      .eq('active', true);

    if (activeUsersError) {
      logger.error('Error counting active users', { error: activeUsersError });
      throw new Error('Failed to get active users count');
    }

    // Get total conversations count
    const { count: totalConversations, error: conversationsError } = await supabaseAdmin
      .from('cjpol_conversations')
      .select('*', { count: 'exact', head: true });

    if (conversationsError) {
      logger.error('Error counting conversations', { error: conversationsError });
      throw new Error('Failed to get conversations count');
    }

    // Get total messages count
    const { count: totalMessages, error: messagesError } = await supabaseAdmin
      .from('cjpol_messages')
      .select('*', { count: 'exact', head: true });

    if (messagesError) {
      logger.error('Error counting messages', { error: messagesError });
      throw new Error('Failed to get messages count');
    }

    // Get AI messages count (from_ai = true)
    const { count: aiMessages, error: aiMessagesError } = await supabaseAdmin
      .from('cjpol_messages')
      .select('*', { count: 'exact', head: true })
      .eq('from_ai', true);

    if (aiMessagesError) {
      logger.error('Error counting AI messages', { error: aiMessagesError });
      throw new Error('Failed to get AI messages count');
    }

    // Get user messages count (from_ai = false)
    const { count: userMessages, error: userMessagesError } = await supabaseAdmin
      .from('cjpol_messages')
      .select('*', { count: 'exact', head: true })
      .eq('from_ai', false);

    if (userMessagesError) {
      logger.error('Error counting user messages', { error: userMessagesError });
      throw new Error('Failed to get user messages count');
    }

    const stats = {
      totalUsers: totalUsers || 0,
      activeUsers: activeUsers || 0,
      totalConversations: totalConversations || 0,
      totalMessages: totalMessages || 0,
      aiMessages: aiMessages || 0,
      userMessages: userMessages || 0
    };

    res.status(200).json({
      status: 'success',
      data: stats
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get user activity metrics (optimized version)
 * @route GET /api/admin/user-activity
 */
export const getUserActivityMetrics = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new BadRequestError('User not authenticated');
    }
    
    // Check if user is admin
    if (req.user.role !== 'admin') {
      throw new ForbiddenError('Admin access required');
    }

    // Get all users
    const { data: users, error: usersError } = await supabaseAdmin
      .from('cjpol_users')
      .select('id, name, email, updated_at')
      .order('updated_at', { ascending: false });

    if (usersError) {
      logger.error('Error fetching users', { error: usersError });
      throw new Error('Failed to get users for activity metrics');
    }

    // Get all conversations with their user_ids (single query for both counting and mapping)
    const { data: allConversations, error: convError } = await supabaseAdmin
      .from('cjpol_conversations')
      .select('id, user_id');

    if (convError) {
      logger.error('Error fetching conversations', { error: convError });
      throw new Error('Failed to get conversations');
    }

    // Create a map of conversation_id to user_id for message counting
    const conversationToUserMap = new Map<string, string>();
    (allConversations || []).forEach((conv: any) => {
      conversationToUserMap.set(conv.id, conv.user_id);
    });

    // Get all messages
    const { data: allMessages, error: msgError } = await supabaseAdmin
      .from('cjpol_messages')
      .select('conversation_id');

    if (msgError) {
      logger.error('Error fetching messages', { error: msgError });
      throw new Error('Failed to get messages');
    }

    // Count conversations per user
    const conversationCountMap = new Map<string, number>();
    (allConversations || []).forEach((conv: any) => {
      const userId = conv.user_id;
      conversationCountMap.set(userId, (conversationCountMap.get(userId) || 0) + 1);
    });

    // Count messages per user
    const messageCountMap = new Map<string, number>();
    (allMessages || []).forEach((msg: any) => {
      const userId = conversationToUserMap.get(msg.conversation_id);
      if (userId) {
        messageCountMap.set(userId, (messageCountMap.get(userId) || 0) + 1);
      }
    });

    // Combine data
    const activityMetrics = (users || []).map((user: any) => ({
      userId: user.id,
      name: user.name,
      email: user.email,
      conversationCount: conversationCountMap.get(user.id) || 0,
      messageCount: messageCountMap.get(user.id) || 0,
      lastActive: user.updated_at
    }));

    res.status(200).json({
      status: 'success',
      data: activityMetrics
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get AI performance metrics
 * @route GET /api/admin/ai-performance
 */
export const getAIPerformanceMetrics = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new BadRequestError('User not authenticated');
    }
    
    // Check if user is admin
    if (req.user.role !== 'admin') {
      throw new ForbiddenError('Admin access required');
    }

    // Get total AI requests (messages from AI)
    const { count: totalRequests, error: requestsError } = await supabaseAdmin
      .from('cjpol_messages')
      .select('*', { count: 'exact', head: true })
      .eq('from_ai', true);

    if (requestsError) {
      logger.error('Error counting AI requests', { error: requestsError });
      throw new Error('Failed to get AI requests count');
    }

    // For average response time, we would need to track request/response timing
    // Since we don't have that data in the current schema, we'll return null
    const averageResponseTime = null;

    // Get requests per day for the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: dailyRequests, error: dailyError } = await supabaseAdmin
      .from('cjpol_messages')
      .select('timestamp')
      .eq('from_ai', true)
      .gte('timestamp', thirtyDaysAgo.toISOString())
      .order('timestamp', { ascending: true });

    if (dailyError) {
      logger.error('Error fetching daily AI requests', { error: dailyError });
      throw new Error('Failed to get daily AI requests');
    }

    // Group requests by date
    const requestsPerDay: { date: string; count: number }[] = [];
    const dateCountMap = new Map<string, number>();

    (dailyRequests || []).forEach((request: any) => {
      const date = new Date(request.timestamp).toISOString().split('T')[0]; // Get YYYY-MM-DD
      dateCountMap.set(date, (dateCountMap.get(date) || 0) + 1);
    });

    // Convert map to array and fill missing dates with 0
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      requestsPerDay.push({
        date: dateStr,
        count: dateCountMap.get(dateStr) || 0
      });
    }

    const performanceMetrics = {
      totalRequests: totalRequests || 0,
      averageResponseTime,
      requestsPerDay
    };

    res.status(200).json({
      status: 'success',
      data: performanceMetrics
    });
  } catch (error) {
    next(error);
  }
};