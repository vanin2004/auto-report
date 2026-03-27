-- equation-style.lua
-- Pandoc Lua filter (DOCX): wraps standalone display-math paragraphs in a
-- Div that carries custom-style="Equation" so Word applies the paragraph
-- style named "Equation" from the reference template.
--
-- Requirements:
--   • The reference DOCX template must contain a paragraph style "Equation".
--   • Use only for DOCX output (--lua-filter is conditionally added by the
--     service only when equation_style option is enabled AND format is docx).

function Para(el)
  -- Collect non-whitespace inlines for a clean check
  local inlines = {}
  for _, item in ipairs(el.content) do
    if item.t ~= "Space" and item.t ~= "SoftBreak" and item.t ~= "LineBreak" then
      table.insert(inlines, item)
    end
  end

  -- Wrap if the paragraph is a standalone display-math block
  if #inlines == 1
      and inlines[1].t == "Math"
      and inlines[1].mathtype == "DisplayMath" then
    return pandoc.Div(
      { pandoc.Para(el.content) },
      pandoc.Attr("", {}, { ["custom-style"] = "Equation" })
    )
  end
  return el
end
