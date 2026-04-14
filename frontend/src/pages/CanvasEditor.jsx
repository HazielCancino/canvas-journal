import { useState, useEffect, useCallback, useRef } from 'react'
import {
  ReactFlow, Background, Controls, MiniMap,
  useNodesState, useEdgesState, addEdge,
  ReactFlowProvider, useReactFlow,
  useOnSelectionChange,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import { boardsApi, mediaApi } from '../api'
import { notify } from '../components/Toast'
import Toolbar          from '../components/Toolbar'
import ContextMenu      from '../components/ContextMenu'
import BoardSettings    from '../components/BoardSettings'
import SelectionBar     from '../components/SelectionBar'
import AlignmentGuides  from '../components/AlignmentGuides'
import TextNode         from '../components/nodes/TextNode'
import ImageNode        from '../components/nodes/ImageNode'
import VideoNode        from '../components/nodes/VideoNode'
import GroupBoxNode     from '../components/nodes/GroupBoxNode'
import FileNode         from '../components/nodes/FileNode'
import EmbedNode        from '../components/nodes/EmbedNode'

import { useAlignmentGuides } from '../hooks/useAlignmentGuides'
import { useHistoryStack }    from '../hooks/useHistoryStack'
import { useNodeOperations }  from '../hooks/useNodeOperations'
import { reparentNodes }      from '../groupUtils'
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
  snapToGrid:       false,
  showMinimap:      true,
  loopVideos:       false,
  autoplayVideos:   false,
  defaultNoteColor: 'Default',
  alignmentGuides:  true,
}

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
  return ns.map(({ data = {}, ...n }) => {
    const { _update, _delete, _boardSettings, _openFocusMode, _triggerRename, ...rest } = data
    return { ...n, data: rest }
  })
}

