// js/components/characters.js - Character Management Component
class CharactersComponent {
    constructor() {
        this.characters = [];
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
    }

    async loadCharacters() {
        try {
            this.characters = await api.getCharacters();
            this.renderCharacters();
        } catch (error) {
            console.error('Failed to load characters:', error);
            this.renderError('Failed to load characters');
        }
    }

    async handleAddCharacter(e) {
        e.preventDefault();
        
        try {
            const formData = new FormData(e.target);
            const name = validateCharacterName(formData.get('name'));
            
            // Check if we already have 10 characters (max limit)
            if (this.characters.length >= 10) {
                throw new Error('Maximum of 10 characters allowed');
            }
            
            // Check for duplicate names (case-insensitive)
            const duplicateName = this.characters.find(c => 
                c.name.toLowerCase() === name.toLowerCase()
            );
            if (duplicateName) {
                throw new Error(`Character "${name}" already exists`);
            }
            
            const character = await api.addCharacter(name);
            this.characters.push(character);
            
            this.renderCharacters();
            this.closeAddCharacterModal();
            
            // Also refresh the runs tab character cards if visible
            if (window.runsComponent && document.getElementById('runs-tab').classList.contains('active')) {
                await window.runsComponent.renderCharacterCards();
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
            
            this.renderCharacters();
            
            // Also refresh the runs tab character cards if visible
            if (window.runsComponent && document.getElementById('runs-tab').classList.contains('active')) {
                await window.runsComponent.renderCharacterCards();
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
        
        if (this.characters.length === 0) {
            grid.innerHTML = `
                <div class="character-card empty-state">
                    <div class="character-name">No Characters Yet</div>
                    <div class="character-stats">Click "Add Character" to get started</div>
                    <div class="character-stats">You can add up to 10 characters</div>
                </div>
            `;
            return;
        }
        
        // Sort characters alphabetically for display
        const sortedCharacters = [...this.characters].sort((a, b) => 
            a.name.localeCompare(b.name)
        );
        
        grid.innerHTML = sortedCharacters.map(character => {
            const createdDate = new Date(character.created_at);
            const isRecentlyAdded = (Date.now() - createdDate.getTime()) < 300000; // 5 minutes
            
            return `
                <div class="character-card ${isRecentlyAdded ? 'recently-added' : ''}">
                    <div class="character-name">${character.name}</div>
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

    updateCharacterCount() {
        const maxCharacters = 10;
        const currentCount = this.characters.length;
        
        // Update add button state
        const addButton = document.querySelector('[onclick="openAddCharacterModal()"]');
        if (addButton) {
            if (currentCount >= maxCharacters) {
                addButton.disabled = true;
                addButton.textContent = `Max Characters (${currentCount}/${maxCharacters})`;
                addButton.classList.add('btn-disabled');
            } else {
                addButton.disabled = false;
                addButton.textContent = `Add Character (${currentCount}/${maxCharacters})`;
                addButton.classList.remove('btn-disabled');
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
        if (this.characters.length >= 10) {
            showNotification('warning', 'Maximum of 10 characters allowed');
            return;
        }
        
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

    // Get character name by ID (utility function)
    getCharacterName(id) {
        const character = this.characters.find(c => c.id === id);
        return character ? character.name : 'Unknown';
    }

    // Get all character names (utility function)
    getAllCharacterNames() {
        return this.characters.map(c => c.name);
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

// Export for use in other modules
window.charactersComponent = charactersComponent;