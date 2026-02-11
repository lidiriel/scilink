import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDisclosure } from "@mantine/hooks";
import {
    IconPencil,
    IconTrash,
    IconPlayerPlay,
    IconPlus,
    IconCheck,
    IconPointer,
    IconSitemap,
    IconArrowRight,
} from "@tabler/icons-react";
import { observer } from "mobx-react-lite";
import { experimentsStore, type ExperimentData } from "../behaviour/experiments";
import ExperimentModal, { type ExperimentFormValues } from "../modals/ExperimentModal";

const ExperimentCards = observer(function ExperimentCards() {
    const navigate = useNavigate();
    const [opened, { open, close }] = useDisclosure(false);
    const [editValues, setEditValues] = useState<Partial<ExperimentFormValues> | undefined>(undefined);

    const handleEdit = (experiment: ExperimentData) => {
        setEditValues({
            id: experiment.id,
            name: experiment.name,
            description: experiment.description || "",
        });
        open();
    };

    const handleAddWorkflow = (experimentId: number) => {
        const name = prompt("Enter workflow name:");
        if (name && name.trim()) {
            experimentsStore.addWorkflow(experimentId, name.trim());
        }
    };

    const handleRenameWorkflow = (workflowId: string, currentName: string) => {
        const newName = prompt("Enter new workflow name:", currentName);
        if (newName && newName.trim() && newName.trim() !== currentName) {
            experimentsStore.renameWorkflow(workflowId, newName.trim());
        }
    };

    const handleSubmit = (values: ExperimentFormValues) => {
        experimentsStore.save(values);
    };

    return (
        <>
            <ExperimentModal
                opened={opened}
                onClose={close}
                onSubmit={handleSubmit}
                initialValues={editValues}
            />

            {experimentsStore.experiments.length === 0 ? (
                <div className="settings-empty">No experiments yet. Create your first experiment!</div>
            ) : (
                <div className="experiments-list">
                    {experimentsStore.experiments.map((experiment) => {
                        const isSelected = experimentsStore.currentExperimentId === experiment.id;
                        const workflows = experiment.workflows || [];

                        return (
                            <div
                                key={experiment.id}
                                className={`experiment-card${isSelected ? " selected" : ""}`}
                            >
                                {/* Header */}
                                <div className="experiment-header">
                                    <div className="experiment-info">
                                        <p className="experiment-name">
                                            {isSelected && (
                                                <IconCheck size={14} color="#22c55e" style={{ marginRight: "0.5rem" }} />
                                            )}
                                            {experiment.name}
                                        </p>
                                        {experiment.description && (
                                            <p className="experiment-desc">{experiment.description}</p>
                                        )}
                                    </div>
                                    <div className="experiment-actions">
                                        <button
                                            className={`settings-item-btn${isSelected ? " active" : ""}`}
                                            title={isSelected ? "Selected" : "Select experiment"}
                                            onClick={() => experimentsStore.selectExperiment(experiment.id)}
                                        >
                                            {isSelected ? <IconCheck size={14} /> : <IconPointer size={14} />}
                                        </button>
                                        <button
                                            className="settings-item-btn edit"
                                            title="Edit"
                                            onClick={() => handleEdit(experiment)}
                                        >
                                            <IconPencil size={14} />
                                        </button>
                                        <button
                                            className="settings-item-btn delete"
                                            title="Delete"
                                            onClick={() => experimentsStore.delete(experiment.id)}
                                        >
                                            <IconTrash size={14} />
                                        </button>
                                    </div>
                                </div>

                                {/* Workflows Section */}
                                <div className="experiment-workflows">
                                    {workflows.length > 0 ? (
                                        <>
                                            <div className="experiment-workflows-header">
                                                <IconSitemap size={12} />
                                                Workflows ({workflows.length})
                                            </div>
                                            <ul className="experiment-workflows-list">
                                                {workflows.map((wf) => (
                                                    <li key={wf.id} className="experiment-workflow-item">
                                                        <div className="workflow-item-info">
                                                            <IconSitemap size={12} />
                                                            <span>{wf.name}</span>
                                                        </div>
                                                        <button
                                                            className="workflow-item-run"
                                                            title="Run workflow"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                experimentsStore.runWorkflow(wf.id);
                                                            }}
                                                        >
                                                            <IconPlayerPlay size={12} />
                                                        </button>
                                                        <button
                                                            className="workflow-item-edit"
                                                            title="Open in editor"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                navigate(`/workflows/${wf.id}`);
                                                            }}
                                                        >
                                                            <IconArrowRight size={12} />
                                                        </button>
                                                        <button
                                                            className="workflow-item-edit"
                                                            title="Rename workflow"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleRenameWorkflow(wf.id, wf.name);
                                                            }}
                                                        >
                                                            <IconPencil size={12} />
                                                        </button>
                                                        <button
                                                            className="workflow-item-delete"
                                                            title="Delete workflow"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                experimentsStore.deleteWorkflow(wf.id);
                                                            }}
                                                        >
                                                            <IconTrash size={12} />
                                                        </button>
                                                    </li>
                                                ))}
                                            </ul>
                                        </>
                                    ) : (
                                        <p className="experiment-no-workflows">No workflows yet</p>
                                    )}
                                    <button
                                        className="experiment-add-workflow-btn"
                                        onClick={() => handleAddWorkflow(experiment.id)}
                                    >
                                        <IconPlus size={12} /> Add Workflow
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </>
    );
});

export default ExperimentCards;
