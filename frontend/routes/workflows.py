"""
Workflow routes: CRUD operations for workflows
"""
from flask import Blueprint, jsonify, request
from models import db, Workflow, Node, Edge, BlockUsed, Subflow

bp = Blueprint('workflows', __name__, url_prefix='/api')


@bp.route('/workflow/<workflow_id>', methods=['GET'])
def get_workflow(workflow_id):
    """Get a specific workflow by ID"""
    workflow = Workflow.query.get(workflow_id)
    if workflow:
        return jsonify(workflow.to_dict())
    return jsonify({'error': 'Workflow not found'}), 404


@bp.route('/workflow/<workflow_id>', methods=['PUT'])
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
                position_y=node_data['y'],
                data=node_data.get('data')
            )
            db.session.add(node)

    # Update edges if provided
    if 'edges' in data:
        # Remove existing edges
        Edge.query.filter_by(workflow_id=workflow_id).delete()

        # Add new edges (always scope edge ID with workflow_id for uniqueness across workflows)
        for edge_data in data['edges']:
            edge = Edge(
                id=f"{workflow_id}-e-{edge_data['from']}-{edge_data['to']}",
                workflow_id=workflow_id,
                source_node_id=edge_data['from'],
                target_node_id=edge_data['to'],
                source_handle=edge_data.get('sourceHandle'),
                target_handle=edge_data.get('targetHandle'),
                animated=edge_data.get('animated', True)
            )
            db.session.add(edge)

    # Manage Subflow records for nodes with workflowRef
    if 'nodes' in data:
        referenced_workflow_ids = set()
        ancestors = get_ancestor_ids(workflow_id)
        for node_data in data['nodes']:
            workflow_ref = (node_data.get('data') or {}).get('workflowRef')
            if not workflow_ref:
                continue
            referenced_workflow_ids.add(workflow_ref)

            # Cycle check
            if workflow_ref == workflow_id:
                return jsonify({'error': 'Cannot add a workflow as sub-workflow of itself'}), 400
            if workflow_ref in ancestors:
                ref_wf = Workflow.query.get(workflow_ref)
                name = ref_wf.name if ref_wf else workflow_ref
                return jsonify({'error': f'Cannot add workflow "{name}" as sub-workflow: it would create a cycle'}), 400

            # Find or create Subflow record
            sf = Subflow.query.filter_by(workflow_id=workflow_ref, parent_id=workflow_id).first()
            if not sf:
                sf = Subflow(workflow_id=workflow_ref, parent_id=workflow_id)
                db.session.add(sf)
                db.session.flush()

            # Set subflow_id on the node
            node = Node.query.get((node_data['id'], workflow_id))
            if node:
                node.subflow_id = sf.id

        # Remove orphaned Subflow records for this parent
        for sf in Subflow.query.filter_by(parent_id=workflow_id).all():
            if sf.workflow_id not in referenced_workflow_ids:
                db.session.delete(sf)

    db.session.commit()
    return jsonify({'success': True, 'workflow': workflow.to_dict()})


@bp.route('/workflow', methods=['POST'])
def create_workflow():
    """Create a new workflow"""
    data = request.json

    # Check if workflow already exists
    if Workflow.query.get(data['id']):
        return jsonify({'error': 'Workflow with this ID already exists'}), 400

    # Create new workflow
    workflow = Workflow(
        id=data['id'],
        name=data['name']
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
                position_y=node_data['y'],
                data=node_data.get('data')
            )
            db.session.add(node)

    # Add edges if provided (always scope edge ID with workflow_id for uniqueness across workflows)
    if 'edges' in data:
        for edge_data in data['edges']:
            edge = Edge(
                id=f"{workflow.id}-e-{edge_data['from']}-{edge_data['to']}",
                workflow_id=workflow.id,
                source_node_id=edge_data['from'],
                target_node_id=edge_data['to'],
                source_handle=edge_data.get('sourceHandle'),
                target_handle=edge_data.get('targetHandle'),
                animated=edge_data.get('animated', True)
            )
            db.session.add(edge)

    db.session.commit()
    return jsonify({'success': True, 'workflow': workflow.to_dict()}), 201


@bp.route('/workflow/<workflow_id>/nodes/<node_id>', methods=['PUT'])
def update_node(workflow_id, node_id):
    """Update a single node's data"""
    node = Node.query.get((node_id, workflow_id))
    if not node:
        return jsonify({'error': 'Node not found'}), 404

    req = request.json
    if 'data' in req:
        node.data = req['data']

    db.session.commit()
    return jsonify({'success': True, 'node': node.to_dict()})


@bp.route('/workflow/<workflow_id>', methods=['DELETE'])
def delete_workflow(workflow_id):
    """Delete a workflow"""
    workflow = Workflow.query.get(workflow_id)
    if not workflow:
        return jsonify({'error': 'Workflow not found'}), 404

    db.session.delete(workflow)
    db.session.commit()
    return jsonify({'success': True, 'message': 'Workflow deleted'})


@bp.route('/workflows/<workflow_id>/run', methods=['POST'])
def run_workflow(workflow_id):
    """Run a workflow"""
    workflow = Workflow.query.get(workflow_id)
    if not workflow:
        return jsonify({'error': 'Workflow not found'}), 404

    # TODO: Implement workflow execution logic here
    # In a real implementation, this would trigger the actual workflow execution
    # For now, we'll just return a success message
    return jsonify({'success': True, 'message': 'Workflow execution started'})


@bp.route('/workflows', methods=['GET'])
def list_workflows():
    """List all available workflows"""
    workflows = Workflow.query.all()
    return jsonify([{'id': w.id, 'name': w.name} for w in workflows])

def get_ancestor_ids(workflow_id):
    """BFS up through the subflows table to find all ancestor workflow IDs."""
    ancestors = set()
    queue = [workflow_id]
    while queue:
        wf_id = queue.pop()
        for sf in Subflow.query.filter_by(workflow_id=wf_id).all():
            if sf.parent_id not in ancestors:
                ancestors.add(sf.parent_id)
                queue.append(sf.parent_id)
    return ancestors
