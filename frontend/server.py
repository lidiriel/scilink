from flask import Flask, send_from_directory
from flask_cors import CORS
from config import config
from models import db
from routes import register_blueprints
from flask import Blueprint, send_from_directory, render_template, jsonify
from models import db

import os

app = Flask(__name__, static_folder='dist', static_url_path='', template_folder='dist/templates')
CORS(app)

bp = Blueprint('core', __name__)

@bp.route('/')
def index():
    return send_from_directory(app.static_folder, 'index.html')

@bp.route('/<path:path>')
def static_files(path):
    file_path = os.path.join(app.static_folder, path)
    if os.path.isfile(file_path):
        return send_from_directory(app.static_folder, path)
    return send_from_directory(app.static_folder, 'index.html')

@bp.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    try:
        # Test database connection
        db.session.execute('SELECT 1')
        return jsonify({'status': 'healthy', 'database': 'connected'})
    except Exception as e:
        return jsonify({'status': 'unhealthy', 'error': str(e)}), 500



# Load configuration
env = os.environ.get('FLASK_ENV', 'development')
app.config.from_object(config[env])

# Initialize database
db.init_app(app)

# Register all blueprints
register_blueprints(app)


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=True)
