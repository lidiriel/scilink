// Devices management
import { escapeHtml, convertIconClass } from './utils.js';

// Local state for devices
let devicesData = [];
let devicePieces = [];
let currentDirectory = '';

// Initialize devices
export function initDevices() {
    const modal = document.getElementById('device-modal');
    const form = document.getElementById('device-form');
    const closeBtn = document.getElementById('device-modal-close');
    const cancelBtn = document.getElementById('device-cancel');
    const searchInput = document.getElementById('device-pieces-search');
    const directorySelect = document.getElementById('device-pieces-directory');

    if (!modal) return;

    const backdrop = modal.querySelector('.modal-backdrop');

    // Close modal
    if (closeBtn) closeBtn.addEventListener('click', closeDeviceModal);
    if (cancelBtn) cancelBtn.addEventListener('click', closeDeviceModal);
    if (backdrop) backdrop.addEventListener('click', closeDeviceModal);

    // Form submit
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            saveDevice();
        });
    }

    // Search input
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            renderDevicePieces(e.target.value);
        });
    }

    // Directory select
    if (directorySelect) {
        directorySelect.addEventListener('change', (e) => {
            currentDirectory = e.target.value;
            loadDevicePieces(currentDirectory);
        });
    }

    // Initialize drop zone
    initDropZone();
}

function initDropZone() {
    const dropZone = document.getElementById('devices-drop-zone');
    if (!dropZone) return;

    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
        dropZone.classList.add('drag-over');
    });

    dropZone.addEventListener('dragleave', (e) => {
        if (!dropZone.contains(e.relatedTarget)) {
            dropZone.classList.remove('drag-over');
        }
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');

        const pieceData = e.dataTransfer.getData('application/device-piece');
        if (pieceData) {
            const piece = JSON.parse(pieceData);
            openDeviceModal(null, piece);
        }
    });
}

async function loadPieceDirectories() {
    try {
        const response = await fetch('/api/piece-directories');
        const directories = await response.json();

        const select = document.getElementById('device-pieces-directory');
        if (!select) return;

        select.innerHTML = directories.map(dir =>
            `<option value="${escapeHtml(dir)}">${escapeHtml(dir)}</option>`
        ).join('');

        if (directories.length > 0) {
            currentDirectory = directories[0];
            loadDevicePieces(currentDirectory);
        }
    } catch (error) {
        console.error('Error loading piece directories:', error);
    }
}

async function loadDevicePieces(directory) {
    try {
        const response = await fetch(`/api/device-pieces/${directory}`);
        devicePieces = await response.json();
        renderDevicePieces();
    } catch (error) {
        console.error('Error loading device pieces:', error);
        devicePieces = [];
        renderDevicePieces();
    }
}

