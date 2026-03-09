import './SelectionBar.css'

export default function SelectionBar({ count, onGroup, onDelete, onDuplicate, onLock, onDeselect, allLocked }) {
  if (count < 2) return null

  return (
    <div className="sel-bar">
      <span className="sel-count">{count} selected</span>
      <div className="sel-divider" />
      <button className="sel-btn" title="Group into box" onClick={onGroup}>
        <span>▭</span> Group
      </button>
      <button className="sel-btn" title="Duplicate" onClick={onDuplicate}>
        <span>⧉</span> Duplicate
      </button>
      <button className="sel-btn" title={allLocked ? 'Unlock all' : 'Lock all'} onClick={onLock}>
        <span>{allLocked ? '🔓' : '🔒'}</span> {allLocked ? 'Unlock' : 'Lock'}
      </button>
      <button className="sel-btn sel-danger" title="Delete all" onClick={onDelete}>
        <span>✕</span> Delete
      </button>
      <button className="sel-btn sel-dismiss" title="Deselect" onClick={onDeselect}>
        esc
      </button>
    </div>
  )
}