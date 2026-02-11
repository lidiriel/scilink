import { Container, Button } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconFlask, IconPlus } from "@tabler/icons-react";
import ExperimentCards from "../components/ExperimentCards";
import ExperimentModal, { type ExperimentFormValues } from "../modals/ExperimentModal";
import { experimentsStore } from "../behaviour/experiments";
import "./ExperimentsPage.css";

const ExperimentsPage = () => {
    const [opened, { open, close }] = useDisclosure(false);

    const handleSubmit = (values: ExperimentFormValues) => {
        experimentsStore.save(values);
    };

    return (
        <Container>
            <ExperimentModal
                opened={opened}
                onClose={close}
                onSubmit={handleSubmit}
            />
            <h2 className="settings-section-title">
                <IconFlask color="var(--mantine-color-blue-filled)" />
                My Experiments
            </h2>
            <p className="settings-section-desc">
                Create and manage your experiments. Each experiment can contain multiple workflows.
            </p>
            <Button leftSection={<IconPlus size={14} />} variant="filled" onClick={open}>
                New Experiment
            </Button>
            <ExperimentCards />
        </Container>
    );
};

export default ExperimentsPage;
