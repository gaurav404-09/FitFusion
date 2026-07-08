
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
from urllib.parse import urljoin

# Add the parent directory to the path to import nutrition_score
parent_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(parent_dir)
print(f"[DEBUG] Added to sys.path: {parent_dir}")
print(f"[DEBUG] sys.path includes CampusTitan: {any('CampusTitan' in p for p in sys.path)}")

# Load .env from the backend folder
env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '.env')
load_dotenv(env_path)
print(f"Loaded .env from: {env_path}")

# Import nutrition_score
try:
    import nutrition_score
    print("nutrition_score.py loaded successfully")
except ImportError as e:
    print(f"Failed to load nutrition_score.py: {e}")
    nutrition_score = None

app = Flask(__name__)
CORS(app)

UPLOAD_FOLDER = tempfile.gettempdir()
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# ─────────────────────────────────────────────
# Agent – load directly in-process (no subprocess)
# ─────────────────────────────────────────────
agent_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'agent')
if agent_dir not in sys.path:
    sys.path.insert(0, agent_dir)

_agent_module = None
_router_module = None

def _get_agent_module():
    """Lazily import the agent so startup isn't blocked if libs are missing."""
    global _agent_module
    if _agent_module is None:
        try:
            import langgraph_agent as _m
            _agent_module = _m
            print('[Agent] langgraph_agent imported successfully')
        except Exception as e:
            print(f'[Agent] Failed to import langgraph_agent: {e}')
    return _agent_module

def _get_router_module():
    global _router_module
    if _router_module is None:
        try:
            from ai.router_agent import process_user_prompt as _fn
            _router_module = _fn
            print('[Agent] router_agent imported successfully')
        except Exception as e:
            print(f'[Agent] Failed to import router_agent: {e}')
    return _router_module


@app.route('/api/agent/health', methods=['GET'])
def agent_health_proxy():
    mod = _get_agent_module()
    if mod is None:
        return jsonify({'status': 'unavailable', 'service': 'CampusTitan Agent API'}), 503
    return jsonify({'status': 'healthy', 'service': 'CampusTitan Agent API'})


