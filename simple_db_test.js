// Simple database test without React Native dependencies
import { createClient } from '@supabase/supabase-js';

// Use environment variables directly
const supabase = createClient(
  'https://wavefmcuylmowtxwbesv.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndhdmVmbWN1eWxtb3d0eHdiZXN2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2NDUwNDEsImV4cCI6MjA4ODIyMTA0MX0.kfsDYwbJ3jL7drQc1Ht06B5PDNT6KY0JF-3Lz2qhf0s'
);

async function testDatabase() {
  console.log('🔍 Testing simple database connection...');
  
  try {
    // Test 1: Simple users query
    console.log('Test 1: Simple users query');
    const { data: users1, error: error1 } = await supabase
      .from('users')
      .select('id, name, college');
    
    console.log('Users1 result:', { 
      count: users1?.length || 0, 
      error: error1,
      firstUser: users1?.[0] 
    });
    
    // Test 2: Count query
    console.log('Test 2: Count query');
    const { count, error: error2 } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });
    
    console.log('Count result:', { count, error: error2 });
    
    // Test 3: Test college filter
    console.log('Test 3: College filter for IIT Kharagpur');
    const { data: users3, error: error3 } = await supabase
      .from('users')
      .select('id, name, college')
      .eq('college', 'IIT Kharagpur');
    
    console.log('College filter result:', { 
      count: users3?.length || 0, 
      error: error3,
      users: users3?.map(u => ({ name: u.name, college: u.college }))
    });
    
  } catch (error) {
    console.error('Database test error:', error);
  }
}

testDatabase();
