// Experiments management
import { workflows, state, panelData } from './state.js';
import { escapeHtml } from './utils.js';
import { navigateToPage } from './navigation.js';

// Forward declarations
let loadWorkflowFn = null;
let updateBreadcrumbsFn = null;

export function setLoadWorkflow(fn) {
    loadWorkflowFn = fn;
}

export function setUpdateBreadcrumbs(fn) {
    updateBreadcrumbsFn = fn;
}

// Initialize experiments
export function initExperiments() {
    const addBtn = document.getElementById('add-experiment-btn');
    const modal = document.getElementById('experiment-modal');
    const form = document.getElementById('experiment-form');
    const closeBtn = document.getElementById('experiment-modal-close');
    const cancelBtn = document.getElementById('experiment-cancel');

    if (!modal) return;

    const backdrop = modal.querySelector('.modal-backdrop');

    // Open modal for new experiment
    if (addBtn) {
        addBtn.addEventListener('click', () => {
            openExperimentModal();
        });
    }

    // Close modal
    if (closeBtn) closeBtn.addEventListener('click', closeExperimentModal);
    if (cancelBtn) cancelBtn.addEventListener('click', closeExperimentModal);
    if (backdrop) backdrop.addEventListener('click', closeExperimentModal);

    // Form submit
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            saveExperiment();
        });
    }
}

function openExperimentModal(experiment = null) {
    const modal = document.getElementById('experiment-modal');
    const title = document.getElementById('experiment-modal-title');
    const idInput = document.getElementById('experiment-id');
    const nameInput = document.getElementById('experiment-name');
    const descInput = document.getElementById('experiment-description');

    if (!modal) return;

    if (experiment) {
        title.textContent = 'Edit Experiment';
        idInput.value = experiment.id;
        nameInput.value = experiment.name;
        descInput.value = experiment.description || '';
    } else {
        title.textContent = 'New Experiment';
        idInput.value = '';
        nameInput.value = '';
        descInput.value = '';
    }

    modal.classList.remove('hidden');
    nameInput.focus();
}

function closeExperimentModal() {
    const modal = document.getElementById('experiment-modal');
    if (modal) modal.classList.add('hidden');
}

export async function loadExperiments() {
    try {
        const response = await fetch('/api/experiments');
        panelData.experimentsData = await response.json();
        renderExperimentsList();
    } catch (error) {
        console.error('Error loading experiments:', error);
    }
}

