-- PostgreSQL Database Schema for Hierarchical Workflow Designer
-- This script creates the necessary tables for storing workflows, nodes, and edges

-- Drop existing tables if they exist (for clean setup)
DROP TABLE IF EXISTS edges CASCADE;
DROP TABLE IF EXISTS nodes CASCADE;
DROP TABLE IF EXISTS workflows CASCADE;
DROP TABLE IF EXISTS experiments CASCADE;
DROP TABLE IF EXISTS settings CASCADE;

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

-- Create nodes table
CREATE TABLE nodes (
    id VARCHAR(100) NOT NULL,
    workflow_id VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'default',
    label VARCHAR(255) NOT NULL,
    subflow_id VARCHAR(100),
    position_x INTEGER NOT NULL,
    position_y INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id, workflow_id),
    FOREIGN KEY (workflow_id) REFERENCES workflows(id) ON DELETE CASCADE,
    FOREIGN KEY (subflow_id) REFERENCES workflows(id) ON DELETE SET NULL
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

-- Create indexes for better query performance
CREATE INDEX idx_nodes_workflow_id ON nodes(workflow_id);
CREATE INDEX idx_edges_workflow_id ON edges(workflow_id);
CREATE INDEX idx_workflows_parent_id ON workflows(parent_id);
CREATE INDEX idx_workflows_experiment_id ON workflows(experiment_id);
CREATE INDEX idx_settings_category ON settings(category);

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


