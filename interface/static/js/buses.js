// Bus Connection management
import { escapeHtml } from './utils.js';
import { loadSettings } from './settings.js';

// Local state
let busesData = [];
let connectionsDefinitions = [];

// Initialize buses module
export function initBuses() {
    const modal = document.getElementById('bus-modal');
    const form = document.getElementById('bus-form');
    const closeBtn = document.getElementById('bus-modal-close');
    const cancelBtn = document.getElementById('bus-cancel');
    const typeSelect = document.getElementById('bus-type-select');

    if (!modal) return;

    const backdrop = modal.querySelector('.modal-backdrop');

    // Close modal
    if (closeBtn) closeBtn.addEventListener('click', closeBusModal);
    if (cancelBtn) cancelBtn.addEventListener('click', closeBusModal);
    if (backdrop) backdrop.addEventListener('click', closeBusModal);

    // Form submit
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            saveBus();
        });
    }

    // Connection type change - regenerate fields
    if (typeSelect) {
        typeSelect.addEventListener('change', (e) => {
            generateBusSettingsFields(e.target.value);
        });
    }
}

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

// Open bus modal with optional platform context
export async function openBusModal(bus = null, preselectedType = null, platformId = null) {
    const modal = document.getElementById('bus-modal');
    const title = document.getElementById('bus-modal-title');
    const idInput = document.getElementById('bus-id');
    const platformGroup = document.getElementById('bus-platform-group');
    const platformSelect = document.getElementById('bus-platform-select');
    const nameInput = document.getElementById('bus-name');
    const typeSelect = document.getElementById('bus-type-select');

    if (!modal) {
        return;
    }

    // Ensure connections are loaded
    await loadConnectionsDefinitions();

    // Populate connection type select with only bus-capable connections
    const busTypes = getBusConnectionTypes();
    typeSelect.innerHTML = busTypes.map(c =>
        `<option value="${escapeHtml(c.name)}">${escapeHtml(c.name)}</option>`
    ).join('');

    // Load platforms for dropdown
    let platforms = [];
    try {
        const response = await fetch('/api/settings?category=platform');
        platforms = await response.json();
    } catch (error) {
        console.error('Error loading platforms:', error);
    }

    // Populate platform dropdown
    platformSelect.innerHTML = platforms.length > 0
        ? platforms.map(p => `<option value="${p.id}">${escapeHtml(p.name)}</option>`).join('')
        : '<option value="">No platforms available</option>';

    if (bus) {
        // Edit existing bus
        title.textContent = 'Edit Bus';
        idInput.value = bus.id;
        platformSelect.value = bus.data?.platform_id || '';
        platformSelect.disabled = true; // Cannot change platform when editing
        platformGroup.style.display = 'block';
        nameInput.value = bus.name;
        typeSelect.value = bus.data?.connection_type || busTypes[0]?.name || '';
        typeSelect.disabled = true; // Cannot change connection type when editing
        generateBusSettingsFields(typeSelect.value, bus.data);
    } else {
        // Create new bus
        title.textContent = 'Add Bus';
        idInput.value = '';
        nameInput.value = '';
        typeSelect.disabled = preselectedType ? true : false; // Lock if coming from device modal

        if (platformId) {
            // Platform is pre-selected (from platform card "Add Bus" button)
            platformSelect.value = platformId;
            platformSelect.disabled = true;
            platformGroup.style.display = 'block';
        } else {
            // No platform context - show dropdown for user to select
            platformSelect.disabled = false;
            platformGroup.style.display = 'block';
            if (platforms.length > 0) {
                platformSelect.value = platforms[0].id;
            }
        }

        // Use preselected type if provided, otherwise use first available
        const selectedType = preselectedType || busTypes[0]?.name || '';
        if (selectedType) {
            typeSelect.value = selectedType;
            generateBusSettingsFields(selectedType);
        }
    }

    modal.classList.remove('hidden');
    nameInput.focus();
}

