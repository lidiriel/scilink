// Workflows tab functionality
import { workflows, state, panelData } from './state.js';
import { escapeHtml } from './utils.js';
import { createPanelSearch, renderNoResults } from './generic-panel.js';

// Forward declaration for circular dependency
let loadWorkflowFn = null;

export function setLoadWorkflow(fn) {
    loadWorkflowFn = fn;
}

// Initialize workflows search
export function initWorkflowsSearch() {
    createPanelSearch({
        inputId: 'workflows-search',
        onSearch: renderWorkflowList
    });
}

// Load workflows from current experiment
export function loadWorkflowsPanel() {
    renderWorkflowList();
}

// Render workflows with optional filter
export function renderWorkflowList(filter = '') {
    const workflowsList = document.getElementById('workflows-list');
    if (!workflowsList) return;

    workflowsList.innerHTML = '';

    // Check if we have a current experiment selected
    if (!state.currentExperiment) {
        renderNoResults(workflowsList, 'No experiment selected');
        return;
    }

    // Find the current experiment in experimentsData
    const experiment = panelData.experimentsData.find(e => e.id === state.currentExperiment.id);
    if (!experiment || !experiment.workflows) {
        renderNoResults(workflowsList, 'No workflows available');
        return;
    }

    // Get workflows excluding the current one
    const otherWorkflows = experiment.workflows.filter(w => w.id !== state.currentWorkflowId);

    if (otherWorkflows.length === 0) {
        renderNoResults(workflowsList, 'No other workflows in this experiment');
        return;
    }

    const filterLower = filter.toLowerCase().trim();

    // Filter workflows by search term
    const filteredWorkflows = filterLower
        ? otherWorkflows.filter(workflow =>
            workflow.name.toLowerCase().includes(filterLower)
        )
        : otherWorkflows;

    // Render workflows
    filteredWorkflows.forEach(workflow => {
        const workflowEl = document.createElement('div');
        workflowEl.className = 'workflow-panel-item';
        workflowEl.draggable = true;
        workflowEl.innerHTML = `
            <i class="fa-solid fa-diagram-project"></i>
            <span>${escapeHtml(workflow.name)}</span>
        `;

        // Click to switch to workflow
        workflowEl.addEventListener('click', () => {
            switchToWorkflow(workflow.id, workflow.name);
        });

        // Drag to create composite node
        workflowEl.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('application/workflow', JSON.stringify(workflow));
            e.dataTransfer.effectAllowed = 'copy';
            workflowEl.classList.add('dragging');
        });

        workflowEl.addEventListener('dragend', () => {
            workflowEl.classList.remove('dragging');
        });

        workflowsList.appendChild(workflowEl);
    });

    // Show message if no results
    if (filteredWorkflows.length === 0 && filterLower) {
        renderNoResults(workflowsList, 'No workflows found');
    }
}

// Switch to another workflow in the same experiment
export function switchToWorkflow(workflowId, workflowName) {
    // Load the workflow if not already in local data
    if (!workflows[workflowId]) {
        workflows[workflowId] = {
            id: workflowId,
            name: workflowName,
            nodes: [],
            edges: []
        };
    }

    state.breadcrumbs = [{ id: workflowId, name: workflowName }];
    if (loadWorkflowFn) loadWorkflowFn(workflowId);
}
