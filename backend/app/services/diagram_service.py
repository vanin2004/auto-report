"""Pre-processing service: render Mermaid / PlantUML fenced code blocks to
PNG images via the local Kroki rendering service, then replace the blocks
with Markdown image references before the document is passed to Pandoc.

Supported fence types  (case-insensitive):
    ```mermaid  …  ```
    ```plantuml …  ```

Kroki endpoint (configurable via KROKI_URL env var, default http://kroki:8000):
    POST /<diagram-type>/png   with diagram source as text/plain body.
"""

import asyncio
import hashlib
import json
import logging
import os
import re

import httpx

log = logging.getLogger(__name__)

KROKI_URL = os.getenv("KROKI_URL", "http://kroki:8000")

# Matches a fenced diagram block and an optional caption line that follows it.
#
# Structure captured:
#   ```<type>          ← group 1: "mermaid" or "plantuml"
#   <source>           ← group 2: diagram source code
#   ```
#                      ← optional blank line
#   : Caption text {attrs}   ← group 3: caption text (optional)
#                             group 4: raw attrs inside {…} e.g. "#fig:id width=90%" (optional)
#
# The caption line is consumed so that it doesn't appear as stray text in the
# output after we replace the block with a proper Markdown image reference.
_FENCE_RE = re.compile(
    r"^```[ \t]*(mermaid|plantuml)[ \t]*\n"          # opening fence
    r"(.*?)"                                           # diagram source
    r"^```[ \t]*\n"                                   # closing fence (consumes \n)
    r"(?:\n?: ([^\n{]+?)(?:[ \t]*\{([^}]*)\})?[ \t]*\n)?",  # optional `: Caption {attrs}`
    re.DOTALL | re.MULTILINE | re.IGNORECASE,
)


async def _render_png(lang: str, code: str) -> bytes | None:
    """POST *code* to Kroki and return the PNG bytes, or None on failure."""
    url = f"{KROKI_URL}/{lang.lower()}/png"
    payload = code.encode("utf-8")
    log.info("[diagram] → POST %s  (%d bytes)", url, len(payload))
    log.debug("[diagram] payload preview: %r", code[:300])
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                url,
                content=payload,
                headers={"Content-Type": "text/plain; charset=utf-8"},
            )
            log.info("[diagram] ← %s %s  (%d bytes)", resp.status_code, url, len(resp.content))
            if not resp.is_success:
                # Log full response body so we can see the Kroki error message
                try:
                    body = resp.text[:1000]
                except Exception:
                    body = "<unreadable>"
                log.error(
                    "[diagram] Kroki error for %s: HTTP %s\nResponse body: %s",
                    lang, resp.status_code, body,
                )
                return None
            return resp.content
    except httpx.ConnectError as exc:
        log.error("[diagram] Cannot connect to Kroki at %s: %s", url, exc)
        return None
    except httpx.TimeoutException as exc:
        log.error("[diagram] Timeout waiting for Kroki at %s: %s", url, exc)
        return None
    except Exception as exc:  # noqa: BLE001
        log.error("[diagram] Unexpected error calling Kroki at %s: %s", url, exc, exc_info=True)
        return None


async def preprocess_diagrams(markdown: str, work_dir: str) -> str:
    """Replace Mermaid / PlantUML fenced blocks with rendered PNG image refs.

    Each rendered PNG is saved as *work_dir*/_diagrams/<type>_<hash>.png
    and referenced in the returned Markdown as::

        ![](_diagrams/<type>_<hash>.png)

    If Kroki is unreachable the original fence block is kept and preceded by
    a warning blockquote so that Pandoc still generates the document.
    """
    # Normalise line endings so the regex works regardless of CRLF/LF input.
    markdown = markdown.replace("\r\n", "\n").replace("\r", "\n")

    matches = list(_FENCE_RE.finditer(markdown))
    print(f"[diagram] found {len(matches)} diagram block(s)", flush=True)
    log.info("[diagram] found %d diagram block(s) in document", len(matches))
    for i, m in enumerate(matches):
        print(
            f"[diagram] block {i}: type={m.group(1)!r}  source_len={len(m.group(2))}"
            f"  caption={m.group(3)!r}  attrs={m.group(4)!r}",
            flush=True,
        )
        log.info(
            "[diagram] block %d: type=%r, source_len=%d, caption=%r, attrs=%r",
            i, m.group(1), len(m.group(2)), m.group(3), m.group(4),
        )

    if not matches:
        return markdown

    diagrams_dir = os.path.join(work_dir, "_diagrams")
    os.makedirs(diagrams_dir, exist_ok=True)
    log.info("[diagram] diagrams output dir: %s", diagrams_dir)

    # Render all found diagrams concurrently.
    png_results: list[bytes | None] = await asyncio.gather(
        *[_render_png(m.group(1), m.group(2).strip()) for m in matches]
    )

    # Replace matches from back to front to preserve string offsets.
    result = markdown
    manifest: dict[str, str] = {}  # filename → caption
    for i, (match, png) in enumerate(zip(reversed(matches), reversed(png_results))):
        if png is None:
            log.warning("[diagram] block %d (%s) render failed — keeping original fence", i, match.group(1))
            replacement = (
                "> ⚠️ Не удалось отрендерить диаграмму"
                f" `{match.group(1)}` — Kroki недоступен.\n\n"
                + match.group(0)
            )
        else:
            digest = hashlib.md5(png).hexdigest()[:12]
            filename = f"{match.group(1).lower()}_{digest}.png"
            out_path = os.path.join(diagrams_dir, filename)
            with open(out_path, "wb") as fh:
                fh.write(png)

            # Build a proper Pandoc figure reference.
            # caption → alt text  (non-empty alt = Pandoc figure, not inline image)
            # attrs   → attribute block {#fig:id width=…}
            caption = (match.group(3) or "").strip()
            attrs = (match.group(4) or "").strip()
            img = f"![{caption}](_diagrams/{filename})"
            if attrs:
                img += f"{{{attrs}}}"
            # Wrap in blank lines so Pandoc treats it as a standalone figure
            # paragraph — required for pandoc-crossref to assign a label.
            replacement = f"\n\n{img}\n\n"

            log.info(
                "[diagram] block %d (%s) → saved %s (%d bytes), caption=%r, attrs=%r",
                i, match.group(1), filename, len(png), caption, attrs,
            )
            manifest[filename] = caption

        result = result[: match.start()] + replacement + result[match.end() :]
        print(f"[diagram] block {i} replacement:\n{replacement}\n{'─'*60}", flush=True)

    if manifest:
        index_path = os.path.join(diagrams_dir, "index.json")
        with open(index_path, "w", encoding="utf-8") as fh:
            json.dump(manifest, fh, ensure_ascii=False, indent=2)
        log.info("[diagram] wrote manifest: %s (%d entries)", index_path, len(manifest))

    return result

