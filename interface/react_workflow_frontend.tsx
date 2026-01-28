import React, { useState, useCallback, useEffect } from 'react';
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';

// Custom composite node component
const CompositeNode = ({ data }) => {
  return (
    <div className="px-4 py-2 shadow-lg rounded-lg bg-gradient-to-r from-purple-400 to-pink-400 border-2 border-purple-600">
      <div className="flex flex-col">
        <div className="font-bold text-white">{data.label}</div>
        <div className="text-xs text-white mt-1">Double-click to expand</div>
      </div>
    </div>
  );
};

const nodeTypes = {
  composite: CompositeNode,
};

const WorkflowDesigner = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [currentWorkflowId, setCurrentWorkflowId] = useState('main');
  const [breadcrumbs, setBreadcrumbs] = useState([{ id: 'main', name: 'Main Workflow' }]);
  const [loading, setLoading] = useState(true);

  // Load workflow from backend
  const loadWorkflow = useCallback(async (workflowId) => {
    setLoading(true);
    try {
      const response = await fetch(`http://localhost:5000/api/workflow/${workflowId}`);
      const data = await response.json();
      
      setNodes(data.nodes || []);
      setEdges(data.edges || []);
      setCurrentWorkflowId(workflowId);
      setLoading(false);
    } catch (error) {
      console.error('Error loading workflow:', error);
      // Fallback to demo data if backend is not available
      loadDemoData(workflowId);
    }
  }, [setNodes, setEdges]);

  // Demo data fallback (in case Flask backend isn't running)
  const loadDemoData = (workflowId) => {
    const demoWorkflows = {
      main: {
        nodes: [
          {
            id: 'A',
            type: 'default',
            data: { label: 'Process A' },
            position: { x: 100, y: 100 },
          },
          {
            id: 'B',
            type: 'composite',
            data: { label: 'Process B (Composite)', subflowId: 'workflow_B' },
            position: { x: 300, y: 100 },
          },
          {
            id: 'C',
            type: 'default',
            data: { label: 'Process C' },
            position: { x: 500, y: 100 },
          },
        ],
        edges: [
          { id: 'e-A-B', source: 'A', target: 'B', animated: true, markerEnd: { type: MarkerType.ArrowClosed } },
          { id: 'e-B-C', source: 'B', target: 'C', animated: true, markerEnd: { type: MarkerType.ArrowClosed } },
        ],
      },
      workflow_B: {
        nodes: [
          { id: 'B1', data: { label: 'Step B1' }, position: { x: 100, y: 100 } },
          { id: 'B2', data: { label: 'Step B2' }, position: { x: 300, y: 100 } },
          { id: 'B3', data: { label: 'Step B3' }, position: { x: 450, y: 50 } },
          { id: 'B4', data: { label: 'Step B4' }, position: { x: 450, y: 150 } },
          { id: 'B5', data: { label: 'Step B5' }, position: { x: 600, y: 100 } },
        ],
        edges: [
          { id: 'e-B1-B2', source: 'B1', target: 'B2', animated: true, markerEnd: { type: MarkerType.ArrowClosed } },
          { id: 'e-B2-B3', source: 'B2', target: 'B3', animated: true, markerEnd: { type: MarkerType.ArrowClosed } },
          { id: 'e-B2-B4', source: 'B2', target: 'B4', animated: true, markerEnd: { type: MarkerType.ArrowClosed } },
          { id: 'e-B3-B5', source: 'B3', target: 'B5', animated: true, markerEnd: { type: MarkerType.ArrowClosed } },
          { id: 'e-B4-B5', source: 'B4', target: 'B5', animated: true, markerEnd: { type: MarkerType.ArrowClosed } },
        ],
      },
    };

    const workflow = demoWorkflows[workflowId];
    if (workflow) {
      setNodes(workflow.nodes);
      setEdges(workflow.edges);
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWorkflow('main');
  }, [loadWorkflow]);

  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge({ ...params, animated: true, markerEnd: { type: MarkerType.ArrowClosed } }, eds)),
    [setEdges]
  );

  // Handle node double-click to drill down
  const onNodeDoubleClick = useCallback((event, node) => {
    if (node.type === 'composite' && node.data.subflowId) {
      const subflowId = node.data.subflowId;
      loadWorkflow(subflowId);
      setBreadcrumbs([...breadcrumbs, { id: subflowId, name: node.data.label }]);
    }
  }, [breadcrumbs, loadWorkflow]);

  // Navigate back using breadcrumbs
  const navigateToBreadcrumb = useCallback((index) => {
    const targetBreadcrumb = breadcrumbs[index];
    loadWorkflow(targetBreadcrumb.id);
    setBreadcrumbs(breadcrumbs.slice(0, index + 1));
  }, [breadcrumbs, loadWorkflow]);

  return (
    <div className="w-full h-screen flex flex-col">
      {/* Header */}
      <div className="bg-gray-800 text-white p-4 shadow-lg">
        <h1 className="text-2xl font-bold mb-2">Hierarchical Workflow Designer</h1>
        
        {/* Breadcrumb Navigation */}
        <div className="flex items-center space-x-2 text-sm">
          {breadcrumbs.map((crumb, index) => (
            <React.Fragment key={crumb.id}>
              <button
                onClick={() => navigateToBreadcrumb(index)}
                className={`px-3 py-1 rounded transition-colors ${
                  index === breadcrumbs.length - 1
                    ? 'bg-blue-600 font-semibold'
                    : 'bg-gray-600 hover:bg-gray-500'
                }`}
              >
                {crumb.name}
              </button>
              {index < breadcrumbs.length - 1 && <span className="text-gray-400">›</span>}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 border-l-4 border-blue-500 p-3 text-sm">
        <p className="font-semibold text-blue-900">Instructions:</p>
        <p className="text-blue-800">
          • <strong>Double-click</strong> the purple "Process B" node to drill down into its sub-workflow
          • Use the <strong>breadcrumb navigation</strong> above to return to parent workflows
          • <strong>Zoom/Pan</strong>: Mouse wheel to zoom, drag to pan
          • <strong>Connect nodes</strong>: Drag from one node's edge to another
        </p>
      </div>

      {/* React Flow Canvas */}
      <div className="flex-1">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-lg text-gray-600">Loading workflow...</div>
          </div>
        ) : (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeDoubleClick={onNodeDoubleClick}
            nodeTypes={nodeTypes}
            fitView
            attributionPosition="bottom-left"
          >
            <Controls />
            <MiniMap />
            <Background variant="dots" gap={12} size={1} />
          </ReactFlow>
        )}
      </div>
    </div>
  );
};

export default WorkflowDesigner;