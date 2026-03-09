import { useEffect, useRef } from 'react'
import './ContextMenu.css'

export default function ContextMenu({ x, y, onClose, onAddText, onAddGroup, onAddMedia }) {
  const ref = useRef()

  const menuW = 190, menuH = 180
  const left = (x + menuW > window.innerWidth)  ? x - menuW : x
  const top  = (y + menuH > window.innerHeight) ? y - menuH : y

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const item = (icon, label, action) => (
    <button
      className="ctx-item"
      onPointerDown={e => e.stopPropagation()}
      onClick={(e) => { e.stopPropagation(); action() }}
    >
      <span className="ctx-icon">{icon}</span>
      <span className="ctx-label">{label}</span>
    </button>
  )

  return (
    <div
      ref={ref}
      className="ctx-menu"
      style={{ left, top }}
      onPointerDown={e => e.stopPropagation()}
    >
      <div className="ctx-section-label">Add to canvas</div>
      {item('✎', 'Text note',   onAddText)}
      {item('⬆', 'Upload media', onAddMedia)}
      {item('▭', 'Group box',   onAddGroup)}
    </div>
  )
}