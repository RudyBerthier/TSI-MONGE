import { useState, useEffect, useRef, useCallback } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Search, Loader, X, Clock, MessageCircle, Bookmark, Hash } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { UserAvatar } from '../../components/UserAvatar'
import { ImageCarousel } from '../../components/ImageCarousel'
import { ContentRenderer } from '../../components/ContentRenderer'

const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:3001' : '')
const SEARCH_HISTORY_KEY = 'explore_search_history'
const MAX_HISTORY = 15

export function Explore() {
    const { isAuthenticated } = useAuth()
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    const query = searchParams.get('q')
    const [posts, setPosts] = useState([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [searchResults, setSearchResults] = useState([])
    const [isSearching, setIsSearching] = useState(false)
    const [searchFocused, setSearchFocused] = useState(false)
    const [recentSearches, setRecentSearches] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem(SEARCH_HISTORY_KEY) || '[]')
        } catch { return [] }
    })
    const inputRef = useRef(null)
    const searchContainerRef = useRef(null)

    // Post Modal State
    const [activeCommentPost, setActiveCommentPost] = useState(null)
    const [comments, setComments] = useState([])
    const [newComment, setNewComment] = useState('')
    const [commentsLoading, setCommentsLoading] = useState(false)

    // Saved Posts
    const [savedPostIds, setSavedPostIds] = useState(new Set())

    // Save a user to recent searches
    const addToHistory = useCallback((user) => {
        setRecentSearches(prev => {
            const filtered = prev.filter(u => u.id !== user.id)
            const updated = [{ id: user.id, username: user.username, avatar: user.avatar }, ...filtered].slice(0, MAX_HISTORY)
            localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(updated))
            return updated
        })
    }, [])

    const removeFromHistory = useCallback((userId) => {
        setRecentSearches(prev => {
            const updated = prev.filter(u => u.id !== userId)
            localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(updated))
            return updated
        })
    }, [])

    const clearAllHistory = useCallback(() => {
        setRecentSearches([])
        localStorage.removeItem(SEARCH_HISTORY_KEY)
    }, [])

    const openComments = async (post) => {
        setActiveCommentPost(post)
        setComments([])
        setCommentsLoading(true)
        try {
            const res = await fetch(`/api/users/posts/${post.id}/comments`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            })
            if (res.ok) {
                const data = await res.json()
                setComments(data)
            }
        } catch (err) {
            console.error("Fetch comments failed", err)
        } finally {
            setCommentsLoading(false)
        }
    }

    const submitComment = async (e) => {
        e.preventDefault()
        if (!newComment.trim() || !activeCommentPost) return
        try {
            const res = await fetch(`/api/users/posts/${activeCommentPost.id}/comments`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ content: newComment })
            })
            if (res.ok) {
                const comment = await res.json()
                const author = comment.users || user
                setComments(prev => [...prev, { ...comment, author }])
                setNewComment('')
            }
        } catch (err) {
            console.error("Submit comment failed", err)
        }
    }

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
                setSearchFocused(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const handleSearchResultClick = (user) => {
        addToHistory(user)
        setSearchQuery('')
        setSearchFocused(false)
        navigate(`/social/user/${user.username}`)
    }

    const handleHistoryClick = (user) => {
        addToHistory(user)
        setSearchFocused(false)
        navigate(`/social/user/${user.username}`)
    }

    useEffect(() => {
        fetchExplore(query)
        fetchSavedPostIds()
    }, [query])

    const fetchSavedPostIds = async () => {
        try {
            const res = await fetch('/api/users/saved-posts', {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            })
            if (res.ok) {
                const data = await res.json()
                setSavedPostIds(new Set(data.map(p => p.id)))
            }
        } catch (err) { }
    }

    const handleSavePost = async (postId, e) => {
        if (e) e.stopPropagation();
        try {
            const res = await fetch(`/api/users/posts/${postId}/save`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            })
            if (res.ok) {
                const { saved } = await res.json()
                setSavedPostIds(prev => {
                    const next = new Set(prev)
                    if (saved) next.add(postId)
                    else next.delete(postId)
                    return next
                })
            }
        } catch (err) { console.error('Save error', err) }
    }

    const fetchExplore = async (q = null) => {
        try {
            setLoading(true)
            const url = q ? `/api/users/explore?q=${encodeURIComponent(q)}` : '/api/users/explore'
            const res = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            })
            if (res.ok) {
                const data = await res.json()
                setPosts(data)
            }
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        const fetchSearchResults = async () => {
            if (!searchQuery.trim()) {
                setSearchResults([])
                setIsSearching(false)
                return
            }

            setIsSearching(true)
            try {
                const res = await fetch(`/api/users/search?q=${encodeURIComponent(searchQuery)}`, {
                    headers: {
                        ...(isAuthenticated ? { 'Authorization': `Bearer ${localStorage.getItem('token')}` } : {})
                    }
                })
                if (res.ok) {
                    const data = await res.json()
                    setSearchResults(data)
                }
            } catch (err) {
                console.error("Erreur recherche:", err)
            } finally {
                setIsSearching(false)
            }
        }

        const timer = setTimeout(() => {
            fetchSearchResults()
        }, 300)

        return () => clearTimeout(timer)
    }, [searchQuery, isAuthenticated])

    const showHistory = searchFocused && !searchQuery.trim() && recentSearches.length > 0

    return (
        <div className="flex flex-col max-w-4xl mx-auto w-full pb-20 md:pb-8 pt-4 px-4 h-full">

            {/* Search Bar */}
            <div ref={searchContainerRef} className="relative mb-6 mt-2 sticky top-[calc(3.5rem+env(safe-area-inset-top))] z-10 bg-gray-50 dark:bg-black pt-2 pb-2">
                <div className="absolute left-0 top-1/2 -translate-y-1/2 pl-3 flex items-center pointer-events-none">
                    <Search className="text-gray-400" size={20} />
                </div>
                <input
                    ref={inputRef}
                    type="text"
                    placeholder="Rechercher des élèves..."
                    className="w-full bg-gray-200 dark:bg-white/10 text-gray-900 dark:text-white rounded-xl py-3 pl-10 pr-10 focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-white/20 transition-all font-medium placeholder-gray-500"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => setSearchFocused(true)}
                />
                {searchQuery && (
                    <button
                        onClick={() => { setSearchQuery(''); inputRef.current?.focus() }}
                        className="absolute right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-white"
                        style={{ top: '8px', height: '36px' }}
                    >
                        <X size={20} />
                    </button>
                )}

                {/* ═══ Recent Searches Dropdown ═══ */}
                {showHistory && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-gray-200 dark:border-white/10 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="flex items-center justify-between px-4 py-3">
                            <span className="font-bold text-[15px] text-gray-900 dark:text-white">Récents</span>
                            <button
                                onClick={clearAllHistory}
                                className="text-sm font-semibold text-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                            >
                                Tout effacer
                            </button>
                        </div>
                        <div className="max-h-[360px] overflow-y-auto">
                            {recentSearches.map(u => (
                                <div key={u.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group cursor-pointer"
                                    onClick={() => handleHistoryClick(u)}
                                >
                                    <div className="w-11 h-11 rounded-full border border-gray-200 dark:border-white/10 overflow-hidden shrink-0">
                                        <UserAvatar user={u} size={44} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <span className="text-[15px] font-semibold text-gray-900 dark:text-white truncate block">{u.username}</span>
                                    </div>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); removeFromHistory(u.id) }}
                                        className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-600 dark:hover:text-white transition-all p-1"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Hashtag Header */}
            {query && query.startsWith('#') && !searchQuery.trim() && (
                <div className="flex items-center gap-3 mb-6 pb-5 border-b border-gray-200 dark:border-white/10">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shrink-0">
                        <Hash size={28} className="text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{query}</h1>
                        {!loading && (
                            <p className="text-sm text-gray-500 mt-0.5">{posts.length} publication{posts.length !== 1 ? 's' : ''}</p>
                        )}
                    </div>
                </div>
            )}

            {/* Search Results Display */}
            {searchQuery.trim() ? (
                <div className="flex flex-col gap-2">
                    {isSearching && searchResults.length === 0 ? (
                        <div className="flex flex-col gap-3 p-4">
                            {[...Array(3)].map((_, i) => (
                                <div key={i} className="flex items-center gap-3 animate-pulse">
                                    <div className="w-11 h-11 rounded-full bg-gray-200 dark:bg-slate-800 shrink-0"></div>
                                    <div className="flex-1">
                                        <div className="h-4 bg-gray-200 dark:bg-slate-800 rounded w-1/3 mb-2"></div>
                                        <div className="h-3 bg-gray-200 dark:bg-slate-800 rounded w-1/4"></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : searchResults.length === 0 && !isSearching ? (
                        <div className="text-center p-8 text-gray-500">
                            Aucun résultat pour "{searchQuery}"
                        </div>
                    ) : (
                        searchResults.map(user => (
                            <button
                                key={user.id}
                                onClick={() => handleSearchResultClick(user)}
                                className="flex items-center gap-4 p-3 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 transition border-b border-transparent md:border-gray-100 md:dark:border-white/5 active:bg-gray-200 w-full text-left"
                            >
                                <div className="w-12 h-12 rounded-full border border-gray-200 dark:border-white/10 overflow-hidden shrink-0">
                                    <UserAvatar user={user} size={48} />
                                </div>
                                <div className="flex flex-col flex-1 overflow-hidden">
                                    <span className="text-[15px] font-bold text-gray-900 dark:text-white truncate">
                                        {user.username}
                                    </span>
                                </div>
                            </button>
                        ))
                    )}
                </div>
            ) : loading ? (
                <div className="grid grid-cols-3 gap-1 md:gap-4 md:auto-rows-[300px] auto-rows-[120px] animate-pulse">
                    {[...Array(9)].map((_, i) => (
                        <div key={i} className={`bg-gray-200 dark:bg-slate-800 ${i % 7 === 0 ? 'col-span-2 row-span-2' : ''} md:rounded-xl`}></div>
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-3 gap-1 md:gap-4 md:auto-rows-[300px] auto-rows-[120px]">
                    {posts.map((post, i) => {
                        // Instagram style: sometimes make a post span 2 rows/cols
                        const isLarge = i % 7 === 0;

                        return (
                            <button
                                onClick={() => openComments(post)}
                                key={post.id}
                                className={`relative group overflow-hidden bg-gray-200 dark:bg-neutral-800 cursor-pointer ${isLarge ? 'col-span-2 row-span-2' : ''} md:rounded-xl`}
                            >
                                {post.video_url ? (
                                    <video src={`${API_URL}${post.video_url}`} className="w-full h-full object-cover" />
                                ) : post.image_url ? (
                                    <img src={`${API_URL}${post.image_url.split(',')[0]}`} alt="Post" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center p-3">
                                        <p className="text-xs text-gray-700 dark:text-gray-300 font-medium text-center line-clamp-4 break-words">{post.content}</p>
                                    </div>
                                )}

                                {/* Hover overlay */}
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 text-white">
                                    <div className="flex flex-col items-center">
                                        <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200 mb-2 border-2 border-white">
                                            {post.author?.avatar ? (
                                                <img src={`${API_URL}${post.author.avatar}`} alt="Avatar" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center font-bold text-xs">
                                                    {post.author?.username?.[0]?.toUpperCase()}
                                                </div>
                                            )}
                                        </div>
                                        <span className="font-bold text-sm drop-shadow-md">{post.author?.username}</span>
                                    </div>
                                </div>
                            </button>
                        )
                    })}
                </div>
            )}

            {/* ════════ POST / COMMENTS MODAL ════════ */}
            {activeCommentPost && (
                <div className="fixed inset-0 z-[200] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setActiveCommentPost(null)}>
                    <div className="bg-white dark:bg-slate-900 rounded-xl overflow-hidden flex flex-col md:flex-row w-full max-w-5xl max-h-[90vh] shadow-2xl relative" onClick={e => e.stopPropagation()}>
                        <button onClick={() => setActiveCommentPost(null)} className="absolute top-4 right-4 z-[210] p-2 bg-black/50 hover:bg-black/70 text-white rounded-full transition md:hidden">
                            <X size={20} />
                        </button>

                        {/* Media Section */}
                        <div className="w-full md:w-[60%] bg-black flex items-center justify-center min-h-[300px] md:min-h-[500px]">
                            {activeCommentPost.video_url ? (
                                <video src={`${API_URL}${activeCommentPost.video_url}`} controls className="w-full h-full max-h-[90vh] object-contain" />
                            ) : activeCommentPost.image_url ? (
                                <ImageCarousel mediaUrls={activeCommentPost.image_url} className="max-h-[90vh]" />
                            ) : (
                                <div className="w-full h-full min-h-[300px] p-8 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-center text-white text-xl md:text-3xl font-bold">
                                    <p className="max-w-md">{activeCommentPost.content && <ContentRenderer content={activeCommentPost.content} />}</p>
                                </div>
                            )}
                        </div>

                        {/* Info Section */}
                        <div className="w-full md:w-[40%] flex flex-col border-l border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 max-h-[50vh] md:max-h-[90vh] overflow-hidden">
                            {/* Header */}
                            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-800 shrink-0">
                                <Link to={`/social/user/${activeCommentPost.author?.username}`} className="flex items-center gap-3 group" onClick={() => setActiveCommentPost(null)}>
                                    <div className="w-10 h-10 shrink-0 border border-gray-100 dark:border-white/10 rounded-full overflow-hidden">
                                        <UserAvatar user={activeCommentPost.author} size={40} />
                                    </div>
                                    <span className="font-bold text-gray-900 dark:text-gray-100 group-hover:text-blue-500 transition-colors">{activeCommentPost.author?.username}</span>
                                </Link>
                                <div className="flex items-center gap-2">
                                    <button onClick={(e) => handleSavePost(activeCommentPost.id, e)} className="p-2 text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors" title="Sauvegarder">
                                        <Bookmark size={18} className={savedPostIds.has(activeCommentPost.id) ? "fill-current" : ""} />
                                    </button>
                                    <button onClick={() => setActiveCommentPost(null)} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors hidden md:block">
                                        <X size={24} />
                                    </button>
                                </div>
                            </div>

                            {/* Comments/Description area */}
                            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                                {/* Description as first "comment" */}
                                {((activeCommentPost.image_url || activeCommentPost.video_url) ? activeCommentPost.content : false) && (
                                    <div className="flex gap-3 mb-6">
                                        <Link to={`/social/user/${activeCommentPost.author?.username}`} onClick={() => setActiveCommentPost(null)} className="w-8 h-8 shrink-0 mt-1 border border-gray-100 dark:border-white/10 rounded-full overflow-hidden block">
                                            <UserAvatar user={activeCommentPost.author} size={32} />
                                        </Link>
                                        <div className="flex-1 text-sm text-gray-800 dark:text-gray-200">
                                            <Link to={`/social/user/${activeCommentPost.author?.username}`} onClick={() => setActiveCommentPost(null)} className="font-bold mr-2 hover:underline">{activeCommentPost.author?.username}</Link>
                                            <span className="whitespace-pre-wrap leading-relaxed">{activeCommentPost.content && <ContentRenderer content={activeCommentPost.content} />}</span>
                                            <div className="flex items-center gap-4 mt-1 text-[11px] text-gray-500">
                                                <span>{new Date(activeCommentPost.created_at).toLocaleDateString('fr-FR')}</span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Real Comments List */}
                                {commentsLoading ? (
                                    <div className="flex justify-center py-8">
                                        <Loader className="animate-spin text-gray-400" size={24} />
                                    </div>
                                ) : comments.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-12 text-center h-full opacity-50">
                                        <MessageCircle size={32} className="mb-3 text-gray-400" />
                                        <span className="text-lg font-bold text-gray-900 dark:text-white mb-2">Aucun commentaire</span>
                                        <span className="text-sm text-gray-500">Soyez le premier à commenter.</span>
                                    </div>
                                ) : (
                                    comments.map(comment => {
                                        const authorUser = comment.users || comment.author
                                        return (
                                            <div key={comment.id} className="flex gap-3 mb-4 group">
                                                <Link to={`/social/user/${authorUser?.username}`} onClick={() => setActiveCommentPost(null)} className="w-8 h-8 shrink-0 mt-1 border border-gray-100 dark:border-white/10 rounded-full overflow-hidden block">
                                                    <UserAvatar user={authorUser} size={32} />
                                                </Link>
                                                <div className="flex-1 text-sm text-gray-800 dark:text-gray-200 border-b border-gray-100/50 dark:border-white/5 pb-3">
                                                    <Link to={`/social/user/${authorUser?.username}`} onClick={() => setActiveCommentPost(null)} className="font-bold mr-2 hover:underline">{authorUser?.username}</Link>
                                                    <span className="whitespace-pre-wrap leading-relaxed break-words">{comment.content && <ContentRenderer content={comment.content} />}</span>
                                                    <div className="flex items-center gap-4 mt-1 text-[11px] text-gray-500 font-medium">
                                                        <span>{(() => {
                                                            const mins = Math.floor((Date.now() - new Date(comment.created_at)) / 60000)
                                                            if (mins < 60) return `${mins} min`
                                                            if (mins < 1440) return `${Math.floor(mins / 60)} h`
                                                            return `${Math.floor(mins / 1440)} j`
                                                        })()}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })
                                )}
                            </div>

                            {/* Comment Input */}
                            <div className="p-4 border-t border-gray-200 dark:border-slate-800 shrink-0 bg-white dark:bg-slate-900 flex flex-col">
                                <form onSubmit={submitComment} className="flex items-center gap-3 bg-gray-100 dark:bg-zinc-800 rounded-full px-4 py-2 mt-2">
                                    <input
                                        type="text"
                                        placeholder="Ajouter un commentaire..."
                                        value={newComment}
                                        onChange={(e) => setNewComment(e.target.value)}
                                        className="flex-1 bg-transparent text-sm focus:outline-none focus:ring-0 text-gray-900 dark:text-gray-100 placeholder-gray-500 px-0"
                                    />
                                    <button
                                        type="submit"
                                        disabled={!newComment.trim()}
                                        className="text-blue-500 font-bold text-sm disabled:opacity-50 disabled:hover:text-blue-500 hover:text-blue-600 transition-colors"
                                    >
                                        Publier
                                    </button>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
