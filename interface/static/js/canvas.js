// Canvas drop zone and keyboard shortcuts
import { state } from './state.js';
import { deselectEdge, deleteEdge } from './edges.js';
import { addNodeToWorkflow, addCompositeNodeToWorkflow, addDeviceNodeToWorkflow } from './nodes.js';
import { applyViewportTransform } from './zoom.js';

// Initialize canvas as drop zone for pieces
export function initCanvasDropZone() {
    const canvas = document.getElementById('canvas');
    if (!canvas) return;

    // Left-click panning
    initLeftClickPan(canvas);

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

// Initialize left-click panning on canvas
function initLeftClickPan(canvas) {
    let isPanning = false;
    let couldPan = false;
    let startX = 0;
    let startY = 0;
    let startPanX = 0;
    let startPanY = 0;

    const PAN_THRESHOLD = 5; // Minimum movement to start panning

    // Helper to check if click is on an interactive element
    function isOnInteractiveElement(target) {
        return target.closest('.node, .edge-path, .zoom-controls, button, input, select') !== null;
    }

    canvas.addEventListener('pointerdown', (e) => {
        // Left mouse button (button === 0) and not on interactive elements
        if (e.button === 0 && !isOnInteractiveElement(e.target)) {
            couldPan = true;
            startX = e.clientX;
            startY = e.clientY;
            startPanX = state.panX;
            startPanY = state.panY;
        }
    });

    canvas.addEventListener('pointermove', (e) => {
        if (!couldPan && !isPanning) return;

        const dx = e.clientX - startX;
        const dy = e.clientY - startY;

        // Start panning only after threshold movement
        if (!isPanning && (Math.abs(dx) > PAN_THRESHOLD || Math.abs(dy) > PAN_THRESHOLD)) {
            isPanning = true;
            couldPan = false;
            canvas.style.cursor = 'grabbing';
            canvas.setPointerCapture(e.pointerId);
        }

        if (isPanning) {
            state.panX = startPanX + dx;
            state.panY = startPanY + dy;
            applyViewportTransform();
        }
    });

    canvas.addEventListener('pointerup', (e) => {
        if (isPanning) {
            isPanning = false;
            canvas.style.cursor = '';
            canvas.releasePointerCapture(e.pointerId);
        }
        couldPan = false;
    });

    canvas.addEventListener('pointercancel', () => {
        isPanning = false;
        couldPan = false;
        canvas.style.cursor = '';
    });
}
