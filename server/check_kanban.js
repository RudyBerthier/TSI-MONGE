require('dotenv').config({ path: '.env' })
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY)

async function check() {
  const { data, error } = await supabase.from('homework_tasks').select('link').limit(1)
  if (error) {
    console.error('Error selecting link:', error)
  } else {
    console.log('Success selecting link, data:', data)
  }
}

check()
