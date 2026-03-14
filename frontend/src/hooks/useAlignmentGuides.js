import { useRef, useCallback, useState } from 'react'

const SNAP_THRESHOLD = 6  // pixels — how close before snapping

/**
 * Returns guide lines and a node-drag handler that snaps to other nodes.
 *
 * Usage in CanvasEditor:
 *   const { guides, onNodeDrag, onNodeDragStop } = useAlignmentGuides(nodes, enabled)
 *
 * Render:  <AlignmentGuides guides={guides} />
 */
export function useAlignmentGuides(nodes, enabled) {
  const [guides, setGuides] = useState([])

  const onNodeDrag = useCallback((_, draggedNode) => {
    if (!enabled) { setGuides([]); return }

    const dw = draggedNode.measured?.width  || draggedNode.width  || 200
    const dh = draggedNode.measured?.height || draggedNode.height || 100
    const dx = draggedNode.position.x
    const dy = draggedNode.position.y

    // Key edges of the dragged node
    const dLeft   = dx
    const dRight  = dx + dw
    const dCenterX = dx + dw / 2
    const dTop    = dy
    const dBottom = dy + dh
    const dCenterY = dy + dh / 2

    const newGuides = []

    nodes.forEach(n => {
      if (n.id === draggedNode.id) return
      // Skip group boxes — they're layout containers, not alignment targets
      if (n.type === 'groupBox') return

      const nw = n.measured?.width  || n.width  || 200
      const nh = n.measured?.height || n.height || 100
      const nx = n.position.x
      const ny = n.position.y

      const nLeft    = nx
      const nRight   = nx + nw
      const nCenterX = nx + nw / 2
      const nTop     = ny
      const nBottom  = ny + nh
      const nCenterY = ny + nh / 2

      // ── Vertical guide lines (x-axis alignment) ──
      const vChecks = [
        { drag: dLeft,    target: nLeft,    x: nLeft    },
        { drag: dLeft,    target: nRight,   x: nRight   },
        { drag: dRight,   target: nLeft,    x: nLeft    },
        { drag: dRight,   target: nRight,   x: nRight   },
        { drag: dCenterX, target: nCenterX, x: nCenterX },
      ]
      vChecks.forEach(({ drag, target, x }) => {
        if (Math.abs(drag - target) < SNAP_THRESHOLD) {
          newGuides.push({
            type: 'vertical',
            x,
            y1: Math.min(dTop, nTop) - 20,
            y2: Math.max(dBottom, nBottom) + 20,
          })
        }
      })

      // ── Horizontal guide lines (y-axis alignment) ──
      const hChecks = [
        { drag: dTop,     target: nTop,     y: nTop     },
        { drag: dTop,     target: nBottom,  y: nBottom  },
        { drag: dBottom,  target: nTop,     y: nTop     },
        { drag: dBottom,  target: nBottom,  y: nBottom  },
        { drag: dCenterY, target: nCenterY, y: nCenterY },
      ]
      hChecks.forEach(({ drag, target, y }) => {
        if (Math.abs(drag - target) < SNAP_THRESHOLD) {
          newGuides.push({
            type: 'horizontal',
            y,
            x1: Math.min(dLeft, nLeft) - 20,
            x2: Math.max(dRight, nRight) + 20,
          })
        }
      })
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