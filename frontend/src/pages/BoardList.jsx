import { useState, useEffect } from 'react'
import { boardsApi } from '../api'
import './BoardList.css'

export default function BoardList({ onOpenBoard }) {
  const [boards, setBoards] = useState([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')

  useEffect(() => {
    boardsApi.list().then(r => { setBoards(r.data); setLoading(false) })
  }, [])

  const handleCreate = async () => {
    if (!newName.trim()) return
    const r = await boardsApi.create({ name: newName.trim(), description: newDesc.trim() })
    setBoards(prev => [r.data, ...prev])
    setNewName(''); setNewDesc(''); setCreating(false)
    onOpenBoard(r.data.id)
  }

  const handleDelete = async (e, id) => {
    e.stopPropagation()
    if (!confirm('Delete this board?')) return
    await boardsApi.delete(id)
    setBoards(prev => prev.filter(b => b.id !== id))
  }

  const fmt = (iso) => {
    if (!iso) return ''
    const d = new Date(iso)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  return (
    <div className="board-list-page">
      <div className="board-list-grain" />

      <header className="bl-header">
        <div className="bl-logo">
          <span className="bl-logo-mark">◈</span>
          <span className="bl-logo-text">canvas</span>
        </div>
        <button className="btn primary" onClick={() => setCreating(true)}>
          + New board
        </button>
      </header>

      <main className="bl-main">
        <div className="bl-title-row">
          <h1 className="bl-title">Your boards</h1>
          <span className="bl-count">{boards.length} workspace{boards.length !== 1 ? 's' : ''}</span>
        </div>

        {creating && (
          <div className="bl-create-card">
            <h2 className="bl-create-title">New board</h2>
            <input
              className="input"
              placeholder="Board name — e.g. 2024 Journal, Trip Planning…"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
              autoFocus
            />
            <input
              className="input"
              placeholder="Description (optional)"
              value={newDesc}
              onChange={e => setNewDesc(e.target.value)}
              style={{ marginTop: 8 }}
            />
            <div className="bl-create-actions">
              <button className="btn ghost" onClick={() => setCreating(false)}>Cancel</button>
              <button className="btn primary" onClick={handleCreate}>Create board</button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="bl-empty">Loading…</div>
        ) : boards.length === 0 && !creating ? (
          <div className="bl-empty">
            <span className="bl-empty-icon">◈</span>
            <p>No boards yet. Create your first one.</p>
          </div>
        ) : (
          <div className="bl-grid">
            {boards.map(b => (
              <div key={b.id} className="bl-card" onClick={() => onOpenBoard(b.id)}>
                <div className="bl-card-preview">
                  {b.thumbnail
                    ? <img src={b.thumbnail} alt="" />
                    : <span className="bl-card-empty-icon">◈</span>
                  }
                </div>
                <div className="bl-card-info">
                  <div className="bl-card-name">{b.name}</div>
                  {b.description && <div className="bl-card-desc">{b.description}</div>}
                  <div className="bl-card-date">{fmt(b.updated_at)}</div>
                </div>
                <button
                  className="bl-card-delete btn ghost danger"
                  onClick={e => handleDelete(e, b.id)}
                  title="Delete"
                >✕</button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
