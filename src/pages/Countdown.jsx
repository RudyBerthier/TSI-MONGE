import { useState, useEffect } from 'react'
import { ArrowLeft, GraduationCap, FileText, MessageCircle, BookOpen } from 'lucide-react'
import { Link } from 'react-router-dom'

// Dates officielles des concours 2026
const CONCOURS = [
  {
    id: 'ccinp',
    name: 'CCINP',
    fullName: 'Concours Commun INP',
    ecrits: {
      start: '2026-04-20T08:00:00',
      end: '23 avril'
    },
    oraux: {
      start: '2026-06-22T08:00:00',
      end: '18 juillet'
    }
  },
  {
    id: 'centrale',
    name: 'Centrale-Supélec',
    fullName: 'Concours Centrale-Supélec',
    ecrits: {
      start: '2026-05-04T08:00:00',
      end: '7 mai'
    },
    oraux: {
      start: '2026-06-22T08:00:00',
      end: '19 juillet'
    }
  }
]

// Hook pour le countdown
function useCountdown(targetDate) {
  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft(targetDate))

  function calculateTimeLeft(target) {
    const difference = new Date(target) - new Date()

    if (difference <= 0) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0, isPast: true }
    }

    return {
      days: Math.floor(difference / (1000 * 60 * 60 * 24)),
      hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
      minutes: Math.floor((difference / 1000 / 60) % 60),
      seconds: Math.floor((difference / 1000) % 60),
      isPast: false
    }
  }

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft(targetDate))
    }, 1000)
    return () => clearInterval(timer)
  }, [targetDate])

  return timeLeft
}

// Bloc de temps
function TimeBlock({ value, label, isActive }) {
  return (
    <div className="text-center">
      <div
        className="rounded-xl py-2 px-1 sm:px-3"
        style={isActive
          ? { background: 'var(--accent)', color: '#fff' }
          : { background: 'var(--surface-2)', color: 'var(--text)' }
        }
      >
        <span className="text-2xl sm:text-3xl font-bold" style={{ fontFamily: 'var(--font-mono)' }}>
          {String(value).padStart(2, '0')}
        </span>
      </div>
      <span className="text-[10px] sm:text-xs mt-1 block uppercase font-medium" style={{ color: 'var(--text-muted)' }}>
        {label}
      </span>
    </div>
  )
}

// Section épreuve (Écrits ou Oraux)
function ExamSection({ type, icon: Icon, startDate, endDate, isNext }) {
  const time = useCountdown(startDate)

  const formatDate = (dateStr, end) => {
    const d = new Date(dateStr)
    const day = d.getDate()
    const month = d.toLocaleDateString('fr-FR', { month: 'long' })
    return `${day} ${month} → ${end}`
  }

  return (
    <div
      className="flex-1 p-4 rounded-xl transition-all"
      style={isNext
        ? { background: 'rgba(var(--accent-rgb), 0.06)', border: '2px solid rgba(var(--accent-rgb), 0.3)' }
        : { background: 'var(--surface-2)', border: '1px solid var(--border)' }
      }
    >
      <div className="flex items-center gap-2 mb-4">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center"
          style={isNext
            ? { background: 'var(--accent)', color: '#fff' }
            : { background: 'var(--surface-3)', color: 'var(--text-muted)' }
          }
        >
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <span className="font-bold" style={{ color: 'var(--text)' }}>{type}</span>
          {isNext && (
            <span className="ml-2 text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: 'var(--accent)', color: '#fff' }}>
              PROCHAIN
            </span>
          )}
        </div>
      </div>

      {time.isPast ? (
        <div className="text-center py-6">
          <span className="font-medium text-lg" style={{ color: 'var(--text-muted)' }}>Terminé</span>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-4 gap-2">
            <TimeBlock value={time.days} label="Jours" isActive={isNext} />
            <TimeBlock value={time.hours} label="Heures" isActive={isNext} />
            <TimeBlock value={time.minutes} label="Min" isActive={isNext} />
            <TimeBlock value={time.seconds} label="Sec" isActive={isNext} />
          </div>
          <p className="text-xs text-center mt-3" style={{ color: 'var(--text-muted)' }}>
            {formatDate(startDate, endDate)} 2026
          </p>
        </>
      )}
    </div>
  )
}

// Carte concours
function ConcoursCard({ concours }) {
  const ecritsTime = useCountdown(concours.ecrits.start)
  const orauxTime = useCountdown(concours.oraux.start)

  const nextIsEcrits = !ecritsTime.isPast
  const nextIsOraux = ecritsTime.isPast && !orauxTime.isPast

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-card)' }}>
      <div className="px-5 py-4" style={{ background: 'var(--accent)' }}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-white">{concours.name}</h2>
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.75)' }}>{concours.fullName}</p>
          </div>
          <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.15)' }}>
            <GraduationCap className="w-6 h-6 text-white" />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row gap-4">
          <ExamSection
            type="Écrits"
            icon={FileText}
            startDate={concours.ecrits.start}
            endDate={concours.ecrits.end}
            isNext={nextIsEcrits}
          />
          <ExamSection
            type="Oraux"
            icon={MessageCircle}
            startDate={concours.oraux.start}
            endDate={concours.oraux.end}
            isNext={nextIsOraux}
          />
        </div>
      </div>
    </div>
  )
}

export function Countdown() {
  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ background: 'var(--nav-bg)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderBottom: '1px solid var(--border)' }}>
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/outils" className="p-2 rounded-xl flex items-center justify-center transition-all" style={{ background: 'var(--surface-2)', color: 'var(--text-muted)' }}>
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--accent)' }}>
                  <GraduationCap className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold" style={{ color: 'var(--text)' }}>Concours</h1>
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Concours 2026</p>
                </div>
              </div>
            </div>
            <Link
              to="/annales"
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold transition-all hover:opacity-80"
              style={{ background: 'var(--surface-2)', color: 'var(--text)', border: '1px solid var(--border)' }}
            >
              <BookOpen className="w-4 h-4" />
              Annales
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">
        {CONCOURS.map(concours => (
          <ConcoursCard key={concours.id} concours={concours} />
        ))}

        <p className="text-center text-xs pt-2" style={{ color: 'var(--text-muted)' }}>
          Dates officielles — {' '}
          <a href="https://www.concours-commun-inp.fr" target="_blank" rel="noopener noreferrer" className="underline" style={{ color: 'var(--accent)' }}>CCINP</a>
          {' • '}
          <a href="https://www.concours-centrale-supelec.fr" target="_blank" rel="noopener noreferrer" className="underline" style={{ color: 'var(--accent)' }}>Centrale-Supélec</a>
        </p>
      </div>
    </div>
  )
}
