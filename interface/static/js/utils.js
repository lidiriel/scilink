// Utility functions

// Escape HTML to prevent XSS
export function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Convert icon class name format to Font Awesome classes
// Format: "fa-brands:python" -> "fa-brands fa-python"
// Format: "fa-solid:fa-plug" -> "fa-solid fa-plug"
export function convertIconClass(iconClassName) {
    if (!iconClassName) return 'fa-solid fa-cube';

    const parts = iconClassName.split(':');
    if (parts.length === 2) {
        const prefix = parts[0];
        let iconName = parts[1];
        // Add fa- prefix if not present
        if (!iconName.startsWith('fa-')) {
            iconName = 'fa-' + iconName;
        }
        return `${prefix} ${iconName}`;
    }
    return iconClassName;
}

// Create a smooth bezier curve path between two points (horizontal orientation)
export function createSmoothPath(x1, y1, x2, y2) {
    // Calculate control point offset based on distance
    const dx = Math.abs(x2 - x1);
    const offset = Math.min(dx * 0.5, 150); // Control point offset, capped at 150px

    // Control points for cubic bezier
    const cx1 = x1 + offset;
    const cy1 = y1;
    const cx2 = x2 - offset;
    const cy2 = y2;

    return `M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}`;
}

// Create a smooth bezier curve path for vertical connections
export function createSmoothPathVertical(x1, y1, x2, y2) {
    // Calculate control point offset based on vertical distance
    const dy = Math.abs(y2 - y1);
    const offset = Math.min(dy * 0.5, 150); // Control point offset, capped at 150px

    // Control points for cubic bezier (vertical curve)
    const cx1 = x1;
    const cy1 = y1 + offset;
    const cx2 = x2;
    const cy2 = y2 - offset;

    return `M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}`;
}

// Create a smooth bezier curve with mixed orientations
// fromDir: 'horizontal' (exits right) or 'vertical' (exits down)
// toDir: 'horizontal' (enters left) or 'vertical' (enters top)
export function createSmoothPathMixed(x1, y1, x2, y2, fromDir, toDir) {
    const dx = Math.abs(x2 - x1);
    const dy = Math.abs(y2 - y1);
    const dist = Math.sqrt(dx * dx + dy * dy);
    const offset = Math.min(dist * 0.4, 150);

    // Control point 1: based on source port direction
    let cx1, cy1;
    if (fromDir === 'vertical') {
        // Exit downward
        cx1 = x1;
        cy1 = y1 + offset;
    } else {
        // Exit rightward (horizontal)
        cx1 = x1 + offset;
        cy1 = y1;
    }

    // Control point 2: based on target port direction
    let cx2, cy2;
    if (toDir === 'vertical') {
        // Enter from top
        cx2 = x2;
        cy2 = y2 - offset;
    } else {
        // Enter from left (horizontal)
        cx2 = x2 - offset;
        cy2 = y2;
    }

    return `M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}`;
}
