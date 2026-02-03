// Zoom, pan, and layout functionality
import { workflows, state, ZOOM_MIN, ZOOM_MAX, ZOOM_STEP } from './state.js';
import { drawEdges } from './edges.js';

// Initialize zoom controls
export function initZoomControls() {
    const zoomInBtn = document.getElementById('zoom-in');
    const zoomOutBtn = document.getElementById('zoom-out');
    const zoomFitBtn = document.getElementById('zoom-fit');
    const autoLayoutBtn = document.getElementById('auto-layout');

    if (zoomInBtn) {
        zoomInBtn.addEventListener('click', () => {
            setZoom(state.zoomLevel + ZOOM_STEP);
        });
    }

    if (zoomOutBtn) {
        zoomOutBtn.addEventListener('click', () => {
            setZoom(state.zoomLevel - ZOOM_STEP);
        });
    }

    if (zoomFitBtn) {
        zoomFitBtn.addEventListener('click', () => {
            fitToView();
        });
    }

    if (autoLayoutBtn) {
        autoLayoutBtn.addEventListener('click', () => {
            autoLayoutNodes();
        });
    }

    // Mouse wheel zoom
    const canvas = document.getElementById('canvas');
    if (canvas) {
        canvas.addEventListener('wheel', (e) => {
            if (e.ctrlKey) {
                e.preventDefault();
                const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
                setZoom(state.zoomLevel + delta);
            }
        }, { passive: false });
    }
}

// Set zoom level
export function setZoom(level) {
    state.zoomLevel = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, level));
    applyViewportTransform();
    updateZoomDisplay();
}

// Apply transform to viewport
export function applyViewportTransform() {
    const viewport = document.getElementById('canvas-viewport');
    if (viewport) {
        viewport.style.transform = `translate(${state.panX}px, ${state.panY}px) scale(${state.zoomLevel})`;
    }
    drawEdges();
}

// Update zoom level display
export function updateZoomDisplay() {
    const zoomLevelEl = document.getElementById('zoom-level');
    if (zoomLevelEl) {
        zoomLevelEl.textContent = Math.round(state.zoomLevel * 100) + '%';
    }
}

// Fit all nodes in view
export function fitToView() {
    const workflow = workflows[state.currentWorkflowId];
    if (!workflow || workflow.nodes.length === 0) {
        setZoom(1);
        state.panX = 0;
        state.panY = 0;
        applyViewportTransform();
        return;
    }

    const canvas = document.getElementById('canvas');
    if (!canvas) return;

    const canvasRect = canvas.getBoundingClientRect();
    const padding = 50;

    // Calculate bounding box of all nodes
    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;

    workflow.nodes.forEach(node => {
        const nodeEl = state.nodeElements[node.id]?.element;
        if (nodeEl) {
            const width = nodeEl.offsetWidth || 150;
            const height = nodeEl.offsetHeight || 50;
            minX = Math.min(minX, node.x);
            minY = Math.min(minY, node.y);
            maxX = Math.max(maxX, node.x + width);
            maxY = Math.max(maxY, node.y + height);
        }
    });

    if (minX === Infinity) {
        setZoom(1);
        return;
    }

    // Calculate required zoom to fit
    const contentWidth = maxX - minX + padding * 2;
    const contentHeight = maxY - minY + padding * 2;

    const scaleX = canvasRect.width / contentWidth;
    const scaleY = canvasRect.height / contentHeight;
    const newZoom = Math.min(scaleX, scaleY, 1); // Don't zoom in beyond 100%

    // Calculate pan to center content
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    state.panX = (canvasRect.width / 2) - (centerX * newZoom);
    state.panY = (canvasRect.height / 2) - (centerY * newZoom);

    state.zoomLevel = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, newZoom));
    applyViewportTransform();
    updateZoomDisplay();
}

