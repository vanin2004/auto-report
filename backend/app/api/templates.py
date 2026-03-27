import os

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.database.db import get_db
from app.models.template import Template
from app.services.template_service import save_template_content, delete_template_files

router = APIRouter(prefix="/templates", tags=["templates"])

TEMPLATES_PATH = os.getenv("TEMPLATES_PATH", "/data/templates")
MAX_FILE_SIZE = 20 * 1024 * 1024  # 20 MB


@router.get("")
def list_templates(db: Session = Depends(get_db)):
    templates = db.query(Template).order_by(Template.created_at.desc()).all()
    return [
        {
            "id": t.id,
            "name": t.name,
            "description": t.description,
            "created_at": t.created_at.isoformat() if t.created_at else None,
        }
        for t in templates
    ]


@router.post("", status_code=201)
async def upload_template(
    name: str = Form(...),
    description: str = Form(""),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    if not file.filename.lower().endswith(".docx"):
        raise HTTPException(status_code=400, detail="Only DOCX files are allowed")

    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File size exceeds 20 MB")

    existing = db.query(Template).filter(Template.name == name).first()
    if existing:
        raise HTTPException(status_code=409, detail="Template with this name already exists")

    template = Template(name=name, description=description, filename=file.filename)
    db.add(template)
    try:
        db.commit()
        db.refresh(template)
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Template with this name already exists")

    await save_template_content(template.id, content)
    return {"id": template.id, "name": template.name}


@router.delete("/{template_id}", status_code=204)
def delete_template(template_id: int, db: Session = Depends(get_db)):
    template = db.query(Template).filter(Template.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    delete_template_files(template_id)
    db.delete(template)
    db.commit()


@router.get("/{template_id}/download")
def download_template(template_id: int, db: Session = Depends(get_db)):
    template = db.query(Template).filter(Template.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    file_path = os.path.join(TEMPLATES_PATH, f"{template_id}.docx")
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Template file not found")

    return FileResponse(
        file_path,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        filename=template.filename,
    )
