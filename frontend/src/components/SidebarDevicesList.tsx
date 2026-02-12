import { useState } from "react";
import { TextInput } from "@mantine/core";
import {
    IconPlugConnected,
    IconPlugConnectedX,
    IconWaveSine,
    IconSearch,
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
    const [searchFilter, setSearchFilter] = useState("");

    const filterLower = searchFilter.toLowerCase().trim();
    const filtered = filterLower
        ? devicesStore.devices.filter(
              (d) =>
                  d.label.toLowerCase().includes(filterLower) ||
                  d.piece_name.toLowerCase().includes(filterLower) ||
                  d.data?.tags?.some((t) => t.toLowerCase().includes(filterLower))
          )
        : devicesStore.devices;

    return (
        <div className="sidebar-devices-list">
            <TextInput
                size="xs"
                placeholder="Search devices..."
                leftSection={<IconSearch size={14} />}
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.currentTarget.value)}
                mb="xs"
            />
            {filtered.length === 0 ? (
                <p className="sidebar-empty">
                    {devicesStore.devices.length === 0 ? "No devices installed" : "No devices found"}
                </p>
            ) : filtered.map((device) => {
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
