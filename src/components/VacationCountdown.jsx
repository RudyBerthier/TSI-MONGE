import { useState, useEffect } from 'react'
import { Sun, Umbrella, Timer } from 'lucide-react'
import confetti from 'canvas-confetti'

export function VacationCountdown({ children }) {
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

  useEffect(() => {
    if (!timeLeft) {
      const duration = 15 * 1000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 10000 };

      const randomInRange = (min, max) => Math.random() * (max - min) + min;

      const interval = setInterval(function () {
        const timeLeftConfetti = animationEnd - Date.now();

        if (timeLeftConfetti <= 0) {
          return clearInterval(interval);
        }

        const particleCount = 50 * (timeLeftConfetti / duration);
        confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
        confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
      }, 250);

      return () => clearInterval(interval);
    }
  }, [timeLeft])

  if (!timeLeft) {
    return (
      <div style={{
        background: 'transparent',
        borderBottom: '1px solid var(--border)',
        padding: '1rem 1.25rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'relative',
        zIndex: 30
      }} className="flex-col sm:flex-row gap-4 sm:gap-0">

        <div className="hidden sm:block" style={{ flex: 1 }}></div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--text)', fontWeight: 800 }}>
            <Sun size={22} style={{ color: '#f59e0b' }} className="animate-[spin_10s_linear_infinite]" />
            <span style={{ fontSize: '1.1rem', letterSpacing: '0.5px' }}>C'est les vacances d'été ! 🌴</span>
          </div>
        </div>

        <div className="flex sm:flex-1 justify-center sm:justify-end w-full sm:w-auto">
          {children}
        </div>
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
      justifyContent: 'space-between',
      position: 'relative',
      zIndex: 30
    }} className="flex-col sm:flex-row gap-4 sm:gap-0">

      {/* Espace vide à gauche pour centrer le compte à rebours */}
      <div className="hidden sm:block" style={{ flex: 1 }}></div>

      {/* Le compte à rebours au centre */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
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

      {/* Pill à droite */}
      <div className="flex sm:flex-1 justify-center sm:justify-end w-full sm:w-auto">
        {children}
      </div>
    </div>
  )
}
