import { useState, useEffect, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useSocket } from '../../contexts/SocketContext'
import { Heart, MessageCircle, Share2, MoreHorizontal, Loader, Plus, X, ChevronLeft, ChevronRight, Camera, Trash2, Send, Search, Bookmark, Star, Archive, Eye, Flag } from 'lucide-react'
import { ImageCarousel } from '../../components/ImageCarousel'
import { ContentRenderer } from '../../components/ContentRenderer'
import { VerifiedBadge } from '../../components/VerifiedBadge'

const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:3001' : '')

export function Feed() {
    const { user, getToken } = useAuth()
    const [posts, setPosts] = useState([])
    const [loading, setLoading] = useState(true)
    const [page, setPage] = useState(1)
    const [hasMore, setHasMore] = useState(true)
    const [loadingMore, setLoadingMore] = useState(false)

    // Infinite scroll observer
    const observer = useRef()
    const lastPostElementRef = useCallback(node => {
        if (loading || loadingMore) return
        if (observer.current) observer.current.disconnect()
        observer.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && hasMore) {
                setPage(prevPage => prevPage + 1)
            }
        }, { threshold: 1.0 })
        if (node) observer.current.observe(node)
    }, [loading, loadingMore, hasMore])

    // Sockets for DM Sharing
    const { socket, connected } = useSocket()
    const [allUsers, setAllUsers] = useState([])
    const [shareModalPost, setShareModalPost] = useState(null)
    const [shareSearchQuery, setShareSearchQuery] = useState('')
    const [shareMessage, setShareMessage] = useState('')
    const [selectedShareUsers, setSelectedShareUsers] = useState([])
    const [sharingLoading, setSharingLoading] = useState(false)

    // Stories state
    const [storyGroups, setStoryGroups] = useState([])
    const [storiesLoading, setStoriesLoading] = useState(true)
    const [viewingStory, setViewingStory] = useState(null) // { groupIndex, storyIndex }
    const [storyProgress, setStoryProgress] = useState(0)
    const storyTimerRef = useRef(null)
    const storiesScrollRef = useRef(null)

    // Post Actions state
    const [openPostOptions, setOpenPostOptions] = useState(null)
    const [activeCommentPost, setActiveCommentPost] = useState(null)
    const [comments, setComments] = useState([])
    const [newComment, setNewComment] = useState('')
    const [commentsLoading, setCommentsLoading] = useState(false)

    // Saved Posts
    const [savedPostIds, setSavedPostIds] = useState(new Set())

    // Story viewers panel
    const [showViewers, setShowViewers] = useState(false)
    const [viewersData, setViewersData] = useState(null)
    const [viewersLoading, setViewersLoading] = useState(false)
    const [storyReplyInput, setStoryReplyInput] = useState('')
    // Poll votes (local, keyed by story_id)
    const [storyPollData, setStoryPollData] = useState({}) // { [storyId]: pollObject }

    // Report Modal State
    const [reportModalData, setReportModalData] = useState(null) // { targetType: 'post'|'comment'|'user', targetId: string }
    const [reportReason, setReportReason] = useState('')
    const [isReporting, setIsReporting] = useState(false)

    useEffect(() => {
        fetchStories()
        fetchAllUsers()
        fetchSavedPostIds()
    }, [])

    useEffect(() => {
        loadFeed(page)
    }, [page])

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
        } catch (err) { console.error('Save post error', err) }
    }

    const fetchAllUsers = async () => {
        try {
            const res = await fetch('/api/users/friends', {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            })
            if (res.ok) {
                const data = await res.json()
                setAllUsers(data.filter(u => u.id !== user?.id))
            }
        } catch (err) {
            console.error("Fetch friends failed", err)
        }
    }

    const loadFeed = async (pageNum) => {
        try {
            if (pageNum === 1) setLoading(true)
            else setLoadingMore(true)

            const res = await fetch(`/api/users/feed?page=${pageNum}&limit=10`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            })
            if (res.ok) {
                const data = await res.json()
                if (data.length < 10) setHasMore(false)

                if (pageNum === 1) {
                    setPosts(data)
                } else {
                    setPosts(prev => {
                        const newPosts = data.filter(d => !prev.some(p => p.id === d.id))
                        return [...prev, ...newPosts]
                    })
                }
            }
        } catch (err) {
            console.error(err)
        } finally {
            if (pageNum === 1) setLoading(false)
            else setLoadingMore(false)
        }
    }

    const fetchStories = async () => {
        try {
            setStoriesLoading(true)
            const res = await fetch('/api/users/stories', {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            })
            if (res.ok) {
                const data = await res.json()
                setStoryGroups(data)
            }
        } catch (err) {
            console.error(err)
        } finally {
            setStoriesLoading(false)
        }
    }

    // ─── Story Viewer Logic ────────────────────
    // Handle Highlight Toggle
    const handleToggleHighlight = async (storyId) => {
        try {
            const res = await fetch(`/api/users/stories/${storyId}/highlight`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            })
            if (res.ok) {
                const { is_highlight } = await res.json()
                // Update local state directly to show visual change immediately
                const newStoryGroups = [...storyGroups]
                const group = newStoryGroups[viewingStory.groupIndex]
                const storyIndexToUpdate = group.stories.findIndex(s => s.id === storyId)
                if (storyIndexToUpdate !== -1) {
                    group.stories[storyIndexToUpdate].is_highlight = is_highlight
                    setStoryGroups(newStoryGroups)
                }
            } else {
                console.error('Failed to toggle highlight')
            }
        } catch (err) {
            console.error('Error toggling highlight', err)
        }
    }

    const openStory = (groupIndex) => {
        // Find first unviewed story in this group if any
        const group = storyGroups[groupIndex]
        let firstUnviewedIndex = group.stories.findIndex(s => !s.isViewed)
        if (firstUnviewedIndex === -1) firstUnviewedIndex = 0 // if all viewed, start from 0

        setViewingStory({ groupIndex, storyIndex: firstUnviewedIndex })
        setStoryProgress(0)
    }

    useEffect(() => {
        if (!viewingStory) return

        const groupIndex = viewingStory.groupIndex
        const group = storyGroups[groupIndex]
        if (!group) return

        const storyIndex = viewingStory.storyIndex
        const currentStory = group.stories[storyIndex]
        if (!currentStory) return

        // Mark as viewed in database and locally
        if (!currentStory.isViewed) {
            fetch(`/api/users/stories/${currentStory.id}/view`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            }).catch(err => console.error("Error marking story as viewed:", err))

            setStoryGroups(prev => {
                const newGroups = [...prev]
                newGroups[groupIndex].stories[storyIndex].isViewed = true
                return newGroups
            })
        }

        const isVideo = currentStory?.media_type === 'video'
        const duration = isVideo ? 15000 : 5000 // 15s for videos, 5s for images

        const startTime = Date.now()
        const tick = () => {
            const elapsed = Date.now() - startTime
            const progress = Math.min(elapsed / duration, 1)
            setStoryProgress(progress)
            if (progress < 1) {
                storyTimerRef.current = requestAnimationFrame(tick)
            } else {
                nextStory()
            }
        }
        storyTimerRef.current = requestAnimationFrame(tick)

        return () => {
            if (storyTimerRef.current) cancelAnimationFrame(storyTimerRef.current)
        }
    }, [viewingStory])

    const nextStory = () => {
        setViewingStory(prev => {
            if (!prev) return null
            const group = storyGroups[prev.groupIndex]
            if (prev.storyIndex < group.stories.length - 1) {
                setStoryProgress(0)
                return { ...prev, storyIndex: prev.storyIndex + 1 }
            } else if (prev.groupIndex < storyGroups.length - 1) {
                setStoryProgress(0)
                return { groupIndex: prev.groupIndex + 1, storyIndex: 0 }
            } else {
                setStoryProgress(0)
                return null
            }
        })
    }

    const prevStory = () => {
        setViewingStory(prev => {
            if (!prev) return null
            if (prev.storyIndex > 0) {
                setStoryProgress(0)
                return { ...prev, storyIndex: prev.storyIndex - 1 }
            } else if (prev.groupIndex > 0) {
                const prevGroupIndex = prev.groupIndex - 1
                const prevGroup = storyGroups[prevGroupIndex]
                setStoryProgress(0)
                return { groupIndex: prevGroupIndex, storyIndex: prevGroup.stories.length - 1 }
            }
            return prev
        })
    }

    const closeStory = () => {
        if (storyTimerRef.current) cancelAnimationFrame(storyTimerRef.current)
        setViewingStory(null)
        setStoryProgress(0)
        setShowViewers(false)
        setStoryReplyInput('')
    }

    const handleSendStoryReply = async (storyId, content) => {
        if (!content.trim()) return;
        try {
            await fetch(`/api/users/stories/${storyId}/reply`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
                body: JSON.stringify({ content })
            });
        } catch (e) { /* silencieux */ }

        const toast = document.createElement('div');
        toast.className = 'fixed bottom-20 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-6 py-3 rounded-full text-sm font-medium z-[300] shadow-2xl animate-in fade-in slide-in-from-bottom-5';
        toast.innerText = 'Réponse envoyée ✓';
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 2500);

        setStoryReplyInput('');
        closeStory();
    }

    const fetchViewers = async (storyId) => {
        setViewersLoading(true);
        setViewersData(null);
        setShowViewers(true);
        try {
            const res = await fetch(`/api/users/stories/${storyId}/viewers`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            if (res.ok) setViewersData(await res.json());
        } catch (e) { /* ignore */ }
        setViewersLoading(false);
    }

    const openReplyDM = (userId) => {
        if (!socket) return;
        socket.emit('dm:open', { targetUserId: userId });
        setShowViewers(false);
        closeStory();
    }

    const handleReactToStory = async (storyId, emoji) => {
        try {
            await fetch(`/api/users/stories/${storyId}/react`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ emoji })
            });
        } catch (e) { /* silencieux */ }

        const toast = document.createElement('div');
        toast.className = 'fixed bottom-20 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-6 py-3 rounded-full text-sm font-medium z-[300] shadow-2xl animate-in fade-in slide-in-from-bottom-5';
        toast.innerText = `${emoji} Réaction envoyée`;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 2000);

        closeStory();
    }

    // ─── Create Story Logic ────────────────────
    const handleStoryFileSelect = (e) => {
        const file = e.target.files?.[0]
        if (!file) return
        setStoryFile(file)
        setStoryPreview(URL.createObjectURL(file))
        setShowCreateStory(true)
    }

    const handleUploadStory = async () => {
        if (!storyFile) return
        setUploadingStory(true)
        try {
            const formData = new FormData()
            formData.append('media', storyFile)
            if (storyPoll && storyPoll.question.trim() && storyPoll.options.filter(o => o.trim()).length >= 2) {
                const pollToSend = {
                    question: storyPoll.question,
                    options: storyPoll.options.filter(o => o.trim()).map(o => ({ text: o, votes: 0 })),
                    user_votes: {}
                }
                formData.append('poll', JSON.stringify(pollToSend))
            }
            const res = await fetch('/api/users/stories', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
                body: formData
            })
            if (res.ok) {
                setShowCreateStory(false)
                setStoryFile(null)
                setStoryPreview(null)
                setStoryPoll(null)
                setShowPollCreator(false)
                fetchStories()
            }
        } catch (err) {
            console.error(err)
        } finally {
            setUploadingStory(false)
        }
    }

    const handleVotePoll = async (storyId, optionIndex) => {
        // Optimistic update
        setStoryPollData(prev => {
            const poll = prev[storyId] || storyGroups.flatMap(g => g.stories).find(s => s.id === storyId)?.poll
            if (!poll || poll.user_votes?.[user?.id] !== undefined) return prev
            const options = poll.options.map((opt, i) => ({ ...opt, votes: (opt.votes || 0) + (i === optionIndex ? 1 : 0) }))
            return { ...prev, [storyId]: { ...poll, options, user_votes: { ...(poll.user_votes || {}), [user.id]: optionIndex } } }
        })
        try {
            const res = await fetch(`/api/users/stories/${storyId}/vote`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ optionIndex })
            })
            if (res.ok) {
                const { poll } = await res.json()
                setStoryPollData(prev => ({ ...prev, [storyId]: poll }))
            }
        } catch (err) { console.error(err) }
    }

    const deleteStory = async (storyId) => {
        // Pause timer temporarily
        if (storyTimerRef.current) cancelAnimationFrame(storyTimerRef.current)

        try {
            const res = await fetch(`/api/users/stories/${storyId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            if (res.ok) {
                const group = storyGroups[viewingStory.groupIndex];
                if (group.stories.length <= 1) {
                    closeStory()
                } else {
                    nextStory()
                }
                fetchStories()
            }
        } catch (err) {
            console.error("Delete story failed", err)
        }
    }

    const handleLike = async (postId, e) => {
        if (e) e.stopPropagation()
        if (!user) return
        try {
            const res = await fetch(`/api/users/posts/${postId}/like`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            })
            if (res.ok) {
                const result = await res.json()
                setPosts(prev => prev.map(p => p.id === postId ? { ...p, likes: result.likesCount } : p))
            }
        } catch (err) {
            console.error("Like failed", err)
        }
    }

    const handleDeletePost = async (postId) => {
        try {
            const res = await fetch(`/api/users/posts/${postId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            })
            if (res.ok) {
                setPosts(prev => prev.filter(p => p.id !== postId))
                setOpenPostOptions(null)
            }
        } catch (err) {
            console.error("Delete post failed", err)
        }
    }

    const handleArchivePost = async (postId) => {
        try {
            const res = await fetch(`/api/users/posts/${postId}/archive`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            })
            if (res.ok) {
                setPosts(prev => prev.filter(p => p.id !== postId))
                setOpenPostOptions(null)
            }
        } catch (err) {
            console.error("Archive post failed", err)
        }
    }

    const handleShare = (post) => {
        setShareModalPost(post)
        setSelectedShareUsers([])
        setShareMessage('')
        setShareSearchQuery('')
    }

    const executeShare = async () => {
        if (!socket || !connected || !shareModalPost || selectedShareUsers.length === 0) return
        setSharingLoading(true)

        try {
            const postLink = `${window.location.origin}/social?post=${shareModalPost.id}`
            const textContent = shareMessage.trim() ? `${shareMessage}\n\n${postLink}` : postLink

            // Send individually to all selected users
            selectedShareUsers.forEach(targetUser => {
                socket.emit('dm:send', {
                    targetUserId: targetUser.id,
                    content: textContent,
                    replyTo: null,
                    attachment: null
                })
            })

            // Success cleanup
            setShareModalPost(null)
            setSelectedShareUsers([])
            setShareMessage('')
            setSharingLoading(false)

            // Provide a small UI feedback if desired, or just let modal close cleanly
        } catch (err) {
            console.error("Share failed", err)
            setSharingLoading(false)
        }
    }

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
                // The comment might not return populated users relation properly depending on backend
                // Fallback to current user if missing
                const author = comment.users || user
                setComments(prev => [...prev, { ...comment, author }])
                setNewComment('')
            }
        } catch (err) {
            console.error("Submit comment failed", err)
        }
    }

    const openReportModal = (targetType, targetId) => {
        setReportModalData({ targetType, targetId })
        setReportReason('')
        setOpenPostOptions(null) // close post options if open
    }

    const submitReport = async () => {
        if (!reportModalData || !reportReason.trim()) return;
        setIsReporting(true);
        try {
            const res = await fetch('/api/users/reports', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    targetType: reportModalData.targetType,
                    targetId: reportModalData.targetId,
                    reason: reportReason.trim()
                })
            });

            if (res.ok) {
                // Show success toast
                const toast = document.createElement('div');
                toast.className = 'fixed bottom-20 left-1/2 -translate-x-1/2 bg-green-600 text-white px-6 py-3 rounded-full text-sm font-medium z-[300] shadow-2xl animate-in fade-in slide-in-from-bottom-5';
                toast.innerText = 'Signalement envoyé ✓';
                document.body.appendChild(toast);
                setTimeout(() => toast.remove(), 3000);
                
                setReportModalData(null);
            }
        } catch (err) {
            console.error("Report failed", err);
        } finally {
            setIsReporting(false);
        }
    }

    // ─── Avatar helper ─────────────────────────
    const renderAvatar = (author, size = 'w-9 h-9', textSize = 'text-sm') => {
        if (!author) return <div className={`${size} rounded-full bg-gray-300`}></div>
        if (author.avatar) {
            return <img src={`${API_URL}${author.avatar}`} alt="" className={`${size} rounded-full object-cover`} />
        }
        if (author.google_avatar || author.googleAvatar) {
            return <img src={author.google_avatar || author.googleAvatar} alt="" className={`${size} rounded-full object-cover`} />
        }
        return (
            <div className={`${size} rounded-full bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center text-white ${textSize} font-bold`}>
                {author.username?.[0]?.toUpperCase()}
            </div>
        )
    }

    if (loading && storiesLoading) {
        return (
            <div className="flex flex-col max-w-2xl mx-auto w-full pb-24 md:pb-8 pt-4">
                {/* Skeleton Stories */}
                <div className="bg-white dark:bg-black border border-gray-200 dark:border-white/10 rounded-xl p-4 mb-6 shadow-sm mx-4 md:mx-0 flex gap-4 overflow-hidden">
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className="flex flex-col items-center gap-1.5 shrink-0">
                            <div className="w-16 h-16 rounded-full bg-gray-200 dark:bg-slate-800 animate-pulse"></div>
                            <div className="w-12 h-2 rounded bg-gray-200 dark:bg-slate-800 animate-pulse"></div>
                        </div>
                    ))}
                </div>

                {/* Skeleton Posts */}
                {[...Array(3)].map((_, i) => (
                    <div key={i} className="bg-white dark:bg-black border border-gray-200 dark:border-white/10 rounded-xl mb-6 shadow-sm overflow-hidden mx-4 md:mx-0 animate-pulse">
                        <div className="p-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-slate-800"></div>
                                <div className="space-y-2">
                                    <div className="w-24 h-3 rounded bg-gray-200 dark:bg-slate-800"></div>
                                    <div className="w-16 h-2 rounded bg-gray-200 dark:bg-slate-800"></div>
                                </div>
                            </div>
                        </div>
                        <div className="w-full aspect-square bg-gray-200 dark:bg-slate-800"></div>
                        <div className="p-4 space-y-3">
                            <div className="flex gap-4">
                                <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-slate-800"></div>
                                <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-slate-800"></div>
                                <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-slate-800"></div>
                            </div>
                            <div className="w-full h-3 rounded bg-gray-200 dark:bg-slate-800"></div>
                            <div className="w-3/4 h-3 rounded bg-gray-200 dark:bg-slate-800"></div>
                        </div>
                    </div>
                ))}
            </div>
        )
    }

    return (
        <div className="flex flex-col max-w-2xl mx-auto w-full pb-24 md:pb-8 pt-4">

            {/* ════════ STORIES BANNER ════════ */}
            {storyGroups.length > 0 && (
                <div className="bg-white dark:bg-black border border-gray-200 dark:border-white/10 rounded-xl p-4 mb-6 shadow-sm mx-4 md:mx-0">
                    <div ref={storiesScrollRef} className="flex gap-4 overflow-x-auto pb-1 custom-scrollbar scrollbar-hide">
                        {/* Real Stories Bubbles */}
                        {storyGroups.map((group, i) => {
                            // A group is fully viewed if every story in it has been viewed
                            const isViewed = group.stories.every(s => s.isViewed)
                            return (
                                <button
                                    key={i}
                                    onClick={() => openStory(i)}
                                    className="flex flex-col items-center gap-1.5 shrink-0"
                                >
                                    <div className={`w-16 h-16 rounded-full p-[2.5px] ${isViewed ? 'bg-gray-300 dark:bg-gray-700' : 'bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-500'}`}>
                                        <div className="w-full h-full rounded-full bg-white dark:bg-black p-[2px]">
                                            <div className="w-full h-full rounded-full overflow-hidden bg-gray-200">
                                                {renderAvatar(group.author, 'w-full h-full', 'text-lg')}
                                            </div>
                                        </div>
                                    </div>
                                    <span className={`text-[11px] font-medium max-w-[64px] truncate ${isViewed ? 'text-gray-500 dark:text-gray-400' : 'text-gray-900 dark:text-gray-100'}`}>
                                        {group.author?.username}
                                    </span>
                                </button>
                            )
                        })}
                    </div>
                </div>
            )}

            {/* ════════ FEED POSTS ════════ */}
            <div className="flex flex-col gap-6">
                {posts.map((post, index) => {
                    const hasMedia = post.image_url || post.video_url
                    const likesCount = Array.isArray(post.likes) ? post.likes.length : (post.likes || 0)
                    const author = post.author || {}

                    return (
                        <div key={post.id} ref={index === posts.length - 1 ? lastPostElementRef : null} className="bg-white dark:bg-black border border-gray-200 dark:border-white/10 md:rounded-xl overflow-hidden shadow-sm">
                            {/* Post Header */}
                            <div className="flex items-center justify-between p-3 border-b border-gray-100 dark:border-white/10/50">
                                <Link to={`/social/user/${author.username}`} className="flex items-center gap-3 group">
                                    <div className="w-9 h-9 rounded-full overflow-hidden bg-gray-200">
                                        {renderAvatar(author)}
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-sm font-bold text-gray-900 dark:text-white group-hover:text-blue-500 transition-colors flex items-center gap-1">
                                            {author.username}
                                            {author.is_verified && <VerifiedBadge size="sm" />}
                                            {post.is_close_friends_only && (
                                                <span className="ml-2 px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                                                    <Star size={10} className="fill-current" />
                                                    Amis proches
                                                </span>
                                            )}
                                        </span>
                                        <span className="text-xs text-gray-500">
                                            {new Date(post.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                                        </span>
                                    </div>
                                </Link>
                                <div className="relative">
                                    <button
                                        onClick={() => setOpenPostOptions(openPostOptions === post.id ? null : post.id)}
                                        className="p-2 text-gray-400 hover:text-gray-600 transition"
                                    >
                                        <MoreHorizontal size={20} />
                                    </button>

                                    {openPostOptions === post.id && (
                                        <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-zinc-900 rounded-xl shadow-lg border border-gray-100 dark:border-white/10 overflow-hidden z-10">
                                            {user?.username === author.username && (
                                                <button
                                                    onClick={() => handleArchivePost(post.id)}
                                                    className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 font-medium transition flex items-center gap-2"
                                                >
                                                    <Archive size={16} />
                                                    Archiver
                                                </button>
                                            )}
                                            {(user?.username === author.username || user?.role === 'admin') && (
                                                <button
                                                    onClick={() => handleDeletePost(post.id)}
                                                    className="w-full text-left px-4 py-3 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 font-medium transition flex items-center gap-2"
                                                >
                                                    <Trash2 size={16} />
                                                    Supprimer
                                                </button>
                                            )}
                                            {user?.username !== author.username && (
                                                <button
                                                    onClick={() => openReportModal('post', post.id)}
                                                    className="w-full text-left px-4 py-3 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 font-medium transition flex items-center gap-2"
                                                >
                                                    <Flag size={16} />
                                                    Signaler
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="relative group cursor-pointer" onClick={() => openComments(post)}>
                                {/* Post Content / Media */}
                                {!hasMedia ? (
                                    <div className="p-6 text-center bg-gradient-to-br from-indigo-500/10 to-purple-500/10 min-h-[200px] flex items-center justify-center">
                                        <p className="text-lg md:text-xl font-medium text-gray-800 dark:text-white max-w-md">{post.content && <ContentRenderer content={post.content} />}</p>
                                    </div>
                                ) : (
                                    <div className="bg-black flex items-center justify-center min-h-[300px] max-h-[600px]">
                                        {post.video_url ? (
                                            <video src={`${API_URL}${post.video_url}`} controls controlsList="nodownload" onClick={(e) => { e.preventDefault(); }} className="w-full max-h-[600px] object-contain" />
                                        ) : (
                                            <ImageCarousel mediaUrls={post.image_url} />
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Actions */}
                            <div className="p-4 bg-white dark:bg-black">
                                <div className="flex items-center gap-4 mb-3">
                                    <button onClick={(e) => { e.stopPropagation(); handleLike(post.id, e); }} className="hover:opacity-60 transition-opacity">
                                        <Heart size={26} className={likesCount > 0 ? "fill-red-500 text-red-500 animate-heart-burst" : "text-gray-800 dark:text-white hover:text-gray-600 dark:hover:text-gray-300"} />
                                    </button>
                                    <button onClick={(e) => { e.stopPropagation(); openComments(post); }} className="hover:opacity-60 transition-opacity">
                                        <MessageCircle size={26} className="text-gray-800 dark:text-white" />
                                    </button>
                                    <button onClick={(e) => { e.stopPropagation(); handleShare(post); }} className="hover:opacity-60 transition-opacity">
                                        <Send size={24} className="text-gray-800 dark:text-white" />
                                    </button>
                                    <button onClick={(e) => handleSavePost(post.id, e)} className="hover:opacity-60 transition-opacity ml-auto">
                                        <Bookmark size={24} className={savedPostIds.has(post.id) ? "fill-gray-900 text-gray-900 dark:fill-white dark:text-white" : "text-gray-800 dark:text-white"} />
                                    </button>
                                </div>
                                <div className="text-sm text-gray-900 dark:text-white mb-2 flex flex-col">
                                    <span className="font-bold">{likesCount} J'aime</span>
                                    {post.friend_likes_names && post.friend_likes_names.length > 0 && (
                                        <span className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                            Aimé par <span className="font-medium text-gray-900 dark:text-gray-200">{post.friend_likes_names[0]}</span>
                                            {post.friend_likes_names.length > 1 && (
                                                <> et <span className="font-medium text-gray-900 dark:text-gray-200">{post.friend_likes_names.length - 1} autre(s)</span></>
                                            )}
                                        </span>
                                    )}
                                </div>
                                {hasMedia && post.content && (
                                    <div className="text-sm">
                                        <span className="font-bold mr-1 text-gray-900 dark:text-white inline-flex items-center gap-1">{author.username}{author.is_verified && <VerifiedBadge size="sm" />}</span>{' '}
                                        <span className="text-gray-800 dark:text-gray-200 break-words">{post.content && <ContentRenderer content={post.content} />}</span>
                                    </div>
                                )}
                                {Array.isArray(post.comments) && post.comments.length > 0 && (
                                    <button onClick={(e) => { e.stopPropagation(); openComments(post); }} className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 mt-2 block">
                                        Voir les {post.comments.length} commentaires
                                    </button>
                                )}
                                <div className="text-[10px] text-gray-500 uppercase tracking-wide mt-2">
                                    {new Date(post.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                                </div>
                            </div>
                        </div>
                    )
                })}

                {loadingMore && (
                    <div className="flex justify-center p-4">
                        <Loader className="animate-spin text-gray-400" size={24} />
                    </div>
                )}

                {posts.length === 0 && !loading && (
                    <div className="text-center p-8 text-gray-500">
                        Aucune publication pour le moment. Soyez le premier à publier !
                    </div>
                )}
            </div>

            {/* ════════ STORY VIEWER (Full-Screen) ════════ */}
            {viewingStory && storyGroups[viewingStory.groupIndex] && (() => {
                const group = storyGroups[viewingStory.groupIndex]
                const story = group.stories[viewingStory.storyIndex]
                if (!story) return null

                return (
                    <div className="fixed inset-0 z-[200] bg-black flex items-center justify-center" onClick={closeStory}>
                        <div className="relative w-full h-full max-w-md mx-auto flex flex-col" onClick={e => e.stopPropagation()}>
                            {/* Progress Bars */}
                            <div className="absolute top-0 left-0 right-0 z-20 flex gap-1 p-2 pt-3">
                                {group.stories.map((_, idx) => (
                                    <div key={idx} className="flex-1 h-[3px] bg-white/30 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-white rounded-full transition-none"
                                            style={{
                                                width: idx < viewingStory.storyIndex ? '100%'
                                                    : idx === viewingStory.storyIndex ? `${storyProgress * 100}%`
                                                        : '0%'
                                            }}
                                        />
                                    </div>
                                ))}
                            </div>

                            {/* User Info */}
                            <div className="absolute top-8 left-0 right-0 z-20 flex items-center justify-between px-4">
                                <Link to={`/social/user/${group.author?.username}`} className="flex items-center gap-3" onClick={closeStory}>
                                    <div className="w-8 h-8 rounded-full overflow-hidden border border-white/50">
                                        {renderAvatar(group.author, 'w-full h-full', 'text-xs')}
                                    </div>
                                    <span className="text-white font-bold text-sm drop-shadow-md">{group.author?.username}</span>
                                    <span className="text-white/60 text-xs">
                                        {(() => {
                                            const mins = Math.floor((Date.now() - new Date(story.created_at)) / 60000)
                                            if (mins < 60) return `Il y a ${mins}m`
                                            return `Il y a ${Math.floor(mins / 60)}h`
                                        })()}
                                    </span>
                                </Link>
                                <div className="flex items-center gap-2">
                                    {group.author?.username === user?.username && (
                                        <>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleToggleHighlight(story.id) }}
                                                className={`p-2 transition-colors ${story.is_highlight ? 'text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.8)]' : 'text-white/80 hover:text-white'}`}
                                                title={story.is_highlight ? "Retirer de la une" : "Mettre à la une"}
                                            >
                                                <Star className={story.is_highlight ? 'fill-yellow-400' : ''} size={24} />
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); deleteStory(story.id) }}
                                                className="text-white/80 hover:text-white p-2"
                                            >
                                                <Trash2 size={24} />
                                            </button>
                                        </>
                                    )}
                                    <button onClick={closeStory} className="text-white/80 hover:text-white p-2">
                                        <X size={28} />
                                    </button>
                                </div>
                            </div>

                            {/* Story Media */}
                            <div className="flex-1 flex items-center justify-center relative">
                                {story.media_type === 'video' ? (
                                    <video
                                        key={story.id}
                                        src={`${API_URL}${story.media_url}`}
                                        autoPlay
                                        muted
                                        playsInline
                                        className="w-full h-full object-contain"
                                    />
                                ) : (
                                    <img
                                        key={story.id}
                                        src={`${API_URL}${story.media_url}`}
                                        alt="Story"
                                        className="w-full h-full object-contain"
                                    />
                                )}

                                {/* Left/Right touch zones */}
                                <button onClick={prevStory} className="absolute left-0 top-0 bottom-0 w-1/3 z-10" />
                                <button onClick={nextStory} className="absolute right-0 top-0 bottom-0 w-1/3 z-10" />

                                {/* Poll overlay */}
                                {(() => {
                                    const poll = storyPollData[story.id] ?? story.poll
                                    if (!poll) return null
                                    const myVote = poll.user_votes?.[user?.id]
                                    const hasVoted = myVote !== undefined || group.user_id === user?.id
                                    const totalVotes = poll.options.reduce((s, o) => s + (o.votes || 0), 0)
                                    return (
                                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[85%] max-w-[300px] z-20 backdrop-blur-xl bg-white/10 dark:bg-black/20 rounded-3xl p-5 shadow-[0_8px_32px_rgba(0,0,0,0.15)] border border-white/30 pointer-events-auto" onClick={e => e.stopPropagation()}>
                                            <div className="flex justify-center mb-3">
                                                <span className="text-3xl drop-shadow-md">📊</span>
                                            </div>
                                            <p className="text-white font-bold text-lg text-center mb-5 leading-tight drop-shadow-md">{poll.question}</p>
                                            <div className="flex flex-col gap-3">
                                                {poll.options.map((opt, i) => {
                                                    const pct = totalVotes > 0 ? Math.round((opt.votes || 0) / totalVotes * 100) : 0
                                                    const isMyVote = myVote === i
                                                    
                                                    if (hasVoted) {
                                                        return (
                                                            <div key={i} className="relative overflow-hidden rounded-2xl h-12 flex items-center shadow-inner group">
                                                                <div className="absolute inset-0 bg-black/20 dark:bg-black/40 backdrop-blur-md" />
                                                                <div 
                                                                    className={`absolute inset-y-0 left-0 transition-all duration-1000 ease-out ${isMyVote ? 'bg-gradient-to-r from-blue-500 to-indigo-500' : 'bg-white/20 dark:bg-white/10'}`} 
                                                                    style={{ width: `${pct}%` }} 
                                                                />
                                                                <div className="relative w-full flex items-center justify-between px-4 z-10">
                                                                    <span className={`text-sm font-bold truncate pr-3 ${isMyVote ? 'text-white' : 'text-white/90'}`}>
                                                                        {opt.text}
                                                                    </span>
                                                                    <div className="flex items-center gap-2 shrink-0">
                                                                        {isMyVote && <span className="w-4 h-4 rounded-full bg-white text-blue-500 flex items-center justify-center text-[10px] shadow-sm">✓</span>}
                                                                        <span className={`text-sm font-black ${isMyVote ? 'text-white' : 'text-white/70'}`}>{pct}%</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )
                                                    }
                                                    
                                                    return (
                                                        <button 
                                                            key={i} 
                                                            onClick={() => handleVotePoll(story.id, i)}
                                                            className="relative h-12 rounded-2xl overflow-hidden group hover:scale-[1.02] active:scale-[0.98] transition-all"
                                                        >
                                                            <div className="absolute inset-0 bg-white/20 dark:bg-white/10 backdrop-blur-md group-hover:bg-white/30 dark:group-hover:bg-white/20 transition-colors" />
                                                            <div className="absolute inset-0 border border-white/40 dark:border-white/20 rounded-2xl" />
                                                            <div className="relative w-full h-full flex items-center justify-center px-4">
                                                                <span className="text-white font-bold text-sm tracking-wide drop-shadow-md truncate">{opt.text}</span>
                                                            </div>
                                                        </button>
                                                    )
                                                })}
                                            </div>
                                            {hasVoted && (
                                                <div className="mt-4 flex justify-center">
                                                    <span className="px-3 py-1 rounded-full bg-black/20 backdrop-blur-md text-white/80 text-xs font-medium border border-white/10">
                                                        {totalVotes} vote{totalVotes !== 1 ? 's' : ''}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    )
                                })()}

                                {/* Reply Input (only if not our own story) */}
                                {user?.id !== group.user_id ? (
                                    <div className="absolute bottom-6 left-4 right-4 z-20 flex items-center gap-2">
                                        <input
                                            type="text"
                                            value={storyReplyInput}
                                            onChange={e => setStoryReplyInput(e.target.value)}
                                            placeholder="Répondre à cette story..."
                                            className="flex-1 bg-black/40 backdrop-blur-md border border-white/20 text-white placeholder-white/70 rounded-full px-4 py-2.5 text-sm focus:outline-none focus:bg-black/60 transition"
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && storyReplyInput.trim()) {
                                                    handleSendStoryReply(story.id, storyReplyInput);
                                                }
                                            }}
                                        />
                                        {storyReplyInput.trim() ? (
                                            <button onClick={() => handleSendStoryReply(story.id, storyReplyInput)} className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center shrink-0">
                                                <Send size={18} className="text-white" />
                                            </button>
                                        ) : (
                                            <>
                                                <button onClick={() => handleReactToStory(story.id, '❤️')} className="text-2xl hover:scale-125 active:scale-90 transition-transform shrink-0 drop-shadow-md">❤️</button>
                                                <button onClick={() => handleReactToStory(story.id, '😂')} className="text-2xl hover:scale-125 active:scale-90 transition-transform shrink-0 drop-shadow-md">😂</button>
                                                <button onClick={() => handleReactToStory(story.id, '🔥')} className="text-2xl hover:scale-125 active:scale-90 transition-transform shrink-0 drop-shadow-md">🔥</button>
                                            </>
                                        )}
                                    </div>
                                ) : (
                                    /* Bouton viewers pour le propriétaire */
                                    <button
                                        onClick={(e) => { e.stopPropagation(); fetchViewers(story.id); }}
                                        className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 bg-black/50 backdrop-blur-md border border-white/20 text-white px-5 py-2.5 rounded-full text-sm font-semibold hover:bg-black/70 transition"
                                    >
                                        <Eye size={18} />
                                        Vues
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Desktop nav arrows */}
                        <button onClick={prevStory} className="hidden md:flex absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/20 rounded-full items-center justify-center text-white hover:bg-white/30 transition z-30">
                            <ChevronLeft size={24} />
                        </button>
                        <button onClick={nextStory} className="hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/20 rounded-full items-center justify-center text-white hover:bg-white/30 transition z-30">
                            <ChevronRight size={24} />
                        </button>
                    </div>
                )
            })()
            }

            {/* ════════ STORY VIEWERS PANEL ════════ */}
            {showViewers && (
                <div className="fixed inset-0 z-[250] flex items-end justify-center" onClick={() => setShowViewers(false)}>
                    <div className="w-full max-w-md bg-white dark:bg-zinc-950 rounded-t-3xl shadow-2xl max-h-[70vh] flex flex-col" onClick={e => e.stopPropagation()}>
                        {/* Handle */}
                        <div className="flex justify-center pt-3 pb-1">
                            <div className="w-10 h-1 rounded-full bg-gray-300 dark:bg-zinc-700" />
                        </div>
                        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 dark:border-white/5">
                            <h3 className="font-bold text-gray-900 dark:text-white text-lg">
                                {viewersData ? `${viewersData.total_views} vue${viewersData.total_views !== 1 ? 's' : ''}` : 'Vues'}
                            </h3>
                            <button onClick={() => setShowViewers(false)} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="overflow-y-auto flex-1 bg-white dark:bg-zinc-950 px-2 sm:px-4 py-2">
                            {viewersLoading ? (
                                <div className="flex justify-center py-12">
                                    <Loader className="animate-spin text-gray-400" size={28} />
                                </div>
                            ) : !viewersData || viewersData.viewers.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                                    <Eye size={40} className="mb-3 opacity-40" />
                                    <p className="text-sm">Personne n'a encore vu cette story</p>
                                </div>
                            ) : (
                                <div className="space-y-1">
                                    {(() => {
                                        // 1. Sort viewers: (Has replied/reacted) > (Is Friend) > (Everything else)
                                        const sortedViewers = [...viewersData.viewers].sort((a, b) => {
                                            const aInteracted = a.reaction || a.replies.length > 0;
                                            const bInteracted = b.reaction || b.replies.length > 0;
                                            
                                            // Put interactors first
                                            if (aInteracted && !bInteracted) return -1;
                                            if (!aInteracted && bInteracted) return 1;

                                            // Put friends next
                                            const aIsFriend = allUsers.some(u => u.id === a.user.id);
                                            const bIsFriend = allUsers.some(u => u.id === b.user.id);

                                            if (aIsFriend && !bIsFriend) return -1;
                                            if (!aIsFriend && bIsFriend) return 1;

                                            // Fallback to viewed_at (already sorted by backend, but keep it stable)
                                            return new Date(b.viewed_at) - new Date(a.viewed_at);
                                        });

                                        return sortedViewers.map(v => {
                                            const avatarSrc = v.user.avatar ? `${API_URL}${v.user.avatar}` : v.user.google_avatar
                                            const isFriend = allUsers.some(u => u.id === v.user.id);

                                            return (
                                                <div key={v.user.id} className="p-3 rounded-2xl hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                                                    <div className="flex items-center gap-3">
                                                        <div className="relative">
                                                            <div className={`w-12 h-12 rounded-full overflow-hidden shrink-0 bg-gray-200 dark:bg-zinc-800 ${isFriend ? 'ring-2 ring-green-500 ring-offset-2 ring-offset-white dark:ring-offset-zinc-950' : ''}`}>
                                                                {avatarSrc
                                                                    ? <img src={avatarSrc} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                                                    : <div className="w-full h-full flex items-center justify-center text-sm font-bold text-gray-500">{v.user.username?.[0]?.toUpperCase()}</div>
                                                                }
                                                            </div>
                                                            {/* Reaction Badge */}
                                                            {v.reaction && (
                                                                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-white dark:bg-zinc-800 rounded-full flex items-center justify-center text-sm shadow-sm ring-2 ring-white dark:ring-zinc-950 animate-in zoom-in">
                                                                    {v.reaction}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="flex-1 min-w-0 flex flex-col justify-center">
                                                            <div className="flex items-center gap-1.5">
                                                                <span className="font-bold text-[15px] text-gray-900 dark:text-white truncate max-w-[140px]">
                                                                    {v.user.username}
                                                                </span>
                                                                {v.user.is_verified && <VerifiedBadge size="sm" />}
                                                                {isFriend && (
                                                                    <span className="px-1.5 py-0.5 rounded-md bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400 text-[10px] font-bold uppercase tracking-wider shrink-0">
                                                                        Ami
                                                                    </span>
                                                                )}
                                                            </div>
                                                            {/* We don't need text for reaction since it's a badge now, but we keep Replies inline later */}
                                                        </div>
                                                        <button
                                                            onClick={() => openReplyDM(v.user.id)}
                                                            className="shrink-0 w-8 h-8 rounded-full bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-zinc-700 hover:text-blue-500 transition flex items-center justify-center"
                                                            title="Envoyer un message"
                                                        >
                                                            <Send size={14} className="-ml-0.5 mt-0.5" />
                                                        </button>
                                                    </div>
                                                    {/* Text Replies */}
                                                    {v.replies.length > 0 && (
                                                        <div className="mt-3 ml-[60px] flex flex-col gap-2">
                                                            {v.replies.map(r => (
                                                                <div key={r.id} className="bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 rounded-2xl rounded-tl-sm px-4 py-2.5 text-sm text-gray-800 dark:text-gray-200 shadow-sm relative before:absolute before:-left-2 before:top-0 before:w-2 before:h-2 before:border-r before:border-b before:border-blue-100 dark:before:border-blue-500/20 before:bg-blue-50 dark:before:bg-blue-500/10">
                                                                    {r.content}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            )
                                        })
                                    })()}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ════════ COMMENTS MODAL (Split View) ════════ */}
            {
                activeCommentPost && (
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
                                    <img src={`${API_URL}${activeCommentPost.image_url}`} alt="Post" className="w-full h-full max-h-[90vh] object-contain" />
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
                                            {renderAvatar(activeCommentPost.author, 'w-10 h-10', 'text-xs')}
                                        </div>
                                        <span className="font-bold text-gray-900 dark:text-gray-100 group-hover:text-blue-500 transition-colors flex items-center gap-1">
                                            {activeCommentPost.author?.username}
                                            {activeCommentPost.author?.is_verified && <VerifiedBadge size="sm" />}
                                        </span>
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
                                                {renderAvatar(activeCommentPost.author, 'w-8 h-8', 'text-xs')}
                                            </Link>
                                            <div className="flex-1 text-sm text-gray-800 dark:text-gray-200">
                                                <Link to={`/social/user/${activeCommentPost.author?.username}`} onClick={() => setActiveCommentPost(null)} className="font-bold mr-1 hover:underline inline-flex items-center gap-1">{activeCommentPost.author?.username}{activeCommentPost.author?.is_verified && <VerifiedBadge size="sm" />}</Link>{' '}
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
                                                        {renderAvatar(authorUser, 'w-8 h-8', 'text-xs')}
                                                    </Link>
                                                    <div className="flex-1 text-sm text-gray-800 dark:text-gray-200 border-b border-gray-100/50 dark:border-white/5 pb-3">
                                                        <Link to={`/social/user/${authorUser?.username}`} onClick={() => setActiveCommentPost(null)} className="font-bold mr-1 hover:underline inline-flex items-center gap-1">{authorUser?.username}{authorUser?.is_verified && <VerifiedBadge size="sm" />}</Link>{' '}
                                                        <span className="whitespace-pre-wrap leading-relaxed break-words">{comment.content && <ContentRenderer content={comment.content} />}</span>
                                                        <div className="flex items-center gap-4 mt-1 text-[11px] text-gray-500 font-medium">
                                                            <span>{(() => {
                                                                const mins = Math.floor((Date.now() - new Date(comment.created_at)) / 60000)
                                                                if (mins < 60) return `${mins} min`
                                                                if (mins < 1440) return `${Math.floor(mins / 60)} h`
                                                                return `${Math.floor(mins / 1440)} j`
                                                            })()}</span>
                                                            {authorUser?.username !== user?.username && (
                                                                <button onClick={() => openReportModal('comment', comment.id)} className="hover:text-red-500 dark:hover:text-red-400 transition-colors">Signaler</button>
                                                            )}
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
                )
            }

            {/* ════════ SHARE MODAL ════════ */}
            {
                shareModalPost && (
                    <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4" onClick={() => setShareModalPost(null)}>
                        <div
                            className="bg-white dark:bg-zinc-900 w-full sm:max-w-md h-[80vh] sm:h-[600px] sm:rounded-2xl flex flex-col overflow-hidden shadow-2xl relative animate-in slide-in-from-bottom"
                            onClick={e => e.stopPropagation()}
                        >
                            {/* Header */}
                            <div className="flex items-center justify-center px-4 py-3 border-b border-gray-100 dark:border-white/10 shrink-0 relative">
                                <span className="font-bold text-gray-900 dark:text-white text-base">Partager à</span>
                                <button onClick={() => setShareModalPost(null)} className="absolute right-4 p-2 text-gray-400 hover:text-gray-600 transition">
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Search Input */}
                            <div className="px-4 py-3 border-b border-gray-100 dark:border-white/10 shrink-0 flex items-center gap-2">
                                <span className="font-bold flex items-center gap-2 text-gray-900 dark:text-white text-sm shrink-0">À <Search size={14} className="text-gray-500" /></span>
                                <div className="flex-1 flex flex-wrap gap-2 items-center min-h-[32px]">
                                    {selectedShareUsers.map(u => (
                                        <button
                                            key={u.id}
                                            onClick={() => setSelectedShareUsers(prev => prev.filter(x => x.id !== u.id))}
                                            className="bg-blue-100/80 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-sm px-3 py-1 font-medium rounded-full flex items-center gap-1.5 hover:bg-blue-200 dark:hover:bg-blue-800/60 transition"
                                        >
                                            {u.username} <X size={14} />
                                        </button>
                                    ))}
                                    <input
                                        type="text"
                                        placeholder={selectedShareUsers.length === 0 ? "Rechercher des personnes..." : ""}
                                        value={shareSearchQuery}
                                        onChange={e => setShareSearchQuery(e.target.value)}
                                        className="flex-1 bg-transparent min-w-[120px] text-sm focus:outline-none dark:text-white font-medium placeholder-gray-400"
                                    />
                                </div>
                            </div>

                            {/* Search Results List */}
                            <div className="flex-1 overflow-y-auto px-2 py-2 flex flex-col custom-scrollbar">
                                {allUsers.length > 0 && shareSearchQuery.length === 0 && selectedShareUsers.length === 0 && (
                                    <span className="px-2 text-xs font-bold text-gray-500 dark:text-gray-400 mt-2 mb-2 uppercase tracking-wider">
                                        Suggérés
                                    </span>
                                )}
                                {allUsers
                                    .filter(u => u.username.toLowerCase().includes(shareSearchQuery.toLowerCase()))
                                    .filter(u => !selectedShareUsers.some(su => su.id === u.id))
                                    .map(u => (
                                        <button
                                            key={u.id}
                                            onClick={() => {
                                                setSelectedShareUsers(prev => [...prev, u]);
                                                setShareSearchQuery('');
                                            }}
                                            className="flex items-center justify-between w-full p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl transition group"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="border border-gray-200 dark:border-white/10 rounded-full overflow-hidden">
                                                    {renderAvatar(u, 'w-11 h-11', 'text-sm')}
                                                </div>
                                                <span className="font-bold text-sm text-gray-900 dark:text-white">{u.username}</span>
                                            </div>
                                            <div className="w-5 h-5 rounded-full border border-gray-300 dark:border-gray-600 mr-2 group-hover:border-blue-400 transition-colors" />
                                        </button>
                                    ))
                                }
                                {allUsers.filter(u => u.username.toLowerCase().includes(shareSearchQuery.toLowerCase()) && !selectedShareUsers.some(su => su.id === u.id)).length === 0 && (
                                    <div className="p-8 text-center text-gray-400 text-sm font-medium">Aucun utilisateur trouvé.</div>
                                )}
                            </div>

                            {/* Footer Send */}
                            {selectedShareUsers.length > 0 && (
                                <div className="p-4 border-t border-gray-100 dark:border-white/10 shrink-0 bg-white dark:bg-zinc-950 flex flex-col gap-3 animate-in slide-in-from-bottom-4">
                                    <input
                                        type="text"
                                        placeholder="Écrire un message (optionnel)..."
                                        value={shareMessage}
                                        onChange={e => setShareMessage(e.target.value)}
                                        className="w-full bg-gray-100 dark:bg-zinc-800 rounded-full px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-white transition-all shadow-inner"
                                    />
                                    <button
                                        onClick={executeShare}
                                        disabled={sharingLoading}
                                        className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 rounded-xl transition disabled:opacity-50 text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
                                    >
                                        {sharingLoading ? <Loader size={18} className="animate-spin" /> : 'Envoyer séparément'}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )
            }

            {/* ════════ REPORT MODAL ════════ */}
            {reportModalData && (
                <div className="fixed inset-0 z-[300] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in" onClick={() => setReportModalData(null)}>
                    <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl scale-100 animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-white/10">
                            <h3 className="font-bold text-gray-900 dark:text-white text-lg flex items-center gap-2">
                                <Flag size={20} className="text-red-500" />
                                Signaler ce contenu
                            </h3>
                            <button onClick={() => setReportModalData(null)} className="text-gray-400 hover:text-gray-600 transition">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-5">
                            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                                Pourquoi souhaitez-vous signaler ce {reportModalData.targetType === 'post' ? 'post' : reportModalData.targetType === 'comment' ? 'commentaire' : 'contenu'} ? 
                                Le signalement est anonyme et sera examiné par nos modérateurs.
                            </p>
                            
                            <div className="flex flex-col gap-2 mb-4">
                                {['Spam ou trompeur', 'Contenu inapproprié ou explicite', 'Harcèlement ou intimidation', 'Fausse information', 'Autre'].map((reason, idx) => (
                                    <label key={idx} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer transition">
                                        <input 
                                            type="radio" 
                                            name="report_reason" 
                                            value={reason} 
                                            checked={reportReason === reason}
                                            onChange={(e) => setReportReason(e.target.value)}
                                            className="text-red-500 focus:ring-red-500"
                                        />
                                        <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{reason}</span>
                                    </label>
                                ))}
                            </div>
                            
                            <button
                                onClick={submitReport}
                                disabled={!reportReason || isReporting}
                                className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl transition disabled:opacity-50 text-sm flex items-center justify-center shadow-lg"
                            >
                                {isReporting ? <Loader size={18} className="animate-spin" /> : 'Envoyer le signalement'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
