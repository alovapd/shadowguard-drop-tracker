-- database/schema.sql
-- Shadowguard Drop Tracker Database Schema

-- Characters table
CREATE TABLE IF NOT EXISTS characters (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Runs table
CREATE TABLE IF NOT EXISTS runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date DATE NOT NULL,
    participant_count INTEGER NOT NULL,
    success BOOLEAN NOT NULL DEFAULT 1,
    notes TEXT,
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

-- Useful views for analytics
CREATE VIEW IF NOT EXISTS character_drop_stats AS
SELECT 
    c.name as character_name,
    c.id as character_id,
    COUNT(d.id) as total_drops,
    COUNT(DISTINCT d.run_id) as runs_with_drops,
    COUNT(DISTINCT rp.run_id) as total_runs_participated
FROM characters c
LEFT JOIN run_participants rp ON c.id = rp.character_id
LEFT JOIN drops d ON c.id = d.character_id
GROUP BY c.id, c.name;

CREATE VIEW IF NOT EXISTS item_drop_rates AS
SELECT 
    si.name as item_name,
    si.id as item_id,
    COUNT(d.id) as total_drops,
    COUNT(DISTINCT d.character_id) as characters_who_got_it,
    COUNT(DISTINCT d.run_id) as runs_that_dropped_it,
    (SELECT COUNT(*) FROM runs WHERE success = 1) as total_successful_runs,
    ROUND(
        (COUNT(DISTINCT d.run_id) * 100.0) / 
        NULLIF((SELECT COUNT(*) FROM runs WHERE success = 1), 0), 
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
    GROUP_CONCAT(c.name) as participants,
    COUNT(d.id) as total_drops,
    GROUP_CONCAT(si.name || ' (' || dc.name || ')') as drops_details
FROM runs r
LEFT JOIN run_participants rp ON r.id = rp.run_id
LEFT JOIN characters c ON rp.character_id = c.id
LEFT JOIN drops d ON r.id = d.run_id
LEFT JOIN shadowguard_items si ON d.item_id = si.id
LEFT JOIN characters dc ON d.character_id = dc.id
GROUP BY r.id
ORDER BY r.date DESC
LIMIT 20;