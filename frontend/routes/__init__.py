"""
Flask Blueprints registration
"""
from . import core, workflows, pieces, settings, experiments, devices

def register_blueprints(app):
    """Register all blueprints with the Flask app"""
    # API routes (all have /api prefix defined in their blueprints)
    app.register_blueprint(workflows.bp)
    app.register_blueprint(pieces.bp)
    app.register_blueprint(settings.bp)
    app.register_blueprint(experiments.bp)
    app.register_blueprint(devices.bp)
