import { useEffect, useRef, useState } from 'react'
import { Phone, PhoneOff, Video, VideoOff, Mic, MicOff, PhoneIncoming } from 'lucide-react'
import { useCall } from '../contexts/CallContext'

// ─── Ringtone helper ──────────────────────────────────────────────────────────

// Sonnerie côté récepteur : bip court à 480 Hz toutes les 1.8s
function useRingtone(active) {
  const timerRef = useRef(null)

  useEffect(() => {
    if (!active) { clearInterval(timerRef.current); return }

    function beep() {
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)()
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain); gain.connect(ctx.destination)
        osc.type = 'sine'; osc.frequency.value = 480
        gain.gain.setValueAtTime(0.18, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6)
        osc.start(); osc.stop(ctx.currentTime + 0.6)
        osc.onended = () => ctx.close()
      } catch (_) {}
    }

    beep()
    timerRef.current = setInterval(beep, 1800)
    return () => clearInterval(timerRef.current)
  }, [active])
}

// Ringback côté appelant : double bip grave (440/480 Hz) + silence, comme une vraie sonnerie téléphonique
function useRingback(active) {
  const timerRef = useRef(null)

  useEffect(() => {
    if (!active) { clearInterval(timerRef.current); return }

    function ring() {
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)()
        const gain = ctx.createGain()
        gain.connect(ctx.destination)
        gain.gain.setValueAtTime(0.12, ctx.currentTime)

        // Premier bip
        const osc1 = ctx.createOscillator()
        osc1.connect(gain); osc1.type = 'sine'; osc1.frequency.value = 440
        osc1.start(ctx.currentTime); osc1.stop(ctx.currentTime + 0.4)

        // Deuxième bip (après 0.5s)
        const osc2 = ctx.createOscillator()
        osc2.connect(gain); osc2.type = 'sine'; osc2.frequency.value = 480
        osc2.start(ctx.currentTime + 0.5); osc2.stop(ctx.currentTime + 0.9)

        osc2.onended = () => ctx.close()
      } catch (_) {}
    }

    ring()
    timerRef.current = setInterval(ring, 3200) // double-bip puis silence ~2s
    return () => clearInterval(timerRef.current)
  }, [active])
}

// ─── Duration timer ───────────────────────────────────────────────────────────

function useDuration(active) {
  const [secs, setSecs] = useState(0)
  useEffect(() => {
    if (!active) { setSecs(0); return }
    const id = setInterval(() => setSecs(s => s + 1), 1000)
    return () => clearInterval(id)
  }, [active])
  const m = String(Math.floor(secs / 60)).padStart(2, '0')
  const s = String(secs % 60).padStart(2, '0')
  return `${m}:${s}`
}

// ─── Video element ────────────────────────────────────────────────────────────

