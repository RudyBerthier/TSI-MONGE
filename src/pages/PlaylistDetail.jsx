import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Play, Pause, Shuffle, ArrowLeft, Music2, Loader2, Globe, Lock, Edit3, Check, X, Trash2, MoreHorizontal, ListPlus, Heart, AudioLines } from 'lucide-react';
import {
  DndContext, closestCenter, PointerSensor, KeyboardSensor, useSensor, useSensors,
} from '@dnd-kit/core';
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useMusic } from '../contexts/MusicContext';
import { useAuth } from '../contexts/AuthContext';

function SortableRow({ track, index, isOwner, onRemove, onAddToQueue, onPlay, isCurrentTrack, isPlayingTrack }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: track.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  return (
    <div ref={setNodeRef} style={style} className={`flex items-center gap-4 p-3 rounded-xl transition-colors group ${isDragging ? 'bg-white/10' : 'hover:bg-white/5'} ${isCurrentTrack ? 'bg-white/5' : ''}`}>
      <span className="text-white/20 text-sm font-medium w-7 text-center shrink-0 group-hover:hidden cursor-pointer hover:text-white" onClick={() => onPlay(track)}>
        {isPlayingTrack ? <AudioLines size={16} className="mx-auto text-green-500 animate-pulse" /> : <span className={isCurrentTrack ? "text-green-500" : ""}>{index + 1}</span>}
      </span>
      <button className="w-7 h-7 hidden group-hover:flex items-center justify-center text-white shrink-0" onClick={() => onPlay(track)}>
        {isPlayingTrack ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
      </button>

      {isOwner && (
        <div {...attributes} {...listeners} className="cursor-grab text-white/20 hover:text-white/50 transition-colors shrink-0 touch-none -mr-1">
          <svg width="12" height="16" viewBox="0 0 12 16" fill="currentColor">
            <circle cx="3" cy="4" r="1.5"/><circle cx="9" cy="4" r="1.5"/>
            <circle cx="3" cy="8" r="1.5"/><circle cx="9" cy="8" r="1.5"/>
            <circle cx="3" cy="12" r="1.5"/><circle cx="9" cy="12" r="1.5"/>
          </svg>
        </div>
      )}

      <img src={track.track_image} alt="" className="w-12 h-12 rounded-lg object-cover bg-white/5 shrink-0 shadow-sm" />
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${isCurrentTrack ? 'text-green-500' : 'text-white'}`}>{track.track_name}</p>
        <p className="text-white/50 text-xs truncate mt-0.5">{track.track_artist}</p>
      </div>

      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={() => onAddToQueue(track)} title="Ajouter à la file" className="p-2 text-white/50 hover:text-white hover:bg-white/10 rounded-full transition-colors">
          <ListPlus size={16} />
        </button>
        {isOwner && (
          <button onClick={() => onRemove(track.id)} title="Retirer" className="p-2 text-white/50 hover:text-red-400 hover:bg-red-500/10 rounded-full transition-colors">
            <X size={16} />
          </button>
        )}
      </div>
    </div>
  );
}

export function PlaylistDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToQueue, play, isPlaying, togglePlay, currentTrack, likedAudioUrls } = useMusic();
  const { user } = useAuth();

  const [playlist, setPlaylist] = useState(null);
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isOwner, setIsOwner] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

      const [plRes, tracksRes] = await Promise.all([
        fetch(`/api/playlists`, { headers }),
        fetch(`/api/playlists/${id}/tracks`, { headers })
      ]);

      if (plRes.ok) {
        const all = await plRes.json();
        const found = all.find(p => p.id === id);
        if (found) {
          setPlaylist(found);
          setEditName(found.name);
          setIsOwner(true);
        }
      }

      setPlaylist(current => {
        if (!current) {
          fetch('/api/playlists/public').then(res => {
            if (res.ok) {
               res.json().then(pubs => {
                 const foundObj = pubs.find(p => p.id === id);
                 if (foundObj) {
                   setPlaylist(foundObj);
                   setEditName(foundObj.name);
                 }
               });
            }
          });
        }
        return current;
      });

      if (tracksRes.ok) setTracks(await tracksRes.json());
    } catch (e) {
      console.error(e);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  // Synchronise automatiquement la page si on like/unlike depuis le lecteur
  useEffect(() => {
    if (playlist?.is_liked_playlist) {
      load(true);
    }
  }, [likedAudioUrls, playlist?.is_liked_playlist, load]);

  // Synchronise si on modifie la playlist depuis le lecteur (via le menu d'ajout)
  useEffect(() => {
    const handleUpdate = (e) => {
      if (e.detail.playlistId === id) load(true);
    };
    window.addEventListener('playlist-updated', handleUpdate);
    return () => window.removeEventListener('playlist-updated', handleUpdate);
  }, [id, load]);

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = tracks.findIndex(t => t.id === active.id);
    const newIndex = tracks.findIndex(t => t.id === over.id);
    const reordered = arrayMove(tracks, oldIndex, newIndex);
    setTracks(reordered);
    const token = localStorage.getItem('token');
    await fetch(`/api/playlists/${id}/tracks/reorder`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderedIds: reordered.map(t => t.id) })
    });
  };

  const handleRemoveTrack = async (trackId) => {
    const token = localStorage.getItem('token');
    await fetch(`/api/playlists/${id}/tracks/${trackId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    setTracks(prev => prev.filter(t => t.id !== trackId));
    window.dispatchEvent(new CustomEvent('playlist-updated', { detail: { playlistId: id } }));
  };

  const handleSaveName = async () => {
    if (!editName.trim()) return;
    setIsSaving(true);
    const token = localStorage.getItem('token');
    await fetch(`/api/playlists/${id}`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editName.trim() })
    });
    setPlaylist(p => ({ ...p, name: editName.trim() }));
    setIsEditing(false);
    setIsSaving(false);
  };

  const handleTogglePublic = async () => {
    const token = localStorage.getItem('token');
    const newVal = !playlist.is_public;
    await fetch(`/api/playlists/${id}`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_public: newVal })
    });
    setPlaylist(p => ({ ...p, is_public: newVal }));
  };

  const handlePlayTrack = async (track) => {
    const isCurrent = currentTrack?.id === track.id || currentTrack?.originalId === track.id || (currentTrack?.audioUrl && (currentTrack.audioUrl === track.audio_url || currentTrack.audioUrl === track.audioUrl));
    if (isCurrent) {
      togglePlay();
      return;
    }
    const index = tracks.findIndex(t => t.id === track.id);
    if (index !== -1) {
      tracks.slice(index + 1).forEach(t => addToQueue({
        id: t.id, name: t.track_name, artist: t.track_artist, image: t.track_image, audioUrl: t.audio_url
      }));
    }
    await play({ id: track.id, name: track.track_name, artist: track.track_artist, image: track.track_image, audioUrl: track.audio_url });
  };

  const isPlaylistPlaying = tracks.some(t => currentTrack?.id === t.id || currentTrack?.originalId === t.id || (currentTrack?.audioUrl && (currentTrack.audioUrl === t.audio_url || currentTrack.audioUrl === t.audioUrl)));

  const handlePlayAll = async () => {
    if (tracks.length === 0) return;
    if (isPlaylistPlaying) {
      togglePlay();
      return;
    }
    const first = tracks[0];
    // Add rest to queue first, then play first
    tracks.slice(1).forEach(t => addToQueue({
      id: t.id,
      name: t.track_name,
      artist: t.track_artist,
      image: t.track_image,
      audioUrl: t.audio_url
    }));
    await play({ id: first.id, name: first.track_name, artist: first.track_artist, image: first.track_image, audioUrl: first.audio_url });
  };

  const handleShuffle = async () => {
    if (tracks.length === 0) return;
    const shuffled = [...tracks].sort(() => Math.random() - 0.5);
    const first = shuffled[0];
    shuffled.slice(1).forEach(t => addToQueue({ id: t.id, name: t.track_name, artist: t.track_artist, image: t.track_image, audioUrl: t.audio_url }));
    await play({ id: first.id, name: first.track_name, artist: first.track_artist, image: first.track_image, audioUrl: first.audio_url });
  };

  const handleAddToQueue = (track) => {
    addToQueue({ id: track.id, name: track.track_name, artist: track.track_artist, image: track.track_image, audioUrl: track.audio_url });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#121212] flex items-center justify-center">
        <Loader2 size={40} className="animate-spin text-white/30" />
      </div>
    );
  }

  const coverImg = playlist?.cover_image;
  const isLikedPlaylist = playlist?.is_liked_playlist;

  return (
    <div className="min-h-screen bg-[#121212] text-white pb-28">
      {/* Header with background blur */}
      <div className="relative pt-8 px-4 sm:px-8 pb-8">
        {coverImg && (
          <div className="absolute inset-0 opacity-30 blur-3xl pointer-events-none"
            style={{ backgroundImage: `url(${coverImg})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#121212] pointer-events-none" />
        
        <div className="relative z-10 max-w-5xl mx-auto">
          <Link to="/library" className="flex items-center gap-2 text-white/50 hover:text-white transition-colors mb-8 w-fit">
            <ArrowLeft size={20} /> Bibliothèque
          </Link>

          <div className="flex flex-col sm:flex-row items-start sm:items-end gap-6 sm:gap-8">
            {/* Cover */}
            <div className={`w-48 h-48 shrink-0 rounded-2xl overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.5)] flex items-center justify-center ${isLikedPlaylist ? 'bg-gradient-to-br from-red-600 to-red-900' : 'bg-gradient-to-br from-white/10 to-white/5'}`}>
              {isLikedPlaylist ? <Heart size={72} fill="white" className="text-white" />
                : coverImg ? <img src={coverImg} alt="" className="w-full h-full object-cover" />
                : <Music2 size={72} className="text-white/30" />}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="text-xs uppercase tracking-widest text-white/50 font-bold mb-2">Playlist</p>
              
              {isEditing && isOwner ? (
                <div className="flex items-center gap-2 mb-3">
                  <input type="text" value={editName} onChange={e => setEditName(e.target.value)}
                    className="text-4xl font-black bg-transparent border-b-2 border-white outline-none flex-1 min-w-0"
                    autoFocus onKeyDown={e => { if (e.key === 'Enter') handleSaveName(); if (e.key === 'Escape') setIsEditing(false); }}
                  />
                  <button onClick={handleSaveName} disabled={isSaving} className="p-2 bg-white text-black rounded-full hover:scale-110 transition-transform">
                    {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
                  </button>
                  <button onClick={() => setIsEditing(false)} className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors">
                    <X size={18} />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-3 mb-3 group">
                  <h1 className="text-4xl sm:text-5xl font-black truncate">{playlist?.name || 'Playlist'}</h1>
                  {isOwner && !isLikedPlaylist && (
                    <button onClick={() => setIsEditing(true)} className="p-2 text-white/30 hover:text-white opacity-0 group-hover:opacity-100 transition-all">
                      <Edit3 size={20} />
                    </button>
                  )}
                </div>
              )}

              <div className="flex items-center gap-3 text-white/50 text-sm flex-wrap">
                <span>{tracks.length} titre{tracks.length !== 1 ? 's' : ''}</span>
                {isOwner && !isLikedPlaylist && (
                  <button onClick={handleTogglePublic}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors border ${playlist?.is_public ? 'border-green-500/40 text-green-400 bg-green-500/10 hover:bg-green-500/20' : 'border-white/10 text-white/40 hover:bg-white/5'}`}>
                    {playlist?.is_public ? <><Globe size={12} /> Publique</> : <><Lock size={12} /> Privée</>}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-4 mt-8">
            <button onClick={handlePlayAll} disabled={tracks.length === 0}
              className="w-16 h-16 rounded-full bg-green-500 hover:bg-green-400 text-black flex items-center justify-center shadow-xl shadow-green-500/30 hover:scale-105 active:scale-95 transition-all disabled:opacity-30">
              {isPlaying && isPlaylistPlaying ? <Pause size={28} fill="currentColor" /> : <Play size={28} fill="currentColor" className="ml-1" />}
            </button>
            <button onClick={handleShuffle} disabled={tracks.length === 0}
              className="w-14 h-14 rounded-full border border-white/20 text-white/60 hover:text-white hover:border-white flex items-center justify-center transition-colors disabled:opacity-30">
              <Shuffle size={22} />
            </button>
          </div>
        </div>
      </div>

      {/* Track List */}
      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-8">
        {tracks.length === 0 ? (
          <div className="text-center py-20 text-white/30">
            <Music2 size={64} className="mx-auto mb-4 opacity-20" />
            <p className="text-lg font-medium">Cette playlist est vide</p>
            <p className="text-sm mt-1">Ajoute des titres depuis le lecteur</p>
          </div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={tracks.map(t => t.id)} strategy={verticalListSortingStrategy}>
              <div className="divide-y divide-white/5">
                {tracks.map((track, i) => {
                  const isCurrent = currentTrack?.id === track.id || currentTrack?.originalId === track.id || (currentTrack?.audioUrl && (currentTrack.audioUrl === track.audio_url || currentTrack.audioUrl === track.audioUrl));
                  return (
                    <SortableRow key={track.id} track={track} index={i} isOwner={isOwner}
                      isCurrentTrack={isCurrent}
                      isPlayingTrack={isCurrent && isPlaying}
                      onRemove={handleRemoveTrack} onAddToQueue={handleAddToQueue} onPlay={handlePlayTrack} />
                  )
                })}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>
    </div>
  );
}