function renderDevicePieces(filter = '') {
    const list = document.getElementById('device-pieces-list');
    if (!list) return;

    const filterLower = filter.toLowerCase().trim();
    const filtered = filterLower
        ? devicePieces.filter(p =>
            p.name.toLowerCase().includes(filterLower) ||
            p.category.toLowerCase().includes(filterLower))
        : devicePieces;

    if (filtered.length === 0) {
        list.innerHTML = `<div class="panel-empty">${filterLower ? 'No devices found' : 'No device pieces available'}</div>`;
        return;
    }

    // Group by category
    const grouped = {};
    filtered.forEach(piece => {
        if (!grouped[piece.category]) {
            grouped[piece.category] = [];
        }
        grouped[piece.category].push(piece);
    });

    list.innerHTML = Object.entries(grouped).map(([category, pieces]) => `
        <div class="piece-category">
            <div class="piece-category-header">${escapeHtml(category)}</div>
            <div class="piece-category-items">
                ${pieces.map(piece => {
                    const iconClass = convertIconClass(piece.icon_class_name);
                    return `
                        <div class="device-piece-item" draggable="true" data-piece-name="${escapeHtml(piece.name)}">
                            <i class="${iconClass}"></i>
                            <span>${escapeHtml(piece.node_label || piece.name)}</span>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `).join('');

    // Add drag handlers
    list.querySelectorAll('.device-piece-item').forEach(item => {
        item.addEventListener('dragstart', (e) => {
            const pieceName = item.dataset.pieceName;
            // Find the piece in the full devicePieces array by name
            const piece = devicePieces.find(p => p.name === pieceName);
            if (piece) {
                e.dataTransfer.setData('application/device-piece', JSON.stringify(piece));
                e.dataTransfer.effectAllowed = 'copy';
                item.classList.add('dragging');
            }
        });

        item.addEventListener('dragend', () => {
            item.classList.remove('dragging');
        });
    });
}

function openDeviceModal(device = null, piece = null) {
    const modal = document.getElementById('device-modal');
    const title = document.getElementById('device-modal-title');
    const idInput = document.getElementById('device-id');
    const pieceNameInput = document.getElementById('device-piece-name');
    const iconClassInput = document.getElementById('device-icon-class');
    const labelInput = document.getElementById('device-label');
    const typeInput = document.getElementById('device-type');
    const descInput = document.getElementById('device-description');
    const connInput = document.getElementById('device-connection');
    const modeSelect = document.getElementById('device-mode');

    if (!modal) return;

    if (device) {
        // Edit existing device
        title.textContent = 'Edit Device';
        idInput.value = device.id;
        pieceNameInput.value = device.piece_name;
        iconClassInput.value = device.icon_class || '';
        labelInput.value = device.label;
        typeInput.value = device.device_type;
        descInput.value = device.description || '';
        connInput.value = device.connection_string || '';
        setDeviceMode(device.mode || 'deactivate');
    } else if (piece) {
        // New device from piece
        title.textContent = 'Install Device';
        idInput.value = '';
        pieceNameInput.value = piece.name;
        iconClassInput.value = piece.icon_class_name || '';
        labelInput.value = piece.node_label || piece.name;
        typeInput.value = piece.category;
        descInput.value = piece.description || '';
        connInput.value = '';
        setDeviceMode('deactivate');
    }

    modal.classList.remove('hidden');
    labelInput.focus();
}

function closeDeviceModal() {
    const modal = document.getElementById('device-modal');
    if (modal) modal.classList.add('hidden');
}

export async function loadDevices() {
    // Load piece directories first
    await loadPieceDirectories();

    // Then load installed devices
    try {
        const response = await fetch('/api/devices');
        devicesData = await response.json();
        renderDevicesList();
    } catch (error) {
        console.error('Error loading devices:', error);
    }
}

function getModeClass(mode) {
    const classes = {
        'activate': 'mode-activate',
        'deactivate': 'mode-deactivate',
        'simulate': 'mode-simulate'
    };
    return classes[mode] || 'mode-deactivate';
}


function renderDevicesList() {
    const list = document.getElementById('devices-list');
    const dropZone = document.getElementById('devices-drop-zone');

    if (!list) return;

    if (devicesData.length === 0) {
        list.innerHTML = '';
        if (dropZone) dropZone.classList.add('empty');
        return;
    }

    if (dropZone) dropZone.classList.remove('empty');

    list.innerHTML = devicesData.map(device => {
        const iconClass = device.icon_class ? convertIconClass(device.icon_class) : 'fa-solid fa-microchip';
        const deviceMode = device.mode || 'deactivate';
        return `
            <div class="device-card ${getModeClass(deviceMode)}" data-id="${device.id}">
                <div class="device-card-header">
                    <div class="device-card-icon">
                        <i class="${iconClass}"></i>
                    </div>
                </div>
                <div class="device-card-body">
                    <h4 class="device-card-label">${escapeHtml(device.label)}</h4>
                    <p class="device-card-piece">${escapeHtml(device.piece_name)}</p>
                    ${device.connection_string ? `<p class="device-card-connection">${escapeHtml(device.connection_string)}</p>` : ''}
                </div>
                <div class="device-card-footer">
                    <div class="toggle-group" data-device-id="${device.id}">
                        <input type="radio" name="mode-${device.id}" id="activate-${device.id}" value="activate" ${deviceMode === 'activate' ? 'checked' : ''} />
                        <label for="activate-${device.id}" class="mode-activate" title="Activate">
                            <i class="fa-solid fa-plug-circle-check"></i>
                        </label>
                        <input type="radio" name="mode-${device.id}" id="deactivate-${device.id}" value="deactivate" ${deviceMode === 'deactivate' ? 'checked' : ''} />
                        <label for="deactivate-${device.id}" class="mode-deactivate" title="Deactivate">
                            <i class="fa-solid fa-plug-circle-xmark"></i>
                        </label>
                        <input type="radio" name="mode-${device.id}" id="simulate-${device.id}" value="simulate" ${deviceMode === 'simulate' ? 'checked' : ''} />
                        <label for="simulate-${device.id}" class="mode-simulate" title="Simulate">
                            <i class="fa-solid fa-wave-square"></i>
                        </label>
                    </div>
                    <div class="device-card-actions">
                        <button class="device-card-btn" title="Edit" onclick="window.appFunctions.editDevice(${device.id})">
                            <i class="fa-solid fa-pen"></i>
                        </button>
                        <button class="device-card-btn delete" title="Delete" onclick="window.appFunctions.deleteDevice(${device.id})">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    // Add event listeners for mode toggle
    list.querySelectorAll('.toggle-group input[type="radio"]').forEach(radio => {
        radio.addEventListener('change', async (e) => {
            const deviceId = e.target.closest('.toggle-group').dataset.deviceId;
            const newMode = e.target.value;
            await updateDeviceMode(deviceId, newMode);
        });
    });
}

export function editDevice(id) {
    const device = devicesData.find(d => d.id === id);
    if (device) {
        openDeviceModal(device);
    }
}

async function updateDeviceMode(deviceId, newMode) {
    try {
        const response = await fetch(`/api/devices/${deviceId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mode: newMode })
        });

        if (response.ok) {
            // Update local data and refresh card styling
            const device = devicesData.find(d => d.id === parseInt(deviceId));
            if (device) {
                device.mode = newMode;
                // Update the card's mode class (devices page)
                const card = document.querySelector(`.device-card[data-id="${deviceId}"]`);
                if (card) {
                    card.classList.remove('mode-activate', 'mode-deactivate', 'mode-simulate');
                    card.classList.add(getModeClass(newMode));
                }
                // Update sidebar item class
                const sidebarItem = document.querySelector(`.sidebar-device-item[data-id="${deviceId}"]`);
                if (sidebarItem) {
                    sidebarItem.classList.remove('mode-activate', 'mode-deactivate', 'mode-simulate');
                    sidebarItem.classList.add(getModeClass(newMode));
                }
            }
        } else {
            console.error('Failed to update device mode');
        }
    } catch (error) {
        console.error('Error updating device mode:', error);
    }
}

// Render devices in the sidebar (workflow page)
export async function loadSidebarDevices() {
    try {
        const response = await fetch('/api/devices');
        devicesData = await response.json();
        renderSidebarDevices();
    } catch (error) {
        console.error('Error loading sidebar devices:', error);
    }
}

function getModeIcon(mode) {
    const icons = {
        'activate': { icon: 'fa-solid fa-plug-circle-check', title: 'Active' },
        'deactivate': { icon: 'fa-solid fa-plug-circle-xmark', title: 'Deactivated' },
        'simulate': { icon: 'fa-solid fa-wave-square', title: 'Simulation' }
    };
    return icons[mode] || icons['deactivate'];
}

function renderSidebarDevices() {
    const list = document.getElementById('sidebar-devices-list');
    if (!list) return;

    if (devicesData.length === 0) {
        list.innerHTML = '<div class="side-panel-empty">No devices installed</div>';
        return;
    }

    list.innerHTML = devicesData.map(device => {
        const iconClass = device.icon_class ? convertIconClass(device.icon_class) : 'fa-solid fa-microchip';
        const deviceMode = device.mode || 'deactivate';
        const modeInfo = getModeIcon(deviceMode);
        return `
            <div class="sidebar-device-item ${getModeClass(deviceMode)}" data-id="${device.id}" draggable="true">
                <div class="sidebar-device-icon">
                    <i class="${iconClass}"></i>
                </div>
                <div class="sidebar-device-info">
                    <span class="sidebar-device-label">${escapeHtml(device.label)}</span>
                    <span class="sidebar-device-type">${escapeHtml(device.piece_name)}</span>
                </div>
                <div class="sidebar-device-mode-icon ${getModeClass(deviceMode)}" title="${modeInfo.title}">
                    <i class="${modeInfo.icon}"></i>
                </div>
            </div>
        `;
    }).join('');

    // Add drag handlers for dropping devices on canvas
    list.querySelectorAll('.sidebar-device-item').forEach(item => {
        item.addEventListener('dragstart', (e) => {
            const deviceId = parseInt(item.dataset.id);
            const device = devicesData.find(d => d.id === deviceId);
            if (device) {
                e.dataTransfer.setData('application/device', JSON.stringify(device));
                e.dataTransfer.effectAllowed = 'copy';
                item.classList.add('dragging');
            }
        });

        item.addEventListener('dragend', () => {
            item.classList.remove('dragging');
        });
    });
}

function getDeviceMode() {
    const radios = document.querySelectorAll('#device-form input[name="device-mode"]');
    for (const radio of radios) {
        if (radio.checked) {
            return radio.value;
        }
    }
    return 'deactivate';
}

function setDeviceMode(mode) {
    const radios = document.querySelectorAll('#device-form input[name="device-mode"]');
    for (const radio of radios) {
        radio.checked = (radio.value === mode);
    }
}

async function saveDevice() {
    const idInput = document.getElementById('device-id');
    const pieceNameInput = document.getElementById('device-piece-name');
    const iconClassInput = document.getElementById('device-icon-class');
    const labelInput = document.getElementById('device-label');
    const typeInput = document.getElementById('device-type');
    const descInput = document.getElementById('device-description');
    const connInput = document.getElementById('device-connection');

    const data = {
        piece_name: pieceNameInput.value,
        label: labelInput.value.trim(),
        device_type: typeInput.value,
        icon_class: iconClassInput.value || null,
        description: descInput.value.trim() || null,
        connection_string: connInput.value.trim() || null,
        mode: getDeviceMode(),
    };

    try {
        let response;
        if (idInput.value) {
            // Update existing
            response = await fetch(`/api/devices/${idInput.value}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
        } else {
            // Create new
            response = await fetch('/api/devices', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
        }

        if (response.ok) {
            closeDeviceModal();
            // Reload only the devices list, not the pieces
            const devResponse = await fetch('/api/devices');
            devicesData = await devResponse.json();
            renderDevicesList();
        } else {
            const error = await response.json();
            alert(error.error || 'Failed to save device');
        }
    } catch (error) {
        console.error('Error saving device:', error);
        alert('Failed to save device');
    }
}

export async function deleteDevice(id) {
    if (!confirm('Are you sure you want to delete this device?')) {
        return;
    }

    try {
        const response = await fetch(`/api/devices/${id}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            // Reload only the devices list
            const devResponse = await fetch('/api/devices');
            devicesData = await devResponse.json();
            renderDevicesList();
        } else {
            alert('Failed to delete device');
        }
    } catch (error) {
        console.error('Error deleting device:', error);
        alert('Failed to delete device');
    }
}
