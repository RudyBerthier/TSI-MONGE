const supabaseAdmin = require('../config/supabase-admin')

const sql = `
CREATE TABLE IF NOT EXISTS carpool_rides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  origin TEXT NOT NULL,
  destination TEXT NOT NULL,
  departure_time TIMESTAMPTZ NOT NULL,
  seats_offered INTEGER NOT NULL CHECK (seats_offered > 0),
  seats_available INTEGER NOT NULL CHECK (seats_available >= 0),
  price INTEGER DEFAULT 0,
  description TEXT DEFAULT '',
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'full', 'cancelled', 'completed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_carpool_rides_departure ON carpool_rides(departure_time);
CREATE INDEX IF NOT EXISTS idx_carpool_rides_driver ON carpool_rides(driver_id);

CREATE TABLE IF NOT EXISTS carpool_passengers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_id UUID NOT NULL REFERENCES carpool_rides(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'cancelled')),
  message TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(ride_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_carpool_passengers_ride ON carpool_passengers(ride_id);
CREATE INDEX IF NOT EXISTS idx_carpool_passengers_user ON carpool_passengers(user_id);
`

async function main() {
  const { data, error } = await supabaseAdmin.rpc('exec_sql', { sql_string: sql })
  if (error) {
    console.error('Error executing SQL via RPC:', error)
  } else {
    console.log('SQL executed successfully!')
  }
}
main()
