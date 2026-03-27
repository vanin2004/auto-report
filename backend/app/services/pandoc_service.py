import asyncio
import os
import tempfile

import pypandoc


async def generate_docx(markdown_content: str, reference_docx: str) -> bytes:
    loop = asyncio.get_event_loop()
    try:
        return await asyncio.wait_for(
            loop.run_in_executor(None, _generate_docx_sync, markdown_content, reference_docx),
            timeout=30.0,
        )
    except asyncio.TimeoutError:
        raise RuntimeError("DOCX generation timed out")


def _generate_docx_sync(markdown_content: str, reference_docx: str) -> bytes:
    fd, out_path = tempfile.mkstemp(suffix=".docx")
    os.close(fd)
    try:
        pypandoc.convert_text(
            markdown_content,
            "docx",
            format="markdown+lists_without_preceding_blankline+hard_line_breaks",
            outputfile=out_path,
            extra_args=[
                f"--reference-doc={reference_docx}",
                "--standalone",
            ],
        )
        with open(out_path, "rb") as f:
            return f.read()
    except Exception as e:
        raise RuntimeError(f"DOCX generation failed: {e}") from e
    finally:
        if os.path.exists(out_path):
            os.remove(out_path)


async def generate_pdf(markdown_content: str, tex_template: str | None = None) -> bytes:
    loop = asyncio.get_event_loop()
    try:
        return await asyncio.wait_for(
            loop.run_in_executor(None, _generate_pdf_sync, markdown_content, tex_template),
            timeout=60.0,
        )
    except asyncio.TimeoutError:
        raise RuntimeError("PDF generation timed out")


def _generate_pdf_sync(markdown_content: str, tex_template: str | None = None) -> bytes:
    fd, out_path = tempfile.mkstemp(suffix=".pdf")
    os.close(fd)
    try:
        extra_args = [
            "--pdf-engine=xelatex",
            "--standalone",
            "-V", "lang=ru",
            "-V", "mainfont=DejaVu Serif",
            "-V", "sansfont=DejaVu Sans",
            "-V", "monofont=DejaVu Sans Mono",
            "-V", "geometry:margin=2.5cm",
            "-V", "colorlinks=true",
            "-V", "linkcolor=blue",
        ]
        if tex_template and os.path.exists(tex_template):
            extra_args.append(f"--template={tex_template}")

        pypandoc.convert_text(
            markdown_content,
            "pdf",
            format="markdown+lists_without_preceding_blankline+hard_line_breaks",
            outputfile=out_path,
            extra_args=extra_args,
        )
        with open(out_path, "rb") as f:
            return f.read()
    except Exception as e:
        raise RuntimeError(f"PDF generation failed: {e}") from e
    finally:
        if os.path.exists(out_path):
            os.remove(out_path)
