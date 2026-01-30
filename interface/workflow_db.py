"""
Flask backend for Hierarchical Workflow Designer with PostgreSQL support
"""
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from config import config
from models import db, Experiment, Workflow, Node, Edge, Setting
import uuid
import os
import json
import glob
import subprocess

# Initialize Flask app
app = Flask(__name__, static_folder='static')
CORS(app)

# Load configuration
env = os.environ.get('FLASK_ENV', 'development')
app.config.from_object(config[env])

# Initialize database
db.init_app(app)


@app.route('/')
def index():
    """Serve the main HTML page"""
    return send_from_directory('static', 'index.html')


@app.route('/<path:path>')
def serve_static(path):
    """Serve static files"""
    return send_from_directory('static', path)


@app.route('/api/workflow/<workflow_id>', methods=['GET'])
def get_workflow(workflow_id):
    """Get a specific workflow by ID"""
    workflow = Workflow.query.get(workflow_id)
    if workflow:
        return jsonify(workflow.to_dict())
    return jsonify({'error': 'Workflow not found'}), 404


@app.route('/api/workflow/<workflow_id>', methods=['PUT'])
def update_workflow(workflow_id):
    """Update a workflow's nodes and edges"""
    workflow = Workflow.query.get(workflow_id)
    if not workflow:
        return jsonify({'error': 'Workflow not found'}), 404

    data = request.json

    # Update workflow name if provided
    if 'name' in data:
        workflow.name = data['name']

    # Update nodes if provided
    if 'nodes' in data:
        # Remove existing nodes
        Node.query.filter_by(workflow_id=workflow_id).delete()

        # Add new nodes
        for node_data in data['nodes']:
            node = Node(
                id=node_data['id'],
                workflow_id=workflow_id,
                type=node_data.get('type', 'default'),
                label=node_data['label'],
                subflow_id=node_data.get('subflowId'),
                position_x=node_data['x'],
                position_y=node_data['y']
            )
            db.session.add(node)

    # Update edges if provided
    if 'edges' in data:
        # Remove existing edges
        Edge.query.filter_by(workflow_id=workflow_id).delete()

        # Add new edges
        for edge_data in data['edges']:
            edge = Edge(
                id=edge_data.get('id', f"{workflow_id}-e-{edge_data['from']}-{edge_data['to']}"),
                workflow_id=workflow_id,
                source_node_id=edge_data['from'],
                target_node_id=edge_data['to'],
                animated=edge_data.get('animated', True)
            )
            db.session.add(edge)

    db.session.commit()
    return jsonify({'success': True, 'workflow': workflow.to_dict()})


@app.route('/api/workflow', methods=['POST'])
def create_workflow():
    """Create a new workflow"""
    data = request.json

    # Check if workflow already exists
    if Workflow.query.get(data['id']):
        return jsonify({'error': 'Workflow with this ID already exists'}), 400

    # Create new workflow
    workflow = Workflow(
        id=data['id'],
        name=data['name'],
        parent_id=data.get('parentId')
    )
    db.session.add(workflow)

    # Add nodes if provided
    if 'nodes' in data:
        for node_data in data['nodes']:
            node = Node(
                id=node_data['id'],
                workflow_id=workflow.id,
                type=node_data.get('type', 'default'),
                label=node_data['label'],
                subflow_id=node_data.get('subflowId'),
                position_x=node_data['x'],
                position_y=node_data['y']
            )
            db.session.add(node)

    # Add edges if provided
    if 'edges' in data:
        for edge_data in data['edges']:
            edge = Edge(
                id=edge_data.get('id', f"{workflow.id}-e-{edge_data['from']}-{edge_data['to']}"),
                workflow_id=workflow.id,
                source_node_id=edge_data['from'],
                target_node_id=edge_data['to'],
                animated=edge_data.get('animated', True)
            )
            db.session.add(edge)

    db.session.commit()
    return jsonify({'success': True, 'workflow': workflow.to_dict()}), 201


@app.route('/api/workflow/<workflow_id>', methods=['DELETE'])
def delete_workflow(workflow_id):
    """Delete a workflow"""
    workflow = Workflow.query.get(workflow_id)
    if not workflow:
        return jsonify({'error': 'Workflow not found'}), 404

    db.session.delete(workflow)
    db.session.commit()
    return jsonify({'success': True, 'message': 'Workflow deleted'})

