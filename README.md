# FitFusion — Campus Wellness & Fitness Tracker

A comprehensive React Native (Expo) application designed for holistic campus wellness, featuring advanced tracking for nutrition, physical activity, mental wellness, environmental metrics, and AI-driven coaching.

## Core Features

- **Advanced Nutrition Tracking**
  - Vision-based food logging utilizing the Gemini API for autonomous portion estimation and dish identification.
  - Integration with the USDA API to calculate exact macronutrients and the Nutrient Rich Foods (NRF9.3) density score.
  - Barcode scanner for quick manual entry.
  - Daily caloric and macronutrient goal management.

- **Activity & Step Tracking**
  - Real-time pedometer tracking with native permission handling via Expo Sensors.
  - On-demand step increment fallback for Expo Go compatibility.
  - Manual workout logging with calorie burn estimation.
  - Weekly activity visualization and sparklines.

- **Mental Wellness & Journaling**
  - Predictive mental wellness scoring powered by a custom PyTorch Neural Network based on user behavioral data (screen time, sleep quality, activity levels).
  - Daily qualitative mood check-ins.
  - Secure personal journal entries.

- **Autonomous AI Health Coach**
  - A locally hosted, LoRA-fine-tuned Llama 3 (8B) model providing strict, personalized health adjustments.
  - Asynchronous daily report generation utilizing a 7-day rolling context window, compressed via Gemini to eliminate LLM hallucination.

- **Environmental Awareness**
  - Real-time campus API integration for AQI, temperature, humidity, and noise levels.
  - Contextual health recommendations based on current environmental conditions.

## Tech Stack

- **Frontend:** React Native, Expo (~54), Expo Router, Expo Sensors, Expo Secure Store
- **Application Backend:** Node.js, Express, SQLite
- **Machine Learning Microservices:** Python, PyTorch, Ollama (GGUF Inference)
- **External APIs:** Google Gemini 2.5 Flash, USDA FoodData Central
- **UI Architecture:** Custom theme system, expo-linear-gradient, expo-blur

## Development

### Prerequisites
- Node.js (npm)
- Expo CLI
- Expo Go or EAS Dev Client
- Python 3.10+ (For ML Microservices)
- Ollama (For local LLM inference)

### Quick Start (Frontend)

```bash
npm install
npm start          # Run via Expo Go

src/
├── components/
│   └── common/
├── screens/
│   ├── auth/
│   ├── fitness/
│   ├── home/
│   ├── nutrition/
│   ├── profile/
│   └── wellness/
├── services/
│   ├── AuthContext.js
│   ├── SensorService.js
│   ├── database.js
│   └── config.js
├── navigation/
├── theme/
└── data/

ml_services/
├── titan_ml_interface.py        # Unified API wrapper for backend integration
├── context_engine.py            # Context compression and LLM prompting logic
├── nutrition_score.py           # Vision processing and NRF9.3 calculation
├── mental_wellness_predictor.py # PyTorch neural network inference
├── Modelfile                    # Llama 3 system instructions and parameters
├── best_model.pth               # Trained PyTorch weights
└── scaler.pkl                   # Feature normalization scaler

