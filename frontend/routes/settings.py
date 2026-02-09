"""
Settings and Buses routes
"""
from flask import Blueprint, jsonify, request
from models import db, Setting, DeviceInstalled

bp = Blueprint('settings', __name__, url_prefix='/api')


# ============== Buses API ==============

@bp.route('/buses', methods=['GET'])
def list_buses():
    """List all buses (settings with category='bus')"""
    connection_type = request.args.get('connection_type')
    buses = Setting.query.filter_by(category='bus').all()
    if connection_type:
        buses = [b for b in buses if b.data and b.data.get('connection_type') == connection_type]
    return jsonify([b.to_dict() for b in buses])


@bp.route('/buses/<int:bus_id>/devices', methods=['GET'])
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

@bp.route('/settings', methods=['GET'])
def list_settings():
    """List all settings, optionally filtered by category"""
    category = request.args.get('category')
    if category:
        settings = Setting.query.filter_by(category=category).all()
    else:
        settings = Setting.query.all()
    return jsonify([s.to_dict() for s in settings])


@bp.route('/settings/<int:setting_id>', methods=['GET'])
def get_setting(setting_id):
    """Get a specific setting by ID"""
    setting = Setting.query.get(setting_id)
    if setting:
        return jsonify(setting.to_dict())
    return jsonify({'error': 'Setting not found'}), 404


@bp.route('/settings', methods=['POST'])
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


@bp.route('/settings/<int:setting_id>', methods=['PUT'])
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


@bp.route('/settings/<int:setting_id>', methods=['DELETE'])
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
