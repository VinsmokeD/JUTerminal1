import { useEffect, useState } from 'react'

/**
 * Hand-rolled split-text hook. Splits a string into word tokens so RevealText
 * can animate each word independently via clip-path.
 *
 * Splits **synchronously on first render** (this is a Vite SPA, no SSR). This
 * matters: a deferred (effect-only) split returns `null` on the first render,
 * which makes RevealText render its plain fallback first — so its `ref` is not
 * yet attached when `useInView` sets up its IntersectionObserver, and the
 * reveal never fires. Synchronous splitting keeps the observed element stable.
 *
 * Returns { words } — array of word strings derived from `text`.
 */
const splitWords = (text) => (text ? String(text).split(/\s+/).filter(Boolean) : [])

export default function useSplitText(text = '') {
  const [words, setWords] = useState(() => splitWords(text))

  useEffect(() => {
    setWords(splitWords(text))
  }, [text])

  return { words }
}
