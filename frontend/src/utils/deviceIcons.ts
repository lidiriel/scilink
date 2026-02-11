import {
    IconCpu,
    IconTemperature,
    IconEngine,
    IconBolt,
    IconDroplet,
    IconCamera,
    IconBulb,
    IconAntenna,
    IconGauge,
    type Icon,
} from "@tabler/icons-react";

const TAG_ICON_MAP: Record<string, Icon> = {
    sensors: IconTemperature,
    actuator: IconEngine,
    relays: IconBolt,
    fluidics: IconDroplet,
    camera: IconCamera,
    light: IconBulb,
    communication: IconAntenna,
    gauge: IconGauge,
};

// Priority order: more specific tags first, "hardware" is ignored (too generic)
const TAG_PRIORITY = ["fluidics", "camera", "light", "communication", "gauge", "sensors", "actuator", "relays"];

export function getDeviceIcon(tags: string[] | undefined | null): Icon {
    if (!tags || tags.length === 0) return IconCpu;
    for (const tag of TAG_PRIORITY) {
        if (tags.includes(tag)) {
            return TAG_ICON_MAP[tag];
        }
    }
    return IconCpu;
}
