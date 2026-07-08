import { supabase } from './supabase';

class DatabaseMigration {
  async addNutritionColumns() {
    try {
      console.log('Adding nutrition columns to food_logs table...');
      
      // Check if columns exist first
      const { data: columns, error: checkError } = await supabase
        .from('food_logs')
        .select('*')
        .limit(1);
      
      if (checkError) {
        console.error('Error checking table:', checkError);
        return false;
      }
      
      // Add nutrition_score column if it doesn't exist
      try {
        await supabase.rpc('execute_sql', {
          sql: 'ALTER TABLE food_logs ADD COLUMN IF NOT EXISTS nutrition_score REAL;'
        });
      } catch (e) {
        console.log('nutrition_score column might already exist');
      }
      
      // Add nutrition_grade column if it doesn't exist
      try {
        await supabase.rpc('execute_sql', {
          sql: 'ALTER TABLE food_logs ADD COLUMN IF NOT EXISTS nutrition_grade VARCHAR(10);'
        });
      } catch (e) {
        console.log('nutrition_grade column might already exist');
      }
      
      // Add fiber column if it doesn't exist
      try {
        await supabase.rpc('execute_sql', {
          sql: 'ALTER TABLE food_logs ADD COLUMN IF NOT EXISTS fiber REAL;'
        });
      } catch (e) {
        console.log('fiber column might already exist');
      }
      
      console.log('Migration completed successfully!');
      return true;
      
    } catch (error) {
      console.error('Migration error:', error);
      return false;
    }
  }
}

export default new DatabaseMigration();
