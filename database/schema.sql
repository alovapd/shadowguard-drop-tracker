-- database/schema.sql
-- Shadowguard Drop Tracker Database Schema with Multi-Party Support

-- Characters table
CREATE TABLE IF NOT EXISTS characters (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Runs table (with party support)
CREATE TABLE IF NOT EXISTS runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date DATE NOT NULL,
    participant_count INTEGER NOT NULL,
    success BOOLEAN NOT NULL DEFAULT 1,
    notes TEXT,
    party_number INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Run participants (many-to-many relationship)
CREATE TABLE IF NOT EXISTS run_participants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    run_id INTEGER NOT NULL,
    character_id INTEGER NOT NULL,
    FOREIGN KEY (run_id) REFERENCES runs(id) ON DELETE CASCADE,
    FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE,
    UNIQUE(run_id, character_id)
);

-- Shadowguard items (predefined list)
CREATE TABLE IF NOT EXISTS shadowguard_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    category TEXT DEFAULT 'artifact'
);

-- Drops table
CREATE TABLE IF NOT EXISTS drops (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    run_id INTEGER NOT NULL,
    character_id INTEGER NOT NULL,
    item_id INTEGER NOT NULL,
    quantity INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (run_id) REFERENCES runs(id) ON DELETE CASCADE,
    FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE,
    FOREIGN KEY (item_id) REFERENCES shadowguard_items(id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_runs_party_date ON runs(party_number, date DESC);
CREATE INDEX IF NOT EXISTS idx_runs_date ON runs(date DESC);
CREATE INDEX IF NOT EXISTS idx_run_participants_run ON run_participants(run_id);
CREATE INDEX IF NOT EXISTS idx_run_participants_character ON run_participants(character_id);
CREATE INDEX IF NOT EXISTS idx_drops_run ON drops(run_id);
CREATE INDEX IF NOT EXISTS idx_drops_character ON drops(character_id);
CREATE INDEX IF NOT EXISTS idx_drops_item ON drops(item_id);

-- Insert predefined Shadowguard items
INSERT OR IGNORE INTO shadowguard_items (name, category) VALUES
('Anon''s Boots', 'artifact'),
('Anon''s Spellbook', 'artifact'),
('Balakat''s Shaman Staff', 'artifact'),
-- Enchantress' Cameo variants with slayer types
('Enchantress'' Cameo (Demon Slayer)', 'cameo'),
('Enchantress'' Cameo (Arachnid Slayer)', 'cameo'),
('Enchantress'' Cameo (Elemental Slayer)', 'cameo'),
('Enchantress'' Cameo (Repond Slayer)', 'cameo'),
('Enchantress'' Cameo (Undead Slayer)', 'cameo'),
('Enchantress'' Cameo (Reptile Slayer)', 'cameo'),
('Enchantress'' Cameo (Demon Slayer - Blessed)', 'cameo'),
('Enchantress'' Cameo (Arachnid Slayer - Blessed)', 'cameo'),
('Enchantress'' Cameo (Elemental Slayer - Blessed)', 'cameo'),
('Enchantress'' Cameo (Repond Slayer - Blessed)', 'cameo'),
('Enchantress'' Cameo (Undead Slayer - Blessed)', 'cameo'),
('Enchantress'' Cameo (Reptile Slayer - Blessed)', 'cameo'),
-- Other artifacts
('Grugor''s Shield', 'artifact'),
('Halawa''s Hunting Bow', 'artifact'),
('Hawkwind''s Robe', 'artifact'),
('Jumu''s Sacred Hide', 'artifact'),
('Juo''nar''s Grimoire', 'artifact'),
('Lerel''s Hunting Spear', 'artifact'),
('Minax''s Sandals', 'artifact'),
('Mocapotl''s Obsidian Sword', 'artifact'),
('Ozymandias'' Obi', 'artifact'),
('Shanty''s Waders', 'artifact'),
('Totem of the Tribe', 'artifact'),
('Wamap''s Bone Earrings', 'artifact'),
('Unstable Time Rift', 'special');

-- Multi-party compatible views for analytics
CREATE VIEW IF NOT EXISTS character_drop_stats AS
SELECT 
    c.name as character_name,
    c.id as character_id,
    COUNT(d.id) as total_drops,
    COUNT(DISTINCT CASE WHEN d.id IS NOT NULL THEN r.id END) as runs_with_drops,
    COUNT(DISTINCT rp.run_id) as total_runs_participated,
    MAX(r.date) as last_participation_date,
    GROUP_CONCAT(DISTINCT r.party_number) as parties_participated
FROM characters c
LEFT JOIN run_participants rp ON c.id = rp.character_id
LEFT JOIN runs r ON rp.run_id = r.id
LEFT JOIN drops d ON c.id = d.character_id AND d.run_id = r.id
GROUP BY c.id, c.name;

CREATE VIEW IF NOT EXISTS item_drop_rates AS
SELECT 
    si.name as item_name,
    si.id as item_id,
    si.category,
    COUNT(d.id) as total_drops,
    COUNT(DISTINCT d.character_id) as characters_who_got_it,
    COUNT(DISTINCT d.run_id) as runs_that_dropped_it,
    (SELECT COUNT(DISTINCT id) FROM runs WHERE success = 1) as total_successful_runs,
    ROUND(
        (COUNT(DISTINCT d.run_id) * 100.0) / 
        NULLIF((SELECT COUNT(DISTINCT id) FROM runs WHERE success = 1), 0), 
        2
    ) as drop_rate_percentage
FROM shadowguard_items si
LEFT JOIN drops d ON si.id = d.item_id
LEFT JOIN runs r ON d.run_id = r.id AND r.success = 1
GROUP BY si.id, si.name;

CREATE VIEW IF NOT EXISTS recent_activity AS
SELECT 
    r.date,
    r.participant_count,
    r.success,
    r.party_number,
    GROUP_CONCAT(c.name) as participants,
    COUNT(d.id) as total_drops,
    GROUP_CONCAT(
        CASE 
            WHEN d.id IS NOT NULL THEN si.name || ' (' || dc.name || ')'
            ELSE NULL
        END
    ) as drops_details
FROM runs r
LEFT JOIN run_participants rp ON r.id = rp.run_id
LEFT JOIN characters c ON rp.character_id = c.id
LEFT JOIN drops d ON r.id = d.run_id
LEFT JOIN shadowguard_items si ON d.item_id = si.id
LEFT JOIN characters dc ON d.character_id = dc.id
GROUP BY r.id
ORDER BY r.date DESC, r.created_at DESC
LIMIT 20;

-- Party-specific views for analytics
CREATE VIEW IF NOT EXISTS party_stats AS
SELECT 
    r.party_number,
    COUNT(DISTINCT r.id) as total_runs,
    COUNT(DISTINCT CASE WHEN r.success = 1 THEN r.id END) as successful_runs,
    COUNT(d.id) as total_drops,
    COUNT(DISTINCT rp.character_id) as unique_participants,
    ROUND(AVG(r.participant_count), 1) as avg_participants,
    ROUND(
        (COUNT(d.id) * 100.0) / 
        NULLIF(COUNT(DISTINCT r.id), 0), 
        2
    ) as drop_rate_percentage,
    MAX(r.date) as last_run_date,
    MIN(r.date) as first_run_date
FROM runs r
LEFT JOIN run_participants rp ON r.id = rp.run_id
LEFT JOIN drops d ON r.id = d.run_id AND r.success = 1
WHERE r.party_number IN (1, 2, 3)
GROUP BY r.party_number;

-- Character performance across parties
CREATE VIEW IF NOT EXISTS character_party_performance AS
SELECT 
    c.name as character_name,
    c.id as character_id,
    r.party_number,
    COUNT(DISTINCT rp.run_id) as runs_participated,
    COUNT(d.id) as drops_received,
    ROUND(
        (COUNT(d.id) * 100.0) / 
        NULLIF(COUNT(DISTINCT rp.run_id), 0), 
        2
    ) as drop_rate_percentage,
    MAX(r.date) as last_run_date
FROM characters c
LEFT JOIN run_participants rp ON c.id = rp.character_id
LEFT JOIN runs r ON rp.run_id = r.id
LEFT JOIN drops d ON c.id = d.character_id AND d.run_id = r.id
WHERE r.party_number IS NOT NULL
GROUP BY c.id, c.name, r.party_number;

-- Most active characters (for search prioritization)
CREATE VIEW IF NOT EXISTS character_activity AS
SELECT 
    c.id as character_id,
    c.name as character_name,
    COUNT(DISTINCT rp.run_id) as total_runs,
    COUNT(d.id) as total_drops,
    MAX(r.date) as last_activity,
    GROUP_CONCAT(DISTINCT r.party_number) as active_parties
FROM characters c
LEFT JOIN run_participants rp ON c.id = rp.character_id
LEFT JOIN runs r ON rp.run_id = r.id
LEFT JOIN drops d ON c.id = d.character_id AND d.run_id = r.id
GROUP BY c.id, c.name
ORDER BY last_activity DESC, total_runs DESC;