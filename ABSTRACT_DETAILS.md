# FitFusion - Campus Wellness & Fitness Tracker

## Project Overview

**FitFusion** (also known as **CampusTitan**) is a comprehensive **React Native (Expo)** mobile application designed for holistic campus wellness. The app integrates advanced tracking for nutrition, physical activity, mental wellness, environmental metrics, and AI-driven coaching, specifically tailored for college/university students.

---

## 1. Application Name & Branding

- **Primary Name:** FitFusion
- **Secondary Name:** CampusTitan
- **Package Name:** `com.g4ur4v.FitFusion`
- **Platform:** React Native with Expo (~54)
- **Target:** iOS and Android (supports tablets)

---

## 2. Core Features

### 2.1 Advanced Nutrition Tracking
- **Vision-based Food Logging:** Uses **Google Gemini API** for autonomous portion estimation and dish identification
- **USDA Integration:** Connects to USDA FoodData Central API for precise macronutrient calculations
- **NRF9.3 Density Score:** Calculates Nutrient Rich Foods index to evaluate food quality
- **Barcode Scanner:** Quick manual entry via camera
- **Daily Goals:** Caloric and macronutrient goal management

### 2.2 Activity & Step Tracking
- **Real-time Pedometer:** Native permission handling via Expo Sensors
- **Step Increment Fallback:** On-demand step counting for Expo Go compatibility
- **Manual Workout Logging:** Calorie burn estimation
- **Weekly Visualization:** Activity sparklines and charts

### 2.3 Mental Wellness & Journaling
- **Predictive Scoring:** Custom **PyTorch Neural Network** predicts mental wellness scores based on behavioral data
- **Input Features:** Screen time, sleep quality, activity levels, stress, productivity
- **Mood Check-ins:** Daily qualitative mood tracking
- **Secure Journal:** Personal journal entries

### 2.4 Autonomous AI Health Coach
- **Local LLM:** LoRA-fine-tuned **Llama 3 (8B)** model hosted via **Ollama**
- **Daily Reports:** Asynchronous generation with 7-day rolling context window
- **Context Compression:** Uses **Gemini** to compress historical data and eliminate hallucinations

### 2.5 Environmental Awareness
- **Campus API Integration:** Real-time AQI, temperature, humidity, noise levels
- **Contextual Recommendations:** Health suggestions based on environmental conditions

### 2.6 AI-Powered Features
- **AI Wellness Coach:** Personalized wellness tips using **Cohere** API
- **AI Campus Alerts:** Admin-level operational insights from aggregated analytics

---

## 3. Technical Architecture

### 3.1 Frontend Stack
| Technology | Version/Notes |
|------------|---------------|
| React Native | 0.81.5 |
| Expo | ~54.0.33 |
| Expo Router | For navigation |
| Expo Sensors | Pedometer, motion |
| Expo Secure Store | Secure storage |
| Expo Linear Gradient | UI gradients |
| Expo Blur | Blur effects |
| React Navigation | Bottom tabs + Stack |
| Supabase | Backend/Auth |
| AsyncStorage | Local caching |

### 3.2 Backend Stack
| Technology | Purpose |
|------------|---------|
| Node.js | Application server |
| Express | REST API |
| SQLite | Local database |
| Python | ML microservices |
| Ollama | Local LLM inference |

### 3.3 ML/AI Services
| Component | Technology |
|-----------|------------|
| Vision Analysis | Google Gemini 2.0/2.5 Flash |
| Context Compression | Gemini 2.5 Flash |
| Nutrition Database | USDA FoodData Central API |
| Mental Wellness Model | PyTorch Neural Network (best_model.pth) |
| Local LLM | Llama 3 (8B) via Ollama |
| AI Coaching | Cohere Command-R |
| Feature Scaling | scikit-learn (scaler.pkl) |

### 3.4 Key ML Files
```
ml_services/
├── titan_ml_interface.py        # Unified API wrapper
├── context_engine.py            # Context compression + LLM prompting
├── nutrition_score.py           # Vision processing + NRF9.3 calculation
├── mental_wellness_predictor.py # PyTorch NN inference
├── best_model.pth               # Trained PyTorch weights
├── scaler.pkl                   # Feature normalization
└── columns.pkl                  # Feature columns
```

---

## 4. Neural Network Architecture (Mental Wellness)

