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

export default function VideoNode({ data, selected }) {
  const borderColor = data.borderColor || 'var(--border2)'

  return (
    <NodeWrapper selected={selected} onDelete={data._delete}>
      <div className="node video-node" style={{ borderColor: selected ? 'var(--accent)' : borderColor }}>
        <NodeResizer minWidth={240} minHeight={140} isVisible={selected} color="#c9a96e" />
        <Handle type="target" position={Position.Top}    className="rf-handle" />
        <Handle type="source" position={Position.Bottom} className="rf-handle" />

        <div className="node-drag-bar">
          <span className="node-type-label">▶ video</span>
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
            {data.originalName && <span className="node-filename">{data.originalName}</span>}
          </div>
        </div>

        <div className="video-wrap">
          <video src={data.src} controls style={{ width: '100%', display: 'block' }} />
        </div>
      </div>
    </NodeWrapper>
  )
}