CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('traveler', 'guide', 'admin')),
  created_at TEXT NOT NULL
);

CREATE TABLE sessions (
  token TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL
);

CREATE TABLE guides (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  place TEXT NOT NULL,
  languages JSONB NOT NULL DEFAULT '[]'::jsonb,
  rate INTEGER NOT NULL,
  years INTEGER NOT NULL DEFAULT 0,
  specialty TEXT NOT NULL DEFAULT '',
  bio TEXT NOT NULL DEFAULT '',
  rating REAL NOT NULL DEFAULT 0,
  reviews INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected', 'paused')),
  created_at TEXT NOT NULL
);

CREATE TABLE plans (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  destination TEXT NOT NULL,
  days INTEGER NOT NULL,
  budget INTEGER NOT NULL,
  interests JSONB NOT NULL DEFAULT '[]'::jsonb,
  plan_json JSONB NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE expenses (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id INTEGER NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  amount INTEGER NOT NULL CHECK (amount > 0),
  spent_on TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE bookings (
  id SERIAL PRIMARY KEY,
  traveler_id INTEGER NOT NULL REFERENCES users(id),
  guide_id INTEGER NOT NULL REFERENCES guides(id),
  destination TEXT NOT NULL,
  trip_date TEXT NOT NULL,
  guests INTEGER NOT NULL DEFAULT 1,
  note TEXT NOT NULL DEFAULT '',
  amount INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'declined', 'cancelled', 'completed')),
  payment_status TEXT NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'demo_paid', 'refunded')),
  created_at TEXT NOT NULL
);

CREATE TABLE reviews (
  id SERIAL PRIMARY KEY,
  booking_id INTEGER NOT NULL UNIQUE REFERENCES bookings(id) ON DELETE CASCADE,
  traveler_id INTEGER NOT NULL REFERENCES users(id),
  guide_id INTEGER NOT NULL REFERENCES guides(id),
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);

CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_guides_status_place ON guides(status, place);
CREATE INDEX idx_plans_user ON plans(user_id);
CREATE INDEX idx_expenses_plan ON expenses(plan_id);
CREATE INDEX idx_bookings_traveler ON bookings(traveler_id);
CREATE INDEX idx_bookings_guide ON bookings(guide_id);
