// server.js
const express = require('express');
const path = require('path');
const DatabaseManager = require('./database/init');

const app = express();
const PORT = 3020;
const db = new DatabaseManager();

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Initialize database
db.initialize().catch(console.error);

// Serve main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
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

// Run routes
app.get('/api/runs', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;
        const runs = await db.getRuns(limit);
        res.json(runs);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/runs', async (req, res) => {
    try {
        const { date, participantIds, success, notes } = req.body;
        
        if (!date || !participantIds || !Array.isArray(participantIds) || participantIds.length === 0) {
            return res.status(400).json({ 
                error: 'Date and participant IDs are required' 
            });
        }

        const participantCount = participantIds.length;
        const run = await db.addRun(date, participantCount, success || true, participantIds, notes);
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

// Analytics routes
app.get('/api/analytics/character-stats', async (req, res) => {
    try {
        const stats = await db.getCharacterDropStats();
        res.json(stats);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/analytics/item-rates', async (req, res) => {
    try {
        const rates = await db.getItemDropRates();
        res.json(rates);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/analytics/recent-activity', async (req, res) => {
    try {
        const activity = await db.getRecentActivity();
        res.json(activity);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/analytics/overview', async (req, res) => {
    try {
        const overview = await db.getOverallStats();
        res.json(overview);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\nShutting down gracefully...');
    db.close();
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\nShutting down gracefully...');
    db.close();
    process.exit(0);
});

app.listen(PORT, () => {
    console.log(`Shadowguard Drop Tracker running on http://localhost:${PORT}`);
});

module.exports = app;