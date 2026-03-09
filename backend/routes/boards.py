from flask import Blueprint, request, jsonify, current_app
from extensions import db
from models import Board, MediaFile
import json, os, uuid, shutil

boards_bp = Blueprint('boards', __name__)


# ── helpers ──────────────────────────────────────────────────────────────────

def _touch_opened(board):
    """Update last_opened_at without triggering updated_at."""
    from datetime import datetime
    db.session.execute(
        db.text('UPDATE boards SET last_opened_at = :now WHERE id = :id'),
        {'now': datetime.utcnow(), 'id': board.id}
    )
    db.session.commit()


# ── list / create ─────────────────────────────────────────────────────────────

@boards_bp.route('/', methods=['GET'])
def get_boards():
    include_archived = request.args.get('archived', 'false').lower() == 'true'
    q = Board.query
    if not include_archived:
        q = q.filter((Board.archived == False) | (Board.archived == None))
    boards = q.order_by(
        Board.pinned.desc(),
        Board.updated_at.desc()
    ).all()
    return jsonify([b.to_summary() for b in boards])


@boards_bp.route('/', methods=['POST'])
def create_board():
    data = request.get_json()
    if not data or not data.get('name'):
        return jsonify({'error': 'Name is required'}), 400
    board = Board(
        name=data['name'],
        description=data.get('description', ''),
        canvas_state=json.dumps({'nodes': [], 'edges': [], 'viewport': {'x': 0, 'y': 0, 'zoom': 1}})
    )
    db.session.add(board)
    db.session.commit()
    return jsonify(board.to_dict()), 201


# ── single board ──────────────────────────────────────────────────────────────

@boards_bp.route('/<int:board_id>', methods=['GET'])
def get_board(board_id):
    board = Board.query.get_or_404(board_id)
    _touch_opened(board)
    return jsonify(board.to_dict())


@boards_bp.route('/<int:board_id>', methods=['PUT'])
def update_board(board_id):
    board = Board.query.get_or_404(board_id)
    data = request.get_json()
    for field in ('name', 'description', 'priority', 'tags', 'pinned', 'archived', 'cover_image'):
        if field in data:
            val = data[field]
            if field == 'tags' and isinstance(val, list):
                val = json.dumps(val)
            setattr(board, field, val)
    db.session.commit()
    return jsonify(board.to_summary())


@boards_bp.route('/<int:board_id>', methods=['DELETE'])
def delete_board(board_id):
    board = Board.query.get_or_404(board_id)
    db.session.delete(board)
    db.session.commit()
    return jsonify({'ok': True})


# ── canvas save ───────────────────────────────────────────────────────────────

@boards_bp.route('/<int:board_id>/save', methods=['POST'])
def save_canvas(board_id):
    board = Board.query.get_or_404(board_id)
    data = request.get_json()
    if 'canvas_state' not in data:
        return jsonify({'error': 'canvas_state required'}), 400
    board.canvas_state = json.dumps(data['canvas_state'])
    db.session.commit()
    return jsonify({'ok': True, 'updated_at': board.updated_at.isoformat()})


# ── pin / archive / priority ──────────────────────────────────────────────────

@boards_bp.route('/<int:board_id>/pin', methods=['POST'])
def toggle_pin(board_id):
    board = Board.query.get_or_404(board_id)
    board.pinned = not bool(board.pinned)
    db.session.commit()
    return jsonify({'pinned': board.pinned})


@boards_bp.route('/<int:board_id>/archive', methods=['POST'])
def toggle_archive(board_id):
    board = Board.query.get_or_404(board_id)
    board.archived = not bool(board.archived)
    db.session.commit()
    return jsonify({'archived': board.archived})


@boards_bp.route('/<int:board_id>/priority', methods=['POST'])
def set_priority(board_id):
    board = Board.query.get_or_404(board_id)
    data = request.get_json()
    board.priority = data.get('priority', 0)
    db.session.commit()
    return jsonify({'priority': board.priority})


# ── tags ──────────────────────────────────────────────────────────────────────

@boards_bp.route('/<int:board_id>/tags', methods=['POST'])
def set_tags(board_id):
    board = Board.query.get_or_404(board_id)
    data = request.get_json()
    board.tags = json.dumps(data.get('tags', []))
    db.session.commit()
    return jsonify({'tags': data.get('tags', [])})


# ── rename ────────────────────────────────────────────────────────────────────

@boards_bp.route('/<int:board_id>/rename', methods=['POST'])
def rename_board(board_id):
    board = Board.query.get_or_404(board_id)
    data = request.get_json()
    name = data.get('name', '').strip()
    if not name:
        return jsonify({'error': 'Name required'}), 400
    board.name = name
    db.session.commit()
    return jsonify({'name': board.name})


# ── cover image ───────────────────────────────────────────────────────────────

@boards_bp.route('/<int:board_id>/cover', methods=['POST'])
def set_cover(board_id):
    board = Board.query.get_or_404(board_id)

    if 'file' in request.files:
        file = request.files['file']
        ext = file.filename.rsplit('.', 1)[-1].lower() if '.' in file.filename else 'jpg'
        fname = f"cover_{board_id}_{uuid.uuid4().hex[:8]}.{ext}"
        cover_dir = os.path.join(current_app.config['UPLOAD_FOLDER'], 'covers')
        os.makedirs(cover_dir, exist_ok=True)
        file.save(os.path.join(cover_dir, fname))
        board.cover_image = f'/api/media/cover/{fname}'
    elif request.is_json:
        data = request.get_json()
        board.cover_image = data.get('url', '')

    db.session.commit()
    return jsonify({'cover_image': board.cover_image})


# ── duplicate ─────────────────────────────────────────────────────────────────

@boards_bp.route('/<int:board_id>/duplicate', methods=['POST'])
def duplicate_board(board_id):
    src = Board.query.get_or_404(board_id)
    new_board = Board(
        name=f"{src.name} (copy)",
        description=src.description,
        canvas_state=src.canvas_state,
        tags=src.tags,
        priority=src.priority,
    )
    db.session.add(new_board)
    db.session.flush()   # get new id

    # Copy media files
    src_dir = os.path.join(current_app.config['UPLOAD_FOLDER'], str(board_id))
    dst_dir = os.path.join(current_app.config['UPLOAD_FOLDER'], str(new_board.id))
    if os.path.isdir(src_dir):
        shutil.copytree(src_dir, dst_dir)

    # Duplicate MediaFile records
    for mf in src.media_files:
        new_mf = MediaFile(
            board_id=new_board.id,
            filename=mf.filename,
            original_name=mf.original_name,
            file_type=mf.file_type,
            mime_type=mf.mime_type,
            file_path=mf.file_path.replace(str(board_id), str(new_board.id)),
            file_size=mf.file_size,
        )
        db.session.add(new_mf)

    db.session.commit()
    return jsonify(new_board.to_summary()), 201