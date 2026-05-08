-- ============================================================
-- Recruiter Portal Migration
-- Run this in the Supabase SQL editor
-- ============================================================

-- 1. Add account_type column to profiles
-- ============================================================
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS account_type text
    CHECK (account_type IN ('contractor', 'recruiter'))
    DEFAULT NULL;

-- Index for fast recruiter lookups
CREATE INDEX IF NOT EXISTS idx_profiles_account_type ON profiles(account_type);


-- 2. Add 'recruiter' to subscription_plan enum (if using enum type)
-- If subscription_plan is a plain text column this is not needed.
-- Uncomment if required:
-- ALTER TYPE subscription_plan_enum ADD VALUE IF NOT EXISTS 'recruiter';


-- 3. recruiter_saved_candidates
-- Recruiters shortlist/save candidate profiles
-- ============================================================
CREATE TABLE IF NOT EXISTS recruiter_saved_candidates (
  id            bigserial PRIMARY KEY,
  recruiter_id  uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  candidate_id  uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (recruiter_id, candidate_id)
);

ALTER TABLE recruiter_saved_candidates ENABLE ROW LEVEL SECURITY;

-- Recruiters can only manage their own saved candidates
CREATE POLICY "Recruiters manage own saved candidates"
  ON recruiter_saved_candidates
  FOR ALL
  USING (recruiter_id = auth.uid())
  WITH CHECK (recruiter_id = auth.uid());


-- 4. recruiter_cv_views
-- Track which recruiters have viewed which CVs (analytics, recruiter-side only)
-- ============================================================
CREATE TABLE IF NOT EXISTS recruiter_cv_views (
  id            bigserial PRIMARY KEY,
  recruiter_id  uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  candidate_id  uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  viewed_at     timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE recruiter_cv_views ENABLE ROW LEVEL SECURITY;

-- Recruiters can INSERT their own views; they can SELECT only their own
CREATE POLICY "Recruiters insert own cv views"
  ON recruiter_cv_views
  FOR INSERT
  WITH CHECK (recruiter_id = auth.uid());

CREATE POLICY "Recruiters read own cv views"
  ON recruiter_cv_views
  FOR SELECT
  USING (recruiter_id = auth.uid());


-- 5. recruiter_contracts
-- Contracts posted directly by recruiters
-- ============================================================
CREATE TABLE IF NOT EXISTS recruiter_contracts (
  id              bigserial PRIMARY KEY,
  recruiter_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title           text NOT NULL,
  company         text,
  location        text,
  description     text,
  pay_rate        text,
  employment_type text,
  work_type       text,
  ir35_status     text,
  status          text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed')),
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE recruiter_contracts ENABLE ROW LEVEL SECURITY;

-- Recruiters can fully manage their own contracts
CREATE POLICY "Recruiters manage own contracts"
  ON recruiter_contracts
  FOR ALL
  USING (recruiter_id = auth.uid())
  WITH CHECK (recruiter_id = auth.uid());

-- All authenticated users can read active contracts (they appear in the live feed)
CREATE POLICY "Anyone can read active recruiter contracts"
  ON recruiter_contracts
  FOR SELECT
  USING (status = 'active');


-- 6. Allow recruiters to read other profiles (for candidate search)
-- Note: profiles table should already have RLS enabled.
-- Recruiters need SELECT on profiles to search candidates.
-- ============================================================

-- Allow any authenticated user to read profiles that have a CV uploaded.
-- (Recruiters need this to browse candidates.)
-- Note: DROP the policy first if it already exists before recreating.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'profiles'
      AND policyname = 'Authenticated users can read profiles with CVs'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Authenticated users can read profiles with CVs"
        ON profiles
        FOR SELECT
        USING (
          auth.uid() IS NOT NULL
          AND cv_filename IS NOT NULL
        )
    $policy$;
  END IF;
END$$;

-- Recruiters can also read their own profile (should already exist, but included for completeness)
-- If you already have a "Users can read own profile" policy this won't conflict.


-- 7. Stripe: Add a new Stripe product & price for the Recruiter plan
-- ============================================================
-- Do this in the Stripe Dashboard:
--   Product: "IT ContractHub Recruiter"
--   Price: £175.00 / month (recurring)
--   Currency: GBP
--
-- Then copy the Price ID (price_...) and:
--   a) Set it as an env var in your Supabase Edge Function: STRIPE_RECRUITER_PRICE_ID
--   b) Update your create-checkout-session Edge Function to handle plan='recruiter'
--      and use this price ID
--
-- Example Edge Function update (create-checkout-session/index.ts):
--
--   const PRICE_IDS = {
--     pro:       Deno.env.get('STRIPE_PRO_PRICE_ID'),
--     recruiter: Deno.env.get('STRIPE_RECRUITER_PRICE_ID'),
--   }
--   const plan = req.body.plan ?? 'pro'
--   const priceId = PRICE_IDS[plan]
