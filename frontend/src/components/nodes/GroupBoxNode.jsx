import { useState, useEffect, useRef } from 'react'
import { NodeResizer } from '@xyflow/react'
import NodeWrapper from './NodeWrapper'
import './nodes.css'
import './GroupBoxNode.css'

const COLORS = ['#c9a96e','#6ec98a','#6e9ec9','#c96e6e','#9e6ec9','#6ec9c9']

const BORDER_STYLES = [
  { key: 'dashed', label: '⚊⚊', title: 'Dashed border' },
  { key: 'solid',  label: '——', title: 'Solid border'  },
  { key: 'none',   label: '  ·  ', title: 'No border (invisible)'  },
]

const ICONS = ['', '📌', '💡', '🔥', '✅', '⚠️', '🎨', '📝', '🔗', '🧩']

// Convert hex color to rgba with alpha
function hexToRgba(hex, alpha) {
  const h = hex.replace('#', '')
  const r = parseInt(h.substring(0,2), 16)
  const g = parseInt(h.substring(2,4), 16)
  const b = parseInt(h.substring(4,6), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

export default function GroupBoxNode({ data, selected }) {
  const [editLabel,    setEditLabel]    = useState(false)
  const [label,        setLabel]        = useState(data.label       || 'Group')
  const [showIconPick, setShowIconPick] = useState(false)

  const color       = data.color        || '#c9a96e'
  const borderStyle = data.borderStyle  || 'dashed'
  const opacity     = data.opacity      ?? 0.06
  const icon        = data.icon         ?? ''

  const labelInputRef = useRef()
  const iconRef       = useRef()

  // ── External triggers ─────────────────────────────────────────────────────
  useEffect(() => {
    if (data._renameTrigger) setEditLabel(true)
  }, [data._renameTrigger])

  // Auto-focus the label input when it opens
  useEffect(() => {
    if (editLabel) labelInputRef.current?.focus()
  }, [editLabel])

  // Close icon picker on outside click
  useEffect(() => {
    if (!showIconPick) return
    const handler = (e) => {
      if (!iconRef.current?.contains(e.target)) setShowIconPick(false)
    }
    window.addEventListener('pointerdown', handler, true)
    return () => window.removeEventListener('pointerdown', handler, true)
  }, [showIconPick])

  const saveLabel = () => {
    if (data._update) data._update({ label })
    setEditLabel(false)
  }

  // ── Border style CSS ───────────────────────────────────────────────────────
  const bgColor = hexToRgba(color, opacity)
  const borderCSS = borderStyle === 'none'
    ? 'transparent'
    : color

  return (
    <NodeWrapper selected={selected} onDelete={data._delete} noOutline>
      <div
        className={`node group-node ${selected ? 'selected' : ''} border-${borderStyle}`}
        style={{
          '--group-color': color,
          background: bgColor,
          borderColor: borderCSS,
        }}
      >
        {/* Resizer */}
        <NodeResizer
          minWidth={120}
          minHeight={80}
          isVisible={selected}
          color={color}
          lineStyle={{ stroke: color, strokeDasharray: borderStyle === 'dashed' ? '4 3' : 'none' }}
        />

        {/* ── Header ── */}
        <div className="group-header" onPointerDown={e => e.stopPropagation()}>
          {/* Icon picker button */}
          <div className="group-icon-wrap" ref={iconRef}>
            <button
              className="group-icon-btn"
              title="Add icon"
              onClick={() => setShowIconPick(v => !v)}
            >
              {icon || <span className="group-icon-placeholder">◈</span>}
            </button>
            {showIconPick && (
              <div className="group-icon-picker" onPointerDown={e => e.stopPropagation()}>
                {ICONS.map((ic, i) => (
                  <button
                    key={i}
                    className={`icon-opt ${ic === icon ? 'active' : ''}`}
                    title={ic || 'No icon'}
                    onClick={() => {
                      data._update?.({ icon: ic })
                      setShowIconPick(false)
                    }}
                  >
                    {ic || <span style={{ opacity: 0.4, fontSize: 10 }}>✕</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Label */}
          {editLabel ? (
            <input
              ref={labelInputRef}
              className="input group-label-input"
              value={label}
              onChange={e => setLabel(e.target.value)}
              onBlur={saveLabel}
              onKeyDown={e => {
                if (e.key === 'Enter') saveLabel()
                if (e.key === 'Escape') { setLabel(data.label || 'Group'); setEditLabel(false) }
              }}
            />
          ) : (
            <span className="group-label" onDoubleClick={() => setEditLabel(true)}>
              {data.label || 'Group'}
            </span>
          )}

          {/* Selected controls: colors + border style + opacity */}
          {selected && (
            <div className="group-controls" onPointerDown={e => e.stopPropagation()}>
              {/* Color dots */}
              <div className="group-color-picker">
                {COLORS.map(c => (
                  <button
                    key={c}
                    className="color-dot"
                    style={{
                      background: c,
                      outline: c === color ? `2px solid ${c}` : 'none',
                      outlineOffset: 2,
                    }}
                    onClick={() => data._update?.({ color: c })}
                  />
                ))}
              </div>

              {/* Border style buttons */}
              <div className="group-border-btns">
                {BORDER_STYLES.map(bs => (
                  <button
                    key={bs.key}
                    className={`group-border-btn ${borderStyle === bs.key ? 'active' : ''}`}
                    title={bs.title}
                    onClick={() => data._update?.({ borderStyle: bs.key })}
                  >{bs.label}</button>
                ))}
              </div>

              {/* Opacity slider */}
              <div className="group-opacity-row">
                <span className="group-opacity-label">fill</span>
                <input
                  type="range"
                  className="group-opacity-slider"
                  min="0"
                  max="0.35"
                  step="0.01"
                  value={opacity}
                  onChange={e => data._update?.({ opacity: parseFloat(e.target.value) })}
                />
                <span className="group-opacity-val">{Math.round(opacity * 100)}%</span>
              </div>
            </div>
          )}
        </div>

        {/* Body — transparent, fills remaining space */}
        <div className="group-body" />
      </div>
    </NodeWrapper>
  )
}