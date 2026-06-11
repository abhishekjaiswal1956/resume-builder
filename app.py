from flask import Flask, render_template, request, jsonify, send_file, session
from werkzeug.utils import secure_filename
import os, json, base64, uuid
from datetime import datetime
from io import BytesIO

app = Flask(__name__)
app.secret_key = "resumeforge_niet_cse_ai_2024"

UPLOAD_FOLDER = "static/uploads"
ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "webp"}
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs("generated_resumes", exist_ok=True)

def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS

# ── In-memory resume store (per session via global dict) ──────────────────
resume_store = {}

def get_resume(rid):
    return resume_store.get(rid, {
        "personal": {}, "education": [], "skills": [],
        "experience": [], "projects": [], "certifications": [],
        "template": "classic", "photo": None
    })

def save_resume(rid, data):
    resume_store[rid] = data

# ─────────────────────────────────────────────────────────────────────────
@app.route("/")
def index():
    if "rid" not in session:
        session["rid"] = str(uuid.uuid4())
    return render_template("index.html")

@app.route("/api/init", methods=["GET"])
def init():
    if "rid" not in session:
        session["rid"] = str(uuid.uuid4())
    rid = session["rid"]
    return jsonify({"rid": rid, "data": get_resume(rid)})

# ── Save all form data at once ────────────────────────────────────────────
@app.route("/api/save", methods=["POST"])
def save():
    rid = session.get("rid")
    if not rid:
        return jsonify({"success": False, "message": "Session expired"}), 400
    data = request.get_json()
    existing = get_resume(rid)
    existing.update(data)
    save_resume(rid, existing)
    return jsonify({"success": True})

# ── Photo upload ──────────────────────────────────────────────────────────
@app.route("/api/upload-photo", methods=["POST"])
def upload_photo():
    rid = session.get("rid")
    if "photo" not in request.files:
        return jsonify({"success": False, "message": "No file"})
    file = request.files["photo"]
    if file.filename == "" or not allowed_file(file.filename):
        return jsonify({"success": False, "message": "Invalid file type"})
    # Convert to base64 for embedding in PDF
    img_bytes = file.read()
    b64 = base64.b64encode(img_bytes).decode("utf-8")
    ext = file.filename.rsplit(".", 1)[1].lower()
    mime = f"image/{ext}" if ext != "jpg" else "image/jpeg"
    data_uri = f"data:{mime};base64,{b64}"
    existing = get_resume(rid)
    existing["photo"] = data_uri
    save_resume(rid, existing)
    return jsonify({"success": True, "photo": data_uri})

# ── Generate PDF using WeasyPrint ─────────────────────────────────────────
@app.route("/api/generate-pdf", methods=["POST"])
def generate_pdf():
    from weasyprint import HTML, CSS
    rid = session.get("rid")
    data = get_resume(rid)
    body = request.get_json() or {}
    if body:
        data.update(body)
        save_resume(rid, data)

    template_name = data.get("template", "classic")
    html_content = render_template(
        f"resume_{template_name}.html",
        r=data,
        now=datetime.now().strftime("%B %Y")
    )
    pdf_bytes = HTML(string=html_content, base_url=app.static_folder).write_pdf()
    name = data.get("personal", {}).get("name", "resume").replace(" ", "_")
    filename = f"{name}_{template_name}_resume.pdf"
    return send_file(
        BytesIO(pdf_bytes),
        mimetype="application/pdf",
        as_attachment=True,
        download_name=filename
    )

# ── Preview HTML (for live preview in browser) ───────────────────────────
@app.route("/api/preview", methods=["POST"])
def preview():
    rid = session.get("rid")
    data = get_resume(rid)
    body = request.get_json() or {}
    if body:
        data.update(body)
        save_resume(rid, data)
    template_name = data.get("template", "classic")
    html_content = render_template(
        f"resume_{template_name}.html",
        r=data,
        now=datetime.now().strftime("%B %Y")
    )
    return jsonify({"success": True, "html": html_content})

@app.route("/api/reset", methods=["POST"])
def reset():
    rid = session.get("rid")
    if rid and rid in resume_store:
        del resume_store[rid]
    session["rid"] = str(uuid.uuid4())
    return jsonify({"success": True})

if __name__ == "__main__":
    app.run(debug=True, port=5000)
