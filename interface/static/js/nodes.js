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

    // Create node data with piece info for tracking
    const node = {
        id: nodeId,
        type: 'default',
        pieceType: piece.type || null,  // 'include_block' or null
        label: piece.node_label,
        pieceName: piece.name,
        pieceDirectory: piece.directory || '',
        pieceHash: piece.git_hash || null,
        iconClass: piece.icon_class_name,
        x: Math.max(0, x),
        y: Math.max(0, y)
    };

    // Add to workflow data
    workflow.nodes.push(node);

    // Render the new node
    renderNode(node);
}

// Add a device node to the current workflow
export function addDeviceNodeToWorkflow(device, x, y) {
    const workflow = workflows[state.currentWorkflowId];
    if (!workflow) return;

    // Generate unique ID
    const nodeId = `node_${++state.nodeIdCounter}`;

    // Create device node data
    const node = {
        id: nodeId,
        type: 'device',
        label: device.label,
        deviceId: device.id,
        pieceName: device.piece_name,
        iconClass: device.icon_class,
        deviceMode: device.mode,
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
        iconClass: 'fa-solid:diagram-project',
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

    // Handle unstacking if this node is stacked
    if (state.stackedNodes[nodeId]) {
        const partnerId = state.stackedNodes[nodeId];
        // Remove bidirectional relationship
        delete state.stackedNodes[partnerId];
        delete state.stackedNodes[nodeId];
        // Remove stacking styles from partner
        const partnerEl = state.nodeElements[partnerId]?.element;
        if (partnerEl) {
            partnerEl.classList.remove('stacked-top', 'stacked-bottom');
        }
    }

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

// Find a standard block/device within stacking distance
export function findNearbyStackableNode(x, y) {
    const STACK_THRESHOLD_X = 60;
    const STACK_THRESHOLD_Y = 110;

    for (const [id, nodeInfo] of Object.entries(state.nodeElements)) {
        const node = nodeInfo.data;
        // Skip include_blocks (pieceType) and already-stacked nodes
        if (node.pieceType === 'include_block' || state.stackedNodes[id]) continue;

        const dx = Math.abs(node.x - x);
        const dy = Math.abs(node.y - y);
        if (dx < STACK_THRESHOLD_X && dy < STACK_THRESHOLD_Y) {
            return nodeInfo;
        }
    }
    return null;
}

// Create stacked include_block above target node
export function addStackedIncludeBlock(piece, targetNodeInfo) {
    const workflow = workflows[state.currentWorkflowId];
    if (!workflow) return;

    const targetNode = targetNodeInfo.data;

    // Position include_block directly above target (node height is 50px)
    const x = targetNode.x;
    const y = targetNode.y - 50;

    // Generate unique ID
    const nodeId = `node_${++state.nodeIdCounter}`;

    // Create node data with piece info
    const node = {
        id: nodeId,
        type: 'default',
        pieceType: 'include_block',
        label: piece.node_label,
        pieceName: piece.name,
        pieceDirectory: piece.directory || '',
        pieceHash: piece.git_hash || null,
        iconClass: piece.icon_class_name,
        x: Math.max(0, x),
        y: Math.max(0, y)
    };

    // Add to workflow data
    workflow.nodes.push(node);

    // Render the new node
    renderNode(node);

    // Link the nodes in stackedNodes (bidirectional)
    state.stackedNodes[nodeId] = targetNode.id;
    state.stackedNodes[targetNode.id] = nodeId;

    // Add visual stacking classes
    const topEl = state.nodeElements[nodeId]?.element;
    const bottomEl = targetNodeInfo.element;
    if (topEl) topEl.classList.add('stacked-top');
    if (bottomEl) bottomEl.classList.add('stacked-bottom');
}

// Try to stack nodes after dragging one near another
function tryStackOnDragEnd(node) {
    const STACK_THRESHOLD_X = 60;
    const STACK_THRESHOLD_Y = 110;

    for (const [id, nodeInfo] of Object.entries(state.nodeElements)) {
        if (id === node.id || state.stackedNodes[id]) continue;
        const other = nodeInfo.data;

        const dx = Math.abs(node.x - other.x);
        const dy = Math.abs(node.y - other.y);
        if (dx >= STACK_THRESHOLD_X || dy >= STACK_THRESHOLD_Y) continue;

        // Determine which is include_block (top) and which is standard (bottom)
        let topId, bottomId;
        if (node.pieceType === 'include_block' && other.pieceType !== 'include_block') {
            topId = node.id;
            bottomId = other.id;
        } else if (other.pieceType === 'include_block' && node.pieceType !== 'include_block') {
            topId = other.id;
            bottomId = node.id;
        } else {
            continue; // Both same type, no stacking
        }

        const topNode = state.nodeElements[topId].data;
        const bottomNode = state.nodeElements[bottomId].data;
        const topEl = state.nodeElements[topId].element;
        const bottomEl = state.nodeElements[bottomId].element;

        // Snap positions: include_block directly above standard block
        topNode.x = bottomNode.x;
        topNode.y = bottomNode.y - 50;
        topEl.style.left = `${topNode.x}px`;
        topEl.style.top = `${topNode.y}px`;

        // Register bidirectional stacking
        state.stackedNodes[topId] = bottomId;
        state.stackedNodes[bottomId] = topId;

        // Apply CSS classes
        topEl.classList.add('stacked-top');
        bottomEl.classList.add('stacked-bottom');

        drawEdges();
        return;
    }
}

// Toggle node orientation between horizontal and vertical
export function toggleNodeOrientation(nodeId) {
    const nodeInfo = state.nodeElements[nodeId];
    if (!nodeInfo) return;

    const node = nodeInfo.data;
    const nodeEl = nodeInfo.element;

    // Toggle orientation
    node.orientation = node.orientation === 'vertical' ? 'horizontal' : 'vertical';

    // Update CSS class
    nodeEl.classList.toggle('vertical', node.orientation === 'vertical');

    // Update rotate button icon
    const rotateBtn = nodeEl.querySelector('.node-rotate-btn i');
    if (rotateBtn) {
        rotateBtn.className = node.orientation === 'vertical'
            ? 'fa-solid fa-arrows-left-right'
            : 'fa-solid fa-arrows-up-down';
    }

    // Redraw edges to reflect new port positions
    drawEdges();
}

// Render a single node
export function renderNode(node) {
    const nodeEl = document.createElement('div');
    let nodeClass = 'node';
    if (node.type === 'composite') nodeClass += ' composite';
    if (node.type === 'device') nodeClass += ' device';
    if (node.orientation === 'vertical') nodeClass += ' vertical';
    nodeEl.className = nodeClass;
    nodeEl.style.left = node.x + 'px';
    nodeEl.style.top = node.y + 'px';
    nodeEl.dataset.nodeId = node.id;

    // Get icon class (use default cube if not specified)
    const iconClass = node.iconClass ? convertIconClass(node.iconClass) : 'fa-solid fa-cube';

    // Add device mode indicator for device nodes
    const deviceModeIndicator = node.type === 'device' && node.deviceMode
        ? `<span class="node-device-mode mode-${node.deviceMode}" title="${node.deviceMode}"></span>`
        : '';

    // Rotation button icon based on current orientation
    const rotateIcon = node.orientation === 'vertical'
        ? 'fa-solid fa-arrows-left-right'
        : 'fa-solid fa-arrows-up-down';

    nodeEl.innerHTML = `
        <button class="node-rotate-btn" title="Toggle connector orientation"><i class="${rotateIcon}"></i></button>
        <div class="node-port node-port-input" data-port="input" data-node-id="${node.id}"></div>
        <div class="node-content">
            <i class="node-icon ${iconClass}"></i>
            <div class="node-label">${node.label}</div>
            ${deviceModeIndicator}
        </div>
        <div class="node-port node-port-output" data-port="output" data-node-id="${node.id}"></div>
        <button class="node-delete-btn" title="Delete node"><i class="fa-solid fa-xmark"></i></button>
    `;

    // Rotate button handler
    const rotateBtn = nodeEl.querySelector('.node-rotate-btn');
    rotateBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleNodeOrientation(node.id);
    });

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

        // Move stacked partner node together
        if (state.stackedNodes[node.id]) {
            const partnerId = state.stackedNodes[node.id];
            const partnerInfo = state.nodeElements[partnerId];
            if (partnerInfo) {
                // Use CSS class to determine role (stable, unlike positions)
                const thisIsTop = nodeEl.classList.contains('stacked-top');
                partnerInfo.data.x = node.x;
                partnerInfo.data.y = thisIsTop ? node.y + 50 : node.y - 50;
                partnerInfo.element.style.left = `${partnerInfo.data.x}px`;
                partnerInfo.element.style.top = `${partnerInfo.data.y}px`;
            }
        }

        drawEdges();
    });

    document.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            nodeEl.style.cursor = 'move';

            // Try to stack if this node is not already stacked
            if (!state.stackedNodes[node.id]) {
                tryStackOnDragEnd(node);
            }
        }
    });

    document.getElementById('nodes').appendChild(nodeEl);
    state.nodeElements[node.id] = { element: nodeEl, data: node };
}
