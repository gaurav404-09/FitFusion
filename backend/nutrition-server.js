from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import sys
import json
from dotenv import load_dotenv
from werkzeug.utils import secure_filename
import tempfile

# Add the parent directory to the path to import nutrition_score
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import nutrition_score
try:
    import nutrition_score
    load_dotenv()
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

        if nutrition_score and gemini_key and usda_key:
            print("Using real nutrition_score.py analysis")
            try:
                result = nutrition_score.execute_ml_vision_pipeline(
                    temp_image_path,
                    context,
                    gemini_key,
                    usda_key
                )

                if result:
                    print("✓ Analysis successful:", result.get('food_name', 'Unknown'))
                    # Clean up temp file
                    if os.path.exists(temp_image_path):
                        os.remove(temp_image_path)
                    return jsonify(result)
                else:
                    print("✗ Analysis failed, using fallback")
            except Exception as e:
                print(f"✗ nutrition_score.py error: {e}")

        # Fallback to context-based mock data
        print("Using fallback nutrition data")
        nutrition_data = get_fallback_data(context)

        # Clean up temp file
        if os.path.exists(temp_image_path):
            os.remove(temp_image_path)

        return jsonify(nutrition_data)

    except Exception as e:
        print(f"✗ Backend error: {e}")
        return jsonify({'error': str(e)}), 500

def get_fallback_data(context):
    """Get fallback nutrition data based on context"""
    context_lower = context.lower()

    if context_lower and 'rice' in context_lower:
        return {
            'food_name': 'Cooked White Rice',
            'Caloric Value': 130,
            'Protein( in g)': 2.7,
            'Carbohydrates( in g)': 28,
            'Fat( in g)': 0.3,
            'Dietary Fiber( in g)': 0.4,
            'Nutrition Density': 25.5,
        }

    if context_lower and ('roti' in context_lower or 'chapati' in context_lower):
        return {
            'food_name': 'Chapati (Roti)',
            'Caloric Value': 85,
            'Protein( in g)': 2.5,
            'Carbohydrates( in g)': 17,
            'Fat( in g)': 0.8,
            'Dietary Fiber( in g)': 2.0,
            'Nutrition Density': 45.2,
        }

    if context_lower and ('apple' in context_lower or 'fruit' in context_lower):
        return {
            'food_name': 'Apple',
            'Caloric Value': 52,
            'Protein( in g)': 0.3,
            'Carbohydrates( in g)': 14,
            'Fat( in g)': 0.2,
            'Dietary Fiber( in g)': 2.4,
            'Nutrition Density': 85.3,
        }

    if context_lower and 'banana' in context_lower:
        return {
            'food_name': 'Banana',
            'Caloric Value': 89,
            'Protein( in g)': 1.1,
            'Carbohydrates( in g)': 23,
            'Fat( in g)': 0.3,
            'Dietary Fiber( in g)': 2.6,
            'Nutrition Density': 78.5,
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
        serving_info = data.get('serving_info', '').strip()  # e.g., "2 rotis", "1 bowl", "150g"
        
        if not food_name:
            return jsonify({'error': 'Food name is required'}), 400
            
        # Build context for the AI
        context = f"{serving_info} {food_name}" if serving_info else food_name
        print(f"Context: {context}")
        
        # Check if we have nutrition_score and API keys
        gemini_key = os.getenv('GEMINI_API_KEY')
        usda_key = os.getenv('USDA_API_KEY')
        
        # For text-based analysis, we'll use a different approach
        # We'll create a mock image path that the nutrition_score can use
        # Actually, let's use a simpler approach - call Gemini directly
        
        if nutrition_score and gemini_key and usda_key:
            print("Using AI for text-based nutrition analysis")
            try:
                # Use Gemini to analyze the food text
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
                # Handle markdown code blocks if present
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
                # Fall through to fallback
        
        # Use fallback data based on keywords
        print("Using fallback nutrition data for text analysis")
        nutrition_data = get_fallback_data(context)
        
        # Adjust portion based on serving info if possible
        portion_multiplier = parse_serving_info(serving_info)
        if portion_multiplier > 0:
            nutrition_data['portion_g'] = 100 * portion_multiplier
            # Scale nutrients
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
    
    serving_lower = serving_info.lower()
    
    # Number at start (e.g., "2 rotis", "1.5 bowl")
    import re
    numbers = re.findall(r'[\d.]+', serving_lower)
    if numbers:
        try:
            num = float(numbers[0])
            
            # Common serving multipliers
            if 'bowl' in serving_lower:
                # Assume 1 bowl = 250g
                return num * 2.5
            elif 'roti' in serving_lower or 'chapati' in serving_lower:
                # Assume 1 roti = 30g
                return num * 0.3
            elif 'plate' in serving_lower:
                # Assume 1 plate = 300g
                return num * 3.0
            elif 'cup' in serving_lower:
                # Assume 1 cup = 200g
                return num * 2.0
            elif 'piece' in serving_lower or 'pc' in serving_lower:
                # Assume 1 piece = 50g (varies by food)
                return num * 0.5
            else:
                # Default: assume number is servings, 1 serving = 100g
                return num
        except:
            pass
    
    # Bowl keywords
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
    """
    try:
        print("Received mess menu analysis request")
        
        # Check if image was uploaded
        if 'image' not in request.files:
            return jsonify({'error': 'No image file provided'}), 400
            
        image_file = request.files['image']
        
        if image_file.filename == '':
            return jsonify({'error': 'No image selected'}), 400
            
        # Save image temporarily
        filename = secure_filename(image_file.filename)
        temp_image_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        image_file.save(temp_image_path)
        print(f"Saved mess menu image to: {temp_image_path}")
        
        # Check for Gemini API key
        gemini_key = os.getenv('GEMINI_API_KEY')
        
        if gemini_key and nutrition_score:
            try:
                import google.generativeai as genai
                from PIL import Image
                
                genai.configure(api_key=gemini_key)
                
                # Load image
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
                {{
                    "menu": {{
                        "Monday": {{"Breakfast": ["food1", "food2"], "Lunch": ["food3"], "Dinner": ["food4", "food5"]}},
                        "Tuesday": {{...}},
                        ...
                    }}
                }}
                
                If a meal is not specified or the image is unclear, use an empty array for that meal.
                Only include days that are clearly visible in the menu.
                
                Respond ONLY with the JSON object, no other text.
                """
                
                response = model.generate_content([image, prompt])
                response_text = response.text.strip()
                
                # Parse JSON from response
                if response_text.startswith("```json"):
                    response_text = response_text[7:]
                if response_text.startswith("```"):
                    response_text = response_text[3:]
                if response_text.endswith("```"):
                    response_text = response_text[:-3]
                
                result = json.loads(response_text.strip())
                print("✓ Mess menu analysis successful")
                
                # Clean up temp file
                if os.path.exists(temp_image_path):
                    os.remove(temp_image_path)
                    
                return jsonify(result)
                
            except Exception as e:
                print(f"✗ Mess menu analysis error: {e}")
        
        # Clean up temp file
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
        'gemini_key': bool(os.getenv('GEMINI_API_KEY')),
        'usda_key': bool(os.getenv('USDA_API_KEY'))
    })

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5001))
    print(f"Starting nutrition server on port {port}")
    print(f"Nutrition score available: {nutrition_score is not None}")
    app.run(debug=True, host='0.0.0.0', port=port)
