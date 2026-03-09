import { useState, useEffect, useCallback, useRef } from 'react'
import {
  ReactFlow, Background, Controls, MiniMap,
  useNodesState, useEdgesState, addEdge,
  ReactFlowProvider, useReactFlow,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import { boardsApi, mediaApi } from '../api'
import Toolbar from '../components/Toolbar'
import TextNode from '../components/nodes/TextNode'
import ImageNode from '../components/nodes/ImageNode'
import VideoNode from '../components/nodes/VideoNode'
import GroupBoxNode from '../components/nodes/GroupBoxNode'
import FileNode from '../components/nodes/FileNode'
import './CanvasEditor.css'

const nodeTypes = {
  textNote:  TextNode,
  imageNote: ImageNode,
  videoNote: VideoNode,
  groupBox:  GroupBoxNode,
  fileNote:  FileNode,
}

let _counter = Date.now()
const uid = () => `n_${_counter++}`

function CanvasInner({ boardId, onBack }) {
  const [board, setBoard]                        = useState(null)
  const [nodes, setNodes, onNodesChange]         = useNodesState([])
  const [edges, setEdges, onEdgesChange]         = useEdgesState([])
  const [saving, setSaving]                      = useState(false)
  const [lastSaved, setLastSaved]                = useState(null)
  const saveTimer                                = useRef(null)
  const { screenToFlowPosition }                 = useReactFlow()

  // ── updater so nodes can patch their own data ──
  const updateNodeData = useCallback((id, patch) => {
    setNodes(ns => ns.map(n =>
      n.id === id ? { ...n, data: { ...n.data, ...patch } } : n
    ))
  }, [])

  const attachUpdater = useCallback((node) => ({
    ...node,
    data: {
      ...node.data,
      _update: (patch) => updateNodeData(node.id, patch),
    },
  }), [updateNodeData])

  // ── load ──
  useEffect(() => {
    boardsApi.get(boardId)
      .then(r => {
        setBoard(r.data)
        const s = r.data.canvas_state || {}
        setNodes((s.nodes || []).map(attachUpdater))
        setEdges(s.edges || [])
      })
      .catch(e => console.error('Board load error:', e))
  }, [boardId])

  // ── auto-save (strip _update fn before JSON) ──
  useEffect(() => {
    if (!board) return
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      setSaving(true)
      try {
        const cleanNodes = nodes.map(({ data: { _update, ...rest }, ...n }) => ({ ...n, data: rest }))
        await boardsApi.save(boardId, { nodes: cleanNodes, edges, viewport: { x: 0, y: 0, zoom: 1 } })
        setLastSaved(new Date())
      } catch(e) { console.error('Save error:', e) }
      finally    { setSaving(false) }
    }, 1500)
  }, [nodes, edges, board])

  // ── add node helper ──
  const addNode = useCallback((type, data = {}, screenPos = null) => {
    const sp = screenPos || { x: window.innerWidth / 2, y: window.innerHeight / 2 }
    const fp = screenToFlowPosition(sp)
    const id = uid()
    setNodes(ns => [...ns, {
      id,
      type,
      position: { x: fp.x - 110, y: fp.y - 60 },
      data: { ...data, _update: (patch) => updateNodeData(id, patch) },
    }])
  }, [screenToFlowPosition, updateNodeData])

  // ── media upload ──
  const handleUpload = useCallback(async (files, screenPos = null) => {
    for (const file of files) {
      try {
        const { data: m } = await mediaApi.upload(boardId, file)
        const sp = screenPos
          ? { x: screenPos.x + Math.random() * 50 - 25, y: screenPos.y + Math.random() * 50 - 25 }
          : null
        if      (m.file_type === 'image') addNode('imageNote', { src: mediaApi.url(m.filename), originalName: m.original_name }, sp)
        else if (m.file_type === 'video') addNode('videoNote', { src: mediaApi.url(m.filename), originalName: m.original_name }, sp)
        else                              addNode('fileNote',  { url: mediaApi.url(m.filename), originalName: m.original_name, fileType: m.file_type }, sp)
      } catch(e) { console.error('Upload error:', e) }
    }
  }, [boardId, addNode])

  const onDrop = useCallback((e) => {
    e.preventDefault()
    const files = Array.from(e.dataTransfer.files)
    if (files.length) handleUpload(files, { x: e.clientX, y: e.clientY })
  }, [handleUpload])

  const onConnect = useCallback(
    (params) => setEdges(es => addEdge({ ...params, type: 'smoothstep' }, es)),
    []
  )

  return (
    <div className="canvas-editor">
      <Toolbar
        board={board}
        saving={saving}
        lastSaved={lastSaved}
        onBack={onBack}
        onAddText={()    => addNode('textNote',  { text: '' })}
        onAddGroup={()   => addNode('groupBox',  { label: 'Group', color: '#c9a96e' })}
        onUpload={(files) => handleUpload(files)}
      />
      <div
        className="canvas-area"
        onDrop={onDrop}
        onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy' }}
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          fitView
          minZoom={0.05}
          maxZoom={4}
          deleteKeyCode="Delete"
          proOptions={{ hideAttribution: true }}
        >
          <Background color="#2a2720" gap={24} size={1} />
          <Controls showInteractive={false} />
          <MiniMap
            nodeColor={() => '#3d3930'}
            maskColor="rgba(14,13,11,0.75)"
            style={{ background: '#1a1814', border: '1px solid #2e2b24', borderRadius: 8 }}
          />
        </ReactFlow>
      </div>
    </div>
  )
}

export default function CanvasEditor({ boardId, onBack }) {
  return (
    <ReactFlowProvider>
      <CanvasInner boardId={boardId} onBack={onBack} />
    </ReactFlowProvider>
  )
}