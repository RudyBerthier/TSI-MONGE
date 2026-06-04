import React, { useState, useEffect } from 'react';
import { Trash2, RefreshCw, Bug, Lightbulb, MessageSquare, CheckCircle, Clock, XCircle, ChevronDown, ChevronUp } from 'lucide-react';

const STATUS_CONFIG = {
  pending:     { label: 'En attente',  color: 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20', icon: Clock },
  in_progress: { label: 'En cours',    color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20',     icon: RefreshCw },
  resolved:    { label: 'Résolu',      color: 'text-green-600 bg-green-50 dark:bg-green-900/20',   icon: CheckCircle },
  rejected:    { label: 'Rejeté',      color: 'text-red-600 bg-red-50 dark:bg-red-900/20',         icon: XCircle },
};

const TYPE_ICON = {
  bug:     Bug,
  feature: Lightbulb,
  other:   MessageSquare,
};

function ReportRow({ report, onStatusChange, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const [notes, setNotes] = useState(report.admin_notes || '');
  const [saving, setSaving] = useState(false);

  const StatusIcon = STATUS_CONFIG[report.status]?.icon || Clock;
  const TypeIcon   = TYPE_ICON[report.type] || MessageSquare;

  const save = async (status) => {
    setSaving(true);
    await onStatusChange(report.id, status ?? report.status, notes);
    setSaving(false);
  };

  return (
    <div className="rounded-2xl border overflow-hidden transition-all" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
      <div className="p-4 flex items-start gap-3 cursor-pointer" onClick={() => setExpanded(e => !e)}>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'var(--surface-2)' }}>
          <TypeIcon size={18} style={{ color: 'var(--text-muted)' }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold truncate text-sm" style={{ color: 'var(--text)' }}>{report.title}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1 ${STATUS_CONFIG[report.status]?.color}`}>
              <StatusIcon size={10} />
              {STATUS_CONFIG[report.status]?.label ?? report.status}
            </span>
          </div>
          <div className="text-xs mt-0.5 flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
            <span>{report.users?.username ?? 'Anonyme'}</span>
            <span>·</span>
            <span>{new Date(report.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        </div>
        {expanded ? <ChevronUp size={18} style={{ color: 'var(--text-muted)' }} /> : <ChevronDown size={18} style={{ color: 'var(--text-muted)' }} />}
      </div>

      {expanded && (
        <div className="px-4 pb-4 border-t space-y-3" style={{ borderColor: 'var(--border)' }}>
          <p className="text-sm pt-3 whitespace-pre-wrap" style={{ color: 'var(--text)' }}>{report.description}</p>
          {report.url && (
            <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>URL : {report.url}</p>
          )}

          <div className="flex flex-wrap gap-2 pt-1">
            {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
              <button
                key={key}
                onClick={() => save(key)}
                disabled={report.status === key || saving}
                className={`text-xs px-3 py-1 rounded-full font-medium border transition-all disabled:opacity-40 ${report.status === key ? cfg.color + ' border-transparent' : 'border-current opacity-60 hover:opacity-100'}`}
                style={{ color: report.status === key ? '' : 'var(--text-muted)', borderColor: 'var(--border)' }}
              >
                {cfg.label}
              </button>
            ))}
          </div>

          <textarea
            className="w-full text-xs p-2 rounded-xl resize-none outline-none"
            style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)', minHeight: '64px' }}
            placeholder="Notes admin..."
            value={notes}
            onChange={e => setNotes(e.target.value)}
          />

          <div className="flex gap-2">
            <button
              onClick={() => save()}
              disabled={saving}
              className="flex-1 py-2 text-xs font-semibold rounded-xl transition-colors disabled:opacity-50"
              style={{ background: 'var(--accent)', color: '#fff' }}
            >
              {saving ? 'Enregistrement...' : 'Sauvegarder'}
            </button>
            <button
              onClick={() => onDelete(report.id)}
              className="px-3 py-2 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminBugReports() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');

  const token = localStorage.getItem('token');

  const fetchReports = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/bug-reports', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error(await res.text());
      setReports(await res.json());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchReports(); }, []);

  const handleStatusChange = async (id, status, admin_notes) => {
    await fetch(`/api/bug-reports/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status, admin_notes })
    });
    setReports(r => r.map(x => x.id === id ? { ...x, status, admin_notes } : x));
  };

  const handleDelete = async (id) => {
    if (!confirm('Supprimer ce rapport ?')) return;
    await fetch(`/api/bug-reports/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    setReports(r => r.filter(x => x.id !== id));
  };

  const filtered = filter === 'all' ? reports : reports.filter(r => r.status === filter);
  const counts = Object.fromEntries(Object.keys(STATUS_CONFIG).map(k => [k, reports.filter(r => r.status === k).length]));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-lg flex items-center gap-2" style={{ color: 'var(--text)' }}>
          <Bug size={20} /> Bugs &amp; Retours
          <span className="text-sm font-normal" style={{ color: 'var(--text-muted)' }}>({reports.length})</span>
        </h3>
        <button onClick={fetchReports} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 transition-colors" title="Rafraîchir">
          <RefreshCw size={16} style={{ color: 'var(--text-muted)' }} />
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {[['all', 'Tous', reports.length], ...Object.entries(STATUS_CONFIG).map(([k, v]) => [k, v.label, counts[k] ?? 0])].map(([key, label, count]) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${filter === key ? 'bg-gray-900 text-white dark:bg-white dark:text-black' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-white/10'}`}
          >
            {label} {count > 0 && <span className="ml-1 opacity-60">{count}</span>}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-12 text-center text-sm" style={{ color: 'var(--text-muted)' }}>Chargement...</div>
      ) : error ? (
        <div className="py-12 text-center text-sm text-red-500">{error}</div>
      ) : filtered.length === 0 ? (
        <div className="py-12 text-center text-sm" style={{ color: 'var(--text-muted)' }}>Aucun rapport.</div>
      ) : (
        <div className="space-y-3">
          {filtered.map(r => (
            <ReportRow key={r.id} report={r} onStatusChange={handleStatusChange} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </div>
  );
}
