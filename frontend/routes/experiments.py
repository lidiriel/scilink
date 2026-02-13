"""
Experiments routes
"""
import uuid
from flask import Blueprint, jsonify, request
from models import db, Experiment, Workflow

bp = Blueprint('experiments', __name__, url_prefix='/api')


@bp.route('/experiments', methods=['GET'])
def list_experiments():
    """List all experiments"""
    experiments = Experiment.query.all()
    return jsonify([e.to_dict() for e in experiments])


@bp.route('/experiments/<int:experiment_id>', methods=['GET'])
def get_experiment(experiment_id):
    """Get a specific experiment by ID"""
    experiment = Experiment.query.get(experiment_id)
    if experiment:
        return jsonify(experiment.to_dict())
    return jsonify({'error': 'Experiment not found'}), 404


@bp.route('/experiments', methods=['POST'])
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


@bp.route('/experiments/<int:experiment_id>', methods=['PUT'])
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


@bp.route('/experiments/<int:experiment_id>', methods=['DELETE'])
def delete_experiment(experiment_id):
    """Delete an experiment and all its workflows"""
    experiment = Experiment.query.get(experiment_id)
    if not experiment:
        return jsonify({'error': 'Experiment not found'}), 404

    db.session.delete(experiment)
    db.session.commit()
    return jsonify({'success': True, 'message': 'Experiment deleted'})


@bp.route('/experiments/<int:experiment_id>/workflows', methods=['POST'])
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
