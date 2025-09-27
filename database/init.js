// database/init.js
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

class DatabaseManager {
    constructor(dbPath = './shadowguard.db') {
        this.dbPath = dbPath;
        this.db = null;
    }

    async initialize() {
        return new Promise((resolve, reject) => {
            this.db = new sqlite3.Database(this.dbPath, (err) => {
                if (err) {
                    reject(err);
                    return;
                }
                console.log('Connected to SQLite database');
                this.createTables().then(resolve).catch(reject);
            });
        });
    }

    async createTables() {
        const schemaPath = path.join(__dirname, 'schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');
        
        return new Promise((resolve, reject) => {
            this.db.exec(schema, (err) => {
                if (err) {
                    reject(err);
                    return;
                }
                console.log('Database schema created successfully');
                resolve();
            });
        });
    }

    // Character methods
    async addCharacter(name) {
        return new Promise((resolve, reject) => {
            const stmt = this.db.prepare('INSERT INTO characters (name) VALUES (?)');
            stmt.run([name], function(err) {
                if (err) {
                    stmt.finalize();
                    reject(err);
                    return;
                }
                
                const insertId = this.lastID;
                stmt.finalize();
                
                // Return character with current timestamp
                const now = new Date().toISOString();
                
                resolve({ 
                    id: insertId, 
                    name: name,
                    created_at: now
                });
                
            }.bind(this));
        });
    }

