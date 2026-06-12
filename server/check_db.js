require('dotenv').config({ path: '../.env' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function check() {
  console.log("Checking colloscope table...");
  const { data: colloscope } = await supabase.from('colloscope').select('*');
  let foundInColloscope = false;
  if (colloscope) {
    for (const row of colloscope) {
      for (const k of row.kholles || []) {
        if (k.prof && k.prof.includes('Bonnard') && k.prof.includes('Brayer')) {
          console.log('Found in colloscope row:', row.id, k.prof);
          foundInColloscope = true;
        }
      }
    }
  }
  if (!foundInColloscope) console.log("Not found in colloscope");

  console.log("\nChecking kholleur_reviews table...");
  const { data: reviews } = await supabase.from('kholleur_reviews').select('*');
  let foundInReviews = false;
  if (reviews) {
    for (const r of reviews) {
      if (r.kholleur_name && r.kholleur_name.includes('Bonnard') && r.kholleur_name.includes('Brayer')) {
        console.log('Found in review:', r.id, r.kholleur_name);
        foundInReviews = true;
      }
    }
  }
  if (!foundInReviews) console.log("Not found in reviews");
}

check().catch(console.error);
