import { useState } from 'react'
import { NodeResizer } from '@xyflow/react'
import NodeWrapper from './NodeWrapper'
import './nodes.css'
import './GroupBoxNode.css'

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
    // NodeWrapper adds the delete button — pass noOutline so the group keeps its dashed look
    <NodeWrapper selected={selected} onDelete={data._delete} noOutline>
      <div
        className={`node group-node ${selected ? 'selected' : ''}`}
        style={{ '--group-color': color }}
      >
        {/* Resizer — all 8 handles, resizes freely in both directions */}
        <NodeResizer
          minWidth={120}
          minHeight={80}
          isVisible={selected}
          color={color}
          lineStyle={{ stroke: color, strokeDasharray: '4 3' }}
        />

        {/* Header */}
        <div className="group-header" onPointerDown={e => e.stopPropagation()}>
          {editLabel ? (
            <input
              className="input group-label-input"
              value={label}
              onChange={e => setLabel(e.target.value)}
              onBlur={saveLabel}
              onKeyDown={e => { if (e.key === 'Enter') saveLabel(); if (e.key === 'Escape') { setLabel(data.label||'Group'); setEditLabel(false) } }}
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
                  onClick={() => data._update && data._update({ color: c })}
                />
              ))}
            </div>
          )}
        </div>

        {/* Body — transparent, fills remaining space so drop targets work */}
        <div className="group-body" />
      </div>
    </NodeWrapper>
  )
}