// Edge drawing, selection, and management
import { workflows, state, ZOOM_MIN, ZOOM_MAX } from './state.js';
import { createSmoothPathMixed } from './utils.js';

// Get output port position for a node based on its orientation
function getOutputPortPosition(node, element) {
    if (node.orientation === 'vertical') {
        // Vertical: output at bottom center
        return {
            x: node.x + element.offsetWidth / 2,
            y: node.y + element.offsetHeight
        };
    }
    // Horizontal: output at right center
    return {
        x: node.x + element.offsetWidth,
        y: node.y + element.offsetHeight / 2
    };
}

// Get input port position for a node based on its orientation
function getInputPortPosition(node, element) {
    if (node.orientation === 'vertical') {
        // Vertical: input at top center
        return {
            x: node.x + element.offsetWidth / 2,
            y: node.y
        };
    }
    // Horizontal: input at left center
    return {
        x: node.x,
        y: node.y + element.offsetHeight / 2
    };
}

// Create edge path with proper exit/entry directions based on port orientation
function createEdgePath(x1, y1, x2, y2, fromOrientation, toOrientation) {
    // Determine direction based on node orientation
    // Horizontal nodes: output exits right, input enters from left
    // Vertical nodes: output exits down, input enters from top
    const fromDir = fromOrientation === 'vertical' ? 'vertical' : 'horizontal';
    const toDir = toOrientation === 'vertical' ? 'vertical' : 'horizontal';
    return createSmoothPathMixed(x1, y1, x2, y2, fromDir, toDir);
}

// Draw all edges for current workflow
export function drawEdges() {
    const workflow = workflows[state.currentWorkflowId];
    if (!workflow) return;

    const svg = document.getElementById('edges');
    if (!svg) return;

    // Clear existing edges (keep defs)
    const defs = svg.querySelector('defs');
    svg.innerHTML = '';
    if (defs) svg.appendChild(defs);

    workflow.edges.forEach((edge, index) => {
        const fromNode = state.nodeElements[edge.from];
        const toNode = state.nodeElements[edge.to];

        if (!fromNode || !toNode) return;

        // Use node data coordinates directly (works with zoom since SVG is inside viewport)
        const fromEl = fromNode.element;
        const toEl = toNode.element;

        // Get port positions based on node orientation
        const fromPos = getOutputPortPosition(fromNode.data, fromEl);
        const toPos = getInputPortPosition(toNode.data, toEl);

        const x1 = fromPos.x;
        const y1 = fromPos.y;
        const x2 = toPos.x;
        const y2 = toPos.y;

        // Create edge group for path and handles
        const edgeGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        edgeGroup.setAttribute('class', 'edge-group');
        edgeGroup.dataset.edgeIndex = index;

        // Create the main edge path
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        const d = createEdgePath(x1, y1, x2, y2, fromNode.data.orientation, toNode.data.orientation);
        path.setAttribute('d', d);
        path.setAttribute('class', 'edge animated');

        // Create invisible wider path for easier clicking
        const hitArea = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        hitArea.setAttribute('d', d);
        hitArea.setAttribute('class', 'edge-hit-area');
        hitArea.setAttribute('stroke', 'transparent');
        hitArea.setAttribute('stroke-width', '15');
        hitArea.setAttribute('fill', 'none');
        hitArea.style.cursor = 'pointer';

        // Check if this edge is selected
        const isSelected = state.selectedEdge &&
            state.selectedEdge.from === edge.from &&
            state.selectedEdge.to === edge.to;
        if (isSelected) {
            path.classList.add('selected');
        }

        // Click handler to select/deselect edge
        hitArea.addEventListener('click', (e) => {
            e.stopPropagation();
            selectEdge(edge, index);
        });

        edgeGroup.appendChild(hitArea);
        edgeGroup.appendChild(path);

        // Add handles if edge is selected
        if (isSelected) {
            // Source handle (at the start of the edge)
            const sourceHandle = createEdgeHandle(x1, y1, 'source', edge, index);
            edgeGroup.appendChild(sourceHandle);

            // Target handle (at the end of the edge)
            const targetHandle = createEdgeHandle(x2, y2, 'target', edge, index);
            edgeGroup.appendChild(targetHandle);
        }

        svg.appendChild(edgeGroup);
    });
}

