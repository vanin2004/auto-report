import os

import aiofiles
from fastapi import UploadFile

TEMPLATES_PATH = os.getenv("TEMPLATES_PATH", "/data/templates")


async def save_template_content(template_id: int, content: bytes) -> None:
    os.makedirs(TEMPLATES_PATH, exist_ok=True)
    dest = os.path.join(TEMPLATES_PATH, f"{template_id}.docx")
    async with aiofiles.open(dest, "wb") as f:
        await f.write(content)


def delete_template_files(template_id: int) -> None:
    for ext in (".docx", ".tex"):
        path = os.path.join(TEMPLATES_PATH, f"{template_id}{ext}")
        if os.path.exists(path):
            os.remove(path)
