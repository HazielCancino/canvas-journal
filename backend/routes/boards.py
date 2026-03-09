from flask import Blueprint, request, jsonify
from extensions import db
from models import Board
import json

boards_bp = Blueprint('boards', __name__)


@boards_bp.route('/', methods=['GET'])
def get_boards():
    boards = Board.query.order_by(Board.updated_at.desc()).all()
    return jsonify([b.to_summary() for b in boards])


@boards_bp.route('/<int:board_id>', methods=['GET'])
def get_board(board_id):
    board = Board.query.get_or_404(board_id)
    return jsonify(board.to_dict())


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


@boards_bp.route('/<int:board_id>', methods=['PUT'])
def update_board(board_id):
    board = Board.query.get_or_404(board_id)
    data = request.get_json()

    if 'name' in data:
        board.name = data['name']
    if 'description' in data:
        board.description = data['description']
    if 'canvas_state' in data:
        board.canvas_state = json.dumps(data['canvas_state'])

    db.session.commit()
    return jsonify(board.to_dict())


@boards_bp.route('/<int:board_id>/save', methods=['POST'])
def save_canvas(board_id):
    board = Board.query.get_or_404(board_id)
    data = request.get_json()

    if 'canvas_state' not in data:
        return jsonify({'error': 'canvas_state required'}), 400

    board.canvas_state = json.dumps(data['canvas_state'])
    db.session.commit()
    return jsonify({'ok': True, 'updated_at': board.updated_at.isoformat()})


@boards_bp.route('/<int:board_id>', methods=['DELETE'])
def delete_board(board_id):
    board = Board.query.get_or_404(board_id)
    db.session.delete(board)
    db.session.commit()
    return jsonify({'ok': True})