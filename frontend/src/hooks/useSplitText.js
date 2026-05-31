import { useEffect, useRef, useState } from 'react'

/**
 * Hand-rolled ~30-line split-text hook. Splits a string into word tokens
 * so RevealText can animate each word independently via clip-path.
 * SSR-safe: splits only after mount.
 *
 * Returns { words } — array of word strings derived from `text`.
 */
export default function useSplitText(text = '') {
  const [words, setWords] = useState(null)
  const mountedRef = useRef(false)

  useEffect(() => {
    mountedRef.current = true
    if (!text) { setWords([]); return }
    const split = String(text)
      .split(/\s+/)
      .filter(Boolean)
    setWords(split)
    return () => { mountedRef.current = false }
  }, [text])

  return { words }
}