// Create a draggable handle for edge reconnection
function createEdgeHandle(x, y, handleType, edge, edgeIndex) {
    const handle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    handle.setAttribute('cx', x);
    handle.setAttribute('cy', y);
    handle.setAttribute('r', '8');
    handle.setAttribute('class', 'edge-handle');
    handle.dataset.handleType = handleType;
    handle.style.cursor = 'grab';

    handle.addEventListener('mousedown', (e) => {
        e.stopPropagation();
        startEdgeReconnection(edge, edgeIndex, handleType);
    });

    return handle;
}

// Select an edge
export function selectEdge(edge, index) {
    // Clear previous edge-connected classes
    clearEdgeConnectedClasses();

    if (state.selectedEdge && state.selectedEdge.from === edge.from && state.selectedEdge.to === edge.to) {
        // Deselect if clicking on already selected edge
        state.selectedEdge = null;
        document.body.classList.remove('edge-selected');
    } else {
        state.selectedEdge = { from: edge.from, to: edge.to, index };
        document.body.classList.add('edge-selected');
        // Add edge-connected class to source and target nodes
        markEdgeConnectedNodes(edge.from, edge.to);
    }
    drawEdges();
}

// Mark nodes connected to the selected edge
function markEdgeConnectedNodes(fromId, toId) {
    if (state.nodeElements[fromId]) {
        state.nodeElements[fromId].element.classList.add('edge-connected');
    }
    if (state.nodeElements[toId]) {
        state.nodeElements[toId].element.classList.add('edge-connected');
    }
}

// Clear edge-connected classes from all nodes
export function clearEdgeConnectedClasses() {
    document.querySelectorAll('.node.edge-connected').forEach(node => {
        node.classList.remove('edge-connected');
    });
}

// Deselect edge when clicking on canvas
export function deselectEdge() {
    if (state.selectedEdge && !state.isReconnecting) {
        state.selectedEdge = null;
        document.body.classList.remove('edge-selected');
        clearEdgeConnectedClasses();
        drawEdges();
    }
}

// Delete an edge
export function deleteEdge(edgeIndex) {
    const workflow = workflows[state.currentWorkflowId];
    if (!workflow || edgeIndex < 0 || edgeIndex >= workflow.edges.length) return;

    workflow.edges.splice(edgeIndex, 1);
    state.selectedEdge = null;
    document.body.classList.remove('edge-selected');
    clearEdgeConnectedClasses();
    drawEdges();
}

// Add an edge between two nodes
export function addEdge(fromNodeId, toNodeId) {
    const workflow = workflows[state.currentWorkflowId];
    if (!workflow) return;

    // Check if edge already exists
    const exists = workflow.edges.some(e => e.from === fromNodeId && e.to === toNodeId);
    if (exists) return;

    // Add edge
    workflow.edges.push({ from: fromNodeId, to: toNodeId });
    drawEdges();
}

