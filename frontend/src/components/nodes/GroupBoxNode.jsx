import { useState, useEffect, useRef } from 'react'
import { NodeResizer } from '@xyflow/react'
import NodeWrapper from './NodeWrapper'
import './nodes.css'
import './GroupBoxNode.css'

const COLORS = ['#c9a96e','#6ec98a','#6e9ec9','#c96e6e','#9e6ec9','#6ec9c9']

const BORDER_STYLES = [
  { key: 'dashed', label: '╌╌', title: 'Dashed' },
  { key: 'solid',  label: '──', title: 'Solid'  },
  { key: 'none',   label: '∅',  title: 'Hidden' },
]

const ICONS = ['','📌','💡','🔥','✅','⚠️','🎨','📝','🔗','🧩']

function hexToRgba(hex, alpha) {
  const h = hex.replace('#','')
  const r = parseInt(h.slice(0,2),16)
  const g = parseInt(h.slice(2,4),16)
  const b = parseInt(h.slice(4,6),16)
  return `rgba(${r},${g},${b},${alpha})`
}

export default function GroupBoxNode({ data, selected }) {
  const [editLabel,    setEditLabel]    = useState(false)
  const [label,        setLabel]        = useState(data.label      || 'Group')
  const [showIconPick, setShowIconPick] = useState(false)

  const color       = data.color       || '#c9a96e'
  const borderStyle = data.borderStyle || 'dashed'
  const opacity     = data.opacity     ?? 0.06
  const icon        = data.icon        ?? ''

  const labelInputRef = useRef()
  const iconRef       = useRef()

  useEffect(() => {
    if (data._renameTrigger) setEditLabel(true)
  }, [data._renameTrigger])

  useEffect(() => {
    if (editLabel) labelInputRef.current?.focus()
  }, [editLabel])

  useEffect(() => {
    if (!showIconPick) return
    const h = (e) => { if (!iconRef.current?.contains(e.target)) setShowIconPick(false) }
    window.addEventListener('pointerdown', h, true)
    return () => window.removeEventListener('pointerdown', h, true)
  }, [showIconPick])

  const saveLabel = () => {
    if (data._update) data._update({ label })
    setEditLabel(false)
  }

  const bgColor   = hexToRgba(color, opacity)
  const borderCSS = borderStyle === 'none' ? 'transparent' : color

  return (
    <NodeWrapper selected={selected} onDelete={data._delete} noOutline>
      <div
        className={`group-node border-${borderStyle} ${selected ? 'selected' : ''}`}
        style={{ '--group-color': color, background: bgColor, borderColor: borderCSS }}
      >
        {/* Resizer — all 8 handles, both axes */}
        <NodeResizer
          minWidth={120}
          minHeight={80}
          isVisible={selected}
          color={color}
          handleStyle={{ width: 10, height: 10, borderRadius: 3 }}
        />

        {/* ── Header (drag handle) ── */}
        <div className="group-header" onPointerDown={e => e.stopPropagation()}>

          {/* Icon picker */}
          <div className="group-icon-wrap" ref={iconRef}>
            <button className="group-icon-btn" onClick={() => setShowIconPick(v => !v)} title="Set icon">
              {icon || <span className="group-icon-placeholder">◈</span>}
            </button>
            {showIconPick && (
              <div className="group-icon-picker">
                {ICONS.map((ic, i) => (
                  <button key={i} className={`icon-opt ${ic===icon?'active':''}`}
                    onClick={() => { data._update?.({ icon: ic }); setShowIconPick(false) }}>
                    {ic || <span style={{ opacity:.4, fontSize:10 }}>✕</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Label */}
          {editLabel ? (
            <input ref={labelInputRef} className="input group-label-input" value={label}
              onChange={e => setLabel(e.target.value)} onBlur={saveLabel}
              onKeyDown={e => {
                if (e.key==='Enter') saveLabel()
                if (e.key==='Escape') { setLabel(data.label||'Group'); setEditLabel(false) }
              }} />
          ) : (
            <span className="group-label" onDoubleClick={() => setEditLabel(true)}>
              {data.label || 'Group'}
            </span>
          )}

          {/* Controls — only when selected */}
          {selected && (
            <div className="group-controls" onPointerDown={e => e.stopPropagation()}>
              {/* Colors */}
              <div className="group-color-picker">
                {COLORS.map(c => (
                  <button key={c} className="color-dot"
                    style={{ background: c, outline: c===color ? `2px solid ${c}` : 'none', outlineOffset: 2 }}
                    onClick={() => data._update?.({ color: c })} />
                ))}
              </div>
              {/* Border style */}
              <div className="group-border-btns">
                {BORDER_STYLES.map(bs => (
                  <button key={bs.key}
                    className={`group-border-btn ${borderStyle===bs.key?'active':''}`}
                    title={bs.title}
                    onClick={() => data._update?.({ borderStyle: bs.key })}>
                    {bs.label}
                  </button>
                ))}
              </div>
              {/* Opacity — labeled clearly */}
              <div className="group-opacity-row">
                <span className="group-opacity-label" title="Background fill opacity">fill opacity</span>
                <input type="range" className="group-opacity-slider"
                  min="0" max="0.35" step="0.01" value={opacity}
                  onChange={e => data._update?.({ opacity: parseFloat(e.target.value) })} />
                <span className="group-opacity-val">{Math.round(opacity*100)}%</span>
              </div>
            </div>
          )}
        </div>

        {/* Body — fills remaining space, pointer-events none so children are clickable */}
        <div className="group-body" />
      </div>
    </NodeWrapper>
  )
}