-- ============================================================
-- CV Fit & CV Review Migration
-- Run in Supabase SQL editor
-- ============================================================

-- 1. CV fit score cache
-- Caches per user+contract so repeat visits are free (7-day TTL enforced in app)
CREATE TABLE IF NOT EXISTS cv_fit_cache (
  id            bigserial PRIMARY KEY,
  user_id       uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  contract_id   bigint NOT NULL,
  fit_score     int NOT NULL,
  summary       text NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, contract_id)
);

ALTER TABLE cv_fit_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own cv fit cache"
  ON cv_fit_cache FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());


-- 2. CV reviews
-- One review per user, replaced on each regeneration, deleted when CV is deleted
CREATE TABLE IF NOT EXISTS cv_reviews (
  id          bigserial PRIMARY KEY,
  user_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  review      jsonb NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

ALTER TABLE cv_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own cv review"
  ON cv_reviews FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