@app.route('/api/agent/query', methods=['POST'])
def agent_query_proxy():
    data = request.get_json() or {}
    mod = _get_agent_module()
    if mod is None:
        return jsonify({'success': False, 'error': 'Agent module not available'}), 503
    try:
        query = data.get('query')
        user_id = data.get('user_id')
        user_context = data.get('user_context', {})
        if not query or not user_id:
            return jsonify({'success': False, 'error': 'query and user_id required'}), 400
        result = mod.handle_agent_request(query, user_id, user_context)
        return jsonify(result)
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/agent/log', methods=['POST'])
def agent_log_proxy():
    data = request.get_json() or {}
    fn = _get_router_module()
    if fn is None:
        return jsonify({'success': False, 'error': 'Router agent not available'}), 503
    try:
        query = data.get('query')
        user_id = data.get('user_id')
        date = data.get('date')
        auth_header = request.headers.get('Authorization') or request.headers.get('authorization')
        user_jwt = None
        if auth_header and auth_header.startswith('Bearer '):
            user_jwt = auth_header.split(' ', 1)[1]
        if not query or not user_id:
            return jsonify({'success': False, 'error': 'query and user_id required'}), 400
        result = fn(query=query, user_id=user_id, date=date, user_jwt=user_jwt)
        return jsonify(result)
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/agent/quick', methods=['GET'])
def agent_quick_proxy():
    user_id = request.args.get('user_id')
    if not user_id:
        return jsonify({'success': False, 'error': 'user_id is required'}), 400
    mod = _get_agent_module()
    if mod is None:
        return jsonify({'success': False, 'error': 'Agent not available'}), 503
    try:
        agent_instance = mod.CampusTitanAgent()
        nutrition = agent_instance.tools['nutrition'].execute({'user_id': user_id, 'protein_goal': 60}, user_id)
        activity = agent_instance.tools['activity'].execute({'user_id': user_id}, user_id)
        wellness = agent_instance.tools['wellness'].execute({'user_id': user_id}, user_id)
        return jsonify({
            'success': True,
            'data': {
                'protein': {'current': nutrition.data.get('totals', {}).get('protein', 0), 'goal': 60},
                'activity': {'minutes': activity.data.get('totals', {}).get('total_minutes', 0), 'calories': activity.data.get('totals', {}).get('total_calories', 0)},
                'sleep': {'hours': wellness.data.get('averages', {}).get('sleep_hours', 0)},
                'stress': {'level': wellness.data.get('averages', {}).get('stress_level', 5)}
            }
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/nutrition/analyze', methods=['POST'])
def analyze_nutrition():
    try:
        print("Received nutrition analysis request")

        if 'image' not in request.files:
            return jsonify({'error': 'No image file provided'}), 400

        image_file = request.files['image']
        context = request.form.get('context', '')
        print(f"Context: {context}")

        if image_file.filename == '':
            return jsonify({'error': 'No image selected'}), 400

        filename = secure_filename(image_file.filename)
        temp_image_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        image_file.save(temp_image_path)
        print(f"Saved image to: {temp_image_path}")

        gemini_key = os.getenv('GEMINI_API_KEY')
        usda_key = os.getenv('USDA_API_KEY')

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

            if os.path.exists(temp_image_path):
                os.remove(temp_image_path)

            if result and 'food_name' in result:
                print(f"Analysis successful: {result.get('food_name', 'Unknown')}")
                return jsonify(result)
            else:
                print("Pipeline returned no result")
                return jsonify({'error': 'AI pipeline returned no result. The food could not be identified.'}), 500

        except Exception as e:
            print(f"nutrition_score.py error: {e}")
            import traceback
            traceback.print_exc()
            if os.path.exists(temp_image_path):
                os.remove(temp_image_path)
            return jsonify({'error': f'AI analysis failed: {str(e)}'}), 500

    except Exception as e:
        print(f"✗ Backend error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


# ============================================
# COHERE - Food Nutrition Analysis (Text-based)
# ============================================

def call_cohere_for_nutrition(food_name, serving_info):
    """Call Cohere API to get nutrition data for a food item"""
    cohere_key = os.getenv('EXPO_PUBLIC_COHERE_API_KEY') or os.getenv('COHERE_API_KEY')
    
    if not cohere_key:
        print("⚠️ Cohere API key not found")
        return None
    
    try:
        prompt = f"""You are a nutrition expert. Provide nutritional information for this food item.
Food: {food_name}
Serving: {serving_info if serving_info else 'standard serving'}

Based on the serving info, estimate the portion. Then provide nutritional values per serving.

Respond ONLY with a JSON object (no other text):
{{
    "food_name": "generic food name",
    "portion_g": estimated weight in grams,
    "Caloric Value": calories per serving,
    "Protein( in g)": protein in grams,
    "Carbohydrates( in g)": carbs in grams,
    "Fat( in g)": fat in grams,
    "Dietary Fiber( in g)": fiber in grams
}}"""
        
        response = http_requests.post(
            "https://api.cohere.ai/v1/chat",
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {cohere_key}"
            },
            json={
                "model": "command-r-08-2024",
                "message": prompt,
                "max_tokens": 300,
                "temperature": 0.3
            },
            timeout=30
        )
        
        if response.status_code == 200:
            result = response.json()
            text = result.get('text', '')
            if not text:
                text = result.get('message', {}).get('content', '')
            
            if text:
                text = text.strip()
                if text.startswith("```json"):
                    text = text[7:]
                elif text.startswith("```"):
                    text = text[3:]
                if text.endswith("```"):
                    text = text[:-3]
                
                nutrition_data = json.loads(text.strip())
                print(f"✓ Cohere analysis successful: {nutrition_data.get('food_name', 'Unknown')}")
                return nutrition_data
        else:
            print(f"⚠️ Cohere API error: {response.status_code} - {response.text[:200]}")
            
    except Exception as e:
        print(f"✗ Cohere API call failed: {e}")
    
    return None


@app.route('/api/nutrition/analyze-text', methods=['POST'])
def analyze_nutrition_text():
    """
    Analyze food from text context (food name + serving size).
    Uses Cohere API for nutrition data.
    """
    try:
        print("Received text-based nutrition analysis request")
        
        data = request.get_json()
        food_name = data.get('food_name', '').strip()
        serving_info = data.get('serving_info', '').strip()
        
        if not food_name:
            return jsonify({'error': 'Food name is required'}), 400
            
        print(f"Context: {food_name} with {serving_info}")
        
        # Use Cohere for text-based nutrition analysis
        print("Using Cohere for text-based nutrition analysis")
        result = call_cohere_for_nutrition(food_name, serving_info)
        
        if result:
            return jsonify(result)
        
        # If Cohere fails, return error
        return jsonify({
            'error': 'Unable to analyze food. Please try again.',
            'food_name': food_name,
            'Caloric Value': 0,
            'Protein( in g)': 0,
            'Carbohydrates( in g)': 0,
            'Fat( in g)': 0,
            'Dietary Fiber( in g)': 0,
        })
        
    except Exception as e:
        print(f"✗ Backend text analysis error: {e}")
        return jsonify({'error': str(e)}), 500


# ============================================
# GEMINI - Mess Menu Analysis (Image-based)
# ============================================

@app.route('/api/nutrition/analyze-mess-menu', methods=['POST'])
def analyze_mess_menu():
    """
    Analyze mess menu image and extract food items.
    Uses Gemini API for image analysis.
    Returns structured menu data with days and meal times.
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


# ============================================
# Health Summary (Ollama + Gemini)
# ============================================

OLLAMA_URL = os.getenv('OLLAMA_URL', 'http://localhost:11434')
OLLAMA_MODEL = os.getenv('OLLAMA_MODEL', 'my-llama:latest')
print(f"Ollama Model Configured: {OLLAMA_MODEL}")

try:
    from context_engine import compress_historical_context, build_ollama_prompt, calculate_moving_averages
    from engine import EMATracker
    ema_tracker = EMATracker(alpha=0.3)
    print("context_engine.py and engine.py loaded successfully")
except ImportError as e:
    print(f"Failed to load context_engine/engine: {e}")
    ema_tracker = None

def _generate_arbitrary_activity():
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
    history = []
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
    try:
        print(f"  → Calling Ollama at {OLLAMA_URL}/api/generate with model={OLLAMA_MODEL}")
        
        max_prompt_len = 400
        if len(prompt) > max_prompt_len:
            prompt = prompt[-max_prompt_len:]
        
        payload = {
            'model': OLLAMA_MODEL,
            'prompt': prompt,
            'stream': False,
            'options': {
                'num_predict': 80,
                'temperature': 0.5,
                'num_ctx': 256,
                'num_batch': 8,
                'repeat_penalty': 1.1,
            },
        }
        
        for attempt in range(2):
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
                        raise Exception('Ollama model runner crashed twice.')
                raise
    except http_requests.exceptions.ConnectionError:
        raise Exception(f'Cannot connect to Ollama at {OLLAMA_URL}.')
    except http_requests.exceptions.Timeout:
        raise Exception('Ollama request timed out.')
    except Exception as e:
        raise Exception(f'Ollama error: {str(e)} (model: {OLLAMA_MODEL})')

import threading
import uuid

_health_jobs = {}

def _run_health_pipeline(job_id, data, gemini_key):
    try:
        user_profile = data.get('user', {})
        food_logs = data.get('foodLogs', [])
        activities = data.get('activities', None)
        mood_data = data.get('mood', None)

        if not activities or len(activities) == 0:
            activities = _generate_arbitrary_activity()
        if not mood_data:
            mood_data = _generate_arbitrary_mood()

        total_cal = sum(f.get('calories', 0) for f in food_logs)
        total_protein = sum(f.get('protein', 0) for f in food_logs)
        total_carbs = sum(f.get('carbs', 0) for f in food_logs)
        total_fat = sum(f.get('fat', 0) for f in food_logs)
        total_fiber = sum(f.get('fiber', 0) for f in food_logs)
        meal_count = len(food_logs)
        meal_names = [f.get('food_name', f.get('foodName', 'Unknown')) for f in food_logs]

        total_active_min = sum(a.get('duration', 0) for a in activities)
        total_burned = sum(a.get('calories_burned', a.get('caloriesBurned', 0)) for a in activities)

        mood_score_map = {'Great': 9, 'Good': 7, 'Okay': 5, 'Low': 3, 'Bad': 1}
        mood_label = mood_data.get('mood', 'Okay')
        mental_score_raw = mood_data.get('mood_score', mood_score_map.get(mood_label, 5))
        sleep_hours = mood_data.get('sleep_hours', 7)

        nutrition_density = 0
        if total_cal > 0:
            nutrition_density = min(100, round(
                ((total_protein * 4 + total_fiber * 7) / max(total_cal, 1)) * 100, 1
            ))

        daily_score = 50.0
        new_ema = 50.0
        if ema_tracker:
            daily_score = ema_tracker.normalize_metrics(
                int(total_cal), float(sleep_hours), int(mental_score_raw), int(total_active_min * 100)
            )
            new_ema = ema_tracker.calculate_new_ema(None, daily_score)
            print(f"  [{job_id[:8]}] EMA daily_score={round(daily_score,1)}, new_ema={new_ema}")

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
                print(f"  [{job_id[:8]}] Gemini trend: {trend_summary[:80]}...")
            except Exception as ge:
                print(f"  [{job_id[:8]}] Gemini failed: {ge}")

        if not trend_summary:
            trend_summary = (
                f"Over the past 7 days, mental health averaged {averages['avg_mental']}/100, "
                f"nutrition density averaged {averages['avg_nutrition']}, and sleep averaged "
                f"{averages['avg_sleep']} hours per night."
            )

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

        print(f"  [{job_id[:8]}] Sending to Ollama '{OLLAMA_MODEL}'...")
        ai_response = _call_ollama(structured_prompt)
        print(f"  [{job_id[:8]}] Ollama response received ({len(ai_response)} chars)")

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
        print(f"  [{job_id[:8]}] Pipeline error: {e}")
        import traceback
        traceback.print_exc()
        _health_jobs[job_id] = {'status': 'error', 'error': str(e)}

@app.route('/api/health-summary', methods=['POST'])
def health_summary_start():
    data = request.get_json() or {}
    gemini_key = os.getenv('GEMINI_API_KEY')
    job_id = str(uuid.uuid4())
    _health_jobs[job_id] = {'status': 'processing'}

    t = threading.Thread(target=_run_health_pipeline, args=(job_id, data, gemini_key))
    t.daemon = True
    t.start()

    print(f"  → Started health summary job {job_id[:8]}...")
    return jsonify({'jobId': job_id, 'status': 'processing'})

@app.route('/api/health_summary', methods=['POST'])
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

@app.route('/api/health-summary/<job_id>', methods=['GET'])
def health_summary_poll(job_id):
    job = _health_jobs.get(job_id)
    if not job:
        return jsonify({'error': 'Job not found'}), 404
    if job['status'] == 'processing':
        return jsonify({'status': 'processing'})
    if job['status'] == 'error':
        del _health_jobs[job_id]
        return jsonify({'status': 'error', 'error': job['error']}), 500
    result = job['result']
    del _health_jobs[job_id]
    return jsonify({'status': 'done', **result})

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
    app.run(debug=True, host='0.0.0.0', port=port, threaded=True, use_reloader=False)

