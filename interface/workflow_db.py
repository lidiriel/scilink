"""
Flask backend for Hierarchical Workflow Designer with PostgreSQL support
"""
from flask import Flask
from flask_cors import CORS
from config import config
from models import db
from routes import register_blueprints
import os

# Initialize Flask app
app = Flask(__name__, static_folder='static', template_folder='templates')
CORS(app)

# Load configuration
env = os.environ.get('FLASK_ENV', 'development')
app.config.from_object(config[env])

# Initialize database
db.init_app(app)

# Register all blueprints
register_blueprints(app)


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
