import { useCallback, useState, type DragEvent } from "react";
import ReactFlow, {
    type Node,
    type Edge,
    addEdge,
    Controls,
    ControlButton,
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
import dagre from "dagre";
import { observer } from "mobx-react-lite";
import { toJS } from "mobx";
import { workflowStore } from "../behaviour/workflows";
import { useDisclosure } from "@mantine/hooks";
import { Tooltip } from "@mantine/core";
import { IconLayoutDistributeHorizontal } from "@tabler/icons-react";
import BlockNode from "./BlockNode";
import WorkflowNode from "./WorkflowNode";
import DeviceNode from "./DeviceNode";
import NodeInputsModal from "../modals/NodeInputsModal";

function autoLayout(nodes: Node[], edges: Edge[]): Node[] {
    const g = new dagre.graphlib.Graph();
    g.setDefaultEdgeLabel(() => ({}));
    g.setGraph({ rankdir: "TB", nodesep: 50, ranksep: 80 });

    nodes.forEach((node) => {
        g.setNode(node.id, { width: 160, height: 40 });
    });
    edges.forEach((edge) => {
        g.setEdge(edge.source, edge.target);
    });

    dagre.layout(g);

    return nodes.map((node) => {
        const pos = g.node(node.id);
        return { ...node, position: { x: pos.x - 80, y: pos.y - 20 } };
    });
}

const nodeTypes = { block: BlockNode, workflow: WorkflowNode, device: DeviceNode };

const defaultEdgeOptions: DefaultEdgeOptions = {
    animated: true,
    markerEnd: { type: MarkerType.ArrowClosed, width: 12, height: 12 },
    style: { strokeWidth: 1 },
};

const FlowCanvas = observer(function FlowCanvas() {
    const reactFlowInstance = useReactFlow();
    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
    const [modalOpened, { open: openModal, close: closeModal }] = useDisclosure(false);

    const onNodeDoubleClick = useCallback((_event: React.MouseEvent, node: Node) => {
        setSelectedNodeId(node.id);
        openModal();
    }, [openModal]);

    const onAutoLayout = useCallback(() => {
        const nodes = toJS(workflowStore.nodes);
        const edges = toJS(workflowStore.edges);
        if (nodes.length === 0) return;
        const laid = autoLayout(nodes, edges);
        workflowStore.setNodes(laid);
        setTimeout(() => reactFlowInstance.fitView({ padding: 0.2 }), 50);
    }, [reactFlowInstance]);

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

    return (<>
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
            onNodeDoubleClick={onNodeDoubleClick}
            deleteKeyCode="Delete"
            fitView
        >
            <Controls>
                <Tooltip label="Auto-layout" position="right" withArrow>
                    <ControlButton onClick={onAutoLayout}>
                        <IconLayoutDistributeHorizontal size={16} />
                    </ControlButton>
                </Tooltip>
            </Controls>
            <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
        </ReactFlow>
        <NodeInputsModal opened={modalOpened} onClose={closeModal} nodeId={selectedNodeId} />
    </>
    );
});

export default FlowCanvas;
