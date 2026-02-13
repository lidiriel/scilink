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
import AreaOverlay, { type AreaBounds } from "./AreaOverlay";

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

interface FlowCanvasProps {
    selectionMode?: boolean;
    areaValid?: boolean;
    onSelectedNodesChange?: (nodeIds: string[]) => void;
}

const FlowCanvas = function FlowCanvas({ selectionMode = false, areaValid = false, onSelectedNodesChange }: FlowCanvasProps) {
    const reactFlowInstance = useReactFlow();
    const [nodes, setNodes] = useState<Node[]>([]);
    const [edges, setEdges] = useState<Edge[]>([]);
    const [areaBounds, setAreaBounds] = useState<AreaBounds | null>(null);
    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
    const [modalOpened, { open: openModal, close: closeModal }] = useDisclosure(false);
    const pushingToStore = useRef(false);
    const reconnectingEdgeId = useRef<string | null>(null);
    const pendingSelectionRef = useRef<Node[]>([]);
    const connectingFrom = useRef<{ nodeId: string; handleId: string } | null>(null);

    // Clear area when leaving selection mode
    useEffect(() => {
        if (!selectionMode) {
            setAreaBounds(null);
            pendingSelectionRef.current = [];
        }
    }, [selectionMode]);

    // Finalize area on mouseup: create bounds from pending selection, then deselect nodes
    useEffect(() => {
        const onMouseUp = () => {
            const pending = pendingSelectionRef.current;
            if (pending.length === 0) return;
            pendingSelectionRef.current = [];

            const AREA_PADDING = 20;
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            for (const n of pending) {
                const w = n.width ?? 160;
                const h = n.height ?? 40;
                minX = Math.min(minX, n.position.x);
                minY = Math.min(minY, n.position.y);
                maxX = Math.max(maxX, n.position.x + w);
                maxY = Math.max(maxY, n.position.y + h);
            }
            setAreaBounds({
                minX: minX - AREA_PADDING,
                minY: minY - AREA_PADDING,
                maxX: maxX + AREA_PADDING,
                maxY: maxY + AREA_PADDING,
            });
            // Remove RF's post-selection styling (blue borders + nodesselection box)
            setNodes((nds) => nds.map((n) => (n.selected ? { ...n, selected: false } : n)));
        };

        if (selectionMode) {
            document.addEventListener("mouseup", onMouseUp);
            return () => document.removeEventListener("mouseup", onMouseUp);
        }
    }, [selectionMode]);

    // Compute which nodes are inside the locked area bounds (by center point)
    const areaNodeIds = areaBounds
        ? new Set(
              nodes
                  .filter((n) => {
                      const cx = n.position.x + (n.width ?? 160) / 2;
                      const cy = n.position.y + (n.height ?? 40) / 2;
                      return cx >= areaBounds.minX && cx <= areaBounds.maxX
                          && cy >= areaBounds.minY && cy <= areaBounds.maxY;
                  })
                  .map((n) => n.id)
          )
        : new Set<string>();

    // Notify parent of area node changes
    const prevAreaIdsRef = useRef<string>("");
    useEffect(() => {
        const key = [...areaNodeIds].sort().join(",");
        if (key !== prevAreaIdsRef.current) {
            prevAreaIdsRef.current = key;
            onSelectedNodesChange?.([...areaNodeIds]);
        }
    });

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

    // Fit view when switching workflows
    const prevWorkflowId = useRef<string | null>(null);
    useEffect(() => {
        const dispose = autorun(() => {
            const id = workflowStore.currentWorkflowId;
            if (id && id !== prevWorkflowId.current) {
                prevWorkflowId.current = id;
                setTimeout(() => reactFlowInstance.fitView({ padding: 0.2 }), 50);
            }
        });
        return dispose;
    }, [reactFlowInstance]);

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
            if (existingFromSource && existingFromSource.sourceHandle && existingFromSource.sourceHandle !== connection.sourceHandle) {
                return false;
            }

            // Check target node: if it already has incoming edges, the new one must use the same target handle
            const existingToTarget = edges.find((e) => e.target === connection.target);
            if (existingToTarget && existingToTarget.targetHandle && existingToTarget.targetHandle !== connection.targetHandle) {
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

    const onConnectStart = useCallback(
        (_event: React.MouseEvent | React.TouchEvent, params: { nodeId: string | null; handleId: string | null }) => {
            if (params.nodeId && params.handleId) {
                connectingFrom.current = { nodeId: params.nodeId, handleId: params.handleId };
            }
        },
        []
    );

    const onConnectEnd = useCallback(
        (event: MouseEvent | TouchEvent) => {
            if (!connectingFrom.current) return;
            const from = connectingFrom.current;
            connectingFrom.current = null;

            const clientPos = "changedTouches" in event
                ? { x: event.changedTouches[0].clientX, y: event.changedTouches[0].clientY }
                : { x: (event as MouseEvent).clientX, y: (event as MouseEvent).clientY };

            // Check if the drop landed on a node element
            const el = document.elementFromPoint(clientPos.x, clientPos.y);
            const nodeEl = el?.closest(".react-flow__node") as HTMLElement | null;
            if (!nodeEl) return;

            const targetNodeId = nodeEl.getAttribute("data-id");
            if (!targetNodeId || targetNodeId === from.nodeId) return;

            const edges = toJS(workflowStore.edges);

            // Skip if duplicate
            if (edges.some((e) => e.source === from.nodeId && e.target === targetNodeId)) return;

            // Determine target handle: respect existing handle constraint, otherwise pick nearest
            const existingToTarget = edges.find((e) => e.target === targetNodeId);
            let targetHandle: string;

            if (existingToTarget?.targetHandle) {
                targetHandle = existingToTarget.targetHandle;
            } else {
                // Find nearest target handle on the node DOM element
                const handles = nodeEl.querySelectorAll<HTMLElement>(".react-flow__handle");
                const targetHandles = Array.from(handles).filter(
                    (h) => h.dataset.handleid?.startsWith("target-")
                );
                if (targetHandles.length === 0) return;

                let closest = targetHandles[0];
                let minDist = Infinity;
                for (const h of targetHandles) {
                    const rect = h.getBoundingClientRect();
                    const hx = rect.left + rect.width / 2;
                    const hy = rect.top + rect.height / 2;
                    const dist = Math.hypot(clientPos.x - hx, clientPos.y - hy);
                    if (dist < minDist) {
                        minDist = dist;
                        closest = h;
                    }
                }
                targetHandle = closest.dataset.handleid || "target-top";
            }

            // Validate source handle constraint
            const existingFromSource = edges.find((e) => e.source === from.nodeId);
            if (existingFromSource && existingFromSource.sourceHandle && existingFromSource.sourceHandle !== from.handleId) return;

            // Validate target handle constraint
            if (existingToTarget && existingToTarget.targetHandle && existingToTarget.targetHandle !== targetHandle) return;

            workflowStore.setEdges(addEdge({
                source: from.nodeId,
                sourceHandle: from.handleId,
                target: targetNodeId,
                targetHandle,
            }, edges));
        },
        []
    );

    const onSelectionChange = useCallback(
        ({ nodes: selected }: { nodes: Node[] }) => {
            if (!selectionMode) return;
            if (selected.length === 0) return;
            // Area already locked — ignore further selection changes (e.g. clicking a node to move it).
            // User must clear the area (X button) before drawing a new one.
            if (areaBounds) return;

            // Store latest selection; area will be created on mouseup
            pendingSelectionRef.current = selected;
        },
        [selectionMode, areaBounds]
    );

    const onClearArea = useCallback(() => {
        setAreaBounds(null);
        onSelectedNodesChange?.([]);
    }, [onSelectedNodesChange]);

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
        <div style={{ position: "relative", width: "100%", height: "100%" }}>
            <ReactFlow
                nodes={nodes}
                edges={edges}
                nodeTypes={nodeTypes}
                defaultEdgeOptions={defaultEdgeOptions}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onConnectStart={onConnectStart}
                onConnectEnd={onConnectEnd}
                onReconnectStart={onReconnectStart}
                onReconnect={onReconnect}
                onReconnectEnd={onReconnectEnd}
                isValidConnection={isValidConnection}
                connectionRadius={20}
                onDragOver={onDragOver}
                onDrop={onDrop}
                onNodeDoubleClick={onNodeDoubleClick}
                onSelectionChange={onSelectionChange}
                selectionOnDrag={selectionMode}
                panOnDrag={selectionMode ? [1, 2] : true}
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
            {selectionMode && areaBounds && (
                <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", pointerEvents: "none", overflow: "hidden" }}>
                    <AreaOverlay
                        bounds={areaBounds}
                        valid={areaValid}
                        onClose={onClearArea}
                        onBoundsChange={setAreaBounds}
                    />
                </div>
            )}
        </div>
        <NodeInputsModal opened={modalOpened} onClose={closeModal} nodeId={selectedNodeId} />
    </>
    );
}

export default FlowCanvas;
