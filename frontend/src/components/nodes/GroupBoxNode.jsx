import { useState } from 'react'
import { NodeResizer } from '@xyflow/react'
import NodeWrapper from './NodeWrapper'
import './nodes.css'

const COLORS = ['#c9a96e','#6ec98a','#6e9ec9','#c96e6e','#9e6ec9','#6ec9c9']

export default function GroupBoxNode({ data, selected }) {
  const [editLabel, setEditLabel] = useState(false)
  const [label, setLabel]         = useState(data.label || 'Group')
  const color = data.color || '#c9a96e'

  const saveLabel = () => {
    if (data._update) data._update({ label })
    setEditLabel(false)
  }

  return (
    <NodeWrapper selected={selected} onDelete={data._delete}>
      <div
        className="node group-node"
        style={{ '--group-color': color, minWidth: 240, minHeight: 180 }}
      >
        <NodeResizer minWidth={160} minHeight={120} isVisible={selected} color={color} />

        {/* Header bar - the only draggable part */}
        <div className="group-header">
          {editLabel ? (
            <input
              className="input group-label-input"
              value={label}
              onChange={e => setLabel(e.target.value)}
              onBlur={saveLabel}
              onKeyDown={e => e.key === 'Enter' && saveLabel()}
              onPointerDown={e => e.stopPropagation()}
              autoFocus
            />
          ) : (
            <span className="group-label" onDoubleClick={() => setEditLabel(true)}>
              {data.label || 'Group'}
            </span>
          )}

          {selected && (
            <div className="group-color-picker">
              {COLORS.map(c => (
                <button
                  key={c}
                  className="color-dot"
                  style={{
                    background: c,
                    outline: c === color ? `2px solid ${c}` : 'none',
                    outlineOffset: 2,
                  }}
                  onPointerDown={e => e.stopPropagation()}
                  onClick={() => data._update && data._update({ color: c })}
                />
              ))}
            </div>
          )}
        </div>

        {/* Body - transparent so you can see nodes inside */}
        <div className="group-body" />
      </div>
    </NodeWrapper>
  )
}