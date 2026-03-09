import { useState } from 'react'
import { useTheme } from './hooks/useTheme'
import BoardList from './pages/BoardList'
import CanvasEditor from './pages/CanvasEditor'
import './App.css'

export default function App() {
  const [currentBoard, setCurrentBoard] = useState(null)
  const { themeKey, setThemeKey } = useTheme()

  return (
    <div className="app">
      {currentBoard ? (
        <CanvasEditor boardId={currentBoard} onBack={() => setCurrentBoard(null)} />
      ) : (
        <BoardList
          onOpen={setCurrentBoard}
          themeKey={themeKey}
          setThemeKey={setThemeKey}
        />
      )}
    </div>
  )
}