import { useState, useEffect, useRef, useCallback } from 'react'
import { boardsApi, resolveUrl } from '../api'
import ThemeSwitcher from '../components/ThemeSwitcher'
import './BoardList.css'

const PRIORITY = [
  { value: 0, label: 'None', color: 'transparent' },
  { value: 1, label: 'Low', color: '#6ec98a' },
  { value: 2, label: 'Medium', color: '#c9a96e' },
  { value: 3, label: 'High', color: '#c96e6e' },
  { value: 4, label: 'Urgent', color: '#9e4ec9' },
]

const TAG_PALETTE = [
  '#c9a96e', '#6ec98a', '#6e9ec9', '#c96e8a', '#9e6ec9',
  '#6ec9c9', '#c9c96e', '#c96e6e', '#888', '#e8d5b0',
]

const SORT_OPTIONS = [
  { value: 'updated', label: 'Last edited' },
  { value: 'last_opened', label: 'Last opened' },
  { value: 'created', label: 'Date created' },
  { value: 'name', label: 'Name (A–Z)' },
  { value: 'priority', label: 'Priority' },
]

function timeAgo(iso) {
  if (!iso) return ''
  const diff = (Date.now() - new Date(iso)) / 1000
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

// ── BoardList (home screen) ──────────────────────────────────────────────────
export default function BoardList({ onOpen, themeKey, setThemeKey, transparencyEnabled, setTransparencyEnabled }) {
  const [boards, setBoards] = useState([])
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('updated')
  const [filterTags, setFilterTags] = useState([])
  const [showArchived, setShowArchived] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [allTags, setAllTags] = useState([])
  const [activeMenu, setActiveMenu] = useState(null)

  const load = useCallback(() => {
    boardsApi.list(showArchived).then(r => {
      setBoards(r.data)
      const tagMap = {}
      r.data.forEach(b => (b.tags || []).forEach(t => { tagMap[t.label] = t.color }))
      setAllTags(Object.entries(tagMap).map(([label, color]) => ({ label, color })))
    })
  }, [showArchived])

  useEffect(() => { load() }, [load])

  // Close kebab menu on outside click
  useEffect(() => {
    const handler = () => setActiveMenu(null)
    window.addEventListener('pointerdown', handler)
    return () => window.removeEventListener('pointerdown', handler)
  }, [])

  const createBoard = async () => {
    const name = newName.trim()
    if (!name) return
    const r = await boardsApi.create({ name })
    setBoards(prev => [r.data, ...prev])
    setNewName('')
    setCreating(false)
    onOpen(r.data.id)
  }

  const filtered = boards
    .filter(b => {
      if (!showArchived && b.archived) return false
      const q = search.toLowerCase()
      const matchName = b.name.toLowerCase().includes(q)
      const matchTag = (b.tags || []).some(t => t.label.toLowerCase().includes(q))
      if (q && !matchName && !matchTag) return false
      if (filterTags.length > 0) {
        const bLabels = (b.tags || []).map(t => t.label)
        if (!filterTags.every(ft => bLabels.includes(ft))) return false
      }
      return true
    })
    .sort((a, b) => {
      if (a.pinned !== b.pinned) return b.pinned ? 1 : -1
      switch (sortBy) {
        case 'last_opened': return new Date(b.last_opened_at || 0) - new Date(a.last_opened_at || 0)
        case 'created': return new Date(b.created_at) - new Date(a.created_at)
        case 'name': return a.name.localeCompare(b.name)
        case 'priority': return (b.priority || 0) - (a.priority || 0)
        default: return new Date(b.updated_at) - new Date(a.updated_at)
      }
    })

  const toggleFilterTag = (label) =>
    setFilterTags(prev => prev.includes(label) ? prev.filter(t => t !== label) : [...prev, label])

  return (
    <div className="board-list-page">
      {/* ── Header ── */}
      <div className="bl-header">
        <div className="bl-header-top">
          <div className="bl-brand">
            <span className="bl-brand-icon">◈</span>
            <h1 className="bl-title">Canvas Journal</h1>
          </div>
          <div className="bl-header-actions">
            <button
              className={`bl-transparency-btn ${transparencyEnabled ? 'active' : ''}`}
              onClick={() => setTransparencyEnabled(v => !v)}
              title={transparencyEnabled ? 'Disable transparency' : 'Enable transparency'}
            >
              <span className="bl-transparency-icon">{transparencyEnabled ? '◉' : '◎'}</span>
              <span className="bl-transparency-label">{transparencyEnabled ? 'opaque' : 'glass'}</span>
            </button>
            <ThemeSwitcher themeKey={themeKey} setThemeKey={setThemeKey} />
          </div>
        </div>

        {/* Search + sort */}
        <div className="bl-controls">
          <div className="bl-search-wrap">
            <span className="bl-search-icon">⌕</span>
            <input
              className="bl-search"
              placeholder="Search boards or tags…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && <button className="bl-search-clear" onClick={() => setSearch('')}>✕</button>}
          </div>
          <select className="bl-sort-select" value={sortBy} onChange={e => setSortBy(e.target.value)}>
            {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <button
            className={`bl-archive-toggle ${showArchived ? 'active' : ''}`}
            onClick={() => setShowArchived(v => !v)}
          >
            {showArchived ? '⬡ Hide archived' : '⬡ Archived'}
          </button>
        </div>

        {/* Tag filter pills */}
        {allTags.length > 0 && (
          <div className="bl-tag-filters">
            {allTags.map(t => (
              <button
                key={t.label}
                className={`bl-tag-filter ${filterTags.includes(t.label) ? 'active' : ''}`}
                style={{ '--tag-color': t.color }}
                onClick={() => toggleFilterTag(t.label)}
              >{t.label}</button>
            ))}
            {filterTags.length > 0 && (
              <button className="bl-tag-clear" onClick={() => setFilterTags([])}>clear ✕</button>
            )}
          </div>
        )}
      </div>

      {/* ── Grid ── */}
      <div className="bl-grid">
        {/* "New board" creation card */}
        <div className="bl-card bl-card-new" onClick={() => { setCreating(true); setNewName('') }}>
          {creating ? (
            <div className="bl-new-form" onClick={e => e.stopPropagation()}>
              <input
                autoFocus
                className="input bl-new-input"
                placeholder="Board name…"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') createBoard()
                  if (e.key === 'Escape') setCreating(false)
                }}
              />
              <div className="bl-new-row">
                <button className="btn primary" onClick={createBoard}>Create</button>
                <button className="btn ghost" onClick={() => setCreating(false)}>Cancel</button>
              </div>
            </div>
          ) : (
            <>
              <span className="bl-new-icon">+</span>
              <span className="bl-new-label">New board</span>
            </>
          )}
        </div>

        {/* Board cards */}
        {filtered.map(board => (
          <BoardCard
            key={board.id}
            board={board}
            isMenuOpen={activeMenu === board.id}
            onMenuOpen={e => { e.stopPropagation(); setActiveMenu(board.id) }}
            onMenuClose={() => setActiveMenu(null)}
            onOpen={() => onOpen(board.id)}
            onRefresh={load}
          />
        ))}
      </div>

      {filtered.length === 0 && !creating && (
        <div className="bl-empty">
          {search || filterTags.length > 0
            ? 'No boards match your search.'
            : showArchived
              ? 'No archived boards.'
              : 'No boards yet — create your first one!'}
        </div>
      )}
    </div>
  )
}

