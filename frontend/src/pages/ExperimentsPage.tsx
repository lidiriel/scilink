import { Title, Text, Container } from "@mantine/core";
import { useTranslation } from "react-i18next";

const ExperimentsPage = () => {
  const { t } = useTranslation();

  return (
    <Container>
      <Title order={2}>{t("nav.experiments")}</Title>
      <Text mt="md">Experiments page content goes here.</Text>
    </Container>
  );
};

export default ExperimentsPage;
