// js/utils/helpers.js - Utility Helper Functions

// Date formatting utilities
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

function formatRelativeTime(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
        const minutes = Math.floor(diffInHours * 60);
        return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
    } else if (diffInHours < 24) {
        const hours = Math.floor(diffInHours);
        return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    } else if (diffInHours < 168) { // 7 days
        const days = Math.floor(diffInHours / 24);
        return `${days} day${days !== 1 ? 's' : ''} ago`;
    } else {
        return formatDate(dateString);
    }
}

// Number formatting utilities
function formatNumber(num) {
    if (num === null || num === undefined) return '0';
    return num.toLocaleString();
}

function formatPercentage(value, total) {
    if (!total || total === 0) return '0%';
    const percentage = (value / total * 100).toFixed(1);
    return `${percentage}%`;
}

// String utilities
function truncateText(text, maxLength = 50) {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
}

function capitalizeFirst(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function slugify(text) {
    return text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-');
}

// Search utilities
function fuzzySearch(query, items, searchFields = ['name']) {
    if (!query || query.length < 2) return items;
    
    const lowerQuery = query.toLowerCase();
    
    return items.filter(item => {
        return searchFields.some(field => {
            const value = item[field];
            if (!value) return false;
            
            const lowerValue = value.toString().toLowerCase();
            
            // Exact match (highest priority)
            if (lowerValue === lowerQuery) return true;
            
            // Starts with query (high priority)
            if (lowerValue.startsWith(lowerQuery)) return true;
            
            // Contains query (medium priority)
            if (lowerValue.includes(lowerQuery)) return true;
            
            // Fuzzy match - check if all query characters exist in order
            let queryIndex = 0;
            for (let i = 0; i < lowerValue.length && queryIndex < lowerQuery.length; i++) {
                if (lowerValue[i] === lowerQuery[queryIndex]) {
                    queryIndex++;
                }
            }
            
            return queryIndex === lowerQuery.length;
        });
    });
}

function highlightText(text, query) {
    if (!query || !text) return text;
    
    const regex = new RegExp(`(${escapeRegExp(query)})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
}

function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Array utilities
function groupBy(array, key) {
    return array.reduce((groups, item) => {
        const groupKey = typeof key === 'function' ? key(item) : item[key];
        if (!groups[groupKey]) {
            groups[groupKey] = [];
        }
        groups[groupKey].push(item);
        return groups;
    }, {});
}

function sortBy(array, key, direction = 'asc') {
    return [...array].sort((a, b) => {
        const aVal = typeof key === 'function' ? key(a) : a[key];
        const bVal = typeof key === 'function' ? key(b) : b[key];
        
        if (direction === 'desc') {
            return bVal > aVal ? 1 : bVal < aVal ? -1 : 0;
        }
        return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
    });
}

function unique(array, key = null) {
    if (!key) {
        return [...new Set(array)];
    }
    
    const seen = new Set();
    return array.filter(item => {
        const keyValue = typeof key === 'function' ? key(item) : item[key];
        if (seen.has(keyValue)) {
            return false;
        }
        seen.add(keyValue);
        return true;
    });
}

// Multi-party specific utilities
function getPartyDisplayName(partyNumber) {
    const party = parseInt(partyNumber);
    if (isNaN(party) || party < 1 || party > 3) {
        return 'Unknown Party';
    }
    return `Party ${party}`;
}

function validatePartyNumber(partyNumber) {
    const party = parseInt(partyNumber);
    if (isNaN(party) || party < 1 || party > 3) {
        return 1; // Default to Party 1
    }
    return party;
}

function getPartyColor(partyNumber) {
    const colors = {
        1: '#4a90e2', // Blue
        2: '#5cb85c', // Green  
        3: '#f0ad4e'  // Orange
    };
    return colors[partyNumber] || colors[1];
}

function getPartyIcon(partyNumber) {
    const icons = {
        1: '①',
        2: '②',
        3: '③'
    };
    return icons[partyNumber] || icons[1];
}

function formatPartyStats(partyData) {
    if (!partyData) return 'No data';
    
    const { participants = 0, drops = 0, runs = 0 } = partyData;
    const parts = [];
    
    if (participants > 0) parts.push(`${participants} participant${participants !== 1 ? 's' : ''}`);
    if (drops > 0) parts.push(`${drops} drop${drops !== 1 ? 's' : ''}`);
    if (runs > 0) parts.push(`${runs} run${runs !== 1 ? 's' : ''}`);
    
    return parts.length > 0 ? parts.join(', ') : 'No activity';
}

function isCharacterInParty(characterId, parties, excludeParty = null) {
    for (let partyNum = 1; partyNum <= 3; partyNum++) {
        if (excludeParty && partyNum === excludeParty) continue;
        if (parties[partyNum] && parties[partyNum].participants.includes(characterId)) {
            return partyNum;
        }
    }
    return false;
}

// DOM utilities
function createElement(tag, attributes = {}, children = []) {
    const element = document.createElement(tag);
    
    Object.entries(attributes).forEach(([key, value]) => {
        if (key === 'className') {
            element.className = value;
        } else if (key === 'innerHTML') {
            element.innerHTML = value;
        } else if (key.startsWith('on')) {
            element.addEventListener(key.substring(2).toLowerCase(), value);
        } else {
            element.setAttribute(key, value);
        }
    });
    
    children.forEach(child => {
        if (typeof child === 'string') {
            element.appendChild(document.createTextNode(child));
        } else if (child instanceof HTMLElement) {
            element.appendChild(child);
        }
    });
    
    return element;
}

function clearElement(element) {
    while (element.firstChild) {
        element.removeChild(element.firstChild);
    }
}

function toggleClass(element, className, force = null) {
    if (force === true) {
        element.classList.add(className);
    } else if (force === false) {
        element.classList.remove(className);
    } else {
        element.classList.toggle(className);
    }
}

// Notification system
function createNotificationContainer() {
    if (document.getElementById('notification-container')) return;
    
    const container = createElement('div', {
        id: 'notification-container',
        className: 'notification-container'
    });
    
    document.body.appendChild(container);
}

// Enhanced notification system
function showNotification(type = 'info', message = '', duration = 5000) {
    createNotificationContainer();
    
    const container = document.getElementById('notification-container');
    const notification = createElement('div', {
        className: `notification notification-${type}`,
        innerHTML: `
            <span class="notification-message">${message}</span>
            <button class="notification-close" onclick="this.parentElement.remove()">&times;</button>
        `
    });
    
    container.appendChild(notification);
    
    // Show with animation
    setTimeout(() => notification.classList.add('show'), 10);
    
    // Auto-hide
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 300);
    }, duration);
}

// Local storage utilities
function saveToStorage(key, data) {
    try {
        localStorage.setItem(`shadowguard_${key}`, JSON.stringify(data));
        return true;
    } catch (error) {
        console.warn('Failed to save to localStorage:', error);
        return false;
    }
}

function loadFromStorage(key, defaultValue = null) {
    try {
        const stored = localStorage.getItem(`shadowguard_${key}`);
        return stored ? JSON.parse(stored) : defaultValue;
    } catch (error) {
        console.warn('Failed to load from localStorage:', error);
        return defaultValue;
    }
}

function removeFromStorage(key) {
    try {
        localStorage.removeItem(`shadowguard_${key}`);
        return true;
    } catch (error) {
        console.warn('Failed to remove from localStorage:', error);
        return false;
    }
}

// Analytics utilities
function calculateDropRate(drops, totalRuns) {
    if (!totalRuns || totalRuns === 0) return 0;
    return ((drops / totalRuns) * 100).toFixed(2);
}

function calculateSuccessRate(successfulRuns, totalRuns) {
    if (!totalRuns || totalRuns === 0) return 0;
    return ((successfulRuns / totalRuns) * 100).toFixed(1);
}

function findTopPerformers(data, metric, limit = 5) {
    return sortBy(data, metric, 'desc').slice(0, limit);
}

function calculateTrends(data, dateField, valueField, periods = 7) {
    const grouped = groupBy(data, item => {
        const date = new Date(item[dateField]);
        return date.toDateString();
    });
    
    const sortedDates = Object.keys(grouped).sort((a, b) => new Date(a) - new Date(b));
    const recentDates = sortedDates.slice(-periods);
    
    return recentDates.map(date => ({
        date,
        value: grouped[date].reduce((sum, item) => sum + (item[valueField] || 0), 0),
        count: grouped[date].length
    }));
}

function calculatePartyComparison(partyStats) {
    const parties = [1, 2, 3];
    const comparison = {};
    
    parties.forEach(partyNum => {
        const stats = partyStats[`party${partyNum}`] || {};
        comparison[partyNum] = {
            runs: stats.total_runs || 0,
            drops: stats.total_drops || 0,
            dropRate: calculateDropRate(stats.total_drops || 0, stats.total_runs || 0),
            avgParticipants: stats.avg_participants || 0
        };
    });
    
    return comparison;
}

// Form utilities
function validateForm(formElement) {
    const requiredFields = formElement.querySelectorAll('[required]');
    let isValid = true;
    
    requiredFields.forEach(field => {
        if (!field.value.trim()) {
            field.classList.add('error');
            isValid = false;
        } else {
            field.classList.remove('error');
        }
    });
    
    return isValid;
}

function getFormData(formElement) {
    const formData = new FormData(formElement);
    const data = {};
    
    for (let [key, value] of formData.entries()) {
        if (data[key]) {
            if (Array.isArray(data[key])) {
                data[key].push(value);
            } else {
                data[key] = [data[key], value];
            }
        } else {
            data[key] = value;
        }
    }
    
    return data;
}

function resetForm(formElement) {
    formElement.reset();
    
    // Remove error classes
    const errorFields = formElement.querySelectorAll('.error');
    errorFields.forEach(field => field.classList.remove('error'));
    
    // Reset custom states
    const customResets = formElement.querySelectorAll('[data-reset]');
    customResets.forEach(element => {
        const resetValue = element.getAttribute('data-reset');
        if (resetValue === 'empty') {
            element.value = '';
        } else if (resetValue === 'placeholder') {
            element.value = element.getAttribute('placeholder') || '';
        }
    });
}

// Debounce utility for search
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Throttle utility for performance
function throttle(func, limit) {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// Export utilities to global scope
window.formatDate = formatDate;
window.formatDateTime = formatDateTime;
window.formatTime = formatTime;
window.formatRelativeTime = formatRelativeTime;
window.formatNumber = formatNumber;
window.formatPercentage = formatPercentage;
window.truncateText = truncateText;
window.capitalizeFirst = capitalizeFirst;
window.slugify = slugify;
window.fuzzySearch = fuzzySearch;
window.highlightText = highlightText;
window.escapeRegExp = escapeRegExp;
window.groupBy = groupBy;
window.sortBy = sortBy;
window.unique = unique;
window.getPartyDisplayName = getPartyDisplayName;
window.validatePartyNumber = validatePartyNumber;
window.getPartyColor = getPartyColor;
window.getPartyIcon = getPartyIcon;
window.formatPartyStats = formatPartyStats;
window.isCharacterInParty = isCharacterInParty;
window.createElement = createElement;
window.clearElement = clearElement;
window.toggleClass = toggleClass;
window.saveToStorage = saveToStorage;
window.loadFromStorage = loadFromStorage;
window.removeFromStorage = removeFromStorage;
window.calculateDropRate = calculateDropRate;
window.calculateSuccessRate = calculateSuccessRate;
window.findTopPerformers = findTopPerformers;
window.calculateTrends = calculateTrends;
window.calculatePartyComparison = calculatePartyComparison;
window.validateForm = validateForm;
window.getFormData = getFormData;
window.resetForm = resetForm;
window.debounce = debounce;
window.throttle = throttle;