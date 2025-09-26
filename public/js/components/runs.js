// js/components/runs.js - Run Management Component
class RunsComponent {
    constructor() {
        this.currentRunState = {
            participants: [],
            drops: {}
        };
        this.shadowguardItems = [];
    }

    async init() {
        try {
            // Load shadowguard items for dropdowns
            this.shadowguardItems = await api.getShadowguardItems();
            
            // Set up date/time to current
            this.setCurrentDateTime();
            
            // Set up event listeners
            this.setupEventListeners();
            
            console.log('Runs component initialized');
        } catch (error) {
            console.error('Failed to initialize runs component:', error);
        }
    }

    setupEventListeners() {
        // Auto-save date changes
        const dateInput = document.getElementById('runDateTime');
        if (dateInput) {
            dateInput.addEventListener('change', this.validateDateTime.bind(this));
        }
    }

    setCurrentDateTime() {
        const now = new Date();
        // Format for datetime-local input: YYYY-MM-DDTHH:MM
        const formatted = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
            .toISOString()
            .slice(0, 16);
        
        const dateInput = document.getElementById('runDateTime');
        if (dateInput) {
            dateInput.value = formatted;
        }
    }

    validateDateTime() {
        const dateInput = document.getElementById('runDateTime');
        if (!dateInput.value) {
            showNotification('warning', 'Please select a date and time for the run');
            this.setCurrentDateTime();
        }
    }

    async renderCharacterCards() {
        const container = document.getElementById('characterCardsGrid');
        if (!container) return;

        try {
            // Get characters with their drop rate stats for sorting
            const characters = await this.getCharactersWithStats();
            
            if (characters.length === 0) {
                container.innerHTML = `
                    <div class="no-characters-message">
                        <h4>No Characters Available</h4>
                        <p>Add some characters first in the Characters tab to start logging runs.</p>
                    </div>
                `;
                return;
            }

            // Initialize all characters as participants by default if none are selected
            if (this.currentRunState.participants.length === 0) {
                this.currentRunState.participants = characters.map(c => c.id);
            }

            // Sort characters by drop rate (desc) then alphabetical
            const sortedCharacters = this.sortCharactersByDropRate(characters);

            container.innerHTML = sortedCharacters.map(character => {
                const isSelected = this.currentRunState.participants.includes(character.id);
                const selectedDrop = this.currentRunState.drops[character.id] || '';
                
                return `
                    <div class="character-run-card ${isSelected ? 'selected' : ''}" 
                         data-character-id="${character.id}">
                        <div class="character-card-header">
                            <span class="character-name">${character.name}</span>
                            <div class="participant-toggle ${isSelected ? 'active' : ''}" 
                                 onclick="runsComponent.toggleParticipant(${character.id})">
                                ${isSelected ? '✓' : ''}
                            </div>
                        </div>
                        
                        <div class="character-stats-mini">
                            <span>Drop Rate: ${character.dropRate}%</span>
                            <span>Total Drops: ${character.totalDrops || 0}</span>
                            ${this.renderPerformanceIndicator(character)}
                        </div>
                        
                        <div class="drop-selection">
                            <select class="drop-select ${isSelected ? '' : 'disabled'}" 
                                    data-character-id="${character.id}"
                                    ${isSelected ? '' : 'disabled'}
                                    onchange="runsComponent.updateCharacterDrop(${character.id}, this.value)">
                                <option value="">No Drop</option>
                                ${this.shadowguardItems.map(item => 
                                    `<option value="${item.id}" ${selectedDrop == item.id ? 'selected' : ''}>
                                        ${item.name}
                                    </option>`
                                ).join('')}
                            </select>
                        </div>
                    </div>
                `;
            }).join('');

        } catch (error) {
            console.error('Failed to render character cards:', error);
            container.innerHTML = '<p class="error">Failed to load characters</p>';
        }
    }

