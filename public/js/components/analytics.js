// js/components/analytics.js - Analytics Management Component
class AnalyticsComponent {
    constructor() {
        this.analyticsData = {
            overview: {},
            characterStats: [],
            itemRates: [],
            recentActivity: []
        };
        this.lastRefresh = null;
        this.currentPartyFilter = 'all'; // Track current party filter
    }

    async init() {
        try {
            console.log('Analytics component initialized');
        } catch (error) {
            console.error('Failed to initialize analytics component:', error);
        }
    }

    async loadAnalytics(partyNumber = null) {
        try {
            showLoading(true);
            
            // Use the party filter if provided, otherwise use current filter
            const filterParty = partyNumber !== null ? partyNumber : this.currentPartyFilter;
            
            // CRITICAL FIX: Character stats should NEVER be filtered by party
            // They should aggregate across ALL parties
            const [overview, characterStats, itemRates, recentActivity] = await Promise.all([
                api.getOverviewStats(filterParty === 'all' ? null : filterParty),
                api.getCharacterStats(), // NO party parameter - always get all parties
                api.getItemDropRates(filterParty === 'all' ? null : filterParty),
                api.getRecentActivity(filterParty === 'all' ? null : filterParty)
            ]);

            this.analyticsData = {
                overview,
                characterStats,
                itemRates,
                recentActivity
            };
            
            this.analyticsData.partyFilter = filterParty; // Store the filter used
            this.lastRefresh = new Date();
            
            this.renderAllAnalytics();
            
            // Update the filter display
            this.updateFilterDisplay();
            
        } catch (error) {
            console.error('Failed to load analytics:', error);
            this.renderError('Failed to load analytics data');
        } finally {
            showLoading(false);
        }
    }

    // Handle party filter change from dropdown
    async filterByParty() {
        const filterSelect = document.getElementById('analyticsPartyFilter');
        if (!filterSelect) return;

        const selectedParty = filterSelect.value;
        this.currentPartyFilter = selectedParty;
        
        // Reload analytics with new filter
        await this.loadAnalytics(selectedParty);
        
        showNotification('success', 
            selectedParty === 'all' 
                ? 'Showing analytics for all parties' 
                : `Showing analytics for Party ${selectedParty}`
        );
    }

    updateFilterDisplay() {
        const filterSelect = document.getElementById('analyticsPartyFilter');
        if (filterSelect && this.currentPartyFilter) {
            filterSelect.value = this.currentPartyFilter;
        }
    }

    renderAllAnalytics() {
        this.renderOverallStats();
        this.renderCharacterStats();
        this.renderItemDropRates();
        this.renderRecentActivity();
    }

    renderOverallStats() {
        const container = document.getElementById('overallStats');
        if (!container) return;

        const stats = this.analyticsData.overview || {};
        const partyFilter = this.analyticsData.partyFilter;
        
        const successRate = stats.total_runs ? 
            Math.round((stats.successful_runs / stats.total_runs) * 100) : 0;
        
        const dropsPerRun = stats.total_runs ? 
            (stats.total_drops / stats.total_runs).toFixed(2) : 0;
        
        const participationRate = stats.total_characters && stats.total_runs ? 
            (stats.avg_participants / stats.total_characters * 100).toFixed(1) : 0;

        // Add party context to titles when filtered
        const partyContext = partyFilter && partyFilter !== 'all' ? ` (Party ${partyFilter})` : '';

        container.innerHTML = `
            <div class="stat-card">
                <h3>Total Characters${partyContext}</h3>
                <div class="stat-value">${formatNumber(stats.total_characters || 0)}</div>
            </div>
            
            <div class="stat-card">
                <h3>Total Runs${partyContext}</h3>
                <div class="stat-value">${formatNumber(stats.total_runs || 0)}</div>
            </div>
            
            <div class="stat-card">
                <h3>Total Drops${partyContext}</h3>
                <div class="stat-value">${formatNumber(stats.total_drops || 0)}</div>
            </div>
            
            <div class="stat-card">
                <h3>Drops per Run (Avg)${partyContext}</h3>
                <div class="stat-value">${dropsPerRun}</div>
            </div>
            
            <div class="stat-card">
                <h3>Avg Participants${partyContext}</h3>
                <div class="stat-value">${stats.avg_participants || 0}</div>
            </div>
            
            <div class="stat-card">
                <h3>Drop Rate${partyContext}</h3>
                <div class="stat-value">${stats.drop_rate_percentage?.toFixed(1) || 0}%</div>
            </div>
        `;
    }

