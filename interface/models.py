"""
SQLAlchemy models for Hierarchical Workflow Designer
"""
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()

class Workflow(db.Model):
    """Workflow model representing a workflow or sub-workflow"""
    __tablename__ = 'workflows'

    id = db.Column(db.String(100), primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    parent_id = db.Column(db.String(100), db.ForeignKey('workflows.id', ondelete='CASCADE'), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    nodes = db.relationship('Node', back_populates='workflow', cascade='all, delete-orphan', lazy='dynamic')
    edges = db.relationship('Edge', back_populates='workflow', cascade='all, delete-orphan', lazy='dynamic')
    parent = db.relationship('Workflow', remote_side=[id], backref='children')

    def to_dict(self):
        """Convert workflow to dictionary format"""
        return {
            'id': self.id,
            'name': self.name,
            'parentId': self.parent_id,
            'nodes': [node.to_dict() for node in self.nodes],
            'edges': [edge.to_dict() for edge in self.edges],
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

    def __repr__(self):
        return f'<Workflow {self.id}: {self.name}>'


class Node(db.Model):
    """Node model representing a process or step in a workflow"""
    __tablename__ = 'nodes'

    id = db.Column(db.String(100), primary_key=True)
    workflow_id = db.Column(db.String(100), db.ForeignKey('workflows.id', ondelete='CASCADE'), primary_key=True)
    type = db.Column(db.String(50), nullable=False, default='default')
    label = db.Column(db.String(255), nullable=False)
    subflow_id = db.Column(db.String(100), db.ForeignKey('workflows.id', ondelete='SET NULL'), nullable=True)
    position_x = db.Column(db.Integer, nullable=False)
    position_y = db.Column(db.Integer, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    workflow = db.relationship('Workflow', back_populates='nodes', foreign_keys=[workflow_id])
    subflow = db.relationship('Workflow', foreign_keys=[subflow_id])

    def to_dict(self):
        """Convert node to dictionary format"""
        node_dict = {
            'id': self.id,
            'type': self.type,
            'label': self.label,
            'x': self.position_x,
            'y': self.position_y
        }
        if self.subflow_id:
            node_dict['subflowId'] = self.subflow_id
        return node_dict

    def __repr__(self):
        return f'<Node {self.id} in Workflow {self.workflow_id}>'


class Edge(db.Model):
    """Edge model representing a connection between two nodes"""
    __tablename__ = 'edges'

    id = db.Column(db.String(100), primary_key=True)
    workflow_id = db.Column(db.String(100), db.ForeignKey('workflows.id', ondelete='CASCADE'), nullable=False)
    source_node_id = db.Column(db.String(100), nullable=False)
    target_node_id = db.Column(db.String(100), nullable=False)
    animated = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    workflow = db.relationship('Workflow', back_populates='edges')

    def to_dict(self):
        """Convert edge to dictionary format"""
        return {
            'from': self.source_node_id,
            'to': self.target_node_id,
            'animated': self.animated
        }

    def __repr__(self):
        return f'<Edge {self.id}: {self.source_node_id} -> {self.target_node_id}>'
