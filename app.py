"""VeriNews AI Python backend entry point (migration scaffold).

The frontend is served from the Vite build output (dist/) while backend APIs
are progressively migrated to Python. This scaffold intentionally does not
change or replace existing frontend modules.
"""
from pathlib import Path
from flask import Flask, jsonify, send_from_directory

ROOT = Path(__file__).resolve().parent
DIST = ROOT / "dist"

app = Flask(__name__, static_folder=str(DIST), static_url_path="")

@app.get("/api/health")
def health():
    return jsonify({"status": "ok", "service": "VeriNews AI Python API"})

@app.get("/")
def index():
    index_path = DIST / "index.html"
    if index_path.exists():
        return send_from_directory(DIST, "index.html")
    return jsonify({
        "status": "backend_ready",
        "note": "Frontend build not found yet. Build the current UI before deployment."
    }), 503

@app.get("/<path:asset_path>")
def static_assets(asset_path: str):
    candidate = DIST / asset_path
    if candidate.exists() and candidate.is_file():
        return send_from_directory(DIST, asset_path)
    # SPA fallback for frontend routes, without intercepting API paths.
    if not asset_path.startswith("api/") and (DIST / "index.html").exists():
        return send_from_directory(DIST, "index.html")
    return jsonify({"error": "Not found"}), 404

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(__import__("os").environ.get("PORT", "5000")))
