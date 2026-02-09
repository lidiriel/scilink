// Data storage for website state, such as platforms and buses data
// If need see https://mobx.js.org/README.html for state management
import { makeAutoObservable } from "mobx"

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
        arch: string;
        os: string;
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


}

/*
// Local state
let busesData = [];
let connectionsDefinitions = [];

// Load connections definitions
export async function loadConnectionsDefinitions() {
    if (connectionsDefinitions.length > 0) {
        return connectionsDefinitions; // Already loaded
    }
    try {
        const response = await fetch('/api/connections');
        connectionsDefinitions = await response.json();
        return connectionsDefinitions;
    } catch (error) {
        console.error('Error loading connections:', error);
        return [];
    }
}

// Get connections that have bus_settings
export function getBusConnectionTypes() {
    return connectionsDefinitions.filter(c => c.bus_settings);
}

// Load buses
export async function loadBuses() {
    await loadConnectionsDefinitions();

    try {
        const response = await fetch('/api/settings?category=bus');
        busesData = await response.json();
    } catch (error) {
        console.error('Error loading buses:', error);
        busesData = [];
    }
}
*/

const platformsStore = new PlatformsElements();
export { PlatformsElements, platformsStore };