// js/components/characters.js - Character Management Component (Phase 2 Updated)
class CharactersComponent {
    constructor() {
        this.characters = [];
        this.filteredCharacters = [];
        this.sortBy = 'name'; // 'name', 'recent', 'id'
        this.searchQuery = '';
    }

    async init() {
        try {
            await this.loadCharacters();
            this.setupEventListeners();
            console.log('Characters component initialized');
        } catch (error) {
            console.error('Failed to initialize characters component:', error);
        }
    }

    setupEventListeners() {
        // Add character form submission
        const form = document.getElementById('addCharacterForm');
        if (form) {
            form.addEventListener('submit', this.handleAddCharacter.bind(this));
        }

        // Character search input
        const searchInput = document.getElementById('characterSearchInput');
        if (searchInput) {
            searchInput.addEventListener('input', this.handleCharacterSearch.bind(this));
        }

        // Sort controls
        const sortSelect = document.getElementById('characterSort');
        if (sortSelect) {
            sortSelect.addEventListener('change', this.handleSortChange.bind(this));
        }
    }

    async loadCharacters() {
        try {
            this.characters = await api.getCharacters();
            this.updateFilteredCharacters();
            this.renderCharacters();
        } catch (error) {
            console.error('Failed to load characters:', error);
            this.renderError('Failed to load characters');
        }
    }

    // Phase 2: Handle character search within the characters tab
    handleCharacterSearch(e) {
        this.searchQuery = e.target.value.trim().toLowerCase();
        this.updateFilteredCharacters();
        this.renderCharacters();
    }

    // Phase 2: Handle sort option changes
    handleSortChange(e) {
        this.sortBy = e.target.value;
        this.updateFilteredCharacters();
        this.renderCharacters();
    }

    // Phase 2: Update filtered and sorted character list
    updateFilteredCharacters() {
        let filtered = [...this.characters];

        // Apply search filter
        if (this.searchQuery) {
            filtered = filtered.filter(character => 
                character.name.toLowerCase().includes(this.searchQuery)
            );
        }

        // Apply sorting
        switch (this.sortBy) {
            case 'name':
                filtered.sort((a, b) => a.name.localeCompare(b.name));
                break;
            case 'recent':
                filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
                break;
            case 'id':
                filtered.sort((a, b) => b.id - a.id);
                break;
        }

        this.filteredCharacters = filtered;
    }

    async handleAddCharacter(e) {
        e.preventDefault();
        
        try {
            const formData = new FormData(e.target);
            const name = validateCharacterName(formData.get('name'));
            
            // Phase 2: Removed 10 character limit for scalability
            
            // Check for duplicate names (case-insensitive)
            const duplicateName = this.characters.find(c => 
                c.name.toLowerCase() === name.toLowerCase()
            );
            if (duplicateName) {
                throw new Error(`Character "${name}" already exists`);
            }
            
            const character = await api.addCharacter(name);
            this.characters.push(character);
            
            // Update filtered list and render
            this.updateFilteredCharacters();
            this.renderCharacters();
            this.closeAddCharacterModal();
            
            // Also refresh the runs tab character cards if visible
            if (window.runsComponent && document.getElementById('runs-tab').classList.contains('active')) {
                await window.runsComponent.renderCharacterCards();
            }

            // Refresh any active search components
            if (window.characterSearchComponent) {
                const activeSearches = document.querySelectorAll('.character-search-input');
                activeSearches.forEach(input => {
                    if (input.value.trim()) {
                        characterSearchComponent.refreshResults(input.dataset.searchId);
                    }
                });
            }
            
            showNotification('success', `Character "${name}" added successfully`);
            
        } catch (error) {
            console.error('Failed to add character:', error);
            showNotification('error', `Failed to add character: ${error.message}`);
        }
    }

    async deleteCharacter(id, name) {
        try {
            const confirmed = await this.showDeleteConfirmation(
                `Are you sure you want to delete "${name}"? This will also delete all their run participation and drop records.`
            );
            
            if (!confirmed) return;
            
            await api.deleteCharacter(id);
            this.characters = this.characters.filter(c => c.id !== id);
            
            // Update filtered list and render
            this.updateFilteredCharacters();
            this.renderCharacters();
            
            // Also refresh the runs tab character cards if visible
            if (window.runsComponent && document.getElementById('runs-tab').classList.contains('active')) {
                await window.runsComponent.renderCharacterCards();
            }

            // Refresh any active search components
            if (window.characterSearchComponent) {
                const activeSearches = document.querySelectorAll('.character-search-input');
                activeSearches.forEach(input => {
                    if (input.value.trim()) {
                        characterSearchComponent.refreshResults(input.dataset.searchId);
                    }
                });
            }
            
            showNotification('success', `Character "${name}" deleted successfully`);
            
        } catch (error) {
            console.error('Failed to delete character:', error);
            showNotification('error', `Failed to delete character: ${error.message}`);
        }
    }

