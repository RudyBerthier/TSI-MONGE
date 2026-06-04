import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, Pin, PinOff, Search, ArrowLeft, FileText, Clock, ChevronLeft, Bold, Italic, List, Heading, Code, Link2, CheckSquare, Eye, Edit3, Palette, Share2, Users, X, UserPlus, Shield, Menu } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { isToday, isYesterday, differenceInDays, format, isSameYear, parseISO, isValid } from 'date-fns';
import { fr } from 'date-fns/locale';

const COLORS = [
    { id: 'default', bg: 'var(--surface)', label: 'Défaut' },
    { id: 'blue', bg: '#1e3a5f', label: 'Bleu' },
    { id: 'green', bg: '#1a3a2a', label: 'Vert' },
    { id: 'purple', bg: '#2d1b4e', label: 'Violet' },
    { id: 'red', bg: '#3b1a1a', label: 'Rouge' },
    { id: 'orange', bg: '#3b2a1a', label: 'Orange' },
    { id: 'yellow', bg: '#3b3a1a', label: 'Jaune' },
    { id: 'teal', bg: '#1a3b3b', label: 'Sarcelle' },
];

const getColorBg = (id) => COLORS.find(c => c.id === id)?.bg || 'var(--surface)';

// Auto-save debounce hook
function useDebounce(fn, delay) {
    const timer = useRef(null);
    return useCallback((...args) => {
        clearTimeout(timer.current);
        timer.current = setTimeout(() => fn(...args), delay);
    }, [fn, delay]);
}