function renderExperimentsList() {
    const list = document.getElementById('experiments-list');
    if (!list) return;

    if (panelData.experimentsData.length === 0) {
        list.innerHTML = '<div class="settings-empty">No experiments yet. Create your first experiment!</div>';
        return;
    }

    list.innerHTML = panelData.experimentsData.map(experiment => {
        const isSelected = state.currentExperiment && state.currentExperiment.id === experiment.id;
        const workflowsList = experiment.workflows && experiment.workflows.length > 0
            ? `<div class="experiment-workflows">
                <div class="experiment-workflows-header">
                    <i class="fa-solid fa-sitemap"></i>
                    Workflows (${experiment.workflows.length})
                </div>
                <ul class="experiment-workflows-list">
                    ${experiment.workflows.map(wf => `
                        <li class="experiment-workflow-item">
                            <div class="workflow-item-info" onclick="window.appFunctions.openWorkflow(${experiment.id}, '${wf.id}')">
                                <i class="fa-solid fa-diagram-project"></i>
                                <span>${escapeHtml(wf.name)}</span>
                            </div>
                            <button class="workflow-item-run" title="Run workflow" onclick="event.stopPropagation(); window.appFunctions.runWorkflow('${wf.id}')">
                                <i class="fa-solid fa-play"></i>
                            </button>
                            <button class="workflow-item-edit" title="Edit workflow name" onclick="event.stopPropagation(); window.appFunctions.editWorkflow(${experiment.id}, '${wf.id}')">
                                <i class="fa-solid fa-pen"></i>
                            </button>
                            <button class="workflow-item-delete" title="Delete workflow" onclick="event.stopPropagation(); window.appFunctions.deleteWorkflow('${wf.id}')">
                                <i class="fa-solid fa-trash"></i>
                            </button>
                        </li>
                    `).join('')}
                </ul>
                <button class="experiment-add-workflow-btn" onclick="window.appFunctions.addWorkflowToExperiment(${experiment.id})">
                    <i class="fa-solid fa-plus"></i>
                    Add Workflow
                </button>
            </div>`
            : `<div class="experiment-workflows">
                <p class="experiment-no-workflows">No workflows yet</p>
                <button class="experiment-add-workflow-btn" onclick="window.appFunctions.addWorkflowToExperiment(${experiment.id})">
                    <i class="fa-solid fa-plus"></i>
                    Add Workflow
                </button>
            </div>`;

        return `
        <div class="experiment-card ${isSelected ? 'selected' : ''}" data-id="${experiment.id}">
            <div class="experiment-header">
                <div class="experiment-info">
                    <p class="experiment-name">
                        ${isSelected ? '<i class="fa-solid fa-check-circle" style="color: #22c55e; margin-right: 0.5rem;"></i>' : ''}
                        ${escapeHtml(experiment.name)}
                    </p>
                    ${experiment.description ? `<p class="experiment-desc">${escapeHtml(experiment.description)}</p>` : ''}
                </div>
                <div class="experiment-actions">
                    <button class="settings-item-btn ${isSelected ? 'active' : ''}" title="${isSelected ? 'Selected' : 'Select experiment'}" onclick="window.appFunctions.selectExperiment(${experiment.id})">
                        <i class="fa-solid ${isSelected ? 'fa-check' : 'fa-arrow-pointer'}"></i>
                    </button>
                    <button class="settings-item-btn edit" title="Edit" onclick="window.appFunctions.editExperiment(${experiment.id})">
                        <i class="fa-solid fa-pen"></i>
                    </button>
                    <button class="settings-item-btn delete" title="Delete" onclick="window.appFunctions.deleteExperiment(${experiment.id})">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            </div>
            ${workflowsList}
        </div>
    `}).join('');
}

export function editExperiment(id) {
    const experiment = panelData.experimentsData.find(e => e.id === id);
    if (experiment) {
        openExperimentModal(experiment);
    }
}

