import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Handle, Position, NodeResizer } from '@xyflow/react'
import ReactMarkdown from 'react-markdown'
import NodeWrapper from './NodeWrapper'
import './nodes.css'
import './TextNode.css'

// ── Color themes ──────────────────────────────────────────────────────────────
const NOTE_COLORS = [
  { label: 'Default', bg: 'var(--surface)',  border: 'var(--border2)' },
  { label: 'Amber',   bg: '#2a1f0a',         border: '#c9a96e' },
  { label: 'Sage',    bg: '#0a1f0f',         border: '#6ec98a' },
  { label: 'Blue',    bg: '#0a1220',         border: '#6e9ec9' },
  { label: 'Rose',    bg: '#1f0a10',         border: '#c96e8a' },
  { label: 'Violet',  bg: '#130a1f',         border: '#9e6ec9' },
]

const FONTS = [
  { label: 'Serif', cls: 'font-serif' },
  { label: 'Sans',  cls: 'font-sans'  },
  { label: 'Mono',  cls: 'font-mono'  },
]

const CODE_LANGS = [
  'python','javascript','typescript','jsx','tsx','html','css','json',
  'sql','bash','shell','rust','go','java','c','cpp','c#','swift','kotlin',
  'php','ruby','yaml','toml','markdown','plaintext',
]

function getStats(text) {
  const words = text.trim() ? text.trim().split(/\s+/).length : 0
  return { words, mins: Math.max(1, Math.round(words / 200)) }
}

