# Voice Messages Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Ajouter des messages vocaux avec waveform animée (style Instagram) et vitesses de lecture 1x/1.5x/2x dans tous les contextes de chat (groupe, DM, groupes custom), dans Chat.jsx et ChatWidget.jsx.

**Architecture:** Le client enregistre l'audio via `MediaRecorder` + analyse le signal avec `Web Audio API` pour générer un waveform (60 amplitudes). L'audio est uploadé vers Supabase Storage via un endpoint serveur dédié. L'attachment vocal est envoyé via socket comme les fichiers existants, avec `mimetype: 'audio/webm'` en plus des champs `waveform` et `duration`. `renderAttachment()` détecte `audio/` et rend `VoiceMessage` au lieu du composant fichier.

**Tech Stack:** MediaRecorder API, Web Audio API (AnalyserNode), Supabase Storage, React hooks, Tailwind CSS, Lucide React icons, socket.io-client existant.

---

### Pré-requis Supabase (faire avant de coder)

1. Dans le dashboard Supabase → Storage → créer un bucket nommé `voice-messages`
2. Le rendre **public** (toggle "Public bucket")
3. Dans `.env` du serveur, ajouter : `SUPABASE_SERVICE_KEY=<ta service role key>` (Settings → API → service_role)

---

### Task 1 : Serveur — client Supabase admin + route upload vocal

**Files:**
- Create: `server/config/supabase-admin.js`
- Create: `server/routes/voice-upload.js`
- Modify: `server/index.js` (ajouter la route)

**Step 1 : Créer le client Supabase avec service role key**

```js
// server/config/supabase-admin.js
const { createClient } = require('@supabase/supabase-js')

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

module.exports = supabaseAdmin
```

**Step 2 : Créer la route d'upload vocal**

```js
// server/routes/voice-upload.js
const express = require('express')
const multer = require('multer')
const { authenticateToken } = require('./auth')
const supabaseAdmin = require('../config/supabase-admin')

const router = express.Router()

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('audio/')) cb(null, true)
    else cb(new Error('Seuls les fichiers audio sont acceptés'), false)
  }
})

router.post('/', authenticateToken, upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Aucun fichier audio fourni' })

    const duration = parseFloat(req.body.duration) || 0
    const waveform = JSON.parse(req.body.waveform || '[]')

    const filename = `${req.user.id}_${Date.now()}.webm`
    const { error } = await supabaseAdmin.storage
      .from('voice-messages')
      .upload(filename, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: false
      })

    if (error) {
      console.error('[VoiceUpload] Supabase error:', error.message)
      return res.status(500).json({ error: 'Erreur stockage audio' })
    }

    const { data: publicData } = supabaseAdmin.storage
      .from('voice-messages')
      .getPublicUrl(filename)

    res.json({
      url: publicData.publicUrl,
      mimetype: req.file.mimetype,
      duration,
      waveform
    })
  } catch (err) {
    console.error('[VoiceUpload] Error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

router.use((err, req, res, next) => {
  if (err) return res.status(400).json({ error: err.message })
  next()
})

module.exports = router
```

**Step 3 : Enregistrer la route dans server/index.js**

Trouve dans `server/index.js` la section où les routes sont enregistrées (cherche `app.use('/api/chat'`).
Ajoute juste après :

```js
const voiceUploadRouter = require('./routes/voice-upload')
app.use('/api/voice/upload', voiceUploadRouter)
```

**Step 4 : Vérifier que le serveur démarre sans erreur**

```bash
cd C:/Users/theob/Downloads/TSI-MONGE
node server/index.js
```

Expected: aucune erreur au démarrage.

**Step 5 : Commit**

```bash
git add server/config/supabase-admin.js server/routes/voice-upload.js server/index.js
git commit -m "feat: add voice upload route to Supabase Storage"
```

---

### Task 2 : Client — utilitaires audio (src/utils/audio.js)

**Files:**
- Create: `src/utils/audio.js`

**Step 1 : Créer le fichier**

