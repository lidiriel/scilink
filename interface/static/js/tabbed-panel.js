// Tabbed Panel functionality
import { drawEdges } from './edges.js';

/**
 * Creates and initializes a tabbed side panel
 * @param {Object} config - Panel configuration
 * @param {string} config.panelId - ID of the panel element
 * @param {string} config.toggleId - ID of the toggle button element
 * @param {string} config.storageKey - localStorage key for collapsed state
 * @param {string} config.tabStorageKey - localStorage key for active tab
 * @param {Function} [config.onTabChange] - Optional callback when tab changes (receives tabId)
 * @returns {Object} Panel controller with methods
 */
export function createTabbedPanel(config) {
    const { panelId, toggleId, storageKey, tabStorageKey, onTabChange } = config;

    const panel = document.getElementById(panelId);
    const toggle = document.getElementById(toggleId);

    if (!panel || !toggle) {
        console.warn(`Tabbed panel elements not found: ${panelId}, ${toggleId}`);
        return null;
    }

    const tabs = panel.querySelectorAll('.side-panel-tab');
    const tabContents = panel.querySelectorAll('.side-panel-tab-content');

    // Load saved collapsed state
    const isCollapsed = localStorage.getItem(storageKey) === 'true';
    if (isCollapsed) {
        panel.classList.add('collapsed');
    }

    // Load saved active tab
    const savedTab = localStorage.getItem(tabStorageKey);
    if (savedTab) {
        switchTab(savedTab);
    }

    // Toggle collapse/expand
    toggle.addEventListener('click', () => {
        panel.classList.toggle('collapsed');
        localStorage.setItem(storageKey, panel.classList.contains('collapsed'));

        // Redraw edges after animation
        setTimeout(drawEdges, 300);
    });

    // Tab click handlers
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabId = tab.dataset.tab;
            switchTab(tabId);
            localStorage.setItem(tabStorageKey, tabId);

            if (onTabChange) {
                onTabChange(tabId);
            }
        });
    });

    function switchTab(tabId) {
        // Update tab buttons
        tabs.forEach(t => {
            t.classList.toggle('active', t.dataset.tab === tabId);
        });

        // Update tab content
        tabContents.forEach(content => {
            const contentTabId = content.id.replace('tab-', '');
            content.classList.toggle('active', contentTabId === tabId);
        });
    }

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
        },
        switchTab,
        getActiveTab: () => {
            const activeTab = panel.querySelector('.side-panel-tab.active');
            return activeTab ? activeTab.dataset.tab : null;
        }
    };
}
