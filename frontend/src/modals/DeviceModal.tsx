import { useEffect, useState } from "react";
import { Modal, TextInput, Textarea, Select, Group, Button, Badge, Collapse } from "@mantine/core";
import { useForm } from "@mantine/form";
import { IconDeviceFloppy, IconChevronDown, IconChevronRight } from "@tabler/icons-react";
import { devicesStore, type DevicePiece, type DeviceData } from "../behaviour/devices";
import { connectionsDefinitions } from "../behaviour/pieces";
import "./DeviceModal.css";

interface DeviceModalProps {
    opened: boolean;
    onClose: () => void;
    piece?: DevicePiece | null;
    device?: DeviceData | null;
}

const DeviceModal = ({ opened, onClose, piece, device }: DeviceModalProps) => {
    const isEdit = !!device;
    const [connectionOpen, setConnectionOpen] = useState(false);

    const form = useForm({
        initialValues: {
            label: "",
            description: "",
            platform_id: "",
            // Connection fields are dynamic, stored as [key: string]: any
        } as Record<string, any>,
        validate: {
            label: (value: string) => (value.trim().length > 0 ? null : "Label is required"),
            platform_id: (value: string) => (value ? null : "Platform is required"),
        },
    });

    // Determine the piece metadata (from prop or from matching devicePieces)
    const activePiece = piece || (device ? devicesStore.devicePieces.find((p) => p.name === device.piece_name) : null);
    const connectionName = activePiece?.device_settings?.connection || device?.data?.connection_type;
    const connDef = connectionName
        ? connectionsDefinitions.find((c: any) => c.name === connectionName)
        : null;
    const hasBusSettings = !!connDef?.bus_settings;
    const deviceSettings = connDef?.device_settings || {};
    const dependency = activePiece?.device_settings?.dependency || device?.data?.dependency_def;
    const tags = activePiece?.tags || device?.data?.tags || [];

    // Buses filtered by connection type
    const availableBuses = connectionName ? devicesStore.getBusesByType(connectionName) : [];

    // Compatible devices for dependency
    const compatibleDevices = dependency?.tag
        ? devicesStore.devices.filter((d) => {
              if (device && d.id === device.id) return false;
              const dtags = d.data?.tags || [];
              return dtags.some((t: string) => t.includes(dependency.tag) || dependency.tag.includes(t));
          })
        : [];

    // Platform options
    const platformOptions = devicesStore.platformsCache.map((p) => ({
        value: String(p.id),
        label: p.name,
    }));

    // Bus options
    const busOptions = [
        { value: "", label: "-- Select a bus --" },
        ...availableBuses.map((b: any) => {
            const platName = devicesStore.getPlatformName(b.data?.platform_id);
            return { value: b.name, label: `${b.name}${platName ? ` (${platName})` : ""}` };
        }),
    ];

    // Dependency device options
    const dependencyOptions = [
        { value: "", label: "-- Select a device --" },
        ...compatibleDevices.map((d) => ({
            value: String(d.id),
            label: `${d.label} (${d.piece_name})`,
        })),
    ];

    useEffect(() => {
        if (!opened) return;

        const values: Record<string, any> = {};

        if (device) {
            // Edit mode
            values.label = device.label || "";
            values.description = device.description || "";
            values.platform_id = device.platform_id ? String(device.platform_id) : "";
            values.bus_name = device.data?.bus_name || "";
            values.depends_on_id = device.depends_on_id ? String(device.depends_on_id) : "";

            // Restore device connection fields
            if (deviceSettings) {
                Object.entries(deviceSettings).forEach(([key, setting]: [string, any]) => {
                    values[key] = device.data?.[key] != null ? String(device.data[key]) : String(setting.default ?? "");
                });
            }

            // Restore dependency matches
            if (device.data?.dependency_matches) {
                Object.entries(device.data.dependency_matches).forEach(([param, val]) => {
                    values[`dep_match_${param}`] = val;
                });
            }
        } else if (piece) {
            // New install from piece
            values.label = devicesStore.resolveDeviceLabel(piece);
            values.description = piece.description || "";
            values.platform_id = "";
            values.bus_name = "";
            values.depends_on_id = "";

            // Set defaults for device connection fields
            if (deviceSettings) {
                Object.entries(deviceSettings).forEach(([key, setting]: [string, any]) => {
                    values[key] = String(setting.default ?? "");
                });
            }
        }

        form.setValues(values);
        setConnectionOpen(false);
    }, [opened]);

    const handleSubmit = (values: Record<string, any>) => {
        // Build the data object for the API
        const connectionData: Record<string, any> = {};

        if (tags.length > 0) {
            connectionData.tags = tags;
        }

        if (connectionName) {
            connectionData.connection_type = connectionName;

            if (values.bus_name) {
                connectionData.bus_name = values.bus_name;
            }

            // Gather device-specific connection fields
            if (deviceSettings) {
                Object.entries(deviceSettings).forEach(([key, config]: [string, any]) => {
                    const val = values[key];
                    if (val !== undefined && val !== "") {
                        connectionData[key] = config.type === "integer" ? parseInt(val, 10) : val;
                    }
                });
            }
        }

        // Store user_inputs for dependency system
        if (piece?.user_inputs) {
            connectionData.user_inputs = piece.user_inputs;
        } else if (device?.data?.user_inputs) {
            connectionData.user_inputs = device.data.user_inputs;
        }

        // Handle dependency
        let dependsOnId: number | null = null;
        if (dependency && values.depends_on_id) {
            dependsOnId = parseInt(values.depends_on_id, 10);
            connectionData.dependency_def = dependency;

            // Gather dependency matches
            const matchParams = dependency.matches?.user_inputs;
            if (matchParams && Array.isArray(matchParams)) {
                const matches: Record<string, string> = {};
                matchParams.forEach((param: string) => {
                    const val = values[`dep_match_${param}`];
                    if (val) matches[param] = val;
                });
                if (Object.keys(matches).length > 0) {
                    connectionData.dependency_matches = matches;
                }
            }
        }

        const apiData: Record<string, any> = {
            piece_name: piece?.name || device?.piece_name,
            piece_directory: piece?.directory || device?.piece_directory,
            piece_hash: piece?.git_hash || device?.piece_hash || null,
            label: values.label.trim(),
            device_type: piece?.category || device?.device_type,
            icon_class: piece?.icon_class_name || device?.icon_class || null,
            description: values.description?.trim() || null,
            data: Object.keys(connectionData).length > 0 ? connectionData : null,
            platform_id: values.platform_id ? parseInt(values.platform_id, 10) : null,
            depends_on_id: dependsOnId,
        };

        if (device) {
            apiData.id = device.id;
        } else {
            apiData.mode = "deactivate";
        }

        devicesStore.save(apiData).then((ok) => {
            if (ok) onClose();
        });
    };

    // Dependency match rendering
    const selectedDependencyDevice = values_depends_on_id()
        ? devicesStore.devices.find((d) => d.id === parseInt(form.values.depends_on_id, 10))
        : null;
    const matchParams = dependency?.matches?.user_inputs || [];

    function values_depends_on_id() {
        return form.values.depends_on_id && form.values.depends_on_id !== "";
    }

    return (
        <Modal
            opened={opened}
            onClose={onClose}
            title={isEdit ? "Edit Device" : "Install Device"}
            size="lg"
        >
            <form onSubmit={form.onSubmit(handleSubmit)}>
                <TextInput
                    label="Label"
                    placeholder="e.g., Pump #1"
                    withAsterisk
                    {...form.getInputProps("label")}
                />

                {tags.length > 0 && (
                    <div style={{ marginTop: "0.75rem" }}>
                        <label style={{ fontSize: "0.875rem", fontWeight: 500 }}>Tags</label>
                        <div className="device-tags-container" style={{ marginTop: "0.25rem" }}>
                            {tags.map((tag: string) => (
                                <Badge key={tag} size="sm" variant="light">
                                    {tag}
                                </Badge>
                            ))}
                        </div>
                    </div>
                )}

                <Select
                    label="Platform"
                    placeholder="Select a platform"
                    withAsterisk
                    mt="md"
                    data={platformOptions}
                    value={form.values.platform_id}
                    onChange={(val) => form.setFieldValue("platform_id", val || "")}
                    error={form.errors.platform_id}
                />

                <Textarea
                    label="Description"
                    placeholder="Optional description..."
                    rows={2}
                    mt="md"
                    {...form.getInputProps("description")}
                />

                {/* Dependency Section */}
                {dependency && dependency.type === "device" && (
                    <>
                        <Select
                            label="Device Dependency"
                            description={dependency.description}
                            placeholder="Select a compatible device"
                            withAsterisk
                            mt="md"
                            data={dependencyOptions}
                            value={form.values.depends_on_id || ""}
                            onChange={(val) => form.setFieldValue("depends_on_id", val || "")}
                        />

                        {/* Dependency parameter matches */}
                        {selectedDependencyDevice && matchParams.length > 0 && (
                            <div className="dependency-matches-container">
                                {matchParams.map((param: string) => {
                                    const targetInputs = selectedDependencyDevice.data?.user_inputs;
                                    if (!targetInputs) return null;

                                    const paramDef = activePiece?.device_settings?.[param];
                                    const paramType = paramDef?.type;

                                    const compatibleTargets = Object.entries(targetInputs)
                                        .filter(([, def]: [string, any]) => !paramType || def.type === paramType);

                                    return (
                                        <div key={param} className="dependency-match-row">
                                            <span className="dep-match-label">{param}</span>
                                            <span className="dep-match-type">{paramType || "?"}</span>
                                            <span className="dep-match-arrow">→</span>
                                            <Select
                                                size="xs"
                                                style={{ flex: 1 }}
                                                placeholder="Select..."
                                                data={compatibleTargets.map(([key]) => ({
                                                    value: key,
                                                    label: key,
                                                }))}
                                                value={form.values[`dep_match_${param}`] || ""}
                                                onChange={(val) => form.setFieldValue(`dep_match_${param}`, val || "")}
                                            />
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </>
                )}

                {/* Connection Settings Section */}
                {connDef && (
                    <>
                        <Button
                            variant="subtle"
                            size="xs"
                            mt="md"
                            onClick={() => setConnectionOpen(!connectionOpen)}
                            leftSection={connectionOpen ? <IconChevronDown size={14} /> : <IconChevronRight size={14} />}
                        >
                            Connection Settings ({connectionName})
                        </Button>

                        <Collapse in={connectionOpen}>
                            <div style={{ marginTop: "0.5rem" }}>
                                {hasBusSettings && (
                                    <Select
                                        label="Bus"
                                        placeholder="Select a bus"
                                        mt="sm"
                                        data={busOptions}
                                        value={form.values.bus_name || ""}
                                        onChange={(val) => form.setFieldValue("bus_name", val || "")}
                                    />
                                )}

                                {Object.entries(deviceSettings)
                                    .filter(([key]) => key !== "connection")
                                    .map(([key, setting]: [string, any]) => {
                                        if (setting.enum) {
                                            return (
                                                <Select
                                                    key={key}
                                                    label={setting.description || key.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())}
                                                    mt="sm"
                                                    data={setting.enum.map((v: string) => ({ value: v, label: v }))}
                                                    value={form.values[key] ?? String(setting.default ?? "")}
                                                    onChange={(val) => form.setFieldValue(key, val || "")}
                                                />
                                            );
                                        }
                                        return (
                                            <TextInput
                                                key={key}
                                                label={setting.description || key.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())}
                                                placeholder={String(setting.default ?? "")}
                                                mt="sm"
                                                type={setting.type === "integer" ? "number" : "text"}
                                                min={setting.minimum}
                                                max={setting.maximum}
                                                value={form.values[key] ?? ""}
                                                onChange={(e) => form.setFieldValue(key, e.currentTarget.value)}
                                            />
                                        );
                                    })}
                            </div>
                        </Collapse>
                    </>
                )}

                <Group justify="flex-end" mt="xl">
                    <Button variant="default" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button type="submit" leftSection={<IconDeviceFloppy size={16} />}>
                        {isEdit ? "Save" : "Install"}
                    </Button>
                </Group>
            </form>
        </Modal>
    );
};

export default DeviceModal;
