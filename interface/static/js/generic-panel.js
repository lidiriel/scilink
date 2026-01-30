// Generic Side Panel functionality
import { drawEdges } from './edges.js';

/**
 * Creates and initializes a collapsible side panel
 * @param {Object} config - Panel configuration
 * @param {string} config.panelId - ID of the panel element
 * @param {string} config.toggleId - ID of the toggle button element
 * @param {string} config.storageKey - localStorage key for collapsed state
 * @param {Function} [config.onToggle] - Optional callback when panel is toggled
 * @returns {Object} Panel controller with methods
 */
export function createSidePanel(config) {
    const { panelId, toggleId, storageKey, onToggle } = config;

    const panel = document.getElementById(panelId);
    const toggle = document.getElementById(toggleId);

    if (!panel || !toggle) {
        console.warn(`Side panel elements not found: ${panelId}, ${toggleId}`);
        return null;
    }

    // Load saved state
    const isCollapsed = localStorage.getItem(storageKey) === 'true';
    if (isCollapsed) {
        panel.classList.add('collapsed');
    }

    // Toggle handler
    toggle.addEventListener('click', () => {
        panel.classList.toggle('collapsed');
        localStorage.setItem(storageKey, panel.classList.contains('collapsed'));

        // Redraw edges after animation
        setTimeout(drawEdges, 300);

        // Call optional callback
        if (onToggle) {
            onToggle(panel.classList.contains('collapsed'));
        }
    });

    return {
        panel,
        toggle,
        isCollapsed: () => panel.classList.contains('collapsed'),
        collapse: () => {
            panel.classList.add('collapsed');
            localStorage.setItem(storageKey, 'true');
        },
        expand: () => {
            panel.classList.remove('collapsed');
            localStorage.setItem(storageKey, 'false');
        }
    };
}

/**
 * Creates a search input handler for filtering panel content
 * @param {Object} config - Search configuration
 * @param {string} config.inputId - ID of the search input element
 * @param {Function} config.onSearch - Callback function(filterText) when search changes
 * @returns {Object} Search controller with methods
 */
export function createPanelSearch(config) {
    const { inputId, onSearch } = config;

    const searchInput = document.getElementById(inputId);

    if (!searchInput) {
        console.warn(`Search input not found: ${inputId}`);
        return null;
    }

    searchInput.addEventListener('input', (e) => {
        onSearch(e.target.value);
    });

    return {
        input: searchInput,
        getValue: () => searchInput.value,
        clear: () => {
            searchInput.value = '';
            onSearch('');
        }
    };
}

/**
 * Renders a "no results" message in a panel list
 * @param {HTMLElement} container - The list container element
 * @param {string} message - The message to display
 */
export function renderNoResults(container, message) {
    container.innerHTML = `<div class="side-panel-no-results">${message}</div>`;
}

/**
 * Creates a draggable panel item element
 * @param {Object} config - Item configuration
 * @param {string} config.icon - Font Awesome icon class
 * @param {string} config.label - Display label (will be HTML escaped)
 * @param {Object} config.dragData - Data to set on drag (will be JSON stringified)
 * @param {string} config.dragType - MIME type for drag data (e.g., 'application/json')
 * @param {Function} [config.onClick] - Optional click handler
 * @param {string} [config.className] - Optional additional CSS class
 * @returns {HTMLElement} The created item element
 */
export function createDraggablePanelItem(config) {
    const { icon, label, dragData, dragType, onClick, className = '' } = config;

    const item = document.createElement('div');
    item.className = `side-panel-item ${className}`.trim();
    item.draggable = true;
    item.innerHTML = `
        <i class="${icon}"></i>
        <span>${escapeHtml(label)}</span>
    `;

    // Click handler
    if (onClick) {
        item.addEventListener('click', onClick);
    }

    // Drag handlers
    item.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData(dragType, JSON.stringify(dragData));
        e.dataTransfer.effectAllowed = 'copy';
        item.classList.add('dragging');
    });

    item.addEventListener('dragend', () => {
        item.classList.remove('dragging');
    });

    return item;
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
