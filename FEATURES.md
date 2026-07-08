# FitFusion - CampusTitan Features Overview

## Working Features (Production-Ready)

### 1. Authentication & User Management
- **User Registration** - Email-based signup with profile (name, college, height, weight, age, gender)
- **User Login** - Secure authentication with JWT tokens
- **Profile Management** - View and edit user profile data
- **Role-based Access** - Admin vs regular user roles
- **Onboarding Flow** - First-time user setup wizard

### 2. Nutrition Tracking
- **Manual Food Logging** - Add meals with calories, protein, carbs, fat
- **Food Scanner (AI Vision)** - [Requires paid Gemini API] Take photo of food for automatic nutrition analysis
- **USDA Integration** - [Requires paid Gemini API] Uses Gemini API + USDA FoodData Central for accurate nutrition data
- **NRF9.3 Score** - Nutrient Rich Foods index calculation
- **Meal History** - View past food logs with date filtering
- **Daily Goals** - Track calories and macronutrients against goals

### 3. Activity & Fitness Tracking
- **Step Tracking** - Real-time pedometer via Expo Sensors
- **Manual Activity Logging** - Add workouts (running, gym, cycling, yoga, etc.)
- **Calories Burned Calculation** - Based on activity type and duration
- **Weekly Activity Chart** - Visualize activity trends
- **Recent Activities** - View logged activities with details

### 4. Mental Wellness & Journaling
- **Daily Wellness Check-in** - Track sleep, stress, productivity, walking
- **Mood Logging** - Record daily mood (1-5 scale)
- **Personal Journal** - Write private journal entries
- **Wellness History** - View past wellness data
- **Sleep Tracker** - Track sleep patterns
- **Wellness Circles** - Group wellness challenges

### 5. AI Features
- **AI Wellness Coach** - [Requires Cohere API key] Personalized wellness tips using Cohere Command-R
- **AI Campus Alerts** - [Requires Cohere API key] Admin-level operational insights
- **Mental Wellness Predictor** - [ML Model Ready] PyTorch neural network for predicting mental wellness scores
- **Local LLM Coach** - [Requires Ollama] LoRA-fine-tuned Llama 3 for daily health reports

### 6. Analytics & Leaderboard
- **Personal Analytics** - View personal health metrics and trends
- **College Leaderboard** - Compete with students from the same college
- **Campus-wide Analytics** - [Admin only] Aggregated anonymized campus wellness data

### 7. Environmental Awareness
- **Campus Environment Widget** - Display simulated AQI, temperature, noise levels
- **Zone Recommendations** - AI-powered campus location suggestions based on environment
- **Environment Screen** - Detailed view of campus environmental conditions

### 8. Community Features
- **Wellness Circles** - Join/create wellness challenge groups
- **Social Features** - Connect with other students for wellness goals

---

## Mock/Simulated Features

### 1. Environment Data
- **Simulated Environment Matrix** - Mock data for AQI, temperature, humidity, noise
- Uses `environmentMatrix.js` with predefined campus zones

### 2. AI Coach Fallback
- **Cached Tips** - Shows previously cached AI tips when offline
- **Default Messages** - Generic wellness messages when AI unavailable

### 3. Food Scanner (Without API)
- **Manual Entry** - Users can manually enter food details
- **Barcode Scanner UI** - Camera interface ready (requires backend for actual scanning)

---

## Features Requiring External API Keys

| Feature | API Required | Status |
|---------|-------------|--------|
| Food Vision Scanning | Google Gemini API (Paid) | ❌ Needs paid key |
| Nutrition Analysis | Google Gemini API + USDA API | ❌ Needs paid Gemini key |
| AI Wellness Coach | Cohere API | ❌ Needs API key |
| AI Campus Alerts | Cohere API | ❌ Needs API key |
| Context Compression | Google Gemini API | ❌ Needs paid key |
| Local LLM Coach | Ollama (local) | ❌ Needs Ollama setup |

---

## Features That Work Without External APIs

| Feature | Working Status |
|---------|---------------|
| User Auth | ✅ Working |
| Manual Food Logging | ✅ Working |
| Step Tracking | ✅ Working |
| Manual Activity Logging | ✅ Working |
| Mood Logging | ✅ Working |
| Journaling | ✅ Working |
| Wellness Check-in | ✅ Working (needs DB migration) |
| Profile Management | ✅ Working |
| Leaderboard | ✅ Working |
| Analytics | ✅ Working |
| Environment Widget | ✅ Working (mock data) |

---

## Database Tables (Supabase)

1. **users** - User profiles
2. **food_logs** - Nutrition tracking
3. **activities** - Fitness activities
4. **mood_logs** - Mood entries
5. **journals** - Personal journals
6. **user_wellness_data** - Daily wellness metrics
7. **wellness_circles** - Group challenges
8. **environmental_data** - Campus environment (future)

---

## ML Models

1. **Mental Wellness Predictor** (`mental_wellness_predictor.py`)
   - PyTorch neural network
   - Input: age, gender, screen time, sleep, stress, productivity, exercise
   - Output: Mental wellness score (0-100)

2. **Nutrition Vision Pipeline** (`nutrition_score.py`)
   - Uses Gemini for food identification
   - Uses USDA API for nutrition data
   - Calculates NRF9.3 nutrient density score

3. **Context Engine** (`context_engine.py`)
   - Calculates moving averages
   - Compresses historical context via Gemini
   - Builds prompts for local LLM

---

## How to Enable Full Functionality

### Step 1: Supabase Setup
1. Create a Supabase project
2. Run migrations in SQL Editor
3. Configure RLS policies

### Step 2: Get API Keys
1. **Google Gemini API** - Get a paid API key from https://aistudio.google.com/app/apikey (with billing enabled)
2. **USDA API** - Get free key from https://fdc.nal.usda.gov/api-guide.html
3. **Cohere API** - Get free key from https://dashboard.cohere.com/

### Step 3: Configure Environment
Create `backend/.env` file:
```
GEMINI_API_KEY=your_gemini_key
USDA_API_KEY=your_usda_key
```

### Step 4: Optional - Local LLM
1. Install Ollama: https://ollama.ai/
2. Run: `ollama serve`
3. Create model: `ollama create titan-coach -f Modelfile`

---

## Summary

**Core Features Working:**
- ✅ Authentication
- ✅ Nutrition tracking (manual)
- ✅ Activity/fitness tracking
- ✅ Mood & journal logging
- ✅ Wellness check-ins
- ✅ Analytics & leaderboard
- ✅ Environment display (mock)

**AI Features (Need API Keys):**
- ❌ Food vision scanning
- ❌ AI wellness coach
- ❌ AI campus alerts
- ❌ Context compression


