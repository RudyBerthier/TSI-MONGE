import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();
dotenv.config({ path: './server/.env' });

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function fix() {
  const { data: users, error } = await supabase.from('clicker_users').select('user_id, points, total_clicks');
  if (error) {
    console.error(error);
    return;
  }
  
  let trueTotal = 0n;
  for (const user of users) {
    trueTotal += BigInt(user.total_clicks);
  }
  
  console.log('Vrai total lycée :', trueTotal.toString());
  
  const { data: global, error: gErr } = await supabase.from('clicker_global').select('*');
  console.log('Global actuel :', global);
  
  if (global.length > 0) {
      await supabase.from('clicker_global').update({ total_clicks: Number(trueTotal) }).eq('id', 1);
      console.log('Total mis à jour.');
  }
}

fix();
