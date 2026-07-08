
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getCurrentCampusEnvironment } from "../utils/campusEnvironment";
import db from "./database";

const COHERE_API_KEY = process.env.EXPO_PUBLIC_COHERE_API_KEY;
const COHERE_CHAT_URL = "https://api.cohere.ai/v1/chat";

const STUDENT_TIP_KEY = "@ai_student_tip_daily";
const ADMIN_INTERVENTION_KEY = "@ai_admin_intervention";

// Fallback response in case AI fails
const FALLBACK_RESPONSE = {
    briefing: "Rest well tonight - your wellness journey continues tomorrow!",
    routing: "The Library is currently quiet and ideal for focused study.",
    socialPush: "Log your activities to help your department climb the leaderboard!",
};

interface WellnessData {
    sleepHrs?: number;
    stressLevel?: number;
    productivity?: number;
    walkedKm?: number;
    date?: string;
}

interface DeptStanding {
    userDept: string;
    rivalDept: string;
    pointDeficit: number;
}

interface ProactiveContext {
    personalContext: WellnessData | null;
    environmentContext: ReturnType<typeof getCurrentCampusEnvironment>;
    gamificationContext: DeptStanding;
}

async function callCohere(prompt: string): Promise<string> {
    if (!COHERE_API_KEY) {
        console.warn("Cohere API key missing (EXPO_PUBLIC_COHERE_API_KEY).");
        return JSON.stringify(FALLBACK_RESPONSE);
    }

    try {
        const response = await fetch(COHERE_CHAT_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${COHERE_API_KEY}`,
            },
            body: JSON.stringify({
                model: "command-r-08-2024",
                message: prompt,
                max_tokens: 300,
                temperature: 0.7,
            }),
        });

        if (!response.ok) {
            console.warn("Cohere API error status:", response.status);
            return JSON.stringify(FALLBACK_RESPONSE);
        }

        const json: any = await response.json();
        const text = json?.text ?? JSON.stringify(FALLBACK_RESPONSE);

        return (text + "").trim();
    } catch (e) {
        console.warn("Cohere API call failed:", e);
        return JSON.stringify(FALLBACK_RESPONSE);
    }
}

// Parse JSON from LLM response, handling markdown code blocks
function parseAIResponse(response: string): any {
    try {
        // Try to find JSON in the response
        let jsonStr = response.trim();

        // Remove markdown code blocks if present
        if (jsonStr.startsWith("```json")) {
            jsonStr = jsonStr.slice(7);
        } else if (jsonStr.startsWith("```")) {
            jsonStr = jsonStr.slice(3);
        }

        if (jsonStr.endsWith("```")) {
            jsonStr = jsonStr.slice(0, -3);
        }

        // Also try to find JSON object in the text
        const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            jsonStr = jsonMatch[0];
        }

        const parsed = JSON.parse(jsonStr);

        // Validate required keys
        if (!parsed.briefing || !parsed.routing || !parsed.socialPush) {
            console.warn("AI response missing required keys, using fallback");
            return FALLBACK_RESPONSE;
        }

        return parsed;
    } catch (e) {
        console.warn("Failed to parse AI JSON response:", e);
        console.warn("Raw response:", response);
        return FALLBACK_RESPONSE;
    }
}

async function cacheProactiveTip(text: string) {
    try {
        const payload = {
            date: new Date().toISOString().slice(0, 10),
            data: text,
        };
        await AsyncStorage.setItem(STUDENT_TIP_KEY, JSON.stringify(payload));
    } catch (e) {
        console.warn("Failed to cache proactive tip:", e);
    }
}

async function getCachedProactiveTip(): Promise<any | null> {
    try {
        const raw = await AsyncStorage.getItem(STUDENT_TIP_KEY);
        if (!raw) return null;
        const payload = JSON.parse(raw);

        // Check if cached for today
        const today = new Date().toISOString().slice(0, 10);
        if (payload?.date === today && payload?.data) {
            return typeof payload.data === 'string' ? parseAIResponse(payload.data) : payload.data;
        }
        return null;
    } catch {
        return null;
    }
}

// Aggregate all contexts for the proactive AI coach
async function aggregateContext(): Promise<ProactiveContext> {
    // 1. Personal Context - Fetch user's last wellness entry
    let personalContext: WellnessData | null = null;
    try {
        const history = await db.getWellnessHistory(1);
        if (history && history.length > 0) {
            personalContext = history[0];
        }
    } catch (e) {
        console.warn("Failed to fetch personal wellness data:", e);
    }

    // 2. Environment Context - Get current campus environment
    const environmentContext = await getCurrentCampusEnvironment();

    // 3. Gamification Context - Mock department standing
    // In production, this would come from the leaderboard data
    const gamificationContext: DeptStanding = {
        userDept: 'MSE', // Default - would come from user profile
        rivalDept: 'CS',
        pointDeficit: 45,
    };

    return {
        personalContext,
        environmentContext,
        gamificationContext,
    };
}

