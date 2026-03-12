# ◈ Canvas Journal

A personal infinite canvas for journaling, mood boards, and inspiration. Drag, drop, embed, connect — your thoughts, your layout.

Built with React + Flask + MySQL.

![Canvas Journal](https://img.shields.io/badge/stack-React%20%2B%20Flask%20%2B%20MySQL-c9a96e?style=flat-square)

---

![FLOW UI](docs/screenshots/UI-TEST.gif)

## Features

**Canvas**
- Infinite pan & zoom canvas (powered by React Flow)
- Text notes with Markdown, 6 color tints
- Image & video nodes — drag & drop or upload
- Group boxes — drag nodes inside to parent them (ComfyUI-style)
- File attachment nodes (PDF, TXT, etc.)
- Embed nodes: YouTube, Vimeo, Spotify, SoundCloud, Reddit, Twitter/X, TikTok, Pinterest, and any link as a preview card
- Paste a URL on the canvas → instantly creates an embed node
- Paste an image → uploads and drops it on the canvas
- Multi-select with Alt key — group, duplicate, lock, delete
- Right-click context menu for quick actions
- Per-board canvas backgrounds: solid color, image/GIF, dot/line/cross patterns
- Auto-save with 1.5s debounce

**Board list**
- 6 app themes (Obsidian, Midnight, Forest, Wine, Slate, Parchment)
- Pin boards to top, archive without deleting
- Color tags with filtering
- Priority levels (Low / Medium / High / Urgent)
- Cover images per board
- Sort by last edited, last opened, created, name, or priority
- Search by name or tag
- Duplicate a board (full clone)
- Inline rename and description editing

---

## Stack

| Layer    | Tech |
|----------|------|
| Frontend | React 18, Vite, React Flow (@xyflow/react), Zustand, react-markdown, axios |
| Backend  | Python 3.12, Flask 3, SQLAlchemy, PyMySQL |
| Database | MySQL 8 |

---

## Setup

### Prerequisites
- Python 3.10+
- Node.js 18+
- MySQL 8 running locally

### 1. Clone

```bash
git clone https://github.com/your-username/canvas-journal.git
cd canvas-journal
```

### 2. Database

Open MySQL and run:

```sql
CREATE DATABASE canvas_journal CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE canvas_journal;

CREATE TABLE boards (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  name           VARCHAR(255)  NOT NULL,
  description    TEXT,
  canvas_state   LONGTEXT,
  thumbnail      VARCHAR(1000),
  cover_image    VARCHAR(1000),
  pinned         TINYINT(1)    DEFAULT 0,
  archived       TINYINT(1)    DEFAULT 0,
  priority       TINYINT       DEFAULT 0,
  tags           TEXT,
  last_opened_at DATETIME,
  created_at     DATETIME      DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME      DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE media_files (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  board_id      INT,
  filename      VARCHAR(500),
  original_name VARCHAR(500),
  file_type     VARCHAR(50),
  mime_type     VARCHAR(100),
  file_path     VARCHAR(1000),
  file_size     INT,
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE
);
```

### 3. Backend

```bash
cd backend
python -m venv venv
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

pip install -r requirements.txt
```

Create `backend/.env`:

```env
DATABASE_URL=mysql+pymysql://root:yourpassword@localhost/canvas_journal
UPLOAD_FOLDER=uploads
MAX_CONTENT_LENGTH=52428800
```

Start the server:

```bash
python app.py
# Runs on http://127.0.0.1:5000
```

### 4. Frontend

```bash
cd frontend
npm install
npm run dev
# Runs on http://localhost:5173
```

---

## Project Structure

```
canvas-journal/
├── backend/
│   ├── app.py              # Flask app factory
│   ├── config.py
│   ├── extensions.py       # SQLAlchemy instance
│   ├── models.py           # Board, MediaFile models
│   ├── routes/
│   │   ├── boards.py       # Board CRUD + all board actions
│   │   ├── media.py        # File upload & serving
│   │   └── meta.py         # OG meta + oEmbed proxy
│   ├── uploads/            # User media (gitignored)
│   └── requirements.txt
│
└── frontend/
    └── src/
        ├── App.jsx
        ├── App.css
        ├── api.js
        ├── groupUtils.js
        ├── hooks/
        │   └── useTheme.js
        ├── pages/
        │   ├── BoardList.jsx
        │   └── CanvasEditor.jsx
        └── components/
            ├── Toolbar.jsx
            ├── ThemeSwitcher.jsx
            ├── CanvasBackground.jsx
            ├── ContextMenu.jsx
            ├── BoardSettings.jsx
            ├── SelectionBar.jsx
            └── nodes/
                ├── TextNode.jsx
                ├── ImageNode.jsx
                ├── VideoNode.jsx
                ├── GroupBoxNode.jsx
                ├── FileNode.jsx
                ├── EmbedNode.jsx
                └── NodeWrapper.jsx
```

---

## Notes

- `backend/uploads/` is gitignored — user media stays local only
- Themes persist in `localStorage`
- Canvas state (nodes, edges, background, settings) auto-saves to MySQL every 1.5s after changes
- oEmbed embeds for Twitter/X and TikTok are fetched server-side to work around CORS restrictions
- next step is to implement it on android

---

## License

MIT