// src/utils/audio.js
import { SOCKET_URL } from './chat'

const WAVEFORM_BARS = 60

/**
 * Démarre l'enregistrement audio.
 * Retourne { stop } — appeler stop() pour terminer et obtenir le résultat.
 *
 * @param {(amplitudes: number[]) => void} onFrame - appelé ~30fps avec les 60 amplitudes live
 * @returns {{ stop: () => Promise<{blob, waveform, duration}> }}
 */
export function startRecording(onFrame) {
  let mediaStream = null
  let mediaRecorder = null
  let audioContext = null
  let analyser = null
  let animFrameId = null
  let chunks = []
  let startTime = Date.now()

  // Amplitudes collectées toutes les ~200ms pour le waveform final
  const sampledAmplitudes = []
  let lastSampleTime = 0

  const promise = navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
    mediaStream = stream
    audioContext = new AudioContext()
    analyser = audioContext.createAnalyser()
    analyser.fftSize = 256

    const source = audioContext.createMediaStreamSource(stream)
    source.connect(analyser)

    const dataArray = new Uint8Array(analyser.frequencyBinCount)

    function drawFrame() {
      analyser.getByteFrequencyData(dataArray)
      const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length / 255

      const now = Date.now()
      if (now - lastSampleTime > 200) {
        sampledAmplitudes.push(avg)
        lastSampleTime = now
      }

      const live = Array.from({ length: WAVEFORM_BARS }, (_, i) => {
        const idx = Math.floor((i / WAVEFORM_BARS) * sampledAmplitudes.length)
        return sampledAmplitudes[idx] ?? avg
      })
      live[live.length - 1] = avg

      onFrame(live)
      animFrameId = requestAnimationFrame(drawFrame)
    }
    drawFrame()

    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : 'audio/webm'
    mediaRecorder = new MediaRecorder(stream, { mimeType })
    mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data) }
    mediaRecorder.start(100)
  })

  const stop = async () => {
    await promise
    cancelAnimationFrame(animFrameId)
    mediaStream.getTracks().forEach((t) => t.stop())

    const duration = (Date.now() - startTime) / 1000

    await new Promise((resolve) => {
      mediaRecorder.onstop = resolve
      mediaRecorder.stop()
    })

    audioContext.close()
    const blob = new Blob(chunks, { type: mediaRecorder.mimeType })

    const raw = sampledAmplitudes.length > 0 ? sampledAmplitudes : [0]
    const max = Math.max(...raw, 0.01)
    const waveform = Array.from({ length: WAVEFORM_BARS }, (_, i) => {
      const idx = Math.floor((i / WAVEFORM_BARS) * raw.length)
      return +(raw[idx] / max).toFixed(3)
    })

    return { blob, waveform, duration }
  }

  return { stop }
}

/**
 * Upload un blob audio vers /api/voice/upload.
 * Retourne l'attachment { url, mimetype, duration, waveform } ou null si erreur.
 */
export async function uploadVoiceMessage(blob, waveform, duration, getToken, setUploading) {
  if (setUploading) setUploading(true)
  try {
    const formData = new FormData()
    formData.append('audio', blob, 'voice.webm')
    formData.append('duration', String(duration))
    formData.append('waveform', JSON.stringify(waveform))

    const res = await fetch(`${SOCKET_URL}/api/voice/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${getToken()}` },
      body: formData,
    })

    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.error || 'Erreur upload vocal')
    }
    const data = await res.json()
    // Make URL absolute for dev (SOCKET_URL = 'http://localhost:3001') since audio src needs it
    if (data.url && !data.url.startsWith('http') && SOCKET_URL) {
      data.url = `${SOCKET_URL}${data.url}`
    }
    return data
  } catch (err) {
    console.error('[VoiceUpload]', err)
    alert(err.message || "Erreur lors de l'envoi du vocal")
    return null
  } finally {
    if (setUploading) setUploading(false)
  }
}

/** Formate une durée en secondes → "0:07" */
export function formatVoiceDuration(seconds) {
  if (!isFinite(seconds) || isNaN(seconds) || seconds < 0) return '0:00'
  const s = Math.floor(seconds)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}
