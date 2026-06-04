import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Camera, Trash2, Check, X, Loader2, Link as LinkIcon, Pencil, ArrowLeft } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'

export function SocialProfile() {
    const { user, isAuthenticated, loading, updateProfile, uploadAvatar, deleteAvatar } = useAuth()
    const navigate = useNavigate()
    const fileInputRef = useRef(null)

    const [isEditingUsername, setIsEditingUsername] = useState(false)
    const [newUsername, setNewUsername] = useState('')
    const [loadingAvatar, setLoadingAvatar] = useState(false)
    const [loadingUsername, setLoadingUsername] = useState(false)

    const [successMessage, setSuccessMessage] = useState('')
    const [localError, setLocalError] = useState('')

    const [bio, setBio] = useState('')
    const [links, setLinks] = useState({ instagram: '', github: '', linkedin: '', website: '' })
    const [loadingBio, setLoadingBio] = useState(false)

    useEffect(() => {
        if (!loading && !isAuthenticated) navigate('/login', { state: { from: window.location.pathname } })
    }, [isAuthenticated, loading, navigate])

    useEffect(() => {
        if (user) {
            setNewUsername(user.username)
            setBio(user.bio || '')
            setLinks(user.links || { instagram: '', github: '', linkedin: '', website: '' })
        }
    }, [user])

    const showSuccess = (msg) => {
        setSuccessMessage(msg)
        setLocalError('')
        setTimeout(() => setSuccessMessage(''), 3000)
    }

    const showError = (msg) => {
        setLocalError(msg)
        setSuccessMessage('')
        setTimeout(() => setLocalError(''), 5000)
    }

    const handleAvatarChange = async (e) => {
        const file = e.target.files?.[0]
        if (!file) return
        if (file.size > 2 * 1024 * 1024) { showError('L\'image ne doit pas dépasser 2 Mo'); return }
        setLoadingAvatar(true)
        const result = await uploadAvatar(file)
        setLoadingAvatar(false)
        if (result.success) showSuccess('Avatar mis à jour')
        else showError(result.error)
    }

    const handleDeleteAvatar = async () => {
        if (!user?.avatar) return
        setLoadingAvatar(true)
        const result = await deleteAvatar()
        setLoadingAvatar(false)
        if (result.success) showSuccess('Avatar supprimé')
        else showError(result.error)
    }

    const handleSaveUsername = async () => {
        if (!newUsername.trim()) return
        if (newUsername.trim() === user?.username) { setIsEditingUsername(false); return }
        setLoadingUsername(true)
        const result = await updateProfile({ username: newUsername.trim() })
        setLoadingUsername(false)
        if (result.success) { showSuccess('Pseudo mis à jour'); setIsEditingUsername(false) }
        else showError(result.error)
    }

    const handleSaveProfile = async () => {
        setLoadingBio(true)
        const result = await updateProfile({
            bio,
            links
        })
        setLoadingBio(false)
        if (result.success) { showSuccess('Profil mis à jour') }
        else showError(result.error)
    }

    if (loading) {
        return (
            <div className="w-full flex-1 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
        )
    }

    if (!user) return null

    const avatarUrl = user.avatar
        ? `${import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:3001' : '')}${user.avatar}`
        : user.google_avatar || user.googleAvatar || null

    return (
        <div className="w-full max-w-2xl mx-auto pb-24 md:pb-8 pt-4 px-4 sm:px-6">
            <div className="flex items-center gap-4 mb-6">
                <button onClick={() => navigate(-1)} className="p-2 rounded-xl border border-gray-200 dark:border-white/10 text-gray-800 dark:text-white hover:bg-gray-100 dark:hover:bg-slate-800 transition">
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Modifier mon profil</h1>
            </div>

            <div className="bg-white dark:bg-black border border-gray-200 dark:border-white/10 rounded-2xl p-6 shadow-sm mb-6 relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-r from-blue-500 to-purple-600 opacity-20"></div>

                <div className="relative flex flex-col items-center">
                    {/* Avatar */}
                    <div className="relative mb-6 mt-4">
                        <div className="w-24 h-24 rounded-full p-1 bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-500 shadow-lg">
                            <div className="w-full h-full rounded-full border-4 border-white dark:border-black overflow-hidden bg-white dark:bg-black relative">
                                {avatarUrl ? (
                                    <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-3xl font-bold bg-gradient-to-br from-blue-400 to-indigo-600 text-white">
                                        {user.username?.[0]?.toUpperCase() || 'U'}
                                    </div>
                                )}
                                {loadingAvatar && (
                                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                        <Loader2 className="w-6 h-6 text-white animate-spin" />
                                    </div>
                                )}
                            </div>
                        </div>

                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={loadingAvatar}
                            className="absolute bottom-0 right-0 w-8 h-8 rounded-full flex items-center justify-center shadow-md bg-blue-600 border-2 border-white dark:border-black hover:bg-blue-700 transition"
                            title="Changer la photo"
                        >
                            <Camera className="w-4 h-4 text-white" />
                        </button>
                        <input type="file" ref={fileInputRef} onChange={handleAvatarChange} accept="image/jpeg,image/png,image/gif,image/webp" className="hidden" />
                    </div>

                    {user?.avatar && (
                        <button
                            onClick={handleDeleteAvatar}
                            disabled={loadingAvatar}
                            className="text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-full text-red-500 border border-red-200 dark:border-red-900/50 hover:bg-red-50 dark:hover:bg-red-950/30 transition mb-6"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                            Supprimer la photo
                        </button>
                    )}

                    {/* Username */}
                    <div className="w-full max-w-sm flex items-center justify-center mb-8">
                        {isEditingUsername ? (
                            <div className="flex items-center gap-2 w-full">
                                <input
                                    type="text"
                                    value={newUsername}
                                    onChange={e => setNewUsername(e.target.value)}
                                    className="px-3 py-2 bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-lg font-bold w-full text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                                    disabled={loadingUsername}
                                    autoFocus
                                    onKeyDown={e => { if (e.key === 'Enter') handleSaveUsername(); if (e.key === 'Escape') { setIsEditingUsername(false); setNewUsername(user.username) } }}
                                />
                                <button onClick={handleSaveUsername} disabled={loadingUsername} className="p-2 rounded-lg bg-green-500 hover:bg-green-600 text-white transition">
                                    {loadingUsername ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                </button>
                                <button onClick={() => { setIsEditingUsername(false); setNewUsername(user.username) }} disabled={loadingUsername} className="p-2 rounded-lg bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300 transition">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        ) : (
                            <div className="flex items-center gap-3">
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white">{user.username}</h2>
                                <button onClick={() => setIsEditingUsername(true)} className="p-1.5 text-gray-500 hover:text-blue-500 bg-gray-100 dark:bg-slate-800 rounded-full transition" title="Modifier le pseudo">
                                    <Pencil className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Bio and Links */}
                <div className="w-full space-y-5 border-t border-gray-200 dark:border-slate-800 pt-6">
                    <div>
                        <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">Biographie</label>
                        <textarea
                            value={bio}
                            onChange={(e) => setBio(e.target.value)}
                            className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl resize-none h-24 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                            placeholder="Racontez quelque chose sur vous..."
                            maxLength={150}
                        />
                        <div className="text-right text-xs mt-1.5 text-gray-500">{bio.length}/150</div>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">Lien / Site web</label>
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                                <LinkIcon className="w-5 h-5" />
                            </div>
                            <input
                                type="url"
                                value={links.website || ''}
                                onChange={e => setLinks({ ...links, website: e.target.value })}
                                placeholder="https://votre-lien.com"
                                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                            />
                        </div>
                    </div>

                    <div className="pt-4">
                        <button
                            onClick={handleSaveProfile}
                            disabled={loadingBio}
                            className="w-full flex items-center justify-center gap-2 py-3.5 font-bold rounded-xl transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:shadow-none bg-blue-600 text-white hover:bg-blue-700"
                        >
                            {loadingBio ? <Loader2 className="w-5 h-5 animate-spin" /> : "Mettre à jour le profil"}
                        </button>
                    </div>
                </div>

                {/* Messages */}
                {successMessage && (
                    <div className="mt-5 rounded-xl p-3 flex items-center gap-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/50">
                        <Check className="w-5 h-5 text-green-600 dark:text-green-400 shrink-0" />
                        <span className="text-sm font-medium text-green-800 dark:text-green-300">{successMessage}</span>
                    </div>
                )}
                {localError && (
                    <div className="mt-5 rounded-xl p-3 flex items-center gap-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50">
                        <X className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0" />
                        <span className="text-sm font-medium text-red-800 dark:text-red-300">{localError}</span>
                    </div>
                )}
            </div>
        </div>
    )
}
