import React from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { ArrowLeft, LogIn, Search, Loader2 } from 'lucide-react';
import PomodoroWidget from '../components/widgets/PomodoroWidget';
import { useAuth } from '../contexts/AuthContext';
import { useMusic } from '../contexts/MusicContext';

export function Pomodoro() {
  const location = useLocation();
    const navigate = useNavigate();
    const { isAuthenticated } = useAuth();

    return (
        <div className="min-h-screen pt-24 pb-12 px-4 flex flex-col items-center" style={{ background: 'var(--bg)' }}>
            <div className="w-full max-w-md">
                <button
                    onClick={() => navigate(-1)}
                    className="mb-6 flex items-center gap-2 text-sm font-medium transition-colors"
                    style={{ color: 'var(--text-muted)' }}
                >
                    <ArrowLeft size={16} />
                    Retour
                </button>

                <div className="mb-8">
                    <h1 className="text-3xl font-display font-bold" style={{ color: 'var(--text)' }}>
                        Session Focus
                    </h1>
                    <p className="mt-2 text-sm" style={{ color: 'var(--text-muted)' }}>
                        Rejoignez la session de travail partagée avec vos camarades.
                    </p>
                </div>

                {isAuthenticated ? (
                    <div className="flex flex-col gap-6">
                        <PomodoroWidget />
                        <SpotifyWidget />
                    </div>
                ) : (
                    <div className="rounded-2xl p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-card)' }}>
                        <div className="text-center py-4">
                            <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(var(--accent-rgb), 0.1)' }}>
                                <LogIn size={28} style={{ color: 'var(--accent)' }} />
                            </div>
                            <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
                                Connectez-vous pour rejoindre la session d'étude.
                            </p>
                            <div className="flex gap-2 justify-center">
                                <Link to="/login" state={{ from: location.pathname }} className="tsi-btn-primary text-sm">
                                    <LogIn size={16} />
                                    Connexion
                                </Link>
                                <Link to="/register" state={{ from: location.pathname }} className="tsi-btn-ghost text-sm">
                                    S'inscrire
                                </Link>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function SpotifyWidget() {
    const { play, currentTrack, isPlaying, isLoading: playerLoading, showPlayer, setShowPlayer } = useMusic();
    const [inputValue, setInputValue] = React.useState('');
    const [results, setResults] = React.useState([]);
    const [isSearching, setIsSearching] = React.useState(false);
    const [showDropdown, setShowDropdown] = React.useState(false);
    const [errorMsg, setErrorMsg] = React.useState('');
    const [loadingTrackId, setLoadingTrackId] = React.useState(null);
    const dropdownRef = React.useRef(null);

    React.useEffect(() => {
        function handleClickOutside(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setShowDropdown(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleSearch = async (e) => {
        e?.preventDefault();
        const val = inputValue.trim();
        if (!val) return;

        setIsSearching(true);
        setShowDropdown(true);
        setErrorMsg('');

        try {
            const res = await fetch(`/api/spotify/search?q=${encodeURIComponent(val)}`);
            const data = await res.json();

            if (!res.ok) {
                if (res.status === 403) {
                    setErrorMsg("Configurez vos clés API Spotify dans le fichier .env du serveur.");
                } else {
                    setErrorMsg("Erreur lors de la recherche Spotify.");
                }
                setResults([]);
            } else {
                setResults(data.results || []);
                if (data.results?.length === 0) setErrorMsg("Aucun résultat trouvé.");
            }
        } catch (err) {
            setErrorMsg("Erreur réseau ou serveur inaccessible.");
        } finally {
            setIsSearching(false);
        }
    };

    const selectResult = async (item) => {
        setShowDropdown(false);
        setLoadingTrackId(item.id);
        
        try {
            // Use JioSaavn to get a real MP3 audio stream
            const query = `${item.name} ${item.artist}`;
            const res = await fetch(`/api/spotify/jiosaavn-search?q=${encodeURIComponent(query)}`);
            const data = await res.json();
            
            if (res.ok && data.audioUrl) {
                await play({
                    name: item.name,
                    artist: item.artist,
                    image: item.image || data.image || '',
                    audioUrl: data.audioUrl
                });
            } else {
                console.error('JioSaavn failed:', data.error);
                alert(`Musique non disponible : ${data.error || 'Erreur inconnue'}`);
            }
        } catch (err) {
            console.error('Erreur lecture:', err);
            alert('Impossible de charger la musique.');
        } finally {
            setLoadingTrackId(null);
        }
    };

    return (
        <div
            className="rounded-2xl shadow-sm relative overflow-hidden"
            style={{
                border: '1px solid var(--border)',
                background: 'var(--surface)',
            }}
        >
            {/* Header / Search Bar */}
            <div className="px-4 py-3 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3" style={{ borderColor: 'var(--border)' }}>
                <div className="flex items-center gap-2">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="#1DB954" className="shrink-0">
                        <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.84.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.6.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
                    </svg>
                    <span className="text-sm font-semibold whitespace-nowrap" style={{ color: 'var(--text)' }}>
                        Musique
                    </span>
                    {currentTrack && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/10 text-green-600 font-medium">
                            {isPlaying ? '▶ En lecture' : '⏸ Pausé'}
                        </span>
                    )}
                </div>

                <div className="relative flex-1 sm:max-w-[280px]" ref={dropdownRef}>
                    <form onSubmit={handleSearch} className="flex gap-2">
                        <input
                            type="text"
                            placeholder="Rechercher sur Spotify..."
                            value={inputValue}
                            onChange={e => setInputValue(e.target.value)}
                            onFocus={() => { if (results.length > 0 || errorMsg) setShowDropdown(true) }}
                            className="flex-1 px-3 py-1.5 rounded-lg text-xs outline-none"
                            spellCheck={false}
                            style={{
                                background: 'var(--surface-2)',
                                border: '1px solid var(--border)',
                                color: 'var(--text)'
                            }}
                        />
                        <button
                            type="submit"
                            disabled={isSearching}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer flex items-center gap-1.5 transition-colors"
                            style={{
                                background: 'rgba(29, 185, 84, 0.1)',
                                color: '#1DB954',
                                border: '1px solid rgba(29, 185, 84, 0.2)',
                                opacity: isSearching ? 0.7 : 1
                            }}
                        >
                            {isSearching ? <Loader2 size={12} className="animate-spin" /> : <Search size={12} />}
                            Chercher
                        </button>
                    </form>

                    {/* Results Dropdown */}
                    {showDropdown && (results.length > 0 || errorMsg) && (
                        <div
                            className="absolute top-full right-0 left-0 mt-2 rounded-xl py-2 shadow-lg z-50 overflow-hidden backdrop-blur-md"
                            style={{
                                background: 'rgba(var(--surface-rgb), 0.95)',
                                border: '1px solid var(--border)',
                                maxHeight: '300px',
                                overflowY: 'auto'
                            }}
                        >
                            {errorMsg ? (
                                <div className="px-4 py-3 text-xs text-center" style={{ color: 'var(--text-muted)' }}>
                                    {errorMsg}
                                </div>
                            ) : (
                                <>
                                    <div className="px-3 pb-2 text-[0.65rem] font-bold tracking-wider uppercase" style={{ color: 'var(--text-muted)' }}>
                                        Résultats — lecture HD via YouTube
                                    </div>
                                    {results.map(item => (
                                        <button
                                            key={item.id}
                                            onClick={(e) => {
                                                e.preventDefault();
                                                selectResult(item);
                                            }}
                                            disabled={loadingTrackId === item.id}
                                            className="w-full text-left px-3 py-2 flex items-center gap-3 transition-colors hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-60"
                                        >
                                            {item.image ? (
                                                <img src={item.image} alt="" className="w-8 h-8 rounded shrink-0 object-cover" />
                                            ) : (
                                                <div className="w-8 h-8 rounded shrink-0 flex items-center justify-center" style={{ background: 'var(--surface-2)', color: 'var(--text-muted)' }}>
                                                    🎵
                                                </div>
                                            )}
                                            <div className="min-w-0 flex-1">
                                                <div className="text-xs font-bold truncate" style={{ color: 'var(--text)' }}>
                                                    {item.name}
                                                </div>
                                                <div className="text-[0.65rem] truncate" style={{ color: 'var(--text-muted)' }}>
                                                    {item.type === 'track' ? 'Morceau' : 'Playlist'} • {item.artist}
                                                </div>
                                            </div>
                                            {loadingTrackId === item.id && <Loader2 size={14} className="animate-spin text-green-500 shrink-0" />}
                                        </button>
                                    ))}
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Current Track Info (just a status, player is in MiniPlayer) */}
            <div className="p-4 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                {currentTrack ? (
                    <div className="flex flex-col items-center gap-2">
                        <p>
                            <span className="font-semibold" style={{ color: 'var(--text)' }}>{currentTrack.name}</span>
                            {' — '}{currentTrack.artist}
                        </p>
                        {!showPlayer && (
                           <button onClick={() => setShowPlayer(true)} className="text-xs px-3 py-1.5 bg-green-500/10 text-green-600 rounded-lg font-medium hover:bg-green-500/20 transition-colors">
                               Ouvrir le lecteur
                           </button>
                        )}
                        {showPlayer && <span className="text-xs mt-1 block">Le contrôleur flottant en bas à droite ↘</span>}
                    </div>
                ) : (
                    <div className="flex flex-col items-center gap-3">
                        <p>Cherchez un morceau pour commencer 🎵</p>
                        {!showPlayer && (
                            <button onClick={() => setShowPlayer(true)} className="text-xs px-3 py-1.5 bg-green-500/10 text-green-600 rounded-lg font-medium hover:bg-green-500/20 transition-colors">
                                Afficher le Lecteur
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
