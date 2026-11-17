
from flask import Blueprint, request, jsonify, send_file

import pandas as pd

from utils.attribute_search import scrape_attr
from utils.storage import (
    get_dataset_dir,
    load_initial_csv,
    load_json,
    save_json
)


search_bp = Blueprint("search", __name__)


@search_bp.route("/search", methods=["POST"])
def search_route():
    data = request.get_json(silent=True) or {}

    dataset_id = data.get("dataset_id")
    attributes = data.get("attributes")

    if not dataset_id:
        return jsonify({
            "error": "dataset_id is required"
        }), 400

    if (
        not isinstance(attributes, list)
        or not attributes
        or not all(
            isinstance(attr, str)
            for attr in attributes
        )
    ):
        return jsonify({
            "error": "attributes must be a nonempty list of strings"
        }), 400

    attributes = list(dict.fromkeys(attributes))

    try:
        dataset_dir = get_dataset_dir(dataset_id)

        metadata_path = dataset_dir / "metadata.json"
        metadata = load_json(metadata_path)

        available_attributes = metadata.get(
            "available_attributes", []
        )

        if not available_attributes:
            return jsonify({
                "error": "Run /expand_search first"
            }), 409

        invalid_attributes = [
            attr for attr in attributes
            if attr not in available_attributes
        ]

        if invalid_attributes:
            return jsonify({
                "error": "Some attributes are not available",
                "invalid_attributes": invalid_attributes,
                "available_attributes": available_attributes
            }), 400

        df = load_initial_csv(dataset_id)

        if df.empty:
            return jsonify({
                "error": "Initial CSV is empty"
            }), 400

        enriched_entries = []

        for entry in df.to_dict(orient="records"):
            result = scrape_attr(
                entry=entry,
                attributes=attributes
            )

            enriched_entries.append(result)

        enriched_df = pd.DataFrame(enriched_entries)

        csv_path = dataset_dir / "enriched.csv"

        enriched_df.to_csv(
            csv_path,
            index=False
        )

        metadata["selected_attributes"] = attributes
        metadata["enriched_count"] = len(enriched_entries)

        save_json(metadata_path, metadata)

        response = send_file(
            csv_path,
            mimetype="text/csv",
            as_attachment=True,
            download_name="enriched.csv"
        )

        response.headers["X-Dataset-ID"] = dataset_id
        response.headers["X-Enriched-Count"] = str(
            len(enriched_entries)
        )

        return response

    except (ValueError, TypeError) as exc:
        return jsonify({"error": str(exc)}), 400

    except FileNotFoundError:
        return jsonify({
            "error": "Dataset not found"
        }), 404

    except Exception:
        return jsonify({
            "error": "Failed to complete search"
        }), 500
