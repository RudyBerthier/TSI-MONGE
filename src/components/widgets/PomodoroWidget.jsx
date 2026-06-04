import React, { useState, useEffect, useRef } from 'react';
import { useSocket } from '../../contexts/SocketContext';
import { useAuth } from '../../contexts/AuthContext';
import { Timer, Users, Play, Square, Coffee, Plus, X, Clock, Trash2 } from 'lucide-react';
import '../../index.css';

const formatTime = (seconds) => {
    if (!seconds && seconds !== 0) return '--:--';
    if (seconds < 0) return '00:00';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

export default function PomodoroWidget() {
    const { socket, connected } = useSocket();
    const { user } = useAuth();

    const [sessions, setSessions] = useState([]);
    const [joinedSessionId, setJoinedSessionId] = useState(null);
    const [showCreate, setShowCreate] = useState(false);
    const [newName, setNewName] = useState('');
    const [newMinutes, setNewMinutes] = useState(25);

    useEffect(() => {
        if (!socket || !connected) return;

        const onSessionsList = (list) => setSessions(list);
        const onSync = (session) => {
            setSessions(prev => prev.map(s => s.id === session.id ? session : s));
        };
        const onTick = (session) => {
            setSessions(prev => prev.map(s => s.id === session.id ? session : s));
        };
        const onRejoined = ({ sessionId }) => {
            setJoinedSessionId(sessionId);
        };

        socket.on('focus:sessions_list', onSessionsList);
        socket.on('focus:sync', onSync);
        socket.on('focus:tick', onTick);
        socket.on('focus:rejoined', onRejoined);

        socket.emit('focus:get_sessions');

        return () => {
            socket.off('focus:sessions_list', onSessionsList);
            socket.off('focus:sync', onSync);
            socket.off('focus:tick', onTick);
            socket.off('focus:rejoined', onRejoined);
        };
    }, [socket, connected]);

    const handleCreate = () => {
        if (!socket || !newName.trim() || newMinutes < 1) return;
        socket.emit('focus:create', { name: newName.trim(), duration: newMinutes * 60 });
        setNewName('');
        setNewMinutes(25);
        setShowCreate(false);
    };

    const handleJoin = (sessionId) => {
        if (!socket) return;
        socket.emit('focus:join', { sessionId });
        setJoinedSessionId(sessionId);
    };

    const handleLeave = () => {
        if (!socket) return;
        socket.emit('focus:leave');
        setJoinedSessionId(null);
    };

    const handleDelete = (sessionId) => {
        if (!socket) return;
        socket.emit('focus:delete', { sessionId });
        if (joinedSessionId === sessionId) setJoinedSessionId(null);
    };

    const joinedSession = sessions.find(s => s.id === joinedSessionId);

    return (
        <div className="space-y-4">
            {/* Joined Session — Full View */}
            {joinedSession && (
                <div className="tsi-card overflow-hidden relative">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            {joinedSession.mode === 'work' ? (
                                <Timer size={18} className="text-accent animate-pulse" />
                            ) : (
                                <Coffee size={18} className="text-accent-warm" />
                            )}
                            <h2 className="font-display font-semibold text-[0.95rem] text-text">
                                {joinedSession.name}
                            </h2>
                        </div>
                        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-surface-2 rounded-full border border-border">
                            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                            <span className="font-mono text-[0.65rem] text-text-muted">
                                {joinedSession.participants.length} en ligne
                            </span>
                        </div>
                    </div>

                    <div className="flex flex-col items-center justify-center py-4">
                        <div className="text-xs uppercase tracking-widest font-semibold mb-2" style={{ color: joinedSession.mode === 'work' ? 'var(--accent)' : 'var(--accent-warm)' }}>
                            {joinedSession.mode === 'work' ? 'Focus' : 'Pause'}
                        </div>
                        <div className="text-5xl font-display font-bold tracking-tight" style={{ color: joinedSession.mode === 'work' ? 'var(--accent)' : 'var(--accent-warm)' }}>
                            {formatTime(joinedSession.timeRemaining)}
                        </div>

                        <div className="w-full h-1.5 bg-surface-2 rounded-full mt-6 overflow-hidden">
                            <div
                                className="h-full rounded-full transition-all duration-1000 ease-linear"
                                style={{
                                    width: `${Math.min(100, Math.max(0, ((joinedSession.duration - joinedSession.timeRemaining) / joinedSession.duration) * 100))}%`,
                                    background: joinedSession.mode === 'work' ? 'var(--accent)' : 'var(--accent-warm)'
                                }}
                            />
                        </div>
                    </div>

                    {/* Participants */}
                    <div className="mt-3 mb-4">
                        <div className="text-xs font-semibold text-text-muted mb-2 flex items-center gap-1">
                            <Users size={12} /> Participants
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {joinedSession.participants.map(p => (
                                <div key={p.id} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium" style={{ background: 'var(--surface-2)', color: 'var(--text)', border: '1px solid var(--border)' }}>
                                    {p.avatar ? (
                                        <img src={p.avatar} alt="" className="w-4 h-4 rounded-full object-cover" />
                                    ) : (
                                        <div className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold" style={{ background: 'var(--accent)', color: 'white' }}>
                                            {p.username?.charAt(0).toUpperCase()}
                                        </div>
                                    )}
                                    {p.username}
                                </div>
                            ))}
                        </div>
                    </div>

                    <button
                        onClick={handleLeave}
                        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border transition-colors font-medium text-sm"
                        style={{ background: 'rgba(var(--accent-rgb), 0.1)', color: 'var(--accent)', borderColor: 'var(--accent)' }}
                    >
                        <Square size={14} className="fill-current" />
                        Quitter la session
                    </button>

                    <div className="absolute top-0 right-0 w-32 h-32 blur-3xl rounded-full opacity-10 pointer-events-none" style={{ background: joinedSession.mode === 'work' ? 'var(--accent)' : 'var(--accent-warm)' }} />
                </div>
            )}

            {/* Sessions List */}
            {sessions.filter(s => s.id !== joinedSessionId).length > 0 && (
                <div className="space-y-3">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
                        <Timer size={12} /> Sessions disponibles
                    </h3>
                    {sessions.filter(s => s.id !== joinedSessionId).map(session => (
                        <div key={session.id} className="tsi-card !p-4">
                            <div className="flex items-center justify-between mb-2">
                                <div>
                                    <h4 className="font-semibold text-sm text-text">{session.name}</h4>
                                    <p className="text-[0.65rem] text-text-muted">par {session.creatorName}</p>
                                </div>
                                <div className="text-right">
                                    <div className="font-mono text-lg font-bold" style={{ color: session.mode === 'work' ? 'var(--accent)' : 'var(--accent-warm)' }}>
                                        {formatTime(session.timeRemaining)}
                                    </div>
                                    <div className="text-[0.6rem] text-text-muted">{session.participants.length} participant{session.participants.length !== 1 ? 's' : ''}</div>
                                </div>
                            </div>

                            {/* Mini participant avatars */}
                            {session.participants.length > 0 && (
                                <div className="flex -space-x-1.5 mb-3">
                                    {session.participants.slice(0, 6).map(p => (
                                        p.avatar ? (
                                            <img key={p.id} src={p.avatar} alt={p.username} title={p.username} className="w-6 h-6 rounded-full border-2 object-cover" style={{ borderColor: 'var(--surface)' }} />
                                        ) : (
                                            <div key={p.id} title={p.username} className="w-6 h-6 rounded-full border-2 flex items-center justify-center text-[8px] font-bold" style={{ borderColor: 'var(--surface)', background: 'var(--accent)', color: 'white' }}>
                                                {p.username?.charAt(0).toUpperCase()}
                                            </div>
                                        )
                                    ))}
                                    {session.participants.length > 6 && (
                                        <div className="w-6 h-6 rounded-full border-2 flex items-center justify-center text-[8px] font-bold" style={{ borderColor: 'var(--surface)', background: 'var(--surface-2)', color: 'var(--text-muted)' }}>
                                            +{session.participants.length - 6}
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="flex gap-2">
                                <button
                                    onClick={() => handleJoin(session.id)}
                                    disabled={!!joinedSessionId}
                                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all"
                                    style={{ background: joinedSessionId ? 'var(--surface-2)' : 'var(--accent)', color: joinedSessionId ? 'var(--text-muted)' : 'white' }}
                                >
                                    <Play size={12} className="fill-current" /> Rejoindre
                                </button>
                                {session.creatorId === user?.id && (
                                    <button
                                        onClick={() => handleDelete(session.id)}
                                        className="px-3 py-2 rounded-lg text-xs font-semibold transition-all"
                                        style={{ background: 'var(--surface-2)', color: 'var(--text-muted)' }}
                                    >
                                        <Trash2 size={12} />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Empty State */}
            {sessions.length === 0 && !joinedSession && (
                <div className="tsi-card text-center py-8">
                    <Timer size={40} className="mx-auto mb-3 text-text-muted opacity-40" />
                    <p className="font-medium text-sm text-text mb-1">Aucune session active</p>
                    <p className="text-xs text-text-muted">Créez une session pour commencer à étudier ensemble !</p>
                </div>
            )}

            {/* Create Session Button / Form */}
            {showCreate ? (
                <div className="tsi-card !p-4 space-y-3">
                    <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-sm text-text">Nouvelle session</h4>
                        <button onClick={() => setShowCreate(false)} className="text-text-muted"><X size={16} /></button>
                    </div>
                    <input
                        type="text"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        placeholder="Nom de la session (ex: Maths, Physique...)"
                        className="w-full px-3 py-2 rounded-lg text-sm border bg-surface"
                        style={{ borderColor: 'var(--border)', color: 'var(--text)', background: 'var(--surface)' }}
                        maxLength={50}
                    />
                    <div className="flex items-center gap-3">
                        <Clock size={14} className="text-text-muted shrink-0" />
                        <div className="flex gap-2 flex-wrap">
                            {[15, 25, 45, 60, 90].map(m => (
                                <button
                                    key={m}
                                    onClick={() => setNewMinutes(m)}
                                    className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                                    style={newMinutes === m
                                        ? { background: 'var(--accent)', color: 'white' }
                                        : { background: 'var(--surface-2)', color: 'var(--text-muted)', border: '1px solid var(--border)' }
                                    }
                                >
                                    {m} min
                                </button>
                            ))}
                        </div>
                    </div>
                    <button
                        onClick={handleCreate}
                        disabled={!newName.trim()}
                        className="w-full py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2"
                        style={{ background: newName.trim() ? 'var(--accent)' : 'var(--surface-2)', color: newName.trim() ? 'white' : 'var(--text-muted)' }}
                    >
                        <Plus size={14} /> Créer la session
                    </button>
                </div>
            ) : (
                <button
                    onClick={() => setShowCreate(true)}
                    className="w-full py-3 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 border border-dashed"
                    style={{ borderColor: 'var(--border)', color: 'var(--text-muted)', background: 'var(--surface)' }}
                >
                    <Plus size={16} /> Créer une session Focus
                </button>
            )}
        </div>
    );
}
