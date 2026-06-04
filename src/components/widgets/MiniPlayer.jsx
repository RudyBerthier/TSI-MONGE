import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { Play, Pause, Volume2, VolumeX, ChevronDown, ChevronUp, Music2, Loader2, Radio, ListMusic, Search, X, SkipBack, SkipForward, History, Maximize2, Heart, MoreHorizontal, Plus, Library, Sparkles, Mic2, Check } from 'lucide-react';
import { useMusic } from '../../contexts/MusicContext';
import LyricsView from './LyricsView';
import { getAverageColor } from '../../utils/colorExtractor';

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// ─── Sortable Track Row ─────────────────────────────────────────────────────
function SortableTrackRow({ track, index, queueLength, isRadioMode, onPlay, onRemove, onMoveToPlaylist, playlists }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: track.id });
  const [showMenu, setShowMenu] = useState(false);
  const [menuRect, setMenuRect] = useState(null);
  const menuRef = useRef(null);
  const portalRef = useRef(null);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging || showMenu ? 50 : 1, // Elevate z-index when dragging or showing menu
  };

  useEffect(() => {
    const handleClick = (e) => {
      if (menuRef.current && menuRef.current.contains(e.target)) return;
      if (portalRef.current && portalRef.current.contains(e.target)) return;
      setShowMenu(false);
    };
    const handleScroll = (e) => {
      if (portalRef.current && portalRef.current.contains(e.target)) return;
      setShowMenu(false);
    };

    if (showMenu) {
      document.addEventListener('mousedown', handleClick);
      window.addEventListener('wheel', handleScroll, { passive: true, capture: true });
      window.addEventListener('scroll', handleScroll, { capture: true });
    }
    return () => {
      document.removeEventListener('mousedown', handleClick);
      window.removeEventListener('wheel', handleScroll, { capture: true });
      window.removeEventListener('scroll', handleScroll, { capture: true });
    };
  }, [showMenu]);

  return (
    <div ref={setNodeRef} style={style} className={`flex items-center gap-3 p-2.5 rounded-xl transition-colors group relative ${isDragging ? 'bg-white/10 shadow-lg' : 'hover:bg-white/5'}`}>
      {/* Drag Handle */}
      {!isRadioMode && (
        <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-white/20 hover:text-white/60 transition-colors shrink-0 touch-none">
          <svg width="12" height="16" viewBox="0 0 12 16" fill="currentColor">
            <circle cx="3" cy="4" r="1.5" /><circle cx="9" cy="4" r="1.5" />
            <circle cx="3" cy="8" r="1.5" /><circle cx="9" cy="8" r="1.5" />
            <circle cx="3" cy="12" r="1.5" /><circle cx="9" cy="12" r="1.5" />
          </svg>
        </div>
      )}
      <img src={track.image} alt="" className="w-12 h-12 rounded-lg object-cover shadow-sm bg-white/5 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-medium truncate">{track.name}</p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <p className="text-white/50 text-xs truncate">{track.artist}</p>
          {track.addedBy && (
            <>
              <span className="text-white/20 text-xs">•</span>
              <span className="text-white/40 text-[10px] truncate uppercase tracking-widest bg-white/5 px-1.5 rounded">{track.addedBy}</span>
            </>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <button onClick={() => onPlay(track.id)} className="p-2 bg-white/10 hover:bg-white hover:text-black rounded-full text-white transition-colors">
          <Play size={12} fill="currentColor" className="ml-0.5" />
        </button>

        {/* "..." Context Menu */}
        <div className="relative" ref={menuRef}>
          <button onClick={() => {
            if (!showMenu && menuRef.current) setMenuRect(menuRef.current.getBoundingClientRect());
            setShowMenu(v => !v);
          }} className="p-2 hover:bg-white/10 rounded-full text-white/50 hover:text-white transition-colors">
            <MoreHorizontal size={14} />
          </button>
          {showMenu && menuRect && createPortal(
            <div ref={portalRef} style={{ position: 'fixed', bottom: window.innerHeight - menuRect.top + 5, right: window.innerWidth - menuRect.right }} className="w-48 bg-[#282828] border border-white/10 rounded-xl shadow-2xl z-[99999] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              {playlists.filter(p => !p.is_liked_playlist).map(pl => (
                <button key={pl.id} onClick={() => { onMoveToPlaylist(pl.id, track); setShowMenu(false); }} className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-white/80 hover:bg-white/10 hover:text-white transition-colors text-left">
                  <Plus size={14} className="shrink-0" /> Ajouter à "{pl.name}"
                </button>
              ))}
              {playlists.filter(p => !p.is_liked_playlist).length === 0 && (
                <p className="px-3 py-2.5 text-white/40 text-xs">Aucune playlist</p>
              )}
              <div className="h-px bg-white/10 my-1" />
              <button onClick={() => { onRemove(track.id); setShowMenu(false); }} className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors text-left">
                <X size={14} className="shrink-0" /> Retirer de la file
              </button>
            </div>,
            document.body
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main MiniPlayer ────────────────────────────────────────────────────────
export default function MiniPlayer() {
  const {
    currentTrack, queue, history, isPlaying, volume, progress, duration, isLoading,
    togglePlay, playNext, playPrevious, setVolume, seek,
    isRadioMode, setIsRadioMode, addToQueue, showPlayer, setShowPlayer,
    removeTrack, reorderQueue, playTrackFromQueue, play,
    isFetchingReco, isLiked, toggleLike, playlists, addToPlaylist, removeFromPlaylist, createPlaylist,
  } = useMusic();

  const [isExpanded, setIsExpanded] = useState(false);
  const [showQueue, setShowQueue] = useState(false);
  const [activeTab, setActiveTab] = useState('queue');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showCreatePlaylist, setShowCreatePlaylist] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [dominantColor, setDominantColor] = useState('#121212');
  const [showMainPlaylistMenu, setShowMainPlaylistMenu] = useState(false);
  const [playlistTracks, setPlaylistTracks] = useState({}); // { playlistId: [audioUrl, ...] }

  useEffect(() => {
    let isMounted = true;
    if (currentTrack?.image) {
      getAverageColor(currentTrack.image).then(color => {
        if (isMounted) setDominantColor(color);
      });
    } else {
      setDominantColor('#121212');
    }
    return () => { isMounted = false; };
  }, [currentTrack?.image]);

  // Fetch tracks for each playlist when the add‑to‑playlist menu opens
  useEffect(() => {
    if (!showMainPlaylistMenu || !currentTrack) return;
    const token = localStorage.getItem('token');
    if (!token) return;
    playlists.forEach(pl => {
      // Avoid refetching if we already have data for this playlist
      if (playlistTracks[pl.id]) return;
      fetch(`/api/playlists/${pl.id}/tracks`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => res.ok ? res.json() : [])
        .then(data => {
          const arr = Array.isArray(data) ? data : (data.tracks || []);
          const urls = arr.map(t => t.audio_url);
          setPlaylistTracks(prev => ({ ...prev, [pl.id]: urls }));
        })
        .catch(() => {
          setPlaylistTracks(prev => ({ ...prev, [pl.id]: [] }));
        });
    });
  }, [showMainPlaylistMenu, playlists, currentTrack, playlistTracks]);

  // Écoute les événements globaux de modification de playlists
  useEffect(() => {
    const handleUpdate = (e) => {
      const plId = e.detail.playlistId;
      const token = localStorage.getItem('token');
      if (!token) return;
      fetch(`/api/playlists/${plId}/tracks`, { headers: { Authorization: `Bearer ${token}` } })
        .then(res => res.ok ? res.json() : [])
        .then(data => {
          const arr = Array.isArray(data) ? data : (data.tracks || []);
          const urls = arr.map(t => t.audio_url);
          setPlaylistTracks(prev => ({ ...prev, [plId]: urls }));
        });
    };
    window.addEventListener('playlist-updated', handleUpdate);
    return () => window.removeEventListener('playlist-updated', handleUpdate);
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleDragEnd(event) {
    const { active, over } = event;
    if (active.id !== over?.id) {
      const oldIndex = queue.findIndex(t => t.id === active.id);
      const newIndex = queue.findIndex(t => t.id === over.id);
      reorderQueue(arrayMove(queue, oldIndex, newIndex));
    }
  }

  useEffect(() => {
    if (showPlayer && !isExpanded) document.body.style.paddingBottom = '84px';
    else document.body.style.paddingBottom = '0px';
    if (isExpanded) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; document.body.style.paddingBottom = '0px'; };
  }, [isExpanded, showPlayer]);

  // Intercept browser/phone back button when modal is open → just close modal, don't navigate
  useEffect(() => {
    if (isExpanded) {
      // Push a "fake" history entry so back = close modal
      window.history.pushState({ megaModalOpen: true }, '');
      const handlePopState = (e) => {
        setIsExpanded(false);
        // Don't prevent default — the pop already happened, just update state
      };
      window.addEventListener('popstate', handlePopState);
      return () => window.removeEventListener('popstate', handlePopState);
    }
  }, [isExpanded]);
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchQuery.trim().length >= 2) {
        setIsSearching(true);
        fetch(`/api/spotify/search?q=${encodeURIComponent(searchQuery)}`)
          .then(res => res.json())
          .then(data => { setSearchResults(data.results || []); setIsSearching(false); })
          .catch(() => { setErrorMsg('Erreur de recherche'); setIsSearching(false); });
      } else {
        setSearchResults([]);
      }
    }, 400); // 400ms debounce
    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);


  if (!showPlayer) return null;

  const formatTime = (secs) => {
    if (!secs || isNaN(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleSearch = (e) => {
    e.preventDefault();
  };

  const handleAddResult = async (item, action = 'play') => {
    try {
      setIsSearching(true);
      const res = await fetch(`/api/spotify/jiosaavn-search?q=${encodeURIComponent(`${item.name} ${item.artist}`)}`);
      const data = await res.json();
      setIsSearching(false);
      if (res.ok && data.audioUrl) {
        const track = { id: `search-${Date.now()}`, name: item.name, artist: item.artist, image: item.image || data.image || '', audioUrl: data.audioUrl };
        if (action === 'play') play(track);
        else addToQueue(track);
        
        setSearchQuery('');
        setSearchResults([]);
      } else alert("Audio introuvable");
    } catch { setIsSearching(false); alert("Erreur réseau"); }
  };

  const handleCreatePlaylist = async () => {
    if (!newPlaylistName.trim()) return;
    await createPlaylist(newPlaylistName.trim());
    setNewPlaylistName('');
    setShowCreatePlaylist(false);
  };

  const themeColor = isRadioMode ? '#ef4444' : '#22c55e';
  const themeBgClass = isRadioMode ? 'bg-red-500' : 'bg-green-500';
  const liked = currentTrack ? isLiked(currentTrack.audioUrl) : false;

  // ── CREATE PLAYLIST MODAL ──────────────────────────────────────────────────
  const createPlaylistModalEl = showCreatePlaylist && (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-[#181818] border border-white/10 p-6 rounded-2xl w-full max-w-sm shadow-2xl relative">
        <button onClick={() => setShowCreatePlaylist(false)} className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors">
          <X size={20} />
        </button>
        <h3 className="text-xl font-bold text-white mb-4">Nouvelle playlist</h3>
        <input 
          autoFocus
          type="text" 
          value={newPlaylistName} 
          onChange={(e) => setNewPlaylistName(e.target.value)}
          placeholder="Nom de la playlist"
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-green-500 transition-colors mb-6"
          onKeyDown={(e) => e.key === 'Enter' && handleCreatePlaylist()}
        />
        <div className="flex gap-3 justify-end">
          <button onClick={() => setShowCreatePlaylist(false)} className="px-4 py-2 font-bold text-white/60 hover:text-white transition-colors">
            Annuler
          </button>
          <button onClick={handleCreatePlaylist} disabled={!newPlaylistName.trim()} className="px-6 py-2 bg-green-500 hover:bg-green-400 disabled:opacity-50 disabled:hover:bg-green-500 text-black font-bold rounded-full transition-colors">
            Créer
          </button>
        </div>
      </div>
    </div>
  );

  // ── MEGA MODAL ─────────────────────────────────────────────────────────────
  if (isExpanded) {
    return (
      <div className="fixed inset-0 z-[9999] flex flex-col bg-[#121212] animate-in fade-in zoom-in-95 duration-300">
        <div
          className="absolute inset-0 pointer-events-none transition-colors duration-1000 ease-in-out"
          style={{ background: `linear-gradient(to bottom, ${dominantColor} 0%, #121212 100%)`, opacity: 0.8 }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#121212] via-transparent to-black/20 pointer-events-none" />

        {/* TOP BAR */}
        <div className="relative z-10 flex items-center justify-between px-6 py-4">
          <button onClick={() => setIsExpanded(false)} className="p-2 rounded-full hover:bg-white/10 text-white/70 hover:text-white transition-colors">
            <ChevronDown size={28} />
          </button>
          <div className="flex flex-col items-center">
            <span className="text-xs uppercase tracking-widest text-white/50 font-semibold mb-1">Lecture en cours</span>
            <div className="flex bg-black/40 rounded-full p-1 border border-white/5">
              <button onClick={() => setIsRadioMode(false)} className={`py-1.5 px-4 text-xs font-bold rounded-full transition-colors ${!isRadioMode ? 'bg-white/20 text-white shadow-sm' : 'text-white/50 hover:text-white/80'}`}>Privé</button>
              <button onClick={() => setIsRadioMode(true)} className={`py-1.5 px-4 text-xs font-bold rounded-full transition-colors flex items-center gap-2 ${isRadioMode ? 'bg-red-500/20 text-red-400 shadow-sm' : 'text-white/50 hover:text-white/80'}`}>
                <Radio size={14} className={isRadioMode ? "animate-pulse" : ""} /> Radio Monge
              </button>
            </div>
          </div>
          <div className="w-10 flex justify-end">
            <Link to="/library" onClick={() => setIsExpanded(false)} className="p-2 rounded-full hover:bg-white/10 text-white/50 hover:text-white transition-colors" title="Ma bibliothèque">
              <Library size={22} />
            </Link>
          </div>
        </div>

        {/* SPLIT LAYOUT */}
        <div className="relative z-10 flex-1 flex flex-col lg:flex-row overflow-hidden pb-6">

          {/* LEFT: COVER + CONTROLS */}
          <div className={`flex-1 flex-col justify-center items-center p-6 md:p-8 lg:p-12 min-h-0 ${showQueue ? 'hidden lg:flex' : 'flex'}`}>
            <div className="w-full max-w-md aspect-square rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden bg-white/5 mb-8 relative hover:scale-[1.02] transition-transform duration-500">
              {currentTrack?.image ? <img src={currentTrack.image} alt="Cover" className="w-full h-full object-cover" />
                : <div className="w-full h-full flex flex-col items-center justify-center"><Music2 size={64} className="text-white/20 mb-4" /></div>}
            </div>

            <div className="w-full max-w-md flex justify-between items-start">
              <div className="flex-1 min-w-0 pr-4">
                <h1 className="text-3xl md:text-4xl font-extrabold text-white truncate leading-tight">
                  {currentTrack ? currentTrack.name : 'TSI Monge Player'}
                </h1>
                <p className="text-lg text-white/60 truncate mt-1">{currentTrack ? currentTrack.artist : 'Recherchez un titre pour commencer'}</p>
                {isRadioMode && currentTrack?.addedBy && (
                  <p className="text-red-400/80 text-sm mt-2 flex items-center gap-1.5"><Radio size={14} /> Ajouté par {currentTrack.addedBy}</p>
                )}
                {isFetchingReco && (
                  <p className="text-white/40 text-sm mt-2 flex items-center gap-1.5">
                    <Sparkles size={14} className="animate-pulse text-yellow-400" /> Chargement de suggestions...
                  </p>
                )}
              </div>
              {/* Add to Playlist Premium Dropdown */}
              <div className="relative">
                <button
                  onClick={(e) => { e.stopPropagation(); setShowMainPlaylistMenu(v => !v); }}
                  className={`p-3 rounded-full hover:bg-white/10 hover:scale-110 active:scale-95 transition-all ${showMainPlaylistMenu ? 'bg-white/10 text-white' : 'text-white/60 hover:text-white'}`}
                  title="Ajouter à une playlist"
                >
                  <Plus size={34} strokeWidth={2} className={liked && !showMainPlaylistMenu ? "text-green-400 drop-shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-in zoom-in" : ""} />
                </button>

                {showMainPlaylistMenu && currentTrack && (
                  <>
                    {/* Invisible overlay to close menu when clicking outside */}
                    <div className="fixed inset-0 z-40" onClick={() => setShowMainPlaylistMenu(false)} />

                    <div className="absolute right-0 top-full mt-2 w-64 bg-[#282828] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">

                      {/* Quick action: Like/Unlike Tracks */}
                      <button
                        onClick={() => { toggleLike(currentTrack); setShowMainPlaylistMenu(false); }}
                        className="w-full flex items-center justify-between px-4 py-3 text-sm hover:bg-white/10 transition-colors text-left"
                      >
                        <span className="flex items-center gap-3 text-white/90 font-medium">
                          <Heart
                            size={18}
                            fill={liked ? '#ef4444' : 'none'}
                            className={liked ? 'text-red-500' : 'text-white/50'}
                          />
                          {liked ? 'Retirer des Liked Tracks' : 'Ajouter aux Liked Tracks'}
                        </span>
                      </button>

                      <div className="h-px bg-white/10 my-1 mx-3" />

                      {/* Playlists List */}
                      <div className="max-height-[300px] overflow-y-auto">
                        {playlists.filter(p => !p.is_liked_playlist).map(pl => {
                          const alreadyIn = playlistTracks[pl.id]?.includes(currentTrack?.audioUrl);
                          return (
                            <button
                              key={pl.id}
                              onClick={() => {
                                if (!alreadyIn) {
                                  addToPlaylist(pl.id, currentTrack);
                                  setPlaylistTracks(prev => ({...prev, [pl.id]: [...(prev[pl.id]||[]), currentTrack.audioUrl]}));
                                } else {
                                  removeFromPlaylist(pl.id, currentTrack);
                                  setPlaylistTracks(prev => ({...prev, [pl.id]: (prev[pl.id]||[]).filter(u => u !== currentTrack.audioUrl)}));
                                }
                              }}
                              className="w-full flex items-center justify-between gap-3 px-4 py-2.5 text-sm text-white/80 hover:bg-white/10 hover:text-white transition-colors text-left"
                            >
                              <div className="flex items-center gap-3">
                                <ListMusic size={16} className="text-white/40 shrink-0" />
                                <span className="truncate">{pl.name}</span>
                              </div>
                              {alreadyIn && <Check size={16} className="text-green-400" />}
                            </button>
                          );
                        })}

                        {playlists.filter(p => !p.is_liked_playlist).length === 0 && (
                          <p className="px-4 py-4 text-white/30 text-xs text-center italic">
                            Aucune playlist personnelle
                          </p>
                        )}
                      </div>

                      <div className="h-px bg-white/10 my-1 mx-3" />

                      {/* Create New Playlist */}
                      <button
                        onClick={() => { setShowMainPlaylistMenu(false); setShowCreatePlaylist(true); }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm text-green-400 hover:bg-green-500/10 transition-colors text-left font-bold"
                      >
                        <Plus size={18} /> Créer une playlist
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* PROGRESS */}
            <div className="w-full max-w-md mt-8">
              <input type="range" min={0} max={0.9999} step="any" value={progress}
                onChange={(e) => { if (!isRadioMode) seek(parseFloat(e.target.value)); }}
                disabled={isRadioMode || !currentTrack}
                className={`w-full h-1.5 rounded-full appearance-none accent-white hover:h-2 transition-all cursor-pointer bg-white/20 ${isRadioMode ? 'cursor-not-allowed opacity-80' : ''}`}
                style={{ background: `linear-gradient(to right, white ${progress * 100}%, rgba(255,255,255,0.2) ${progress * 100}%)` }}
              />
              <div className="flex justify-between mt-2 text-xs text-white/50 font-mono tracking-wider">
                <span>{formatTime(progress * duration)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* CONTROLS */}
            <div className="w-full max-w-md mt-6 flex items-center justify-center">
              {/* LYRICS TOGGLE (Mobile only) */}
              <button
                onClick={() => { setShowQueue(true); setActiveTab('lyrics'); }}
                className="w-12 h-12 flex items-center justify-center lg:hidden text-white/50 hover:text-white transition-colors"
                title="Paroles"
              >
                <Mic2 size={24} />
              </button>

              <div className="flex items-center justify-center gap-6">
                <button onClick={playPrevious} disabled={isRadioMode || !currentTrack}
                  className="p-3 text-white/50 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all hover:scale-110 active:scale-90">
                  <SkipBack size={28} fill="currentColor" />
                </button>
                <button onClick={togglePlay} disabled={isLoading || !currentTrack}
                  className={`w-20 h-20 rounded-full flex items-center justify-center transition-all ${isLoading ? 'bg-white/10 text-white/50 cursor-not-allowed' : 'bg-white text-black hover:scale-105 active:scale-95 shadow-xl'}`}>
                  {isLoading ? <Loader2 size={32} className="animate-spin" /> : (isPlaying ? <Pause size={32} fill="currentColor" /> : <Play size={32} fill="currentColor" />)}
                </button>
                <button onClick={playNext} disabled={(!isRadioMode && queue.length === 0 && !currentTrack) || (isRadioMode && !currentTrack)}
                  className="p-3 text-white/50 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all hover:scale-110 active:scale-90 relative">
                  <SkipForward size={28} fill="currentColor" />
                  {isRadioMode && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[8px] px-1 rounded-sm font-bold">VOTE</span>}
                </button>
              </div>

              {/* QUEUE TOGGLE (Mobile only) */}
              <button
                onClick={() => { setShowQueue(true); setActiveTab('queue'); }}
                className="w-12 h-12 flex items-center justify-center lg:hidden text-white/50 hover:text-white transition-colors"
                title="File d'attente"
              >
                <ListMusic size={24} />
              </button>
            </div>
          </div>

          {/* RIGHT: QUEUE / LYRICS */}
          <div className={`w-full lg:w-96 flex-col p-4 lg:p-8 lg:border-l border-white/10 bg-black/20 ${showQueue ? 'flex flex-1 min-h-0' : 'hidden lg:flex'}`}>
            {/* Mobile Close Tab Button */}
            <div className="flex items-center justify-between lg:hidden mb-4 border-b border-white/10 pb-4">
              <h2 className="text-lg font-bold text-white uppercase tracking-wider">
                {activeTab === 'lyrics' ? 'Paroles' : activeTab === 'history' ? 'Historique' : "File d'attente"}
              </h2>
              <button onClick={() => setShowQueue(false)} className="p-2 text-white/50 hover:text-white bg-white/5 hover:bg-white/10 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>

            {/* Search */}
            <div className="mb-6">
              <form onSubmit={handleSearch} className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><Search size={18} className="text-white/40" /></div>
                <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Ajouter à la file d'attente..."
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 pl-11 pr-4 text-sm text-white placeholder-white/40 outline-none focus:border-white/30 focus:bg-white/10 transition-all font-medium" />
              </form>
              {searchResults.length > 0 && (
                <div className="mt-2 bg-[#181818] border border-white/10 rounded-2xl overflow-hidden shadow-2xl animate-in slide-in-from-top-2">
                  {searchResults.slice(0, 4).map(item => (
                    <div key={item.id} className="flex items-center gap-3 p-3 hover:bg-white/10 transition-colors group">
                      <img src={item.image} alt="" className="w-10 h-10 rounded-md object-cover" />
                      <div className="flex-1 min-w-0 cursor-pointer" onClick={() => handleAddResult(item, 'play')} title="Jouer ce titre">
                        <p className="text-white text-sm font-medium truncate">{item.name}</p>
                        <p className="text-white/50 text-xs truncate">{item.artist}</p>
                      </div>
                      <div className="flex items-center gap-2 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleAddResult(item, 'play')} title="Jouer" className="p-2 bg-white/10 hover:bg-green-500 rounded-full text-white transition-colors">
                          <Play size={14} fill="currentColor" className="ml-0.5" />
                        </button>
                        <button onClick={() => handleAddResult(item, 'queue')} title="Ajouter à la file" className="p-2 bg-white/10 hover:bg-white hover:text-black rounded-full text-white transition-colors">
                          <Plus size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                  <button onClick={() => setSearchResults([])} className="w-full py-2.5 text-center text-xs font-bold uppercase tracking-wider text-white/40 hover:text-white/80 bg-black/40">Fermer</button>
                </div>
              )}
            </div>

            {/* Tabs */}
            <div className="flex gap-4 mb-4 border-b border-white/10">
              <button onClick={() => setActiveTab('queue')}
                className={`pb-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'queue' ? 'border-white text-white' : 'border-transparent text-white/40 hover:text-white/80'}`}>
                File d'attente <span className="bg-white/10 px-1.5 py-0.5 rounded text-[10px]">{queue.length}</span>
                {isFetchingReco && <Sparkles size={12} className="text-yellow-400 animate-pulse" />}
              </button>
              {!isRadioMode && (
                <button onClick={() => setActiveTab('history')}
                  className={`pb-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'history' ? 'border-white text-white' : 'border-transparent text-white/40 hover:text-white/80'}`}>
                  Historique
                </button>
              )}
              <button onClick={() => setActiveTab('lyrics')}
                className={`pb-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-1.5 ${activeTab === 'lyrics' ? 'border-white text-white' : 'border-transparent text-white/40 hover:text-white/80'}`}>
                <Mic2 size={14} /> Paroles
              </button>
            </div>

            {/* Content Area (Queue, History or Lyrics) */}
            <div className="flex-1 overflow-y-auto px-1 custom-scrollbar flex flex-col relative w-full h-full min-h-0">
              {activeTab === 'lyrics' ? (
                <LyricsView
                  track={currentTrack}
                  currentTime={(progress || 0) * (duration || 0)}
                  onSeek={(time) => { if (duration) seek(time / duration); }}
                />
              ) : activeTab === 'queue' ? (
                queue.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 opacity-40">
                    <ListMusic size={48} className="mb-4" />
                    <p className="font-medium text-lg text-white">Aucun morceau</p>
                    {isFetchingReco ? (
                      <p className="text-sm mt-1 flex items-center gap-1 text-yellow-400"><Sparkles size={14} /> Recherche en cours...</p>
                    ) : (
                      <p className="text-sm mt-1">Recherchez un titre pour l'ajouter</p>
                    )}
                  </div>
                ) : (
                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={queue.map(t => t.id)} strategy={verticalListSortingStrategy}>
                      <div className="flex flex-col gap-1">
                        {queue.map((track, i) => (
                          <SortableTrackRow key={track.id} track={track} index={i} queueLength={queue.length}
                            isRadioMode={isRadioMode} onPlay={playTrackFromQueue} onRemove={removeTrack}
                            onMoveToPlaylist={addToPlaylist} playlists={playlists} />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                )
              ) : (
                history.length === 0 ? (
                  <p className="text-white/40 text-sm text-center py-10 font-medium">L'historique est vide</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {[...history].reverse().map((track, i) => (
                      <div key={i} className="flex items-center gap-4 p-2.5 rounded-xl hover:bg-white/5 transition-colors group">
                        <img src={track.image} alt="" className="w-12 h-12 rounded-lg object-cover opacity-60 group-hover:opacity-100" />
                        <div className="flex-1 min-w-0 opacity-60 group-hover:opacity-100">
                          <p className="text-white text-sm font-medium truncate">{track.name}</p>
                          <p className="text-white/40 text-xs truncate">{track.artist}</p>
                        </div>
                        <button onClick={() => addToQueue(track)} className="opacity-0 group-hover:opacity-100 p-2.5 border border-white/20 hover:border-white rounded-full text-white/70 hover:text-white transition-all text-xs font-bold uppercase tracking-wider">
                          Rejouer
                        </button>
                      </div>
                    ))}
                  </div>
                )
              )}
            </div>

            {/* Volume */}
            <div className="pt-6 mt-4 border-t border-white/10 flex items-center gap-3">
              <button onClick={() => setVolume(volume > 0 ? 0 : 0.7)} className="text-white/50 hover:text-white transition-colors">
                {volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
              </button>
              <input type="range" min={0} max={1} step={0.05} value={volume} onChange={(e) => setVolume(parseFloat(e.target.value))}
                className="flex-1 min-w-0 h-1.5 rounded-full appearance-none cursor-pointer accent-white bg-white/20"
                style={{ background: `linear-gradient(to right, white ${volume * 100}%, rgba(255,255,255,0.2) ${volume * 100}%)` }} />
            </div>
          </div>
        </div>
        {createPlaylistModalEl}
      </div >
    );
  }

  // ── BOTTOM BAR ──────────────────────────────────────────────────────────────
  return (
    <div className="fixed bottom-0 left-0 right-0 z-[100] border-t border-white/10 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] animate-in slide-in-from-bottom-full duration-300">
      {/* Draggable Progress Bar (outside overflow-hidden) */}
      <div className="absolute top-0 -translate-y-[2px] left-0 right-0 h-[3px] z-30 hover:h-[5px] transition-all" onClick={(e) => e.stopPropagation()}>
        <input type="range" min={0} max={0.9999} step="any" value={progress || 0}
          onChange={(e) => { if (!isRadioMode) seek(parseFloat(e.target.value)); }}
          disabled={isRadioMode || !currentTrack}
          className={`w-full h-full block appearance-none outline-none m-0 ${isRadioMode ? 'cursor-not-allowed opacity-80' : 'cursor-pointer'} transition-all`}
          style={{ background: `linear-gradient(to right, ${themeColor} ${(progress || 0) * 100}%, rgba(255,255,255,0.1) ${(progress || 0) * 100}%)` }}
        />
      </div>

      <div className="bg-[#181818] h-[72px] lg:h-[84px] px-2 sm:px-4 flex items-center justify-between gap-2 overflow-hidden relative cursor-pointer group/bar"
        onClick={() => setIsExpanded(true)}>
        {currentTrack?.image && (
          <div className="absolute inset-0 opacity-20 blur-3xl pointer-events-none transition-opacity group-hover/bar:opacity-30"
            style={{ backgroundImage: `url(${currentTrack.image})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
        )}

        {/* LEFT: Track Info + Like */}
        <div className="flex items-center gap-3 md:gap-4 w-[35%] min-w-0 relative z-10">
          <div className="relative shrink-0 w-12 h-12 lg:w-14 lg:h-14 bg-white/5 rounded-md overflow-hidden flex items-center justify-center shadow-lg">
            {currentTrack?.image ? <img src={currentTrack.image} alt="cover" className="w-full h-full object-cover" />
              : <Music2 size={24} className="text-white/20" />}
            {isRadioMode && <div className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-bl-md animate-pulse" />}
          </div>
          <div className="flex-1 min-w-0 flex flex-col justify-center">
            {currentTrack ? (
              <>
                <div className="flex items-center gap-1.5">
                  <p className="text-white text-sm font-semibold truncate">{currentTrack.name}</p>
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleLike(currentTrack); }}
                    className={`shrink-0 p-1.5 rounded-full transition-all hover:scale-125 active:scale-95 ${liked ? 'text-red-500 drop-shadow-[0_0_5px_rgba(239,68,68,0.5)]' : 'text-white/60 hover:text-white'}`}
                  >
                    <Heart size={22} fill={liked ? 'currentColor' : 'none'} strokeWidth={liked ? 2.5 : 2} />
                  </button>
                </div>
                <p className="text-white/50 text-[11px] truncate mt-0.5">{currentTrack.artist}</p>
              </>
            ) : (
              <p className="text-white/50 text-sm font-medium">
                {isFetchingReco ? <span className="flex items-center gap-1 text-yellow-400/80"><Sparkles size={12} /> Suggestions...</span> : 'Prêt à jouer'}
              </p>
            )}
          </div>
        </div>

        {/* CENTER: Controls */}
        <div className="flex items-center justify-center flex-1 max-w-[30%] relative z-10">
          <div className="flex items-center gap-4 lg:gap-6">
            <button onClick={(e) => { e.stopPropagation(); playPrevious(); }} disabled={isRadioMode || !currentTrack}
              className="text-white/50 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
              <SkipBack size={20} fill="currentColor" />
            </button>
            <button onClick={(e) => { e.stopPropagation(); togglePlay(); }} disabled={isLoading || !currentTrack}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-transform hover:scale-105 active:scale-95 z-20 ${isLoading ? 'text-white/50 bg-white/10' : 'bg-white text-black'}`}>
              {isLoading ? <Loader2 size={18} className="animate-spin" /> : (isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />)}
            </button>
            <button onClick={(e) => { e.stopPropagation(); playNext(); }} disabled={(!isRadioMode && queue.length === 0 && !currentTrack) || (isRadioMode && !currentTrack)}
              className="text-white/50 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
              <SkipForward size={20} fill="currentColor" />
            </button>
          </div>
        </div>

        {/* RIGHT: Volume + Actions */}
        <div className="flex items-center justify-end gap-2 w-[35%] min-w-0 pr-2 lg:pr-4 relative z-10">
          <div className="hidden md:flex items-center gap-2 w-28" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setVolume(volume > 0 ? 0 : 0.7)} className="text-white/50 hover:text-white transition-colors">
              {volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </button>
            <input type="range" min={0} max={1} step={0.05} value={volume} onChange={(e) => setVolume(parseFloat(e.target.value))}
              className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-white"
              style={{ background: `linear-gradient(to right, white ${volume * 100}%, rgba(255,255,255,0.15) ${volume * 100}%)` }} />
          </div>
          <div className="w-px h-6 bg-white/10 mx-1 hidden md:block" />
          <button onClick={(e) => { e.stopPropagation(); setShowPlayer(false); if (!isRadioMode && isPlaying) togglePlay(); }}
            className="p-2 text-white/40 hover:text-white hover:bg-white/10 rounded-full transition-colors z-20" title="Fermer">
            <X size={18} />
          </button>
        </div>
      </div>
      {createPlaylistModalEl}
    </div>
  );
}
