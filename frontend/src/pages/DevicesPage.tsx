import { useState } from "react";
import { DndContext, DragOverlay, type DragStartEvent, type DragEndEvent } from "@dnd-kit/core";
import { useDisclosure } from "@mantine/hooks";
import { IconCpu } from "@tabler/icons-react";
import { observer } from "mobx-react-lite";
import DevicePiecesPanel from "../components/DevicePiecesPanel";
import DevicesGrid from "../components/DevicesGrid";
import DeviceModal from "../modals/DeviceModal";
import { type DevicePiece, type DeviceData } from "../behaviour/devices";
import "./DevicesPage.scss";

const DevicesPage = observer(function DevicesPage() {
    const [opened, { open, close }] = useDisclosure(false);
    const [modalPiece, setModalPiece] = useState<DevicePiece | null>(null);
    const [modalDevice, setModalDevice] = useState<DeviceData | null>(null);
    const [activePiece, setActivePiece] = useState<DevicePiece | null>(null);

    const handleDragStart = (event: DragStartEvent) => {
        const piece = event.active.data.current?.piece as DevicePiece | undefined;
        setActivePiece(piece || null);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        setActivePiece(null);
        const { over, active } = event;
        if (over?.id === "devices-drop-zone" && active.data.current?.piece) {
            const piece = active.data.current.piece as DevicePiece;
            setModalPiece(piece);
            setModalDevice(null);
            open();
        }
    };

    const handleEdit = (device: DeviceData) => {
        setModalDevice(device);
        setModalPiece(null);
        open();
    };

    return (
        <>
            <DeviceModal
                opened={opened}
                onClose={close}
                piece={modalPiece}
                device={modalDevice}
            />
            <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
                <div className="devices-page-layout">
                    <DevicePiecesPanel />
                    <div className="installed-devices-section">
                        <div className="section-header">
                            <h2>
                                <IconCpu size={20} color="var(--mantine-color-blue-filled)" />
                                Installed Devices
                            </h2>
                            <p>Drag devices from the left panel to install them.</p>
                        </div>
                        <DevicesGrid onEdit={handleEdit} />
                    </div>
                </div>
                <DragOverlay>
                    {activePiece ? (
                        <div className="device-piece-item dragging-overlay">
                            <IconCpu size={14} className="piece-icon" />
                            <span>{activePiece.node_label || activePiece.name}</span>
                        </div>
                    ) : null}
                </DragOverlay>
            </DndContext>
        </>
    );
});

export default DevicesPage;
