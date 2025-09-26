// js/components/search.js - Character Search Component for Phase 2
class CharacterSearchComponent {
    constructor() {
        this.searchResults = [];
        this.currentQuery = '';
        this.searchTimeout = null;
        this.isSearching = false;
        this.selectedIndex = -1; // For keyboard navigation
        this.onCharacterSelect = null; // Callback function
        this.currentParty = null; // For party-aware search
        this.excludeCharacterIds = []; // Characters to exclude from results
    }

    // Initialize search component
    init() {
        this.setupEventListeners();
        console.log('Character search component initialized');
    }

    // Set up event listeners for search functionality
    setupEventListeners() {
        // Global event delegation for dynamically created search inputs
        document.addEventListener('input', (e) => {
            if (e.target.classList.contains('character-search-input')) {
                this.handleSearchInput(e);
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.target.classList.contains('character-search-input')) {
                this.handleSearchKeydown(e);
            }
        });

        document.addEventListener('click', (e) => {
            // Close search results when clicking outside
            if (!e.target.closest('.character-search-container')) {
                this.hideAllSearchResults();
            }
        });
    }

    // Create a search interface for character selection
    createSearchInterface(config = {}) {
        const {
            placeholder = 'Search characters...',
            containerId = 'characterSearch',
            allowNewCharacter = false,
            currentParty = null,
            excludeIds = [],
            onSelect = null,
            className = ''
        } = config;

        this.currentParty = currentParty;
        this.excludeCharacterIds = excludeIds;
        this.onCharacterSelect = onSelect;

        const searchHtml = `
            <div class="character-search-container ${className}">
                <div class="character-search-input-container">
                    <input 
                        type="text" 
                        id="${containerId}"
                        class="character-search-input"
                        placeholder="${placeholder}"
                        autocomplete="off"
                        data-search-id="${containerId}"
                    >
                    <div class="search-icon">🔍</div>
                    <button class="search-clear hidden" onclick="characterSearchComponent.clearSearch('${containerId}')">×</button>
                </div>
                
                <div class="character-search-results hidden" id="${containerId}Results">
                    <div class="search-results-list" id="${containerId}List">
                        <!-- Search results will appear here -->
                    </div>
                    
                    ${allowNewCharacter ? `
                        <div class="search-add-new hidden" id="${containerId}AddNew">
                            <button class="search-add-character-btn" onclick="characterSearchComponent.addNewCharacter('${containerId}')">
                                <span class="add-icon">+</span>
                                <span class="add-text">Add new character</span>
                            </button>
                        </div>
                    ` : ''}
                    
                    <div class="search-no-results hidden" id="${containerId}NoResults">
                        <div class="no-results-message">No characters found</div>
                        <div class="search-tips">Try a different search term or check spelling</div>
                    </div>
                </div>
            </div>
        `;

        return searchHtml;
    }

    // Handle search input with debouncing
    handleSearchInput(e) {
        const input = e.target;
        const query = input.value.trim();
        const searchId = input.dataset.searchId;
        
        this.currentQuery = query;
        this.selectedIndex = -1;

        // Show/hide clear button
        const clearBtn = input.parentNode.querySelector('.search-clear');
        if (clearBtn) {
            if (query.length > 0) {
                clearBtn.classList.remove('hidden');
            } else {
                clearBtn.classList.add('hidden');
            }
        }

        // Clear previous timeout
        if (this.searchTimeout) {
            clearTimeout(this.searchTimeout);
        }

        // Hide results if query is too short
        if (query.length < 2) {
            this.hideSearchResults(searchId);
            return;
        }

        // Debounce search
        this.searchTimeout = setTimeout(() => {
            this.performSearch(query, searchId);
        }, 300);
    }

