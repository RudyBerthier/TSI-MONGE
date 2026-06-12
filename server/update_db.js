require('dotenv').config({ path: '../.env' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function updateColloscope() {
  console.log("Fetching colloscope table...");
  const { data: colloscope, error: fetchError } = await supabase.from('colloscope').select('*');
  
  if (fetchError) {
    console.error("Fetch error:", fetchError);
    return;
  }

  let updatedCount = 0;

  for (const row of colloscope) {
    let needsUpdate = false;
    const newKholles = row.kholles.map(k => {
      if (k.prof === 'Mme Bonnard / Mr Brayer') {
        k.prof = 'Mr Brayer';
        needsUpdate = true;
      }
      return k;
    });

    if (needsUpdate) {
      console.log(`Updating row ${row.code}...`);
      const { error: updateError } = await supabase
        .from('colloscope')
        .update({ kholles: newKholles })
        .eq('code', row.code);

      if (updateError) {
        console.error(`Error updating row ${row.code}:`, updateError);
      } else {
        updatedCount++;
      }
    }
  }

  console.log(`Finished updating. Rows updated: ${updatedCount}`);
}

updateColloscope().catch(console.error);
