import { afterEach, expect } from 'vitest'
import { cleanup } from '@testing-library/react'
import * as matchers from '@testing-library/jest-dom/matchers'

// Matchers such as toBeInTheDocument / toHaveTextContent.
expect.extend(matchers)

/**
 * Explicit in-memory localStorage.
 *
 * Under Vitest 4 the `localStorage` exposed by the test environment is an inert
 * object with no `setItem` — reproduced with both jsdom and happy-dom, while
 * `sessionStorage` works fine in the same run. Rather than spend the deadline
 * inside Vitest internals, the tests own their storage.
 *
 * This is arguably the better arrangement anyway: the game keeps every byte of
 * progress in localStorage, so tests need a store they fully control and can
 * wipe between cases. Recorded as debt so the next team knows it is a
 * workaround and not a preference.
 */
class MemoryStorage {
  #entries = new Map()

  get length() {
    return this.#entries.size
  }

  key(index) {
    return [...this.#entries.keys()][index] ?? null
  }

  getItem(key) {
    const value = this.#entries.get(String(key))
    return value === undefined ? null : value
  }

  setItem(key, value) {
    this.#entries.set(String(key), String(value))
  }

  removeItem(key) {
    this.#entries.delete(String(key))
  }

  clear() {
    this.#entries.clear()
  }
}

const storage = new MemoryStorage()
for (const target of [globalThis, globalThis.window].filter(Boolean)) {
  Object.defineProperty(target, 'localStorage', {
    value: storage,
    writable: false,
    configurable: true,
  })
}

afterEach(() => {
  // Unmount anything a test rendered, so the next test starts on a blank page.
  cleanup()

  // Every test that touches a profile writes to storage. Without this, tests
  // pass or fail depending on the order they happen to run in.
  localStorage.clear()
})