// Start edge reconnection drag
function startEdgeReconnection(edge, edgeIndex, handleType) {
    state.isReconnecting = true;
    state.reconnectEnd = handleType;

    const canvas = document.getElementById('canvas');
    const canvasRect = canvas.getBoundingClientRect();
    const svg = document.getElementById('edges');

    // Create temporary reconnection line
    state.tempConnectionLine = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    state.tempConnectionLine.setAttribute('class', 'edge temp-edge');
    state.tempConnectionLine.setAttribute('stroke', '#2563eb');
    state.tempConnectionLine.setAttribute('stroke-width', '2');
    state.tempConnectionLine.setAttribute('stroke-dasharray', '5,5');
    state.tempConnectionLine.setAttribute('fill', 'none');
    state.tempConnectionLine.style.pointerEvents = 'none';
    svg.appendChild(state.tempConnectionLine);

    // Get the fixed end position based on node orientation
    const fixedNodeId = handleType === 'source' ? edge.to : edge.from;
    const fixedNode = state.nodeElements[fixedNodeId];
    const fixedEl = fixedNode.element;
    const fixedPos = handleType === 'source'
        ? getInputPortPosition(fixedNode.data, fixedEl)
        : getOutputPortPosition(fixedNode.data, fixedEl);
    const fixedX = fixedPos.x;
    const fixedY = fixedPos.y;
    const fixedDir = fixedNode.data.orientation === 'vertical' ? 'vertical' : 'horizontal';

    // Highlight compatible ports
    highlightPortsForReconnection(handleType);

    // Disable pointer events on all edge handles during drag
    document.querySelectorAll('.edge-handle, .edge-delete-btn').forEach(el => {
        el.style.pointerEvents = 'none';
    });

    const onMouseMove = (e) => {
        if (!state.isReconnecting) return;

        const endX = (e.clientX - canvasRect.left - state.panX) / state.zoomLevel;
        const endY = (e.clientY - canvasRect.top - state.panY) / state.zoomLevel;

        // Use horizontal for mouse cursor end, fixed node orientation for fixed end
        const d = handleType === 'source'
            ? createSmoothPathMixed(endX, endY, fixedX, fixedY, 'horizontal', fixedDir)
            : createSmoothPathMixed(fixedX, fixedY, endX, endY, fixedDir, 'horizontal');

        state.tempConnectionLine.setAttribute('d', d);
    };

    const onMouseUp = (e) => {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);

        // Temporarily hide SVG elements to detect what's underneath
        const svgEl = document.getElementById('edges');
        const originalPointerEvents = svgEl.style.pointerEvents;
        svgEl.style.pointerEvents = 'none';

        // Check if we dropped on a valid port
        const target = document.elementFromPoint(e.clientX, e.clientY);

        // Restore SVG pointer events
        svgEl.style.pointerEvents = originalPointerEvents;

        if (state.tempConnectionLine) {
            state.tempConnectionLine.remove();
            state.tempConnectionLine = null;
        }

        clearPortHighlights();

        if (target && target.classList.contains('node-port')) {
            const targetNodeId = target.dataset.nodeId;
            const targetPortType = target.dataset.port;

            // Validate connection
            const isValidConnection = handleType === 'source'
                ? targetPortType === 'output' && targetNodeId !== edge.to
                : targetPortType === 'input' && targetNodeId !== edge.from;

            if (isValidConnection) {
                // Update the edge
                const workflow = workflows[state.currentWorkflowId];
                if (handleType === 'source') {
                    workflow.edges[edgeIndex].from = targetNodeId;
                    state.selectedEdge.from = targetNodeId;
                } else {
                    workflow.edges[edgeIndex].to = targetNodeId;
                    state.selectedEdge.to = targetNodeId;
                }
            }
        }

        state.isReconnecting = false;
        state.reconnectEnd = null;
        drawEdges();
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
}

// Highlight ports that are valid for reconnection
function highlightPortsForReconnection(handleType) {
    const portType = handleType === 'source' ? 'output' : 'input';
    document.querySelectorAll(`.node-port-${portType}`).forEach(port => {
        port.classList.add('port-highlight');
    });
}

// Clear port highlights
export function clearPortHighlights() {
    document.querySelectorAll('.node-port.port-highlight').forEach(port => {
        port.classList.remove('port-highlight');
    });
}

// Highlight valid connection ports
export function highlightValidPorts(sourceNodeId, sourcePortType) {
    // Clear previous highlights
    clearPortHighlights();

    // Highlight opposite port type on other nodes
    const targetPortClass = sourcePortType === 'output' ? 'node-port-input' : 'node-port-output';

    Object.keys(state.nodeElements).forEach(nodeId => {
        if (nodeId !== sourceNodeId) {
            const nodeEl = state.nodeElements[nodeId].element;
            const port = nodeEl.querySelector(`.${targetPortClass}`);
            if (port) {
                port.classList.add('port-highlight');
            }
        }
    });
}
