// Node user inputs modal
import { escapeHtml } from './utils.js';

let currentNode = null;
let currentWorkflowId = null;

// Pieces cache to avoid re-fetching
const piecesCache = {};

export function initNodeInputs() {
    const form = document.getElementById('node-inputs-form');
    const closeBtn = document.getElementById('node-inputs-close');
    const cancelBtn = document.getElementById('node-inputs-cancel');
    const modal = document.getElementById('node-inputs-modal');

    if (!modal) return;

    const backdrop = modal.querySelector('.modal-backdrop');

    if (closeBtn) closeBtn.addEventListener('click', closeNodeInputsModal);
    if (cancelBtn) cancelBtn.addEventListener('click', closeNodeInputsModal);
    if (backdrop) backdrop.addEventListener('click', closeNodeInputsModal);

    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            saveNodeInputs();
        });
    }
}

function closeNodeInputsModal() {
    const modal = document.getElementById('node-inputs-modal');
    if (modal) modal.classList.add('hidden');
    currentNode = null;
    currentWorkflowId = null;
}

export async function openNodeInputsModal(node, workflowId) {
    const modal = document.getElementById('node-inputs-modal');
    const title = document.getElementById('node-inputs-title');
    const nodeIdInput = document.getElementById('node-inputs-node-id');
    const workflowIdInput = document.getElementById('node-inputs-workflow-id');
    const fieldsContainer = document.getElementById('node-inputs-fields');

    if (!modal || !fieldsContainer) return;

    currentNode = node;
    currentWorkflowId = workflowId;
    nodeIdInput.value = node.id;
    workflowIdInput.value = workflowId;
    title.textContent = node.label || 'Node Settings';

    fieldsContainer.innerHTML = '<p class="node-inputs-loading">Loading...</p>';
    modal.classList.remove('hidden');

    // Fetch piece metadata to get user_inputs definition
    const userInputs = await fetchUserInputs(node);

    if (!userInputs || Object.keys(userInputs).length === 0) {
        fieldsContainer.innerHTML = '<p class="node-inputs-empty">No configurable fields for this piece.</p>';
        return;
    }

    // Get existing values from node data
    const existingData = node.data?.user_inputs || {};
    renderInputFields(fieldsContainer, userInputs, existingData);
}

async function fetchUserInputs(node) {
    try {
        if (node.type === 'device' && node.deviceId) {
            // Device node: fetch device info to get piece name and directory
            const deviceRes = await fetch(`/api/devices/${node.deviceId}`);
            if (!deviceRes.ok) return null;
            const device = await deviceRes.json();
            const dir = device.piece_directory;
            const pieceName = device.piece_name;

            const pieces = await fetchPiecesForDir(dir, 'device');
            const piece = pieces.find(p => p.name === pieceName);
            return piece?.user_inputs || null;
        } else if (node.pieceName && node.pieceDirectory) {
            // Block node
            const pieces = await fetchPiecesForDir(node.pieceDirectory, 'block');
            const piece = pieces.find(p => p.name === node.pieceName);
            return piece?.user_inputs || null;
        }
    } catch (error) {
        console.error('Error fetching user inputs:', error);
    }
    return null;
}

async function fetchPiecesForDir(directory, type) {
    const cacheKey = `${type}:${directory}`;
    if (piecesCache[cacheKey]) return piecesCache[cacheKey];

    try {
        const endpoint = type === 'device'
            ? `/api/device-pieces/${directory}`
            : `/api/pieces/${directory}`;
        const response = await fetch(endpoint);
        if (response.ok) {
            const pieces = await response.json();
            piecesCache[cacheKey] = pieces;
            return pieces;
        }
    } catch (error) {
        console.error('Error fetching pieces:', error);
    }
    return [];
}

