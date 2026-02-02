// Bus Connection management
import { escapeHtml } from './utils.js';

// Local state
let busesData = [];
let connectionsDefinitions = [];

// Initialize buses module
export function initBuses() {
    const addBtn = document.getElementById('add-bus-btn');
    const modal = document.getElementById('bus-modal');
    const form = document.getElementById('bus-form');
    const closeBtn = document.getElementById('bus-modal-close');
    const cancelBtn = document.getElementById('bus-cancel');
    const typeSelect = document.getElementById('bus-type-select');

    if (!modal) return;

    const backdrop = modal.querySelector('.modal-backdrop');

    // Open modal for new bus
    if (addBtn) {
        addBtn.addEventListener('click', () => openBusModal());
    }

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

    // Initialize settings tabs
    initSettingsTabs();
}

function initSettingsTabs() {
    const tabs = document.querySelectorAll('.settings-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabId = tab.dataset.tab;
            switchSettingsTab(tabId);
        });
    });
}

function switchSettingsTab(tabId) {
    // Update tab buttons
    document.querySelectorAll('.settings-tab').forEach(t => {
        t.classList.toggle('active', t.dataset.tab === tabId);
    });

    // Update tab content
    document.querySelectorAll('.settings-tab-content').forEach(content => {
        const contentTabId = content.id.replace('settings-tab-', '');
        content.classList.toggle('active', contentTabId === tabId);
    });
}

// Load connections definitions
export async function loadConnectionsDefinitions() {
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
        renderBusesList();
        updateBusTabVisibility();
    } catch (error) {
        console.error('Error loading buses:', error);
    }
}

function updateBusTabVisibility() {
    const busTab = document.getElementById('buses-tab');
    if (busTab) {
        if (busesData.length > 0) {
            busTab.classList.remove('hidden');
        } else {
            busTab.classList.add('hidden');
        }
    }
}

export function showBusTab() {
    const busTab = document.getElementById('buses-tab');
    if (busTab) {
        busTab.classList.remove('hidden');
    }
}

async function renderBusesList() {
    const list = document.getElementById('buses-list');
    if (!list) return;

    if (busesData.length === 0) {
        list.innerHTML = '<div class="settings-empty">No buses configured yet.</div>';
        return;
    }

    // Fetch connected devices count for each bus
    const busesWithDevices = await Promise.all(busesData.map(async (bus) => {
        try {
            const response = await fetch(`/api/buses/${bus.id}/devices`);
            const devices = await response.json();
            return { ...bus, deviceCount: Array.isArray(devices) ? devices.length : 0 };
        } catch {
            return { ...bus, deviceCount: 0 };
        }
    }));

    list.innerHTML = busesWithDevices.map(bus => `
        <div class="settings-item" data-id="${bus.id}">
            <div class="settings-item-info">
                <p class="settings-item-name">
                    ${escapeHtml(bus.name)}
                    <span class="settings-item-badge">${escapeHtml(bus.data?.connection_type || 'Unknown')}</span>
                </p>
                ${bus.description ? `<p class="settings-item-desc">${escapeHtml(bus.description)}</p>` : ''}
                <p class="settings-item-host">${formatBusSettings(bus.data)}</p>
                ${bus.deviceCount > 0 ? `<p class="settings-item-devices">${bus.deviceCount} device(s) connected</p>` : ''}
            </div>
            <div class="settings-item-actions">
                <button class="settings-item-btn edit" title="Edit" onclick="window.appFunctions.editBus(${bus.id})">
                    <i class="fa-solid fa-pen"></i>
                </button>
                <button class="settings-item-btn delete" title="Delete" onclick="window.appFunctions.deleteBus(${bus.id})">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
}

function formatBusSettings(data) {
    if (!data) return '';
    const parts = [];
    if (data.port) parts.push(data.port);
    if (data.baud_rate) parts.push(`${data.baud_rate} baud`);
    return parts.join(' | ') || 'No settings';
}

export async function openBusModal(bus = null, preselectedType = null) {
    const modal = document.getElementById('bus-modal');
    const title = document.getElementById('bus-modal-title');
    const idInput = document.getElementById('bus-id');
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

    if (bus) {
        title.textContent = 'Edit Bus';
        idInput.value = bus.id;
        nameInput.value = bus.name;
        typeSelect.value = bus.data?.connection_type || busTypes[0]?.name || '';
        typeSelect.disabled = true; // Cannot change connection type when editing
        generateBusSettingsFields(typeSelect.value, bus.data);
    } else {
        title.textContent = 'Add Bus';
        idInput.value = '';
        nameInput.value = '';
        typeSelect.disabled = preselectedType ? true : false; // Lock if coming from device modal
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
    const nameInput = document.getElementById('bus-name');
    const typeSelect = document.getElementById('bus-type-select');
    const settingsContainer = document.getElementById('bus-settings-fields');

    const name = nameInput.value.trim();
    const connectionType = typeSelect.value;

    if (!name) {
        alert('Bus name is required');
        nameInput.focus();
        return;
    }

    // Gather bus settings from dynamic fields
    const busSettingsData = { connection_type: connectionType };
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
            loadBuses();
            showBusTab(); // Ensure tab is visible after creating first bus
        } else {
            const error = await response.json();
            alert(error.error || 'Failed to save bus');
        }
    } catch (error) {
        console.error('Error saving bus:', error);
        alert('Failed to save bus');
    }
}

export function editBus(id) {
    const bus = busesData.find(b => b.id === id);
    if (bus) {
        openBusModal(bus);
    }
}

export async function deleteBus(id) {
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
            loadBuses();
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

export { busesData, connectionsDefinitions };
