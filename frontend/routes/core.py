"""
Core routes: index, static files, health check
"""
from flask import Blueprint, send_from_directory, render_template, jsonify
from models import db

bp = Blueprint('core', __name__)


@bp.route('/')
def index():
    """Serve the main HTML page"""
    return render_template('base.html')


@bp.route('/<path:path>')
def serve_static(path):
    """Serve static files"""
    return send_from_directory('static', path)


@bp.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    try:
        # Test database connection
        db.session.execute('SELECT 1')
        return jsonify({'status': 'healthy', 'database': 'connected'})
    except Exception as e:
        return jsonify({'status': 'unhealthy', 'error': str(e)}), 500
