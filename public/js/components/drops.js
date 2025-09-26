// js/components/drops.js - Drop Management Component
class DropsComponent {
    constructor() {
        this.shadowguardItems = [];
    }

    async init() {
        try {
            await this.loadShadowguardItems();
            console.log('Drops component initialized');
        } catch (error) {
            console.error('Failed to initialize drops component:', error);
        }
    }

    async loadShadowguardItems() {
        try {
            this.shadowguardItems = await api.getShadowguardItems();
        } catch (error) {
            console.error('Failed to load Shadowguard items:', error);
            this.shadowguardItems = [];
        }
    }

    // Get item name by ID
    getItemName(itemId) {
        const item = this.shadowguardItems.find(i => i.id === itemId);
        return item ? item.name : 'Unknown Item';
    }

    // Get items by category
    getItemsByCategory(category = null) {
        if (!category) return this.shadowguardItems;
        return this.shadowguardItems.filter(item => item.category === category);
    }

    // Get regular artifacts (non-cameo items)
    getRegularArtifacts() {
        return this.shadowguardItems.filter(item => item.category !== 'cameo');
    }

    // Get cameo variants
    getCameoVariants() {
        return this.shadowguardItems.filter(item => item.category === 'cameo');
    }

    // Get blessed cameo variants
    getBlessedCameos() {
        return this.shadowguardItems.filter(item => 
            item.category === 'cameo' && item.name.includes('Blessed')
        );
    }

    // Get non-blessed cameo variants
    getRegularCameos() {
        return this.shadowguardItems.filter(item => 
            item.category === 'cameo' && !item.name.includes('Blessed')
        );
    }

