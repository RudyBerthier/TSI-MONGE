require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function main() {
  const { data, error } = await supabase.rpc('add_release_date_column');
  if (error) {
    console.error('RPC Error (maybe not defined):', error);
  } else {
    console.log('Success RPC:', data);
  }
}
main();
