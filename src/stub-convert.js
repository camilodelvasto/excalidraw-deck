// A faithful stand-in for convertToExcalidrawElements' CONTRACT: measures text, keeps ids,
// splits a `label` into a bound text element with containerId. Tests assert contracts the
// deck format promises, not Excalidraw's numbers.
export function stubConvert(skeletons) {
  const out = []
  for (const s of skeletons) {
    const { label, ...el } = s
    if (el.type === 'text') {
      el.width ??= el.text.length * el.fontSize * 0.6
      el.height ??= el.fontSize * 1.25
    }
    el.width ??= 0
    el.height ??= 0
    out.push(el)
    if (label) out.push({ type: 'text', id: `${el.id}-label`, containerId: el.id, x: el.x, y: el.y, width: 10, height: 10, ...label })
  }
  return out
}

export const STUB_FONT_FAMILY = { 'Liberation Sans': 8, Virgil: 1, Nunito: 6, Cascadia: 7, Excalifont: 5 }
