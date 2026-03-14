import { useCallback, useEffect, useRef } from 'react';

export function useHistoryStack({ setNodes, setEdges, attachUpdater, cleanNodes }) {
  const historyRef = useRef([]);
  const historyIdx = useRef(-1);
  const isUndoing = useRef(false);

  const initHistory = useCallback((nodes, edges) => {
    historyRef.current = [{
      nodes: JSON.parse(JSON.stringify(cleanNodes(nodes) || [])),
      edges: JSON.parse(JSON.stringify(edges || []))
    }];
    historyIdx.current = 0;
  }, [cleanNodes]);

  const pushHistory = useCallback((snapNs, snapEs) => {
    if (isUndoing.current) return;
    historyRef.current.length = historyIdx.current + 1;
    historyRef.current.push({
      nodes: JSON.parse(JSON.stringify(cleanNodes(snapNs))),
      edges: JSON.parse(JSON.stringify(snapEs)),
    });
    if (historyRef.current.length > 60) historyRef.current.shift();
    historyIdx.current = historyRef.current.length - 1;
  }, [cleanNodes]);

  const undo = useCallback((e) => {
    if (e) e.preventDefault();
    if (historyIdx.current <= 0) return;
    historyIdx.current -= 1;
    const snap = historyRef.current[historyIdx.current];
    if (!snap) return;
    isUndoing.current = true;
    
    // Attach updaters back to nodes when restoring
    setNodes(snap.nodes.map(attachUpdater));
    setEdges(snap.edges);
    
    setTimeout(() => { isUndoing.current = false; }, 50);
  }, [attachUpdater, setNodes, setEdges]);

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

  return { pushHistory, initHistory, undo };
}
