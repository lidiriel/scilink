// Workflow data
const workflows = {
    main: {
        id: 'main',
        name: 'Main Workflow',
        nodes: [
            { id: 'A', type: 'default', label: 'Process A', x: 100, y: 150 },
            { id: 'B', type: 'composite', label: 'Process B (Composite)', subflowId: 'workflow_B', x: 350, y: 150 },
            { id: 'C', type: 'default', label: 'Process C', x: 600, y: 150 }
        ],
        edges: [
            { from: 'A', to: 'B' },
            { from: 'B', to: 'C' }
        ]
    },
    workflow_B: {
        id: 'workflow_B',
        name: 'Process B - Detail',
        parentId: 'main',
        nodes: [
            { id: 'B1', type: 'default', label: 'Step B1', x: 100, y: 150 },
            { id: 'B2', type: 'default', label: 'Step B2', x: 300, y: 150 },
            { id: 'B3', type: 'default', label: 'Step B3', x: 500, y: 80 },
            { id: 'B4', type: 'default', label: 'Step B4', x: 500, y: 220 },
            { id: 'B5', type: 'default', label: 'Step B5', x: 700, y: 150 }
        ],
        edges: [
            { from: 'B1', to: 'B2' },
            { from: 'B2', to: 'B3' },
            { from: 'B2', to: 'B4' },
            { from: 'B3', to: 'B5' },
            { from: 'B4', to: 'B5' }
        ]
    }
};

// State
let currentWorkflowId = 'main';
let currentExperiment = null; // Currently selected experiment { id, name }
let breadcrumbs = [{ id: 'main', name: 'Main Workflow' }];
let nodeElements = {};
let nodeIdCounter = 1000; // Counter for generating unique node IDs

// Connection state
let isConnecting = false;
let connectionStart = null; // { nodeId, portType }
let tempConnectionLine = null;

// Zoom state
let zoomLevel = 1;
let panX = 0;
let panY = 0;
const ZOOM_MIN = 0.25;
const ZOOM_MAX = 2;
const ZOOM_STEP = 0.1;

// Initialize
function init() {
    initCanvasDropZone();
    initZoomControls();
    loadWorkflow('main');
}

// Initialize canvas as drop zone for pieces
function initCanvasDropZone() {
    const canvas = document.getElementById('canvas');

    canvas.addEventListener('dragover', (e) => {
        e.preventDefault();
        canvas.classList.add('drag-over');
    });

    canvas.addEventListener('dragleave', (e) => {
        canvas.classList.remove('drag-over');
    });

    canvas.addEventListener('drop', (e) => {
        e.preventDefault();
        canvas.classList.remove('drag-over');

        // Get piece data from drag event
        const pieceData = e.dataTransfer.getData('application/json');
        if (!pieceData) return;

        const piece = JSON.parse(pieceData);
        const canvasRect = canvas.getBoundingClientRect();

        // Calculate drop position relative to canvas, accounting for zoom and pan
        const x = (e.clientX - canvasRect.left - panX) / zoomLevel - 75;
        const y = (e.clientY - canvasRect.top - panY) / zoomLevel - 25;

        // Add the new node
        addNodeToWorkflow(piece, x, y);
    });
}

