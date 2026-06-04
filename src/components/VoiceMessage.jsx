// src/components/VoiceMessage.jsx
import { useState, useRef, useEffect, useCallback } from 'react'
import { Play, Pause } from 'lucide-react'
import { formatVoiceDuration } from '../utils/audio'

const SPEEDS = [1, 1.5, 2]
const BARS = 40

export default function VoiceMessage({ attachment, isOwn }) {
  const { url, waveform = [], duration = 0 } = attachment
  const audioRef = useRef(null)
  const rafRef = useRef(null)

  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState(0) // 0-1
  const [currentTime, setCurrentTime] = useState(0)
  const [speedIdx, setSpeedIdx] = useState(0)
  const [totalDuration, setTotalDuration] = useState(duration)

  // Normalise waveform to exactly BARS values
  const bars = waveform.length === BARS
    ? waveform
    : Array.from({ length: BARS }, (_, i) => {
        const idx = Math.floor((i / BARS) * Math.max(waveform.length, 1))
        return waveform[idx] ?? 0.3
      })

  const updateProgress = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    const dur = (isFinite(audio.duration) ? audio.duration : null) || totalDuration || 1
    setCurrentTime(audio.currentTime)
    setProgress(audio.currentTime / dur)
    if (!audio.paused) rafRef.current = requestAnimationFrame(updateProgress)
  }, [totalDuration])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const onLoaded = () => { if (isFinite(audio.duration)) setTotalDuration(audio.duration) }
    const onEnded = () => {
      setIsPlaying(false)
      setProgress(0)
      setCurrentTime(0)
      cancelAnimationFrame(rafRef.current)
    }

    audio.addEventListener('loadedmetadata', onLoaded)
    audio.addEventListener('ended', onEnded)
    return () => {
      audio.pause()
      cancelAnimationFrame(rafRef.current)
      audio.removeEventListener('loadedmetadata', onLoaded)
      audio.removeEventListener('ended', onEnded)
    }
  }, [])

  const togglePlay = () => {
    const audio = audioRef.current
    if (!audio) return
    if (isPlaying) {
      audio.pause()
      cancelAnimationFrame(rafRef.current)
      setIsPlaying(false)
    } else {
      audio.play()
      setIsPlaying(true)
      rafRef.current = requestAnimationFrame(updateProgress)
    }
  }

  const cycleSpeed = () => {
    const next = (speedIdx + 1) % SPEEDS.length
    setSpeedIdx(next)
    if (audioRef.current) audioRef.current.playbackRate = SPEEDS[next]
  }

  const seek = (e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    const audio = audioRef.current
    if (!audio) return
    const dur = audio.duration || totalDuration
    if (!dur) return
    audio.currentTime = ratio * dur
    setProgress(ratio)
    setCurrentTime(audio.currentTime)
  }

  const played = Math.round(progress * BARS)
  const displayTime = isPlaying || progress > 0 ? currentTime : (totalDuration || duration)

  return (
    <div className="flex items-center gap-2 w-full">
      <audio ref={audioRef} src={url} preload="metadata" />

      {/* Play/Pause */}
      <button
        type="button"
        onClick={togglePlay}
        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
          isOwn ? 'bg-white/20 hover:bg-white/30' : 'bg-blue-600 hover:bg-blue-700'
        }`}
      >
        {isPlaying
          ? <Pause size={16} className="text-white" fill="currentColor" />
          : <Play size={16} className="text-white" fill="currentColor" />
        }
      </button>

      <div className="flex flex-col gap-1 flex-1 min-w-0">
        {/* Waveform cliquable */}
        <div
          className="flex items-end gap-px cursor-pointer"
          style={{ height: 24 }}
          onClick={seek}
        >
          {bars.map((amp, i) => {
            const isPlayed = i < played
            return (
              <div
                key={i}
                className={`rounded-full transition-colors duration-75 ${
                  isPlayed
                    ? (isOwn ? 'bg-white' : 'bg-blue-500')
                    : (isOwn ? 'bg-white/40' : 'bg-gray-300 dark:bg-slate-500')
                }`}
                style={{ flex: '1 1 3px', height: `${Math.max(3, Math.round(amp * 24))}px` }}
              />
            )
          })}
        </div>

        {/* Timer + vitesse */}
        <div className="flex items-center justify-between">
          <span className={`text-xs font-mono ${isOwn ? 'text-white/80' : 'text-gray-500 dark:text-gray-400'}`}>
            {formatVoiceDuration(displayTime)}
          </span>
          <button
            type="button"
            onClick={cycleSpeed}
            className={`text-xs font-bold px-1.5 py-0.5 rounded-md ${
              isOwn
                ? 'bg-white/20 text-white hover:bg-white/30'
                : 'bg-gray-200 dark:bg-slate-600 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-slate-500'
            }`}
          >
            {SPEEDS[speedIdx]}x
          </button>
        </div>
      </div>
    </div>
  )
}
