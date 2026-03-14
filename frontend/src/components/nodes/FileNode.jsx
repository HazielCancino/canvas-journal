import { Handle, Position, NodeResizer } from '@xyflow/react'
import { resolveUrl } from '../../api'
import NodeWrapper from './NodeWrapper'
import './nodes.css'

const icons = { pdf: '📄', file: '📎', txt: '📝', md: '📝' }

export default function FileNode({ data, selected }) {
  const isPdf = data.fileType === 'pdf' || (data.originalName || '').toLowerCase().endsWith('.pdf')
  const icon = icons[data.fileType] || (isPdf ? '📄' : '📎')

  if (isPdf) {
    return (
      <NodeWrapper selected={selected} onDelete={data._delete}>
        <div className={`node file-node pdf-node ${selected ? 'selected' : ''}`} style={{ width: '100%', height: '100%', minWidth: 240, minHeight: 300, padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <NodeResizer minWidth={240} minHeight={300} isVisible={selected} color="var(--accent2)" />
          <Handle type="target" position={Position.Top} className="rf-handle" />
          <Handle type="source" position={Position.Bottom} className="rf-handle" />
          
          <div className="node-drag-bar" style={{ flexShrink: 0, borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
            <span className="node-type-label">📄 PDF Document</span>
            <div className="node-drag-actions">
              <a className="text-action-btn" href={resolveUrl(data.url)} target="_blank" rel="noreferrer" onPointerDown={e => e.stopPropagation()} style={{ textDecoration: 'none' }}>Open ↗</a>
            </div>
          </div>
          <iframe 
            src={resolveUrl(data.url)} 
            title={data.originalName}
            style={{ flex: 1, width: '100%', height: '100%', border: 'none', pointerEvents: selected ? 'auto' : 'none' }}
          />
        </div>
      </NodeWrapper>
    )
  }

  return (
    <NodeWrapper selected={selected} onDelete={data._delete}>
      <div className={`node file-node ${selected ? 'selected' : ''}`}>
        <Handle type="target" position={Position.Top} className="rf-handle" />
        <Handle type="source" position={Position.Bottom} className="rf-handle" />

        <div className="node-drag-bar">
          <span className="node-type-label">📎 file</span>
        </div>
        <div className="file-node-body" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span className="file-icon" style={{ fontSize: '24px' }}>{icon}</span>
          {data._boardSettings?.showCaptions !== false && (
            <div className="file-info" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div className="file-name" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>{data.originalName}</div>
              <a className="file-link" href={resolveUrl(data.url)} target="_blank" rel="noreferrer" onPointerDown={e => e.stopPropagation()} style={{ fontSize: '11px', color: 'var(--accent)', textDecoration: 'none' }}>Open file ↗</a>
            </div>
          )}
        </div>
      </div>
    </NodeWrapper>
  )
}
