import { ReactFlowProvider } from "reactflow";
import FlowCanvas from "../components/FlowCanvas";
import "./WorkflowsPage.css";

const WorkflowsPage = () => {
    return (
        <div className="workflows-page">
            <ReactFlowProvider>
                <FlowCanvas />
            </ReactFlowProvider>
        </div>
    );
};

export default WorkflowsPage;
