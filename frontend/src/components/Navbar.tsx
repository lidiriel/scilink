import { Tooltip, Stack, ActionIcon } from "@mantine/core";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
    IconSettings,
    IconCpu,
    IconFlask,
    IconSitemap,
    IconChartBar,
} from "@tabler/icons-react";

const navItems = [
    { label: "nav.monitor", path: "/monitor", icon: IconChartBar },
    { label: "nav.workflows", path: "/workflows", icon: IconSitemap },
    { label: "nav.experiments", path: "/experiments", icon: IconFlask },
    { label: "nav.devices", path: "/devices", icon: IconCpu },
    { label: "nav.settings", path: "/settings", icon: IconSettings },
];

const AppNavbar = () => {
    const { t } = useTranslation();
    const location = useLocation();
    const navigate = useNavigate();

    return (
        <Stack justify="flex-start" h="100%" align="center" pt="xs" gap={4}>
            {navItems.map((item) => {
                const isActive = location.pathname.startsWith(item.path);
                return (
                    <Tooltip key={item.path} label={t(item.label)} position="right" withArrow>
                        <ActionIcon
                            variant={isActive ? "filled" : "subtle"}
                            color={isActive ? "blue" : "gray"}
                            size="lg"
                            onClick={() => navigate(item.path)}
                        >
                            <item.icon size={20} />
                        </ActionIcon>
                    </Tooltip>
                );
            })}
        </Stack>
    );
};

export default AppNavbar;
