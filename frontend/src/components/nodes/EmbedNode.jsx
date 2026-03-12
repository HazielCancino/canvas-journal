import { useState, useEffect, useRef } from 'react'
import { Handle, Position, NodeResizer } from '@xyflow/react'
import { ORIGIN } from '../../api'
import NodeWrapper from './NodeWrapper'
import './nodes.css'
import './EmbedNode.css'

/* ── Platform detection ─────────────────────────────────────────────────────── */
function detectPlatform(url) {
  if (!url) return 'unknown'
  const u = url.toLowerCase()
  if (u.includes('youtube.com/watch') || u.includes('youtu.be/') || u.includes('youtube.com/shorts/')) return 'youtube'
  if (u.includes('open.spotify.com'))   return 'spotify'
  if (u.includes('soundcloud.com'))     return 'soundcloud'
  if (u.includes('vimeo.com'))          return 'vimeo'
  if (u.includes('redgifs.com'))        return 'redgif'
  if (u.includes('pinterest.com') || u.includes('pin.it')) return 'pinterest'
  if (u.includes('reddit.com') || u.includes('redd.it'))   return 'reddit'
  if (u.includes('twitter.com') || u.includes('x.com'))    return 'twitter'
  if (u.includes('tiktok.com'))         return 'tiktok'
  return 'link'
}

