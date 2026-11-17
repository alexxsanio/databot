
from .init_search import init_search_bp
from .expand_search import expand_search_bp
from .search import search_bp


def register_routes(app):
    app.register_blueprint(init_search_bp)
    app.register_blueprint(expand_search_bp)
    app.register_blueprint(search_bp)
