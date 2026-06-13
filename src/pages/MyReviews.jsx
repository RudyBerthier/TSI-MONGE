import React, { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { ArrowLeft, Trash2, Star, ThumbsUp, ThumbsDown, BarChart2, Film, Hash } from 'lucide-react'
import { Link } from 'react-router-dom'

export function MyReviews() {
  const { getToken, user } = useAuth()
  const [reviews, setReviews] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [stats, setStats] = useState({
    total: 0,
    averageRating: 0,
    topGenres: []
  })

  useEffect(() => {
    const fetchMyReviews = async () => {
      try {
        const res = await fetch('/api/media/my-reviews', {
          headers: { 'Authorization': `Bearer ${getToken()}` }
        })
        if (res.ok) {
          const data = await res.json()
          setReviews(data)
          
          // Calculate basic stats
          const total = data.length
          const avgRating = total > 0 ? (data.reduce((acc, r) => acc + r.rating, 0) / total).toFixed(1) : 0
          
          setStats(s => ({ ...s, total, averageRating: avgRating }))

          // Fetch genres for top genres calculation
          if (total > 0) {
            const uniqueMedia = [];
            const seen = new Set();
            data.forEach(r => {
              const id = r.media.tmdb_id;
              if (!seen.has(id)) {
                seen.add(id);
                uniqueMedia.push({ id, type: r.media.type === 'tv' ? 'tv' : 'movie' });
              }
            });

            // Fetch details in parallel to get genres
            const genreCounts = {};
            await Promise.all(uniqueMedia.map(async (media) => {
              try {
                const detRes = await fetch(`/api/media/details/${media.type}/${media.id}`, {
                  headers: { 'Authorization': `Bearer ${getToken()}` }
                });
                if (detRes.ok) {
                  const details = await detRes.json();
                  if (details.genres) {
                    details.genres.forEach(g => {
                      genreCounts[g.name] = (genreCounts[g.name] || 0) + 1;
                    });
                  }
                }
              } catch (e) {
                console.error("Erreur récupération détails pour genres", e);
              }
            }));

            const sortedGenres = Object.entries(genreCounts)
              .sort((a, b) => b[1] - a[1])
              .map(entry => entry[0])
              .slice(0, 3); // Top 3 genres

            setStats(s => ({ ...s, topGenres: sortedGenres }));
          }
        }
      } catch (err) {
        console.error(err)
      } finally {
        setIsLoading(false)
      }
    }
    fetchMyReviews()
  }, [getToken])

  const deleteReview = async (id) => {
    try {
      const res = await fetch(`/api/media/review/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${getToken()}` }
      })
      if (res.ok) {
        setReviews(prev => prev.filter(r => r.id !== id))
        setStats(s => ({ ...s, total: s.total - 1 })) // Simplistic update
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handleReact = async (reviewId, type) => {
    try {
      const res = await fetch(`/api/media/review/${reviewId}/react`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`
        },
        body: JSON.stringify({ reaction: type })
      });
      if (res.ok) {
        setReviews(prev => prev.map(r => {
          if (r.id !== reviewId) return r;
          const userReactionIdx = r.reactions?.findIndex(re => re.user_id === user.id);
          let newReactions = r.reactions ? [...r.reactions] : [];
          if (type === null) {
            if (userReactionIdx >= 0) newReactions.splice(userReactionIdx, 1);
          } else {
            if (userReactionIdx >= 0) newReactions[userReactionIdx].reaction_type = type;
            else newReactions.push({ user_id: user.id, reaction_type: type });
          }
          return { ...r, reactions: newReactions };
        }));
      }
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] font-sans overflow-x-hidden pb-20">
      <div className="sticky top-[calc(3.5rem+env(safe-area-inset-top))] z-50 bg-[var(--bg)]/90 backdrop-blur-md border-b border-[var(--border)] pt-4 pb-4 px-4 sm:px-8 flex justify-between items-center transition-all">
        <div className="flex items-center gap-4 text-red-600 font-black text-2xl tracking-tighter">
          <Link to="/media" className="p-2 rounded-xl flex items-center justify-center transition-all w-fit bg-[var(--surface-2)] text-[var(--text-muted)] hover:text-[var(--text)]">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <span className="flex items-center gap-2"><Star size={24} fill="currentColor" /> MES CRITIQUES</span>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-12">
        {isLoading ? (
          <div className="animate-pulse space-y-8">
            <div className="h-32 bg-[var(--surface-2)] rounded-2xl border border-[var(--border)]"></div>
            <div className="h-48 bg-[var(--surface-2)] rounded-2xl border border-[var(--border)]"></div>
            <div className="h-48 bg-[var(--surface-2)] rounded-2xl border border-[var(--border)]"></div>
          </div>
        ) : reviews.length === 0 ? (
          <div className="text-center py-32 bg-[var(--surface-2)] rounded-2xl border border-[var(--border)] shadow-2xl">
            <div className="w-20 h-20 bg-[var(--surface-3)] rounded-full flex items-center justify-center mx-auto mb-6">
              <Star size={32} className="text-gray-500" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Aucune critique</h2>
            <p className="text-[var(--text-muted)] mb-8 max-w-md mx-auto">Tu n'as pas encore partagé ton avis sur des films ou séries. Explore le catalogue et laisse ta première critique !</p>
            <Link to="/media" className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-8 rounded-full transition-all shadow-lg hover:shadow-red-600/30">
              Explorer MongeFlix
            </Link>
          </div>
        ) : (
          <>
            {/* Stats Header */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-12">
              <div className="bg-[var(--surface-2)] rounded-2xl p-6 border border-[var(--border)] shadow-lg flex items-center gap-5">
                <div className="w-14 h-14 bg-red-600/20 rounded-full flex items-center justify-center shrink-0">
                  <Hash size={24} className="text-red-500" />
                </div>
                <div>
                  <div className="text-sm text-[var(--text-muted)] font-bold mb-1 uppercase tracking-wider">Total</div>
                  <div className="text-3xl font-black">{stats.total} <span className="text-base font-normal text-gray-500">critiques</span></div>
                </div>
              </div>
              
              <div className="bg-[var(--surface-2)] rounded-2xl p-6 border border-[var(--border)] shadow-lg flex items-center gap-5">
                <div className="w-14 h-14 bg-yellow-500/20 rounded-full flex items-center justify-center shrink-0">
                  <BarChart2 size={24} className="text-yellow-500" />
                </div>
                <div>
                  <div className="text-sm text-[var(--text-muted)] font-bold mb-1 uppercase tracking-wider">Moyenne Donnée</div>
                  <div className="text-3xl font-black">{stats.averageRating}<span className="text-xl text-gray-500">/5</span></div>
                </div>
              </div>

              <div className="bg-[var(--surface-2)] rounded-2xl p-6 border border-[var(--border)] shadow-lg flex items-center gap-5">
                <div className="w-14 h-14 bg-blue-500/20 rounded-full flex items-center justify-center shrink-0">
                  <Film size={24} className="text-blue-500" />
                </div>
                <div>
                  <div className="text-sm text-[var(--text-muted)] font-bold mb-1 uppercase tracking-wider">Genres Préférés</div>
                  <div className="text-lg font-bold leading-tight text-[var(--text)]">
                    {stats.topGenres.length > 0 ? stats.topGenres.join(', ') : 'Calcul...'}
                  </div>
                </div>
              </div>
            </div>

            {/* Reviews List */}
            <div className="flex flex-col gap-6">
              {reviews.map(review => {
                const upvotes = review.reactions?.filter(r => r.reaction_type === 'up').length || 0;
                const downvotes = review.reactions?.filter(r => r.reaction_type === 'down').length || 0;
                const myReaction = review.reactions?.find(r => r.user_id === user?.id)?.reaction_type;
                const year = review.media.release_year || '';

                return (
                  <div key={review.id} className="bg-[var(--surface-2)] p-5 sm:p-6 rounded-2xl flex flex-col sm:flex-row gap-6 border border-[var(--border)] shadow-lg relative group transition-all hover:border-gray-500">
                    <button
                      onClick={() => deleteReview(review.id)}
                      className="absolute top-4 right-4 p-2 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded-full transition-all opacity-100 sm:opacity-0 group-hover:opacity-100"
                      title="Supprimer la critique"
                    >
                      <Trash2 size={20} />
                    </button>

                    <div className="shrink-0 mx-auto sm:mx-0 w-32 sm:w-28 relative rounded-lg overflow-hidden shadow-xl aspect-[2/3]">
                      {review.media.poster_url ? (
                        <img src={review.media.poster_url} className="w-full h-full object-cover" alt="poster" />
                      ) : (
                        <div className="w-full h-full bg-[var(--surface-3)] flex items-center justify-center"><Film className="text-gray-600" /></div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
                      <div className="absolute bottom-2 left-0 right-0 flex justify-center text-yellow-400 gap-0.5 drop-shadow-md">
                        {[1, 2, 3, 4, 5].map(s => <Star key={s} size={12} fill={s <= review.rating ? 'currentColor' : 'transparent'} />)}
                      </div>
                    </div>

                    <div className="flex-1 flex flex-col">
                      <div className="flex items-start justify-between mb-2 pr-10">
                        <div>
                          <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-3 text-[var(--text)]">
                            {review.media.title}
                            {year && <span className="text-sm font-normal text-[var(--text-muted)]">({year})</span>}
                          </h2>
                          <div className="text-[var(--text-muted)] text-xs font-medium uppercase tracking-wider mt-1">
                            {review.season_number ? `Saison ${review.season_number} ` : ''}
                            {review.episode_number ? `Épisode ${review.episode_number} ` : ''}
                            • Publiée le {new Date(review.created_at).toLocaleDateString('fr-FR')}
                          </div>
                        </div>
                      </div>

                      <div className="bg-[var(--surface-3)] p-4 rounded-xl text-[var(--text)] italic mb-5 mt-2 flex-1 border border-[var(--border)]">
                        "{review.review_text}"
                      </div>

                      <div className="flex items-center gap-3 mt-auto">
                        <button
                          onClick={() => handleReact(review.id, myReaction === 'up' ? null : 'up')}
                          className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all text-xs sm:text-sm font-bold border ${myReaction === 'up' ? 'bg-green-500/20 text-green-500 border-green-500/30' : 'bg-[var(--surface-3)] text-[var(--text-muted)] border-[var(--border)] hover:border-gray-500 hover:text-[var(--text)]'}`}
                        >
                          <ThumbsUp size={16} fill={myReaction === 'up' ? 'currentColor' : 'transparent'} />
                          {upvotes > 0 ? upvotes : 'J\'aime'}
                        </button>
                        <button
                          onClick={() => handleReact(review.id, myReaction === 'down' ? null : 'down')}
                          className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all text-xs sm:text-sm font-bold border ${myReaction === 'down' ? 'bg-red-500/20 text-red-500 border-red-500/30' : 'bg-[var(--surface-3)] text-[var(--text-muted)] border-[var(--border)] hover:border-gray-500 hover:text-[var(--text)]'}`}
                        >
                          <ThumbsDown size={16} fill={myReaction === 'down' ? 'currentColor' : 'transparent'} />
                          {downvotes > 0 ? downvotes : ''}
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
