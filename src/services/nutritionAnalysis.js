import axios from 'axios';
import backendAPI from './backendAPI';

class NutritionAnalysisService {
  constructor() {
    this.geminiApiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
    this.usdaApiKey = process.env.EXPO_PUBLIC_USDA_API_KEY;
  }

  async analyzeFoodImage(imageUri, userContext = '') {
    try {
      // For now, use mock backend API
      // In production, this would call your actual backend that runs nutrition_score.py
      const result = await backendAPI.analyzeNutrition(imageUri, userContext);
      return result;
    } catch (error) {
      console.error('Nutrition analysis error:', error);
      throw new Error('Failed to analyze food image');
    }
  }

  async getUSDAData(foodName) {
    try {
      const response = await axios.get('https://api.nal.usda.gov/fdc/v1/foods/search', {
        params: {
          api_key: this.usdaApiKey,
          query: foodName,
          pageSize: 5,
          dataType: ['Foundation', 'SR Legacy'],
        },
      });
      return response.data;
    } catch (error) {
      console.error('USDA API error:', error);
      throw new Error('Failed to fetch USDA data');
    }
  }

  formatNutritionScore(nutritionData) {
    const score = nutritionData['Nutrition Density'] || 0;
    const calories = nutritionData['Caloric Value'] || 0;
    const protein = nutritionData['Protein( in g)'] || 0;
    const carbs = nutritionData['Carbohydrates( in g)'] || 0;
    const fat = nutritionData['Fat( in g)'] || 0;
    const fiber = nutritionData['Dietary Fiber( in g)'] || 0;

    return {
      score: Math.max(0, Math.min(100, score)), // Normalize to 0-100
      calories: Math.round(calories),
      protein: Math.round(protein * 10) / 10,
      carbs: Math.round(carbs * 10) / 10,
      fat: Math.round(fat * 10) / 10,
      fiber: Math.round(fiber * 10) / 10,
      grade: this.getNutritionGrade(score),
    };
  }

  getNutritionGrade(score) {
    if (score >= 80) return 'A';
    if (score >= 60) return 'B';
    if (score >= 40) return 'C';
    if (score >= 20) return 'D';
    return 'F';
  }

  getGradeColor(grade) {
    const colors = {
      'A': '#10B981', // green
      'B': '#84CC16', // lime
      'C': '#F59E0B', // amber
      'D': '#F97316', // orange
      'F': '#EF4444', // red
    };
    return colors[grade] || '#6B7280';
  }

  getGradeDescription(grade) {
    const descriptions = {
      'A': 'Excellent nutritional value',
      'B': 'Good nutritional value',
      'C': 'Average nutritional value',
      'D': 'Below average nutritional value',
      'F': 'Poor nutritional value',
    };
    return descriptions[grade] || 'Unknown nutritional value';
  }
}

export default new NutritionAnalysisService();
