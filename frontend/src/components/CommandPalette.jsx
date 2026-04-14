import { useState, useEffect, useRef } from 'react'
import './CommandPalette.css'

function getIconForNode(type) {
  switch (type) {
    case 'textNote': return '📝'
    case 'groupBox': return '🗂️'
    case 'imageNote': return '🖼️'
    case 'videoNote': return '🎥'
    case 'fileNote': return '📄'
    case 'embedNote': return '🔗'
    default: return '📍'
  }
}

function getNodeLabel(n) {
  if (!n || !n.data) return '(Untitled Note)'
  const d = n.data
  return d.title || d.label || d.originalName || d.url || '(Untitled Note)'
}

function getNodePreview(n) {
  if (!n || !n.data) return ''
  const d = n.data
  if (n.type === 'textNote') {
    const txt = (d.text || '').replace(/\n/g, ' ')
    if (txt.length > 60) return txt.substring(0, 60) + '...'
    return txt
  }
  return n.type
}

const STATIC_ACTIONS = [
  { id: 'add-text', icon: '📝', title: 'Add Text Note', action: 'add-text' },
  { id: 'add-group', icon: '🗂️', title: 'Add Group Box', action: 'add-group' },
  { id: 'upload-media', icon: '⬆️', title: 'Upload Media / File', action: 'upload-media' },
  { id: 'toggle-theme', icon: '🎨', title: 'Toggle Theme', action: 'toggle-theme' },
  { id: 'go-home', icon: '🏠', title: 'Back to Boards', action: 'go-home' }
]

export default function CommandPalette({ isOpen, onClose, nodes = [], onJumpToNode, onPerformAction }) {
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef()
  const listRef = useRef()

  useEffect(() => {
    if (isOpen) {
      setQuery('')
      setSelectedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [isOpen])

  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  if (!isOpen) return null

  const q = query.toLowerCase()

  // Filter actions
  const filteredActions = STATIC_ACTIONS.filter(a => a.title.toLowerCase().includes(q))

  // Filter nodes
  const filteredNodes = nodes.filter(n => {
    if (!n || !n.data) return false
    const d = n.data
    const txt = [d.title, d.label, d.text, d.originalName, d.url].filter(Boolean).join(' ').toLowerCase()
    return txt.includes(q)
  }).slice(0, 15) // Limit to 15 results

  const sections = []
  if (filteredActions.length > 0) sections.push({ title: 'Actions', items: filteredActions, type: 'action' })
  if (filteredNodes.length > 0) sections.push({ title: 'Canvas Nodes', items: filteredNodes, type: 'node' })

  // Flatten items for keyboard navigation
  const flatItems = []
  sections.forEach(sec => {
    sec.items.forEach(item => flatItems.push({ ...item, _type: sec.type }))
  })

  const handleSelect = (item) => {
    if (item._type === 'action') {
      onPerformAction(item.action)
    } else if (item._type === 'node') {
      onJumpToNode(item.id)
    }
    onClose()
  }

  const onKeyDown = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(i => (i < flatItems.length - 1 ? i + 1 : 0))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(i => (i > 0 ? i - 1 : flatItems.length - 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (flatItems[selectedIndex]) handleSelect(flatItems[selectedIndex])
    }
  }

  let globalIndex = -1

  return (
    <div className="command-palette-overlay" onPointerDown={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="command-palette" onPointerDown={e => e.stopPropagation()}>
        <div className="palette-header">
          <span className="palette-search-icon">🔍</span>
          <input
            ref={inputRef}
            className="palette-input"
            placeholder="Search canvas or type a command..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            spellCheck={false}
          />
        </div>
        
        <div className="palette-body" ref={listRef}>
          {sections.length === 0 ? (
            <div className="palette-empty">No results found for "{query}"</div>
          ) : (
            sections.map(sec => (
              <div key={sec.title} className="palette-section">
                <div className="palette-section-title">{sec.title}</div>
                {sec.items.map(item => {
                  globalIndex++
                  const isSelected = globalIndex === selectedIndex
                  
                  // Extract display props depending on item type
                  let icon = item.icon
                  let title = item.title
                  let subtitle = null
                  
                  if (sec.type === 'node') {
                    icon = getIconForNode(item.type)
                    title = getNodeLabel(item)
                    subtitle = getNodePreview(item)
                  }

                  return (
                    <div
                      key={item.id}
                      className={`palette-item ${isSelected ? 'selected' : ''}`}
                      onPointerEnter={() => setSelectedIndex(globalIndex)}
                      onClick={() => handleSelect({ ...item, _type: sec.type })}
                      ref={isSelected ? el => el?.scrollIntoView({ block: 'nearest' }) : null}
                    >
                      <div className="palette-item-icon">{icon}</div>
                      <div className="palette-item-content">
                        <div className="palette-item-title">{title}</div>
                        {subtitle && <div className="palette-item-subtitle">{subtitle}</div>}
                      </div>
                      {isSelected && sec.type === 'action' && <div className="palette-item-shortcut">↵</div>}
                    </div>
                  )
                })}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
