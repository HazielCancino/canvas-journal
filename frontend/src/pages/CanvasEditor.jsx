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

const DEFAULT_BG = { type: 'color', color: '#0e0d0b', pattern: 'dots', patternColor: '#2a2720' }
let _counter = Date.now()
const uid = () => `n_${_counter++}`

function getBgStyle(bg) {
  if (!bg) return { background: DEFAULT_BG.color }
  if (bg.type === 'image' && bg.imageUrl) {
    return { backgroundImage: `url(${bg.imageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }
  }
  return { background: bg.color || DEFAULT_BG.color }
}

function CanvasInner({ boardId, onBack }) {
  const [board, setBoard]                = useState(null)
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [bgConfig, setBgConfig]          = useState(DEFAULT_BG)
  const [saving, setSaving]              = useState(false)
  const [lastSaved, setLastSaved]        = useState(null)
  const saveTimer                        = useRef(null)
  const { screenToFlowPosition }         = useReactFlow()

  const updateNodeData = useCallback((id, patch) => {
    setNodes(ns => ns.map(n => n.id === id ? { ...n, data: { ...n.data, ...patch } } : n))
  }, [])

  const attachUpdater = useCallback((node) => ({
    ...node, data: { ...node.data, _update: (patch) => updateNodeData(node.id, patch) },
  }), [updateNodeData])

  useEffect(() => {
    boardsApi.get(boardId).then(r => {
      setBoard(r.data)
      const s = r.data.canvas_state || {}
      setNodes((s.nodes || []).map(attachUpdater))
      setEdges(s.edges || [])
      if (s.bgConfig) setBgConfig(s.bgConfig)
    }).catch(e => console.error(e))
  }, [boardId])

  useEffect(() => {
    if (!board) return
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      setSaving(true)
      try {
        const cleanNodes = nodes.map(({ data: { _update, ...rest }, ...n }) => ({ ...n, data: rest }))
        await boardsApi.save(boardId, { nodes: cleanNodes, edges, bgConfig, viewport: { x:0, y:0, zoom:1 } })
        setLastSaved(new Date())
      } catch(e) { console.error(e) }
      finally { setSaving(false) }
    }, 1500)
  }, [nodes, edges, bgConfig, board])

  const addNode = useCallback((type, data = {}, screenPos = null) => {
    const sp = screenPos || { x: window.innerWidth / 2, y: window.innerHeight / 2 }
    const fp = screenToFlowPosition(sp)
    const id = uid()
    setNodes(ns => [...ns, {
      id, type,
      position: { x: fp.x - 110, y: fp.y - 60 },
      data: { ...data, _update: (patch) => updateNodeData(id, patch) },
    }])
  }, [screenToFlowPosition, updateNodeData])

  const handleUpload = useCallback(async (files, screenPos = null) => {
    for (const file of files) {
      try {
        const { data: m } = await mediaApi.upload(boardId, file)
        const sp = screenPos ? { x: screenPos.x + Math.random()*50-25, y: screenPos.y + Math.random()*50-25 } : null
        if      (m.file_type === 'image') addNode('imageNote', { src: mediaApi.url(m.filename), originalName: m.original_name }, sp)
        else if (m.file_type === 'video') addNode('videoNote', { src: mediaApi.url(m.filename), originalName: m.original_name }, sp)
        else                              addNode('fileNote',  { url: mediaApi.url(m.filename), originalName: m.original_name, fileType: m.file_type }, sp)
      } catch(e) { console.error(e) }
    }
  }, [boardId, addNode])

  const onDrop = useCallback((e) => {
    e.preventDefault()
    const files = Array.from(e.dataTransfer.files)
    if (files.length) handleUpload(files, { x: e.clientX, y: e.clientY })
  }, [handleUpload])

  const pattern = bgConfig?.pattern || 'dots'
  const patternColor = bgConfig?.patternColor || '#2a2720'
  const variantMap = { dots: 'dots', lines: 'lines', cross: 'cross' }

  return (
    <div className="canvas-editor">
      <Toolbar
        board={board} saving={saving} lastSaved={lastSaved} onBack={onBack}
        onAddText={()     => addNode('textNote',  { text: '' })}
        onAddGroup={()    => addNode('groupBox',  { label: 'Group', color: '#c9a96e' })}
        onUpload={(files) => handleUpload(files)}
        bgConfig={bgConfig} onBgChange={setBgConfig}
      />
      <div className="canvas-area" style={getBgStyle(bgConfig)}
        onDrop={onDrop} onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy' }}>
        <ReactFlow
          nodes={nodes} edges={edges}
          onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
          onConnect={useCallback((p) => setEdges(es => addEdge({...p, type:'smoothstep'}, es)), [])}
          nodeTypes={nodeTypes}
          fitView minZoom={0.05} maxZoom={4}
          deleteKeyCode="Delete"
          proOptions={{ hideAttribution: true }}
          style={{ background: 'transparent' }}
        >
          {pattern !== 'none' && (
            <Background variant={variantMap[pattern] || 'dots'} color={patternColor} gap={24} size={1} />
          )}
          <Controls showInteractive={false} />
          <MiniMap nodeColor={() => '#3d3930'} maskColor="rgba(14,13,11,0.75)"
            style={{ background: 'var(--surface)', border: '1px solid var(--border2)', borderRadius: 8 }} />
        </ReactFlow>
      </div>
    </div>
  )
}

export default function CanvasEditor({ boardId, onBack }) {
  return <ReactFlowProvider><CanvasInner boardId={boardId} onBack={onBack} /></ReactFlowProvider>
}