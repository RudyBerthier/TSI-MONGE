import { useState, useEffect } from 'react'
import { Sun, Umbrella, Timer } from 'lucide-react'

export function VacationCountdown() {
  const targetDate = new Date('2026-06-26T10:30:00+02:00')
  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft())

  function calculateTimeLeft() {
    const difference = +targetDate - +new Date()
    let timeLeft = {}

    if (difference > 0) {
      timeLeft = {
        jours: Math.floor(difference / (1000 * 60 * 60 * 24)),
        heures: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        secondes: Math.floor((difference / 1000) % 60)
      }
    } else {
      timeLeft = null // Vacances en cours !
    }
    return timeLeft
  }

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft())
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  if (!timeLeft) {
    return (
      <div style={{
        background: 'linear-gradient(135deg, #e69637, #d47e00)',
        color: 'white',
        padding: '1rem',
        textAlign: 'center',
        fontWeight: '900',
        fontSize: '1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.75rem',
        boxShadow: '0 4px 15px rgba(212, 126, 0, 0.3)',
        borderRadius: '16px',
        margin: '1rem',
        textTransform: 'uppercase',
        letterSpacing: '1px'
      }}>
        <Umbrella size={28} />
        C'EST LES VACANCES D'ÉTÉ !
        <Sun size={28} />
      </div>
    )
  }

  return (
    <div style={{
      background: 'transparent',
      borderBottom: '1px solid var(--border)',
      padding: '1rem 1.25rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '1.5rem',
      flexWrap: 'wrap',
      position: 'relative',
      zIndex: 30
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text)', fontWeight: 600 }}>
        <Sun size={20} style={{ color: '#f59e0b' }} />
        <span style={{ fontSize: '1rem', letterSpacing: '0.5px' }}>Vacances d'été :</span>
      </div>
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        {[
          { label: 'Jours', value: timeLeft.jours },
          { label: 'Heures', value: timeLeft.heures },
          { label: 'Min', value: timeLeft.minutes },
          { label: 'Sec', value: timeLeft.secondes }
        ].map((item, idx) => (
          <div key={idx} style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            background: 'var(--surface)',
            borderRadius: '10px',
            minWidth: '50px',
            padding: '0.35rem 0.5rem',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          }}>
            <span style={{ fontSize: '1.3rem', fontFamily: 'var(--font-display)', fontWeight: 800, color: 'var(--accent)', lineHeight: 1 }}>
              {item.value.toString().padStart(2, '0')}
            </span>
            <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700, marginTop: '4px', letterSpacing: '0.5px' }}>
              {item.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
