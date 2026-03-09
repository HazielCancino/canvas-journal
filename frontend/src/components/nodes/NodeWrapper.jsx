import './NodeWrapper.css'

export default function NodeWrapper({ selected, children, onDelete, typeLabel }) {
  return (
    <div className={`nw ${selected ? 'nw-selected' : ''}`}>
      {selected && (
        <button
          className="nw-delete"
          title="Delete node (or press Delete key)"
          onPointerDown={e => e.stopPropagation()}
          onClick={e => { e.stopPropagation(); onDelete?.() }}
        >✕</button>
      )}
      {children}
    </div>
  )
}