import { useState, useRef, useEffect } from 'react'
import { Handle, Position } from '@xyflow/react'
import ReactMarkdown from 'react-markdown'
import './nodes.css'

export default function TextNode({ data, selected }) {
  const [editing, setEditing] = useState(!data.text)
  const [text, setText]       = useState(data.text || '')
  const taRef = useRef()

  useEffect(() => {
    if (editing && taRef.current) taRef.current.focus()
  }, [editing])

  const commit = () => {
    if (data._update) data._update({ text })
    setEditing(false)
  }

  return (
    <div className={`node text-node ${selected ? 'selected' : ''}`}>
      <Handle type="target" position={Position.Top}    className="rf-handle" />
      <Handle type="source" position={Position.Bottom} className="rf-handle" />

      <div className="node-drag-bar">
        <span className="node-type-label">✎ note</span>
        {!editing && (
          <button
            className="node-edit-btn"
            onPointerDown={e => e.stopPropagation()}
            onClick={() => setEditing(true)}
          >edit</button>
        )}
      </div>

      {editing ? (
        <div className="node-body">
          <textarea
            ref={taRef}
            className="text-node-ta"
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Write something… markdown supported"
            rows={6}
            onPointerDown={e => e.stopPropagation()}
          />
          <button
            className="btn primary node-save-btn"
            onPointerDown={e => e.stopPropagation()}
            onClick={commit}
          >Done</button>
        </div>
      ) : (
        <div className="node-body text-node-preview" onDoubleClick={() => setEditing(true)}>
          {text
            ? <ReactMarkdown>{text}</ReactMarkdown>
            : <span className="empty-hint">double-click to edit</span>
          }
        </div>
      )}
    </div>
  )
}