// Add a new node to the current workflow
function addNodeToWorkflow(piece, x, y) {
    const workflow = workflows[currentWorkflowId];
    if (!workflow) return;

    // Generate unique ID
    const nodeId = `node_${++nodeIdCounter}`;

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

// Render a single node
function renderNode(node) {
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
    `;

    // Double-click handler for composite nodes
    if (node.type === 'composite' && node.subflowId) {
        nodeEl.addEventListener('dblclick', () => {
            drillDown(node.subflowId, node.label);
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
    nodeElements[node.id] = { element: nodeEl, data: node };
}

// Start a connection from a port
function startConnection(nodeId, portType, event) {
    isConnecting = true;
    connectionStart = { nodeId, portType };

    const canvas = document.getElementById('canvas');
    const canvasRect = canvas.getBoundingClientRect();

    // Create temporary line
    const svg = document.getElementById('edges');
    tempConnectionLine = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    tempConnectionLine.setAttribute('class', 'edge temp-edge');
    tempConnectionLine.setAttribute('stroke', '#2563eb');
    tempConnectionLine.setAttribute('stroke-width', '2');
    tempConnectionLine.setAttribute('stroke-dasharray', '5,5');
    tempConnectionLine.setAttribute('fill', 'none');
    svg.appendChild(tempConnectionLine);

    // Get start position from the port
    const startPos = getPortPosition(nodeId, portType);

    // Update line on mouse move
    const onMouseMove = (e) => {
        if (!isConnecting) return;

        // Convert screen coordinates to viewport coordinates
        const endX = (e.clientX - canvasRect.left - panX) / zoomLevel;
        const endY = (e.clientY - canvasRect.top - panY) / zoomLevel;

        // Use smooth curve for temp line too
        const d = portType === 'output'
            ? createSmoothPath(startPos.x, startPos.y, endX, endY)
            : createSmoothPath(endX, endY, startPos.x, startPos.y);
        tempConnectionLine.setAttribute('d', d);

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
        if (tempConnectionLine) {
            tempConnectionLine.remove();
            tempConnectionLine = null;
        }
        isConnecting = false;
        connectionStart = null;
        clearPortHighlights();
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
}

// Get the position of a port relative to viewport (for temp connection line)
function getPortPosition(nodeId, portType) {
    const nodeInfo = nodeElements[nodeId];
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

// Add an edge between two nodes
function addEdge(fromNodeId, toNodeId) {
    const workflow = workflows[currentWorkflowId];
    if (!workflow) return;

    // Check if edge already exists
    const exists = workflow.edges.some(e => e.from === fromNodeId && e.to === toNodeId);
    if (exists) return;

    // Add edge
    workflow.edges.push({ from: fromNodeId, to: toNodeId });
    drawEdges();
}

// Highlight valid connection ports
function highlightValidPorts(sourceNodeId, sourcePortType) {
    // Clear previous highlights
    clearPortHighlights();

    // Highlight opposite port type on other nodes
    const targetPortClass = sourcePortType === 'output' ? 'node-port-input' : 'node-port-output';

    Object.keys(nodeElements).forEach(nodeId => {
        if (nodeId !== sourceNodeId) {
            const nodeEl = nodeElements[nodeId].element;
            const port = nodeEl.querySelector(`.${targetPortClass}`);
            if (port) {
                port.classList.add('port-highlight');
            }
        }
    });
}

// Clear port highlights
function clearPortHighlights() {
    document.querySelectorAll('.node-port.port-highlight').forEach(port => {
        port.classList.remove('port-highlight');
    });
}

// Load workflow
function loadWorkflow(workflowId) {
    currentWorkflowId = workflowId;
    const workflow = workflows[workflowId];

    if (!workflow) return;

    // Reset zoom and pan for new workflow
    zoomLevel = 1;
    panX = 0;
    panY = 0;
    applyViewportTransform();
    updateZoomDisplay();

    // Clear canvas
    document.getElementById('nodes').innerHTML = '';
    document.getElementById('edges').innerHTML = '<defs><marker id="arrowhead" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto"><polygon points="0 0, 10 3, 0 6" fill="#b1b1b7" /></marker></defs>';
    nodeElements = {};

    // Render nodes using the shared renderNode function
    workflow.nodes.forEach(node => renderNode(node));

    // Draw edges
    drawEdges();

    // Update breadcrumbs
    updateBreadcrumbs();
}

// Draw edges
function drawEdges() {
    const workflow = workflows[currentWorkflowId];
    const svg = document.getElementById('edges');

    // Clear existing edges (keep defs)
    const defs = svg.querySelector('defs');
    svg.innerHTML = '';
    svg.appendChild(defs);

    workflow.edges.forEach(edge => {
        const fromNode = nodeElements[edge.from];
        const toNode = nodeElements[edge.to];

        if (!fromNode || !toNode) return;

        // Use node data coordinates directly (works with zoom since SVG is inside viewport)
        const fromEl = fromNode.element;
        const toEl = toNode.element;

        const x1 = fromNode.data.x + fromEl.offsetWidth;
        const y1 = fromNode.data.y + fromEl.offsetHeight / 2;
        const x2 = toNode.data.x;
        const y2 = toNode.data.y + toEl.offsetHeight / 2;

        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        const d = createSmoothPath(x1, y1, x2, y2);
        path.setAttribute('d', d);
        path.setAttribute('class', 'edge animated');

        svg.appendChild(path);
    });
}

// Create a smooth bezier curve path between two points
function createSmoothPath(x1, y1, x2, y2) {
    // Calculate control point offset based on distance
    const dx = Math.abs(x2 - x1);
    const offset = Math.min(dx * 0.5, 150); // Control point offset, capped at 150px

    // Control points for cubic bezier
    const cx1 = x1 + offset;
    const cy1 = y1;
    const cx2 = x2 - offset;
    const cy2 = y2;

    return `M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}`;
}

// Drill down into subflow
function drillDown(subflowId, label) {
    breadcrumbs.push({ id: subflowId, name: label });
    loadWorkflow(subflowId);
}

// Update breadcrumbs
function updateBreadcrumbs() {
    const container = document.getElementById('breadcrumbs');
    container.innerHTML = '';

    // Add experiment name first if selected
    if (currentExperiment) {
        const expButton = document.createElement('button');
        expButton.textContent = currentExperiment.name;
        expButton.style.cssText = `
            padding: 0.25rem 0.75rem;
            border-radius: 0.25rem;
            transition: all 0.2s;
            border: none;
            cursor: pointer;
            background: #7c3aed;
            color: white;
        `;
        expButton.addEventListener('mouseenter', () => {
            expButton.style.background = '#6d28d9';
        });
        expButton.addEventListener('mouseleave', () => {
            expButton.style.background = '#7c3aed';
        });
        expButton.addEventListener('click', () => {
            navigateToPage('experiments');
        });
        container.appendChild(expButton);

        // Add separator after experiment
        const expSeparator = document.createElement('span');
        expSeparator.textContent = '›';
        expSeparator.style.color = '#9ca3af';
        container.appendChild(expSeparator);
    }

    breadcrumbs.forEach((crumb, index) => {
        const button = document.createElement('button');
        button.textContent = crumb.name;
        button.style.cssText = `
            padding: 0.25rem 0.75rem;
            border-radius: 0.25rem;
            transition: all 0.2s;
            border: none;
            cursor: pointer;
            ${index === breadcrumbs.length - 1
                ? 'background: #2563eb; color: white; font-weight: 600;'
                : 'background: #4b5563; color: white;'}
        `;

        if (index < breadcrumbs.length - 1) {
            button.addEventListener('mouseenter', () => {
                button.style.background = '#6b7280';
            });
            button.addEventListener('mouseleave', () => {
                button.style.background = '#4b5563';
            });
        }

        button.addEventListener('click', () => {
            breadcrumbs = breadcrumbs.slice(0, index + 1);
            loadWorkflow(crumb.id);
        });

        container.appendChild(button);

        if (index < breadcrumbs.length - 1) {
            const separator = document.createElement('span');
            separator.textContent = '›';
            separator.style.color = '#9ca3af';
            container.appendChild(separator);
        }
    });
}

// Window resize handler
window.addEventListener('resize', drawEdges);

// Sidebar (no toggle needed, icon-only mode)
function initSidebar() {
    // Sidebar is now icon-only with tooltips, no toggle needed
}

// Help/Instructions toggle
function initHelpToggle() {
    const helpBtn = document.getElementById('help-toggle');
    const instructionsBox = document.getElementById('instructions-box');

    // Load saved state
    const isHidden = localStorage.getItem('instructionsHidden') === 'true';
    if (isHidden) {
        instructionsBox.classList.add('hidden');
    }

    helpBtn.addEventListener('click', () => {
        instructionsBox.classList.toggle('hidden');
        localStorage.setItem('instructionsHidden', instructionsBox.classList.contains('hidden'));
    });
}

// Pieces panel toggle
function initPiecesPanel() {
    const panel = document.getElementById('pieces-panel');
    const toggle = document.getElementById('pieces-toggle');

    // Load saved state
    const isCollapsed = localStorage.getItem('piecesPanelCollapsed') === 'true';
    if (isCollapsed) {
        panel.classList.add('collapsed');
    }

    toggle.addEventListener('click', () => {
        panel.classList.toggle('collapsed');
        localStorage.setItem('piecesPanelCollapsed', panel.classList.contains('collapsed'));
        // Redraw edges after animation
        setTimeout(drawEdges, 300);
    });
}

// Convert icon class name format to Font Awesome classes
function convertIconClass(iconClassName) {
    // Format: "fa-brands:python" -> "fa-brands fa-python"
    // Format: "fa-solid:fa-plug" -> "fa-solid fa-plug"
    if (!iconClassName) return 'fa-solid fa-cube';

    const parts = iconClassName.split(':');
    if (parts.length === 2) {
        const prefix = parts[0];
        let iconName = parts[1];
        // Add fa- prefix if not present
        if (!iconName.startsWith('fa-')) {
            iconName = 'fa-' + iconName;
        }
        return `${prefix} ${iconName}`;
    }
    return iconClassName;
}

// Load piece directories
async function loadPieceDirectories() {
    try {
        const response = await fetch('/api/piece-directories');
        const directories = await response.json();

        const select = document.getElementById('pieces-directory');
        select.innerHTML = '';

        directories.forEach(dir => {
            const option = document.createElement('option');
            option.value = dir;
            option.textContent = dir;
            select.appendChild(option);
        });

        // Load pieces for the first directory
        if (directories.length > 0) {
            loadPieces(directories[0]);
        }

        // Add change listener
        select.addEventListener('change', (e) => {
            loadPieces(e.target.value);
        });
    } catch (error) {
        console.error('Error loading piece directories:', error);
    }
}

// Current pieces data for filtering
let currentPieces = [];

// Load pieces from a directory
async function loadPieces(directory) {
    try {
        const response = await fetch(`/api/pieces/${directory}`);
        currentPieces = await response.json();
        renderPieces();
    } catch (error) {
        console.error('Error loading pieces:', error);
    }
}

// Render pieces with optional filter
function renderPieces(filter = '') {
    const piecesList = document.getElementById('pieces-list');
    piecesList.innerHTML = '';

    const filterLower = filter.toLowerCase().trim();

    // Filter pieces
    const filteredPieces = filterLower
        ? currentPieces.filter(piece =>
            piece.node_label.toLowerCase().includes(filterLower) ||
            piece.name.toLowerCase().includes(filterLower) ||
            (piece.description && piece.description.toLowerCase().includes(filterLower)) ||
            (piece.tags && piece.tags.some(tag => tag.toLowerCase().includes(filterLower)))
        )
        : currentPieces;

    // Group pieces by category
    const categories = {};
    filteredPieces.forEach(piece => {
        const cat = piece.category || 'Other';
        if (!categories[cat]) {
            categories[cat] = [];
        }
        categories[cat].push(piece);
    });

    // Render pieces by category
    Object.keys(categories).sort().forEach(category => {
        const categoryEl = document.createElement('div');
        categoryEl.className = 'pieces-category';

        const categoryHeader = document.createElement('div');
        categoryHeader.className = 'pieces-category-header';
        categoryHeader.textContent = category;
        categoryEl.appendChild(categoryHeader);

        const categoryItems = document.createElement('div');
        categoryItems.className = 'pieces-category-items';

        categories[category].forEach(piece => {
            const pieceEl = document.createElement('div');
            pieceEl.className = 'piece-item';
            pieceEl.title = piece.description || piece.node_label;
            pieceEl.draggable = true;

            const iconClass = convertIconClass(piece.icon_class_name);
            pieceEl.innerHTML = `
                <i class="${iconClass}"></i>
                <span class="piece-label">${piece.node_label}</span>
            `;

            // Drag start handler
            pieceEl.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('application/json', JSON.stringify(piece));
                e.dataTransfer.effectAllowed = 'copy';
                pieceEl.classList.add('dragging');
            });

            pieceEl.addEventListener('dragend', () => {
                pieceEl.classList.remove('dragging');
            });

            categoryItems.appendChild(pieceEl);
        });

        categoryEl.appendChild(categoryItems);
        piecesList.appendChild(categoryEl);
    });

    // Show message if no results
    if (filteredPieces.length === 0 && filterLower) {
        piecesList.innerHTML = '<div class="pieces-no-results">No pieces found</div>';
    }
}

// Initialize pieces search
function initPiecesSearch() {
    const searchInput = document.getElementById('pieces-search');
    searchInput.addEventListener('input', (e) => {
        renderPieces(e.target.value);
    });
}

// Initialize zoom controls
function initZoomControls() {
    const zoomInBtn = document.getElementById('zoom-in');
    const zoomOutBtn = document.getElementById('zoom-out');
    const zoomFitBtn = document.getElementById('zoom-fit');
    const autoLayoutBtn = document.getElementById('auto-layout');

    zoomInBtn.addEventListener('click', () => {
        setZoom(zoomLevel + ZOOM_STEP);
    });

    zoomOutBtn.addEventListener('click', () => {
        setZoom(zoomLevel - ZOOM_STEP);
    });

    zoomFitBtn.addEventListener('click', () => {
        fitToView();
    });

    autoLayoutBtn.addEventListener('click', () => {
        autoLayoutNodes();
    });

    // Mouse wheel zoom
    const canvas = document.getElementById('canvas');
    canvas.addEventListener('wheel', (e) => {
        if (e.ctrlKey) {
            e.preventDefault();
            const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
            setZoom(zoomLevel + delta);
        }
    }, { passive: false });
}

// Set zoom level
function setZoom(level) {
    zoomLevel = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, level));
    applyViewportTransform();
    updateZoomDisplay();
}

// Apply transform to viewport
function applyViewportTransform() {
    const viewport = document.getElementById('canvas-viewport');
    viewport.style.transform = `translate(${panX}px, ${panY}px) scale(${zoomLevel})`;
    drawEdges();
}

// Update zoom level display
function updateZoomDisplay() {
    const zoomLevelEl = document.getElementById('zoom-level');
    zoomLevelEl.textContent = Math.round(zoomLevel * 100) + '%';
}

// Fit all nodes in view
function fitToView() {
    const workflow = workflows[currentWorkflowId];
    if (!workflow || workflow.nodes.length === 0) {
        setZoom(1);
        panX = 0;
        panY = 0;
        applyViewportTransform();
        return;
    }

    const canvas = document.getElementById('canvas');
    const canvasRect = canvas.getBoundingClientRect();
    const padding = 50;

    // Calculate bounding box of all nodes
    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;

    workflow.nodes.forEach(node => {
        const nodeEl = nodeElements[node.id]?.element;
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

    panX = (canvasRect.width / 2) - (centerX * newZoom);
    panY = (canvasRect.height / 2) - (centerY * newZoom);

    zoomLevel = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, newZoom));
    applyViewportTransform();
    updateZoomDisplay();
}

// Auto-layout nodes in a clean arrangement
function autoLayoutNodes() {
    const workflow = workflows[currentWorkflowId];
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

    // Position nodes
    const sortedLevels = Object.keys(levelGroups).map(Number).sort((a, b) => a - b);

    sortedLevels.forEach((level, levelIndex) => {
        const nodesInLevel = levelGroups[level];
        const x = startX + levelIndex * horizontalSpacing;

        // Center nodes vertically based on canvas height
        const canvas = document.getElementById('canvas');
        const canvasHeight = canvas.getBoundingClientRect().height;
        const totalHeight = nodesInLevel.length * nodeHeight + (nodesInLevel.length - 1) * verticalGap;
        const startYForLevel = Math.max(startY, (canvasHeight - totalHeight) / 2);

        nodesInLevel.forEach((node, nodeIndex) => {
            node.x = x;
            node.y = startYForLevel + nodeIndex * verticalSpacing;

            // Update DOM element position
            const nodeEl = nodeElements[node.id]?.element;
            if (nodeEl) {
                nodeEl.style.left = node.x + 'px';
                nodeEl.style.top = node.y + 'px';
            }
        });
    });

    // Redraw edges and fit to view
    drawEdges();
    fitToView();
}

// Initialize canvas toolbar
function initCanvasToolbar() {
    const saveBtn = document.getElementById('save-workflow');

    saveBtn.addEventListener('click', () => {
        saveWorkflow();
    });
}

// Save workflow to database
async function saveWorkflow() {
    const workflow = workflows[currentWorkflowId];
    if (!workflow) return;

    const saveBtn = document.getElementById('save-workflow');
    const originalContent = saveBtn.innerHTML;

    // Show saving state
    saveBtn.classList.add('saving');
    saveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i><span>Saving...</span>';

    try {
        // Prepare data for API
        const data = {
            nodes: workflow.nodes.map(n => ({
                id: n.id,
                type: n.type || 'default',
                label: n.label,
                subflowId: n.subflowId,
                x: n.x,
                y: n.y
            })),
            edges: workflow.edges.map(e => ({
                id: e.id || `e-${e.from}-${e.to}`,
                from: e.from,
                to: e.to,
                animated: e.animated !== false
            }))
        };

        // Try to update existing workflow, or create if not exists
        let response = await fetch(`/api/workflow/${currentWorkflowId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        // If workflow doesn't exist, create it
        if (response.status === 404) {
            response = await fetch('/api/workflow', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: workflow.id,
                    name: workflow.name,
                    parentId: workflow.parentId,
                    ...data
                })
            });
        }

        if (response.ok) {
            // Show success state
            saveBtn.classList.remove('saving');
            saveBtn.classList.add('saved');
            saveBtn.innerHTML = '<i class="fa-solid fa-check"></i><span>Saved!</span>';

            // Reset after 2 seconds
            setTimeout(() => {
                saveBtn.classList.remove('saved');
                saveBtn.innerHTML = originalContent;
            }, 2000);
        } else {
            throw new Error('Failed to save');
        }
    } catch (error) {
        console.error('Error saving workflow:', error);

        // Show error state
        saveBtn.classList.remove('saving');
        saveBtn.innerHTML = '<i class="fa-solid fa-exclamation-triangle"></i><span>Error</span>';
        saveBtn.style.background = '#ef4444';
        saveBtn.style.borderColor = '#ef4444';
        saveBtn.style.color = 'white';

        // Reset after 2 seconds
        setTimeout(() => {
            saveBtn.innerHTML = originalContent;
            saveBtn.style.background = '';
            saveBtn.style.borderColor = '';
            saveBtn.style.color = '';
        }, 2000);
    }
}

