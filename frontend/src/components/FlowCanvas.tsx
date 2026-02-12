import { useCallback, useState, useEffect, useRef, type DragEvent } from "react";
import ReactFlow, {
    type Node,
    type Edge,
    addEdge,
    reconnectEdge,
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
    type Connection,
} from "reactflow";
import "reactflow/dist/style.css";
import dagre from "dagre";
import { toJS, runInAction, autorun } from "mobx";
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

const FlowCanvas = function FlowCanvas() {
    const reactFlowInstance = useReactFlow();
    const [nodes, setNodes] = useState<Node[]>([]);
    const [edges, setEdges] = useState<Edge[]>([]);
    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
    const [modalOpened, { open: openModal, close: closeModal }] = useDisclosure(false);
    const pushingToStore = useRef(false);
    const reconnectingEdgeId = useRef<string | null>(null);

    // Sync from MobX store to local state (load workflow, drag-and-drop add, etc.)
    useEffect(() => {
        const dispose = autorun(() => {
            const storeNodes = toJS(workflowStore.nodes);
            const storeEdges = toJS(workflowStore.edges);
            if (!pushingToStore.current) {
                setNodes(storeNodes);
                setEdges(storeEdges);
            }
        });
        return dispose;
    }, []);

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
            setNodes((nds) => {
                const updated = applyNodeChanges(changes, nds);
                pushingToStore.current = true;
                if (changes.some((c) => c.type !== "select" && c.type !== "dimensions")) {
                    workflowStore.setNodes(updated);
                } else {
                    runInAction(() => { workflowStore.nodes = updated; });
                }
                pushingToStore.current = false;
                return updated;
            });
        },
        []
    );

    const onEdgesChange: OnEdgesChange = useCallback(
        (changes) => {
            setEdges((eds) => {
                const updated = applyEdgeChanges(changes, eds);
                pushingToStore.current = true;
                if (changes.some((c) => c.type !== "select")) {
                    workflowStore.setEdges(updated);
                } else {
                    runInAction(() => { workflowStore.edges = updated; });
                }
                pushingToStore.current = false;
                return updated;
            });
        },
        []
    );

    const isValidConnection = useCallback(
        (connection: Connection) => {
            // Exclude the edge being reconnected so it doesn't block itself
            const edges = toJS(workflowStore.edges)
                .filter((e) => e.id !== reconnectingEdgeId.current);

            // Check source node: if it already has outgoing edges, the new one must use the same source handle
            const existingFromSource = edges.find((e) => e.source === connection.source);
            if (existingFromSource && existingFromSource.sourceHandle !== connection.sourceHandle) {
                return false;
            }

            // Check target node: if it already has incoming edges, the new one must use the same target handle
            const existingToTarget = edges.find((e) => e.target === connection.target);
            if (existingToTarget && existingToTarget.targetHandle !== connection.targetHandle) {
                return false;
            }

            return true;
        },
        []
    );

    const onReconnectStart = useCallback((_event: React.MouseEvent, edge: Edge) => {
        reconnectingEdgeId.current = edge.id;
    }, []);

    const onReconnect = useCallback(
        (oldEdge: Edge, newConnection: Connection) => {
            reconnectingEdgeId.current = null;
            setEdges((eds) => {
                const updated = reconnectEdge(oldEdge, newConnection, eds);
                pushingToStore.current = true;
                workflowStore.setEdges(updated);
                pushingToStore.current = false;
                return updated;
            });
        },
        []
    );

    const onReconnectEnd = useCallback((_event: MouseEvent | TouchEvent, edge: Edge) => {
        // If reconnect was cancelled (dropped on empty space), remove the edge
        if (reconnectingEdgeId.current) {
            reconnectingEdgeId.current = null;
            setEdges((eds) => {
                const updated = eds.filter((e) => e.id !== edge.id);
                pushingToStore.current = true;
                workflowStore.setEdges(updated);
                pushingToStore.current = false;
                return updated;
            });
        }
    }, []);

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
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            defaultEdgeOptions={defaultEdgeOptions}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onReconnectStart={onReconnectStart}
            onReconnect={onReconnect}
            onReconnectEnd={onReconnectEnd}
            isValidConnection={isValidConnection}
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
}

export default FlowCanvas;