```js
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

  // Amplitudes collectées toutes les ~300ms pour le waveform final
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

    // Boucle d'animation pour le visuel live
    function drawFrame() {
      analyser.getByteFrequencyData(dataArray)
      // Amplitude moyenne normalisée 0-1
      const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length / 255

      // Échantillonner toutes les 200ms pour le waveform final
      const now = Date.now()
      if (now - lastSampleTime > 200) {
        sampledAmplitudes.push(avg)
        lastSampleTime = now
      }

      // Générer 60 valeurs live pour l'affichage (on répète les dernières valeurs)
      const live = Array.from({ length: WAVEFORM_BARS }, (_, i) => {
        const idx = Math.floor((i / WAVEFORM_BARS) * sampledAmplitudes.length)
        return sampledAmplitudes[idx] ?? avg
      })
      // Remplacer la dernière barre par l'amplitude live actuelle
      live[live.length - 1] = avg

      onFrame(live)
      animFrameId = requestAnimationFrame(drawFrame)
    }
    drawFrame()

    // MediaRecorder
    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : 'audio/webm'
    mediaRecorder = new MediaRecorder(stream, { mimeType })
    mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data) }
    mediaRecorder.start(100) // collecte toutes les 100ms
  })

  const stop = () =>
    new Promise(async (resolve, reject) => {
      try {
        await promise // attendre que l'init soit terminée
        cancelAnimationFrame(animFrameId)
        mediaStream.getTracks().forEach((t) => t.stop())

        const duration = (Date.now() - startTime) / 1000

        mediaRecorder.onstop = () => {
          audioContext.close()
          const blob = new Blob(chunks, { type: mediaRecorder.mimeType })

          // Normaliser le waveform sur WAVEFORM_BARS barres
          const raw = sampledAmplitudes.length > 0 ? sampledAmplitudes : [0]
          const max = Math.max(...raw, 0.01)
          const waveform = Array.from({ length: WAVEFORM_BARS }, (_, i) => {
            const idx = Math.floor((i / WAVEFORM_BARS) * raw.length)
            return +(raw[idx] / max).toFixed(3)
          })

          resolve({ blob, waveform, duration })
        }
        mediaRecorder.stop()
      } catch (err) {
        reject(err)
      }
    })

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
    return await res.json()
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
  const s = Math.floor(seconds)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}
```

**Step 2 : Commit**

```bash
git add src/utils/audio.js
git commit -m "feat: add audio recording and upload utilities"
```

---

### Task 3 : Composant VoiceRecorder (enregistrement)

**Files:**
- Create: `src/components/VoiceRecorder.jsx`

**Step 1 : Créer le composant**

```jsx
// src/components/VoiceRecorder.jsx
import { useState, useEffect, useRef, useCallback } from 'react'
import { Mic, X, Send, Square } from 'lucide-react'
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
    return () => clearInterval(timerRef.current)
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

  const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
  const barH = compact ? 20 : 28 // hauteur max des barres en px

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
      <div className="flex-1 flex items-center gap-px overflow-hidden" style={{ height: barH }}>
        {amplitudes.map((amp, i) => (
          <div
            key={i}
            className={`flex-1 rounded-full transition-all duration-75 ${
              phase === 'recording' ? 'bg-red-500' : 'bg-blue-500'
            }`}
            style={{ height: `${Math.max(15, amp * 100)}%` }}
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
      ) : (
        <button
          type="button"
          onClick={handleSend}
          className="p-2 bg-blue-600 text-white rounded-full flex-shrink-0 hover:bg-blue-700"
        >
          <Send size={compact ? 16 : 18} />
        </button>
      )}
    </div>
  )
}
```

**Step 2 : Commit**

```bash
git add src/components/VoiceRecorder.jsx
git commit -m "feat: add VoiceRecorder component with live waveform"
```

---

### Task 4 : Composant VoiceMessage (lecteur)

**Files:**
- Create: `src/components/VoiceMessage.jsx`

**Step 1 : Créer le composant**

