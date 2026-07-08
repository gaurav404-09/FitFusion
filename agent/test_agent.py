import sys, traceback
import codecs
sys.stdout = codecs.getwriter("utf-8")(sys.stdout.detach())
from datetime import datetime
from langgraph_agent import CampusTitanAgent

try:
    agent = CampusTitanAgent()
    
    queries = [
        "Give me a plan to complete 100g protein today",
        "How can I burn 800 calories today?",
        "Give me a vegetarian meal plan for 60g protein"
    ]
    
    user_context = {
        "name": "Devansh",
        "age": 22,
        "protein_goal": 60,
        "weekly_goal": 150
    }
    
    for q in queries:
        print(f"\n--- TESTING QUERY: {q} ---")
        try:
            res = agent.process_query(q, "f3b691e4-22e7-4eff-8bd9-7c27b57cff12", user_context)
            print("ANS:", res.answer)
            print("TOOL:", res.tool_used)
        except Exception as e:
            traceback.print_exc()

except Exception as e:
    traceback.print_exc()
