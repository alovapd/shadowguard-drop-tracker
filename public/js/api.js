// js/api.js - API Communication Layer
class ShadowguardAPI {
    constructor(baseURL = '') {
        this.baseURL = baseURL;
        this.endpoints = {
            characters: '/api/characters',
            runs: '/api/runs',
            drops: '/api/drops',
            items: '/api/items',
            analytics: {
                overview: '/api/analytics/overview',
                characterStats: '/api/analytics/character-stats',
                itemRates: '/api/analytics/item-rates',
                recentActivity: '/api/analytics/recent-activity'
            }
        };
    }

    // Generic request handler with error handling and loading states
    async request(url, options = {}) {
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
            },
            ...options
        };

        try {
            showLoading(true);
            
            const response = await fetch(this.baseURL + url, defaultOptions);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || `HTTP error! status: ${response.status}`);
            }

            return data;
        } catch (error) {
            console.error('API Request failed:', error);
            showNotification('error', error.message);
            throw error;
        } finally {
            showLoading(false);
        }
    }

    // Character API methods
    async getCharacters() {
        return this.request(this.endpoints.characters);
    }

    async addCharacter(name) {
        return this.request(this.endpoints.characters, {
            method: 'POST',
            body: JSON.stringify({ name })
        });
    }

    async deleteCharacter(id) {
        return this.request(`${this.endpoints.characters}/${id}`, {
            method: 'DELETE'
        });
    }

    // Run API methods
    async getRuns(limit = 50) {
        const url = `${this.endpoints.runs}?limit=${limit}`;
        return this.request(url);
    }

    async addRun(runData) {
        const { date, participantIds, success, notes } = runData;
        return this.request(this.endpoints.runs, {
            method: 'POST',
            body: JSON.stringify({
                date,
                participantIds,
                success: success === 'true' || success === true,
                notes
            })
        });
    }

    // Drop API methods
    async addDrop(dropData) {
        const { runId, characterId, itemId, quantity } = dropData;
        return this.request(this.endpoints.drops, {
            method: 'POST',
            body: JSON.stringify({
                runId: parseInt(runId),
                characterId: parseInt(characterId),
                itemId: parseInt(itemId),
                quantity: parseInt(quantity) || 1
            })
        });
    }

    // Items API methods
    async getShadowguardItems() {
        return this.request(this.endpoints.items);
    }

    // Analytics API methods
    async getOverviewStats() {
        return this.request(this.endpoints.analytics.overview);
    }

    async getCharacterStats() {
        return this.request(this.endpoints.analytics.characterStats);
    }

    async getItemDropRates() {
        return this.request(this.endpoints.analytics.itemRates);
    }

    async getRecentActivity() {
        return this.request(this.endpoints.analytics.recentActivity);
    }

    // Batch operations for efficiency
    async getAllAnalytics() {
        try {
            const [overview, characterStats, itemRates, recentActivity] = await Promise.all([
                this.getOverviewStats(),
                this.getCharacterStats(),
                this.getItemDropRates(),
                this.getRecentActivity()
            ]);

            return {
                overview,
                characterStats,
                itemRates,
                recentActivity
            };
        } catch (error) {
            console.error('Failed to load analytics:', error);
            throw error;
        }
    }

    async getInitialData() {
        try {
            const [characters, items, runs] = await Promise.all([
                this.getCharacters(),
                this.getShadowguardItems(),
                this.getRuns(20) // Get last 20 runs for initial load
            ]);

            return {
                characters,
                items,
                runs
            };
        } catch (error) {
            console.error('Failed to load initial data:', error);
            throw error;
        }
    }
}

// Global API instance
const api = new ShadowguardAPI();

// Utility functions for UI feedback
function showLoading(show = true) {
    const spinner = document.getElementById('loadingSpinner');
    if (spinner) {
        if (show) {
            spinner.classList.remove('hidden');
        } else {
            spinner.classList.add('hidden');
        }
    }
}

function showNotification(type = 'info', message = '', duration = 5000) {
    // Create notification element if it doesn't exist
    let notification = document.getElementById('notification');
    if (!notification) {
        notification = document.createElement('div');
        notification.id = 'notification';
        notification.className = 'notification hidden';
        document.body.appendChild(notification);
    }

    // Set notification content and type
    notification.textContent = message;
    notification.className = `notification notification-${type}`;
    
    // Show notification
    notification.classList.remove('hidden');
    
    // Auto-hide after duration
    setTimeout(() => {
        notification.classList.add('hidden');
    }, duration);
}

// Error boundary for async operations
async function withErrorHandler(asyncFn, errorMessage = 'Operation failed') {
    try {
        return await asyncFn();
    } catch (error) {
        console.error(errorMessage, error);
        showNotification('error', `${errorMessage}: ${error.message}`);
        throw error;
    }
}

// Validation helpers
function validateCharacterName(name) {
    if (!name || !name.trim()) {
        throw new Error('Character name is required');
    }
    
    if (name.trim().length > 50) {
        throw new Error('Character name must be 50 characters or less');
    }
    
    return name.trim();
}

function validateRunData(runData) {
    const { date, participantIds } = runData;
    
    if (!date) {
        throw new Error('Run date is required');
    }
    
    if (!participantIds || !Array.isArray(participantIds) || participantIds.length === 0) {
        throw new Error('At least one participant is required');
    }
    
    if (participantIds.length > 10) {
        throw new Error('Maximum of 10 participants allowed');
    }
    
    return runData;
}

function validateDropData(dropData) {
    const { runId, characterId, itemId, quantity } = dropData;
    
    if (!runId || !characterId || !itemId) {
        throw new Error('Run, character, and item are required');
    }
    
    const qty = parseInt(quantity) || 1;
    if (qty < 1 || qty > 10) {
        throw new Error('Quantity must be between 1 and 10');
    }
    
    return {
        ...dropData,
        quantity: qty
    };
}

// Export for use in other modules
window.ShadowguardAPI = ShadowguardAPI;
window.api = api;
window.showLoading = showLoading;
window.showNotification = showNotification;
window.withErrorHandler = withErrorHandler;
window.validateCharacterName = validateCharacterName;
window.validateRunData = validateRunData;
window.validateDropData = validateDropData;