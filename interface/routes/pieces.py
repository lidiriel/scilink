"""
Pieces routes: piece directories, pieces listing, connections
"""
import os
import json
import glob
from flask import Blueprint, jsonify
from .helpers import PIECES_BASE_PATH, get_git_hash

bp = Blueprint('pieces', __name__, url_prefix='/api')


@bp.route('/piece-directories', methods=['GET'])
def list_piece_directories():
    """List available piece directories by scanning the pieces folder"""
    directories = []
    if os.path.isdir(PIECES_BASE_PATH):
        for name in os.listdir(PIECES_BASE_PATH):
            if os.path.isdir(os.path.join(PIECES_BASE_PATH, name)):
                directories.append(name)
    return jsonify(sorted(directories))


@bp.route('/pieces/<directory>', methods=['GET'])
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
        except (json.JSONDecodeError, IOError):
            continue

    return jsonify(pieces)


@bp.route('/device-pieces/<directory>', methods=['GET'])
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


@bp.route('/connections', methods=['GET'])
def get_connections():
    """Get all connection type definitions from connections.json"""
    connections_path = os.path.join(PIECES_BASE_PATH, 'utils', 'connections.json')
    try:
        with open(connections_path, 'r') as f:
            connections = json.load(f)
        return jsonify(connections)
    except (FileNotFoundError, json.JSONDecodeError):
        return jsonify([])
