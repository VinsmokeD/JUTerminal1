import '@testing-library/jest-dom'

// jsdom does not implement scrollTo — add a no-op so component scroll calls
// in useEffect don't throw during tests.
window.HTMLElement.prototype.scrollTo = function () {}

// jsdom does not implement matchMedia — framer-motion's useReducedMotion needs it.
// Default: no preference (matches: false).
if (!window.matchMedia) {
  window.matchMedia = (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })
}

// jsdom ResizeObserver stub (used by Marquee width detection)
if (!window.ResizeObserver) {
  window.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
}

// jsdom does not implement IntersectionObserver — framer-motion's useInView
// (RevealText and any scroll-reveal) needs it. Mock reports the element as
// immediately in view so the reveal completes deterministically in tests.
if (!window.IntersectionObserver) {
  window.IntersectionObserver = class IntersectionObserver {
    constructor(cb) { this._cb = cb }
    observe(el) { this._cb([{ isIntersecting: true, target: el, intersectionRatio: 1 }], this) }
    unobserve() {}
    disconnect() {}
    takeRecords() { return [] }
  }
  globalThis.IntersectionObserver = window.IntersectionObserver
}
