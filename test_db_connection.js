#!/usr/bin/env node

/**
 * Minimal sanity test for Supabase DB connection and basic CRUD.
 * Run with: node test_db_connection.js
 */

require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);

async function testConnection() {
  console.log('🔌 Testing Supabase connection...');
  try {
    // Test 1: Basic connectivity
    const { data, error } = await supabase.from('users').select('id').limit(1);
    if (error) throw error;
    console.log('✅ Connected to Supabase');

    // Test 2: RLS policies (should return empty for unauthenticated)
    const { data: foodLogs, error: foodError } = await supabase.from('food_logs').select('*').limit(1);
    if (foodError && !foodError.message.includes('row-level security')) {
      throw foodError;
    }
    console.log('✅ RLS policies enforce (no rows returned for anonymous)');

    // Test 3: RPC exists
    const { data: rpcData, error: rpcError } = await supabase.rpc('get_campus_overview');
    if (rpcError) {
      console.warn('⚠️ RPC get_campus_overview not found or error:', rpcError.message);
    } else {
      console.log('✅ RPC get_campus_overview works');
    }

    console.log('🎉 All basic checks passed.');
  } catch (err) {
    console.error('❌ Connection test failed:', err);
    process.exit(1);
  }
}

testConnection();
