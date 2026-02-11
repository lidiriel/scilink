import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Tabs, ActionIcon, Tooltip, Breadcrumbs, Anchor } from "@mantine/core";
import { IconPuzzle, IconCpu, IconSitemap, IconDeviceFloppy, IconCheck, IconCircleFilled } from "@tabler/icons-react";
import { ReactFlowProvider } from "reactflow";
import { observer } from "mobx-react-lite";
import FlowCanvas from "../components/FlowCanvas";
import SidebarBlocksList from "../components/SidebarBlocksList";
import SidebarDevicesList from "../components/SidebarDevicesList";
import { workflowStore } from "../behaviour/workflows";
import { experimentsStore } from "../behaviour/experiments";
import "./WorkflowsPage.scss";

const WorkflowsPage = observer(() => {
    const navigate = useNavigate();
    const { workflowId } = useParams<{ workflowId: string }>();
    const [activeTab, setActiveTab] = useState<string | null>("blocks");

    useEffect(() => {
        if (workflowId) {
            workflowStore.loadWorkflow(workflowId);
        } else {
            workflowStore.clearWorkflow();
        }
    }, [workflowId]);

    // Find parent experiment for breadcrumb
    const parentExperiment = workflowStore.currentWorkflowId
        ? experimentsStore.experiments.find((exp) =>
              exp.workflows?.some((wf) => wf.id === workflowStore.currentWorkflowId)
          )
        : null;

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
            <div className="workflows-canvas-wrapper">
                {workflowStore.currentWorkflowId && (
                    <div className="workflows-toolbar">
                        <Breadcrumbs className="workflows-breadcrumb">
                            <Anchor size="sm" onClick={() => navigate("/experiments")}>
                                Experiments
                            </Anchor>
                            {parentExperiment && (
                                <Anchor size="sm" onClick={() => navigate("/experiments")}>
                                    {parentExperiment.name}
                                </Anchor>
                            )}
                            <span className="workflows-breadcrumb-current">
                                {workflowStore.workflowName}
                            </span>
                        </Breadcrumbs>
                        <div className="workflows-toolbar-actions">
                            {workflowStore.dirty ? (
                                <span className="workflows-status unsaved">
                                    <IconCircleFilled size={8} /> Unsaved changes
                                </span>
                            ) : (
                                <span className="workflows-status saved">
                                    <IconCheck size={14} /> Saved
                                </span>
                            )}
                            <Tooltip label="Save workflow">
                                <ActionIcon
                                    variant={workflowStore.dirty ? "filled" : "subtle"}
                                    color={workflowStore.dirty ? "blue" : "gray"}
                                    size="lg"
                                    onClick={() => workflowStore.saveWorkflow()}
                                >
                                    <IconDeviceFloppy size={18} />
                                </ActionIcon>
                            </Tooltip>
                        </div>
                    </div>
                )}
                <div className="workflows-canvas">
                    <ReactFlowProvider>
                        <FlowCanvas />
                    </ReactFlowProvider>
                </div>
            </div>
        </div>
    );
});

export default WorkflowsPage;
