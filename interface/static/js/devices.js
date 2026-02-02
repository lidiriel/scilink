// Devices management
import { escapeHtml, convertIconClass } from './utils.js';
import { getConnectionDefinition, getBusesByType, showBusTab, openBusModal, loadConnectionsDefinitions } from './buses.js';

// Local state for devices
let devicesData = [];
let devicePieces = [];
let currentDirectory = '';
let currentPiece = null; // Store current piece being installed for connection setup

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

    // Bus selection handler
    initBusSelection();
}

function initBusSelection() {
    const busSelect = document.getElementById('device-bus-select');
    if (busSelect) {
        busSelect.addEventListener('change', async (e) => {
            if (e.target.value === '__new__') {
                // Get the current connection type from the hidden field
                const connectionType = document.getElementById('device-connection-type')?.value;

                // Close device modal and open bus modal
                closeDeviceModal();

                // Store pending device data to resume after bus creation
                sessionStorage.setItem('pendingDeviceInstall', JSON.stringify({
                    piece: currentPiece,
                    label: document.getElementById('device-label').value,
                    description: document.getElementById('device-description').value,
                    mode: getDeviceMode(),
                    connectionType: connectionType
                }));

                // Open bus modal with the connection type pre-selected
                await openBusModal(null, connectionType);
            }
        });
    }
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
                // Include directory info with the piece data
                const pieceData = { ...piece, directory: currentDirectory };
                e.dataTransfer.setData('application/device-piece', JSON.stringify(pieceData));
                e.dataTransfer.effectAllowed = 'copy';
                item.classList.add('dragging');
            }
        });

        item.addEventListener('dragend', () => {
            item.classList.remove('dragging');
        });
    });
}

async function openDeviceModal(device = null, piece = null) {
    const modal = document.getElementById('device-modal');
    const title = document.getElementById('device-modal-title');
    const idInput = document.getElementById('device-id');
    const pieceNameInput = document.getElementById('device-piece-name');
    const pieceDirectoryInput = document.getElementById('device-piece-directory');
    const pieceHashInput = document.getElementById('device-piece-hash');
    const iconClassInput = document.getElementById('device-icon-class');
    const labelInput = document.getElementById('device-label');
    const typeInput = document.getElementById('device-type');
    const descInput = document.getElementById('device-description');
    const connInput = document.getElementById('device-connection');
    const connectionTypeInput = document.getElementById('device-connection-type');
    const connectionSection = document.getElementById('device-connection-section');
    const busGroup = document.getElementById('device-bus-group');
    const connectionFields = document.getElementById('device-connection-fields');
    const busSelect = document.getElementById('device-bus-select');

    if (!modal) return;

    // Ensure connections are loaded
    await loadConnectionsDefinitions();

    // Store piece for later use
    currentPiece = piece;

    if (device) {
        // Edit existing device
        title.textContent = 'Edit Device';
        idInput.value = device.id;
        pieceNameInput.value = device.piece_name;
        pieceDirectoryInput.value = device.piece_directory || '';
        pieceHashInput.value = device.piece_hash || '';
        iconClassInput.value = device.icon_class || '';
        labelInput.value = device.label;
        typeInput.value = device.device_type;
        descInput.value = device.description || '';
        connInput.value = device.connection_string || '';
        setDeviceMode(device.mode || 'deactivate');

        // Handle connection settings for existing device
        const connectionName = device.data?.connection_type;
        if (connectionName) {
            connectionTypeInput.value = connectionName;
            setupConnectionSection(connectionName, device.data);
        } else {
            hideConnectionSection();
        }
    } else if (piece) {
        // New device from piece
        title.textContent = 'Install Device';
        idInput.value = '';
        pieceNameInput.value = piece.name;
        pieceDirectoryInput.value = piece.directory || '';
        pieceHashInput.value = piece.git_hash || '';
        iconClassInput.value = piece.icon_class_name || '';
        labelInput.value = piece.node_label || piece.name;
        typeInput.value = piece.category;
        descInput.value = piece.description || '';
        connInput.value = '';
        setDeviceMode('deactivate');

        // Handle connection settings from piece metadata
        const deviceSettings = piece.device_settings;
        const connectionName = deviceSettings?.connection;
        if (connectionName) {
            connectionTypeInput.value = connectionName;
            setupConnectionSection(connectionName, {});
        } else {
            hideConnectionSection();
        }
    }

    modal.classList.remove('hidden');
    labelInput.focus();
}

function hideConnectionSection() {
    const connectionSection = document.getElementById('device-connection-section');
    const busGroup = document.getElementById('device-bus-group');
    const connectionFields = document.getElementById('device-connection-fields');

    if (connectionSection) connectionSection.classList.add('hidden');
    if (busGroup) busGroup.classList.add('hidden');
    if (connectionFields) connectionFields.innerHTML = '';
}

