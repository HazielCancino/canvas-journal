import { useState } from 'react'
import { THEMES } from '../hooks/useTheme'
import './ThemeSwitcher.css'

export default function ThemeSwitcher({ themeKey, setThemeKey }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="theme-switcher">
      <button
        className="theme-btn"
        onClick={() => setOpen(o => !o)}
        title="Change theme"
      >
        <span className="theme-btn-dot" style={{ background: THEMES[themeKey]?.['--accent'] }} />
        <span className="theme-btn-label">theme</span>
        <span className="theme-btn-arrow">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="theme-dropdown">
          <div className="theme-dropdown-title">App theme</div>
          <div className="theme-grid">
            {Object.entries(THEMES).map(([key, t]) => (
              <button
                key={key}
                className={`theme-swatch ${themeKey === key ? 'active' : ''}`}
                onClick={() => { setThemeKey(key); setOpen(false) }}
                title={t.name}
              >
                <span className="swatch-preview" style={{
                  background: t['--bg'],
                  borderColor: t['--border2'],
                  boxShadow: `inset 2px 2px 0 ${t['--surface2']}, inset -2px -2px 0 ${t['--accent']}`
                }} />
                <span className="swatch-name" style={{ color: t['--text'] === '#2a2318' ? '#2a2318' : undefined }}>
                  {t.name}
                </span>
                {themeKey === key && <span className="swatch-check">✓</span>}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}