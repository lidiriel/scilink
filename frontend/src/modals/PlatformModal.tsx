import { useEffect } from "react";
import { Modal, TextInput, Textarea, Group, Button } from "@mantine/core";
import { useForm } from "@mantine/form";
import { IconDeviceFloppy } from "@tabler/icons-react";
import "./platform.css";

interface PlatformFormValues {
  id: string;
  name: string;
  description: string;
  host: string;
}

interface PlatformModalProps {
  opened: boolean;
  onClose: () => void;
  onSubmit: (values: PlatformFormValues) => void;
  initialValues?: Partial<PlatformFormValues>;
}

const PlatformModal = ({ opened, onClose, onSubmit, initialValues }: PlatformModalProps) => {
  const isEdit = !!initialValues?.id;

  const form = useForm<PlatformFormValues>({
    initialValues: {
      id: "",
      name: "",
      description: "",
      host: "",
    },
    validate: {
      name: (value) => (value.trim().length > 0 ? null : "Name is required"),
      host: (value) => (value.trim().length > 0 ? null : "Host is required"),
    },
  });

  useEffect(() => {
    if (opened) {
      form.setValues({
        id: initialValues?.id ?? "",
        name: initialValues?.name ?? "",
        description: initialValues?.description ?? "",
        host: initialValues?.host ?? "",
      });
    }
  }, [opened]);

  const handleSubmit = (values: PlatformFormValues) => {
    onSubmit(values);
    onClose();
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={isEdit ? "Edit Platform" : "Add Platform"}
      size="md"
    >
      <form onSubmit={form.onSubmit(handleSubmit)} className="platform-form">
        <TextInput
          label="Name"
          placeholder="e.g., Local Docker"
          withAsterisk
          {...form.getInputProps("name")}
        />
        <Textarea
          label="Description"
          placeholder="Optional description..."
          rows={3}
          mt="md"
          {...form.getInputProps("description")}
        />
        <TextInput
          label="Host"
          placeholder="e.g., localhost:2375"
          withAsterisk
          mt="md"
          {...form.getInputProps("host")}
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

export default PlatformModal;
