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
                    reject(err);
                    return;
                }
                resolve({ id: this.lastID, name });
            });
            stmt.finalize();
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

    // Run methods
    async addRun(date, participantCount, success, participantIds, notes = null) {
        return new Promise((resolve, reject) => {
            this.db.serialize(() => {
                this.db.run('BEGIN TRANSACTION');
                
                // Insert run
                const runStmt = this.db.prepare('INSERT INTO runs (date, participant_count, success, notes) VALUES (?, ?, ?, ?)');
                runStmt.run([date, participantCount, success, notes], function(err) {
                    if (err) {
                        reject(err);
                        return;
                    }
                    
                    const runId = this.lastID;
                    
                    // Insert participants
                    const participantStmt = db.prepare('INSERT INTO run_participants (run_id, character_id) VALUES (?, ?)');
                    
                    let completed = 0;
                    participantIds.forEach(characterId => {
                        participantStmt.run([runId, characterId], (err) => {
                            if (err) {
                                reject(err);
                                return;
                            }
                            completed++;
                            if (completed === participantIds.length) {
                                participantStmt.finalize();
                                db.run('COMMIT');
                                resolve({ id: runId, date, participantCount, success });
                            }
                        });
                    });
                });
                runStmt.finalize();
            });
        });
    }

    async getRuns(limit = 50) {
        return new Promise((resolve, reject) => {
            this.db.all(`
                SELECT r.*, 
                       GROUP_CONCAT(c.name) as participants,
                       COUNT(d.id) as total_drops
                FROM runs r
                LEFT JOIN run_participants rp ON r.id = rp.run_id
                LEFT JOIN characters c ON rp.character_id = c.id
                LEFT JOIN drops d ON r.id = d.run_id
                GROUP BY r.id
                ORDER BY r.date DESC, r.created_at DESC
                LIMIT ?
            `, [limit], (err, rows) => {
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

    // Analytics methods
    async getCharacterDropStats() {
        return new Promise((resolve, reject) => {
            this.db.all('SELECT * FROM character_drop_stats ORDER BY total_drops DESC', (err, rows) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(rows);
            });
        });
    }

    async getItemDropRates() {
        return new Promise((resolve, reject) => {
            this.db.all('SELECT * FROM item_drop_rates ORDER BY drop_rate_percentage DESC', (err, rows) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(rows);
            });
        });
    }

    async getRecentActivity() {
        return new Promise((resolve, reject) => {
            this.db.all('SELECT * FROM recent_activity', (err, rows) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(rows);
            });
        });
    }

    async getOverallStats() {
        return new Promise((resolve, reject) => {
            this.db.get(`
                SELECT 
                    COUNT(DISTINCT c.id) as total_characters,
                    COUNT(DISTINCT r.id) as total_runs,
                    COUNT(DISTINCT CASE WHEN r.success = 1 THEN r.id END) as successful_runs,
                    COUNT(d.id) as total_drops,
                    ROUND(AVG(r.participant_count), 1) as avg_participants,
                    ROUND(
                        (COUNT(d.id) * 1.0) / 
                        NULLIF(COUNT(DISTINCT CASE WHEN r.success = 1 THEN r.id END), 0), 
                        2
                    ) as drops_per_successful_run
                FROM characters c
                CROSS JOIN runs r
                LEFT JOIN drops d ON r.id = d.run_id AND r.success = 1
            `, (err, row) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(row);
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