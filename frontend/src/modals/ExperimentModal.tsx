import { useEffect } from "react";
import { Modal, TextInput, Textarea, Group, Button } from "@mantine/core";
import { useForm } from "@mantine/form";
import { IconDeviceFloppy } from "@tabler/icons-react";

export interface ExperimentFormValues {
    id?: number;
    name: string;
    description: string;
}

interface ExperimentModalProps {
    opened: boolean;
    onClose: () => void;
    onSubmit: (values: ExperimentFormValues) => void;
    initialValues?: Partial<ExperimentFormValues>;
}

const ExperimentModal = ({ opened, onClose, onSubmit, initialValues }: ExperimentModalProps) => {
    const isEdit = !!initialValues?.id;

    const form = useForm<ExperimentFormValues>({
        initialValues: {
            name: "",
            description: "",
        },
        validate: {
            name: (value) => (value.trim().length > 0 ? null : "Name is required"),
        },
    });

    useEffect(() => {
        if (opened) {
            form.setValues({
                id: initialValues?.id,
                name: initialValues?.name ?? "",
                description: initialValues?.description ?? "",
            });
        }
    }, [opened]);

    const handleSubmit = (values: ExperimentFormValues) => {
        onSubmit(values);
        onClose();
    };

    return (
        <Modal
            opened={opened}
            onClose={onClose}
            title={isEdit ? "Edit Experiment" : "New Experiment"}
            size="md"
        >
            <form onSubmit={form.onSubmit(handleSubmit)}>
                <TextInput
                    label="Name"
                    placeholder="e.g., RNA Sequencing Analysis"
                    withAsterisk
                    {...form.getInputProps("name")}
                />
                <Textarea
                    label="Description"
                    placeholder="Describe your experiment..."
                    rows={3}
                    mt="md"
                    {...form.getInputProps("description")}
                />
                <Group justify="flex-end" mt="xl">
                    <Button variant="default" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button type="submit" leftSection={<IconDeviceFloppy size={16} />}>
                        Save
                    </Button>
                </Group>
            </form>
        </Modal>
    );
};

export default ExperimentModal;
