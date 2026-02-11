import {
    IconPlugConnected,
    IconPlugConnectedX,
    IconWaveSine,
} from "@tabler/icons-react";
import { observer } from "mobx-react-lite";
import { devicesStore } from "../behaviour/devices";
import { getDeviceIcon } from "../utils/deviceIcons";

function getModeClass(mode: string): string {
    return mode === "activate" ? "mode-activate" : mode === "simulate" ? "mode-simulate" : "mode-deactivate";
}

function ModeIcon({ mode }: { mode: string }) {
    if (mode === "activate") return <IconPlugConnected size={14} />;
    if (mode === "simulate") return <IconWaveSine size={14} />;
    return <IconPlugConnectedX size={14} />;
}

const SidebarDevicesList = observer(function SidebarDevicesList() {
    const devices = devicesStore.devices;

    if (devices.length === 0) {
        return <p className="sidebar-empty">No devices installed</p>;
    }

    return (
        <div className="sidebar-devices-list">
            {devices.map((device) => {
                const deviceMode = device.mode || "deactivate";
                return (
                    <div
                        key={device.id}
                        className={`sidebar-device-item ${getModeClass(deviceMode)}`}
                        draggable
                        onDragStart={(e) => {
                            e.dataTransfer.setData(
                                "application/scilink-device",
                                JSON.stringify({
                                    id: device.id,
                                    label: device.label,
                                    piece_name: device.piece_name,
                                    tags: device.data?.tags,
                                })
                            );
                            e.dataTransfer.effectAllowed = "copy";
                        }}
                    >
                        <div className="sidebar-device-icon">
                            {(() => { const Icon = getDeviceIcon(device.data?.tags); return <Icon size={14} />; })()}
                        </div>
                        <div className="sidebar-device-info">
                            <span className="sidebar-device-label">{device.label}</span>
                            <span className="sidebar-device-type">{device.piece_name}</span>
                        </div>
                        <div className={`sidebar-device-mode-icon ${getModeClass(deviceMode)}`}>
                            <ModeIcon mode={deviceMode} />
                        </div>
                    </div>
                );
            })}
        </div>
    );
});

export default SidebarDevicesList;
