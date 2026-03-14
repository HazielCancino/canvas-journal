import { useRef, useCallback, useState } from 'react'

const SNAP_THRESHOLD = 8  // pixels — how close before snapping

export function useAlignmentGuides(nodes, enabled) {
  const [guides, setGuides] = useState([])

  const onNodeDrag = useCallback((_, draggedNode) => {
    if (!enabled) { setGuides([]); return }

    const dw = draggedNode.measured?.width  || draggedNode.width  || 200
    const dh = draggedNode.measured?.height || draggedNode.height || 100
    let dx = draggedNode.position.x
    let dy = draggedNode.position.y

    const dCenterX = dx + dw / 2
    const dCenterY = dy + dh / 2

    const newGuides = []
    let snappedX = false
    let snappedY = false

    nodes.forEach(n => {
      if (n.id === draggedNode.id || n.type === 'groupBox') return

      const nw = n.measured?.width  || n.width  || 200
      const nh = n.measured?.height || n.height || 100
      const nx = n.position.x
      const ny = n.position.y

      const nCenterX = nx + nw / 2
      const nCenterY = ny + nh / 2

      // ── Vertical guide lines (x-axis alignment) ──
      if (!snappedX) {
        const vChecks = [
          { drag: dx,           target: nx,           offset: 0 },
          { drag: dx,           target: nx + nw,      offset: 0 },
          { drag: dx + dw,      target: nx,           offset: -dw },
          { drag: dx + dw,      target: nx + nw,      offset: -dw },
          { drag: dCenterX,     target: nCenterX,     offset: -(dw / 2) },
        ]
        
        for (const check of vChecks) {
          if (Math.abs(check.drag - check.target) < SNAP_THRESHOLD) {
            draggedNode.position.x = check.target + check.offset
            dx = draggedNode.position.x // Update dx
            snappedX = true
            newGuides.push({
              type: 'vertical',
              x: check.target,
              y1: Math.min(dy, ny) - 20,
              y2: Math.max(dy + dh, ny + nh) + 20,
            })
            break // Snap to only one vertical guide at a time
          }
        }
      }

      // ── Horizontal guide lines (y-axis alignment) ──
      if (!snappedY) {
        const hChecks = [
          { drag: dy,           target: ny,           offset: 0 },
          { drag: dy,           target: ny + nh,      offset: 0 },
          { drag: dy + dh,      target: ny,           offset: -dh },
          { drag: dy + dh,      target: ny + nh,      offset: -dh },
          { drag: dCenterY,     target: nCenterY,     offset: -(dh / 2) },
        ]
        
        for (const check of hChecks) {
          if (Math.abs(check.drag - check.target) < SNAP_THRESHOLD) {
            draggedNode.position.y = check.target + check.offset
            dy = draggedNode.position.y // Update dy
            snappedY = true
            newGuides.push({
              type: 'horizontal',
              y: check.target,
              x1: Math.min(dx, nx) - 20,
              x2: Math.max(dx + dw, nx + nw) + 20,
            })
            break // Snap to only one horizontal guide at a time
          }
        }
      }
    })

    // Deduplicate guides by position
    const seen = new Set()
    const deduped = newGuides.filter(g => {
      const key = g.type === 'vertical' ? `v${g.x}` : `h${g.y}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })

    setGuides(deduped)
  }, [nodes, enabled])

  const clearGuides = useCallback(() => setGuides([]), [])

  return { guides, onNodeDrag, clearGuides }
}