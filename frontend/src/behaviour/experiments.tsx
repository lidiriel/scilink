import { makeAutoObservable } from "mobx";

interface WorkflowData {
    id: string;
    name: string;
    experiment_id: number;
}

interface SubflowData {
    id: number;
    workflow_id: string;
    parent_id: string;
}

interface ExperimentData {
    id: number;
    name: string;
    description: string | null;
    workflows: WorkflowData[];
    subflows: SubflowData[];
    created_at: string;
    updated_at: string;
}

class ExperimentsStore {
    experiments: ExperimentData[] = [];
    currentExperimentId: number | null = null;

    constructor() {
        makeAutoObservable(this);
        this.loadExperiments();
    }

    async loadExperiments(): Promise<void> {
        try {
            const response = await fetch("/api/experiments");
            this.experiments = await response.json();
        } catch (error) {
            console.error("Error loading experiments:", error);
        }
    }

    async save(values: { id?: number; name: string; description?: string | null }): Promise<boolean> {
        try {
            let response;
            if (values.id) {
                response = await fetch(`/api/experiments/${values.id}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ name: values.name, description: values.description || null }),
                });
            } else {
                response = await fetch("/api/experiments", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ name: values.name, description: values.description || null }),
                });
            }

            if (response.ok) {
                await this.loadExperiments();
                return true;
            } else {
                const error = await response.json();
                alert(error.error || "Failed to save experiment");
                return false;
            }
        } catch (error) {
            console.error("Error saving experiment:", error);
            alert("Failed to save experiment");
            return false;
        }
    }

    async delete(id: number): Promise<void> {
        if (!confirm("Are you sure you want to delete this experiment and all its workflows?")) {
            return;
        }
        try {
            const response = await fetch(`/api/experiments/${id}`, { method: "DELETE" });
            if (response.ok) {
                if (this.currentExperimentId === id) {
                    this.currentExperimentId = null;
                }
                await this.loadExperiments();
            } else {
                alert("Failed to delete experiment");
            }
        } catch (error) {
            console.error("Error deleting experiment:", error);
            alert("Failed to delete experiment");
        }
    }

    selectExperiment(id: number): void {
        this.currentExperimentId = this.currentExperimentId === id ? null : id;
    }

    async addWorkflow(experimentId: number, name: string): Promise<boolean> {
        try {
            const response = await fetch(`/api/experiments/${experimentId}/workflows`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name }),
            });
            if (response.ok) {
                await this.loadExperiments();
                return true;
            } else {
                const error = await response.json();
                alert(error.error || "Failed to add workflow");
                return false;
            }
        } catch (error) {
            console.error("Error adding workflow:", error);
            alert("Failed to add workflow");
            return false;
        }
    }

    async renameWorkflow(workflowId: string, newName: string): Promise<boolean> {
        try {
            const response = await fetch(`/api/workflow/${workflowId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: newName }),
            });
            if (response.ok) {
                await this.loadExperiments();
                return true;
            } else {
                const error = await response.json();
                alert(error.error || "Failed to rename workflow");
                return false;
            }
        } catch (error) {
            console.error("Error renaming workflow:", error);
            alert("Failed to rename workflow");
            return false;
        }
    }

    async deleteWorkflow(workflowId: string): Promise<void> {
        if (!confirm("Are you sure you want to delete this workflow?")) {
            return;
        }
        try {
            const response = await fetch(`/api/workflow/${workflowId}`, { method: "DELETE" });
            if (response.ok) {
                await this.loadExperiments();
            } else {
                alert("Failed to delete workflow");
            }
        } catch (error) {
            console.error("Error deleting workflow:", error);
            alert("Failed to delete workflow");
        }
    }

    async runWorkflow(workflowId: string): Promise<void> {
        try {
            const response = await fetch(`/api/workflow/${workflowId}/run`, { method: "POST" });
            if (response.ok) {
                alert("Workflow execution started");
            } else {
                const error = await response.json();
                alert(error.error || "Failed to run workflow");
            }
        } catch (error) {
            console.error("Error running workflow:", error);
            alert("Failed to run workflow");
        }
    }
}

const experimentsStore = new ExperimentsStore();
export type { ExperimentData, WorkflowData, SubflowData };
export { experimentsStore };
