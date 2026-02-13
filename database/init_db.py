"""
Database initialization script
This script creates all tables and optionally loads sample data
"""
import sys
import os

# Add parent directory to path to import app modules
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from frontend.workflow_backend_db import app
from frontend.models import db, Workflow, Node, Edge, Subflow


def init_database(load_sample_data=True):
    """Initialize the database with tables and optional sample data"""
    with app.app_context():
        print("Creating database tables...")
        db.create_all()
        print("✓ Tables created successfully!")

        if load_sample_data:
            print("\nLoading sample data...")
            load_sample_workflows()
            print("✓ Sample data loaded successfully!")


def load_sample_workflows():
    """Load sample workflow data into the database"""
    # Check if data already exists
    if Workflow.query.first():
        print("⚠ Database already contains data. Skipping sample data load.")
        return

    # Create main workflow
    main_workflow = Workflow(
        id='main',
        name='Main Workflow'
    )
    db.session.add(main_workflow)

    # Create workflow B (sub-workflow)
    workflow_b = Workflow(
        id='workflow_B',
        name='Process B - Detail'
    )
    db.session.add(workflow_b)

    # Create subflow record linking workflow_B to main
    subflow_b = Subflow(workflow_id='workflow_B', parent_id='main')
    db.session.add(subflow_b)
    db.session.flush()  # Get the subflow id

    # Add nodes for main workflow
    main_nodes = [
        Node(id='A', workflow_id='main', type='default', label='Process A', position_x=100, position_y=150),
        Node(id='B', workflow_id='main', type='composite', label='Process B (Composite)',
             subflow_id=subflow_b.id, position_x=350, position_y=150),
        Node(id='C', workflow_id='main', type='default', label='Process C', position_x=600, position_y=150)
    ]
    for node in main_nodes:
        db.session.add(node)

    # Add nodes for workflow B
    workflow_b_nodes = [
        Node(id='B1', workflow_id='workflow_B', type='default', label='Step B1', position_x=100, position_y=150),
        Node(id='B2', workflow_id='workflow_B', type='default', label='Step B2', position_x=300, position_y=150),
        Node(id='B3', workflow_id='workflow_B', type='default', label='Step B3', position_x=500, position_y=80),
        Node(id='B4', workflow_id='workflow_B', type='default', label='Step B4', position_x=500, position_y=220),
        Node(id='B5', workflow_id='workflow_B', type='default', label='Step B5', position_x=700, position_y=150)
    ]
    for node in workflow_b_nodes:
        db.session.add(node)

    # Add edges for main workflow
    main_edges = [
        Edge(id='e-A-B', workflow_id='main', source_node_id='A', target_node_id='B', animated=True),
        Edge(id='e-B-C', workflow_id='main', source_node_id='B', target_node_id='C', animated=True)
    ]
    for edge in main_edges:
        db.session.add(edge)

    # Add edges for workflow B
    workflow_b_edges = [
        Edge(id='e-B1-B2', workflow_id='workflow_B', source_node_id='B1', target_node_id='B2', animated=True),
        Edge(id='e-B2-B3', workflow_id='workflow_B', source_node_id='B2', target_node_id='B3', animated=True),
        Edge(id='e-B2-B4', workflow_id='workflow_B', source_node_id='B2', target_node_id='B4', animated=True),
        Edge(id='e-B3-B5', workflow_id='workflow_B', source_node_id='B3', target_node_id='B5', animated=True),
        Edge(id='e-B4-B5', workflow_id='workflow_B', source_node_id='B4', target_node_id='B5', animated=True)
    ]
    for edge in workflow_b_edges:
        db.session.add(edge)

    # Commit all changes
    db.session.commit()
    print(f"  - Created 2 workflows")
    print(f"  - Created 8 nodes")
    print(f"  - Created 7 edges")


def drop_all_tables():
    """Drop all tables (use with caution!)"""
    with app.app_context():
        print("⚠ Dropping all tables...")
        db.drop_all()
        print("✓ All tables dropped!")


if __name__ == '__main__':
    import argparse

    parser = argparse.ArgumentParser(description='Initialize the workflow database')
    parser.add_argument('--reset', action='store_true', help='Drop all tables before creating')
    parser.add_argument('--no-sample-data', action='store_true', help='Skip loading sample data')
    args = parser.parse_args()

    if args.reset:
        drop_all_tables()

    init_database(load_sample_data=not args.no_sample_data)
    print("\n✓ Database initialization complete!")
