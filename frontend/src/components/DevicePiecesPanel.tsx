import { useState } from "react";
import { TextInput, Select } from "@mantine/core";
import { IconSearch, IconPuzzle } from "@tabler/icons-react";
import { useDraggable } from "@dnd-kit/core";
import { observer } from "mobx-react-lite";
import { devicesStore, type DevicePiece } from "../behaviour/devices";
import { getDeviceIcon } from "../utils/deviceIcons";

function DraggablePieceItem({ piece }: { piece: DevicePiece }) {
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
        id: `piece-${piece.name}`,
        data: { piece },
    });

    return (
        <div
            ref={setNodeRef}
            className={`device-piece-item${isDragging ? " dragging" : ""}`}
            {...listeners}
            {...attributes}
        >
            {(() => { const Icon = getDeviceIcon(piece.tags); return <Icon size={14} className="piece-icon" />; })()}
            <span>{piece.node_label || piece.name}</span>
        </div>
    );
}

const DevicePiecesPanel = observer(function DevicePiecesPanel() {
    const [searchFilter, setSearchFilter] = useState("");

    const filterLower = searchFilter.toLowerCase().trim();
    const filtered = filterLower
        ? devicesStore.devicePieces.filter(
              (p) =>
                  p.name.toLowerCase().includes(filterLower) ||
                  (p.node_label && p.node_label.toLowerCase().includes(filterLower)) ||
                  p.category.toLowerCase().includes(filterLower)
          )
        : devicesStore.devicePieces;

    // Group by category
    const grouped: Record<string, DevicePiece[]> = {};
    filtered.forEach((piece) => {
        const cat = piece.category || "other";
        if (!grouped[cat]) grouped[cat] = [];
        grouped[cat].push(piece);
    });

    const directoryOptions = devicesStore.pieceDirectories.map((d) => ({
        value: d,
        label: d,
    }));

    return (
        <div className="device-pieces-panel">
            <div className="panel-header">
                <h3>
                    <IconPuzzle size={16} /> Available Devices
                </h3>
            </div>
            <div className="panel-controls">
                <TextInput
                    size="xs"
                    placeholder="Search devices..."
                    leftSection={<IconSearch size={14} />}
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.currentTarget.value)}
                />
                {directoryOptions.length > 1 && (
                    <Select
                        size="xs"
                        data={directoryOptions}
                        value={devicesStore.currentDirectory}
                        onChange={(val) => val && devicesStore.loadDevicePieces(val)}
                    />
                )}
            </div>
            <div className="panel-list">
                {filtered.length === 0 ? (
                    <div className="panel-empty">
                        {filterLower ? "No devices found" : "No device pieces available"}
                    </div>
                ) : (
                    Object.entries(grouped).map(([category, pieces]) => (
                        <div key={category}>
                            <div className="piece-category-header">{category}</div>
                            {pieces.map((piece) => (
                                <DraggablePieceItem key={piece.name} piece={piece} />
                            ))}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
});

export default DevicePiecesPanel;