    renderCharacterStats() {
        const container = document.getElementById('characterStats');
        if (!container) return;

        const stats = this.analyticsData.characterStats || [];
        const partyFilter = this.analyticsData.partyFilter;
        
        if (stats.length === 0) {
            container.innerHTML = `<p class="text-muted">No character statistics available yet.</p>`;
            return;
        }
        
        // Sort by total drops (descending) then by name
        const sortedStats = stats.sort((a, b) => {
            if (b.total_drops !== a.total_drops) {
                return b.total_drops - a.total_drops;
            }
            return a.character_name.localeCompare(b.character_name);
        });
        
        // Add party filter notice for character stats
        const partyNotice = partyFilter && partyFilter !== 'all' 
            ? `<div class="character-stats-notice">
                <i>Note: Character statistics always show performance across ALL parties. 
                Party filter affects run organization only.</i>
               </div>` 
            : '';
        
        container.innerHTML = partyNotice + sortedStats.map(stat => {
            const participationRate = stat.total_runs_participated > 0 ? 
                Math.round((stat.runs_with_drops / stat.total_runs_participated) * 100) : 0;
            const dropsPerRun = stat.total_runs_participated > 0 ? 
                (stat.total_drops / stat.total_runs_participated).toFixed(2) : '0.00';
            
            // Calculate performance based on percentage not decimal
            const dropRatePercentage = parseFloat(dropsPerRun) * 100; // Convert to percentage
            const totalRuns = stat.total_runs_participated || 0;
            const performanceLabel = this.getPerformanceLabel(dropRatePercentage, totalRuns);
            
            // Set performance class based on drop rate percentage
            let performanceClass = 'average';
            if (dropRatePercentage >= 50) performanceClass = 'excellent';
            else if (dropRatePercentage >= 30) performanceClass = 'good';
            else if (dropRatePercentage >= 15) performanceClass = 'average';
            else if (dropRatePercentage >= 5) performanceClass = 'improving';
            else if (totalRuns >= 10) performanceClass = 'struggling';
            else performanceClass = 'new'; // For characters with insufficient data

            // Show party info if character participated in multiple parties
            const partyInfo = stat.parties_participated ? 
                `<div class="stat-detail-item">
                    <span class="stat-detail-label">Parties:</span>
                    <span class="stat-detail-value">${stat.parties_participated}</span>
                </div>` : '';
                
            return `
                <div class="character-stat-card performance-${performanceClass}">
                    <div class="character-stat-name">${stat.character_name}</div>
                    <div class="character-stat-details">
                        <div class="stat-detail-item">
                            <span class="stat-detail-label">Total Drops:</span>
                            <span class="stat-detail-value">${formatNumber(stat.total_drops || 0)}</span>
                        </div>
                        <div class="stat-detail-item">
                            <span class="stat-detail-label">Drops per Run:</span>
                            <span class="stat-detail-value">${dropsPerRun}</span>
                        </div>
                        <div class="stat-detail-item">
                            <span class="stat-detail-label">Runs with Drops:</span>
                            <span class="stat-detail-value">${stat.runs_with_drops || 0}</span>
                        </div>
                        <div class="stat-detail-item">
                            <span class="stat-detail-label">Success Rate:</span>
                            <span class="stat-detail-value">${participationRate}%</span>
                        </div>
                        <div class="stat-detail-item">
                            <span class="stat-detail-label">Total Runs:</span>
                            <span class="stat-detail-value">${totalRuns}</span>
                        </div>
                        ${partyInfo}
                        ${performanceLabel ? `
                        <div class="stat-detail-item">
                            <span class="stat-detail-label">Performance:</span>
                            <span class="stat-detail-value performance-badge ${performanceClass}">
                                ${performanceLabel}
                            </span>
                        </div>
                        ` : ''}
                    </div>
                </div>
            `;
        }).join('');
    }

    getPerformanceLabel(dropRate, totalRuns = 0) {
        // Don't show performance labels for characters with insufficient data
        if (totalRuns < 3) return '';
        
        if (dropRate >= 50) return 'Excellent';
        if (dropRate >= 30) return 'Good';
        if (dropRate >= 15) return 'Average';
        if (dropRate >= 5) return 'Improving';
        if (totalRuns >= 10) return 'Struggling';
        
        // For characters with 3-9 runs and low drop rate, don't show label
        return '';
    }

