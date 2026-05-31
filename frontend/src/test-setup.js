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
