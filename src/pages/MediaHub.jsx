import { useState, useEffect, useCallback, useRef } from 'react'
import { Search, Film, Star, MessageSquare, Play, Plus, ChevronLeft, ChevronRight, X, Users, Check, Trash2, ThumbsUp, ThumbsDown, AlertTriangle, Share2, Dices } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { RestrictedAccess } from '../components/RestrictedAccess'

// Components
const MediaCard = ({ media, onClick }) => {
  return (
    <div
      className="flex-shrink-0 cursor-pointer group relative transition-transform duration-300 hover:scale-110 hover:z-50"
      style={{ width: '150px' }}
      onClick={() => onClick(media)}
    >
      <div className="aspect-[2/3] rounded-md overflow-hidden bg-slate-900 shadow-md transition-shadow duration-300 group-hover:shadow-2xl">
        {media.poster_url ? (
          <img src={media.poster_url} alt={media.title} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 bg-gray-900 p-2">
            <Film size={32} />
            <span className="text-xs text-center mt-2 font-bold">{media.title}</span>
          </div>
        )}
        {media.vote_average ? (
          <div className="absolute top-1 right-1 bg-black/80 px-1.5 py-0.5 rounded text-[10px] font-bold text-yellow-400 flex items-center gap-1">
            <Star size={10} fill="currentColor" /> {(media.vote_average).toFixed(1)}
          </div>
        ) : null}
      </div>
    </div>
  )
}

const CarouselRow = ({ title, items, onCardClick }) => {
  const scrollRef = useRef(null)
  const [showLeft, setShowLeft] = useState(false)
  const [showRight, setShowRight] = useState(false)

  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current
      setShowLeft(scrollLeft > 0)
      // Math.ceil in case of fractional pixels
      setShowRight(Math.ceil(scrollLeft + clientWidth) < scrollWidth)
    }
  }

  useEffect(() => {
    checkScroll()
    window.addEventListener('resize', checkScroll)
    return () => window.removeEventListener('resize', checkScroll)
  }, [items])

  const scroll = (direction) => {
    if (scrollRef.current) {
      const { scrollLeft, clientWidth } = scrollRef.current
      // 150px (card) + 8px (gap) = 158px
      const itemWidth = 158
      const visibleItems = Math.floor(clientWidth / itemWidth)
      const scrollAmount = visibleItems * itemWidth

      const scrollTo = direction === 'left' ? scrollLeft - scrollAmount : scrollLeft + scrollAmount
      scrollRef.current.scrollTo({ left: scrollTo, behavior: 'smooth' })

      // Update arrows after scroll animation
      setTimeout(checkScroll, 350)
    }
  }

  if (!items || items.length === 0) return null

  return (
    <div className="mb-8 relative group">
      <h2 className="text-xl font-bold mb-2 px-4 sm:px-12 text-white">{title}</h2>

      {showLeft && (
        <button
          onClick={() => scroll('left')}
          className="absolute left-0 top-9 bottom-4 z-[60] bg-gradient-to-r from-black/80 to-transparent w-12 opacity-0 group-hover:opacity-100 transition-opacity hidden sm:flex items-center justify-start pl-2 hover:from-black"
        >
          <ChevronLeft size={40} className="text-white hover:scale-125 transition-transform" />
        </button>
      )}

      <div
        ref={scrollRef}
        onScroll={checkScroll}
        className="flex gap-2 overflow-x-auto px-4 sm:px-12 py-4 scrollbar-hide"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {items.map((item, i) => (
          <MediaCard key={item.id || item.tmdb_id || i} media={item} onClick={onCardClick} />
        ))}
      </div>

      {showRight && (
        <button
          onClick={() => scroll('right')}
          className="absolute right-0 top-9 bottom-4 z-[60] bg-gradient-to-l from-black/80 to-transparent w-12 opacity-0 group-hover:opacity-100 transition-opacity hidden sm:flex items-center justify-end pr-2 hover:from-black"
        >
          <ChevronRight size={40} className="text-white hover:scale-125 transition-transform" />
        </button>
      )}
    </div>
  )
}

