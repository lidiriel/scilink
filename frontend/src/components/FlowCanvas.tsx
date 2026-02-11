import { useCallback, type DragEvent } from "react";
import ReactFlow, {
    addEdge,
    Controls,
    Background,
    BackgroundVariant,
    useReactFlow,
    type OnNodesChange,
    type OnEdgesChange,
    type OnConnect,
    applyNodeChanges,
    applyEdgeChanges,
} from "reactflow";
import "reactflow/dist/style.css";
import { observer } from "mobx-react-lite";
import { workflowStore } from "../behaviour/workflows";
import BlockNode from "./BlockNode";

const nodeTypes = { block: BlockNode };

const FlowCanvas = observer(function FlowCanvas() {
    const reactFlowInstance = useReactFlow();

    const onNodesChange: OnNodesChange = useCallback(
        (changes) => {
            workflowStore.setNodes(applyNodeChanges(changes, workflowStore.nodes));
        },
        []
    );

    const onEdgesChange: OnEdgesChange = useCallback(
        (changes) => {
            workflowStore.setEdges(applyEdgeChanges(changes, workflowStore.edges));
        },
        []
    );

    const onConnect: OnConnect = useCallback(
        (params) => {
            workflowStore.setEdges(addEdge(params, workflowStore.edges));
        },
        []
    );

    const onDragOver = useCallback((event: DragEvent) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = "copy";
    }, []);

    const onDrop = useCallback(
        (event: DragEvent) => {
            event.preventDefault();

            const blockData = event.dataTransfer.getData("application/scilink-block");
            if (!blockData) return;

            try {
                const piece = JSON.parse(blockData);
                const position = reactFlowInstance.screenToFlowPosition({
                    x: event.clientX,
                    y: event.clientY,
                });
                workflowStore.addBlockNode(piece, position);
            } catch (error) {
                console.error("Error handling block drop:", error);
            }
        },
        [reactFlowInstance]
    );

    return (
        <ReactFlow
            nodes={workflowStore.nodes}
            edges={workflowStore.edges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onDragOver={onDragOver}
            onDrop={onDrop}
            fitView
        >
            <Controls />
            <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
        </ReactFlow>
    );
});

export default FlowCanvas;