// ============== Page Navigation ==============

let currentPage = 'workflows';

function initNavigation() {
    const navLinks = document.querySelectorAll('.sidebar-link[data-page]');

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = link.dataset.page;
            navigateToPage(page);
        });
    });
}

function navigateToPage(page) {
    currentPage = page;

    // Update nav links
    document.querySelectorAll('.sidebar-link[data-page]').forEach(link => {
        link.classList.toggle('active', link.dataset.page === page);
    });

    // Update page content
    document.querySelectorAll('.page-content').forEach(pageEl => {
        pageEl.classList.toggle('active', pageEl.id === `page-${page}`);
    });

    // Load page-specific data
    if (page === 'settings') {
        loadPlatforms();
    } else if (page === 'experiments') {
        loadExperiments();
    }

    // Redraw edges when returning to workflows
    if (page === 'workflows') {
        setTimeout(drawEdges, 100);
    }
}

// ============== Settings / Platforms ==============

let platformsData = [];

function initSettings() {
    const addBtn = document.getElementById('add-platform-btn');
    const modal = document.getElementById('platform-modal');
    const form = document.getElementById('platform-form');
    const closeBtn = document.getElementById('platform-modal-close');
    const cancelBtn = document.getElementById('platform-cancel');
    const backdrop = modal.querySelector('.modal-backdrop');

    // Open modal for new platform
    addBtn.addEventListener('click', () => {
        openPlatformModal();
    });

    // Close modal
    closeBtn.addEventListener('click', closePlatformModal);
    cancelBtn.addEventListener('click', closePlatformModal);
    backdrop.addEventListener('click', closePlatformModal);

    // Form submit
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        savePlatform();
    });
}

