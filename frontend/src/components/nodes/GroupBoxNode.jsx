import { useState } from 'react'
import { NodeResizer } from '@xyflow/react'
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
    <div
      className={`node group-node ${selected ? 'selected' : ''}`}
      style={{ '--group-color': color, minWidth: 200, minHeight: 150 }}
    >
      <NodeResizer minWidth={120} minHeight={80} isVisible={selected} color={color} />
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
                style={{ background: c, outline: c === color ? `2px solid ${c}` : 'none', outlineOffset: 2 }}
                onPointerDown={e => e.stopPropagation()}
                onClick={() => data._update && data._update({ color: c })}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}