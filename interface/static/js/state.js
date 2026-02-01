// Shared application state

// Workflow data storage
export const workflows = {
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

// Application state
export const state = {
    currentWorkflowId: 'main',
    currentExperiment: null, // { id, name }
    nodeElements: {},
    nodeIdCounter: 1000,

    // Connection state
    isConnecting: false,
    connectionStart: null, // { nodeId, portType }
    tempConnectionLine: null,

    // Edge selection and reconnection state
    selectedEdge: null, // { from, to, index }
    isReconnecting: false,
    reconnectEnd: null, // 'source' or 'target'

    // Zoom state
    zoomLevel: 1,
    panX: 0,
    panY: 0,

    // Page navigation
    currentPage: 'experiments',

    // Breadcrumbs
    breadcrumbs: []
};

// Zoom constants
export const ZOOM_MIN = 0.25;
export const ZOOM_MAX = 2;
export const ZOOM_STEP = 0.1;

// Data storage for panels
export const panelData = {
    platformsData: [],
    experimentsData: [],
    currentPieces: [],
    currentPiecesDirectory: ''
};
