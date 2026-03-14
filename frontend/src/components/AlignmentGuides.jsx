import { useReactFlow } from '@xyflow/react'
import './AlignmentGuides.css'

/**
 * Renders alignment guide lines as absolutely-positioned lines over the canvas.
 * Must be placed INSIDE the ReactFlow component (as a child or sibling of Background).
 * Uses the ReactFlow viewport transform to convert flow coordinates → screen pixels.
 */
export default function AlignmentGuides({ guides }) {
  const { getViewport } = useReactFlow()

  if (!guides || guides.length === 0) return null

  const { x: vpX, y: vpY, zoom } = getViewport()

  // Convert a flow coordinate to a screen pixel offset (relative to canvas container)
  const toScreen = (fx, fy) => ({
    sx: fx * zoom + vpX,
    sy: fy * zoom + vpY,
  })

  return (
    <div className="alignment-guides-layer" aria-hidden="true">
      {guides.map((g, i) => {
        if (g.type === 'vertical') {
          const { sx } = toScreen(g.x, 0)
          const { sy: sy1 } = toScreen(0, g.y1)
          const { sy: sy2 } = toScreen(0, g.y2)
          return (
            <div
              key={i}
              className="guide-line guide-vertical"
              style={{
                left: sx,
                top:  sy1,
                height: sy2 - sy1,
              }}
            />
          )
        } else {
          const { sy } = toScreen(0, g.y)
          const { sx: sx1 } = toScreen(g.x1, 0)
          const { sx: sx2 } = toScreen(g.x2, 0)
          return (
            <div
              key={i}
              className="guide-line guide-horizontal"
              style={{
                top:   sy,
                left:  sx1,
                width: sx2 - sx1,
              }}
            />
          )
        }
      })}
    </div>
  )
}
