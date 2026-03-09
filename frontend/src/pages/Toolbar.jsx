import { useRef } from 'react'
import CanvasBackground from './CanvasBackground'
import './Toolbar.css'

export default function Toolbar({ board, saving, lastSaved, onBack, onAddText, onAddGroup, onUpload, bgConfig, onBgChange }) {
  const fileRef = useRef()

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files)
    if (files.length) { onUpload(files); e.target.value = '' }
  }

  const fmtTime = (d) => d ? d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : null

  return (
    <div className="toolbar">
      <div className="toolbar-left">
        <button className="btn ghost toolbar-back" onClick={onBack}>← boards</button>
        <div className="toolbar-divider" />
        <span className="toolbar-board-name">{board?.name || '…'}</span>
      </div>

      <div className="toolbar-center">
        <button className="btn ghost toolbar-tool" onClick={onAddText}>
          <span className="tool-icon">T</span><span className="tool-label">Text</span>
        </button>
        <button className="btn ghost toolbar-tool" onClick={() => fileRef.current?.click()}>
          <span className="tool-icon">⬆</span><span className="tool-label">Media</span>
        </button>
        <button className="btn ghost toolbar-tool" onClick={onAddGroup}>
          <span className="tool-icon">▭</span><span className="tool-label">Group</span>
        </button>
        <div className="toolbar-divider" />
        {board && <CanvasBackground boardId={board.id} bgConfig={bgConfig} onChange={onBgChange} />}
        <input ref={fileRef} type="file" multiple style={{ display:'none' }}
          accept="image/*,video/*,.pdf,.txt,.md" onChange={handleFileChange} />
      </div>

      <div className="toolbar-right">
        <span className="toolbar-save-status">
          {saving ? <span className="save-pulse">saving…</span>
                  : lastSaved ? <span className="save-ok">✓ {fmtTime(lastSaved)}</span> : null}
        </span>
      </div>
    </div>
  )
}