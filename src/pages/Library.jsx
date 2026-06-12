import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Music2, Heart, Plus, Globe, Lock, Play, Loader2, Disc3, MoreHorizontal, Trash2, Share2, Trophy } from 'lucide-react';
import { useMusic } from '../contexts/MusicContext';
import { useAuth } from '../contexts/AuthContext';

export function Library() {
  const { playlists, refreshPlaylists, createPlaylist } = useMusic();
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [publicPlaylists, setPublicPlaylists] = useState([]);
  const [loadingPublic, setLoadingPublic] = useState(true);
  const [showImport, setShowImport] = useState(false);
  const [importUrl, setImportUrl] = useState('');
  const [importing, setImporting] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    refreshPlaylists();
    fetchPublicPlaylists();
  }, []);

  const fetchPublicPlaylists = async () => {
    try {
      const res = await fetch('/api/playlists/public');
      if (res.ok) setPublicPlaylists(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingPublic(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    await createPlaylist(newName.trim(), isPublic);
    setNewName('');
    setIsPublic(false);
    setShowCreate(false);
    setCreating(false);
  };

  const handleImport = async (e) => {
    e.preventDefault();
    if (!importUrl.trim()) return;
    setImporting(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/spotify/import-playlist', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: importUrl.trim() })
      });
      const data = await res.json();
      if (res.ok) {
        refreshPlaylists();
        setShowImport(false);
        setImportUrl('');
        alert('Playlist importée avec succès !');
      } else {
        alert(data.error || 'Erreur lors de l\'import');
      }
    } catch (e) {
      alert('Erreur réseau');
    } finally {
      setImporting(false);
    }
  };

  const handleDelete = async (playlistId) => {
    if (!confirm('Supprimer cette playlist ?')) return;
    const token = localStorage.getItem('token');
    await fetch(`/api/playlists/${playlistId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` },
    });
    refreshPlaylists();
  };

  const handleSavePublic = async (playlistId) => {
    const token = localStorage.getItem('token');
    const res = await fetch(`/api/playlists/${playlistId}/save`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (res.ok) {
      refreshPlaylists();
      alert('Playlist sauvegardée dans ta bibliothèque !');
    }
  };

  const likedPlaylist = playlists.find(p => p.is_liked_playlist);
  const myPlaylists = playlists.filter(p => !p.is_liked_playlist);

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] px-4 sm:px-8 py-8 pb-28">
      <div className="max-w-5xl mx-auto">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-4">
          <div>
            <h1 className="text-4xl font-black mb-1">Ma Bibliothèque</h1>
            <p className="text-[var(--text)]/50">Tes playlists, tes coups de cœur, ta musique</p>
          </div>
          <div className="flex items-center gap-3">
            {isAuthenticated && (
              <>
                <Link to="/wrapped"
                  className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-[var(--text)] font-bold rounded-full hover:scale-105 transition-all shadow-lg border border-[var(--border)]">
                  <Trophy size={18} /> Wrapped
                </Link>
                <button onClick={() => setShowImport(true)}
                  className="flex items-center gap-2 px-5 py-3 bg-[var(--surface-2)] text-[var(--text)] font-bold rounded-full hover:bg-white/20 transition-all border border-[var(--border)]">
                  <Share2 size={18} className="rotate-180" /> Import Spotify
                </button>
                <button onClick={() => setShowCreate(true)}
                  className="flex items-center gap-2 px-5 py-3 bg-white text-black font-bold rounded-full hover:scale-105 active:scale-95 transition-transform shadow-lg">
                  <Plus size={18} /> Nouvelle playlist
                </button>
              </>
            )}
          </div>
        </div>


        {/* Create Playlist Modal */}
        {showCreate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--surface-3)] backdrop-blur-sm p-4" onClick={() => setShowCreate(false)}>
            <div className="bg-[#282828] rounded-2xl p-6 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
              <h2 className="text-xl font-bold mb-5">Créer une playlist</h2>
              <form onSubmit={handleCreate} className="space-y-4">
                <input type="text" placeholder="Nom de la playlist" value={newName} onChange={e => setNewName(e.target.value)}
                  className="w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-xl px-4 py-3 text-[var(--text)] placeholder-white/40 outline-none focus:border-white/30 transition-all font-medium"
                  autoFocus />
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={isPublic} onChange={e => setIsPublic(e.target.checked)} className="w-5 h-5 accent-green-500 rounded" />
                  <span className="text-[var(--text)]/70 text-sm">Rendre publique (visible par tous)</span>
                </label>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowCreate(false)} className="flex-1 py-3 rounded-xl border border-[var(--border)] text-[var(--text)]/60 hover:bg-[var(--surface-2)] transition-colors font-medium">Annuler</button>
                  <button type="submit" disabled={creating || !newName.trim()} className="flex-1 py-3 rounded-xl bg-green-500 text-black font-bold hover:bg-green-400 transition-colors disabled:opacity-50">
                    {creating ? <Loader2 size={18} className="animate-spin mx-auto" /> : 'Créer'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Import Playlist Modal */}
        {showImport && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--surface-3)] backdrop-blur-sm p-4" onClick={() => setShowImport(false)}>
            <div className="bg-[#282828] rounded-2xl p-6 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg bg-[#1DB954] flex items-center justify-center">
                  <Share2 size={20} className="text-[var(--text)] rotate-180" />
                </div>
                <h2 className="text-xl font-bold">Import Spotify</h2>
              </div>
              <p className="text-[var(--text)]/50 text-sm mb-5">Colle le lien d'une playlist Spotify publique pour l'importer instantanément.</p>
              
              <form onSubmit={handleImport} className="space-y-4">
                <input type="text" placeholder="https://open.spotify.com/playlist/..." value={importUrl} onChange={e => setImportUrl(e.target.value)}
                  className="w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-xl px-4 py-3 text-[var(--text)] placeholder-white/40 outline-none focus:border-white/30 transition-all font-medium"
                  autoFocus />
                
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowImport(false)} className="flex-1 py-3 rounded-xl border border-[var(--border)] text-[var(--text)]/60 hover:bg-[var(--surface-2)] transition-colors font-medium">Annuler</button>
                  <button type="submit" disabled={importing || !importUrl.trim()} className="flex-1 py-3 rounded-xl bg-[#1DB954] text-[var(--text)] font-bold hover:bg-[#1ed760] transition-colors disabled:opacity-50">
                    {importing ? <Loader2 size={18} className="animate-spin mx-auto" /> : 'Importer'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Liked Tracks Card */}
        {isAuthenticated && (
          <div className="mb-10">
            <h2 className="text-lg font-bold text-[var(--text)]/70 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Heart size={16} className="text-red-500" /> Coups de cœur
            </h2>
            <Link to={likedPlaylist ? `/library/${likedPlaylist.id}` : '#'}
              className="flex items-center gap-5 p-5 rounded-2xl bg-gradient-to-br from-red-900/40 to-red-700/20 border border-red-500/20 hover:bg-red-900/50 transition-colors group cursor-pointer">
              <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-red-600 to-red-900 flex items-center justify-center shadow-lg">
                <Heart size={32} fill="white" className="text-[var(--text)]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[var(--text)] text-xl font-bold">Titres Likés</p>
                <p className="text-[var(--text)]/50 text-sm mt-1">Tous les titres que tu as aimés ❤️</p>
              </div>
              <div className="p-4 bg-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-all group-hover:scale-110 shadow-lg shadow-red-500/30">
                <Play size={22} fill="white" className="text-[var(--text)] ml-0.5" />
              </div>
            </Link>
          </div>
        )}

        {/* My Playlists */}
        {isAuthenticated && (
          <div className="mb-12">
            <h2 className="text-lg font-bold text-[var(--text)]/70 uppercase tracking-widest mb-5 flex items-center gap-2">
              <Disc3 size={16} /> Mes playlists
            </h2>
            {myPlaylists.length === 0 ? (
              <div className="text-center py-16 text-[var(--text)]/30">
                <Music2 size={48} className="mx-auto mb-4 opacity-30" />
                <p className="font-medium">Aucune playlist pour l'instant</p>
                <p className="text-sm mt-1">Crée ta première playlist pour organiser ta musique</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {myPlaylists.map(pl => (
                  <PlaylistCard key={pl.id} playlist={pl} isOwner={true} onDelete={handleDelete} navigate={navigate} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Public Playlists */}
        <div>
          <h2 className="text-lg font-bold text-[var(--text)]/70 uppercase tracking-widest mb-5 flex items-center gap-2">
            <Globe size={16} /> Playlists publiques
          </h2>
          {loadingPublic ? (
            <div className="flex justify-center py-16"><Loader2 size={32} className="animate-spin text-[var(--text)]/30" /></div>
          ) : publicPlaylists.length === 0 ? (
            <div className="text-center py-16 text-[var(--text)]/30">
              <Globe size={48} className="mx-auto mb-4 opacity-30" />
              <p className="font-medium">Aucune playlist publique pour l'instant</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {publicPlaylists.filter(p => !p.users || p.users.id !== user?.id).map(pl => (
                <PlaylistCard key={pl.id} playlist={pl} isOwner={false} onSave={handleSavePublic} navigate={navigate} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PlaylistCard({ playlist, isOwner, onDelete, onSave, navigate }) {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div className="relative group">
      <div onClick={() => navigate(`/library/${playlist.id}`)}
        className="bg-[#181818] hover:bg-[#282828] rounded-xl overflow-hidden cursor-pointer transition-colors p-4 flex flex-col gap-3">
        <div className="aspect-square rounded-lg bg-gradient-to-br from-white/10 to-white/5 flex items-center justify-center overflow-hidden relative">
          {playlist.cover_image ? (
            <img src={playlist.cover_image} alt="" className="w-full h-full object-cover" />
          ) : (
            <Music2 size={36} className="text-[var(--text)]/30" />
          )}
          <div className="absolute inset-0 flex items-end justify-between p-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={e => { e.stopPropagation(); setShowMenu(v => !v); }}
              className="p-1.5 bg-[var(--surface-3)] rounded-full text-[var(--text)]/80 hover:text-[var(--text)]">
              <MoreHorizontal size={16} />
            </button>
            <button onClick={e => e.stopPropagation()}
              className="p-3 bg-green-500 rounded-full shadow-lg shadow-green-500/30 hover:scale-110 transition-transform">
              <Play size={18} fill="white" className="text-[var(--text)] ml-0.5" />
            </button>
          </div>
        </div>
        <div>
          <p className="text-[var(--text)] font-semibold text-sm truncate">{playlist.name}</p>
          <div className="flex items-center gap-1.5 mt-1">
            {playlist.is_public ? <Globe size={11} className="text-[var(--text)]/40" /> : <Lock size={11} className="text-[var(--text)]/40" />}
            <p className="text-[var(--text)]/40 text-xs truncate">
              {isOwner ? (playlist.is_public ? 'Publique' : 'Privée') : `par ${playlist.users?.username || 'inconnu'}`}
            </p>
          </div>
        </div>
      </div>

      {/* Context Menu */}
      {showMenu && (
        <div className="absolute left-0 bottom-full mb-1 w-44 bg-[#282828] border border-[var(--border)] rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150" onClick={e => e.stopPropagation()}>
          {isOwner ? (
            <button onClick={() => { onDelete(playlist.id); setShowMenu(false); }}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors text-left">
              <Trash2 size={14} /> Supprimer
            </button>
          ) : (
            <button onClick={() => { onSave(playlist.id); setShowMenu(false); }}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-[var(--text)]/80 hover:bg-[var(--surface-2)] transition-colors text-left">
              <Plus size={14} /> Sauvegarder
            </button>
          )}
          <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/library/${playlist.id}`); setShowMenu(false); }}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-[var(--text)]/60 hover:bg-[var(--surface-2)] transition-colors text-left border-t border-[var(--border)]">
            <Share2 size={14} /> Copier le lien
          </button>
        </div>
      )}
    </div>
  );
}
