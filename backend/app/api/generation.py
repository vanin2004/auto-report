import io
import json
import logging
import os
import re
import shutil
import tempfile
import zipfile
from typing import List

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.database.db import get_db
from app.models.template import Template
from app.services.diagram_service import preprocess_diagrams
from app.services.pandoc_service import generate_docx, generate_pdf

log = logging.getLogger(__name__)

router = APIRouter(prefix="/generate", tags=["generation"])

TEMPLATES_PATH = os.getenv("TEMPLATES_PATH", "/data/templates")
ALLOWED_IMAGE_EXTS = {
    ".png",
    ".jpg",
    ".jpeg",
    ".gif",
    ".svg",
    ".webp",
    ".bmp",
    ".tiff",
    ".tif",
}

HTML_TAG_RE = re.compile(r"<[^>]+>")


@router.post("")
async def generate_document(
    template_id: int = Form(...),
    markdown_content: str = Form(...),
    output_format: str = Form(...),
    options: str = Form("{}"),
    include_diagrams: bool = Form(False),
    images: List[UploadFile] = File(default=[]),
    listings: List[UploadFile] = File(default=[]),
    db: Session = Depends(get_db),
):
    if output_format not in ("docx", "pdf"):
        raise HTTPException(
            status_code=400, detail="output_format must be 'docx' or 'pdf'"
        )

    template = db.query(Template).filter(Template.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    template_docx = os.path.join(TEMPLATES_PATH, f"{template.id}.docx")
    if not os.path.exists(template_docx):
        raise HTTPException(status_code=404, detail="Template file not found on disk")

    # Parse pandoc options
    try:
        opts = json.loads(options) if options.strip() else {}
    except json.JSONDecodeError:
        opts = {}

    # Sanitize: strip HTML tags from markdown input
    clean_md = HTML_TAG_RE.sub("", markdown_content)

    # Append listings (Приложение (Листинг)) if any files provided
    if listings:
        # Map common extensions to code block languages
        ext_lang = {
            ".py": "python",
            ".js": "javascript",
            ".ts": "typescript",
            ".java": "java",
            ".c": "c",
            ".cpp": "cpp",
            ".h": "c",
            ".hpp": "cpp",
            ".go": "go",
            ".rs": "rust",
            ".sh": "bash",
            ".ps1": "powershell",
            ".css": "css",
            ".html": "html",
            ".md": "markdown",
            ".json": "json",
            ".yaml": "yaml",
            ".yml": "yaml",
            ".sql": "sql",
            ".txt": "",
        }

        parts: list[str] = [clean_md.rstrip()]
        # Start appendix on a new page and use H1
        parts.extend(
            [
                "",
                '<div style="page-break-before: always;"></div>',
                "",
                # Mark the appendix heading unnumbered and unlisted so it is
                # excluded from automatic numbering/TOC when those options are enabled
                "# Приложение (Листинг) {.unnumbered .unlisted}",
                "",
            ]
        )

        for lf in listings:
            if not lf.filename:
                continue
            # Preserve relative path (folders) but sanitise against traversal
            rel = lf.filename.replace("\\", "/")
            segs = [p for p in rel.split("/") if p and p != ".."]
            if not segs:
                continue
            display_name = "/".join(segs)
            try:
                data = await lf.read()
                text = data.decode("utf-8", errors="replace")
            except Exception:
                text = ""
            lang = ext_lang.get(os.path.splitext(display_name)[1].lower(), "")

            # Start each file listing on a new page, use H2 with full relative path
            parts.extend(
                [
                    "",
                    '<div style="page-break-before: always;"></div>',
                    "",
                    # Mark listing sections unnumbered and unlisted so they are
                    # excluded from automatic numbering/TOC when those options are enabled
                    f"### {display_name} {{.unnumbered .unlisted}}",
                    "",
                ]
            )
            if lang:
                parts.append(f"```{lang}")
            else:
                parts.append("```")
            parts.append(text.rstrip("\n"))
            parts.append("```")
            parts.append("")

        clean_md = "\n".join(parts)

    log.info(
        "[generate] request: template_id=%d format=%s md_len=%d images_count=%d include_diagrams=%s opts=%s",
        template_id,
        output_format,
        len(markdown_content),
        len(images),
        include_diagrams,
        opts,
    )

    # Save uploaded images to a temp directory
    tmp_dir = tempfile.mkdtemp(prefix="docgen_imgs_")
    log.info("[generate] tmp_dir: %s", tmp_dir)
    filename: str | None = None
    content: bytes | None = None
    media_type: str | None = None
    try:
        for img in images:
            if not img.filename:
                log.warning("[generate] skipped upload: empty filename")
                continue
            ext = os.path.splitext(img.filename)[1].lower()
            if ext not in ALLOWED_IMAGE_EXTS:
                log.warning(
                    "[generate] skipped upload %r: unsupported extension %r",
                    img.filename,
                    ext,
                )
                continue
            # Preserve relative path but sanitise against directory traversal
            rel = img.filename.replace("\\", "/")
            parts = [p for p in rel.split("/") if p and p != ".."]
            if not parts:
                log.warning(
                    "[generate] skipped upload %r: empty parts after sanitise",
                    img.filename,
                )
                continue
            dest = os.path.join(tmp_dir, *parts)
            real_dest = os.path.realpath(dest)
            if not real_dest.startswith(os.path.realpath(tmp_dir)):
                log.warning(
                    "[generate] skipped upload %r: path traversal attempt", img.filename
                )
                continue  # Traversal attempt — skip
            os.makedirs(os.path.dirname(dest), exist_ok=True)
            data = await img.read()
            with open(dest, "wb") as f:
                f.write(data)
            log.info(
                "[generate] saved image: %r → %s (%d bytes)",
                img.filename,
                dest,
                len(data),
            )

        # Render embedded Mermaid / PlantUML diagrams → PNG before Pandoc
        clean_md = await preprocess_diagrams(clean_md, tmp_dir)

        try:
            if output_format == "docx":
                log.info("[generate] calling pandoc → docx, resource_path=%s", tmp_dir)
                content = await generate_docx(clean_md, template_docx, opts, tmp_dir)
                log.info("[generate] docx ready: %d bytes", len(content))
                media_type = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                filename = "document.docx"
            else:
                tex_template = os.path.join(TEMPLATES_PATH, f"{template.id}.tex")
                log.info("[generate] calling pandoc → pdf, resource_path=%s", tmp_dir)
                content = await generate_pdf(
                    clean_md,
                    tex_template if os.path.exists(tex_template) else None,
                    opts,
                    tmp_dir,
                )
                log.info("[generate] pdf ready: %d bytes", len(content))
                media_type = "application/pdf"
                filename = "document.pdf"
        except RuntimeError as exc:
            raise HTTPException(status_code=500, detail=str(exc))
    finally:
        diagrams_dir = os.path.join(tmp_dir, "_diagrams")
        has_diagrams = os.path.isdir(diagrams_dir) and bool(os.listdir(diagrams_dir))
        if (
            include_diagrams
            and has_diagrams
            and filename is not None
            and content is not None
        ):
            zip_buf = io.BytesIO()
            with zipfile.ZipFile(zip_buf, "w", zipfile.ZIP_DEFLATED) as zf:
                zf.writestr(filename, content)
                for img_name in sorted(os.listdir(diagrams_dir)):
                    zf.write(
                        os.path.join(diagrams_dir, img_name), f"diagrams/{img_name}"
                    )
            zip_buf.seek(0)
            shutil.rmtree(tmp_dir, ignore_errors=True)
            return StreamingResponse(
                zip_buf,
                media_type="application/zip",
                headers={"Content-Disposition": 'attachment; filename="document.zip"'},
            )
        shutil.rmtree(tmp_dir, ignore_errors=True)

    if filename is not None and content is not None and media_type is not None:
        return StreamingResponse(
            io.BytesIO(content),
            media_type=media_type,
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )
    raise HTTPException(status_code=500, detail="Failed to generate document")