function CanvasInner({ boardId, onBack }) {
  const [board, setBoard]                  = useState(null)
  const [loading, setLoading]              = useState(true)
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

  useEffect(() => { nodesRef.current = nodes }, [nodes])
  useEffect(() => { edgesRef.current = edges }, [edges])

  const { fitView, setCenter, getNode } = useReactFlow()

  useOnSelectionChange({
    onChange: ({ nodes: sn }) => setSelectedIds(sn.map(n => n.id)),
  })

  // ── Node Data Updater ──────────────────────────────────────────────────────
  const updateNodeData = useCallback((id, patch) => {
    setNodes(ns => ns.map(n => n.id === id ? { ...n, data: { ...n.data, ...patch } } : n))
  }, [setNodes])

  const moveToTrash = useCallback((nodeList) => {
    setBoardSettings(bs => ({
      ...bs,
      trash: [...(bs.trash || []), ...cleanNodes(nodeList)]
    }))
  }, [])

  const emptyTrash = useCallback(() => {
    setBoardSettings(bs => ({ ...bs, trash: [] }))
  }, [])

  const attachUpdater = useCallback((node) => ({
    ...node,
    data: {
      ...node.data,
      _update:        (patch) => updateNodeData(node.id, patch),
      _delete:        () => {
        moveToTrash([node])
        setNodes(ns => ns.filter(n => n.id !== node.id))
      },
      _openFocusMode: () => updateNodeData(node.id, { _focusTrigger: Date.now() }),
      _triggerRename: () => updateNodeData(node.id, { _renameTrigger: Date.now() }),
    },
  }), [updateNodeData, moveToTrash, setNodes])

  // ── Custom Hooks ─────────────────────────────────────────────────────────
  const { pushHistory, initHistory, historyItems, currentIndex, jumpToHistory } = useHistoryStack({ 
    setNodes, setEdges, attachUpdater, cleanNodes 
  })

  const restoreNode = useCallback((trashedNode) => {
    const restored = attachUpdater(trashedNode)
    setBoardSettings(bs => ({ ...bs, trash: (bs.trash || []).filter(t => t.id !== trashedNode.id) }))
    setNodes(ns => {
      const next = [...ns, restored]
      pushHistory(next, edgesRef.current, `Restored node`)
      return next
    })
  }, [attachUpdater, setNodes, pushHistory])

  const {
    addNode, groupSelected, deleteSelected, duplicateSelected,
    toggleLockSelected, bringToFront
  } = useNodeOperations({
    nodes, setNodes, edgesRef, setEdges, pushHistory,
    updateNodeData, selectedIds, setSelectedIds, boardSettings,
    moveToTrash
  })

  const allLocked = selectedIds.length > 0 &&
    selectedIds.every(id => nodes.find(n => n.id === id)?.draggable === false)

  const alignEnabled = boardSettings.alignmentGuides !== false
  const { guides, onNodeDrag, clearGuides } = useAlignmentGuides(nodes, alignEnabled)

  useEffect(() => {
    setNodes(ns => ns.map(n =>
      ['videoNote', 'imageNote', 'fileNote'].includes(n.type)
        ? { ...n, data: { ...n.data, _boardSettings: boardSettings } } 
        : n
    ))
  }, [boardSettings.loopVideos, boardSettings.autoplayVideos, boardSettings.showCaptions, setNodes])

  useEffect(() => {
    if (boardSettings.resetZoom && !loading) fitView({ duration: 400 })
  }, [boardSettings.resetZoom, fitView, loading])

  // Map existing edges to updated global edgeStyle whenever it changes
  useEffect(() => {
    if (loading) return
    const targetType = boardSettings.edgeStyle || 'bezier'
    setEdges(es => {
      let changed = false
      const next = es.map(e => {
        if (e.type !== targetType) { changed = true; return { ...e, type: targetType } }
        return e
      })
      return changed ? next : es
    })
  }, [boardSettings.edgeStyle, setEdges, loading])

  // ── Initialization ───────────────────────────────────────────────────────
  useEffect(() => {
    setLoading(true)
    boardsApi.get(boardId).then(r => {
      setBoard(r.data)
      const s           = r.data.canvas_state || {}
      // We removed pathNodeUrls to prevent modifying text literal localhost urls mistakenly.
      // Image resolveUrl manages relative API mappings safely.
      const loadedNodes = (s.nodes || []).map(attachUpdater)
      const loadedEdges = s.edges || []
      
      setNodes(loadedNodes)
      setEdges(loadedEdges)
      if (s.bgConfig)      setBgConfig(s.bgConfig)
      if (s.boardSettings) setBoardSettings({ ...DEFAULT_SETTINGS, ...s.boardSettings })
      
      setTimeout(() => initHistory(loadedNodes, loadedEdges), 100)
    }).catch(err => {
      console.error(err);
      notify('Failed to load board', 'error');
      onBack();
    }).finally(() => setLoading(false))
  }, [boardId, attachUpdater, initHistory, onBack, setNodes, setEdges])

  // ── Auto-Save ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!board || loading) return
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      setSaving(true)
      try {
        await boardsApi.save(boardId, {
          nodes: cleanNodes(nodes), edges, bgConfig, boardSettings,
          viewport: { x: 0, y: 0, zoom: 1 },
        })
        setLastSaved(new Date())
      } catch(e) {
        console.error(e)
        notify('Failed to save canvas state', 'error')
      } finally {
        setSaving(false)
      }
    }, 1500)
  }, [nodes, edges, bgConfig, boardSettings, board, boardId, loading])

  useEffect(() => {
    const onKeyDown = (e) => {
      const tag = document.activeElement?.tagName?.toLowerCase()
      const ce  = document.activeElement?.contentEditable
      if (tag === 'input' || tag === 'textarea' || ce === 'true') return
      if (e.key === 'Escape') {
        setNodes(ns => ns.map(n => ({ ...n, selected: false })))
        setSelectedIds([])
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [setNodes, setSelectedIds])

  // ── Upload ───────────────────────────────────────────────────────────────
  const handleUpload = useCallback(async (files, screenPos = null) => {
    for (const file of files) {
      const sp = screenPos
        ? { x: screenPos.x + Math.random()*40-20, y: screenPos.y + Math.random()*40-20 }
        : null
      const name = file.name || ''

      const textExts = ['.txt', '.md', '.json', '.js', '.jsx', '.ts', '.tsx', '.py', '.css', '.html', '.java', '.cpp', '.sql']
      if (textExts.some(ext => name.endsWith(ext))) {
        try {
          const text = await new Promise((res, rej) => {
            const r = new FileReader(); r.onload = e => res(e.target.result); r.onerror = rej; r.readAsText(file)
          })
          
          const ext = name.split('.').pop()
          const codeLangs = ['json', 'py', 'js', 'html', 'css', 'ts', 'jsx', 'tsx', 'java', 'cpp', 'sql']
          const langMap = { py: 'python', js: 'javascript', ts: 'typescript' }
          const formattedText = codeLangs.includes(ext) 
            ? `\`\`\`${langMap[ext] || ext}\n${text}\n\`\`\`` 
            : text

          addNode('textNote', { title: name, text: formattedText }, sp, nodesRef)
          continue
        } catch(e) { console.error(e); notify(`Failed to read ${name}`, 'error') }
      }

      if (name.endsWith('.docx')) {
        try {
          const mammoth     = await import('mammoth')
          const arrayBuffer = await file.arrayBuffer()
          const result      = await mammoth.convertToMarkdown({ arrayBuffer })
          addNode('textNote', { title: name.replace(/\.docx$/, ''), text: result.value }, sp, nodesRef)
          continue
        } catch(e) { console.error('mammoth failed:', e); notify(`Failed to import ${name}`, 'error') }
      }

      try {
        const { data: m } = await mediaApi.upload(boardId, file)
        if      (m.file_type === 'image') addNode('imageNote', { src: m.url, originalName: m.original_name }, sp, nodesRef)
        else if (m.file_type === 'video') addNode('videoNote', { src: m.url, originalName: m.original_name }, sp, nodesRef)
        else                              addNode('fileNote',  { url: m.url, originalName: m.original_name, fileType: m.file_type }, sp, nodesRef)
        notify(`Uploaded ${m.original_name}`)
      } catch(e) {
        console.error(e)
        notify(`Failed to upload ${name}`, 'error')
      }
    }
  }, [boardId, addNode])

  const openCtxFileDialog = useCallback((pos) => {
    ctxPosRef.current = pos; setCtxMenu(null)
    setTimeout(() => ctxFileRef.current?.click(), 50)
  }, [])

  const onCtxFileChange = useCallback((e) => {
    const files = Array.from(e.target.files)
    if (files.length) handleUpload(files, ctxPosRef.current)
    e.target.value = ''
  }, [handleUpload])

  useEffect(() => {
    const onPaste = (e) => {
      const tag = document.activeElement?.tagName?.toLowerCase()
      if (tag === 'input' || tag === 'textarea') return
      const text = e.clipboardData?.getData('text')?.trim()
      if (text && isUrl(text)) { e.preventDefault(); addNode('embedNote', { url: text }, null, nodesRef); return }
      const items = Array.from(e.clipboardData?.items || [])
      const imgItem = items.find(i => i.type.startsWith('image/'))
      if (imgItem) { e.preventDefault(); const f = imgItem.getAsFile(); if (f) handleUpload([f]) }
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [addNode, handleUpload])

  const onDrop = useCallback((e) => {
    e.preventDefault()
    const files = Array.from(e.dataTransfer.files)
    if (files.length) handleUpload(files, { x: e.clientX, y: e.clientY })
  }, [handleUpload])

  // ── Interactions ─────────────────────────────────────────────────────────

  const dragHistoryTimer = useRef(null)

  const onNodeDragStart = useCallback(() => {
    // Cancel any pending history push from a prior drag
    clearTimeout(dragHistoryTimer.current)
  }, [])

  const onNodeDragStop = useCallback((_, draggedNode) => {
    clearGuides()
    setNodes(ns => {
      const next = reparentNodes(draggedNode, ns)
      // Debounce history push: only commit after 300ms idle
      clearTimeout(dragHistoryTimer.current)
      dragHistoryTimer.current = setTimeout(() => {
        pushHistory(next, edgesRef.current, `Moved node`)
      }, 300)
      return next
    })
  }, [pushHistory, clearGuides, setNodes])

  const focusNode = useCallback((id) => {
    const n = getNode(id)
    if (!n) return
    setCenter(
      n.position.x + (n.measured?.width  || 240) / 2,
      n.position.y + (n.measured?.height || 180) / 2,
      { zoom: 0.9, duration: 500 }
    )
  }, [getNode, setCenter])

  const deselectAll = useCallback(() => {
    setNodes(ns => ns.map(n => ({ ...n, selected: false })))
    setSelectedIds([])
  }, [setNodes, setSelectedIds])

  const onConnect = useCallback((p) => {
    setEdges(es => {
      const type = boardSettings.edgeStyle || 'bezier'
      const next = addEdge({ ...p, type }, es)
      pushHistory(nodesRef.current, next, `Connected nodes`)
      return next
    })
  }, [pushHistory, setEdges, boardSettings.edgeStyle])

  const onPaneContextMenu = useCallback((e) => {
    e.preventDefault()
    setCtxMenu({ x: e.clientX, y: e.clientY })
  }, [])

  if (loading) {
    return (
      <div className="canvas-editor-loading">
        <div className="spinner"></div>
        <p>Loading Workspace...</p>
      </div>
    )
  }

  const pattern      = bgConfig?.pattern || 'dots'
  const patternColor = bgConfig?.patternColor || '#2a2720'
  const variantMap   = { dots: 'dots', lines: 'lines', cross: 'cross' }

  // Re-enable GroupBox rendering
  const visibleNodes = nodes;

  return (
    <div className="canvas-editor" onPointerDown={() => setCtxMenu(null)}>
      <Toolbar
        board={board} boardId={boardId}
        saving={saving} lastSaved={lastSaved} onBack={onBack}
        onAddText={()     => addNode('textNote',  { text: '' }, null, nodesRef)}
        onAddGroup={()    => addNode('groupBox',  { label: 'Group', color: '#c9a96e' }, null, nodesRef)}
        onUpload={(files) => handleUpload(files)}
        bgConfig={bgConfig} onBgChange={setBgConfig}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      <div
        className="canvas-area"
        style={{ ...getBgStyle(bgConfig), fontFamily: boardSettings.fontFamily || "'DM Sans', sans-serif" }}
        onDrop={onDrop}
        onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy' }}
      >
        <ReactFlow
          nodes={visibleNodes} edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeDragStart={onNodeDragStart}
          onNodeDrag={onNodeDrag}
          onNodeDragStop={onNodeDragStop}
          onNodeClick={(e, node) => bringToFront(node)}
          nodeTypes={nodeTypes}
          onPaneContextMenu={onPaneContextMenu}
          onPaneClick={() => setCtxMenu(null)}
          fitView minZoom={0.05} maxZoom={4}
          deleteKeyCode="Delete"
          multiSelectionKeyCode="Shift"
          selectionOnDrag
          proOptions={{ hideAttribution: true }}
          snapToGrid={boardSettings.snapToGrid}
          snapGrid={[16, 16]}
          style={{ background: 'transparent' }}
          elevateNodesOnSelect={false}
        >
          {pattern !== 'none' && (
            <Background variant={variantMap[pattern] || 'dots'} color={patternColor} gap={24} size={1} />
          )}
          <Controls showInteractive={false} />
          {boardSettings.showMinimap !== false && (
            <MiniMap nodeColor={() => '#3d3930'} maskColor="rgba(14,13,11,0.75)"
              style={{ background: 'var(--surface)', border: '1px solid var(--border2)', borderRadius: 8 }} />
          )}
          <AlignmentGuides guides={guides} />
        </ReactFlow>

        <SelectionBar
          count={selectedIds.length}
          allLocked={allLocked}
          onGroup={groupSelected}
          onDelete={deleteSelected}
          onDuplicate={() => duplicateSelected(nodesRef)}
          onLock={() => toggleLockSelected(allLocked)}
          onDeselect={deselectAll}
        />

        {ctxMenu && (
          <ContextMenu
            x={ctxMenu.x} y={ctxMenu.y}
            onClose={() => setCtxMenu(null)}
            onAddText={()     => addNode('textNote',  { text: '' },                         { x: ctxMenu.x, y: ctxMenu.y }, nodesRef)}
            onAddGroup={()    => addNode('groupBox',  { label: 'Group', color: '#c9a96e' }, { x: ctxMenu.x, y: ctxMenu.y }, nodesRef)}
            onAddMedia={()    => openCtxFileDialog({ x: ctxMenu.x, y: ctxMenu.y })}
            onAddEmbed={(url) => addNode('embedNote', { url },                               { x: ctxMenu.x, y: ctxMenu.y }, nodesRef)}
          />
        )}

        <input ref={ctxFileRef} type="file" multiple
          accept="image/*,video/*,.gif,.pdf,.txt,.md,.docx"
          style={{ display: 'none' }} onChange={onCtxFileChange} />
      </div>

      <BoardSettings
        boardId={boardId}
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={boardSettings}
        onSettingsChange={setBoardSettings}
        nodes={nodes}
        onFocusNode={focusNode}
        bgConfig={bgConfig}
        onBgChange={setBgConfig}
        onRestoreNode={restoreNode}
        onEmptyTrash={emptyTrash}
        historyItems={historyItems}
        currentIndex={currentIndex}
        jumpToHistory={jumpToHistory}
      />
    </div>
  )
}

export default function CanvasEditor({ boardId, onBack }) {
  return <ReactFlowProvider><CanvasInner boardId={boardId} onBack={onBack} /></ReactFlowProvider>
}