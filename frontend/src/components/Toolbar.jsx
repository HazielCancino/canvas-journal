import { useRef } from 'react'
import CanvasBackground from './CanvasBackground'
import './Toolbar.css'

export default function Toolbar({
  board, saving, lastSaved, onBack,
  onAddText, onAddGroup, onUpload,
  bgConfig, onBgChange, boardId,
  onOpenSettings,
}) {
  const fileRef = useRef()

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files)
    if (files.length) { onUpload(files); e.target.value = '' }
  }

  const fmtTime = (d) => d
    ? d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    : null

  return (
    <div className="toolbar">
      <div className="toolbar-left">
        <button className="btn ghost toolbar-back" onClick={onBack}>← boards</button>
        <div className="toolbar-divider" />
        <span className="toolbar-board-name">{board?.name || '…'}</span>
      </div>

      <div className="toolbar-center">
        <button className="btn ghost toolbar-tool" onClick={onAddText} title="Add text note (writer mode)">
          <span className="tool-icon">✎</span>
          <span className="tool-label">Write</span>
        </button>
        <button className="btn ghost toolbar-tool" onClick={() => fileRef.current?.click()} title="Upload media or drop a .txt/.md/.docx to import">
          <span className="tool-icon">⬆</span>
          <span className="tool-label">Media</span>
        </button>
        <button className="btn ghost toolbar-tool" onClick={onAddGroup} title="Add group box">
          <span className="tool-icon">▭</span>
          <span className="tool-label">Group</span>
        </button>

        <div className="toolbar-divider" />

        <CanvasBackground boardId={boardId} bgConfig={bgConfig} onChange={onBgChange} />

        {/* Accept text/doc formats in addition to media */}
        <input
          ref={fileRef} type="file" multiple style={{ display: 'none' }}
          accept="image/*,video/*,.gif,.pdf,.txt,.md,.docx"
          onChange={handleFileChange}
        />
      </div>

      <div className="toolbar-right">
        <span className="toolbar-save-status">
          {saving
            ? <span className="save-pulse">saving…</span>
            : lastSaved
              ? <span className="save-ok">✓ {fmtTime(lastSaved)}</span>
              : null}
        </span>
        <button
          className="btn ghost toolbar-tool toolbar-settings"
          onClick={onOpenSettings}
          title="Board settings"
        >
          <span className="tool-icon">⚙</span>
          <span className="tool-label">Settings</span>
        </button>
      </div>
    </div>
  )
}