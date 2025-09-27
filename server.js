// server.js
const express = require('express');
const path = require('path');

// Detect if running in Electron
const isElectron = process.versions && process.versions.electron;

// Set correct paths for Electron vs normal Node.js
// In packaged Electron apps, files are in normal directory structure relative to server.js
const publicPath = path.join(__dirname, 'public');

// For database, we need to handle both packaged and development scenarios
const DatabaseManager = require('./database/init');

const app = express();
const PORT = 3020;
const db = new DatabaseManager(); // Let it use the default path

// Store server instance for cleanup
let server = null;

// Middleware
app.use(express.json());
app.use(express.static(publicPath));

// Initialize database
db.initialize().catch(console.error);

// Serve main page
app.get('/', (req, res) => {
    res.sendFile(path.join(publicPath, 'index.html'));
});

// Character routes
app.get('/api/characters', async (req, res) => {
    try {
        const characters = await db.getCharacters();
        res.json(characters);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Character search route (for Phase 2)
app.get('/api/characters/search', async (req, res) => {
    try {
        const { q: query, limit = 10 } = req.query;
        
        if (!query || query.length < 3) {
            return res.json([]);
        }
        
        const characters = await db.searchCharacters(query, parseInt(limit));
        res.json(characters);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/characters', async (req, res) => {
    try {
        const { name } = req.body;
        if (!name || !name.trim()) {
            return res.status(400).json({ error: 'Character name is required' });
        }
        const character = await db.addCharacter(name.trim());
        res.status(201).json(character);
    } catch (error) {
        if (error.message.includes('UNIQUE constraint failed')) {
            res.status(409).json({ error: 'Character name already exists' });
        } else {
            res.status(500).json({ error: error.message });
        }
    }
});

app.delete('/api/characters/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const changes = await db.deleteCharacter(id);
        if (changes === 0) {
            return res.status(404).json({ error: 'Character not found' });
        }
        res.json({ message: 'Character deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Run routes - Updated for multi-party support
app.get('/api/runs', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;
        const party = req.query.party;
        
        const runs = await db.getRuns(limit, party);
        res.json(runs);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/runs', async (req, res) => {
    try {
        const { date, participantIds, success, notes, partyNumber } = req.body;
        
        if (!date || !participantIds || !Array.isArray(participantIds) || participantIds.length === 0) {
            return res.status(400).json({ 
                error: 'Date and participant IDs are required' 
            });
        }

        // Validate party number
        const party = parseInt(partyNumber) || 1;
        if (party < 1 || party > 3) {
            return res.status(400).json({ 
                error: 'Party number must be 1, 2, or 3' 
            });
        }

        const participantCount = participantIds.length;
        const run = await db.addRun(date, participantCount, success || true, participantIds, notes, party);
        res.status(201).json(run);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Drop routes
app.post('/api/drops', async (req, res) => {
    try {
        const { runId, characterId, itemId, quantity } = req.body;
        
        if (!runId || !characterId || !itemId) {
            return res.status(400).json({ 
                error: 'Run ID, character ID, and item ID are required' 
            });
        }

        const drop = await db.addDrop(runId, characterId, itemId, quantity || 1);
        res.status(201).json(drop);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Items routes
app.get('/api/items', async (req, res) => {
    try {
        const items = await db.getShadowguardItems();
        res.json(items);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Analytics routes - Updated for multi-party support
// CRITICAL FIX: Character stats endpoint should NEVER accept party parameter
// Character performance must aggregate across ALL parties
app.get('/api/analytics/character-stats', async (req, res) => {
    try {
        // NO party parameter - always get stats across all parties
        const stats = await db.getCharacterDropStats();
        res.json(stats);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/analytics/item-rates', async (req, res) => {
    try {
        const party = req.query.party;
        const rates = await db.getItemDropRates(party);
        res.json(rates);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/analytics/recent-activity', async (req, res) => {
    try {
        const party = req.query.party;
        const activity = await db.getRecentActivity(party);
        res.json(activity);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/analytics/overview', async (req, res) => {
    try {
        const party = req.query.party;
        const overview = await db.getOverallStats(party);
        res.json(overview);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Multi-party specific routes
app.get('/api/analytics/party-comparison', async (req, res) => {
    try {
        const partyStats = await db.getPartyComparison();
        res.json(partyStats);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/runs/party/:partyNumber', async (req, res) => {
    try {
        const { partyNumber } = req.params;
        const party = parseInt(partyNumber);
        
        if (party < 1 || party > 3) {
            return res.status(400).json({ error: 'Party number must be 1, 2, or 3' });
        }
        
        const limit = parseInt(req.query.limit) || 50;
        const runs = await db.getRuns(limit, party);
        res.json(runs);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Utility routes
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        version: '2.0.0', // Updated version for multi-party support
        platform: isElectron ? 'electron' : 'web'
    });
});

app.get('/api/stats/summary', async (req, res) => {
    try {
        const [overview, characterCount, runCount] = await Promise.all([
            db.getOverallStats(),
            db.getCharacters(),
            db.getRuns(1) // Just get count
        ]);
        
        res.json({
            totalCharacters: characterCount.length,
            totalRuns: overview.total_runs || 0,
            totalDrops: overview.total_drops || 0,
            lastUpdated: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err.stack);
    
    // Log additional context for debugging
    console.error('Request details:', {
        method: req.method,
        url: req.url,
        body: req.body,
        query: req.query,
        params: req.params
    });
    
    res.status(500).json({ 
        error: 'Something went wrong!',
        ...(process.env.NODE_ENV === 'development' && { details: err.message })
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ 
        error: 'Route not found',
        path: req.path,
        method: req.method
    });
});

// Graceful shutdown function
const gracefulShutdown = (signal) => {
    console.log(`\nReceived ${signal}. Shutting down gracefully...`);
    
    // Close server first
    if (server) {
        server.close((err) => {
            if (err) {
                console.error('Error closing server:', err);
            } else {
                console.log('Server closed successfully');
            }
            
            // Close database connection
            if (db) {
                db.close();
            }
            
            process.exit(0);
        });
    } else {
        // If no server instance, just close database and exit
        if (db) {
            db.close();
        }
        process.exit(0);
    }
};

// Signal handlers
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    gracefulShutdown('unhandledRejection');
});

// Function to start server (for Electron integration)
function startServer() {
    return new Promise((resolve, reject) => {
        server = app.listen(PORT, (err) => {
            if (err) {
                console.error('Failed to start server:', err);
                reject(err);
            } else {
                console.log(`Shadowguard Drop Tracker v2.0 running on http://localhost:${PORT}`);
                console.log('Multi-party support enabled');
                if (isElectron) {
                    console.log('Running in Electron mode');
                }
                console.log('Press Ctrl+C to stop server');
                resolve(server);
            }
        });
    });
}

// Function to stop server (for Electron integration)
function stopServer() {
    return new Promise((resolve) => {
        if (server) {
            server.close(() => {
                console.log('Server stopped');
                server = null;
                resolve();
            });
        } else {
            resolve();
        }
    });
}

// Auto-start if not in Electron (for standalone web use)
if (!isElectron) {
    startServer().catch(console.error);
}

// Export both app and server control functions
module.exports = {
    app,
    startServer,
    stopServer,
    getServer: () => server
};