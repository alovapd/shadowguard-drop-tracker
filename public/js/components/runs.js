// js/components/runs.js - Multi-Party Run Management Component with Card-Filtering Search
class RunsComponent {
    constructor() {
        // Multi-party state management
        this.parties = {
            1: { participants: [], drops: {}, lastSaved: null },
            2: { participants: [], drops: {}, lastSaved: null },
            3: { participants: [], drops: {}, lastSaved: null }
        };
        this.currentParty = 1;
        this.shadowguardItems = [];
        this.allRuns = []; // Store all runs for filtering
        this.charactersWithStats = []; // Cache for performance
        this.currentSearchQuery = ''; // Track current search
    }

    async init() {
        try {
            // Load shadowguard items for dropdowns
            this.shadowguardItems = await api.getShadowguardItems();
            
            // Set up date/time to current
            this.setCurrentDateTime();
            
            // Set up event listeners
            this.setupEventListeners();
            
            // Initialize character search component
            await this.initializeCharacterSearch();
            
            console.log('Multi-party Runs component initialized');
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

    // Initialize character search for participant selection - CARD FILTERING VERSION
    async initializeCharacterSearch() {
        const searchContainer = document.getElementById('participantSearchContainer');
        if (!searchContainer) return;

        // Create simple search input HTML (NO dropdown results container)
        searchContainer.innerHTML = `
            <div class="character-search-container">
                <div class="character-search-input-container">
                    <input 
                        type="text" 
                        id="participantSearchInput" 
                        class="character-search-input" 
                        placeholder="Search characters to filter cards..."
                        autocomplete="off"
                    >
                    <span class="search-icon">🔍</span>
                    <button class="search-clear hidden" id="participantSearchClear">×</button>
                </div>
            </div>
        `;

        // Initialize search functionality
        this.setupParticipantSearch();
    }

    setupParticipantSearch() {
        const searchInput = document.getElementById('participantSearchInput');
        const searchClear = document.getElementById('participantSearchClear');
        
        if (!searchInput || !searchClear) return;

        let searchTimeout;

        // Search input event - filter character cards directly
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.trim();
            this.currentSearchQuery = query;
            
            // Show/hide clear button
            if (query.length > 0) {
                searchClear.classList.remove('hidden');
            } else {
                searchClear.classList.add('hidden');
            }

            // Debounce search and re-render cards with filter
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                this.renderCharacterCards(query);
            }, 200);
        });

        // Clear search
        searchClear.addEventListener('click', () => {
            searchInput.value = '';
            this.currentSearchQuery = '';
            searchClear.classList.add('hidden');
            this.renderCharacterCards(); // Re-render without filter
            searchInput.focus();
        });
    }

    // Filter characters based on search query
    filterCharactersBySearch(characters, searchQuery) {
        if (!searchQuery || searchQuery.length === 0) {
            return characters; // Return all characters if no search query
        }

        const lowerQuery = searchQuery.toLowerCase();
        
        return characters
            .filter(character => 
                character.name.toLowerCase().includes(lowerQuery)
            )
            .sort((a, b) => {
                // Prioritize exact matches and starts-with matches
                const aName = a.name.toLowerCase();
                const bName = b.name.toLowerCase();
                
                const aStartsWith = aName.startsWith(lowerQuery);
                const bStartsWith = bName.startsWith(lowerQuery);
                
                if (aStartsWith && !bStartsWith) return -1;
                if (bStartsWith && !aStartsWith) return 1;
                
                // Then by recent activity (same as original sorting)
                const aLastActivity = new Date(a.lastActivityDate || 0);
                const bLastActivity = new Date(b.lastActivityDate || 0);
                
                return bLastActivity - aLastActivity;
            });
    }

    clearParticipantSearch() {
        const searchInput = document.getElementById('participantSearchInput');
        const searchClear = document.getElementById('participantSearchClear');
        
        if (searchInput) searchInput.value = '';
        if (searchClear) searchClear.classList.add('hidden');
        this.currentSearchQuery = '';
    }

    // Party Management
    async initializePartyTabs() {
        // Update party tab indicators
        this.updatePartyTabIndicators();
        
        // Update current party display
        this.updateCurrentPartyDisplay();
        
        // Set active party tab
        this.setActivePartyTab(this.currentParty);
    }

    switchParty(partyNumber) {
        if (partyNumber < 1 || partyNumber > 3) return;
        if (partyNumber === this.currentParty) return;

        console.log(`Switching from Party ${this.currentParty} to Party ${partyNumber}`);
        
        this.currentParty = partyNumber;
        
        // Update UI
        this.setActivePartyTab(partyNumber);
        this.updateCurrentPartyDisplay();
        this.updatePartyTabIndicators();
        
        // Keep search but re-render cards for new party context
        this.renderCharacterCards(this.currentSearchQuery);
        
        // Update run history filter if needed
        const historyFilter = document.getElementById('historyPartyFilter');
        if (historyFilter && historyFilter.value === 'all') {
            // Keep showing all parties, but could auto-switch to current party
        }
    }

    setActivePartyTab(partyNumber) {
        // Remove active class from all tabs
        document.querySelectorAll('.party-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        
        // Add active class to selected tab
        const activeTab = document.querySelector(`[data-party="${partyNumber}"]`);
        if (activeTab) {
            activeTab.classList.add('active');
        }
    }

    updateCurrentPartyDisplay() {
        const display = document.getElementById('currentPartyDisplay');
        if (display) {
            display.textContent = `Party ${this.currentParty}`;
        }
        
        this.updateParticipantCount();
    }

    updateParticipantCount() {
        const count = this.getCurrentPartyState().participants.length;
        const countDisplay = document.getElementById('partyParticipantCount');
        if (countDisplay) {
            countDisplay.textContent = `${count} participant${count !== 1 ? 's' : ''}`;
        }
    }

    updatePartyTabIndicators() {
        for (let partyNum = 1; partyNum <= 3; partyNum++) {
            const indicator = document.getElementById(`partyIndicator${partyNum}`);
            const party = this.parties[partyNum];
            
            if (indicator) {
                const participantCount = party.participants.length;
                const dropCount = Object.keys(party.drops).length;
                
                if (participantCount === 0) {
                    indicator.textContent = '';
                    indicator.className = 'party-tab-indicator';
                } else {
                    indicator.textContent = `${participantCount}${dropCount > 0 ? ` (${dropCount} drops)` : ''}`;
                    indicator.className = `party-tab-indicator ${dropCount > 0 ? 'has-drops' : 'has-participants'}`;
                }
            }
        }
    }

    getCurrentPartyState() {
        return this.parties[this.currentParty];
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

    async renderCharacterCards(searchQuery = '') {
        const container = document.getElementById('characterCardsGrid');
        if (!container) return;

        try {
            // Get characters with their drop rate stats for sorting
            this.charactersWithStats = await this.getCharactersWithStats();
            
            if (this.charactersWithStats.length === 0) {
                container.innerHTML = `
                    <div class="no-characters-message">
                        <h4>No Characters Available</h4>
                        <p>Add some characters first in the Characters tab to start logging runs.</p>
                    </div>
                `;
                return;
            }

            const currentPartyState = this.getCurrentPartyState();
            
            // Sort characters by activity (most recent participation first), then by drop rate
            let sortedCharacters = this.sortCharactersByActivity(this.charactersWithStats);
            
            // Apply search filter if provided
            if (searchQuery && searchQuery.trim().length > 0) {
                sortedCharacters = this.filterCharactersBySearch(sortedCharacters, searchQuery.trim());
                
                // Show message if no characters match search
                if (sortedCharacters.length === 0) {
                    container.innerHTML = `
                        <div class="no-characters-message">
                            <h4>No Characters Found</h4>
                            <p>No characters match "${searchQuery}". Try a different search term.</p>
                        </div>
                    `;
                    return;
                }
            }

            container.innerHTML = sortedCharacters.map(character => {
                const isSelected = currentPartyState.participants.includes(character.id);
                const selectedDrop = currentPartyState.drops[character.id] || '';
                const inOtherParty = this.isCharacterInOtherParty(character.id);
                
                return `
                    <div class="character-run-card ${isSelected ? 'selected' : ''} ${inOtherParty ? 'unavailable' : ''}" 
                         data-character-id="${character.id}"
                         onclick="${inOtherParty ? '' : `runsComponent.toggleParticipant(${character.id})`}"
                         style="${inOtherParty ? '' : 'cursor: pointer;'}">
                        ${inOtherParty ? `<div class="party-indicator">In Party ${inOtherParty}</div>` : ''}
                        
                        <div class="character-card-header">
                            <span class="character-name">${character.name}</span>
                            <div class="participant-toggle ${isSelected ? 'active' : ''} ${inOtherParty ? 'disabled' : ''}" 
                                 style="pointer-events: none;">
                                ${isSelected ? '✓' : ''}
                            </div>
                        </div>
                        
                        <div class="character-stats-mini">
                            <span>Drop Rate: ${character.dropRate}%</span>
                            <span>Total Drops: ${character.totalDrops || 0}</span>
                            ${this.renderPerformanceIndicator(character)}
                        </div>
                        
                        <div class="drop-selection" onclick="event.stopPropagation();">
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

            this.updateParticipantCount();

        } catch (error) {
            console.error('Failed to render character cards:', error);
            container.innerHTML = '<p class="error">Failed to load characters</p>';
        }
    }

    // Check if character is in a different party
    isCharacterInOtherParty(characterId) {
        for (let partyNum = 1; partyNum <= 3; partyNum++) {
            if (partyNum !== this.currentParty && this.parties[partyNum].participants.includes(characterId)) {
                return partyNum;
            }
        }
        return false;
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
                    dropRate: parseFloat(dropRate),
                    lastActivityDate: stats.last_participation_date || character.created_at
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
                dropRate: 0,
                lastActivityDate: char.created_at
            }));
        }
    }

    sortCharactersByActivity(characters) {
        return characters.sort((a, b) => {
            // Primary sort: Most recently active characters first
            const aLastActivity = new Date(a.lastActivityDate || 0);
            const bLastActivity = new Date(b.lastActivityDate || 0);
            
            if (bLastActivity.getTime() !== aLastActivity.getTime()) {
                return bLastActivity - aLastActivity;
            }
            
            // Secondary sort: Higher drop rate
            if (b.dropRate !== a.dropRate) {
                return b.dropRate - a.dropRate;
            }
            
            // Tertiary sort: Alphabetical by name
            return a.name.localeCompare(b.name);
        });
    }

    toggleParticipant(characterId) {
        // Check if character is in another party
        const inOtherParty = this.isCharacterInOtherParty(characterId);
        if (inOtherParty) {
            showNotification('warning', `Character is already assigned to Party ${inOtherParty}`);
            return;
        }

        const currentPartyState = this.getCurrentPartyState();
        const participantIndex = currentPartyState.participants.indexOf(characterId);
        
        if (participantIndex === -1) {
            // Add participant
            if (currentPartyState.participants.length >= 10) {
                showNotification('warning', 'Maximum 10 participants allowed per party');
                return;
            }
            currentPartyState.participants.push(characterId);
        } else {
            // Remove participant and their drop
            currentPartyState.participants.splice(participantIndex, 1);
            delete currentPartyState.drops[characterId];
        }

        // Update indicators and re-render with current search
        this.updatePartyTabIndicators();
        this.renderCharacterCards(this.currentSearchQuery);
    }

    updateCharacterDrop(characterId, itemId) {
        const currentPartyState = this.getCurrentPartyState();
        
        if (itemId && itemId !== '') {
            currentPartyState.drops[characterId] = parseInt(itemId);
        } else {
            delete currentPartyState.drops[characterId];
        }
        
        this.updatePartyTabIndicators();
    }

    async saveCurrentRun() {
        try {
            // Validate run data
            this.validateCurrentPartyRunData();

            const runDateTime = document.getElementById('runDateTime').value;
            if (!runDateTime) {
                throw new Error('Run date and time are required');
            }

            const currentPartyState = this.getCurrentPartyState();

            // Prepare run data with party number
            const runData = {
                date: runDateTime,
                participantIds: currentPartyState.participants,
                partyNumber: this.currentParty,
                success: true, // Always true since we're tracking drops directly
                notes: null
            };

            showLoading(true);

            // Create the run (API needs to handle party_number)
            const run = await api.addRun(runData);
            
            // Add any drops that were recorded
            const dropPromises = [];
            for (const [characterId, itemId] of Object.entries(currentPartyState.drops)) {
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

            // Reset the current party form
            this.resetCurrentPartyForm();

            // Refresh the runs list
            await this.loadRecentRuns();

            // Re-render character cards to update stats/sorting
            await this.renderCharacterCards(this.currentSearchQuery);

            const dropCount = Object.keys(currentPartyState.drops).length;
            showNotification('success', 
                `Party ${this.currentParty} run saved! ${currentPartyState.participants.length} participants, ${dropCount} drops recorded.`);

        } catch (error) {
            console.error('Failed to save run:', error);
            showNotification('error', `Failed to save run: ${error.message}`);
        } finally {
            showLoading(false);
        }
    }

    validateCurrentPartyRunData() {
        const dateTime = document.getElementById('runDateTime').value;
        
        if (!dateTime) {
            throw new Error('Run date and time are required');
        }

        const currentPartyState = this.getCurrentPartyState();

        if (currentPartyState.participants.length === 0) {
            throw new Error(`At least one participant is required for Party ${this.currentParty}`);
        }

        if (currentPartyState.participants.length > 10) {
            throw new Error('Maximum of 10 participants allowed per party');
        }

        // Check if date is not in the future (allow some tolerance for timezone issues)
        const runDate = new Date(dateTime);
        const now = new Date();
        const maxFutureTime = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour tolerance

        if (runDate > maxFutureTime) {
            throw new Error('Run date cannot be in the future');
        }
    }

    resetCurrentPartyForm() {
        const currentPartyState = this.getCurrentPartyState();
        
        // Reset drops but keep participants selected by default for faster consecutive runs
        currentPartyState.drops = {};
        currentPartyState.lastSaved = new Date();
        
        // Keep all characters selected for next run (speeds up consecutive logging)
        
        // Reset date to current
        this.setCurrentDateTime();

        // Clear search interface
        this.clearParticipantSearch();

        // Update indicators
        this.updatePartyTabIndicators();

        // Re-render character cards
        this.renderCharacterCards();
    }

    // Run History Management
    async loadRecentRuns() {
        try {
            this.allRuns = await api.getRuns(50); // Load more runs for filtering
            this.renderRunsList(this.allRuns);
        } catch (error) {
            console.error('Failed to load recent runs:', error);
            const container = document.getElementById('runsList');
            if (container) {
                container.innerHTML = '<p class="error">Failed to load runs</p>';
            }
        }
    }

    filterRunHistory() {
        const filterSelect = document.getElementById('historyPartyFilter');
        if (!filterSelect) return;

        const selectedParty = filterSelect.value;
        let filteredRuns = this.allRuns;

        if (selectedParty !== 'all') {
            const partyNumber = parseInt(selectedParty);
            filteredRuns = this.allRuns.filter(run => run.party_number === partyNumber);
        }

        this.renderRunsList(filteredRuns);
    }

    renderRunsList(runs) {
        const container = document.getElementById('runsList');
        if (!container) return;

        if (runs.length === 0) {
            const filterSelect = document.getElementById('historyPartyFilter');
            const isFiltered = filterSelect && filterSelect.value !== 'all';
            
            container.innerHTML = `
                <div class="run-card">
                    <div class="run-header">
                        <div class="run-date">${isFiltered ? 'No Runs for Selected Party' : 'No Runs Yet'}</div>
                    </div>
                    <div class="run-details">${isFiltered ? 'Try selecting "All Parties" or a different party' : 'Log your first Shadowguard encounter above'}</div>
                </div>
            `;
            return;
        }

        container.innerHTML = runs.map(run => {
            const runDate = new Date(run.date);
            const hasDrops = run.total_drops > 0;
            const partyNumber = run.party_number || 1; // Default to Party 1 for backward compatibility
            
            return `
                <div class="run-card ${hasDrops ? 'has-drops' : 'no-drops'}">
                    <div class="run-header">
                        <div class="run-date">${formatDateTime(run.date)}</div>
                        <div class="run-badges">
                            <span class="run-badge party">Party ${partyNumber}</span>
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

    // Clear all parties (utility function for development/testing)
    clearAllParties() {
        this.parties = {
            1: { participants: [], drops: {}, lastSaved: null },
            2: { participants: [], drops: {}, lastSaved: null },
            3: { participants: [], drops: {}, lastSaved: null }
        };
        this.updatePartyTabIndicators();
        this.renderCharacterCards();
        console.log('All parties cleared');
    }

    // Get summary of all parties (utility function)
    getPartySummary() {
        const summary = {};
        for (let partyNum = 1; partyNum <= 3; partyNum++) {
            const party = this.parties[partyNum];
            summary[`party${partyNum}`] = {
                participants: party.participants.length,
                drops: Object.keys(party.drops).length,
                characterNames: party.participants.map(id => {
                    const character = this.charactersWithStats.find(c => c.id === id);
                    return character ? character.name : `ID:${id}`;
                })
            };
        }
        return summary;
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

function switchParty(partyNumber) {
    runsComponent.switchParty(partyNumber);
}

function filterRunHistory() {
    runsComponent.filterRunHistory();
}

// Export for use in other modules
window.runsComponent = runsComponent;