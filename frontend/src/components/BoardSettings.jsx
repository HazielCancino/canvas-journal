import { useEffect, useRef, useState } from 'react'
import { mediaApi } from '../api'
import { useTheme } from '../hooks/useTheme'
import './BoardSettings.css'

const NOTE_COLORS = [
  { label: 'Default', bg: 'var(--surface)',  border: 'var(--border2)', swatch: '#3d3930' },
  { label: 'Amber',   bg: '#2a1f0a',         border: '#c9a96e',        swatch: '#c9a96e' },
  { label: 'Sage',    bg: '#0a1f0f',         border: '#6ec98a',        swatch: '#6ec98a' },
  { label: 'Blue',    bg: '#0a1220',         border: '#6e9ec9',        swatch: '#6e9ec9' },
  { label: 'Rose',    bg: '#1f0a10',         border: '#c96e8a',        swatch: '#c96e8a' },
  { label: 'Violet',  bg: '#130a1f',         border: '#9e6ec9',        swatch: '#9e6ec9' },
  { label: 'Neon',    bg: '#1a0a22',         border: '#ff00d4',        swatch: '#ff00d4' },
  { label: 'Paper',   bg: '#fffdf5',         border: '#e6dfc8',        swatch: '#e6dfc8' },
  { label: 'Blueprint',bg:'#092540',         border: '#1e5f99',        swatch: '#1e5f99' },
]

const FONTS = [
  { label: 'Modern (Default)', value: "'DM Sans', sans-serif" },
  { label: 'Typewriter',       value: "'Courier New', Courier, monospace" },
  { label: 'Script',           value: "'Comic Sans MS', cursive, sans-serif" },
  { label: 'Architect',        value: "'Trebuchet MS', Helvetica, sans-serif" },
  { label: 'Serif',            value: "'Playfair Display', serif" }
]

const GLOBAL_THEMES = [
  {
    id: 'cyberpunk', label: 'Cyberpunk', icon: '🌆',
    bg: { type: 'color', color: '#0b0410', pattern: 'lines', patternColor: '#ff0055' },
    noteColor: 'Neon',
    font: "'Courier New', Courier, monospace",
    lineStyle: 'step'
  },
  {
    id: 'notebook', label: 'Notebook', icon: '📓',
    bg: { type: 'color', color: '#fdf6e3', pattern: 'lines', patternColor: '#add8e6' },
    noteColor: 'Paper',
    font: "'Comic Sans MS', cursive, sans-serif",
    lineStyle: 'straight'
  },
  {
    id: 'architect', label: 'Architect', icon: '📐',
    bg: { type: 'color', color: '#0f2940', pattern: 'cross', patternColor: '#3d7ea6' },
    noteColor: 'Blueprint',
    font: "'Trebuchet MS', Helvetica, sans-serif",
    lineStyle: 'step'
  }
]

