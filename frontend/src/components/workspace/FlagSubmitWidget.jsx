import { useState, useRef, useEffect } from 'react'
import api from '../../lib/api'
import toast from '../../lib/toast'

const FLAG_PATTERN = /^[A-Za-z0-9_\-:.!@#$%^&*()+= ]{2,}$/

export default function FlagSubmitWidget({ sessionId, _scenarioId, onFlagCaptured, flagsCaptured = [], totalFlags = 0 }) {
  const [isOpen, setIsOpen] = useState(false)
  const [flagValue, setFlagValue] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null) // { type: 'success' | 'error', text: string }
  const [shake, setShake] = useState(false)
  const [glow, setGlow] = useState(false)
  const [pendingCount, setPendingCount] = useState(0) // detected-but-unsubmitted flags
  const popoverRef = useRef(null)
  const isOpenRef = useRef(false)
  useEffect(() => { isOpenRef.current = isOpen }, [isOpen])

  // A flag was detected in terminal output — pulse the button and remind the
  // student to submit it until they do (or until every flag is captured).
  useEffect(() => {
    const onDetected = () => {
      setPendingCount((c) => c + 1)
      setGlow(true)
    }
    window.addEventListener('flag:detected', onDetected)
    return () => window.removeEventListener('flag:detected', onDetected)
  }, [])

  // Periodic "don't forget to submit" reminder while flags are pending + closed.
  useEffect(() => {
    if (pendingCount <= 0) return
    const id = setInterval(() => {
      if (!isOpenRef.current) {
        setGlow(true)
        toast.warning('🚩 Reminder: submit the flag you found via the SUBMIT FLAG button.')
      }
    }, 30000)
    return () => clearInterval(id)
  }, [pendingCount])

  // Once every available flag is captured, stop reminding.
  useEffect(() => {
    if (totalFlags > 0 && flagsCaptured.length >= totalFlags) {
      setPendingCount(0)
      setGlow(false)
    }
  }, [flagsCaptured.length, totalFlags])

  const hasPending = pendingCount > 0

  // Close popover on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (popoverRef.current && !popoverRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // flag:prefill — dispatched by the Terminal nudge when the student clicks Capture
  useEffect(() => {
    const handler = (evt) => {
      const val = evt.detail?.value || ''
      if (!val) return
      setFlagValue(val)
      setMessage(null)
      setIsOpen(true)
      setGlow(true)
      setTimeout(() => setGlow(false), 1800)
    }
    window.addEventListener('flag:prefill', handler)
    return () => window.removeEventListener('flag:prefill', handler)
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    const val = flagValue.trim()
    if (!val) return

    setLoading(true)
    setMessage(null)

    try {
      const res = await api.post(`/sessions/${sessionId}/flag`, { flag_value: val })

      if (res.data?.valid) {
        if (res.data?.already_captured) {
          setMessage({ type: 'error', text: 'This flag was already captured!' })
          toast.warning('This flag was already captured!')
        } else {
          setMessage({
            type: 'success',
            text: `FLAG CAPTURED +${res.data?.points_awarded || 0} pts`,
          })
          setFlagValue('')
          onFlagCaptured?.()
          setPendingCount((c) => Math.max(0, c - 1))
          toast.achievement(`Flag Captured! +${res.data?.points_awarded || 0} pts`)
        }
      } else {
        const guidance = res.data?.detail || res.data?.guidance || res.data?.hint || 'Incorrect flag value. Try again!'
        setMessage({ type: 'error', text: guidance })
        setShake(true)
        setTimeout(() => setShake(false), 500)
        toast.error('Incorrect flag. Try again!')
      }
    } catch (err) {
      const errMsg = err.response?.data?.detail || err.response?.data?.guidance || 'Submission failed, try again'
      setMessage({ type: 'error', text: errMsg })
      setShake(true)
      setTimeout(() => setShake(false), 500)
      toast.error(errMsg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative" ref={popoverRef}>
      <button
        onClick={() => {
          setIsOpen(!isOpen)
          setMessage(null)
          if (!isOpen) setGlow(false)
        }}
        className={`btn-v3 btn-v3-sm font-mono text-[11px] border hover:bg-surface-4 flex items-center gap-2 transition-all ${
          hasPending
            ? 'bg-amber-warn/15 border-amber-warn/70 text-amber-warn shadow-[0_0_10px_rgba(245,158,11,0.45)] animate-pulse'
            : glow
              ? 'bg-surface-3 border-amber-warn/70 text-txt-secondary shadow-[0_0_8px_rgba(245,158,11,0.4)]'
              : 'bg-surface-3 border-cs-border text-txt-secondary hover:text-txt-primary'
        }`}
        title={hasPending ? 'A flag was detected in your output — submit it!' : 'Submit a captured flag'}
      >
        {hasPending && <span aria-hidden>🚩</span>}
        <span>SUBMIT FLAG</span>
        <span className="text-[10px] text-txt-dim bg-surface-2 px-1.5 py-0.5 rounded-cs-sm border border-cs-border">
          {flagsCaptured.length}/{totalFlags} captured
        </span>
      </button>

      {isOpen && (
        <div className={`absolute right-0 mt-2 w-80 bg-surface-3 border border-cs-border rounded-cs p-4 shadow-xl z-50 ${shake ? 'animate-shake' : ''}`}>
          <form onSubmit={handleSubmit} className="space-y-3 font-display">
            <div>
              <label className="block text-[10px] font-mono uppercase tracking-wider text-txt-dim mb-1">
                Enter Flag
              </label>
              <input
                type="text"
                value={flagValue}
                onChange={(e) => { setFlagValue(e.target.value); setMessage(null) }}
                disabled={loading}
                placeholder="e.g. root:x:0:0:root:/root:/bin/bash"
                className={`w-full bg-surface-2 rounded-cs px-3 py-1.5 text-xs text-txt-primary placeholder:text-txt-dim focus:outline-none transition-colors disabled:opacity-40 font-mono border ${
                  !flagValue ? 'border-cs-border focus:border-cs-blue' :
                  FLAG_PATTERN.test(flagValue) ? 'border-green-signal/50 focus:border-green-signal' :
                  'border-cs-red/40 focus:border-cs-red/60'
                }`}
                autoFocus
              />
            </div>

            {message && (
              <div className={`p-2.5 rounded-cs border text-[11px] leading-relaxed font-mono ${
                message.type === 'success'
                  ? 'border-green-signal/30 bg-green-signal/5 text-green-signal'
                  : 'border-critical/30 bg-critical/5 text-critical'
              }`}>
                {message.text}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="submit"
                disabled={loading || !flagValue.trim()}
                className="btn-v3 btn-v3-blue btn-v3-sm px-4 py-1 disabled:opacity-40"
              >
                {loading ? 'Submitting...' : 'Submit'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
