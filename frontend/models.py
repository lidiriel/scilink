"""
SQLAlchemy models for Hierarchical Workflow Designer
"""
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()

class Experiment(db.Model):
    """Experiment model representing a collection of workflows"""
    __tablename__ = 'experiments'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    name = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    workflows = db.relationship('Workflow', back_populates='experiment', cascade='all, delete-orphan', lazy='dynamic')

    def to_dict(self):
        """Convert experiment to dictionary format"""
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'workflows': [{'id': w.id, 'name': w.name} for w in self.workflows],
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

    def __repr__(self):
        return f'<Experiment {self.id}: {self.name}>'


class Workflow(db.Model):
    """Workflow model representing a workflow or sub-workflow"""
    __tablename__ = 'workflows'

    id = db.Column(db.String(100), primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    parent_id = db.Column(db.String(100), db.ForeignKey('workflows.id', ondelete='CASCADE'), nullable=True)
    experiment_id = db.Column(db.Integer, db.ForeignKey('experiments.id', ondelete='CASCADE'), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    nodes = db.relationship('Node', back_populates='workflow', cascade='all, delete-orphan', lazy='dynamic', foreign_keys='Node.workflow_id')
    edges = db.relationship('Edge', back_populates='workflow', cascade='all, delete-orphan', lazy='dynamic')
    parent = db.relationship('Workflow', remote_side=[id], backref='children')
    experiment = db.relationship('Experiment', back_populates='workflows')

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
    device_id = db.Column(db.Integer, db.ForeignKey('devices_installed.id', ondelete='RESTRICT'), nullable=True)
    block_id = db.Column(db.Integer, db.ForeignKey('blocks_used.id', ondelete='SET NULL'), nullable=True)
    position_x = db.Column(db.Integer, nullable=False)
    position_y = db.Column(db.Integer, nullable=False)
    data = db.Column(db.JSON, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    workflow = db.relationship('Workflow', back_populates='nodes', foreign_keys=[workflow_id])
    subflow = db.relationship('Workflow', foreign_keys=[subflow_id])
    device = db.relationship('DeviceInstalled', foreign_keys=[device_id])
    block = db.relationship('BlockUsed', foreign_keys=[block_id])

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
        if self.device_id:
            node_dict['deviceId'] = self.device_id
            # Load device info - use explicit query if relationship not loaded
            device = self.device or DeviceInstalled.query.get(self.device_id)
            if device:
                node_dict['deviceMode'] = device.mode
                node_dict['pieceName'] = device.piece_name
                node_dict['iconClass'] = device.icon_class
        if self.block_id:
            node_dict['blockId'] = self.block_id
            # Load block info - use explicit query if relationship not loaded
            block = self.block or BlockUsed.query.get(self.block_id)
            if block:
                node_dict['pieceName'] = block.piece_name
                node_dict['pieceDirectory'] = block.piece_directory
                node_dict['pieceHash'] = block.piece_hash
                node_dict['iconClass'] = block.icon_class
        if self.data:
            node_dict['data'] = self.data
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


class Setting(db.Model):
    """Setting model for storing application settings as key-value pairs with JSON data"""
    __tablename__ = 'settings'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    category = db.Column(db.String(50), nullable=False)  # e.g., 'platform', 'general', etc.
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text, nullable=True)
    data = db.Column(db.JSON, nullable=True)  # Flexible JSON field for additional data
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Unique constraint on category + name
    __table_args__ = (
        db.UniqueConstraint('category', 'name', name='uq_settings_category_name'),
    )

    def to_dict(self):
        """Convert setting to dictionary format"""
        return {
            'id': self.id,
            'category': self.category,
            'name': self.name,
            'description': self.description,
            'data': self.data,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

    def __repr__(self):
        return f'<Setting {self.id}: {self.category}/{self.name}>'


class DeviceInstalled(db.Model):
    """Device installed on the platform"""
    __tablename__ = 'devices_installed'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    piece_name = db.Column(db.String(255), nullable=False)  # Original piece name
    piece_directory = db.Column(db.String(255), nullable=False)  # Directory the piece came from
    piece_hash = db.Column(db.String(64), nullable=True)  # Git hash for version tracking
    label = db.Column(db.String(255), nullable=False)  # Custom label for this instance
    device_type = db.Column(db.String(100), nullable=False)  # e.g., 'sensor', 'actuator', 'controller'
    icon_class = db.Column(db.String(100), nullable=True)  # Icon class from piece
    description = db.Column(db.Text, nullable=True)
    connection_string = db.Column(db.String(500), nullable=True)  # Connection info (IP, serial, etc.)
    mode = db.Column(db.String(50), default='deactivate')  # 'activate', 'deactivate', 'simulate'
    data = db.Column(db.JSON, nullable=True)  # Flexible JSON field for device-specific config
    depends_on_id = db.Column(db.Integer, db.ForeignKey('devices_installed.id', ondelete='SET NULL'), nullable=True)
    platform_id = db.Column(db.Integer, db.ForeignKey('settings.id', ondelete='SET NULL'), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Self-referential relationship
    depends_on = db.relationship('DeviceInstalled', remote_side=[id], backref='dependents', foreign_keys=[depends_on_id])
    # Platform relationship
    platform = db.relationship('Setting', foreign_keys=[platform_id])

    def to_dict(self):
        """Convert device to dictionary format"""
        return {
            'id': self.id,
            'piece_name': self.piece_name,
            'piece_directory': self.piece_directory,
            'piece_hash': self.piece_hash,
            'label': self.label,
            'device_type': self.device_type,
            'icon_class': self.icon_class,
            'description': self.description,
            'connection_string': self.connection_string,
            'mode': self.mode,
            'data': self.data,
            'depends_on_id': self.depends_on_id,
            'platform_id': self.platform_id,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

    def __repr__(self):
        return f'<DeviceInstalled {self.id}: {self.label} ({self.piece_name})>'


class BlockUsed(db.Model):
    """Tracks blocks/pieces used in workflows for version control and auditing"""
    __tablename__ = 'blocks_used'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    workflow_id = db.Column(db.String(100), db.ForeignKey('workflows.id', ondelete='CASCADE'), nullable=False)
    piece_name = db.Column(db.String(255), nullable=False)
    piece_directory = db.Column(db.String(255), nullable=False)
    piece_hash = db.Column(db.String(64), nullable=True)
    icon_class = db.Column(db.String(100), nullable=True)
    config = db.Column(db.JSON, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    workflow = db.relationship('Workflow', backref=db.backref('blocks_used', cascade='all, delete-orphan', lazy='dynamic'))

    def to_dict(self):
        """Convert block_used to dictionary format"""
        return {
            'id': self.id,
            'workflow_id': self.workflow_id,
            'piece_name': self.piece_name,
            'piece_directory': self.piece_directory,
            'piece_hash': self.piece_hash,
            'icon_class': self.icon_class,
            'config': self.config,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

    def __repr__(self):
        return f'<BlockUsed {self.id}: {self.piece_name} in Workflow {self.workflow_id}>'
