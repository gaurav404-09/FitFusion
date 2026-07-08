// Quick database test
import { supabase } from './src/services/supabase.js';

async function testDatabase() {
  console.log('🔍 Testing database connection...');
  
  try {
    // Test 1: Simple users query
    console.log('Test 1: Simple users query');
    const { data: users1, error: error1 } = await supabase
      .from('users')
      .select('id, name, college');
    
    console.log('Users1 result:', { count: users1?.length || 0, error: error1 });
    
    // Test 2: Count query
    console.log('Test 2: Count query');
    const { count, error: error2 } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });
    
    console.log('Count result:', { count, error: error2 });
    
    // Test 3: Using service role (if available)
    console.log('Test 3: With service role');
    const serviceClient = supabase;
    const { data: users3, error: error3 } = await serviceClient
      .from('users')
      .select('id, name, college');
    
    console.log('Users3 result:', { count: users3?.length || 0, error: error3 });
    
  } catch (error) {
    console.error('Database test error:', error);
  }
}

testDatabase();
