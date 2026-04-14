import { useMemo } from 'react'
import './OutlineDrawer.css'

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
  if (!n || !n.data) return '(Untitled)'
  const d = n.data
  return d.title || d.label || d.originalName || d.url || '(Untitled)'
}

export default function OutlineDrawer({ isOpen, onClose, nodes = [], onJumpToNode }) {
  
  // Build a tree of nodes (groups at root, nodes inside groups)
  const tree = useMemo(() => {
    // 1. Get all root elements (no parentId)
    const roots = nodes.filter(n => !n.parentId)
    
    // 2. Helper to get children
    const getChildren = (parentId) => nodes.filter(n => n.parentId === parentId)

    // Build hierarchical representations
    const buildHierarchy = (parentNodes, level = 0) => {
      let items = []
      // Sort: Groups first, then others
      const sorted = [...parentNodes].sort((a, b) => {
        if (a.type === 'groupBox' && b.type !== 'groupBox') return -1
        if (b.type === 'groupBox' && a.type !== 'groupBox') return 1
        return 0
      })

      for (const n of sorted) {
        items.push({ 
          id: n.id, 
          type: n.type, 
          label: getNodeLabel(n), 
          icon: getIconForNode(n.type),
          level 
        })
        if (n.type === 'groupBox') {
          items = items.concat(buildHierarchy(getChildren(n.id), level + 1))
        }
      }
      return items
    }

    return buildHierarchy(roots, 0)
  }, [nodes])

  return (
    <div className={`outline-drawer ${isOpen ? 'open' : ''}`}>
      <div className="outline-header">
        <span className="outline-title">Outline</span>
        <button className="outline-close-btn" onClick={onClose} title="Close Outline">✕</button>
      </div>
      <div className="outline-body">
        {tree.length === 0 ? (
          <div className="outline-empty">No nodes on canvas.</div>
        ) : (
          tree.map(item => (
            <div 
              key={item.id} 
              className={`outline-item level-${item.level}`}
              onClick={() => onJumpToNode(item.id)}
            >
              <span className="outline-icon">{item.icon}</span>
              <span className="outline-label">{item.label}</span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
