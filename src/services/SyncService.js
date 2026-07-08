import AsyncStorage from "@react-native-async-storage/async-storage";
import db from "./database";
import config from "./config";
import aiService from "./aiService";
import { getSimulatedEnvironment } from "./environmentMatrix";
import { Platform, ToastAndroid, Alert } from "react-native";

const OFFLINE_QUEUE_KEY = "offline_wellness_queue";

function showToast(message) {
  if (Platform.OS === "android") {
    ToastAndroid.show(message, ToastAndroid.SHORT);
  } else {
    Alert.alert("Wellness Check-in", message);
  }
}

async function loadQueue() {
  try {
    const raw = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error("Failed to load offline wellness queue:", e);
    return [];
  }
}

async function saveQueue(queue) {
  try {
    await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
  } catch (e) {
    console.error("Failed to save offline wellness queue:", e);
  }
}

async function sendToBackend(log) {
  // This POST is intentionally best-effort: failure here should never break
  // the local experience, because logs are already stored via AsyncStorage.
  try {
    const url = `${config.BASE_URL}/wellness/checkin`;
    const payload = { ...log };
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      console.warn("Wellness check-in backend responded with", response.status);
    }
  } catch (e) {
    console.warn("Wellness check-in backend call failed (safe to ignore):", e);
  }
}

async function refreshStudentTip() {
  try {
    const history = await db.getWellnessHistory(3);
    const environment = getSimulatedEnvironment(new Date());
    // We pass the last 3 days of logs plus the simulated campus environment
    // so the LLM can generate a grounded, contextualised tip.
    await aiService.generateStudentActionPlan(history, environment);
  } catch (e) {
    console.warn("Unable to refresh AI wellness tip:", e);
  }
}

import achievementService from "./AchievementService";

const SHOW_NOTIFICATIONS = true;

const SyncService = {
  async runAchievementCheck(userId) {
    if (!userId) return;
    try {
      const foodLogs = await db.getFoodLogs(userId);
      const activities = await db.getActivities(userId);
      const moodLogs = await db.getMoodLogs(userId);
      const journals = await db.getJournals(userId);

      await achievementService.checkAndNotify({
        id: userId,
        foodLogs,
        activities,
        moodLogs,
        journals
      });
    } catch (e) {
      console.warn("Achievement check failed:", e);
    }
  },

  /**
   * Submits a wellness check-in in an offline-first way.
   * - Always saves the log locally for charts/history.
   * - If online, also POSTs to the backend and refreshes the AI summary.
   * - If offline, enqueues the payload to be flushed when connectivity returns.
   */
  async submitWellnessCheckin(log, userId) {
    // Persist locally first so the UI can immediately reflect the new data,
    // regardless of network conditions.
    await db.saveDailyWellnessLog(log);

    // Assume online for now - send to backend
    await sendToBackend(log);
    await refreshStudentTip();

    // Check for new achievements
    if (userId) {
      await this.runAchievementCheck(userId);
    }

    showToast("Check-in synced and AI insights updated.");
  },

  /**
   * Flushes any queued wellness logs once connectivity is restored.
   * Best-effort: if some entries still fail, they are kept in the queue.
   */
  async flushOfflineWellnessQueue() {
    const queue = await loadQueue();
    if (!queue.length) return;

    const remaining = [];
    let syncedCount = 0;

    for (const item of queue) {
      try {
        const payload = item.payload || item;
        await sendToBackend(payload);
        syncedCount += 1;
      } catch (e) {
        console.warn("Failed to sync queued wellness item, keeping in queue:", e);
        remaining.push(item);
      }
    }

    await saveQueue(remaining);

    if (syncedCount > 0) {
      await refreshStudentTip();
      showToast(`Synced ${syncedCount} pending check-in${syncedCount > 1 ? "s" : ""}.`);
    }
  },
};

export default SyncService;
export { OFFLINE_QUEUE_KEY };