```jsx
// src/components/VoiceMessage.jsx
import { useState, useRef, useEffect, useCallback } from 'react'
import { Play, Pause } from 'lucide-react'
import { formatVoiceDuration } from '../utils/audio'

const SPEEDS = [1, 1.5, 2]
const BARS = 60

export default function VoiceMessage({ attachment, isOwn }) {
  const { url, waveform = [], duration = 0 } = attachment
  const audioRef = useRef(null)
  const rafRef = useRef(null)

  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState(0) // 0-1
  const [currentTime, setCurrentTime] = useState(0)
  const [speedIdx, setSpeedIdx] = useState(0)
  const [totalDuration, setTotalDuration] = useState(duration)

  // Normaliser le waveform (s'assurer qu'on a BARS valeurs)
  const bars = waveform.length === BARS
    ? waveform
    : Array.from({ length: BARS }, (_, i) => {
        const idx = Math.floor((i / BARS) * waveform.length)
        return waveform[idx] ?? 0.3
      })

  const updateProgress = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    const dur = audio.duration || totalDuration || 1
    setCurrentTime(audio.currentTime)
    setProgress(audio.currentTime / dur)
    if (!audio.paused) rafRef.current = requestAnimationFrame(updateProgress)
  }, [totalDuration])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const onLoaded = () => setTotalDuration(audio.duration)
    const onEnded = () => {
      setIsPlaying(false)
      setProgress(0)
      setCurrentTime(0)
      cancelAnimationFrame(rafRef.current)
    }

    audio.addEventListener('loadedmetadata', onLoaded)
    audio.addEventListener('ended', onEnded)
    return () => {
      audio.removeEventListener('loadedmetadata', onLoaded)
      audio.removeEventListener('ended', onEnded)
      cancelAnimationFrame(rafRef.current)
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
    audio.currentTime = ratio * (audio.duration || totalDuration)
    setProgress(ratio)
    setCurrentTime(audio.currentTime)
  }

  const played = Math.round(progress * BARS)
  const dur = totalDuration || duration || 1
  const displayTime = isPlaying || progress > 0 ? currentTime : dur

  return (
    <div className={`flex items-center gap-2 rounded-2xl px-3 py-2 min-w-[200px] max-w-[280px] ${
      isOwn ? 'bg-blue-600' : 'bg-gray-100 dark:bg-slate-700'
    }`}>
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
          ? <Pause size={16} className={isOwn ? 'text-white' : 'text-white'} fill="currentColor" />
          : <Play size={16} className={isOwn ? 'text-white' : 'text-white'} fill="currentColor" />
        }
      </button>

      <div className="flex flex-col gap-1 flex-1 min-w-0">
        {/* Waveform cliquable */}
        <div
          className="flex items-center gap-px cursor-pointer"
          style={{ height: 24 }}
          onClick={seek}
        >
          {bars.map((amp, i) => {
            const isPlayed = i < played
            return (
              <div
                key={i}
                className={`flex-1 rounded-full transition-colors duration-75 ${
                  isPlayed
                    ? (isOwn ? 'bg-white' : 'bg-blue-500')
                    : (isOwn ? 'bg-white/40' : 'bg-gray-300 dark:bg-slate-500')
                }`}
                style={{ height: `${Math.max(20, amp * 100)}%` }}
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
```

**Step 2 : Commit**

```bash
git add src/components/VoiceMessage.jsx
git commit -m "feat: add VoiceMessage player component with waveform and speed control"
```

---

### Task 5 : Intégration dans Chat.jsx (page complète)

**Files:**
- Modify: `src/pages/Chat.jsx`

**Step 1 : Ajouter les imports en haut du fichier**

Trouve la section des imports dans `src/pages/Chat.jsx`. Ajoute :

```js
import { Mic } from 'lucide-react'
import VoiceRecorder from '../components/VoiceRecorder'
import VoiceMessage from '../components/VoiceMessage'
import { uploadVoiceMessage } from '../utils/audio'
```

**Step 2 : Ajouter l'état isRecording**

