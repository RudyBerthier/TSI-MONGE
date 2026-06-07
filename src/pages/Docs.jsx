import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  BookOpen, Search, ChevronRight, ChevronDown, Copy, Check, Menu, X,
  Server, Shield, MessageSquare, Zap, Music, Calendar, Users, Bell,
  Code, Hash, ExternalLink, ArrowLeft, Home, Lock, Unlock, Globe,
  Database, Wifi, Settings, FileText, AlertCircle, Info, CheckCircle, XCircle
} from 'lucide-react'
import { DOC_SECTIONS, DOC_CONTENT } from '../data/docsContent.jsx'
import '../styles/docs.css'

// ─── Simple Markdown Renderer ─────────────────────────────────────────────────
function renderMarkdown(text) {
  if (!text) return ''
  let html = text
  // Code blocks
  html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, (_, lang, code) =>
    `<pre class="doc-code-block"><div class="doc-code-header"><span class="doc-code-lang">${lang || 'code'}</span><button class="doc-code-copy" data-code="${encodeURIComponent(code.trim())}"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>Copier</button></div><code class="language-${lang || ''}">${escapeHtml(code.trim())}</code></pre>`
  )
  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code class="doc-inline-code">$1</code>')
  // Headings
  html = html.replace(/^#### (.+)$/gm, '<h4 class="doc-h4" id="$1">$1</h4>')
  html = html.replace(/^### (.+)$/gm, '<h3 class="doc-h3" id="$1">$1</h3>')
  html = html.replace(/^## (.+)$/gm, '<h2 class="doc-h2" id="$1">$1</h2>')
  html = html.replace(/^# (.+)$/gm, '<h1 class="doc-h1" id="$1">$1</h1>')
  // Bold + italic
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>')
  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="doc-link" target="_blank" rel="noopener">$1</a>')
  // Alerts
  html = html.replace(/^:::(\w+)\s*\n([\s\S]*?):::/gm, (_, type, content) => {
    const icons = { info: '💡', warning: '⚠️', danger: '🚨', success: '✅', tip: '🔹' }
    return `<div class="doc-alert doc-alert-${type}"><span class="doc-alert-icon">${icons[type] || '📌'}</span><div class="doc-alert-body">${content.trim()}</div></div>`
  })
  // Tables
  html = html.replace(/^\|(.+)\|\n\|[-|: ]+\|\n((?:\|.+\|\n?)+)/gm, (_, header, rows) => {
    const headers = header.split('|').map(h => h.trim()).filter(Boolean)
    const headerHtml = headers.map(h => `<th>${h}</th>`).join('')
    const rowLines = rows.trim().split('\n')
    const rowsHtml = rowLines.map(row => {
      const cells = row.split('|').map(c => c.trim()).filter(Boolean)
      return `<tr>${cells.map(c => `<td>${c}</td>`).join('')}</tr>`
    }).join('')
    return `<div class="doc-table-wrapper"><table class="doc-table"><thead><tr>${headerHtml}</tr></thead><tbody>${rowsHtml}</tbody></table></div>`
  })
  // Badges
  html = html.replace(/\[badge:(\w+):([^\]]+)\]/g, (_, type, text) =>
    `<span class="doc-badge doc-badge-${type}">${text}</span>`
  )
  // Blockquote
  html = html.replace(/^> (.+)$/gm, '<blockquote class="doc-blockquote">$1</blockquote>')
  // Horizontal rule
  html = html.replace(/^---+$/gm, '<hr class="doc-hr" />')
  // Lists
  html = html.replace(/^- (.+)$/gm, '<li>$1</li>')
  html = html.replace(/(<li>[\s\S]*?<\/li>)/g, m => `<ul class="doc-list">${m}</ul>`)
  html = html.replace(/<\/ul>\s*<ul class="doc-list">/g, '')
  // Numbered lists  
  html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
  // Paragraphs
  html = html.split('\n\n').map(block => {
    if (block.match(/^<[^/]/) || block.match(/^```/) || block.match(/^#/)) return block
    return `<p class="doc-p">${block.replace(/\n/g, ' ')}</p>`
  }).join('\n')
  return html
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// ─── Method Badge ─────────────────────────────────────────────────────────────
function MethodBadge({ method }) {
  const colors = {
    GET: 'method-get', POST: 'method-post', PUT: 'method-put',
    DELETE: 'method-delete', PATCH: 'method-patch', WS: 'method-ws'
  }
  return <span className={`method-badge ${colors[method] || 'method-get'}`}>{method}</span>
}

// ─── Endpoint Card ────────────────────────────────────────────────────────────
function EndpointCard({ endpoint }) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  const copyPath = () => {
    navigator.clipboard.writeText(endpoint.path)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className={`endpoint-card ${open ? 'open' : ''}`}>
      <div className="endpoint-header" onClick={() => setOpen(!open)}>
        <div className="endpoint-header-left">
          <MethodBadge method={endpoint.method} />
          <code className="endpoint-path">{endpoint.path}</code>
          {endpoint.auth && <span className="endpoint-auth-badge"><Lock size={10} /> Auth</span>}
          {endpoint.admin && <span className="endpoint-admin-badge">Admin</span>}
        </div>
        <div className="endpoint-header-right">
          <span className="endpoint-summary">{endpoint.summary}</span>
          <button className="endpoint-copy-btn" onClick={e => { e.stopPropagation(); copyPath() }}>
            {copied ? <Check size={12} /> : <Copy size={12} />}
          </button>
          <ChevronDown className={`endpoint-chevron ${open ? 'rotated' : ''}`} size={16} />
        </div>
      </div>

      {open && (
        <div className="endpoint-body">
          {endpoint.description && <p className="endpoint-description">{endpoint.description}</p>}

          {endpoint.params && endpoint.params.length > 0 && (
            <div className="endpoint-section">
              <h5>Paramètres URL</h5>
              <div className="param-table">
                {endpoint.params.map(p => (
                  <div key={p.name} className="param-row">
                    <div className="param-name">
                      <code>{p.name}</code>
                      {p.required && <span className="param-required">*</span>}
                    </div>
                    <div className="param-type">{p.type}</div>
                    <div className="param-desc">{p.description}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {endpoint.query && endpoint.query.length > 0 && (
            <div className="endpoint-section">
              <h5>Query Params</h5>
              <div className="param-table">
                {endpoint.query.map(q => (
                  <div key={q.name} className="param-row">
                    <div className="param-name">
                      <code>{q.name}</code>
                      {q.required && <span className="param-required">*</span>}
                    </div>
                    <div className="param-type">{q.type}</div>
                    <div className="param-desc">{q.description}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {endpoint.body && endpoint.body.length > 0 && (
            <div className="endpoint-section">
              <h5>Body (JSON)</h5>
              <div className="param-table">
                {endpoint.body.map(b => (
                  <div key={b.name} className="param-row">
                    <div className="param-name">
                      <code>{b.name}</code>
                      {b.required && <span className="param-required">*</span>}
                    </div>
                    <div className="param-type">{b.type}</div>
                    <div className="param-desc">{b.description}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {endpoint.headers && endpoint.headers.length > 0 && (
            <div className="endpoint-section">
              <h5>Headers</h5>
              <div className="param-table">
                {endpoint.headers.map(h => (
                  <div key={h.name} className="param-row">
                    <div className="param-name"><code>{h.name}</code></div>
                    <div className="param-type">{h.type || 'string'}</div>
                    <div className="param-desc">{h.description}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {endpoint.responses && Object.keys(endpoint.responses).length > 0 && (
            <div className="endpoint-section">
              <h5>Réponses</h5>
              {Object.entries(endpoint.responses).map(([status, resp]) => (
                <div key={status} className="response-item">
                  <div className="response-header">
                    <span className={`response-status status-${status[0]}`}>{status}</span>
                    <span className="response-label">{resp.label}</span>
                  </div>
                  {resp.example && (
                    <pre className="response-example"><code>{JSON.stringify(resp.example, null, 2)}</code></pre>
                  )}
                </div>
              ))}
            </div>
          )}

          {endpoint.example && (
            <div className="endpoint-section">
              <h5>Exemple de requête</h5>
              <pre className="response-example"><code>{endpoint.example}</code></pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Section Renderer ─────────────────────────────────────────────────────────
function DocSection({ content }) {
  const ref = useRef(null)

  useEffect(() => {
    if (!ref.current) return
    ref.current.querySelectorAll('.doc-code-copy').forEach(btn => {
      btn.addEventListener('click', () => {
        const code = decodeURIComponent(btn.dataset.code)
        navigator.clipboard.writeText(code)
        btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>Copié!'
        setTimeout(() => {
          btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>Copier'
        }, 2000)
      })
    })
  }, [content])

  if (!content) return null

  return (
    <div className="doc-section-wrapper">
      {content.markdown && (
        <div
          ref={ref}
          className="doc-markdown"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(content.markdown) }}
        />
      )}
      {content.endpoints && content.endpoints.length > 0 && (
        <div className="endpoints-list">
          {content.endpoints.map((ep, i) => (
            <EndpointCard key={i} endpoint={ep} />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Search Modal ─────────────────────────────────────────────────────────────
function SearchModal({ onClose, onSelect }) {
  const [query, setQuery] = useState('')
  const inputRef = useRef(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  useEffect(() => {
    const handler = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const results = useMemo(() => {
    if (!query.trim() || query.length < 2) return []
    const q = query.toLowerCase()
    const out = []
    DOC_SECTIONS.forEach(cat => {
      cat.items.forEach(item => {
        const content = DOC_CONTENT[item.id]
        const inTitle = item.label.toLowerCase().includes(q)
        const inMarkdown = content?.markdown?.toLowerCase().includes(q)
        const inEndpoints = content?.endpoints?.some(ep =>
          ep.path?.toLowerCase().includes(q) ||
          ep.summary?.toLowerCase().includes(q) ||
          ep.description?.toLowerCase().includes(q)
        )
        if (inTitle || inMarkdown || inEndpoints) {
          out.push({ sectionId: item.id, label: item.label, cat: cat.label, inEndpoints })
        }
      })
    })
    return out.slice(0, 8)
  }, [query])

  return (
    <div className="search-modal-overlay" onClick={onClose}>
      <div className="search-modal" onClick={e => e.stopPropagation()}>
        <div className="search-input-wrapper">
          <Search size={18} className="search-input-icon" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Chercher dans la documentation…"
            className="search-input"
          />
          <kbd className="search-kbd" onClick={onClose}>Esc</kbd>
        </div>
        {results.length > 0 && (
          <div className="search-results">
            {results.map(r => (
              <button key={r.sectionId} className="search-result-item" onClick={() => { onSelect(r.sectionId); onClose() }}>
                <div>
                  <span className="search-result-cat">{r.cat}</span>
                  <span className="search-result-label">{r.label}</span>
                </div>
                {r.inEndpoints && <span className="search-result-tag">API</span>}
              </button>
            ))}
          </div>
        )}
        {query.length >= 2 && results.length === 0 && (
          <div className="search-empty">Aucun résultat pour « {query} »</div>
        )}
      </div>
    </div>
  )
}

// ─── Main Docs Page ───────────────────────────────────────────────────────────
export function Docs() {
  const [searchParams, setSearchParams] = useSearchParams()
  const activeId = searchParams.get('section') || DOC_SECTIONS[0]?.items[0]?.id
  const [openCats, setOpenCats] = useState(() => DOC_SECTIONS.map(c => c.id))
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const navigate = useNavigate()

  const setActive = useCallback((id) => {
    setSearchParams({ section: id })
    setSidebarOpen(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [setSearchParams])

  useEffect(() => {
    const handler = e => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setShowSearch(true) }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const toggleCat = id => {
    setOpenCats(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id])
  }

  const activeContent = DOC_CONTENT[activeId]
  const activeItem = DOC_SECTIONS.flatMap(c => c.items).find(i => i.id === activeId)
  const activeSection = DOC_SECTIONS.find(c => c.items.some(i => i.id === activeId))

  return (
    <div className="docs-root">
      {/* Top Bar */}
      <header className="docs-topbar">
        <div className="docs-topbar-left">
          <button className="docs-menu-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <button className="docs-back-btn" onClick={() => navigate('/')}>
            <ArrowLeft size={16} /> <span className="docs-back-text">Accueil</span>
          </button>
          <div className="docs-logo">
            <BookOpen size={20} />
            <span>TSI Monge <strong>Docs</strong></span>
          </div>
        </div>
        <div className="docs-topbar-right">
          <button className="docs-search-trigger" onClick={() => setShowSearch(true)}>
            <Search size={15} />
            <span>Rechercher…</span>
            <kbd>⌘K</kbd>
          </button>
          <a href="https://github.com" className="docs-github-link" target="_blank" rel="noopener">
            <ExternalLink size={14} /> GitHub
          </a>
        </div>
      </header>

      <div className="docs-body">
        {/* Sidebar */}
        <aside className={`docs-sidebar ${sidebarOpen ? 'open' : ''}`}>
          <div className="docs-sidebar-inner">
            {DOC_SECTIONS.map(cat => (
              <div key={cat.id} className="sidebar-cat">
                <button className="sidebar-cat-header" onClick={() => toggleCat(cat.id)}>
                  <span className="sidebar-cat-icon">{cat.icon}</span>
                  <span className="sidebar-cat-label">{cat.label}</span>
                  <ChevronDown className={`sidebar-chevron ${openCats.includes(cat.id) ? 'open' : ''}`} size={14} />
                </button>
                {openCats.includes(cat.id) && (
                  <div className="sidebar-items">
                    {cat.items.map(item => (
                      <button
                        key={item.id}
                        className={`sidebar-item ${activeId === item.id ? 'active' : ''}`}
                        onClick={() => setActive(item.id)}
                      >
                        <span className="sidebar-item-icon">{item.icon}</span>
                        {item.label}
                        {DOC_CONTENT[item.id]?.endpoints?.length > 0 && (
                          <span className="sidebar-api-count">{DOC_CONTENT[item.id].endpoints.length}</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </aside>

        {/* Overlay mobile */}
        {sidebarOpen && <div className="docs-sidebar-overlay" onClick={() => setSidebarOpen(false)} />}

        {/* Main Content */}
        <main className="docs-content">
          {/* Breadcrumb */}
          <div className="docs-breadcrumb">
            <span>{activeSection?.label}</span>
            <ChevronRight size={14} />
            <span className="docs-breadcrumb-active">{activeItem?.label}</span>
          </div>

          {/* Content */}
          {activeContent ? (
            <DocSection content={activeContent} />
          ) : (
            <div className="docs-empty">
              <BookOpen size={40} />
              <p>Cette section est en cours de rédaction.</p>
            </div>
          )}

          {/* Navigation prev/next */}
          <div className="docs-nav-footer">
            {(() => {
              const allItems = DOC_SECTIONS.flatMap(c => c.items)
              const idx = allItems.findIndex(i => i.id === activeId)
              const prev = allItems[idx - 1]
              const next = allItems[idx + 1]
              return (
                <>
                  {prev ? (
                    <button className="docs-nav-btn prev" onClick={() => setActive(prev.id)}>
                      <ArrowLeft size={14} /> {prev.label}
                    </button>
                  ) : <div />}
                  {next ? (
                    <button className="docs-nav-btn next" onClick={() => setActive(next.id)}>
                      {next.label} <ChevronRight size={14} />
                    </button>
                  ) : <div />}
                </>
              )
            })()}
          </div>
        </main>
      </div>

      {/* Search Modal */}
      {showSearch && (
        <SearchModal onClose={() => setShowSearch(false)} onSelect={setActive} />
      )}
    </div>
  )
}
