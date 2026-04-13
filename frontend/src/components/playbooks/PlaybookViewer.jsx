import { useEffect, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import api from '../../lib/api'

export default function PlaybookViewer({ scenarioId }) {
  const [playbook, setPlaybook] = useState(null)
  const [sections, setSections] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeSection, setActiveSection] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    const fetchPlaybook = async () => {
      try {
        const response = await api.get(`/playbooks/${scenarioId}`)
        setPlaybook(response.data)
        setActiveSection(null)

        // Also fetch sections for TOC
        const sectionsResponse = await api.get(`/playbooks/${scenarioId}/sections`)
        setSections(sectionsResponse.data.sections || [])
      } catch (error) {
        console.error('Failed to load playbook:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchPlaybook()
  }, [scenarioId])

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center text-slate-400 text-sm">
        Loading playbook...
      </div>
    )
  }

  if (!playbook) {
    return (
      <div className="h-full flex items-center justify-center text-slate-400 text-sm">
        Playbook not found
      </div>
    )
  }

  const filteredContent = searchTerm
    ? playbook.content.split('\n').filter(line =>
        line.toLowerCase().includes(searchTerm.toLowerCase())
      ).join('\n')
    : playbook.content

  return (
    <div className="h-full flex flex-col overflow-hidden bg-slate-950">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-slate-800/50 bg-slate-900/50 p-3">
        <h2 className="text-sm font-bold text-slate-100 mb-2">{playbook.title}</h2>
        <div className="flex gap-2">
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search playbook..."
            className="flex-1 bg-slate-800/50 border border-slate-700/50 rounded-md px-2.5 py-1 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-600"
          />
          <button
            onClick={() => {
              const element = document.createElement('a')
              element.href = 'data:text/markdown;charset=utf-8,' + encodeURIComponent(playbook.content)
              element.download = `${scenarioId.toLowerCase()}_playbook.md`
              document.body.appendChild(element)
              element.click()
              document.body.removeChild(element)
            }}
            className="px-3 py-1 bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 text-xs rounded-md transition-colors"
          >
            Export
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        <div className="prose prose-invert max-w-none text-sm">
          <ReactMarkdown
            components={{
              h1: ({ node, ...props }) => <h1 className="text-xl font-bold text-slate-100 mt-4 mb-2" {...props} />,
              h2: ({ node, ...props }) => <h2 className="text-lg font-bold text-slate-200 mt-3 mb-2 border-b border-slate-800/50 pb-1" {...props} />,
              h3: ({ node, ...props }) => <h3 className="text-base font-semibold text-slate-300 mt-2 mb-1" {...props} />,
              p: ({ node, ...props }) => <p className="text-slate-400 mb-2 leading-relaxed" {...props} />,
              ul: ({ node, ...props }) => <ul className="list-disc list-inside text-slate-400 mb-2 space-y-0.5" {...props} />,
              ol: ({ node, ...props }) => <ol className="list-decimal list-inside text-slate-400 mb-2 space-y-0.5" {...props} />,
              li: ({ node, ...props }) => <li className="text-slate-400" {...props} />,
              code: ({ node, inline, ...props }) => inline
                ? <code className="bg-slate-900/50 border border-slate-800/50 rounded px-1.5 py-0.5 text-slate-300 font-mono text-xs" {...props} />
                : <code className="block bg-slate-900/50 border border-slate-800/50 rounded p-3 text-slate-300 font-mono text-xs overflow-x-auto mb-2" {...props} />,
              blockquote: ({ node, ...props }) => <blockquote className="border-l-2 border-slate-700 pl-3 italic text-slate-500 mb-2" {...props} />,
              table: ({ node, ...props }) => <table className="w-full text-xs text-slate-400 mb-2 border border-slate-800/50" {...props} />,
              th: ({ node, ...props }) => <th className="border border-slate-800/50 bg-slate-800/30 px-3 py-2 text-left font-semibold" {...props} />,
              td: ({ node, ...props }) => <td className="border border-slate-800/50 px-3 py-2" {...props} />,
            }}
          >
            {filteredContent}
          </ReactMarkdown>
        </div>
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 border-t border-slate-800/50 bg-slate-900/50 px-3 py-2 text-xs text-slate-600 flex justify-between">
        <span>Format: Markdown (NIST 800-61 Based)</span>
        <span>Document v1.0 — Last Updated: 2026-04-13</span>
      </div>
    </div>
  )
}
