import os
import json
import time
import requests
from PIL import Image
from pydantic import BaseModel, Field
from dotenv import load_dotenv

# ==========================================
# Phase 1: Pydantic Schemas
# ==========================================

class InitialIdentification(BaseModel):
    dish_name: str = Field(description="Generic name of the food (e.g., 'Apple, raw', 'Chapati, plain')")
    estimated_portion_g: float = Field(description="Final calculated weight in grams")
    estimation_method: str = Field(description="State whether weight was calculated via 'User Text', 'Reference Object', or 'Blind Guess'")

class USDASelection(BaseModel):
    best_match_id: int = Field(description="The exact fdcId that matches. Return -1 if NO options match.")

class GeminiNutritionMatrix(BaseModel):
    food_name: str = Field(description="Generic name of the identified food")
    portion_g: float = Field(description="Portion size in grams")
    calories: float = Field(description="Calories for the portion")
    protein: float = Field(description="Protein grams for the portion")
    carbs: float = Field(description="Carbohydrates grams for the portion")
    fat: float = Field(description="Fat grams for the portion")
    saturated_fat: float = Field(description="Saturated fat grams for the portion")
    fiber: float = Field(description="Dietary fiber grams for the portion")
    sugars: float = Field(description="Sugars grams for the portion")
    sodium_mg: float = Field(description="Sodium in mg for the portion")
    calcium_mg: float = Field(description="Calcium in mg for the portion")
    iron_mg: float = Field(description="Iron in mg for the portion")
    magnesium_mg: float = Field(description="Magnesium in mg for the portion")
    potassium_mg: float = Field(description="Potassium in mg for the portion")
    vitamin_a_ug: float = Field(description="Vitamin A in µg for the portion")
    vitamin_c_mg: float = Field(description="Vitamin C in mg for the portion")
    vitamin_e_mg: float = Field(description="Vitamin E in mg for the portion")

# ==========================================
# Phase 2: Nutrient Density Engine (NRF9.3)
# ==========================================

def calculate_nrf93(nutrition_data: dict) -> float:
    """
    Calculates the Nutrient Rich Foods (NRF9.3) index.
    Keys must exactly match the updated units (mg, µg).
    """
    dv_positive = {
        "Protein( in g)": 50.0,
        "Dietary Fiber( in g)": 28.0,
        "Vitamin A( in µg)": 900.0,    # Corrected to µg
        "Vitamin C( in mg)": 90.0,
        "Vitamin E( in mg)": 15.0,
        "Calcium( in mg)": 1300.0,
        "Iron( in mg)": 18.0,
        "Magnesium( in mg)": 420.0,
        "Potassium( in mg)": 4700.0
    }
    
    mrv_negative = {
        "Saturated Fats( in g)": 20.0,
        "Sugars( in g)": 50.0,         
        "Sodium( in mg)": 2300.0       # Corrected to mg
    }
    
    positive_score = 0.0
    for nutrient, dv in dv_positive.items():
        amount = nutrition_data.get(nutrient, 0.0)
        pct = (amount / dv) * 100
        positive_score += min(pct, 100.0)
        
    negative_score = 0.0
    for nutrient, mrv in mrv_negative.items():
        amount = nutrition_data.get(nutrient, 0.0)
        pct = (amount / mrv) * 100
        negative_score += pct
        
    final_score = positive_score - negative_score
    return round(final_score, 2)

def _pick_supported_gemini_model(genai_module, preferred_models):
    try:
        models = list(genai_module.list_models())
        available = {m.name for m in models if getattr(m, 'supported_generation_methods', None) and 'generateContent' in m.supported_generation_methods}
        # Filter out TTS and non-vision models
        vision_models = {m.name for m in models if getattr(m, 'supported_generation_methods', None) and 'generateContent' in m.supported_generation_methods and not any(skip in m.name.lower() for skip in ['tts', 'text', 'audio'])}
        print(f"  [Debug] Available vision models: {list(vision_models)[:5]}")
        for name in preferred_models:
            if name in vision_models:
                return name
        for name in vision_models:
            return name
        return next(iter(available), None)
    except Exception:
        return None

# ==========================================
# Phase 3: The ML Pipeline
# ==========================================

