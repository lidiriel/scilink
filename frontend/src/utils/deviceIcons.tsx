import { library, type IconName, type IconPrefix } from "@fortawesome/fontawesome-svg-core";
import {
    faPlug,
    faBolt,
    faDroplet,
    faTemperatureHalf,
    faWaveSquare,
    faMicrochip,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

// Register the subset of solid icons used by device metadata
library.add(faPlug, faBolt, faDroplet, faTemperatureHalf, faWaveSquare, faMicrochip);

const PREFIX_MAP: Record<string, IconPrefix> = { "fa-solid": "fas" };

/**
 * Parse an icon_class_name like "fa-solid:fa-plug" into [IconPrefix, IconName]
 */
function parseIconClassName(iconClassName: string): [IconPrefix, IconName] | null {
    const parts = iconClassName.split(":");
    if (parts.length !== 2) return null;
    const prefix = PREFIX_MAP[parts[0]] || (parts[0] as IconPrefix);
    const iconName = parts[1].replace(/^fa-/, "") as IconName;
    return [prefix, iconName];
}

export function DeviceIcon({ iconClassName, size }: { iconClassName?: string | null; size?: number }) {
    const parsed = iconClassName ? parseIconClassName(iconClassName) : null;
    const icon: [IconPrefix, IconName] = parsed || ["fas", "microchip"];
    return <FontAwesomeIcon icon={icon} style={{ fontSize: size ?? 14 }} />;
}