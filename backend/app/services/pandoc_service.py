import asyncio
import functools
import os
import shutil
import tempfile

import pypandoc

# ── Shared helper ─────────────────────────────────────────────────────────


def _common_extra_args(options: dict) -> list[str]:
    """Build extra_args shared between DOCX and PDF from a PandocOptions dict."""
    args: list[str] = []

    # ── pandoc-crossref must come before other filters ────────────────────
    if options.get("crossref"):
        if not shutil.which("pandoc-crossref"):
            raise RuntimeError(
                "pandoc-crossref не установлен в контейнере. "
                "Пересоберите образ командой: docker-compose build --no-cache backend"
            )
        args += ["--filter", "pandoc-crossref"]

    if options.get("toc"):
        args.append("--toc")
        args.append(f"--toc-depth={int(options.get('toc_depth', 3))}")

    if options.get("number_sections"):
        args.append("--number-sections")
        offset = (options.get("number_offset") or "").strip()
        if offset:
            args.append(f"--number-offset={offset}")

    top_div = options.get("top_level_division", "default")
    if top_div and top_div != "default":
        args.append(f"--top-level-division={top_div}")

    if options.get("lof"):
        args.append("--lof")

    if options.get("lot"):
        args.append("--lot")

    fig_cap = options.get("figure_caption_position", "below")
    args.append(f"--figure-caption-position={fig_cap}")

    tbl_cap = options.get("table_caption_position", "above")
    args.append(f"--table-caption-position={tbl_cap}")

    hl = options.get("syntax_highlighting", "default")
    if hl == "none":
        args.append("--no-highlight")
    elif hl and hl not in ("default",):
        args.append(f"--highlight-style={hl}")

    # ── Lua filter: auto-scale images to page width ───────────────────────
    if options.get("auto_scale_images"):
        args.append("--lua-filter=/app/filters/image-scale.lua")

    return args


# ── DOCX ──────────────────────────────────────────────────────────────────


async def generate_docx(
    markdown_content: str,
    reference_docx: str,
    options: dict | None = None,
    resource_path: str | None = None,
) -> bytes:
    if options is None:
        options = {}
    fn = functools.partial(
        _generate_docx_sync, markdown_content, reference_docx, options, resource_path
    )
    loop = asyncio.get_event_loop()
    try:
        return await asyncio.wait_for(
            loop.run_in_executor(None, fn),
            timeout=30.0,
        )
    except asyncio.TimeoutError:
        raise RuntimeError("DOCX generation timed out")


def _generate_docx_sync(
    markdown_content: str,
    reference_docx: str,
    options: dict,
    resource_path: str | None,
) -> bytes:
    fd, out_path = tempfile.mkstemp(suffix=".docx")
    os.close(fd)
    try:
        extra_args = [
            f"--reference-doc={reference_docx}",
            "--standalone",
        ] + _common_extra_args(options)

        # Lua filter: apply "Equation" paragraph style to display math (DOCX only)
        if options.get("equation_style"):
            extra_args.append("--lua-filter=/app/filters/equation-style.lua")

        if resource_path and os.path.isdir(resource_path):
            extra_args.append(f"--resource-path=.:{resource_path}")

        pypandoc.convert_text(
            markdown_content,
            "docx",
            format="markdown+lists_without_preceding_blankline+hard_line_breaks",
            outputfile=out_path,
            extra_args=extra_args,
        )
        with open(out_path, "rb") as f:
            return f.read()
    except Exception as e:
        raise RuntimeError(f"DOCX generation failed: {e}") from e
    finally:
        if os.path.exists(out_path):
            os.remove(out_path)


# ── PDF ───────────────────────────────────────────────────────────────────


async def generate_pdf(
    markdown_content: str,
    tex_template: str | None = None,
    options: dict | None = None,
    resource_path: str | None = None,
) -> bytes:
    if options is None:
        options = {}
    fn = functools.partial(
        _generate_pdf_sync, markdown_content, tex_template, options, resource_path
    )
    loop = asyncio.get_event_loop()
    try:
        return await asyncio.wait_for(
            loop.run_in_executor(None, fn),
            timeout=60.0,
        )
    except asyncio.TimeoutError:
        raise RuntimeError("PDF generation timed out")


def _generate_pdf_sync(
    markdown_content: str,
    tex_template: str | None,
    options: dict,
    resource_path: str | None,
) -> bytes:
    fd, out_path = tempfile.mkstemp(suffix=".pdf")
    os.close(fd)
    try:
        extra_args = [
            "--pdf-engine=xelatex",
            "--standalone",
            "-V",
            "lang=ru",
            "-V",
            "mainfont=DejaVu Serif",
            "-V",
            "sansfont=DejaVu Sans",
            "-V",
            "monofont=DejaVu Sans Mono",
            "-V",
            "geometry:margin=2.5cm",
            "-V",
            "colorlinks=true",
            "-V",
            "linkcolor=blue",
        ] + _common_extra_args(options)

        if tex_template and os.path.exists(tex_template):
            extra_args.append(f"--template={tex_template}")

        if resource_path and os.path.isdir(resource_path):
            extra_args.append(f"--resource-path=.:{resource_path}")

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
