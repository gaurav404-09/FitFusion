from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import sys
import json
import random
import requests as http_requests
from dotenv import load_dotenv
from werkzeug.utils import secure_filename
import tempfile
import time

# Add the parent directory to the path to import nutrition_score
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Load .env from the backend folder
env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '.env')
load_dotenv(env_path)
print(f"Loaded .env from: {env_path}")

# Import nutrition_score
try:
    import nutrition_score
    print("✓ nutrition_score.py loaded successfully")
except ImportError as e:
    print(f"✗ Failed to load nutrition_score.py: {e}")
    nutrition_score = None

app = Flask(__name__)
CORS(app)

UPLOAD_FOLDER = tempfile.gettempdir()
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

@app.route('/api/nutrition/analyze', methods=['POST'])
def analyze_nutrition():
    try:
        print("Received nutrition analysis request")

        # Check if image was uploaded
        if 'image' not in request.files:
            return jsonify({'error': 'No image file provided'}), 400

        image_file = request.files['image']
        context = request.form.get('context', '')
        print(f"Context: {context}")

        if image_file.filename == '':
            return jsonify({'error': 'No image selected'}), 400

        # Save image temporarily
        filename = secure_filename(image_file.filename)
        temp_image_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        image_file.save(temp_image_path)
        print(f"Saved image to: {temp_image_path}")

        # Check if we have nutrition_score and API keys
        gemini_key = os.getenv('GEMINI_API_KEY')
        usda_key = os.getenv('USDA_API_KEY')

        # Debug: Show what keys are loaded (first 10 chars)
        print(f"=== API KEY DEBUG ===")
        print(f"GEMINI_API_KEY env var: {'set' if gemini_key else 'NOT SET'}")
        if gemini_key:
            print(f"GEMINI key prefix: {gemini_key[:15]}...")
        print(f"USDA_API_KEY env var: {'set' if usda_key else 'NOT SET'}")
        print(f"======================")
        print(f"USDA key available: {bool(usda_key)}")
        print(f"Nutrition score available: {nutrition_score is not None}")

        # Only use nutrition_score.py - no fallbacks
        if not nutrition_score:
            return jsonify({'error': 'nutrition_score.py not available'}), 500

        if not gemini_key:
            return jsonify({'error': 'GEMINI_API_KEY not configured'}), 500

        if not usda_key:
            return jsonify({'error': 'USDA_API_KEY not configured'}), 500

        print("Processing with nutrition_score.py...")
        try:
            result = nutrition_score.execute_ml_vision_pipeline(
                temp_image_path,
                context,
                gemini_key,
                usda_key
            )

            # Clean up temp file
            if os.path.exists(temp_image_path):
                os.remove(temp_image_path)

            if result and 'food_name' in result:
                print(f"✓ Analysis successful: {result.get('food_name', 'Unknown')}")
                return jsonify(result)
            else:
                print("✗ Pipeline returned no result")
                return jsonify({'error': 'AI pipeline returned no result. The food could not be identified.'}), 500

        except Exception as e:
            print(f"✗ nutrition_score.py error: {e}")
            import traceback
            traceback.print_exc()
            # Clean up temp file
            if os.path.exists(temp_image_path):
                os.remove(temp_image_path)
            return jsonify({'error': f'AI analysis failed: {str(e)}'}), 500

    except Exception as e:
        print(f"✗ Backend error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

# Fallback nutrition database - comprehensive Indian foods
FALLBACK_FOODS = {
    # Grains & Carbs
    'rice': {'food_name': 'Cooked White Rice', 'calories': 130, 'protein': 2.7, 'carbs': 28, 'fat': 0.3, 'fiber': 0.4},
    'biryani': {'food_name': 'Vegetable Biryani', 'calories': 163, 'protein': 4.2, 'carbs': 26, 'fat': 4.5, 'fiber': 1.8},
    'pulao': {'food_name': 'Vegetable Pulao', 'calories': 145, 'protein': 3.5, 'carbs': 24, 'fat': 3.8, 'fiber': 1.5},
    'poha': {'food_name': 'Poha (Flattened Rice)', 'calories': 160, 'protein': 2.5, 'carbs': 30, 'fat': 3.2, 'fiber': 1.2},
    'upma': {'food_name': 'Upma', 'calories': 150, 'protein': 3.0, 'carbs': 25, 'fat': 4.0, 'fiber': 1.5},
    'parantha': {'food_name': 'Parantha', 'calories': 210, 'protein': 5.0, 'carbs': 28, 'fat': 9.0, 'fiber': 2.0},
    'naan': {'food_name': 'Naan Bread', 'calories': 260, 'protein': 7.0, 'carbs': 45, 'fat': 5.0, 'fiber': 1.5},
    
    # Indian Breads
    'roti': {'food_name': 'Roti (Chapati)', 'calories': 85, 'protein': 2.5, 'carbs': 17, 'fat': 0.8, 'fiber': 2.0},
    'chapati': {'food_name': 'Chapati', 'calories': 85, 'protein': 2.5, 'carbs': 17, 'fat': 0.8, 'fiber': 2.0},
    'phulka': {'food_name': 'Phulka', 'calories': 70, 'protein': 2.0, 'carbs': 15, 'fat': 0.5, 'fiber': 1.8},
    'puri': {'food_name': 'Puri', 'calories': 250, 'protein': 6.0, 'carbs': 35, 'fat': 10.0, 'fiber': 1.5},
    'dosa': {'food_name': 'Dosa', 'calories': 120, 'protein': 3.0, 'carbs': 22, 'fat': 2.5, 'fiber': 1.2},
    'idli': {'food_name': 'Idli', 'calories': 39, 'protein': 1.5, 'carbs': 8, 'fat': 0.3, 'fiber': 0.4},
    
    # Dal & Curries
    'dal': {'food_name': 'Dal (Lentils)', 'calories': 116, 'protein': 9.0, 'carbs': 20, 'fat': 0.5, 'fiber': 8.0},
    'dal tadka': {'food_name': 'Dal Tadka', 'calories': 140, 'protein': 10.0, 'carbs': 22, 'fat': 2.5, 'fiber': 7.5},
    'dal makhani': {'food_name': 'Dal Makhani', 'calories': 180, 'protein': 12.0, 'carbs': 24, 'fat': 5.0, 'fiber': 6.0},
    'rajma': {'food_name': 'Rajma (Kidney Beans)', 'calories': 140, 'protein': 10.0, 'carbs': 25, 'fat': 0.5, 'fiber': 10.0},
    'chole': {'food_name': 'Chole (Chickpeas)', 'calories': 160, 'protein': 9.0, 'carbs': 27, 'fat': 2.5, 'fiber': 8.0},
    'paneer': {'food_name': 'Paneer', 'calories': 265, 'protein': 14.0, 'carbs': 3.0, 'fat': 22.0, 'fiber': 0.0},
    'palak paneer': {'food_name': 'Palak Paneer', 'calories': 180, 'protein': 10.0, 'carbs': 8, 'fat': 13.0, 'fiber': 3.0},
    'mutter paneer': {'food_name': 'Mutter Paneer', 'calories': 200, 'protein': 11.0, 'carbs': 15, 'fat': 12.0, 'fiber': 4.0},
    'shahi paneer': {'food_name': 'Shahi Paneer', 'calories': 290, 'protein': 13.0, 'carbs': 12, 'fat': 23.0, 'fiber': 2.0},
    'kofta': {'food_name': 'Kofta Curry', 'calories': 220, 'protein': 8.0, 'carbs': 15, 'fat': 15.0, 'fiber': 3.0},
    
    # Vegetables
    'sabzi': {'food_name': 'Mixed Vegetable Sabzi', 'calories': 90, 'protein': 2.5, 'carbs': 12, 'fat': 4.0, 'fiber': 4.0},
    'aloo gobi': {'food_name': 'Aloo Gobi', 'calories': 110, 'protein': 3.0, 'carbs': 15, 'fat': 5.0, 'fiber': 4.0},
    'aloo fry': {'food_name': 'Aloo Fry', 'calories': 180, 'protein': 3.5, 'carbs': 22, 'fat': 9.0, 'fiber': 3.0},
    'bhindi': {'food_name': 'Bhindi (Okra)', 'calories': 75, 'protein': 2.0, 'carbs': 10, 'fat': 3.0, 'fiber': 5.0},
    'baingan': {'food_name': 'Baingan Bharta', 'calories': 85, 'protein': 2.5, 'carbs': 10, 'fat': 4.0, 'fiber': 6.0},
    'gobi': {'food_name': 'Gobi Manchurian', 'calories': 180, 'protein': 4.0, 'carbs': 18, 'fat': 10.0, 'fiber': 3.0},
    'mix veg': {'food_name': 'Mix Vegetable', 'calories': 95, 'protein': 3.0, 'carbs': 14, 'fat': 3.5, 'fiber': 5.0},
    'jeera aloo': {'food_name': 'Jeera Aloo', 'calories': 150, 'protein': 3.0, 'carbs': 20, 'fat': 7.0, 'fiber': 3.0},
    
    # Snacks
    'samosa': {'food_name': 'Samosa', 'calories': 260, 'protein': 5.0, 'carbs': 30, 'fat': 14.0, 'fiber': 2.5},
    'pakora': {'food_name': 'Pakora', 'calories': 200, 'protein': 4.0, 'carbs': 22, 'fat': 11.0, 'fiber': 2.0},
    'chai': {'food_name': 'Masala Chai', 'calories': 70, 'protein': 2.0, 'carbs': 10, 'fat': 2.5, 'fiber': 0.0},
    'coffee': {'food_name': 'Coffee with Milk', 'calories': 50, 'protein': 2.0, 'carbs': 6, 'fat': 2.0, 'fiber': 0.0},
    'biscuit': {'food_name': 'Biscuit', 'calories': 60, 'protein': 1.0, 'carbs': 8, 'fat': 2.5, 'fiber': 0.3},
    'chips': {'food_name': 'Chips', 'calories': 160, 'protein': 2.0, 'carbs': 15, 'fat': 10.0, 'fiber': 1.0},
    'maggi': {'food_name': 'Maggi Noodles', 'calories': 350, 'protein': 8.0, 'carbs': 50, 'fat': 14.0, 'fiber': 2.0},
    
    # Fruits
    'apple': {'food_name': 'Apple', 'calories': 52, 'protein': 0.3, 'carbs': 14, 'fat': 0.2, 'fiber': 2.4},
    'banana': {'food_name': 'Banana', 'calories': 89, 'protein': 1.1, 'carbs': 23, 'fat': 0.3, 'fiber': 2.6},
    'orange': {'food_name': 'Orange', 'calories': 47, 'protein': 0.9, 'carbs': 12, 'fat': 0.1, 'fiber': 2.4},
    'mango': {'food_name': 'Mango', 'calories': 60, 'protein': 0.8, 'carbs': 15, 'fat': 0.4, 'fiber': 1.6},
    'papaya': {'food_name': 'Papaya', 'calories': 43, 'protein': 0.5, 'carbs': 11, 'fat': 0.3, 'fiber': 1.7},
    'guava': {'food_name': 'Guava', 'calories': 68, 'protein': 2.6, 'carbs': 14, 'fat': 1.0, 'fiber': 5.4},
    
    # South Indian
    'dosa': {'food_name': 'Dosa', 'calories': 120, 'protein': 3.0, 'carbs': 22, 'fat': 2.5, 'fiber': 1.2},
    'idli': {'food_name': 'Idli', 'calories': 39, 'protein': 1.5, 'carbs': 8, 'fat': 0.3, 'fiber': 0.4},
    'vada': {'food_name': 'Medu Vada', 'calories': 180, 'protein': 5.0, 'carbs': 20, 'fat': 9.0, 'fiber': 1.5},
    'pongal': {'food_name': 'Pongal', 'calories': 180, 'protein': 6.0, 'carbs': 28, 'fat': 5.0, 'fiber': 2.0},
    'rasam': {'food_name': 'Rasam', 'calories': 40, 'protein': 1.5, 'carbs': 8, 'fat': 0.5, 'fiber': 1.0},
    'sambar': {'food_name': 'Sambar', 'calories': 95, 'protein': 5.0, 'carbs': 15, 'fat': 2.0, 'fiber': 4.0},
    
    # Beverages
    'lassi': {'food_name': 'Sweet Lassi', 'calories': 120, 'protein': 4.0, 'carbs': 20, 'fat': 3.0, 'fiber': 0.0},
    'buttermilk': {'food_name': 'Buttermilk (Chaas)', 'calories': 40, 'protein': 2.0, 'carbs': 6, 'fat': 1.0, 'fiber': 0.0},
    'juice': {'food_name': 'Fruit Juice', 'calories': 55, 'protein': 0.5, 'carbs': 13, 'fat': 0.2, 'fiber': 0.5},
}

def get_fallback_data(context):
    """Get fallback nutrition data based on context"""
    context_lower = context.lower()
    
    # Try to find matching food
    for key, food_data in FALLBACK_FOODS.items():
        if key in context_lower:
            return {
                'food_name': food_data['food_name'],
                'Caloric Value': food_data['calories'],
                'Protein( in g)': food_data['protein'],
                'Carbohydrates( in g)': food_data['carbs'],
                'Fat( in g)': food_data['fat'],
                'Dietary Fiber( in g)': food_data['fiber'],
                'Nutrition Density': 50.0,
            }
    
    # Default mixed meal
    return {
        'food_name': 'Mixed Meal',
        'Caloric Value': 250,
        'Protein( in g)': 15,
        'Carbohydrates( in g)': 30,
        'Fat( in g)': 10,
        'Dietary Fiber( in g)': 5,
        'Nutrition Density': 65.5,
    }

# ─── Ollama LLaMA Health Summary (using context_engine.py pipeline) ───
OLLAMA_URL = os.getenv('OLLAMA_URL', 'http://localhost:11434')
OLLAMA_MODEL = os.getenv('OLLAMA_MODEL', 'myllama:latest')

# Import the existing context engine and EMA tracker
try:
    from context_engine import compress_historical_context, build_ollama_prompt, calculate_moving_averages
    from engine import EMATracker
    ema_tracker = EMATracker(alpha=0.3)
    print("✓ context_engine.py and engine.py loaded successfully")
except ImportError as e:
    print(f"✗ Failed to load context_engine/engine: {e}")
    ema_tracker = None

def _generate_arbitrary_activity():
    """Generate realistic arbitrary activity data since activity tracking is not fully implemented."""
    activities = [
        {'type': 'walking', 'duration': random.randint(15, 45), 'calories_burned': random.randint(80, 200)},
        {'type': 'gym', 'duration': random.randint(30, 60), 'calories_burned': random.randint(150, 350)},
        {'type': 'running', 'duration': random.randint(15, 35), 'calories_burned': random.randint(150, 400)},
        {'type': 'yoga', 'duration': random.randint(20, 40), 'calories_burned': random.randint(60, 120)},
        {'type': 'cycling', 'duration': random.randint(20, 50), 'calories_burned': random.randint(100, 300)},
        {'type': 'sports', 'duration': random.randint(30, 60), 'calories_burned': random.randint(200, 400)},
    ]
    count = random.randint(1, 3)
    return random.sample(activities, min(count, len(activities)))

def _generate_arbitrary_mood():
    """Generate realistic arbitrary mood/mental wellness data."""
    moods_map = {'Great': 9, 'Good': 7, 'Okay': 5, 'Low': 3, 'Bad': 1}
    weights = [0.15, 0.35, 0.30, 0.15, 0.05]
    mood_label = random.choices(list(moods_map.keys()), weights=weights, k=1)[0]
    return {
        'mood': mood_label,
        'mood_score': moods_map[mood_label],
        'stress_level': random.choice(['Low', 'Moderate', 'High']),
        'sleep_hours': round(random.uniform(5, 9), 1),
        'energy_level': random.choice(['Low', 'Moderate', 'High']),
    }

def _generate_mock_history(today_data):
    """Generate 7-day mock historical data for the context engine based on today's real data."""
    history = []
    # Use today's values as a baseline and create slight variations for past 7 days
    base_mental = today_data.get('mental_score', 60)
    base_nutrition = today_data.get('nutrition_density', 55.0)
    base_sleep = today_data.get('sleep_hours', 7.0)

    for day in range(1, 8):
        history.append({
            'day': day,
            'mental_score': max(10, min(100, base_mental + random.randint(-15, 15))),
            'nutrition_density': round(max(10, min(100, base_nutrition + random.uniform(-10, 10))), 1),
            'sleep_hours': round(max(3, min(10, base_sleep + random.uniform(-1.5, 1.5))), 1),
        })
    return history

def _call_ollama(prompt, timeout=180):
    """Send structured prompt to the local Ollama LLaMA model."""
    try:
        print(f"  → Calling Ollama at {OLLAMA_URL}/api/generate with model={OLLAMA_MODEL}")
        
        # Ultra conservative settings for 8GB RAM with 4.6GB model
        # Truncate prompt to prevent OOM
        max_prompt_len = 400  # Extremely conservative for 8GB RAM
        if len(prompt) > max_prompt_len:
            prompt = prompt[-max_prompt_len:]
            print(f"  → Prompt truncated to {max_prompt_len} chars for memory safety")
        
        # Minimal payload to reduce memory pressure
        payload = {
            'model': OLLAMA_MODEL,
            'prompt': prompt,
            'stream': False,
            'options': {
                'num_predict': 80,       # Ultra conservative output
                'temperature': 0.5,
                'num_ctx': 256,          # Tiny context window
                'num_batch': 8,          # Small batch size
                'repeat_penalty': 1.1,
            },
        }
        
        for attempt in range(2):  # Max 2 attempts
            try:
                resp = http_requests.post(
                    f'{OLLAMA_URL}/api/generate',
                    json=payload,
                    timeout=timeout
                )
                resp.raise_for_status()
                data = resp.json()
                return data.get('response', '')
            except http_requests.exceptions.HTTPError as e:
                if e.response.status_code == 500 and 'model runner has unexpectedly stopped' in str(e):
                    if attempt == 0:
                        print(f"  → Model runner crashed, retrying in 3s...")
                        time.sleep(3)
                        continue
                    else:
                        raise Exception('Ollama model runner crashed twice. Try reducing model size or freeing RAM.')
                raise
    except http_requests.exceptions.ConnectionError:
        raise Exception(f'Cannot connect to Ollama at {OLLAMA_URL}. Is it running?')
    except http_requests.exceptions.Timeout:
        raise Exception('Ollama request timed out. The model might be loading.')
    except Exception as e:
        raise Exception(f'Ollama error: {str(e)}')

import threading
import uuid

# In-memory store for health summary jobs
_health_jobs = {}

def _run_health_pipeline(job_id, data, gemini_key):
    """Run the full Gemini → LLaMA pipeline in a background thread."""
    try:
        user_profile = data.get('user', {})
        food_logs = data.get('foodLogs', [])
        activities = data.get('activities', None)
        mood_data = data.get('mood', None)

        if not activities or len(activities) == 0:
            activities = _generate_arbitrary_activity()
        if not mood_data:
            mood_data = _generate_arbitrary_mood()

        # Step 1: Today's nutrition stats
        total_cal = sum(f.get('calories', 0) for f in food_logs)
        total_protein = sum(f.get('protein', 0) for f in food_logs)
        total_carbs = sum(f.get('carbs', 0) for f in food_logs)
        total_fat = sum(f.get('fat', 0) for f in food_logs)
        total_fiber = sum(f.get('fiber', 0) for f in food_logs)
        meal_count = len(food_logs)
        meal_names = [f.get('food_name', f.get('foodName', 'Unknown')) for f in food_logs]

        total_active_min = sum(a.get('duration', 0) for a in activities)
        total_burned = sum(a.get('calories_burned', a.get('caloriesBurned', 0)) for a in activities)
        exercise_steps = total_active_min * 100

        mood_score_map = {'Great': 9, 'Good': 7, 'Okay': 5, 'Low': 3, 'Bad': 1}
        mood_label = mood_data.get('mood', 'Okay')
        mental_score_raw = mood_data.get('mood_score', mood_score_map.get(mood_label, 5))
        sleep_hours = mood_data.get('sleep_hours', 7)

        nutrition_density = 0
        if total_cal > 0:
            nutrition_density = min(100, round(
                ((total_protein * 4 + total_fiber * 7) / max(total_cal, 1)) * 100, 1
            ))

        # Step 2: EMA
        daily_score = 50.0
        new_ema = 50.0
        if ema_tracker:
            daily_score = ema_tracker.normalize_metrics(
                int(total_cal), float(sleep_hours), int(mental_score_raw), int(exercise_steps)
            )
            new_ema = ema_tracker.calculate_new_ema(None, daily_score)
            print(f"  [{job_id[:8]}] EMA daily_score={round(daily_score,1)}, new_ema={new_ema}")

        # Step 3: Gemini context compression (with timeout)
        history_data = _generate_mock_history({
            'mental_score': int(mental_score_raw * 10),
            'nutrition_density': nutrition_density,
            'sleep_hours': sleep_hours,
        })
        averages = calculate_moving_averages(history_data)
        print(f"  [{job_id[:8]}] 7-day averages: {averages}")

        trend_summary = None
        if gemini_key:
            print(f"  [{job_id[:8]}] Calling Gemini for context compression...")
            try:
                import concurrent.futures
                with concurrent.futures.ThreadPoolExecutor() as pool:
                    future = pool.submit(compress_historical_context, history_data, gemini_key)
                    trend_summary = future.result(timeout=20)
                print(f"  [{job_id[:8]}] ✓ Gemini trend: {trend_summary[:80]}...")
            except Exception as ge:
                print(f"  [{job_id[:8]}] ✗ Gemini failed: {ge}")

        if not trend_summary:
            trend_summary = (
                f"Over the past 7 days, mental health averaged {averages['avg_mental']}/100, "
                f"nutrition density averaged {averages['avg_nutrition']}, and sleep averaged "
                f"{averages['avg_sleep']} hours per night."
            )

        # Step 4: Build structured prompt
        current_meal = {
            'dish_name': ', '.join(meal_names[:3]) if meal_names else 'No meals logged',
            'calories': round(total_cal, 1),
            'protein_g': round(total_protein, 1),
            'fiber_g': round(total_fiber, 1),
            'nutrition_density': nutrition_density,
        }
        current_mental = int(mental_score_raw * 10)
        structured_prompt = build_ollama_prompt(trend_summary, averages, current_meal, current_mental)
        print(f"  [{job_id[:8]}] Structured prompt assembled ({len(structured_prompt)} chars)")

        # Step 5: Call Ollama
        print(f"  [{job_id[:8]}] Sending to Ollama '{OLLAMA_MODEL}'...")
        ai_response = _call_ollama(structured_prompt)
        print(f"  [{job_id[:8]}] ✓ Ollama response received ({len(ai_response)} chars)")

        _health_jobs[job_id] = {
            'status': 'done',
            'result': {
                'summary': ai_response,
                'geminiContext': trend_summary,
                'stats': {
                    'calories': round(total_cal),
                    'protein': round(total_protein, 1),
                    'carbs': round(total_carbs, 1),
                    'fat': round(total_fat, 1),
                    'meals': meal_count,
                    'activeMinutes': total_active_min,
                    'caloriesBurned': total_burned,
                    'mood': mood_label,
                    'stressLevel': mood_data.get('stress_level', 'N/A'),
                    'sleepHours': sleep_hours,
                    'dailyScore': round(daily_score, 1),
                    'ema': new_ema,
                    'nutritionDensity': nutrition_density,
                },
                'model': OLLAMA_MODEL,
            }
        }
    except Exception as e:
        print(f"  [{job_id[:8]}] ✗ Pipeline error: {e}")
        import traceback
        traceback.print_exc()
        _health_jobs[job_id] = {'status': 'error', 'error': str(e)}

@app.route('/api/health-summary', methods=['POST'])
def health_summary_start():
    """Start health summary generation in background, return job_id immediately."""
    data = request.get_json() or {}
    gemini_key = os.getenv('GEMINI_API_KEY')
    job_id = str(uuid.uuid4())
    _health_jobs[job_id] = {'status': 'processing'}

    t = threading.Thread(target=_run_health_pipeline, args=(job_id, data, gemini_key))
    t.daemon = True
    t.start()

    print(f"  → Started health summary job {job_id[:8]}...")
    return jsonify({'jobId': job_id, 'status': 'processing'})

@app.route('/api/health/summary', methods=['POST'])
def health_summary_sync():
    data = request.get_json() or {}
    gemini_key = os.getenv('GEMINI_API_KEY')
    job_id = str(uuid.uuid4())
    _health_jobs[job_id] = {'status': 'processing'}

    t = threading.Thread(target=_run_health_pipeline, args=(job_id, data, gemini_key))
    t.daemon = True
    t.start()

    timeout_s = int(os.getenv('HEALTH_SUMMARY_TIMEOUT_S', '180'))
    waited = 0
    while waited < timeout_s:
        job = _health_jobs.get(job_id)
        if not job:
            break
        if job.get('status') == 'done':
            result = job['result']
            del _health_jobs[job_id]
            return jsonify(result)
        if job.get('status') == 'error':
            err = job.get('error', 'Health summary failed')
            del _health_jobs[job_id]
            return jsonify({'error': err}), 500
        time.sleep(1)
        waited += 1

    return jsonify({'error': 'Health summary timed out. Try again.'}), 504

@app.route('/api/health/summary/job', methods=['POST'])
def health_summary_job_alias():
    return health_summary_start()

@app.route('/api/health-summary/<job_id>', methods=['GET'])
def health_summary_poll(job_id):
    """Poll for health summary result."""
    job = _health_jobs.get(job_id)
    if not job:
        return jsonify({'error': 'Job not found'}), 404
    if job['status'] == 'processing':
        return jsonify({'status': 'processing'})
    if job['status'] == 'error':
        # Clean up
        del _health_jobs[job_id]
        return jsonify({'status': 'error', 'error': job['error']}), 500
    # Done — return result and clean up
    result = job['result']
    del _health_jobs[job_id]
    return jsonify({'status': 'done', **result})

@app.route('/api/nutrition/analyze-text', methods=['POST'])
def analyze_nutrition_text():
    """
    Analyze food from text context (food name + serving size).
    Used for manual food entry and mess menu food selection.
    """
    try:
        print("Received text-based nutrition analysis request")
        
        data = request.get_json()
        food_name = data.get('food_name', '').strip()
        serving_info = data.get('serving_info', '').strip()
        
        if not food_name:
            return jsonify({'error': 'Food name is required'}), 400
            
        context = f"{serving_info} {food_name}" if serving_info else food_name
        print(f"Context: {context}")
        
        gemini_key = os.getenv('GEMINI_API_KEY')
        
        if gemini_key and nutrition_score:
            print("Using AI for text-based nutrition analysis")
            try:
                import google.generativeai as genai
                genai.configure(api_key=gemini_key)
                
                model = genai.GenerativeModel('gemini-2.0-flash')
                
                prompt = f"""
                Analyze this food item and provide nutritional information.
                Food: {food_name}
                Serving info: {serving_info if serving_info else 'standard serving'}
                
                Based on the serving info, estimate the portion in grams if not explicitly stated.
                Then search your knowledge for the nutritional values per 100g and calculate for the estimated portion.
                
                Return a JSON object with these exact keys:
                {{
                    "food_name": "the generic food name",
                    "portion_g": estimated weight in grams,
                    "Caloric Value": calories,
                    "Protein( in g)": protein in grams,
                    "Carbohydrates( in g)": carbs in grams,
                    "Fat( in g)": fat in grams,
                    "Dietary Fiber( in g)": fiber in grams
                }}
                
                Respond ONLY with the JSON object, no other text.
                """
                
                response = model.generate_content(prompt)
                response_text = response.text.strip()
                
                # Parse JSON from response
                if response_text.startswith("```json"):
                    response_text = response_text[7:]
                if response_text.startswith("```"):
                    response_text = response_text[3:]
                if response_text.endswith("```"):
                    response_text = response_text[:-3]
                
                result = json.loads(response_text.strip())
                print("✓ Text analysis successful:", result.get('food_name', 'Unknown'))
                return jsonify(result)
                
            except Exception as e:
                print(f"✗ AI text analysis error: {e}")
        
        # Use fallback data
        print("Using fallback nutrition data for text analysis")
        nutrition_data = get_fallback_data(context)
        
        portion_multiplier = parse_serving_info(serving_info)
        if portion_multiplier > 0:
            nutrition_data['portion_g'] = 100 * portion_multiplier
            for key in ['Caloric Value', 'Protein( in g)', 'Carbohydrates( in g)', 'Fat( in g)', 'Dietary Fiber( in g)']:
                if key in nutrition_data:
                    nutrition_data[key] = round(nutrition_data[key] * portion_multiplier, 1)
        
        return jsonify(nutrition_data)
        
    except Exception as e:
        print(f"✗ Backend text analysis error: {e}")
        return jsonify({'error': str(e)}), 500


def parse_serving_info(serving_info):
    """Parse serving info to get multiplier for portion"""
    if not serving_info:
        return 1.0
    
    import re
    serving_lower = serving_info.lower()
    numbers = re.findall(r'[\d.]+', serving_lower)
    
    if numbers:
        try:
            num = float(numbers[0])
            
            if 'bowl' in serving_lower:
                return num * 2.5
            elif 'roti' in serving_lower or 'chapati' in serving_lower:
                return num * 0.3
            elif 'plate' in serving_lower:
                return num * 3.0
            elif 'cup' in serving_lower:
                return num * 2.0
            elif 'piece' in serving_lower or 'pc' in serving_lower:
                return num * 0.5
            else:
                return num
        except:
            pass
    
    if 'full' in serving_lower or 'large' in serving_lower:
        return 1.5
    elif 'half' in serving_lower:
        return 0.5
    
    return 1.0


@app.route('/api/nutrition/analyze-mess-menu', methods=['POST'])
def analyze_mess_menu():
    """
    Analyze mess menu image and extract food items.
    Returns structured menu data with days and meal times.
    Supports both English and Hindi menus.
    """
    try:
        print("Received mess menu analysis request")
        
        if 'image' not in request.files:
            return jsonify({'error': 'No image file provided'}), 400
            
        image_file = request.files['image']
        
        if image_file.filename == '':
            return jsonify({'error': 'No image selected'}), 400
            
        filename = secure_filename(image_file.filename)
        temp_image_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        image_file.save(temp_image_path)
        print(f"Saved mess menu image to: {temp_image_path}")
        
        gemini_key = os.getenv('GEMINI_API_KEY')
        
        if gemini_key:
            try:
                from PIL import Image
                import google.generativeai as genai
                
                genai.configure(api_key=gemini_key)
                
                image = Image.open(temp_image_path)
                model = genai.GenerativeModel('gemini-2.0-flash')
                
                prompt = """
                Analyze this mess menu image and extract all food items.
                The menu can be in English, Hindi, or both languages.
                
                Common Hindi day names to recognize:
                - सोमवार = Monday
                - मंगलवार = Tuesday
                - बुधवार = Wednesday
                - गुरुवार = Thursday
                - शुक्रवार = Friday
                - शनिवार = Saturday
                - रविवार = Sunday
                
                Common Hindi meal names:
                - नाश्ता = Breakfast
                - दोपहर का भोजन = Lunch
                - रात का खाना = Dinner
                - चाय = Snack/Tea
                
                Translate Hindi food items to English for the response.
                
                Organize the response by day of week (Monday to Sunday) and meal time (Breakfast, Lunch, Dinner).
                
                Return a JSON object with this structure:
                {
                    "menu": {
                        "Monday": {"Breakfast": ["food1", "food2"], "Lunch": ["food3"], "Dinner": ["food4", "food5"]},
                        "Tuesday": {...},
                        ...
                    }
                }
                
                If a meal is not specified or the image is unclear, use an empty array for that meal.
                Only include days that are clearly visible in the menu.
                
                Respond ONLY with the JSON object, no other text.
                """
                
                response = model.generate_content([image, prompt])
                response_text = response.text.strip()
                
                if response_text.startswith("```json"):
                    response_text = response_text[7:]
                if response_text.startswith("```"):
                    response_text = response_text[3:]
                if response_text.endswith("```"):
                    response_text = response_text[:-3]
                
                result = json.loads(response_text.strip())
                print("✓ Mess menu analysis successful")
                
                if os.path.exists(temp_image_path):
                    os.remove(temp_image_path)
                    
                return jsonify(result)
                
            except Exception as e:
                print(f"✗ Mess menu analysis error: {e}")
                import traceback
                traceback.print_exc()
        
        if os.path.exists(temp_image_path):
            os.remove(temp_image_path)
            
        return jsonify({'error': 'Could not analyze mess menu. Please try again.'}), 500
        
    except Exception as e:
        print(f"✗ Backend mess menu error: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'healthy',
        'nutrition_score_available': nutrition_score is not None,
    })

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5001))
    print(f"Starting nutrition server on port {port}")
    print(f"Nutrition score available: {nutrition_score is not None}")
    # use_reloader=False to prevent killing background threads for health summary jobs
    app.run(debug=True, host='0.0.0.0', port=port, threaded=True, use_reloader=False)
