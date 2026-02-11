import ReactFlow, {
    useNodesState,
    useEdgesState,
    addEdge,
    Controls,
    Background,
    BackgroundVariant,
    type Edge,
    type Node,
    type OnConnect,
} from "reactflow";
import "reactflow/dist/style.css";

const initialNodes: Node[] = [
    {
        id: "1",
        position: { x: 100, y: 100 },
        data: { label: "Hello React Flow" },
    },
];

const initialEdges: Edge[] = [];

function FlowCanvas() {
    const [nodes, , onNodesChange] = useNodesState(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

    const onConnect: OnConnect = (params) =>
        setEdges((eds) => addEdge(params, eds));

    return (
        <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            fitView
        >
            <Controls />
            <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
        </ReactFlow>
    );
}

export default FlowCanvas;
