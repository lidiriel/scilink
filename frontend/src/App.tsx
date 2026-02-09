import { Routes, Route, Navigate } from "react-router-dom";
import { AppShell } from "@mantine/core";

import '@mantine/core/styles.css';
import { MantineProvider } from '@mantine/core';

import AppNavbar from "./components/Navbar";
import Header from "./components/Header";
import DevicesPage from "./pages/DevicesPage";
import ExperimentsPage from "./pages/ExperimentsPage";
import WorkflowsPage from "./pages/WorkflowsPage";
import MonitorPage from "./pages/MonitorPage";
import SettingsPage from "./pages/SettingsPage";

const App = () => {
  return (
    <MantineProvider>
      <AppShell header={{ height: 56 }} navbar={{ width: 220, breakpoint: "sm" }} padding="md">
        <AppShell.Header>
          <Header />
        </AppShell.Header>
        <AppShell.Navbar p="xs">
          <AppNavbar />
        </AppShell.Navbar>
        <AppShell.Main>
          <Routes>
            <Route path="/" element={<Navigate to="/devices" replace />} />
            <Route path="/devices" element={<DevicesPage />} />
            <Route path="/experiments" element={<ExperimentsPage />} />
            <Route path="/workflows" element={<WorkflowsPage />} />
            <Route path="/monitor" element={<MonitorPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </AppShell.Main>
      </AppShell>
    </MantineProvider>
  );
};

export default App;
