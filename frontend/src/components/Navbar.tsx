import { NavLink, Stack, Divider } from "@mantine/core";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  CogIcon,
  CpuChipIcon,
  BeakerIcon,
  ArrowPathIcon,
  ChartBarIcon,
} from "@heroicons/react/24/outline";
import LanguageSelector from "./LanguageSelector";

const navItems = [
  { label: "nav.monitor", path: "/monitor", icon: ChartBarIcon },
  { label: "nav.workflows", path: "/workflows", icon: ArrowPathIcon },
  { label: "nav.experiments", path: "/experiments", icon: BeakerIcon },
  { label: "nav.devices", path: "/devices", icon: CpuChipIcon },
  { label: "nav.settings", path: "/settings", icon: CogIcon },
];

const AppNavbar = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <Stack justify="space-between" h="100%">
      <Stack gap={0}>
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            label={t(item.label)}
            leftSection={<item.icon style={{ width: 20, height: 20 }} />}
            active={location.pathname.startsWith(item.path)}
            onClick={() => navigate(item.path)}
          />
        ))}
      </Stack>
      <Stack gap="xs" p="sm">
        <Divider />
        <LanguageSelector />
      </Stack>
    </Stack>
  );
};

export default AppNavbar;