### Model: `Net` (PyTorch)
```
Input Features (13+):
- age, gender, occupation, work_mode
- screen_time_hours, work_screen_hours, leisure_screen_hours
- sleep_hours, sleep_quality_1_5
- stress_level_0_10, productivity_0_100
- exercise_minutes_per_day, social_hours_per_day
- kms_walked_daily

Architecture:
- Input Layer → 12 neurons (ReLU)
- Hidden Layer → 8 neurons (ReLU)
- Output Layer → 1 neuron (Linear)

Output: Mental wellness score (0-100)
```

### NRF9.3 Algorithm
The Nutrient Rich Foods index calculates:
```
NRF9.3 = (Sum of %DV for 9 positive nutrients) - (Sum of %MRV for 3 negative nutrients)

Positive: Protein, Fiber, Vitamin A, C, E, Calcium, Iron, Magnesium, Potassium
Negative: Saturated Fats, Sugars, Sodium
```

---

## 5. API Integrations

### External APIs Used
1. **Google Gemini** - Vision analysis, context compression
2. **USDA FoodData Central** - Nutritional database
3. **Cohere** - AI wellness coaching
4. **Supabase** - Authentication, database

### Internal APIs
- `/api/auth/*` - Authentication
- `/api/wellness/*` - Wellness data
- `/api/nutrition/*` - Food logging
- `/api/activity/*` - Step tracking
- `/api/analytics/*` - Aggregated insights

---

## 6. Data Models

### User
- ID, email, name, avatar, preferences

### WellnessLog
- Date, mentalScore, nutritionDensity, sleepHours, stressLevel

### FoodLog
- Timestamp, dishName, calories, protein, fiber, nutritionDensity, image

### ActivityLog
- Date, steps, workouts, caloriesBurned

### MoodEntry
- Timestamp, mood, notes

---

## 7. Screens & Navigation

### Main Screens
1. **Auth** - Login/Signup
2. **Home** - Dashboard with AI tips
3. **Fitness** - Activity tracking
4. **Nutrition** - Food logging
5. **Wellness** - Mental health
6. **Analytics** - Data insights
7. **Community** - Leaderboard
8. **Profile** - User settings
9. **Environment** - Campus conditions

---

## 8. Key Components

### AI Components
- `AIWellnessCoach.js` - Personalized student tips (Cohere)
- `AICampusAlerts.js` - Admin interventions

### Feature Components
- `EnvironmentWidget.js` - Campus environment display
- `CampusZoneRecommender.js` - Location-based suggestions

---

## 9. Development Setup

### Prerequisites
- Node.js (npm)
- Expo CLI
- Python 3.10+
- Ollama (for local LLM)

### Quick Start
```bash
npm install
npm start          # Run via Expo Go
```

### ML Services
```bash
# Start Ollama
ollama serve

# Create Titan Coach model
ollama create titan-coach -f Modelfile

# Run ML interface
python3 titan_ml_interface.py
```

---

## 10. Unique Innovations

1. **Multi-Modal Nutrition Tracking:** Combines computer vision (Gemini) with authoritative nutritional database (USDA)

2. **Predictive Mental Wellness:** Uses PyTorch neural network to predict mental health scores from behavioral patterns

3. **Hybrid AI Coaching:** Combines cloud APIs (Cohere, Gemini) with local LLM (Ollama/Llama 3) for privacy-preserving, personalized advice

4. **Context-Aware Recommendations:** Integrates real-time campus environmental data (AQI, noise, crowding) into wellness suggestions

5. **NRF9.3 Nutritional Density:** Uses scientifically-validated nutrient density metric rather than simple calorie counting

6. **7-Day Rolling Context:** Maintains temporal awareness in AI coaching to identify trends and prevent advice fragmentation

---

## 11. Target Users

- **Primary:** College/University students (MNNIT Allahabad context)
- **Secondary:** Campus administrators seeking anonymized wellness analytics
- **Use Case:** Daily wellness monitoring, nutrition tracking, mental health support

---

## 12. Project Statistics

- **Frontend:** ~50+ React Native screens and components
- **Backend:** 10+ Express routes and controllers
- **ML Models:** 1 PyTorch neural network + 1 fine-tuned Llama 3
- **APIs:** 4 external integrations
- **Database:** Supabase (PostgreSQL) + SQLite (local)

---

*This document was compiled from analysis of the CampusTitan/FitFusion codebase for abstract creation purposes.*

