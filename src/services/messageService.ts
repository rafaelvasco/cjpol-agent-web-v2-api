import { supabase, supabaseAdmin } from "../config/supabase";
import { ApiError } from "../utils/errors";
import logger from "../config/logger";
import axios from "axios";

// Define types
interface Message {
  id: string;
  conversation_id: string; // This should be string | null if messages can exist before conv is saved
  session_id: string;
  message: {
    type: string;
    content: string;
  };
  timestamp: string;
  from_ai: boolean;
  client_ip: string | null; // Added client_ip
}

/**
 * Get messages for a conversation
 */
export const getConversationMessages = async (
  conversationId: string
): Promise<Message[]> => {
  const { data, error } = await supabaseAdmin
    .from("cjpol_messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("timestamp", { ascending: true });

  if (error) {
    logger.error("Error fetching messages", { error, conversationId });
    throw new ApiError(`Error fetching messages: ${error.message}`, 500);
  }

  return data || [];
};

/**
 * Get messages by session ID
 */
export const getMessagesBySessionId = async (
  sessionId: string
): Promise<Message[]> => {
  const { data, error } = await supabaseAdmin
    .from("cjpol_messages")
    .select("*")
    .eq("session_id", sessionId)
    .order("timestamp", { ascending: true });

  if (error) {
    logger.error("Error fetching messages by session ID", { error, sessionId });
    throw new ApiError(
      `Error fetching messages by session ID: ${error.message}`,
      500
    );
  }

  return data || [];
};

/**
 * Update messages created by N8N with missing fields
 */
export const updateN8NMessages = async (
  sessionId: string,
  conversationId: string
): Promise<void> => {
  try {
    // Find messages with this session_id that don't have conversation_id set yet
    // or from_ai is not set.
    const { data: incompleteMessages, error } = await supabaseAdmin
      .from("cjpol_messages")
      .select("id, message")
      .eq("session_id", sessionId)
      .or("conversation_id.is.null,from_ai.is.null"); // Look for messages needing update

    if (error) {
      logger.error("Error finding incomplete messages for update", {
        error,
        sessionId,
      });
      throw new ApiError(
        `Error finding incomplete messages: ${error.message}`,
        500
      );
    }

    if (!incompleteMessages || incompleteMessages.length === 0) {
      logger.info(
        `No incomplete messages found for session ${sessionId} requiring update with convId ${conversationId}.`
      );
      return;
    }

    for (const msg of incompleteMessages) {
      const messageContent = msg.message as {
        type: string;
        content: string;
        response?: any;
        sources?: any;
      };
      const isAIMessage =
        messageContent.type === "ai" ||
        (messageContent.response &&
          Object.keys(messageContent.response).length > 0);

      const { error: updateError } = await supabaseAdmin
        .from("cjpol_messages")
        .update({
          conversation_id: conversationId, // Ensure conversation_id is set
          from_ai: isAIMessage, // Ensure from_ai is set
        })
        .eq("id", msg.id)
        // Only update if conversation_id was null or from_ai was null
        .or("conversation_id.is.null,from_ai.is.null");

      if (updateError) {
        logger.error("Error updating message with conversation_id/from_ai", {
          error: updateError,
          messageId: msg.id,
          conversationId,
        });
        // Decide if you want to throw or continue
      } else {
        logger.info(
          `Message ${msg.id} updated successfully with convId ${conversationId} and from_ai ${isAIMessage}.`
        );
      }
    }
  } catch (error) {
    // Log the outer error as well
    logger.error("General error in updateN8NMessages", {
      error,
      sessionId,
      conversationId,
    });
    if (error instanceof ApiError) throw error; // Re-throw known API errors
    throw new ApiError("Error updating N8N messages", 500); // Wrap unknown errors
  }
};

/**
 * Send a message to the AI agent via N8N webhook
 */
export const sendMessageToAI = async (
  conversationId: string | null,
  sessionId: string,
  content: string
): Promise<any> => {
  try {
    const webhookUrl = process.env.N8N_WEBHOOK_URL;
    const cfAccessClientId = process.env.CF_ACCESS_CLIENT_ID;
    const cfAccessClientSecret = process.env.CF_ACCESS_CLIENT_SECRET;

    if (!webhookUrl) {
      logger.error("N8N_WEBHOOK_URL is not defined in environment variables.");
      throw new ApiError("N8N webhook URL not configured", 500);
    }

    if (!cfAccessClientId || !cfAccessClientSecret) {
      logger.error(
        "Cloudflare Access credentials are not defined in environment variables."
      );
      throw new ApiError("Cloudflare Access credentials not configured", 500);
    }

    // Log the userId for internal tracking, but don't send it to N8N
    logger.info(
      `Sending message to N8N: (conversationId=${conversationId}, sessionId=${sessionId}`
    );
    const response = await axios.post(
      webhookUrl,
      {
        sessionId,
        query: content,
      },
      {
        headers: {
          "CF-Access-Client-Id": cfAccessClientId,
          "CF-Access-Client-Secret": cfAccessClientSecret,
        },
      }
    );

    logger.info("Received response from N8N webhook.", { data: response.data });
    return response.data;
  } catch (error) {
    logger.error("Error sending message to AI via N8N", {
      message: error instanceof Error ? error.message : String(error),
      axiosError: axios.isAxiosError(error) ? error.toJSON() : undefined,

      conversationId,
      sessionId,
    });

    if (axios.isAxiosError(error)) {
      throw new ApiError(
        `N8N Webhook Error: ${error.response?.data?.message || error.message}`,
        error.response?.status || 500
      );
    }
    throw new ApiError("Error sending message to AI agent", 500);
  }
};

// Message examples are now defined locally in the frontend
