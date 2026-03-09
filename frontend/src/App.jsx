import { useState, useEffect } from 'react'
import BoardList from './pages/BoardList'
import CanvasEditor from './pages/CanvasEditor'
import './App.css'

export default function App() {
  const [currentBoard, setCurrentBoard] = useState(null)

  return (
    <div className="app">
      {currentBoard ? (
        <CanvasEditor
          boardId={currentBoard}
          onBack={() => setCurrentBoard(null)}
        />
      ) : (
        <BoardList onOpenBoard={setCurrentBoard} />
      )}
    </div>
  )
}