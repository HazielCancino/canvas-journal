from flask import Flask
from flask_cors import CORS
from config import Config
from extensions import db

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    CORS(app, resources={r"/api/*": {"origins": "*"}})
    db.init_app(app)

    from routes.boards import boards_bp
    from routes.media  import media_bp
    from routes.meta   import meta_bp
    app.register_blueprint(boards_bp, url_prefix='/api/boards')
    app.register_blueprint(media_bp,  url_prefix='/api/media')
    app.register_blueprint(meta_bp)

    with app.app_context():
        db.create_all()
        # Ensure upload directories exist
        os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
        os.makedirs(os.path.join(app.config['UPLOAD_FOLDER'], 'covers'), exist_ok=True)

    return app

if __name__ == '__main__':
    app = create_app()
    app.run(host='0.0.0.0', port=5000, debug=False)