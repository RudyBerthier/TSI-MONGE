import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Heart, UserPlus, MessageCircle, Loader, CheckCheck, AtSign, ChevronDown } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { VerifiedBadge } from '../../components/VerifiedBadge'

const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:3001' : '')
const PAGE_SIZE = 20

export function Notifications() {
    const { user } = useAuth()
    const [notifications, setNotifications] = useState([])
    const [loading, setLoading] = useState(true)
    const [loadingMore, setLoadingMore] = useState(false)
    const [hasMore, setHasMore] = useState(false)
    const [offset, setOffset] = useState(0)

    useEffect(() => {
        fetchNotifications(0, true).then(() => {
            // Marquer tout comme lu automatiquement à l'ouverture de la page
            fetch('/api/users/notifications/read-all', {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            }).catch(() => {})
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
        })
    }, [])

    const fetchNotifications = async (currentOffset = 0, reset = false) => {
        try {
            if (currentOffset === 0) setLoading(true)
            else setLoadingMore(true)

            const res = await fetch(`/api/users/notifications?limit=${PAGE_SIZE}&offset=${currentOffset}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            })
            if (res.ok) {
                const data = await res.json()
                // If backend doesn't support pagination it returns all — handle both cases
                const items = Array.isArray(data) ? data : data.notifications ?? []
                if (reset) {
                    setNotifications(items)
                } else {
                    setNotifications(prev => [...prev, ...items])
                }
                setHasMore(items.length === PAGE_SIZE)
                setOffset(currentOffset + items.length)
            }
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
            setLoadingMore(false)
        }
    }

    const loadMore = () => fetchNotifications(offset, false)

    const markAllRead = async () => {
        try {
            await fetch('/api/users/notifications/read-all', {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            })
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
        } catch (err) {
            console.error(err)
        }
    }

    const markRead = async (id) => {
        try {
            await fetch(`/api/users/notifications/${id}/read`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            })
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
        } catch (err) {
            console.error(err)
        }
    }

    const timeAgo = (dateStr) => {
        const diff = Date.now() - new Date(dateStr).getTime()
        const mins = Math.floor(diff / 60000)
        if (mins < 1) return 'À l\'instant'
        if (mins < 60) return `${mins}min`
        const hours = Math.floor(mins / 60)
        if (hours < 24) return `${hours}h`
        const days = Math.floor(hours / 24)
        if (days < 7) return `${days}j`
        return `${Math.floor(days / 7)}sem`
    }

    // ─── Date grouping ──────────────────────────────────────────────
    const getGroup = (dateStr) => {
        const now = new Date()
        const d = new Date(dateStr)
        const diffMs = now - d
        const diffDays = diffMs / (1000 * 60 * 60 * 24)

        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        const yesterdayStart = new Date(todayStart - 86400000)

        if (d >= todayStart) return "Aujourd'hui"
        if (d >= yesterdayStart) return 'Hier'
        if (diffDays < 7) return '7 derniers jours'
        if (diffDays < 30) return '30 derniers jours'
        return 'Plus ancien'
    }

    const GROUP_ORDER = ["Aujourd'hui", 'Hier', '7 derniers jours', '30 derniers jours', 'Plus ancien']

    const grouped = notifications.reduce((acc, notif) => {
        const g = getGroup(notif.created_at)
        if (!acc[g]) acc[g] = []
        acc[g].push(notif)
        return acc
    }, {})

    // ─── Icon helpers ────────────────────────────────────────────────
    const getIcon = (type, emoji) => {
        if (type === 'story_reaction') return <span className="text-[11px] leading-none">{emoji || '❤️'}</span>
        if (type === 'story_reply') return <MessageCircle size={14} className="text-sky-400" />
        switch (type) {
            case 'follow': return <UserPlus size={14} className="text-blue-500" />
            case 'like': return <Heart size={14} className="text-red-500 fill-red-500" />
            case 'comment': return <MessageCircle size={14} className="text-green-500" />
            case 'mention': return <AtSign size={14} className="text-purple-500" />
            default: return <Heart size={14} className="text-gray-400" />
        }
    }

    const getIconBg = (type) => {
        switch (type) {
            case 'follow': return 'bg-blue-100 dark:bg-blue-900/30'
            case 'like': return 'bg-red-100 dark:bg-red-900/30'
            case 'comment': return 'bg-green-100 dark:bg-green-900/30'
            case 'mention': return 'bg-purple-100 dark:bg-purple-900/30'
            case 'story_reaction': return 'bg-orange-100 dark:bg-orange-900/30'
            case 'story_reply': return 'bg-sky-100 dark:bg-sky-900/30'
            default: return 'bg-gray-100 dark:bg-neutral-800'
        }
    }

    const renderAvatar = (fromUser) => {
        if (!fromUser) return <div className="w-11 h-11 rounded-full bg-gray-200 dark:bg-neutral-700" />
        const url = fromUser.avatar ? `${API_URL}${fromUser.avatar}` : fromUser.google_avatar
        if (url) return <img src={url} alt="" className="w-11 h-11 rounded-full object-cover" loading="lazy" referrerPolicy="no-referrer" />
        return (
            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-sm">
                {fromUser.username?.[0]?.toUpperCase()}
            </div>
        )
    }

    const renderNotif = (notif) => (
        <Link
            key={notif.id}
            to={notif.from_user ? `/social/user/${notif.from_user.username}` : '/social/notifications'}
            className={`flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-gray-50 dark:hover:bg-neutral-900 ${!notif.is_read ? 'bg-blue-50/50 dark:bg-blue-950/20' : ''}`}
        >
            {/* Avatar + type icon */}
            <div className="relative shrink-0">
                {renderAvatar(notif.from_user)}
                <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center border-2 border-white dark:border-black ${getIconBg(notif.type)}`}>
                    {getIcon(notif.type, notif.message)}
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-900 dark:text-white leading-snug">
                    <span className="font-bold inline-flex items-center gap-1">{notif.from_user?.username || 'Quelqu\'un'}{notif.from_user?.is_verified && <VerifiedBadge size="sm" />}</span>
                    {' '}
                    {notif.type === 'follow' && 's\'est abonné(e) à votre profil'}
                    {notif.type === 'like' && 'a aimé votre publication'}
                    {notif.type === 'comment' && 'a commenté votre publication'}
                    {notif.type === 'mention' && 'vous a mentionné dans une publication'}
                    {notif.type === 'story_reaction' && <>a réagi à votre story <span className="text-base">{notif.message}</span></>}
                    {notif.type === 'story_reply' && <><span className="text-gray-500 dark:text-gray-400"> a répondu à votre story : </span><span className="italic">"{notif.message?.slice(0, 40)}{notif.message?.length > 40 ? '…' : ''}"</span></>}
                </p>
                <span className="text-xs text-gray-400 dark:text-gray-500">{timeAgo(notif.created_at)}</span>
            </div>

            {/* Unread dot */}
            {!notif.is_read && (
                <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0" />
            )}
        </Link>
    )

    const unreadCount = notifications.filter(n => !n.is_read).length

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center min-h-[60vh]">
                <Loader className="animate-spin text-gray-400" size={32} />
            </div>
        )
    }

    return (
        <div className="max-w-2xl mx-auto w-full pb-24 md:pb-8">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-gray-200 dark:border-white/10 bg-white dark:bg-black sticky top-[calc(3.5rem+env(safe-area-inset-top))] z-10">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Notifications</h2>
                {unreadCount > 0 && (
                    <button
                        onClick={markAllRead}
                        className="flex items-center gap-1.5 text-blue-500 text-sm font-medium hover:text-blue-400 transition-colors"
                    >
                        <CheckCheck size={16} />
                        Tout lire
                    </button>
                )}
            </div>

            {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 px-4">
                    <div className="w-20 h-20 rounded-full bg-gray-100 dark:bg-neutral-800 flex items-center justify-center mb-4">
                        <Heart size={32} className="text-gray-300 dark:text-gray-600" />
                    </div>
                    <p className="text-gray-500 dark:text-gray-400 font-medium">Aucune notification</p>
                    <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Les likes, abonnements et mentions apparaîtront ici</p>
                </div>
            ) : (
                <>
                    {GROUP_ORDER.filter(g => grouped[g]?.length > 0).map(groupName => (
                        <div key={groupName}>
                            {/* Group header */}
                            <div className="px-4 py-2 bg-gray-50 dark:bg-neutral-950 border-b border-gray-100 dark:border-white/5">
                                <span className="text-[13px] font-semibold text-gray-500 dark:text-gray-400">{groupName}</span>
                            </div>
                            {/* Group items */}
                            <div className="divide-y divide-gray-100 dark:divide-white/5">
                                {grouped[groupName].map(renderNotif)}
                            </div>
                        </div>
                    ))}

                    {/* Voir plus */}
                    {hasMore && (
                        <div className="flex justify-center py-6">
                            <button
                                onClick={loadMore}
                                disabled={loadingMore}
                                className="flex items-center gap-2 px-5 py-2.5 rounded-full border border-gray-200 dark:border-white/10 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 active:scale-95 transition disabled:opacity-50"
                            >
                                {loadingMore ? (
                                    <Loader size={15} className="animate-spin" />
                                ) : (
                                    <ChevronDown size={15} />
                                )}
                                {loadingMore ? 'Chargement…' : 'Voir plus'}
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    )
}
