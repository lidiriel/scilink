// Main application entry point
import { workflows, state } from './state.js';
import { drawEdges, clearEdgeConnectedClasses } from './edges.js';
import { renderNode, setDrillDown, setLoadWorkflowsPanel } from './nodes.js';
import { initZoomControls, applyViewportTransform, updateZoomDisplay } from './zoom.js';
import { initCanvasDropZone, initKeyboardShortcuts } from './canvas.js';
import { initPiecesSearch, loadPieceDirectories } from './pieces.js';
import { initWorkflowsSearch, loadWorkflowsPanel, setLoadWorkflow } from './workflows-panel.js';
import { createTabbedPanel } from './tabbed-panel.js';
import { initNavigation, navigateToPage, setLoadSettings, setLoadExperiments, setLoadDevices } from './navigation.js';
import { initSettings, loadSettings, editPlatform, deletePlatform } from './settings.js';
import { initDevices, loadDevices, editDevice, deleteDevice, loadSidebarDevices } from './devices.js';
import {
    initExperiments,
    loadExperiments,
    editExperiment,
    deleteExperiment,
    selectExperiment,
    openWorkflow,
    addWorkflowToExperiment,
    runWorkflow,
    editWorkflow,
    deleteWorkflow,
    setLoadWorkflow as setExpLoadWorkflow,
    setUpdateBreadcrumbs
} from './experiments.js';

// ============== Workflow Management ==============

// Load workflow
function loadWorkflow(workflowId) {
    state.currentWorkflowId = workflowId;
    const workflow = workflows[workflowId];

    if (!workflow) return;

    // Reset zoom and pan for new workflow
    state.zoomLevel = 1;
    state.panX = 0;
    state.panY = 0;
    applyViewportTransform();
    updateZoomDisplay();

    // Clear edge selection
    state.selectedEdge = null;
    clearEdgeConnectedClasses();

    // Clear canvas
    document.getElementById('nodes').innerHTML = '';
    document.getElementById('edges').innerHTML = '<defs><marker id="arrowhead" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto"><polygon points="0 0, 10 3, 0 6" fill="#b1b1b7" /></marker></defs>';
    state.nodeElements = {};

    // Render nodes using the shared renderNode function
    workflow.nodes.forEach(node => renderNode(node));

    // Draw edges
    drawEdges();

    // Update breadcrumbs
    updateBreadcrumbs();

    // Update workflows panel
    loadWorkflowsPanel();
}

// Drill down into subflow
function drillDown(subflowId, label) {
    state.breadcrumbs.push({ id: subflowId, name: label });
    loadWorkflow(subflowId);
}

// Update breadcrumbs
function updateBreadcrumbs() {
    const container = document.getElementById('breadcrumbs');
    if (!container) return;

    container.innerHTML = '';

    // Add experiment name first if selected
    if (state.currentExperiment) {
        const expButton = document.createElement('button');
        expButton.textContent = state.currentExperiment.name;
        expButton.style.cssText = `
            padding: 0.25rem 0.75rem;
            border-radius: 0.25rem;
            transition: all 0.2s;
            border: none;
            cursor: pointer;
            background: #7c3aed;
            color: white;
        `;
        expButton.addEventListener('mouseenter', () => {
            expButton.style.background = '#6d28d9';
        });
        expButton.addEventListener('mouseleave', () => {
            expButton.style.background = '#7c3aed';
        });
        expButton.addEventListener('click', () => {
            navigateToPage('experiments');
        });
        container.appendChild(expButton);

        // Add separator after experiment
        const expSeparator = document.createElement('span');
        expSeparator.textContent = '›';
        expSeparator.style.color = '#9ca3af';
        container.appendChild(expSeparator);
    }

    state.breadcrumbs.forEach((crumb, index) => {
        const button = document.createElement('button');
        button.textContent = crumb.name;
        button.style.cssText = `
            padding: 0.25rem 0.75rem;
            border-radius: 0.25rem;
            transition: all 0.2s;
            border: none;
            cursor: pointer;
            ${index === state.breadcrumbs.length - 1
                ? 'background: #2563eb; color: white; font-weight: 600;'
                : 'background: #4b5563; color: white;'}
        `;

        if (index < state.breadcrumbs.length - 1) {
            button.addEventListener('mouseenter', () => {
                button.style.background = '#6b7280';
            });
            button.addEventListener('mouseleave', () => {
                button.style.background = '#4b5563';
            });
        }

        button.addEventListener('click', () => {
            state.breadcrumbs = state.breadcrumbs.slice(0, index + 1);
            loadWorkflow(crumb.id);
        });

        container.appendChild(button);

        if (index < state.breadcrumbs.length - 1) {
            const separator = document.createElement('span');
            separator.textContent = '›';
            separator.style.color = '#9ca3af';
            container.appendChild(separator);
        }
    });
}

// ============== UI Components ==============

// Sidebar (no toggle needed, icon-only mode)
function initSidebar() {
    // Sidebar is now icon-only with tooltips, no toggle needed
}

