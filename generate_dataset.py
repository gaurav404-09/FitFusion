import os
import json
import random
import time
from dotenv import load_dotenv
import cohere

def generate_distilled_dataset_cohere(num_samples=500, output_file="llama3_distilled_data.jsonl"):
    # 1. Securely load the API key
    load_dotenv()
    api_key = os.environ.get("COHERE_API_KEY")
    
    if not api_key:
        print("CRITICAL: COHERE_API_KEY missing from .env file.")
        exit(1)
        
    # Initialize the Cohere client
    co = cohere.Client(api_key)
    
    system_prompt = "You are a direct, analytical health coach. Analyze the user's historical trends against their current daily inputs. Provide concise, realistic feedback and one actionable adjustment for their next meal or routine. Do not sugarcoat poor metrics."
    
    print(f"Starting Cohere Teacher-Student generation of {num_samples} examples.")
    print(f"Estimated time to completion: {round((num_samples * 3.5) / 60, 1)} minutes.")
    print("--------------------------------------------------")

    with open(output_file, "w", encoding="utf-8") as f:
        pass 

    for i in range(1, num_samples + 1):
        # 2. Math Generation
        avg_sleep = round(random.uniform(4.0, 9.0), 1)
        avg_nutrition = round(random.uniform(30.0, 85.0), 1)
        avg_mental = round(random.uniform(30, 90))
        
        current_mental = max(10, min(100, round(avg_mental + random.uniform(-10, 10))))
        today_nutrition = round(avg_nutrition + random.uniform(-15, 15), 1)
        
        if avg_sleep < 6.0 and avg_mental < 50:
            trend = f"Over the 7-day period, the user's mental score declined to {avg_mental}, strongly correlated with chronic sleep deprivation ({avg_sleep} hrs avg)."
        elif avg_nutrition < 50:
            trend = f"The 7-day trend shows poor sustained nutrient density ({avg_nutrition}), leading to fluctuating energy and a stagnant mental score of {avg_mental}."
        else:
            trend = f"Metrics are stable. 7-day nutrition density is excellent at {avg_nutrition}, supporting a healthy sleep baseline of {avg_sleep} hours and a strong mental score of {avg_mental}."

        user_prompt = f"""[HISTORICAL CONTEXT - PAST 7 DAYS]
Trend: {trend}
7-Day Averages: 
- Mental Health: {avg_mental}/100
- Nutrition Density: {avg_nutrition}
- Sleep: {avg_sleep} hours

[TODAY'S CURRENT VECTORS]
- Current Mental Health Score: {current_mental}/100
- Today's Meal Nutrition Density: {today_nutrition}"""

        teacher_instruction = f"""
        You are an expert training data generator for a smaller LLM. 
        Read the following health data and write a strict, highly analytical 3-sentence response evaluating the user's state. 
        Do NOT sugarcoat it. End with exactly ONE actionable adjustment. 
        Vary your vocabulary, tone, and sentence structure significantly.
        
        Data to analyze:
        {user_prompt}
        """

        # 3. Intelligent Retry Loop
        success = False
        while not success:
            try:
                # 4. Call the Cohere Command R model
                response = co.chat(
                    model="command-r-08-2024",
                    message=teacher_instruction,
                    temperature=0.8
                )
                assistant_reply = response.text.strip()
                
                chat_object = {
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt},
                        {"role": "assistant", "content": assistant_reply}
                    ]
                }
                
                with open(output_file, "a", encoding="utf-8") as f:
                    f.write(json.dumps(chat_object) + "\n")
                    
                print(f"Generated {i}/{num_samples} | Metrics: Sleep={avg_sleep}, NRF={today_nutrition}")
                success = True 
                
                # Sleep for 3.5 seconds to safely stay under the 20 RPM limit
                time.sleep(3.5) 
                
            except Exception as e:
                error_msg = str(e).lower()
                if "429" in error_msg or "rate limit" in error_msg:
                    print(f"-> Rate Limit Hit on iteration {i}. Backing off for 60 seconds...")
                    time.sleep(60)
                else:
                    print(f"-> Unknown Error on iteration {i}: {e}. Retrying in 15 seconds...")
                    time.sleep(15)

    print(f"\n--- SUCCESS: Dataset saved to {output_file} ---")

if __name__ == "__main__":
    generate_distilled_dataset_cohere(500)