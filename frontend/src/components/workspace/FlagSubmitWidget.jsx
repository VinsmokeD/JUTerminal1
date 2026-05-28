import { useState, useRef, useEffect } from 'react'
import api from '../../lib/api'

export default function FlagSubmitWidget({ sessionId, _scenarioId, onFlagCaptured, flagsCaptured = [], totalFlags = 0 }) {
  const [isOpen, setIsOpen] = useState(false)
  const [flagValue, setFlagValue] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null) // { type: 'success' | 'error', text: string }
  const popoverRef = useRef(null)

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

  const handleSubmit = async (e) => {
    e.preventDefault()
    const val = flagValue.trim()
    if (!val) return

    setLoading(true)
    setMessage(null)

    try {
      // Calls POST /api/sessions/{sessionId}/flag with { flag_value: value }
      const res = await api.post(`/sessions/${sessionId}/flag`, { flag_value: val })
      
      if (res.data?.valid) {
        if (res.data?.already_captured) {
          setMessage({ type: 'error', text: 'This flag was already captured!' })
        } else {
          setMessage({ 
            type: 'success', 
            text: `FLAG CAPTURED +${res.data?.points_awarded || 0} pts` 
          })
          setFlagValue('') // Input clears after successful capture only
          onFlagCaptured?.()
        }
      } else {
        const guidance = res.data?.detail || res.data?.guidance || res.data?.hint || 'Incorrect flag value. Try again!'
        setMessage({ type: 'error', text: guidance })
      }
    } catch (err) {
      const errMsg = err.response?.data?.detail || err.response?.data?.guidance || 'Submission failed, try again'
      setMessage({ type: 'error', text: errMsg })
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
        }}
        className="btn-v3 btn-v3-sm font-mono text-[11px] bg-surface-3 border border-cs-border hover:bg-surface-4 text-txt-secondary hover:text-txt-primary flex items-center gap-2"
      >
        <span>SUBMIT FLAG</span>
        <span className="text-[10px] text-txt-dim bg-surface-2 px-1.5 py-0.5 rounded-cs-sm border border-cs-border">
          {flagsCaptured.length}/{totalFlags} captured
        </span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-surface-3 border border-cs-border rounded-cs p-4 shadow-xl z-50">
          <form onSubmit={handleSubmit} className="space-y-3 font-display">
            <div>
              <label className="block text-[10px] font-mono uppercase tracking-wider text-txt-dim mb-1">
                Enter Flag
              </label>
              <input
                type="text"
                value={flagValue}
                onChange={(e) => setFlagValue(e.target.value)}
                disabled={loading}
                placeholder="e.g. FLAG-SC01-1"
                className="w-full bg-surface-2 border border-cs-border rounded-cs px-3 py-1.5 text-xs text-txt-primary placeholder:text-txt-dim focus:outline-none focus:border-cs-blue transition-colors disabled:opacity-40 font-mono"
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
