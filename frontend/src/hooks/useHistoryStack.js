import { useCallback, useEffect, useRef, useState } from 'react';

export function useHistoryStack({ setNodes, setEdges, attachUpdater, cleanNodes }) {
  const historyRef = useRef([]);
  const historyIdx = useRef(-1);
  const isUndoing = useRef(false);

  const [historyItems, setHistoryItems] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(-1);

  const initHistory = useCallback((nodes, edges) => {
    historyRef.current = [{
      actionName: 'Initial Load', time: Date.now(),
      nodes: JSON.parse(JSON.stringify(cleanNodes(nodes) || [])),
      edges: JSON.parse(JSON.stringify(edges || []))
    }];
    historyIdx.current = 0;
    setHistoryItems([{ actionName: 'Initial Load', time: historyRef.current[0].time }]);
    setCurrentIndex(0);
  }, [cleanNodes]);

  const pushHistory = useCallback((snapNs, snapEs, actionName = 'Action') => {
    if (isUndoing.current) return;
    historyRef.current.length = historyIdx.current + 1;
    historyRef.current.push({
      actionName, time: Date.now(),
      nodes: JSON.parse(JSON.stringify(cleanNodes(snapNs))),
      edges: JSON.parse(JSON.stringify(snapEs)),
    });
    if (historyRef.current.length > 60) historyRef.current.shift();
    historyIdx.current = historyRef.current.length - 1;
    setHistoryItems(historyRef.current.map(h => ({ actionName: h.actionName, time: h.time })));
    setCurrentIndex(historyIdx.current);
  }, [cleanNodes]);

  const jumpToHistory = useCallback((index) => {
    if (index < 0 || index >= historyRef.current.length) return;
    historyIdx.current = index;
    const snap = historyRef.current[index];
    if (!snap) return;
    isUndoing.current = true;
    
    // Attach updaters back to nodes when restoring
    setNodes(snap.nodes.map(attachUpdater));
    setEdges(snap.edges);
    setCurrentIndex(index);
    
    setTimeout(() => { isUndoing.current = false; }, 50);
  }, [attachUpdater, setNodes, setEdges]);

  const undo = useCallback((e) => {
    if (e) e.preventDefault();
    if (historyIdx.current <= 0) return;
    jumpToHistory(historyIdx.current - 1);
  }, [jumpToHistory]);

  // Handle Ctrl+Z / Cmd+Z globally
  useEffect(() => {
    const onKeyDown = (e) => {
      const tag = document.activeElement?.tagName?.toLowerCase();
      const ce = document.activeElement?.contentEditable;
      if (tag === 'input' || tag === 'textarea' || ce === 'true') return;

      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        undo(e);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [undo]);

  return { pushHistory, initHistory, undo, historyItems, currentIndex, jumpToHistory };
}
