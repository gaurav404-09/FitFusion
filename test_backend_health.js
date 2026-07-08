#!/usr/bin/env node

/**
 * Minimal sanity test for nutrition backend health endpoint.
 * Run with: node test_backend_health.js
 */

require('dotenv').config({ path: '.env' });
const axios = require('axios');

const BACKEND_URL = process.env.EXPO_PUBLIC_NUTRITION_API_URL || 'http://localhost:5001';

async function testBackendHealth() {
  console.log('🏥 Testing nutrition backend health...');
  try {
    const response = await axios.get(`${BACKEND_URL}/api/health`, { timeout: 5000 });
    if (response.status === 200 && (response.data?.status === 'ok' || response.data?.status === 'healthy')) {
      console.log('✅ Backend health check passed');
    } else {
      console.warn('⚠️ Unexpected health response:', response.data);
    }
  } catch (err) {
    if (err.code === 'ECONNREFUSED') {
      console.warn('⚠️ Backend not running. Start it before using food scanner.');
    } else {
      console.error('❌ Backend health check failed:', err.message);
    }
  }
}

testBackendHealth();