function openPlatformModal(platform = null) {
    const modal = document.getElementById('platform-modal');
    const title = document.getElementById('platform-modal-title');
    const idInput = document.getElementById('platform-id');
    const nameInput = document.getElementById('platform-name');
    const descInput = document.getElementById('platform-description');
    const hostInput = document.getElementById('platform-host');

    if (platform) {
        title.textContent = 'Edit Platform';
        idInput.value = platform.id;
        nameInput.value = platform.name;
        descInput.value = platform.description || '';
        hostInput.value = platform.data?.host || '';
    } else {
        title.textContent = 'Add Platform';
        idInput.value = '';
        nameInput.value = '';
        descInput.value = '';
        hostInput.value = '';
    }

    modal.classList.remove('hidden');
    nameInput.focus();
}

function closePlatformModal() {
    const modal = document.getElementById('platform-modal');
    modal.classList.add('hidden');
}

async function loadPlatforms() {
    try {
        const response = await fetch('/api/settings?category=platform');
        platformsData = await response.json();
        renderPlatformsList();
    } catch (error) {
        console.error('Error loading platforms:', error);
    }
}

function renderPlatformsList() {
    const list = document.getElementById('platforms-list');

    if (platformsData.length === 0) {
        list.innerHTML = '<div class="settings-empty">No platforms configured yet.</div>';
        return;
    }

    list.innerHTML = platformsData.map(platform => `
        <div class="settings-item" data-id="${platform.id}">
            <div class="settings-item-info">
                <p class="settings-item-name">${escapeHtml(platform.name)}</p>
                ${platform.description ? `<p class="settings-item-desc">${escapeHtml(platform.description)}</p>` : ''}
                <p class="settings-item-host">${escapeHtml(platform.data?.host || 'No host')}</p>
            </div>
            <div class="settings-item-actions">
                <button class="settings-item-btn edit" title="Edit" onclick="editPlatform(${platform.id})">
                    <i class="fa-solid fa-pen"></i>
                </button>
                <button class="settings-item-btn delete" title="Delete" onclick="deletePlatform(${platform.id})">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function editPlatform(id) {
    const platform = platformsData.find(p => p.id === id);
    if (platform) {
        openPlatformModal(platform);
    }
}

async function savePlatform() {
    const idInput = document.getElementById('platform-id');
    const nameInput = document.getElementById('platform-name');
    const descInput = document.getElementById('platform-description');
    const hostInput = document.getElementById('platform-host');

    const data = {
        category: 'platform',
        name: nameInput.value.trim(),
        description: descInput.value.trim() || null,
        data: { host: hostInput.value.trim() }
    };

    try {
        let response;
        if (idInput.value) {
            // Update existing
            response = await fetch(`/api/settings/${idInput.value}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
        } else {
            // Create new
            response = await fetch('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
        }

        if (response.ok) {
            closePlatformModal();
            loadPlatforms();
        } else {
            const error = await response.json();
            alert(error.error || 'Failed to save platform');
        }
    } catch (error) {
        console.error('Error saving platform:', error);
        alert('Failed to save platform');
    }
}

