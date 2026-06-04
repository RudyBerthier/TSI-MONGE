// src/components/VoiceRecorder.jsx
import { useState, useEffect, useRef, useCallback } from 'react'
import { X, Send, Square } from 'lucide-react'
import { startRecording } from '../utils/audio'

const BARS = 60

export default function VoiceRecorder({ onSend, onCancel, compact = false }) {
  const [phase, setPhase] = useState('idle') // 'idle' | 'recording' | 'stopped'
  const [elapsed, setElapsed] = useState(0)
  const [amplitudes, setAmplitudes] = useState(Array(BARS).fill(0.1))
  const recorderRef = useRef(null)
  const timerRef = useRef(null)
  const resultRef = useRef(null) // { blob, waveform, duration }

  const startRec = useCallback(async () => {
    try {
      recorderRef.current = startRecording((live) => setAmplitudes([...live]))
      setPhase('recording')
      setElapsed(0)
      timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000)
    } catch {
      alert("Impossible d'accéder au microphone")
      onCancel()
    }
  }, [onCancel])

  useEffect(() => {
    startRec()
    return () => {
      clearInterval(timerRef.current)
      if (recorderRef.current) {
        recorderRef.current.stop().catch(() => {})
      }
    }
  }, [startRec])

  const stopRec = async () => {
    clearInterval(timerRef.current)
    if (!recorderRef.current) return
    const result = await recorderRef.current.stop()
    resultRef.current = result
    setPhase('stopped')
  }

  const handleSend = () => {
    if (resultRef.current) onSend(resultRef.current)
  }

  const handleCancel = async () => {
    clearInterval(timerRef.current)
    if (recorderRef.current && phase === 'recording') {
      await recorderRef.current.stop().catch(() => {})
    }
    onCancel()
  }

  const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
  const barH = compact ? 20 : 28

  return (
    <div className="flex items-center gap-2 w-full">
      {/* Annuler */}
      <button
        type="button"
        onClick={handleCancel}
        className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full flex-shrink-0"
      >
        <X size={compact ? 18 : 20} />
      </button>

      {/* Waveform live */}
      <div className="flex-1 flex items-end gap-px overflow-hidden" style={{ height: barH }}>
        {amplitudes.map((amp, i) => (
          <div
            key={i}
            className={`flex-1 rounded-full transition-all duration-75 ${
              phase === 'recording' ? 'bg-red-500' : 'bg-blue-500'
            }`}
            style={{ height: `${Math.max(3, Math.round(amp * barH))}px` }}
          />
        ))}
      </div>

      {/* Timer */}
      <span className={`text-sm font-mono flex-shrink-0 ${phase === 'recording' ? 'text-red-500' : 'text-gray-600 dark:text-gray-300'}`}>
        {fmt(elapsed)}
      </span>

      {/* Stop ou Envoyer */}
      {phase === 'recording' ? (
        <button
          type="button"
          onClick={stopRec}
          className="p-2 bg-red-500 text-white rounded-full flex-shrink-0 hover:bg-red-600"
        >
          <Square size={compact ? 16 : 18} fill="currentColor" />
        </button>
      ) : phase === 'stopped' ? (
        <button
          type="button"
          onClick={handleSend}
          className="p-2 bg-blue-600 text-white rounded-full flex-shrink-0 hover:bg-blue-700"
        >
          <Send size={compact ? 16 : 18} />
        </button>
      ) : null}
    </div>
  )
}
