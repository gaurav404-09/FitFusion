# TODO: Dynamic Nutrition Goals Implementation

## Task: Calculate personalized nutrition goals based on body metrics

### Completed Steps:
1. [x] Analyze codebase to understand current implementation
2. [x] Create nutrition calculator utility (`src/utils/nutritionCalculator.js`)
3. [x] Add goal columns to users table in Supabase (via migration_nutrition_goals.sql)
4. [x] Update auth service to calculate and store goals during registration
5. [x] Update NutritionScreen to use personalized goals
6. [x] Make goals editable via a modal
7. [x] Update AuthContext to properly merge updated user data

### How It Works:

#### 1. During Registration:
- User enters height, weight, age, and gender in Step 3
- The system calculates personalized nutrition goals using Mifflin-St Jeor equation
- Goals are stored in the users table

#### 2. On Nutrition Screen:
- Personalized goals are loaded from user profile
- BMI is calculated and displayed
- Goals can be edited by tapping the ⚙️ button

#### 3. Editable Goals:
- Users can change fitness goal (Lose/Maintain/Gain)
- Users can change activity level (Sedentary to Very Active)
- Users can manually override any macro value
- "Reset to Calculated" recalculates based on body metrics

### Database Migration:
Run the migration file to add the new columns:
```bash
# Run the SQL migration in Supabase SQL Editor
# File: migration_nutrition_goals.sql
```

### Nutrition Calculation Formula:
- **BMR (Mifflin-St Jeor Equation):**
  - Male: (10 × weight in kg) + (6.25 × height in cm) - (5 × age) + 5
  - Female: (10 × weight in kg) + (6.25 × height in cm) - (5 × age) - 161
- **TDEE = BMR × Activity Factor**
  - Sedentary: 1.2
  - Light: 1.375
  - Moderate: 1.55
  - Active: 1.725
  - Very Active: 1.9
- **Macro Distribution:**
  - Protein: ~1.6-2g per kg body weight
  - Fat: ~25-30% of TDEE
  - Carbs: Remaining calories