function setupConnectionSection(connectionName, existingData = {}) {
    const connectionSection = document.getElementById('device-connection-section');
    const busGroup = document.getElementById('device-bus-group');
    const connectionFields = document.getElementById('device-connection-fields');
    const busSelect = document.getElementById('device-bus-select');

    if (!connectionSection) return;

    const connDef = getConnectionDefinition(connectionName);
    if (!connDef) {
        hideConnectionSection();
        return;
    }

    connectionSection.classList.remove('hidden');

    if (connDef.bus_settings) {
        // This connection type uses buses
        busGroup.classList.remove('hidden');

        // Populate bus dropdown
        const buses = getBusesByType(connectionName);
        busSelect.innerHTML = `
            <option value="">-- Select a bus --</option>
            ${buses.map(b => `<option value="${escapeHtml(b.name)}">${escapeHtml(b.name)}</option>`).join('')}
            <option value="__new__">+ Create new bus...</option>
        `;

        // Set existing value if editing
        if (existingData.bus_name) {
            busSelect.value = existingData.bus_name;
        }

        // Generate device_settings fields (e.g., slave_id for MODBUS)
        generateDeviceConnectionFields(connDef.device_settings, existingData);
    } else {
        // Direct connection (no bus needed, e.g., SERIAL)
        busGroup.classList.add('hidden');
        generateDeviceConnectionFields(connDef.device_settings, existingData);
    }
}

function generateDeviceConnectionFields(deviceSettings, existingData = {}) {
    const container = document.getElementById('device-connection-fields');
    if (!container || !deviceSettings) {
        if (container) container.innerHTML = '';
        return;
    }

    container.innerHTML = Object.entries(deviceSettings)
        .filter(([key]) => key !== 'connection') // Skip the connection reference field
        .map(([key, config]) => {
            const value = existingData[key] ?? config.default ?? '';
            const required = config.required ? '<span class="required">*</span>' : '';

            if (config.enum) {
                return `
                    <div class="form-group">
                        <label for="device-conn-${key}">${escapeHtml(config.description || key)} ${required}</label>
                        <select id="device-conn-${key}" name="${key}">
                            ${config.enum.map(opt =>
                                `<option value="${opt}" ${value === opt ? 'selected' : ''}>${opt}</option>`
                            ).join('')}
                        </select>
                    </div>
                `;
            } else {
                const inputType = config.type === 'integer' ? 'number' : 'text';
                return `
                    <div class="form-group">
                        <label for="device-conn-${key}">${escapeHtml(config.description || key)} ${required}</label>
                        <input type="${inputType}" id="device-conn-${key}" name="${key}"
                            value="${escapeHtml(String(value))}"
                            ${config.minimum !== undefined ? `min="${config.minimum}"` : ''}
                            ${config.maximum !== undefined ? `max="${config.maximum}"` : ''}
                            placeholder="${escapeHtml(config.default ? String(config.default) : '')}">
                    </div>
                `;
            }
        }).join('');
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
        const busName = device.data?.bus_name;
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
                    ${busName ? `<p class="device-card-bus"><i class="fa-solid fa-link"></i> ${escapeHtml(busName)}</p>` : ''}
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
    const pieceDirectoryInput = document.getElementById('device-piece-directory');
    const pieceHashInput = document.getElementById('device-piece-hash');
    const iconClassInput = document.getElementById('device-icon-class');
    const labelInput = document.getElementById('device-label');
    const typeInput = document.getElementById('device-type');
    const descInput = document.getElementById('device-description');
    const connInput = document.getElementById('device-connection');
    const connectionTypeInput = document.getElementById('device-connection-type');
    const busSelect = document.getElementById('device-bus-select');
    const connectionFields = document.getElementById('device-connection-fields');

    // Gather connection data
    const connectionData = {};
    const connectionType = connectionTypeInput?.value;

    if (connectionType) {
        connectionData.connection_type = connectionType;

        if (busSelect && busSelect.value && busSelect.value !== '__new__' && busSelect.value !== '') {
            connectionData.bus_name = busSelect.value;
        }

        // Gather device-specific connection settings
        if (connectionFields) {
            connectionFields.querySelectorAll('input, select').forEach(input => {
                let value = input.value;
                if (input.type === 'number' && value !== '') {
                    value = parseInt(value, 10);
                }
                if (value !== '') {
                    connectionData[input.name] = value;
                }
            });
        }
    }

    const data = {
        piece_name: pieceNameInput.value,
        piece_directory: pieceDirectoryInput.value,
        piece_hash: pieceHashInput.value || null,
        label: labelInput.value.trim(),
        device_type: typeInput.value,
        icon_class: iconClassInput.value || null,
        description: descInput.value.trim() || null,
        connection_string: connInput.value.trim() || null,
        mode: getDeviceMode(),
        data: Object.keys(connectionData).length > 0 ? connectionData : null
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
