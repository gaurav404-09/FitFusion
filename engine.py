# engine.py

class EMATracker:
    def __init__(self, alpha: float = 0.3):
        """
        Initializes the EMA tracker.
        alpha (float): The smoothing factor (0 < alpha <= 1). 
        A higher alpha discounts older observations faster.
        """
        self.alpha = alpha

    def normalize_metrics(self, calories: int, sleep: float, mood: int, exercise: int) -> float:
        """
        Converts raw daily metrics into a normalized daily score out of 100.
        Note: These weights are examples. You should adjust them based on user goals.
        """
        # Example normalizations (you will need to refine the math based on your baseline goals)
        # Sleep: Assuming 8 hours is optimal (max 100 points)
        sleep_score = min((sleep / 8.0) * 100, 100)
        
        # Mood: Assuming mood is out of 10 (max 100 points)
        mood_score = (mood / 10.0) * 100
        
        # Exercise: Assuming 10,000 steps is the goal (max 100 points)
        exercise_score = min((exercise / 10000.0) * 100, 100)
        
        # Calories: Assuming 2000 is the target. Penalize for going too far over or under.
        calorie_diff = abs(2000 - calories)
        calorie_score = max(100 - (calorie_diff / 20.0), 0) # Lose 1 point per 20 kcal off target

        # Weighted daily score
        daily_score = (sleep_score * 0.3) + (exercise_score * 0.3) + (mood_score * 0.2) + (calorie_score * 0.2)
        return daily_score

    def calculate_new_ema(self, previous_ema: float, daily_score: float) -> float:
        """
        Calculates the new EMA based on the daily score and the historical EMA.
        """
        if previous_ema is None:
            return daily_score # First day of tracking
            
        new_ema = (self.alpha * daily_score) + ((1 - self.alpha) * previous_ema)
        return round(new_ema, 2)