import { useState, useEffect, useCallback, useRef } from 'react'
import {
  ReactFlow, Background, Controls, MiniMap,
  useNodesState, useEdgesState, addEdge,
  ReactFlowProvider, useReactFlow,
  useOnSelectionChange,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import { boardsApi, mediaApi } from '../api'
import Toolbar        from '../components/Toolbar'
import ContextMenu    from '../components/ContextMenu'
import BoardSettings  from '../components/BoardSettings'
import SelectionBar   from '../components/SelectionBar'
import TextNode       from '../components/nodes/TextNode'
import ImageNode      from '../components/nodes/ImageNode'
import VideoNode      from '../components/nodes/VideoNode'
import GroupBoxNode   from '../components/nodes/GroupBoxNode'
import FileNode       from '../components/nodes/FileNode'
import EmbedNode      from '../components/nodes/EmbedNode'
import { reparentNodes } from '../groupUtils'
import './CanvasEditor.css'

const nodeTypes = {
  textNote:  TextNode,
  imageNote: ImageNode,
  videoNote: VideoNode,
  groupBox:  GroupBoxNode,
  fileNote:  FileNode,
  embedNote: EmbedNode,
}

const DEFAULT_BG       = { type: 'color', color: '#0e0d0b', pattern: 'dots', patternColor: '#2a2720' }
const DEFAULT_SETTINGS = {
  snapToGrid: false, showMinimap: true,
  loopVideos: false, autoplayVideos: false,
  defaultNoteColor: 'Default',
}

let _counter = Date.now()
const uid = () => `n_${_counter++}`

function getBgStyle(bg) {
  if (!bg) return { background: DEFAULT_BG.color }
  if (bg.type === 'image' && bg.imageUrl)
    return { backgroundImage: `url(${bg.imageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }
  return { background: bg.color || DEFAULT_BG.color }
}

function isUrl(str) {
  try { new URL(str.startsWith('http') ? str : `https://${str}`); return str.includes('.') } catch { return false }
}

function CanvasInner({ boardId, onBack }) {
  const [board, setBoard]                  = useState(null)
  const [nodes, setNodes, onNodesChange]   = useNodesState([])
  const [edges, setEdges, onEdgesChange]   = useEdgesState([])
  const [bgConfig, setBgConfig]            = useState(DEFAULT_BG)
  const [boardSettings, setBoardSettings]  = useState(DEFAULT_SETTINGS)
  const [saving, setSaving]                = useState(false)
  const [lastSaved, setLastSaved]          = useState(null)
  const [ctxMenu, setCtxMenu]              = useState(null)
  const [settingsOpen, setSettingsOpen]    = useState(false)
  const [selectedIds, setSelectedIds]      = useState([])

  const saveTimer  = useRef(null)
  const ctxFileRef = useRef()
  const ctxPosRef  = useRef(null)

  const { screenToFlowPosition, fitView, setCenter, getNode } = useReactFlow()

  /* ── track selection ── */
  useOnSelectionChange({
    onChange: ({ nodes: sn }) => setSelectedIds(sn.map(n => n.id)),
  })

  const allLocked = selectedIds.length > 0 &&
    selectedIds.every(id => nodes.find(n => n.id === id)?.draggable === false)

  /* ── helpers ── */
  const updateNodeData = useCallback((id, patch) => {
    setNodes(ns => ns.map(n => n.id === id ? { ...n, data: { ...n.data, ...patch } } : n))
  }, [])

  const attachUpdater = useCallback((node) => ({
    ...node,
    data: {
      ...node.data,
      _update: (patch) => updateNodeData(node.id, patch),
      _delete: () => setNodes(ns => ns.filter(n => n.id !== node.id)),
    },
  }), [updateNodeData])

  /* ── inject board settings into video nodes ── */
  useEffect(() => {
    setNodes(ns => ns.map(n =>
      n.type === 'videoNote'
        ? { ...n, data: { ...n.data, _boardSettings: boardSettings } }
        : n
    ))
  }, [boardSettings.loopVideos, boardSettings.autoplayVideos])

  /* ── reset zoom trigger ── */
  useEffect(() => {
    if (boardSettings.resetZoom) fitView({ duration: 400 })
  }, [boardSettings.resetZoom])

  /* ── load ── */
  useEffect(() => {
    boardsApi.get(boardId).then(r => {
      setBoard(r.data)
      const s = r.data.canvas_state || {}
      setNodes((s.nodes || []).map(attachUpdater))
      setEdges(s.edges || [])
      if (s.bgConfig)       setBgConfig(s.bgConfig)
      if (s.boardSettings)  setBoardSettings({ ...DEFAULT_SETTINGS, ...s.boardSettings })
    }).catch(console.error)
  }, [boardId])

  /* ── save ── */
  useEffect(() => {
    if (!board) return
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      setSaving(true)
      try {
        const clean = nodes.map(({ data: { _update, _delete, _boardSettings, ...rest }, ...n }) => ({ ...n, data: rest }))
        await boardsApi.save(boardId, { nodes: clean, edges, bgConfig, boardSettings, viewport: { x: 0, y: 0, zoom: 1 } })
        setLastSaved(new Date())
      } catch(e) { console.error(e) }
      finally { setSaving(false) }
    }, 1500)
  }, [nodes, edges, bgConfig, boardSettings, board])

  /* ── add node ── */
  const addNode = useCallback((type, data = {}, screenPos = null) => {
    const sp = screenPos || { x: window.innerWidth / 2, y: window.innerHeight / 2 }
    const fp = screenToFlowPosition(sp)
    const id = uid()
    // Apply default note color when adding a text note
    const extraData = {}
    if (type === 'videoNote') extraData._boardSettings = boardSettings
    if (type === 'textNote' && boardSettings.defaultNoteColor && boardSettings.defaultNoteColor !== 'Default') {
      extraData.colorLabel = boardSettings.defaultNoteColor
    }
    setNodes(ns => [...ns, {
      id, type,
      position: { x: fp.x - 110, y: fp.y - 60 },
      ...(type === 'groupBox' ? { style: { zIndex: -1 } } : {}),
      data: {
        ...data,
        ...extraData,
        _update: (patch) => updateNodeData(id, patch),
        _delete: () => setNodes(prev => prev.filter(n => n.id !== id)),
      },
    }])
    setCtxMenu(null)
  }, [screenToFlowPosition, updateNodeData, boardSettings])

  /* ── upload ── */
  const handleUpload = useCallback(async (files, screenPos = null) => {
    for (const file of files) {
      try {
        const { data: m } = await mediaApi.upload(boardId, file)
        const sp = screenPos
          ? { x: screenPos.x + Math.random()*40-20, y: screenPos.y + Math.random()*40-20 }
          : null
        if      (m.file_type === 'image') addNode('imageNote', { src: mediaApi.url(m.filename), originalName: m.original_name }, sp)
        else if (m.file_type === 'video') addNode('videoNote', { src: mediaApi.url(m.filename), originalName: m.original_name }, sp)
        else                              addNode('fileNote',  { url: mediaApi.url(m.filename), originalName: m.original_name, fileType: m.file_type }, sp)
      } catch(e) { console.error(e) }
    }
  }, [boardId, addNode])

  /* ── context menu upload ── */
  const openCtxFileDialog = useCallback((pos) => {
    ctxPosRef.current = pos; setCtxMenu(null)
    setTimeout(() => ctxFileRef.current?.click(), 50)
  }, [])

  const onCtxFileChange = useCallback((e) => {
    const files = Array.from(e.target.files)
    if (files.length) handleUpload(files, ctxPosRef.current)
    e.target.value = ''
  }, [handleUpload])

  /* ── paste ── */
  useEffect(() => {
    const onPaste = (e) => {
      const tag = document.activeElement?.tagName?.toLowerCase()
      if (tag === 'input' || tag === 'textarea') return
      const text = e.clipboardData?.getData('text')?.trim()
      if (text && isUrl(text)) { e.preventDefault(); addNode('embedNote', { url: text }); return }
      const items = Array.from(e.clipboardData?.items || [])
      const imgItem = items.find(i => i.type.startsWith('image/'))
      if (imgItem) { e.preventDefault(); const f = imgItem.getAsFile(); if (f) handleUpload([f]) }
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [addNode, handleUpload])

  /* ── drag & drop ── */
  const onDrop = useCallback((e) => {
    e.preventDefault()
    const files = Array.from(e.dataTransfer.files)
    if (files.length) handleUpload(files, { x: e.clientX, y: e.clientY })
  }, [handleUpload])

  /* ── group parenting ── */
  const onNodeDragStop = useCallback((_, draggedNode) => {
    setNodes(ns => reparentNodes(draggedNode, ns))
  }, [])

  /* ── focus a node ── */
  const focusNode = useCallback((id) => {
    const n = getNode(id)
    if (!n) return
    const cx = n.position.x + (n.measured?.width  || 240) / 2
    const cy = n.position.y + (n.measured?.height || 180) / 2
    setCenter(cx, cy, { zoom: 0.9, duration: 500 })
  }, [getNode, setCenter])

  /* ── selection: group ── */
  const groupSelected = useCallback(() => {
    if (selectedIds.length < 2) return
    const sel = nodes.filter(n => selectedIds.includes(n.id))
    const xs  = sel.map(n => n.position.x)
    const ys  = sel.map(n => n.position.y)
    const x1  = Math.min(...xs) - 20
    const y1  = Math.min(...ys) - 40
    const x2  = Math.max(...xs.map((x, i) => x + (sel[i].measured?.width  || 200))) + 20
    const y2  = Math.max(...ys.map((y, i) => y + (sel[i].measured?.height || 100))) + 20
    const id  = uid()
    setNodes(ns => [
      {
        id, type: 'groupBox',
        position: { x: x1, y: y1 },
        style: { zIndex: -1 },
        width: x2 - x1, height: y2 - y1,
        data: {
          label: 'Group', color: '#c9a96e',
          _update: (patch) => updateNodeData(id, patch),
          _delete: () => setNodes(prev => prev.filter(n => n.id !== id)),
        },
      },
      ...ns,
    ])
  }, [selectedIds, nodes, updateNodeData])

  /* ── selection: delete ── */
  const deleteSelected = useCallback(() => {
    setNodes(ns => ns.filter(n => !selectedIds.includes(n.id)))
    setEdges(es => es.filter(e => !selectedIds.includes(e.source) && !selectedIds.includes(e.target)))
    setSelectedIds([])
  }, [selectedIds])

  /* ── selection: duplicate ── */
  const duplicateSelected = useCallback(() => {
    const sel = nodes.filter(n => selectedIds.includes(n.id))
    const newNodes = sel.map(n => {
      const id = uid()
      return {
        ...n, id, selected: false,
        position: { x: n.position.x + 30, y: n.position.y + 30 },
        data: {
          ...n.data,
          _update: (patch) => updateNodeData(id, patch),
          _delete: () => setNodes(prev => prev.filter(x => x.id !== id)),
        },
      }
    })
    setNodes(ns => [...ns, ...newNodes])
  }, [selectedIds, nodes, updateNodeData])

  /* ── selection: lock / unlock ── */
  const toggleLockSelected = useCallback(() => {
    const newDraggable = allLocked  // if all locked, unlock; else lock
    setNodes(ns => ns.map(n =>
      selectedIds.includes(n.id)
        ? { ...n, draggable: newDraggable, connectable: newDraggable, selectable: true }
        : n
    ))
  }, [selectedIds, allLocked])

  /* ── deselect ── */
  const deselectAll = useCallback(() => {
    setNodes(ns => ns.map(n => ({ ...n, selected: false })))
    setSelectedIds([])
  }, [])

  /* ── right click ── */
  const onPaneContextMenu = useCallback((e) => {
    e.preventDefault()
    setCtxMenu({ x: e.clientX, y: e.clientY })
  }, [])

  const pattern      = bgConfig?.pattern || 'dots'
  const patternColor = bgConfig?.patternColor || '#2a2720'
  const variantMap   = { dots: 'dots', lines: 'lines', cross: 'cross' }

  return (
    <div className="canvas-editor" onPointerDown={() => setCtxMenu(null)}>
      <Toolbar
        board={board} boardId={boardId}
        saving={saving} lastSaved={lastSaved} onBack={onBack}
        onAddText={()     => addNode('textNote',  { text: '' })}
        onAddGroup={()    => addNode('groupBox',  { label: 'Group', color: '#c9a96e' })}
        onUpload={(files) => handleUpload(files)}
        bgConfig={bgConfig} onBgChange={setBgConfig}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      <div
        className="canvas-area"
        style={getBgStyle(bgConfig)}
        onDrop={onDrop}
        onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy' }}
      >
        <ReactFlow
          nodes={nodes} edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={useCallback((p) => setEdges(es => addEdge({ ...p, type: 'smoothstep' }, es)), [])}
          onNodeDragStop={onNodeDragStop}
          nodeTypes={nodeTypes}
          onPaneContextMenu={onPaneContextMenu}
          onPaneClick={() => setCtxMenu(null)}
          fitView minZoom={0.05} maxZoom={4}
          deleteKeyCode="Delete"
          multiSelectionKeyCode="Alt"
          selectionOnDrag
          proOptions={{ hideAttribution: true }}
          snapToGrid={boardSettings.snapToGrid}
          snapGrid={[16, 16]}
          style={{ background: 'transparent' }}
        >
          {pattern !== 'none' && (
            <Background variant={variantMap[pattern] || 'dots'} color={patternColor} gap={24} size={1} />
          )}
          <Controls showInteractive={false} />
          {boardSettings.showMinimap !== false && (
            <MiniMap nodeColor={() => '#3d3930'} maskColor="rgba(14,13,11,0.75)"
              style={{ background: 'var(--surface)', border: '1px solid var(--border2)', borderRadius: 8 }} />
          )}
        </ReactFlow>

        <SelectionBar
          count={selectedIds.length}
          allLocked={allLocked}
          onGroup={groupSelected}
          onDelete={deleteSelected}
          onDuplicate={duplicateSelected}
          onLock={toggleLockSelected}
          onDeselect={deselectAll}
        />

        {ctxMenu && (
          <ContextMenu
            x={ctxMenu.x} y={ctxMenu.y}
            onClose={() => setCtxMenu(null)}
            onAddText={()     => addNode('textNote',  { text: '' },                         { x: ctxMenu.x, y: ctxMenu.y })}
            onAddGroup={()    => addNode('groupBox',  { label: 'Group', color: '#c9a96e' }, { x: ctxMenu.x, y: ctxMenu.y })}
            onAddMedia={()    => openCtxFileDialog({ x: ctxMenu.x, y: ctxMenu.y })}
            onAddEmbed={(url) => addNode('embedNote', { url },                               { x: ctxMenu.x, y: ctxMenu.y })}
          />
        )}

        <input ref={ctxFileRef} type="file" multiple accept="image/*,video/*,.gif,.pdf,.txt,.md"
          style={{ display: 'none' }} onChange={onCtxFileChange} />
      </div>

      <BoardSettings
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={boardSettings}
        onSettingsChange={setBoardSettings}
        nodes={nodes}
        onFocusNode={focusNode}
        bgConfig={bgConfig}
        onBgChange={setBgConfig}
      />
    </div>
  )
}

export default function CanvasEditor({ boardId, onBack }) {
  return <ReactFlowProvider><CanvasInner boardId={boardId} onBack={onBack} /></ReactFlowProvider>
}