    // Parse cameo slayer type from name
    parseSlayerType(itemName) {
        const slayerPatterns = [
            /\((\w+)\s+Slayer/i,
            /Cameo\s+\((\w+)\s+Slayer/i,
            /(Demon|Arachnid|Elemental|Repond|Undead|Reptile)/i
        ];
        
        for (const pattern of slayerPatterns) {
            const match = itemName.match(pattern);
            if (match) {
                return match[1];
            }
        }
        
        return 'Unknown';
    }

    // Check if cameo is blessed
    isBlessedCameo(itemName) {
        return itemName.includes('Blessed');
    }

    // Create item options for select dropdowns
    createItemOptions(includeNoOption = true) {
        let options = '';
        
        if (includeNoOption) {
            options += '<option value="">No Drop</option>';
        }
        
        // Group items by category
        const regularItems = this.getRegularArtifacts();
        const cameoItems = this.getCameoVariants();
        
        // Add regular artifacts
        if (regularItems.length > 0) {
            options += '<optgroup label="Artifacts">';
            regularItems.forEach(item => {
                options += `<option value="${item.id}">${item.name}</option>`;
            });
            options += '</optgroup>';
        }
        
        // Add cameo variants
        if (cameoItems.length > 0) {
            // Sort cameos: blessed first, then by slayer type
            const sortedCameos = cameoItems.sort((a, b) => {
                const aBlessed = this.isBlessedCameo(a.name) ? 1 : 0;
                const bBlessed = this.isBlessedCameo(b.name) ? 1 : 0;
                
                // Blessed items first
                if (aBlessed !== bBlessed) {
                    return bBlessed - aBlessed;
                }
                
                // Then by slayer type alphabetically
                const aSlayer = this.parseSlayerType(a.name);
                const bSlayer = this.parseSlayerType(b.name);
                return aSlayer.localeCompare(bSlayer);
            });
            
            options += '<optgroup label="Enchantress\' Cameo Variants">';
            sortedCameos.forEach(item => {
                const slayerType = this.parseSlayerType(item.name);
                const blessed = this.isBlessedCameo(item.name);
                const displayName = `${slayerType} Slayer${blessed ? ' (Blessed)' : ''}`;
                options += `<option value="${item.id}">${displayName}</option>`;
            });
            options += '</optgroup>';
        }
        
        return options;
    }

    // Validate drop data
    validateDrop(dropData) {
        const { runId, characterId, itemId, quantity } = dropData;
        
        if (!runId || !characterId || !itemId) {
            throw new Error('Run, character, and item are required');
        }
        
        const qty = parseInt(quantity) || 1;
        if (qty < 1 || qty > 10) {
            throw new Error('Quantity must be between 1 and 10');
        }
        
        // Verify item exists
        const item = this.shadowguardItems.find(i => i.id == itemId);
        if (!item) {
            throw new Error('Invalid item selected');
        }
        
        return {
            runId: parseInt(runId),
            characterId: parseInt(characterId),
            itemId: parseInt(itemId),
            quantity: qty
        };
    }

    // Add a drop to a run
    async addDrop(dropData) {
        try {
            const validatedData = this.validateDrop(dropData);
            const result = await api.addDrop(validatedData);
            
            const itemName = this.getItemName(validatedData.itemId);
            showNotification('success', `Added ${itemName} drop successfully`);
            
            return result;
        } catch (error) {
            console.error('Failed to add drop:', error);
            showNotification('error', `Failed to add drop: ${error.message}`);
            throw error;
        }
    }

    // Batch add multiple drops for a run
    async addMultipleDrops(runId, drops) {
        try {
            const dropPromises = drops.map(drop => {
                const dropData = {
                    runId,
                    characterId: drop.characterId,
                    itemId: drop.itemId,
                    quantity: drop.quantity || 1
                };
                return this.addDrop(dropData);
            });
            
            await Promise.all(dropPromises);
            showNotification('success', `Added ${drops.length} drops successfully`);
            
        } catch (error) {
            console.error('Failed to add multiple drops:', error);
            showNotification('error', 'Some drops may not have been added');
            throw error;
        }
    }

    // Get drop statistics for an item
    async getItemDropStats(itemId) {
        try {
            const itemRates = await api.getItemDropRates();
            return itemRates.find(rate => rate.item_id === itemId);
        } catch (error) {
            console.error('Failed to get item stats:', error);
            return null;
        }
    }

    // Get character drop statistics
    async getCharacterDropStats(characterId) {
        try {
            const characterStats = await api.getCharacterStats();
            return characterStats.find(stats => stats.character_id === characterId);
        } catch (error) {
            console.error('Failed to get character stats:', error);
            return null;
        }
    }

    // Format drop for display
    formatDropDisplay(drop, includeCharacter = true, includeQuantity = true) {
        const itemName = this.getItemName(drop.itemId || drop.item_id);
        let display = itemName;
        
        if (includeQuantity && drop.quantity && drop.quantity > 1) {
            display += ` x${drop.quantity}`;
        }
        
        if (includeCharacter && drop.characterName) {
            display += ` (${drop.characterName})`;
        }
        
        return display;
    }

    // Get rarity level for an item based on drop rate
    getItemRarity(dropRate) {
        if (dropRate >= 20) return 'common';
        if (dropRate >= 10) return 'uncommon';
        if (dropRate >= 5) return 'rare';
        if (dropRate >= 1) return 'very-rare';
        return 'ultra-rare';
    }

    // Get rarity display text
    getRarityDisplay(dropRate) {
        const rarity = this.getItemRarity(dropRate);
        const rarityMap = {
            'common': 'Common',
            'uncommon': 'Uncommon',
            'rare': 'Rare',
            'very-rare': 'Very Rare',
            'ultra-rare': 'Ultra Rare'
        };
        return rarityMap[rarity] || 'Unknown';
    }

    // Get color class for rarity
    getRarityColorClass(dropRate) {
        const rarity = this.getItemRarity(dropRate);
        return `rarity-${rarity}`;
    }
}

// Global instance
const dropsComponent = new DropsComponent();

// Export for use in other modules
window.dropsComponent = dropsComponent;