async function saveExperiment() {
    const idInput = document.getElementById('experiment-id');
    const nameInput = document.getElementById('experiment-name');
    const descInput = document.getElementById('experiment-description');

    const data = {
        name: nameInput.value.trim(),
        description: descInput.value.trim() || null
    };

    try {
        let response;
        if (idInput.value) {
            // Update existing
            response = await fetch(`/api/experiments/${idInput.value}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
        } else {
            // Create new (this will also create a default empty workflow)
            response = await fetch('/api/experiments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
        }

        if (response.ok) {
            closeExperimentModal();
            loadExperiments();
        } else {
            const error = await response.json();
            alert(error.error || 'Failed to save experiment');
        }
    } catch (error) {
        console.error('Error saving experiment:', error);
        alert('Failed to save experiment');
    }
}

export async function deleteExperiment(id) {
    if (!confirm('Are you sure you want to delete this experiment and all its workflows?')) {
        return;
    }

    try {
        const response = await fetch(`/api/experiments/${id}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            loadExperiments();
        } else {
            alert('Failed to delete experiment');
        }
    } catch (error) {
        console.error('Error deleting experiment:', error);
        alert('Failed to delete experiment');
    }
}

export function selectExperiment(experimentId) {
    const experiment = panelData.experimentsData.find(e => e.id === experimentId);
    if (experiment) {
        state.currentExperiment = { id: experiment.id, name: experiment.name };
        renderExperimentsList();
        // Also update breadcrumbs if we're on workflows page
        if (state.currentPage === 'workflows' && updateBreadcrumbsFn) {
            updateBreadcrumbsFn();
        }
    }
}

export async function openWorkflow(experimentId, workflowId) {
    const experiment = panelData.experimentsData.find(e => e.id === experimentId);
    if (!experiment) return;

    const workflow = experiment.workflows.find(w => w.id === workflowId);
    if (!workflow) return;

    // Set as current experiment
    state.currentExperiment = { id: experiment.id, name: experiment.name };

    // Navigate to workflows page
    navigateToPage('workflows');

    // Fetch workflow data from server
    try {
        const response = await fetch(`/api/workflow/${workflowId}`);
        if (response.ok) {
            const data = await response.json();
            // Transform server data to local format
            workflows[workflowId] = {
                id: data.id,
                name: data.name,
                parentId: data.parentId,
                nodes: data.nodes.map(n => ({
                    id: n.id,
                    type: n.type || 'default',
                    label: n.label,
                    subflowId: n.subflowId,
                    deviceId: n.deviceId,
                    deviceMode: n.deviceMode,
                    blockId: n.blockId,
                    pieceName: n.pieceName,
                    pieceDirectory: n.pieceDirectory,
                    pieceHash: n.pieceHash,
                    iconClass: n.iconClass,
                    x: n.x,
                    y: n.y
                })),
                edges: data.edges.map(e => ({
                    from: e.from,
                    to: e.to,
                    animated: e.animated
                }))
            };
        } else {
            // Workflow not found on server, create empty local one
            workflows[workflowId] = {
                id: workflowId,
                name: workflow.name,
                nodes: [],
                edges: []
            };
        }
    } catch (error) {
        console.error('Error loading workflow:', error);
        // Fallback to empty workflow
        workflows[workflowId] = {
            id: workflowId,
            name: workflow.name,
            nodes: [],
            edges: []
        };
    }

    state.breadcrumbs = [{ id: workflowId, name: workflow.name }];
    if (loadWorkflowFn) loadWorkflowFn(workflowId);
}

export async function addWorkflowToExperiment(experimentId) {
    const name = prompt('Enter workflow name:');
    if (!name || !name.trim()) return;

    try {
        const response = await fetch(`/api/experiments/${experimentId}/workflows`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: name.trim() })
        });

        if (response.ok) {
            loadExperiments();
        } else {
            const error = await response.json();
            alert(error.error || 'Failed to add workflow');
        }
    } catch (error) {
        console.error('Error adding workflow:', error);
        alert('Failed to add workflow');
    }
}

export async function runWorkflow(workflowId) {
    try {
        const response = await fetch(`/api/workflow/${workflowId}/run`, {
            method: 'POST'
        });

        if (response.ok) {
            alert('Workflow execution started');
        } else {
            const error = await response.json();
            alert(error.error || 'Failed to run workflow');
        }
    } catch (error) {
        console.error('Error running workflow:', error);
        alert('Failed to run workflow');
    }
}

export async function editWorkflow(experimentId, workflowId) {
    const experiment = panelData.experimentsData.find(e => e.id === experimentId);
    if (!experiment) return;

    const workflow = experiment.workflows.find(w => w.id === workflowId);
    if (!workflow) return;

    const newName = prompt('Enter new workflow name:', workflow.name);
    if (!newName || !newName.trim() || newName.trim() === workflow.name) return;

    try {
        const response = await fetch(`/api/workflow/${workflowId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: newName.trim() })
        });

        if (response.ok) {
            // Update local data
            workflow.name = newName.trim();
            loadExperiments();
        } else {
            const error = await response.json();
            alert(error.error || 'Failed to rename workflow');
        }
    } catch (error) {
        console.error('Error editing workflow:', error);
        alert('Failed to rename workflow');
    }
}

export async function deleteWorkflow(workflowId) {
    if (!confirm('Are you sure you want to delete this workflow?')) {
        return;
    }

    try {
        const response = await fetch(`/api/workflow/${workflowId}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            // Remove from local cache if exists
            if (workflows[workflowId]) {
                delete workflows[workflowId];
            }
            loadExperiments();
        } else {
            alert('Failed to delete workflow');
        }
    } catch (error) {
        console.error('Error deleting workflow:', error);
        alert('Failed to delete workflow');
    }
}

export function openExperimentWorkflows(experimentId) {
    const experiment = panelData.experimentsData.find(e => e.id === experimentId);
    if (experiment && experiment.workflows && experiment.workflows.length > 0) {
        // Open the first workflow
        openWorkflow(experimentId, experiment.workflows[0].id);
    }
}
