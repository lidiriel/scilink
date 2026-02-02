// Settings / Platforms management
import { panelData } from './state.js';
import { escapeHtml } from './utils.js';
import { loadBuses } from './buses.js';

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
        const response = await fetch('/api/settings?category=platform');
        panelData.platformsData = await response.json();
        renderPlatformsList();

        // Also load buses
        await loadBuses();
    } catch (error) {
        console.error('Error loading platforms:', error);
    }
}

function renderPlatformsList() {
    const list = document.getElementById('platforms-list');

    if (!list) return;

    if (panelData.platformsData.length === 0) {
        list.innerHTML = '<div class="settings-empty">No platform configured yet.</div>';
        return;
    }

    list.innerHTML = panelData.platformsData.map(platform => `
        <div class="settings-item" data-id="${platform.id}">
            <div class="settings-item-info">
                <p class="settings-item-name">${escapeHtml(platform.name)}</p>
                ${platform.description ? `<p class="settings-item-desc">${escapeHtml(platform.description)}</p>` : ''}
                <p class="settings-item-host">${escapeHtml(platform.data?.host || 'No host')}</p>
            </div>
            <div class="settings-item-actions">
                <button class="settings-item-btn edit" title="Edit" onclick="window.appFunctions.editPlatform(${platform.id})">
                    <i class="fa-solid fa-pen"></i>
                </button>
                <button class="settings-item-btn delete" title="Delete" onclick="window.appFunctions.deletePlatform(${platform.id})">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
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
            alert('Failed to delete platform');
        }
    } catch (error) {
        console.error('Error deleting platform:', error);
        alert('Failed to delete platform');
    }
}