async function deletePlatform(id) {
    if (!confirm('Are you sure you want to delete this platform?')) {
        return;
    }

    try {
        const response = await fetch(`/api/settings/${id}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            loadPlatforms();
        } else {
            alert('Failed to delete platform');
        }
    } catch (error) {
        console.error('Error deleting platform:', error);
        alert('Failed to delete platform');
    }
}

// ============== Experiments ==============

let experimentsData = [];

function initExperiments() {
    const addBtn = document.getElementById('add-experiment-btn');
    const modal = document.getElementById('experiment-modal');
    const form = document.getElementById('experiment-form');
    const closeBtn = document.getElementById('experiment-modal-close');
    const cancelBtn = document.getElementById('experiment-cancel');
    const backdrop = modal.querySelector('.modal-backdrop');

    // Open modal for new experiment
    addBtn.addEventListener('click', () => {
        openExperimentModal();
    });

    // Close modal
    closeBtn.addEventListener('click', closeExperimentModal);
    cancelBtn.addEventListener('click', closeExperimentModal);
    backdrop.addEventListener('click', closeExperimentModal);

    // Form submit
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        saveExperiment();
    });
}

function openExperimentModal(experiment = null) {
    const modal = document.getElementById('experiment-modal');
    const title = document.getElementById('experiment-modal-title');
    const idInput = document.getElementById('experiment-id');
    const nameInput = document.getElementById('experiment-name');
    const descInput = document.getElementById('experiment-description');

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
    modal.classList.add('hidden');
}

async function loadExperiments() {
    try {
        const response = await fetch('/api/experiments');
        experimentsData = await response.json();
        renderExperimentsList();
    } catch (error) {
        console.error('Error loading experiments:', error);
    }
}

function renderExperimentsList() {
    const list = document.getElementById('experiments-list');

    if (experimentsData.length === 0) {
        list.innerHTML = '<div class="settings-empty">No experiments yet. Create your first experiment!</div>';
        return;
    }

    list.innerHTML = experimentsData.map(experiment => {
        const isSelected = currentExperiment && currentExperiment.id === experiment.id;
        const workflowsList = experiment.workflows && experiment.workflows.length > 0
            ? `<div class="experiment-workflows">
                <div class="experiment-workflows-header">
                    <i class="fa-solid fa-sitemap"></i>
                    Workflows (${experiment.workflows.length})
                </div>
                <ul class="experiment-workflows-list">
                    ${experiment.workflows.map(wf => `
                        <li class="experiment-workflow-item">
                            <div class="workflow-item-info" onclick="openWorkflow(${experiment.id}, '${wf.id}')">
                                <i class="fa-solid fa-diagram-project"></i>
                                <span>${escapeHtml(wf.name)}</span>
                            </div>
                            <button class="workflow-item-delete" title="Delete workflow" onclick="event.stopPropagation(); deleteWorkflow('${wf.id}')">
                                <i class="fa-solid fa-trash"></i>
                            </button>
                        </li>
                    `).join('')}
                </ul>
                <button class="experiment-add-workflow-btn" onclick="addWorkflowToExperiment(${experiment.id})">
                    <i class="fa-solid fa-plus"></i>
                    Add Workflow
                </button>
            </div>`
            : `<div class="experiment-workflows">
                <p class="experiment-no-workflows">No workflows yet</p>
                <button class="experiment-add-workflow-btn" onclick="addWorkflowToExperiment(${experiment.id})">
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
                    <button class="settings-item-btn ${isSelected ? 'active' : ''}" title="${isSelected ? 'Selected' : 'Select experiment'}" onclick="selectExperiment(${experiment.id})">
                        <i class="fa-solid ${isSelected ? 'fa-check' : 'fa-arrow-pointer'}"></i>
                    </button>
                    <button class="settings-item-btn edit" title="Edit" onclick="editExperiment(${experiment.id})">
                        <i class="fa-solid fa-pen"></i>
                    </button>
                    <button class="settings-item-btn delete" title="Delete" onclick="deleteExperiment(${experiment.id})">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            </div>
            ${workflowsList}
        </div>
    `}).join('');
}

function editExperiment(id) {
    const experiment = experimentsData.find(e => e.id === id);
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

async function deleteExperiment(id) {
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

function selectExperiment(experimentId) {
    const experiment = experimentsData.find(e => e.id === experimentId);
    if (experiment) {
        currentExperiment = { id: experiment.id, name: experiment.name };
        renderExperimentsList();
        // Also update breadcrumbs if we're on workflows page
        if (currentPage === 'workflows') {
            updateBreadcrumbs();
        }
    }
}

function openWorkflow(experimentId, workflowId) {
    const experiment = experimentsData.find(e => e.id === experimentId);
    if (!experiment) return;

    const workflow = experiment.workflows.find(w => w.id === workflowId);
    if (!workflow) return;

    // Set as current experiment
    currentExperiment = { id: experiment.id, name: experiment.name };

    // Navigate to workflows page
    navigateToPage('workflows');

    // Load the workflow if not already in local data
    if (!workflows[workflowId]) {
        workflows[workflowId] = {
            id: workflowId,
            name: workflow.name,
            nodes: [],
            edges: []
        };
    }

    breadcrumbs = [{ id: workflowId, name: workflow.name }];
    loadWorkflow(workflowId);
}

async function addWorkflowToExperiment(experimentId) {
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

async function deleteWorkflow(workflowId) {
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

function openExperimentWorkflows(experimentId) {
    const experiment = experimentsData.find(e => e.id === experimentId);
    if (experiment && experiment.workflows && experiment.workflows.length > 0) {
        // Open the first workflow
        openWorkflow(experimentId, experiment.workflows[0].id);
    }
}

// Start the app
initSidebar();
initHelpToggle();
initNavigation();
initSettings();
initExperiments();
initCanvasToolbar();
initPiecesPanel();
initPiecesSearch();
loadPieceDirectories();
init();
