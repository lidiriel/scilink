import { Title, Text, Container } from "@mantine/core";
import { useTranslation } from "react-i18next";

const SettingsPage = () => {
  const { t } = useTranslation();

  return (
    <Container>
      <Title order={2}>{t("nav.settings")}</Title>
      <Text mt="md">Settings page content goes here.</Text>
    </Container>
  );
};

export default SettingsPage;