function VideoStream({ stream, muted = false, className = '' }) {
  const ref = useRef(null)
  useEffect(() => {
    if (ref.current && stream) ref.current.srcObject = stream
  }, [stream])
  return (
    <video
      ref={ref}
      autoPlay
      playsInline
      muted={muted}
      className={className}
    />
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function CallUI() {
  const { incomingCall, activeCall, localStreamRef, acceptCall, declineCall, endCall, toggleMute, toggleCamera } = useCall()

  useRingtone(!!incomingCall)
  useRingback(activeCall?.status === 'calling')
  const duration = useDuration(activeCall?.status === 'connected')

  // ── Incoming call modal ──────────────────────────────────────────────
  if (incomingCall && !activeCall) {
    const isVideo = incomingCall.callType === 'video'
    return (
      <div
        className="fixed inset-0 z-[9999] flex items-center justify-center"
        style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)' }}
      >
        <div
          className="relative flex flex-col items-center gap-5 rounded-2xl px-8 py-8 w-[320px]"
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            boxShadow: '0 24px 64px rgba(0,0,0,0.35)',
          }}
        >
          {/* Animated ring */}
          <div className="relative flex items-center justify-center">
            <span
              className="absolute rounded-full animate-ping"
              style={{
                width: 80, height: 80,
                background: isVideo ? 'rgba(29,78,216,0.15)' : 'rgba(34,197,94,0.15)',
              }}
            />
            <div
              className="relative flex items-center justify-center rounded-full"
              style={{
                width: 64, height: 64,
                background: isVideo ? 'rgba(29,78,216,0.18)' : 'rgba(34,197,94,0.18)',
                border: `2px solid ${isVideo ? 'rgba(91,155,255,0.5)' : 'rgba(74,222,128,0.5)'}`,
              }}
            >
              {isVideo
                ? <Video size={28} style={{ color: 'var(--accent)' }} />
                : <Phone size={28} style={{ color: '#22c55e' }} />
              }
            </div>
          </div>

          <div className="flex flex-col items-center gap-1 text-center">
            <p className="text-xs font-medium uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
              {isVideo ? 'Appel vidéo entrant' : 'Appel audio entrant'}
            </p>
            <p className="text-xl font-semibold" style={{ color: 'var(--text)', fontFamily: 'var(--font-display)' }}>
              {incomingCall.callerName}
            </p>
            {incomingCall.isGroup && incomingCall.groupName && (
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                Groupe · {incomingCall.groupName}
              </p>
            )}
          </div>

          <div className="flex items-center gap-5 mt-2">
            <button
              onClick={declineCall}
              className="flex items-center justify-center rounded-full transition-transform hover:scale-110 active:scale-95"
              style={{
                width: 56, height: 56,
                background: '#ef4444',
                boxShadow: '0 4px 16px rgba(239,68,68,0.4)',
              }}
              title="Refuser"
            >
              <PhoneOff size={22} color="#fff" />
            </button>
            <button
              onClick={acceptCall}
              className="flex items-center justify-center rounded-full transition-transform hover:scale-110 active:scale-95"
              style={{
                width: 56, height: 56,
                background: '#22c55e',
                boxShadow: '0 4px 16px rgba(34,197,94,0.4)',
              }}
              title="Accepter"
            >
              <PhoneIncoming size={22} color="#fff" />
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Active call overlay ──────────────────────────────────────────────
  if (activeCall) {
    const isVideo = activeCall.callType === 'video'
    const isCalling = activeCall.status === 'calling'
    const isBusy = activeCall.status === 'busy'

    const remoteStreams = Object.values(activeCall.remoteStreams || {})
    const hasRemote = remoteStreams.length > 0

    if (isVideo) {
      return (
        <div
          className="fixed z-[9998] rounded-2xl overflow-hidden shadow-2xl"
          style={{
            bottom: 24, right: 24,
            width: 360, height: 240,
            background: '#0a0a0a',
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          {/* Remote video (main) */}
          {hasRemote ? (
            <VideoStream
              stream={remoteStreams[0]}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-2">
              <Video size={32} color="rgba(255,255,255,0.3)" />
              <p className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
                {isCalling ? 'Appel en cours…' : isBusy ? 'Occupé' : 'Connexion…'}
              </p>
            </div>
          )}

          {/* Local video PiP */}
          {localStreamRef.current && !activeCall.cameraOff && (
            <div
              className="absolute rounded-xl overflow-hidden"
              style={{
                bottom: 52, right: 8,
                width: 80, height: 60,
                border: '1.5px solid rgba(255,255,255,0.25)',
              }}
            >
              <VideoStream
                stream={localStreamRef.current}
                muted
                className="w-full h-full object-cover scale-x-[-1]"
              />
            </div>
          )}

          {/* Controls bar */}
          <div
            className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-3 py-2"
            style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)' }}
          >
            <span className="text-xs font-medium truncate max-w-[120px]" style={{ color: 'rgba(255,255,255,0.8)' }}>
              {activeCall.isGroup ? activeCall.groupName : ''}
              {activeCall.status === 'connected' && ` · ${duration}`}
            </span>
            <div className="flex items-center gap-2">
              <CtrlBtn onClick={toggleMute} active={activeCall.muted} activeColor="#ef4444" label={activeCall.muted ? 'Activer micro' : 'Couper micro'}>
                {activeCall.muted ? <MicOff size={14} /> : <Mic size={14} />}
              </CtrlBtn>
              <CtrlBtn onClick={toggleCamera} active={activeCall.cameraOff} activeColor="#ef4444" label={activeCall.cameraOff ? 'Activer caméra' : 'Couper caméra'}>
                {activeCall.cameraOff ? <VideoOff size={14} /> : <Video size={14} />}
              </CtrlBtn>
              <button
                onClick={() => endCall()}
                className="flex items-center justify-center rounded-full transition-transform hover:scale-110 active:scale-95"
                style={{ width: 30, height: 30, background: '#ef4444' }}
                title="Raccrocher"
              >
                <PhoneOff size={14} color="#fff" />
              </button>
            </div>
          </div>
        </div>
      )
    }

    // Audio only
    return (
      <div
        className="fixed z-[9998] flex items-center gap-3 rounded-2xl px-4 py-3"
        style={{
          bottom: 24, right: 24,
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
          minWidth: 220,
        }}
      >
        <div
          className="flex items-center justify-center rounded-full flex-shrink-0"
          style={{
            width: 40, height: 40,
            background: 'rgba(34,197,94,0.15)',
            border: '1.5px solid rgba(34,197,94,0.35)',
          }}
        >
          <Phone size={18} color="#22c55e" />
        </div>

        <div className="flex flex-col min-w-0">
          <span className="text-sm font-semibold truncate" style={{ color: 'var(--text)', fontFamily: 'var(--font-display)' }}>
            {activeCall.isGroup ? activeCall.groupName : 'Appel audio'}
          </span>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {isCalling ? 'Appel en cours…' : isBusy ? 'Occupé' : activeCall.status === 'connected' ? duration : 'Connexion…'}
          </span>
        </div>

        <div className="flex items-center gap-2 ml-auto flex-shrink-0">
          <CtrlBtn onClick={toggleMute} active={activeCall.muted} activeColor="#ef4444" label={activeCall.muted ? 'Activer micro' : 'Couper micro'}>
            {activeCall.muted ? <MicOff size={14} /> : <Mic size={14} />}
          </CtrlBtn>
          <button
            onClick={() => endCall()}
            className="flex items-center justify-center rounded-full transition-transform hover:scale-110 active:scale-95"
            style={{ width: 30, height: 30, background: '#ef4444' }}
            title="Raccrocher"
          >
            <PhoneOff size={14} color="#fff" />
          </button>
        </div>
      </div>
    )
  }

  return null
}

function CtrlBtn({ onClick, active, activeColor, children, label }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center justify-center rounded-full transition-transform hover:scale-110 active:scale-95"
      style={{
        width: 30, height: 30,
        background: active ? activeColor : 'rgba(255,255,255,0.15)',
        color: '#fff',
      }}
      title={label}
    >
      {children}
    </button>
  )
}
