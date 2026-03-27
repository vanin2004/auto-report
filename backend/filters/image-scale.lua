-- image-scale.lua
-- Pandoc Lua filter: auto-scale images to page/line width when no explicit
-- dimensions are set by the author.
--
-- For DOCX: width="100%" maps to the full text-body width.
-- For PDF/LaTeX: Pandoc converts "100%" to \linewidth automatically.

function Image(el)
  local w = el.attributes["width"]
  local h = el.attributes["height"]
  -- Respect explicit author-specified dimensions; only set width when absent.
  if not w and not h then
    el.attributes["width"] = "100%"
  end
  return el
end