// Help/Instructions toggle
function initHelpToggle() {
    const helpBtn = document.getElementById('help-toggle');
    const instructionsBox = document.getElementById('instructions-box');

    if (!helpBtn || !instructionsBox) return;

    // Load saved state
    const isHidden = localStorage.getItem('instructionsHidden') === 'true';
    if (isHidden) {
        instructionsBox.classList.add('hidden');
    }

    helpBtn.addEventListener('click', () => {
        instructionsBox.classList.toggle('hidden');
        localStorage.setItem('instructionsHidden', instructionsBox.classList.contains('hidden'));
    });
}

// Initialize canvas toolbar
function initCanvasToolbar() {
    const saveBtn = document.getElementById('save-workflow');

    if (saveBtn) {
        saveBtn.addEventListener('click', () => {
            saveWorkflow();
        });
    }
}

// Save workflow to database
async function saveWorkflow() {
    const workflow = workflows[state.currentWorkflowId];
    if (!workflow) return;

    const saveBtn = document.getElementById('save-workflow');
    if (!saveBtn) return;

    const originalContent = saveBtn.innerHTML;

    // Show saving state
    saveBtn.classList.add('saving');
    saveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i><span>Saving...</span>';

    try {
        // Prepare data for API
        const data = {
            nodes: workflow.nodes.map(n => {
                const nodeData = {
                    id: n.id,
                    type: n.type || 'default',
                    label: n.label,
                    x: n.x,
                    y: n.y
                };
                // Composite node (subworkflow)
                if (n.subflowId) {
                    nodeData.subflowId = n.subflowId;
                }
                // Device node
                if (n.type === 'device' && n.deviceId) {
                    nodeData.deviceId = n.deviceId;
                    nodeData.pieceName = n.pieceName;
                    nodeData.iconClass = n.iconClass;
                }
                // Block node (default type with piece info)
                if (n.type === 'default' && n.pieceName) {
                    nodeData.pieceName = n.pieceName;
                    nodeData.pieceDirectory = n.pieceDirectory;
                    nodeData.pieceHash = n.pieceHash;
                    nodeData.iconClass = n.iconClass;
                }
                return nodeData;
            }),
            edges: workflow.edges.map(e => ({
                id: e.id || `e-${e.from}-${e.to}`,
                from: e.from,
                to: e.to,
                animated: e.animated !== false
            }))
        };

        // Try to update existing workflow, or create if not exists
        let response = await fetch(`/api/workflow/${state.currentWorkflowId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        // If workflow doesn't exist, create it
        if (response.status === 404) {
            response = await fetch('/api/workflow', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: workflow.id,
                    name: workflow.name,
                    parentId: workflow.parentId,
                    ...data
                })
            });
        }

        if (response.ok) {
            // Show success state
            saveBtn.classList.remove('saving');
            saveBtn.classList.add('saved');
            saveBtn.innerHTML = '<i class="fa-solid fa-check"></i><span>Saved!</span>';

            // Reset after 2 seconds
            setTimeout(() => {
                saveBtn.classList.remove('saved');
                saveBtn.innerHTML = originalContent;
            }, 2000);
        } else {
            throw new Error('Failed to save');
        }
    } catch (error) {
        console.error('Error saving workflow:', error);

        // Show error state
        saveBtn.classList.remove('saving');
        saveBtn.innerHTML = '<i class="fa-solid fa-exclamation-triangle"></i><span>Error</span>';
        saveBtn.style.background = '#ef4444';
        saveBtn.style.borderColor = '#ef4444';
        saveBtn.style.color = 'white';

        // Reset after 2 seconds
        setTimeout(() => {
            saveBtn.innerHTML = originalContent;
            saveBtn.style.background = '';
            saveBtn.style.borderColor = '';
            saveBtn.style.color = '';
        }, 2000);
    }
}

// ============== Initialize Application ==============

function init() {
    initCanvasDropZone();
    initZoomControls();
    initKeyboardShortcuts();
}

// Set up circular dependency callbacks
setDrillDown(drillDown);
setLoadWorkflowsPanel(loadWorkflowsPanel);
setLoadWorkflow(loadWorkflow);
setExpLoadWorkflow(loadWorkflow);
setUpdateBreadcrumbs(updateBreadcrumbs);
setLoadSettings(loadSettings);
setLoadExperiments(loadExperiments);
setLoadDevices(loadDevices);

// Expose functions to window for onclick handlers in HTML
window.appFunctions = {
    editPlatform,
    deletePlatform,
    editExperiment,
    deleteExperiment,
    selectExperiment,
    openWorkflow,
    addWorkflowToExperiment,
    runWorkflow,
    editWorkflow,
    deleteWorkflow,
    editDevice,
    deleteDevice
};

// Window resize handler
window.addEventListener('resize', drawEdges);

// Start the app
initSidebar();
initHelpToggle();
initNavigation();
initSettings();
initExperiments();
initDevices();
initCanvasToolbar();

// Initialize tabbed sidebar panel
createTabbedPanel({
    panelId: 'right-sidebar',
    toggleId: 'sidebar-toggle',
    storageKey: 'rightSidebarCollapsed',
    tabStorageKey: 'rightSidebarActiveTab',
    onTabChange: (tabId) => {
        if (tabId === 'installed-devices') {
            loadSidebarDevices();
        }
    }
});

// Initialize tab content
initPiecesSearch();
loadPieceDirectories();
initWorkflowsSearch();
initZoomControls();
init();
