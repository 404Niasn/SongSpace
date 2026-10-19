export async function copyText(text: string, host: HTMLElement): Promise<boolean> {
  if (navigator.clipboard?.writeText) {
    try { await navigator.clipboard.writeText(text); return true }
    catch { /* Try the user-initiated fallback below. */ }
  }

  // Keep the selection inside the active dialog so its focus trap permits copying.
  const previous = document.activeElement as HTMLElement | null
  const input = document.createElement('textarea')
  input.value = text
  input.readOnly = true
  input.style.cssText = 'position:fixed;top:0;left:0;opacity:0;font-size:16px;pointer-events:none;'
  host.appendChild(input)
  try {
    input.focus({ preventScroll: true })
    input.select()
    input.setSelectionRange(0, text.length)
    return document.execCommand('copy')
  } catch {
    return false
  } finally {
    input.remove()
    previous?.focus({ preventScroll: true })
  }
}
