from flask import Flask, render_template, request, jsonify, send_file
import json
import os
from datetime import datetime
import re

app = Flask(__name__)

RESUMES_DIR = "saved_resumes"
os.makedirs(RESUMES_DIR, exist_ok=True)


class ResumeManager:
    """OOP-based resume management system"""

    def __init__(self):
        self.personal = {}
        self.education = []
        self.skills = []
        self.experience = []
        self.projects = []
        self.certifications = []

    def set_personal(self, data):
        self.personal = data

    def add_education(self, edu):
        self.education.append(edu)

    def add_skill(self, skill):
        if skill not in self.skills:
            self.skills.append(skill)

    def add_experience(self, exp):
        self.experience.append(exp)

    def add_project(self, proj):
        self.projects.append(proj)

    def add_certification(self, cert):
        self.certifications.append(cert)

    def to_dict(self):
        return {
            "personal": self.personal,
            "education": self.education,
            "skills": self.skills,
            "experience": self.experience,
            "projects": self.projects,
            "certifications": self.certifications,
            "generated_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }

    def generate_text_resume(self):
        """Generate formatted text resume"""
        lines = []
        p = self.personal

        # Header
        lines.append("=" * 70)
        lines.append(p.get("name", "").upper().center(70))
        lines.append(f"{p.get('email','')} | {p.get('phone','')} | {p.get('location','')}".center(70))
        if p.get("linkedin"):
            lines.append(p.get("linkedin", "").center(70))
        lines.append("=" * 70)

        # Objective
        if p.get("objective"):
            lines.append("\nOBJECTIVE")
            lines.append("-" * 40)
            lines.append(p["objective"])

        # Education
        if self.education:
            lines.append("\nEDUCATION")
            lines.append("-" * 40)
            for edu in self.education:
                lines.append(f"{edu.get('degree')} - {edu.get('institution')}")
                lines.append(f"  Year: {edu.get('year')} | Grade: {edu.get('grade')}")

        # Skills
        if self.skills:
            lines.append("\nTECHNICAL SKILLS")
            lines.append("-" * 40)
            lines.append(", ".join(self.skills))

        # Experience
        if self.experience:
            lines.append("\nWORK EXPERIENCE")
            lines.append("-" * 40)
            for exp in self.experience:
                lines.append(f"{exp.get('role')} at {exp.get('company')}")
                lines.append(f"  Duration: {exp.get('duration')}")
                lines.append(f"  {exp.get('description')}")

        # Projects
        if self.projects:
            lines.append("\nPROJECTS")
            lines.append("-" * 40)
            for proj in self.projects:
                lines.append(f"• {proj.get('name')}")
                lines.append(f"  Tech: {proj.get('tech')} | {proj.get('description')}")

        # Certifications
        if self.certifications:
            lines.append("\nCERTIFICATIONS")
            lines.append("-" * 40)
            for cert in self.certifications:
                lines.append(f"• {cert.get('name')} — {cert.get('issuer')} ({cert.get('year')})")

        lines.append("\n" + "=" * 70)
        return "\n".join(lines)


resume_manager = ResumeManager()


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/save-personal", methods=["POST"])
def save_personal():
    try:
        data = request.get_json()
        resume_manager.set_personal(data)
        return jsonify({"success": True, "message": "Personal info saved!"})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 400


@app.route("/api/add-education", methods=["POST"])
def add_education():
    try:
        data = request.get_json()
        resume_manager.add_education(data)
        return jsonify({"success": True, "message": "Education added!", "data": resume_manager.education})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 400


@app.route("/api/add-skill", methods=["POST"])
def add_skill():
    try:
        data = request.get_json()
        skill = data.get("skill", "").strip()
        if skill:
            resume_manager.add_skill(skill)
        return jsonify({"success": True, "skills": resume_manager.skills})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 400


@app.route("/api/add-experience", methods=["POST"])
def add_experience():
    try:
        data = request.get_json()
        resume_manager.add_experience(data)
        return jsonify({"success": True, "message": "Experience added!", "data": resume_manager.experience})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 400


@app.route("/api/add-project", methods=["POST"])
def add_project():
    try:
        data = request.get_json()
        resume_manager.add_project(data)
        return jsonify({"success": True, "message": "Project added!", "data": resume_manager.projects})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 400


@app.route("/api/add-certification", methods=["POST"])
def add_certification():
    try:
        data = request.get_json()
        resume_manager.add_certification(data)
        return jsonify({"success": True, "message": "Certification added!", "data": resume_manager.certifications})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 400


@app.route("/api/generate", methods=["POST"])
def generate_resume():
    try:
        resume_data = resume_manager.to_dict()
        text_resume = resume_manager.generate_text_resume()

        # Save JSON
        name = resume_data["personal"].get("name", "resume").replace(" ", "_")
        filename = f"{RESUMES_DIR}/{name}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.txt"
        with open(filename, "w") as f:
            f.write(text_resume)

        return jsonify({
            "success": True,
            "resume": resume_data,
            "text": text_resume,
            "filename": filename
        })
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 400


@app.route("/api/download", methods=["POST"])
def download_resume():
    try:
        text_resume = resume_manager.generate_text_resume()
        name = resume_manager.personal.get("name", "resume").replace(" ", "_")
        filename = f"/tmp/{name}_resume.txt"
        with open(filename, "w") as f:
            f.write(text_resume)
        return send_file(filename, as_attachment=True, download_name=f"{name}_resume.txt")
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 400


@app.route("/api/get-data", methods=["GET"])
def get_data():
    return jsonify(resume_manager.to_dict())


@app.route("/api/reset", methods=["POST"])
def reset():
    global resume_manager
    resume_manager = ResumeManager()
    return jsonify({"success": True, "message": "Resume cleared!"})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=10000)
