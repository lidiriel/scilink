import { Card, SegmentedControl } from "@mantine/core";
import { IconPencil, IconTrash, IconCpu, IconLink, IconServer, IconArrowMoveRight } from "@tabler/icons-react";
import { useDroppable } from "@dnd-kit/core";
import { observer } from "mobx-react-lite";
import { devicesStore, type DeviceData } from "../behaviour/devices";
import { getDeviceIcon } from "../utils/deviceIcons";

interface DevicesGridProps {
    onEdit: (device: DeviceData) => void;
}

function getModeClass(mode: string): string {
    const classes: Record<string, string> = {
        activate: "mode-activate",
        deactivate: "mode-deactivate",
        simulate: "mode-simulate",
    };
    return classes[mode] || "mode-deactivate";
}

const DevicesGrid = observer(function DevicesGrid({ onEdit }: DevicesGridProps) {
    const { isOver, setNodeRef } = useDroppable({ id: "devices-drop-zone" });

    const devices = [...devicesStore.devices].sort((a, b) => a.label.localeCompare(b.label));

    if (devices.length === 0) {
        return (
            <div
                ref={setNodeRef}
                className={`devices-drop-zone${isOver ? " drag-over" : ""}`}
            >
                <div className="drop-hint">
                    <IconCpu size={32} />
                    <span>Drop a device here to install</span>
                </div>
            </div>
        );
    }

    return (
        <div
            ref={setNodeRef}
            className={`devices-drop-zone${isOver ? " drag-over" : ""}`}
        >
            <div className="devices-grid">
                {devices.map((device) => {
                    const deviceMode = device.mode || "deactivate";
                    const platformName = devicesStore.getPlatformName(device.platform_id);
                    const dependencyLabel = devicesStore.getDependencyLabel(device.depends_on_id);
                    const busName = device.data?.bus_name;
                    const connectionType = device.data?.connection_type;

                    return (
                        <Card
                            key={device.id}
                            className={`device-card ${getModeClass(deviceMode)}`}
                            padding={0}
                            radius="md"
                            withBorder
                        >
                            <div className="device-card-header">
                                <div className="device-card-icon">
                                    {(() => { const Icon = getDeviceIcon(device.data?.tags); return <Icon size={16} />; })()}
                                </div>
                                <h4 className="device-card-label">{device.label}</h4>
                            </div>

                            <div className="device-card-body">
                                <p className="device-card-piece">{device.piece_name}</p>
                                {platformName && (
                                    <p className="device-card-platform">
                                        <IconServer size={10} /> {platformName}
                                    </p>
                                )}
                                {dependencyLabel && (
                                    <p className="device-card-dependency">
                                        <IconArrowMoveRight size={10} /> {dependencyLabel}
                                    </p>
                                )}
                                {(busName || connectionType) && (
                                    <p className="device-card-bus">
                                        <IconLink size={10} /> {busName || connectionType}
                                        {device.data?.slave_id != null && ` #${device.data.slave_id}`}
                                        {device.data?.bus_id != null && ` #${device.data.bus_id}`}
                                    </p>
                                )}
                            </div>

                            <div className="device-card-footer">
                                <SegmentedControl
                                    size="xs"
                                    value={deviceMode}
                                    onChange={(val) => devicesStore.updateMode(device.id, val)}
                                    data={[
                                        { label: "On", value: "activate" },
                                        { label: "Off", value: "deactivate" },
                                        { label: "Sim", value: "simulate" },
                                    ]}
                                />
                                <div className="device-card-actions">
                                    <button
                                        className="device-card-btn"
                                        title="Edit"
                                        onClick={() => onEdit(device)}
                                    >
                                        <IconPencil size={12} />
                                    </button>
                                    <button
                                        className="device-card-btn delete"
                                        title="Delete"
                                        onClick={() => devicesStore.delete(device.id)}
                                    >
                                        <IconTrash size={12} />
                                    </button>
                                </div>
                            </div>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
});

export default DevicesGrid;
