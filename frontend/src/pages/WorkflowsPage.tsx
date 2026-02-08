import { Title, Text, Container } from "@mantine/core";
import { useTranslation } from "react-i18next";

const WorkflowsPage = () => {
  const { t } = useTranslation();

  return (
    <Container>
      <Title order={2}>{t("nav.workflows")}</Title>
      <Text mt="md">Workflows page content goes here.</Text>
    </Container>
  );
};

export default WorkflowsPage;