// ── Formatting helpers ────────────────────────────────────────────────────────
function applyFormat(taRef, text, setText, type) {
  const ta = taRef.current
  if (!ta) return
  const s   = ta.selectionStart
  const e   = ta.selectionEnd
  const sel = text.slice(s, e)
  let newText = text, ns = s, ne = e

  if (type === 'bold')   { newText = text.slice(0,s)+`**${sel}**`+text.slice(e); ns=s+2; ne=e+2 }
  if (type === 'italic') { newText = text.slice(0,s)+`*${sel}*`+text.slice(e);   ns=s+1; ne=e+1 }
  if (type === 'strike') { newText = text.slice(0,s)+`~~${sel}~~`+text.slice(e); ns=s+2; ne=e+2 }
  if (type === 'quote') {
    const ls = text.lastIndexOf('\n', s-1)+1
    newText = text.slice(0,ls)+'> '+text.slice(ls); ns=s+2; ne=e+2
  }
  if (type === 'h1'||type === 'h2'||type === 'h3') {
    const prefix = type==='h1'?'# ':type==='h2'?'## ':'### '
    const ls = text.lastIndexOf('\n', s-1)+1
    const stripped = text.slice(ls).replace(/^#{1,3}\s/, '')
    const offset   = text.slice(ls).length - stripped.length
    newText = text.slice(0,ls)+prefix+stripped
    ns = Math.max(ls, s-offset)+prefix.length; ne = ns
  }
  if (type === 'ul') {
    const ls = text.lastIndexOf('\n', s-1)+1
    newText = text.slice(0,ls)+'- '+text.slice(ls); ns=s+2; ne=e+2
  }
  if (type === 'ol') {
    const ls = text.lastIndexOf('\n', s-1)+1
    newText = text.slice(0,ls)+'1. '+text.slice(ls); ns=s+3; ne=e+3
  }
  if (type === 'hr') {
    const ins = '\n\n---\n\n'
    newText = text.slice(0,s)+ins+text.slice(e); ns=s+ins.length; ne=ns
  }

  setText(newText)
  setTimeout(() => { ta.focus(); ta.setSelectionRange(ns, ne) }, 0)
}

// ── Code insert modal ─────────────────────────────────────────────────────────
function CodeInsertModal({ onInsert, onClose }) {
  const [lang, setLang]     = useState('javascript')
  const [code, setCode]     = useState('')
  const taRef = useRef()

  useEffect(() => { taRef.current?.focus() }, [])

  const handleInsert = () => {
    if (!code.trim()) { onClose(); return }
    onInsert(`\`\`\`${lang}\n${code}\n\`\`\``)
    onClose()
  }

  return (
    <div className="code-modal-overlay" onPointerDown={e => { if(e.target===e.currentTarget) onClose() }}>
      <div className="code-modal" onPointerDown={e => e.stopPropagation()}>
        <div className="code-modal-header">
          <span className="code-modal-title">Insert Code Block</span>
          <button className="text-focus-close" onClick={onClose}>✕</button>
        </div>

        <div className="code-modal-lang-row">
          <span className="code-modal-label">Language</span>
          <select
            className="code-modal-select"
            value={lang}
            onChange={e => setLang(e.target.value)}
          >
            {CODE_LANGS.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>

        <textarea
          ref={taRef}
          className="code-modal-ta font-mono"
          value={code}
          onChange={e => setCode(e.target.value)}
          placeholder={`Paste your ${lang} code here…`}
          spellCheck={false}
          onKeyDown={e => {
            if (e.key === 'Tab') { e.preventDefault(); const s=e.target.selectionStart; const v=code; setCode(v.slice(0,s)+'  '+v.slice(s)); setTimeout(()=>taRef.current.setSelectionRange(s+2,s+2),0) }
            if ((e.ctrlKey||e.metaKey) && e.key === 'Enter') handleInsert()
          }}
        />

        <div className="code-modal-footer">
          <span className="code-modal-hint">Tab = indent · Ctrl+Enter = insert</span>
          <div style={{ display:'flex', gap:6 }}>
            <button className="text-action-btn" onClick={onClose}>cancel</button>
            <button className="text-action-btn primary" onClick={handleInsert}>Insert</button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Formatting toolbar ────────────────────────────────────────────────────────
function FmtToolbar({ taRef, text, setText, onCodeInsert }) {
  const fmt = (type) => applyFormat(taRef, text, setText, type)
  const btn = (type, label, title, cls='') => (
    <button
      key={type} className={`fmt-btn ${cls}`} title={title}
      onMouseDown={e => { e.preventDefault(); fmt(type) }}
    >{label}</button>
  )
  return (
    <div className="text-fmt-toolbar" onPointerDown={e => e.stopPropagation()}>
      {btn('bold',   'B',   'Bold',          'fmt-bold'  )}
      {btn('italic', 'I',   'Italic',        'fmt-italic')}
      {btn('strike', 'S̶', 'Strikethrough', 'fmt-strike')}
      <span className="fmt-sep" />
      {btn('h1', 'H1', 'Heading 1')}
      {btn('h2', 'H2', 'Heading 2')}
      {btn('h3', 'H3', 'Heading 3')}
      <span className="fmt-sep" />
      {btn('quote', '❝', 'Block quote')}
      {btn('ul',    '•',  'Bullet list' )}
      {btn('ol',    '1.', 'Ordered list')}
      {btn('hr',    '—',  'Divider'     )}
      <span className="fmt-sep" />
      {/* Dedicated code block insert */}
      <button
        className="fmt-btn fmt-code-btn"
        title="Insert code block (with language selection)"
        onMouseDown={e => { e.preventDefault(); onCodeInsert() }}
      >{'</>'}</button>
    </div>
  )
}

// ── Focus mode overlay ────────────────────────────────────────────────────────
function FocusOverlay({ title, setTitle, text, setText, fontIdx, colorBg, colorBorder, onClose, onCodeInsert }) {
  const taRef = useRef()
  const { words, mins } = getStats(text)
  const fontCls = FONTS[fontIdx]?.cls || 'font-serif'

  useEffect(() => {
    taRef.current?.focus()
    const h = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  return (
    <div className="text-focus-overlay" onPointerDown={e => { if(e.target===e.currentTarget) onClose() }}>
      <div className="text-focus-panel" style={{ background: colorBg, borderColor: colorBorder }}
        onPointerDown={e => e.stopPropagation()}>
        <div className="text-focus-header">
          <input className="text-focus-title-input" value={title} onChange={e => setTitle(e.target.value)} placeholder="Title…" />
          <button className="text-focus-close" onClick={onClose} title="Close (Esc)">✕</button>
        </div>
        <FmtToolbar taRef={taRef} text={text} setText={setText} onCodeInsert={onCodeInsert} />
        <div className="text-focus-body">
          <textarea
            ref={taRef}
            className={`text-focus-ta ${fontCls}`}
            value={text} onChange={e => setText(e.target.value)}
            placeholder="Begin writing… markdown is supported." spellCheck
          />
        </div>
        <div className="text-focus-footer">
          <span className="text-focus-stats">{words} words · ~{mins} min read</span>
          <button className="btn primary" onClick={onClose}>✓ Done</button>
        </div>
      </div>
    </div>
  )
}

// ── Main TextNode ─────────────────────────────────────────────────────────────
export default function TextNode({ data, selected }) {
  const [editing,    setEditing]    = useState(!data.text && !data.title)
  const [text,       setText]       = useState(data.text  || '')
  const [title,      setTitle]      = useState(data.title || '')
  const [fontIdx,    setFontIdx]    = useState(data.fontIdx ?? 0)
  const [focusMode,  setFocusMode]  = useState(false)
  const [codeModal,  setCodeModal]  = useState(false)
  const [copied,     setCopied]     = useState(false)
  const taRef = useRef()

  const color   = NOTE_COLORS.find(c => c.label === data.colorLabel) || NOTE_COLORS[0]
  const fontCls = FONTS[fontIdx]?.cls || 'font-serif'
  const { words, mins } = getStats(text)

  // Sync on external changes (undo)
  useEffect(() => {
    if (!editing && !focusMode) {
      setText(data.text   || '')
      setTitle(data.title || '')
      setFontIdx(data.fontIdx ?? 0)
    }
  }, [data.text, data.title, data.fontIdx])

  useEffect(() => { if (editing && taRef.current) taRef.current.focus() }, [editing])

  const commit = useCallback(() => {
    if (data._update) data._update({ text, title, fontIdx })
    setEditing(false)
  }, [data, text, title, fontIdx])

  const cancel = useCallback(() => {
    setText(data.text || ''); setTitle(data.title || ''); setFontIdx(data.fontIdx ?? 0)
    setEditing(false)
  }, [data])

  const exitFocus = useCallback(() => {
    if (data._update) data._update({ text, title, fontIdx })
    setFocusMode(false)
  }, [data, text, title, fontIdx])

  const cycleFont = useCallback((e) => {
    e.stopPropagation()
    const next = (fontIdx + 1) % FONTS.length
    setFontIdx(next)
    if (data._update) data._update({ fontIdx: next })
  }, [fontIdx, data])

  const copyMarkdown = useCallback(async (e) => {
    e.stopPropagation()
    await navigator.clipboard.writeText(title ? `# ${title}\n\n${text}` : text)
    setCopied(true); setTimeout(() => setCopied(false), 1500)
  }, [title, text])

  // Insert code block at cursor (or end)
  const handleCodeInsert = useCallback((codeBlock) => {
    const ta  = taRef.current
    const pos = ta?.selectionStart ?? text.length
    const newText = text.slice(0, pos) + (pos > 0 && text[pos-1] !== '\n' ? '\n' : '') + codeBlock + '\n' + text.slice(pos)
    setText(newText)
    if (data._update) data._update({ text: newText })
    setTimeout(() => { ta?.focus(); ta?.setSelectionRange(pos + codeBlock.length + 1, pos + codeBlock.length + 1) }, 0)
  }, [text, data])

  const openCodeModal = useCallback(() => setCodeModal(true), [])

  return (
    <NodeWrapper selected={selected} onDelete={data._delete}>
      <div
        className={`node text-node ${selected ? 'selected' : ''}`}
        style={{ background: color.bg, borderColor: selected ? 'var(--accent)' : color.border }}
      >
        <NodeResizer minWidth={220} minHeight={120} isVisible={selected} color="var(--accent2)" />
        <Handle type="target" position={Position.Top}    className="rf-handle" />
        <Handle type="source" position={Position.Bottom} className="rf-handle" />

        {/* Drag bar */}
        <div className="node-drag-bar">
          <span className="node-type-label">✎ note</span>
          <div className="node-drag-actions">
            {selected && (
              <div className="color-picker-inline">
                {NOTE_COLORS.map(c => (
                  <button key={c.label} className={`note-color-dot ${data.colorLabel===c.label?'active':''}`}
                    style={{ background: c.border }} title={c.label}
                    onPointerDown={e => e.stopPropagation()}
                    onClick={() => data._update && data._update({ colorLabel: c.label })} />
                ))}
                <span className="fmt-sep" />
              </div>
            )}
            <button className="text-bar-btn" title={`Font: ${FONTS[fontIdx].label}`}
              onPointerDown={e => e.stopPropagation()} onClick={cycleFont}>{FONTS[fontIdx].label}</button>
            <button className="text-bar-btn" title="Focus mode"
              onPointerDown={e => e.stopPropagation()} onClick={e => { e.stopPropagation(); setFocusMode(true) }}>⤢</button>
          </div>
        </div>

        {/* Title */}
        {editing ? (
          <input className="text-node-title-input" value={title} onChange={e => setTitle(e.target.value)}
            placeholder="Title (optional)…" onPointerDown={e => e.stopPropagation()} />
        ) : title ? (
          <div className={`text-node-title-display ${fontCls}`}>{title}</div>
        ) : null}

        {/* Formatting toolbar (only in edit mode) */}
        {editing && <FmtToolbar taRef={taRef} text={text} setText={setText} onCodeInsert={openCodeModal} />}

        {/* Body */}
        {editing ? (
          <div className="node-body">
            <textarea ref={taRef} className="text-node-ta" value={text} onChange={e => setText(e.target.value)}
              onKeyDown={e => {
                if ((e.ctrlKey||e.metaKey) && e.key==='Enter') { e.preventDefault(); commit() }
                if (e.key==='Escape') cancel()
              }}
              placeholder="Write something… markdown supported"
              onPointerDown={e => e.stopPropagation()} spellCheck />
          </div>
        ) : (
          <div className={`text-node-preview ${fontCls}`} onDoubleClick={() => setEditing(true)}>
            {text
              ? <ReactMarkdown>{text}</ReactMarkdown>
              : <span className="empty-hint">double-click to edit</span>}
          </div>
        )}

        {/* Footer */}
        <div className="text-node-footer">
          <span className="text-node-stats">{words > 0 ? `${words} words · ~${mins} min` : 'empty'}</span>
          <div className="text-node-actions">
            <button className={`text-action-btn ${copied?'copied':''}`} title="Copy as Markdown"
              onPointerDown={e => e.stopPropagation()} onClick={copyMarkdown}>
              {copied ? '✓ copied' : '⊞ copy'}
            </button>
            {editing ? (
              <>
                <button className="text-action-btn" onPointerDown={e=>e.stopPropagation()} onClick={cancel}>cancel</button>
                <button className="text-action-btn primary" onPointerDown={e=>e.stopPropagation()} onClick={commit}>done ↵</button>
              </>
            ) : (
              <button className="text-action-btn" onPointerDown={e=>e.stopPropagation()} onClick={() => setEditing(true)}>edit</button>
            )}
          </div>
        </div>
      </div>

      {/* Focus mode portal */}
      {focusMode && createPortal(
        <FocusOverlay
          title={title} setTitle={setTitle} text={text} setText={setText}
          fontIdx={fontIdx} colorBg={color.bg} colorBorder={color.border}
          onClose={exitFocus} onCodeInsert={openCodeModal}
        />, document.body
      )}

      {/* Code insert modal portal */}
      {codeModal && createPortal(
        <CodeInsertModal onInsert={handleCodeInsert} onClose={() => setCodeModal(false)} />,
        document.body
      )}
    </NodeWrapper>
  )
}