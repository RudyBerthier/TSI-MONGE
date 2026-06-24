const supabase = require('../server/config/supabase');

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