export async function generateProactiveActionPlan(): Promise<any> {
    // Check cache first
    const cached = await getCachedProactiveTip();

    // Aggregate all contexts
    const context = await aggregateContext();

    const { personalContext, environmentContext, gamificationContext } = context;

    // Build the context string for the LLM
    const sleepHours = personalContext?.sleepHrs ?? "unknown";
    const stressLevel = personalContext?.stressLevel ?? 5;
    const { timePeriod, zones, weather } = environmentContext;

    // Format zones for the prompt
    const zonesInfo = zones
        .map((z: any) => `- ${z.name}: ${z.crowdLevel}, ${z.noiseLevel}, ${z.status}`)
        .join("\n");

    const prompt = `
You are a hyper-aware campus wellness coach for MNNIT students. Based on the user's recent sleep, the current campus environment matrix, and their department's standing on the leaderboard, generate a 3-part proactive action plan.

Current Context:
- User's last sleep: ${sleepHours} hours
- User's stress level: ${stressLevel}/10
- Current time period: ${timePeriod}
- Weather: AQI ${weather.aqi}, ${weather.temperature}°C, ${weather.humidity}% Humidity, ${weather.rain > 0 ? weather.rain + 'mm Rain' : 'No Rain'}, Wind ${weather.windSpeed}m/s, ${weather.condition}
- Campus Zones:
${zonesInfo}
- User's Department: ${gamificationContext.userDept}
- Rival Department: ${gamificationContext.rivalDept}
- Point Deficit: ${gamificationContext.pointDeficit} points

Return EXACTLY a JSON object with these keys (no other text):
{
  "briefing": "1 sentence combining their sleep/wellness with current weather (mention humidity or rain if notable).",
  "routing": "1 sentence suggesting which campus zone to visit or avoid right now based on the noise/crowd matrix and weather.",
  "socialPush": "1 sentence motivating them to log an activity to help their department beat their rival."
}

Respond ONLY with the JSON object, no markdown formatting.
`;

    const result = await callCohere(prompt);
    const parsed = parseAIResponse(result);

    // Cache the result
    if (parsed !== FALLBACK_RESPONSE) {
        await cacheProactiveTip(parsed);
    }

    return parsed;
}

// Legacy function for backward compatibility
export async function generateStudentActionPlan(
    pastData: any[],
    environment: { zone?: string; noise?: string; crowding?: string } | null,
): Promise<string> {
    const proactiveResult = await generateProactiveActionPlan();

    return `${proactiveResult.briefing} ${proactiveResult.routing} ${proactiveResult.socialPush}`;
}

// Legacy function for admin interventions
export async function generateAdminInterventions(
    campusAverages: any,
): Promise<string> {
    const cached = await getCachedAdminIntervention();
    const summary = JSON.stringify(campusAverages ?? {}, null, 2);

    const prompt = `
You are a university administrator at MNNIT reviewing anonymised campus wellness analytics.

Aggregate campus metrics (JSON-style summary):
${summary}

Based on these patterns (e.g., MSE 2nd-year stress spikes, Hostel 4 low protein intake,
and gym over-capacity at evenings), propose ONE concrete operational intervention
the university should take. Write it as a short, direct recommendation (2–3 sentences)
addressed to administrators, not students.
`;

    const result = await callCohere(prompt);
    const suggestion = (result || "").trim();

    if (!suggestion && cached) {
        return cached;
    }

    if (suggestion) {
        await cacheAdminIntervention(suggestion);
        return suggestion;
    }

    return (
        cached ??
        "AI operational insights will appear here once campus analytics and the AI service are available."
    );
}

async function cacheAdminIntervention(text: string) {
    try {
        const payload = {
            timestamp: new Date().toISOString(),
            suggestion: text,
        };
        await AsyncStorage.setItem(ADMIN_INTERVENTION_KEY, JSON.stringify(payload));
    } catch (e) {
        console.warn("Failed to cache admin AI intervention:", e);
    }
}

async function getCachedAdminIntervention(): Promise<string | null> {
    try {
        const raw = await AsyncStorage.getItem(ADMIN_INTERVENTION_KEY);
        if (!raw) return null;
        const payload = JSON.parse(raw);
        return typeof payload?.suggestion === "string" ? payload.suggestion : null;
    } catch {
        return null;
    }
}

const aiService = {
    generateProactiveActionPlan,
    generateStudentActionPlan,
    generateAdminInterventions,
};

export default aiService;

