import { Handle, Position, NodeResizer } from '@xyflow/react'
import './nodes.css'

export default function VideoNode({ data, selected }) {
  return (
    <div className={`node video-node ${selected ? 'selected' : ''}`}>
      <NodeResizer minWidth={240} minHeight={140} isVisible={selected} color="var(--accent)" />
      <Handle type="target" position={Position.Top} className="rf-handle" />
      <Handle type="source" position={Position.Bottom} className="rf-handle" />

      <div className="node-drag-bar">
        <span className="node-type-label">▶ video</span>
        <span className="node-filename">{data.originalName}</span>
      </div>

      <div className="video-wrap">
        <video src={data.src} controls style={{ width: '100%', display: 'block' }} />
      </div>
    </div>
  )
}
