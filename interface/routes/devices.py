"""
Devices routes
"""
from flask import Blueprint, jsonify, request
from models import db, DeviceInstalled, Node

bp = Blueprint('devices', __name__, url_prefix='/api')


@bp.route('/devices', methods=['GET'])
def list_devices():
    """List all installed devices"""
    devices = DeviceInstalled.query.all()
    return jsonify([d.to_dict() for d in devices])


@bp.route('/devices/<int:device_id>', methods=['GET'])
def get_device(device_id):
    """Get a specific device by ID"""
    device = DeviceInstalled.query.get(device_id)
    if device:
        return jsonify(device.to_dict())
    return jsonify({'error': 'Device not found'}), 404


@bp.route('/devices', methods=['POST'])
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
        data=data.get('data'),
        platform_id=data.get('platform_id')
    )
    db.session.add(device)
    db.session.commit()

    return jsonify({'success': True, 'device': device.to_dict()}), 201


@bp.route('/devices/<int:device_id>', methods=['PUT'])
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
    if 'platform_id' in data:
        device.platform_id = data['platform_id']

    db.session.commit()
    return jsonify({'success': True, 'device': device.to_dict()})


@bp.route('/devices/<int:device_id>', methods=['DELETE'])
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
