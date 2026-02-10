import { useEffect, useState } from "react";
import { Modal, TextInput, Textarea, Select, Group, Button } from "@mantine/core";
import { useForm } from "@mantine/form";
import { IconDeviceFloppy } from "@tabler/icons-react";
import { loadConnectionsDefinitions, connectionsDefinitions } from "../behaviour/pieces";

export interface BusFormValues {
  id: string;
  name: string;
  description: string;
  platform_id: number;
  connection_type: string;
  [key: string]: any;
}

interface BusModalProps {
  opened: boolean;
  onClose: () => void;
  onSubmit: (values: BusFormValues) => void;
  platformId: number;
  initialValues?: Partial<BusFormValues>;
}

const BusModal = ({ opened, onClose, onSubmit, platformId, initialValues }: BusModalProps) => {
  const isEdit = !!initialValues?.id;
  const [connectionTypes, setConnectionTypes] = useState<any[]>([]);

  const form = useForm<BusFormValues>({
    initialValues: {
      id: "",
      name: "",
      description: "",
      platform_id: platformId,
      connection_type: "",
    },
    validate: {
      name: (value) => (value.trim().length > 0 ? null : "Name is required"),
      connection_type: (value) => (value.length > 0 ? null : "Connection type is required"),
    },
  });

  useEffect(() => {
    loadConnectionsDefinitions().then(() => {
      setConnectionTypes(connectionsDefinitions.filter((c: any) => c.bus_settings));
    });
  }, []);

  useEffect(() => {
    if (opened) {
      const values: any = {
        id: initialValues?.id ?? "",
        name: initialValues?.name ?? "",
        description: initialValues?.description ?? "",
        platform_id: initialValues?.platform_id ?? platformId,
        connection_type: initialValues?.connection_type ?? "",
      };
      // Restore dynamic bus_settings fields from initialValues
      if (initialValues?.connection_type) {
        const connDef = connectionTypes.find((c: any) => c.name === initialValues.connection_type);
        if (connDef?.bus_settings) {
          Object.keys(connDef.bus_settings).forEach((key) => {
            values[key] = initialValues[key] ?? String(connDef.bus_settings[key].default ?? "");
          });
        }
      }
      form.setValues(values);
    }
  }, [opened]);

  const handleSubmit = (values: BusFormValues) => {
    onSubmit(values);
    onClose();
  };

  // Get dynamic fields for the selected connection type
  const selectedConn = connectionTypes.find((c: any) => c.name === form.values.connection_type);
  const busSettings = selectedConn?.bus_settings || {};

  const handleConnectionTypeChange = (value: string | null) => {
    form.setFieldValue("connection_type", value || "");
    // Set defaults for the new connection type's bus_settings
    const connDef = connectionTypes.find((c: any) => c.name === value);
    if (connDef?.bus_settings) {
      Object.entries(connDef.bus_settings).forEach(([key, setting]: [string, any]) => {
        form.setFieldValue(key, String(setting.default ?? ""));
      });
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={isEdit ? "Edit Bus" : "Add Bus"}
      size="md"
    >
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <TextInput
          label="Name"
          placeholder="e.g., MODBUS-Main"
          withAsterisk
          {...form.getInputProps("name")}
        />
        <Textarea
          label="Description"
          placeholder="Optional description..."
          rows={2}
          mt="md"
          {...form.getInputProps("description")}
        />
        <Select
          label="Connection Type"
          placeholder="Select connection type"
          withAsterisk
          mt="md"
          data={connectionTypes.map((c: any) => ({ value: c.name, label: c.name }))}
          value={form.values.connection_type}
          onChange={handleConnectionTypeChange}
          error={form.errors.connection_type}
        />

        {Object.entries(busSettings).map(([key, setting]: [string, any]) => {
          if (setting.enum) {
            return (
              <Select
                key={key}
                label={key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                mt="md"
                data={setting.enum.map((v: string) => ({ value: v, label: v }))}
                value={form.values[key] ?? String(setting.default ?? "")}
                onChange={(val) => form.setFieldValue(key, val || "")}
              />
            );
          }
          return (
            <TextInput
              key={key}
              label={key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
              placeholder={String(setting.default ?? "")}
              mt="md"
              value={form.values[key] ?? ""}
              onChange={(e) => form.setFieldValue(key, e.currentTarget.value)}
            />
          );
        })}

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

export default BusModal;
