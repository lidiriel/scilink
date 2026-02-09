import { useDisclosure } from '@mantine/hooks';
import { Title, Container, Button } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { IconServer, IconServerSpark } from '@tabler/icons-react';
import PlatformModal from "../modals/PlatformModal";
import PlatformCards from '../components/PlatformCards';
import { platformsStore } from "../behaviour/settings";
import "./SettingsPage.css";

const SettingsPage = () => {
  const { t } = useTranslation();
  const [opened, { open, close }] = useDisclosure(false);
  return (
    <Container>
      <PlatformModal
        opened={opened}
        onClose={close}
        onSubmit={(values) => {
          platformsStore.save(values);
        }}
      />
      <Title order={2}>{t("nav.settings")}</Title>
      <Title order={2}><IconServer/>Platforms</Title>
      <p className="settings-section-desc">Configure execution platforms and their bus connections for your workflows.</p>
      <Button leftSection={<IconServerSpark size={14} />} variant="default" onClick={open}>
        Add Platform
      </Button>
      <PlatformCards />
    </Container>
  );
};

export default SettingsPage;
