import assert from 'node:assert/strict'
import { copyText } from '../src/game/clipboard.ts'

const id = 'SS-TEST-ABCD-2345'
let clipboard, selected, attached, removed, restored, legacyResult = true, legacyCalls = 0
const previous = { focus() { restored = true } }
const dialog = { appendChild(input) { attached = input } }
Object.defineProperty(globalThis, 'navigator', { configurable: true, value: {} })
globalThis.document = {
  activeElement: previous,
  createElement(tag) {
    assert.equal(tag, 'textarea')
    return {
      style: {},
      focus() { assert.equal(attached, this, 'Selection stays inside the modal') },
      select() { selected = this.value },
      setSelectionRange(start, end) { assert.equal(start, 0); assert.equal(end, id.length) },
      remove() { removed = true },
    }
  },
  execCommand(command) {
    legacyCalls++
    assert.equal(command, 'copy')
    if (legacyResult instanceof Error) throw legacyResult
    if (legacyResult) clipboard = selected
    return legacyResult
  },
}

// HTTP: navigator.clipboard is unavailable; copy from inside the modal.
assert.equal(await copyText(id, dialog), true)
assert.equal(clipboard, id)
assert.ok(removed && restored)

navigator.clipboard = { async writeText(value) { clipboard = value } }
const calls = legacyCalls
assert.equal(await copyText(id, dialog), true)
assert.equal(legacyCalls, calls, 'Modern clipboard success needs no fallback')

navigator.clipboard.writeText = async () => { throw new Error('Permission denied') }
assert.equal(await copyText(id, dialog), true, 'Denied modern API falls back')
assert.equal(clipboard, id)
for (const result of [false, new Error('Copy blocked')]) {
  removed = restored = false
  legacyResult = result
  assert.equal(await copyText(id, dialog), false, 'Never report blocked copies as successful')
  assert.ok(removed && restored, 'Always clean up and restore focus')
}
console.log('PASS: HTTP/modal fallback, modern clipboard, denied permission, blocked copy and focus cleanup')
