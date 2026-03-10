import './SelectionBar.css'

export default function SelectionBar({
  count, allLocked,
  onGroup, onDelete, onDuplicate, onLock, onDeselect,
}) {
  if (count < 1) return null

  return (
    <div className="sel-bar">
      <span className="sel-count">
        {count} {count === 1 ? 'node' : 'nodes'} selected
      </span>

      <div className="sel-divider" />

      {/* Group only makes sense with 2+ nodes */}
      {count >= 2 && (
        <button className="sel-btn" title="Wrap in a group box" onClick={onGroup}>
          <span>▭</span> Group
        </button>
      )}

      <button className="sel-btn" title="Duplicate" onClick={onDuplicate}>
        <span>⧉</span> Duplicate
      </button>

      <button
        className={`sel-btn ${allLocked ? 'sel-active' : ''}`}
        title={allLocked ? 'Unlock — make draggable again' : 'Lock — pin in place'}
        onClick={onLock}
      >
        <span>{allLocked ? '🔓' : '🔒'}</span>
        {allLocked ? 'Unlock' : 'Lock'}
      </button>

      <button className="sel-btn sel-danger" title="Delete" onClick={onDelete}>
        <span>✕</span> Delete
      </button>

      <button className="sel-btn sel-dismiss" title="Deselect (Esc)" onClick={onDeselect}>
        esc
      </button>
    </div>
  )
}