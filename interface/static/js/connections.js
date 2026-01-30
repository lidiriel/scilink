// Connection creation between nodes
import { state } from './state.js';
import { createSmoothPath } from './utils.js';
import { addEdge, highlightValidPorts, clearPortHighlights } from './edges.js';

// Get the position of a port relative to viewport (for temp connection line)
export function getPortPosition(nodeId, portType) {
    const nodeInfo = state.nodeElements[nodeId];
    if (!nodeInfo) return { x: 0, y: 0 };

    const node = nodeInfo.data;
    const nodeEl = nodeInfo.element;

    // Use node data coordinates (viewport space)
    const y = node.y + nodeEl.offsetHeight / 2;

    if (portType === 'output') {
        return { x: node.x + nodeEl.offsetWidth, y };
    } else {
        return { x: node.x, y };
    }
}

// Start a connection from a port
export function startConnection(nodeId, portType, event) {
    state.isConnecting = true;
    state.connectionStart = { nodeId, portType };

    const canvas = document.getElementById('canvas');
    const canvasRect = canvas.getBoundingClientRect();

    // Create temporary line
    const svg = document.getElementById('edges');
    state.tempConnectionLine = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    state.tempConnectionLine.setAttribute('class', 'edge temp-edge');
    state.tempConnectionLine.setAttribute('stroke', '#2563eb');
    state.tempConnectionLine.setAttribute('stroke-width', '2');
    state.tempConnectionLine.setAttribute('stroke-dasharray', '5,5');
    state.tempConnectionLine.setAttribute('fill', 'none');
    svg.appendChild(state.tempConnectionLine);

    // Get start position from the port
    const startPos = getPortPosition(nodeId, portType);

    // Update line on mouse move
    const onMouseMove = (e) => {
        if (!state.isConnecting) return;

        // Convert screen coordinates to viewport coordinates
        const endX = (e.clientX - canvasRect.left - state.panX) / state.zoomLevel;
        const endY = (e.clientY - canvasRect.top - state.panY) / state.zoomLevel;

        // Use smooth curve for temp line too
        const d = portType === 'output'
            ? createSmoothPath(startPos.x, startPos.y, endX, endY)
            : createSmoothPath(endX, endY, startPos.x, startPos.y);
        state.tempConnectionLine.setAttribute('d', d);

        // Highlight valid drop targets
        highlightValidPorts(nodeId, portType);
    };

    // Complete or cancel connection on mouse up
    const onMouseUp = (e) => {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);

        // Check if we're over a valid port
        const targetPort = e.target.closest('.node-port');
        if (targetPort && targetPort.dataset.nodeId !== nodeId) {
            const targetNodeId = targetPort.dataset.nodeId;
            const targetPortType = targetPort.dataset.port;

            // Create edge (output -> input)
            if (portType === 'output' && targetPortType === 'input') {
                addEdge(nodeId, targetNodeId);
            } else if (portType === 'input' && targetPortType === 'output') {
                addEdge(targetNodeId, nodeId);
            }
        }

        // Clean up
        if (state.tempConnectionLine) {
            state.tempConnectionLine.remove();
            state.tempConnectionLine = null;
        }
        state.isConnecting = false;
        state.connectionStart = null;
        clearPortHighlights();
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
}
