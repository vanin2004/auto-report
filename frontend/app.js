"use strict";

const API = "/api";

/* ═══════════════════════════════════════════════════════════════════════════
   Navigation (SPA)
═══════════════════════════════════════════════════════════════════════════ */

document.querySelectorAll(".nav-btn").forEach((btn) => {
  btn.addEventListener("click", () => switchSection(btn.dataset.section));
});

function switchSection(name) {
  document.querySelectorAll(".nav-btn").forEach((b) =>
    b.classList.toggle("active", b.dataset.section === name)
  );
  document.querySelectorAll(".page-section").forEach((s) =>
    s.classList.toggle("active", s.id === `section-${name}`)
  );

  if (name === "templates") loadTemplates();
  if (name === "generate")  loadTemplatesIntoSelect();
}

/* ═══════════════════════════════════════════════════════════════════════════
   TEMPLATES SECTION
═══════════════════════════════════════════════════════════════════════════ */

const uploadCard       = document.getElementById("upload-card");
const btnOpenUpload    = document.getElementById("btn-open-upload");
const btnCancelUpload  = document.getElementById("btn-cancel-upload");
const formUpload       = document.getElementById("form-upload");
const uploadError      = document.getElementById("upload-error");
const templatesLoading = document.getElementById("templates-loading");
const templatesEmpty   = document.getElementById("templates-empty");
const templatesContainer = document.getElementById("templates-container");

btnOpenUpload.addEventListener("click", () => {
  uploadCard.classList.remove("hidden");
  btnOpenUpload.classList.add("hidden");
  document.getElementById("template-name").focus();
});

btnCancelUpload.addEventListener("click", resetUploadForm);

function resetUploadForm() {
  formUpload.reset();
  uploadCard.classList.add("hidden");
  btnOpenUpload.classList.remove("hidden");
  uploadError.classList.add("hidden");
}

/* Pre-fill name from filename */
document.getElementById("template-file").addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const nameInput = document.getElementById("template-name");
  if (!nameInput.value.trim()) {
    nameInput.value = file.name.replace(/\.docx$/i, "");
  }
});

formUpload.addEventListener("submit", async (e) => {
  e.preventDefault();
  uploadError.classList.add("hidden");

  const name        = document.getElementById("template-name").value.trim();
  const description = document.getElementById("template-description").value.trim();
  const file        = document.getElementById("template-file").files[0];

  if (!name || !file) return;

  const submitBtn = document.getElementById("btn-upload-submit");
  submitBtn.disabled = true;
  submitBtn.textContent = "Загрузка…";

  const body = new FormData();
  body.append("name", name);
  body.append("description", description);
  body.append("file", file);

  try {
    const resp = await fetch(`${API}/templates`, { method: "POST", body });
    if (!resp.ok) {
      const data = await resp.json().catch(() => ({}));
      throw new Error(data.detail || `Ошибка ${resp.status}`);
    }
    resetUploadForm();
    await loadTemplates();
  } catch (err) {
    showError(uploadError, err.message);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Загрузить";
  }
});

async function loadTemplates() {
  templatesLoading.classList.remove("hidden");
  templatesEmpty.classList.add("hidden");
  templatesContainer.innerHTML = "";

  try {
    const resp = await fetch(`${API}/templates`);
    if (!resp.ok) throw new Error("Ошибка загрузки списка шаблонов");
    const templates = await resp.json();
    renderTemplates(templates);
  } catch (err) {
    templatesContainer.innerHTML = `<div class="alert alert-error">${esc(err.message)}</div>`;
  } finally {
    templatesLoading.classList.add("hidden");
  }
}

function renderTemplates(templates) {
  if (templates.length === 0) {
    templatesEmpty.classList.remove("hidden");
    return;
  }
  templatesContainer.innerHTML = templates
    .map(
      (t) => `
    <div class="template-card" data-id="${t.id}">
      <div class="template-info">
        <h3 title="${esc(t.name)}">${esc(t.name)}</h3>
        <p class="template-desc">${esc(t.description || "—")}</p>
        <p class="template-date">Загружен: ${formatDate(t.created_at)}</p>
      </div>
      <div class="template-actions">
        <button class="btn btn-primary btn-sm"
          onclick="goToGenerate(${t.id})">Generate</button>
        <button class="btn btn-outline-secondary btn-sm"
          onclick="downloadTemplate(${t.id})">Download</button>
        <button class="btn btn-danger btn-sm"
          onclick="deleteTemplate(${t.id}, ${JSON.stringify(t.name)})">Delete</button>
      </div>
    </div>`
    )
    .join("");
}