Trouve le bloc des `useState` dans Chat.jsx (cherche `const [uploading`). Ajoute juste après :

```js
const [isRecording, setIsRecording] = useState(false)
```

**Step 3 : Ajouter le handler d'envoi vocal**

Juste après `handleSendCustomGroup`, ajoute :

```js
const handleSendVoice = async ({ blob, waveform, duration }) => {
  setIsRecording(false)
  const attachment = await uploadVoiceMessage(blob, waveform, duration, getToken, setUploading)
  if (!attachment) return

  if (currentView === 'group') {
    socket.emit('message:send', { content: '', replyTo: null, attachment })
  } else if (currentView === 'dm' && selectedDm) {
    socket.emit('dm:send', { targetUserId: selectedDm.id, content: '', replyTo: null, attachment })
  } else if (currentView === 'customGroup' && selectedGroup) {
    socket.emit('group:send', { groupId: selectedGroup.id, content: '', replyTo: null, attachment })
  }
}
```

**Step 4 : Modifier renderAttachment pour gérer les vocaux**

Dans `renderAttachment`, trouve `if (!attachment) return null` et ajoute juste après :

```js
// Message vocal
if (attachment.mimetype?.startsWith('audio/')) {
  return <VoiceMessage attachment={attachment} isOwn={isOwn} />
}
```

**Step 5 : Modifier la zone d'input pour afficher VoiceRecorder ou ajouter le bouton micro**

Trouve la section `<form ...>` du bas (input zone). Remplace tout le `<div className="flex gap-2">` (celui qui contient Paperclip + input + Send) par :

```jsx
{isRecording ? (
  <VoiceRecorder
    onSend={handleSendVoice}
    onCancel={() => setIsRecording(false)}
  />
) : (
  <div className="flex gap-2">
    <button
      type="button"
      onClick={() => fileInputRef.current?.click()}
      disabled={!connected || uploading}
      className="p-3 text-gray-500 hover:text-blue-600 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-xl disabled:opacity-50"
    >
      <Paperclip size={20} />
    </button>
    <input
      ref={inputRef}
      type="text"
      value={newMessage}
      onChange={handleInputChange}
      placeholder={currentView === 'group' ? "Message... (@ pour mentionner)" : "Message..."}
      disabled={!connected || uploading}
      className="flex-1 px-4 py-3 rounded-xl border border-gray-300 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 text-gray-800 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
    />
    {!newMessage.trim() && !selectedFile ? (
      <button
        type="button"
        onClick={() => setIsRecording(true)}
        disabled={!connected || uploading}
        className="p-3 text-gray-500 hover:text-red-500 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-xl disabled:opacity-50"
      >
        <Mic size={20} />
      </button>
    ) : (
      <button
        type="submit"
        disabled={(!newMessage.trim() && !selectedFile) || !connected || uploading}
        className="px-4 py-3 rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {uploading ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
      </button>
    )}
  </div>
)}
```

> Note : le bouton micro apparaît uniquement si l'input est vide et qu'il n'y a pas de fichier sélectionné. Sinon, le bouton Envoyer normal s'affiche.

**Step 6 : Commit**

```bash
git add src/pages/Chat.jsx
git commit -m "feat: integrate voice messages in Chat.jsx"
```

---

### Task 6 : Intégration dans ChatWidget.jsx

**Files:**
- Modify: `src/components/ChatWidget.jsx`

**Step 1 : Ajouter les imports**

```js
import { Mic } from 'lucide-react'
import VoiceRecorder from './VoiceRecorder'
import VoiceMessage from './VoiceMessage'
import { uploadVoiceMessage } from '../utils/audio'
```

**Step 2 : Ajouter l'état isRecording**

Cherche `const [uploading` dans ChatWidget.jsx, ajoute après :

```js
const [isRecording, setIsRecording] = useState(false)
```

**Step 3 : Ajouter handleSendVoice**

Juste après `handleSendCustomGroup` dans ChatWidget.jsx :

