import { useEffect, useRef } from 'react'
import './NodeContextMenu.css'

const NOTE_COLORS = [
  { label: 'Default', color: 'var(--border2)' },
  { label: 'Amber',   color: '#c9a96e' },
  { label: 'Sage',    color: '#6ec98a' },
  { label: 'Blue',    color: '#6e9ec9' },
  { label: 'Rose',    color: '#c96e8a' },
  { label: 'Violet',  color: '#9e6ec9' },
]

const GROUP_COLORS = ['#c9a96e','#6ec98a','#6e9ec9','#c96e6e','#9e6ec9','#6ec9c9']

const TYPE_LABEL = {
  textNote:  '✏️ Note',
  imageNote: '🖼 Image',
  videoNote: '▶ Video',
  groupBox:  '▭ Group',
  fileNote:  '📎 File',
  embedNote: '⬡ Embed',
}

export default function NodeContextMenu({
  x, y, node, isLocked,
  onClose, onDuplicate, onDelete, onToggleLock,
  onBringToFront, onSendToBack,
}) {
  const ref = useRef()

  // Smart position — flip if near right/bottom edge
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const vw = window.innerWidth, vh = window.innerHeight
    if (rect.right  > vw - 12) el.style.left = `${x - rect.width  - 4}px`
    if (rect.bottom > vh - 12) el.style.top  = `${y - rect.height - 4}px`
  }, [x, y])

  // Close on outside click / Escape
  useEffect(() => {
    const onDown = (e) => { if (!ref.current?.contains(e.target)) onClose() }
    const onKey  = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('pointerdown', onDown, true)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('pointerdown', onDown, true)
      window.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  const type    = node.type
  const data    = node.data
  const locked  = isLocked

  const act = (fn) => (e) => { e.stopPropagation(); fn(); onClose() }

  return (
    <div
      ref={ref}
      className="nctx-menu"
      style={{ left: x, top: y }}
      onPointerDown={e => e.stopPropagation()}
    >
      {/* Header */}
      <div className="nctx-header">
        <span className="nctx-type-label">{TYPE_LABEL[type] || type}</span>
        {locked && <span className="nctx-locked-badge">🔒 locked</span>}
      </div>

      {/* ── Text-note exclusive ──────────────────────────── */}
      {type === 'textNote' && (
        <>
          <button className="nctx-item" onClick={act(() => data._openFocusMode?.())}>
            <span className="nctx-icon">⤢</span> Open in Focus Mode
          </button>
          <div className="nctx-divider" />
          <div className="nctx-color-row">
            {NOTE_COLORS.map(c => (
              <button
                key={c.label}
                className={`nctx-color-dot ${data.colorLabel === c.label ? 'active' : ''}`}
                style={{ background: c.color }}
                title={c.label}
                onClick={act(() => data._update?.({ colorLabel: c.label }))}
              />
            ))}
          </div>
          <div className="nctx-divider" />
        </>
      )}

      {/* ── Group-box exclusive ──────────────────────────── */}
      {type === 'groupBox' && (
        <>
          <button className="nctx-item" onClick={act(() => data._triggerRename?.())}>
            <span className="nctx-icon">✏️</span> Rename
          </button>
          <div className="nctx-color-row" style={{ padding: '4px 12px 6px' }}>
            {GROUP_COLORS.map(c => (
              <button
                key={c}
                className={`nctx-color-dot ${data.color === c ? 'active' : ''}`}
                style={{ background: c }}
                title={c}
                onClick={act(() => data._update?.({ color: c }))}
              />
            ))}
          </div>
          <div className="nctx-divider" />
        </>
      )}

      {/* ── Common actions ───────────────────────────────── */}
      <button className="nctx-item" onClick={act(onDuplicate)}>
        <span className="nctx-icon">⧉</span> Duplicate
        <span className="nctx-hint">Shift+D</span>
      </button>

      <button className="nctx-item" onClick={act(onToggleLock)}>
        <span className="nctx-icon">{locked ? '🔓' : '🔒'}</span>
        {locked ? 'Unlock' : 'Lock'}
      </button>

      <div className="nctx-divider" />

      <button className="nctx-item" onClick={act(onBringToFront)}>
        <span className="nctx-icon">⬆</span> Bring to Front
      </button>
      <button className="nctx-item" onClick={act(onSendToBack)}>
        <span className="nctx-icon">⬇</span> Send to Back
      </button>

      <div className="nctx-divider" />

      <button className="nctx-item nctx-danger" onClick={act(onDelete)}>
        <span className="nctx-icon">✕</span> Delete
        <span className="nctx-hint">Del</span>
      </button>
    </div>
  )
}