from flask import Blueprint, request, jsonify, send_file, current_app
from extensions import db
from models import MediaFile
import os, uuid, mimetypes

media_bp = Blueprint('media', __name__)

ALLOWED_EXTENSIONS = {
    'image': {'png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'},
    'video': {'mp4', 'webm', 'mov', 'avi'},
    'pdf':   {'pdf'},
    'file':  {'pdf', 'txt', 'md', 'zip', 'doc', 'docx'},
}

def get_file_type(filename):
    ext = filename.rsplit('.', 1)[-1].lower() if '.' in filename else ''
    for ftype, exts in ALLOWED_EXTENSIONS.items():
        if ext in exts:
            return ftype
    return 'file'

def ensure_upload_dir(board_id):
    path = os.path.join(current_app.config['UPLOAD_FOLDER'], str(board_id))
    os.makedirs(path, exist_ok=True)
    return path


@media_bp.route('/upload/<int:board_id>', methods=['POST'])
def upload_file(board_id):
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
    file = request.files['file']
    if not file.filename:
        return jsonify({'error': 'Empty filename'}), 400

    original_name = file.filename
    ext = original_name.rsplit('.', 1)[-1].lower() if '.' in original_name else ''
    unique_name = f"{uuid.uuid4().hex}.{ext}"
    file_type   = get_file_type(original_name)
    mime_type   = mimetypes.guess_type(original_name)[0] or 'application/octet-stream'

    upload_dir = ensure_upload_dir(board_id)
    save_path  = os.path.join(upload_dir, unique_name)
    file.save(save_path)
    file_size  = os.path.getsize(save_path)

    media = MediaFile(
        board_id=board_id, filename=unique_name,
        original_name=original_name, file_type=file_type,
        mime_type=mime_type, file_path=save_path, file_size=file_size,
    )
    db.session.add(media)
    db.session.commit()
    return jsonify(media.to_dict()), 201


@media_bp.route('/file/<filename>', methods=['GET'])
def serve_file(filename):
    upload_root = current_app.config['UPLOAD_FOLDER']
    for board_dir in os.listdir(upload_root):
        candidate = os.path.join(upload_root, board_dir, filename)
        if os.path.isfile(candidate):
            return send_file(candidate)
    return jsonify({'error': 'File not found'}), 404


@media_bp.route('/cover/<filename>', methods=['GET'])
def serve_cover(filename):
    cover_dir = os.path.join(current_app.config['UPLOAD_FOLDER'], 'covers', filename)
    if os.path.isfile(cover_dir):
        return send_file(cover_dir)
    return jsonify({'error': 'Cover not found'}), 404


@media_bp.route('/board/<int:board_id>', methods=['GET'])
def list_board_media(board_id):
    files = MediaFile.query.filter_by(board_id=board_id).order_by(MediaFile.created_at.desc()).all()
    return jsonify([f.to_dict() for f in files])


@media_bp.route('/<int:media_id>', methods=['DELETE'])
def delete_file(media_id):
    media = MediaFile.query.get_or_404(media_id)
    if os.path.isfile(media.file_path):
        os.remove(media.file_path)
    db.session.delete(media)
    db.session.commit()
    return jsonify({'ok': True})