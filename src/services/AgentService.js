/**
 * AgentService — Connects Mobile App to Python LangGraph Agent
 *
 * Provides natural language query processing with:
 * - Persistent conversation history (passed to backend on every request)
 * - Proactive nudge fetching (called on app open)
 * - Goal planning (compound multi-step agent task)
 */

import axios from 'axios';
import config from './config';
import { supabase } from './supabase';

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
 * Process a natural language query through the AI agent.
 * Passes conversation history so the agent has memory of prior turns.
 *
 * @param {string} query - User's question
 * @param {string} userId - Current user's ID
 * @param {object} userContext - Age, goals, etc.
 * @param {Array}  conversationHistory - [{role, message}] from ConversationService.buildHistoryPayload()
 */
export async function askAgent(query, userId, userContext = {}, conversationHistory = []) {
  try {
    const authHeaders = await _getAuthHeaders();
    const payload = {
      query,
      user_id: userId,
      conversation_history: conversationHistory,
      user_context: {
        name: userContext.name || 'Student',
        age: userContext.age || 22,
        gender: userContext.gender || 'male',
        protein_goal: userContext.proteinGoal || 60,
        weekly_goal: userContext.weeklyGoal || 150,
        ...userContext,
      },
    };

    const response = await axios.post(`${BASE_URL}/agent/query`, payload, {
      timeout: 90000,
      validateStatus: () => true,
      headers: { 'Content-Type': 'application/json', ...authHeaders },
    });

    if (response.status >= 200 && response.status < 300) {
      return response.data;
    }

    const message =
      response.status === 404
        ? 'Agent endpoint not found (404). Check backend route /api/agent/query.'
        : 'Sorry, I could not process your request right now.';

    return { success: false, status: response.status, answer: message };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      answer:
        error.code === 'ECONNABORTED'
          ? 'The server is waking up (cold start). Please try again in a few seconds!'
          : 'Sorry, I could not process your request right now.',
    };
  }
}

/**
 * Fetch proactive nudges — the agent checks the last 7 days of data
 * and surfaces 1-2 personalised health insights WITHOUT the user asking.
 * Called on app open to make the AI feel proactive, not reactive.
 */
export async function fetchNudges(userId) {
  if (!userId) return [];
  try {
    const authHeaders = await _getAuthHeaders();
    const response = await axios.post(
      `${BASE_URL}/agent/nudge`,
      { user_id: userId },
      { timeout: 20000, headers: { 'Content-Type': 'application/json', ...authHeaders } }
    );
    if (response.data?.success && Array.isArray(response.data.nudges)) {
      return response.data.nudges;
    }
    return [];
  } catch (err) {
    return [];
  }
}

/**
 * Generate a personalised goal plan using the agent.
 * This is a compound multi-step task: agent fetches current stats,
 * computes deficit/surplus, then generates a week-by-week plan.
 *
 * @param {string} userId
 * @param {string} goalDescription - e.g. "I want to lose 5kg in 2 months"
 * @param {object} userContext
 */
export async function generateGoalPlan(userId, goalDescription, userContext = {}) {
  try {
    const authHeaders = await _getAuthHeaders();
    const response = await axios.post(
      `${BASE_URL}/agent/goal-plan`,
      { user_id: userId, goal: goalDescription, user_context: userContext },
      { timeout: 60000, headers: { 'Content-Type': 'application/json', ...authHeaders } }
    );
    if (response.data?.success) return response.data;
    return { success: false, answer: 'Could not generate a plan right now. Try again.' };
  } catch (err) {
    return { success: false, answer: 'Could not reach the server. Try again.' };
  }
}

/**
 * Fetch the weekly health report (compound autonomous agent task).
 */
export async function fetchWeeklyReport(userId) {
  try {
    const authHeaders = await _getAuthHeaders();
    const response = await axios.post(
      `${BASE_URL}/agent/weekly-report`,
      { user_id: userId },
      { timeout: 30000, headers: { 'Content-Type': 'application/json', ...authHeaders } }
    );
    return response.data?.success ? response.data : null;
  } catch {
    return null;
  }
}

/**
 * Get quick stats summary for the dashboard.
 */
export async function getQuickStats(userId) {
  try {
    const authHeaders = await _getAuthHeaders();
    const response = await axios.get(`${BASE_URL}/agent/quick`, {
      params: { user_id: userId },
      timeout: 10000,
      headers: { ...authHeaders },
    });
    return response.data;
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Check if the agent service is available.
 */
export async function checkAgentHealth() {
  try {
    const response = await axios.get(`${BASE_URL}/agent/health`, { timeout: 5000 });
    return response.data?.status === 'healthy';
  } catch {
    return false;
  }
}

/**
 * Log food or activity using natural language.
 */
export async function logToAgent(query, userId, date = null) {
  try {
    const authHeaders = await _getAuthHeaders();
    const response = await axios.post(
      `${BASE_URL}/agent/log`,
      { query, user_id: userId, date: date || new Date().toISOString().split('T')[0] },
      { timeout: 15000, headers: { 'Content-Type': 'application/json', ...authHeaders } }
    );
    return response.data;
  } catch (error) {
    return { success: false, error: error.message, answer: 'Sorry, I could not log your data right now.' };
  }
}

export const EXAMPLE_QUERIES = [
  'Did I eat enough protein today?',
  'How much did I exercise?',
  'How did I sleep last night?',
  "What's my stress level?",
  "What's my wellness score?",
  'What should I do to improve?',
  'Am I hitting my daily goals?',
  'How many calories did I eat?',
  "What's my activity for this week?",
  'Should I be worried about my sleep?',
];

export const LOGGING_QUERIES = [
  'I played badminton for 3 hours',
  'I ate 2 eggs and a banana',
  'I played badminton for 3 hours and had three chapatis in lunch',
  'Went to gym for 1 hour',
  'Had lunch - 2 chapatis with dal',
  'Played cricket for 2 hours',
  'Ate breakfast - 2 idlis',
  'Went running for 30 minutes',
  'Had dinner - rice and chicken',
  'Played basketball for 1 hour',
];

export default {
  askAgent,
  fetchNudges,
  generateGoalPlan,
  fetchWeeklyReport,
  getQuickStats,
  checkAgentHealth,
  logToAgent,
  EXAMPLE_QUERIES,
  LOGGING_QUERIES,
};