```js
const handleSendVoice = async ({ blob, waveform, duration }) => {
  setIsRecording(false)
  const attachment = await uploadVoiceMessage(blob, waveform, duration, getToken, setUploading)
  if (!attachment) return

  if (activeTab === 'group') {
    socket.emit('message:send', { content: '', replyTo: null, attachment })
  } else if (activeTab === 'dm' && selectedDm) {
    socket.emit('dm:send', { targetUserId: selectedDm.id, content: '', replyTo: null, attachment })
  } else if (activeTab === 'customGroup' && selectedGroup) {
    socket.emit('group:send', { groupId: selectedGroup.id, content: '', replyTo: null, attachment })
  }
}
```

> Note : dans ChatWidget.jsx, l'état qui contrôle la vue active s'appelle peut-être `activeTab` ou `currentView`. Adapte en fonction du nom réel trouvé dans le fichier.

**Step 4 : Modifier renderAttachment dans ChatWidget.jsx**

Même modification que dans Chat.jsx — ajoute après `if (!attachment) return null` :

```js
if (attachment.mimetype?.startsWith('audio/')) {
  return <VoiceMessage attachment={attachment} isOwn={isOwn} />
}
```

**Step 5 : Modifier les 3 zones d'input (groupe, DM, groupes custom)**

Pour chaque zone d'input (`<form ...>` avec `<div className="flex gap-2">`), remplace le div intérieur par le même pattern qu'en Task 5 Step 5, avec `compact` en prop de VoiceRecorder :

```jsx
{isRecording ? (
  <VoiceRecorder
    onSend={handleSendVoice}
    onCancel={() => setIsRecording(false)}
    compact
  />
) : (
  <div className="flex gap-2">
    {/* ... boutons Paperclip, input, micro/send inchangés ... */}
    {/* Même logique : micro si input vide, Send sinon */}
    {!newMessage.trim() && !selectedFile ? (
      <button
        type="button"
        onClick={() => setIsRecording(true)}
        disabled={!connected || uploading}
        className="p-2 text-gray-500 hover:text-red-500 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full disabled:opacity-50 flex items-center justify-center"
      >
        <Mic size={18} />
      </button>
    ) : (
      <button type="submit" disabled={...} className="p-2 bg-blue-600 text-white rounded-full disabled:opacity-50 flex items-center justify-center">
        {uploading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
      </button>
    )}
  </div>
)}
```

> Applique ce pattern aux 3 zones : groupe (ligne ~1427), DM (ligne ~1659), groupes custom (ligne ~1843). Garde les `className` existants identiques, change uniquement le bouton final et entoure avec le `isRecording` ternaire.

**Step 6 : Commit**

```bash
git add src/components/ChatWidget.jsx
git commit -m "feat: integrate voice messages in ChatWidget.jsx"
```

---

### Task 7 : Test manuel final

**Vérifications à faire dans le navigateur :**

1. **Enregistrement** : cliquer sur le bouton micro → vérifier que le navigateur demande l'accès micro → les barres bougent → timer s'incrémente
2. **Stop** : cliquer Stop (carré rouge) → les barres se figent → bouton Envoyer apparaît
3. **Envoi** : cliquer Envoyer → le message vocal apparaît dans le chat des deux côtés
4. **Lecture** : cliquer Play → les barres se colorent de gauche à droite → le timer avance
5. **Seek** : cliquer au milieu du waveform → la lecture reprend depuis ce point
6. **Vitesse** : cliquer "1x" → passe à "1.5x" → puis "2x" → puis retour "1x"
7. **Annuler** : pendant l'enregistrement, cliquer X → retour à l'input normal
8. **DM** : vérifier que ça fonctionne aussi en DM et groupes custom
9. **ChatWidget** : vérifier les mêmes choses dans le widget flottant

**Si le micro ne fonctionne pas :** le navigateur requiert HTTPS ou localhost. En dev, localhost est OK.

**Si Supabase Storage rejette l'upload :** vérifier que `SUPABASE_SERVICE_KEY` est bien dans `.env` et que le bucket `voice-messages` est public.