    renderItemDropRates() {
        const container = document.getElementById('itemDropRates');
        if (!container) return;

        const rates = this.analyticsData.itemRates || [];
        const partyFilter = this.analyticsData.partyFilter;
        
        if (rates.length === 0) {
            const message = partyFilter && partyFilter !== 'all' 
                ? `No item drop data available for Party ${partyFilter} yet.`
                : 'No item drop data available yet.';
            container.innerHTML = `<p class="text-muted">${message}</p>`;
            return;
        }
        
        // Filter out items with no drops and group by type
        const itemsWithDrops = rates.filter(item => item.total_drops > 0);
        const groupedRates = this.groupItemsByType(itemsWithDrops);
        
        let html = '';
        
        // Render regular artifacts
        if (groupedRates.regular.length > 0) {
            const sortedRegular = groupedRates.regular.sort((a, b) => 
                (b.drop_rate_percentage || 0) - (a.drop_rate_percentage || 0)
            );
            
            html += sortedRegular.map(item => this.createItemDropCard(item)).join('');
        }
        
        // Render cameo variants section
        if (groupedRates.cameo.length > 0) {
            const sortedCameos = this.sortCameoVariants(groupedRates.cameo);
            const totalCameoDrops = groupedRates.cameo.reduce((sum, item) => sum + item.total_drops, 0);
            const avgCameoRate = groupedRates.cameo.length > 0 ? 
                (groupedRates.cameo.reduce((sum, item) => sum + (item.drop_rate_percentage || 0), 0) / groupedRates.cameo.length).toFixed(1) : 0;
            
            const partyContext = partyFilter && partyFilter !== 'all' ? ` (Party ${partyFilter})` : '';
            
            html += `
                <div class="cameo-section">
                    <h4>Enchantress' Cameo Variants${partyContext}</h4>
                    <div class="cameo-summary">
                        <span class="cameo-stat">${totalCameoDrops} total drops</span>
                        <span class="cameo-stat">${avgCameoRate}% average rate</span>
                        <span class="cameo-stat">${groupedRates.cameo.length} variants found</span>
                    </div>
                    <div class="cameo-variants-grid">
                        ${sortedCameos.map(item => this.createCameoDropCard(item)).join('')}
                    </div>
                </div>
            `;
        }
        
        if (html === '') {
            const message = partyFilter && partyFilter !== 'all' 
                ? `No item drop data available for Party ${partyFilter} yet.`
                : 'No item drop data available yet.';
            html = `<p class="text-muted">${message}</p>`;
        }
        
        container.innerHTML = html;
    }

    groupItemsByType(items) {
        const grouped = {
            regular: [],
            cameo: []
        };
        
        items.forEach(item => {
            if (item.item_name.includes('Enchantress\' Cameo')) {
                grouped.cameo.push(item);
            } else {
                grouped.regular.push(item);
            }
        });
        
        return grouped;
    }

    sortCameoVariants(cameos) {
        return cameos.sort((a, b) => {
            const aBlessed = a.item_name.includes('Blessed') ? 1 : 0;
            const bBlessed = b.item_name.includes('Blessed') ? 1 : 0;
            
            // Blessed items first
            if (aBlessed !== bBlessed) {
                return bBlessed - aBlessed;
            }
            
            // Then by drop rate
            return (b.drop_rate_percentage || 0) - (a.drop_rate_percentage || 0);
        });
    }

    createItemDropCard(item) {
        const dropRate = item.drop_rate_percentage || 0;
        const rarityClass = dropsComponent.getRarityColorClass(dropRate);
        const rarityLabel = dropsComponent.getRarityDisplay(dropRate);
        
        return `
            <div class="drop-item ${rarityClass}">
                <div class="drop-name">${item.item_name}</div>
                <div class="drop-details">
                    <div class="drop-count">${formatNumber(item.total_drops)} drops</div>
                    <div class="drop-rate">${dropRate}% rate</div>
                </div>
                <div class="drop-rarity">
                    <span class="rarity-badge ${rarityClass}">${rarityLabel}</span>
                </div>
            </div>
        `;
    }

    createCameoDropCard(item) {
        const isBlessed = item.item_name.includes('Blessed');
        const slayerType = dropsComponent.parseSlayerType(item.item_name);
        const dropRate = item.drop_rate_percentage || 0;
        const rarityClass = dropsComponent.getRarityColorClass(dropRate);
        
        return `
            <div class="drop-item cameo-variant ${rarityClass}">
                <div class="drop-name">
                    ${slayerType} Slayer
                    ${isBlessed ? '<span class="blessed-indicator">✓ Blessed</span>' : ''}
                </div>
                <div class="drop-details">
                    <div class="drop-count">${formatNumber(item.total_drops)} drops</div>
                    <div class="drop-rate">${dropRate}% rate</div>
                </div>
            </div>
        `;
    }