function getDirectEmbedUrl(url, platform) {
  try {
    switch (platform) {
      case 'youtube': {
        let id = ''
        if (url.includes('youtu.be/'))    id = url.split('youtu.be/')[1]?.split('?')[0]
        else if (url.includes('shorts/')) id = url.split('shorts/')[1]?.split('?')[0]
        else                              id = new URL(url).searchParams.get('v')
        return id ? `https://www.youtube-nocookie.com/embed/${id}?rel=0` : null
      }
      case 'spotify': {
        const path = new URL(url).pathname
        return `https://open.spotify.com/embed${path}?utm_source=generator&theme=0`
      }
      case 'soundcloud':
        return `https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&color=%23c9a96e&auto_play=false&hide_related=true&show_comments=false&visual=true`
      case 'vimeo': {
        const id = url.split('vimeo.com/')[1]?.split('?')[0]
        return id ? `https://player.vimeo.com/video/${id}?color=c9a96e&title=0&byline=0` : null
      }
      case 'redgif': {
        const slug = url.split('/watch/')[1]?.split('?')[0]
          || url.split('redgifs.com/ifr/')[1]?.split('?')[0]
        return slug ? `https://www.redgifs.com/ifr/${slug}` : null
      }
      case 'reddit': {
        const match = url.match(/reddit\.com(\/r\/[^?#]+)/)
        if (match) {
          return `https://www.redditmedia.com${match[1]}?ref_source=embed&embed=true&theme=dark`
        }
        return null
      }
      default: return null
    }
  } catch { return null }
}

const PLATFORM_META = {
  youtube:   { icon: '▶', label: 'YouTube',    color: '#ff4444' },
  spotify:   { icon: '♫', label: 'Spotify',    color: '#1db954' },
  soundcloud:{ icon: '☁', label: 'SoundCloud', color: '#ff5500' },
  vimeo:     { icon: '▶', label: 'Vimeo',      color: '#19b7ea' },
  redgif:    { icon: '⊛', label: 'RedGifs',    color: '#e8505b' },
  pinterest: { icon: '⊕', label: 'Pinterest',  color: '#e60023' },
  reddit:    { icon: '⊙', label: 'Reddit',     color: '#ff4500' },
  twitter:   { icon: '✦', label: 'X / Twitter', color: '#1d9bf0' },
  tiktok:    { icon: '♪', label: 'TikTok',     color: '#69c9d0' },
  link:      { icon: '⇢', label: 'Link',        color: '#c9a96e' },
  unknown:   { icon: '?', label: 'Link',        color: '#888'    },
}

/* ── oEmbed srcdoc renderer (Twitter + TikTok) ─────────────────────────────── */
function OEmbedFrame({ url, platform, color }) {
  const [srcdoc, setSrcdoc]   = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  useEffect(() => {
    setLoading(true); setError(null); setSrcdoc(null)
    // ── FIX: uses ORIGIN from api.js instead of hardcoded localhost ──
    fetch(`${ORIGIN}/api/oembed?url=${encodeURIComponent(url)}`)
      .then(r => r.json())
      .then(d => {
        if (d.html) {
          const doc = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    background: #0e0d0b;
    display: flex; align-items: flex-start; justify-content: center;
    padding: 12px; min-height: 100vh; overflow-y: auto;
  }
  blockquote { max-width: 100% !important; }
  .tiktok-embed, [class*="twitter"] { max-width: 100% !important; }
</style>
</head>
<body>${d.html}</body>
</html>`
          setSrcdoc(doc)
        } else {
          setError(d.error || 'Could not load embed')
        }
      })
      .catch(() => setError('Network error'))
      .finally(() => setLoading(false))
  }, [url])

  if (loading) return <LoadingDots color={color} />
  if (error) return (
    <div className="embed-error">
      <span>Could not load embed</span>
      <a href={url} target="_blank" rel="noreferrer" className="embed-link-open">
        Open on {PLATFORM_META[platform]?.label} ↗
      </a>
    </div>
  )

  return (
    <iframe
      srcDoc={srcdoc}
      title={platform}
      frameBorder="0"
      sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
      style={{ width: '100%', height: '100%', display: 'block', border: 'none', background: '#0e0d0b' }}
    />
  )
}

/* ── Generic link preview ─────────────────────────────────────────────────── */
function LinkPreview({ url, meta, loading, platform }) {
  const domain = (() => { try { return new URL(url).hostname.replace('www.','') } catch { return url } })()
  const pm = PLATFORM_META[platform] || PLATFORM_META.link
  return (
    <div className="embed-link-card">
      {loading
        ? <LoadingDots color={pm.color} />
        : <>
            {meta?.image && (
              <div className="embed-link-thumb">
                <img src={meta.image} alt="" onError={e => e.target.style.display='none'} />
              </div>
            )}
            <div className="embed-link-info">
              <div className="embed-link-domain">
                <img className="embed-favicon" src={`https://www.google.com/s2/favicons?sz=16&domain=${domain}`} alt="" onError={e=>e.target.style.display='none'} />
                {domain}
              </div>
              <div className="embed-link-title">{meta?.title || url}</div>
              {meta?.description && <div className="embed-link-desc">{meta.description.slice(0,140)}{meta.description.length>140?'…':''}</div>}
              <a className="embed-link-open" href={url} target="_blank" rel="noreferrer">Open ↗</a>
            </div>
          </>
      }
    </div>
  )
}

function LoadingDots({ color = '#c9a96e' }) {
  return (
    <div className="embed-loading">
      <span className="embed-loading-dot" style={{ background: color }} />
      <span className="embed-loading-dot" style={{ background: color }} />
      <span className="embed-loading-dot" style={{ background: color }} />
    </div>
  )
}

/* ── Main EmbedNode ─────────────────────────────────────────────────────────── */
export default function EmbedNode({ data, selected }) {
  const [meta, setMeta]       = useState(data.meta || null)
  const [loading, setLoading] = useState(false)

  const platform = detectPlatform(data.url)
  const pm       = PLATFORM_META[platform] || PLATFORM_META.unknown
  const embedUrl = getDirectEmbedUrl(data.url, platform)

  const isOEmbed  = ['twitter', 'tiktok'].includes(platform)
  const needsMeta = ['link', 'pinterest', 'unknown'].includes(platform)

  useEffect(() => {
    if (!needsMeta || meta || !data.url) return
    setLoading(true)
    // ── FIX: uses ORIGIN from api.js instead of hardcoded localhost ──
    fetch(`${ORIGIN}/api/meta?url=${encodeURIComponent(data.url)}`)
      .then(r => r.json())
      .then(d => { setMeta(d); if (data._update) data._update({ meta: d }) })
      .catch(() => setMeta({ title: data.url }))
      .finally(() => setLoading(false))
  }, [data.url])

  const iframeH =
    platform === 'spotify'      ? (data.url?.includes('/track/') ? 152 : 380)
    : platform === 'soundcloud' ? 166
    : platform === 'redgif'     ? 360
    : platform === 'reddit'     ? 420
    : platform === 'twitter'    ? 360
    : platform === 'tiktok'     ? 480
    : 280

  const resizable = ['youtube', 'vimeo', 'redgif', 'soundcloud', 'reddit', 'twitter', 'tiktok'].includes(platform)

  return (
    <NodeWrapper selected={selected} onDelete={data._delete}>
      <div className="node embed-node" style={{ '--pm-color': pm.color, minWidth: 340 }}>
        {resizable && (
          <NodeResizer minWidth={300} minHeight={220} isVisible={selected} color={pm.color} />
        )}
        <Handle type="target" position={Position.Top}    className="rf-handle" />
        <Handle type="source" position={Position.Bottom} className="rf-handle" />

        {/* Drag bar */}
        <div className="node-drag-bar">
          <div className="embed-platform-badge" style={{ color: pm.color }}>
            <span className="embed-platform-icon">{pm.icon}</span>
            <span className="embed-platform-label">{pm.label}</span>
          </div>
          <a className="embed-open-link" href={data.url} target="_blank" rel="noreferrer"
            onPointerDown={e => e.stopPropagation()}>↗</a>
        </div>

        {/* Content */}
        {isOEmbed ? (
          <div className="embed-iframe-wrap" style={{ height: iframeH }}>
            <OEmbedFrame url={data.url} platform={platform} color={pm.color} />
          </div>
        ) : embedUrl ? (
          <div className="embed-iframe-wrap" style={{ height: iframeH }}>
            <iframe
              src={embedUrl}
              title={pm.label}
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
              allowFullScreen
              style={{ width: '100%', height: '100%', display: 'block', border: 'none' }}
            />
          </div>
        ) : (
          <LinkPreview url={data.url} meta={meta} loading={loading} platform={platform} />
        )}
      </div>
    </NodeWrapper>
  )
}