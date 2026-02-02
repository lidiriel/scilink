"""
Flask backend for Hierarchical Workflow Designer with PostgreSQL support
"""
from flask import Flask, jsonify, request, send_from_directory, render_template
from flask_cors import CORS
from config import config
from models import db, Experiment, Workflow, Node, Edge, Setting, DeviceInstalled, BlockUsed
import uuid
import os
import json
import glob
import subprocess

# Initialize Flask app
app = Flask(__name__, static_folder='static', template_folder='templates')
CORS(app)

# Load configuration
env = os.environ.get('FLASK_ENV', 'development')
app.config.from_object(config[env])

# Initialize database
db.init_app(app)


@app.route('/')
def index():
    """Serve the main HTML page"""
    return render_template('base.html')


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
        # Remove existing nodes first (they reference blocks_used)
        Node.query.filter_by(workflow_id=workflow_id).delete()
        # Remove existing blocks_used entries for this workflow
        BlockUsed.query.filter_by(workflow_id=workflow_id).delete()

        # Add new nodes
        for node_data in data['nodes']:
            node_type = node_data.get('type', 'default')
            block_id = None

            # Create block_used first for block nodes (default type with piece info)
            if node_type == 'default' and node_data.get('pieceName'):
                block_used = BlockUsed(
                    workflow_id=workflow_id,
                    piece_name=node_data.get('pieceName'),
                    piece_directory=node_data.get('pieceDirectory', ''),
                    piece_hash=node_data.get('pieceHash'),
                    icon_class=node_data.get('iconClass')
                )
                db.session.add(block_used)
                db.session.flush()  # Get the block_id
                block_id = block_used.id

            node = Node(
                id=node_data['id'],
                workflow_id=workflow_id,
                type=node_type,
                label=node_data['label'],
                subflow_id=node_data.get('subflowId'),
                device_id=node_data.get('deviceId'),
                block_id=block_id,
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
            node_type = node_data.get('type', 'default')
            block_id = None

            # Create block_used first for block nodes (default type with piece info)
            if node_type == 'default' and node_data.get('pieceName'):
                block_used = BlockUsed(
                    workflow_id=workflow.id,
                    piece_name=node_data.get('pieceName'),
                    piece_directory=node_data.get('pieceDirectory', ''),
                    piece_hash=node_data.get('pieceHash'),
                    icon_class=node_data.get('iconClass')
                )
                db.session.add(block_used)
                db.session.flush()  # Get the block_id
                block_id = block_used.id

            node = Node(
                id=node_data['id'],
                workflow_id=workflow.id,
                type=node_type,
                label=node_data['label'],
                subflow_id=node_data.get('subflowId'),
                device_id=node_data.get('deviceId'),
                block_id=block_id,
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
    """List block pieces in a directory (excludes device pieces)"""
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

            # Skip device pieces (only return blocks)
            if metadata.get('piece_type') == 'device':
                continue

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


@app.route('/api/device-pieces/<directory>', methods=['GET'])
def list_device_pieces(directory):
    """List only device pieces (piece_type='device') in a directory"""
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

            # Only include pieces with piece_type='device'
            if metadata.get('piece_type') != 'device':
                continue

            # Extract piece info
            style = metadata.get('style', {})
            piece_dir = os.path.dirname(metadata_path)
            category = os.path.basename(os.path.dirname(piece_dir))

            # Compute git hash for the metadata file
            git_hash = get_git_hash(metadata_path)

            # Get device_settings (support both 'device_settings' and 'settings' keys)
            device_settings = metadata.get('device_settings') or metadata.get('settings')

            pieces.append({
                'name': metadata.get('name', 'Unknown'),
                'description': metadata.get('description', ''),
                'node_label': style.get('node_label', metadata.get('name', 'Unknown')),
                'icon_class_name': style.get('icon_class_name', 'fa-solid:cube'),
                'category': category,
                'tags': metadata.get('tags', []),
                'git_hash': git_hash,
                'directory': directory,
                'device_settings': device_settings,
                'user_settings': metadata.get('user_settings')
            })
        except (json.JSONDecodeError, IOError):
            continue

    return jsonify(pieces)


@app.route('/api/connections', methods=['GET'])
def get_connections():
    """Get all connection type definitions from connections.json"""
    connections_path = os.path.join(PIECES_BASE_PATH, 'utils', 'connections.json')
    try:
        with open(connections_path, 'r') as f:
            connections = json.load(f)
        return jsonify(connections)
    except (FileNotFoundError, json.JSONDecodeError):
        return jsonify([])


@app.route('/api/buses', methods=['GET'])
def list_buses():
    """List all buses (settings with category='bus')"""
    connection_type = request.args.get('connection_type')
    buses = Setting.query.filter_by(category='bus').all()
    if connection_type:
        buses = [b for b in buses if b.data and b.data.get('connection_type') == connection_type]
    return jsonify([b.to_dict() for b in buses])


@app.route('/api/buses/<int:bus_id>/devices', methods=['GET'])
def get_bus_devices(bus_id):
    """Get all devices connected to a specific bus"""
    bus = Setting.query.get(bus_id)
    if not bus or bus.category != 'bus':
        return jsonify({'error': 'Bus not found'}), 404

    # Find devices that reference this bus by name
    devices = DeviceInstalled.query.all()
    connected = [d.to_dict() for d in devices if d.data and d.data.get('bus_name') == bus.name]
    return jsonify(connected)


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

    # Check if this is a bus with connected devices
    if setting.category == 'bus':
        devices = DeviceInstalled.query.all()
        connected = [d for d in devices if d.data and d.data.get('bus_name') == setting.name]
        if connected:
            device_labels = ', '.join([d.label for d in connected[:3]])
            if len(connected) > 3:
                device_labels += f', and {len(connected) - 3} more'
            return jsonify({
                'error': f'Cannot delete bus: {len(connected)} device(s) are connected ({device_labels})'
            }), 409

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


# ============== Devices API ==============

@app.route('/api/devices', methods=['GET'])
def list_devices():
    """List all installed devices"""
    devices = DeviceInstalled.query.all()
    return jsonify([d.to_dict() for d in devices])


@app.route('/api/devices/<int:device_id>', methods=['GET'])
def get_device(device_id):
    """Get a specific device by ID"""
    device = DeviceInstalled.query.get(device_id)
    if device:
        return jsonify(device.to_dict())
    return jsonify({'error': 'Device not found'}), 404


@app.route('/api/devices', methods=['POST'])
def create_device():
    """Create a new device"""
    data = request.json

    if not data.get('piece_name'):
        return jsonify({'error': 'Piece name is required'}), 400
    if not data.get('piece_directory'):
        return jsonify({'error': 'Piece directory is required'}), 400
    if not data.get('label'):
        return jsonify({'error': 'Label is required'}), 400
    if not data.get('device_type'):
        return jsonify({'error': 'Device type is required'}), 400

    device = DeviceInstalled(
        piece_name=data['piece_name'],
        piece_directory=data['piece_directory'],
        piece_hash=data.get('piece_hash'),
        label=data['label'],
        device_type=data['device_type'],
        icon_class=data.get('icon_class'),
        description=data.get('description'),
        connection_string=data.get('connection_string'),
        mode=data.get('mode', 'deactivate'),
        data=data.get('data')
    )
    db.session.add(device)
    db.session.commit()

    return jsonify({'success': True, 'device': device.to_dict()}), 201


@app.route('/api/devices/<int:device_id>', methods=['PUT'])
def update_device(device_id):
    """Update an existing device"""
    device = DeviceInstalled.query.get(device_id)
    if not device:
        return jsonify({'error': 'Device not found'}), 404

    data = request.json

    if 'label' in data:
        device.label = data['label']
    if 'device_type' in data:
        device.device_type = data['device_type']
    if 'description' in data:
        device.description = data['description']
    if 'connection_string' in data:
        device.connection_string = data['connection_string']
    if 'mode' in data:
        device.mode = data['mode']
    if 'data' in data:
        device.data = data['data']

    db.session.commit()
    return jsonify({'success': True, 'device': device.to_dict()})


@app.route('/api/devices/<int:device_id>', methods=['DELETE'])
def delete_device(device_id):
    """Delete a device"""
    device = DeviceInstalled.query.get(device_id)
    if not device:
        return jsonify({'error': 'Device not found'}), 404

    # Check if the device is used in any workflow
    nodes_using_device = Node.query.filter_by(device_id=device_id).all()
    if nodes_using_device:
        workflow_names = set()
        for node in nodes_using_device:
            if node.workflow:
                workflow_names.add(node.workflow.name)
        workflows_list = ', '.join(sorted(workflow_names)) if workflow_names else 'unknown workflows'
        return jsonify({
            'error': f'Cannot delete device: it is used in {len(nodes_using_device)} node(s) in workflow(s): {workflows_list}'
        }), 409

    db.session.delete(device)
    db.session.commit()
    return jsonify({'success': True, 'message': 'Device deleted'})


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
