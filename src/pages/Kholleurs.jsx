import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Shield, Star, StarHalf, MessageSquare, Plus, X, BarChart2, User, LogIn, ArrowLeft, Trash2, Edit, Heart } from 'lucide-react';
import { UserAvatar } from '../components/UserAvatar';
import { useAuth } from '../contexts/AuthContext';

const API_BASE = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:3001' : '');

export function Kholleurs() {
    const { getToken, user } = useAuth();
    const location = useLocation();
    const [kholleurs, setKholleurs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedKholleur, setSelectedKholleur] = useState(null);
    const [reviews, setReviews] = useState([]);
    const [loadingReviews, setLoadingReviews] = useState(false);
    
    const [showForm, setShowForm] = useState(false);
    const [rating, setRating] = useState(5);
    const [hoverRating, setHoverRating] = useState(0);
    const [comment, setComment] = useState('');
    const [isAnonymous, setIsAnonymous] = useState(false);
    const [editingReviewId, setEditingReviewId] = useState(null);
    const [reviewToDelete, setReviewToDelete] = useState(null);
    const [expandedRating, setExpandedRating] = useState(null);

    useEffect(() => {
        fetchKholleursStats();
    }, []);

    const fetchKholleursStats = async () => {
        try {
            setLoading(true);
            const res = await fetch(`${API_BASE}/api/kholleurs/stats`);
            if (!res.ok) throw new Error('Erreur lors du chargement des statistiques');
            const data = await res.json();
            setKholleurs(data);
            return data;
        } catch (err) {
            setError(err.message);
            return null;
        } finally {
            setLoading(false);
        }
    };

    const handleSelectKholleur = async (kholleur) => {
        setSelectedKholleur(kholleur);
        setReviews([]);
        setShowForm(false);
        setRating(5);
        setHoverRating(0);
        setComment('');
        setIsAnonymous(false);
        setEditingReviewId(null);
        setExpandedRating(null);
        
        // Scroll to top automatically on mobile when selecting
        window.scrollTo({ top: 0, behavior: 'smooth' });
        
        try {
            setLoadingReviews(true);
            const res = await fetch(`${API_BASE}/api/kholleurs/${encodeURIComponent(kholleur.name)}/reviews`);
            if (res.ok) {
                const data = await res.json();
                setReviews(data);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoadingReviews(false);
        }
    };

    const handleSubmitReview = async (e) => {
        e.preventDefault();
        const token = getToken();
        if (!token) return alert('Vous devez être connecté pour donner votre avis.');
        
        try {
            let res;
            if (editingReviewId) {
                res = await fetch(`${API_BASE}/api/kholleurs/reviews/${editingReviewId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        note: rating,
                        commentaire: comment,
                        is_anonymous: isAnonymous
                    })
                });
            } else {
                res = await fetch(`${API_BASE}/api/kholleurs/${encodeURIComponent(selectedKholleur.name)}/reviews`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        note: rating,
                        commentaire: comment,
                        is_anonymous: isAnonymous,
                        matiere: selectedKholleur.matiere
                    })
                });
            }

            if (!res.ok) throw new Error('Erreur lors de l\'envoi');
            const data = await res.json();
            
            if (editingReviewId) {
                setReviews(reviews.map(r => r.id === editingReviewId ? { ...r, note: data.note, commentaire: data.commentaire, pseudo: data.pseudo } : r));
            } else {
                // On ajoute manuellement les infos d'avatar pour l'affichage direct
                const addedReview = {
                    ...data,
                    user_id: user?.id,
                    user_avatar: user?.avatar || user?.googleAvatar
                };
                setReviews([addedReview, ...reviews]);
            }
            
            setShowForm(false);
            setRating(5);
            setHoverRating(0);
            setComment('');
            setEditingReviewId(null);
            
            // Update stats
            const updatedStats = await fetchKholleursStats();
            if (updatedStats && selectedKholleur) {
                const updatedSelected = updatedStats.find(k => k.name === selectedKholleur.name);
                if (updatedSelected) setSelectedKholleur(updatedSelected);
            }

        } catch (err) {
            alert(err.message);
        }
    };

    const handleDeleteReview = async () => {
        if (!reviewToDelete) return;
        const reviewId = reviewToDelete;
        const token = getToken();
        try {
            const res = await fetch(`${API_BASE}/api/kholleurs/reviews/${reviewId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                setReviews(reviews.filter(r => r.id !== reviewId));
                const updatedStats = await fetchKholleursStats();
                if (updatedStats && selectedKholleur) {
                    const updatedSelected = updatedStats.find(k => k.name === selectedKholleur.name);
                    if (updatedSelected) setSelectedKholleur(updatedSelected);
                }
            } else {
                alert('Erreur lors de la suppression');
            }
        } catch (err) {
            console.error(err);
        } finally {
            setReviewToDelete(null);
        }
    };

    const handleLike = async (reviewId) => {
        const token = getToken();
        if (!token) return;
        try {
            const res = await fetch(`${API_BASE}/api/kholleurs/reviews/${reviewId}/like`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const { likes } = await res.json();
                setReviews(reviews.map(r => r.id === reviewId ? { ...r, likes } : r));
            }
        } catch (err) {
            console.error(err);
        }
    };

    // Helper: Render stars dynamically
    const renderStars = (rating) => {
        const stars = [];
        for (let i = 1; i <= 5; i++) {
            if (i <= rating) {
                stars.push(<Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />);
            } else if (i - 0.5 <= rating) {
                stars.push(<StarHalf key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />);
            } else {
                stars.push(<Star key={i} className="w-4 h-4 text-gray-300 dark:text-gray-600" />);
            }
        }
        return <div className="flex gap-0.5">{stars}</div>;
    };

    return (
        <div style={{ background: 'var(--bg)', minHeight: '100vh', paddingBottom: '24px' }}>
            {/* Header Sticky Modernisé */}
            <div className="sticky top-[calc(3.5rem+env(safe-area-inset-top))] z-30" style={{ background: 'var(--nav-bg)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderBottom: '1px solid var(--border)' }}>
                <div className="max-w-6xl mx-auto px-4 py-4">
                    <div className="flex items-center gap-3">
                        <Link to="/" className="p-2 rounded-xl flex items-center justify-center transition-all w-fit" style={{ background: 'var(--surface-2)', color: 'var(--text-muted)' }}>
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <div className="flex items-center gap-2">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--accent)' }}>
                                <BarChart2 size={22} className="text-white" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold" style={{ color: 'var(--text)' }}>Avis Kholleurs</h1>
                                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Notes et retours sur vos kholleurs</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-4 py-6">
                {error && (
                    <div className="p-4 rounded-xl mb-6 text-sm flex items-center gap-2" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#EF4444', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                        {error}
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    
                    {/* Liste des Kholleurs (Cachée sur mobile si un kholleur est sélectionné) */}
                    <div className={`lg:col-span-1 space-y-4 ${selectedKholleur ? 'hidden lg:block' : 'block'}`}>
                        <div className="rounded-2xl p-5 sticky top-28" style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-card)' }}>
                            <h2 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--text)' }}>
                                <User className="w-5 h-5" style={{ color: 'var(--accent)' }} />
                                Professeurs
                            </h2>
                            
                            <div className="space-y-2 max-h-[calc(100vh-250px)] overflow-y-auto pr-2 custom-scrollbar">
                                {loading && (
                                  <div className="space-y-3">
                                    {[1,2,3,4,5].map(i => (
                                      <div key={i} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                                        <div className="w-11 h-11 rounded-full animate-pulse" style={{ background: 'var(--surface-2)' }} />
                                        <div className="flex-1 space-y-2">
                                          <div className="w-28 h-3.5 rounded-full animate-pulse" style={{ background: 'var(--surface-2)' }} />
                                          <div className="w-16 h-2.5 rounded-full animate-pulse" style={{ background: 'var(--surface-2)' }} />
                                        </div>
                                        <div className="w-12 h-7 rounded-lg animate-pulse" style={{ background: 'var(--surface-2)' }} />
                                      </div>
                                    ))}
                                  </div>
                                )}
                                {!loading && kholleurs.length === 0 && (
                                    <div className="text-center py-4 text-sm" style={{ color: 'var(--text-muted)' }}>Aucun professeur trouvé.</div>
                                )}
                                
                                {kholleurs.map((prof, idx) => {
                                    const isSelected = selectedKholleur?.name === prof.name;
                                    return (
                                        <button
                                            key={idx}
                                            onClick={() => handleSelectKholleur(prof)}
                                            className="w-full text-left p-3 rounded-xl transition-all border flex justify-between items-center group"
                                            style={{
                                                background: isSelected ? 'var(--surface-2)' : 'transparent',
                                                borderColor: isSelected ? 'var(--accent)' : 'transparent',
                                            }}
                                        >
                                            <div className="min-w-0 flex-1 pr-3">
                                                <div className="font-semibold truncate" style={{ color: 'var(--text)' }}>
                                                    {prof.name}
                                                </div>
                                                <div className="text-xs truncate mt-0.5" style={{ color: 'var(--text-muted)' }}>
                                                    {prof.matiere}
                                                </div>
                                            </div>
                                            <div className="text-right shrink-0">
                                                <div className="flex items-center justify-end gap-1 font-bold text-sm" style={{ color: 'var(--text)' }}>
                                                    {prof.avg_rating > 0 ? prof.avg_rating.toFixed(1) : '-'}
                                                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                                                </div>
                                                <div className="text-[10px] font-medium mt-1" style={{ color: 'var(--text-muted)' }}>
                                                    {prof.total_reviews} avis
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Détails du Kholleur sélectionné */}
                    <div className={`lg:col-span-2 space-y-6 animate-fade-in-up ${!selectedKholleur ? 'hidden lg:block' : 'block'}`}>
                        {!selectedKholleur ? (
                            <div className="rounded-2xl p-12 text-center h-full flex flex-col items-center justify-center min-h-[400px]" style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-card)' }}>
                                <Shield className="w-16 h-16 mb-4 opacity-50" style={{ color: 'var(--text-muted)' }} />
                                <h3 className="text-xl font-bold" style={{ color: 'var(--text)' }}>Sélectionnez un professeur</h3>
                                <p className="mt-2 text-sm max-w-md" style={{ color: 'var(--text-muted)' }}>
                                    Cliquez sur un professeur dans la liste pour voir ses évaluations détaillées ou partager votre retour d'expérience.
                                </p>
                            </div>
                        ) : (
                            <>
                                {/* Bouton retour sur mobile uniquement */}
                                <button 
                                    onClick={() => setSelectedKholleur(null)}
                                    className="lg:hidden flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors mb-2"
                                    style={{ background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)' }}
                                >
                                    <ArrowLeft size={16} />
                                    Retour aux professeurs
                                </button>

                                {/* Header & Graphique */}
                                <div className="rounded-2xl p-6" style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-card)' }}>
                                    <div className="flex justify-between items-start mb-6">
                                        <div className="min-w-0 pr-4">
                                            <h2 className="text-2xl font-bold truncate" style={{ color: 'var(--text)' }}>
                                                {selectedKholleur.name}
                                            </h2>
                                            <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold mt-2" style={{ background: 'rgba(var(--accent-rgb), 0.1)', color: 'var(--accent)' }}>
                                                {selectedKholleur.matiere || 'Matière inconnue'}
                                            </span>
                                        </div>
                                        
                                        <div className="text-center p-4 rounded-2xl shrink-0" style={{ background: 'var(--surface-2)' }}>
                                            <div className="text-3xl font-bold flex items-center justify-center gap-2" style={{ color: 'var(--accent)' }}>
                                                {selectedKholleur.avg_rating > 0 ? selectedKholleur.avg_rating.toFixed(1) : '-'}
                                            </div>
                                            <div className="flex justify-center mt-2">
                                                {renderStars(selectedKholleur.avg_rating)}
                                            </div>
                                            <div className="text-xs mt-2 font-medium" style={{ color: 'var(--text-muted)' }}>
                                                {selectedKholleur.total_reviews} avis
                                            </div>
                                        </div>
                                    </div>

                                    {selectedKholleur.total_reviews > 0 && (
                                        <div className="mt-8 pt-6" style={{ borderTop: '1px dashed var(--border)' }}>
                                            <h3 className="text-xs font-bold mb-4 uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                                                Répartition des notes
                                            </h3>
                                            <div className="space-y-1">
                                                {[5, 4, 3, 2, 1].map(n => {
                                                    const count = selectedKholleur.ratings_distribution[n] || 0;
                                                    const percent = selectedKholleur.total_reviews > 0 ? (count / selectedKholleur.total_reviews) * 100 : 0;
                                                    const ratingReviews = reviews.filter(r => r.note === n);
                                                    
                                                    return (
                                                        <div key={n} className="flex flex-col">
                                                            <button 
                                                                onClick={() => setExpandedRating(expandedRating === n ? null : n)}
                                                                className="flex items-center gap-3 text-sm w-full p-1.5 -mx-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors focus:outline-none"
                                                            >
                                                                <div className="flex items-center gap-1 w-8 shrink-0 justify-end" style={{ color: 'var(--text-muted)' }}>
                                                                    <span className="font-medium">{n}</span>
                                                                    <Star size={12} className="fill-amber-400 text-amber-400" />
                                                                </div>
                                                                <div className="flex-1 h-2.5 rounded-full overflow-hidden" style={{ background: 'var(--surface-2)' }}>
                                                                    <div 
                                                                        className="h-full rounded-full transition-all duration-1000 ease-out" 
                                                                        style={{ 
                                                                            width: `${percent}%`, 
                                                                            background: n >= 4 ? '#22c55e' : n === 3 ? '#eab308' : n === 2 ? '#f97316' : '#ef4444'
                                                                        }} 
                                                                    />
                                                                </div>
                                                                <span className="w-8 text-xs text-right font-medium" style={{ color: 'var(--text-muted)' }}>{count}</span>
                                                            </button>
                                                            
                                                            {/* Liste des votants façon facepile pour gagner de la place */}
                                                            {expandedRating === n && ratingReviews.length > 0 && (
                                                                <div className="pl-12 pr-2 py-2 flex flex-wrap gap-1.5 animate-fade-in">
                                                                    {ratingReviews.map((r, idx) => (
                                                                        <div 
                                                                            key={r.id || idx} 
                                                                            className="w-6 h-6 rounded-full overflow-hidden border border-white dark:border-gray-800 shadow-sm"
                                                                            title={r.pseudo}
                                                                        >
                                                                            {r.pseudo === 'Anonyme' ? (
                                                                                <div className="w-full h-full flex items-center justify-center" style={{ background: 'rgba(var(--text-muted-rgb), 0.2)' }}>
                                                                                    <Shield size={12} style={{ color: 'var(--text-muted)' }} />
                                                                                </div>
                                                                            ) : r.user_avatar ? (
                                                                                <img src={r.user_avatar.startsWith('http') ? r.user_avatar : `${API_BASE}${r.user_avatar}`} alt={r.pseudo} className="w-full h-full object-cover" />
                                                                            ) : (
                                                                                <div className="w-full h-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-[10px] font-bold">
                                                                                    {r.pseudo[0]?.toUpperCase() || '?'}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Section Avis */}
                                <div className="rounded-2xl p-6" style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-card)' }}>
                                    <div className="flex justify-between items-center mb-6">
                                        <h3 className="text-lg font-bold flex items-center gap-2" style={{ color: 'var(--text)' }}>
                                            <MessageSquare className="w-5 h-5" style={{ color: 'var(--accent)' }} />
                                            Avis ({reviews.length})
                                        </h3>
                                        
                                        {!showForm && user && (
                                            <button
                                                onClick={() => {
                                                    setEditingReviewId(null);
                                                    setRating(5);
                                                    setComment('');
                                                    setIsAnonymous(false);
                                                    setShowForm(true);
                                                }}
                                                className="flex items-center gap-2 text-sm py-2.5 px-5 rounded-xl shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5"
                                                style={{ background: 'linear-gradient(135deg, var(--accent) 0%, #8b5cf6 100%)', color: 'white', border: 'none', fontWeight: 'bold' }}
                                            >
                                                <Plus className="w-4 h-4" />
                                                Donner un avis
                                            </button>
                                        )}
                                    </div>

                                    {/* Login Prompt if not connected */}
                                    {!user && !showForm && (
                                        <div className="mb-8 p-6 rounded-2xl text-center" style={{ background: 'var(--surface-2)', border: '1px dashed var(--border)' }}>
                                            <div className="w-14 h-14 mx-auto rounded-full flex items-center justify-center mb-4" style={{ background: 'rgba(var(--accent-rgb), 0.1)' }}>
                                                <LogIn size={28} style={{ color: 'var(--accent)' }} />
                                            </div>
                                            <h4 className="font-bold mb-2" style={{ color: 'var(--text)' }}>Envie de donner votre avis ?</h4>
                                            <p className="text-sm mb-5" style={{ color: 'var(--text-muted)' }}>
                                                Connectez-vous pour évaluer {selectedKholleur.name}.
                                            </p>
                                            <div className="flex justify-center gap-3">
                                                <Link to="/login" state={{ from: location.pathname }} className="tsi-btn-primary text-sm">
                                                    Connexion
                                                </Link>
                                                <Link to="/register" state={{ from: location.pathname }} className="tsi-btn-ghost text-sm">
                                                    S'inscrire
                                                </Link>
                                            </div>
                                        </div>
                                    )}

                                    {/* Formulaire d'ajout ou modification */}
                                    {showForm && (
                                        <form onSubmit={handleSubmitReview} className="mb-8 p-5 rounded-2xl" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                                            <div className="flex justify-between items-center mb-4">
                                                <h4 className="font-bold" style={{ color: 'var(--text)' }}>
                                                    {editingReviewId ? 'Modifier votre avis' : 'Votre évaluation'}
                                                </h4>
                                                <button type="button" onClick={() => setShowForm(false)} className="opacity-70 hover:opacity-100 transition-opacity" style={{ color: 'var(--text)' }}>
                                                    <X size={20} />
                                                </button>
                                            </div>
                                            
                                            <div className="flex items-center gap-2 mb-6">
                                                {[1, 2, 3, 4, 5].map((star) => {
                                                    const currentRating = hoverRating || rating;
                                                    return (
                                                        <button
                                                            key={star}
                                                            type="button"
                                                            onClick={() => setRating(star)}
                                                            onMouseEnter={() => setHoverRating(star)}
                                                            onMouseLeave={() => setHoverRating(0)}
                                                            className="focus:outline-none transition-transform hover:scale-110 active:scale-95"
                                                        >
                                                            <Star 
                                                                className={`w-8 h-8 transition-colors ${currentRating >= star ? 'fill-amber-400 text-amber-400' : 'text-gray-300 dark:text-gray-600'}`} 
                                                            />
                                                        </button>
                                                    );
                                                })}
                                            </div>

                                            <div className="mb-4">
                                                <textarea
                                                    value={comment}
                                                    onChange={(e) => setComment(e.target.value)}
                                                    placeholder="Que pensez-vous de ce professeur ? (Pédagogie, difficulté, ambiance...)"
                                                    className="tsi-input w-full min-h-[120px]"
                                                    style={{ resize: 'none' }}
                                                />
                                            </div>

                                            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                                                <label className="flex items-center gap-2 cursor-pointer text-sm font-medium" style={{ color: 'var(--text)' }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={isAnonymous}
                                                        onChange={(e) => setIsAnonymous(e.target.checked)}
                                                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                    />
                                                    Publier anonymement
                                                </label>
                                                
                                                <button
                                                    type="submit"
                                                    disabled={!user || rating === 0}
                                                    className="tsi-btn-primary w-full sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    {editingReviewId ? 'Enregistrer' : 'Publier l\'avis'}
                                                </button>
                                            </div>
                                        </form>
                                    )}

                                    {/* Liste des commentaires */}
                                    <div className="space-y-4">
                                        {loadingReviews && (
                                          <div className="space-y-3 py-4">
                                            {[1,2,3].map(i => (
                                              <div key={i} className="p-3 rounded-xl space-y-2" style={{ background: 'var(--surface-2)' }}>
                                                <div className="flex items-center gap-2">
                                                  <div className="w-6 h-6 rounded-full animate-pulse" style={{ background: 'var(--border)' }} />
                                                  <div className="w-20 h-3 rounded-full animate-pulse" style={{ background: 'var(--border)' }} />
                                                </div>
                                                <div className="w-3/4 h-2.5 rounded-full animate-pulse" style={{ background: 'var(--border)' }} />
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                        
                                        {!loadingReviews && reviews.length === 0 && !showForm && (
                                            <div className="text-center py-8" style={{ color: 'var(--text-muted)' }}>
                                                Aucun commentaire pour l'instant. Soyez le premier !
                                            </div>
                                        )}

                                        {reviews.map((review) => (
                                            <div key={review.id} className="p-5 rounded-2xl transition-all hover:-translate-y-0.5" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                                                <div className="flex justify-between items-start mb-3">
                                                    <div className="flex items-center gap-3">
                                                        {review.pseudo === 'Anonyme' ? (
                                                            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'rgba(var(--text-muted-rgb), 0.1)' }}>
                                                                <Shield size={20} style={{ color: 'var(--text-muted)' }} />
                                                            </div>
                                                        ) : (
                                                            <UserAvatar user={{ username: review.pseudo, avatar: review.user_avatar }} size={40} />
                                                        )}
                                                        <div>
                                                            <div className="font-bold text-sm" style={{ color: 'var(--text)' }}>
                                                                {review.pseudo}
                                                            </div>
                                                            <div className="text-[10px] font-medium mt-0.5" style={{ color: 'var(--text-muted)' }}>
                                                                {new Date(review.created_at).toLocaleDateString('fr-FR', {
                                                                    day: 'numeric', month: 'long', year: 'numeric'
                                                                })}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    {renderStars(review.note)}
                                                </div>
                                                
                                                {review.commentaire && (
                                                    <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed" style={{ color: 'var(--text)' }}>
                                                        {review.commentaire}
                                                    </p>
                                                )}
                                                
                                                <div className="mt-4 pt-3 flex justify-between items-center" style={{ borderTop: '1px dashed var(--border)' }}>
                                                    <div className="flex gap-2">
                                                        {(user?.id === review.user_id || user?.role === 'admin') && (
                                                            <>
                                                                <button
                                                                    onClick={() => {
                                                                        setEditingReviewId(review.id);
                                                                        setRating(review.note);
                                                                        setComment(review.commentaire || '');
                                                                        setIsAnonymous(review.pseudo === 'Anonyme');
                                                                        setShowForm(true);
                                                                    }}
                                                                    className="p-1.5 rounded-lg text-xs font-medium transition-colors hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-900/30"
                                                                    style={{ color: 'var(--text-muted)' }}
                                                                    title="Modifier"
                                                                >
                                                                    <Edit size={16} />
                                                                </button>
                                                                <button
                                                                    onClick={() => setReviewToDelete(review.id)}
                                                                    className="p-1.5 rounded-lg text-xs font-medium transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/30"
                                                                    style={{ color: 'var(--text-muted)' }}
                                                                    title="Supprimer"
                                                                >
                                                                    <Trash2 size={16} />
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                    <div className="flex flex-wrap items-center gap-1.5 ml-auto">
                                                        {review.likes?.length > 0 && (
                                                            <div className="flex -space-x-1.5 mr-1">
                                                                {review.likes.slice(0, 3).map((l, idx) => {
                                                                    const uid = typeof l === 'string' ? l : l.userId;
                                                                    const uname = typeof l === 'string' ? 'Ancien' : l.username;
                                                                    const uavatar = typeof l === 'string' ? null : l.avatar;
                                                                    return (
                                                                        <div key={uid || idx} className="w-5 h-5 rounded-full overflow-hidden border border-white dark:border-gray-800" title={uname}>
                                                                            {uavatar ? (
                                                                                <img src={uavatar.startsWith('http') ? uavatar : `${API_BASE}${uavatar}`} alt="" className="w-full h-full object-cover" />
                                                                            ) : (
                                                                                <div className="w-full h-full bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center text-white text-[8px] font-bold">
                                                                                    {uname[0]?.toUpperCase() || '?'}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    );
                                                                })}
                                                                {review.likes.length > 3 && (
                                                                    <div className="w-5 h-5 rounded-full border border-white dark:border-gray-800 flex items-center justify-center bg-gray-100 dark:bg-gray-700 text-[8px] font-bold text-gray-600 dark:text-gray-300">
                                                                        +{review.likes.length - 3}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                        <button
                                                            onClick={() => handleLike(review.id)}
                                                            className="flex items-center gap-1.5 text-xs font-bold transition-all px-3 py-1.5 rounded-lg"
                                                            style={review.likes?.some(l => (typeof l === 'string' ? l === user?.id : l.userId === user?.id))
                                                                ? { background: 'rgba(239, 68, 68, 0.1)', color: '#EF4444' }
                                                                : { color: 'var(--text-muted)', border: '1px solid var(--border)' }
                                                            }
                                                        >
                                                            <Heart size={14} className={review.likes?.some(l => (typeof l === 'string' ? l === user?.id : l.userId === user?.id)) ? 'fill-current' : ''} />
                                                            {review.likes?.length > 0 ? review.likes.length : 'J\'aime'}
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                </div>
            </div>

            {/* Delete Confirmation Modal */}
            {reviewToDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setReviewToDelete(null)}>
                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-sm w-full shadow-xl border border-gray-100 dark:border-gray-700" onClick={e => e.stopPropagation()}>
                        <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4 mx-auto">
                            <Trash2 className="w-6 h-6 text-red-600 dark:text-red-400" />
                        </div>
                        <h3 className="text-lg font-bold text-center text-gray-900 dark:text-white mb-2">
                            Supprimer cet avis ?
                        </h3>
                        <p className="text-sm text-center text-gray-500 dark:text-gray-400 mb-6">
                            Cette action est définitive. Votre avis sera effacé et retiré des statistiques du professeur.
                        </p>
                        <div className="flex justify-between gap-3">
                            <button
                                onClick={() => setReviewToDelete(null)}
                                className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-xl font-medium transition-colors"
                            >
                                Annuler
                            </button>
                            <button
                                onClick={handleDeleteReview}
                                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition-colors shadow-sm"
                            >
                                Supprimer
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