// Auto-layout nodes in a clean arrangement
export function autoLayoutNodes() {
    const workflow = workflows[state.currentWorkflowId];
    if (!workflow || workflow.nodes.length === 0) return;

    const nodes = workflow.nodes;
    const edges = workflow.edges;

    // Build adjacency lists
    const outgoing = {}; // node -> nodes it points to
    const incoming = {}; // node -> nodes that point to it

    nodes.forEach(n => {
        outgoing[n.id] = [];
        incoming[n.id] = [];
    });

    edges.forEach(e => {
        if (outgoing[e.from] && incoming[e.to]) {
            outgoing[e.from].push(e.to);
            incoming[e.to].push(e.from);
        }
    });

    // Assign levels using topological sort (BFS from roots)
    const levels = {};
    const nodeSet = new Set(nodes.map(n => n.id));

    // Find root nodes (no incoming edges)
    let roots = nodes.filter(n => incoming[n.id].length === 0).map(n => n.id);

    // If no roots (cyclic graph), start with first node
    if (roots.length === 0) {
        roots = [nodes[0].id];
    }

    // BFS to assign levels
    const queue = roots.map(id => ({ id, level: 0 }));
    const visited = new Set();

    while (queue.length > 0) {
        const { id, level } = queue.shift();

        if (visited.has(id)) {
            // Update level if we found a longer path
            levels[id] = Math.max(levels[id] || 0, level);
        } else {
            visited.add(id);
            levels[id] = level;
        }

        outgoing[id].forEach(nextId => {
            if (!visited.has(nextId) || levels[nextId] < level + 1) {
                queue.push({ id: nextId, level: level + 1 });
            }
        });
    }

    // Assign level 0 to any unvisited nodes
    nodes.forEach(n => {
        if (levels[n.id] === undefined) {
            levels[n.id] = 0;
        }
    });

    // Group nodes by level
    const levelGroups = {};
    nodes.forEach(n => {
        const lvl = levels[n.id];
        if (!levelGroups[lvl]) levelGroups[lvl] = [];
        levelGroups[lvl].push(n);
    });

    // Layout parameters (based on fixed node size: 150x50)
    const nodeWidth = 150;
    const nodeHeight = 50;
    const horizontalGap = 80;  // Gap between columns
    const verticalGap = 30;    // Gap between nodes in same column
    const horizontalSpacing = nodeWidth + horizontalGap;
    const verticalSpacing = nodeHeight + verticalGap;
    const startX = 50;
    const startY = 50;

    // Identify stacked top nodes (include_blocks that sit on top of another node)
    // These should not be laid out independently — they follow their partner
    const stackedTopIds = new Set();
    for (const [id] of Object.entries(state.stackedNodes)) {
        const nodeInfo = state.nodeElements[id];
        if (nodeInfo && nodeInfo.element.classList.contains('stacked-top')) {
            stackedTopIds.add(id);
        }
    }

    // Remove stacked-top nodes from level groups (they follow their partner)
    for (const lvl in levelGroups) {
        levelGroups[lvl] = levelGroups[lvl].filter(n => !stackedTopIds.has(n.id));
    }

    // Position nodes
    const sortedLevels = Object.keys(levelGroups).map(Number).sort((a, b) => a - b);

    sortedLevels.forEach((level, levelIndex) => {
        const nodesInLevel = levelGroups[level];
        const x = startX + levelIndex * horizontalSpacing;

        // Calculate height accounting for stacked pairs (bottom node + top node = 2 * nodeHeight)
        let totalHeight = 0;
        nodesInLevel.forEach((node, i) => {
            const hasStackedTop = state.stackedNodes[node.id] && !stackedTopIds.has(node.id);
            totalHeight += hasStackedTop ? nodeHeight * 2 : nodeHeight;
            if (i > 0) totalHeight += verticalGap;
        });

        const canvas = document.getElementById('canvas');
        const canvasHeight = canvas ? canvas.getBoundingClientRect().height : 600;
        const startYForLevel = Math.max(startY, (canvasHeight - totalHeight) / 2);

        let currentY = startYForLevel;
        nodesInLevel.forEach((node) => {
            const hasStackedTop = state.stackedNodes[node.id] && !stackedTopIds.has(node.id);

            if (hasStackedTop) {
                // Position the stacked-top (include_block) above this node
                const topId = state.stackedNodes[node.id];
                const topNode = nodes.find(n => n.id === topId);
                if (topNode) {
                    topNode.x = x;
                    topNode.y = currentY;
                    const topEl = state.nodeElements[topId]?.element;
                    if (topEl) {
                        topEl.style.left = topNode.x + 'px';
                        topEl.style.top = topNode.y + 'px';
                    }
                }
                currentY += nodeHeight; // move down for the bottom node
            }

            node.x = x;
            node.y = currentY;

            const nodeEl = state.nodeElements[node.id]?.element;
            if (nodeEl) {
                nodeEl.style.left = node.x + 'px';
                nodeEl.style.top = node.y + 'px';
            }

            currentY += nodeHeight + verticalGap;
        });
    });

    // Redraw edges and fit to view
    drawEdges();
    fitToView();
}