export function Notes() {
    const { user, getToken } = useAuth();
    const navigate = useNavigate();
    const [notes, setNotes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeNote, setActiveNote] = useState(null);
    const [search, setSearch] = useState('');

    // UI states
    const [saving, setSaving] = useState(false);
    const [showColors, setShowColors] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    // Sharing states
    const [showShareModal, setShowShareModal] = useState(false);
    const [shares, setShares] = useState([]);
    const [shareUsername, setShareUsername] = useState('');
    const [sharePermission, setSharePermission] = useState('read');

    const editorRef = useRef(null);

    const headers = () => ({
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`
    });

    // Fetch notes
    const loadNotes = useCallback(async () => {
        if (!user) return;
        try {
            const r = await fetch('/api/notes', { headers: headers() });
            const data = await r.json();
            const arr = Array.isArray(data) ? data : [];
            // Sort by descending updated_at and set
            arr.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
            setNotes(arr);
            if (arr.length > 0 && !activeNote) {
                setActiveNote(arr[0]);
            }
        } catch (e) { console.error('Load notes error', e); }
        finally { setLoading(false); }
    }, [user, getToken, activeNote]);

    useEffect(() => { loadNotes(); }, [loadNotes]);

    // Load shares when a note is selected and we are owner
    useEffect(() => {
        if (!activeNote || activeNote.user_id !== user?.id) {
            setShares([]);
            return;
        }
        fetch(`/api/notes/${activeNote.id}/shares`, { headers: headers() })
            .then(r => r.json())
            .then(data => setShares(Array.isArray(data) ? data : []))
            .catch(e => console.error(e));
    }, [activeNote?.id, user?.id]);

    // Update the editor content when the active note changes
    useEffect(() => {
        if (editorRef.current && activeNote) {
            // Only update if it's not the user currently typing to avoid resetting their caret position
            if (activeNote.content !== editorRef.current.innerHTML && document.activeElement !== editorRef.current) {
                editorRef.current.innerHTML = activeNote.content || '<p></p>';
            }
        }
    }, [activeNote?.id, activeNote?.content]);

    // Auto-save
    const saveNote = useCallback(async (note) => {
        if (!note || (note.is_shared && note.permission !== 'edit')) return;
        setSaving(true);
        try {
            await fetch(`/api/notes/${note.id}`, {
                method: 'PUT',
                headers: headers(),
                body: JSON.stringify({ title: note.title, content: note.content, color: note.color, pinned: note.pinned }),
            });
        } catch (e) { console.error('Save error:', e); }
        setSaving(false);
    }, [getToken]);

    const debouncedSave = useDebounce(saveNote, 800);

    // Update note locally + trigger save
    const updateActive = (field, value) => {
        if (!activeNote) return;
        if (activeNote.is_shared && activeNote.permission !== 'edit') {
            if (field === 'content') alert('Vous n\'avez que l\'accès en lecture à cette note.');
            return;
        }

        const updated = { ...activeNote, [field]: value, updated_at: new Date().toISOString() };
        setActiveNote(updated);
        setNotes(prev => prev.map(n => n.id === updated.id ? updated : n));
        debouncedSave(updated);
    };

    // Handle typing in the contentEditable div
    const handleEditorInput = () => {
        if (editorRef.current) {
            updateActive('content', editorRef.current.innerHTML);
        }
    };

    // Rich Text Editor Commands
    const execCommand = (command, value = null) => {
        if (!activeNote || (activeNote.is_shared && activeNote.permission !== 'edit')) return;
        if (editorRef.current) {
            editorRef.current.focus();
            document.execCommand(command, false, value);
            updateActive('content', editorRef.current.innerHTML);
        }
    };

    const handleCreateLink = () => {
        const url = prompt("Entrez l'URL du lien:", "https://");
        if (url) {
            execCommand('createLink', url);
        }
    };

    const insertBlockHTML = (html) => {
        execCommand('insertHTML', html);
    };

    // Create new note
    const createNote = async () => {
        try {
            const res = await fetch('/api/notes', {
                method: 'POST',
                headers: headers(),
                body: JSON.stringify({ title: 'Nouvelle Note', content: '<p>Commencez à écrire ici...</p>' }),
            });
            const note = await res.json();
            setNotes(prev => [note, ...prev]);
            setActiveNote(note);
            setIsSidebarOpen(false);
            setTimeout(() => {
                if (editorRef.current) editorRef.current.focus();
            }, 100);
        } catch (e) { console.error('Create error:', e); }
    };

    // Delete note
    const deleteNote = async (id) => {
        if (!confirm('Supprimer cette note ?')) return;
        try {
            await fetch(`/api/notes/${id}`, { method: 'DELETE', headers: headers() });
            setNotes(prev => prev.filter(n => n.id !== id));
            if (activeNote?.id === id) setActiveNote(null);
        } catch (e) { console.error('Delete error:', e); }
    };

    // Toggle pin
    const togglePin = async (note) => {
        const updated = { ...note, pinned: !note.pinned };
        if (!note.is_shared) {
            setActiveNote(a => a?.id === note.id ? updated : a);
            setNotes(prev => prev.map(n => n.id === note.id ? updated : n));
            await fetch(`/api/notes/${note.id}`, {
                method: 'PUT',
                headers: headers(),
                body: JSON.stringify({ pinned: !note.pinned }),
            });
        }
    };

    // Sharing logic
    const handleAddShare = async (e) => {
        e.preventDefault();
        if (!shareUsername.trim()) return;
        try {
            const res = await fetch(`/api/notes/${activeNote.id}/shares`, {
                method: 'POST',
                headers: headers(),
                body: JSON.stringify({ username: shareUsername.trim(), permission: sharePermission })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Erreur');
            setShares(prev => {
                const existing = prev.findIndex(s => s.user_id === data.user_id);
                if (existing >= 0) {
                    const newArr = [...prev];
                    newArr[existing] = data;
                    return newArr;
                }
                return [...prev, data];
            });
            setShareUsername('');
        } catch (e) { alert(e.message); }
    };

    const handleRemoveShare = async (userId) => {
        try {
            await fetch(`/api/notes/${activeNote.id}/shares/${userId}`, {
                method: 'DELETE',
                headers: headers()
            });
            setShares(prev => prev.filter(s => s.user_id !== userId));
        } catch (e) { alert('Erreur lors de la révocation'); }
    };

    // Filter notes
    const filtered = notes.filter(n => {
        if (!search) return true;
        const searchLower = search.toLowerCase();
        // Extract raw text from HTML content for searching
        const rawContent = n.content ? n.content.replace(/<[^>]+>/g, '').toLowerCase() : '';
        return (n.title || '').toLowerCase().includes(searchLower) || rawContent.includes(searchLower);
    });

    const sortedFiltered = [...filtered].sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
    const pinnedNotes = sortedFiltered.filter(n => n.pinned && !n.is_shared);
    const otherNotes = sortedFiltered.filter(n => !n.pinned && !n.is_shared);
    const sharedNotes = sortedFiltered.filter(n => n.is_shared);

    // Grouping logic for iOS style dates
    const groupNotes = (items) => {
        const groupsMap = new Map();
        const now = new Date();
        items.forEach(note => {
            const d = parseISO(note.updated_at);
            if (!isValid(d)) return;

            let label = '';
            const diff = differenceInDays(now, d);

            if (isToday(d)) label = "Aujourd'hui";
            else if (isYesterday(d)) label = "Hier";
            else if (diff <= 7) label = "7 derniers jours";
            else if (diff <= 30) label = "30 derniers jours";
            else if (isSameYear(d, now)) {
                label = format(d, 'MMMM', { locale: fr });
                label = label.charAt(0).toUpperCase() + label.slice(1);
            }
            else label = format(d, 'yyyy');

            if (!groupsMap.has(label)) groupsMap.set(label, []);
            groupsMap.get(label).push(note);
        });
        return Array.from(groupsMap.entries()).map(([label, list]) => ({ label, list }));
    };

    const otherNotesGroups = groupNotes(otherNotes);

    if (!user) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
                <div className="text-center p-8 rounded-2xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                    <FileText size={48} style={{ color: 'var(--text-muted)', margin: '0 auto 1rem' }} />
                    <h2 className="text-lg font-bold mb-2" style={{ color: 'var(--text)' }}>Connecte-toi</h2>
                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Pour accéder à tes notes personnelles</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg)' }}>
            <style>{`
                .notes-sidebar { scrollbar-width: thin; scrollbar-color: var(--border) transparent; }
                .notes-editor-scroll { scrollbar-width: thin; scrollbar-color: rgba(255,255,255,0.1) transparent; }
                
                /* Editor Content Styles */
                .rich-editor-content {
                    font-size: 0.95rem;
                    line-height: 1.6;
                    outline: none;
                }
                .rich-editor-content p {
                    margin-bottom: 0.8rem;
                }
                .rich-editor-content a {
                    color: var(--accent);
                    text-decoration: underline;
                }
                .rich-editor-content pre {
                    background: rgba(0,0,0,0.3);
                    padding: 1rem;
                    border-radius: 8px;
                    font-family: var(--font-mono);
                    color: #e2e8f0;
                    margin: 1rem 0;
                    overflow-x: auto;
                }
                .rich-editor-content code {
                    background: rgba(0,0,0,0.2);
                    padding: 0.2rem 0.4rem;
                    border-radius: 4px;
                    font-family: var(--font-mono);
                    color: var(--accent);
                }
                .rich-editor-content h1 { font-size: 1.8rem; font-weight: 800; margin: 1.5rem 0 0.8rem; line-height: 1.2; }
                .rich-editor-content h2 { font-size: 1.4rem; font-weight: 700; margin: 1.2rem 0 0.6rem; line-height: 1.3; }
                .rich-editor-content h3 { font-size: 1.1rem; font-weight: 600; margin: 1rem 0 0.4rem; }
                .rich-editor-content blockquote {
                    border-left: 3px solid var(--accent);
                    padding-left: 1rem;
                    color: var(--text-muted);
                    font-style: italic;
                    margin: 1rem 0;
                }
                .rich-editor-content ul { list-style-type: disc; margin-left: 1.5rem; margin-bottom: 1rem; }
                .rich-editor-content ol { list-style-type: decimal; margin-left: 1.5rem; margin-bottom: 1rem; }
                .rich-editor-content li { margin-bottom: 0.2rem; }
                /* Custom checkbox HTML support */
                .rich-editor-content .task-list-item { list-style: none; display: flex; align-items: flex-start; gap: 0.5rem; }
            `}</style>

            <div className="pt-[calc(env(safe-area-inset-top,0px)+3.5rem)] sm:pt-0" />

            <div className="flex-1 flex flex-col max-w-[1200px] w-full mx-auto px-4 pb-4 h-[calc(100vh-3.5rem)] sm:h-screen">
                {/* Header */}
                <div className="flex items-center justify-between mb-4 mt-4 shrink-0">
                    <div className="flex items-center gap-3">
                        <button onClick={() => navigate(-1)} className="p-2 rounded-xl transition-colors hover:bg-black/5 dark:hover:bg-white/5" style={{ color: 'var(--text-muted)' }}>
                            <ArrowLeft size={18} />
                        </button>

                        {/* Mobile Title - Clickable to open sidebar */}
                        <div className="sm:hidden cursor-pointer active:opacity-70 transition-opacity" onClick={() => setIsSidebarOpen(true)}>
                            <h1 className="text-xl font-bold flex items-center gap-2" style={{ color: 'var(--text)' }}>
                                Mes Notes <Menu size={16} style={{ color: 'var(--text-muted)' }} />
                            </h1>
                            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{notes.length} note{notes.length !== 1 ? 's' : ''}</p>
                        </div>

                        {/* Desktop Title */}
                        <div className="hidden sm:block">
                            <h1 className="text-xl font-bold" style={{ color: 'var(--text)' }}>Mes Notes <span style={{ fontSize: '12px', opacity: 0.5 }}>Pro</span></h1>
                            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{notes.length} note{notes.length !== 1 ? 's' : ''}</p>
                        </div>
                    </div>
                    <button
                        onClick={createNote}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm transition-all hover:scale-105"
                        style={{ background: 'var(--accent)', color: 'white', boxShadow: '0 4px 12px rgba(var(--accent-rgb), 0.3)' }}
                    >
                        <Plus size={16} /> <span className="hidden sm:inline">Nouvelle note</span>
                    </button>
                </div>

                <div className="flex flex-1 gap-4 min-h-0 relative">
                    {/* ═══ Sidebar ═══ */}
                    {isSidebarOpen && (
                        <div
                            className="fixed inset-x-0 bottom-0 z-40 bg-black/50 sm:hidden"
                            style={{ top: 'calc(env(safe-area-inset-top, 0px) + 3.5rem)' }}
                            onClick={() => setIsSidebarOpen(false)}
                        />
                    )}
                    <div className={`
                        fixed sm:relative bottom-0 left-0 z-50 sm:z-0 top-[calc(env(safe-area-inset-top,0px)+3.5rem)] sm:top-0
                        w-[280px] sm:w-72 shrink-0 flex flex-col gap-3 notes-sidebar
                        bg-[var(--surface)] sm:bg-transparent border-r sm:border-r-0 border-[var(--border)]
                        p-4 sm:p-0 transform transition-all duration-300 ease-in-out
                        ${isSidebarOpen ? 'translate-x-0 shadow-2xl opacity-100' : '-translate-x-full sm:translate-x-0 sm:shadow-none opacity-0 sm:opacity-100'}
                    `} style={{
                            overflowY: 'auto'
                        }}>
                        {/* Search */}
                        <div className="relative sticky top-0 z-10 pb-1" style={{ background: 'var(--bg)' }}>
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 mt-[-2px]" style={{ color: 'var(--text-muted)' }} />
                            <input
                                type="text"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="Rechercher..."
                                className="w-full pl-9 pr-3 py-2 rounded-xl text-sm transition-colors focus:border-[var(--accent)]"
                                style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)', outline: 'none' }}
                            />
                        </div>

                        {loading ? (
                            <div className="space-y-2">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="h-16 rounded-xl animate-pulse" style={{ background: 'var(--surface-2)' }} />
                                ))}
                            </div>
                        ) : filtered.length === 0 ? (
                            <div className="text-center py-8">
                                <FileText size={32} style={{ color: 'var(--text-muted)', margin: '0 auto 0.5rem' }} />
                                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                                    {search ? 'Aucun résultat' : 'Aucune note'}
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-4 pb-4">
                                {pinnedNotes.length > 0 && (
                                    <div>
                                        <div className="text-[0.6rem] uppercase tracking-wider font-bold px-2 flex items-center gap-1.5 mb-1.5" style={{ color: 'var(--text-muted)' }}>
                                            <Pin size={10} /> Épinglées
                                        </div>
                                        <div className="space-y-1.5">
                                            {pinnedNotes.map(n => (
                                                <NoteCard key={n.id} note={n} active={activeNote?.id === n.id} onClick={() => { setActiveNote(n); setIsSidebarOpen(false); }} />
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {otherNotesGroups.length > 0 && otherNotesGroups.map((group, i) => (
                                    <div key={group.label}>
                                        <div className={`text-[0.6rem] uppercase tracking-wider font-bold px-2 flex mb-1.5 ${i > 0 || pinnedNotes.length > 0 ? 'mt-4' : ''}`} style={{ color: 'var(--text-muted)' }}>
                                            {group.label}
                                        </div>
                                        <div className="space-y-1.5">
                                            {group.list.map(n => (
                                                <NoteCard key={n.id} note={n} active={activeNote?.id === n.id} onClick={() => { setActiveNote(n); setIsSidebarOpen(false); }} />
                                            ))}
                                        </div>
                                    </div>
                                ))}

                                {sharedNotes.length > 0 && (
                                    <div>
                                        <div className="text-[0.6rem] uppercase tracking-wider font-bold px-2 flex items-center gap-1.5 mb-1.5 mt-4" style={{ color: 'var(--accent)' }}>
                                            <Users size={10} /> Partagées avec moi
                                        </div>
                                        <div className="space-y-1.5">
                                            {sharedNotes.map(n => (
                                                <NoteCard key={n.id} note={n} active={activeNote?.id === n.id} onClick={() => { setActiveNote(n); setIsSidebarOpen(false); }} />
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* ═══ Editor ═══ */}
                    <div className="flex-1 min-w-0 flex flex-col rounded-2xl overflow-hidden shadow-md" style={{ border: '1px solid var(--border)' }}>
                        {activeNote ? (
                            <div className="flex-1 flex flex-col" style={{ background: getColorBg(activeNote.color) }}>

                                {/* ── WYSIWYG Toolbar ── */}
                                <div className="flex flex-wrap items-center justify-between px-4 py-1.5 gap-2 min-h-[44px]" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.2)' }}>

                                    {/* Formatting tools */}
                                    <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide flex-nowrap">
                                        <TBBtn onClick={() => execCommand('bold')} title="Gras" disabled={activeNote.is_shared && activeNote.permission !== 'edit'}><Bold size={14} /></TBBtn>
                                        <TBBtn onClick={() => execCommand('italic')} title="Italique" disabled={activeNote.is_shared && activeNote.permission !== 'edit'}><Italic size={14} /></TBBtn>

                                        <div className="w-px h-4 mx-1" style={{ background: 'rgba(255,255,255,0.1)' }} />

                                        <TBBtn onClick={() => execCommand('formatBlock', 'H1')} title="Titre 1" disabled={activeNote.is_shared && activeNote.permission !== 'edit'}><Heading size={14} /></TBBtn>
                                        <TBBtn onClick={() => execCommand('insertUnorderedList')} title="Liste" disabled={activeNote.is_shared && activeNote.permission !== 'edit'}><List size={14} /></TBBtn>
                                        <TBBtn onClick={() => insertBlockHTML('<li class="task-list-item"><input type="checkbox"/> Tâche...</li>')} title="Checkbox" disabled={activeNote.is_shared && activeNote.permission !== 'edit'}><CheckSquare size={14} /></TBBtn>
                                        <TBBtn onClick={handleCreateLink} title="Lien" disabled={activeNote.is_shared && activeNote.permission !== 'edit'}><Link2 size={14} /></TBBtn>

                                        <div className="w-px h-4 mx-1" style={{ background: 'rgba(255,255,255,0.1)' }} />

                                        {/* Colors (Owner or Editor) */}
                                        {(!activeNote.is_shared || activeNote.permission === 'edit') && (
                                            <div className="relative">
                                                <TBBtn onClick={() => setShowColors(!showColors)} title="Couleur de fond"><Palette size={14} /></TBBtn>
                                                {showColors && (
                                                    <div className="absolute top-full left-0 mt-1 p-2 rounded-xl z-50 flex flex-wrap w-36 gap-1.5" style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
                                                        {COLORS.map(c => (
                                                            <button
                                                                key={c.id}
                                                                onClick={() => { updateActive('color', c.id); setShowColors(false); }}
                                                                className="w-6 h-6 rounded-full transition-transform hover:scale-110"
                                                                title={c.label}
                                                                style={{
                                                                    background: c.bg,
                                                                    border: activeNote.color === c.id ? `2px solid var(--accent)` : '1px solid var(--border)',
                                                                }}
                                                            />
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Action tools */}
                                    <div className="flex items-center gap-1">
                                        {saving && <span className="text-[0.65rem] font-medium mr-2 px-2 py-0.5 rounded-full bg-black/20" style={{ color: 'var(--text-muted)' }}>Enregistrement...</span>}

                                        {activeNote.is_shared && (
                                            <span className="text-[0.65rem] uppercase font-bold px-2 py-0.5 rounded mr-1"
                                                style={{ background: activeNote.permission === 'edit' ? 'rgba(59,130,246,0.2)' : 'rgba(239,68,68,0.2)', color: activeNote.permission === 'edit' ? '#60a5fa' : '#f87171' }}>
                                                {activeNote.permission === 'edit' ? 'Édition' : 'Lecture seule'}
                                            </span>
                                        )}

                                        {/* Owner actions */}
                                        {!activeNote.is_shared && (
                                            <>
                                                <TBBtn onClick={() => setShowShareModal(true)} title="Partager" active={shares.length > 0}>
                                                    <Share2 size={14} />
                                                </TBBtn>
                                                <TBBtn onClick={() => togglePin(activeNote)} title={activeNote.pinned ? 'Désépingler' : 'Épingler'}>
                                                    {activeNote.pinned ? <PinOff size={14} /> : <Pin size={14} />}
                                                </TBBtn>
                                                <TBBtn onClick={() => deleteNote(activeNote.id)} title="Supprimer" danger>
                                                    <Trash2 size={14} />
                                                </TBBtn>
                                            </>
                                        )}
                                    </div>
                                </div>

                                {/* ── Editor Area ── */}
                                <div className="flex-1 flex flex-col overflow-y-auto notes-editor-scroll">
                                    {/* Title Bar */}
                                    <div className="px-10 pt-8 pb-4">
                                        <input
                                            className="w-full text-3xl font-black bg-transparent border-none outline-none placeholder:opacity-30"
                                            style={{ color: 'var(--text)' }}
                                            value={activeNote.title || ''}
                                            onChange={e => updateActive('title', e.target.value)}
                                            readOnly={activeNote.is_shared && activeNote.permission !== 'edit'}
                                            placeholder="Titre de la note..."
                                        />
                                        <div className="mt-2 text-[0.7rem] font-medium opacity-50 flex items-center justify-between" style={{ color: 'var(--text)' }}>
                                            <div className="flex items-center gap-1.5">
                                                <Clock size={12} />
                                                Modifié le {new Date(activeNote.updated_at).toLocaleString('fr-FR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Rich Text body */}
                                    <div
                                        ref={editorRef}
                                        onInput={handleEditorInput}
                                        onBlur={handleEditorInput} // Backup save point
                                        className="flex-1 px-10 pb-20 rich-editor-content"
                                        contentEditable={!activeNote.is_shared || activeNote.permission === 'edit'}
                                        suppressContentEditableWarning={true}
                                        style={{ color: 'var(--text)' }}
                                    />
                                </div>
                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center" style={{ background: 'var(--surface)' }}>
                                <div className="p-4 rounded-full bg-black/5 dark:bg-white/5 mb-4">
                                    <FileText size={48} style={{ color: 'var(--text-muted)' }} />
                                </div>
                                <p className="text-xl font-bold mb-1" style={{ color: 'var(--text)' }}>Sélectionne une note</p>
                                <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>ou crée-en une nouvelle pour commencer</p>
                                <button
                                    onClick={createNote}
                                    className="flex items-center gap-2 px-6 py-3 rounded-full font-bold text-sm transition-all hover:scale-105"
                                    style={{ background: 'var(--accent)', color: 'white', boxShadow: '0 8px 24px rgba(var(--accent-rgb), 0.3)' }}
                                >
                                    <Plus size={18} /> Créer une note
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Share Modal ── */}
            {showShareModal && activeNote && !activeNote.is_shared && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
                    <div className="w-full max-w-md rounded-2xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: '0 20px 40px rgba(0,0,0,0.4)' }}>
                        <div className="p-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
                            <h3 className="font-bold flex items-center gap-2" style={{ color: 'var(--text)' }}>
                                <Share2 size={18} /> Partager la note
                            </h3>
                            <button onClick={() => setShowShareModal(false)} className="p-1 rounded-lg hover:bg-black/10 dark:hover:bg-white/10" style={{ color: 'var(--text-muted)' }}>
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-5 space-y-5">
                            <form onSubmit={handleAddShare} className="flex gap-2">
                                <div className="flex-1 relative">
                                    <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-muted">@</div>
                                    <input
                                        type="text"
                                        value={shareUsername}
                                        onChange={e => setShareUsername(e.target.value)}
                                        placeholder="Nom d'utilisateur"
                                        className="w-full pl-8 pr-3 py-2.5 rounded-xl text-sm outline-none transition-colors focus:border-[var(--accent)]"
                                        style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' }}
                                        required
                                    />
                                </div>
                                <select
                                    value={sharePermission}
                                    onChange={e => setSharePermission(e.target.value)}
                                    className="py-2.5 px-3 rounded-xl text-sm outline-none"
                                    style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' }}
                                >
                                    <option value="read">Lecture</option>
                                    <option value="edit">Édition</option>
                                </select>
                                <button type="submit" className="p-2.5 rounded-xl bg-[var(--accent)] text-white hover:opacity-90 transition-opacity">
                                    <UserPlus size={18} />
                                </button>
                            </form>

                            <div>
                                <h4 className="text-xs font-bold uppercase tracking-wider mb-2 opacity-50" style={{ color: 'var(--text)' }}>Personnes ayant accès</h4>
                                {shares.length === 0 ? (
                                    <p className="text-sm italic opacity-50 text-center py-4" style={{ color: 'var(--text)' }}>Note privée (non partagée)</p>
                                ) : (
                                    <div className="space-y-2 max-h-48 overflow-y-auto">
                                        {shares.map(s => (
                                            <div key={s.user_id} className="flex items-center justify-between p-2.5 rounded-xl" style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full flex justify-center items-center text-xs font-bold bg-blue-500/10 text-blue-500">
                                                        {(s.username || '?')[0].toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <div className="text-sm font-bold" style={{ color: 'var(--text)' }}>{s.username}</div>
                                                        <div className="text-[0.65rem] uppercase font-bold tracking-wider" style={{ color: s.permission === 'edit' ? '#60a5fa' : 'var(--text-muted)' }}>
                                                            {s.permission === 'edit' ? 'Éditeur' : 'Lecteur'}
                                                        </div>
                                                    </div>
                                                </div>
                                                <button onClick={() => handleRemoveShare(s.user_id)} className="p-1.5 rounded-lg text-red-500/70 hover:bg-red-500/10 hover:text-red-500 transition-colors">
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="p-4" style={{ background: 'var(--bg)', borderTop: '1px solid var(--border)' }}>
                            <button onClick={() => setShowShareModal(false)} className="w-full py-2.5 rounded-xl font-bold text-sm" style={{ background: 'var(--surface-2)', color: 'var(--text)' }}>
                                Fermer
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Note Card (sidebar) ────────────────────────────────────────
function NoteCard({ note, active, onClick }) {
    // Strip HTML for the preview text
    const previewRaw = note.content ? note.content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() : '';
    const preview = previewRaw.substring(0, 80);

    return (
        <button
            onClick={onClick}
            className="w-full text-left px-3 py-2.5 rounded-xl transition-all relative overflow-hidden group"
            style={{
                background: active ? 'rgba(var(--accent-rgb), 0.15)' : getColorBg(note.color),
                border: active ? '1px solid rgba(var(--accent-rgb), 0.4)' : '1px solid transparent',
            }}
        >
            <div className="flex items-start justify-between gap-2 relative z-10">
                <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold truncate flex items-center gap-1.5" style={{ color: 'var(--text)' }}>
                        {note.pinned && !note.is_shared && <Pin size={12} className="shrink-0" style={{ color: 'var(--accent)' }} />}
                        {note.is_shared && <Users size={12} className="shrink-0" style={{ color: note.permission === 'edit' ? '#60a5fa' : 'var(--text-muted)' }} />}
                        <span className="truncate">{note.title || 'Sans titre'}</span>
                    </div>
                    {preview && (
                        <div className="text-[0.7rem] truncate mt-1 opacity-70" style={{ color: 'var(--text)' }}>{preview}</div>
                    )}
                    <div className="text-[0.6rem] mt-1.5 opacity-50 font-medium" style={{ color: 'var(--text)' }}>
                        {new Date(note.updated_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                    </div>
                </div>
            </div>

            {/* Subtle border effect on hover for non-active */}
            {!active && <div className="absolute inset-0 border border-white/5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />}
        </button>
    );
}

// ─── Toolbar Button ─────────────────────────────────────────────
function TBBtn({ children, onClick, title, active, danger, disabled }) {
    return (
        <button
            onClick={onClick}
            title={title}
            disabled={disabled}
            className={`p-1.5 rounded-lg transition-colors flex items-center justify-center ${disabled ? 'opacity-30 cursor-not-allowed' : ''}`}
            style={{
                color: danger && !disabled ? '#EF4444' : active ? 'white' : 'white',
                background: active ? 'var(--accent)' : 'transparent',
                opacity: (disabled || (!active && !danger)) ? 0.7 : 1,
                width: '32px',
                height: '32px'
            }}
            onMouseEnter={e => { if (!active && !disabled) e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
            onMouseLeave={e => { if (!active && !disabled) e.currentTarget.style.background = 'transparent'; }}
        >
            {children}
        </button>
    );
}
