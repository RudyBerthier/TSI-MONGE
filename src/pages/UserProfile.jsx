import { useState, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { UserAvatar } from '../components/UserAvatar'
import {
    Users, MapPin, Search, Edit3, Send,
    ThumbsUp, UserPlus, UserMinus, Image as ImageIcon,
    ExternalLink, Link as LinkIcon, Instagram,
    Twitter, Github, Linkedin, Loader, Calendar,
    Briefcase, Heart, X, MoreHorizontal, User, Grid, Trash2, Bookmark, Archive, Play, ChevronLeft, ChevronRight, MessageCircle, AlertCircle, Camera, Music
} from 'lucide-react'
import { CreatePostModal } from '../components/CreatePostModal'
import { VerifiedBadge } from '../components/VerifiedBadge'
import { ImageCarousel } from '../components/ImageCarousel'
import { ContentRenderer } from '../components/ContentRenderer'
const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:3001' : '')

export function UserProfile() {
    const { identifier } = useParams()
    const { user } = useAuth()
    const [profileUser, setProfileUser] = useState(null)
    const [posts, setPosts] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [isFollowing, setIsFollowing] = useState(false)
    const [isMutualFriend, setIsMutualFriend] = useState(false)
    const [followLoading, setFollowLoading] = useState(false)
    const [showCreatePost, setShowCreatePost] = useState(false)
    const [highlights, setHighlights] = useState([]) // New state for Highlights
    const [userTags, setUserTags] = useState({}) // New state for Carpool Tags

    // Saved & Tabs
    const [activeTab, setActiveTab] = useState('posts')
    const [savedPosts, setSavedPosts] = useState([])
    const [savedPostIds, setSavedPostIds] = useState(new Set())
    const [archivedPosts, setArchivedPosts] = useState([])

    // Modale state
    const [selectedPost, setSelectedPost] = useState(null)
    const [comments, setComments] = useState([])
    const [newComment, setNewComment] = useState('')
    const [commentsLoading, setCommentsLoading] = useState(false)

    // Follow list modal
    const [followListModal, setFollowListModal] = useState(null) // 'followers' | 'following' | null
    const [followListUsers, setFollowListUsers] = useState([])
    const [followListLoading, setFollowListLoading] = useState(false)
    const [followListSearch, setFollowListSearch] = useState('')
    const [myFollowingIds, setMyFollowingIds] = useState(new Set())
    // Highlight viewer state
    const [viewingHighlight, setViewingHighlight] = useState(null) // { index: 0 }
    const [highlightProgress, setHighlightProgress] = useState(0)
    const [blending, setBlending] = useState(false)

    const isOwnProfile = user && profileUser && user.id === profileUser.id

    // Filtered follow list (for search inside modal)
    const filteredFollowList = followListSearch.trim()
        ? followListUsers.filter(u => u.username.toLowerCase().includes(followListSearch.toLowerCase()))
        : followListUsers

    const openFollowList = async (type) => {
        setFollowListModal(type)
        setFollowListLoading(true)
        setFollowListSearch('')
        try {
            const res = await fetch(`/api/users/${identifier}/${type}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            })
            if (res.ok) {
                const data = await res.json()
                setFollowListUsers(data)
            }
            // Fetch who I follow (to show correct button state)
            if (user) {
                const res2 = await fetch(`/api/users/${user.username}/following`, {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                })
                if (res2.ok) {
                    const myFollowing = await res2.json()
                    setMyFollowingIds(new Set(myFollowing.map(u => u.id)))
                }
            }
        } catch (err) {
            console.error('Error fetching follow list:', err)
        } finally {
            setFollowListLoading(false)
        }
    }

    const toggleFollowInList = async (targetId) => {
        try {
            const res = await fetch(`/api/users/${targetId}/follow`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            })
            if (res.ok) {
                const result = await res.json()
                setMyFollowingIds(prev => {
                    const next = new Set(prev)
                    if (result.following) next.add(targetId)
                    else next.delete(targetId)
                    return next
                })

                // If the target is the profile we're viewing, update its followers_count
                if (profileUser && targetId === profileUser.id) {
                    setIsFollowing(result.following)
                    setProfileUser(prev => ({
                        ...prev,
                        followers_count: result.following
                            ? (prev.followers_count || 0) + 1
                            : Math.max((prev.followers_count || 0) - 1, 0)
                    }))
                }

                // If we're viewing our own profile, update our following_count
                if (isOwnProfile) {
                    setProfileUser(prev => ({
                        ...prev,
                        following_count: result.following
                            ? (prev.following_count || 0) + 1
                            : Math.max((prev.following_count || 0) - 1, 0)
                    }))
                    // Also remove/add from the displayed list if in "following" modal
                    if (followListModal === 'following' && !result.following) {
                        setFollowListUsers(prev => prev.filter(u => u.id !== targetId))
                    }
                }
            }
        } catch (err) {
            console.error('Error toggling follow:', err)
        }
    }

    useEffect(() => {
        fetchUserData()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [identifier, user])

    useEffect(() => {
        if (isOwnProfile) { fetchSavedPosts(); fetchArchivedPosts() }
    }, [isOwnProfile, user])

    const fetchSavedPosts = async () => {
        try {
            const res = await fetch('/api/users/saved-posts', {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            })
            if (res.ok) {
                const data = await res.json()
                setSavedPosts(data)
                setSavedPostIds(new Set(data.map(p => p.id)))
            }
        } catch (err) { console.error('Fetch saved error', err) }
    }

    const fetchArchivedPosts = async () => {
        try {
            const res = await fetch('/api/users/posts/archived', {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            })
            if (res.ok) setArchivedPosts(await res.json())
        } catch (err) { console.error('Fetch archived error', err) }
    }

    const handleArchivePost = async (postId, isCurrentlyArchived) => {
        try {
            const res = await fetch(`/api/users/posts/${postId}/archive`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            })
            if (res.ok) {
                if (isCurrentlyArchived) {
                    // Désarchiver → retirer des archives, remettre dans posts
                    setArchivedPosts(prev => prev.filter(p => p.id !== postId))
                    fetchArchivedPosts()
                } else {
                    // Archiver → retirer du profil public
                    setPosts(prev => prev.filter(p => p.id !== postId))
                    if (selectedPost?.id === postId) setSelectedPost(null)
                    fetchArchivedPosts()
                }
            }
        } catch (err) { console.error('Archive error', err) }
    }

    // --- HIGHLIGHT VIEWER LOGIC ---
    useEffect(() => {
        let timer;
        let progressTimer;

        if (viewingHighlight) {
            setHighlightProgress(0)
            const duration = 5000 // 5 seconds per highlight
            const interval = 50

            progressTimer = setInterval(() => {
                setHighlightProgress(prev => {
                    if (prev >= 1) return 1;
                    return prev + (interval / duration)
                })
            }, interval)

            timer = setTimeout(() => {
                nextHighlight()
            }, duration)
        }

        return () => {
            clearTimeout(timer)
            clearInterval(progressTimer)
        }
    }, [viewingHighlight])

    const nextHighlight = () => {
        if (!viewingHighlight || !highlights.length) return
        if (viewingHighlight.index < highlights.length - 1) {
            setViewingHighlight({ index: viewingHighlight.index + 1 })
        } else {
            setViewingHighlight(null)
        }
    }

    const prevHighlight = () => {
        if (!viewingHighlight || !highlights.length) return
        if (viewingHighlight.index > 0) {
            setViewingHighlight({ index: viewingHighlight.index - 1 })
        } else {
            // First highlight, maybe reset progress
            setHighlightProgress(0)
        }
    }

    const closeHighlight = () => {
        setViewingHighlight(null)
    }

    const openHighlightViewer = (startIndex) => {
        if (!highlights || highlights.length === 0) return;
        setViewingHighlight({ index: startIndex })
        setHighlightProgress(0)
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
                if (!saved) {
                    setSavedPosts(prev => prev.filter(p => p.id !== postId))
                } else {
                    fetchSavedPosts()
                }
            }
        } catch (err) { console.error('Save post error', err) }
    }

    useEffect(() => {
        if (selectedPost) {
            fetchComments(selectedPost.id)
        } else {
            setComments([])
            setNewComment('')
        }
    }, [selectedPost])

    const fetchComments = async (postId) => {
        try {
            setCommentsLoading(true)
            const res = await fetch(`/api/users/posts/${postId}/comments`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            })
            if (res.ok) {
                const data = await res.json()
                setComments(data)
            }
        } catch (err) {
            console.error("Failed to fetch comments", err)
        } finally {
            setCommentsLoading(false)
        }
    }

    const fetchUserData = async () => {
        try {
            setLoading(true)
            setError(null)

            // Fetch Profile info
            const profileRes = await fetch(`/api/users/${identifier}`)
            if (!profileRes.ok) {
                if (profileRes.status === 404) {
                    throw new Error("Utilisateur introuvable")
                }
                throw new Error("Erreur lors de la récupération du profil")
            }
            const data = await profileRes.json()
            setProfileUser(data)

            // Fetch posts
            const postsRes = await fetch(`/api/users/${identifier}/posts`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            })
            if (postsRes.ok) {
                const postsData = await postsRes.json()
                setPosts(postsData)
            } else {
                setPosts([])
            }

            // Fetch highlights
            const highlightsRes = await fetch(`/api/users/${identifier}/highlights`)
            if (highlightsRes.ok) {
                const highlightsData = await highlightsRes.json()
                setHighlights(highlightsData)
            } else {
                setHighlights([])
            }

            // Fetch Carpool Tags
            const tagsRes = await fetch(`/api/carpool/user/${data.id}/tags`)
            if (tagsRes.ok) {
                const tagsData = await tagsRes.json()
                setUserTags(tagsData)
            } else {
                setUserTags({})
            }

            // Check follow status if logged in
            if (user && data.id !== user.id) {
                checkFollowStatus(user.id, data.id)
                // Also check mutual friends
                fetch('/api/users/friends', {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                })
                    .then(r => r.json())
                    .then(friends => {
                        setIsMutualFriend(Array.isArray(friends) && friends.some(f => f.id === data.id))
                    })
                    .catch(() => { })
            } else {
                setIsFollowing(false)
                setIsMutualFriend(false)
            }
        } catch (err) {
            console.error(err)
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const checkFollowStatus = async (followerId, followingId) => {
        try {
            const res = await fetch(`/api/users/${followerId}/is-following/${followingId}`)
            if (res.ok) {
                const data = await res.json()
                setIsFollowing(data.isFollowing)
            }
        } catch (err) {
            console.error("Failed to check follow status", err)
        }
    }

    const handleFollowToggle = async () => {
        if (!user) {
            alert("Veuillez vous connecter pour vous abonner.")
            return
        }
        if (!profileUser) return

        try {
            setFollowLoading(true)
            const res = await fetch(`/api/users/${profileUser.id}/follow`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            })

            if (!res.ok) throw new Error("Erreur de l'abonnement")
            const result = await res.json()

            setIsFollowing(result.action === 'followed')

            // Mettre à jour les stats locales (approximativement)
            setProfileUser(prev => ({
                ...prev,
                followers_count: result.action === 'followed' ? prev.followers_count + 1 : prev.followers_count - 1
            }))

        } catch (err) {
            console.error(err)
            alert("Une erreur est survenue lors de l'abonnement.")
        } finally {
            setFollowLoading(false)
        }
    }

    const handleCreateBlend = async () => {
        if (!user || !profileUser || blending) return
        setBlending(true)
        try {
            const res = await fetch('/api/spotify/blend', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ friendId: profileUser.id, friendName: profileUser.username })
            })
            const data = await res.json()
            if (res.ok) {
                alert(`✨ Blend avec ${profileUser.username} créé ! Retrouve-le dans ta bibliothèque musicale.`)
            } else {
                alert(data.error || "Erreur lors de la création du Blend")
            }
        } catch (err) {
            console.error("Blend failed", err)
            alert("Erreur réseau")
        } finally {
            setBlending(false)
        }
    }

    const handleLike = async (postId) => {
        if (!user) return
        try {
            const res = await fetch(`/api/users/posts/${postId}/like`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            })
            if (!res.ok) throw new Error("Erreur toggle like")
            const result = await res.json()

            setPosts(prev => prev.map(p => {
                if (p.id === postId) {
                    if (selectedPost && selectedPost.id === postId) {
                        setSelectedPost({ ...selectedPost, likes: result.likesCount })
                    }
                    return { ...p, likes: result.likesCount }
                }
                return p
            }))
        } catch (err) {
            console.error("Like failed", err)
        }
    }

    const handleDeletePost = async (postId) => {
        try {
            const res = await fetch(`/api/users/posts/${postId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            })

            if (!res.ok) throw new Error("Erreur lors de la suppression")

            setPosts(prev => prev.filter(p => p.id !== postId))
            if (selectedPost?.id === postId) {
                setSelectedPost(null)
            }
        } catch (err) {
            console.error("Delete failed", err)
            alert("Erreur lors de la suppression de la publication.")
        }
    }

    const handleAddComment = async (e) => {
        e.preventDefault()
        if (!newComment.trim() || !selectedPost) return

        try {
            const res = await fetch(`/api/users/posts/${selectedPost.id}/comments`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ content: newComment })
            })

            if (!res.ok) throw new Error("Erreur ajout commentaire")
            const result = await res.json()

            if (result.success) {
                setComments(prev => [...prev, result.comment])
                setNewComment('')
            }
        } catch (err) {
            console.error("Add comment failed", err)
        }
    }

    const handleDeleteComment = async (commentId) => {
        try {
            const res = await fetch(`/api/users/posts/${selectedPost.id}/comments/${commentId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            })

            if (!res.ok) throw new Error("Erreur suppression commentaire")

            setComments(prev => prev.filter(c => c.id !== commentId))
        } catch (err) {
            console.error("Delete comment failed", err)
        }
    }

    const renderLinks = (userLinks) => {
        if (!userLinks || !userLinks.website) return null

        return (
            <div className="flex flex-wrap items-center gap-3 mt-4">
                <a
                    href={userLinks.website.startsWith('http') ? userLinks.website : `https://${userLinks.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors hover:bg-gray-100 dark:hover:bg-slate-700"
                    style={{ color: 'var(--text)', background: 'var(--surface-2)', border: '1px solid var(--border)' }}
                >
                    <LinkIcon size={14} />
                    {userLinks.website.replace(/^https?:\/\//, '')}
                </a>
            </div>
        )
    }

    if (loading) {
        return (
            <div className="w-full h-screen bg-gray-50 dark:bg-slate-900 overflow-hidden">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-6 sm:pt-10 mb-8 sm:mb-12 animate-pulse">
                    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 sm:gap-10">
                        {/* Avatar Skeleton */}
                        <div className="shrink-0 w-24 h-24 sm:w-40 sm:h-40 rounded-full bg-gray-200 dark:bg-slate-800"></div>

                        {/* Bio & Stats Skeleton */}
                        <div className="flex-1 w-full text-center sm:text-left">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-4 sm:mb-6">
                                <div className="w-48 h-8 rounded bg-gray-200 dark:bg-slate-800 mx-auto sm:mx-0"></div>
                                <div className="w-32 h-8 rounded bg-gray-200 dark:bg-slate-800 mx-auto sm:mx-0"></div>
                            </div>
                            <div className="flex items-center justify-center sm:justify-start gap-8 mb-4 sm:mb-6">
                                <div className="w-16 h-8 rounded bg-gray-200 dark:bg-slate-800"></div>
                                <div className="w-16 h-8 rounded bg-gray-200 dark:bg-slate-800"></div>
                                <div className="w-16 h-8 rounded bg-gray-200 dark:bg-slate-800"></div>
                            </div>
                            <div className="w-3/4 h-4 rounded bg-gray-200 dark:bg-slate-800 mx-auto sm:mx-0 mb-2"></div>
                            <div className="w-1/2 h-4 rounded bg-gray-200 dark:bg-slate-800 mx-auto sm:mx-0"></div>
                        </div>
                    </div>
                </div>
                {/* Posts Grid Skeleton */}
                <div className="max-w-4xl mx-auto px-1 sm:px-6 animate-pulse">
                    <div className="grid grid-cols-3 gap-1 sm:gap-4 lg:gap-6">
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="aspect-square bg-gray-200 dark:bg-slate-800"></div>
                        ))}
                    </div>
                </div>
            </div>
        )
    }

    if (error || !profileUser) {
        return (
            <div className="w-full flex flex-col items-center justify-center bg-gray-50 dark:bg-slate-900 px-4">
                <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
                <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--text)' }}>
                    {error || "Profil introuvable"}
                </h2>
                <Link to="/" className="text-blue-500 hover:underline mt-4">Retour à l'accueil</Link>
            </div>
        )
    }

    return (
        <div className="w-full overflow-x-clip" style={{ background: 'var(--bg)' }}>
            {/* Header Profile Info */}
            <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-6 sm:pt-10 mb-8 sm:mb-12">
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 sm:gap-10">

                    {/* Avatar Area */}
                    <div className="shrink-0 relative">
                        <div className="w-24 h-24 sm:w-40 sm:h-40 rounded-full bg-white dark:bg-slate-800 shadow-lg border-4 border-white dark:border-slate-900 overflow-hidden">
                            {profileUser?.avatar ? (
                                <img src={`${API_URL}${profileUser.avatar}`} alt="Avatar" className="w-full h-full object-cover" />
                            ) : profileUser?.google_avatar || profileUser?.googleAvatar ? (
                                <img src={profileUser.google_avatar || profileUser.googleAvatar} alt="Avatar" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center text-white text-3xl sm:text-5xl font-bold">
                                    {profileUser?.username?.[0]?.toUpperCase()}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Bio & Actions Area */}
                    <div className="flex-1 text-center sm:text-left">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-4 sm:mb-6">
                            <h1 className="text-2xl sm:text-3xl font-bold truncate max-w-[200px] sm:max-w-[400px] mx-auto sm:mx-0 flex items-center gap-2" style={{ color: 'var(--text)' }}>
                                {profileUser.username}
                                {profileUser.is_verified && <VerifiedBadge size="lg" />}
                            </h1>

                            <div className="flex items-center gap-2 justify-center sm:justify-start">
                                {isOwnProfile ? (
                                    <>
                                        <Link
                                            to="/social/profile"
                                            className="px-4 py-1.5 rounded-lg text-sm font-semibold transition-all shadow-sm flex items-center gap-2"
                                            style={{ background: 'var(--surface-2)', color: 'var(--text)', border: '1px solid var(--border)' }}
                                        >
                                            Modifier le profil
                                        </Link>
                                        <button
                                            onClick={() => setShowCreatePost(true)}
                                            className="p-1.5 rounded-lg text-sm font-semibold transition-all bg-blue-600 hover:bg-blue-700 text-white shadow-sm flex items-center gap-2"
                                            title="Créer une publication"
                                        >
                                            <Camera size={18} />
                                        </button>
                                    </>
                                ) : (
                                    <button
                                        onClick={handleFollowToggle}
                                        disabled={followLoading}
                                        className={`px-6 py-1.5 rounded-lg text-sm font-bold shadow-sm flex items-center gap-2 transition-all ${isFollowing
                                            ? 'bg-gray-200 dark:bg-slate-700 text-gray-800 dark:text-gray-200 hover:bg-red-500 hover:text-white hover:border-red-500'
                                            : 'bg-blue-600 hover:bg-blue-700 text-white'
                                            }`}
                                    >
                                        {followLoading ? <Loader size={16} className="animate-spin" /> : (
                                            isFollowing ? (
                                                <>
                                                    Suivi
                                                </>
                                            ) : (
                                                <>
                                                    S'abonner
                                                </>
                                            )
                                        )}
                                    </button>
                                )}

                                {/* Direct Message Button (if not me) */}
                                {!isOwnProfile && (
                                    <Link
                                        to="/social/chat"
                                        state={{ openView: 'dm', openDm: profileUser }}
                                        className="px-4 py-1.5 rounded-lg text-sm font-semibold shadow-sm"
                                        style={{ background: 'var(--surface-2)', color: 'var(--text)', border: '1px solid var(--border)' }}
                                    >
                                        Message
                                    </Link>
                                )}

                                {/* Blend Button (Magic) */}
                                {!isOwnProfile && (
                                    <button
                                        onClick={handleCreateBlend}
                                        disabled={blending}
                                        className="px-4 py-1.5 rounded-lg text-sm font-bold shadow-sm flex items-center gap-2 transition-all bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:scale-105 active:scale-95 disabled:opacity-50"
                                        title="Créer un mix musical commun"
                                    >
                                        {blending ? <Loader size={16} className="animate-spin" /> : <Music size={16} />}
                                        Blend
                                    </button>
                                )}
                            </div>

                        </div>

                        {/* Stats */}
                        <div className="flex items-center justify-center sm:justify-start gap-8 mb-4 sm:mb-6 text-sm">
                            <div className="flex sm:flex-row flex-col items-center gap-1 sm:gap-2">
                                <span className="font-bold text-lg" style={{ color: 'var(--text)' }}>{posts.length}</span>
                                <span style={{ color: 'var(--text-muted)' }}>publications</span>
                            </div>
                            <button onClick={() => (isOwnProfile || isMutualFriend) && openFollowList('followers')} className={`flex sm:flex-row flex-col items-center gap-1 sm:gap-2 ${isOwnProfile || isMutualFriend ? 'cursor-pointer hover:opacity-70 transition-opacity' : 'cursor-default'}`}>
                                <span className="font-bold text-lg" style={{ color: 'var(--text)' }}>{profileUser.followers_count || 0}</span>
                                <span style={{ color: 'var(--text-muted)' }}>abonnés</span>
                            </button>
                            <button onClick={() => (isOwnProfile || isMutualFriend) && openFollowList('following')} className={`flex sm:flex-row flex-col items-center gap-1 sm:gap-2 ${isOwnProfile || isMutualFriend ? 'cursor-pointer hover:opacity-70 transition-opacity' : 'cursor-default'}`}>
                                <span className="font-bold text-lg" style={{ color: 'var(--text)' }}>{profileUser.following_count || 0}</span>
                                <span style={{ color: 'var(--text-muted)' }}>abonnements</span>
                            </button>
                        </div>

                        {/* Name & Bio */}
                        <div>
                            {profileUser.fullName && <p className="font-bold mb-1" style={{ color: 'var(--text)' }}>{profileUser.fullName}</p>}
                            <p className="text-sm whitespace-pre-wrap leading-relaxed max-w-2xl" style={{ color: 'var(--text)' }}>
                                {profileUser.bio || "Aucune biographie."}
                            </p>
                        </div>

                        {/* Carpool Tags */}
                        {(Object.keys(userTags?.tagCounts || {}).length > 0 || userTags?.reviewCount > 0) && (
                            <div className="mt-4 border-t border-gray-100 dark:border-slate-800 pt-4">
                                <p className="text-sm font-bold mb-2 flex items-center gap-2" style={{ color: 'var(--text)' }}>
                                    <Star size={16} className="text-yellow-400 fill-yellow-400" />
                                    Avis Covoiturage ({userTags.averageRating ? userTags.averageRating.toFixed(1) : '-'} / 5)
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    {Object.entries(userTags.tagCounts || {}).map(([tagId, count]) => {
                                        let icon = null, label = '', color = ''
                                        if (tagId === 'music') { icon = <Music size={14}/>; label = 'DJ'; color = 'bg-pink-100 text-pink-600' }
                                        if (tagId === 'talkative') { icon = <MessageCircle size={14}/>; label = 'Bavard'; color = 'bg-blue-100 text-blue-600' }
                                        if (tagId === 'quiet') { icon = <VolumeX size={14}/>; label = 'Silencieux'; color = 'bg-indigo-100 text-indigo-600' }
                                        if (tagId === 'punctual') { icon = <Clock size={14}/>; label = 'Ponctuel'; color = 'bg-green-100 text-green-600' }
                                        
                                        if (!label) return null
                                        
                                        return (
                                            <div key={tagId} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold shadow-sm ${color}`}>
                                                {icon} {label} <span className="bg-white/50 rounded-full px-1.5">{count}</span>
                                            </div>
                                        )
                                    })}
                                </div>
                                
                                {userTags.reviews && userTags.reviews.length > 0 && (
                                    <div className="mt-4 space-y-2">
                                        <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Derniers avis reçus</p>
                                        {userTags.reviews.slice(0, 3).map((r, i) => (
                                            <div key={i} className="flex gap-3 p-3 rounded-xl bg-gray-50 dark:bg-slate-800/50">
                                                <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-200 shrink-0">
                                                    {(r.reviewer?.avatar || r.reviewer?.google_avatar) ? (
                                                        <img src={r.reviewer.avatar || r.reviewer.google_avatar} alt="avatar" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full bg-indigo-500 flex items-center justify-center text-white text-[10px] font-bold">
                                                            {r.reviewer?.username?.charAt(0).toUpperCase()}
                                                        </div>
                                                    )}
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="font-bold text-sm" style={{ color: 'var(--text)' }}>{r.reviewer?.username}</span>
                                                        <span className="text-[10px] text-gray-400">{new Date(r.created_at).toLocaleDateString('fr-FR')}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1 mb-1.5">
                                                        {[1,2,3,4,5].map(star => (
                                                            <Star key={star} size={10} className={star <= r.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'} />
                                                        ))}
                                                    </div>
                                                    {r.tags && r.tags.length > 0 && (
                                                        <div className="flex gap-1 flex-wrap">
                                                            {r.tags.map(tag => {
                                                                let label = ''
                                                                if (tag === 'music') label = 'DJ'
                                                                if (tag === 'talkative') label = 'Bavard'
                                                                if (tag === 'quiet') label = 'Silencieux'
                                                                if (tag === 'punctual') label = 'Ponctuel'
                                                                return label ? <span key={tag} className="text-[10px] bg-white dark:bg-slate-700 px-1.5 py-0.5 rounded text-gray-600 dark:text-gray-300 border dark:border-slate-600 shadow-sm">{label}</span> : null
                                                            })}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {renderLinks(profileUser.links)}
                    </div>
                </div>
            </div>

            {/* Highlights Section */}
            {highlights && highlights.length > 0 && (
                <div className="max-w-4xl mx-auto px-4 sm:px-6 mb-8">
                    <div className="flex gap-4 overflow-x-auto pb-4 snap-x no-scrollbar scrollbar-hide">
                        {/* We group highlights by ID or just show them individually as "stories" */}
                        {highlights.map((highlight) => (
                            <div
                                key={highlight.id}
                                className="flex flex-col items-center gap-2 shrink-0 snap-start cursor-pointer group"
                                // We could open a StoryViewer here, but for now we'll just log or trigger a viewer state
                                onClick={() => alert("Highlight viewer to be implemented: " + highlight.id)}
                            >
                                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full p-1 bg-gradient-to-tr from-yellow-400 to-orange-500 rounded-full relative">
                                    <div className="w-full h-full rounded-full border-2 border-white dark:border-slate-900 overflow-hidden bg-black flex items-center justify-center">
                                        {highlight.media_type === 'video' ? (
                                            <video src={`${API_URL}${highlight.media_url}`} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition" />
                                        ) : (
                                            <img src={`${API_URL}${highlight.media_url}`} className="w-full h-full object-cover group-hover:scale-105 transition duration-300" alt="Highlight" />
                                        )}
                                    </div>
                                </div>
                                {/* Optional: Add a title if we support naming highlights in the future */}
                                <span className="text-xs font-semibold" style={{ color: 'var(--text)' }}>À la une</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Tabs / Divider */}
            <div className="max-w-4xl mx-auto border-t" style={{ borderColor: 'var(--border)' }}>
                <div className="flex items-center justify-center gap-12">
                    <button
                        onClick={() => setActiveTab('posts')}
                        className={`flex items-center gap-2 py-4 uppercase text-xs font-bold border-t-2 ${activeTab === 'posts' ? '' : 'border-transparent text-gray-500'}`}
                        style={activeTab === 'posts' ? { borderColor: 'var(--text)', color: 'var(--text)' } : {}}>
                        <Grid size={14} />
                        Publications
                    </button>
                    {isOwnProfile && (
                        <button
                            onClick={() => setActiveTab('saved')}
                            className={`flex items-center gap-2 py-4 uppercase text-xs font-bold border-t-2 ${activeTab === 'saved' ? '' : 'border-transparent text-gray-500'}`}
                            style={activeTab === 'saved' ? { borderColor: 'var(--text)', color: 'var(--text)' } : {}}>
                            <Bookmark size={14} />
                            Sauvegardés
                        </button>
                    )}
                    {isOwnProfile && (
                        <button
                            onClick={() => setActiveTab('archived')}
                            className={`flex items-center gap-2 py-4 uppercase text-xs font-bold border-t-2 ${activeTab === 'archived' ? '' : 'border-transparent text-gray-500'}`}
                            style={activeTab === 'archived' ? { borderColor: 'var(--text)', color: 'var(--text)' } : {}}>
                            <Archive size={14} />
                            Archives
                        </button>
                    )}
                </div>
            </div>

            {/* Posts Grid */}
            <div className="max-w-4xl mx-auto px-1 sm:px-6 pb-20">
                {/* Archives banner */}
                {activeTab === 'archived' && (
                    <div className="flex items-center gap-2 px-2 py-3 mb-2 text-sm text-gray-500 dark:text-gray-400">
                        <Archive size={15} />
                        <span>Seul toi vois ces publications. Clique sur une pour la remettre sur ton profil.</span>
                    </div>
                )}
                {(() => {
                    const currentPosts = activeTab === 'posts' ? posts : activeTab === 'saved' ? savedPosts : archivedPosts
                    if (currentPosts.length === 0) return (
                        <div className="flex flex-col items-center justify-center py-20 text-center">
                            <div className="w-16 h-16 rounded-full border-2 border-dashed flex items-center justify-center mb-4" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
                                {activeTab === 'archived' ? <Archive size={32} /> : <Camera size={32} />}
                            </div>
                            <h3 className="text-xl font-bold mb-2" style={{ color: 'var(--text)' }}>
                                {activeTab === 'archived' ? 'Aucune publication archivée' : 'Aucune publication'}
                            </h3>
                            {isOwnProfile && activeTab === 'posts' && (
                                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                                    Partagez des photos ou des vidéos avec la classe pour <br />enrichir votre profil !
                                </p>
                            )}
                        </div>
                    )
                    return (
                        <div className="grid grid-cols-3 gap-1 sm:gap-4 lg:gap-6">
                            {currentPosts.map(post => {
                                const hasMedia = post.image_url || post.video_url
                                const isArchived = activeTab === 'archived'
                                return (
                                    <div key={post.id} onClick={() => !isArchived && setSelectedPost(post)} className="relative group aspect-square bg-gray-200 dark:bg-slate-800 cursor-pointer overflow-hidden">
                                        {/* Media */}
                                        {post.video_url ? (
                                            <video src={`${API_URL}${post.video_url}`} className="w-full h-full object-cover" muted loop />
                                        ) : post.image_url ? (
                                            <img src={`${API_URL}${post.image_url.split(',')[0]}`} alt="Post" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full p-4 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-center text-white text-xs sm:text-sm font-medium">
                                                <p className="line-clamp-4">{post.content && <ContentRenderer content={post.content} />}</p>
                                            </div>
                                        )}

                                        {post.video_url && (
                                            <div className="absolute top-2 right-2 text-white">
                                                <Play size={18} fill="currentColor" />
                                            </div>
                                        )}

                                        {/* Hover overlay */}
                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col md:flex-row items-center justify-center gap-4 md:gap-6 text-white font-bold">
                                            {!isArchived && (
                                                <button onClick={(e) => { e.stopPropagation(); handleLike(post.id) }} className="flex items-center gap-2 hover:text-red-400 transition-colors">
                                                    <Heart size={20} className={((Array.isArray(post.likes) ? post.likes.length : post.likes) > 0) ? "fill-white" : ""} />
                                                    <span>{Array.isArray(post.likes) ? post.likes.length : (post.likes || 0)}</span>
                                                </button>
                                            )}
                                            {isOwnProfile && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleArchivePost(post.id, isArchived) }}
                                                    className="flex items-center gap-2 hover:text-yellow-400 text-gray-300 transition-colors"
                                                    title={isArchived ? 'Remettre sur le profil' : 'Archiver'}
                                                >
                                                    <Archive size={20} />
                                                </button>
                                            )}
                                            {isOwnProfile && !isArchived && (
                                                <button onClick={(e) => { e.stopPropagation(); handleDeletePost(post.id) }} className="flex items-center gap-2 hover:text-red-400 text-gray-300 transition-colors">
                                                    <Trash2 size={20} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )
                })()}
            </div>

            {/* ════════ HIGHLIGHT VIEWER MODAL ════════ */}
            {viewingHighlight && highlights[viewingHighlight.index] && (
                <div className="fixed inset-0 z-[300] bg-black flex items-center justify-center" onClick={closeHighlight}>
                    <div className="relative w-full h-full max-w-md mx-auto flex flex-col" onClick={e => e.stopPropagation()}>
                        {/* Progress Bars */}
                        <div className="absolute top-0 left-0 right-0 z-20 flex gap-1 p-2 pt-3">
                            {highlights.map((_, idx) => (
                                <div key={idx} className="flex-1 h-[3px] bg-white/30 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-white rounded-full transition-none"
                                        style={{
                                            width: idx < viewingHighlight.index ? '100%'
                                                : idx === viewingHighlight.index ? `${highlightProgress * 100}%`
                                                    : '0%'
                                        }}
                                    />
                                </div>
                            ))}
                        </div>

                        {/* User Info & Controls */}
                        <div className="absolute top-8 left-0 right-0 z-20 flex items-center justify-between px-4">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full border border-white/50 overflow-hidden bg-gray-200">
                                    {profileUser?.avatar ? (
                                        <img src={`${API_URL}${profileUser.avatar}`} alt="Avatar" className="w-full h-full object-cover" />
                                    ) : profileUser?.google_avatar || profileUser?.googleAvatar ? (
                                        <img src={profileUser.google_avatar || profileUser.googleAvatar} alt="Avatar" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center text-white font-bold">
                                            {profileUser?.username?.[0]?.toUpperCase()}
                                        </div>
                                    )}
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-white font-bold text-sm drop-shadow-md">{profileUser?.username}</span>
                                    <span className="text-white/80 text-xs drop-shadow-md">
                                        À la une
                                    </span>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={closeHighlight} className="text-white/80 hover:text-white p-2">
                                    <X size={28} />
                                </button>
                            </div>
                        </div>

                        {/* Media */}
                        <div className="flex-1 flex items-center justify-center relative bg-black">
                            {highlights[viewingHighlight.index].media_type === 'video' ? (
                                <video
                                    key={highlights[viewingHighlight.index].id}
                                    src={`${API_URL}${highlights[viewingHighlight.index].media_url}`}
                                    autoPlay
                                    muted
                                    playsInline
                                    className="w-full h-full object-contain"
                                />
                            ) : (
                                <img
                                    key={highlights[viewingHighlight.index].id}
                                    src={`${API_URL}${highlights[viewingHighlight.index].media_url}`}
                                    alt="Highlight"
                                    className="w-full h-full object-contain"
                                />
                            )}

                            {/* Touch Zones */}
                            <button onClick={prevHighlight} className="absolute left-0 top-0 bottom-0 w-1/3 z-10" />
                            <button onClick={nextHighlight} className="absolute right-0 top-0 bottom-0 w-1/3 z-10" />
                        </div>
                    </div>

                    {/* Desktop Arrows */}
                    <button onClick={prevHighlight} className="hidden md:flex absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/20 rounded-full items-center justify-center text-white hover:bg-white/30 transition z-30">
                        <ChevronLeft size={24} />
                    </button>
                    <button onClick={nextHighlight} className="hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/20 rounded-full items-center justify-center text-white hover:bg-white/30 transition z-30">
                        <ChevronRight size={24} />
                    </button>
                </div>
            )
            }

            {/* Post Detail Modal */}
            {
                selectedPost && (
                    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setSelectedPost(null)}>
                        <div className="bg-white dark:bg-slate-900 rounded-xl overflow-hidden flex flex-col md:flex-row w-full max-w-5xl max-h-[90vh] shadow-2xl relative" onClick={e => e.stopPropagation()}>

                            <button onClick={() => setSelectedPost(null)} className="absolute top-4 right-4 z-10 p-2 bg-black/50 hover:bg-black/70 text-white rounded-full transition md:hidden">
                                <X size={20} />
                            </button>

                            {/* Media Section */}
                            <div className="w-full md:w-[60%] bg-black flex items-center justify-center min-h-[300px] md:min-h-[500px]">
                                {selectedPost.video_url ? (
                                    <video src={`${API_URL}${selectedPost.video_url}`} controls className="w-full h-full max-h-[90vh] object-contain" />
                                ) : selectedPost.image_url ? (
                                    <ImageCarousel mediaUrls={selectedPost.image_url} className="max-h-[90vh]" />
                                ) : (
                                    <div className="w-full h-full min-h-[300px] p-8 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-center text-white text-xl md:text-3xl font-bold">
                                        <p className="max-w-md">{selectedPost.content && <ContentRenderer content={selectedPost.content} />}</p>
                                    </div>
                                )}
                            </div>

                            {/* Info Section */}
                            <div className="w-full md:w-[40%] flex flex-col border-l border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 max-h-[50vh] md:max-h-[90vh] overflow-hidden">

                                {/* Header */}
                                <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-800 shrink-0">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200 shrink-0">
                                            {profileUser?.avatar ? (
                                                <img src={`${API_URL}${profileUser.avatar}`} alt="Avatar" className="w-full h-full object-cover" />
                                            ) : profileUser?.google_avatar || profileUser?.googleAvatar ? (
                                                <img src={profileUser.google_avatar || profileUser.googleAvatar} alt="Avatar" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center text-white font-bold">
                                                    {profileUser?.username?.[0]?.toUpperCase()}
                                                </div>
                                            )}
                                        </div>
                                        <span className="font-bold text-gray-900 dark:text-gray-100">{profileUser.username}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {isOwnProfile && (
                                            <button onClick={() => handleDeletePost(selectedPost.id)} className="p-2 text-gray-400 hover:text-red-500 transition-colors" title="Supprimer">
                                                <Trash2 size={18} />
                                            </button>
                                        )}
                                        <button onClick={(e) => handleSavePost(selectedPost.id, e)} className="p-2 text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors" title="Sauvegarder">
                                            <Bookmark size={18} className={savedPostIds.has(selectedPost.id) ? "fill-current" : ""} />
                                        </button>
                                        <button onClick={() => setSelectedPost(null)} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors hidden md:block">
                                            <X size={24} />
                                        </button>
                                    </div>
                                </div>

                                {/* Comments/Description area */}
                                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                                    {/* Description as first "comment" */}
                                    {((selectedPost.image_url || selectedPost.video_url) ? selectedPost.content : false) && (
                                        <div className="flex gap-3 mb-6">
                                            <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-200 shrink-0 mt-1">
                                                {profileUser?.avatar ? (
                                                    <img src={`${API_URL}${profileUser.avatar}`} alt="Avatar" className="w-full h-full object-cover" />
                                                ) : profileUser?.google_avatar || profileUser?.googleAvatar ? (
                                                    <img src={profileUser.google_avatar || profileUser.googleAvatar} alt="Avatar" className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center text-white text-xs font-bold">
                                                        {profileUser?.username?.[0]?.toUpperCase()}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex-1 text-sm text-gray-800 dark:text-gray-200">
                                                <span className="font-bold mr-2">{profileUser.username}</span>
                                                <span className="whitespace-pre-wrap leading-relaxed">{selectedPost.content && <ContentRenderer content={selectedPost.content} />}</span>
                                            </div>
                                        </div>
                                    )}

                                    {/* Real Comments List */}
                                    {commentsLoading ? (
                                        <div className="flex justify-center p-4">
                                            <Loader className="animate-spin text-gray-400" size={24} />
                                        </div>
                                    ) : (
                                        comments.map(comment => (
                                            <div key={comment.id} className="flex gap-3 mb-4 group">
                                                <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-200 shrink-0 mt-1">
                                                    {comment.users.avatar ? (
                                                        <img src={`${API_URL}${comment.users.avatar}`} alt="Avatar" className="w-full h-full object-cover" />
                                                    ) : comment.users.google_avatar || comment.users.googleAvatar ? (
                                                        <img src={comment.users.google_avatar || comment.users.googleAvatar} alt="Avatar" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center text-white text-xs font-bold">
                                                            {comment.users.username?.[0]?.toUpperCase()}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex-1 text-sm text-gray-800 dark:text-gray-200">
                                                    <span className="font-bold mr-2">{comment.users.username}</span>
                                                    <span className="whitespace-pre-wrap leading-relaxed break-words">{comment.content && <ContentRenderer content={comment.content} />}</span>
                                                    <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                                                        <span>{new Date(comment.created_at).toLocaleDateString('fr-FR')}</span>
                                                        {(user?.id === comment.user_id || user?.id === selectedPost.user_id) && (
                                                            <button onClick={() => handleDeleteComment(comment.id)} className="opacity-0 group-hover:opacity-100 hover:text-red-500 transition-opacity">
                                                                Supprimer
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>

                                {/* Actions / Likes / Comment Input */}
                                <div className="p-4 border-t border-gray-200 dark:border-slate-800 shrink-0 bg-white dark:bg-slate-900 flex flex-col">
                                    <div className="flex items-center gap-4 mb-3">
                                        <button onClick={() => handleLike(selectedPost.id)} className="hover:opacity-60 transition-opacity">
                                            <Heart size={26} className={((Array.isArray(selectedPost.likes) ? selectedPost.likes.length : selectedPost.likes) > 0) ? "fill-red-500 text-red-500 animate-heart-burst" : "text-gray-800 dark:text-white"} />
                                        </button>
                                    </div>
                                    <div className="text-sm text-gray-900 dark:text-white mb-1 flex flex-col">
                                        <span className="font-bold">{Array.isArray(selectedPost.likes) ? selectedPost.likes.length : (selectedPost.likes || 0)} J'aime</span>
                                        {selectedPost.friend_likes_names && selectedPost.friend_likes_names.length > 0 && (
                                            <span className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                                Aimé par <span className="font-medium text-gray-900 dark:text-gray-200">{selectedPost.friend_likes_names[0]}</span>
                                                {selectedPost.friend_likes_names.length > 1 && (
                                                    <> et <span className="font-medium text-gray-900 dark:text-gray-200">{selectedPost.friend_likes_names.length - 1} autre(s)</span></>
                                                )}
                                            </span>
                                        )}
                                    </div>
                                    <div className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
                                        {new Date(selectedPost.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                                    </div>

                                    <form onSubmit={handleAddComment} className="flex items-center gap-2 pt-3 border-t border-gray-100 dark:border-slate-800">
                                        <input
                                            type="text"
                                            placeholder="Ajouter un commentaire..."
                                            value={newComment}
                                            onChange={(e) => setNewComment(e.target.value)}
                                            className="flex-1 bg-transparent text-sm focus:outline-none text-gray-900 dark:text-gray-100 placeholder-gray-500"
                                        />
                                        <button
                                            type="submit"
                                            disabled={!newComment.trim()}
                                            className="text-blue-500 font-bold text-sm disabled:opacity-50 hover:text-blue-600 transition-colors"
                                        >
                                            Publier
                                        </button>
                                    </form>
                                </div>

                            </div>
                        </div>
                    </div>
                )
            }

            {/* Create Post Modal */}
            {
                showCreatePost && (
                    <CreatePostModal
                        user={user}
                        onClose={() => setShowCreatePost(false)}
                        onPostCreated={(postData) => {
                            if (postData.success && postData.post) {
                                setPosts(prev => [postData.post, ...prev])
                            } else {
                                // Fetch posts again if not returning standard format
                                fetchUserData()
                            }
                        }}
                    />
                )
            }

            {/* ═══ Followers / Following Modal ═══ */}
            {
                followListModal && (
                    <div className="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => { setFollowListModal(null); setFollowListSearch('') }}>
                        <div className="bg-white dark:bg-zinc-900 rounded-2xl w-full max-w-md max-h-[450px] flex flex-col shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
                            {/* Header */}
                            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-white/10">
                                <div className="w-8" />
                                <h2 className="font-bold text-[16px] text-gray-900 dark:text-white">
                                    {followListModal === 'followers' ? 'Abonnés' : 'Abonnements'}
                                </h2>
                                <button onClick={() => { setFollowListModal(null); setFollowListSearch('') }} className="text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors">
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Search */}
                            <div className="px-4 py-2 border-b border-gray-100 dark:border-white/5">
                                <div className="relative">
                                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="Rechercher"
                                        value={followListSearch}
                                        onChange={e => setFollowListSearch(e.target.value)}
                                        className="w-full bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-white rounded-lg py-2 pl-9 pr-3 text-sm focus:outline-none placeholder-gray-400"
                                    />
                                </div>
                            </div>

                            {/* User list */}
                            <div className="flex-1 overflow-y-auto">
                                {followListLoading ? (
                                    <div className="flex justify-center py-10">
                                        <Loader className="animate-spin text-gray-400" size={24} />
                                    </div>
                                ) : filteredFollowList.length === 0 ? (
                                    <div className="text-center py-10 text-gray-500 text-sm">
                                        {followListSearch ? 'Aucun résultat' : 'Aucun utilisateur'}
                                    </div>
                                ) : (
                                    filteredFollowList.map(u => {
                                        const isMe = user && u.id === user.id
                                        const amFollowing = myFollowingIds.has(u.id)
                                        return (
                                            <div key={u.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                                                <Link to={`/social/user/${u.username}`} onClick={() => { setFollowListModal(null); setFollowListSearch('') }} className="w-11 h-11 rounded-full overflow-hidden shrink-0 border border-gray-200 dark:border-white/10">
                                                    <UserAvatar user={u} size={44} />
                                                </Link>
                                                <Link to={`/social/user/${u.username}`} onClick={() => { setFollowListModal(null); setFollowListSearch('') }} className="flex-1 min-w-0">
                                                    <span className="text-[14px] font-bold text-gray-900 dark:text-white truncate block">{u.username}</span>
                                                </Link>
                                                {!isMe && (
                                                    <button
                                                        onClick={() => toggleFollowInList(u.id)}
                                                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${amFollowing
                                                            ? 'bg-gray-200 dark:bg-slate-700 text-gray-800 dark:text-gray-200 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-500/20 dark:hover:text-red-400'
                                                            : 'bg-blue-500 hover:bg-blue-600 text-white'
                                                            }`}
                                                    >
                                                        {amFollowing ? 'Suivi(e)' : 'Suivre'}
                                                    </button>
                                                )}
                                            </div>
                                        )
                                    })
                                )}
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    )
}
