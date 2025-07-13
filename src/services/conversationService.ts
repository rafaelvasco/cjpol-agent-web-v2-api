import { supabase, supabaseAdmin } from '../config/supabase';
import { ApiError } from '../utils/errors';

// Define types
export interface Conversation { // Added export
  id: string;
  user_id: string;
  title: string;
  session_id: string;
  created_at: string;
}

/**
 * Create a new conversation
 */
export const createConversation = async (
  userId: string,
  title: string,
  sessionId?: string
): Promise<Conversation> => {
  // Generate a session ID if not provided
  const newSessionId = sessionId || `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  
  const { data, error } = await supabaseAdmin
    .from('cjpol_conversations')
    .insert({
      user_id: userId,
      title,
      session_id: newSessionId,
    })
    .select()
    .single();
  
  if (error) {
    throw new ApiError(`Error creating conversation: ${error.message}`, 500);
  }
  
  return data;
};

/**
 * Get all conversations for a user
 */
export const getUserConversations = async (userId: string): Promise<Conversation[]> => {
  const { data, error } = await supabaseAdmin
    .from('cjpol_conversations')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  
  if (error) {
    throw new ApiError(`Error fetching conversations: ${error.message}`, 500);
  }
  
  return data || [];
};

/**
 * Get a conversation by ID
 */
export const getConversationById = async (conversationId: string): Promise<Conversation | null> => {
  const { data, error } = await supabaseAdmin
    .from('cjpol_conversations')
    .select('*')
    .eq('id', conversationId)
    .single();
  
  if (error) {
    // If the error is because the conversation doesn't exist, return null
    if (error.code === 'PGRST116') {
      return null;
    }
    throw new ApiError(`Error fetching conversation: ${error.message}`, 500);
  }
  
  return data;
};

/**
 * Get a conversation by session ID
 */
export const getConversationBySessionId = async (sessionId: string): Promise<Conversation | null> => {
  const { data, error } = await supabaseAdmin
    .from('cjpol_conversations')
    .select('*')
    .eq('session_id', sessionId)
    .single();
  
  if (error) {
    // If the error is because the conversation doesn't exist, return null
    if (error.code === 'PGRST116') {
      return null;
    }
    throw new ApiError(`Error fetching conversation by session ID: ${error.message}`, 500);
  }
  
  return data;
};

/**
 * Update a conversation
 */
export const updateConversation = async (
  conversationId: string,
  updates: Partial<Conversation>
): Promise<Conversation> => {
  // Remove id from updates if present
  const { id, ...validUpdates } = updates as any;
  
  const { data, error } = await supabaseAdmin
    .from('cjpol_conversations')
    .update(validUpdates)
    .eq('id', conversationId)
    .select()
    .single();
  
  if (error) {
    throw new ApiError(`Error updating conversation: ${error.message}`, 500);
  }
  
  return data;
};

/**
 * Delete a conversation
 */
export const deleteConversation = async (conversationId: string): Promise<boolean> => {
  // First delete all messages associated with this conversation
  // Use supabaseAdmin to delete messages across users (bypass RLS)
  const { error: messagesError } = await supabaseAdmin
    .from('cjpol_messages')
    .delete()
    .eq('conversation_id', conversationId);
  
  if (messagesError) {
    throw new ApiError(`Error deleting conversation messages: ${messagesError.message}`, 500);
  }
  
  // Then delete the conversation
  // Use supabaseAdmin to delete the conversation (bypass RLS)
  const { error } = await supabaseAdmin
    .from('cjpol_conversations')
    .delete()
    .eq('id', conversationId);
  
  if (error) {
    throw new ApiError(`Error deleting conversation: ${error.message}`, 500);
  }
  
  return true;
};

/**
 * Get all conversations (admin only)
 */
export const getAllConversations = async (): Promise<Conversation[]> => {
  // Admin-only function should use supabaseAdmin to bypass RLS
  const { data, error } = await supabaseAdmin
    .from('cjpol_conversations')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) {
    throw new ApiError(`Error fetching all conversations: ${error.message}`, 500);
  }
  
  return data || [];
};

/**
 * Get conversations by user ID (admin only)
 */
export const getConversationsByUserId = async (userId: string): Promise<Conversation[]> => {
  // Admin-only function should use supabaseAdmin to bypass RLS
  const { data, error } = await supabaseAdmin
    .from('cjpol_conversations')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  
  if (error) {
    throw new ApiError(`Error fetching conversations by user ID: ${error.message}`, 500);
  }
  
  return data || [];
};