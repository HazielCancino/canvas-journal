import { useState } from 'react'
import { Handle, Position, NodeResizer } from '@xyflow/react'
import { resolveUrl } from '../../api'
import NodeWrapper from './NodeWrapper'
import './nodes.css'

export default function ImageNode({ data, selected }) {
  const [caption, setCaption]            = useState(data.caption || '')
  const [editingCaption, setEditCaption] = useState(false)
  const [fit, setFit]                    = useState(data.fit || 'contain') // contain | cover

  const saveCaption = () => {
    if (data._update) data._update({ caption })
    setEditCaption(false)
  }

  const toggleFit = (e) => {
    e.stopPropagation()
    const next = fit === 'contain' ? 'cover' : 'contain'
    setFit(next)
    if (data._update) data._update({ fit: next })
  }

  return (
    <NodeWrapper selected={selected} onDelete={data._delete}>
      <div className="node image-node">
        <NodeResizer minWidth={100} minHeight={80} isVisible={selected} color="var(--accent2)" />
        <Handle type="target" position={Position.Top}    className="rf-handle" />
        <Handle type="source" position={Position.Bottom} className="rf-handle" />

        <div className="node-drag-bar">
          <span className="node-type-label">⬜ image</span>
          <div className="node-drag-actions">
            {selected && (
              <button
                className="node-edit-btn"
                title={fit === 'contain' ? 'Switch to cover (fill/crop)' : 'Switch to contain (fit whole image)'}
                onPointerDown={e => e.stopPropagation()}
                onClick={toggleFit}
              >{fit === 'contain' ? '⊡ fit' : '⊠ fill'}</button>
            )}
            {data.originalName && <span className="node-filename">{data.originalName}</span>}
          </div>
        </div>

        {/* Image fills all remaining vertical space */}
        <div className="image-node-img-wrap">
          <img
            src={resolveUrl(data.src)}
            alt={data.originalName || ''}
            draggable={false}
            style={{ objectFit: fit }}
          />
        </div>

        {data._boardSettings?.showCaptions !== false && (
          editingCaption ? (
            <div className="image-caption-row">
              <input
                className="input" style={{ fontSize: 11, width: '100%' }}
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
            <div className="image-caption-row" onPointerDown={e => e.stopPropagation()} onClick={() => setEditCaption(true)}>
              {data.caption
                ? <span className="image-caption">{data.caption}</span>
                : <span className="empty-hint small">+ caption</span>}
            </div>
          )
        )}
      </div>
    </NodeWrapper>
  )
}