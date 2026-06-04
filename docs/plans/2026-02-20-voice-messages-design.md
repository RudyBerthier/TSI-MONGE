# Voice Messages — Design Document
**Date:** 2026-02-20
**Status:** Approved

## Scope
Voice messages dans tous les contextes de messagerie : chat global, DMs, groupes custom.

## Architecture

### Enregistrement
- `MediaRecorder` API pour capturer le micro (webm/ogg)
- `Web Audio API` (`AnalyserNode`) pour analyser l'amplitude en temps réel pendant l'enregistrement
- Génération d'un tableau `waveform[]` de 60 floats (0–1) représentant l'intensité

### Stockage
- Fichier audio uploadé vers **Supabase Storage** (bucket `voice-messages`)
- Nommage : `{userId}_{timestamp}.webm`
- Le tableau `waveform[]` et la `duration` sont stockés dans le payload du message (comme l'attachment actuel)

### Transport
```js
socket.emit('message:send', {
  type: 'voice',
  attachment: {
    url: 'https://...supabase.../voice-messages/userId_timestamp.webm',
    duration: 23.4,       // secondes
    waveform: [0.1, 0.8, 0.4, ...] // 60 valeurs
  }
})
```
Même structure pour dm:send et group:send.

### Composant VoiceMessage
```
VoiceMessage
├── Bouton play/pause (icône Lucide)
├── Waveform SVG (60 barres, couleur bleue = lu, gris = à venir)
├── Timer "0:07 / 0:23"
└── Bouton vitesse cyclique : 1x → 1.5x → 2x → 1x
```

### Composant VoiceRecorder (dans l'input)
```
VoiceRecorder
├── Bouton micro (maintien pour enregistrer, ou clic pour toggle)
├── Timer d'enregistrement en cours "0:12"
├── Waveform live (barres animées pendant l'enregistrement)
├── Bouton annuler (croix)
└── Bouton envoyer (check)
```

## Vitesses de lecture
3 vitesses cycliques : **1x → 1.5x → 2x → 1x**
Implémenté via `audioElement.playbackRate`

## Visuel
- Barres statiques générées à l'enregistrement via Web Audio API
- Barres à gauche du curseur : couleur primaire (bleu)
- Barres à droite du curseur : gris clair
- Animation fluide via `requestAnimationFrame` pendant la lecture

## Fichiers à créer/modifier
- `src/components/VoiceMessage.jsx` — lecteur
- `src/components/VoiceRecorder.jsx` — enregistreur
- `src/utils/audio.js` — helpers (upload Supabase, analyse waveform)
- `src/pages/Chat.jsx` — intégration VoiceRecorder + VoiceMessage
- `src/components/ChatWidget.jsx` — idem
- `server/routes/voice-upload.js` — endpoint upload vers Supabase Storage