export default function BoardSettings({
  boardId,
  open, onClose,
  settings, onSettingsChange,
  nodes,
  onFocusNode,
  bgConfig, onBgChange,
  onRestoreNode,
  onEmptyTrash,
  historyItems,
  currentIndex,
  jumpToHistory
}) {
  const panelRef = useRef()
  const { setThemeKey } = useTheme()
  settings = settings || {}

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    if (open) window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const set = (key, val) => onSettingsChange({ ...settings, [key]: val })

  const groups   = Array.isArray(nodes) ? nodes.filter(n => n.type === 'groupBox') : []
  const items    = Array.isArray(nodes) ? nodes.filter(n => n.type !== 'groupBox') : []
  const trash    = Array.isArray(settings.trash) ? settings.trash : []
  const typeLabels = { textNote: '✎', imageNote: '⬜', videoNote: '▶', embedNote: '⇢', fileNote: '📎', groupBox: '▭' }

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
          
          {/* ── Themes ── */}
          <section className="bs-section">
            <div className="bs-section-label">Global Themes</div>
            <div className="bs-theme-grid">
              {GLOBAL_THEMES.map(t => (
                <button key={t.id} className="bs-theme-btn" onClick={() => {
                  onBgChange(t.bg)
                  onSettingsChange({
                    ...settings,
                    defaultNoteColor: t.noteColor,
                    fontFamily: t.font,
                    edgeStyle: t.lineStyle || 'bezier'
                  })
                  setThemeKey(t.id)
                }}>
                  <span className="bs-theme-icon">{t.icon}</span>
                  <span className="bs-theme-label">{t.label}</span>
                </button>
              ))}
            </div>
          </section>

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
                <span className="bs-toggle-icon">💬</span>
                Show captions & info
              </span>
              <Toggle value={settings.showCaptions !== false} onChange={v => set('showCaptions', v)} />
            </label>

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

          {/* ── Typography ── */}
          <section className="bs-section">
            <div className="bs-section-label">Typography</div>
            <label className="bs-toggle-row">
              <span className="bs-toggle-label">
                <span className="bs-toggle-icon">T</span>
                Global Font
              </span>
              <select className="bs-select" value={settings.fontFamily || FONTS[0].value} onChange={e => set('fontFamily', e.target.value)}>
                {FONTS.map(f => (
                  <option key={f.label} value={f.value}>{f.label}</option>
                ))}
              </select>
            </label>

            <label className="bs-toggle-row">
              <span className="bs-toggle-label">
                <span className="bs-toggle-icon">⤤</span>
                Connection Lines
              </span>
              <select className="bs-select" value={settings.edgeStyle || 'bezier'} onChange={e => set('edgeStyle', e.target.value)}>
                <option value="bezier">Bezier Curved</option>
                <option value="straight">Straight</option>
                <option value="step">Stepped</option>
                <option value="smoothstep">Smooth Step</option>
              </select>
            </label>

          </section>

          {/* ── Background ── */}
          <section className="bs-section">
            <div className="bs-section-label">Background</div>
            <BackgroundSettings boardId={boardId} bgConfig={bgConfig} onChange={onBgChange} />
          </section>

          {/* ── Groups ── */}
          {groups.length > 0 && (
            <section className="bs-section">
              <div className="bs-section-label">Groups ({groups.length})</div>
              <div className="bs-groups-list">
                {groups.map(g => (
                  <div key={g.id} className="bs-group-item">
                    <div className="bs-group-name" style={{display: 'flex', alignItems: 'center', gap: '9px'}} onClick={() => { onFocusNode(g.id); onClose() }}>
                      <span className="bs-group-dot" style={{ background: g.data?.color || '#c9a96e' }} />
                      <span>{g.data?.label || 'Group'}</span>
                    </div>
                    <button className="bs-trash-btn" title="Delete group" onClick={(e) => { e.stopPropagation(); g.data._delete?.() }}>✕</button>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ── Contents ── */}
          {items.length > 0 && (
            <section className="bs-section">
              <div className="bs-section-label">Contents ({items.length})</div>
              <div className="bs-groups-list">
                {items.map(n => {
                  const title = n.data.title || n.data.label || n.data.originalName || n.data.text?.substring(0, 15) || 'Node'
                  return (
                    <div key={n.id} className="bs-group-item">
                      <div className="bs-group-name" style={{display: 'flex', alignItems: 'center', gap: '8px'}} onClick={() => { onFocusNode(n.id); onClose() }}>
                        <span style={{color: 'var(--text-faint)'}}>{typeLabels[n.type] || '•'}</span>
                        <span style={{overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>{title}</span>
                      </div>
                      <button className="bs-trash-btn" title="Delete" onClick={(e) => { e.stopPropagation(); n.data._delete?.() }}>✕</button>
                    </div>
                  )
                })}
              </div>
            </section>
          )}

          {/* ── Trash ── */}
          {trash.length > 0 && (
            <section className="bs-section" style={{borderColor: 'rgba(255, 60, 60, 0.1)'}}>
              <div className="bs-section-label" style={{display: 'flex', justifyContent: 'space-between', color: "var(--red)", opacity: 0.8}}>
                <span>Trash ({trash.length})</span>
                <span style={{cursor: 'pointer', textDecoration: 'underline'}} onClick={onEmptyTrash}>Empty</span>
              </div>
              <div className="bs-groups-list">
                {trash.map(t => {
                  const title = t.data?.title || t.data?.label || t.data?.originalName || t.data?.text?.substring(0, 15) || 'Node'
                  return (
                    <div key={t.id} className="bs-group-item" style={{opacity: 0.6}}>
                      <div className="bs-group-name" style={{display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'line-through'}}>
                        <span style={{color: 'var(--text-faint)'}}>{typeLabels[t.type] || '•'}</span>
                        <span style={{overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>{title}</span>
                      </div>
                      <button className="bs-restore-btn" title="Restore" onClick={(e) => { e.stopPropagation(); onRestoreNode?.(t) }}>⟲</button>
                    </div>
                  )
                })}
              </div>
            </section>
          )}

          {/* ── History ── */}
          {historyItems && historyItems.length > 0 && (
            <section className="bs-section">
              <div className="bs-section-label">Session History</div>
              <div className="bs-groups-list" style={{ maxHeight: '180px', overflowY: 'auto', paddingRight: '4px' }}>
                {[...historyItems].reverse().map((h, reverseIdx) => {
                  const i = historyItems.length - 1 - reverseIdx;
                  return (
                    <button
                      key={h.time + '-' + i}
                      className="bs-group-item"
                      onClick={() => jumpToHistory(i)}
                      style={{
                        opacity: i > currentIndex ? 0.4 : 1,
                        border: i === currentIndex ? '1px solid var(--accent)' : '1px solid var(--border)',
                        background: i === currentIndex ? 'var(--surface2)' : 'none',
                      }}
                    >
                      <span style={{ fontSize: '10px', color: 'var(--text-faint)', flexShrink: 0, fontFamily: 'monospace' }}>
                        {new Date(h.time).toLocaleTimeString([], { hour: '2-digit', minute:'2-digit' })}
                      </span>
                      <span className="bs-group-name" style={{ textDecoration: i > currentIndex ? 'line-through' : 'none' }}>
                        {h.actionName}
                      </span>
                    </button>
                  )
                })}
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

const BG_PRESETS  = [
  { label: 'Obsidian',  color: '#0e0d0b' },
  { label: 'Midnight',  color: '#0a0e1a' },
  { label: 'Forest',    color: '#0b110d' },
  { label: 'Wine',      color: '#110a0e' },
  { label: 'Slate',     color: '#0f1117' },
  { label: 'Warm gray', color: '#1a1814' },
  { label: 'Deep navy', color: '#060c1a' },
  { label: 'Charcoal',  color: '#111111' },
]

const PATTERNS = [
  { key: 'dots',  label: 'Dots',   icon: '⠿' },
  { key: 'lines', label: 'Lines',  icon: '≡' },
  { key: 'cross', label: 'Cross',  icon: '✛' },
  { key: 'none',  label: 'None',   icon: '□' },
]

function BackgroundSettings({ boardId, bgConfig, onChange }) {
  const [tab, setTab]   = useState('color')
  const [urlInput, setUrlInput] = useState(bgConfig?.imageUrl || '')
  const fileRef = useRef()

  const set = (patch) => onChange({ ...bgConfig, ...patch })

  const handleFileUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    try {
      const { data: m } = await mediaApi.upload(boardId, file)
      set({ type: 'image', imageUrl: mediaApi.url(m.filename) })
      setTab('image')
    } catch(err) { console.error(err) }
  }

  return (
    <div className="bs-bg-mini">
      <div className="cbg-tabs">
        {['color','image','pattern'].map(t => (
          <button key={t} className={`cbg-tab ${tab===t?'active':''}`} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>

      {tab === 'color' && (
        <div className="cbg-section">
          <div className="bs-bg-presets">
            {BG_PRESETS.map(p => (
              <button
                key={p.color}
                className={`bs-bg-dot ${bgConfig?.color === p.color && bgConfig?.type === 'color' ? 'active' : ''}`}
                style={{ background: p.color, borderColor: p.color }}
                title={p.label}
                onClick={() => set({ type: 'color', color: p.color })}
              />
            ))}
            <label className="bs-bg-dot bs-bg-custom" title="Custom color">
              <span>+</span>
              <input type="color" value={bgConfig?.color || '#0e0d0b'}
                onChange={e => set({ type: 'color', color: e.target.value })} />
            </label>
          </div>
        </div>
      )}

      {tab === 'image' && (
        <div className="cbg-section">
          <div className="cbg-image-actions">
            <button className="bs-action-btn" style={{width: '100%', marginBottom: 8}} onClick={() => fileRef.current?.click()}>
              ⬆ Upload image / GIF
            </button>
            <input ref={fileRef} type="file" accept="image/*,.gif" style={{display:'none'}} onChange={handleFileUpload} />
          </div>
          <input
            className="bs-select"
            style={{width: '100%', boxSizing: 'border-box', marginBottom: 8}}
            placeholder="https://… (image URL)"
            value={urlInput}
            onChange={e => setUrlInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && set({ type: 'image', imageUrl: urlInput })}
          />
          <button className="bs-action-btn" style={{width: '100%'}} onClick={() => set({ type: 'image', imageUrl: urlInput })}>
            Apply URL
          </button>
          {bgConfig?.type === 'image' && bgConfig?.imageUrl && (
            <button className="bs-action-btn" style={{width: '100%', marginTop: 8, color: 'var(--red)', borderColor: 'rgba(255,0,0,0.3)'}} onClick={() => set({ type: 'color', color: '#0e0d0b', imageUrl: '' })}>
              Remove image
            </button>
          )}
        </div>
      )}

      {tab === 'pattern' && (
        <div className="cbg-section">
          <div className="cbg-pattern-grid">
            {PATTERNS.map(p => (
              <button
                key={p.key}
                className={`bs-pattern-btn ${bgConfig?.pattern === p.key ? 'active' : ''}`}
                onClick={() => set({ pattern: p.key })}
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className="bs-bg-row" style={{marginTop: 12}}>
            <span className="bs-sub-label">Color</span>
            <input type="color" className="bs-color-input" value={bgConfig?.patternColor || '#2a2720'} onChange={e => set({ patternColor: e.target.value })} />
          </div>
        </div>
      )}
    </div>
  )
}