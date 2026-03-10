import { Handle, Position, NodeResizer } from '@xyflow/react'
import NodeWrapper from './NodeWrapper'
import './nodes.css'

export default function VideoNode({ data, selected }) {
  const bs  = data._boardSettings || {}
  const loop = bs.loopVideos    ?? false
  const auto = bs.autoplayVideos ?? false

  return (
    <NodeWrapper selected={selected} onDelete={data._delete}>
      <div className="node video-node">
        <NodeResizer minWidth={200} minHeight={140} isVisible={selected} color="var(--accent2)" />
        <Handle type="target" position={Position.Top}    className="rf-handle" />
        <Handle type="source" position={Position.Bottom} className="rf-handle" />

        <div className="node-drag-bar">
          <span className="node-type-label">▶ video</span>
          {data.originalName && <span className="node-filename">{data.originalName}</span>}
        </div>

        {/* Video fills all remaining vertical space */}
        <div className="video-wrap">
          <video
            src={data.src}
            controls
            loop={loop}
            autoPlay={auto}
            muted={auto}        /* browsers require muted for autoplay */
            playsInline
          />
        </div>
      </div>
    </NodeWrapper>
  )
}