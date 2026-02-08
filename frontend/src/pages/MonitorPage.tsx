import { Title, Text, Container } from "@mantine/core";
import { useTranslation } from "react-i18next";

const MonitorPage = () => {
  const { t } = useTranslation();

  return (
    <Container>
      <Title order={2}>{t("nav.monitor")}</Title>
      <Text mt="md">Monitor page content goes here.</Text>
    </Container>
  );
};

export default MonitorPage;