    renderPerformanceIndicator(character) {
        // Only show performance indicators for characters with meaningful data
        if (character.totalRuns < 3) {
            return ''; // Don't show performance for characters with too few runs
        }

        const dropRate = character.dropRate;
        let performanceClass = '';
        let performanceLabel = '';

        if (dropRate >= 50) {
            performanceClass = 'excellent';
            performanceLabel = 'Excellent';
        } else if (dropRate >= 30) {
            performanceClass = 'good';
            performanceLabel = 'Good';
        } else if (dropRate >= 15) {
            performanceClass = 'average';
            performanceLabel = 'Average';
        } else if (dropRate >= 5) {
            performanceClass = 'improving';
            performanceLabel = 'Improving';
        } else if (character.totalRuns >= 10) {
            // Only show "Struggling" for characters with many runs but low performance
            performanceClass = 'struggling';
            performanceLabel = 'Struggling';
        } else {
            return ''; // Don't show performance for edge cases
        }

        return `<span class="performance-mini ${performanceClass}">${performanceLabel}</span>`;
    }

    async getCharactersWithStats() {
        try {
            const [characters, characterStats] = await Promise.all([
                api.getCharacters(),
                api.getCharacterStats()
            ]);

            // Merge character data with their stats
            return characters.map(character => {
                const stats = characterStats.find(s => s.character_id === character.id) || {};
                const dropRate = stats.total_runs_participated > 0 ? 
                    ((stats.total_drops || 0) / stats.total_runs_participated * 100).toFixed(1) : 0;
                
                return {
                    ...character,
                    totalDrops: stats.total_drops || 0,
                    totalRuns: stats.total_runs_participated || 0,
                    runsWithDrops: stats.runs_with_drops || 0,
                    dropRate: parseFloat(dropRate)
                };
            });
        } catch (error) {
            console.error('Failed to get character stats:', error);
            // Return just characters without stats if analytics fail
            const characters = await api.getCharacters();
            return characters.map(char => ({
                ...char,
                totalDrops: 0,
                totalRuns: 0,
                runsWithDrops: 0,
                dropRate: 0
            }));
        }
    }

    sortCharactersByDropRate(characters) {
        return characters.sort((a, b) => {
            // Primary sort: Drop rate (descending)
            if (b.dropRate !== a.dropRate) {
                return b.dropRate - a.dropRate;
            }
            // Secondary sort: Alphabetical by name
            return a.name.localeCompare(b.name);
        });
    }

    toggleParticipant(characterId) {
        const participantIndex = this.currentRunState.participants.indexOf(characterId);
        
        if (participantIndex === -1) {
            // Add participant
            this.currentRunState.participants.push(characterId);
        } else {
            // Remove participant and their drop
            this.currentRunState.participants.splice(participantIndex, 1);
            delete this.currentRunState.drops[characterId];
        }

        // Re-render to update UI
        this.renderCharacterCards();
    }

    updateCharacterDrop(characterId, itemId) {
        if (itemId && itemId !== '') {
            this.currentRunState.drops[characterId] = parseInt(itemId);
        } else {
            delete this.currentRunState.drops[characterId];
        }
    }

    async saveCurrentRun() {
        try {
            // Validate run data
            this.validateRunData();

            const runDateTime = document.getElementById('runDateTime').value;
            if (!runDateTime) {
                throw new Error('Run date and time are required');
            }

            // Prepare run data
            const runData = {
                date: runDateTime,
                participantIds: this.currentRunState.participants,
                success: true, // Always true since we're tracking drops directly
                notes: null
            };

            showLoading(true);

            // Create the run
            const run = await api.addRun(runData);
            
            // Add any drops that were recorded
            const dropPromises = [];
            for (const [characterId, itemId] of Object.entries(this.currentRunState.drops)) {
                if (itemId) {
                    dropPromises.push(
                        api.addDrop({
                            runId: run.id,
                            characterId: parseInt(characterId),
                            itemId: parseInt(itemId),
                            quantity: 1
                        })
                    );
                }
            }

            // Wait for all drops to be saved
            if (dropPromises.length > 0) {
                await Promise.all(dropPromises);
            }

            // Reset the form
            this.resetRunForm();

            // Refresh the runs list
            await this.loadRecentRuns();

            // Re-render character cards to update stats/sorting
            await this.renderCharacterCards();

            const dropCount = Object.keys(this.currentRunState.drops).length;
            showNotification('success', 
                `Run saved successfully! ${this.currentRunState.participants.length} participants, ${dropCount} drops recorded.`);

        } catch (error) {
            console.error('Failed to save run:', error);
            showNotification('error', `Failed to save run: ${error.message}`);
        } finally {
            showLoading(false);
        }
    }

