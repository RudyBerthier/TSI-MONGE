import { useState, useEffect, useCallback } from 'react'
import { Clock, MapPin, User, BookOpen, ArrowRight, ExternalLink, FileText } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { WEEKS, SCHEDULE, MATIERE_ACCENT, JOURS_ORDER, kholleDate } from '../utils/schedule'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatCountdown(ms) {
  if (ms <= 0) return { str: 'Maintenant', urgent: true }
  const totalSecs = Math.floor(ms / 1000)
  const d = Math.floor(totalSecs / 86400)
  const h = Math.floor((totalSecs % 86400) / 3600)
  const m = Math.floor((totalSecs % 3600) / 60)
  const s = totalSecs % 60
  if (d > 0) return { str: `${d}j ${h}h ${String(m).padStart(2, '0')}m`, urgent: d === 0 }
  if (h > 0) return { str: `${h}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`, urgent: h < 3 }
  return { str: `${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`, urgent: true }
}

function formatKholleDate(date) {
  return date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
}

// ─── Component ───────────────────────────────────────────────────────────────

export function ProchaineKholleBanner() {
  const [trinome, setTrinome] = useState(() => parseInt(localStorage.getItem('colloscope_trinome') || '0'))
  const [colleurs, setColleurs] = useState(null)
  const [next, setNext] = useState(null)   // { kholle, date, weekNum, code }
  const [countdown, setCountdown] = useState(null)
  const navigate = useNavigate()

  // Re-read trinome if it changes in another tab/component
  useEffect(() => {
    const onStorage = () => setTrinome(parseInt(localStorage.getItem('colloscope_trinome') || '0'))
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  // Fetch colloscope once
  useEffect(() => {
    fetch('/api/colloscope')
      .then(r => r.json())
      .then(data => { if (data && Object.keys(data).length > 0) setColleurs(data) })
      .catch(() => { })
  }, [])

  // Find next kholle whenever trinome or colleurs changes
  const findNext = useCallback(() => {
    if (!trinome || !colleurs) { setNext(null); return }

    const now = new Date()
    let found = null

    for (let wi = 0; wi < WEEKS.length; wi++) {
      const week = WEEKS[wi]
      if (!week.num) continue  // skip vacances
      const scheduleIdx = week.num - 1  // SCHEDULE is 0-indexed by kholle week number
      const code = SCHEDULE[scheduleIdx]?.[trinome - 1]
      if (!code) continue
      const kholles = colleurs[code] || []

      for (const k of kholles) {
        const d = kholleDate(week.start, k.jour, k.heure)
        if (!d) continue
        if (d > now) {
          if (!found || d < found.date) {
            found = { kholle: k, date: d, weekNum: week.num, code }
          }
        }
      }
      // Stop after finding a kholle in the first future week
      if (found && found.weekNum === week.num) break
    }

    setNext(found)
  }, [trinome, colleurs])

  useEffect(() => { findNext() }, [findNext])

  // Countdown tick
  useEffect(() => {
    if (!next) { setCountdown(null); return }
    const tick = () => setCountdown(formatCountdown(next.date - new Date()))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [next])

  // Not configured or no upcoming kholle
  if (!trinome || !next || !countdown) return null

  const k = next.kholle
  const accent = MATIERE_ACCENT[k.matiere] || 'var(--accent)'
  const isUrgent = countdown?.urgent ?? false
  const dayIdx = JOURS_ORDER.indexOf(k.jour)
  const edtHref = `/emploi-du-temps?week=${next.weekNum}&day=${dayIdx >= 0 ? dayIdx : 0}`

  const sujetUrl = k.matiere === 'Maths'
    ? `https://a-crida.toile-libre.org/colles/semaine_${next.weekNum}.pdf`
    : null
  const tqUrl = k.type === 'TQ'
    ? 'https://drive.google.com/drive/folders/16uCn2ZhdKX-Sobsk88zpN9csToGHkR5k'
    : null

  const cardStyle = {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
    background: 'var(--surface)',
    border: `1px solid ${accent}44`,
    borderRadius: 14,
    padding: '1rem 1.1rem',
    position: 'relative',
    overflow: 'hidden',
    transition: 'box-shadow 0.18s, border-color 0.18s',
    boxShadow: isUrgent ? `0 0 0 2px ${accent}33` : '0 2px 12px rgba(0,0,0,0.07)',
    cursor: 'pointer',
  }

  return (
    <section>
      <div className="tsi-section-label">
        <span>Prochaine kholle</span>
        <em>{k.matiere}</em>
      </div>

      <div
        style={cardStyle}
        onClick={() => navigate(edtHref, { state: { day: dayIdx >= 0 ? dayIdx : 0, weekNum: next.weekNum, viewMode: 'day' } })}
        onMouseEnter={e => { e.currentTarget.style.borderColor = `${accent}88`; e.currentTarget.style.boxShadow = `0 4px 20px ${accent}22` }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = `${accent}44`; e.currentTarget.style.boxShadow = isUrgent ? `0 0 0 2px ${accent}33` : '0 2px 12px rgba(0,0,0,0.07)' }}
        role="link"
        tabIndex={0}
        onKeyDown={e => { if (e.key === 'Enter') navigate(edtHref, { state: { day: dayIdx >= 0 ? dayIdx : 0, weekNum: next.weekNum, viewMode: 'day' } }) }}
      >
        {/* Colored left bar */}
        <div style={{
          position: 'absolute', left: 0, top: 0, bottom: 0, width: 4,
          background: accent, borderRadius: '14px 0 0 14px',
        }} />

        {/* Top row: matière + countdown */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 pl-1">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: `${accent}18`,
              border: `1px solid ${accent}33`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <BookOpen size={15} style={{ color: accent }} />
            </div>
            <div>
              <div style={{
                fontFamily: 'var(--font-display)',
                fontSize: '1rem',
                fontWeight: 700,
                color: accent,
                lineHeight: 1.1,
              }}>
                {k.matiere}
              </div>
              <div style={{
                fontFamily: 'var(--font-body)',
                fontSize: '0.7rem',
                color: 'var(--text-muted)',
                marginTop: 1,
              }}>
                Semaine {next.weekNum} · {formatKholleDate(next.date)}
              </div>
            </div>
          </div>

          {/* Countdown */}
          <div className="flex flex-row sm:flex-col items-center sm:items-end sm:flex-shrink-0 mt-1 sm:mt-0">
            <div style={{
              fontFamily: 'var(--font-display)',
              fontSize: '1.35rem',
              fontWeight: 700,
              color: isUrgent ? accent : 'var(--text)',
              letterSpacing: '-0.02em',
            }}>
              {countdown.str}
            </div>
          </div>
        </div>

        {/* Bottom row: info chips + links */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap',
          paddingLeft: 4,
        }}>
          {k.heure && <Chip icon={<Clock size={11} />} label={k.heure} />}
          {k.prof && <Chip icon={<User size={11} />} label={k.prof} />}
          {k.salle && <Chip icon={<MapPin size={11} />} label={k.salle} />}

          {sujetUrl && (
            <a
              href={sujetUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                background: accent, color: '#fff',
                borderRadius: 6, padding: '2px 8px',
                fontSize: '0.72rem', fontFamily: 'var(--font-body)',
                fontWeight: 600, textDecoration: 'none',
              }}
            >
              <FileText size={11} />
              <span>Sujet</span>
              <ExternalLink size={9} />
            </a>
          )}

          {tqUrl && (
            <a
              href={tqUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                background: '#8b5cf6', color: '#fff',
                borderRadius: 6, padding: '2px 8px',
                fontSize: '0.72rem', fontFamily: 'var(--font-body)',
                fontWeight: 600, textDecoration: 'none',
              }}
            >
              <span>TQ</span>
              <ExternalLink size={9} />
            </a>
          )}

          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-muted)', fontSize: '0.7rem', fontFamily: 'var(--font-body)' }}>
            <span>Voir l'EDT</span>
            <ArrowRight size={11} />
          </div>
        </div>
      </div>
    </section>
  )
}

function Chip({ icon, label }) {
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      background: 'var(--surface-raised, rgba(128,128,128,0.08))',
      border: '1px solid var(--border)',
      borderRadius: 6, padding: '2px 8px',
      fontSize: '0.72rem', fontFamily: 'var(--font-body)',
      color: 'var(--text-muted)',
    }}>
      {icon}
      <span>{label}</span>
    </div>
  )
}
