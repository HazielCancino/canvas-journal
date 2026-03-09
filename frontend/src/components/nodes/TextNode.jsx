import { useState, useRef, useEffect } from 'react'
import { Handle, Position } from '@xyflow/react'
import ReactMarkdown from 'react-markdown'
import NodeWrapper from './NodeWrapper'
import './nodes.css'

const NOTE_COLORS = [
  { label: 'Default', bg: 'var(--surface)',  border: 'var(--border2)' },
  { label: 'Amber',   bg: '#2a1f0a',         border: '#c9a96e' },
  { label: 'Sage',    bg: '#0a1f0f',         border: '#6ec98a' },
  { label: 'Blue',    bg: '#0a1220',         border: '#6e9ec9' },
  { label: 'Rose',    bg: '#1f0a10',         border: '#c96e8a' },
  { label: 'Violet',  bg: '#130a1f',         border: '#9e6ec9' },
]

export default function TextNode({ data, selected }) {
  const [editing, setEditing] = useState(!data.text)
  const [text, setText]       = useState(data.text || '')
  const taRef = useRef()
  const color = NOTE_COLORS.find(c => c.label === data.colorLabel) || NOTE_COLORS[0]

  useEffect(() => {
    if (editing && taRef.current) taRef.current.focus()
  }, [editing])

  const commit = () => {
    if (data._update) data._update({ text })
    setEditing(false)
  }

  return (
    <NodeWrapper selected={selected} onDelete={data._delete}>
      <div
        className="node text-node"
        style={{ background: color.bg, borderColor: selected ? 'var(--accent)' : color.border }}
      >
        <Handle type="target" position={Position.Top}    className="rf-handle" />
        <Handle type="source" position={Position.Bottom} className="rf-handle" />

        <div className="node-drag-bar">
          <span className="node-type-label">✎ note</span>
          <div className="node-drag-actions">
            {selected && (
              <div className="color-picker-inline">
                {NOTE_COLORS.map(c => (
                  <button key={c.label}
                    className={`note-color-dot ${data.colorLabel === c.label ? 'active' : ''}`}
                    style={{ background: c.border, borderColor: c.border }}
                    title={c.label}
                    onPointerDown={e => e.stopPropagation()}
                    onClick={() => data._update && data._update({ colorLabel: c.label })}
                  />
                ))}
              </div>
            )}
            {!editing && (
              <button className="node-edit-btn"
                onPointerDown={e => e.stopPropagation()}
                onClick={() => setEditing(true)}>edit</button>
            )}
          </div>
        </div>

        {editing ? (
          <div className="node-body">
            <textarea
              ref={taRef} className="text-node-ta"
              value={text} onChange={e => setText(e.target.value)}
              placeholder="Write something… markdown supported"
              rows={6} onPointerDown={e => e.stopPropagation()}
            />
            <button className="btn primary node-save-btn"
              onPointerDown={e => e.stopPropagation()} onClick={commit}>Done</button>
          </div>
        ) : (
          <div className="node-body text-node-preview" onDoubleClick={() => setEditing(true)}>
            {text ? <ReactMarkdown>{text}</ReactMarkdown> : <span className="empty-hint">double-click to edit</span>}
          </div>
        )}
      </div>
    </NodeWrapper>
  )
}