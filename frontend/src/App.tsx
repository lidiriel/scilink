import { useTranslation } from "react-i18next";
import { Container } from "@mantine/core";

// Import styles of packages that you've installed.
// All packages except `@mantine/hooks` require styles imports
import '@mantine/core/styles.css';
import { MantineProvider } from '@mantine/core';

// custom components
import Header from "./components/Header";
import Test from "./components/Test";

//------------- main app -----------------
const App = () => {
  const { t } = useTranslation();
  const line1 = t("detail.line1");
  const line2 = t("detail.line2");

  return (
    <MantineProvider>
      <div style={{ minHeight: '100vh', padding: '2rem' }}>
        <Header />
        <Container size="sm" style={{ textAlign: 'center', marginTop: '7rem' }}>
          <h1 style={{ fontSize: '2.25rem', fontWeight: 'bold' }}>{t("greeting")}</h1>
          <p style={{ marginTop: '2rem' }}>{line1}</p>
          <p style={{ marginTop: '0.5rem' }}>{line2}</p>
        </Container>
        <p>SciLink Frontend</p>
        <Test />
      </div>
    </MantineProvider>
  );
};

export default App

