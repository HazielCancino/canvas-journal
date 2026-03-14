import { useEffect, useRef } from 'react'
import './BoardSettings.css'

const NOTE_COLORS = [
  { label: 'Default', bg: 'var(--surface)',  border: 'var(--border2)', swatch: '#3d3930' },
  { label: 'Amber',   bg: '#2a1f0a',         border: '#c9a96e',        swatch: '#c9a96e' },
  { label: 'Sage',    bg: '#0a1f0f',         border: '#6ec98a',        swatch: '#6ec98a' },
  { label: 'Blue',    bg: '#0a1220',         border: '#6e9ec9',        swatch: '#6e9ec9' },
  { label: 'Rose',    bg: '#1f0a10',         border: '#c96e8a',        swatch: '#c96e8a' },
  { label: 'Violet',  bg: '#130a1f',         border: '#9e6ec9',        swatch: '#9e6ec9' },
]

export default function BoardSettings({
  open, onClose,
  settings, onSettingsChange,
  nodes,
  onFocusNode,
  bgConfig, onBgChange,
}) {
  const panelRef = useRef()

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    if (open) window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const set = (key, val) => onSettingsChange({ ...settings, [key]: val })

  const groups   = nodes.filter(n => n.type === 'groupBox')
  const byType   = nodes.reduce((acc, n) => { acc[n.type] = (acc[n.type] || 0) + 1; return acc }, {})
  const typeLabels = { textNote: '✎ Text', imageNote: '⬜ Image', videoNote: '▶ Video', embedNote: '⇢ Embed', fileNote: '📎 File', groupBox: '▭ Group' }

  const defaultNoteColor = settings.defaultNoteColor || 'Default'

  return (
    <>
      <div className={`bs-backdrop ${open ? 'bs-open' : ''}`} onClick={onClose} />

      <div ref={panelRef} className={`bs-panel ${open ? 'bs-open' : ''}`}>
        <div className="bs-header">
          <span className="bs-title">Board Settings</span>
          <button className="bs-close" onClick={onClose}>✕</button>
        </div>

        <div className="bs-body">

          {/* ── Canvas ── */}
          <section className="bs-section">
            <div className="bs-section-label">Canvas</div>

            <label className="bs-toggle-row">
              <span className="bs-toggle-label">
                <span className="bs-toggle-icon">⊞</span>
                Snap to grid
              </span>
              <Toggle value={settings.snapToGrid} onChange={v => set('snapToGrid', v)} />
            </label>

            <label className="bs-toggle-row">
              <span className="bs-toggle-label">
                <span className="bs-toggle-icon">▣</span>
                Show minimap
              </span>
              <Toggle value={settings.showMinimap ?? true} onChange={v => set('showMinimap', v)} />
            </label>
            
        <div className="bs-setting-row">
          <div className="bs-setting-info">
            <span className="bs-setting-label">Alignment guides</span>
            <span className="bs-setting-desc">Show snap lines when moving nodes near each other</span>
          </div>
          <button
            className={`bs-toggle ${settings.alignmentGuides !== false ? 'on' : ''}`}
            onClick={() => onSettingsChange(s => ({ ...s, alignmentGuides: s.alignmentGuides === false ? true : false }))}
          >
            {settings.alignmentGuides !== false ? 'On' : 'Off'}
          </button>
        </div>
 
            <div className="bs-toggle-row">
              <span className="bs-toggle-label">
                <span className="bs-toggle-icon">⊙</span>
                Zoom level
              </span>
              <button className="bs-action-btn" onClick={() => set('resetZoom', Date.now())}>
                Reset
              </button>
            </div>
          </section>

          {/* ── Notes ── */}
          <section className="bs-section">
            <div className="bs-section-label">Text Notes</div>
            <div className="bs-toggle-row" style={{ alignItems: 'flex-start', flexDirection: 'column', gap: 10 }}>
              <span className="bs-toggle-label">
                <span className="bs-toggle-icon">✎</span>
                Default color for new notes
              </span>
              <div className="bs-note-color-grid">
                {NOTE_COLORS.map(c => (
                  <button
                    key={c.label}
                    className={`bs-note-color-btn ${defaultNoteColor === c.label ? 'active' : ''}`}
                    style={{ '--nc-swatch': c.swatch, '--nc-bg': c.bg, '--nc-border': c.border }}
                    onClick={() => set('defaultNoteColor', c.label)}
                    title={c.label}
                  >
                    <span className="bs-note-color-dot" />
                    <span className="bs-note-color-name">{c.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* ── Media ── */}
          <section className="bs-section">
            <div className="bs-section-label">Media</div>

            <label className="bs-toggle-row">
              <span className="bs-toggle-label">
                <span className="bs-toggle-icon">↺</span>
                Loop all videos
              </span>
              <Toggle value={settings.loopVideos} onChange={v => set('loopVideos', v)} />
            </label>

            <label className="bs-toggle-row">
              <span className="bs-toggle-label">
                <span className="bs-toggle-icon">▶</span>
                Autoplay videos
              </span>
              <Toggle value={settings.autoplayVideos} onChange={v => set('autoplayVideos', v)} />
            </label>
          </section>

          {/* ── Background ── */}
          <section className="bs-section">
            <div className="bs-section-label">Background</div>
            <BgMini bgConfig={bgConfig} onChange={onBgChange} />
          </section>

          {/* ── Groups ── */}
          {groups.length > 0 && (
            <section className="bs-section">
              <div className="bs-section-label">Groups ({groups.length})</div>
              <div className="bs-groups-list">
                {groups.map(g => (
                  <button
                    key={g.id}
                    className="bs-group-item"
                    onClick={() => { onFocusNode(g.id); onClose() }}
                  >
                    <span className="bs-group-dot" style={{ background: g.data?.color || '#c9a96e' }} />
                    <span className="bs-group-name">{g.data?.label || 'Group'}</span>
                    <span className="bs-group-arrow">→</span>
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* ── Stats ── */}
          {nodes.length > 0 && (
            <section className="bs-section">
              <div className="bs-section-label">Contents — {nodes.length} nodes</div>
              <div className="bs-stats">
                {Object.entries(byType).map(([type, count]) => (
                  <div key={type} className="bs-stat-row">
                    <span className="bs-stat-type">{typeLabels[type] || type}</span>
                    <span className="bs-stat-count">{count}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

        </div>
      </div>
    </>
  )
}

function Toggle({ value, onChange }) {
  return (
    <button
      className={`bs-toggle ${value ? 'bs-toggle-on' : ''}`}
      onClick={() => onChange(!value)}
    >
      <span className="bs-toggle-thumb" />
    </button>
  )
}

const BG_PRESETS  = ['#0e0d0b','#1a1a2e','#0f1c0f','#1c0f0f','#0f0f1c','#f5f0e8']
const PATTERNS    = ['none','dots','lines','cross']

function BgMini({ bgConfig, onChange }) {
  const set = (patch) => onChange({ ...bgConfig, ...patch })
  return (
    <div className="bs-bg-mini">
      <div className="bs-bg-row">
        <span className="bs-sub-label">Color</span>
        <div className="bs-bg-presets">
          {BG_PRESETS.map(c => (
            <button
              key={c}
              className={`bs-bg-dot ${bgConfig?.color === c ? 'active' : ''}`}
              style={{ background: c }}
              onClick={() => set({ type: 'color', color: c })}
            />
          ))}
          <label className="bs-bg-dot bs-bg-custom" title="Custom color">
            <span>+</span>
            <input type="color" value={bgConfig?.color || '#0e0d0b'}
              onChange={e => set({ type: 'color', color: e.target.value })} />
          </label>
        </div>
      </div>
      <div className="bs-bg-row">
        <span className="bs-sub-label">Pattern</span>
        <div className="bs-pattern-row">
          {PATTERNS.map(p => (
            <button
              key={p}
              className={`bs-pattern-btn ${(bgConfig?.pattern || 'dots') === p ? 'active' : ''}`}
              onClick={() => set({ pattern: p })}
            >{p === 'none' ? '∅' : p}</button>
          ))}
        </div>
      </div>
    </div>
  )
}