-- PostgreSQL Database Schema for Hierarchical Workflow Designer
-- This script creates the necessary tables for storing workflows, nodes, and edges

-- Drop existing tables if they exist (for clean setup)
DROP TABLE IF EXISTS edges CASCADE;
DROP TABLE IF EXISTS nodes CASCADE;
DROP TABLE IF EXISTS workflows CASCADE;

-- Create workflows table
CREATE TABLE workflows (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    parent_id VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_id) REFERENCES workflows(id) ON DELETE CASCADE
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

-- Create indexes for better query performance
CREATE INDEX idx_nodes_workflow_id ON nodes(workflow_id);
CREATE INDEX idx_edges_workflow_id ON edges(workflow_id);
CREATE INDEX idx_workflows_parent_id ON workflows(parent_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to automatically update updated_at
CREATE TRIGGER update_workflows_updated_at BEFORE UPDATE ON workflows
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_nodes_updated_at BEFORE UPDATE ON nodes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_edges_updated_at BEFORE UPDATE ON edges
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data (same as the current in-memory data)
INSERT INTO workflows (id, name, parent_id) VALUES
    ('main', 'Main Workflow', NULL),
    ('workflow_B', 'Process B - Detail', 'main');

INSERT INTO nodes (id, workflow_id, type, label, subflow_id, position_x, position_y) VALUES
    ('A', 'main', 'default', 'Process A', NULL, 100, 150),
    ('B', 'main', 'composite', 'Process B (Composite)', 'workflow_B', 350, 150),
    ('C', 'main', 'default', 'Process C', NULL, 600, 150),
    ('B1', 'workflow_B', 'default', 'Step B1', NULL, 100, 150),
    ('B2', 'workflow_B', 'default', 'Step B2', NULL, 300, 150),
    ('B3', 'workflow_B', 'default', 'Step B3', NULL, 500, 80),
    ('B4', 'workflow_B', 'default', 'Step B4', NULL, 500, 220),
    ('B5', 'workflow_B', 'default', 'Step B5', NULL, 700, 150);

INSERT INTO edges (id, workflow_id, source_node_id, target_node_id, animated) VALUES
    ('e-A-B', 'main', 'A', 'B', TRUE),
    ('e-B-C', 'main', 'B', 'C', TRUE),
    ('e-B1-B2', 'workflow_B', 'B1', 'B2', TRUE),
    ('e-B2-B3', 'workflow_B', 'B2', 'B3', TRUE),
    ('e-B2-B4', 'workflow_B', 'B2', 'B4', TRUE),
    ('e-B3-B5', 'workflow_B', 'B3', 'B5', TRUE),
    ('e-B4-B5', 'workflow_B', 'B4', 'B5', TRUE);
