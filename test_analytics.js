// Test analytics service
import analyticsService from './src/services/AnalyticsService.js';

async function testAnalytics() {
  console.log('🔍 Testing analytics service...');
  
  try {
    const analytics = await analyticsService.getCampusAnalytics();
    console.log('Analytics result:', analytics);
    console.log('College stats count:', analytics?.collegeStats?.length || 0);
    console.log('Weekly trends count:', analytics?.weeklyTrends?.length || 0);
    
    if (analytics?.collegeStats?.length > 0) {
      console.log('First college:', analytics.collegeStats[0]);
    }
  } catch (error) {
    console.error('Analytics test error:', error);
  }
}

testAnalytics();