async function deleteTemplate(id, name) {
  if (!confirm(`Удалить шаблон «${name}»?`)) return;
  try {
    const resp = await fetch(`${API}/templates/${id}`, { method: "DELETE" });
    if (!resp.ok) throw new Error("Ошибка удаления");
    await loadTemplates();
  } catch (err) {
    alert(err.message);
  }
}

function downloadTemplate(id) {
  window.open(`${API}/templates/${id}/download`, "_blank");
}

function goToGenerate(templateId) {
  switchSection("generate");
  // wait for select to be populated
  setTimeout(() => {
    const sel = document.getElementById("gen-template");
    if (sel) sel.value = String(templateId);
  }, 150);
}

/* ═══════════════════════════════════════════════════════════════════════════
   GENERATION SECTION
═══════════════════════════════════════════════════════════════════════════ */

const formGenerate   = document.getElementById("form-generate");
const genTemplate    = document.getElementById("gen-template");
const genMarkdown    = document.getElementById("gen-markdown");
const generateError  = document.getElementById("generate-error");
const generateResult = document.getElementById("generate-result");
const btnGenerate    = document.getElementById("btn-generate");
const btnLabel       = btnGenerate.querySelector(".btn-label");
const spinner        = btnGenerate.querySelector(".spinner");

async function loadTemplatesIntoSelect() {
  const current = genTemplate.value;
  genTemplate.innerHTML = '<option value="">— Выберите шаблон —</option>';
  try {
    const resp = await fetch(`${API}/templates`);
    if (!resp.ok) return;
    const templates = await resp.json();
    templates.forEach((t) => {
      const opt = document.createElement("option");
      opt.value = t.id;
      opt.textContent = t.name;
      genTemplate.appendChild(opt);
    });
    if (current) genTemplate.value = current;
  } catch (_) {
    /* ignore */
  }
}

/* Load .md file into textarea */
document.getElementById("btn-load-md").addEventListener("click", () => {
  document.getElementById("md-file-input").click();
});
document.getElementById("md-file-input").addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    genMarkdown.value = ev.target.result;
    e.target.value = "";          // reset so same file can be reloaded
  };
  reader.readAsText(file, "utf-8");
});

formGenerate.addEventListener("submit", async (e) => {
  e.preventDefault();
  generateError.classList.add("hidden");
  generateResult.classList.add("hidden");

  const templateId   = genTemplate.value;
  const markdown     = genMarkdown.value.trim();
  const outputFormat = document.querySelector('input[name="output-format"]:checked').value;

  if (!templateId || !markdown) {
    showError(generateError, "Выберите шаблон и введите Markdown-содержимое.");
    return;
  }

  setGenerating(true);

  try {
    const resp = await fetch(`${API}/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        template_id: Number(templateId),
        markdown_content: markdown,
        output_format: outputFormat,
      }),
    });

    if (!resp.ok) {
      const data = await resp.json().catch(() => ({}));
      throw new Error(data.detail || `Ошибка ${resp.status}`);
    }

    const blob = await resp.blob();
    const url  = URL.createObjectURL(blob);
    const link = document.getElementById("download-link");
    link.href     = url;
    link.download = `document.${outputFormat}`;
    generateResult.classList.remove("hidden");

    // Auto-trigger download
    link.click();
  } catch (err) {
    showError(generateError, err.message);
  } finally {
    setGenerating(false);
  }
});

function setGenerating(active) {
  btnGenerate.disabled = active;
  btnLabel.textContent = active ? "Генерация…" : "Генерировать";
  spinner.classList.toggle("hidden", !active);
}

/* ═══════════════════════════════════════════════════════════════════════════
   Helpers
═══════════════════════════════════════════════════════════════════════════ */

function showError(el, msg) {
  el.textContent = msg;
  el.classList.remove("hidden");
}

function esc(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("ru-RU", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

/* ─── Boot ─────────────────────────────────────────────────────────────── */
loadTemplates();
