import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import { supabase } from "./supabase";
import { calculateNutritionGoals, getActivityLevelFromFitness } from "../utils/nutritionCalculator";

const isWeb = Platform.OS === "web";

class AuthService {
  async register(userData) {
    try {
      // 1. Sign up with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
        options: {
          data: {
            name: userData.name,
            college: userData.college,
            year: userData.year,
            branch: userData.branch,
            hostel: userData.hostel,
            age: userData.age,
            height: userData.height,
            weight: userData.weight,
            gender: userData.gender,
            role: userData.isAdmin ? "admin" : "student",
          },
        },
      });

      if (authError) throw authError;

      // 2. Create user profile in 'users' table linking to auth.users.id
      if (authData.user) {
        // Convert year to number if it contains text like "2nd Year"
        let yearValue = userData.year || null;
        if (typeof yearValue === 'string') {
          // Extract numeric year from strings like "2nd Year", "3rd Year", etc.
          const yearMatch = yearValue.match(/\d+/);
          yearValue = yearMatch ? parseInt(yearMatch[0]) : null;
        }

        // Calculate nutrition goals based on body metrics
        const height = userData.height ? parseFloat(userData.height) : null;
        const weight = userData.weight ? parseFloat(userData.weight) : null;
        const age = userData.age ? parseInt(userData.age) : null;
        const gender = userData.gender;

        // Get activity level from fitness level (default to moderate if not set)
        const activityLevel = getActivityLevelFromFitness(userData.fitnessLevel || 'intermediate');

        // Calculate personalized nutrition goals
        const nutritionGoals = calculateNutritionGoals({
          weight,
          height,
          age,
          gender,
          activityLevel,
          fitnessGoal: 'maintain', // Default goal
        });

        const { error: profileError } = await supabase.from("users").insert([
          {
            id: authData.user.id,
            email: userData.email,
            name: userData.name,
            college: userData.college,
            year: yearValue,
            branch: userData.branch || null,
            hostel: userData.hostel || null,
            age: age,
            height: height,
            weight: weight,
            gender: gender,
            role: userData.isAdmin ? "admin" : "student",
            // Nutrition goals
            calorie_goal: nutritionGoals.calories,
            protein_goal: nutritionGoals.protein,
            carbs_goal: nutritionGoals.carbs,
            fat_goal: nutritionGoals.fat,
            activity_level: activityLevel,
            fitness_goal: 'maintain',
          },
        ]);

        if (profileError) {
          console.error(
            "Profile creation error (safe to ignore if table missing):",
            profileError,
          );
        }
      }

      return { user: authData.user, session: authData.session };
    } catch (error) {
      throw new Error(error.message || "Registration failed");
    }
  }

  async login(email, password) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });

      if (error) throw error;
      return { user: data.user, session: data.session };
    } catch (error) {
      throw new Error(error.message || "Login failed");
    }
  }

  async logout() {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error("Logout error:", error);
    }
  }

  async getCurrentUser() {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return null;

      const user = session.user;

      const { data: profile, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profile) {
        return { ...user, ...profile };
      }

      // Fallback: use user_metadata if profile table doesn't exist yet
      return {
        ...user,
        name: user.user_metadata?.name || user.email?.split("@")[0],
        college: user.user_metadata?.college || "Not set",
        year: user.user_metadata?.year || null,
        branch: user.user_metadata?.branch || null,
        hostel: user.user_metadata?.hostel || null,
        age: user.user_metadata?.age,
        height: user.user_metadata?.height,
        weight: user.user_metadata?.weight,
        gender: user.user_metadata?.gender,
        role: user.user_metadata?.role || "student",
      };
    } catch (error) {
      return null;
    }
  }

  async isAuthenticated() {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return !!session;
  }

  async updateProfile(userId, updates) {
    try {
      const { data, error } = await supabase
        .from("users")
        .update(updates)
        .eq("id", userId)
        .select()
        .single();
      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Update profile error:", error);
      return null;
    }
  }

  isAdmin(user) {
    return user?.role === "admin";
  }

  // Admin Persistence (Mock Session)
  async setAdminSession(adminUser) {
    if (isWeb) {
      localStorage.setItem("fitfusion_admin_session", JSON.stringify(adminUser));
    } else {
      await SecureStore.setItemAsync("fitfusion_admin_session", JSON.stringify(adminUser));
    }
  }

  async getAdminSession() {
    try {
      const session = isWeb
        ? localStorage.getItem("fitfusion_admin_session")
        : await SecureStore.getItemAsync("fitfusion_admin_session");
      return session ? JSON.parse(session) : null;
    } catch (e) {
      return null;
    }
  }

  async clearAdminSession() {
    if (isWeb) {
      localStorage.removeItem("fitfusion_admin_session");
    } else {
      await SecureStore.deleteItemAsync("fitfusion_admin_session");
    }
  }
}

export const authService = new AuthService();
export default authService;
