-- Cabo — PostgreSQL schema (Phase 10)
-- Run: psql $DATABASE_URL -f db/schema.sql

-- ── Extensions ────────────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Users ─────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username      TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS users_username_idx ON users (username);

-- ── Matches ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS matches (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_code    CHAR(6) NOT NULL,
  started_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at     TIMESTAMPTZ,
  winner_id    UUID REFERENCES users (id) ON DELETE SET NULL,
  rounds       INT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS matches_room_code_idx ON matches (room_code);
CREATE INDEX IF NOT EXISTS matches_started_at_idx ON matches (started_at DESC);

-- ── Match participants ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS match_players (
  match_id      UUID NOT NULL REFERENCES matches (id) ON DELETE CASCADE,
  player_id     UUID REFERENCES users (id) ON DELETE SET NULL,
  display_name  TEXT NOT NULL,
  final_score   INT,
  rank          SMALLINT,
  PRIMARY KEY (match_id, display_name)
);

CREATE INDEX IF NOT EXISTS match_players_player_idx ON match_players (player_id);

-- ── Event log (append-only audit trail) ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS match_events (
  id         BIGSERIAL PRIMARY KEY,
  match_id   UUID NOT NULL REFERENCES matches (id) ON DELETE CASCADE,
  round      SMALLINT NOT NULL DEFAULT 1,
  seq        INT NOT NULL,
  event_type TEXT NOT NULL,
  payload    JSONB,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS match_events_match_idx ON match_events (match_id, round, seq);
