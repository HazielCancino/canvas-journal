import { useEffect, useRef, useState } from 'react'
import './ContextMenu.css'

export default function ContextMenu({ x, y, onClose, onAddText, onAddGroup, onAddMedia, onAddEmbed }) {
  const ref            = useRef()
  const urlRef         = useRef()
  const [showUrl, setShowUrl] = useState(false)
  const [urlVal, setUrlVal]   = useState('')

  const menuW = 210, menuH = showUrl ? 240 : 185
  const left = (x + menuW > window.innerWidth)  ? x - menuW : x
  const top  = (y + menuH > window.innerHeight) ? y - menuH : y

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    if (showUrl) setTimeout(() => urlRef.current?.focus(), 30)
  }, [showUrl])

  const submitUrl = () => {
    const v = urlVal.trim()
    if (!v) return
    const url = v.startsWith('http') ? v : `https://${v}`
    onAddEmbed(url)
    onClose()
  }

  const item = (icon, label, action, extra) => (
    <button
      className="ctx-item"
      onPointerDown={e => e.stopPropagation()}
      onClick={(e) => { e.stopPropagation(); action() }}
    >
      <span className="ctx-icon">{icon}</span>
      <span className="ctx-label">{label}</span>
      {extra && <span className="ctx-hint">{extra}</span>}
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

      {item('✎', 'Text note',    onAddText)}
      {item('⬆', 'Upload media', onAddMedia)}
      {item('▭', 'Group box',    onAddGroup)}

      <div className="ctx-divider" />

      {!showUrl ? (
        item('⇢', 'Embed URL', () => setShowUrl(true), 'yt · spotify · link')
      ) : (
        <div className="ctx-embed-form" onPointerDown={e => e.stopPropagation()}>
          <div className="ctx-embed-label">
            <span className="ctx-icon">⇢</span>
            Paste a URL
          </div>
          <input
            ref={urlRef}
            className="ctx-url-input"
            placeholder="youtube.com, spotify, any link…"
            value={urlVal}
            onChange={e => setUrlVal(e.target.value)}
            onKeyDown={e => {
              e.stopPropagation()
              if (e.key === 'Enter') submitUrl()
              if (e.key === 'Escape') { setShowUrl(false); setUrlVal('') }
            }}
          />
          <div className="ctx-embed-row">
            <button className="ctx-embed-cancel" onClick={() => { setShowUrl(false); setUrlVal('') }}>
              cancel
            </button>
            <button className="ctx-embed-submit" onClick={submitUrl} disabled={!urlVal.trim()}>
              embed ↵
            </button>
          </div>
          <div className="ctx-embed-hints">
            <span>▶ youtube · vimeo</span>
            <span>♫ spotify · soundcloud</span>
            <span>⇢ any website</span>
          </div>
        </div>
      )}
    </div>
  )
}