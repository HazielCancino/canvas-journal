/**
 * Call this in onNodeDragStop to auto-parent nodes dropped inside a group.
 * Returns updated nodes array with parentId set where applicable.
 */
export function reparentNodes(draggedNode, allNodes) {
  // Don't reparent groups into groups
  if (draggedNode.type === 'groupBox') return allNodes

  // Use positionAbsolute provided by ReactFlow during drag, fallback to position
  const absX = draggedNode.positionAbsolute?.x ?? draggedNode.position.x
  const absY = draggedNode.positionAbsolute?.y ?? draggedNode.position.y

  const cx = absX + (draggedNode.measured?.width  || 200) / 2
  const cy = absY + (draggedNode.measured?.height || 100) / 2

  let targetGroup = null
  for (const n of allNodes) {
    if (n.type !== 'groupBox' || n.id === draggedNode.id) continue
    const gx = n.positionAbsolute?.x ?? n.position.x
    const gy = n.positionAbsolute?.y ?? n.position.y
    const gw = n.measured?.width  || 240
    const gh = n.measured?.height || 180
    if (cx >= gx && cx <= gx + gw && cy >= gy && cy <= gy + gh) {
      targetGroup = n
      break
    }
  }

  return allNodes.map(n => {
    if (n.id !== draggedNode.id) return n
    if (targetGroup) {
      const tgX = targetGroup.positionAbsolute?.x ?? targetGroup.position.x
      const tgY = targetGroup.positionAbsolute?.y ?? targetGroup.position.y
      const relX = absX - tgX
      const relY = absY - tgY
      return { ...n, parentId: targetGroup.id, position: { x: relX, y: relY }, zIndex: 1 }
    } else if (n.parentId) {
      // Dropped outside a group — un-parent
      const { parentId, extent, ...rest } = n
      return { ...rest, position: { x: absX, y: absY }, zIndex: 1 }
    }
    return n
  })
}