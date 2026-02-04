-- PostgreSQL Database Schema for Hierarchical Workflow Designer
-- This script creates the necessary tables for storing workflows, nodes, and edges

-- Drop existing tables if they exist (for clean setup)
DROP TABLE IF EXISTS edges CASCADE;
DROP TABLE IF EXISTS nodes CASCADE;
DROP TABLE IF EXISTS blocks_used CASCADE;
DROP TABLE IF EXISTS workflows CASCADE;
DROP TABLE IF EXISTS experiments CASCADE;
DROP TABLE IF EXISTS settings CASCADE;
DROP TABLE IF EXISTS devices_installed CASCADE;

-- Create experiments table
CREATE TABLE experiments (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create workflows table
CREATE TABLE workflows (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    parent_id VARCHAR(100),
    experiment_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_id) REFERENCES workflows(id) ON DELETE CASCADE,
    FOREIGN KEY (experiment_id) REFERENCES experiments(id) ON DELETE CASCADE
);

-- Create settings table
CREATE TABLE settings (
    id SERIAL PRIMARY KEY,
    category VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    data JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(category, name)
);

-- Create devices_installed table (must be before nodes due to FK)
CREATE TABLE devices_installed (
    id SERIAL PRIMARY KEY,
    piece_name VARCHAR(255) NOT NULL,
    piece_directory VARCHAR(255) NOT NULL,
    piece_hash VARCHAR(64),
    label VARCHAR(255) NOT NULL,
    device_type VARCHAR(100) NOT NULL,
    icon_class VARCHAR(100),
    description TEXT,
    connection_string VARCHAR(500),
    mode VARCHAR(50) DEFAULT 'deactivate',
    data JSONB,
    depends_on_id INTEGER,
    platform_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (depends_on_id) REFERENCES devices_installed(id) ON DELETE SET NULL,
    FOREIGN KEY (platform_id) REFERENCES settings(id) ON DELETE SET NULL,
    UNIQUE (label, platform_id)
);

-- Create blocks_used table (tracks blocks/pieces used in workflows, must be before nodes due to FK)
CREATE TABLE blocks_used (
    id SERIAL PRIMARY KEY,
    workflow_id VARCHAR(100) NOT NULL,
    piece_name VARCHAR(255) NOT NULL,
    piece_directory VARCHAR(255) NOT NULL,
    piece_hash VARCHAR(64),
    icon_class VARCHAR(100),
    config JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (workflow_id) REFERENCES workflows(id) ON DELETE CASCADE
);

-- Create nodes table
CREATE TABLE nodes (
    id VARCHAR(100) NOT NULL,
    workflow_id VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'default',
    label VARCHAR(255) NOT NULL,
    subflow_id VARCHAR(100),
    device_id INTEGER,
    block_id INTEGER,
    position_x INTEGER NOT NULL,
    position_y INTEGER NOT NULL,
    data JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id, workflow_id),
    FOREIGN KEY (workflow_id) REFERENCES workflows(id) ON DELETE CASCADE,
    FOREIGN KEY (subflow_id) REFERENCES workflows(id) ON DELETE SET NULL,
    FOREIGN KEY (device_id) REFERENCES devices_installed(id) ON DELETE RESTRICT,
    FOREIGN KEY (block_id) REFERENCES blocks_used(id) ON DELETE SET NULL
);

-- Create edges table
CREATE TABLE edges (
    id VARCHAR(100) PRIMARY KEY,
    workflow_id VARCHAR(100) NOT NULL,
    source_node_id VARCHAR(100) NOT NULL,
    target_node_id VARCHAR(100) NOT NULL,
    animated BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (workflow_id) REFERENCES workflows(id) ON DELETE CASCADE
);

-- Create indexes for better query performance
CREATE INDEX idx_nodes_workflow_id ON nodes(workflow_id);
CREATE INDEX idx_nodes_device_id ON nodes(device_id);
CREATE INDEX idx_nodes_block_id ON nodes(block_id);
CREATE INDEX idx_edges_workflow_id ON edges(workflow_id);
CREATE INDEX idx_workflows_parent_id ON workflows(parent_id);
CREATE INDEX idx_workflows_experiment_id ON workflows(experiment_id);
CREATE INDEX idx_settings_category ON settings(category);
CREATE INDEX idx_devices_installed_piece_name ON devices_installed(piece_name);
CREATE INDEX idx_devices_installed_mode ON devices_installed(mode);
CREATE INDEX idx_devices_installed_depends_on ON devices_installed(depends_on_id);
CREATE INDEX idx_devices_installed_platform ON devices_installed(platform_id);
CREATE INDEX idx_blocks_used_workflow_id ON blocks_used(workflow_id);
CREATE INDEX idx_blocks_used_piece_name ON blocks_used(piece_name);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to automatically update updated_at
CREATE TRIGGER update_experiments_updated_at BEFORE UPDATE ON experiments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workflows_updated_at BEFORE UPDATE ON workflows
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_nodes_updated_at BEFORE UPDATE ON nodes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_edges_updated_at BEFORE UPDATE ON edges
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_devices_installed_updated_at BEFORE UPDATE ON devices_installed
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_blocks_used_updated_at BEFORE UPDATE ON blocks_used
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to delete associated block when node is deleted
CREATE OR REPLACE FUNCTION delete_node_block()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.block_id IS NOT NULL THEN
        DELETE FROM blocks_used WHERE id = OLD.block_id;
    END IF;
    RETURN OLD;
END;
$$ language 'plpgsql';

-- Trigger to delete associated block when node is deleted
CREATE TRIGGER delete_node_block_trigger AFTER DELETE ON nodes
    FOR EACH ROW EXECUTE FUNCTION delete_node_block();
