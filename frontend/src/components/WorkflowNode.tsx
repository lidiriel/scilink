import { memo } from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import { IconX, IconSitemap } from "@tabler/icons-react";
import { workflowStore } from "../behaviour/workflows";
import "./WorkflowNode.scss";

const WorkflowNode = memo(function WorkflowNode({ id, data }: NodeProps) {
    return (
        <div className="workflow-node">
            <button
                className="workflow-node-delete"
                title="Delete node"
                onClick={(e) => {
                    e.stopPropagation();
                    workflowStore.setNodes(workflowStore.nodes.filter((n) => n.id !== id));
                }}
            >
                <IconX size={10} />
            </button>
            <div className="workflow-node-icon">
                <IconSitemap size={14} />
            </div>
            <span className="workflow-node-label">{data.label}</span>
            <Handle type="target" position={Position.Top} id="target-top" />
            <Handle type="target" position={Position.Left} id="target-left" />
            <Handle type="source" position={Position.Bottom} id="source-bottom" />
            <Handle type="source" position={Position.Right} id="source-right" />
        </div>
    );
});

export default WorkflowNode;
