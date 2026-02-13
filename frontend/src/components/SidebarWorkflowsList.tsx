import { observer } from "mobx-react-lite";
import { IconSitemap } from "@tabler/icons-react";
import { workflowStore } from "../behaviour/workflows";
import { experimentsStore } from "../behaviour/experiments";

const SidebarWorkflowsList = observer(function SidebarWorkflowsList() {
    const parentExperiment = workflowStore.currentWorkflowId
        ? experimentsStore.experiments.find((exp) =>
              exp.workflows?.some((wf) => wf.id === workflowStore.currentWorkflowId)
          )
        : null;

    // Build ancestor set by walking parentId chain
    const ancestorIds = new Set<string>();
    if (parentExperiment && workflowStore.currentWorkflowId) {
        const wfMap = new Map(parentExperiment.workflows.map((wf) => [wf.id, wf]));
        let current = wfMap.get(workflowStore.currentWorkflowId);
        while (current?.parentId) {
            ancestorIds.add(current.parentId);
            current = wfMap.get(current.parentId);
        }
    }

    const siblingWorkflows = parentExperiment
    ? parentExperiment.workflows.filter(
          (wf) => wf.id !== workflowStore.currentWorkflowId && !ancestorIds.has(wf.id)
      )
    : [];

    if (siblingWorkflows.length === 0) {
        return <p className="sidebar-empty">No other workflows in this experiment</p>;
    }

    return (
        <div className="sidebar-workflows-list">
            {siblingWorkflows.map((wf) => (
                <div
                    key={wf.id}
                    className="sidebar-workflow-item"
                    draggable
                    onDragStart={(e) => {
                        e.dataTransfer.setData(
                            "application/scilink-workflow",
                            JSON.stringify({ id: wf.id, name: wf.name })
                        );
                        e.dataTransfer.effectAllowed = "copy";
                    }}
                >
                    <div className="sidebar-workflow-icon">
                        <IconSitemap size={14} />
                    </div>
                    <span className="sidebar-workflow-label">{wf.name}</span>
                </div>
            ))}
        </div>
    );
});

export default SidebarWorkflowsList;
