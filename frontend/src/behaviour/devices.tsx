import { makeAutoObservable } from "mobx";
import { loadConnectionsDefinitions, connectionsDefinitions } from "./pieces";
import { platformsStore } from "./settings";

interface DevicePiece {
    name: string;
    description: string;
    node_label: string;
    icon_class_name: string;
    category: string;
    tags: string[];
    git_hash: string;
    directory?: string;
    device_settings: {
        device_id?: { type: string; default?: string; replace_node_label?: boolean };
        connection?: string;
        dependency?: {
            type: string;
            tag: string;
            description: string;
            matches?: { user_inputs: string[] };
        };
        [key: string]: any;
    };
    user_inputs?: Record<string, any>;
}

interface DeviceData {
    id: number;
    piece_name: string;
    piece_directory: string;
    piece_hash: string | null;
    label: string;
    device_type: string;
    icon_class: string | null;
    description: string | null;
    connection_string: string | null;
    mode: string;
    data: {
        connection_type?: string;
        bus_name?: string;
        tags?: string[];
        user_inputs?: Record<string, any>;
        dependency_def?: any;
        dependency_matches?: Record<string, string>;
        [key: string]: any;
    } | null;
    depends_on_id: number | null;
    platform_id: number | null;
    created_at: string;
    updated_at: string;
}

interface PlatformCache {
    id: number;
    name: string;
    data: { host: string };
}

class DevicesStore {
    devices: DeviceData[] = [];
    devicePieces: DevicePiece[] = [];
    pieceDirectories: string[] = [];
    currentDirectory: string = "";
    platformsCache: PlatformCache[] = [];

    constructor() {
        makeAutoObservable(this);
        this.loadAll();
    }

    async loadAll(): Promise<void> {
        await Promise.all([
            this.loadPieceDirectories(),
            this.loadDevices(),
            this.loadPlatformsCache(),
            loadConnectionsDefinitions(),
        ]);
    }

    async loadPieceDirectories(): Promise<void> {
        try {
            const response = await fetch("/api/piece-directories");
            this.pieceDirectories = await response.json();
            if (this.pieceDirectories.length > 0 && !this.currentDirectory) {
                this.currentDirectory = this.pieceDirectories[0];
                await this.loadDevicePieces(this.currentDirectory);
            }
        } catch (error) {
            console.error("Error loading piece directories:", error);
        }
    }

    async loadDevicePieces(directory: string): Promise<void> {
        this.currentDirectory = directory;
        try {
            const response = await fetch(`/api/device-pieces/${directory}`);
            this.devicePieces = await response.json();
        } catch (error) {
            console.error("Error loading device pieces:", error);
            this.devicePieces = [];
        }
    }

    async loadDevices(): Promise<void> {
        try {
            const response = await fetch("/api/devices");
            this.devices = await response.json();
        } catch (error) {
            console.error("Error loading devices:", error);
        }
    }

    async loadPlatformsCache(): Promise<void> {
        try {
            const response = await fetch("/api/settings?category=platform");
            this.platformsCache = await response.json();
        } catch (error) {
            console.error("Error loading platforms:", error);
        }
    }

    getPlatformName(platformId: number | null): string {
        if (!platformId) return "";
        const platform = this.platformsCache.find((p) => p.id === platformId);
        return platform?.name || "";
    }

    getDependencyLabel(dependsOnId: number | null): string {
        if (!dependsOnId) return "";
        const device = this.devices.find((d) => d.id === dependsOnId);
        return device?.label || "";
    }

    resolveDeviceLabel(piece: DevicePiece): string {
        const deviceSettings = piece.device_settings;
        const defaultLabel = deviceSettings?.device_id?.default;
        if (!defaultLabel) {
            return piece.node_label || piece.name;
        }
        const count = this.devices.filter((d) => d.piece_name === piece.name).length + 1;
        return defaultLabel.replace("%n", String(count));
    }

    getConnectionDefinition(connectionName: string) {
        return connectionsDefinitions.find((c: any) => c.name === connectionName) || null;
    }

    getBusesByType(connectionType: string): any[] {
        const allBuses: any[] = [];
        Object.values(platformsStore.platformBuses).forEach((buses: any) => {
            buses.forEach((bus: any) => {
                if (bus.data?.connection_type === connectionType) {
                    allBuses.push(bus);
                }
            });
        });
        return allBuses;
    }

    async save(data: Record<string, any>): Promise<boolean> {
        try {
            let response;
            if (data.id) {
                response = await fetch(`/api/devices/${data.id}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(data),
                });
            } else {
                response = await fetch("/api/devices", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(data),
                });
            }

            if (response.ok) {
                await this.loadDevices();
                return true;
            } else {
                let errorMsg = "Failed to save device";
                try {
                    const error = await response.json();
                    errorMsg = error.error || errorMsg;
                } catch {
                    errorMsg = `Server error: ${response.status} ${response.statusText}`;
                }
                console.error("Save device failed:", response.status, errorMsg);
                alert(errorMsg);
                return false;
            }
        } catch (error) {
            console.error("Error saving device:", error);
            alert(`Failed to save device: ${(error as Error).message}`);
            return false;
        }
    }

    async delete(id: number): Promise<void> {
        if (!confirm("Are you sure you want to delete this device?")) {
            return;
        }
        try {
            const response = await fetch(`/api/devices/${id}`, {
                method: "DELETE",
            });
            if (response.ok) {
                await this.loadDevices();
            } else {
                let errorMsg = "Failed to delete device";
                try {
                    const error = await response.json();
                    errorMsg = error.error || errorMsg;
                } catch {
                    errorMsg = `Server error: ${response.status} ${response.statusText}`;
                }
                console.error("Delete device failed:", response.status, errorMsg);
                alert(errorMsg);
            }
        } catch (error) {
            console.error("Error deleting device:", error);
            alert(`Failed to delete device: ${(error as Error).message}`);
        }
    }

    async updateMode(id: number, mode: string): Promise<void> {
        try {
            const response = await fetch(`/api/devices/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ mode }),
            });
            if (response.ok) {
                // Update locally for immediate UI feedback
                const device = this.devices.find((d) => d.id === id);
                if (device) {
                    device.mode = mode;
                }
            } else {
                console.error("Failed to update device mode");
            }
        } catch (error) {
            console.error("Error updating device mode:", error);
        }
    }
}

const devicesStore = new DevicesStore();
export type { DevicePiece, DeviceData, PlatformCache };
export { DevicesStore, devicesStore };
