from flask import Flask
from flask_cors import CORS
from config import Config
from extensions import db

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    CORS(app, resources={r"/api/*": {"origins": "http://localhost:5173"}})
    db.init_app(app)

    from routes.boards import boards_bp
    from routes.media import media_bp
    app.register_blueprint(boards_bp, url_prefix='/api/boards')
    app.register_blueprint(media_bp, url_prefix='/api/media')

    with app.app_context():
        db.create_all()

    return app

if __name__ == '__main__':
    app = create_app()
    app.run(debug=True, port=5000)