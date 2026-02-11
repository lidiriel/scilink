import { makeAutoObservable, runInAction } from "mobx";
import type { Node, Edge } from "reactflow";
import type { BlockPiece } from "./pieces";

interface ApiNode {
    id: string;
    type: string;
    label: string;
    x: number;
    y: number;
    pieceName?: string;
    pieceDirectory?: string;
    pieceHash?: string;
    iconClass?: string;
    data?: Record<string, any>;
}

interface ApiEdge {
    id: string;
    from: string;
    to: string;
    animated?: boolean;
}

function apiNodeToReactFlow(apiNode: ApiNode): Node {
    return {
        id: apiNode.id,
        type: apiNode.pieceName ? "block" : apiNode.type || "default",
        position: { x: apiNode.x, y: apiNode.y },
        data: {
            label: apiNode.label,
            pieceName: apiNode.pieceName,
            pieceDirectory: apiNode.pieceDirectory,
            pieceHash: apiNode.pieceHash,
            iconClass: apiNode.iconClass,
            nodeData: apiNode.data,
        },
    };
}

function reactFlowNodeToApi(node: Node): ApiNode {
    const d = node.data || {};
    return {
        id: node.id,
        type: node.type === "block" ? "default" : (node.type || "default"),
        label: d.label || node.id,
        x: Math.round(node.position.x),
        y: Math.round(node.position.y),
        pieceName: d.pieceName,
        pieceDirectory: d.pieceDirectory,
        pieceHash: d.pieceHash,
        iconClass: d.iconClass,
        data: d.nodeData,
    };
}

function apiEdgeToReactFlow(apiEdge: ApiEdge): Edge {
    return {
        id: apiEdge.id,
        source: apiEdge.from,
        target: apiEdge.to,
        animated: apiEdge.animated !== false,
    };
}

function reactFlowEdgeToApi(edge: Edge): ApiEdge {
    return {
        id: edge.id,
        from: edge.source,
        to: edge.target,
        animated: edge.animated !== false,
    };
}

class WorkflowStore {
    currentWorkflowId: string | null = null;
    workflowName: string = "";
    nodes: Node[] = [];
    edges: Edge[] = [];
    nodeIdCounter: number = 0;
    dirty: boolean = false;
    loading: boolean = false;

    constructor() {
        makeAutoObservable(this);
    }

    private updateNodeIdCounter(): void {
        let maxId = 0;
        for (const node of this.nodes) {
            const match = node.id.match(/^node_(\d+)$/);
            if (match) {
                maxId = Math.max(maxId, parseInt(match[1], 10));
            }
        }
        this.nodeIdCounter = maxId;
    }

    generateNodeId(): string {
        this.nodeIdCounter++;
        return `node_${this.nodeIdCounter}`;
    }

    async loadWorkflow(id: string): Promise<void> {
        this.loading = true;
        try {
            const response = await fetch(`/api/workflow/${id}`);
            if (!response.ok) {
                console.error("Failed to load workflow:", response.status);
                return;
            }
            const data = await response.json();
            runInAction(() => {
                this.currentWorkflowId = id;
                this.workflowName = data.name || "";
                this.nodes = (data.nodes || []).map(apiNodeToReactFlow);
                this.edges = (data.edges || []).map((e: any) =>
                    apiEdgeToReactFlow({ id: e.id, from: e.from, to: e.to, animated: e.animated })
                );
                this.updateNodeIdCounter();
                this.dirty = false;
            });
        } catch (error) {
            console.error("Error loading workflow:", error);
        } finally {
            runInAction(() => {
                this.loading = false;
            });
        }
    }

    async saveWorkflow(): Promise<boolean> {
        if (!this.currentWorkflowId) return false;

        try {
            const payload = {
                nodes: this.nodes.map(reactFlowNodeToApi),
                edges: this.edges.map(reactFlowEdgeToApi),
            };

            const response = await fetch(`/api/workflow/${this.currentWorkflowId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (response.ok) {
                runInAction(() => {
                    this.dirty = false;
                });
                return true;
            } else {
                const error = await response.json();
                console.error("Save workflow failed:", error);
                alert(error.error || "Failed to save workflow");
                return false;
            }
        } catch (error) {
            console.error("Error saving workflow:", error);
            alert("Failed to save workflow");
            return false;
        }
    }

    addBlockNode(piece: BlockPiece, position: { x: number; y: number }): void {
        const nodeId = this.generateNodeId();
        const newNode: Node = {
            id: nodeId,
            type: "block",
            position,
            data: {
                label: piece.node_label,
                pieceName: piece.name,
                pieceDirectory: piecesStore.currentDirectory,
                pieceHash: piece.git_hash,
                iconClass: piece.icon_class_name,
            },
        };
        this.nodes = [...this.nodes, newNode];
        this.dirty = true;
    }

    setNodes(nodes: Node[]): void {
        this.nodes = nodes;
        this.dirty = true;
    }

    setEdges(edges: Edge[]): void {
        this.edges = edges;
        this.dirty = true;
    }

    clearWorkflow(): void {
        this.currentWorkflowId = null;
        this.workflowName = "";
        this.nodes = [];
        this.edges = [];
        this.nodeIdCounter = 0;
        this.dirty = false;
    }
}

// Lazy import to avoid circular dependency
import { piecesStore } from "./pieces";

const workflowStore = new WorkflowStore();
export type { ApiNode, ApiEdge };
export { workflowStore };
