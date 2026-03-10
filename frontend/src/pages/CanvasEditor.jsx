import { useState, useEffect, useCallback, useRef } from 'react'
import {
  ReactFlow, Background, Controls, MiniMap,
  useNodesState, useEdgesState, addEdge,
  ReactFlowProvider, useReactFlow,
  useOnSelectionChange,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import { boardsApi, mediaApi } from '../api'
import Toolbar       from '../components/Toolbar'
import ContextMenu   from '../components/ContextMenu'
import BoardSettings from '../components/BoardSettings'
import SelectionBar  from '../components/SelectionBar'
import TextNode      from '../components/nodes/TextNode'
import ImageNode     from '../components/nodes/ImageNode'
import VideoNode     from '../components/nodes/VideoNode'
import GroupBoxNode  from '../components/nodes/GroupBoxNode'
import FileNode      from '../components/nodes/FileNode'
import EmbedNode     from '../components/nodes/EmbedNode'
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

function cleanNodes(ns) {
  return ns.map(({ data: { _update, _delete, _boardSettings, ...rest }, ...n }) => ({ ...n, data: rest }))
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
  const nodesRef   = useRef([])
  const edgesRef   = useRef([])

  // Undo history
  const historyRef = useRef([])
  const historyIdx = useRef(-1)
  const isUndoing  = useRef(false)

  useEffect(() => { nodesRef.current = nodes }, [nodes])
  useEffect(() => { edgesRef.current = edges }, [edges])

  const { screenToFlowPosition, fitView, setCenter, getNode } = useReactFlow()

  // Track selection
  useOnSelectionChange({
    onChange: ({ nodes: sn }) => setSelectedIds(sn.map(n => n.id)),
  })

  const allLocked = selectedIds.length > 0 &&
    selectedIds.every(id => nodes.find(n => n.id === id)?.draggable === false)

  // Helpers
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

  const pushHistory = useCallback((snapNs, snapEs) => {
    if (isUndoing.current) return
    historyRef.current.length = historyIdx.current + 1
    historyRef.current.push({
      nodes: JSON.parse(JSON.stringify(cleanNodes(snapNs))),
      edges: JSON.parse(JSON.stringify(snapEs)),
    })
    if (historyRef.current.length > 60) historyRef.current.shift()
    historyIdx.current = historyRef.current.length - 1
  }, [])

  // Video settings injection
  useEffect(() => {
    setNodes(ns => ns.map(n =>
      n.type === 'videoNote' ? { ...n, data: { ...n.data, _boardSettings: boardSettings } } : n
    ))
  }, [boardSettings.loopVideos, boardSettings.autoplayVideos])

  useEffect(() => {
    if (boardSettings.resetZoom) fitView({ duration: 400 })
  }, [boardSettings.resetZoom])

  // Load
  useEffect(() => {
    boardsApi.get(boardId).then(r => {
      setBoard(r.data)
      const s = r.data.canvas_state || {}
      const loadedNodes = (s.nodes || []).map(attachUpdater)
      const loadedEdges = s.edges || []
      setNodes(loadedNodes)
      setEdges(loadedEdges)
      if (s.bgConfig)      setBgConfig(s.bgConfig)
      if (s.boardSettings) setBoardSettings({ ...DEFAULT_SETTINGS, ...s.boardSettings })
      setTimeout(() => {
        historyRef.current = [{ nodes: JSON.parse(JSON.stringify(s.nodes||[])), edges: JSON.parse(JSON.stringify(loadedEdges)) }]
        historyIdx.current = 0
      }, 100)
    }).catch(console.error)
  }, [boardId])

  // Save
  useEffect(() => {
    if (!board) return
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      setSaving(true)
      try {
        await boardsApi.save(boardId, {
          nodes: cleanNodes(nodes), edges, bgConfig, boardSettings,
          viewport: { x: 0, y: 0, zoom: 1 },
        })
        setLastSaved(new Date())
      } catch(e) { console.error(e) }
      finally { setSaving(false) }
    }, 1500)
  }, [nodes, edges, bgConfig, boardSettings, board])

  // Ctrl+Z undo
  useEffect(() => {
    const onKeyDown = (e) => {
      const tag = document.activeElement?.tagName?.toLowerCase()
      const ce  = document.activeElement?.contentEditable
      if (tag === 'input' || tag === 'textarea' || ce === 'true') return
      // Esc deselects
      if (e.key === 'Escape') {
        setNodes(ns => ns.map(n => ({ ...n, selected: false })))
        setSelectedIds([])
        return
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        if (historyIdx.current <= 0) return
        historyIdx.current -= 1
        const snap = historyRef.current[historyIdx.current]
        if (!snap) return
        isUndoing.current = true
        setNodes(snap.nodes.map(attachUpdater))
        setEdges(snap.edges)
        setTimeout(() => { isUndoing.current = false }, 50)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [attachUpdater])

  // Add node
  const addNode = useCallback((type, data = {}, screenPos = null) => {
    const sp = screenPos || { x: window.innerWidth / 2, y: window.innerHeight / 2 }
    const fp = screenToFlowPosition(sp)
    const id = uid()
    const extraData = {}
    if (type === 'videoNote') extraData._boardSettings = boardSettings
    if (type === 'textNote' && boardSettings.defaultNoteColor !== 'Default')
      extraData.colorLabel = boardSettings.defaultNoteColor

    const newNode = {
      id, type,
      position: { x: fp.x - 110, y: fp.y - 60 },
      ...(type === 'groupBox' ? { style: { zIndex: -1 } } : {}),
      data: {
        ...data, ...extraData,
        _update: (patch) => updateNodeData(id, patch),
        _delete: () => setNodes(prev => prev.filter(n => n.id !== id)),
      },
    }
    setNodes(ns => {
      const next = [...ns, newNode]
      pushHistory(next, edgesRef.current)
      return next
    })
    setCtxMenu(null)
  }, [screenToFlowPosition, updateNodeData, boardSettings, pushHistory])

  // Upload (with text/docx interception)
  const handleUpload = useCallback(async (files, screenPos = null) => {
    for (const file of files) {
      const sp = screenPos
        ? { x: screenPos.x + Math.random()*40-20, y: screenPos.y + Math.random()*40-20 }
        : null
      const name = file.name || ''

      if (name.endsWith('.txt') || name.endsWith('.md')) {
        try {
          const text = await new Promise((res, rej) => {
            const r = new FileReader(); r.onload = e => res(e.target.result); r.onerror = rej; r.readAsText(file)
          })
          addNode('textNote', { title: name.replace(/\.(txt|md)$/, ''), text }, sp)
          continue
        } catch(e) { console.error(e) }
      }

      if (name.endsWith('.docx')) {
        try {
          const mammoth     = await import('mammoth')
          const arrayBuffer = await file.arrayBuffer()
          const result      = await mammoth.convertToMarkdown({ arrayBuffer })
          addNode('textNote', { title: name.replace(/\.docx$/, ''), text: result.value }, sp)
          continue
        } catch(e) { console.error('mammoth failed:', e) }
      }

      try {
        const { data: m } = await mediaApi.upload(boardId, file)
        if      (m.file_type === 'image') addNode('imageNote', { src: mediaApi.url(m.filename), originalName: m.original_name }, sp)
        else if (m.file_type === 'video') addNode('videoNote', { src: mediaApi.url(m.filename), originalName: m.original_name }, sp)
        else                              addNode('fileNote',  { url: mediaApi.url(m.filename), originalName: m.original_name, fileType: m.file_type }, sp)
      } catch(e) { console.error(e) }
    }
  }, [boardId, addNode])

  // Context menu upload
  const openCtxFileDialog = useCallback((pos) => {
    ctxPosRef.current = pos; setCtxMenu(null)
    setTimeout(() => ctxFileRef.current?.click(), 50)
  }, [])
  const onCtxFileChange = useCallback((e) => {
    const files = Array.from(e.target.files)
    if (files.length) handleUpload(files, ctxPosRef.current)
    e.target.value = ''
  }, [handleUpload])

  // Paste
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

  // Drag & drop
  const onDrop = useCallback((e) => {
    e.preventDefault()
    const files = Array.from(e.dataTransfer.files)
    if (files.length) handleUpload(files, { x: e.clientX, y: e.clientY })
  }, [handleUpload])

  // Group parenting
  const onNodeDragStop = useCallback((_, draggedNode) => {
    setNodes(ns => {
      const next = reparentNodes(draggedNode, ns)
      pushHistory(next, edgesRef.current)
      return next
    })
  }, [pushHistory])

  // Focus node from settings
  const focusNode = useCallback((id) => {
    const n = getNode(id)
    if (!n) return
    setCenter(
      n.position.x + (n.measured?.width  || 240) / 2,
      n.position.y + (n.measured?.height || 180) / 2,
      { zoom: 0.9, duration: 500 }
    )
  }, [getNode, setCenter])

  // Selection: group
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
    setNodes(ns => {
      const next = [
        {
          id, type: 'groupBox',
          position: { x: x1, y: y1 },
          style: { zIndex: -1 },
          width: x2-x1, height: y2-y1,
          data: {
            label: 'Group', color: '#c9a96e',
            _update: (patch) => updateNodeData(id, patch),
            _delete: () => setNodes(prev => prev.filter(n => n.id !== id)),
          },
        },
        ...ns,
      ]
      pushHistory(next, edgesRef.current)
      return next
    })
  }, [selectedIds, nodes, updateNodeData, pushHistory])

  // Selection: delete
  const deleteSelected = useCallback(() => {
    const newEdges = edgesRef.current.filter(e =>
      !selectedIds.includes(e.source) && !selectedIds.includes(e.target)
    )
    setNodes(ns => {
      const next = ns.filter(n => !selectedIds.includes(n.id))
      pushHistory(next, newEdges)
      return next
    })
    setEdges(newEdges)
    setSelectedIds([])
  }, [selectedIds, pushHistory])

  // Selection: duplicate
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
    setNodes(ns => {
      const next = [...ns, ...newNodes]
      pushHistory(next, edgesRef.current)
      return next
    })
  }, [selectedIds, nodes, updateNodeData, pushHistory])

  // Selection: lock / unlock
  const toggleLockSelected = useCallback(() => {
    setNodes(ns => ns.map(n =>
      selectedIds.includes(n.id)
        ? { ...n, draggable: allLocked, connectable: allLocked, selectable: true }
        : n
    ))
  }, [selectedIds, allLocked])

  // Selection: deselect
  const deselectAll = useCallback(() => {
    setNodes(ns => ns.map(n => ({ ...n, selected: false })))
    setSelectedIds([])
  }, [])

  // Edge connect
  const onConnect = useCallback((p) => {
    setEdges(es => {
      const next = addEdge({ ...p, type: 'smoothstep' }, es)
      pushHistory(nodesRef.current, next)
      return next
    })
  }, [pushHistory])

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
          onConnect={onConnect}
          onNodeDragStop={onNodeDragStop}
          nodeTypes={nodeTypes}
          onPaneContextMenu={onPaneContextMenu}
          onPaneClick={() => setCtxMenu(null)}
          fitView minZoom={0.05} maxZoom={4}
          deleteKeyCode="Delete"
          multiSelectionKeyCode="Shift"   /* Shift+click to multi-select (Alt conflicts with Windows menu bar) */
          selectionOnDrag                 /* drag on empty canvas to rubber-band select */
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

        <input ref={ctxFileRef} type="file" multiple
          accept="image/*,video/*,.gif,.pdf,.txt,.md,.docx"
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