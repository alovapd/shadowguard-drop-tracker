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

    // Run API methods - Updated for multi-party support
    async getRuns(limit = 50, partyNumber = null) {
        let url = `${this.endpoints.runs}?limit=${limit}`;
        if (partyNumber !== null && partyNumber !== 'all') {
            url += `&party=${partyNumber}`;
        }
        return this.request(url);
    }

    async addRun(runData) {
        const { date, participantIds, success, notes, partyNumber } = runData;
        return this.request(this.endpoints.runs, {
            method: 'POST',
            body: JSON.stringify({
                date,
                participantIds,
                success: success === 'true' || success === true,
                notes,
                partyNumber: partyNumber || 1 // Default to Party 1 for backward compatibility
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

    // Analytics API methods - Updated for multi-party support
    async getOverviewStats(partyNumber = null) {
        let url = this.endpoints.analytics.overview;
        if (partyNumber !== null && partyNumber !== 'all') {
            url += `?party=${partyNumber}`;
        }
        return this.request(url);
    }

    // CRITICAL FIX: Character stats should NEVER be filtered by party
    // Character performance must aggregate across ALL parties
    async getCharacterStats() {
        // NO party parameter - always get stats across all parties
        return this.request(this.endpoints.analytics.characterStats);
    }

    async getItemDropRates(partyNumber = null) {
        let url = this.endpoints.analytics.itemRates;
        if (partyNumber !== null && partyNumber !== 'all') {
            url += `?party=${partyNumber}`;
        }
        return this.request(url);
    }

    async getRecentActivity(partyNumber = null) {
        let url = this.endpoints.analytics.recentActivity;
        if (partyNumber !== null && partyNumber !== 'all') {
            url += `?party=${partyNumber}`;
        }
        return this.request(url);
    }

    // Batch operations for efficiency - Updated for multi-party support
    async getAllAnalytics(partyNumber = null) {
        try {
            const [overview, characterStats, itemRates, recentActivity] = await Promise.all([
                this.getOverviewStats(partyNumber),
                this.getCharacterStats(), // NO party parameter - always get all parties
                this.getItemDropRates(partyNumber),
                this.getRecentActivity(partyNumber)
            ]);

            return {
                overview,
                characterStats,
                itemRates,
                recentActivity,
                partyNumber
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
                this.getRuns(50) // Get last 50 runs for initial load (all parties)
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

    // Multi-party specific methods
    async getRunsByParty(partyNumber, limit = 50) {
        return this.getRuns(limit, partyNumber);
    }

    async getPartyStats() {
        try {
            const [party1, party2, party3] = await Promise.all([
                this.getOverviewStats(1),
                this.getOverviewStats(2),
                this.getOverviewStats(3)
            ]);

            return {
                party1,
                party2,
                party3
            };
        } catch (error) {
            console.error('Failed to load party stats:', error);
            throw error;
        }
    }

    // Character search functionality (for Phase 2)
    async searchCharacters(query, limit = 10) {
        if (!query || query.length < 3) {
            return [];
        }
        
        const url = `${this.endpoints.characters}/search?q=${encodeURIComponent(query)}&limit=${limit}`;
        return this.request(url);
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
    // Remove existing notifications first
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(notification => {
        if (!notification.classList.contains('notification-container')) {
            notification.remove();
        }
    });

    // Create notification container if it doesn't exist
    let notificationContainer = document.getElementById('notificationContainer');
    if (!notificationContainer) {
        notificationContainer = document.createElement('div');
        notificationContainer.id = 'notificationContainer';
        notificationContainer.className = 'notification-container';
        document.body.appendChild(notificationContainer);
    }

    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    
    // Create notification content
    const messageSpan = document.createElement('span');
    messageSpan.className = 'notification-message';
    messageSpan.textContent = message;
    
    const closeButton = document.createElement('button');
    closeButton.className = 'notification-close';
    closeButton.innerHTML = '×';
    closeButton.onclick = () => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    };
    
    notification.appendChild(messageSpan);
    notification.appendChild(closeButton);
    notificationContainer.appendChild(notification);
    
    // Show notification with animation
    setTimeout(() => notification.classList.add('show'), 10);
    
    // Auto-hide after duration
    setTimeout(() => {
        if (notification.parentNode) {
            notification.classList.remove('show');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 300);
        }
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

// Validation helpers - Updated for multi-party support
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
    const { date, participantIds, partyNumber } = runData;
    
    if (!date) {
        throw new Error('Run date is required');
    }
    
    if (!participantIds || !Array.isArray(participantIds) || participantIds.length === 0) {
        throw new Error('At least one participant is required');
    }
    
    if (participantIds.length > 10) {
        throw new Error('Maximum of 10 participants allowed');
    }

    // Validate party number
    const party = parseInt(partyNumber) || 1;
    if (party < 1 || party > 3) {
        throw new Error('Party number must be 1, 2, or 3');
    }
    
    return {
        ...runData,
        partyNumber: party
    };
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

// Utility functions for formatting dates and times
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function formatDateTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });
}

function formatTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });
}

// Party-related utility functions
function getPartyDisplayName(partyNumber) {
    return `Party ${partyNumber}`;
}

function validatePartyNumber(partyNumber) {
    const party = parseInt(partyNumber);
    if (isNaN(party) || party < 1 || party > 3) {
        return 1; // Default to Party 1
    }
    return party;
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
window.formatDate = formatDate;
window.formatDateTime = formatDateTime;
window.formatTime = formatTime;
window.getPartyDisplayName = getPartyDisplayName;
window.validatePartyNumber = validatePartyNumber;