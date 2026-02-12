import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Tabs, ActionIcon, Tooltip, Breadcrumbs, Anchor, TextInput } from "@mantine/core";
import { IconPuzzle, IconCpu, IconSitemap, IconDeviceFloppy, IconCheck, IconCircleFilled, IconPointer, IconCheckbox } from "@tabler/icons-react";
import { toJS } from "mobx";
import { ReactFlowProvider } from "reactflow";
import { observer } from "mobx-react-lite";
import FlowCanvas from "../components/FlowCanvas";
import SidebarBlocksList from "../components/SidebarBlocksList";
import SidebarDevicesList from "../components/SidebarDevicesList";
import SidebarWorkflowsList from "../components/SidebarWorkflowsList";
import { workflowStore, reactFlowNodeToApi, reactFlowEdgeToApi } from "../behaviour/workflows";
import { experimentsStore } from "../behaviour/experiments";
import "./WorkflowsPage.scss";

const WorkflowsPage = observer(() => {
    const navigate = useNavigate();
    const { workflowId } = useParams<{ workflowId: string }>();
    const [activeTab, setActiveTab] = useState<string | null>("blocks");
    const [selectionMode, setSelectionMode] = useState(false);
    const [areaName, setAreaName] = useState("");
    const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([]);

    const onSelectedNodesChange = useCallback((nodeIds: string[]) => {
        setSelectedNodeIds(nodeIds);
    }, []);

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

    // Compute area validity: boundary-crossing connectors + name uniqueness
    // No useMemo — observer ensures re-render on MobX edge changes
    // Rule: all input-crossing edges must arrive at the SAME internal connector (node+handle),
    //        all output-crossing edges must leave from the SAME internal connector (node+handle).
    let areaValid = false;
    if (selectionMode && selectedNodeIds.length > 0) {
        const selectedSet = new Set(selectedNodeIds);
        const edges = toJS(workflowStore.edges);

        const inputConnectors = new Set<string>();
        const outputConnectors = new Set<string>();
        for (const e of edges) {
            const srcInside = selectedSet.has(e.source);
            const tgtInside = selectedSet.has(e.target);
            if (!srcInside && tgtInside) {
                inputConnectors.add(`${e.target}::${e.targetHandle ?? ""}`);
            }
            if (srcInside && !tgtInside) {
                outputConnectors.add(`${e.source}::${e.sourceHandle ?? ""}`);
            }
        }

        if (inputConnectors.size <= 1 && outputConnectors.size <= 1) {
            const trimmed = areaName.trim();
            if (trimmed) {
                const nameExists = parentExperiment?.workflows.some(
                    (wf) => wf.name.toLowerCase() === trimmed.toLowerCase()
                );
                areaValid = !nameExists;
            }
        }
    }

    const handleCreateSubWorkflow = async () => {
        if (!parentExperiment || !workflowStore.currentWorkflowId) return;

        const selectedSet = new Set(selectedNodeIds);
        const allNodes = toJS(workflowStore.nodes);
        const allEdges = toJS(workflowStore.edges);

        // Classify edges
        const internalEdges = allEdges.filter(
            (e) => selectedSet.has(e.source) && selectedSet.has(e.target)
        );
        const inputCrossing = allEdges.filter(
            (e) => !selectedSet.has(e.source) && selectedSet.has(e.target)
        );
        const outputCrossing = allEdges.filter(
            (e) => selectedSet.has(e.source) && !selectedSet.has(e.target)
        );

        // 1. Create new workflow in the experiment
        const trimmedName = areaName.trim();
        const createRes = await fetch(
            `/api/experiments/${parentExperiment.id}/workflows`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: trimmedName }),
            }
        );
        if (!createRes.ok) {
            alert("Failed to create sub-workflow");
            return;
        }
        const { workflow: newWorkflow } = await createRes.json();

        // 2. Save selected nodes + internal edges into the new workflow
        const selectedNodes = allNodes.filter((n) => selectedSet.has(n.id));
        const subNodes = selectedNodes.map(reactFlowNodeToApi);
        const subEdges = internalEdges.map(reactFlowEdgeToApi);

        const saveRes = await fetch(`/api/workflow/${newWorkflow.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ nodes: subNodes, edges: subEdges }),
        });
        if (!saveRes.ok) {
            alert("Failed to save sub-workflow content");
            return;
        }

        // 3. Compute center position for the new workflow node
        const centerX =
            selectedNodes.reduce((s, n) => s + n.position.x + (n.width ?? 160) / 2, 0) /
            selectedNodes.length;
        const centerY =
            selectedNodes.reduce((s, n) => s + n.position.y + (n.height ?? 40) / 2, 0) /
            selectedNodes.length;

        // 4. Add workflow node referencing the new sub-workflow
        const newNodeId = workflowStore.generateNodeId();
        const workflowNode = {
            id: newNodeId,
            type: "workflow" as const,
            position: { x: centerX - 80, y: centerY - 20 },
            data: { label: trimmedName, workflowRef: newWorkflow.id },
        };

        // 5. Build replacement edges for boundary crossings
        const newEdges = inputCrossing.map((e) => ({
            id: `e-${e.source}-${newNodeId}`,
            source: e.source,
            sourceHandle: e.sourceHandle,
            target: newNodeId,
            targetHandle: e.targetHandle,
            animated: true,
        }));
        for (const e of outputCrossing) {
            newEdges.push({
                id: `e-${newNodeId}-${e.target}`,
                source: newNodeId,
                sourceHandle: e.sourceHandle,
                target: e.target,
                targetHandle: e.targetHandle,
                animated: true,
            });
        }

        // 6. Update current workflow: remove selected nodes + their edges, add workflow node + new edges
        const remainingNodes = allNodes.filter((n) => !selectedSet.has(n.id));
        const remainingEdges = allEdges.filter(
            (e) => !selectedSet.has(e.source) && !selectedSet.has(e.target)
        );
        workflowStore.setNodes([...remainingNodes, workflowNode]);
        workflowStore.setEdges([...remainingEdges, ...newEdges]);

        // 7. Save current workflow + reload experiments (sidebar updates)
        await workflowStore.saveWorkflow();
        await experimentsStore.loadExperiments();

        // 8. Exit selection mode
        setSelectionMode(false);
        setAreaName("");
        setSelectedNodeIds([]);
    };

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
                        <SidebarWorkflowsList />
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
                            <Tooltip label="Selection mode">
                                <ActionIcon
                                    variant={selectionMode ? "filled" : "subtle"}
                                    color={selectionMode ? "blue" : "gray"}
                                    size="lg"
                                    onClick={() => {
                                        setSelectionMode(!selectionMode);
                                        if (selectionMode) {
                                            setAreaName("");
                                            setSelectedNodeIds([]);
                                        }
                                    }}
                                >
                                    <IconPointer size={18} />
                                </ActionIcon>
                            </Tooltip>
                            {selectionMode && (
                                <>
                                    <TextInput
                                        size="xs"
                                        placeholder="Sub-workflow name"
                                        value={areaName}
                                        onChange={(e) => setAreaName(e.currentTarget.value)}
                                        style={{ width: 180 }}
                                    />
                                    <Tooltip label="Create sub-workflow">
                                        <ActionIcon
                                            variant="filled"
                                            color={areaValid ? "blue" : "gray"}
                                            size="lg"
                                            disabled={!areaValid}
                                            onClick={handleCreateSubWorkflow}
                                        >
                                            <IconCheckbox size={18} />
                                        </ActionIcon>
                                    </Tooltip>
                                </>
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
                        <FlowCanvas
                            selectionMode={selectionMode}
                            areaValid={areaValid}
                            onSelectedNodesChange={onSelectedNodesChange}
                        />
                    </ReactFlowProvider>
                </div>
            </div>
        </div>
    );
});

export default WorkflowsPage;
