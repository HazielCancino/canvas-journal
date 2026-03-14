import { useCallback } from 'react';
import { useReactFlow } from '@xyflow/react';

let _counter = Date.now();
const uid = () => `n_${_counter++}`;

function nextZIndex(nodes) {
  const max = nodes.reduce((m, n) => Math.max(m, typeof n.zIndex === 'number' ? n.zIndex : 0), 0);
  return max + 1;
}

export function useNodeOperations({
  nodes, 
  setNodes,
  edgesRef, 
  setEdges,
  pushHistory,
  updateNodeData,
  selectedIds,
  setSelectedIds,
  boardSettings
}) {
  const { screenToFlowPosition } = useReactFlow();

  const addNode = useCallback((type, data = {}, screenPos = null, nodesRef) => {
    const sp = screenPos || { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const fp = screenToFlowPosition(sp);
    const id = uid();
    const extraData = {};
    if (type === 'videoNote') extraData._boardSettings = boardSettings;
    if (type === 'textNote' && boardSettings.defaultNoteColor !== 'Default') {
      extraData.colorLabel = boardSettings.defaultNoteColor;
    }

    const newNode = {
      id, type,
      position: { x: fp.x - 110, y: fp.y - 60 },
      zIndex: type === 'groupBox' ? -1 : nextZIndex(nodesRef.current),
      ...(type === 'groupBox' ? { style: { zIndex: -1 } } : {}),
      data: {
        ...data, ...extraData,
        _update: (patch) => updateNodeData(id, patch),
        _delete: () => setNodes(prev => prev.filter(n => n.id !== id)),
        _openFocusMode: () => updateNodeData(id, { _focusTrigger: Date.now() }),
        _triggerRename: () => updateNodeData(id, { _renameTrigger: Date.now() }),
      },
    };

    setNodes(ns => {
      const next = [...ns, newNode];
      pushHistory(next, edgesRef.current);
      return next;
    });

    return newNode;
  }, [screenToFlowPosition, updateNodeData, boardSettings, pushHistory, setNodes, edgesRef]);

  const groupSelected = useCallback(() => {
    if (selectedIds.length < 2) return;
    const sel = nodes.filter(n => selectedIds.includes(n.id));
    
    // Safety check with fallbacks if measurements aren't there yet
    const xs = sel.map(n => n.position.x);
    const ys = sel.map(n => n.position.y);
    const x1 = Math.min(...xs) - 20;
    const y1 = Math.min(...ys) - 40;
    const x2 = Math.max(...xs.map((x, i) => x + (sel[i].measured?.width || 200))) + 20;
    const y2 = Math.max(...ys.map((y, i) => y + (sel[i].measured?.height || 100))) + 20;
    
    const id = uid();
    setNodes(ns => {
      const next = [
        {
          id, type: 'groupBox',
          position: { x: x1, y: y1 },
          style: { zIndex: -1 },
          zIndex: -1,
          width: x2 - x1, height: y2 - y1,
          data: {
            label: 'Group', color: '#c9a96e',
            _update: (patch) => updateNodeData(id, patch),
            _delete: () => setNodes(prev => prev.filter(n => n.id !== id)),
            _openFocusMode: () => {},
            _triggerRename: () => updateNodeData(id, { _renameTrigger: Date.now() }),
          },
        },
        ...ns,
      ];
      pushHistory(next, edgesRef.current);
      return next;
    });
  }, [selectedIds, nodes, updateNodeData, pushHistory, setNodes, edgesRef]);

  const deleteSelected = useCallback(() => {
    const newEdges = edgesRef.current.filter(e =>
      !selectedIds.includes(e.source) && !selectedIds.includes(e.target)
    );
    setNodes(ns => {
      const next = ns.filter(n => !selectedIds.includes(n.id));
      pushHistory(next, newEdges);
      return next;
    });
    setEdges(newEdges);
    setSelectedIds([]);
  }, [selectedIds, pushHistory, setNodes, setEdges, edgesRef, setSelectedIds]);

  const duplicateSelected = useCallback((nodesRef) => {
    const sel = nodes.filter(n => selectedIds.includes(n.id));
    const newNodes = sel.map(n => {
      const id = uid();
      return {
        ...n, id, selected: false,
        position: { x: n.position.x + 30, y: n.position.y + 30 },
        zIndex: nextZIndex(nodesRef.current),
        data: {
          ...n.data,
          _update: (patch) => updateNodeData(id, patch),
          _delete: () => setNodes(prev => prev.filter(x => x.id !== id)),
          _openFocusMode: () => updateNodeData(id, { _focusTrigger: Date.now() }),
          _triggerRename: () => updateNodeData(id, { _renameTrigger: Date.now() }),
        },
      };
    });
    setNodes(ns => {
      const next = [...ns, ...newNodes];
      pushHistory(next, edgesRef.current);
      return next;
    });
  }, [selectedIds, nodes, updateNodeData, pushHistory, setNodes, edgesRef]);

  const toggleLockSelected = useCallback((allLocked) => {
    setNodes(ns => ns.map(n =>
      selectedIds.includes(n.id)
        ? { ...n, draggable: allLocked, connectable: allLocked, selectable: true }
        : n
    ));
  }, [selectedIds, setNodes]);

  const bringToFront = useCallback((clickedNode) => {
    if (clickedNode.type === 'groupBox') return; // groups always stay behind
    setNodes(ns => ns.map(n =>
      n.id === clickedNode.id
        ? { ...n, zIndex: nextZIndex(ns) }
        : n
    ));
  }, [setNodes]);

  return {
    addNode,
    groupSelected,
    deleteSelected,
    duplicateSelected,
    toggleLockSelected,
    bringToFront,
    uid,
    nextZIndex
  };
}
