import { useState, useEffect } from 'react'
import api from '../../lib/api'
import { Badge, Button } from '../ui'

export default function ForensicsWorkbench({ sessionId }) {
  const [targets, setTargets] = useState([])
  const [selectedTarget, setSelectedTarget] = useState('')
  const [query, setQuery] = useState('SELECT * FROM processes LIMIT 10')
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const rows = results?.rows || []

  useEffect(() => {
    api.get(`/siem/${sessionId}/forensics/targets`)
      .then(res => {
        setTargets(res.data)
        if (res.data.length > 0) setSelectedTarget(res.data[0])
      })
      .catch(console.error)
  }, [sessionId])

  const runQuery = async () => {
    if (!selectedTarget || !query) return
    setLoading(true)
    setError(null)
    try {
      const res = await api.post(`/siem/${sessionId}/forensics/osquery`, {
        target: selectedTarget,
        query: query
      })
      setResults(res.data)
      if (res.data?.status === 'failed') {
        setError(res.data.detail || 'Forensic query failed')
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to run forensic query')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-full bg-surface-1">
      <div className="workspace-panel-header flex items-center gap-3 px-4 py-2 border-b border-cs-border">
        <span className="panel-header-dot blue" />
        <span className="text-xs font-mono font-semibold uppercase tracking-wider text-cs-blue">Forensics Workbench</span>
        <Badge tone="blue" className="text-[9px] uppercase">Simulated</Badge>
        
        <select 
          value={selectedTarget} 
          onChange={(e) => setSelectedTarget(e.target.value)}
          className="ml-4 bg-surface-3 border border-cs-border rounded-cs-sm px-2 py-1 text-[10px] font-mono text-txt-primary"
        >
          {targets.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        
        <div className="h-4 w-px bg-cs-border mx-2" />
        
        <button 
          onClick={() => setQuery('SELECT * FROM listening_ports')}
          className="text-[10px] font-mono text-txt-dim hover:text-cs-blue transition-colors"
        >
          listening_ports
        </button>
        <button 
          onClick={() => setQuery('SELECT * FROM processes')}
          className="ml-2 text-[10px] font-mono text-txt-dim hover:text-cs-blue transition-colors"
        >
          processes
        </button>
      </div>

      <div className="flex-1 flex flex-col min-h-0">
        <div className="p-3 border-b border-cs-border bg-void/30">
          <div className="flex gap-2">
            <textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 input min-h-[60px] text-xs font-mono py-2 bg-surface-2"
              placeholder="Enter forensic SQL..."
            />
            <Button 
              onClick={runQuery} 
              disabled={loading}
              variant="primary"
              size="sm"
              className="self-end"
            >
              {loading ? 'Executing...' : 'Run Query'}
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-0">
          {error && (
            <div className="p-4 text-xs font-mono text-cs-red bg-cs-red/5 border-b border-cs-red/20">
              Error: {error}
            </div>
          )}
          {results?.detail && (
            <div className={`p-3 text-xs font-mono border-b ${
              results.status === 'success'
                ? 'text-green-signal bg-green-signal/5 border-green-signal/20'
                : 'text-cs-red bg-cs-red/5 border-cs-red/20'
            }`}>
              {results.detail}
            </div>
          )}
          
          {!results ? (
            <div className="h-full flex items-center justify-center text-txt-dim font-mono text-xs italic">
              Execute a query to inspect host artifacts.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[10px] font-mono text-left">
                <thead className="bg-surface-2 text-txt-dim uppercase sticky top-0">
                  <tr>
                    {rows.length > 0 && Object.keys(rows[0]).map(key => (
                      <th key={key} className="px-3 py-2 border-b border-cs-border">{key}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-cs-border/20">
                  {rows.length === 0 ? (
                    <tr><td className="p-4 text-center italic" colSpan="100%">No records found.</td></tr>
                  ) : (
                    rows.map((row, i) => (
                      <tr key={i} className="hover:bg-white/[0.02] transition-colors">
                        {Object.values(row).map((val, j) => (
                          <th key={j} className="px-3 py-1.5 font-normal text-txt-secondary whitespace-nowrap">{String(val)}</th>
                        ))}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