    // Handle keyboard navigation in search
    handleSearchKeydown(e) {
        const searchId = e.target.dataset.searchId;
        const resultsList = document.getElementById(`${searchId}List`);
        
        if (!resultsList) return;

        const results = resultsList.querySelectorAll('.search-result-item');
        
        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                this.selectedIndex = Math.min(this.selectedIndex + 1, results.length - 1);
                this.updateSelection(results);
                break;
                
            case 'ArrowUp':
                e.preventDefault();
                this.selectedIndex = Math.max(this.selectedIndex - 1, -1);
                this.updateSelection(results);
                break;
                
            case 'Enter':
                e.preventDefault();
                if (this.selectedIndex >= 0 && results[this.selectedIndex]) {
                    const characterId = results[this.selectedIndex].dataset.characterId;
                    this.selectCharacter(parseInt(characterId), searchId);
                }
                break;
                
            case 'Escape':
                e.preventDefault();
                this.hideSearchResults(searchId);
                e.target.blur();
                break;
        }
    }

    // Perform the actual search
    async performSearch(query, searchId) {
        if (this.isSearching) return;
        
        try {
            this.isSearching = true;
            this.showSearchLoading(searchId);

            // Get search results from API
            const results = await api.searchCharacters(query, 15);
            
            // Filter results based on current context
            const filteredResults = this.filterSearchResults(results);
            
            this.searchResults = filteredResults;
            this.renderSearchResults(filteredResults, searchId);
            
        } catch (error) {
            console.error('Search failed:', error);
            this.showSearchError(searchId);
        } finally {
            this.isSearching = false;
        }
    }

    // Filter search results based on current context
    filterSearchResults(results) {
        return results.filter(character => {
            // Exclude characters already in use
            if (this.excludeCharacterIds.includes(character.id)) {
                return false;
            }
            
            // Add party availability status
            character.partyStatus = this.getCharacterPartyStatus(character.id);
            
            return true;
        });
    }

    // Get character's party status for display
    getCharacterPartyStatus(characterId) {
        if (!window.app || !window.app.components.runs) {
            return { available: true, inParty: null };
        }

        const runComponent = window.app.components.runs;
        
        // Check each party for this character
        for (let partyNum = 1; partyNum <= 3; partyNum++) {
            const party = runComponent.parties[partyNum];
            if (party && party.participants.includes(characterId)) {
                return {
                    available: partyNum === this.currentParty,
                    inParty: partyNum,
                    isCurrentParty: partyNum === this.currentParty
                };
            }
        }
        
        return { available: true, inParty: null };
    }

    // Render search results
    renderSearchResults(results, searchId) {
        const resultsContainer = document.getElementById(`${searchId}Results`);
        const resultsList = document.getElementById(`${searchId}List`);
        const noResults = document.getElementById(`${searchId}NoResults`);
        const addNew = document.getElementById(`${searchId}AddNew`);
        
        if (!resultsContainer || !resultsList) return;

        // Show results container
        resultsContainer.classList.remove('hidden');

        if (results.length === 0) {
            resultsList.innerHTML = '';
            if (noResults) noResults.classList.remove('hidden');
            if (addNew) addNew.classList.remove('hidden');
        } else {
            if (noResults) noResults.classList.add('hidden');
            if (addNew) addNew.classList.add('hidden');
            
            resultsList.innerHTML = results.map(character => {
                const status = character.partyStatus;
                const isAvailable = status.available;
                const partyText = status.inParty ? ` (Party ${status.inParty})` : '';
                
                return `
                    <div class="search-result-item ${!isAvailable ? 'unavailable' : ''}" 
                         data-character-id="${character.id}"
                         onclick="characterSearchComponent.selectCharacter(${character.id}, '${searchId}')">
                        <div class="result-character-info">
                            <div class="result-character-name">${character.name}</div>
                            <div class="result-character-meta">
                                ID: #${character.id}
                                ${partyText}
                                ${!isAvailable ? ' - Unavailable' : ''}
                            </div>
                        </div>
                        <div class="result-actions">
                            ${isAvailable ? 
                                '<span class="result-select-indicator">Select</span>' : 
                                '<span class="result-unavailable-indicator">In Use</span>'
                            }
                        </div>
                    </div>
                `;
            }).join('');
        }

        this.selectedIndex = -1;
    }

    // Show search loading state
    showSearchLoading(searchId) {
        const resultsList = document.getElementById(`${searchId}List`);
        const resultsContainer = document.getElementById(`${searchId}Results`);
        
        if (resultsList && resultsContainer) {
            resultsContainer.classList.remove('hidden');
            resultsList.innerHTML = `
                <div class="search-loading">
                    <div class="search-spinner"></div>
                    <div>Searching characters...</div>
                </div>
            `;
        }
    }

    // Show search error state
    showSearchError(searchId) {
        const resultsList = document.getElementById(`${searchId}List`);
        const resultsContainer = document.getElementById(`${searchId}Results`);
        
        if (resultsList && resultsContainer) {
            resultsContainer.classList.remove('hidden');
            resultsList.innerHTML = `
                <div class="search-error">
                    <div class="error-icon">⚠️</div>
                    <div>Search failed. Please try again.</div>
                </div>
            `;
        }
    }

    // Update keyboard selection visual state
    updateSelection(results) {
        results.forEach((result, index) => {
            if (index === this.selectedIndex) {
                result.classList.add('selected');
            } else {
                result.classList.remove('selected');
            }
        });

        // Scroll selected item into view
        if (this.selectedIndex >= 0 && results[this.selectedIndex]) {
            results[this.selectedIndex].scrollIntoView({
                block: 'nearest',
                behavior: 'smooth'
            });
        }
    }

    // Handle character selection
    selectCharacter(characterId, searchId) {
        const character = this.searchResults.find(c => c.id === characterId);
        if (!character) return;

        // Check if character is available
        if (!character.partyStatus.available) {
            showNotification('warning', `${character.name} is already in Party ${character.partyStatus.inParty}`);
            return;
        }

        // Call the selection callback
        if (this.onCharacterSelect) {
            this.onCharacterSelect(character);
        }

        // Clear search
        this.clearSearch(searchId);

        // Hide search results
        this.hideSearchResults(searchId);
    }

    // Clear search input and results
    clearSearch(searchId) {
        const input = document.getElementById(searchId);
        const clearBtn = input?.parentNode?.querySelector('.search-clear');
        
        if (input) {
            input.value = '';
            input.focus();
        }
        
        if (clearBtn) {
            clearBtn.classList.add('hidden');
        }
        
        this.hideSearchResults(searchId);
        this.currentQuery = '';
        this.selectedIndex = -1;
    }

    // Hide search results for a specific search
    hideSearchResults(searchId) {
        const resultsContainer = document.getElementById(`${searchId}Results`);
        if (resultsContainer) {
            resultsContainer.classList.add('hidden');
        }
    }

    // Hide all search results (for clicking outside)
    hideAllSearchResults() {
        const allResults = document.querySelectorAll('.character-search-results');
        allResults.forEach(results => {
            results.classList.add('hidden');
        });
        this.selectedIndex = -1;
    }

    // Add new character from search (if enabled)
    async addNewCharacter(searchId) {
        const input = document.getElementById(searchId);
        const query = input?.value?.trim();
        
        if (!query) {
            showNotification('warning', 'Enter a character name first');
            return;
        }

        try {
            // Use existing character addition logic
            if (window.charactersComponent) {
                const character = await api.addCharacter(query);
                
                // Update characters component
                window.charactersComponent.characters.push(character);
                
                // Call selection callback with new character
                if (this.onCharacterSelect) {
                    this.onCharacterSelect(character);
                }
                
                // Clear search
                this.clearSearch(searchId);
                
                showNotification('success', `Character "${character.name}" added and selected`);
            }
        } catch (error) {
            console.error('Failed to add character:', error);
            showNotification('error', `Failed to add character: ${error.message}`);
        }
    }

    // Utility: Get all characters with search capability
    async getAllCharacters() {
        try {
            return await api.getCharacters();
        } catch (error) {
            console.error('Failed to get characters:', error);
            return [];
        }
    }

    // Utility: Search characters by activity (most recent first)
    async getCharactersByActivity(limit = 20) {
        try {
            // This could be enhanced with a backend endpoint for activity-based sorting
            const characters = await this.getAllCharacters();
            
            // For now, sort by creation date (newest first)
            // In Phase 3, this could include last participation date
            return characters
                .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                .slice(0, limit);
        } catch (error) {
            console.error('Failed to get characters by activity:', error);
            return [];
        }
    }

    // Integration helper: Create search for run participant selection
    createRunParticipantSearch(partyNumber) {
        return this.createSearchInterface({
            placeholder: `Search characters for Party ${partyNumber}...`,
            containerId: `partySearch${partyNumber}`,
            allowNewCharacter: true,
            currentParty: partyNumber,
            excludeIds: [], // Will be set when rendering
            onSelect: (character) => {
                if (window.app && window.app.components.runs) {
                    window.app.components.runs.addParticipant(character.id, partyNumber);
                }
            },
            className: 'run-participant-search'
        });
    }

    // Integration helper: Create search for drop logging
    createDropCharacterSearch(runId, availableCharacterIds = []) {
        return this.createSearchInterface({
            placeholder: 'Search characters for drop...',
            containerId: `dropSearch${runId}`,
            allowNewCharacter: false,
            currentParty: null,
            excludeIds: [], // Allow all characters for drops
            onSelect: (character) => {
                if (window.app && window.app.components.drops) {
                    window.app.components.drops.selectCharacterForDrop(character.id);
                }
            },
            className: 'drop-character-search'
        });
    }

    // Update context for party-aware search
    updateContext(config = {}) {
        const {
            currentParty = null,
            excludeIds = [],
            onSelect = null
        } = config;

        this.currentParty = currentParty;
        this.excludeCharacterIds = excludeIds;
        if (onSelect) {
            this.onCharacterSelect = onSelect;
        }
    }

    // Refresh search results (e.g., after character addition)
    async refreshResults(searchId) {
        const input = document.getElementById(searchId);
        if (input && input.value.trim().length >= 2) {
            await this.performSearch(input.value.trim(), searchId);
        }
    }
}

// Global instance
const characterSearchComponent = new CharacterSearchComponent();

// Global functions for HTML onclick handlers
window.characterSearchComponent = characterSearchComponent;

// Export for use in other modules
window.CharacterSearchComponent = CharacterSearchComponent;