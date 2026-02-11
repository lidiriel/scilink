import { makeAutoObservable } from "mobx";

interface BlockPiece {
    name: string;
    description: string;
    node_label: string;
    icon_class_name: string;
    category: string;
    tags: string[];
    git_hash: string;
    type: string;
    user_inputs?: Record<string, any>;
}

class PiecesStore {
    blockPieces: BlockPiece[] = [];
    pieceDirectories: string[] = [];
    currentDirectory: string = "";

    constructor() {
        makeAutoObservable(this);
        this.loadPieceDirectories();
    }

    async loadPieceDirectories(): Promise<void> {
        try {
            const response = await fetch("/api/piece-directories");
            this.pieceDirectories = await response.json();
            if (this.pieceDirectories.length > 0 && !this.currentDirectory) {
                this.currentDirectory = this.pieceDirectories[0];
                await this.loadBlockPieces(this.currentDirectory);
            }
        } catch (error) {
            console.error("Error loading piece directories:", error);
        }
    }

    async loadBlockPieces(directory: string): Promise<void> {
        this.currentDirectory = directory;
        try {
            const response = await fetch(`/api/pieces/${directory}`);
            this.blockPieces = await response.json();
        } catch (error) {
            console.error("Error loading block pieces:", error);
            this.blockPieces = [];
        }
    }
}

const piecesStore = new PiecesStore();

let connectionsDefinitions: any[] = new Array();

async function loadConnectionsDefinitions() {
    if (connectionsDefinitions.length > 0) {
        return connectionsDefinitions;
    }
    try {
        const response = await fetch("/api/connections");
        connectionsDefinitions = await response.json();
        return connectionsDefinitions;
    } catch (error) {
        console.error("Error loading connections:", error);
        return [];
    }
}

export type { BlockPiece };
export { piecesStore, loadConnectionsDefinitions, connectionsDefinitions };
