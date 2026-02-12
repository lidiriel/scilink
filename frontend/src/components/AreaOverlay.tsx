import { useCallback } from "react";
import { useStore } from "reactflow";
import { IconX } from "@tabler/icons-react";

export interface AreaBounds {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
}

type HandleDir = "tl" | "t" | "tr" | "r" | "br" | "b" | "bl" | "l";

const HANDLE_SIZE = 10;

const cursorMap: Record<HandleDir, string> = {
    tl: "nwse-resize", t: "ns-resize", tr: "nesw-resize", r: "ew-resize",
    br: "nwse-resize", b: "ns-resize", bl: "nesw-resize", l: "ew-resize",
};

interface AreaOverlayProps {
    bounds: AreaBounds;
    valid: boolean;
    onClose: () => void;
    onBoundsChange: (bounds: AreaBounds) => void;
}

export default function AreaOverlay({ bounds, valid, onClose, onBoundsChange }: AreaOverlayProps) {
    const transform = useStore((s) => s.transform);
    const [vx, vy, zoom] = transform;

    const color = valid ? "#3b82f6" : "#fb923c";

    const screenLeft = bounds.minX * zoom + vx;
    const screenTop = bounds.minY * zoom + vy;
    const screenW = (bounds.maxX - bounds.minX) * zoom;
    const screenH = (bounds.maxY - bounds.minY) * zoom;

    const onHandleMouseDown = useCallback(
        (dir: HandleDir) => (e: React.MouseEvent) => {
            e.stopPropagation();
            e.preventDefault();
            const startX = e.clientX;
            const startY = e.clientY;
            const startBounds = { ...bounds };

            const onMouseMove = (ev: MouseEvent) => {
                const dx = (ev.clientX - startX) / zoom;
                const dy = (ev.clientY - startY) / zoom;
                const nb = { ...startBounds };

                if (dir.includes("l")) nb.minX = startBounds.minX + dx;
                if (dir.includes("r")) nb.maxX = startBounds.maxX + dx;
                if (dir === "t" || dir === "tl" || dir === "tr") nb.minY = startBounds.minY + dy;
                if (dir === "b" || dir === "bl" || dir === "br") nb.maxY = startBounds.maxY + dy;

                // Prevent inverting the box
                if (nb.maxX - nb.minX > 20 && nb.maxY - nb.minY > 20) {
                    onBoundsChange(nb);
                }
            };

            const onMouseUp = () => {
                document.removeEventListener("mousemove", onMouseMove);
                document.removeEventListener("mouseup", onMouseUp);
            };

            document.addEventListener("mousemove", onMouseMove);
            document.addEventListener("mouseup", onMouseUp);
        },
        [bounds, zoom, onBoundsChange]
    );

    const boxStyle: React.CSSProperties = {
        position: "absolute",
        left: screenLeft,
        top: screenTop,
        width: screenW,
        height: screenH,
        background: valid ? "rgba(59, 130, 246, 0.12)" : "rgba(251, 146, 60, 0.12)",
        border: `2px dashed ${color}`,
        borderRadius: 8,
        pointerEvents: "none",
        zIndex: 0,
        transition: "background 0.2s, border-color 0.2s",
    };

    const closeStyle: React.CSSProperties = {
        position: "absolute",
        top: 4,
        right: 4,
        width: 20,
        height: 20,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 4,
        background: color,
        color: "#fff",
        cursor: "pointer",
        pointerEvents: "auto",
        border: "none",
        padding: 0,
    };

    const half = HANDLE_SIZE / 2;

    const handlePositions: Record<HandleDir, { left: number; top: number }> = {
        tl: { left: -half, top: -half },
        t:  { left: screenW / 2 - half, top: -half },
        tr: { left: screenW - half, top: -half },
        r:  { left: screenW - half, top: screenH / 2 - half },
        br: { left: screenW - half, top: screenH - half },
        b:  { left: screenW / 2 - half, top: screenH - half },
        bl: { left: -half, top: screenH - half },
        l:  { left: -half, top: screenH / 2 - half },
    };

    return (
        <div style={boxStyle}>
            <button style={closeStyle} onClick={onClose} title="Clear area">
                <IconX size={14} />
            </button>
            {(Object.keys(handlePositions) as HandleDir[]).map((dir) => (
                <div
                    key={dir}
                    onMouseDown={onHandleMouseDown(dir)}
                    style={{
                        position: "absolute",
                        left: handlePositions[dir].left,
                        top: handlePositions[dir].top,
                        width: HANDLE_SIZE,
                        height: HANDLE_SIZE,
                        background: color,
                        borderRadius: 2,
                        cursor: cursorMap[dir],
                        pointerEvents: "auto",
                    }}
                />
            ))}
        </div>
    );
}
