import { useState } from "react";
import { useDisclosure } from "@mantine/hooks";
import { Container, Button, Tabs, Text } from "@mantine/core";
import { IconServer, IconServerSpark, IconUsers, IconAdjustments, IconLanguage } from "@tabler/icons-react";
import LanguageSelector from "../components/LanguageSelector";
import PlatformModal from "../modals/PlatformModal";
import PlatformCards from "../components/PlatformCards";
import { platformsStore } from "../behaviour/settings";
import "./SettingsPage.scss";

const SettingsPage = () => {
    const [activeTab, setActiveTab] = useState<string | null>("platforms");
    const [opened, { open, close }] = useDisclosure(false);

    return (
        <Container>
            <Tabs value={activeTab} onChange={setActiveTab} variant="outline">
                <Tabs.List>
                    <Tabs.Tab value="platforms" leftSection={<IconServer size={16} />}>
                        Platforms
                    </Tabs.Tab>
                    <Tabs.Tab value="users" leftSection={<IconUsers size={16} />}>
                        Users
                    </Tabs.Tab>
                    <Tabs.Tab value="general" leftSection={<IconAdjustments size={16} />}>
                        General
                    </Tabs.Tab>
                </Tabs.List>

                <Tabs.Panel value="platforms" pt="md">
                    <PlatformModal
                        opened={opened}
                        onClose={close}
                        onSubmit={(values) => {
                            platformsStore.save(values);
                        }}
                    />
                    <p className="settings-section-desc">
                        Configure execution platforms and their bus connections for your workflows.
                    </p>
                    <Button leftSection={<IconServerSpark size={14} />} variant="filled" onClick={open}>
                        Add Platform
                    </Button>
                    <PlatformCards />
                </Tabs.Panel>

                <Tabs.Panel value="users" pt="md">
                    <p className="settings-section-desc">Manage user accounts and permissions.</p>
                    <Text c="dimmed" ta="center" py="xl">User management coming soon.</Text>
                </Tabs.Panel>

                <Tabs.Panel value="general" pt="md">
                    <p className="settings-section-desc">General application settings.</p>
                    <div style={{ maxWidth: 300 }}>
                        <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.875rem", fontWeight: 500, marginBottom: "0.5rem" }}>
                            <IconLanguage size={16} /> Language
                        </label>
                        <LanguageSelector />
                    </div>
                </Tabs.Panel>
            </Tabs>
        </Container>
    );
};

export default SettingsPage;
