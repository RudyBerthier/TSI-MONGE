import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Plus, Pin, ArrowRight } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export default function NotesWidget() {
    const { user, getToken, isAuthenticated } = useAuth();
    const [notes, setNotes] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!isAuthenticated) { setLoading(false); return; }
        fetch('/api/notes', { headers: { 'Authorization': `Bearer ${getToken()}` } })
            .then(r => r.json())
            .then(data => setNotes(Array.isArray(data) ? data.slice(0, 4) : []))
            .catch(() => { })
            .finally(() => setLoading(false));
    }, [isAuthenticated]);

    if (!isAuthenticated) return null;

    const getPreview = (content) => (content || '').replace(/[#*`\[\]\->\n]/g, ' ').trim().substring(0, 60);

    return (
        <section>
            <div className="tsi-section-label">
                <FileText size={13} />
                <span>Mes Notes</span>
            </div>

            <div className="tsi-card">
                {loading ? (
                    <div className="space-y-2">
                        {[1, 2].map(i => (
                            <div key={i} className="h-12 rounded-lg animate-pulse" style={{ background: 'var(--surface-2)' }} />
                        ))}
                    </div>
                ) : notes.length === 0 ? (
                    <div className="text-center py-4">
                        <FileText size={28} style={{ color: 'var(--text-muted)', margin: '0 auto 0.5rem' }} />
                        <p className="text-sm font-medium mb-3" style={{ color: 'var(--text-muted)' }}>Aucune note</p>
                        <Link
                            to="/notes"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:scale-105"
                            style={{ background: 'var(--accent)', color: 'white', textDecoration: 'none' }}
                        >
                            <Plus size={13} /> Créer ma première note
                        </Link>
                    </div>
                ) : (
                    <>
                        <div className="space-y-1.5">
                            {notes.map(note => (
                                <Link
                                    key={note.id}
                                    to="/notes"
                                    className="flex items-start gap-2.5 px-3 py-2 rounded-lg transition-all hover:scale-[1.01]"
                                    style={{ background: 'var(--surface-2)', textDecoration: 'none', border: '1px solid transparent' }}
                                    onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(var(--accent-rgb), 0.2)'}
                                    onMouseLeave={e => e.currentTarget.style.borderColor = 'transparent'}
                                >
                                    <div className="min-w-0 flex-1">
                                        <div className="text-sm font-semibold truncate" style={{ color: 'var(--text)' }}>
                                            {note.pinned && <Pin size={10} className="inline mr-1" style={{ color: 'var(--accent)' }} />}
                                            {note.title || 'Sans titre'}
                                        </div>
                                        {getPreview(note.content) && (
                                            <div className="text-[0.65rem] truncate mt-0.5" style={{ color: 'var(--text-muted)' }}>
                                                {getPreview(note.content)}
                                            </div>
                                        )}
                                    </div>
                                    <span className="text-[0.6rem] shrink-0 mt-0.5" style={{ color: 'var(--text-muted)' }}>
                                        {new Date(note.updated_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                                    </span>
                                </Link>
                            ))}
                        </div>
                        <Link
                            to="/notes"
                            className="flex items-center justify-center gap-1.5 mt-3 py-2 rounded-lg text-xs font-semibold transition-all hover:scale-[1.01]"
                            style={{ color: 'var(--accent)', textDecoration: 'none', background: 'rgba(var(--accent-rgb), 0.06)' }}
                        >
                            Voir toutes les notes <ArrowRight size={12} />
                        </Link>
                    </>
                )}
            </div>
        </section>
    );
}
