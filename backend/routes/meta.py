from flask import Blueprint, request, jsonify
import urllib.request
import urllib.parse
import json
import re

meta_bp = Blueprint('meta', __name__, url_prefix='/api')

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
}


# ── Generic OG meta scraper ───────────────────────────────────────────────────

def _fetch_meta(url):
    try:
        req = urllib.request.Request(url, headers=HEADERS)
        with urllib.request.urlopen(req, timeout=6) as resp:
            html = resp.read(50_000).decode('utf-8', errors='ignore')
    except Exception as e:
        return None, str(e)

    def meta(prop):
        patterns = [
            rf'<meta[^>]+property=["\']og:{prop}["\'][^>]+content=["\'](.*?)["\']',
            rf'<meta[^>]+name=["\']twitter:{prop}["\'][^>]+content=["\'](.*?)["\']',
            rf'<meta[^>]+name=["\']{prop}["\'][^>]+content=["\'](.*?)["\']',
            rf'<meta[^>]+content=["\'](.*?)["\'][^>]+property=["\']og:{prop}["\']',
        ]
        for p in patterns:
            m = re.search(p, html, re.IGNORECASE | re.DOTALL)
            if m:
                return m.group(1).strip()
        return None

    title = meta('title')
    if not title:
        m = re.search(r'<title[^>]*>(.*?)</title>', html, re.IGNORECASE | re.DOTALL)
        title = m.group(1).strip() if m else None

    return {
        'title':       title or url,
        'description': meta('description'),
        'image':       meta('image'),
        'url':         url,
    }, None


@meta_bp.route('/meta')
def fetch_meta():
    url = request.args.get('url', '').strip()
    if not url:
        return jsonify({'error': 'No URL provided'}), 400
    if not url.startswith(('http://', 'https://')):
        url = 'https://' + url
    data, err = _fetch_meta(url)
    if err and not data:
        return jsonify({'error': err, 'url': url, 'title': url})
    return jsonify(data)


# ── oEmbed proxy (Twitter/X, TikTok, Reddit) ─────────────────────────────────

def _fetch_oembed(oembed_url):
    """Fetch oEmbed JSON from a provider and return the html field."""
    try:
        req = urllib.request.Request(oembed_url, headers=HEADERS)
        with urllib.request.urlopen(req, timeout=8) as resp:
            data = json.loads(resp.read().decode('utf-8'))
        return data.get('html', ''), None
    except Exception as e:
        return None, str(e)


@meta_bp.route('/oembed')
def fetch_oembed():
    """
    Returns embeddable HTML for platforms that support oEmbed.
    Supported: twitter/x, tiktok, reddit
    """
    url = request.args.get('url', '').strip()
    if not url:
        return jsonify({'error': 'No URL'}), 400
    if not url.startswith(('http://', 'https://')):
        url = 'https://' + url

    low = url.lower()

    # Twitter / X
    if 'twitter.com' in low or 'x.com' in low:
        oembed_url = f'https://publish.twitter.com/oembed?url={urllib.parse.quote(url)}&omit_script=false&dnt=true'
        html, err = _fetch_oembed(oembed_url)
        if html:
            return jsonify({'html': html, 'platform': 'twitter'})
        return jsonify({'error': err or 'oEmbed failed', 'platform': 'twitter'}), 502

    # TikTok
    if 'tiktok.com' in low:
        oembed_url = f'https://www.tiktok.com/oembed?url={urllib.parse.quote(url)}'
        html, err = _fetch_oembed(oembed_url)
        if html:
            return jsonify({'html': html, 'platform': 'tiktok'})
        return jsonify({'error': err or 'oEmbed failed', 'platform': 'tiktok'}), 502

    # Reddit
    if 'reddit.com' in low or 'redd.it' in low:
        oembed_url = f'https://www.reddit.com/oembed?url={urllib.parse.quote(url)}'
        html, err = _fetch_oembed(oembed_url)
        if html:
            return jsonify({'html': html, 'platform': 'reddit'})
        return jsonify({'error': err or 'oEmbed failed', 'platform': 'reddit'}), 502

    return jsonify({'error': 'Platform not supported for oEmbed'}), 400