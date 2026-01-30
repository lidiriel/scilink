// Page navigation functionality
import { state } from './state.js';
import { drawEdges } from './edges.js';
import { loadWorkflowsPanel } from './workflows-panel.js';

// Forward declarations for circular dependencies
let loadSettingsFn = null;
let loadExperimentsFn = null;

export function setLoadSettings(fn) {
    loadSettingsFn = fn;
}

export function setLoadExperiments(fn) {
    loadExperimentsFn = fn;
}

// Initialize navigation
export function initNavigation() {
    const navLinks = document.querySelectorAll('.sidebar-link[data-page]');

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = link.dataset.page;
            navigateToPage(page);
        });
    });
}

// Navigate to a page
export function navigateToPage(page) {
    state.currentPage = page;

    // Update nav links
    document.querySelectorAll('.sidebar-link[data-page]').forEach(link => {
        link.classList.toggle('active', link.dataset.page === page);
    });

    // Update page content
    document.querySelectorAll('.page-content').forEach(pageEl => {
        pageEl.classList.toggle('active', pageEl.id === `page-${page}`);
    });

    // Load page-specific data
    if (page === 'settings' && loadSettingsFn) {
        loadSettingsFn();
    } else if (page === 'experiments' && loadExperimentsFn) {
        loadExperimentsFn();
    }

    // Redraw edges and refresh panel when returning to workflows
    if (page === 'workflows') {
        setTimeout(drawEdges, 100);
        loadWorkflowsPanel();
    }
}