function renderInputFields(container, userInputs, existingData) {
    container.innerHTML = '';

    for (const [key, field] of Object.entries(userInputs)) {
        const value = existingData[key] ?? field.default ?? '';
        const fieldEl = document.createElement('div');
        fieldEl.className = 'form-group node-input-field';

        // Left side: label + description
        const labelWrap = document.createElement('div');
        labelWrap.className = 'node-input-label';

        const label = document.createElement('label');
        label.setAttribute('for', `node-input-${key}`);
        label.textContent = key;
        labelWrap.appendChild(label);

        if (field.description) {
            const desc = document.createElement('p');
            desc.className = 'node-input-desc';
            desc.textContent = field.description;
            labelWrap.appendChild(desc);
        }

        fieldEl.appendChild(labelWrap);

        // Right side: input + help
        const valueWrap = document.createElement('div');
        valueWrap.className = 'node-input-value';

        let input;

        switch (field.type) {
            case 'boolean':
                input = document.createElement('div');
                input.className = 'node-input-checkbox-wrapper';
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.id = `node-input-${key}`;
                checkbox.name = key;
                checkbox.dataset.fieldType = 'boolean';
                checkbox.checked = value === true || value === 'true';
                const checkLabel = document.createElement('label');
                checkLabel.setAttribute('for', `node-input-${key}`);
                checkLabel.className = 'node-input-checkbox-label';
                checkLabel.textContent = checkbox.checked ? 'ON' : 'OFF';
                checkbox.addEventListener('change', () => {
                    checkLabel.textContent = checkbox.checked ? 'ON' : 'OFF';
                });
                input.appendChild(checkbox);
                input.appendChild(checkLabel);
                break;

            case 'enumeration':
                input = document.createElement('select');
                input.id = `node-input-${key}`;
                input.name = key;
                input.dataset.fieldType = 'enumeration';
                if (field.options) {
                    field.options.forEach(opt => {
                        const option = document.createElement('option');
                        option.value = opt;
                        option.textContent = opt;
                        if (String(value) === String(opt)) option.selected = true;
                        input.appendChild(option);
                    });
                }
                break;

            case 'integer':
                input = document.createElement('input');
                input.type = 'number';
                input.id = `node-input-${key}`;
                input.name = key;
                input.dataset.fieldType = 'integer';
                input.step = '1';
                if (field.minimum !== undefined) input.min = field.minimum;
                if (field.maximum !== undefined) input.max = field.maximum;
                if (value !== '') input.value = value;
                if (field.placeholder) input.placeholder = field.placeholder;
                break;

            case 'number':
            case 'float':
                input = document.createElement('input');
                input.type = 'number';
                input.id = `node-input-${key}`;
                input.name = key;
                input.dataset.fieldType = 'number';
                input.step = 'any';
                if (field.minimum !== undefined) input.min = field.minimum;
                if (field.maximum !== undefined) input.max = field.maximum;
                if (value !== '') input.value = value;
                if (field.placeholder) input.placeholder = field.placeholder;
                break;

            default: // string and others
                input = document.createElement('input');
                input.type = 'text';
                input.id = `node-input-${key}`;
                input.name = key;
                input.dataset.fieldType = 'string';
                input.value = value;
                if (field.placeholder) input.placeholder = field.placeholder;
                break;
        }

        valueWrap.appendChild(input);

        if (field.help) {
            const help = document.createElement('p');
            help.className = 'node-input-help';
            help.textContent = field.help;
            valueWrap.appendChild(help);
        }

        fieldEl.appendChild(valueWrap);
        container.appendChild(fieldEl);
    }
}

function saveNodeInputs() {
    if (!currentNode || !currentWorkflowId) return;

    const fieldsContainer = document.getElementById('node-inputs-fields');
    if (!fieldsContainer) return;

    // Gather values from all fields
    const values = {};
    fieldsContainer.querySelectorAll('[name]').forEach(input => {
        const key = input.name;
        const fieldType = input.dataset.fieldType;

        switch (fieldType) {
            case 'boolean':
                values[key] = input.checked;
                break;
            case 'integer':
                values[key] = input.value !== '' ? parseInt(input.value, 10) : null;
                break;
            case 'number':
                values[key] = input.value !== '' ? parseFloat(input.value) : null;
                break;
            default:
                values[key] = input.value;
                break;
        }
    });

    // Update local node state
    currentNode.data = { ...(currentNode.data || {}), user_inputs: values };
    closeNodeInputsModal();

    // Trigger workflow save to persist to database
    const saveBtn = document.getElementById('save-workflow');
    if (saveBtn) saveBtn.click();
}