    renderRecentActivity() {
        const container = document.getElementById('recentActivity');
        if (!container) return;

        const activity = this.analyticsData.recentActivity || [];
        const partyFilter = this.analyticsData.partyFilter;
        
        if (activity.length === 0) {
            const message = partyFilter && partyFilter !== 'all' 
                ? `No recent activity for Party ${partyFilter} to display.`
                : 'No recent activity to display.';
            container.innerHTML = `<p class="text-muted">${message}</p>`;
            return;
        }
        
        container.innerHTML = activity.map(item => {
            const hasDrops = item.total_drops > 0;
            const runDate = new Date(item.date);
            const isRecent = (Date.now() - runDate.getTime()) < 86400000; // 24 hours
            const partyNumber = item.party_number || 1; // Default to Party 1 for backward compatibility
            
            return `
                <div class="recent-activity-item ${hasDrops ? 'has-drops' : 'no-drops'} ${isRecent ? 'recent' : ''}">
                    <div class="activity-info">
                        <div class="activity-description">
                            <span class="activity-date">${formatDateTime(item.date)}</span>
                            <span class="activity-party">Party ${partyNumber}</span>
                            <span class="activity-participants">${item.participant_count} participants</span>
                            ${hasDrops ? 
                                `<span class="activity-drops success">${item.total_drops} drops</span>` : 
                                `<span class="activity-drops none">No drops</span>`
                            }
                        </div>
                        <div class="activity-details">
                            <div class="participants-list">
                                <strong>Participants:</strong> ${item.participants || 'None recorded'}
                            </div>
                            ${item.drops_details ? 
                                `<div class="drops-list">
                                    <strong>Drops:</strong> ${item.drops_details}
                                </div>` : ''
                            }
                        </div>
                    </div>
                    ${isRecent ? '<div class="recent-badge">Recent</div>' : ''}
                </div>
            `;
        }).join('');
    }

    renderError(message) {
        const containers = [
            'overallStats',
            'characterStats', 
            'itemDropRates',
            'recentActivity'
        ];
        
        containers.forEach(containerId => {
            const container = document.getElementById(containerId);
            if (container) {
                container.innerHTML = `
                    <div class="error-state">
                        <p class="error-message">${message}</p>
                        <button class="btn btn-primary btn-sm" onclick="analyticsComponent.loadAnalytics()">
                            Retry
                        </button>
                    </div>
                `;
            }
        });
    }

    async refreshAnalytics() {
        await this.loadAnalytics();
        showNotification('success', 'Analytics refreshed');
    }

    // Calculate trends (for future enhancements)
    calculateDropTrends() {
        const activity = this.analyticsData.recentActivity || [];
        if (activity.length < 2) return null;
        
        const recent = activity.slice(0, Math.ceil(activity.length / 2));
        const older = activity.slice(Math.ceil(activity.length / 2));
        
        const recentAvg = recent.reduce((sum, item) => sum + (item.total_drops || 0), 0) / recent.length;
        const olderAvg = older.reduce((sum, item) => sum + (item.total_drops || 0), 0) / older.length;
        
        return {
            trend: recentAvg > olderAvg ? 'up' : recentAvg < olderAvg ? 'down' : 'stable',
            change: Math.abs(recentAvg - olderAvg).toFixed(2)
        };
    }

    // Export analytics data (for future enhancements)
    exportAnalytics() {
        const partyContext = this.currentPartyFilter !== 'all' ? `-party-${this.currentPartyFilter}` : '';
        
        const exportData = {
            exported: new Date().toISOString(),
            partyFilter: this.currentPartyFilter,
            overview: this.analyticsData.overview,
            characterStats: this.analyticsData.characterStats,
            itemRates: this.analyticsData.itemRates,
            recentActivity: this.analyticsData.recentActivity
        };
        
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
            type: 'application/json' 
        });
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `shadowguard-analytics${partyContext}-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        const message = this.currentPartyFilter !== 'all' 
            ? `Analytics data for Party ${this.currentPartyFilter} exported`
            : 'Analytics data exported';
        showNotification('success', message);
    }

    // Multi-party specific methods
    async loadPartyComparison() {
        try {
            showLoading(true);
            
            const partyStats = await api.getPartyStats();
            
            // This could render a comparison view in the future
            console.log('Party comparison data:', partyStats);
            
        } catch (error) {
            console.error('Failed to load party comparison:', error);
            showNotification('error', 'Failed to load party comparison data');
        } finally {
            showLoading(false);
        }
    }

    // Get analytics summary for all parties (utility function)
    async getAllPartySummary() {
        try {
            const [allParties, party1, party2, party3] = await Promise.all([
                api.getAllAnalytics('all'),
                api.getAllAnalytics(1),
                api.getAllAnalytics(2),
                api.getAllAnalytics(3)
            ]);

            return {
                overall: allParties.overview,
                party1: party1.overview,
                party2: party2.overview,
                party3: party3.overview
            };
        } catch (error) {
            console.error('Failed to get party summary:', error);
            return null;
        }
    }
}

// Global instance
const analyticsComponent = new AnalyticsComponent();

// Global functions for HTML onclick handlers
function refreshAnalytics() {
    analyticsComponent.refreshAnalytics();
}

function filterAnalytics() {
    analyticsComponent.filterByParty();
}

// Export for use in other modules
window.analyticsComponent = analyticsComponent;