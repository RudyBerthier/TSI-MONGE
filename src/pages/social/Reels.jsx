import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Heart, MessageCircle, Share2, Music, ChevronLeft, Volume2, VolumeX } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

const VideoPlayer = ({ post, isActive, onPlayToggle, isMuted, onMuteToggle, onLike, onShare, onComment }) => {
    const videoRef = useRef(null)
    const [isPlaying, setIsPlaying] = useState(false)
    const [progress, setProgress] = useState(0)

    // Autoplay logic
    useEffect(() => {
        if (!videoRef.current) return

        // Play video if active, otherwise pause and reset to 0
        if (isActive) {
            videoRef.current.currentTime = 0
            videoRef.current.play().then(() => setIsPlaying(true)).catch(err => {
                console.warn('Autoplay prevented:', err)
                setIsPlaying(false) // Needs interaction
            })
        } else {
            videoRef.current.pause()
            setIsPlaying(false)
        }
    }, [isActive])

    // Mute sync
    useEffect(() => {
        if (videoRef.current) {
            videoRef.current.muted = isMuted
        }
    }, [isMuted])

    const handleTimeUpdate = () => {
        if (videoRef.current) {
            setProgress((videoRef.current.currentTime / videoRef.current.duration) * 100)
        }
    }

    const handleVideoClick = () => {
        if (!videoRef.current) return
        if (isPlaying) {
            videoRef.current.pause()
            setIsPlaying(false)
        } else {
            videoRef.current.play().then(() => setIsPlaying(true))
        }
    }

    const formatDate = (dateString) => {
        return formatDistanceToNow(new Date(dateString), { addSuffix: true, locale: fr })
            .replace('environ ', '')
    }

    return (
        <div className="relative w-full h-full bg-black snap-start snap-always shrink-0 overflow-hidden group">
            {/* Video Element */}
            <video
                ref={videoRef}
                src={post.videoUrl}
                className="w-full h-full object-contain md:object-cover"
                loop
                playsInline
                muted={isMuted}
                onClick={handleVideoClick}
                onTimeUpdate={handleTimeUpdate}
            />

            {/* Play/Pause Overlay Indicator (shows briefly when clicked) */}
            {!isPlaying && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-16 h-16 bg-black/40 backdrop-blur-sm rounded-full flex items-center justify-center p-4">
                        <svg className="w-8 h-8 text-white ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                    </div>
                </div>
            )}

            {/* Header overlay */}
            <div className="absolute top-0 left-0 right-0 p-4 md:p-6 flex justify-between items-start z-10 pointer-events-none bg-gradient-to-b from-black/60 to-transparent">
                <span className="font-bold text-lg text-white drop-shadow-md">Reels</span>
            </div>

            {/* Bottom overlay: Info & Progress */}
            <div className="absolute bottom-0 left-0 right-0 pt-32 pb-6 md:pb-8 px-4 flex flex-col justify-end bg-gradient-to-t from-black/80 via-black/40 to-transparent z-10 pointer-events-none">

                {/* Progress Bar */}
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
                    <div
                        className="h-full bg-white transition-all duration-100 ease-linear"
                        style={{ width: `${progress}%` }}
                    />
                </div>

                <div className="flex items-end justify-between pointer-events-auto">
                    {/* Post Info Container */}
                    <div className="flex-1 pr-16">
                        <div className="flex items-center gap-3 mb-3">
                            <Link to={`/social/user/${post.author?.username}`} className="w-10 h-10 rounded-full overflow-hidden border-2 border-white/50 shrink-0">
                                {post.author?.avatar ? (
                                    <img src={`${SOCKET_URL}${post.author.avatar}`} alt="" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm">
                                        {post.author?.username?.[0]?.toUpperCase()}
                                    </div>
                                )}
                            </Link>
                            <div className="flex flex-col">
                                <Link to={`/social/user/${post.author?.username}`} className="text-white font-semibold text-[15px] hover:underline shadow-sm drop-shadow-md">
                                    {post.author?.username}
                                </Link>
                                <span className="text-white/70 text-[11px] font-medium">{formatDate(post.createdAt)}</span>
                            </div>
                        </div>

                        <p className="text-white text-[15px] max-w-sm mb-3 drop-shadow-md leading-snug">
                            {post.content}
                        </p>

                        <div className="flex items-center gap-2 text-white/90 bg-black/20 backdrop-blur-sm px-3 py-1.5 rounded-full w-max mt-2">
                            <Music size={12} className="shrink-0" />
                            <div className="overflow-hidden w-32 relative">
                                <p className="text-[12px] font-medium animate-marquee whitespace-nowrap">
                                    Son original - {post.author?.username}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Floating Action Buttons (Right Side) */}
            <div className="absolute bottom-24 md:bottom-32 right-2 md:right-4 flex flex-col items-center gap-6 z-20 pointer-events-auto">

                {/* Like */}
                <button
                    onClick={() => onLike(post.id)}
                    className="flex flex-col items-center gap-1 group"
                >
                    <div className={`p-3 rounded-full bg-black/20 backdrop-blur-sm group-hover:bg-black/40 transition-colors ${post.isLiked ? 'text-red-500' : 'text-white'}`}>
                        <Heart size={28} fill={post.isLiked ? 'currentColor' : 'none'} className={post.isLiked ? 'scale-110 drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]' : ''} />
                    </div>
                    <span className="text-white text-[13px] font-semibold drop-shadow-md">{post.likesCount || 0}</span>
                </button>

                {/* Comment */}
                <button
                    className="flex flex-col items-center gap-1 group"
                    onClick={() => onComment(post)}
                >
                    <div className="p-3 rounded-full bg-black/20 backdrop-blur-sm group-hover:bg-black/40 transition-colors text-white">
                        <MessageCircle size={28} />
                    </div>
                    <span className="text-white text-[13px] font-semibold drop-shadow-md">{post.commentsCount || 0}</span>
                </button>

                {/* Share */}
                <button
                    className="flex flex-col items-center gap-1 group"
                    onClick={() => onShare(post)}
                >
                    <div className="p-3 rounded-full bg-black/20 backdrop-blur-sm group-hover:bg-black/40 transition-colors text-white">
                        <Share2 size={28} />
                    </div>
                    <span className="text-white text-[13px] font-semibold drop-shadow-md">Partager</span>
                </button>

                {/* Mute Toggle */}
                <button
                    className="p-3 mt-4 rounded-full bg-black/20 backdrop-blur-sm text-white"
                    onClick={onMuteToggle}
                >
                    {isMuted ? <VolumeX size={24} /> : <Volume2 size={24} />}
                </button>

                {/* Avatar Disc (Spinning Music Record) */}
                <div className="w-12 h-12 rounded-full border-[10px] border-neutral-800 animate-spin-slow bg-neutral-900 mt-4 overflow-hidden shadow-[0_0_15px_rgba(0,0,0,0.5)]">
                    {post.author?.avatar ? (
                        <img src={`${SOCKET_URL}${post.author.avatar}`} alt="" className="w-full h-full object-cover rounded-full" />
                    ) : (
                        <div className="w-full h-full bg-gradient-to-br from-indigo-500 to-purple-500 text-[8px] flex items-center justify-center text-white font-bold rounded-full">
                            {post.author?.username?.[0]?.toUpperCase()}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

export default function Reels() {
    const [reels, setReels] = useState([])
    const [loading, setLoading] = useState(true)
    const [page, setPage] = useState(1)
    const [hasMore, setHasMore] = useState(true)
    const [activeReelIndex, setActiveReelIndex] = useState(0)
    const [isGlobalMuted, setIsGlobalMuted] = useState(true)

    const containerRef = useRef(null)
    const navigate = useNavigate()

    const fetchReels = async (pageNum = 1) => {
        try {
            if (pageNum === 1) setLoading(true)
            const token = localStorage.getItem('token')
            const res = await fetch(`/api/users/reels?page=${pageNum}&limit=5`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })
            if (!res.ok) throw new Error('Failed to fetch reels')
            const data = await res.json()

            const formattedData = data.map(p => ({
                id: p.id,
                content: p.content,
                videoUrl: `${SOCKET_URL}${p.video_url}`,
                author: p.author,
                createdAt: p.created_at,
                likesCount: p.likes_count,
                commentsCount: p.comments_count,
                isLiked: p.is_liked
            }))

            if (pageNum === 1) {
                setReels(formattedData)
            } else {
                setReels(prev => [...prev, ...formattedData])
            }
            setHasMore(data.length === 5)
        } catch (error) {
            console.error(error)
        } finally {
            if (pageNum === 1) setLoading(false)
        }
    }

    useEffect(() => {
        fetchReels(1)
    }, [])

    // Setup Intersection Observer to detect which video is active
    useEffect(() => {
        if (!containerRef.current) return

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const index = Number(entry.target.getAttribute('data-index'))
                    setActiveReelIndex(index)

                    // If we are near the end, fetch more
                    if (index >= reels.length - 2 && hasMore && !loading) {
                        const nextPage = page + 1
                        setPage(nextPage)
                        fetchReels(nextPage)
                    }
                }
            })
        }, {
            root: containerRef.current,
            threshold: 0.6 // Trigger when 60% of the video is in view
        })

        const videoElements = containerRef.current.querySelectorAll('.reel-container')
        videoElements.forEach(el => observer.observe(el))

        return () => {
            videoElements.forEach(el => observer.unobserve(el))
            observer.disconnect()
        }
    }, [reels, hasMore, loading, page])

    const handleLike = async (postId) => {
        // Optimistic UI update
        setReels(prev => prev.map(p => {
            if (p.id === postId) {
                return {
                    ...p,
                    isLiked: !p.isLiked,
                    likesCount: p.isLiked ? p.likesCount - 1 : p.likesCount + 1
                }
            }
            return p
        }))

        try {
            const res = await fetch(`/api/users/posts/${postId}/like`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            })
            if (!res.ok) throw new Error('Failed to like post')
        } catch (err) {
            console.error(err)
            // Revert optimistic update (omitted for brevity)
        }
    }

    return (
        <div className="flex h-screen bg-black overflow-hidden relative selection:bg-blue-500/30">

            {/* Back button layer */}
            <button
                onClick={() => navigate(-1)}
                className="absolute top-4 left-4 z-50 p-2 rounded-full bg-black/40 backdrop-blur-sm text-white hover:bg-black/60 transition-colors"
            >
                <ChevronLeft size={24} />
            </button>

            {/* Main Snap Scroll Container */}
            {loading && page === 1 ? (
                <div className="flex-1 flex items-center justify-center">
                    <div className="animate-spin w-8 h-8 border-2 border-white border-t-transparent rounded-full" />
                </div>
            ) : reels.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-white">
                    <Music size={48} className="text-white/30 mb-4" />
                    <h2 className="text-xl font-bold">Aucun Reel trouvé</h2>
                    <p className="text-white/60">Publiez une vidéo pour commencer</p>
                </div>
            ) : (
                <div
                    ref={containerRef}
                    className="flex-1 h-full w-full max-w-[600px] mx-auto overflow-y-scroll snap-y snap-mandatory scroll-smooth hide-scrollbar"
                >
                    {reels.map((reel, index) => (
                        <div
                            key={`${reel.id}-${index}`}
                            data-index={index}
                            className="reel-container w-full h-full"
                        >
                            <VideoPlayer
                                post={reel}
                                isActive={index === activeReelIndex}
                                isMuted={isGlobalMuted}
                                onMuteToggle={() => setIsGlobalMuted(!isGlobalMuted)}
                                onLike={handleLike}
                                onComment={(p) => navigate(`/social/post/${p.id}`)}
                                onShare={() => { }}
                            />
                        </div>
                    ))}
                </div>
            )}

            {/* Global generic animations */}
            <style dangerouslySetInnerHTML={{
                __html: `
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none; /* IE and Edge */
          scrollbar-width: none; /* Firefox */
        }
        @keyframes marquee {
          0% { transform: translateX(100%); }
          100% { transform: translateX(-150%); }
        }
        .animate-marquee {
          animation: marquee 5s linear infinite;
        }
        .animate-spin-slow {
          animation: spin 4s linear infinite;
        }
      `}} />
        </div>
    )
}
