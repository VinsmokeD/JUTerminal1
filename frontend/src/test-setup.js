import '@testing-library/jest-dom'

// jsdom does not implement scrollTo — add a no-op so component scroll calls
// in useEffect don't throw during tests.
window.HTMLElement.prototype.scrollTo = function () {}