def execute_ml_vision_pipeline(image_path: str, user_text_context: str, gemini_key: str, usda_key: str):
    import google.generativeai as genai
    genai.configure(api_key=gemini_key)
    preferred_models = [
    "models/gemini-2.5-flash",
    "models/gemini-2.0-flash",
    "models/gemini-1.5-flash",
    "models/gemini-1.5-pro"
]
    model_name = "models/gemini-2.5-flash"
    model = genai.GenerativeModel(model_name)
    print(f"  [Debug] Gemini key prefix: {gemini_key[:10]}..." if gemini_key else "  [Debug] No Gemini key!")
    try:
        image = Image.open(image_path)
    except FileNotFoundError:
        print(f"Error: Could not find image at '{image_path}'")
        return None

    print("\n[Step 1] ML Vision & Context Processing...")
    prompt_1 = f"""
    Analyze this food image. 
    User provided context: "{user_text_context if user_text_context else 'None'}"
    
    Task 1: Identify the primary food item. Keep the name generic for a USDA database search.
    
    Task 2: Determine the portion size in grams. You MUST follow this hierarchy:
    1. IF user provided context (e.g., '4 rotis', '1 bowl'), calculate total grams mathematically based on standard sizes.
    2. IF context is 'None', scan the image for a physical reference object (fork, coin, plate edge) to estimate volume.
    3. IF no reference object exists, make your best conservative baseline guess.
    """
    
    def _generate_with_model_fallback(schema, parts):
        nonlocal model, model_name
        last_err = None
        for candidate in preferred_models:
            max_retries = 3
            for retry in range(max_retries + 1):
                try:
                    model_name = candidate
                    model = genai.GenerativeModel(model_name)
                    if retry == 0:
                        print(f"  [Gemini] Trying model: {model_name}")
                    else:
                        print(f"  [Gemini] Retry {retry}/{max_retries} for {model_name}...")
                    
                    result = model.generate_content(
                        parts,
                        generation_config=genai.GenerationConfig(
                            response_mime_type="application/json",
                            response_schema=schema,
                            temperature=0.0,
                        ),
                    )
                    print(f"  [Gemini] Success with model: {model_name}")
                    return result
                except Exception as e:
                    last_err = e
                    err_str = str(e)
                    
                    # Handle Rate Limit (429)
                    if '429' in err_str or 'quota exceeded' in err_str.lower():
                        if retry < max_retries:
                            wait_time = (2 ** retry) * 5 + 2 # 2s, 7s, 14s...
                            print(f"  [Gemini] Rate limit hit (429). Waiting {wait_time}s before retry...")
                            time.sleep(wait_time)
                            continue
                        else:
                            print(f"  [Gemini] Max retries reached for {model_name} due to rate limit.")
                    
                    if 'not found' in err_str.lower() or 'not supported' in err_str.lower() or '404' in err_str:
                        print(f"  [Gemini] Model {candidate} not available, trying next...")
                        break # Break retry loop to try next model
                        
                    if 'image input modality is not enabled' in err_str.lower() or '400' in err_str:
                        print(f"  [Gemini] Model {candidate} does not support images, trying next...")
                        break # Break retry loop to try next model
                    
                    # If it's a different error, stop retrying this model and try next one
                    print(f"  [Gemini] Error with {model_name}: {err_str}")
                    break
                    
        supported = _pick_supported_gemini_model(genai, preferred_models)
        if supported:
            try:
                model_name = supported
                model = genai.GenerativeModel(model_name)
                print(f"  [Gemini] Using auto-selected model: {model_name}")
                return model.generate_content(
                    parts,
                    generation_config=genai.GenerationConfig(
                        response_mime_type="application/json",
                        response_schema=schema,
                        temperature=0.0,
                    ),
                )
            except Exception as e:
                last_err = e
        raise last_err or Exception('No supported Gemini model found')

    try:
        response_1 = _generate_with_model_fallback(InitialIdentification, [prompt_1, image])
        initial_data = json.loads(response_1.text)
    except Exception as e:
        print(f"Vision API Error: {e}")
        return None
        
    food_name = initial_data["dish_name"]
    portion_g = initial_data["estimated_portion_g"]
    method = initial_data["estimation_method"]
    
    print(f"-> Detected: {food_name}")
    print(f"-> Calculated Weight: {portion_g}g")
    print(f"-> Logic Used: {method}")

    def _gemini_only_nutrition():
        prompt_g = f"""
        You are a nutrition expert.

        Use the food image to identify the food and estimate nutrition.

        Serving-size rule:
        - If the user provided serving text context, treat it as the authoritative serving size.
        - If not provided, estimate a reasonable serving size from the image.

        User context: "{user_text_context if user_text_context else 'None'}"

        Return nutrition for ONE serving as JSON with these fields:
        - food_name
        - portion_g
        - calories
        - protein
        - carbs
        - fat
        - saturated_fat
        - fiber
        - sugars
        - sodium_mg
        - calcium_mg
        - iron_mg
        - magnesium_mg
        - potassium_mg
        - vitamin_a_ug
        - vitamin_c_mg
        - vitamin_e_mg
        """
        resp = _generate_with_model_fallback(GeminiNutritionMatrix, [prompt_g, image])
        data = json.loads(resp.text)

        # Map to existing app keys
        out = {
            "food_name": data.get("food_name") or food_name,
            "portion_g": float(data.get("portion_g") or portion_g or 0),
            "Caloric Value": float(data.get("calories") or 0),
            "Protein( in g)": float(data.get("protein") or 0),
            "Carbohydrates( in g)": float(data.get("carbs") or 0),
            "Fat( in g)": float(data.get("fat") or 0),
            "Saturated Fats( in g)": float(data.get("saturated_fat") or 0),
            "Dietary Fiber( in g)": float(data.get("fiber") or 0),
            "Sugars( in g)": float(data.get("sugars") or 0),
            "Sodium( in mg)": float(data.get("sodium_mg") or 0),
            "Calcium( in mg)": float(data.get("calcium_mg") or 0),
            "Iron( in mg)": float(data.get("iron_mg") or 0),
            "Magnesium( in mg)": float(data.get("magnesium_mg") or 0),
            "Potassium( in mg)": float(data.get("potassium_mg") or 0),
            "Vitamin A( in µg)": float(data.get("vitamin_a_ug") or 0),
            "Vitamin C( in mg)": float(data.get("vitamin_c_mg") or 0),
            "Vitamin E( in mg)": float(data.get("vitamin_e_mg") or 0),
            "is_gemini_only": True
        }
        out["Nutrition Density"] = calculate_nrf93(out)
        return out

    print("\n[Step 2] Fetching USDA Candidates...")
    usda_url = "https://api.nal.usda.gov/fdc/v1/foods/search"
    params = {"api_key": usda_key, "query": food_name, "pageSize": 5, "dataType": ["Foundation", "SR Legacy"]}
    
    usda_response = requests.get(usda_url, params=params)
    if usda_response.status_code != 200:
        raise Exception(f"USDA API returned status {usda_response.status_code}: {usda_response.text[:200]}")
        
    candidates = usda_response.json().get("foods", [])
    if not candidates: 
        raise Exception(f"No USDA database matches found for '{food_name}'")

    options_text = "USDA Database Options:\n"
    for item in candidates:
        options_text += f"- ID: {item['fdcId']} | Name: {item['description']}\n"
    print(options_text)

    print("\n[Step 3] AI Autonomous Verification...")
    prompt_2 = f"Review the options and return the exact ID matching '{food_name}'. Return -1 if no safe match.\n{options_text}"
    
    response_2 = _generate_with_model_fallback(USDASelection, [prompt_2, image])
    
    selected_id = json.loads(response_2.text)["best_match_id"]
    if selected_id == -1: 
        print("AI rejected all candidates to preserve data integrity.")
        print("Switching to Gemini-only nutrition (no USDA fallback).")
        return _gemini_only_nutrition()
    else:
        selected_food = next((item for item in candidates if item["fdcId"] == selected_id), None)
        if selected_food is None:
            print(f"Selected ID {selected_id} not in candidate list. Switching to Gemini-only nutrition (no USDA fallback).")
            return _gemini_only_nutrition()
    print(f"-> ML Approved Match: {selected_food['description']}")

    print("\n[Step 4] Scaling 34-Column Matrix & Calculating Density...")
    
    nutrient_mapping = {
        1008: "Caloric Value", 1004: "Fat( in g)", 1258: "Saturated Fats( in g)",
        1292: "Monounsaturated Fats( in g)", 1293: "Polyunsaturated Fats( in g)",
        1005: "Carbohydrates( in g)", 2000: "Sugars( in g)", 1003: "Protein( in g)",
        1079: "Dietary Fiber( in g)", 1253: "Cholesterol( in mg)", 1093: "Sodium( in mg)", 
        1055: "Water( in g)", 1106: "Vitamin A( in µg)", 1165: "Vitamin B1 (Thiamine)( in mg)",
        1177: "Vitamin B11 (Folic Acid)( in µg)", 1178: "Vitamin B12( in mg)",
        1166: "Vitamin B2 (Riboflavin)( in mg)", 1167: "Vitamin B3 (Niacin)( in mg)",
        1170: "Vitamin B5 (Pantothenic Acid)( in mg)", 1175: "Vitamin B6( in mg)",
        1162: "Vitamin C( in mg)", 1110: "Vitamin D( in mg)", 1109: "Vitamin E( in mg)",
        1185: "Vitamin K( in µg)", 1087: "Calcium( in mg)", 1098: "Copper( in mg)",
        1089: "Iron( in mg)", 1090: "Magnesium( in mg)", 1097: "Manganese( in mg)",
        1091: "Phosphorus( in mg)", 1092: "Potassium( in mg)", 1103: "Selenium( in µg)", 
        1095: "Zinc( in mg)"
    }
    
    final_nutrition = {name: 0.0 for name in nutrient_mapping.values()}
    
    for nutrient in selected_food.get("foodNutrients", []):
        n_id = nutrient.get("nutrientId")
        if n_id in nutrient_mapping:
            final_nutrition[nutrient_mapping[n_id]] = nutrient.get("value", 0.0)
            unit = nutrient.get("unitName", "")
            
            if unit == "g":
                final_nutrition[nutrient_mapping[n_id]] = nutrient.get("value", 0.0)
            elif unit == "mg":
                final_nutrition[nutrient_mapping[n_id]] = nutrient.get("value", 0.0)
            elif unit == "µg" or unit == "mcg":
                final_nutrition[nutrient_mapping[n_id]] = nutrient.get("value", 0.0) / 1000
            elif unit == "IU":
                if nutrient_mapping[n_id] == "Vitamin A( in µg)":
                    final_nutrition[nutrient_mapping[n_id]] = nutrient.get("value", 0.0) * 0.3
                elif nutrient_mapping[n_id] == "Vitamin D( in mg)":
                    final_nutrition[nutrient_mapping[n_id]] = nutrient.get("value", 0.0) * 0.025
            else:
                final_nutrition[nutrient_mapping[n_id]] = nutrient.get("value", 0.0)
    
    multiplier = portion_g / 100.0
    for key in final_nutrition:
        final_nutrition[key] = round(final_nutrition[key] * multiplier, 2)
        
    final_nutrition["Nutrition Density"] = calculate_nrf93(final_nutrition)
    final_nutrition["food_name"] = selected_food["description"]
    final_nutrition["portion_g"] = portion_g
    final_nutrition["is_gemini_only"] = False

    return final_nutrition

# ==========================================
# Execution Block
# ==========================================
if __name__ == "__main__":
    load_dotenv() 

    GEMINI_KEY = os.environ.get("GEMINI_API_KEY")
    USDA_KEY = os.environ.get("USDA_API_KEY")
    
    if not GEMINI_KEY or not USDA_KEY:
        print("CRITICAL: Missing API keys. Please check your .env file.")
        exit(1)
        
    IMAGE_FILE = "C:/Users/Asus/CampusTitan/test_image.png"
    USER_CONTEXT = "2 rotis" 
    
    result = execute_ml_vision_pipeline(IMAGE_FILE, USER_CONTEXT, GEMINI_KEY, USDA_KEY)
    
    if result:
        print("\n--- Final Verified Matrix ---")
        import json
        print(json.dumps(result, indent=4))