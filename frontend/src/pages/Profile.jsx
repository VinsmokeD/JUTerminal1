import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../lib/api'
import CyberSimNav from '../components/nav/CyberSimNav'
import { Badge, Button } from '../components/ui'

export default function Profile() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    api.get('/auth/stats')
      .then(res => setStats(res.data))
      .catch(() => navigate('/auth'))
      .finally(() => setLoading(false))
  }, [navigate])

  if (loading) return <ProfileLoading />
  if (!stats) return null

  const summary = stats.summary
  const completionRate = summary.total_missions ? Math.round((summary.completed_missions / summary.total_missions) * 100) : 0

  return (
    <div className="min-h-screen bg-void text-txt-primary font-display pb-12">
      <CyberSimNav />
      
      <main className="max-w-6xl mx-auto px-6 pt-10">
        {/* Header Section */}
        <header className="flex flex-col md:flex-row gap-8 items-start mb-12 animate-slide-in-up">
          <div className="relative group">
            <div className="w-32 h-32 rounded-cs-lg bg-surface-3 border-2 border-cs-blue/30 overflow-hidden flex items-center justify-center shadow-2xl shadow-cs-blue/10">
              <span className="text-5xl font-extrabold text-cs-blue/40 uppercase select-none">
                {stats.username[0]}
              </span>
            </div>
            <div className="absolute -bottom-2 -right-2 px-2 py-1 bg-void border border-green-signal/30 rounded-cs-sm text-[10px] font-mono text-green-signal shadow-lg">
              ONLINE
            </div>
          </div>
          
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-extrabold tracking-tight">{stats.username}</h1>
              <Badge tone={stats.skill_level === 'experienced' ? 'red' : 'blue'}>
                {stats.skill_level.toUpperCase()}
              </Badge>
            </div>
            <p className="text-txt-dim font-mono text-sm mb-6">
              OPERATOR ID: <span className="text-txt-secondary">{stats.username.toUpperCase()}</span> 
              <span className="mx-3 opacity-20">|</span> 
              JOINED: <span className="text-txt-secondary">{new Date(stats.joined_at).toLocaleDateString()}</span>
            </p>
            
            <div className="flex flex-wrap gap-4">
              <div className="card-v3 px-5 py-3 border-cs-border/40 bg-surface-1/40">
                <p className="text-[10px] font-mono text-txt-dim uppercase tracking-wider mb-1">Total Score Avg</p>
                <p className="text-xl font-bold text-cs-blue">{summary.avg_score}%</p>
              </div>
              <div className="card-v3 px-5 py-3 border-cs-border/40 bg-surface-1/40">
                <p className="text-[10px] font-mono text-txt-dim uppercase tracking-wider mb-1">Completion Rate</p>
                <p className="text-xl font-bold text-green-signal">{completionRate}%</p>
              </div>
              <div className="card-v3 px-5 py-3 border-cs-border/40 bg-surface-1/40">
                <p className="text-[10px] font-mono text-txt-dim uppercase tracking-wider mb-1">Active Commands</p>
                <p className="text-xl font-bold text-txt-primary">{summary.total_commands}</p>
              </div>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Mission History */}
          <section className="lg:col-span-2 space-y-6">
            <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-txt-secondary font-mono mb-4 flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-cs-blue shadow-[0_0_8px_rgba(59,139,255,0.6)]" />
              Mission Deployment Log
            </h2>
            
            <div className="space-y-3">
              {stats.history.length === 0 ? (
                <div className="card-v3 p-12 text-center border-dashed border-cs-border/40">
                  <p className="text-txt-dim font-mono text-sm uppercase">No mission history recorded.</p>
                  <Button variant="ghost" className="mt-4" onClick={() => navigate('/dashboard')}>
                    Start First Mission
                  </Button>
                </div>
              ) : (
                stats.history.map((m) => (
                  <div
                    key={m.id}
                    className="card-v3 p-5 flex flex-wrap items-center gap-6 hover:bg-surface-2/40 transition-colors group cursor-pointer"
                    onClick={() => navigate(`/session/${m.id}/debrief`)}
                  >
                    <div className="flex-1 min-w-[200px]">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono text-txt-dim font-bold tracking-widest">{m.scenario_id}</span>
                        <span className={`w-1 h-1 rounded-full ${m.role === 'red' ? 'bg-cs-red' : 'bg-cs-blue'}`} />
                        <span className={`text-[10px] font-mono uppercase font-bold ${m.role === 'red' ? 'text-cs-red' : 'text-cs-blue'}`}>
                          {m.role} Team
                        </span>
                      </div>
                      <h3 className="font-bold text-lg group-hover:text-cs-blue transition-colors">
                        Scenario Assessment Delta
                      </h3>
                      <p className="text-xs text-txt-dim font-mono">
                        {new Date(m.started_at).toLocaleString()}
                      </p>
                    </div>
                    
                    <div className="text-right">
                      <div className="text-xs font-mono text-txt-dim mb-1">SCORE</div>
                      <div className={`text-2xl font-black ${m.score >= 80 ? 'text-green-signal' : m.score >= 60 ? 'text-amber-warn' : 'text-cs-red'}`}>
                        {m.score}%
                      </div>
                    </div>

                    <div className="hidden sm:block">
                      <div className={`px-3 py-1.5 rounded-cs-sm border text-[10px] font-bold font-mono ${m.completed_at ? 'border-green-signal/20 text-green-signal bg-green-signal/5' : 'border-amber-warn/20 text-amber-warn bg-amber-warn/5'}`}>
                        {m.completed_at ? 'COMPLETED' : 'IN PROGRESS'}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Right Column: Skills & Proficiency */}
          <section className="space-y-6">
            <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-txt-secondary font-mono mb-4 flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-cs-red shadow-[0_0_8px_rgba(255,59,59,0.6)]" />
              Capabilities Map
            </h2>

            <div className="card-v3 p-6 space-y-6 bg-surface-1/60">
              <ProficiencyRow label="Offensive (Red)" count={summary.red_count} total={summary.total_missions} color="bg-cs-red" shadow="shadow-cs-red/40" />
              <ProficiencyRow label="Defensive (Blue)" count={summary.blue_count} total={summary.total_missions} color="bg-cs-blue" shadow="shadow-cs-blue/40" />
              
              <div className="pt-6 border-t border-cs-border/40">
                <h4 className="text-[10px] font-mono text-txt-dim uppercase tracking-wider mb-4">Tactical Engagement Stats</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] font-mono text-txt-dim uppercase mb-1">Missions</p>
                    <p className="text-lg font-bold">{summary.total_missions}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-mono text-txt-dim uppercase mb-1">Field Notes</p>
                    <p className="text-lg font-bold">{summary.total_notes}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="card-v3 p-6 border-cs-blue/20 bg-cs-blue/5">
              <h4 className="text-xs font-bold mb-2">Next Qualification</h4>
              <p className="text-xs text-txt-secondary leading-relaxed mb-4">
                Complete 2 more advanced scenarios with 85%+ score to qualify for Elite Operator status.
              </p>
              <div className="w-full h-1.5 bg-void rounded-full overflow-hidden border border-cs-border/40">
                <div className="h-full bg-cs-blue shadow-[0_0_8px_rgba(59,139,255,0.4)]" style={{ width: '65%' }} />
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}

function ProficiencyRow({ label, count, total, color, shadow }) {
  const percent = total ? Math.round((count / total) * 100) : 0
  return (
    <div>
      <div className="flex items-center justify-between text-xs font-mono mb-2">
        <span className="text-txt-secondary uppercase tracking-wider">{label}</span>
        <span className="text-txt-primary">{percent}%</span>
      </div>
      <div className="w-full h-2 bg-void rounded-full overflow-hidden border border-cs-border/40">
        <div className={`h-full w-full ${color} ${shadow} transition-transform duration-300 origin-left`} style={{ transform: `scaleX(${percent / 100})` }} />
      </div>
    </div>
  )
}

function ProfileLoading() {
  return (
    <div className="min-h-screen bg-void text-txt-primary font-display">
      <CyberSimNav />
      <div className="max-w-4xl mx-auto px-6 pt-24 space-y-12">
        <div className="flex gap-8 items-center animate-pulse">
          <div className="w-32 h-32 rounded-cs-lg bg-surface-3" />
          <div className="flex-1 space-y-4">
            <div className="h-8 w-48 bg-surface-3 rounded-cs-sm" />
            <div className="h-4 w-64 bg-surface-3 rounded-cs-sm" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-pulse">
          <div className="h-32 bg-surface-3 rounded-cs-lg" />
          <div className="h-32 bg-surface-3 rounded-cs-lg" />
          <div className="h-32 bg-surface-3 rounded-cs-lg" />
        </div>
      </div>
    </div>
  )
}
