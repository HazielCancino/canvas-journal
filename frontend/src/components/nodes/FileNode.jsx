import { Handle, Position } from '@xyflow/react'
import './nodes.css'

const icons = { pdf: '📄', file: '📎', txt: '📝', md: '📝' }

export default function FileNode({ data, selected }) {
  const icon = icons[data.fileType] || '📎'
  return (
    <div className={`node file-node ${selected ? 'selected' : ''}`}>
      <Handle type="target" position={Position.Top} className="rf-handle" />
      <Handle type="source" position={Position.Bottom} className="rf-handle" />

      <div className="node-drag-bar">
        <span className="node-type-label">📎 file</span>
      </div>
      <div className="file-node-body">
        <span className="file-icon">{icon}</span>
        <div className="file-info">
          <div className="file-name">{data.originalName}</div>
          <a className="file-link" href={data.url} target="_blank" rel="noreferrer">Open file ↗</a>
        </div>
      </div>
    </div>
  )
}