@app.route('/api/workflows/<workflow_id>/run', methods=['POST'])
def run_workflow(workflow_id):
    """Run a workflow"""
    workflow = Workflow.query.get(workflow_id)
    if not workflow:
        return jsonify({'error': 'Workflow not found'}), 404

    # TOSDO: Implement workflow execution logic here
    # In a real implementation, this would trigger the actual workflow execution
    # For now, we'll just return a success message
    return jsonify({'success': True, 'message': 'Workflow execution started'})

@app.route('/api/workflows', methods=['GET'])
def list_workflows():
    """List all available workflows"""
    workflows = Workflow.query.all()
    return jsonify([{'id': w.id, 'name': w.name, 'parentId': w.parent_id} for w in workflows])


@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    try:
        # Test database connection
        db.session.execute('SELECT 1')
        return jsonify({'status': 'healthy', 'database': 'connected'})
    except Exception as e:
        return jsonify({'status': 'unhealthy', 'error': str(e)}), 500


# Base path for pieces directories
PIECES_BASE_PATH = '/pieces'
if not os.path.isdir(PIECES_BASE_PATH):
    # Fallback for local development
    PIECES_BASE_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'pieces')


def get_git_hash(file_path):
    """Compute git hash-object for a file"""
    try:
        result = subprocess.run(
            ['git', 'hash-object', file_path],
            capture_output=True,
            text=True,
            timeout=5
        )
        if result.returncode == 0:
            return result.stdout.strip()
    except (subprocess.TimeoutExpired, FileNotFoundError):
        pass
    return None


@app.route('/api/piece-directories', methods=['GET'])
def list_piece_directories():
    """List available piece directories by scanning the pieces folder"""
    directories = []
    if os.path.isdir(PIECES_BASE_PATH):
        for name in os.listdir(PIECES_BASE_PATH):
            if os.path.isdir(os.path.join(PIECES_BASE_PATH, name)):
                directories.append(name)
    return jsonify(sorted(directories))


@app.route('/api/pieces/<directory>', methods=['GET'])
def list_pieces(directory):
    """List all pieces in a directory by reading metadata.json files"""
    base_path = os.path.join(PIECES_BASE_PATH, directory)

    if not os.path.isdir(base_path):
        return jsonify({'error': f'Directory {directory} not found'}), 404

    pieces = []
    # Find all metadata.json files recursively
    pattern = os.path.join(base_path, '**', 'metadata.json')
    for metadata_path in glob.glob(pattern, recursive=True):
        try:
            with open(metadata_path, 'r') as f:
                metadata = json.load(f)

            # Extract piece info
            style = metadata.get('style', {})
            piece_dir = os.path.dirname(metadata_path)
            category = os.path.basename(os.path.dirname(piece_dir))

            # Compute git hash for the metadata file
            git_hash = get_git_hash(metadata_path)

            pieces.append({
                'name': metadata.get('name', 'Unknown'),
                'description': metadata.get('description', ''),
                'node_label': style.get('node_label', metadata.get('name', 'Unknown')),
                'icon_class_name': style.get('icon_class_name', 'fa-solid:cube'),
                'category': category,
                'tags': metadata.get('tags', []),
                'git_hash': git_hash
            })
        except (json.JSONDecodeError, IOError) as e:
            continue

    return jsonify(pieces)


# ============== Settings API ==============

@app.route('/api/settings', methods=['GET'])
def list_settings():
    """List all settings, optionally filtered by category"""
    category = request.args.get('category')
    if category:
        settings = Setting.query.filter_by(category=category).all()
    else:
        settings = Setting.query.all()
    return jsonify([s.to_dict() for s in settings])


@app.route('/api/settings/<int:setting_id>', methods=['GET'])
def get_setting(setting_id):
    """Get a specific setting by ID"""
    setting = Setting.query.get(setting_id)
    if setting:
        return jsonify(setting.to_dict())
    return jsonify({'error': 'Setting not found'}), 404


@app.route('/api/settings', methods=['POST'])
def create_setting():
    """Create a new setting"""
    data = request.json

    # Validate required fields
    if not data.get('category'):
        return jsonify({'error': 'Category is required'}), 400
    if not data.get('name'):
        return jsonify({'error': 'Name is required'}), 400

    # Check if setting with same category+name exists
    existing = Setting.query.filter_by(
        category=data['category'],
        name=data['name']
    ).first()
    if existing:
        return jsonify({'error': 'Setting with this category and name already exists'}), 400

    setting = Setting(
        category=data['category'],
        name=data['name'],
        description=data.get('description'),
        data=data.get('data')
    )
    db.session.add(setting)
    db.session.commit()

    return jsonify({'success': True, 'setting': setting.to_dict()}), 201


