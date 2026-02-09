import { Group, Title } from '@mantine/core';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import './Header.css';

const routeTitles: Record<string, string> = {
  '/devices': 'nav.devices',
  '/experiments': 'nav.experiments',
  '/workflows': 'nav.workflows',
  '/monitor': 'nav.monitor',
  '/settings': 'nav.settings',
};

export default function Header() {
  const { t } = useTranslation();
  const location = useLocation();

  const titleKey = Object.entries(routeTitles).find(
    ([path]) => location.pathname.startsWith(path)
  )?.[1] ?? '';

  return (
    <Group className="inner" h="100%" px="md">
      <Title order={3}>{t(titleKey)}</Title>
    </Group>
  );
}
