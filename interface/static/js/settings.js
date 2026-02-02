// Settings / Platforms management
import { panelData } from './state.js';
import { escapeHtml } from './utils.js';
import { openBusModal, editBus, deleteBus, loadConnectionsDefinitions, busesData } from './buses.js';

// Local state
let platformBuses = {}; // Map of platform_id -> buses array

// Initialize settings
export function initSettings() {
    const addBtn = document.getElementById('add-platform-btn');
    const modal = document.getElementById('platform-modal');
    const form = document.getElementById('platform-form');
    const closeBtn = document.getElementById('platform-modal-close');
    const cancelBtn = document.getElementById('platform-cancel');

    if (!modal) return;

    const backdrop = modal.querySelector('.modal-backdrop');

    // Open modal for new platform
    if (addBtn) {
        addBtn.addEventListener('click', () => {
            openPlatformModal();
        });
    }

    // Close modal
    if (closeBtn) closeBtn.addEventListener('click', closePlatformModal);
    if (cancelBtn) cancelBtn.addEventListener('click', closePlatformModal);
    if (backdrop) backdrop.addEventListener('click', closePlatformModal);

    // Form submit
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            savePlatform();
        });
    }
}

function openPlatformModal(platform = null) {
    const modal = document.getElementById('platform-modal');
    const title = document.getElementById('platform-modal-title');
    const idInput = document.getElementById('platform-id');
    const nameInput = document.getElementById('platform-name');
    const descInput = document.getElementById('platform-description');
    const hostInput = document.getElementById('platform-host');

    if (!modal) return;

    if (platform) {
        title.textContent = 'Edit Platform';
        idInput.value = platform.id;
        nameInput.value = platform.name;
        descInput.value = platform.description || '';
        hostInput.value = platform.data?.host || '';
    } else {
        title.textContent = 'Add Platform';
        idInput.value = '';
        nameInput.value = '';
        descInput.value = '';
        hostInput.value = '';
    }

    modal.classList.remove('hidden');
    nameInput.focus();
}

function closePlatformModal() {
    const modal = document.getElementById('platform-modal');
    if (modal) modal.classList.add('hidden');
}

export async function loadSettings() {
    try {
        // Load platforms
        const platformsResponse = await fetch('/api/settings?category=platform');
        panelData.platformsData = await platformsResponse.json();

        // Load buses
        const busesResponse = await fetch('/api/settings?category=bus');
        const buses = await busesResponse.json();

        // Load connection definitions for later use
        await loadConnectionsDefinitions();

        // Group buses by platform_id
        platformBuses = {};
        buses.forEach(bus => {
            const platformId = bus.data?.platform_id || null;
            if (!platformBuses[platformId]) {
                platformBuses[platformId] = [];
            }
            platformBuses[platformId].push(bus);
        });

        // Fetch device counts for each bus
        await fetchBusDeviceCounts(buses);

        renderPlatformsList();
    } catch (error) {
        console.error('Error loading settings:', error);
    }
}

async function fetchBusDeviceCounts(buses) {
    // Fetch device counts in parallel
    await Promise.all(buses.map(async (bus) => {
        try {
            const response = await fetch(`/api/buses/${bus.id}/devices`);
            const devices = await response.json();
            bus.deviceCount = Array.isArray(devices) ? devices.length : 0;
        } catch {
            bus.deviceCount = 0;
        }
    }));
}

