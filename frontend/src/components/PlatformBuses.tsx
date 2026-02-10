import { useState } from 'react';
import { IconTrash, IconPencil, IconPlus } from "@tabler/icons-react";
import { useDisclosure } from "@mantine/hooks";
import { observer } from "mobx-react-lite";
import { platformsStore } from "../behaviour/settings";
import BusModal, { type BusFormValues } from "../modals/BusModal";

interface PlatformBusesProps {
    platformId: number;
}

const PlatformBuses = observer(function PlatformBuses({ platformId }: PlatformBusesProps) {
    const buses = platformsStore.platformBuses[platformId] || [];
    const [opened, { open, close }] = useDisclosure(false);
    const [editValues, setEditValues] = useState<Partial<BusFormValues> | undefined>(undefined);

    const handleAdd = () => {
        setEditValues(undefined);
        open();
    };

    const handleEdit = (bus: typeof buses[0]) => {
        setEditValues({
            id: String(bus.id),
            name: bus.name,
            description: bus.description || "",
            platform_id: bus.data?.platform_id ?? platformId,
            connection_type: bus.data?.connection_type || "",
            port: bus.data?.port || "",
            baud_rate: String(bus.data?.baud_rate ?? ""),
            data_bits: String(bus.data?.data_bits ?? ""),
            parity: bus.data?.parity || "",
            stop_bits: String(bus.data?.stop_bits ?? ""),
        });
        open();
    };

    const formatBusSettings = (data: any) => {
        if (!data) return "";
        const parts: string[] = [];
        if (data.port) parts.push(data.port);
        if (data.baud_rate) parts.push(`${data.baud_rate} baud`);
        if (data.data_bits) parts.push(`${data.data_bits}${data.parity?.[0]?.toUpperCase() || "N"}${data.stop_bits || 1}`);
        return parts.join(" · ");
    };

    return (
        <>
            <BusModal
                opened={opened}
                onClose={close}
                onSubmit={(values) => platformsStore.saveBus(values)}
                platformId={platformId}
                initialValues={editValues}
            />
            <div className="platform-buses-header">
                <span className="platform-buses-title">Bus Connections</span>
                <button className="bus-add-btn" onClick={handleAdd}>
                    <IconPlus size={12} /> Add Bus
                </button>
            </div>
            {buses.length === 0 ? (
                <p className="platform-empty">No bus connections configured</p>
            ) : (
                <div className="platform-buses-list">
                    {buses.map((bus) => (
                        <div className="bus-item" key={bus.id}>
                            <div className="bus-item-info">
                                <p className="bus-item-name">
                                    {bus.name}
                                    <span className="bus-item-badge">
                                        {bus.data?.connection_type || "Unknown"}
                                    </span>
                                </p>
                                {formatBusSettings(bus.data) && (
                                    <p className="bus-item-settings">{formatBusSettings(bus.data)}</p>
                                )}
                            </div>
                            <div className="bus-item-actions">
                                <button className="bus-item-btn" title="Edit" onClick={() => handleEdit(bus)}>
                                    <IconPencil size={12} />
                                </button>
                                <button className="bus-item-btn delete" title="Delete" onClick={() => platformsStore.deleteBus(bus.id)}>
                                    <IconTrash size={12} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </>
    );
});

export default PlatformBuses;
