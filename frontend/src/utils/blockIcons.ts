import {
    IconClock,
    IconHourglass,
    IconBrandPython,
    IconAlarm,
    IconTransform,
    IconPuzzle,
    IconCode,
    IconMath,
    IconFilter,
    IconArrowsShuffle,
    IconPlayerPlay,
    type Icon,
} from "@tabler/icons-react";

const ICON_MAP: Record<string, Icon> = {
    "fa-solid:clock": IconClock,
    "fa-solid:hourglass-start": IconHourglass,
    "fa-solid:hourglass": IconHourglass,
    "fa-brands:python": IconBrandPython,
    "fa-solid:alarm-clock": IconAlarm,
    "fa-solid:timer": IconAlarm,
    "fa-solid:exchange-alt": IconTransform,
    "fa-solid:code": IconCode,
    "fa-solid:calculator": IconMath,
    "fa-solid:filter": IconFilter,
    "fa-solid:random": IconArrowsShuffle,
    "fa-solid:play": IconPlayerPlay,
};

export function getBlockIcon(iconClassName: string | undefined | null): Icon {
    if (!iconClassName) return IconPuzzle;
    return ICON_MAP[iconClassName] || IconPuzzle;
}
