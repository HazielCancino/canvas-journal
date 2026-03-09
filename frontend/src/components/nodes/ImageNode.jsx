import { useState } from 'react'
import { Handle, Position, NodeResizer } from '@xyflow/react'
import './nodes.css'

export default function ImageNode({ data, selected }) {
  const [caption, setCaption] = useState(data.caption || '')
  const [editingCaption, setEditingCaption] = useState(false)

  const saveCaption = () => {
    if (data._update) data._update({ caption })
    setEditingCaption(false)
  }

  return (
    <div className={`node image-node ${selected ? 'selected' : ''}`}>
      <NodeResizer minWidth={120} minHeight={80} isVisible={selected} color="var(--accent)" />
      <Handle type="target" position={Position.Top} className="rf-handle" />
      <Handle type="source" position={Position.Bottom} className="rf-handle" />

      <div className="node-drag-bar">
        <span className="node-type-label">⬜ image</span>
        {data.originalName && <span className="node-filename">{data.originalName}</span>}
      </div>

      <div className="image-node-img-wrap">
        <img src={data.src} alt={data.originalName || ''} draggable={false} />
      </div>

      {editingCaption ? (
        <div className="image-caption-row">
          <input
            className="input"
            style={{ fontSize: 11 }}
            value={caption}
            onChange={e => setCaption(e.target.value)}
            onBlur={saveCaption}
            onKeyDown={e => e.key === 'Enter' && saveCaption()}
            onPointerDown={e => e.stopPropagation()}
            autoFocus
            placeholder="Add caption…"
          />
        </div>
      ) : (
        <div className="image-caption-row" onClick={() => setEditingCaption(true)}>
          {data.caption
            ? <span className="image-caption">{data.caption}</span>
            : <span className="empty-hint small">+ caption</span>
          }
        </div>
      )}
    </div>
  )
}