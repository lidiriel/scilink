// Data storage for website state, such as platforms and buses data
// If need see https://mobx.js.org/README.html for state management
import { makeAutoObservable } from "mobx"
import { loadConnectionsDefinitions, connectionsDefinitions } from "./pieces";

interface Settings {
    id: number; 
    category: string;
    name: string;
    description: string; 
    data: any;
    created_at: string;
    updated_at: string;
}

interface PlatformData extends Settings {
    data: {
        host: string;
        arch?: string;
        os?: string;
    }
}

interface BusData extends Settings {
    data: {
        connection_type: string;
        port: string;
        baud_rate: number;
        data_bits: number;
        parity: string;
        stop_bits: number;
        platform_id: number;
    }
}


class PlatformsElements {
    platforms: PlatformData[] = [];
    platformBuses: { [index: number]: BusData[] } = {};
    buses: BusData[] = [];

    constructor() {
        makeAutoObservable(this);
        this.update();
    }

    async update(): Promise<void>  {
        const platformsResponse = await fetch('/api/settings?category=platform');
        this.platforms = await platformsResponse.json();

        const busesResponse = await fetch('/api/settings?category=bus');
        const buses = await busesResponse.json();

        // Group buses by platform_id
        this.platformBuses = {};
        buses.forEach((bus: BusData) => {
            const platformId: number = bus.data?.platform_id;
            if (!this.platformBuses[platformId]) {
                this.platformBuses[platformId] = [];
            }
            this.platformBuses[platformId].push(bus);
        });
    }


    async save(values: { id: string; name: string; description: string; host: string }) {
        const data = {
            category: 'platform',
            name: values.name.trim(),
            description: values.description.trim() || null,
            data: { host: values.host.trim() }
        };

        try {
            let response;
            if (values.id) {
                // Update existing
                response = await fetch(`/api/settings/${values.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
            } else {
                // Create new
                response = await fetch('/api/settings', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
            }

            if (response.ok) {
                this.update();
            } else {
                let errorMsg = 'Failed to save platform';
                try {
                    const error = await response.json();
                    errorMsg = error.error || errorMsg;
                } catch (e) {
                    errorMsg = `Server error: ${response.status} ${response.statusText}`;
                }
                console.error('Save platform failed:', response.status, errorMsg);
                alert(errorMsg);
            }
        } catch (error) {
            console.error('Error saving platform:', error);
            alert(`Failed to save platform: ${(error as Error).message}`);
        }
    } // end of savePlatform

    async delete(id: number) {
        if (!confirm('Are you sure you want to delete this platform?')) {
            return;
        }
        try {
            const response = await fetch(`/api/settings/${id}`, {
                method: 'DELETE',
            });
            if (response.ok) {
                this.update();
            } else {
                let errorMsg = 'Failed to delete platform';
                try {
                    const error = await response.json();
                    errorMsg = error.error || errorMsg;
                } catch (e) {
                    errorMsg = `Server error: ${response.status} ${response.statusText}`;
                }
                console.error('Delete platform failed:', response.status, errorMsg);
                alert(errorMsg);
            }
        } catch (error) {
            console.error('Error deleting platform:', error);
            alert(`Failed to delete platform: ${(error as Error).message}`);
        }
    }

    async saveBus(values: { id: string; name: string; description: string; platform_id: number; connection_type: string; [key: string]: any }) {
        const { id, name, description, platform_id, connection_type, ...busSettings } = values;
        const data = {
            category: 'bus',
            name: name.trim(),
            description: description.trim() || null,
            data: {
                platform_id,
                connection_type,
                ...busSettings,
            }
        };

        try {
            let response;
            if (values.id) {
                response = await fetch(`/api/settings/${values.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
            } else {
                response = await fetch('/api/settings', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
            }

            if (response.ok) {
                this.update();
            } else {
                let errorMsg = 'Failed to save bus';
                try {
                    const error = await response.json();
                    errorMsg = error.error || errorMsg;
                } catch (e) {
                    errorMsg = `Server error: ${response.status} ${response.statusText}`;
                }
                console.error('Save bus failed:', response.status, errorMsg);
                alert(errorMsg);
            }
        } catch (error) {
            console.error('Error saving bus:', error);
            alert(`Failed to save bus: ${(error as Error).message}`);
        }
    }

    async deleteBus(id: number) {
        if (!confirm('Are you sure you want to delete this bus?')) {
            return;
        }
        try {
            const response = await fetch(`/api/settings/${id}`, {
                method: 'DELETE',
            });
            if (response.ok) {
                this.update();
            } else {
                let errorMsg = 'Failed to delete bus';
                try {
                    const error = await response.json();
                    errorMsg = error.error || errorMsg;
                } catch (e) {
                    errorMsg = `Server error: ${response.status} ${response.statusText}`;
                }
                console.error('Delete bus failed:', response.status, errorMsg);
                alert(errorMsg);
            }
        } catch (error) {
            console.error('Error deleting bus:', error);
            alert(`Failed to delete bus: ${(error as Error).message}`);
        }
    }

}
const platformsStore = new PlatformsElements();
//const busesStore = new BusesElements();
export { PlatformsElements, platformsStore };