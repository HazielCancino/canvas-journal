import { useState } from 'react'
import { Handle, Position, NodeResizer } from '@xyflow/react'
import NodeWrapper from './NodeWrapper'
import './nodes.css'

const BORDER_COLORS = [
  { label: 'Default', value: 'var(--border2)' },
  { label: 'Amber',   value: '#c9a96e' },
  { label: 'Sage',    value: '#6ec98a' },
  { label: 'Blue',    value: '#6e9ec9' },
  { label: 'Rose',    value: '#c96e8a' },
  { label: 'Violet',  value: '#9e6ec9' },
]

export default function ImageNode({ data, selected }) {
  const [caption, setCaption]            = useState(data.caption || '')
  const [editingCaption, setEditCaption] = useState(false)

  const borderColor = data.borderColor || 'var(--border2)'

  const saveCaption = () => {
    if (data._update) data._update({ caption })
    setEditCaption(false)
  }

  return (
    <NodeWrapper selected={selected} onDelete={data._delete}>
      <div className="node image-node" style={{ borderColor: selected ? 'var(--accent)' : borderColor }}>
        <NodeResizer minWidth={120} minHeight={80} isVisible={selected} color="#c9a96e" />
        <Handle type="target" position={Position.Top}    className="rf-handle" />
        <Handle type="source" position={Position.Bottom} className="rf-handle" />

        <div className="node-drag-bar">
          <span className="node-type-label">⬜ image</span>
          <div className="node-drag-actions">
            {selected && (
              <div className="color-picker-inline">
                {BORDER_COLORS.map(c => (
                  <button key={c.label}
                    className={`note-color-dot ${data.borderColor === c.value ? 'active' : ''}`}
                    style={{ background: c.value === 'var(--border2)' ? '#3d3930' : c.value, borderColor: c.value === 'var(--border2)' ? '#3d3930' : c.value }}
                    title={c.label}
                    onPointerDown={e => e.stopPropagation()}
                    onClick={() => data._update && data._update({ borderColor: c.value })}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="image-node-img-wrap">
          <img src={data.src} alt={data.originalName || ''} draggable={false} />
        </div>

        {editingCaption ? (
          <div className="image-caption-row">
            <input className="input" style={{ fontSize: 11 }}
              value={caption} onChange={e => setCaption(e.target.value)}
              onBlur={saveCaption} onKeyDown={e => e.key === 'Enter' && saveCaption()}
              onPointerDown={e => e.stopPropagation()} autoFocus placeholder="Add caption…" />
          </div>
        ) : (
          <div className="image-caption-row" onClick={() => setEditCaption(true)}>
            {data.caption
              ? <span className="image-caption">{data.caption}</span>
              : <span className="empty-hint small">+ caption</span>}
          </div>
        )}
      </div>
    </NodeWrapper>
  )
}