import { memo } from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import { IconX } from "@tabler/icons-react";
import { workflowStore } from "../behaviour/workflows";
import { DeviceIcon } from "../utils/deviceIcons";
import "./DeviceNode.scss";

const DeviceNode = memo(function DeviceNode({ id, data }: NodeProps) {
    const visibleFields: string[] = data.nodeData?.visible_fields || [];
    const userInputs: Record<string, any> = data.nodeData?.user_inputs || {};

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
                <DeviceIcon iconClassName={data.iconClass} size={14} />
            </div>
            <div className="device-node-content">
                <span className="device-node-label">{data.label}</span>
                {visibleFields.length > 0 && (
                    <div className="device-node-fields">
                        {visibleFields.map((key) => (
                            <span key={key} className="device-node-field">
                                {key}: {String(userInputs[key] ?? "")}
                            </span>
                        ))}
                    </div>
                )}
            </div>
            <Handle type="target" position={Position.Top} id="target-top" />
            <Handle type="target" position={Position.Left} id="target-left" />
            <Handle type="source" position={Position.Bottom} id="source-bottom" />
            <Handle type="source" position={Position.Right} id="source-right" />
        </div>
    );
});

export default DeviceNode;
