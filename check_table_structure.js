// Check table structure
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://wavefmcuylmowtxwbesv.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndhdmVmbWN1eWxtb3d0eHdiZXN2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2NDUwNDEsImV4cCI6MjA4ODIyMTA0MX0.kfsDYwbJ3jL7drQc1Ht06B5PDNT6KY0JF-3Lz2qhf0s'
);

async function checkTableStructure() {
  try {
    // Check table columns
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('Error:', error);
    } else if (data && data.length > 0) {
      console.log('Table columns:', Object.keys(data[0]));
      console.log('Sample row:', data[0]);
    } else {
      console.log('Table is empty, checking columns differently...');
      
      // Try to get column info from information schema
      const { data: columns, error: colError } = await supabase
        .from('information_schema.columns')
        .select('column_name, data_type')
        .eq('table_name', 'users')
        .eq('table_schema', 'public');
      
      if (colError) {
        console.error('Column check error:', colError);
      } else {
        console.log('Table columns from schema:', columns);
      }
    }
  } catch (error) {
    console.error('Check error:', error);
  }
}

checkTableStructure();
