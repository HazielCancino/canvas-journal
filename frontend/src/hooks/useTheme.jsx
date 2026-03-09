import { useState, useEffect } from 'react'

export const THEMES = {
  obsidian: {
    name: 'Obsidian',
    '--bg':        '#0e0d0b',
    '--surface':   '#1a1814',
    '--surface2':  '#242118',
    '--border':    '#2e2b24',
    '--border2':   '#3d3930',
    '--text':      '#e8e4d9',
    '--text-dim':  '#7a7569',
    '--text-faint':'#3d3930',
    '--accent':    '#c9a96e',
    '--accent2':   '#8b6f3e',
  },
  midnight: {
    name: 'Midnight',
    '--bg':        '#0a0e1a',
    '--surface':   '#111827',
    '--surface2':  '#1c2436',
    '--border':    '#1e2d45',
    '--border2':   '#2a3f5f',
    '--text':      '#d4e0f7',
    '--text-dim':  '#6b82a8',
    '--text-faint':'#2a3f5f',
    '--accent':    '#6e9ec9',
    '--accent2':   '#3d6b96',
  },
  forest: {
    name: 'Forest',
    '--bg':        '#0b110d',
    '--surface':   '#141d16',
    '--surface2':  '#1c2a1f',
    '--border':    '#243329',
    '--border2':   '#2f4235',
    '--text':      '#d4e8d8',
    '--text-dim':  '#5e7d65',
    '--text-faint':'#2f4235',
    '--accent':    '#6ec98a',
    '--accent2':   '#3d8a54',
  },
  wine: {
    name: 'Wine',
    '--bg':        '#110a0e',
    '--surface':   '#1c1115',
    '--surface2':  '#27181e',
    '--border':    '#3a1f28',
    '--border2':   '#4d2a36',
    '--text':      '#f0d8df',
    '--text-dim':  '#8a5567',
    '--text-faint':'#4d2a36',
    '--accent':    '#c96e8a',
    '--accent2':   '#8a3d55',
  },
  slate: {
    name: 'Slate',
    '--bg':        '#0f1117',
    '--surface':   '#181b24',
    '--surface2':  '#21252f',
    '--border':    '#2c3140',
    '--border2':   '#3a4055',
    '--text':      '#e0e4f0',
    '--text-dim':  '#6b728a',
    '--text-faint':'#3a4055',
    '--accent':    '#9e9ec9',
    '--accent2':   '#6b6b96',
  },
  parchment: {
    name: 'Parchment',
    '--bg':        '#f5f0e8',
    '--surface':   '#ede6d6',
    '--surface2':  '#e4dbc8',
    '--border':    '#cfc4aa',
    '--border2':   '#b8aa8c',
    '--text':      '#2a2318',
    '--text-dim':  '#7a6a50',
    '--text-faint':'#b8aa8c',
    '--accent':    '#8b6f3e',
    '--accent2':   '#c9a96e',
  },
}

export function useTheme() {
  const [themeKey, setThemeKey] = useState(() => {
    return localStorage.getItem('canvas-theme') || 'obsidian'
  })

  useEffect(() => {
    const theme = THEMES[themeKey] || THEMES.obsidian
    const root = document.documentElement
    Object.entries(theme).forEach(([key, val]) => {
      if (key.startsWith('--')) root.style.setProperty(key, val)
    })
    // also set bg on body directly
    document.body.style.background = theme['--bg']
    localStorage.setItem('canvas-theme', themeKey)
  }, [themeKey])

  return { themeKey, setThemeKey, themes: THEMES }
}