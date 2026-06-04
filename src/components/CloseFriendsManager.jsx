import React, { useState, useEffect } from 'react';
import { Users, Search, UserPlus, UserMinus, Loader2, Check } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { UserAvatar } from './UserAvatar';

export function CloseFriendsManager() {
    const { getToken, user } = useAuth();
    const [closeFriends, setCloseFriends] = useState([]);
    const [searchResults, setSearchResults] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [searching, setSearching] = useState(false);
    const [actionLoadingId, setActionLoadingId] = useState(null);

    const API_URL = import.meta.env.VITE_API_URL || '';

    useEffect(() => {
        fetchCloseFriends();
    }, []);

    const fetchCloseFriends = async () => {
        try {
            const res = await fetch(`${API_URL}/api/users/close-friends`, {
                headers: { Authorization: `Bearer ${getToken()}` }
            });
            if (res.ok) {
                const data = await res.json();
                setCloseFriends(data);
            }
        } catch (err) {
            console.error('Failed to fetch close friends', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = async (e) => {
        const query = e.target.value;
        setSearchQuery(query);

        if (!query.trim()) {
            setSearchResults([]);
            return;
        }

        setSearching(true);
        try {
            const res = await fetch(`${API_URL}/api/users/search?q=${encodeURIComponent(query)}`);
            if (res.ok) {
                const data = await res.json();
                // Filter out self and people already in close friends
                const filtered = data.filter(u => 
                    u.id !== user?.id && !closeFriends.some(cf => cf.id === u.id)
                );
                setSearchResults(filtered);
            }
        } catch (err) {
            console.error('Failed to search users', err);
        } finally {
            setSearching(false);
        }
    };

    const addFriend = async (friendId) => {
        setActionLoadingId(friendId);
        try {
            const res = await fetch(`${API_URL}/api/users/close-friends/${friendId}`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${getToken()}` }
            });
            if (res.ok) {
                await fetchCloseFriends();
                setSearchResults(prev => prev.filter(u => u.id !== friendId));
            }
        } catch (err) {
            console.error('Failed to add close friend', err);
        } finally {
            setActionLoadingId(null);
        }
    };

    const removeFriend = async (friendId) => {
        setActionLoadingId(friendId);
        try {
            const res = await fetch(`${API_URL}/api/users/close-friends/${friendId}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${getToken()}` }
            });
            if (res.ok) {
                setCloseFriends(prev => prev.filter(cf => cf.id !== friendId));
            }
        } catch (err) {
            console.error('Failed to remove close friend', err);
        } finally {
            setActionLoadingId(null);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center py-4">
                <Loader2 className="w-6 h-6 animate-spin text-green-500" />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-4 w-4 text-gray-400" />
                </div>
                <input
                    type="text"
                    className="tsi-input w-full pl-10 bg-gray-50 dark:bg-zinc-800"
                    placeholder="Rechercher des amis à ajouter..."
                    value={searchQuery}
                    onChange={handleSearch}
                />
            </div>

            {/* Search Results */}
            {searchQuery.trim() && (
                <div className="bg-white dark:bg-zinc-800 rounded-xl border border-gray-100 dark:border-white/10 overflow-hidden shadow-sm">
                    <div className="p-3 bg-gray-50 dark:bg-zinc-900 border-b border-gray-100 dark:border-white/10 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Résultats
                    </div>
                    {searching ? (
                        <div className="flex justify-center p-4"><Loader2 className="w-5 h-5 animate-spin" style={{color: 'var(--accent)'}}/></div>
                    ) : searchResults.length > 0 ? (
                        <div className="divide-y divide-gray-100 dark:divide-white/5">
                            {searchResults.map(u => (
                                <div key={u.id} className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-zinc-700/50 transition">
                                    <div className="flex items-center gap-3">
                                        <UserAvatar user={u} size={36} />
                                        <span className="font-medium text-sm dark:text-gray-200">{u.username}</span>
                                    </div>
                                    <button 
                                        onClick={() => addFriend(u.id)}
                                        disabled={actionLoadingId === u.id}
                                        className="p-2 rounded-full bg-green-100 text-green-600 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50 transition disabled:opacity-50"
                                    >
                                        {actionLoadingId === u.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                                    </button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="p-4 text-center text-sm text-gray-500">Aucun résultat</div>
                    )}
                </div>
            )}

            {/* Current Close Friends */}
            <div>
                <div className="flex items-center gap-2 mb-3 px-1">
                    <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-400">
                        <Users className="w-4 h-4" />
                    </div>
                    <h3 className="font-bold text-gray-900 dark:text-white">Vos Amis Proches</h3>
                    <span className="ml-auto text-xs font-semibold bg-gray-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full text-gray-600 dark:text-gray-400">
                        {closeFriends.length}
                    </span>
                </div>

                {closeFriends.length === 0 ? (
                    <div className="text-center py-6 bg-gray-50 dark:bg-zinc-800/50 rounded-xl border border-dashed border-gray-200 dark:border-white/10">
                        <p className="text-sm text-gray-500 dark:text-gray-400">Vous n'avez pas encore d'amis proches.</p>
                        <p className="text-xs text-gray-400 mt-1">Recherchez ci-dessus pour en ajouter.</p>
                    </div>
                ) : (
                    <div className="bg-white dark:bg-zinc-800 rounded-xl border border-gray-100 dark:border-white/10 overflow-hidden shadow-sm divide-y divide-gray-100 dark:divide-white/5">
                        {closeFriends.map(friend => (
                            <div key={friend.id} className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-zinc-700/50 transition">
                                <div className="flex items-center gap-3">
                                    <div className="relative">
                                        <UserAvatar user={friend} size={40} />
                                        <div className="absolute -bottom-1 -right-1 bg-white dark:bg-zinc-800 rounded-full p-0.5">
                                            <div className="w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white dark:border-zinc-800"></div>
                                        </div>
                                    </div>
                                    <span className="font-bold text-sm text-gray-900 dark:text-white">{friend.username}</span>
                                </div>
                                <button 
                                    onClick={() => removeFriend(friend.id)}
                                    disabled={actionLoadingId === friend.id}
                                    className="p-2 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition disabled:opacity-50"
                                    title="Retirer"
                                >
                                    {actionLoadingId === friend.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserMinus className="w-4 h-4" />}
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