const LazyCarouselRow = ({ title, endpoint, getToken, onCardClick }) => {
  const [items, setItems] = useState([])
  const [hasFetched, setHasFetched] = useState(false)
  const containerRef = useRef(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !hasFetched) {
          setHasFetched(true)
          fetchData()
        }
      },
      { rootMargin: '200px' }
    )

    if (containerRef.current) {
      observer.observe(containerRef.current)
    }

    return () => observer.disconnect()
  }, [hasFetched])

  const fetchData = async () => {
    try {
      const token = getToken()
      const res = await fetch(endpoint, { headers: { 'Authorization': `Bearer ${token}` } })
      if (res.ok) {
        const data = await res.json()
        setItems(data)
      }
    } catch (err) {
      console.error('Failed to fetch lazy row:', err)
    }
  }

  return (
    <div ref={containerRef} className="min-h-[250px]">
      {hasFetched && items.length > 0 ? (
        <CarouselRow title={title} items={items} onCardClick={onCardClick} />
      ) : (
        <div className="mb-8 px-4 sm:px-12 opacity-50">
          <div className="h-6 w-48 bg-gray-800 rounded mb-2 animate-pulse"></div>
          <div className="flex gap-2 overflow-hidden py-4">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="flex-shrink-0 w-[150px] aspect-[2/3] bg-gray-800 rounded-md animate-pulse"></div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export function MediaHub() {
  const { getToken, isAuthenticated, user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()

  // States
  const [trending, setTrending] = useState([])
  const [popularMovies, setPopularMovies] = useState([])
  const [popularTv, setPopularTv] = useState([])
  const [watchlist, setWatchlist] = useState([])
  const [classWatchlist, setClassWatchlist] = useState([])
  const [feed, setFeed] = useState([])
  const [heroIndex, setHeroIndex] = useState(0)

  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [isSearching, setIsSearching] = useState(false)
  const [searchError, setSearchError] = useState(null)
  const [tmdbError, setTmdbError] = useState(false)

  const [selectedMedia, setSelectedMedia] = useState(null)
  const [mediaReviews, setMediaReviews] = useState([])
  const [isLoadingMediaReviews, setIsLoadingMediaReviews] = useState(false)

  // Review form states
  const [rating, setRating] = useState(0)
  const [reviewText, setReviewText] = useState('')
  const [seasonNum, setSeasonNum] = useState('')
  const [episodeNum, setEpisodeNum] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [reviewError, setReviewError] = useState('')

  // Toast
  const [toast, setToast] = useState(null)
  const showToast = (message) => {
    setToast(message)
    setTimeout(() => setToast(null), 3000)
  }

  const handleRandomMedia = async () => {
    try {
      const res = await fetch('/api/media/random', {
        headers: { 'Authorization': `Bearer ${getToken()}` }
      })
      if (res.ok) {
        const data = await res.json()
        setSelectedMedia({ ...data, fetched_tmdb: false })
      } else {
        showToast("Erreur lors de la suggestion")
      }
    } catch (err) {
      console.error(err)
      showToast("Erreur lors de la suggestion")
    }
  }

  const fetchAllData = useCallback(async () => {
    if (!isAuthenticated) return
    try {
      const token = getToken()
      const headers = { 'Authorization': `Bearer ${token}` }

      const [trendRes, watchRes, feedRes] = await Promise.all([
        fetch('/api/media/trending', { headers }),
        fetch('/api/media/watchlist', { headers }),
        fetch('/api/media/feed')
      ])

      if (trendRes.ok) setTrending(await trendRes.json())

      if (watchRes.ok) {
        const watchData = await watchRes.json()
        setWatchlist(watchData.filter(w => w.type === 'personal').map(w => ({ ...w.media, watchlist_id: w.id })))
        setClassWatchlist(watchData.filter(w => w.type === 'class').map(w => ({ ...w.media, watchlist_id: w.id, added_by: w.user })))
      }

      if (feedRes.ok) setFeed(await feedRes.json())

    } catch (err) {
      console.error('Erreur fetch data Netflix', err)
    }
  }, [getToken, isAuthenticated])

  useEffect(() => {
    fetchAllData()
    const shareId = searchParams.get('id')
    const shareType = searchParams.get('type') || 'movie'
    if (shareId) {
      setSelectedMedia({ tmdb_id: shareId, id: shareId, type: shareType, media_type: shareType })
      setSearchParams({}) // Clean URL
    }
  }, [fetchAllData])

  const deleteReview = async (id) => {
    try {
      const res = await fetch(`/api/media/review/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${getToken()}` }
      })
      if (res.ok) {
        setFeed(prev => prev.filter(r => r.id !== id))
        setMediaReviews(prev => prev.filter(r => r.id !== id))
        showToast("Critique supprimée.")
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handleReact = async (reviewId, type) => {
    if (!isAuthenticated) {
      showToast("Tu dois être connecté pour réagir.");
      return;
    }
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
        // Optimistic UI update
        const updateReview = (r) => {
          if (r.id !== reviewId) return r;
          const userReactionIdx = r.reactions?.findIndex(re => re.user_id === user.id);
          let newReactions = r.reactions ? [...r.reactions] : [];

          if (type === null) {
            if (userReactionIdx >= 0) newReactions.splice(userReactionIdx, 1);
          } else {
            if (userReactionIdx >= 0) {
              newReactions[userReactionIdx].reaction_type = type;
            } else {
              newReactions.push({ user_id: user.id, reaction_type: type });
            }
          }
          return { ...r, reactions: newReactions };
        };

        setFeed(prev => prev.map(updateReview));
        setMediaReviews(prev => prev.map(updateReview));
      } else {
        const data = await res.json();
        showToast(data.error || "Erreur de réaction");
      }
    } catch (err) {
      console.error(err);
    }
  }

  useEffect(() => {
    if (selectedMedia) {
      // 1. Fetch missing TMDB details (e.g. when clicked from Watchlist)
      if (!selectedMedia.overview && !selectedMedia.fetched_tmdb) {
        const tmdbId = selectedMedia.tmdb_id || selectedMedia.id?.toString();
        const type = selectedMedia.type || selectedMedia.media_type || 'movie';
        // Prevent infinite loops by marking it as fetching
        setSelectedMedia(prev => ({ ...prev, fetched_tmdb: true }));
        fetch(`/api/media/details/${type}/${tmdbId}`, {
          headers: { 'Authorization': `Bearer ${getToken()}` }
        })
          .then(res => res.ok ? res.json() : null)
          .then(data => {
            if (data) {
              setSelectedMedia(prev => ({ ...prev, ...data, fetched_tmdb: true }));
            }
          })
          .catch(err => console.error('Erreur détails TMDB', err));
      }

      // 2. Fetch reviews for this specific media
      const fetchMediaReviews = async () => {
        setIsLoadingMediaReviews(true);
        try {
          const tmdbId = selectedMedia.tmdb_id || selectedMedia.id?.toString();
          const res = await fetch(`/api/media/reviews/${tmdbId}`, {
            headers: { 'Authorization': `Bearer ${getToken()}` }
          });
          if (res.ok) {
            setMediaReviews(await res.json());
          }
        } catch (error) {
          console.error('Erreur chargement critiques média:', error);
        } finally {
          setIsLoadingMediaReviews(false);
        }
      };
      fetchMediaReviews();
    } else {
      setMediaReviews([]);
    }
  }, [selectedMedia?.id, selectedMedia?.tmdb_id, getToken]);

  const searchMedia = async (e) => {
    const q = e.target.value;
    setSearchQuery(q);
    if (!q.trim()) {
      setSearchResults([]);
      setTmdbError(false);
      return;
    }

    setIsSearching(true);
    try {
      const token = getToken();
      const res = await fetch(`/api/media/search?q=${encodeURIComponent(q)}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error && data.error.includes('TMDB')) setTmdbError(true);
        setSearchResults([]);
      } else {
        setSearchResults(data);
        setTmdbError(false);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  }

  const toggleWatchlist = async (media, type = 'personal') => {
    const targetList = type === 'personal' ? watchlist : classWatchlist;
    const mediaId = media.tmdb_id || media.id?.toString();
    const existingItem = targetList.find(m => m.tmdb_id === mediaId);

    try {
      const token = getToken()
      if (existingItem) {
        const res = await fetch(`/api/media/watchlist/${existingItem.watchlist_id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        })
        if (res.ok) {
          showToast(type === 'personal' ? 'Retiré de ta Watchlist' : 'Retiré de la Watchlist de la classe')
          fetchAllData()
        }
      } else {
        const res = await fetch('/api/media/watchlist', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            tmdb_id: mediaId,
            media_type: media.type || media.media_type,
            title: media.title || media.name,
            poster_url: media.poster_url,
            release_year: media.release_date ? media.release_date.split('-')[0] : media.release_year,
            type
          })
        })
        if (res.ok) {
          showToast(type === 'personal' ? 'Ajouté à ta Watchlist !' : 'Ajouté à la Watchlist de la classe !')
          fetchAllData()
        }
      }
    } catch (err) {
      console.error(err)
    }
  }

  const submitReview = async () => {
    setReviewError('')
    if (!rating) return setReviewError('Veuillez sélectionner une note.')
    setIsSubmitting(true)
    try {
      const token = getToken()
      const res = await fetch('/api/media/review', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          tmdb_id: selectedMedia.tmdb_id || selectedMedia.id?.toString(),
          type: selectedMedia.type || selectedMedia.media_type,
          title: selectedMedia.title || selectedMedia.name,
          poster_url: selectedMedia.poster_url,
          release_year: selectedMedia.release_date ? selectedMedia.release_date.split('-')[0] : selectedMedia.release_year,
          rating,
          review_text: reviewText,
          season_number: seasonNum ? parseInt(seasonNum) : null,
          episode_number: episodeNum ? parseInt(episodeNum) : null
        })
      })
      if (res.ok) {
        setRating(0)
        setReviewText('')
        setSeasonNum('')
        setEpisodeNum('')
        setSelectedMedia(null)
        showToast("Critique publiée avec succès !")
        fetchAllData()
      } else {
        setReviewError("Erreur lors de l'ajout de la critique.")
      }
    } catch (err) {
      console.error(err)
      setReviewError("Erreur lors de l'ajout de la critique.")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Composant interne pour l'affichage d'une critique réutilisable
  const ReviewCard = ({ review }) => {
    const upvotes = review.reactions?.filter(r => r.reaction_type === 'up').length || 0;
    const downvotes = review.reactions?.filter(r => r.reaction_type === 'down').length || 0;
    const myReaction = review.reactions?.find(r => r.user_id === user?.id)?.reaction_type;

    return (
      <div className="bg-[#181818] p-4 rounded-lg flex gap-4 items-start border border-[#242424]">
        {review.media?.poster_url && (
          <img src={review.media.poster_url} className="w-16 h-24 object-cover rounded shadow" alt="poster" />
        )}
        <div className="flex-1 min-w-0 relative">
          {user && (user.id === review.user_id || user.role === 'admin') && (
            <button
              onClick={() => deleteReview(review.id)}
              className="absolute -top-1 -right-1 p-1 text-gray-500 hover:text-red-500 transition-colors bg-black/20 rounded-full"
              title="Supprimer la critique"
            >
              <Trash2 size={16} />
            </button>
          )}
          {review.media?.title && (
            <h4 className="font-bold truncate text-white pr-6 flex items-center gap-2">
              {review.media.title}
              {(review.season_number || review.episode_number) && (
                <span className="text-[10px] bg-red-600/20 text-red-400 px-1.5 py-0.5 rounded font-mono">
                  {review.season_number ? `S${review.season_number.toString().padStart(2, '0')}` : ''}
                  {review.episode_number ? `E${review.episode_number.toString().padStart(2, '0')}` : ''}
                </span>
              )}
            </h4>
          )}
          <div className="flex items-center gap-1 text-yellow-400 text-xs mb-1">
            {[1, 2, 3, 4, 5].map(s => <Star key={s} size={12} fill={s <= review.rating ? 'currentColor' : 'transparent'} />)}
          </div>
          <p className="text-sm text-gray-300 line-clamp-3 mb-3 italic">"{review.review_text}"</p>

          <div className="flex items-center justify-between mt-auto">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              {review.user?.avatar ? (
                <img src={review.user.avatar} className="w-5 h-5 rounded-full object-cover" alt="avatar" />
              ) : review.user?.google_avatar ? (
                <img src={review.user.google_avatar} className="w-5 h-5 rounded-full object-cover" alt="avatar" />
              ) : (
                <div className="w-5 h-5 bg-gray-700 rounded-full flex items-center justify-center">
                  {review.user?.username?.charAt(0).toUpperCase()}
                </div>
              )}
              <span>Par {review.user?.username || 'Inconnu'}</span>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => handleReact(review.id, myReaction === 'up' ? null : 'up')}
                className={`flex items-center gap-1 text-xs transition-colors ${myReaction === 'up' ? 'text-green-500' : 'text-gray-500 hover:text-green-400'}`}
              >
                <ThumbsUp size={14} fill={myReaction === 'up' ? 'currentColor' : 'transparent'} />
                <span>{upvotes}</span>
              </button>
              <button
                onClick={() => handleReact(review.id, myReaction === 'down' ? null : 'down')}
                className={`flex items-center gap-1 text-xs transition-colors ${myReaction === 'down' ? 'text-red-500' : 'text-gray-500 hover:text-red-400'}`}
              >
                <ThumbsDown size={14} fill={myReaction === 'down' ? 'currentColor' : 'transparent'} />
                <span>{downvotes}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Hero is a rotating list of the top 5 trending media with backdrops
  const heroCandidates = trending.filter(m => m.backdrop_url).slice(0, 5);

  useEffect(() => {
    if (heroCandidates.length <= 1) return;
    const interval = setInterval(() => {
      setHeroIndex((prev) => (prev + 1) % heroCandidates.length)
    }, 6000)
    return () => clearInterval(interval)
  }, [heroCandidates.length, heroIndex])

  const heroMedia = heroCandidates[heroIndex] || trending[0]

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#141414] text-white font-sans overflow-x-hidden pb-20">
        <div className="sticky top-[calc(3.5rem+env(safe-area-inset-top))] z-[80] bg-gradient-to-b from-black/90 to-transparent pt-4 pb-8 px-4 sm:px-8 flex justify-between items-center transition-all">
          <div className="flex items-center gap-4 text-red-600 font-black text-2xl tracking-tighter">
            <Link to="/outils" className="p-2 rounded-xl flex items-center justify-center transition-all w-fit" style={{ background: 'var(--surface-2)', color: 'var(--text-muted)' }}>
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <span className="flex items-center gap-1"><Film size={28} /> MONGEFLIX</span>
          </div>
        </div>
        <div className="max-w-3xl mx-auto px-4 py-12 mt-12">
          <RestrictedAccess
            title="Accès restreint"
            message="Vous devez être connecté pour accéder à MongeFlix, voir les recommandations et créer vos Watchlists."
          />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#141414] text-white font-sans overflow-x-hidden pb-20">

      {/* Navbar (Search & Back) */}
      <div className="fixed top-14 left-0 right-0 z-[90] pointer-events-none bg-gradient-to-b from-black/90 via-black/60 to-transparent pt-4 pb-8 px-4 sm:px-8 flex justify-between items-center transition-all">
        <div className="flex items-center gap-4 text-red-600 font-black text-2xl tracking-tighter pointer-events-auto">
          <Link to="/outils" className="p-2 rounded-xl flex items-center justify-center transition-all w-fit" style={{ background: 'var(--surface-2)', color: 'var(--text-muted)' }}>
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <span className="flex items-center gap-1"><Film size={28} /> MONGEFLIX</span>
        </div>

        <div className="flex items-center gap-4 pointer-events-auto">
          <button onClick={handleRandomMedia} className="hidden sm:flex text-sm font-bold text-white hover:text-red-400 transition-colors items-center gap-1 bg-[#181818] border border-gray-800 hover:border-red-600/50 px-4 py-2 rounded-full">
            <Dices size={16} /> Aléatoire
          </button>
          <Link to="/mes-critiques" className="hidden sm:flex text-sm font-bold text-gray-300 hover:text-white transition-colors items-center gap-1 bg-[#181818] border border-gray-800 px-4 py-2 rounded-full">
            <MessageSquare size={16} /> Mes Critiques
          </Link>

          <div className="relative w-32 sm:w-80">
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
              <Search size={18} className="text-gray-400" />
            </div>
            <input
              type="text"
              className="bg-[#242424] text-white text-sm rounded-full w-full pl-10 pr-10 py-2 focus:outline-none focus:ring-2 focus:ring-red-600 transition-all border border-transparent focus:border-red-600 placeholder-gray-500"
              placeholder="Titres, personnes, genres..."
              value={searchQuery}
              onChange={searchMedia}
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSearchResults([]);
                }}
                className="absolute inset-y-0 right-3 flex items-center text-gray-400 hover:text-white transition-colors"
                title="Effacer la recherche"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>
      </div>

      {tmdbError && (
        <div className="bg-red-900/50 border border-red-500 text-red-200 p-4 m-4 sm:mx-8 rounded-lg text-sm flex items-start gap-3">
          <AlertTriangle className="text-red-400 shrink-0" size={24} />
          <div>
            <strong>Erreur TMDB (403/401) : La clé API TMDB est invalide ou manquante.</strong><br />
            Va sur <code>themoviedb.org</code>, crée un compte, génère une clé API, et ajoute-la dans le fichier <code>.env</code> du serveur sous le nom <code>TMDB_API_KEY=ta_cle_ici</code>. Pense bien à relancer ton serveur (<code>npm run dev</code> et <code>node server.js</code>).
          </div>
        </div>
      )}

      {/* Search Results */}
      {searchQuery && (
        <div className="px-4 sm:px-8 pt-32 sm:pt-36 pb-8 relative z-10">
          <h2 className="text-xl font-bold mb-4 text-white">Résultats pour "{searchQuery}"</h2>
          {isSearching ? (
            <div className="animate-pulse flex gap-4 overflow-hidden">
              {[1, 2, 3, 4, 5].map(i => <div key={i} className="w-40 h-60 bg-gray-800 rounded-md"></div>)}
            </div>
          ) : searchResults.length > 0 ? (
            <div className="flex flex-wrap gap-4">
              {searchResults.map(item => (
                <MediaCard key={item.tmdb_id} media={item} onClick={setSelectedMedia} />
              ))}
            </div>
          ) : (
            <div className="text-gray-500">Aucun résultat trouvé.</div>
          )}
        </div>
      )}

      {/* Hero Section */}
      {!searchQuery && heroMedia && (
        <div className="px-4 sm:px-12 pt-24 sm:pt-28 pb-12">
          <div className="relative w-full max-w-7xl mx-auto h-[40vh] sm:h-[55vh] rounded-2xl overflow-hidden shadow-2xl select-none bg-black group">

            {/* Image Layer with fade-in on change */}
            <div className="absolute inset-0 transition-opacity duration-1000" key={`img-${heroMedia.tmdb_id || heroMedia.id}`}>
              {heroMedia.backdrop_url ? (
                <img src={heroMedia.backdrop_url} alt="hero" className="w-full h-full object-cover animate-fade-in" />
              ) : (
                <div className="w-full h-full bg-slate-900 animate-fade-in" />
              )}
            </div>

            {/* Gradients */}
            <div className="absolute inset-0 bg-gradient-to-r from-[#141414] via-[#141414]/70 to-transparent pointer-events-none" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#141414]/50 to-transparent pointer-events-none" />

            {/* Content Layer */}
            <div className="absolute bottom-[10%] left-0 px-8 sm:px-16 w-full max-w-3xl z-10 animate-fade-in" key={`txt-${heroMedia.tmdb_id || heroMedia.id}`}>
              <div className="text-red-500 font-bold tracking-widest text-xs sm:text-sm mb-2 drop-shadow-md">
                N°{heroIndex + 1} EN TENDANCE
              </div>
              <h1 className="text-3xl sm:text-5xl font-black mb-4 drop-shadow-xl leading-tight">{heroMedia.title || heroMedia.name}</h1>
              <p className="text-sm sm:text-base text-gray-300 mb-6 line-clamp-3 drop-shadow-md max-w-xl">
                {heroMedia.overview || "Découvrez ce titre qui fait fureur en ce moment."}
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={() => setSelectedMedia(heroMedia)}
                  className="bg-white text-black px-6 py-2 rounded font-bold flex items-center gap-2 hover:bg-white/80 transition-colors"
                >
                  <Play size={20} fill="currentColor" /> Détails
                </button>
                {(() => {
                  const isHeroInMyList = watchlist.some(m => m.tmdb_id === (heroMedia.tmdb_id || heroMedia.id?.toString()));
                  return (
                    <button
                      onClick={() => toggleWatchlist(heroMedia, 'personal')}
                      className={`px-6 py-2 rounded font-bold flex items-center gap-2 transition-colors ${isHeroInMyList ? 'bg-green-600/80 text-white hover:bg-green-600' : 'bg-gray-500/50 text-white hover:bg-gray-500/70'}`}
                    >
                      {isHeroInMyList ? <Check size={20} /> : <Plus size={20} />}
                      {isHeroInMyList ? 'Dans ma liste' : 'Ma Liste'}
                    </button>
                  )
                })()}
              </div>
            </div>

            {/* Navigation Arrows */}
            <button
              onClick={(e) => { e.stopPropagation(); setHeroIndex(prev => (prev - 1 + heroCandidates.length) % heroCandidates.length) }}
              className="absolute left-0 top-0 bottom-0 z-[60] bg-gradient-to-r from-black/50 to-transparent w-16 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-start pl-2 hover:from-black/80"
            >
              <ChevronLeft size={40} className="text-white hover:scale-125 transition-transform" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setHeroIndex(prev => (prev + 1) % heroCandidates.length) }}
              className="absolute right-0 top-0 bottom-0 z-[60] bg-gradient-to-l from-black/50 to-transparent w-16 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-end pr-2 hover:from-black/80"
            >
              <ChevronRight size={40} className="text-white hover:scale-125 transition-transform" />
            </button>

            {/* Pagination Dots */}
            <div className="absolute bottom-4 right-8 flex gap-2 z-20">
              {heroCandidates.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setHeroIndex(idx)}
                  className={`w-2 h-2 rounded-full transition-all duration-300 ${idx === heroIndex ? 'bg-white w-6' : 'bg-white/30 hover:bg-white/50'}`}
                />
              ))}
            </div>

          </div>
        </div>
      )}

      {/* Main Carousels */}
      {!searchQuery && (
        <div className="relative z-20 pb-12 -mt-12 sm:-mt-24 pt-8 sm:pt-16">
          {watchlist.length > 0 && <CarouselRow title="Ma Watchlist" items={watchlist} onCardClick={setSelectedMedia} />}
          {classWatchlist.length > 0 && <CarouselRow title="Watchlist de la Promo" items={classWatchlist} onCardClick={setSelectedMedia} />}

          <CarouselRow title="Tendances actuelles" items={trending.filter(t => t.tmdb_id !== heroMedia?.tmdb_id && t.id !== heroMedia?.id)} onCardClick={setSelectedMedia} />

          {/* Catégories Lazy Loaded */}
          <LazyCarouselRow title="Films Populaires" endpoint="/api/media/popular/movie" getToken={getToken} onCardClick={setSelectedMedia} />
          <LazyCarouselRow title="Séries Populaires" endpoint="/api/media/popular/tv" getToken={getToken} onCardClick={setSelectedMedia} />

          {/* Nouveaux Genres TMDB */}
          <LazyCarouselRow title="Films d'Action" endpoint="/api/media/discover?type=movie&genre=28" getToken={getToken} onCardClick={setSelectedMedia} />
          <LazyCarouselRow title="Comédies" endpoint="/api/media/discover?type=movie&genre=35" getToken={getToken} onCardClick={setSelectedMedia} />
          <LazyCarouselRow title="Science-Fiction & Fantastique" endpoint="/api/media/discover?type=movie&genre=878" getToken={getToken} onCardClick={setSelectedMedia} />
          <LazyCarouselRow title="Séries d'Animation" endpoint="/api/media/discover?type=tv&genre=16" getToken={getToken} onCardClick={setSelectedMedia} />

          {/* Feed des critiques */}
          <div className="px-4 sm:px-8 mb-8 mt-12">
            <h2 className="text-xl font-bold mb-4 text-white">Dernières Critiques de la Promo</h2>
            {feed.length === 0 ? (
              <div className="text-gray-500 text-sm">Aucune critique récente.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {feed.map(review => (
                  <ReviewCard key={review.id} review={review} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Details Modal */}
      {selectedMedia && (
        <div
          className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-2 sm:p-8 animate-fade-in backdrop-blur-sm"
          onClick={() => setSelectedMedia(null)}
        >
          <div
            className="bg-[#181818] rounded-xl max-w-4xl w-full max-h-full overflow-y-auto relative shadow-2xl border border-gray-800 scrollbar-hide"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedMedia(null)}
              className="absolute top-4 right-4 z-20 bg-black/50 p-2 rounded-full text-white hover:bg-black/80 transition-colors"
            >
              <X size={24} />
            </button>

            <div className="relative h-48 sm:h-96 w-full select-none rounded-t-xl overflow-hidden">
              {selectedMedia.backdrop_url ? (
                <img src={selectedMedia.backdrop_url} alt="backdrop" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-slate-900" />
              )}
              <div className="absolute inset-0 bg-black/30 pointer-events-none" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#181818] via-[#181818]/60 to-transparent pointer-events-none" />
            </div>

            <div className="px-4 sm:px-12 pb-12 -mt-16 sm:-mt-24 relative z-10 flex flex-col md:flex-row gap-8">
              <div className="flex-1">
                <h2 className="text-3xl sm:text-5xl font-black mb-4 leading-tight">{selectedMedia.title || selectedMedia.name}</h2>
                <div className="flex items-center gap-4 text-sm font-medium text-gray-400 mb-6">
                  {selectedMedia.vote_average ? (
                    <span className="text-green-500 font-bold">Recommandé à {(selectedMedia.vote_average * 10).toFixed(0)}%</span>
                  ) : null}
                  <span>{selectedMedia.release_date?.split('-')[0] || selectedMedia.release_year}</span>
                  <span className="uppercase border border-gray-600 px-1.5 py-0.5 rounded text-xs">
                    {(selectedMedia.type || selectedMedia.media_type)?.toLowerCase() === 'tv' ? 'Série' : 'Film'}
                  </span>
                </div>
                <p className="text-gray-300 text-base sm:text-lg leading-relaxed mb-6">
                  {selectedMedia.overview || "Aucune description disponible pour ce titre."}
                </p>

                {selectedMedia.watch_providers && selectedMedia.watch_providers.length > 0 && (
                  <div className="mb-8 flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-400">Disponible sur :</span>
                    <div className="flex gap-2">
                      {selectedMedia.watch_providers.slice(0, 4).map(provider => (
                        <img key={provider.provider_id} src={`https://image.tmdb.org/t/p/w45${provider.logo_path}`} alt={provider.provider_name} title={provider.provider_name} className="w-8 h-8 rounded shadow-md" />
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap gap-3 mb-8 border-b border-gray-800 pb-8">
                  {(() => {
                    const isMyList = watchlist.some(m => m.tmdb_id === (selectedMedia.tmdb_id || selectedMedia.id?.toString()));
                    return (
                      <button
                        onClick={() => toggleWatchlist(selectedMedia, 'personal')}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded font-bold transition-colors ${isMyList ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-white text-black hover:bg-gray-200'}`}
                      >
                        {isMyList ? <Check size={20} /> : <Plus size={20} />}
                        {isMyList ? 'Dans ma liste' : 'Ma Liste'}
                      </button>
                    )
                  })()}

                  {(() => {
                    const isClassList = classWatchlist.some(m => m.tmdb_id === (selectedMedia.tmdb_id || selectedMedia.id?.toString()));
                    return (
                      <button
                        onClick={() => toggleWatchlist(selectedMedia, 'class')}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded font-bold transition-colors ${isClassList ? 'bg-green-600/80 text-white hover:bg-green-600' : 'bg-gray-700 text-white hover:bg-gray-600'}`}
                      >
                        {isClassList ? <Check size={20} /> : <Users size={20} />}
                        {isClassList ? 'Dans la promo' : 'Liste de Promo'}
                      </button>
                    )
                  })()}
                  <button
                    onClick={() => {
                      const sharePayload = `media-share:{"tmdb_id":"${selectedMedia.tmdb_id || selectedMedia.id}","type":"${selectedMedia.type || selectedMedia.media_type || 'movie'}","poster_url":"${selectedMedia.poster_url || ''}","title":"${(selectedMedia.title || selectedMedia.name).replace(/"/g, '\\"')}","year":"${selectedMedia.release_date ? selectedMedia.release_date.split('-')[0] : selectedMedia.release_year || ''}"}`
                      setSearchParams(prev => {
                        prev.set('shareMedia', sharePayload)
                        return prev
                      })
                      // The ChatWidget will automatically detect this parameter and open the forward modal
                    }}
                    className="flex items-center gap-2 px-4 py-2.5 rounded font-bold transition-colors bg-indigo-600 text-white hover:bg-indigo-700"
                  >
                    <MessageSquare size={20} />
                    Chat
                  </button>
                  <button
                    onClick={async () => {
                      const shareUrl = `${window.location.origin}/media?id=${selectedMedia.tmdb_id || selectedMedia.id}&type=${selectedMedia.type || selectedMedia.media_type || 'movie'}`
                      if (navigator.share) {
                        try {
                          await navigator.share({
                            title: selectedMedia.title || selectedMedia.name,
                            text: "Regarde ça sur MongeFlix !",
                            url: shareUrl
                          })
                        } catch (err) {
                          console.log('Partage annulé')
                        }
                      } else {
                        navigator.clipboard.writeText(shareUrl)
                        showToast("Lien copié dans le presse-papier !")
                      }
                    }}
                    className="flex items-center gap-2 px-4 py-2.5 rounded font-bold transition-colors bg-[#242424] text-white hover:bg-[#333] border border-[#333]"
                  >
                    <Share2 size={20} />
                    Partager (Lien)
                  </button>
                </div>

                {/* Review section */}
                <div>
                  <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-white"><MessageSquare size={20} /> Laisser une critique</h3>
                  <div className="bg-[#242424] rounded-lg p-5 border border-[#333]">
                    <div className="flex gap-2 mb-4">
                      {[1, 2, 3, 4, 5].map(star => (
                        <button key={star} onClick={() => setRating(star)} className="focus:outline-none transition-transform hover:scale-110">
                          <Star size={28} className={star <= rating ? "text-yellow-400" : "text-gray-600"} fill={star <= rating ? "currentColor" : "transparent"} />
                        </button>
                      ))}
                    </div>
                    {(selectedMedia.type === 'tv' || selectedMedia.media_type === 'tv' || selectedMedia.type === 'série') && (
                      <div className="flex gap-4 mb-4">
                        <div className="flex-1">
                          <label className="text-xs text-gray-400 mb-1 block">Saison (opt.)</label>
                          <input type="number" min="1" value={seasonNum} onChange={e => setSeasonNum(e.target.value)} placeholder="Ex: 1" className="w-full bg-black/40 border border-gray-700 rounded-md p-2 text-white outline-none focus:border-gray-500 text-sm" />
                        </div>
                        <div className="flex-1">
                          <label className="text-xs text-gray-400 mb-1 block">Épisode (opt.)</label>
                          <input type="number" min="1" value={episodeNum} onChange={e => setEpisodeNum(e.target.value)} placeholder="Ex: 3" className="w-full bg-black/40 border border-gray-700 rounded-md p-2 text-white outline-none focus:border-gray-500 text-sm" />
                        </div>
                      </div>
                    )}
                    <textarea
                      placeholder="Qu'as-tu pensé de ce titre ?"
                      value={reviewText}
                      onChange={e => setReviewText(e.target.value)}
                      className="w-full bg-black/40 border border-gray-700 rounded-md p-3 text-white mb-4 min-h-[100px] outline-none focus:border-gray-500 transition-colors text-sm"
                    />
                    {reviewError && <p className="text-red-500 text-sm mb-3">{reviewError}</p>}
                    <button
                      onClick={submitReview}
                      disabled={isSubmitting || !rating}
                      className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white px-6 py-2 rounded font-bold w-full sm:w-auto transition-colors"
                    >
                      {isSubmitting ? 'Publication...' : 'Publier'}
                    </button>
                  </div>
                </div>

                {/* Section Critiques existantes du film */}
                <div className="mt-8">
                  <h3 className="text-xl font-bold mb-4 text-white border-t border-gray-800 pt-8">Avis de la Promo</h3>
                  {isLoadingMediaReviews ? (
                    <div className="animate-pulse space-y-4">
                      <div className="h-24 bg-[#242424] rounded-lg"></div>
                      <div className="h-24 bg-[#242424] rounded-lg"></div>
                    </div>
                  ) : mediaReviews.length === 0 ? (
                    <p className="text-gray-500 text-sm">Aucune critique n'a encore été publiée pour ce titre. Sois le premier !</p>
                  ) : (
                    <div className="flex flex-col gap-4">
                      {mediaReviews.map(review => (
                        <ReviewCard key={review.id} review={review} />
                      ))}
                    </div>
                  )}
                </div>

              </div>

              {/* Sidebar Poster */}
              <div className="hidden md:block w-56 shrink-0 mt-8">
                {selectedMedia.poster_url ? (
                  <img src={selectedMedia.poster_url} className="w-full rounded-md shadow-2xl border border-gray-800" alt="poster" />
                ) : (
                  <div className="w-full aspect-[2/3] bg-gray-800 rounded-md flex items-center justify-center text-gray-500 border border-gray-700"><Film size={48} /></div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Global Toast */}
      {toast && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[200] bg-gray-800 text-white px-6 py-3 rounded-full shadow-lg border border-gray-700 animate-fade-in flex items-center gap-2">
          <Check size={18} className="text-green-400" />
          {toast}
        </div>
      )}

    </div>
  )
}
