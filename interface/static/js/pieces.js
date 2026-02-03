// Pieces tab functionality
import { panelData } from './state.js';
import { convertIconClass } from './utils.js';
import { createPanelSearch, renderNoResults } from './generic-panel.js';

// Initialize pieces search
export function initPiecesSearch() {
    createPanelSearch({
        inputId: 'pieces-search',
        onSearch: renderPieces
    });
}

// Load piece directories
export async function loadPieceDirectories() {
    try {
        const response = await fetch('/api/piece-directories');
        const directories = await response.json();

        const select = document.getElementById('pieces-directory');
        if (!select) return;

        select.innerHTML = '';

        directories.forEach(dir => {
            const option = document.createElement('option');
            option.value = dir;
            option.textContent = dir;
            select.appendChild(option);
        });

        // Load pieces for the first directory
        if (directories.length > 0) {
            loadPieces(directories[0]);
        }

        // Add change listener
        select.addEventListener('change', (e) => {
            loadPieces(e.target.value);
        });
    } catch (error) {
        console.error('Error loading piece directories:', error);
    }
}

// Load pieces from a directory
export async function loadPieces(directory) {
    try {
        const response = await fetch(`/api/pieces/${directory}`);
        panelData.currentPieces = await response.json();
        panelData.currentPiecesDirectory = directory;
        renderPieces();
    } catch (error) {
        console.error('Error loading pieces:', error);
    }
}

// Render pieces with optional filter
export function renderPieces(filter = '') {
    const piecesList = document.getElementById('pieces-list');
    if (!piecesList) return;

    piecesList.innerHTML = '';

    const filterLower = filter.toLowerCase().trim();

    // Filter pieces
    const filteredPieces = filterLower
        ? panelData.currentPieces.filter(piece =>
            piece.node_label.toLowerCase().includes(filterLower) ||
            piece.name.toLowerCase().includes(filterLower) ||
            (piece.description && piece.description.toLowerCase().includes(filterLower)) ||
            (piece.tags && piece.tags.some(tag => tag.toLowerCase().includes(filterLower)))
        )
        : panelData.currentPieces;

    // Group pieces by category
    const categories = {};
    filteredPieces.forEach(piece => {
        const cat = piece.category || 'Other';
        if (!categories[cat]) {
            categories[cat] = [];
        }
        categories[cat].push(piece);
    });

    // Render pieces by category
    Object.keys(categories).sort().forEach(category => {
        const categoryEl = document.createElement('div');
        categoryEl.className = 'pieces-category';

        const categoryHeader = document.createElement('div');
        categoryHeader.className = 'pieces-category-header';
        categoryHeader.textContent = category;
        categoryEl.appendChild(categoryHeader);

        const categoryItems = document.createElement('div');
        categoryItems.className = 'pieces-category-items';

        categories[category].forEach(piece => {
            const pieceEl = document.createElement('div');
            pieceEl.className = 'piece-item';
            pieceEl.title = piece.description || piece.node_label;
            pieceEl.draggable = true;

            const iconClass = convertIconClass(piece.icon_class_name);
            // Add badge icon for include_block type
            const typeBadge = piece.type === 'include_block'
                ? '<i class="fa-regular fa-clone piece-type-badge" title="Include Block"></i>'
                : '';
            pieceEl.innerHTML = `
                <i class="${iconClass}"></i>
                <span class="piece-label">${piece.node_label}</span>
                ${typeBadge}
            `;

            // Drag start handler
            pieceEl.addEventListener('dragstart', (e) => {
                // Include directory info with the piece data
                const pieceData = { ...piece, directory: panelData.currentPiecesDirectory };
                e.dataTransfer.setData('application/json', JSON.stringify(pieceData));
                e.dataTransfer.effectAllowed = 'copy';
                pieceEl.classList.add('dragging');
            });

            pieceEl.addEventListener('dragend', () => {
                pieceEl.classList.remove('dragging');
            });

            categoryItems.appendChild(pieceEl);
        });

        categoryEl.appendChild(categoryItems);
        piecesList.appendChild(categoryEl);
    });

    // Show message if no results
    if (filteredPieces.length === 0 && filterLower) {
        renderNoResults(piecesList, 'No pieces found');
    }
}
