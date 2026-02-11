import { memo } from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import { IconX } from "@tabler/icons-react";
import { workflowStore } from "../behaviour/workflows";
import { getDeviceIcon } from "../utils/deviceIcons";
import "./DeviceNode.scss";

const DeviceNode = memo(function DeviceNode({ id, data }: NodeProps) {
    const Icon = getDeviceIcon(data.tags);

    return (
        <div className="device-node">
            <button
                className="device-node-delete"
                title="Delete node"
                onClick={(e) => {
                    e.stopPropagation();
                    workflowStore.setNodes(workflowStore.nodes.filter((n) => n.id !== id));
                }}
            >
                <IconX size={10} />
            </button>
            <div className="device-node-icon">
                <Icon size={14} />
            </div>
            <span className="device-node-label">{data.label}</span>
            <Handle type="target" position={Position.Top} id="target-top" />
            <Handle type="target" position={Position.Left} id="target-left" />
            <Handle type="source" position={Position.Bottom} id="source-bottom" />
            <Handle type="source" position={Position.Right} id="source-right" />
        </div>
    );
});

export default DeviceNode;
