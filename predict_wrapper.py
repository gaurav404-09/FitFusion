import sys
import json
import traceback
from titan_ml_interface import TitanHealthAI

def main():
    try:
        # Read input from stdin
        input_data = sys.stdin.read()
        if not input_data:
            print(json.dumps({"error": "No input data received"}))
            return

        user_metrics = json.loads(input_data)
        
        # Initialize AI Brain (now with keys in .env)
        titan_ai = TitanHealthAI()
        
        # Calculate score
        score = titan_ai.calculate_mental_score(user_metrics)
        
        # Output result as JSON
        print(json.dumps({"score": float(score)}))

    except Exception as e:
        print(json.dumps({
            "error": str(e),
            "traceback": traceback.format_exc()
        }))

if __name__ == "__main__":
    main()
