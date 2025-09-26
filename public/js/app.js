// js/app.js - Main Application Controller
class ShadowguardApp {
    constructor() {
        this.currentTab = 'characters';
        this.components = {};
        
        this.init();
    }

    async init() {
        try {
            // Initialize all components
            await this.initializeComponents();
            
            // Set up global event listeners
            this.setupEventListeners();
            
            // Load initial data and show default tab
            await this.loadInitialData();
            this.showTab('characters');
            
            console.log('Shadowguard Drop Tracker initialized successfully');
        } catch (error) {
            console.error('Failed to initialize app:', error);
            showNotification('error', 'Failed to initialize application');
        }
    }

    async initializeComponents() {
        try {
            // Initialize all component instances
            this.components.characters = charactersComponent;
            this.components.runs = runsComponent;
            this.components.drops = dropsComponent;
            this.components.analytics = analyticsComponent;

            // Initialize each component
            await Promise.all([
                this.components.characters.init(),
                this.components.runs.init(),
                this.components.drops.init(),
                this.components.analytics.init()
            ]);

            console.log('All components initialized successfully');
        } catch (error) {
            console.error('Failed to initialize components:', error);
            throw error;
        }
    }

    setupEventListeners() {
        // Global keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Escape key to close modals
            if (e.key === 'Escape') {
                const openModal = document.querySelector('.modal:not(.hidden)');
                if (openModal) {
                    this.closeModal(openModal.id);
                }
            }
            
            // Tab switching shortcuts (Ctrl/Cmd + 1,2,3)
            if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey) {
                switch(e.key) {
                    case '1':
                        e.preventDefault();
                        this.showTab('characters');
                        break;
                    case '2':
                        e.preventDefault();
                        this.showTab('runs');
                        break;
                    case '3':
                        e.preventDefault();
                        this.showTab('analytics');
                        break;
                }
            }
        });
        
        // Modal click-outside-to-close
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                const modalId = e.target.id;
                this.closeModal(modalId);
            }
        });

        // Handle browser back/forward navigation
        window.addEventListener('popstate', (e) => {
            const tab = e.state?.tab || 'characters';
            this.showTab(tab, false); // Don't push state again
        });
    }

    async loadInitialData() {
        try {
            // Load characters first (needed by other components)
            await this.components.characters.loadCharacters();
            
            // Load runs data (for the runs tab)
            await this.components.runs.loadRecentRuns();
            
            console.log('Initial data loaded successfully');
        } catch (error) {
            console.error('Failed to load initial data:', error);
            // Continue anyway - components can handle missing data
        }
    }

    // Tab Management
    showTab(tabName, pushState = true) {
        // Hide all tabs
        const tabs = document.querySelectorAll('.tab-content');
        tabs.forEach(tab => tab.classList.remove('active'));
        
        // Update nav button states
        const navButtons = document.querySelectorAll('.nav-buttons .btn');
        navButtons.forEach(btn => btn.classList.remove('active'));
        
        // Show selected tab
        const selectedTab = document.getElementById(`${tabName}-tab`);
        if (selectedTab) {
            selectedTab.classList.add('active');
            this.currentTab = tabName;
            
            // Update nav button
            const activeButton = document.querySelector(`[onclick="showTab('${tabName}')"]`);
            if (activeButton) {
                activeButton.classList.add('active');
            }
            
            // Update browser history
            if (pushState && history.pushState) {
                history.pushState({ tab: tabName }, '', `#${tabName}`);
            }
            
            // Load tab-specific data
            this.loadTabData(tabName);
        }
    }

    async loadTabData(tabName) {
        try {
            switch (tabName) {
                case 'characters':
                    // Characters load automatically
                    break;
                    
                case 'runs':
                    // Render character cards for run interface
                    await this.components.runs.renderCharacterCards();
                    break;
                    
                case 'analytics':
                    // Load analytics data
                    await this.components.analytics.loadAnalytics();
                    break;
            }
        } catch (error) {
            console.error(`Failed to load data for ${tabName} tab:`, error);
        }
    }

    // Modal Management
    openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('hidden');
            
            // Focus management
            const firstInput = modal.querySelector('input, select, textarea');
            if (firstInput) {
                setTimeout(() => firstInput.focus(), 100);
            }
        }
    }

    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('hidden');
            
            // Reset forms
            const form = modal.querySelector('form');
            if (form) {
                form.reset();
                // Remove any error states
                const errorFields = form.querySelectorAll('.error');
                errorFields.forEach(field => field.classList.remove('error'));
            }
        }
    }

    // Global error handler
    handleError(error, context = 'Application') {
        console.error(`${context} error:`, error);
        
        const userMessage = error.message || 'An unexpected error occurred';
        showNotification('error', userMessage);
        
        // Log to external service if available
        if (window.errorLogger) {
            window.errorLogger.log(error, context);
        }
    }

    // Refresh all data
    async refreshAllData() {
        try {
            showLoading(true);
            
            await Promise.all([
                this.components.characters.refreshCharacters(),
                this.components.runs.refreshRuns()
            ]);
            
            // If analytics tab is active, refresh analytics too
            if (this.currentTab === 'analytics') {
                await this.components.analytics.refreshAnalytics();
            }
            
            showNotification('success', 'All data refreshed');
        } catch (error) {
            this.handleError(error, 'Data Refresh');
        } finally {
            showLoading(false);
        }
    }

    // Get application state (for debugging)
    getAppState() {
        return {
            currentTab: this.currentTab,
            characters: this.components.characters.characters,
            runState: this.components.runs.currentRunState,
            analyticsData: this.components.analytics.analyticsData,
            lastRefresh: this.components.analytics.lastRefresh
        };
    }

    // Initialize from URL hash
    initializeFromUrl() {
        const hash = window.location.hash.slice(1);
        const validTabs = ['characters', 'runs', 'analytics'];
        
        if (validTabs.includes(hash)) {
            this.showTab(hash, false);
        } else {
            this.showTab('characters', false);
        }
    }

    // Utility methods for components
    getCharacterById(id) {
        return this.components.characters.characters.find(c => c.id === id);
    }

    getCharacterName(id) {
        const character = this.getCharacterById(id);
        return character ? character.name : 'Unknown Character';
    }

    // Data validation helpers
    validateRunState() {
        const runState = this.components.runs.currentRunState;
        
        if (runState.participants.length === 0) {
            throw new Error('At least one participant is required');
        }
        
        if (runState.participants.length > 10) {
            throw new Error('Maximum 10 participants allowed');
        }
        
        return true;
    }

    // Export functionality (for future enhancement)
    async exportData() {
        try {
            const exportData = {
                exportDate: new Date().toISOString(),
                characters: this.components.characters.characters,
                analytics: this.components.analytics.analyticsData,
                version: '1.0'
            };
            
            const blob = new Blob([JSON.stringify(exportData, null, 2)], {
                type: 'application/json'
            });
            
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `shadowguard-data-${new Date().toISOString().slice(0, 10)}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            showNotification('success', 'Data exported successfully');
        } catch (error) {
            this.handleError(error, 'Data Export');
        }
    }
}

// Global functions for HTML onclick handlers
function showTab(tabName) {
    if (window.app) {
        app.showTab(tabName);
    }
}

function openAddCharacterModal() {
    if (window.app) {
        app.openModal('addCharacterModal');
    }
}

function closeModal(modalId) {
    if (window.app) {
        app.closeModal(modalId);
    }
}

function refreshAnalytics() {
    if (window.app && window.app.components.analytics) {
        app.components.analytics.refreshAnalytics();
    }
}

function saveCurrentRun() {
    if (window.app && window.app.components.runs) {
        app.components.runs.saveCurrentRun();
    }
}

function refreshRuns() {
    if (window.app && window.app.components.runs) {
        app.components.runs.refreshRuns();
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new ShadowguardApp();
    
    // Initialize from URL hash after everything is loaded
    setTimeout(() => {
        if (window.app) {
            app.initializeFromUrl();
        }
    }, 100);
});

// Global error handler
window.addEventListener('error', (e) => {
    if (window.app) {
        app.handleError(e.error, 'Global');
    }
});

// Handle unhandled promise rejections
window.addEventListener('unhandledrejection', (e) => {
    if (window.app) {
        app.handleError(e.reason, 'Promise Rejection');
    }
});

// Export app for global access
window.ShadowguardApp = ShadowguardApp;