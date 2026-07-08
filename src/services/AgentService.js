/**
 * Agent Service - Connects Mobile App to Python LangGraph Agent
 * Provides natural language query processing
 *
 * IMPORTANT: Routes through Node.js backend (/api/agent) which forwards
 * to Python LangGraph Agent. This ensures proper network handling for
 * Android devices and emulators.
 */

import axios from "axios";
import config from "./config";
import { supabase } from "./supabase";

// Use Node backend as the single network entrypoint.
// This avoids calling localhost from a physical device and lets the backend
// forward requests to the Python agent.
const BASE_URL = config.BASE_URL;

async function _getAuthHeaders() {
  try {
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch (e) {
    return {};
  }
}

/**
 * Process a natural language query through the AI agent
 * @param {string} query - User's question (e.g., "Did I eat enough protein today?")
 * @param {string} userId - Current user's ID
 * @param {object} userContext - Additional user context (age, goals, etc.)
 * @returns {Promise<object>} Agent response
 */
export async function askAgent(query, userId, userContext = {}) {
  try {
    const authHeaders = await _getAuthHeaders();
    const path = "/agent/query";
    const requestUrl = `${BASE_URL}${path}`;
    const payload = {
      query,
      user_id: userId,
      user_context: {
        name: userContext.name || "Student",
        age: userContext.age || 22,
        gender: userContext.gender || "male",
        protein_goal: userContext.proteinGoal || 60,
        weekly_goal: userContext.weeklyGoal || 150,
        ...userContext,
      },
    };

    console.log("[AgentService] askAgent URL:", requestUrl);

    const response = await axios.post(requestUrl, payload, {
      timeout: 30000,
      validateStatus: () => true,
      headers: {
        "Content-Type": "application/json",
        ...authHeaders,
      },
    });

    if (response.status >= 200 && response.status < 300) {
      return response.data;
    }

    console.error("[AgentService] askAgent non-2xx status:", response.status);
    console.error("[AgentService] askAgent response data:", response.data);

    const message =
      response.status === 404
        ? "Agent endpoint not found (404). Check backend route /api/agent/query and BASE_URL."
        : "Sorry, I could not process your request right now.";

    return {
      success: false,
      status: response.status,
      error: `Request failed with status ${response.status}`,
      answer: message,
      data: response.data,
    };
  } catch (error) {
    console.error("Agent query error:", error.message);
    if (error?.response) {
      console.error("Agent query status:", error.response.status);
      console.error("Agent query data:", JSON.stringify(error.response.data));
      console.error(
        "[AgentService] askAgent request URL (axios):",
        error.config?.baseURL
          ? `${error.config.baseURL}${error.config.url || ""}`
          : error.config?.url,
      );
    } else {
      console.error("Error details:", error);
      console.error("[AgentService] askAgent request URL:", `${BASE_URL}/agent/query`);
    }
    return {
      success: false,
      error: error.message,
      answer: "Sorry, I could not process your request right now.",
    };
  }
}

/**
 * Get quick stats summary for the dashboard
 * @param {string} userId - Current user's ID
 * @returns {Promise<object>} Quick stats
 */
export async function getQuickStats(userId) {
  try {
    const authHeaders = await _getAuthHeaders();
    const response = await axios.get(`${BASE_URL}/agent/quick`, {
      params: { user_id: userId },
      timeout: 10000,
      headers: {
        ...authHeaders,
      },
    });

    return response.data;
  } catch (error) {
    console.error("Quick stats error:", error.message);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Check if the agent service is available
 * @returns {Promise<boolean>}
 */
export async function checkAgentHealth() {
  try {
    const response = await axios.get(`${BASE_URL}/agent/health`, {
      timeout: 5000,
    });
    return response.data?.status === "healthy";
  } catch (error) {
    return false;
  }
}

/**
 * Example queries the agent can handle
 */
export const EXAMPLE_QUERIES = [
  "Did I eat enough protein today?",
  "How much did I exercise?",
  "How did I sleep last night?",
  "What's my stress level?",
  "What's my wellness score?",
  "What should I do to improve?",
  "Am I hitting my daily goals?",
  "How many calories did I eat?",
  "What's my activity for this week?",
  "Should I be worried about my sleep?",
];

/**
 * Natural Language Logging Examples
 * These queries will trigger the logging functionality
 */
export const LOGGING_QUERIES = [
  "I played badminton for 3 hours",
  "I ate 2 eggs and a banana",
  "I played badminton for 3 hours and had three chapatis in lunch",
  "Went to gym for 1 hour",
  "Had lunch - 2 chapatis with dal",
  "Played cricket for 2 hours",
  "Ate breakfast - 2 idlis",
  "Went running for 30 minutes",
  "Had dinner - rice and chicken",
  "Played basketball for 1 hour",
];

/**
 * Log food or activity using natural language
 * @param {string} query - Natural language input
 * @param {string} userId - Current user's ID
 * @param {string} date - Optional date in YYYY-MM-DD format
 * @returns {Promise<object>} Logging result
 */
export async function logToAgent(query, userId, date = null) {
  try {
    const authHeaders = await _getAuthHeaders();
    const response = await axios.post(
      `${BASE_URL}/agent/log`,
      {
        query,
        user_id: userId,
        date: date || new Date().toISOString().split("T")[0],
      },
      {
        timeout: 15000,
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
        },
      },
    );
    return response.data;
  } catch (error) {
    console.error("Agent log error:", error.message);
    if (error?.response) {
      console.error("Agent log status:", error.response.status);
      console.error("Agent log data:", JSON.stringify(error.response.data));
    } else {
      console.error("Error details:", error);
    }
    return {
      success: false,
      error: error.message,
      answer: "Sorry, I could not log your data right now.",
    };
  }
}

export default {
  askAgent,
  getQuickStats,
  checkAgentHealth,
  logToAgent,
  EXAMPLE_QUERIES,
  LOGGING_QUERIES,
};
