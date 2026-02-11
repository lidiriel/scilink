import { memo } from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import { IconX } from "@tabler/icons-react";
import { workflowStore } from "../behaviour/workflows";
import { getBlockIcon } from "../utils/blockIcons";
import "./BlockNode.scss";

const BlockNode = memo(function BlockNode({ id, data }: NodeProps) {
    const Icon = getBlockIcon(data.iconClass);

    return (
        <div className="block-node">
            <button
                className="block-node-delete"
                title="Delete node"
                onClick={(e) => {
                    e.stopPropagation();
                    workflowStore.setNodes(workflowStore.nodes.filter((n) => n.id !== id));
                }}
            >
                <IconX size={10} />
            </button>
            <div className="block-node-icon">
                <Icon size={14} />
            </div>
            <span className="block-node-label">{data.label}</span>
            <Handle type="target" position={Position.Top} />
            <Handle type="source" position={Position.Bottom} />
        </div>
    );
});

export default BlockNode;
