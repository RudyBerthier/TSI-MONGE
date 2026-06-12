import { Link, Outlet, useLocation, useNavigate, useOutlet } from 'react-router-dom'
import { ArrowLeft, Bug, Gamepad2 } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { useAuth } from '../contexts/AuthContext'
import { UserAvatar } from './UserAvatar'
import { useState, useRef, useEffect } from 'react'
import { CreatePostModal } from './CreatePostModal'
import BugReportModal from './BugReportModal'
import GameInviteToast from './games/GameInviteToast'

function NavIcon({ name, active }) {
    const cls = name === 'notifs' && active
        ? 'text-red-500'
        : (active ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500')

    // Home
    if (name === 'home') {
        if (active) return (
            <svg fill="currentColor" height="24" viewBox="0 0 24 24" width="24" className={cls}>
                <path d="m21.762 8.786-7-6.68C13.266.68 10.734.68 9.238 2.106l-7 6.681A4.017 4.017 0 0 0 1 11.68V19c0 2.206 1.794 4 4 4h3.005a1 1 0 0 0 1-1v-7.003a2.997 2.997 0 0 1 5.994 0V22a1 1 0 0 0 1 1H19c2.206 0 4-1.794 4-4v-7.32a4.02 4.02 0 0 0-1.238-2.894Z" />
            </svg>
        )
        return (
            <svg fill="currentColor" height="24" viewBox="0 0 24 24" width="24" className={cls}>
                <path d="m21.762 8.786-7-6.68C13.266.68 10.734.68 9.238 2.106l-7 6.681A4.017 4.017 0 0 0 1 11.68V20c0 1.654 1.346 3 3 3h5.005a1 1 0 0 0 1-1L10 15c0-1.103.897-2 2-2 1.09 0 1.98.877 2 1.962L13.999 22a1 1 0 0 0 1 1H20c1.654 0 3-1.346 3-3v-8.32a4.021 4.021 0 0 0-1.238-2.894ZM21 20a1 1 0 0 1-1 1h-4.001L16 15c0-2.206-1.794-4-4-4s-4 1.794-4 4l.005 6H4a1 1 0 0 1-1-1v-8.32c0-.543.226-1.07.62-1.447l7-6.68c.747-.714 2.013-.714 2.76 0l7 6.68c.394.376.62.904.62 1.448V20Z" />
            </svg>
        )
    }

    // Explore
    if (name === 'explore') {
        if (active) return (
            <svg fill="currentColor" height="24" viewBox="0 0 24 24" width="24" className={cls}>
                <path d="m13.173 13.164 1.491-3.829-3.83 1.49ZM12.001.5a11.5 11.5 0 1 0 11.5 11.5A11.513 11.513 0 0 0 12.001.5Zm5.35 7.443-2.478 6.369a1 1 0 0 1-.57.569l-6.36 2.47a1 1 0 0 1-1.294-1.294l2.48-6.369a1 1 0 0 1 .57-.569l6.359-2.47a1 1 0 0 1 1.294 1.294Z" />
            </svg>
        )
        return (
            <svg fill="currentColor" height="24" viewBox="0 0 24 24" width="24" className={cls}>
                <polygon fill="none" points="13.941 13.953 7.581 16.424 10.06 10.056 16.42 7.585 13.941 13.953" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                <polygon fillRule="evenodd" points="10.06 10.056 13.949 13.945 7.581 16.424 10.06 10.056" />
                <circle cx="12.001" cy="12.005" fill="none" r="10.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
            </svg>
        )
    }

    // Reels — compact filled vs full outline version
    if (name === 'reels') {
        if (active) return (
            <svg fill="currentColor" height="24" viewBox="0 0 24 24" width="24" className={cls}>
                <path d="M22.942 7.464c-.062-1.36-.306-2.143-.511-2.671a5.366 5.366 0 0 0-1.272-1.952 5.364 5.364 0 0 0-1.951-1.27c-.53-.207-1.312-.45-2.673-.513-1.2-.054-1.557-.066-4.535-.066s-3.336.012-4.536.066c-1.36.062-2.143.306-2.672.511-.769.3-1.371.692-1.951 1.272s-.973 1.182-1.27 1.951c-.207.53-.45 1.312-.513 2.673C1.004 8.665.992 9.022.992 12s.012 3.336.066 4.536c.062 1.36.306 2.143.511 2.671.298.77.69 1.373 1.272 1.952.58.581 1.182.974 1.951 1.27.53.207 1.311.45 2.673.513 1.199.054 1.557.066 4.535.066s3.336-.012 4.536-.066c1.36-.062 2.143-.306 2.671-.511a5.368 5.368 0 0 0 1.953-1.273c.58-.58.972-1.181 1.27-1.95.206-.53.45-1.312.512-2.673.054-1.2.066-1.557.066-4.535s-.012-3.336-.066-4.536Zm-7.085 6.055-5.25 3c-1.167.667-2.619-.175-2.619-1.519V9c0-1.344 1.452-2.186 2.619-1.52l5.25 3c1.175.672 1.175 2.368 0 3.04Z" />
            </svg>
        )
        return (
            <svg fill="currentColor" height="24" viewBox="0 0 24 24" width="24" className={cls}>
                <path d="M22.935 7.468c-.063-1.36-.307-2.142-.512-2.67a5.341 5.341 0 0 0-1.27-1.95 5.345 5.345 0 0 0-1.95-1.27c-.53-.206-1.311-.45-2.672-.513C15.333 1.012 14.976 1 12 1s-3.333.012-4.532.065c-1.36.063-2.142.307-2.67.512-.77.298-1.371.69-1.95 1.27a5.36 5.36 0 0 0-1.27 1.95c-.206.53-.45 1.311-.513 2.672C1.012 8.667 1 9.024 1 12s.012 3.333.065 4.532c.063 1.36.307 2.142.512 2.67.297.77.69 1.372 1.27 1.95.58.581 1.181.974 1.95 1.27.53.206 1.311.45 2.672.513C8.667 22.988 9.024 23 12 23s3.333-.012 4.532-.065c1.36-.063 2.142-.307 2.67-.512a5.33 5.33 0 0 0 1.95-1.27 5.356 5.356 0 0 0 1.27-1.95c.206-.53.45-1.311.513-2.672.053-1.198.065-1.555.065-4.531s-.012-3.333-.065-4.532Zm-1.998 8.972c-.05 1.07-.228 1.652-.38 2.04-.197.51-.434.874-.82 1.258a3.362 3.362 0 0 1-1.258.82c-.387.151-.97.33-2.038.379-1.162.052-1.51.063-4.441.063s-3.28-.01-4.44-.063c-1.07-.05-1.652-.228-2.04-.38a3.354 3.354 0 0 1-1.258-.82 3.362 3.362 0 0 1-.82-1.258c-.151-.387-.33-.97-.379-2.038C3.011 15.28 3 14.931 3 12s.01-3.28.063-4.44c.05-1.07.228-1.652.38-2.04.197-.51.434-.875.82-1.26a3.372 3.372 0 0 1 1.258-.819c.387-.15.97-.329 2.038-.378C8.72 3.011 9.069 3 12 3s3.28.01 4.44.063c1.07.05 1.652.228 2.04.38.51.197.874.433 1.258.82.385.382.622.747.82 1.258.151.387.33.97.379 2.038C20.989 8.72 21 9.069 21 12s-.01 3.28-.063 4.44Zm-4.584-6.828-5.25-3a2.725 2.725 0 0 0-2.745.01A2.722 2.722 0 0 0 6.988 9v6c0 .992.512 1.88 1.37 2.379.432.25.906.376 1.38.376.468 0 .937-.123 1.365-.367l5.25-3c.868-.496 1.385-1.389 1.385-2.388s-.517-1.892-1.385-2.388Zm-.993 3.04-5.25 3a.74.74 0 0 1-.748-.003.74.74 0 0 1-.374-.649V9a.74.74 0 0 1 .374-.65.737.737 0 0 1 .748-.002l5.25 3c.341.196.378.521.378.652s-.037.456-.378.651Z" />
            </svg>
        )
    }

    // Notifications / Heart
    if (name === 'notifs') {
        if (active) return (
            <svg fill="currentColor" height="24" viewBox="0 0 24 24" width="24" className={cls}>
                <path d="M16.792 3.904A4.989 4.989 0 0 1 21.5 9.122c0 3.072-2.652 4.959-5.197 7.222-2.512 2.243-3.865 3.469-4.303 3.752-.477-.309-2.143-1.823-4.303-3.752C5.141 14.072 2.5 12.167 2.5 9.122a4.989 4.989 0 0 1 4.708-5.218 4.21 4.21 0 0 1 3.675 1.941c.84 1.175.98 1.763 1.12 1.763s.278-.588 1.11-1.766a4.17 4.17 0 0 1 3.679-1.938Z" />
            </svg>
        )
        return (
            <svg fill="currentColor" height="24" viewBox="0 0 24 24" width="24" className={cls}>
                <path d="M16.792 3.904A4.989 4.989 0 0 1 21.5 9.122c0 3.072-2.652 4.959-5.197 7.222-2.512 2.243-3.865 3.469-4.303 3.752-.477-.309-2.143-1.823-4.303-3.752C5.141 14.072 2.5 12.167 2.5 9.122a4.989 4.989 0 0 1 4.708-5.218 4.21 4.21 0 0 1 3.675 1.941c.84 1.175.98 1.763 1.12 1.763s.278-.588 1.11-1.766a4.17 4.17 0 0 1 3.679-1.938m0-2a6.04 6.04 0 0 0-4.797 2.127 6.052 6.052 0 0 0-4.787-2.127A6.985 6.985 0 0 0 .5 9.122c0 3.61 2.55 5.827 5.015 7.97.283.246.569.494.853.747l1.027.918a44.998 44.998 0 0 0 3.518 3.018 2 2 0 0 0 2.174 0 45.263 45.263 0 0 0 3.626-3.115l.922-.824c.293-.26.59-.519.885-.774 2.334-2.025 4.98-4.32 4.98-7.94a6.985 6.985 0 0 0-6.708-7.218Z" />
            </svg>
        )
    }

    // Messages
    if (name === 'messages') {
        if (active) return (
            <svg fill="currentColor" height="24" viewBox="0 0 24 24" width="24" className={cls}>
                <path d="M22.513 3.576C21.826 2.552 20.617 2 19.384 2H4.621c-1.474 0-2.878.818-3.46 2.173-.6 1.398-.297 2.935.784 3.997l3.359 3.295a1 1 0 0 0 1.195.156l8.522-4.849a1 1 0 1 1 .988 1.738l-8.526 4.851a1 1 0 0 0-.477 1.104l1.218 5.038c.343 1.418 1.487 2.534 2.927 2.766.208.034.412.051.616.051 1.26 0 2.401-.644 3.066-1.763l7.796-13.118a3.572 3.572 0 0 0-.116-3.863Z" />
            </svg>
        )
        return (
            <svg fill="currentColor" height="24" viewBox="0 0 24 24" width="24" className={cls}>
                <path d="M13.973 20.046 21.77 6.928C22.8 5.195 21.55 3 19.535 3H4.466C2.138 3 .984 5.825 2.646 7.456l4.842 4.752 1.723 7.121c.548 2.266 3.571 2.721 4.762.717Z" fill="none" stroke="currentColor" strokeLinejoin="round" strokeWidth="2" />
                <line fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" x1="7.488" x2="15.515" y1="12.208" y2="7.641" />
            </svg>
        )
    }

    // Arcade
    if (name === 'arcade') {
        return <Gamepad2 size={24} className={cls} />
    }

    // Create — always the same
    if (name === 'create') return (
        <svg fill="currentColor" height="24" viewBox="0 0 24 24" width="24" className={cls}>
            <path d="M21 11h-8V3a1 1 0 1 0-2 0v8H3a1 1 0 1 0 0 2h8v8a1 1 0 1 0 2 0v-8h8a1 1 0 1 0 0-2Z" />
        </svg>
    )
    return null
}

const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:3001' : '')

function AnimatedSocialOutlet() {
    const location = useLocation()
    const element = useOutlet()

    return (
        <AnimatePresence mode="wait">
            {element && (
                <motion.div
                    key={location.pathname}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    className="w-full flex-1"
                >
                    {element}
                </motion.div>
            )}
        </AnimatePresence>
    )
}

export function SocialLayout() {
    const { pathname } = useLocation()
    const navigate = useNavigate()
    const { user, isAuthenticated, loading } = useAuth()
    const [showCreatePost, setShowCreatePost] = useState(false)
    const [showBugReport, setShowBugReport] = useState(false)

    // Notification badge
    const [unreadNotifs, setUnreadNotifs] = useState(0)

    useEffect(() => {
        const fetchUnread = async () => {
            try {
                if (!isAuthenticated) return
                const res = await fetch('/api/users/notifications', {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                })
                if (res.ok) {
                    const data = await res.json()
                    setUnreadNotifs(data.filter(n => !n.is_read).length)
                }
            } catch (e) { }
        }
        if (user) {
            fetchUnread()
            const interval = setInterval(fetchUnread, 30000) // poll every 30s
            return () => clearInterval(interval)
        }
    }, [user])
    const profilePath = user?.username ? `/social/user/${user.username}` : '/profile'

    const navItems = [
        { iconName: 'home', label: 'Accueil', path: '/social', exact: true },
        { iconName: 'explore', label: 'Explorer', path: '/social/explore' },
        { iconName: 'reels', label: 'Reels', path: '/social/reels' },
        { iconName: 'arcade', label: 'Arcade', path: '/social/games' },
        { iconName: 'messages', label: 'Messages', path: '/social/chat' },
        { iconName: 'profil', label: 'Profil', path: profilePath }
    ]

    const isActive = (item) => {
        if (item.exact) return pathname === item.path
        return pathname.startsWith(item.path)
    }

    const isChatPage = pathname === '/social/chat'
    const isReelsPage = pathname === '/social/reels'

    const closeCreatePost = () => {
        setShowCreatePost(false)
    }

    // ─── Avatar helper ─────────────────────────
    const renderUserAvatar = () => {
        if (!user) return null
        return <UserAvatar user={user} size={24} />
    }

    return (
        <>
        {/* ═══ MOBILE BOTTOM BAR — outside overflow wrapper for Chrome fixed positioning ═══ */}
        {(!isChatPage && !isReelsPage) && (
            <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-black/95 backdrop-blur-xl border-t border-gray-200/80 dark:border-white/10 flex justify-around items-center h-14 pb-[env(safe-area-inset-bottom)] box-content z-50">
                {navItems.map((item) => {
                    if (item.label === 'Profil') {
                        return (
                            <Link key={item.path} to={item.path} className="p-2.5">
                                <div className={`rounded-full ${isActive(item) ? 'ring-2 ring-gray-900 dark:ring-white' : ''}`}>
                                    {renderUserAvatar()}
                                </div>
                            </Link>
                        )
                    }
                    return (
                        <Link key={item.path} to={item.path} className="p-2.5 relative">
                            <NavIcon name={item.iconName} active={isActive(item)} />
                            {item.badge > 0 && (
                                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                                    {item.badge > 99 ? '99+' : item.badge}
                                </span>
                            )}
                        </Link>
                    )
                })}
                {/* Retour */}
                <button onClick={() => navigate('/')} className="p-2.5 flex items-center justify-center">
                    <ArrowLeft size={24} className="text-gray-400 dark:text-gray-500" />
                </button>
            </nav>
        )}

    <div className={`flex flex-col md:flex-row w-full min-h-[100dvh] bg-gray-50 dark:bg-black pt-[env(safe-area-inset-top,_0px)] md:pt-0 ${(!isChatPage && !isReelsPage) ? 'pb-[calc(3.5rem+env(safe-area-inset-bottom))] md:pb-0' : ''}`}>

            {/* ═══ DESKTOP SIDEBAR ═══ */}
            <aside className="hidden md:flex flex-col w-[72px] hover:w-[240px] group/sidebar h-screen sticky top-[calc(3.5rem+env(safe-area-inset-top))] border-r border-gray-200/80 dark:border-white/10 bg-white dark:bg-black py-6 px-3 z-50 transition-all duration-300 ease-[cubic-bezier(0.33,0.33,0.33,1)] overflow-hidden">
                {/* Logo */}
                <div className="mb-8 px-3 flex items-center justify-start gap-4 relative">
                    <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/20 shrink-0 z-10">
                        <div className="w-2.5 h-2.5 border-[2px] border-white rounded-[3px]"></div>
                    </div>
                    <div className="absolute left-[3.25rem] whitespace-nowrap overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.33,0.33,0.33,1)] opacity-0 -translate-x-4 group-hover/sidebar:opacity-100 group-hover/sidebar:translate-x-0 pointer-events-none flex items-center h-full">
                        <h1 className="text-[22px] font-black tracking-tight text-gray-900 dark:text-white" style={{ fontFamily: "'Inter', sans-serif" }}>
                            Mongegram
                        </h1>
                    </div>
                </div>

                <nav className="flex flex-col justify-center gap-4 flex-1">
                    {navItems.map((item) => {
                        const active = isActive(item)
                        if (item.label === 'Profil') {
                            return (
                                <div key="desktop-profile-create" className="contents">
                                    <button onClick={() => setShowCreatePost(true)} className="flex items-center justify-start gap-4 p-3 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 transition-colors text-left group relative cursor-pointer">
                                        <div className="w-7 h-7 flex items-center justify-center shrink-0 z-10 group-hover:scale-105 transition-transform">
                                            <NavIcon name="create" active={false} desktop />
                                        </div>
                                        <div className="absolute left-[3.25rem] whitespace-nowrap overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.33,0.33,0.33,1)] opacity-0 -translate-x-4 group-hover/sidebar:opacity-100 group-hover/sidebar:translate-x-0 pointer-events-none flex items-center h-full">
                                            <span className="text-[15px] font-medium text-gray-900 dark:text-white">Créer</span>
                                        </div>
                                    </button>
                                    <Link to={item.path} className={`flex items-center justify-start gap-4 p-3 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 transition-colors group relative ${active ? 'bg-gray-50 dark:bg-white/5' : ''}`}>
                                        <div className={`w-7 h-7 flex items-center justify-center rounded-full group-hover:scale-105 transition-transform shrink-0 z-10 overflow-hidden ${active ? 'ring-[2.5px] ring-offset-1 dark:ring-offset-black ring-gray-900 dark:ring-white flex-shrink-0' : ''}`}>
                                            {renderUserAvatar()}
                                        </div>
                                        <div className="absolute left-[3.25rem] whitespace-nowrap overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.33,0.33,0.33,1)] opacity-0 -translate-x-4 group-hover/sidebar:opacity-100 group-hover/sidebar:translate-x-0 pointer-events-none flex items-center h-full">
                                            <span className={`text-[15px] ${active ? 'font-bold' : 'font-medium'} text-gray-900 dark:text-white`}>{item.label}</span>
                                        </div>
                                    </Link>
                                </div>
                            )
                        }
                        return (
                            <Link key={item.path} to={item.path} className={`flex items-center justify-start gap-4 p-3 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 transition-colors group relative ${active ? 'bg-gray-50 dark:bg-white/5' : ''}`}>
                                <div className="relative shrink-0 z-10 w-7 h-7 flex items-center justify-center group-hover:scale-105 transition-transform">
                                    <NavIcon name={item.iconName} active={active} desktop />
                                    {item.badge > 0 && (
                                        <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-[16px] bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5">
                                            {item.badge > 99 ? '99+' : item.badge}
                                        </span>
                                    )}
                                </div>
                                <div className="absolute left-[3.25rem] whitespace-nowrap overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.33,0.33,0.33,1)] opacity-0 -translate-x-4 group-hover/sidebar:opacity-100 group-hover/sidebar:translate-x-0 pointer-events-none flex items-center h-full">
                                    <span className={`text-[15px] ${active ? 'font-bold' : 'font-medium'} text-gray-900 dark:text-white`}>{item.label}</span>
                                </div>
                            </Link>
                        )
                    })}
                </nav>

                <div>
                    <button onClick={() => navigate('/')} className="w-full flex items-center justify-start gap-4 p-3 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 transition-colors group relative">
                        <div className="w-6 h-6 flex items-center justify-center shrink-0 z-10">
                            <ArrowLeft size={24} className="text-gray-500 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white transition-colors" />
                        </div>
                        <div className="absolute left-[3.25rem] whitespace-nowrap overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.33,0.33,0.33,1)] opacity-0 -translate-x-4 group-hover/sidebar:opacity-100 group-hover/sidebar:translate-x-0 pointer-events-none flex items-center h-full">
                            <span className="text-sm font-medium text-gray-500 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
                                Retour
                            </span>
                        </div>
                    </button>
                    
                    {/* Bug Report Desktop */}
                    <button onClick={() => setShowBugReport(true)} className="w-full flex items-center justify-start gap-4 p-3 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 transition-colors group relative mt-2">
                        <div className="w-6 h-6 flex items-center justify-center shrink-0 z-10">
                            <Bug size={22} className="text-gray-400 dark:text-gray-500 group-hover:text-red-500 transition-colors" />
                        </div>
                        <div className="absolute left-[3.25rem] whitespace-nowrap overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.33,0.33,0.33,1)] opacity-0 -translate-x-4 group-hover/sidebar:opacity-100 group-hover/sidebar:translate-x-0 pointer-events-none flex items-center h-full">
                            <span className="text-sm font-medium text-gray-400 dark:text-gray-500 group-hover:text-red-500 transition-colors">
                                Signaler un bug
                            </span>
                        </div>
                    </button>
                </div>
            </aside>

            {/* ═══ MAIN CONTENT ═══ */}
            <main className="flex-1 w-full max-w-[100vw] relative flex flex-col">
                {/* Mobile Top Bar */}
                {(!isChatPage && !isReelsPage) && (
                    <div className="md:hidden grid grid-cols-3 items-center px-3 h-12 bg-white/95 dark:bg-black/95 backdrop-blur-xl sticky top-[calc(3.5rem+env(safe-area-inset-top))] z-40 border-b border-gray-200/80 dark:border-white/10">
                        {/* Left: Create button */}
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setShowCreatePost(true)}
                                className="w-9 h-9 flex items-center justify-center text-gray-900 dark:text-white active:scale-95 transition"
                                title="Créer une publication"
                            >
                                <svg fill="currentColor" height="24" viewBox="0 0 24 24" width="24">
                                    <path d="M21 11h-8V3a1 1 0 1 0-2 0v8H3a1 1 0 1 0 0 2h8v8a1 1 0 1 0 2 0v-8h8a1 1 0 1 0 0-2Z" />
                                </svg>
                            </button>
                            <button
                                onClick={() => setShowBugReport(true)}
                                className="w-9 h-9 flex items-center justify-center text-gray-400 hover:text-red-500 active:scale-95 transition"
                                title="Signaler un bug"
                            >
                                <Bug size={22} />
                            </button>
                        </div>

                        {/* Center: Logo */}
                        <div className="flex items-center justify-center gap-1.5">
                            <div className="w-5 h-5 rounded-md bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600 flex items-center justify-center shrink-0">
                                <div className="w-1.5 h-1.5 border-[1.5px] border-white rounded-[2px]"></div>
                            </div>
                            <h1 className="text-[17px] font-black tracking-tight text-gray-900 dark:text-white leading-none" style={{ fontFamily: "'Inter', sans-serif" }}>
                                Mongegram
                            </h1>
                        </div>

                        {/* Right: Notifications */}
                        <div className="flex items-center justify-end">
                            <Link to="/social/notifications" className="relative w-9 h-9 flex items-center justify-center active:scale-95 transition">
                                <svg fill="currentColor" height="24" viewBox="0 0 24 24" width="24" className="text-gray-900 dark:text-white">
                                        <path d="M16.792 3.904A4.989 4.989 0 0 1 21.5 9.122c0 3.072-2.652 4.959-5.197 7.222-2.512 2.243-3.865 3.469-4.303 3.752-.477-.309-2.143-1.823-4.303-3.752C5.141 14.072 2.5 12.167 2.5 9.122a4.989 4.989 0 0 1 4.708-5.218 4.21 4.21 0 0 1 3.675 1.941c.84 1.175.98 1.763 1.12 1.763s.278-.588 1.11-1.766a4.17 4.17 0 0 1 3.679-1.938m0-2a6.04 6.04 0 0 0-4.797 2.127 6.052 6.052 0 0 0-4.787-2.127A6.985 6.985 0 0 0 .5 9.122c0 3.61 2.55 5.827 5.015 7.97.283.246.569.494.853.747l1.027.918a44.998 44.998 0 0 0 3.518 3.018 2 2 0 0 0 2.174 0 45.263 45.263 0 0 0 3.626-3.115l.922-.824c.293-.26.59-.519.885-.774 2.334-2.025 4.98-4.32 4.98-7.94a6.985 6.985 0 0 0-6.708-7.218Z" />
                                    </svg>
                                {unreadNotifs > 0 && (
                                    <span className="absolute top-0.5 right-0.5 min-w-[16px] h-[16px] bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5">
                                        {unreadNotifs > 99 ? '99+' : unreadNotifs}
                                    </span>
                                )}
                            </Link>
                        </div>
                    </div>
                )}

                {(!loading && !isAuthenticated) ? (
                    <div className="relative w-full flex-1 flex flex-col">
                        <div className="absolute inset-0 overflow-hidden filter blur-xl pointer-events-none opacity-40 dark:opacity-20 flex flex-col gap-6 p-4 max-w-2xl mx-auto w-full mt-4">
                            <div className="h-24 bg-gray-200 dark:bg-slate-800 rounded-xl w-full"></div>
                            <div className="h-64 bg-gray-200 dark:bg-slate-800 rounded-xl w-full"></div>
                            <div className="h-64 bg-gray-200 dark:bg-slate-800 rounded-xl w-full"></div>
                        </div>

                        <div className="absolute inset-0 flex flex-col items-center justify-center z-40 p-4">
                            <div className="bg-white/90 dark:bg-black/80 backdrop-blur-2xl border border-gray-200 dark:border-white/10 rounded-[2rem] p-8 max-w-sm w-full text-center shadow-2xl">
                                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600 flex items-center justify-center mx-auto mb-6 shadow-xl shadow-purple-500/20">
                                    <div className="w-6 h-6 border-[3px] border-white rounded-[6px]"></div>
                                </div>
                                <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-2 tracking-tight">Mongegram</h2>
                                <p className="text-gray-500 dark:text-gray-400 mb-8 text-[15px] leading-relaxed">
                                    Connecte-toi pour découvrir les photos, vidéos et stories de la classe.
                                </p>
                                <Link to="/login" state={{ from: location.pathname }} className="flex items-center justify-center w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-md hover:shadow-lg active:scale-[0.98]">
                                    Se connecter
                                </Link>
                                <Link to="/register" className="flex items-center justify-center w-full py-3.5 mt-3 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-900 dark:text-white rounded-xl font-bold transition-all">
                                    Créer un compte
                                </Link>
                            </div>
                        </div>
                    </div>
                ) : (
                    <AnimatedSocialOutlet />
                )}
            </main>

            {/* ═══ CREATE POST MODAL ═══ */}
            {showCreatePost && (
                <CreatePostModal
                    user={user}
                    onClose={closeCreatePost}
                    onPostCreated={() => {
                        if (pathname === '/social' || pathname === '/social/') {
                            window.location.reload()
                        }
                    }}
                />
            )}

            {showBugReport && (
                <BugReportModal onClose={() => setShowBugReport(false)} />
            )}
        </div>
        <GameInviteToast />
        </>
    )
}
