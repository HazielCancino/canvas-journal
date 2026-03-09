from flask import Blueprint, request, jsonify
import urllib.request
import re

meta_bp = Blueprint('meta', __name__, url_prefix='/api')


def _fetch_meta(url):
    try:
        req = urllib.request.Request(
            url,
            headers={'User-Agent': 'Mozilla/5.0 (compatible; canvas-journal/1.0)'}
        )
        with urllib.request.urlopen(req, timeout=5) as resp:
            html = resp.read(30_000).decode('utf-8', errors='ignore')
    except Exception as e:
        return None, str(e)

    def meta(prop):
        patterns = [
            rf'<meta[^>]+property=["\']og:{prop}["\'][^>]+content=["\'](.*?)["\']',
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