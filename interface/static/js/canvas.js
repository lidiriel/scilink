// Canvas drop zone and keyboard shortcuts
import { state } from './state.js';
import { deselectEdge, deleteEdge } from './edges.js';
import { addNodeToWorkflow, addCompositeNodeToWorkflow, addDeviceNodeToWorkflow } from './nodes.js';

// Initialize canvas as drop zone for pieces
export function initCanvasDropZone() {
    const canvas = document.getElementById('canvas');
    if (!canvas) return;

    // Click on canvas to deselect edges
    canvas.addEventListener('click', (e) => {
        // Deselect if clicking on canvas, viewport, nodes container, or edges SVG (but not on actual edge elements)
        const isCanvasArea = e.target === canvas ||
                             e.target.id === 'canvas-viewport' ||
                             e.target.id === 'nodes' ||
                             e.target.id === 'edges';
        if (isCanvasArea) {
            deselectEdge();
        }
    });

    canvas.addEventListener('dragover', (e) => {
        e.preventDefault();
        canvas.classList.add('drag-over');
    });

    canvas.addEventListener('dragleave', () => {
        canvas.classList.remove('drag-over');
    });

    canvas.addEventListener('drop', (e) => {
        e.preventDefault();
        canvas.classList.remove('drag-over');

        const canvasRect = canvas.getBoundingClientRect();

        // Calculate drop position relative to canvas, accounting for zoom and pan
        const x = (e.clientX - canvasRect.left - state.panX) / state.zoomLevel - 75;
        const y = (e.clientY - canvasRect.top - state.panY) / state.zoomLevel - 25;

        // Check if it's a workflow drop (composite node)
        const workflowData = e.dataTransfer.getData('application/workflow');
        if (workflowData) {
            const workflow = JSON.parse(workflowData);
            addCompositeNodeToWorkflow(workflow, x, y);
            return;
        }

        // Check if it's a device drop
        const deviceData = e.dataTransfer.getData('application/device');
        if (deviceData) {
            const device = JSON.parse(deviceData);
            addDeviceNodeToWorkflow(device, x, y);
            return;
        }

        // Check if it's a piece drop
        const pieceData = e.dataTransfer.getData('application/json');
        if (pieceData) {
            const piece = JSON.parse(pieceData);
            addNodeToWorkflow(piece, x, y);
        }
    });
}

// Initialize keyboard shortcuts
export function initKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // Delete selected edge with Delete or Backspace key
        if ((e.key === 'Delete' || e.key === 'Backspace') && state.selectedEdge) {
            // Don't delete if focus is on an input field
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                return;
            }
            e.preventDefault();
            deleteEdge(state.selectedEdge.index);
        }
    });
}
