import io
import os
import re

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database.db import get_db
from app.models.template import Template
from app.services.pandoc_service import generate_docx, generate_pdf

router = APIRouter(prefix="/generate", tags=["generation"])

TEMPLATES_PATH = os.getenv("TEMPLATES_PATH", "/data/templates")

HTML_TAG_RE = re.compile(r"<[^>]+>")


class GenerateRequest(BaseModel):
    template_id: int
    markdown_content: str
    output_format: str  # "docx" or "pdf"


@router.post("")
async def generate_document(request: GenerateRequest, db: Session = Depends(get_db)):
    if request.output_format not in ("docx", "pdf"):
        raise HTTPException(status_code=400, detail="output_format must be 'docx' or 'pdf'")

    template = db.query(Template).filter(Template.id == request.template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    template_docx = os.path.join(TEMPLATES_PATH, f"{template.id}.docx")
    if not os.path.exists(template_docx):
        raise HTTPException(status_code=404, detail="Template file not found on disk")

    # Sanitize: strip HTML tags from markdown input
    clean_md = HTML_TAG_RE.sub("", request.markdown_content)

    try:
        if request.output_format == "docx":
            content = await generate_docx(clean_md, template_docx)
            media_type = (
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            )
            filename = "document.docx"
        else:
            tex_template = os.path.join(TEMPLATES_PATH, f"{template.id}.tex")
            content = await generate_pdf(
                clean_md, tex_template if os.path.exists(tex_template) else None
            )
            media_type = "application/pdf"
            filename = "document.pdf"
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc))

    return StreamingResponse(
        io.BytesIO(content),
        media_type=media_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
