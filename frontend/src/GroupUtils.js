/**
 * Call this in onNodeDragStop to auto-parent nodes dropped inside a group.
 * Returns updated nodes array with parentId set where applicable.
 */
export function reparentNodes(draggedNode, allNodes) {
  // Find group boxes that contain this node's center point
  const nx = draggedNode.position.x + (draggedNode.measured?.width  || 200) / 2
  const ny = draggedNode.position.y + (draggedNode.measured?.height || 100) / 2

  // Don't reparent groups into groups
  if (draggedNode.type === 'groupBox') return allNodes

  let targetGroup = null
  for (const n of allNodes) {
    if (n.type !== 'groupBox' || n.id === draggedNode.id) continue
    const gx = n.position.x, gy = n.position.y
    const gw = n.measured?.width  || 240
    const gh = n.measured?.height || 180
    if (nx >= gx && nx <= gx + gw && ny >= gy && ny <= gy + gh) {
      targetGroup = n
      break
    }
  }

  return allNodes.map(n => {
    if (n.id !== draggedNode.id) return n
    if (targetGroup) {
      // Make position relative to group
      const relX = n.position.x - targetGroup.position.x
      const relY = n.position.y - targetGroup.position.y
      return { ...n, parentId: targetGroup.id, extent: 'parent', position: { x: relX, y: relY } }
    } else if (n.parentId) {
      // Dropped outside group — un-parent it
      const parent = allNodes.find(p => p.id === n.parentId)
      const absX = n.position.x + (parent?.position.x || 0)
      const absY = n.position.y + (parent?.position.y || 0)
      const { parentId, extent, ...rest } = n
      return { ...rest, position: { x: absX, y: absY } }
    }
    return n
  })
}