@app.route('/api/settings/<int:setting_id>', methods=['PUT'])
def update_setting(setting_id):
    """Update an existing setting"""
    setting = Setting.query.get(setting_id)
    if not setting:
        return jsonify({'error': 'Setting not found'}), 404

    data = request.json

    if 'name' in data:
        # Check if another setting has this category+name combination
        existing = Setting.query.filter_by(
            category=setting.category,
            name=data['name']
        ).first()
        if existing and existing.id != setting_id:
            return jsonify({'error': 'Setting with this name already exists in this category'}), 400
        setting.name = data['name']

    if 'description' in data:
        setting.description = data['description']

    if 'data' in data:
        setting.data = data['data']

    db.session.commit()
    return jsonify({'success': True, 'setting': setting.to_dict()})


@app.route('/api/settings/<int:setting_id>', methods=['DELETE'])
def delete_setting(setting_id):
    """Delete a setting"""
    setting = Setting.query.get(setting_id)
    if not setting:
        return jsonify({'error': 'Setting not found'}), 404

    db.session.delete(setting)
    db.session.commit()
    return jsonify({'success': True, 'message': 'Setting deleted'})


# ============== Experiments API ==============

@app.route('/api/experiments', methods=['GET'])
def list_experiments():
    """List all experiments"""
    experiments = Experiment.query.all()
    return jsonify([e.to_dict() for e in experiments])


@app.route('/api/experiments/<int:experiment_id>', methods=['GET'])
def get_experiment(experiment_id):
    """Get a specific experiment by ID"""
    experiment = Experiment.query.get(experiment_id)
    if experiment:
        return jsonify(experiment.to_dict())
    return jsonify({'error': 'Experiment not found'}), 404


@app.route('/api/experiments', methods=['POST'])
def create_experiment():
    """Create a new experiment with a default empty workflow"""
    data = request.json

    if not data.get('name'):
        return jsonify({'error': 'Name is required'}), 400

    # Create experiment
    experiment = Experiment(
        name=data['name'],
        description=data.get('description')
    )
    db.session.add(experiment)
    db.session.flush()  # Get the experiment ID

    # Create default empty workflow for this experiment
    workflow_id = f"exp_{experiment.id}_workflow_{uuid.uuid4().hex[:8]}"
    default_workflow = Workflow(
        id=workflow_id,
        name=f"{data['name']} - Default Workflow",
        experiment_id=experiment.id
    )
    db.session.add(default_workflow)

    db.session.commit()
    return jsonify({'success': True, 'experiment': experiment.to_dict()}), 201


@app.route('/api/experiments/<int:experiment_id>', methods=['PUT'])
def update_experiment(experiment_id):
    """Update an existing experiment"""
    experiment = Experiment.query.get(experiment_id)
    if not experiment:
        return jsonify({'error': 'Experiment not found'}), 404

    data = request.json

    if 'name' in data:
        experiment.name = data['name']

    if 'description' in data:
        experiment.description = data['description']

    db.session.commit()
    return jsonify({'success': True, 'experiment': experiment.to_dict()})


@app.route('/api/experiments/<int:experiment_id>', methods=['DELETE'])
def delete_experiment(experiment_id):
    """Delete an experiment and all its workflows"""
    experiment = Experiment.query.get(experiment_id)
    if not experiment:
        return jsonify({'error': 'Experiment not found'}), 404

    db.session.delete(experiment)
    db.session.commit()
    return jsonify({'success': True, 'message': 'Experiment deleted'})


@app.route('/api/experiments/<int:experiment_id>/workflows', methods=['POST'])
def add_workflow_to_experiment(experiment_id):
    """Add a new workflow to an experiment"""
    experiment = Experiment.query.get(experiment_id)
    if not experiment:
        return jsonify({'error': 'Experiment not found'}), 404

    data = request.json
    workflow_id = data.get('id') or f"exp_{experiment_id}_workflow_{uuid.uuid4().hex[:8]}"

    # Check if workflow ID already exists
    if Workflow.query.get(workflow_id):
        return jsonify({'error': 'Workflow with this ID already exists'}), 400

    workflow = Workflow(
        id=workflow_id,
        name=data.get('name', 'New Workflow'),
        experiment_id=experiment_id
    )
    db.session.add(workflow)
    db.session.commit()

    return jsonify({'success': True, 'workflow': workflow.to_dict()}), 201


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