function generateBusSettingsFields(connectionType, existingData = {}) {
    const container = document.getElementById('bus-settings-fields');
    if (!container) return;

    const connection = connectionsDefinitions.find(c => c.name === connectionType);
    if (!connection || !connection.bus_settings) {
        container.innerHTML = '';
        return;
    }

    container.innerHTML = Object.entries(connection.bus_settings).map(([key, config]) => {
        const value = existingData[key] ?? config.default ?? '';
        const required = config.required ? '<span class="required">*</span>' : '';

        if (config.enum) {
            // Select field
            return `
                <div class="form-group">
                    <label for="bus-setting-${key}">${escapeHtml(config.description || key)} ${required}</label>
                    <select id="bus-setting-${key}" name="${key}" ${config.required ? 'required' : ''}>
                        ${config.enum.map(opt =>
                            `<option value="${opt}" ${value === opt ? 'selected' : ''}>${opt}</option>`
                        ).join('')}
                    </select>
                </div>
            `;
        } else {
            // Input field
            const inputType = config.type === 'integer' ? 'number' : 'text';
            return `
                <div class="form-group">
                    <label for="bus-setting-${key}">${escapeHtml(config.description || key)} ${required}</label>
                    <input type="${inputType}" id="bus-setting-${key}" name="${key}"
                        value="${escapeHtml(String(value))}"
                        ${config.minimum !== undefined ? `min="${config.minimum}"` : ''}
                        ${config.maximum !== undefined ? `max="${config.maximum}"` : ''}
                        ${config.required ? 'required' : ''}
                        placeholder="${escapeHtml(config.default ? String(config.default) : '')}">
                </div>
            `;
        }
    }).join('');
}

export function closeBusModal() {
    const modal = document.getElementById('bus-modal');
    if (modal) modal.classList.add('hidden');
}

async function saveBus() {
    const idInput = document.getElementById('bus-id');
    const platformSelect = document.getElementById('bus-platform-select');
    const nameInput = document.getElementById('bus-name');
    const typeSelect = document.getElementById('bus-type-select');
    const settingsContainer = document.getElementById('bus-settings-fields');

    const name = nameInput.value.trim();
    const connectionType = typeSelect.value;
    const platformId = platformSelect.value ? parseInt(platformSelect.value, 10) : null;

    if (!name) {
        alert('Bus name is required');
        nameInput.focus();
        return;
    }

    if (!platformId) {
        alert('Bus must belong to a platform');
        return;
    }

    // Gather bus settings from dynamic fields
    const busSettingsData = {
        connection_type: connectionType,
        platform_id: platformId
    };
    settingsContainer.querySelectorAll('input, select').forEach(input => {
        const key = input.name;
        let value = input.value;
        if (input.type === 'number') {
            value = parseInt(value, 10);
        }
        busSettingsData[key] = value;
    });

    const data = {
        category: 'bus',
        name: name,
        description: `${connectionType} bus`,
        data: busSettingsData
    };

    try {
        let response;
        if (idInput.value) {
            response = await fetch(`/api/settings/${idInput.value}`, {
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
            closeBusModal();
            // Reload settings to refresh the platforms/buses display
            loadSettings();
        } else {
            const error = await response.json();
            alert(error.error || 'Failed to save bus');
        }
    } catch (error) {
        console.error('Error saving bus:', error);
        alert('Failed to save bus');
    }
}

export async function editBus(id) {
    // Fetch the bus data from the list or API
    await loadBuses();
    const bus = busesData.find(b => b.id === id);
    if (bus) {
        openBusModal(bus);
    }
}

export async function deleteBus(id) {
    await loadBuses();
    const bus = busesData.find(b => b.id === id);
    if (!bus) return;

    if (!confirm(`Are you sure you want to delete bus "${bus.name}"?`)) {
        return;
    }

    try {
        const response = await fetch(`/api/settings/${id}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            // Reload settings to refresh the platforms/buses display
            loadSettings();
        } else {
            const error = await response.json();
            alert(error.error || 'Failed to delete bus');
        }
    } catch (error) {
        console.error('Error deleting bus:', error);
        alert('Failed to delete bus');
    }
}

// Export for device modal usage
export function getConnectionDefinition(connectionName) {
    return connectionsDefinitions.find(c => c.name === connectionName);
}

export function getBusesByType(connectionType) {
    return busesData.filter(b => b.data?.connection_type === connectionType);
}

// Deprecated - kept for backwards compatibility
export function showBusTab() {
    // No longer needed with hierarchical view
}

export { busesData, connectionsDefinitions };