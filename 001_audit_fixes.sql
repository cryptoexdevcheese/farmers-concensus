-- ============================================================
-- Farmers Consensus — Audit Fix Migration
-- Additive only: safe to run against an existing production DB.
-- A few steps have pre-checks noted inline — run those SELECTs
-- first so you know what you're about to constrain.
-- ============================================================

-- 1) Allow the roles the app actually uses.
--    index.html already renders a "barangay" verification console,
--    but the schema comment only ever allowed 'farmer'/'buyer'.
--    Run this first to see what's really in the table:
--      SELECT DISTINCT user_type FROM users;
--    Adjust the list below if you find something unexpected.
DO $$
BEGIN
  ALTER TABLE users
    ADD CONSTRAINT chk_users_user_type
    CHECK (user_type IN ('farmer', 'buyer', 'barangay', 'admin'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2) Area precision: the registration form accepts a minimum of
--    0.001 ha, but DECIMAL(10,2) silently rounds anything under
--    0.005 ha to 0.00 on save. Widen it so small farms aren't lost.
ALTER TABLE farmers_registrations
  ALTER COLUMN area_ha TYPE DECIMAL(10,4);

-- 3) Referential integrity for the matching table. Today farmer_id /
--    buyer_id are plain VARCHAR with no FK, so a typo silently creates
--    an orphaned match. Check for existing orphans first:
--      SELECT m.* FROM farmer_buyer_matches m
--      LEFT JOIN farmers_registrations f ON m.farmer_id = f.farmer_id
--      WHERE f.farmer_id IS NULL;
--    Clean those rows up, then run:
DO $$
BEGIN
  ALTER TABLE farmer_buyer_matches
    ADD CONSTRAINT fk_matches_farmer
    FOREIGN KEY (farmer_id) REFERENCES farmers_registrations(farmer_id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE farmer_buyer_matches
    ADD CONSTRAINT fk_matches_buyer
    FOREIGN KEY (buyer_id) REFERENCES buyers_registrations(buyer_id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 4) Email verification — `email_verified` existed as a boolean with
--    no token table to ever actually flip it to true.
CREATE TABLE IF NOT EXISTS email_verification_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5) Password reset — there was no recovery path for ordinary users
--    at all (only the admin account had a, frankly non-functional,
--    "edit the .env file" recovery flow).
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6) Minimal duplicate-submission guard. This does NOT stop someone
--    from farming rewards using many different farmer_ids under one
--    account — that requires app-level rate limiting in server.js —
--    but it stops the same user re-submitting the identical registration.
CREATE UNIQUE INDEX IF NOT EXISTS uq_one_registration_per_user_per_id
  ON farmers_registrations (user_id, farmer_id)
  WHERE user_id IS NOT NULL;

-- 7) Supporting index for app-level abuse/rate-limit checks, e.g.
--    "how many registrations has this user submitted in the last 24h".
CREATE INDEX IF NOT EXISTS idx_farmers_registrations_user_created
  ON farmers_registrations (user_id, created_at);

-- ============================================================
-- NOT included here because they require an app-code change, not
-- just a schema change — see the chat response for the full list:
--   - Switching express-session off the default MemoryStore onto
--     a Postgres-backed store (connect-pg-simple), so sessions
--     survive redeploys.
--   - Deciding on ONE session mechanism instead of three
--     (express-session + JWT + the custom user_sessions table).
--   - Server-side recomputation of expected_yield_tons instead of
--     trusting the client-submitted figure.
--   - Server-side mirroring of the client-side validation regexes.
-- ============================================================