    async getCharacters() {
        return new Promise((resolve, reject) => {
            this.db.all('SELECT * FROM characters ORDER BY name', (err, rows) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(rows);
            });
        });
    }

    async searchCharacters(query, limit = 10) {
        return new Promise((resolve, reject) => {
            const searchQuery = `%${query}%`;
            this.db.all(`
                SELECT * FROM characters 
                WHERE name LIKE ? 
                ORDER BY 
                    CASE 
                        WHEN name LIKE ? THEN 1  -- Starts with query
                        WHEN name LIKE ? THEN 2  -- Contains query
                        ELSE 3                   -- Fuzzy match
                    END,
                    name
                LIMIT ?
            `, [searchQuery, `${query}%`, searchQuery, limit], (err, rows) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(rows);
            });
        });
    }

    async deleteCharacter(id) {
        return new Promise((resolve, reject) => {
            this.db.run('DELETE FROM characters WHERE id = ?', [id], function(err) {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(this.changes);
            });
        });
    }

    // Run methods - Updated for multi-party support
    async addRun(date, participantCount, success, participantIds, notes = null, partyNumber = 1) {
        return new Promise((resolve, reject) => {
            // Validate inputs
            if (!participantIds || !Array.isArray(participantIds)) {
                reject(new Error('participantIds must be an array'));
                return;
            }
            
            // Store database reference to avoid context issues
            const db = this.db;
            
            // Insert run first
            const runStmt = db.prepare('INSERT INTO runs (date, participant_count, success, notes, party_number) VALUES (?, ?, ?, ?, ?)');
            
            runStmt.run([date, participantCount, success, notes, partyNumber], function(err) {
                if (err) {
                    runStmt.finalize();
                    reject(err);
                    return;
                }
                
                const runId = this.lastID;
                runStmt.finalize();
                
                if (!runId) {
                    reject(new Error('Failed to get valid run ID'));
                    return;
                }
                
                // If no participants, resolve immediately
                if (participantIds.length === 0) {
                    resolve({ id: runId, date, participantCount, success, partyNumber });
                    return;
                }
                
                // Insert participants
                const participantStmt = db.prepare('INSERT INTO run_participants (run_id, character_id) VALUES (?, ?)');
                
                let completed = 0;
                let hasError = false;
                
                participantIds.forEach((characterId) => {
                    if (hasError) return;
                    
                    participantStmt.run([runId, characterId], (err) => {
                        if (err && !hasError) {
                            hasError = true;
                            participantStmt.finalize();
                            reject(err);
                            return;
                        }
                        
                        completed++;
                        if (completed === participantIds.length && !hasError) {
                            participantStmt.finalize();
                            resolve({ id: runId, date, participantCount, success, partyNumber });
                        }
                    });
                });
            });
        });
    }

    async getRuns(limit = 50, partyNumber = null) {
        return new Promise((resolve, reject) => {
            let query = `
                SELECT r.*, 
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
            `;
            
            const params = [];
            
            if (partyNumber && partyNumber !== 'all') {
                query += ' WHERE r.party_number = ?';
                params.push(parseInt(partyNumber));
            }
            
            query += `
                GROUP BY r.id
                ORDER BY r.date DESC, r.created_at DESC
                LIMIT ?
            `;
            params.push(limit);
            
            this.db.all(query, params, (err, rows) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(rows);
            });
        });
    }

    // Drop methods
    async addDrop(runId, characterId, itemId, quantity = 1) {
        return new Promise((resolve, reject) => {
            const stmt = this.db.prepare('INSERT INTO drops (run_id, character_id, item_id, quantity) VALUES (?, ?, ?, ?)');
            stmt.run([runId, characterId, itemId, quantity], function(err) {
                if (err) {
                    reject(err);
                    return;
                }
                resolve({ id: this.lastID, runId, characterId, itemId, quantity });
            });
            stmt.finalize();
        });
    }

    async getShadowguardItems() {
        return new Promise((resolve, reject) => {
            this.db.all('SELECT * FROM shadowguard_items ORDER BY name', (err, rows) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(rows);
            });
        });
    }

    // Analytics methods - FIXED: Proper aggregation without Cartesian products
    async getCharacterDropStats() {
        return new Promise((resolve, reject) => {
            const query = `
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
                GROUP BY c.id, c.name 
                ORDER BY total_drops DESC
            `;
            
            // NO party filtering - always get stats across ALL parties
            this.db.all(query, [], (err, rows) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(rows);
            });
        });
    }

    async getItemDropRates(partyNumber = null) {
        return new Promise((resolve, reject) => {
            let query = `
                SELECT 
                    si.name as item_name,
                    si.id as item_id,
                    si.category,
                    COUNT(d.id) as total_drops,
                    COUNT(DISTINCT d.character_id) as characters_who_got_it,
                    COUNT(DISTINCT d.run_id) as runs_that_dropped_it,
                    (SELECT COUNT(DISTINCT id) FROM runs WHERE success = 1${partyNumber && partyNumber !== 'all' ? ' AND party_number = ?' : ''}) as total_successful_runs,
                    ROUND(
                        (COUNT(DISTINCT d.run_id) * 100.0) / 
                        NULLIF((SELECT COUNT(DISTINCT id) FROM runs WHERE success = 1${partyNumber && partyNumber !== 'all' ? ' AND party_number = ?' : ''}), 0), 
                        2
                    ) as drop_rate_percentage
                FROM shadowguard_items si
                LEFT JOIN drops d ON si.id = d.item_id
                LEFT JOIN runs r ON d.run_id = r.id AND r.success = 1
            `;
            
            const params = [];
            
            if (partyNumber && partyNumber !== 'all') {
                query += ' WHERE r.party_number = ?';
                params.push(parseInt(partyNumber));
                params.push(parseInt(partyNumber)); // For subquery
                params.push(parseInt(partyNumber)); // For second subquery
            }
            
            query += ' GROUP BY si.id, si.name ORDER BY drop_rate_percentage DESC';
            
            this.db.all(query, params, (err, rows) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(rows);
            });
        });
    }

    async getRecentActivity(partyNumber = null) {
        return new Promise((resolve, reject) => {
            let query = `
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
            `;
            
            const params = [];
            
            if (partyNumber && partyNumber !== 'all') {
                query += ' WHERE r.party_number = ?';
                params.push(parseInt(partyNumber));
            }
            
            query += `
                GROUP BY r.id
                ORDER BY r.date DESC, r.created_at DESC
                LIMIT 20
            `;
            
            this.db.all(query, params, (err, rows) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(rows);
            });
        });
    }

    // FIXED: Complete rewrite of getOverallStats with proper drop rate calculation
    async getOverallStats(partyNumber = null) {
        return new Promise((resolve, reject) => {
            // First get basic counts
            const queries = {
                characters: 'SELECT COUNT(*) as count FROM characters',
                runs: partyNumber && partyNumber !== 'all' 
                    ? 'SELECT COUNT(*) as count FROM runs WHERE party_number = ?' 
                    : 'SELECT COUNT(*) as count FROM runs',
                successful_runs: partyNumber && partyNumber !== 'all'
                    ? 'SELECT COUNT(*) as count FROM runs WHERE success = 1 AND party_number = ?'
                    : 'SELECT COUNT(*) as count FROM runs WHERE success = 1',
                drops: partyNumber && partyNumber !== 'all'
                    ? 'SELECT COUNT(*) as count FROM drops d WHERE d.run_id IN (SELECT id FROM runs WHERE success = 1 AND party_number = ?)'
                    : 'SELECT COUNT(*) as count FROM drops d WHERE d.run_id IN (SELECT id FROM runs WHERE success = 1)',
                avg_participants: partyNumber && partyNumber !== 'all'
                    ? 'SELECT AVG(participant_count) as avg FROM runs WHERE party_number = ?'
                    : 'SELECT AVG(participant_count) as avg FROM runs',
                // NEW: Calculate total character-run opportunities for proper drop rate
                total_opportunities: partyNumber && partyNumber !== 'all'
                    ? `SELECT SUM(r.participant_count) as total FROM runs r WHERE r.success = 1 AND r.party_number = ?`
                    : `SELECT SUM(r.participant_count) as total FROM runs r WHERE r.success = 1`
            };
            
            const params = partyNumber && partyNumber !== 'all' ? [parseInt(partyNumber)] : [];
            
            const results = {};
            let completed = 0;
            const totalQueries = Object.keys(queries).length;
            
            for (const [key, query] of Object.entries(queries)) {
                this.db.get(query, params, (err, row) => {
                    if (err) {
                        reject(err);
                        return;
                    }
                    
                    if (key === 'avg_participants') {
                        results[key] = Math.round((row.avg || 0) * 10) / 10; // Round to 1 decimal
                    } else if (key === 'total_opportunities') {
                        results[key] = row.total || 0;
                    } else {
                        results[key] = row.count || 0;
                    }
                    
                    completed++;
                    if (completed === totalQueries) {
                        // Calculate derived metrics
                        const dropsPerRun = results.successful_runs > 0 
                            ? Math.round((results.drops / results.successful_runs) * 100) / 100
                            : 0;
                        
                        // FIXED: Proper drop rate = drops / total character opportunities × 100
                        const dropRate = results.total_opportunities > 0
                            ? Math.round((results.drops / results.total_opportunities) * 10000) / 100 // Round to 2 decimals
                            : 0;
                        
                        resolve({
                            total_characters: results.characters,
                            total_runs: results.runs,
                            successful_runs: results.successful_runs,
                            total_drops: results.drops,
                            avg_participants: results.avg_participants,
                            drops_per_successful_run: dropsPerRun,
                            drop_rate_percentage: dropRate,
                            total_character_opportunities: results.total_opportunities
                        });
                    }
                });
            }
        });
    }

    // Multi-party specific methods
    async getPartyComparison() {
        return new Promise((resolve, reject) => {
            const query = `
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
                    MAX(r.date) as last_run_date
                FROM runs r
                LEFT JOIN run_participants rp ON r.id = rp.run_id
                LEFT JOIN drops d ON r.id = d.run_id AND r.success = 1
                WHERE r.party_number IN (1, 2, 3)
                GROUP BY r.party_number
                ORDER BY r.party_number
            `;
            
            this.db.all(query, [], (err, rows) => {
                if (err) {
                    reject(err);
                    return;
                }
                
                // Convert to object format expected by frontend
                const comparison = {};
                rows.forEach(row => {
                    comparison[`party${row.party_number}`] = row;
                });
                
                resolve(comparison);
            });
        });
    }

    async getPartyStats(partyNumber) {
        return new Promise((resolve, reject) => {
            const query = `
                SELECT 
                    COUNT(DISTINCT r.id) as total_runs,
                    COUNT(DISTINCT CASE WHEN r.success = 1 THEN r.id END) as successful_runs,
                    COUNT(d.id) as total_drops,
                    COUNT(DISTINCT rp.character_id) as unique_participants,
                    ROUND(AVG(r.participant_count), 1) as avg_participants,
                    MAX(r.date) as last_run_date,
                    MIN(r.date) as first_run_date
                FROM runs r
                LEFT JOIN run_participants rp ON r.id = rp.run_id
                LEFT JOIN drops d ON r.id = d.run_id AND r.success = 1
                WHERE r.party_number = ?
            `;
            
            this.db.get(query, [partyNumber], (err, row) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(row || {
                    total_runs: 0,
                    successful_runs: 0,
                    total_drops: 0,
                    unique_participants: 0,
                    avg_participants: 0,
                    last_run_date: null,
                    first_run_date: null
                });
            });
        });
    }

    // Database maintenance methods
    async validateDatabase() {
        return new Promise((resolve, reject) => {
            const checks = [
                'SELECT COUNT(*) as count FROM characters',
                'SELECT COUNT(*) as count FROM runs',
                'SELECT COUNT(*) as count FROM drops',
                'SELECT COUNT(*) as count FROM shadowguard_items',
                'SELECT COUNT(*) as count FROM run_participants'
            ];
            
            const results = {};
            let completed = 0;
            
            checks.forEach((check, index) => {
                this.db.get(check, (err, row) => {
                    if (err) {
                        reject(err);
                        return;
                    }
                    
                    const tableName = check.split(' FROM ')[1];
                    results[tableName] = row.count;
                    completed++;
                    
                    if (completed === checks.length) {
                        resolve(results);
                    }
                });
            });
        });
    }

    async getSchemaVersion() {
        return new Promise((resolve, reject) => {
            this.db.get("PRAGMA table_info(runs)", (err, rows) => {
                if (err) {
                    reject(err);
                    return;
                }
                
                // Check if party_number column exists
                this.db.all("PRAGMA table_info(runs)", (err, columns) => {
                    if (err) {
                        reject(err);
                        return;
                    }
                    
                    const hasPartyNumber = columns.some(col => col.name === 'party_number');
                    resolve({
                        hasMultiPartySupport: hasPartyNumber,
                        version: hasPartyNumber ? '2.0' : '1.0'
                    });
                });
            });
        });
    }

    close() {
        if (this.db) {
            this.db.close((err) => {
                if (err) {
                    console.error('Error closing database:', err);
                } else {
                    console.log('Database connection closed');
                }
            });
        }
    }
}

module.exports = DatabaseManager;