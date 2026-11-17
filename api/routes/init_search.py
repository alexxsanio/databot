
from flask import Blueprint, request, jsonify, send_file

from utils.initial_scraper import init_search, save_init_search
from utils.storage import create_dataset_id


init_search_bp = Blueprint("init_search", __name__)


@init_search_bp.route("/init_search", methods=["POST"])
def init_search_route():
    data = request.get_json(silent=True) or {}

    webpages = data.get("webpages")
    selector = data.get("selector")

    if (
        not isinstance(webpages, list)
        or not webpages
        or not all(isinstance(url, str) for url in webpages)
    ):
        return jsonify({
            "error": "webpages must be a nonempty list of URLs"
        }), 400

    if selector is not None and not isinstance(selector, str):
        return jsonify({
            "error": "selector must be a string"
        }), 400

    try:
        entries, suggestions = init_search(
            webpages=webpages,
            selector=selector
        )

        if not entries:
            return jsonify({
                "error": "No entries found",
                "suggested_elements": suggestions
            }), 422

        dataset_id = create_dataset_id()

        csv_path = save_init_search(
            entries=entries,
            dataset_id=dataset_id,
            suggestions=suggestions
        )

        response = send_file(
            csv_path,
            mimetype="text/csv",
            as_attachment=True,
            download_name="initial.csv"
        )

        response.headers["X-Dataset-ID"] = dataset_id
        response.headers["X-Entry-Count"] = str(len(entries))

        return response

    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400

    except Exception:
        return jsonify({
            "error": "Failed to initialize search"
        }), 500
