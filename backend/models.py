from extensions import db
from datetime import datetime
import json


class Board(db.Model):
    __tablename__ = 'boards'

    id            = db.Column(db.Integer, primary_key=True)
    name          = db.Column(db.String(255), nullable=False)
    description   = db.Column(db.Text)
    canvas_state  = db.Column(db.Text)
    thumbnail     = db.Column(db.String(1000))
    cover_image   = db.Column(db.String(1000))         # manual cover
    pinned        = db.Column(db.Boolean, default=False)
    archived      = db.Column(db.Boolean, default=False)
    priority      = db.Column(db.Integer, default=0)   # 0=none 1=low 2=med 3=high 4=urgent
    tags          = db.Column(db.Text)                 # JSON array of {label, color}
    last_opened_at = db.Column(db.DateTime)
    created_at    = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at    = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    media_files   = db.relationship('MediaFile', backref='board', lazy=True, cascade='all, delete-orphan')

    def _parse_tags(self):
        try:
            return json.loads(self.tags) if self.tags else []
        except Exception:
            return []

    def to_summary(self):
        return {
            'id':             self.id,
            'name':           self.name,
            'description':    self.description,
            'thumbnail':      self.thumbnail,
            'cover_image':    self.cover_image,
            'pinned':         bool(self.pinned),
            'archived':       bool(self.archived),
            'priority':       self.priority or 0,
            'tags':           self._parse_tags(),
            'last_opened_at': self.last_opened_at.isoformat() if self.last_opened_at else None,
            'created_at':     self.created_at.isoformat() if self.created_at else None,
            'updated_at':     self.updated_at.isoformat() if self.updated_at else None,
        }

    def to_dict(self):
        d = self.to_summary()
        d['canvas_state'] = (
            json.loads(self.canvas_state)
            if self.canvas_state
            else {'nodes': [], 'edges': [], 'viewport': {'x': 0, 'y': 0, 'zoom': 1}}
        )
        return d


class MediaFile(db.Model):
    __tablename__ = 'media_files'

    id            = db.Column(db.Integer, primary_key=True)
    board_id      = db.Column(db.Integer, db.ForeignKey('boards.id'), nullable=False)
    filename      = db.Column(db.String(500))
    original_name = db.Column(db.String(500))
    file_type     = db.Column(db.String(50))
    mime_type     = db.Column(db.String(100))
    file_path     = db.Column(db.String(1000))
    file_size     = db.Column(db.Integer)
    created_at    = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id':            self.id,
            'board_id':      self.board_id,
            'filename':      self.filename,
            'original_name': self.original_name,
            'file_type':     self.file_type,
            'mime_type':     self.mime_type,
            'url':           f'/api/media/{self.board_id}/file/{self.filename}',
            'file_size':     self.file_size,
            'created_at':    self.created_at.isoformat() if self.created_at else None,
        }