import { useCallback, type DragEvent } from "react";
import ReactFlow, {
    addEdge,
    Controls,
    Background,
    BackgroundVariant,
    MarkerType,
    useReactFlow,
    type OnNodesChange,
    type OnEdgesChange,
    type OnConnect,
    type DefaultEdgeOptions,
    applyNodeChanges,
    applyEdgeChanges,
} from "reactflow";
import "reactflow/dist/style.css";
import { observer } from "mobx-react-lite";
import { toJS } from "mobx";
import { workflowStore } from "../behaviour/workflows";
import BlockNode from "./BlockNode";
import WorkflowNode from "./WorkflowNode";
import DeviceNode from "./DeviceNode";

const nodeTypes = { block: BlockNode, workflow: WorkflowNode, device: DeviceNode };

const defaultEdgeOptions: DefaultEdgeOptions = {
    animated: true,
    markerEnd: { type: MarkerType.ArrowClosed, width: 12, height: 12 },
    style: { strokeWidth: 1 },
};

const FlowCanvas = observer(function FlowCanvas() {
    const reactFlowInstance = useReactFlow();

    const onNodesChange: OnNodesChange = useCallback(
        (changes) => {
            workflowStore.setNodes(applyNodeChanges(changes, toJS(workflowStore.nodes)));
        },
        []
    );

    const onEdgesChange: OnEdgesChange = useCallback(
        (changes) => {
            workflowStore.setEdges(applyEdgeChanges(changes, toJS(workflowStore.edges)));
        },
        []
    );

    const onConnect: OnConnect = useCallback(
        (params) => {
            const edges = toJS(workflowStore.edges);
            const duplicate = edges.some(
                (e) => e.source === params.source && e.target === params.target
            );
            if (!duplicate) {
                workflowStore.setEdges(addEdge(params, edges));
            }
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

            const position = reactFlowInstance.screenToFlowPosition({
                x: event.clientX,
                y: event.clientY,
            });

            const blockData = event.dataTransfer.getData("application/scilink-block");
            if (blockData) {
                try {
                    const piece = JSON.parse(blockData);
                    workflowStore.addBlockNode(piece, position);
                } catch (error) {
                    console.error("Error handling block drop:", error);
                }
                return;
            }

            const workflowData = event.dataTransfer.getData("application/scilink-workflow");
            if (workflowData) {
                try {
                    const workflow = JSON.parse(workflowData);
                    workflowStore.addWorkflowNode(workflow, position);
                } catch (error) {
                    console.error("Error handling workflow drop:", error);
                }
                return;
            }

            const deviceData = event.dataTransfer.getData("application/scilink-device");
            if (deviceData) {
                try {
                    const device = JSON.parse(deviceData);
                    workflowStore.addDeviceNode(device, position);
                } catch (error) {
                    console.error("Error handling device drop:", error);
                }
            }
        },
        [reactFlowInstance]
    );

    return (
        <ReactFlow
            nodes={toJS(workflowStore.nodes)}
            edges={toJS(workflowStore.edges)}
            nodeTypes={nodeTypes}
            defaultEdgeOptions={defaultEdgeOptions}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onDragOver={onDragOver}
            onDrop={onDrop}
            deleteKeyCode="Delete"
            fitView
        >
            <Controls />
            <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
        </ReactFlow>
    );
});

export default FlowCanvas;
