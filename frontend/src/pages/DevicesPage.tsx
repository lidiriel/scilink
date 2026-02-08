import { Title, Text, Container } from "@mantine/core";
import { useTranslation } from "react-i18next";

const DevicesPage = () => {
  const { t } = useTranslation();

  return (
    <Container>
      <Title order={2}>{t("nav.devices")}</Title>
      <Text mt="md">Devices page content goes here.</Text>
    </Container>
  );
};

export default DevicesPage;
