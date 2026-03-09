import { useState, useRef } from 'react'
import { mediaApi } from '../api'
import './CanvasBackground.css'

export const BG_PATTERNS = {
  dots:  'dots',
  lines: 'lines',
  cross: 'cross',
  none:  'none',
}

export const BG_PRESETS = [
  { label: 'Obsidian',  color: '#0e0d0b' },
  { label: 'Midnight',  color: '#0a0e1a' },
  { label: 'Forest',    color: '#0b110d' },
  { label: 'Wine',      color: '#110a0e' },
  { label: 'Slate',     color: '#0f1117' },
  { label: 'Warm gray', color: '#1a1814' },
  { label: 'Deep navy', color: '#060c1a' },
  { label: 'Charcoal',  color: '#111111' },
]

export default function CanvasBackground({ boardId, bgConfig, onChange }) {
  const [open, setOpen] = useState(false)
  const [tab, setTab]   = useState('color') // color | image | pattern
  const [urlInput, setUrlInput] = useState(bgConfig?.imageUrl || '')
  const fileRef = useRef()

  const update = (patch) => onChange({ ...bgConfig, ...patch })

  const handleFileUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    try {
      const { data: m } = await mediaApi.upload(boardId, file)
      update({ type: 'image', imageUrl: mediaApi.url(m.filename) })
      setTab('image')
    } catch(err) { console.error(err) }
  }

  return (
    <div className="canvas-bg-control">
      <button className="cbg-trigger" onClick={() => setOpen(o => !o)} title="Canvas background">
        <span className="cbg-icon">◫</span>
        <span className="cbg-label">bg</span>
      </button>

      {open && (
        <div className="cbg-panel">
          <div className="cbg-panel-header">
            <span className="cbg-panel-title">Canvas background</span>
            <button className="cbg-close" onClick={() => setOpen(false)}>✕</button>
          </div>

          <div className="cbg-tabs">
            {['color','image','pattern'].map(t => (
              <button key={t} className={`cbg-tab ${tab===t?'active':''}`} onClick={() => setTab(t)}>{t}</button>
            ))}
          </div>

          {tab === 'color' && (
            <div className="cbg-section">
              <div className="cbg-presets">
                {BG_PRESETS.map(p => (
                  <button
                    key={p.color}
                    className={`cbg-preset-dot ${bgConfig?.color === p.color && bgConfig?.type === 'color' ? 'active' : ''}`}
                    style={{ background: p.color, borderColor: p.color }}
                    title={p.label}
                    onClick={() => update({ type: 'color', color: p.color })}
                  />
                ))}
              </div>
              <div className="cbg-custom-row">
                <label className="cbg-custom-label">Custom</label>
                <input
                  type="color"
                  className="cbg-color-input"
                  value={bgConfig?.color || '#0e0d0b'}
                  onChange={e => update({ type: 'color', color: e.target.value })}
                />
              </div>
            </div>
          )}

          {tab === 'image' && (
            <div className="cbg-section">
              <div className="cbg-image-actions">
                <button className="btn ghost cbg-upload-btn" onClick={() => fileRef.current?.click()}>
                  ⬆ Upload image / GIF
                </button>
                <input ref={fileRef} type="file" accept="image/*,.gif" style={{display:'none'}} onChange={handleFileUpload} />
              </div>
              <div className="cbg-or">or paste a URL</div>
              <input
                className="input"
                placeholder="https://… (image or GIF)"
                value={urlInput}
                onChange={e => setUrlInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && update({ type: 'image', imageUrl: urlInput })}
              />
              <button className="btn primary" style={{marginTop:8, width:'100%'}} onClick={() => update({ type: 'image', imageUrl: urlInput })}>
                Apply URL
              </button>
              {bgConfig?.type === 'image' && bgConfig?.imageUrl && (
                <button className="btn ghost" style={{marginTop:6, width:'100%', color:'var(--red)'}} onClick={() => update({ type: 'color', color: '#0e0d0b', imageUrl: '' })}>
                  Remove image
                </button>
              )}
            </div>
          )}

          {tab === 'pattern' && (
            <div className="cbg-section">
              <div className="cbg-pattern-grid">
                {[
                  { key: 'dots',  label: 'Dots',   icon: '⠿' },
                  { key: 'lines', label: 'Lines',  icon: '≡' },
                  { key: 'cross', label: 'Cross',  icon: '✛' },
                  { key: 'none',  label: 'None',   icon: '□' },
                ].map(p => (
                  <button
                    key={p.key}
                    className={`cbg-pattern-btn ${bgConfig?.pattern === p.key ? 'active' : ''}`}
                    onClick={() => update({ pattern: p.key })}
                  >
                    <span className="cbg-pattern-icon">{p.icon}</span>
                    <span className="cbg-pattern-label">{p.label}</span>
                  </button>
                ))}
              </div>
              <div className="cbg-custom-row" style={{marginTop:12}}>
                <label className="cbg-custom-label">Pattern color</label>
                <input
                  type="color"
                  className="cbg-color-input"
                  value={bgConfig?.patternColor || '#2a2720'}
                  onChange={e => update({ patternColor: e.target.value })}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}