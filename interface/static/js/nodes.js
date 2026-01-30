// Node rendering and management
import { workflows, state } from './state.js';
import { convertIconClass } from './utils.js';
import { drawEdges } from './edges.js';
import { startConnection } from './connections.js';

// Forward declarations for circular dependency handling
let drillDownFn = null;
let loadWorkflowsPanelFn = null;

export function setDrillDown(fn) {
    drillDownFn = fn;
}

export function setLoadWorkflowsPanel(fn) {
    loadWorkflowsPanelFn = fn;
}

// Add a new node to the current workflow
export function addNodeToWorkflow(piece, x, y) {
    const workflow = workflows[state.currentWorkflowId];
    if (!workflow) return;

    // Generate unique ID
    const nodeId = `node_${++state.nodeIdCounter}`;

    // Create node data
    const node = {
        id: nodeId,
        type: 'default',
        label: piece.node_label,
        pieceName: piece.name,
        iconClass: piece.icon_class_name,
        x: Math.max(0, x),
        y: Math.max(0, y)
    };

    // Add to workflow data
    workflow.nodes.push(node);

    // Render the new node
    renderNode(node);
}

// Add a composite node (subflow reference) to the current workflow
export function addCompositeNodeToWorkflow(subworkflow, x, y) {
    const workflow = workflows[state.currentWorkflowId];
    if (!workflow) return;

    // Don't allow adding a workflow to itself
    if (subworkflow.id === state.currentWorkflowId) {
        alert('Cannot add a workflow to itself');
        return;
    }

    // Generate unique ID
    const nodeId = `node_${++state.nodeIdCounter}`;

    // Create composite node data
    const node = {
        id: nodeId,
        type: 'composite',
        label: subworkflow.name,
        subflowId: subworkflow.id,
        x: Math.max(0, x),
        y: Math.max(0, y)
    };

    // Add to workflow data
    workflow.nodes.push(node);

    // Render the new node
    renderNode(node);

    // Update the workflows panel (the dropped workflow is no longer in the list)
    if (loadWorkflowsPanelFn) loadWorkflowsPanelFn();
}

// Delete a node and its connected edges
export function deleteNode(nodeId) {
    const workflow = workflows[state.currentWorkflowId];
    if (!workflow) return;

    // Remove the node from workflow data
    const nodeIndex = workflow.nodes.findIndex(n => n.id === nodeId);
    if (nodeIndex === -1) return;

    workflow.nodes.splice(nodeIndex, 1);

    // Remove all edges connected to this node
    workflow.edges = workflow.edges.filter(e => e.from !== nodeId && e.to !== nodeId);

    // Remove from DOM
    if (state.nodeElements[nodeId]) {
        state.nodeElements[nodeId].element.remove();
        delete state.nodeElements[nodeId];
    }

    // Redraw edges
    drawEdges();
}

// Render a single node
export function renderNode(node) {
    const nodeEl = document.createElement('div');
    nodeEl.className = 'node' + (node.type === 'composite' ? ' composite' : '');
    nodeEl.style.left = node.x + 'px';
    nodeEl.style.top = node.y + 'px';
    nodeEl.dataset.nodeId = node.id;

    // Get icon class (use default cube if not specified)
    const iconClass = node.iconClass ? convertIconClass(node.iconClass) : 'fa-solid fa-cube';

    nodeEl.innerHTML = `
        <div class="node-port node-port-input" data-port="input" data-node-id="${node.id}"></div>
        <div class="node-content">
            <i class="node-icon ${iconClass}"></i>
            <div class="node-label">${node.label}</div>
        </div>
        ${node.type === 'composite' ? '<div class="node-hint">Double-click to expand</div>' : ''}
        <div class="node-port node-port-output" data-port="output" data-node-id="${node.id}"></div>
        <button class="node-delete-btn" title="Delete node"><i class="fa-solid fa-xmark"></i></button>
    `;

    // Delete button handler
    const deleteBtn = nodeEl.querySelector('.node-delete-btn');
    deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteNode(node.id);
    });

    // Double-click handler for composite nodes
    if (node.type === 'composite' && node.subflowId) {
        nodeEl.addEventListener('dblclick', () => {
            if (drillDownFn) drillDownFn(node.subflowId, node.label);
        });
    }

    // Connection port handlers
    const outputPort = nodeEl.querySelector('.node-port-output');
    const inputPort = nodeEl.querySelector('.node-port-input');

    outputPort.addEventListener('mousedown', (e) => {
        e.stopPropagation();
        startConnection(node.id, 'output', e);
    });

    inputPort.addEventListener('mousedown', (e) => {
        e.stopPropagation();
        startConnection(node.id, 'input', e);
    });

    // Drag functionality for moving nodes
    let isDragging = false;
    let startX, startY, initialLeft, initialTop;

    nodeEl.addEventListener('mousedown', (e) => {
        if (e.detail === 2) return; // Ignore double-clicks
        if (e.target.classList.contains('node-port')) return; // Ignore port clicks
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        initialLeft = parseInt(nodeEl.style.left);
        initialTop = parseInt(nodeEl.style.top);
        nodeEl.style.cursor = 'grabbing';
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        nodeEl.style.left = (initialLeft + dx) + 'px';
        nodeEl.style.top = (initialTop + dy) + 'px';
        node.x = initialLeft + dx;
        node.y = initialTop + dy;
        drawEdges();
    });

    document.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            nodeEl.style.cursor = 'move';
        }
    });

    document.getElementById('nodes').appendChild(nodeEl);
    state.nodeElements[node.id] = { element: nodeEl, data: node };
}
