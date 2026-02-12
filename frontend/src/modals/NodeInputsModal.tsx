import { useState, useEffect } from "react";
import {
    Modal,
    TextInput,
    NumberInput,
    Select,
    Switch,
    Group,
    Button,
    Text,
    Stack,
    Loader,
    Center,
} from "@mantine/core";
import { IconDeviceFloppy } from "@tabler/icons-react";
import { workflowStore } from "../behaviour/workflows";

interface UserInputField {
    type: string;
    default?: any;
    description?: string;
    options?: string[];
    minimum?: number;
    maximum?: number;
    placeholder?: string;
    help?: string;
    visible?: boolean;
}

type UserInputsDef = Record<string, UserInputField>;

interface NodeInputsModalProps {
    opened: boolean;
    onClose: () => void;
    nodeId: string | null;
}

// Simple pieces cache
const piecesCache: Record<string, any[]> = {};

async function fetchPiecesForDir(directory: string, type: "block" | "device"): Promise<any[]> {
    const cacheKey = `${type}:${directory}`;
    if (piecesCache[cacheKey]) return piecesCache[cacheKey];

    const endpoint = type === "device" ? `/api/device-pieces/${directory}` : `/api/pieces/${directory}`;
    const response = await fetch(endpoint);
    if (response.ok) {
        const pieces = await response.json();
        piecesCache[cacheKey] = pieces;
        return pieces;
    }
    return [];
}

async function fetchUserInputs(nodeData: Record<string, any>): Promise<UserInputsDef | null> {
    if (nodeData.deviceRef) {
        const deviceRes = await fetch(`/api/devices/${nodeData.deviceRef}`);
        if (!deviceRes.ok) return null;
        const device = await deviceRes.json();
        const pieces = await fetchPiecesForDir(device.piece_directory, "device");
        const piece = pieces.find((p: any) => p.name === device.piece_name);
        return piece?.user_inputs || null;
    }

    if (nodeData.pieceName && nodeData.pieceDirectory) {
        const pieces = await fetchPiecesForDir(nodeData.pieceDirectory, "block");
        const piece = pieces.find((p: any) => p.name === nodeData.pieceName);
        return piece?.user_inputs || null;
    }

    return null;
}

const NodeInputsModal = ({ opened, onClose, nodeId }: NodeInputsModalProps) => {
    const [loading, setLoading] = useState(false);
    const [userInputsDef, setUserInputsDef] = useState<UserInputsDef | null>(null);
    const [values, setValues] = useState<Record<string, any>>({});
    const [nodeLabel, setNodeLabel] = useState("");

    useEffect(() => {
        if (!opened || !nodeId) return;

        const node = workflowStore.nodes.find((n) => n.id === nodeId);
        if (!node) return;

        setNodeLabel(node.data.label || "Node Settings");
        setLoading(true);

        fetchUserInputs(node.data).then((def) => {
            setUserInputsDef(def);

            if (def) {
                const existing = node.data.nodeData?.user_inputs || {};
                const initial: Record<string, any> = {};
                const visibleFields: string[] = [];
                for (const [key, field] of Object.entries(def)) {
                    initial[key] = existing[key] ?? field.default ?? "";
                    if (field.visible) visibleFields.push(key);
                }
                setValues(initial);

                // Store visible fields + defaults so node can display them immediately
                if (visibleFields.length > 0 && nodeId) {
                    workflowStore.updateNodeData(nodeId, {
                        user_inputs: { ...initial, ...existing },
                        visible_fields: visibleFields,
                    });
                }
            }

            setLoading(false);
        });
    }, [opened, nodeId]);

    const updateValue = (key: string, value: any) => {
        setValues((prev) => ({ ...prev, [key]: value }));
    };

    const handleSubmit = () => {
        if (!nodeId) return;

        // Convert types before saving
        const typed: Record<string, any> = {};
        if (userInputsDef) {
            for (const [key, field] of Object.entries(userInputsDef)) {
                const raw = values[key];
                switch (field.type) {
                    case "boolean":
                        typed[key] = !!raw;
                        break;
                    case "integer":
                        typed[key] = raw !== "" && raw != null ? parseInt(String(raw), 10) : null;
                        break;
                    case "number":
                    case "float":
                        typed[key] = raw !== "" && raw != null ? parseFloat(String(raw)) : null;
                        break;
                    default:
                        typed[key] = raw;
                        break;
                }
            }
        }

        // Collect visible field keys
        const visibleFields: string[] = [];
        if (userInputsDef) {
            for (const [key, field] of Object.entries(userInputsDef)) {
                if (field.visible) visibleFields.push(key);
            }
        }

        workflowStore.updateNodeData(nodeId, { user_inputs: typed, visible_fields: visibleFields });
        onClose();
    };

    const renderField = (key: string, field: UserInputField) => {
        const value = values[key];

        switch (field.type) {
            case "boolean":
                return (
                    <Switch
                        key={key}
                        label={key}
                        description={field.description}
                        checked={!!value}
                        onChange={(e) => updateValue(key, e.currentTarget.checked)}
                    />
                );

            case "enumeration":
                return (
                    <Select
                        key={key}
                        label={key}
                        description={field.description}
                        data={field.options || []}
                        value={String(value ?? "")}
                        onChange={(val) => updateValue(key, val)}
                    />
                );

            case "integer":
                return (
                    <NumberInput
                        key={key}
                        label={key}
                        description={field.description}
                        value={value !== "" && value != null ? Number(value) : ""}
                        onChange={(val) => updateValue(key, val)}
                        step={1}
                        min={field.minimum}
                        max={field.maximum}
                        placeholder={field.placeholder}
                    />
                );

            case "number":
            case "float":
                return (
                    <NumberInput
                        key={key}
                        label={key}
                        description={field.description}
                        value={value !== "" && value != null ? Number(value) : ""}
                        onChange={(val) => updateValue(key, val)}
                        step={0.1}
                        min={field.minimum}
                        max={field.maximum}
                        placeholder={field.placeholder}
                    />
                );

            default:
                return (
                    <TextInput
                        key={key}
                        label={key}
                        description={field.description}
                        value={String(value ?? "")}
                        onChange={(e) => updateValue(key, e.currentTarget.value)}
                        placeholder={field.placeholder}
                    />
                );
        }
    };

    return (
        <Modal opened={opened} onClose={onClose} title={nodeLabel} size="md">
            {loading ? (
                <Center py="xl">
                    <Loader size="sm" />
                </Center>
            ) : !userInputsDef || Object.keys(userInputsDef).length === 0 ? (
                <Text c="dimmed" ta="center" py="xl">
                    No configurable fields for this node.
                </Text>
            ) : (
                <>
                    <Stack gap="sm">
                        {Object.entries(userInputsDef).map(([key, field]) => renderField(key, field))}
                    </Stack>
                    <Group justify="flex-end" mt="xl">
                        <Button variant="default" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button leftSection={<IconDeviceFloppy size={16} />} onClick={handleSubmit}>
                            Save
                        </Button>
                    </Group>
                </>
            )}
        </Modal>
    );
};

export default NodeInputsModal;
