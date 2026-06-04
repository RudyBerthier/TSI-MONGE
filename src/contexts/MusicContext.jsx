import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';
import { useSocket } from './SocketContext';

const MusicContext = createContext(null);

export function MusicProvider({ children }) {
  const { socket } = useSocket();
  const audioRef = useRef(null);

  const [volume, setVolumeState] = useState(() => {
    const saved = localStorage.getItem('monge_private_volume');
    return saved !== null ? parseFloat(saved) : 0.7;
  });
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showPlayer, setShowPlayer] = useState(false);
  const [isFetchingReco, setIsFetchingReco] = useState(false);

  // Mode settings
  const [isRadioMode, setIsRadioMode] = useState(false);

  // Private mode states
  const [localCurrentTrack, setLocalCurrentTrack] = useState(null);
  const [localQueue, setLocalQueue] = useState([]);
  const [localHistory, setLocalHistory] = useState([]);

  // Radio mode states
  const [radioCurrentTrack, setRadioCurrentTrack] = useState(null);
  const [radioQueue, setRadioQueue] = useState([]);

  // Liked tracks state
  const [likedAudioUrls, setLikedAudioUrls] = useState(new Set());

  // Playlists state
  const [playlists, setPlaylists] = useState([]);

  const [isRestored, setIsRestored] = useState(false);

  // 1. Initial Load of Private Music State + Liked tracks + Playlists from DB
  useEffect(() => {
    const fetchMusicState = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        const res = await fetch('/api/users/music-state', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          if (data.queue && data.queue.length > 0) {
            setLocalQueue(data.queue.map(t => (!t.id || !t.id.startsWith('queue-')) ? { ...t, originalId: t.id || t._id, id: `queue-${Date.now()}-${Math.random().toString(36).substr(2, 9)}` } : t));
          }
          if (data.currentTrack) {
            setLocalCurrentTrack(data.currentTrack);
            setTimeout(() => {
              if (audioRef.current) {
                audioRef.current.src = data.currentTrack.audioUrl;
                audioRef.current.volume = volume;
                const savedTime = localStorage.getItem('monge_private_time');
                if (savedTime) {
                  const setTime = () => {
                    audioRef.current.currentTime = parseFloat(savedTime);
                    audioRef.current.removeEventListener('loadedmetadata', setTime);
                  };
                  if (audioRef.current.readyState >= 1) setTime();
                  else audioRef.current.addEventListener('loadedmetadata', setTime);
                }
              }
            }, 100);
          }
        }

        // Load liked tracks
        const likedRes = await fetch('/api/spotify/liked', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (likedRes.ok) {
          const likedData = await likedRes.json();
          setLikedAudioUrls(new Set((likedData.tracks || []).map(t => t.audio_url)));
        }

        // Load History
        const histRes = await fetch('/api/spotify/history', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (histRes.ok) {
          const histData = await histRes.json();
          if (histData.history) {
            setLocalHistory(histData.history);
          }
        }

        // Load playlists
        const plRes = await fetch('/api/playlists', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (plRes.ok) {
          const plData = await plRes.json();
          setPlaylists(plData || []);
        }
      } catch (e) {
        console.error('Failed to load music state', e);
      } finally {
        setIsRestored(true);
      }
    };
    fetchMusicState();
  }, []);

  // 2. Save Private State Back to DB on change
  useEffect(() => {
    if (!isRestored) return;
    const saveState = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        fetch('/api/users/music-state', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ queue: localQueue, currentTrack: localCurrentTrack })
        });
      } catch (e) {
        console.error('Failed to save music state', e);
      }
    };
    const t = setTimeout(saveState, 1000);
    return () => clearTimeout(t);
  }, [localQueue, localCurrentTrack, isRestored]);

  // 3. Continuous Save of Progress locally (every 1s)
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isRadioMode && isPlaying && audioRef.current) {
        localStorage.setItem('monge_private_time', audioRef.current.currentTime.toString());
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [isPlaying, isRadioMode]);

  const currentTrack = isRadioMode ? radioCurrentTrack : localCurrentTrack;
  const queue = isRadioMode ? radioQueue : localQueue;
  const history = isRadioMode ? [] : localHistory;

  const isRadioModeRef = useRef(isRadioMode);
  const volumeRef = useRef(volume);
  const localCurrentTrackRef = useRef(localCurrentTrack);
  const localHistoryRef = useRef(localHistory);
  // Tracks already played in this session — used to prevent repeat suggestions
  const playedUrlsRef = useRef(new Set());

  useEffect(() => {
    isRadioModeRef.current = isRadioMode;
    volumeRef.current = volume;
    localCurrentTrackRef.current = localCurrentTrack;
    localHistoryRef.current = localHistory;
  }, [isRadioMode, volume, localCurrentTrack, localHistory]);

  // ─── Liked tracks helpers ────────────────────────────────────────────────────
  const isLiked = useCallback((audioUrl) => {
    return likedAudioUrls.has(audioUrl);
  }, [likedAudioUrls]);

  const toggleLike = useCallback(async (track) => {
    if (!track?.audioUrl) return;
    const token = localStorage.getItem('token');
    if (!token) return;

    const alreadyLiked = likedAudioUrls.has(track.audioUrl);

    // Optimistic update
    setLikedAudioUrls(prev => {
      const next = new Set(prev);
      if (alreadyLiked) next.delete(track.audioUrl);
      else next.add(track.audioUrl);
      return next;
    });

    try {
      if (alreadyLiked) {
        await fetch('/api/spotify/like', {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ audioUrl: track.audioUrl })
        });
      } else {
        await fetch('/api/spotify/like', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: track.name, artist: track.artist, image: track.image, audioUrl: track.audioUrl })
        });
      }
      
      // Notify components that the liked playlist was updated
      const likedPlaylistId = playlists.find(p => p.is_liked_playlist)?.id;
      if (likedPlaylistId) {
        window.dispatchEvent(new CustomEvent('playlist-updated', { detail: { playlistId: likedPlaylistId } }));
      }
    } catch (err) {
      // Rollback on error
      setLikedAudioUrls(prev => {
        const next = new Set(prev);
        if (alreadyLiked) next.add(track.audioUrl);
        else next.delete(track.audioUrl);
        return next;
      });
    }
  }, [likedAudioUrls]);

  // ─── Playlists helpers ────────────────────────────────────────────────────────
  const createPlaylist = useCallback(async (name, isPublic = false) => {
    const token = localStorage.getItem('token');
    if (!token) return;
    const res = await fetch('/api/playlists', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, is_public: isPublic })
    });
    const data = await res.json();
    if (res.ok) setPlaylists(p => [data, ...p]);
    return data;
  }, []);

  const addToPlaylist = useCallback(async (playlistId, track) => {
    const token = localStorage.getItem('token');
    if (!token) return;
    const res = await fetch(`/api/playlists/${playlistId}/tracks`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: track.name, artist: track.artist, image: track.image, audioUrl: track.audioUrl })
    });
    if (res.ok || res.status === 409) {
      window.dispatchEvent(new CustomEvent('playlist-updated', { detail: { playlistId } }));
    }
  }, []);

  const removeFromPlaylist = useCallback(async (playlistId, track) => {
    const token = localStorage.getItem('token');
    if (!token) return;
    const res = await fetch(`/api/playlists/${playlistId}/tracks/remove-url`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ audioUrl: track.audioUrl })
    });
    if (res.ok) {
      window.dispatchEvent(new CustomEvent('playlist-updated', { detail: { playlistId } }));
    }
  }, []);

  const refreshPlaylists = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    const res = await fetch('/api/playlists', { headers: { 'Authorization': `Bearer ${token}` } });
    if (res.ok) setPlaylists(await res.json());
  }, []);

  // ─── Auto-Play: Fetch Recommendations ────────────────────────────────────────
  // Accepts optional sets to exclude already-played/queued tracks from results
  const fetchAndQueueRecommendations = useCallback(async (track, excludeUrls = new Set()) => {
    if (!track) return [];
    setIsFetchingReco(true);
    try {
      // Rotate seed: pick a random track from recent history for variety
      // This prevents the same Spotify seed from being used repeatedly
      const history = localHistoryRef.current || [];
      const useAlternateSeed = history.length > 2 && Math.random() > 0.4; // 60% chance to diversify
      let seedTrack = track;
      
      if (useAlternateSeed) {
        // Pick a random track from the up to 15 most recently played songs
        const recentHistory = history.slice(-15);
        const randomItem = recentHistory[Math.floor(Math.random() * recentHistory.length)];
        if (randomItem) seedTrack = { name: randomItem.name, artist: randomItem.artist };
      }

      const res = await fetch(
        `/api/spotify/recommendations?artist=${encodeURIComponent(seedTrack.artist || '')}&name=${encodeURIComponent(seedTrack.name || '')}`
      );
      if (!res.ok) return [];
      const data = await res.json();
      const recs = data.recommendations || [];
      if (recs.length === 0) return [];

      // Resolve audio URLs in parallel
      const resolved = await Promise.all(
        recs.map(async (r) => {
          try {
            const res2 = await fetch(`/api/spotify/jiosaavn-search?q=${encodeURIComponent(`${r.name} ${r.artist}`)}`);
            const d = await res2.json();
            if (res2.ok && d.audioUrl) {
              return { ...r, id: `reco-${Date.now()}-${Math.random()}`, audioUrl: d.audioUrl, image: r.image || d.image };
            }
          } catch { }
          return null;
        })
      );

      // Filter out already played, already queued, or identically named tracks
      const uniqueNewTracks = [];
      
      // Build a set of all normalized names we've seen in history, queue, and current session
      const seenNames = new Set(
        (localHistoryRef.current || []).map(t => t.name?.toLowerCase().trim())
      );
      if (track?.name) seenNames.add(track.name.toLowerCase().trim());
      
      const seenAudioUrls = new Set([...excludeUrls, ...playedUrlsRef.current]);

      for (const t of resolved) {
        if (!t || !t.audioUrl) continue;
        const normalizedName = t.name?.toLowerCase().trim();
        
        // Strict duplicate check: no identical audio URL and no identical track name!
        if (!seenAudioUrls.has(t.audioUrl) && !seenNames.has(normalizedName)) {
          uniqueNewTracks.push(t);
          seenAudioUrls.add(t.audioUrl);
          if (normalizedName) seenNames.add(normalizedName);
          
          if (uniqueNewTracks.length >= 4) break; // Maximum 4 new files generated per batch
        }
      }
      
      // Safety net: if the filter was TOO aggressive and removed literally everything, 
      // forcefully keep the very first valid track to ensure the music never stops.
      if (uniqueNewTracks.length === 0 && resolved.length > 0) {
          const fallbackTrack = resolved.find(t => t && t.audioUrl);
          if (fallbackTrack) return [fallbackTrack];
      }
      
      return uniqueNewTracks;
    } catch (err) {
      console.error('Reco fetch error:', err);
      return [];
    } finally {
      setIsFetchingReco(false);
    }
  }, []);

  // ─── Document Title ───────────────────────────────────────────────────────────
  useEffect(() => {
    const track = localCurrentTrack || radioCurrentTrack;
    if (track) {
      const name = track.name || track.track_name || 'Musique';
      const artist = track.artist || track.track_artist || '';
      document.title = artist ? `${name} • ${artist} — TSI Monge` : `${name} — TSI Monge`;
    } else {
      document.title = 'TSI Monge';
    }
  }, [localCurrentTrack, radioCurrentTrack]);

  // When queue drops to ≤ 1 track, silently fetch more recommendations in background
  // so there's never a loading pause when skipping or between tracks
  const isFetchingRecoRef = useRef(false);
  useEffect(() => {
    if (isRadioMode) return;
    if (isFetchingRecoRef.current) return;
    if (localQueue.length > 1) return;
    const baseTrack = localCurrentTrackRef.current;
    if (!baseTrack) return;

    // Build exclusion set: already played + currently queued
    const excludeUrls = new Set([
      ...playedUrlsRef.current,
      ...localQueue.map(t => t.audioUrl).filter(Boolean)
    ]);

    isFetchingRecoRef.current = true;
    fetchAndQueueRecommendations(baseTrack, excludeUrls).then(newTracks => {
      if (newTracks.length > 0) {
        setLocalQueue(q => [...q, ...newTracks]);
      }
    }).finally(() => {
      isFetchingRecoRef.current = false;
    });
  }, [localQueue.length, isRadioMode, fetchAndQueueRecommendations]);

  // ─── Socket sync for Radio Mode ───────────────────────────────────────────────

  useEffect(() => {
    if (!socket) return;

    const handleSync = (state) => {
      console.log('[Radio Mode] Received radio:sync', state);
      setRadioCurrentTrack(state.currentTrack);
      setRadioQueue(state.queue);

      if (!isRadioModeRef.current || !audioRef.current) return;

      if (!state.currentTrack) {
        audioRef.current.pause();
        setIsPlaying(false);
        return;
      }

      const targetUrl = state.currentTrack.audioUrl;
      const elapsed = state.elapsed || 0;
      const currentSrcStr = audioRef.current.src || '';
      const isSameSrc = currentSrcStr === targetUrl || currentSrcStr.endsWith(targetUrl);

      if (!isSameSrc) {
        audioRef.current.src = targetUrl;
        audioRef.current.currentTime = elapsed;
        audioRef.current.volume = volumeRef.current;
        audioRef.current.play()
          .then(() => setIsPlaying(true))
          .catch(e => console.error('[Radio Mode] play error:', e));
      } else {
        const timeDiff = Math.abs(audioRef.current.currentTime - elapsed);
        if (timeDiff > 5) audioRef.current.currentTime = elapsed;
        if (audioRef.current.paused) {
          audioRef.current.play()
            .then(() => setIsPlaying(true))
            .catch(e => console.error('[Radio Mode] resume error:', e));
        }
      }
    };

    socket.on('radio:sync', handleSync);
    return () => socket.off('radio:sync', handleSync);
  }, [socket]);

  // ─── Mode switching ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (isRadioMode) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.removeAttribute('src');
        audioRef.current.load();
        setIsPlaying(false);
      }
      setProgress(0);
      setDuration(0);
      if (socket) socket.emit('radio:join');
    } else {
      if (socket) socket.emit('radio:leave');
      if (localCurrentTrack && audioRef.current) {
        const isSameSrc = audioRef.current.src === localCurrentTrack.audioUrl || audioRef.current.src.endsWith(localCurrentTrack.audioUrl);
        if (!isSameSrc) audioRef.current.src = localCurrentTrack.audioUrl;
        
        const playAndSetTime = () => {
          const savedTime = localStorage.getItem('monge_private_time');
          if (savedTime) audioRef.current.currentTime = parseFloat(savedTime);
          audioRef.current.play().then(() => setIsPlaying(true)).catch(e => console.error(e));
          audioRef.current.removeEventListener('loadedmetadata', playAndSetTime);
        };

        if (audioRef.current.readyState >= 1) {
          playAndSetTime();
        } else {
          audioRef.current.addEventListener('loadedmetadata', playAndSetTime);
        }
      } else if (audioRef.current) {
        audioRef.current.pause();
        setIsPlaying(false);
      }
    }
  }, [isRadioMode]);

  // ─── Core playback ─────────────────────────────────────────────────────────────
  const addToQueue = useCallback((track) => {
    setShowPlayer(true);
    if (isRadioMode) {
      if (socket) socket.emit('radio:add_to_queue', track);
    } else {
      const uniqueId = `queue-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const trackWithId = { ...track, originalId: track.id || track._id, id: uniqueId };
      setLocalQueue(q => [...q, trackWithId]);
      if (!localCurrentTrackRef.current) {
        playLocalTrack(trackWithId);
        setLocalQueue(q => q.filter(t => t.id !== trackWithId.id));
      }
    }
  }, [isRadioMode, socket]);

  const playLocalTrack = async (track, skipHistory = false) => {
    setShowPlayer(true);
    setIsLoading(true);

    let trackToPlay = { ...track };

    // Handle AUTO_RESOLVE marker (from Spotify Import)
    if (trackToPlay.audioUrl?.startsWith('AUTO_RESOLVE:')) {
      const query = trackToPlay.audioUrl.replace('AUTO_RESOLVE:', '');
      try {
        const res = await fetch(`/api/spotify/jiosaavn-search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        if (res.ok && data.audioUrl) {
          trackToPlay.audioUrl = data.audioUrl;
          if (!trackToPlay.image && data.image) trackToPlay.image = data.image;
        } else {
          // Skip if not found
          setIsLoading(false);
          playNextLocal();
          return;
        }
      } catch (e) {
        setIsLoading(false);
        playNextLocal();
        return;
      }
    }

    // Re-resolve expired YouTube CDN URLs (they expire after ~6h, especially after server restart)
    // YouTube signed URLs contain 'googlevideo.com' or typical 'expire=' params
    const isExpiredYouTubeUrl = trackToPlay.audioUrl && (
      trackToPlay.audioUrl.includes('googlevideo.com') ||
      trackToPlay.audioUrl.includes('&expire=') ||
      trackToPlay.audioUrl.includes('youtube.com/videoplayback')
    );
    if (isExpiredYouTubeUrl) {
      const searchQuery = `${trackToPlay.name || trackToPlay.track_name || ''} ${trackToPlay.artist || trackToPlay.track_artist || ''}`.trim();
      if (searchQuery) {
        try {
          const res = await fetch(`/api/spotify/jiosaavn-search?q=${encodeURIComponent(searchQuery)}`);
          const data = await res.json();
          if (res.ok && data.audioUrl) {
            trackToPlay.audioUrl = data.audioUrl;
          }
          // If re-resolution fails, keep the old URL — will fail gracefully via onError
        } catch (e) {
          // Continue with old URL, onError will handle it
        }
      }
    }

    if (localCurrentTrackRef.current && !skipHistory && localCurrentTrackRef.current.id !== trackToPlay.id) {
      setLocalHistory(prev => [...prev, localCurrentTrackRef.current].slice(-50));
    }

    // Track this URL as played to prevent it showing up in future recommendations
    if (trackToPlay.audioUrl) {
      playedUrlsRef.current.add(trackToPlay.audioUrl);
      // Keep set bounded to last 100 entries so it doesn't grow forever
      if (playedUrlsRef.current.size > 100) {
        const entries = [...playedUrlsRef.current];
        playedUrlsRef.current = new Set(entries.slice(-100));
      }
    }

    setLocalCurrentTrack(trackToPlay);
    setProgress(0);
    localStorage.setItem('monge_private_time', '0');

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = trackToPlay.audioUrl;
      audioRef.current.volume = volumeRef.current;
      try {
        await audioRef.current.play();
        setIsPlaying(true);

        // LOG PLAY for Wrapped
        const token = localStorage.getItem('token');
        if (token) {
          fetch('/api/spotify/log-play', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: trackToPlay.name || trackToPlay.track_name,
              artist: trackToPlay.artist || trackToPlay.track_artist,
              image: trackToPlay.image || trackToPlay.track_image,
              audioUrl: trackToPlay.audioUrl
            })
          });
        }
      } catch (e) {
        if (e.name !== 'AbortError' && e.name !== 'NotAllowedError') {
          console.error('Play error', e);
        } else if (e.name === 'NotAllowedError') {
          console.warn('Autoplay blocked by browser. User needs to interact first.');
        }
        setIsPlaying(false);
      }
    }
    setIsLoading(false);
  };

  const play = useCallback(async (track) => {
    if (isRadioMode) {
      addToQueue(track);
    } else {
      await playLocalTrack(track);
    }
  }, [isRadioMode, addToQueue]);

  // ─── playNextLocal with Auto-Play ────────────────────────────────────────────
  const playNextLocal = useCallback(async (fromAutoPlay = false) => {
    // 1. If queue has items, just play the first one
    if (localQueue.length > 0) {
      const nextTrack = localQueue[0];
      setLocalQueue(q => q.slice(1));
      playLocalTrack(nextTrack);
      return;
    }

    // 2. Queue is empty → Try Auto-Play if we have a current track
    const trackToBase = localCurrentTrackRef.current;
    if (trackToBase && !fromAutoPlay) {
      setIsFetchingReco(true);

      const newTracks = await fetchAndQueueRecommendations(trackToBase);
      setIsFetchingReco(false);

      if (newTracks.length > 0) {
        // Play the first track immediately, add the rest to queue
        const [first, ...rest] = newTracks;
        setLocalQueue(q => [...q, ...rest]);
        playLocalTrack(first);
      } else {
        // No recommendations found
        setIsPlaying(false);
        setLocalCurrentTrack(null);
        setProgress(0);
      }
    } else {
      // End of everything
      setIsPlaying(false);
      setLocalCurrentTrack(null);
      setProgress(0);
    }
  }, [localQueue, fetchAndQueueRecommendations, playLocalTrack]);

  const togglePlay = useCallback(() => {
    if (!audioRef.current || !currentTrack) return;
    if (isPlaying) {
      if (isRadioMode) return; // Ne pas pauser la radio
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play()
        .then(() => {
          setIsPlaying(true);
          if (isRadioMode && socket) socket.emit('radio:join');
        })
        .catch(() => setIsPlaying(false));
    }
  }, [isPlaying, currentTrack, isRadioMode, socket]);

  const removeTrack = useCallback((trackId) => {
    if (isRadioMode) {
      if (socket) socket.emit('radio:remove_track', trackId);
    } else {
      setLocalQueue(q => q.filter(t => t.id !== trackId));
    }
  }, [isRadioMode, socket]);

  const moveTrack = useCallback((trackId, step) => {
    if (isRadioMode) {
      if (socket) socket.emit('radio:move_track', { trackId, step });
    } else {
      setLocalQueue(q => {
        const index = q.findIndex(t => t.id === trackId);
        if (index === -1) return q;
        const newIndex = index + step;
        if (newIndex >= 0 && newIndex < q.length) {
          const newQ = [...q];
          [newQ[index], newQ[newIndex]] = [newQ[newIndex], newQ[index]];
          return newQ;
        }
        return q;
      });
    }
  }, [isRadioMode, socket]);

  // Reorder for DnD (replaces moveTrack for sortable)
  const reorderQueue = useCallback((newQueue) => {
    if (!isRadioMode) {
      setLocalQueue(newQueue);
    }
  }, [isRadioMode]);

  const playTrackFromQueue = useCallback((trackId) => {
    if (isRadioMode) {
      if (socket) socket.emit('radio:play_track', trackId);
    } else {
      const index = localQueue.findIndex(t => t.id === trackId);
      if (index !== -1) {
        const trackToPlay = localQueue[index];
        setLocalQueue(q => q.slice(index + 1));
        playLocalTrack(trackToPlay);
      }
    }
  }, [isRadioMode, socket, localQueue]);

  const setVolume = useCallback((v) => {
    setVolumeState(v);
    localStorage.setItem('monge_private_volume', v.toString());
    if (audioRef.current) audioRef.current.volume = v;
  }, []);

  const seek = useCallback((ratio) => {
    if (audioRef.current && duration > 0 && !isRadioMode) {
      audioRef.current.currentTime = ratio * duration;
      setProgress(ratio);
    }
  }, [duration, isRadioMode]);

  const playNext = useCallback(() => {
    if (isRadioMode) {
      if (socket) socket.emit('radio:vote_skip');
    } else {
      playNextLocal();
    }
  }, [isRadioMode, socket, playNextLocal]);

  const playPrevious = useCallback(() => {
    if (isRadioMode) return;
    if (audioRef.current && audioRef.current.currentTime > 3) {
      audioRef.current.currentTime = 0;
      return;
    }
    if (localHistory.length > 0) {
      const prevTrack = localHistory[localHistory.length - 1];
      setLocalHistory(h => h.slice(0, -1));
      if (localCurrentTrack) setLocalQueue(q => [localCurrentTrack, ...q]);
      playLocalTrack(prevTrack, true);
    } else if (audioRef.current) {
      audioRef.current.currentTime = 0;
    }
  }, [isRadioMode, localHistory, localCurrentTrack]);

  const handleTimeUpdate = () => {
    if (audioRef.current && audioRef.current.duration) {
      setProgress(audioRef.current.currentTime / audioRef.current.duration);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) setDuration(audioRef.current.duration);
  };

  const handleEnded = () => {
    if (isRadioMode) {
      if (socket && radioCurrentTrack) {
        socket.emit('radio:track_ended', { trackId: radioCurrentTrack.id });
      }
    } else {
      playNextLocal();
    }
  };

  return (
    <MusicContext.Provider value={{
      currentTrack,
      queue,
      isPlaying,
      volume,
      progress,
      duration,
      isLoading,
      isMinimized,
      isRadioMode,
      showPlayer,
      isFetchingReco,
      likedAudioUrls,
      playlists,
      setIsMinimized,
      setIsRadioMode,
      setShowPlayer,
      play,
      addToQueue,
      togglePlay,
      playNext,
      playPrevious,
      setVolume,
      seek,
      removeTrack,
      moveTrack,
      reorderQueue,
      playTrackFromQueue,
      history,
      isLiked,
      toggleLike,
      createPlaylist,
      addToPlaylist,
      removeFromPlaylist,
      refreshPlaylists,
    }}>
      {children}
      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        onError={(e) => {
          console.error('Audio stream error', e);
          setIsPlaying(false);
          setIsLoading(false);
          // Add a small delay to avoid infinite looping if all tracks are broken
          setTimeout(() => handleEnded(), 1000);
        }}
        style={{ display: 'none' }}
      />
    </MusicContext.Provider>
  );
}

export function useMusic() {
  const ctx = useContext(MusicContext);
  if (!ctx) throw new Error('useMusic must be used within MusicProvider');
  return ctx;
}
