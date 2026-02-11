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

    const siblingWorkflows = parentExperiment
        ? parentExperiment.workflows.filter((wf) => wf.id !== workflowStore.currentWorkflowId)
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