    renderCharacters() {
        const grid = document.getElementById('charactersGrid');
        if (!grid) return;
        
        const displayCharacters = this.filteredCharacters;
        
        if (displayCharacters.length === 0) {
            if (this.searchQuery) {
                grid.innerHTML = `
                    <div class="character-card empty-state">
                        <div class="character-name">No Characters Found</div>
                        <div class="character-stats">No characters match "${this.searchQuery}"</div>
                        <div class="character-stats">Try a different search term</div>
                    </div>
                `;
            } else {
                grid.innerHTML = `
                    <div class="character-card empty-state">
                        <div class="character-name">No Characters Yet</div>
                        <div class="character-stats">Click "Add Character" to get started</div>
                        <div class="character-stats">You can now add unlimited characters</div>
                    </div>
                `;
            }
            
            this.updateCharacterCount();
            return;
        }
        
        grid.innerHTML = displayCharacters.map(character => {
            const createdDate = new Date(character.created_at);
            const isRecentlyAdded = (Date.now() - createdDate.getTime()) < 300000; // 5 minutes
            
            // Phase 2: Show party status if character is in any party
            const partyStatus = this.getCharacterPartyStatus(character.id);
            const partyIndicator = partyStatus ? `
                <div class="character-party-status">
                    <span class="party-badge party-${partyStatus}">Party ${partyStatus}</span>
                </div>
            ` : '';
            
            return `
                <div class="character-card ${isRecentlyAdded ? 'recently-added' : ''}">
                    <div class="character-name">${character.name}</div>
                    ${partyIndicator}
                    <div class="character-stats">
                        <div class="stat-row">
                            <span>Added:</span>
                            <span>${formatDate(character.created_at)}</span>
                        </div>
                        <div class="stat-row">
                            <span>Character ID:</span>
                            <span>#${character.id}</span>
                        </div>
                    </div>
                    <div class="character-actions">
                        <button class="btn btn-danger btn-sm" 
                                onclick="charactersComponent.deleteCharacter(${character.id}, '${character.name.replace(/'/g, "\\'")}')">
                            Delete
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        // Update character count display
        this.updateCharacterCount();
    }

    // Phase 2: Get character's current party status
    getCharacterPartyStatus(characterId) {
        if (!window.app || !window.app.components.runs) {
            return null;
        }

        const runComponent = window.app.components.runs;
        
        // Check each party for this character
        for (let partyNum = 1; partyNum <= 3; partyNum++) {
            const party = runComponent.parties[partyNum];
            if (party && party.participants.includes(characterId)) {
                return partyNum;
            }
        }
        
        return null;
    }

    updateCharacterCount() {
        const totalCount = this.characters.length;
        const displayedCount = this.filteredCharacters.length;
        
        // Update add button (Phase 2: No more limit)
        const addButton = document.querySelector('[onclick="openAddCharacterModal()"]');
        if (addButton) {
            if (this.searchQuery && displayedCount < totalCount) {
                addButton.textContent = `Add Character (${displayedCount}/${totalCount} shown)`;
            } else {
                addButton.textContent = `Add Character (${totalCount} total)`;
            }
        }

        // Update character count display
        const countDisplay = document.getElementById('characterCountDisplay');
        if (countDisplay) {
            if (this.searchQuery && displayedCount < totalCount) {
                countDisplay.textContent = `Showing ${displayedCount} of ${totalCount} characters`;
            } else {
                countDisplay.textContent = `${totalCount} character${totalCount !== 1 ? 's' : ''}`;
            }
        }
    }

    renderError(message) {
        const grid = document.getElementById('charactersGrid');
        if (grid) {
            grid.innerHTML = `
                <div class="character-card error-state">
                    <div class="character-name">Error</div>
                    <div class="character-stats">${message}</div>
                    <div class="character-actions">
                        <button class="btn btn-primary btn-sm" onclick="charactersComponent.loadCharacters()">
                            Retry
                        </button>
                    </div>
                </div>
            `;
        }
    }

    openAddCharacterModal() {
        const modal = document.getElementById('addCharacterModal');
        if (modal) {
            modal.classList.remove('hidden');
            
            // Focus on name input
            const nameInput = document.getElementById('characterName');
            if (nameInput) {
                setTimeout(() => nameInput.focus(), 100);
            }
        }
    }

    closeAddCharacterModal() {
        const modal = document.getElementById('addCharacterModal');
        if (modal) {
            modal.classList.add('hidden');
            
            // Reset form
            const form = document.getElementById('addCharacterForm');
            if (form) {
                form.reset();
            }
        }
    }

    async showDeleteConfirmation(message) {
        return new Promise((resolve) => {
            const modal = document.getElementById('confirmDeleteModal');
            const messageElement = document.getElementById('deleteMessage');
            const confirmButton = document.getElementById('confirmDeleteBtn');
            
            if (!modal || !messageElement || !confirmButton) {
                resolve(false);
                return;
            }
            
            messageElement.textContent = message;
            modal.classList.remove('hidden');
            
            // Handle confirmation
            const handleConfirm = () => {
                modal.classList.add('hidden');
                confirmButton.removeEventListener('click', handleConfirm);
                resolve(true);
            };
            
            // Handle cancel
            const handleCancel = () => {
                modal.classList.add('hidden');
                confirmButton.removeEventListener('click', handleConfirm);
                resolve(false);
            };
            
            confirmButton.addEventListener('click', handleConfirm);
            
            // Cancel on escape or click outside
            const handleEscape = (e) => {
                if (e.key === 'Escape' || e.target === modal) {
                    document.removeEventListener('keydown', handleEscape);
                    modal.removeEventListener('click', handleEscape);
                    handleCancel();
                }
            };
            
            document.addEventListener('keydown', handleEscape);
            modal.addEventListener('click', handleEscape);
        });
    }

    async refreshCharacters() {
        await this.loadCharacters();
        showNotification('success', 'Characters refreshed');
    }

    // Phase 2: Clear search and show all characters
    clearCharacterSearch() {
        const searchInput = document.getElementById('characterSearchInput');
        if (searchInput) {
            searchInput.value = '';
        }
        this.searchQuery = '';
        this.updateFilteredCharacters();
        this.renderCharacters();
    }

    // Phase 2: Filter characters by party
    filterByParty(partyNumber) {
        const filtered = partyNumber === 'all' ? 
            [...this.characters] : 
            this.characters.filter(character => 
                this.getCharacterPartyStatus(character.id) === partyNumber
            );
        
        this.filteredCharacters = filtered;
        this.renderCharacters();
    }

    // Get character name by ID (utility function)
    getCharacterName(id) {
        const character = this.characters.find(c => c.id === id);
        return character ? character.name : 'Unknown';
    }

    // Get all character names (utility function)
    getAllCharacterNames() {
        return this.characters.map(c => c.name);
    }

    // Phase 2: Search integration methods
    
    // Get characters available for a specific party (excludes characters in other parties)
    getAvailableCharactersForParty(partyNumber) {
        return this.characters.filter(character => {
            const currentParty = this.getCharacterPartyStatus(character.id);
            return currentParty === null || currentParty === partyNumber;
        });
    }

    // Get characters by search query (for external use)
    async searchCharacters(query, limit = 20) {
        if (query.length < 2) return [];
        
        try {
            const results = await api.searchCharacters(query, limit);
            return results;
        } catch (error) {
            console.error('Character search failed:', error);
            return [];
        }
    }

    // Get recently active characters (for Phase 3 enhancement)
    getRecentlyActiveCharacters(limit = 10) {
        // For now, return recently added characters
        // In Phase 3, this could include last participation date from runs
        return [...this.characters]
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
            .slice(0, limit);
    }

    // Check if character exists by name
    characterExists(name) {
        return this.characters.some(c => 
            c.name.toLowerCase() === name.toLowerCase()
        );
    }

    // Get character by ID
    getCharacterById(id) {
        return this.characters.find(c => c.id === id);
    }
}

// Global instance
const charactersComponent = new CharactersComponent();

// Global functions for HTML onclick handlers
function openAddCharacterModal() {
    charactersComponent.openAddCharacterModal();
}

function closeModal(modalId) {
    if (modalId === 'addCharacterModal') {
        charactersComponent.closeAddCharacterModal();
    } else {
        // Generic modal close
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('hidden');
        }
    }
}

// Phase 2: Global functions for new search functionality
function clearCharacterSearch() {
    charactersComponent.clearCharacterSearch();
}

function filterCharactersByParty(partyNumber) {
    charactersComponent.filterByParty(partyNumber);
}

// Export for use in other modules
window.charactersComponent = charactersComponent;