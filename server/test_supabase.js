require('dotenv').config({ path: '../.env' });
const supabase = require('./config/supabase');

async function test() {
  const { data, error } = await supabase.from('math_content').select('*').limit(1);
  if (error) {
    console.error('Error fetching:', error);
  } else {
    console.log('Columns:', Object.keys(data[0] || {}));
  }
}
test();