    validateRunData() {
        const dateTime = document.getElementById('runDateTime').value;
        
        if (!dateTime) {
            throw new Error('Run date and time are required');
        }

        if (this.currentRunState.participants.length === 0) {
            throw new Error('At least one participant is required');
        }

        if (this.currentRunState.participants.length > 10) {
            throw new Error('Maximum of 10 participants allowed');
        }

        // Check if date is not in the future (allow some tolerance for timezone issues)
        const runDate = new Date(dateTime);
        const now = new Date();
        const maxFutureTime = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour tolerance

        if (runDate > maxFutureTime) {
            throw new Error('Run date cannot be in the future');
        }
    }

    resetRunForm() {
        // Reset drops but keep participants selected by default
        this.currentRunState.drops = {};
        
        // Keep all characters selected for next run
        // (Don't reset participants - this makes logging consecutive runs faster)

        // Reset date to current
        this.setCurrentDateTime();

        // Re-render character cards
        this.renderCharacterCards();
    }

    async loadRecentRuns() {
        try {
            const runs = await api.getRuns(20);
            this.renderRunsList(runs);
        } catch (error) {
            console.error('Failed to load recent runs:', error);
            const container = document.getElementById('runsList');
            if (container) {
                container.innerHTML = '<p class="error">Failed to load runs</p>';
            }
        }
    }

    renderRunsList(runs) {
        const container = document.getElementById('runsList');
        if (!container) return;

        if (runs.length === 0) {
            container.innerHTML = `
                <div class="run-card">
                    <div class="run-header">
                        <div class="run-date">No Runs Yet</div>
                    </div>
                    <div class="run-details">Log your first Shadowguard encounter above</div>
                </div>
            `;
            return;
        }

        container.innerHTML = runs.map(run => {
            const runDate = new Date(run.date);
            const hasDrops = run.total_drops > 0;
            
            return `
                <div class="run-card ${hasDrops ? 'has-drops' : 'no-drops'}">
                    <div class="run-header">
                        <div class="run-date">${formatDateTime(run.date)}</div>
                        <div class="run-badges">
                            <span class="run-badge participants">${run.participant_count} participants</span>
                            ${hasDrops ? 
                                `<span class="run-badge drops">${run.total_drops} drops</span>` : 
                                `<span class="run-badge no-drops">No drops</span>`
                            }
                        </div>
                    </div>
                    <div class="run-details">
                        <div class="run-participants">
                            <strong>Participants:</strong> ${run.participants || 'None recorded'}
                        </div>
                        ${run.drops_details ? 
                            `<div class="run-drops-details">
                                <strong>Drops:</strong> ${run.drops_details}
                            </div>` : ''
                        }
                    </div>
                </div>
            `;
        }).join('');
    }

    async refreshRuns() {
        await this.loadRecentRuns();
        showNotification('success', 'Runs list refreshed');
    }
}

// Global instance
const runsComponent = new RunsComponent();

// Global functions for HTML onclick handlers
function saveCurrentRun() {
    runsComponent.saveCurrentRun();
}

function refreshRuns() {
    runsComponent.refreshRuns();
}

// Export for use in other modules
window.runsComponent = runsComponent;