import { useState, useEffect, useCallback, useRef, createContext, useContext } from 'react'
import { Search, Film, Star, MessageSquare, Play, Plus, ChevronLeft, ChevronRight, X, Users, Check, Trash2, ThumbsUp, ThumbsDown, AlertTriangle, Share2, Dices, Filter, Eye, Info, Tv, Flame, Clock, Heart, TrendingUp, ListPlus, List, Lock, Globe } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { RestrictedAccess } from '../components/RestrictedAccess'

const PromoRatingsContext = createContext({})
const MediaActionsContext = createContext({})

// Components
const MediaCard = ({ media, onClick }) => {
  const promoRatings = useContext(PromoRatingsContext)
  const promoNote = promoRatings[media.tmdb_id || media.id]
  const { toggleWatched, watchedList, toggleWatchlist, watchlist } = useContext(MediaActionsContext)

  const isWatched = watchedList?.some(m => (m.tmdb_id || m.id)?.toString() === (media.tmdb_id || media.id)?.toString())
  const isWatchlisted = watchlist?.some(m => (m.tmdb_id || m.id)?.toString() === (media.tmdb_id || media.id)?.toString())

  const year = media.release_date ? media.release_date.substring(0, 4) : '';
  const typeLabel = media.type === 'tv' || media.media_type === 'tv' ? 'Série' : 'Film';

  return (
    <div
      className="flex-shrink-0 cursor-pointer group/card relative transition-transform duration-300 delay-0 hover:delay-[400ms] hover:scale-[1.15] z-10 hover:z-50"
      style={{ width: '150px' }}
      onClick={() => onClick(media)}
    >
      <div className="aspect-[2/3] rounded-md overflow-hidden bg-[var(--bg)] shadow-md transition-shadow duration-300 delay-0 group-hover/card:delay-[400ms] group-hover/card:shadow-[0_0_20px_rgba(0,0,0,0.8)] relative ring-1 ring-transparent group-hover/card:ring-gray-700">
        {media.poster_url ? (
          <img src={media.poster_url} alt={media.title} className="w-full h-full object-cover transition-transform duration-500" loading="lazy" />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 bg-[var(--bg)] p-2">
            <Film size={32} />
            <span className="text-xs text-center mt-2 font-bold">{media.title}</span>
          </div>
        )}

        {/* Note promo (badge spécial) */}
        {promoNote && (
          <div className="absolute top-1 left-1 bg-red-600/90 backdrop-blur-sm px-1.5 py-0.5 rounded text-[10px] font-bold text-[var(--text)] flex items-center gap-1 shadow-md z-10 group-hover/card:opacity-0 transition-opacity duration-300 delay-0 group-hover/card:delay-[400ms]">
            <Users size={10} /> {promoNote}
          </div>
        )}

        {/* Note top-right (cachée au survol) */}
        {media.vote_average ? (
          <div className="absolute top-1 right-1 bg-black/80 px-1.5 py-0.5 rounded text-[10px] font-bold text-yellow-400 flex items-center gap-1 group-hover/card:opacity-0 transition-opacity duration-300 delay-0 group-hover/card:delay-[400ms]">
            <Star size={10} fill="currentColor" /> {(media.vote_average).toFixed(1)}
          </div>
        ) : null}

        {/* Overlay Hover Netflix-style */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-[#141414]/80 to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity duration-300 delay-0 group-hover/card:delay-[400ms] flex flex-col justify-end p-3 pointer-events-none group-hover/card:pointer-events-auto">
          <h4 className="text-[var(--text)] font-bold text-sm leading-tight mb-1.5 drop-shadow-md line-clamp-2">{media.title}</h4>

          <div className="flex flex-wrap items-center gap-1.5 text-[9px] font-bold text-[var(--text)] mb-2 leading-none">
            {media.vote_average > 0 && <span className="text-green-500">Recommandé à {(media.vote_average * 10).toFixed(0)}%</span>}
            {year && <span>{year}</span>}
            <span className="border border-gray-600 px-1 py-0.5 rounded-[3px] uppercase text-[8px] leading-none shrink-0">{typeLabel}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              className="bg-white text-black p-1.5 rounded-full hover:bg-gray-200 transition-colors flex justify-center items-center shadow-lg"
              onClick={(e) => { e.stopPropagation(); onClick(media); }}
              title="Plus d'informations"
            >
              <Info size={14} />
            </button>
            <button
              className={`border-2 p-1.5 rounded-full transition-colors shadow-lg ml-auto ${isWatched ? 'border-green-500 text-green-500 bg-green-500/20' : 'border-gray-400 text-[var(--text)] hover:border-white hover:bg-white/20'}`}
              onClick={(e) => { e.stopPropagation(); toggleWatched && toggleWatched(media); }}
              title={isWatched ? "Marqué comme vu" : "Marquer comme vu"}
            >
              <Eye size={14} />
            </button>
            <button
              className={`border-2 p-1.5 rounded-full transition-colors shadow-lg ${isWatchlisted ? 'border-white text-[var(--text)] bg-white/20' : 'border-gray-400 text-[var(--text)] hover:border-white hover:bg-white/20'}`}
              onClick={(e) => { e.stopPropagation(); toggleWatchlist && toggleWatchlist(media, 'personal'); }}
              title={isWatchlisted ? "Dans ma liste" : "Ajouter à ma liste"}
            >
              {isWatchlisted ? <Check size={14} /> : <Plus size={14} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

const CarouselRow = ({ title, items, onCardClick, onDelete }) => {
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

  if (!items || items.length === 0) {
    if (!onDelete) return null;
  }

  return (
    <div className="mb-8 relative group">
      <div className="flex items-center gap-4 px-4 sm:px-12 mb-2">
        <h2 className="text-xl font-bold text-[var(--text)]">{title}</h2>
        {onDelete && (
          <button 
            onClick={onDelete} 
            className="text-gray-500 hover:text-red-500 transition-colors bg-white/5 hover:bg-red-500/10 p-1.5 rounded-full"
            title="Supprimer la liste"
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>

      {(!items || items.length === 0) && onDelete && (
        <div className="px-4 sm:px-12 py-4">
          <div className="border border-dashed border-[var(--border)] rounded-xl flex items-center justify-center py-10 bg-black/20 text-gray-500">
            Cette liste est vide. Ajoute des films pour les voir ici !
          </div>
        </div>
      )}

      {items && items.length > 0 && showLeft && (
        <button
          onClick={() => scroll('left')}
          className="absolute left-0 top-9 bottom-4 z-[60] bg-gradient-to-r from-black/80 to-transparent w-12 opacity-0 group-hover:opacity-100 transition-opacity hidden sm:flex items-center justify-start pl-2 hover:from-black"
        >
          <ChevronLeft size={40} className="text-[var(--text)] hover:scale-125 transition-transform" />
        </button>
      )}

      <div
        ref={scrollRef}
        onScroll={checkScroll}
        className="flex gap-2 overflow-x-auto px-4 sm:px-12 py-4 scrollbar-hide"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {items.map((item, i) => (
          <MediaCard key={`${item.id || item.tmdb_id || 'media'}-${i}`} media={item} onClick={onCardClick} />
        ))}
      </div>

      {showRight && (
        <button
          onClick={() => scroll('right')}
          className="absolute right-0 top-9 bottom-4 z-[60] bg-gradient-to-l from-black/80 to-transparent w-12 opacity-0 group-hover:opacity-100 transition-opacity hidden sm:flex items-center justify-end pr-2 hover:from-black"
        >
          <ChevronRight size={40} className="text-[var(--text)] hover:scale-125 transition-transform" />
        </button>
      )}
    </div>
  )
}

const LazyCarouselRow = ({ title, endpoint, getToken, onCardClick }) => {
  const [items, setItems] = useState([])
  const [hasFetched, setHasFetched] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const containerRef = useRef(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !hasFetched && !isLoading) {
          fetchData()
        }
      },
      { rootMargin: '200px' }
    )

    if (containerRef.current) {
      observer.observe(containerRef.current)
    }

    return () => observer.disconnect()
  }, [hasFetched, isLoading])

  const fetchData = async () => {
    setHasFetched(true)
    setIsLoading(true)
    try {
      const token = getToken()
      const res = await fetch(endpoint, { headers: { 'Authorization': `Bearer ${token}` } })
      if (res.ok) {
        const data = await res.json()
        setItems(data)
      }
    } catch (err) {
      console.error('Failed to fetch lazy row:', err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div ref={containerRef} className="min-h-[250px]">
      {isLoading || (!hasFetched && items.length === 0) ? (
        <div className="mb-8 px-4 sm:px-12">
          <div className="h-6 w-48 bg-[#2a2a2a] rounded mb-2 animate-pulse"></div>
          <div className="flex gap-2 overflow-hidden py-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
              <div key={i} className="flex-shrink-0 w-[150px] aspect-[2/3] bg-[#2a2a2a] rounded-md animate-pulse"></div>
            ))}
          </div>
        </div>
      ) : items.length > 0 ? (
        <CarouselRow title={title} items={items} onCardClick={onCardClick} />
      ) : null}
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
  const [watchedList, setWatchedList] = useState([])
  const [customLists, setCustomLists] = useState([])
  const [promoStats, setPromoStats] = useState(null)
  const [feed, setFeed] = useState([])
  const [showFilters, setShowFilters] = useState(false)
  const [showDashboard, setShowDashboard] = useState(false)
  const [showCreateListModal, setShowCreateListModal] = useState(false)
  const [listMediaContext, setListMediaContext] = useState(null)
  const [listToDelete, setListToDelete] = useState(null)
  const [newListName, setNewListName] = useState('')
  const [newListPublic, setNewListPublic] = useState(false)
  const [promoRatings, setPromoRatings] = useState({})
  const [heroIndex, setHeroIndex] = useState(0)
  
  const [selectedSeason, setSelectedSeason] = useState(1)
  const [seasonEpisodes, setSeasonEpisodes] = useState([])
  const [isLoadingEpisodes, setIsLoadingEpisodes] = useState(false)

  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [isSearching, setIsSearching] = useState(false)
  const [showTrailer, setShowTrailer] = useState(false)
  const [searchError, setSearchError] = useState(null)
  const [tmdbError, setTmdbError] = useState(false)

  const [exploreFilters, setExploreFilters] = useState({
    type: 'all',
    genre: '',
    year: '',
    rating: '',
    sort: 'popularity.desc'
  })
  const [exploreResults, setExploreResults] = useState([])
  const [isExploring, setIsExploring] = useState(false)
  const [isLoadingExplore, setIsLoadingExplore] = useState(false)
  const isDefaultFilters = exploreFilters.type === 'all' && !exploreFilters.genre && !exploreFilters.year && !exploreFilters.rating && exploreFilters.sort === 'popularity.desc';

  const updateFilter = (updates) => {
    setExploreFilters(p => ({ ...p, ...updates }));
  };

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

      const [trendRes, watchRes, feedRes, promoRes, listsRes, statsRes] = await Promise.all([
        fetch('/api/media/trending', { headers }),
        fetch('/api/media/watchlist', { headers }),
        fetch('/api/media/feed'),
        fetch('/api/media/promo_ratings'),
        fetch('/api/media/lists', { headers }),
        fetch('/api/media/stats', { headers })
      ])

      if (trendRes.ok) setTrending(await trendRes.json())
      if (promoRes.ok) setPromoRatings(await promoRes.json())

      if (watchRes.ok) {
        const watchData = await watchRes.json()
        setWatchlist(watchData.filter(w => w.type === 'personal' && w.status !== 'watched').map(w => ({ ...w.media, watchlist_id: w.id })))
        setWatchedList(watchData.filter(w => w.type === 'personal' && w.status === 'watched').map(w => ({ ...w.media, watchlist_id: w.id })))
        setClassWatchlist(watchData.filter(w => w.type === 'class').map(w => ({ ...w.media, watchlist_id: w.id, added_by: w.user })))
      }

      if (listsRes.ok) setCustomLists(await listsRes.json())
      if (statsRes.ok) setPromoStats(await statsRes.json())
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
      if (!selectedMedia.fetched_tmdb || selectedMedia.watch_providers === undefined) {
        const tmdbId = selectedMedia.tmdb_id || selectedMedia.id?.toString();
        const type = selectedMedia.type || selectedMedia.media_type || 'movie';
        // Prevent infinite loops by marking it as fetching
        setSelectedMedia(prev => ({ ...prev, fetched_tmdb: true }));
        setSelectedSeason(selectedMedia.initialSeason || 1);
        setSeasonEpisodes([]);
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

  // Fetch episodes when selectedSeason or selectedMedia changes
  useEffect(() => {
    const type = selectedMedia?.type || selectedMedia?.media_type;
    const tmdbId = selectedMedia?.tmdb_id || selectedMedia?.id?.toString();
    
    if (type === 'tv' && tmdbId) {
      const fetchEpisodes = async () => {
        setIsLoadingEpisodes(true);
        try {
           const res = await fetch(`/api/media/series/${tmdbId}/season/${selectedSeason}`, {
              headers: { 'Authorization': `Bearer ${getToken()}` }
           });
           if (res.ok) {
              const data = await res.json();
              setSeasonEpisodes(data.episodes || []);
           }
        } catch (err) {
           console.error(err);
        } finally {
           setIsLoadingEpisodes(false);
        }
      }
      fetchEpisodes();
    }
  }, [selectedMedia?.tmdb_id, selectedMedia?.id, selectedSeason, getToken, selectedMedia?.type, selectedMedia?.media_type]);

  useEffect(() => {
    if (isDefaultFilters) {
      setIsExploring(false)
      setExploreResults([])
      return;
    }
    setIsExploring(true)

    const fetchExplore = async () => {
      setIsLoadingExplore(true)
      try {
        const query = new URLSearchParams()
        if (exploreFilters.type !== 'all') query.set('type', exploreFilters.type)
        if (exploreFilters.genre) query.set('genre', exploreFilters.genre)
        if (exploreFilters.year) query.set('year', exploreFilters.year)
        if (exploreFilters.rating) query.set('rating', exploreFilters.rating)
        if (exploreFilters.sort) query.set('sort', exploreFilters.sort)

        const res = await fetch(`/api/media/explore?${query.toString()}`, {
          headers: { 'Authorization': `Bearer ${getToken()}` }
        })
        if (res.ok) {
          setExploreResults(await res.json())
        }
      } catch (err) {
        console.error(err)
      } finally {
        setIsLoadingExplore(false)
      }
    }

    const timer = setTimeout(fetchExplore, 500)
    return () => clearTimeout(timer)
  }, [exploreFilters, getToken, isDefaultFilters])

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

  const toggleWatched = async (media) => {
    const mediaId = (media.tmdb_id || media.id)?.toString();
    const existingItem = watchedList.find(m => (m.tmdb_id || m.id)?.toString() === mediaId);

    try {
      const token = getToken()
      if (existingItem) {
        const res = await fetch(`/api/media/watchlist/${existingItem.watchlist_id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        })
        if (res.ok) {
          showToast('Retiré des films vus')
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
            poster_url: media.poster_url || media.poster_path ? `https://image.tmdb.org/t/p/w500${media.poster_path}` : null,
            release_year: media.release_date ? media.release_date.split('-')[0] : (media.release_year || media.first_air_date?.split('-')[0]),
            type: 'personal',
            status: 'watched'
          })
        })
        if (res.ok) {
          showToast('Marqué comme vu !')
          fetchAllData()
        }
      }
    } catch (err) {
      console.error(err)
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

  const createCustomList = async () => {
    if (!newListName.trim()) return;
    try {
      const res = await fetch('/api/media/lists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
        body: JSON.stringify({ name: newListName, is_public: newListPublic })
      })
      if (res.ok) {
        const newList = await res.json()
        setCustomLists(prev => [newList, ...prev])
        setShowCreateListModal(false)
        setNewListName('')
        setNewListPublic(false)
        
        if (listMediaContext) {
          // toggleMediaInList handles its own toast and fetchAllData
          await toggleMediaInList(newList.id, listMediaContext)
          setListMediaContext(null)
          showToast(`Liste créée avec ${listMediaContext.title || listMediaContext.name} !`)
        } else {
          showToast('Liste créée avec succès !')
          fetchAllData()
        }
      }
    } catch (err) {
      showToast('Erreur lors de la création de la liste')
    }
  }

  const toggleMediaInList = async (listId, media) => {
    try {
      const res = await fetch(`/api/media/lists/${listId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
        body: JSON.stringify({ media })
      })
      if (res.ok) {
        const data = await res.json()
        showToast(data.message)
        fetchAllData()
      }
    } catch (err) {
      showToast('Erreur modification liste')
    }
  }

  const confirmDeleteList = async () => {
    if (!listToDelete) return;
    try {
      const res = await fetch(`/api/media/lists/${listToDelete}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${getToken()}` }
      })
      if (res.ok) {
        setCustomLists(prev => prev.filter(l => l.id !== listToDelete))
        showToast('Liste supprimée')
      }
    } catch (err) {
      showToast('Erreur suppression liste')
    } finally {
      setListToDelete(null)
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
      <div 
        className="bg-[var(--surface-2)] p-4 rounded-lg flex gap-4 items-start border border-[var(--border)] cursor-pointer hover:bg-[#202020] transition-colors group/review relative"
        onClick={() => {
          if (review.media) {
            setSelectedMedia({
              id: review.media.id,
              tmdb_id: review.media.tmdb_id,
              type: review.media.type,
              title: review.media.title,
              poster_url: review.media.poster_url,
              release_date: review.media.release_year ? `${review.media.release_year}-01-01` : null,
              initialSeason: review.season_number,
              initialEpisode: review.episode_number
            });
            setTimeout(() => {
              document.getElementById('episodes-section')?.scrollIntoView({ behavior: 'smooth' })
            }, 800)
          }
        }}
      >
        {review.media?.poster_url && (
          <img src={review.media.poster_url} className="w-16 h-24 object-cover rounded shadow" alt="poster" />
        )}
        <div className="flex-1 min-w-0 relative">
          {user && (user.id === review.user_id || user.role === 'admin') && (
            <button
              onClick={(e) => { e.stopPropagation(); deleteReview(review.id); }}
              className="absolute -top-1 -right-1 p-1 text-gray-500 hover:text-red-500 transition-colors bg-black/20 rounded-full"
              title="Supprimer la critique"
            >
              <Trash2 size={16} />
            </button>
          )}
          {review.media?.title && (
            <h4 className="font-bold truncate text-[var(--text)] pr-6 flex items-center gap-2">
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
          <p className="text-sm text-[var(--text)] line-clamp-3 mb-3 italic">"{review.review_text}"</p>

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
                onClick={(e) => { e.stopPropagation(); handleReact(review.id, myReaction === 'up' ? null : 'up'); }}
                className={`flex items-center gap-1 text-xs transition-colors ${myReaction === 'up' ? 'text-green-500' : 'text-gray-500 hover:text-green-400'}`}
              >
                <ThumbsUp size={14} fill={myReaction === 'up' ? 'currentColor' : 'transparent'} />
                <span>{upvotes}</span>
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); handleReact(review.id, myReaction === 'down' ? null : 'down'); }}
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
      <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] font-sans overflow-x-hidden pb-20">
        <div className="sticky top-[calc(3.5rem+env(safe-area-inset-top))] z-[80] bg-gradient-to-b from-[var(--bg)] to-transparent pt-4 pb-8 px-4 sm:px-8 flex justify-between items-center transition-all">
          <div className="flex items-center gap-3">
            <Link to="/outils" className="p-2 rounded-xl flex items-center justify-center transition-all w-fit hover:bg-[var(--surface-3)]" style={{ background: 'var(--surface-2)', color: 'var(--text-muted)' }}>
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-2 select-none cursor-pointer">
              <svg width="36" height="36" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-[0_2px_10px_rgba(229,9,20,0.5)] transition-transform hover:scale-105">
                <path fillRule="evenodd" clipRule="evenodd" d="M10 40V8H18L24 22L30 8H38V40H30V22L24 36L18 22V40H10Z" fill="url(#logo-grad)"/>
                <defs>
                  <linearGradient id="logo-grad" x1="10" y1="8" x2="38" y2="40" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#FF3333"/>
                    <stop offset="1" stopColor="#990000"/>
                  </linearGradient>
                </defs>
              </svg>
            </div>
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

  const filteredSearchResults = searchResults.filter(item => {
    if (exploreFilters.type === 'movie' && item.media_type !== 'movie') return false;
    if (exploreFilters.type === 'tv' && item.media_type !== 'tv') return false;
    if (exploreFilters.genre && !item.genre_ids?.includes(parseInt(exploreFilters.genre))) return false;
    if (exploreFilters.year) {
      const year = (item.release_date || item.first_air_date || '').substring(0, 4);
      if (year !== exploreFilters.year) return false;
    }
    return true;
  });

  return (
    <PromoRatingsContext.Provider value={promoRatings}>
      <MediaActionsContext.Provider value={{ toggleWatched, watchedList, toggleWatchlist, watchlist }}>
        <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] font-sans overflow-x-hidden pb-20">

          {/* Navbar (Search & Back) */}
          <div className="fixed top-14 left-0 right-0 z-[90] pointer-events-none bg-gradient-to-b from-[var(--bg)] via-[var(--bg)] to-transparent pt-4 pb-8 px-4 sm:px-8 flex justify-between items-center transition-all">
            <div className="flex items-center gap-3 pointer-events-auto">
              <Link to="/outils" className="p-2 rounded-xl flex items-center justify-center transition-all w-fit hover:bg-[var(--surface-3)]" style={{ background: 'var(--surface-2)', color: 'var(--text-muted)' }}>
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div className="flex items-center gap-2 select-none cursor-pointer" onClick={() => window.scrollTo({top: 0, behavior: 'smooth'})}>
                <svg width="36" height="36" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-[0_2px_10px_rgba(229,9,20,0.5)] transition-transform hover:scale-105">
                  <path fillRule="evenodd" clipRule="evenodd" d="M10 40V8H18L24 22L30 8H38V40H30V22L24 36L18 22V40H10Z" fill="url(#logo-grad)"/>
                  <defs>
                    <linearGradient id="logo-grad" x1="10" y1="8" x2="38" y2="40" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#FF3333"/>
                      <stop offset="1" stopColor="#990000"/>
                    </linearGradient>
                  </defs>
                </svg>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-4 pointer-events-auto">
              <button onClick={() => { setListMediaContext(null); setShowCreateListModal(true); }} className="flex text-sm font-bold text-[var(--text)] hover:text-red-400 transition-colors items-center gap-1 bg-[var(--surface-2)] border border-[var(--border)] hover:border-red-600/50 p-2.5 sm:px-4 sm:py-2 rounded-full" title="Créer Liste">
                <ListPlus size={16} /> <span className="hidden lg:inline">Créer Liste</span>
              </button>
              <button onClick={() => setShowDashboard(true)} className="flex text-sm font-bold text-[var(--text)] hover:text-red-400 transition-colors items-center gap-1 bg-[var(--surface-2)] border border-[var(--border)] hover:border-red-600/50 p-2.5 sm:px-4 sm:py-2 rounded-full" title="Dashboard">
                <TrendingUp size={16} /> <span className="hidden lg:inline">Dashboard</span>
              </button>
              <button onClick={handleRandomMedia} className="flex text-sm font-bold text-[var(--text)] hover:text-red-400 transition-colors items-center gap-1 bg-[var(--surface-2)] border border-[var(--border)] hover:border-red-600/50 p-2.5 sm:px-4 sm:py-2 rounded-full" title="Aléatoire">
                <Dices size={16} /> <span className="hidden lg:inline">Aléatoire</span>
              </button>
              <Link to="/mes-critiques" className="hidden md:flex text-sm font-bold text-[var(--text)] hover:text-[var(--text)] transition-colors items-center gap-1 bg-[var(--surface-2)] border border-[var(--border)] p-2.5 sm:px-4 sm:py-2 rounded-full" title="Mes Critiques">
                <MessageSquare size={16} /> <span className="hidden lg:inline">Mes Critiques</span>
              </Link>

              <div className="relative w-32 sm:w-80">
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                  <Search size={18} className="text-[var(--text-muted)]" />
                </div>
                <input
                  type="text"
                  className="bg-[var(--surface-3)] text-[var(--text)] text-sm rounded-full w-full pl-10 pr-20 py-2 focus:outline-none focus:ring-2 focus:ring-red-600 transition-all border border-transparent focus:border-red-600 placeholder-gray-500"
                  placeholder="Titres, personnes, genres..."
                  value={searchQuery}
                  onChange={searchMedia}
                />

                <div className="absolute inset-y-0 right-2 flex items-center gap-1">
                  {searchQuery && (
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        setSearchResults([]);
                      }}
                      className="p-1 flex items-center text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
                      title="Effacer la recherche"
                    >
                      <X size={16} />
                    </button>
                  )}
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className={`p-1.5 rounded-full transition-colors ${!isDefaultFilters ? 'bg-red-600/20 text-red-500' : showFilters ? 'bg-white/10 text-[var(--text)]' : 'text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-white/5'}`}
                    title="Filtres d'exploration"
                  >
                    <Filter size={16} />
                  </button>
                </div>

                {/* Filter Dropdown */}
                {showFilters && (
                  <div className="absolute top-12 right-0 w-[340px] bg-[var(--surface-2)] border border-[#333] rounded-xl shadow-2xl p-5 flex flex-col gap-6 z-[100] animate-fade-in pointer-events-auto">
                    <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
                      <h4 className="text-sm font-bold text-[var(--text)] flex items-center gap-2"><Filter size={16} className="text-red-500" /> Filtrer et Explorer</h4>
                      {!isDefaultFilters && (
                        <button
                          onClick={() => updateFilter({ type: 'all', genre: '', year: '', rating: '', sort: 'popularity.desc' })}
                          className="text-xs text-[var(--text-muted)] hover:text-[var(--text)] transition-colors flex items-center gap-1 bg-gray-800 hover:bg-gray-700 px-2 py-1 rounded"
                        >
                          <X size={12} /> Réinitialiser
                        </button>
                      )}
                    </div>

                    {/* Type Selection */}
                    <div>
                      <h5 className="text-xs font-bold text-[var(--text-muted)] mb-3 uppercase tracking-wider">Type de contenu</h5>
                      <div className="flex bg-[var(--surface-3)] rounded-lg p-1">
                        <button onClick={() => updateFilter({type: 'all'})} className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-md transition-colors ${exploreFilters.type === 'all' ? 'bg-red-600 text-[var(--text)] shadow-lg' : 'text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[#333]'}`}>
                          <Search size={14} /> Tous
                        </button>
                        <button onClick={() => updateFilter({type: 'movie'})} className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-md transition-colors ${exploreFilters.type === 'movie' ? 'bg-red-600 text-[var(--text)] shadow-lg' : 'text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[#333]'}`}>
                          <Film size={14} /> Films
                        </button>
                        <button onClick={() => updateFilter({type: 'tv'})} className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-md transition-colors ${exploreFilters.type === 'tv' ? 'bg-red-600 text-[var(--text)] shadow-lg' : 'text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[#333]'}`}>
                          <Tv size={14} /> Séries
                        </button>
                      </div>
                    </div>

                    {/* Genre Selection */}
                    <div>
                      <h5 className="text-xs font-bold text-[var(--text-muted)] mb-3 uppercase tracking-wider">Genre</h5>
                      <div className="flex flex-wrap gap-2">
                        {[{id:'', label:'Tous', icon: Check}, {id:'28', label:'Action', icon: Flame}, {id:'35', label:'Comédie', icon: MessageSquare}, {id:'18', label:'Drame', icon: Users}, {id:'878', label:'Sci-Fi', icon: Star}, {id:'27', label:'Horreur', icon: AlertTriangle}, {id:'16', label:'Animation', icon: Play}].map(g => (
                          <button key={g.label} onClick={() => updateFilter({genre: g.id})} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${exploreFilters.genre === g.id ? 'bg-red-600/20 border-red-500 text-red-500' : 'bg-[var(--surface-3)] border-transparent text-[var(--text-muted)] hover:bg-[#333] hover:text-[var(--text)]'}`}>
                            <g.icon size={12} /> {g.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Sort Selection */}
                    <div>
                      <h5 className="text-xs font-bold text-[var(--text-muted)] mb-3 uppercase tracking-wider">Trier par</h5>
                      <div className="grid grid-cols-2 gap-2">
                        <button onClick={() => updateFilter({sort: 'popularity.desc'})} className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl text-xs font-bold transition-all ${exploreFilters.sort === 'popularity.desc' ? 'bg-red-600/20 text-red-500 border border-red-500/50' : 'bg-[var(--surface-3)] text-[var(--text-muted)] border border-transparent hover:bg-[#333] hover:text-[var(--text)]'}`}>
                          <Flame size={18} /> Popularité
                        </button>
                        <button onClick={() => updateFilter({sort: 'primary_release_date.desc'})} className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl text-xs font-bold transition-all ${exploreFilters.sort === 'primary_release_date.desc' ? 'bg-red-600/20 text-red-500 border border-red-500/50' : 'bg-[var(--surface-3)] text-[var(--text-muted)] border border-transparent hover:bg-[#333] hover:text-[var(--text)]'}`}>
                          <Clock size={18} /> Récents
                        </button>
                        <button onClick={() => updateFilter({sort: 'vote_average.desc'})} className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl text-xs font-bold transition-all ${exploreFilters.sort === 'vote_average.desc' ? 'bg-red-600/20 text-red-500 border border-red-500/50' : 'bg-[var(--surface-3)] text-[var(--text-muted)] border border-transparent hover:bg-[#333] hover:text-[var(--text)]'}`}>
                          <Star size={18} /> Mieux notés
                        </button>
                        <button onClick={() => updateFilter({sort: 'promo_rating.desc'})} className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl text-xs font-bold transition-all ${exploreFilters.sort === 'promo_rating.desc' ? 'bg-red-600/20 text-red-500 border border-red-500/50' : 'bg-[var(--surface-3)] text-[var(--text-muted)] border border-transparent hover:bg-[#333] hover:text-[var(--text)]'}`}>
                          <Heart size={18} /> La Promo
                        </button>
                      </div>
                    </div>
                  </div>
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

          {/* Explore Results */}
          {!searchQuery && isExploring && (
            <div className="px-4 sm:px-8 pt-8 pb-8 relative z-10 min-h-[50vh]">
              {isLoadingExplore ? (
                <div className="animate-pulse flex flex-wrap gap-4 overflow-hidden">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(i => <div key={i} className="w-[150px] aspect-[2/3] bg-[#2a2a2a] rounded-md"></div>)}
                </div>
              ) : exploreResults.length > 0 ? (
                <div className="flex flex-wrap gap-4">
                  {exploreResults.map((item, i) => (
                    <MediaCard key={`${item.tmdb_id || item.id}-${i}`} media={item} onClick={setSelectedMedia} />
                  ))}
                </div>
              ) : (
                <div className="text-gray-500 text-center py-20 bg-gray-900/30 rounded-xl mt-8">
                  <Film size={48} className="mx-auto text-gray-700 mb-4" />
                  <p>Aucun titre ne correspond à ces filtres.</p>
                </div>
              )}
            </div>
          )}

          {/* Search Results */}
          {searchQuery && (
            <div className="px-4 sm:px-8 pt-32 sm:pt-36 pb-8 relative z-10">
              <h2 className="text-xl font-bold mb-4 text-[var(--text)]">Résultats pour "{searchQuery}"</h2>
              {isSearching ? (
                <div className="animate-pulse flex gap-4 overflow-hidden">
                  {[1, 2, 3, 4, 5].map(i => <div key={i} className="w-40 h-60 bg-gray-800 rounded-md"></div>)}
                </div>
              ) : filteredSearchResults.length > 0 ? (
                <div className="flex flex-wrap gap-4">
                  {filteredSearchResults.map((item, i) => (
                    <MediaCard key={`${item.tmdb_id}-${i}`} media={item} onClick={setSelectedMedia} />
                  ))}
                </div>
              ) : (
                <div className="text-gray-500">Aucun résultat trouvé.</div>
              )}
            </div>
          )}

          {/* Hero Section */}
          {!searchQuery && !isExploring && heroMedia && (
            <div className="px-4 sm:px-12 pt-24 sm:pt-28 pb-12">
              <div className="relative w-full max-w-7xl mx-auto h-[40vh] sm:h-[55vh] rounded-2xl overflow-hidden shadow-2xl select-none bg-black group">

                {/* Image Layers with cross-fade */}
                {heroCandidates.map((media, idx) => (
                  <div
                    key={`img-${media.tmdb_id || media.id}-${idx}`}
                    className={`absolute inset-0 transition-opacity duration-500 ease-in-out ${idx === heroIndex ? 'opacity-100 z-0' : 'opacity-0 -z-10'}`}
                  >
                    {media.backdrop_url ? (
                      <img src={media.backdrop_url} alt="hero" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-slate-900" />
                    )}
                  </div>
                ))}

                {/* Gradients */}
                <div className="absolute inset-0 bg-gradient-to-r from-[#141414] via-[#141414]/70 to-transparent pointer-events-none z-[1]" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#141414]/50 to-transparent pointer-events-none z-[1]" />

                {/* Content Layers with cross-fade */}
                {heroCandidates.map((media, idx) => {
                  const isHeroInMyList = watchlist.some(m => m.tmdb_id === (media.tmdb_id || media.id?.toString()));
                  return (
                    <div
                      key={`txt-${media.tmdb_id || media.id}-${idx}`}
                      className={`absolute bottom-[10%] left-0 px-8 sm:px-16 w-full max-w-3xl z-10 transition-all duration-1000 ease-in-out transform ${idx === heroIndex ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-4 pointer-events-none'}`}
                    >
                      <div className="text-red-500 font-bold tracking-widest text-xs sm:text-sm mb-2 drop-shadow-md">
                        N°{idx + 1} EN TENDANCE
                      </div>
                      <h1 className="text-3xl sm:text-5xl font-black mb-4 drop-shadow-xl leading-tight">{media.title || media.name}</h1>
                      <p className="text-sm sm:text-base text-[var(--text)] mb-6 line-clamp-3 drop-shadow-md max-w-xl">
                        {media.overview || "Découvrez ce titre qui fait fureur en ce moment."}
                      </p>
                      <div className="flex flex-wrap items-center gap-3">
                        <button
                          onClick={() => setSelectedMedia(media)}
                          className="bg-white text-black px-6 py-2 rounded font-bold flex items-center gap-2 hover:bg-white/80 transition-colors shadow-lg"
                        >
                          <Info size={20} /> Détails
                        </button>
                        <button
                          onClick={() => toggleWatchlist(media, 'personal')}
                          className={`px-6 py-2 rounded font-bold flex items-center gap-2 transition-colors shadow-lg ${isHeroInMyList ? 'bg-white/20 text-[var(--text)] hover:bg-white/30 border border-white/50' : 'bg-gray-500/50 text-[var(--text)] hover:bg-gray-500/70 border border-transparent'}`}
                        >
                          {isHeroInMyList ? <Check size={20} /> : <Plus size={20} />}
                          {isHeroInMyList ? 'Dans ma liste' : 'Ma Liste'}
                        </button>
                      </div>
                    </div>
                  );
                })}

                {/* Navigation Arrows */}
                <button
                  onClick={(e) => { e.stopPropagation(); setHeroIndex(prev => (prev - 1 + heroCandidates.length) % heroCandidates.length) }}
                  className="absolute left-0 top-0 bottom-0 z-[60] bg-gradient-to-r from-black/50 to-transparent w-16 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-start pl-2 hover:from-black/80"
                >
                  <ChevronLeft size={40} className="text-[var(--text)] hover:scale-125 transition-transform" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setHeroIndex(prev => (prev + 1) % heroCandidates.length) }}
                  className="absolute right-0 top-0 bottom-0 z-[60] bg-gradient-to-l from-black/50 to-transparent w-16 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-end pr-2 hover:from-black/80"
                >
                  <ChevronRight size={40} className="text-[var(--text)] hover:scale-125 transition-transform" />
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
          {!searchQuery && !isExploring && (
            <div className="relative z-20 pb-12 -mt-12 sm:-mt-24 pt-8 sm:pt-16">
              {watchlist.length > 0 && <CarouselRow title="Ma Watchlist" items={watchlist} onCardClick={setSelectedMedia} />}
              
              {/* Custom Lists */}
              {customLists.map(list => (
                <CarouselRow 
                  key={list.id} 
                  title={
                    <span className="flex items-center gap-2">
                      {list.name}
                      {list.is_public ? <Globe size={18} className="text-[var(--text-muted)]" /> : <Lock size={18} className="text-gray-500" />}
                    </span>
                  }
                  items={list.media_custom_list_items?.map(i => i.media_items) || []} 
                  onCardClick={setSelectedMedia} 
                  onDelete={() => setListToDelete(list.id)}
                />
              ))}

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
                <h2 className="text-xl font-bold mb-4 text-[var(--text)]">Dernières Critiques de la Promo</h2>
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
              className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center sm:p-8 animate-fade-in sm:backdrop-blur-sm"
              onClick={() => { setSelectedMedia(null); setShowTrailer(false); }}
            >
              <div
                className="bg-[var(--surface-2)] sm:rounded-xl max-w-4xl w-full h-full sm:h-auto sm:max-h-full overflow-y-auto relative shadow-2xl sm:border border-[var(--border)] scrollbar-hide"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => { setSelectedMedia(null); setShowTrailer(false); }}
                  className="fixed sm:absolute top-4 right-4 z-50 bg-[var(--surface-3)] p-2 rounded-full text-[var(--text)] hover:bg-black/80 transition-colors"
                >
                  <X size={24} />
                </button>

                <div className={`relative w-full select-none sm:rounded-t-xl overflow-hidden bg-black transition-all duration-300 ${showTrailer ? 'aspect-video mt-16 sm:mt-20' : 'h-[40vh] sm:h-96'}`}>
                  {showTrailer && selectedMedia.trailer_key ? (
                    <iframe
                      className="w-full h-full"
                      src={`https://www.youtube.com/embed/${selectedMedia.trailer_key}?autoplay=1&rel=0`}
                      referrerPolicy="strict-origin"
                      title="Trailer"
                      frameBorder="0"
                      scrolling="no"
                      allow="accelerometer *; autoplay *; clipboard-write *; encrypted-media *; gyroscope *; picture-in-picture *; web-share *;"
                      allowFullScreen
                    ></iframe>
                  ) : (
                    <>
                      {selectedMedia.backdrop_url ? (
                        <img src={selectedMedia.backdrop_url} alt="backdrop" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-slate-900" />
                      )}
                      <div className="absolute inset-0 bg-black/30 pointer-events-none" />
                      {/* L'ancien bouton trailer absolu a été retiré */}
                    </>
                  )}
                </div>

                <div className={`px-4 sm:px-12 pb-12 relative z-10 flex flex-col md:flex-row gap-8 transition-all duration-500 ${showTrailer ? 'pt-8' : '-mt-16 sm:-mt-24'}`}>
                  <div className="flex-1">
                    {showTrailer && (
                      <button 
                        onClick={() => setShowTrailer(false)} 
                        className="mb-4 flex items-center gap-2 text-sm font-bold text-[var(--text-muted)] hover:text-[var(--text)] transition-colors bg-gray-800/50 hover:bg-gray-800 px-4 py-1.5 rounded-full w-fit"
                      >
                        <ArrowLeft size={16} /> Retour à l'affiche
                      </button>
                    )}
                    <h2 className="text-3xl sm:text-5xl font-black mb-4 leading-tight">{selectedMedia.title || selectedMedia.name}</h2>
                    <div className="flex items-center flex-wrap gap-4 text-sm font-medium text-[var(--text-muted)] mb-4">
                      {selectedMedia.vote_average ? (
                        <span className="text-green-500 font-bold">Recommandé à {(selectedMedia.vote_average * 10).toFixed(0)}%</span>
                      ) : null}
                      <span>{selectedMedia.release_date?.split('-')[0] || selectedMedia.release_year}</span>
                      <span className="uppercase border border-gray-600 px-1.5 py-0.5 rounded text-xs">
                        {(selectedMedia.type || selectedMedia.media_type)?.toLowerCase() === 'tv' ? 'Série' : 'Film'}
                      </span>
                    </div>

                    {selectedMedia.trailer_key && !showTrailer && (
                      <button
                        onClick={() => setShowTrailer(true)}
                        className="flex items-center gap-2 px-4 py-2 rounded-full font-bold transition-colors bg-white/10 text-[var(--text)] hover:bg-white/20 hover:scale-105 border border-white/20 w-fit mb-6 shadow-lg"
                      >
                        <Play size={16} fill="currentColor" className="text-red-500" />
                        Bande-annonce
                      </button>
                    )}
                    <p className="text-[var(--text)] text-base sm:text-lg leading-relaxed mb-6">
                      {selectedMedia.overview || "Aucune description disponible pour ce titre."}
                    </p>

                    {/* Seasons & Episodes Selector */}
                    {((selectedMedia.type || selectedMedia.media_type) === 'tv') && selectedMedia.seasons && selectedMedia.seasons.length > 0 && (
                      <div id="episodes-section" className="mb-8 bg-[var(--surface-2)] rounded-xl p-4 sm:p-6 border border-[var(--border)]">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-xl font-bold text-[var(--text)]">Épisodes</h3>
                          <select 
                            value={selectedSeason} 
                            onChange={(e) => setSelectedSeason(Number(e.target.value))}
                            className="bg-[var(--surface-3)] text-[var(--text)] border border-gray-700 rounded px-3 py-1.5 font-bold outline-none focus:border-red-500 text-sm"
                          >
                            {selectedMedia.seasons.filter(s => s.season_number > 0).map(s => (
                              <option key={s.season_number} value={s.season_number}>{s.name} ({s.episode_count} épisodes)</option>
                            ))}
                          </select>
                        </div>

                        {isLoadingEpisodes ? (
                          <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500"></div></div>
                        ) : (
                          <div className="flex flex-col gap-3 max-h-[40vh] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
                            {seasonEpisodes.map(ep => (
                              <div key={ep.id} className="flex flex-col sm:flex-row gap-4 bg-[var(--surface-3)]/50 border border-[var(--border)]/50 rounded-xl p-3 hover:bg-[var(--surface-3)] transition-colors group relative">
                                <div className="w-full sm:w-36 shrink-0 relative aspect-video bg-gray-900 rounded overflow-hidden">
                                  {ep.still_path ? (
                                    <img src={`https://image.tmdb.org/t/p/w300${ep.still_path}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-600"><Film size={20} /></div>
                                  )}
                                  <div className="absolute bottom-1 left-1 bg-black/80 px-1.5 rounded text-[10px] font-bold text-[var(--text)]">
                                    {ep.episode_number}
                                  </div>
                                </div>
                                <div className="flex-1 flex flex-col justify-center min-w-0">
                                  <div className="flex justify-between items-start mb-1">
                                    <h4 className="font-bold text-[var(--text)] text-sm leading-tight pr-2">Épisode {ep.episode_number} - <span className="text-[var(--text)]">{ep.name}</span></h4>
                                    {ep.vote_average > 0 && <span className="text-yellow-500 text-xs font-bold shrink-0 flex items-center gap-1"><Star size={10} fill="currentColor" /> {ep.vote_average.toFixed(1)}</span>}
                                  </div>
                                  <p className="text-[var(--text-muted)] text-xs line-clamp-2 mb-2 flex-1">{ep.overview || "Aucun résumé."}</p>
                                  <button 
                                    onClick={() => {
                                      setSeasonNum(selectedSeason)
                                      setEpisodeNum(ep.episode_number)
                                      setTimeout(() => {
                                        document.querySelector('.review-form-anchor')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                                      }, 100)
                                    }}
                                    className="text-[10px] font-bold text-[var(--text-muted)] hover:text-[var(--text)] flex items-center gap-1 w-fit bg-white/5 hover:bg-[var(--surface-3)] px-2.5 py-1 rounded-full transition-colors"
                                  >
                                    <Star size={10} /> Critiquer
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {selectedMedia.watch_providers && selectedMedia.watch_providers.length > 0 && (
                      <div className="mb-8 flex items-center gap-3">
                        <span className="text-sm font-medium text-[var(--text-muted)]">Disponible sur :</span>
                        <div className="flex flex-wrap gap-2">
                          {selectedMedia.watch_providers.slice(0, 4).map(provider => (
                            <img key={provider.provider_id} src={`https://image.tmdb.org/t/p/w45${provider.logo_path}`} alt={provider.provider_name} title={provider.provider_name} className="w-8 h-8 rounded shadow-md" />
                          ))}
                        </div>
                        {selectedMedia.watch_link && (
                          <a href={selectedMedia.watch_link} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:text-blue-300 underline ml-2 whitespace-nowrap">
                            Voir tout
                          </a>
                        )}
                      </div>
                    )}

                    <div className="flex flex-wrap gap-3 mb-8 border-b border-[var(--border)] pb-8">

                      {(() => {
                        const isWatched = watchedList.some(m => m.tmdb_id === (selectedMedia.tmdb_id || selectedMedia.id?.toString()));
                        return (
                          <button
                            onClick={() => toggleWatched(selectedMedia)}
                            className={`flex items-center gap-2 px-6 py-2.5 rounded font-bold transition-colors ${isWatched ? 'bg-green-600 text-[var(--text)] hover:bg-green-700' : 'bg-gray-700 text-[var(--text)] hover:bg-gray-600'}`}
                          >
                            <Eye size={20} />
                            {isWatched ? 'Vu' : 'Marquer comme vu'}
                          </button>
                        )
                      })()}

                      {(() => {
                        const isMyList = watchlist.some(m => m.tmdb_id === (selectedMedia.tmdb_id || selectedMedia.id?.toString()));
                        return (
                          <div className="relative">
                            <button
                              onClick={() => {
                                const menu = document.getElementById('list-menu-' + (selectedMedia.tmdb_id || selectedMedia.id));
                                if (menu) menu.classList.toggle('hidden');
                              }}
                              className={`flex items-center gap-2 px-6 py-2.5 rounded font-bold transition-colors ${isMyList ? 'bg-white/20 text-[var(--text)] hover:bg-white/30 border border-white/50' : 'bg-white text-black hover:bg-gray-200'}`}
                            >
                              {isMyList ? <Check size={20} /> : <Plus size={20} />}
                              <span className="hidden sm:inline">Ajouter à...</span>
                            </button>
                            <div id={'list-menu-' + (selectedMedia.tmdb_id || selectedMedia.id)} className="hidden absolute top-full left-0 mt-2 w-48 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg shadow-xl z-[100] py-2">
                              <button
                                onClick={() => {
                                  toggleWatchlist(selectedMedia, 'personal');
                                  document.getElementById('list-menu-' + (selectedMedia.tmdb_id || selectedMedia.id))?.classList.add('hidden');
                                }}
                                className="w-full text-left px-4 py-2 text-sm text-[var(--text)] hover:bg-gray-800 flex items-center justify-between"
                              >
                                Ma Watchlist
                                {isMyList && <Check size={14} className="text-red-500" />}
                              </button>
                              {customLists.map(list => {
                                const inList = list.media_custom_list_items?.some(i => i.media_items.tmdb_id === (selectedMedia.tmdb_id || selectedMedia.id?.toString()));
                                return (
                                  <button
                                    key={list.id}
                                    onClick={() => toggleMediaInList(list.id, selectedMedia)}
                                    className="w-full text-left px-4 py-2 text-sm text-[var(--text)] hover:bg-gray-800 hover:text-[var(--text)] flex items-center justify-between"
                                  >
                                    <span className="truncate">{list.name}</span>
                                    {inList && <Check size={14} className="text-red-500 flex-shrink-0" />}
                                  </button>
                                );
                              })}
                              <button 
                                onClick={() => {
                                  setListMediaContext(selectedMedia);
                                  setShowCreateListModal(true);
                                  document.getElementById('list-menu-' + (selectedMedia.tmdb_id || selectedMedia.id))?.classList.add('hidden');
                                }} 
                                className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-gray-800 flex items-center gap-2 border-t border-[var(--border)] mt-1 pt-2"
                              >
                                <Plus size={14} /> Nouvelle liste
                              </button>
                            </div>
                          </div>
                        )
                      })()}

                      {(() => {
                        const isClassList = classWatchlist.some(m => m.tmdb_id === (selectedMedia.tmdb_id || selectedMedia.id?.toString()));
                        return (
                          <button
                            onClick={() => toggleWatchlist(selectedMedia, 'class')}
                            className={`flex items-center gap-2 px-6 py-2.5 rounded font-bold transition-colors ${isClassList ? 'bg-green-600/80 text-[var(--text)] hover:bg-green-600' : 'bg-gray-700 text-[var(--text)] hover:bg-gray-600'}`}
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
                        className="flex items-center gap-2 px-4 py-2.5 rounded font-bold transition-colors bg-indigo-600 text-[var(--text)] hover:bg-indigo-700"
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
                        className="flex items-center gap-2 px-4 py-2.5 rounded font-bold transition-colors bg-[var(--surface-3)] text-[var(--text)] hover:bg-[#333] border border-[#333]"
                      >
                        <Share2 size={20} />
                        Partager (Lien)
                      </button>
                    </div>

                    {/* Review section */}
                    <div>
                      <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-[var(--text)]"><MessageSquare size={20} /> Laisser une critique</h3>
                      <div className="bg-[var(--surface-3)] rounded-lg p-5 border border-[#333]">
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
                              <label className="text-xs text-[var(--text-muted)] mb-1 block">Saison (opt.)</label>
                              <input type="number" min="1" value={seasonNum} onChange={e => setSeasonNum(e.target.value)} placeholder="Ex: 1" className="w-full bg-[var(--surface-2)] border border-gray-700 rounded-md p-2 text-[var(--text)] outline-none focus:border-gray-500 text-sm" />
                            </div>
                            <div className="flex-1">
                              <label className="text-xs text-[var(--text-muted)] mb-1 block">Épisode (opt.)</label>
                              <input type="number" min="1" value={episodeNum} onChange={e => setEpisodeNum(e.target.value)} placeholder="Ex: 3" className="w-full bg-[var(--surface-2)] border border-gray-700 rounded-md p-2 text-[var(--text)] outline-none focus:border-gray-500 text-sm" />
                            </div>
                          </div>
                        )}
                        <textarea
                          placeholder="Qu'as-tu pensé de ce titre ?"
                          value={reviewText}
                          onChange={e => setReviewText(e.target.value)}
                          className="w-full bg-[var(--surface-2)] border border-gray-700 rounded-md p-3 text-[var(--text)] mb-4 min-h-[100px] outline-none focus:border-gray-500 transition-colors text-sm"
                        />
                        {reviewError && <p className="text-red-500 text-sm mb-3">{reviewError}</p>}
                        <button
                          onClick={submitReview}
                          disabled={isSubmitting || !rating}
                          className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-[var(--text)] px-6 py-2 rounded font-bold w-full sm:w-auto transition-colors"
                        >
                          {isSubmitting ? 'Publication...' : 'Publier'}
                        </button>
                      </div>
                    </div>

                    {/* Section Critiques existantes du film */}
                    <div className="mt-8">
                      <h3 className="text-xl font-bold mb-4 text-[var(--text)] border-t border-[var(--border)] pt-8">Avis de la Promo</h3>
                      {isLoadingMediaReviews ? (
                        <div className="animate-pulse space-y-4">
                          <div className="h-24 bg-[var(--surface-3)] rounded-lg"></div>
                          <div className="h-24 bg-[var(--surface-3)] rounded-lg"></div>
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
                      <img src={selectedMedia.poster_url} className="w-full rounded-md shadow-2xl border border-[var(--border)]" alt="poster" />
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
            <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[200] bg-gray-800 text-[var(--text)] px-6 py-3 rounded-full shadow-lg border border-gray-700 animate-fade-in flex items-center gap-2">
              <Check size={18} className="text-green-400" />
              {toast}
            </div>
          )}

          {/* Dashboard Modal */}
          {showDashboard && promoStats && (
            <div className="fixed inset-0 bg-[var(--bg)] z-[100] flex items-center justify-center p-4 animate-fade-in">
              <div className="bg-[var(--surface-2)] border border-[var(--border)] rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto p-6 relative">
                <button onClick={() => setShowDashboard(false)} className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-[var(--text)] bg-[var(--surface-3)] p-2 rounded-full z-10">
                  <X size={20} />
                </button>
                <h2 className="text-2xl font-black text-[var(--text)] mb-6 flex items-center gap-2"><TrendingUp className="text-red-600" /> Statistiques de la Promo</h2>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {promoStats.most_reviewed_movie && (
                    <div className="bg-[var(--surface-3)] rounded-xl p-4 flex gap-4 items-center relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-2 text-4xl opacity-10">🎬</div>
                      <img src={promoStats.most_reviewed_movie.poster_url} className="w-20 h-30 object-cover rounded-lg shadow-lg relative z-10" />
                      <div className="relative z-10">
                        <div className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Film le plus débattu</div>
                        <h3 className="text-lg font-bold text-[var(--text)] leading-tight">{promoStats.most_reviewed_movie.title}</h3>
                        <div className="text-red-500 font-bold mt-2 text-sm">{promoStats.most_reviewed_movie.count} critiques publiées</div>
                      </div>
                    </div>
                  )}

                  {promoStats.best_series && (
                    <div className="bg-[var(--surface-3)] rounded-xl p-4 flex gap-4 items-center relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-2 text-4xl opacity-10"><Tv size={48} /></div>
                      <img src={promoStats.best_series.poster_url} className="w-20 h-30 object-cover rounded-lg shadow-lg relative z-10" />
                      <div className="relative z-10">
                        <div className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Série la mieux notée</div>
                        <h3 className="text-lg font-bold text-[var(--text)] leading-tight">{promoStats.best_series.title}</h3>
                        <div className="text-yellow-500 font-bold mt-2 text-sm flex items-center gap-1"><Star size={14} fill="currentColor" /> {promoStats.best_series.avg.toFixed(1)} / 5 (moyenne)</div>
                      </div>
                    </div>
                  )}

                  {promoStats.most_liked_review && (
                    <div className="bg-[var(--surface-3)] rounded-xl p-5 col-span-1 sm:col-span-2 border border-yellow-600/30">
                      <div className="text-xs font-bold text-yellow-500 uppercase tracking-wider mb-4 flex items-center gap-2"><Heart size={14} /> La critique la plus likée</div>
                      <div className="flex gap-4 items-start sm:items-center flex-col sm:flex-row">
                        <img src={promoStats.most_liked_review.media_items.poster_url} className="w-20 h-30 object-cover rounded shadow" />
                        <div className="flex-1 w-full">

                          <div className="flex justify-between items-center mb-2">
                            <span className="font-bold text-[var(--text)] text-lg">{promoStats.most_liked_review.media_items.title}</span>
                            <span className="text-yellow-500 font-bold bg-yellow-500/10 px-2 py-1 rounded flex items-center gap-1"><Star size={14} fill="currentColor" /> {promoStats.most_liked_review.rating}/5</span>
                          </div>
                          <p className="text-sm text-gray-200 italic bg-[var(--surface-2)] p-3 rounded-lg border-l-2 border-yellow-500">"{promoStats.most_liked_review.review_text}"</p>
                          <div className="flex items-center gap-2 mt-4 text-xs text-[var(--text-muted)]">
                            <img src={promoStats.most_liked_review.users.avatar_url} className="w-6 h-6 rounded-full" />
                            <span className="font-bold text-[var(--text)]">{promoStats.most_liked_review.users.name}</span>
                            <span className="ml-auto flex items-center gap-1 text-red-500 bg-red-500/10 px-2 py-1 rounded-full"><ThumbsUp size={12} /> {promoStats.most_liked_review.likesCount} upvotes</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Create List Modal */}
          {showCreateListModal && (
            <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 animate-fade-in">
              <div className="bg-[var(--surface-2)] border border-[var(--border)] rounded-xl p-6 w-full max-w-sm shadow-2xl relative">
                <button onClick={() => setShowCreateListModal(false)} className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-[var(--text)]">
                  <X size={20} />
                </button>
                <h3 className="text-lg font-bold text-[var(--text)] mb-6 flex items-center gap-2"><ListPlus size={20} className="text-red-600" /> Nouvelle liste</h3>
                <input 
                  type="text" 
                  placeholder="Ex: Mes films d'horreur..." 
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  className="w-full bg-[var(--surface-3)] text-[var(--text)] p-3 rounded-lg border border-gray-700 focus:border-red-500 focus:outline-none mb-4"
                  autoFocus
                />
                <label className="flex items-center gap-3 text-sm text-[var(--text)] mb-8 cursor-pointer hover:text-[var(--text)]">
                  <input type="checkbox" checked={newListPublic} onChange={(e) => setNewListPublic(e.target.checked)} className="accent-red-600 w-4 h-4 rounded bg-[var(--surface-3)]" />
                  Liste publique (visible par la promo)
                </label>
                <div className="flex gap-3 justify-end">
                  <button onClick={() => setShowCreateListModal(false)} className="px-5 py-2.5 text-sm font-bold text-[var(--text-muted)] hover:text-[var(--text)] transition-colors">Annuler</button>
                  <button onClick={createCustomList} className="px-5 py-2.5 text-sm font-bold bg-red-600 hover:bg-red-700 text-[var(--text)] rounded-lg transition-colors">Créer la liste</button>
                </div>
              </div>
            </div>
          )}

          {/* Delete List Confirmation Modal */}
          {listToDelete && (
            <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 animate-fade-in">
              <div className="bg-[var(--surface-2)] border border-[var(--border)] rounded-xl p-6 w-full max-w-sm shadow-2xl relative text-center">
                <div className="mx-auto w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center mb-4">
                  <AlertTriangle className="text-red-500" size={24} />
                </div>
                <h3 className="text-xl font-bold text-[var(--text)] mb-2">Supprimer la liste ?</h3>
                <p className="text-[var(--text-muted)] text-sm mb-6">Cette action est irréversible. La liste sera définitivement effacée pour toi et la promo.</p>
                <div className="flex gap-3 justify-center">
                  <button onClick={() => setListToDelete(null)} className="px-5 py-2.5 text-sm font-bold text-[var(--text-muted)] hover:text-[var(--text)] transition-colors">Annuler</button>
                  <button onClick={confirmDeleteList} className="px-5 py-2.5 text-sm font-bold bg-red-600 hover:bg-red-700 text-[var(--text)] rounded-lg transition-colors">Oui, supprimer</button>
                </div>
              </div>
            </div>
          )}

        </div>
      </MediaActionsContext.Provider>
    </PromoRatingsContext.Provider>
  )
}