// ── Individual board card ────────────────────────────────────────────────────
function BoardCard({ board, isMenuOpen, onMenuOpen, onMenuClose, onOpen, onRefresh }) {
  const [renaming, setRenaming] = useState(false)
  const [nameVal, setNameVal] = useState(board.name)
  const [editingDesc, setEditDesc] = useState(false)
  const [descVal, setDescVal] = useState(board.description || '')
  const [editingTags, setEditTags] = useState(false)
  const [tagInput, setTagInput] = useState('')
  const [tagColor, setTagColor] = useState(TAG_PALETTE[0])
  const [localBoard, setLocal] = useState(board)
  const coverRef = useRef()

  useEffect(() => {
    setLocal(board)
    setNameVal(board.name)
    setDescVal(board.description || '')
  }, [board])

  const patch = async (updates) => {
    const r = await boardsApi.update(localBoard.id, updates)
    setLocal(r.data)
    onRefresh()
  }

  const rename = async () => {
    const name = nameVal.trim()
    if (name && name !== localBoard.name) await patch({ name })
    setRenaming(false)
  }

  const saveDesc = async () => {
    await patch({ description: descVal })
    setEditDesc(false)
  }

  const addTag = async () => {
    const label = tagInput.trim()
    if (!label) return
    const tags = [...(localBoard.tags || []).filter(t => t.label !== label), { label, color: tagColor }]
    await patch({ tags })
    setTagInput('')
  }

  const removeTag = async (label) => {
    const tags = (localBoard.tags || []).filter(t => t.label !== label)
    await patch({ tags })
  }

  const togglePin = async (e) => {
    e.stopPropagation()
    await patch({ pinned: !localBoard.pinned })
  }

  const duplicate = async () => {
    await boardsApi.duplicate(localBoard.id)
    onRefresh(); onMenuClose()
  }

  const deleteBoard = async () => {
    if (!window.confirm(`Delete "${localBoard.name}"? This cannot be undone.`)) return
    await boardsApi.delete(localBoard.id)
    onRefresh(); onMenuClose()
  }

  const toggleArchive = async () => {
    await patch({ archived: !localBoard.archived })
    onMenuClose()
  }

  // ── FIX 1: uploadCover no longer hardcodes localhost ──────────────────────
  const uploadCover = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    const fd = new FormData()
    fd.append('file', file)
    const base = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace('/api', '')
    await fetch(`${base}/api/boards/${localBoard.id}/cover`, { method: 'POST', body: fd })
    onRefresh()
    e.target.value = ''
  }

  const pri = PRIORITY.find(p => p.value === (localBoard.priority || 0)) || PRIORITY[0]

  // ── FIX 2: cover image no longer hardcodes localhost ──────────────────────
  const cover = resolveUrl(localBoard.cover_image || localBoard.thumbnail)

  return (
    <div
      className={`bl-card ${localBoard.archived ? 'bl-archived' : ''} ${localBoard.pinned ? 'bl-pinned' : ''}`}
      onClick={!renaming && !editingDesc && !editingTags ? onOpen : undefined}
    >
      {/* Cover image area */}
      <div
        className="bl-cover"
        style={cover ? { backgroundImage: `url(${cover})` } : {}}
      >
        {!cover && <span className="bl-cover-placeholder">◈</span>}
        {localBoard.priority > 0 && (
          <span className="bl-priority-badge" style={{ background: pri.color }} title={pri.label} />
        )}
        <button
          className={`bl-pin-btn ${localBoard.pinned ? 'pinned' : ''}`}
          onClick={togglePin}
          title={localBoard.pinned ? 'Unpin' : 'Pin to top'}
        >★</button>
        <label className="bl-cover-upload" title="Set cover image" onClick={e => e.stopPropagation()}>
          <span>⬆</span>
          <input ref={coverRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={uploadCover} />
        </label>
      </div>

      {/* Card body */}
      <div className="bl-card-body">
        {renaming ? (
          <input
            autoFocus className="input bl-rename-input"
            value={nameVal}
            onChange={e => setNameVal(e.target.value)}
            onBlur={rename}
            onKeyDown={e => {
              e.stopPropagation()
              if (e.key === 'Enter') rename()
              if (e.key === 'Escape') { setNameVal(localBoard.name); setRenaming(false) }
            }}
            onClick={e => e.stopPropagation()}
          />
        ) : (
          <div
            className="bl-card-name"
            onDoubleClick={e => { e.stopPropagation(); setRenaming(true) }}
          >
            {localBoard.name}
            {localBoard.archived && <span className="bl-archive-chip">archived</span>}
          </div>
        )}

        {editingDesc ? (
          <textarea
            autoFocus className="bl-desc-input"
            value={descVal}
            onChange={e => setDescVal(e.target.value)}
            onBlur={saveDesc}
            onClick={e => e.stopPropagation()}
            placeholder="Add a description…"
            rows={3}
          />
        ) : (
          <div
            className="bl-card-desc"
            onDoubleClick={e => { e.stopPropagation(); setEditDesc(true) }}
          >
            {localBoard.description || <span className="bl-desc-placeholder">double-click to add description</span>}
          </div>
        )}

        <div className="bl-tags-row" onClick={e => e.stopPropagation()}>
          {(localBoard.tags || []).map(t => (
            <span key={t.label} className="bl-tag" style={{ '--tag-color': t.color }}>
              {t.label}
              <button className="bl-tag-remove" onClick={() => removeTag(t.label)}>✕</button>
            </span>
          ))}
          <button className="bl-tag-add" onClick={() => setEditTags(v => !v)}>+tag</button>
        </div>

        {editingTags && (
          <div className="bl-tag-form" onClick={e => e.stopPropagation()}>
            <div className="bl-tag-palette">
              {TAG_PALETTE.map(c => (
                <button
                  key={c}
                  className={`bl-tag-swatch ${tagColor === c ? 'active' : ''}`}
                  style={{ background: c }}
                  onClick={() => setTagColor(c)}
                />
              ))}
            </div>
            <div className="bl-tag-input-row">
              <input
                className="input bl-tag-input"
                placeholder="Tag name…"
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => {
                  e.stopPropagation()
                  if (e.key === 'Enter') addTag()
                  if (e.key === 'Escape') setEditTags(false)
                }}
              />
              <button className="btn primary bl-tag-submit" onClick={addTag}>+</button>
            </div>
          </div>
        )}

        <div className="bl-priority-row" onClick={e => e.stopPropagation()}>
          <span className="bl-meta-label">Priority:</span>
          {PRIORITY.map(p => (
            <button
              key={p.value}
              className={`bl-priority-dot ${(localBoard.priority || 0) === p.value ? 'active' : ''}`}
              style={{ background: p.color || 'var(--border2)', borderColor: p.color || 'var(--border2)' }}
              title={p.label}
              onClick={() => patch({ priority: p.value })}
            />
          ))}
        </div>

        <div className="bl-card-footer">
          <span className="bl-meta">
            {localBoard.last_opened_at
              ? `opened ${timeAgo(localBoard.last_opened_at)}`
              : `edited ${timeAgo(localBoard.updated_at)}`}
          </span>
          <div className="bl-menu-wrap">
            <button className="bl-menu-btn" onClick={onMenuOpen}>⋯</button>
            {isMenuOpen && (
              <div className="bl-menu" onPointerDown={e => e.stopPropagation()}>
                <button onClick={() => { setRenaming(true); onMenuClose() }}>✎ Rename</button>
                <button onClick={duplicate}>⧉ Duplicate</button>
                <button onClick={toggleArchive}>
                  {localBoard.archived ? '↩ Unarchive' : '⬡ Archive'}
                </button>
                <div className="bl-menu-divider" />
                <button className="bl-menu-danger" onClick={deleteBoard}>✕ Delete</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}