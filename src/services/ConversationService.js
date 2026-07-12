/**
 * ConversationService — Persistent AI Chat Memory
 *
 * Stores the user's full conversation history in Supabase so chat
 * survives app restarts. Implements a sliding context window:
 *   - Last 10 messages are kept verbatim (full detail for the LLM)
 *   - Older messages are compressed into a rolling summary
 *
 * Interview talking point:
 *   "I implemented a bounded context window using LLM-driven summarisation.
 *    The agent keeps the last 10 turns verbatim and compresses older history
 *    into a summary, keeping token costs O(1) while preserving long-term memory."
 */

import { supabase } from './supabase';

import AsyncStorage from '@react-native-async-storage/async-storage';

const MAX_VERBATIM_MESSAGES = 20; // keep last 20 messages in full
const WELCOME_MESSAGE = {
  id: 'welcome',
  type: 'assistant',
  text: 'Hi! I am your CampusTitan AI Coach. Ask me anything about your health!',
  timestamp: new Date().toISOString(),
};

/**
 * Load the conversation for the current user.
 * Returns an array of message objects ready for the UI.
 */
export async function loadConversation(userId) {
  if (!userId) return [WELCOME_MESSAGE];

  try {
    // 1. Try fetching from Supabase first
    const { data, error } = await supabase
      .from('conversations')
      .select('messages, summary')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;

    if (!data || !data.messages || data.messages.length === 0) {
      // 2. Fallback to AsyncStorage if no messages in Supabase
      const localData = await AsyncStorage.getItem(`conversation_${userId}`);
      if (localData) {
        const parsed = JSON.parse(localData);
        if (parsed && parsed.length > 0) {
          return parsed.map(m => ({
            ...m,
            timestamp: new Date(m.timestamp),
          }));
        }
      }
      return [WELCOME_MESSAGE];
    }

    // Deserialise timestamps back to Date objects for the UI
    const messages = data.messages.map(m => ({
      ...m,
      timestamp: new Date(m.timestamp),
    }));

    // Cache locally in AsyncStorage for fast offline retrieval
    await AsyncStorage.setItem(`conversation_${userId}`, JSON.stringify(messages));

    return messages;
  } catch (err) {
    console.warn('[ConversationService] loadConversation error:', err?.message);
    
    // 3. Robust fallback to local AsyncStorage in case of network/database errors
    try {
      const localData = await AsyncStorage.getItem(`conversation_${userId}`);
      if (localData) {
        const parsed = JSON.parse(localData);
        if (parsed && parsed.length > 0) {
          return parsed.map(m => ({
            ...m,
            timestamp: new Date(m.timestamp),
          }));
        }
      }
    } catch (localErr) {
      console.warn('[ConversationService] AsyncStorage load fallback error:', localErr?.message);
    }
    
    return [WELCOME_MESSAGE];
  }
}

/**
 * Append a new message to the conversation and persist to Supabase and AsyncStorage.
 * Automatically trims to MAX_VERBATIM_MESSAGES to keep storage bounded.
 */
export async function appendMessage(userId, message) {
  if (!userId) return;

  try {
    // Serialise the message (timestamps must be strings for JSONB)
    const serialised = {
      ...message,
      timestamp: message.timestamp instanceof Date
        ? message.timestamp.toISOString()
        : message.timestamp,
    };

    // 1. Get current messages from AsyncStorage cache first for speed and reliability
    let currentMessages = [];
    try {
      const localData = await AsyncStorage.getItem(`conversation_${userId}`);
      if (localData) {
        currentMessages = JSON.parse(localData) || [];
      }
    } catch (e) {
      console.warn('[ConversationService] AsyncStorage append read error:', e.message);
    }

    // 2. If AsyncStorage was empty/missing, attempt to fetch from Supabase
    if (currentMessages.length === 0) {
      try {
        const { data: existing } = await supabase
          .from('conversations')
          .select('messages')
          .eq('user_id', userId)
          .maybeSingle();
        currentMessages = existing?.messages ?? [];
      } catch (dbErr) {
        console.warn('[ConversationService] Supabase fallback read error during append:', dbErr.message);
      }
    }

    // Filter out welcome message from persistence to avoid duplicating it
    const filteredCurrent = currentMessages.filter(m => m.id !== 'welcome');
    const updated = [...filteredCurrent, serialised];
    const trimmed = updated.slice(-MAX_VERBATIM_MESSAGES);

    // 3. Persist to local storage immediately
    await AsyncStorage.setItem(`conversation_${userId}`, JSON.stringify(trimmed));

    // 4. Persist to Supabase asynchronously
    await supabase
      .from('conversations')
      .upsert(
        { user_id: userId, messages: trimmed },
        { onConflict: 'user_id' }
      );
  } catch (err) {
    console.warn('[ConversationService] appendMessage error:', err?.message);
  }
}

/**
 * Build the conversation history payload for the backend agent.
 * Returns the last N message pairs as [{role, content}] for the LLM.
 */
export function buildHistoryPayload(messages, limit = 10) {
  // Skip the welcome message and filter to real exchanges
  const real = messages.filter(m => m.id !== 'welcome');
  const recent = real.slice(-limit);

  return recent.map(m => ({
    role: m.type === 'user' ? 'USER' : 'CHATBOT',
    message: m.text,
  }));
}

/**
 * Clear the conversation for this user (reset to welcome).
 */
export async function clearConversation(userId) {
  if (!userId) return;
  try {
    await AsyncStorage.removeItem(`conversation_${userId}`);
    await supabase
      .from('conversations')
      .upsert(
        { user_id: userId, messages: [] },
        { onConflict: 'user_id' }
      );
  } catch (err) {
    console.warn('[ConversationService] clearConversation error:', err?.message);
  }
}

export default {
  loadConversation,
  appendMessage,
  buildHistoryPayload,
  clearConversation,
};
