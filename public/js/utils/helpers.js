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
        minute: '2-digit'
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

// Export utilities to global scope
window.formatDate = formatDate;
window.formatDateTime = formatDateTime;
window.formatRelativeTime = formatRelativeTime;
window.formatNumber = formatNumber;
window.formatPercentage = formatPercentage;
window.truncateText = truncateText;
window.capitalizeFirst = capitalizeFirst;
window.groupBy = groupBy;
window.sortBy = sortBy;
window.createElement = createElement;
window.clearElement = clearElement;
window.saveToStorage = saveToStorage;
window.loadFromStorage = loadFromStorage;
window.removeFromStorage = removeFromStorage;
window.calculateDropRate = calculateDropRate;
window.calculateSuccessRate = calculateSuccessRate;
window.findTopPerformers = findTopPerformers;
window.calculateTrends = calculateTrends;
window.validateForm = validateForm;
window.getFormData = getFormData;