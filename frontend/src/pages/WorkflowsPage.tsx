import { useState } from "react";
import { Tabs } from "@mantine/core";
import { IconPuzzle, IconCpu, IconSitemap } from "@tabler/icons-react";
import { ReactFlowProvider } from "reactflow";
import FlowCanvas from "../components/FlowCanvas";
import SidebarBlocksList from "../components/SidebarBlocksList";
import SidebarDevicesList from "../components/SidebarDevicesList";
import "./WorkflowsPage.css";

const WorkflowsPage = () => {
    const [activeTab, setActiveTab] = useState<string | null>("blocks");

    return (
        <div className="workflows-page">
            <div className="workflows-sidebar">
                <Tabs value={activeTab} onChange={setActiveTab} variant="outline">
                    <Tabs.List grow>
                        <Tabs.Tab value="blocks" leftSection={<IconPuzzle size={14} />}>
                            Blocks
                        </Tabs.Tab>
                        <Tabs.Tab value="devices" leftSection={<IconCpu size={14} />}>
                            Devices
                        </Tabs.Tab>
                        <Tabs.Tab value="workflows" leftSection={<IconSitemap size={14} />}>
                            Workflows
                        </Tabs.Tab>
                    </Tabs.List>

                    <Tabs.Panel value="blocks" className="sidebar-panel">
                        <SidebarBlocksList />
                    </Tabs.Panel>
                    <Tabs.Panel value="devices" className="sidebar-panel">
                        <SidebarDevicesList />
                    </Tabs.Panel>
                    <Tabs.Panel value="workflows" className="sidebar-panel">
                        <p className="sidebar-empty">Sub-workflows will appear here</p>
                    </Tabs.Panel>
                </Tabs>
            </div>
            <div className="workflows-canvas">
                <ReactFlowProvider>
                    <FlowCanvas />
                </ReactFlowProvider>
            </div>
        </div>
    );
};

export default WorkflowsPage;
