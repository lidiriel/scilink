import { useState } from "react";
import { TextInput, Select } from "@mantine/core";
import { IconSearch } from "@tabler/icons-react";
import { observer } from "mobx-react-lite";
import { piecesStore, type BlockPiece } from "../behaviour/pieces";
import { getBlockIcon } from "../utils/blockIcons";

const SidebarBlocksList = observer(function SidebarBlocksList() {
    const [searchFilter, setSearchFilter] = useState("");

    const filterLower = searchFilter.toLowerCase().trim();
    const filtered = filterLower
        ? piecesStore.blockPieces.filter(
              (p) =>
                  p.node_label.toLowerCase().includes(filterLower) ||
                  p.name.toLowerCase().includes(filterLower) ||
                  p.tags.some((t) => t.toLowerCase().includes(filterLower))
          )
        : piecesStore.blockPieces;

    // Group by category
    const grouped: Record<string, BlockPiece[]> = {};
    filtered.forEach((piece) => {
        const cat = piece.category || "other";
        if (!grouped[cat]) grouped[cat] = [];
        grouped[cat].push(piece);
    });

    return (
        <div className="sidebar-blocks-list">
            {piecesStore.pieceDirectories.length > 1 && (
                <Select
                    size="xs"
                    data={piecesStore.pieceDirectories.map((d) => ({ value: d, label: d }))}
                    value={piecesStore.currentDirectory}
                    onChange={(val) => val && piecesStore.loadBlockPieces(val)}
                    mb="xs"
                />
            )}
            <TextInput
                size="xs"
                placeholder="Search blocks..."
                leftSection={<IconSearch size={14} />}
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.currentTarget.value)}
                mb="xs"
            />
            {filtered.length === 0 ? (
                <p className="sidebar-empty">{piecesStore.blockPieces.length === 0 ? "No block pieces available" : "No blocks found"}</p>
            ) : (
                Object.entries(grouped).map(([category, pieces]) => (
                    <div key={category} className="sidebar-block-category">
                        <div className="sidebar-block-category-header">{category}</div>
                        {pieces.map((piece) => {
                            const Icon = getBlockIcon(piece.icon_class_name);
                            return (
                                <div
                                    key={piece.name}
                                    className="sidebar-block-item"
                                    draggable
                                    onDragStart={(e) => {
                                        e.dataTransfer.setData("application/scilink-block", JSON.stringify(piece));
                                        e.dataTransfer.effectAllowed = "copy";
                                    }}
                                >
                                    <div className="sidebar-block-icon">
                                        <Icon size={14} />
                                    </div>
                                    <span className="sidebar-block-label">{piece.node_label}</span>
                                </div>
                            );
                        })}
                    </div>
                ))
            )}
        </div>
    );
});

export default SidebarBlocksList;