function renderPlatformsList() {
    const list = document.getElementById('platforms-list');

    if (!list) return;

    if (panelData.platformsData.length === 0) {
        list.innerHTML = '<div class="settings-empty">No platform configured yet. Add a platform to manage bus connections.</div>';
        return;
    }

    list.innerHTML = panelData.platformsData.map(platform => {
        const buses = platformBuses[platform.id] || [];
        const busCount = buses.length;

        return `
            <div class="platform-card" data-id="${platform.id}">
                <div class="platform-card-header" onclick="window.appFunctions.togglePlatform(${platform.id})">
                    <div class="platform-card-expand">
                        <i class="fa-solid fa-chevron-right"></i>
                    </div>
                    <div class="platform-card-info">
                        <p class="platform-card-name">
                            <i class="fa-solid fa-server" style="color: #6b7280;"></i>
                            ${escapeHtml(platform.name)}
                        </p>
                        <p class="platform-card-host">${escapeHtml(platform.data?.host || 'No host configured')}</p>
                        ${platform.description ? `<p class="platform-card-desc">${escapeHtml(platform.description)}</p>` : ''}
                        <p class="platform-card-stats">${busCount} bus${busCount !== 1 ? 'es' : ''}</p>
                    </div>
                    <div class="platform-card-actions" onclick="event.stopPropagation()">
                        <button class="platform-card-btn" title="Edit" onclick="window.appFunctions.editPlatform(${platform.id})">
                            <i class="fa-solid fa-pen"></i>
                        </button>
                        <button class="platform-card-btn delete" title="Delete" onclick="window.appFunctions.deletePlatform(${platform.id})">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </div>
                </div>
                <div class="platform-buses">
                    <div class="platform-buses-header">
                        <span class="platform-buses-title">Bus Connections</span>
                        <button class="platform-add-bus-btn" onclick="window.appFunctions.addBusToPlatform(${platform.id})">
                            <i class="fa-solid fa-plus"></i>
                            Add Bus
                        </button>
                    </div>
                    <div class="platform-buses-list">
                        ${renderPlatformBuses(buses)}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function renderPlatformBuses(buses) {
    if (buses.length === 0) {
        return '<div class="platform-buses-empty">No bus connections configured for this platform.</div>';
    }

    return buses.map(bus => `
        <div class="bus-item" data-id="${bus.id}">
            <div class="bus-item-info">
                <p class="bus-item-name">
                    ${escapeHtml(bus.name)}
                    <span class="bus-item-badge">${escapeHtml(bus.data?.connection_type || 'Unknown')}</span>
                </p>
                <p class="bus-item-settings">${formatBusSettings(bus.data)}</p>
                ${bus.deviceCount > 0 ? `<p class="bus-item-devices">${bus.deviceCount} device(s) connected</p>` : ''}
            </div>
            <div class="bus-item-actions">
                <button class="bus-item-btn" title="Edit" onclick="window.appFunctions.editBus(${bus.id})">
                    <i class="fa-solid fa-pen"></i>
                </button>
                <button class="bus-item-btn delete" title="Delete" onclick="window.appFunctions.deleteBus(${bus.id})">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
}

function formatBusSettings(data) {
    if (!data) return 'No settings';
    const parts = [];
    if (data.port) parts.push(data.port);
    if (data.baud_rate) parts.push(`${data.baud_rate} baud`);
    return parts.join(' | ') || 'No settings';
}

// Toggle platform expansion
export function togglePlatform(platformId) {
    const card = document.querySelector(`.platform-card[data-id="${platformId}"]`);
    if (card) {
        card.classList.toggle('expanded');
    }
}

// Add bus to a specific platform
export function addBusToPlatform(platformId) {
    openBusModal(null, null, platformId);
}

export function editPlatform(id) {
    const platform = panelData.platformsData.find(p => p.id === id);
    if (platform) {
        openPlatformModal(platform);
    }
}

async function savePlatform() {
    const idInput = document.getElementById('platform-id');
    const nameInput = document.getElementById('platform-name');
    const descInput = document.getElementById('platform-description');
    const hostInput = document.getElementById('platform-host');

    // Validate required fields
    const name = nameInput.value.trim();
    const host = hostInput.value.trim();

    if (!name) {
        alert('Platform name is required');
        nameInput.focus();
        return;
    }
    if (!host) {
        alert('Platform host is required');
        hostInput.focus();
        return;
    }

    const data = {
        category: 'platform',
        name: name,
        description: descInput.value.trim() || null,
        data: { host: host }
    };

    try {
        let response;
        if (idInput.value) {
            // Update existing
            response = await fetch(`/api/settings/${idInput.value}`, {
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
            closePlatformModal();
            loadSettings();
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
        alert(`Failed to save platform: ${error.message}`);
    }
}

export async function deletePlatform(id) {
    // Check if platform has buses
    const buses = platformBuses[id] || [];
    if (buses.length > 0) {
        alert(`Cannot delete platform: ${buses.length} bus connection(s) are configured. Delete the buses first.`);
        return;
    }

    if (!confirm('Are you sure you want to delete this platform?')) {
        return;
    }

    try {
        const response = await fetch(`/api/settings/${id}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            loadSettings();
        } else {
            const error = await response.json();
            alert(error.error || 'Failed to delete platform');
        }
    } catch (error) {
        console.error('Error deleting platform:', error);
        alert('Failed to delete platform');
    }
}
