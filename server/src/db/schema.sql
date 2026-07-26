-- Outwitters PostgreSQL Database Schema

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(32) UNIQUE NOT NULL,
    display_name VARCHAR(64) NOT NULL,
    elo_rating INTEGER DEFAULT 1200 NOT NULL,
    pog_elo_rating INTEGER DEFAULT 1200 NOT NULL,
    discord_id VARCHAR(64) UNIQUE,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Matches
CREATE TABLE IF NOT EXISTS matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player1_id UUID REFERENCES users(id) ON DELETE RESTRICT NOT NULL,
    player2_id UUID REFERENCES users(id) ON DELETE RESTRICT NOT NULL,
    map_id VARCHAR(64) NOT NULL,
    is_custom_map BOOLEAN DEFAULT FALSE NOT NULL,
    is_ranked BOOLEAN DEFAULT TRUE NOT NULL,
    pog_nerfs BOOLEAN DEFAULT FALSE NOT NULL,
    p1_race VARCHAR(32) NOT NULL,
    p2_race VARCHAR(32) NOT NULL,
    p1_color VARCHAR(16) DEFAULT 'blue' NOT NULL,
    p2_color VARCHAR(16) DEFAULT 'red' NOT NULL,
    side_swap BOOLEAN DEFAULT FALSE NOT NULL,
    status VARCHAR(16) DEFAULT 'active' NOT NULL, -- 'active', 'completed', 'abandoned', 'draw'
    winner_id UUID REFERENCES users(id),
    current_turn_number INTEGER DEFAULT 1 NOT NULL,
    current_player VARCHAR(2) DEFAULT 'P1' NOT NULL, -- 'P1' or 'P2'
    game_state JSONB NOT NULL,                       -- Authoritative full state
    turn_deadline TIMESTAMPTZ,                       -- Optional deadline for turn
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Index active matches per player for fast count & lookup (Max 300 active match enforcement)
CREATE INDEX IF NOT EXISTS idx_matches_p1_status ON matches (player1_id, status);
CREATE INDEX IF NOT EXISTS idx_matches_p2_status ON matches (player2_id, status);

-- Turn Log / History (for replay and auditing)
CREATE TABLE IF NOT EXISTS turn_logs (
    id SERIAL PRIMARY KEY,
    match_id UUID REFERENCES matches(id) ON DELETE CASCADE NOT NULL,
    turn_number INTEGER NOT NULL,
    player VARCHAR(2) NOT NULL,
    actions JSONB NOT NULL,               -- Array of GameAction
    state_before JSONB NOT NULL,
    state_after JSONB NOT NULL,
    submitted_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(match_id, turn_number)
);

-- Matchmaking Queue
CREATE TABLE IF NOT EXISTS matchmaking_queue (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE PRIMARY KEY,
    preferred_map VARCHAR(64),
    preferred_race VARCHAR(32) NOT NULL,
    pog_mode BOOLEAN DEFAULT FALSE NOT NULL,
    elo_rating INTEGER NOT NULL,
    queued_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
