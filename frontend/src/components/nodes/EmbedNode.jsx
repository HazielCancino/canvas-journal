import { useState, useEffect } from 'react'
import { Handle, Position, NodeResizer } from '@xyflow/react'
import NodeWrapper from './NodeWrapper'
import './nodes.css'
import './EmbedNode.css'

/* ── URL detection ── */
function detectPlatform(url) {
  if (!url) return 'unknown'
  const u = url.toLowerCase()
  if (u.includes('youtube.com/watch') || u.includes('youtu.be/'))  return 'youtube'
  if (u.includes('youtube.com/shorts/'))                            return 'youtube'
  if (u.includes('open.spotify.com'))                               return 'spotify'
  if (u.includes('soundcloud.com'))                                 return 'soundcloud'
  if (u.includes('vimeo.com'))                                      return 'vimeo'
  return 'link'
}

function getEmbedUrl(url, platform) {
  try {
    switch (platform) {
      case 'youtube': {
        let id = ''
        if (url.includes('youtu.be/'))
          id = url.split('youtu.be/')[1]?.split('?')[0]
        else if (url.includes('shorts/'))
          id = url.split('shorts/')[1]?.split('?')[0]
        else
          id = new URL(url).searchParams.get('v')
        return id ? `https://www.youtube-nocookie.com/embed/${id}?rel=0` : null
      }
      case 'spotify': {
        // Convert open.spotify.com/track/xxx → open.spotify.com/embed/track/xxx
        const path = new URL(url).pathname  // e.g. /track/xxx or /playlist/xxx
        return `https://open.spotify.com/embed${path}?utm_source=generator&theme=0`
      }
      case 'soundcloud': {
        return `https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&color=%23c9a96e&auto_play=false&hide_related=true&show_comments=false&show_user=true&show_reposts=false&visual=true`
      }
      case 'vimeo': {
        const id = url.split('vimeo.com/')[1]?.split('?')[0]
        return id ? `https://player.vimeo.com/video/${id}?color=c9a96e&title=0&byline=0` : null
      }
      default: return null
    }
  } catch { return null }
}

const PLATFORM_META = {
  youtube:    { icon: '▶', label: 'YouTube',    color: '#ff4444' },
  spotify:    { icon: '♫', label: 'Spotify',    color: '#1db954' },
  soundcloud: { icon: '☁', label: 'SoundCloud', color: '#ff5500' },
  vimeo:      { icon: '▶', label: 'Vimeo',      color: '#19b7ea' },
  link:       { icon: '⇢', label: 'Link',        color: '#c9a96e' },
  unknown:    { icon: '?', label: 'Unknown',     color: '#888'    },
}

/* ── Link preview card ── */
function LinkPreview({ url, meta, loading }) {
  const domain = (() => { try { return new URL(url).hostname } catch { return url } })()
  return (
    <div className="embed-link-card">
      {loading ? (
        <div className="embed-loading">
          <span className="embed-loading-dot" /><span className="embed-loading-dot" /><span className="embed-loading-dot" />
        </div>
      ) : (
        <>
          {meta?.image && (
            <div className="embed-link-thumb">
              <img src={meta.image} alt="" onError={e => e.target.style.display='none'} />
            </div>
          )}
          <div className="embed-link-info">
            <div className="embed-link-domain">
              <img
                className="embed-favicon"
                src={`https://www.google.com/s2/favicons?sz=16&domain=${domain}`}
                alt=""
                onError={e => e.target.style.display='none'}
              />
              {domain}
            </div>
            <div className="embed-link-title">{meta?.title || url}</div>
            {meta?.description && (
              <div className="embed-link-desc">{meta.description.slice(0, 120)}{meta.description.length > 120 ? '…' : ''}</div>
            )}
            <a className="embed-link-open" href={url} target="_blank" rel="noreferrer">Open ↗</a>
          </div>
        </>
      )}
    </div>
  )
}

/* ── Main component ── */
export default function EmbedNode({ data, selected }) {
  const [meta, setMeta]       = useState(data.meta || null)
  const [loading, setLoading] = useState(false)
  const platform = detectPlatform(data.url)
  const pm = PLATFORM_META[platform] || PLATFORM_META.unknown
  const embedUrl = getEmbedUrl(data.url, platform)

  // Fetch link meta on mount if it's a plain link
  useEffect(() => {
    if (platform !== 'link' || meta || !data.url) return
    setLoading(true)
    fetch(`http://localhost:5000/api/meta?url=${encodeURIComponent(data.url)}`)
      .then(r => r.json())
      .then(d => {
        setMeta(d)
        if (data._update) data._update({ meta: d })
      })
      .catch(() => setMeta({ title: data.url }))
      .finally(() => setLoading(false))
  }, [data.url])

  const iframeHeight = platform === 'spotify'
    ? (data.url?.includes('/track/') ? 152 : 380)
    : platform === 'soundcloud' ? 166 : 280

  return (
    <NodeWrapper selected={selected} onDelete={data._delete}>
      <div className="node embed-node" style={{ '--pm-color': pm.color, minWidth: 320 }}>
        {(platform === 'youtube' || platform === 'vimeo') && (
          <NodeResizer minWidth={280} minHeight={200} isVisible={selected} color={pm.color} />
        )}
        <Handle type="target" position={Position.Top}    className="rf-handle" />
        <Handle type="source" position={Position.Bottom} className="rf-handle" />

        {/* Header */}
        <div className="node-drag-bar">
          <div className="embed-platform-badge" style={{ color: pm.color }}>
            <span className="embed-platform-icon">{pm.icon}</span>
            <span className="embed-platform-label">{pm.label}</span>
          </div>
          <a
            className="embed-open-link"
            href={data.url} target="_blank" rel="noreferrer"
            onPointerDown={e => e.stopPropagation()}
          >↗</a>
        </div>

        {/* Content */}
        {embedUrl ? (
          <div className="embed-iframe-wrap" style={{ height: iframeHeight }}>
            <iframe
              src={embedUrl}
              title={pm.label}
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              style={{ width: '100%', height: '100%', display: 'block', border: 'none' }}
            />
          </div>
        ) : (
          <LinkPreview url={data.url} meta={meta} loading={loading} />
        )}
      </div>
    </NodeWrapper>
  )
}