# CursorGo — Web Code Editor + AI Agent

Editor kode berbasis web mirip **VSCode / Cursor** yang berjalan penuh di browser,
lengkap dengan **AI Agent** (mode **Auto** & **Composer 2.5**), file explorer, dan
kemampuan membuka file langsung dari file manager / Finder.

![stack](https://img.shields.io/badge/React-18-61dafb) ![vite](https://img.shields.io/badge/Vite-6-646cff) ![tailwind](https://img.shields.io/badge/Tailwind-3-38bdf8)

## Fitur

- **Monaco Editor** — engine yang sama dengan VSCode (syntax highlight, minimap, bracket colorization, dsb).
- **Multi-tab editing** dengan indikator perubahan (dirty state) & animasi tab.
- **File Explorer** dengan tree lazy-loading dari folder lokal.
- **Buka file/folder dari Finder** via **File System Access API** + **drag & drop** ke jendela.
- **Simpan ke disk** (`Cmd/Ctrl+S`) langsung ke file asli.
- **AI Agent panel**:
  - Model selector: **Auto**, **Composer 2.5**, GPT-4o, dll.
  - Streaming jawaban token-per-token.
  - Lampirkan file aktif sebagai **konteks** (`@ Context`).
  - **Demo Mode** offline (tanpa API key) + koneksi ke provider **OpenAI-compatible**.
- UI modern: **Tailwind**, **Radix UI**, **Framer Motion**, komponen bergaya **Magic UI**
  (BorderBeam, ShimmerButton, AnimatedShinyText, DotPattern), ikon **lucide-react**.
- Layout **resizable** (sidebar & panel AI), light/dark theme, keyboard shortcuts.
- **Share ZIP** (`/upload-zip`) — upload proyek Go sebagai ZIP, dapat link publik
  (`/zip/:id`) yang bisa diunduh orang lain **tanpa login**.

## Tech Stack

| Kategori        | Teknologi                                        |
| --------------- | ------------------------------------------------ |
| Framework       | React 18 + TypeScript                            |
| Build tool      | Vite 6                                            |
| Styling         | Tailwind CSS 3 + tailwindcss-animate             |
| Primitives      | Radix UI                                          |
| Animasi         | Framer Motion                                     |
| Efek UI         | Magic UI (komponen di `src/components/magicui`)   |
| Ikon            | lucide-react                                      |
| Editor          | @monaco-editor/react                              |
| Data fetching   | **native `fetch` + custom hooks** (tanpa TanStack Query) |

> Catatan: permintaan menyebut "react query" sekaligus "jangan gunakan TanStack Query".
> Karena React Query = TanStack Query, project ini **tidak** memakai TanStack Query dan
> menggunakan `fetch` + custom hooks untuk streaming AI dan state.

## Menjalankan

```bash
npm install
npm run dev      # http://localhost:5173
```

Build produksi:

```bash
npm run build
npm run preview
```

## Menghubungkan AI Agent (Cursor)

Cursor tidak punya endpoint chat yang bisa dipanggil langsung dari browser, jadi ada
**backend proxy kecil** (`server/index.mjs`) yang menjembatani browser ↔ **Cursor SDK**
(`@cursor/sdk`) dan meng-expose endpoint OpenAI-compatible di `http://localhost:8787`.

### Langkah cepat

```bash
# 1. jalankan frontend + backend sekaligus
npm run dev:all
# atau terpisah:
#   npm run dev       (frontend :5173)
#   npm run server    (backend Cursor :8787)
```

1. Buka [cursor.com/dashboard/integrations](https://cursor.com/dashboard/integrations) →
   **Create API Key** → salin key (`key_...`).
2. Di aplikasi, klik ikon **⚙️ Settings** pada panel AI.
3. Aktifkan **"Gunakan API sungguhan"**, pilih provider **Cursor**.
4. Tempel **Cursor API Key**, pilih model **Auto** / **Composer 2.5**, klik **Simpan**.

Setelah itu semua chat di-stream langsung dari **Cursor** (bukan OpenAI). Key hanya
dikirim ke backend lokal kamu, disimpan di `localStorage` browser.

> **Catatan runtime lokal:** backend menjalankan Cursor agent dengan runtime *local*.
> Pastikan Cursor CLI terpasang (`curl https://cursor.com/install -fsS | bash`) bila
> agent gagal start. Backend memakai folder kosong `server/.scratch` sebagai cwd, jadi
> agent tidak menyentuh file proyekmu — konteks file dikirim inline lewat panel chat.

### Provider lain (opsional)

Masih tersedia provider **OpenAI** dan **Custom** (endpoint OpenAI-compatible seperti
Ollama / LM Studio / OpenRouter) di dialog Settings. Tanpa key sama sekali, editor tetap
jalan dalam **Demo Mode**.

## Deploy ke Netlify

Yang di-deploy ke Netlify **hanya frontend** (SPA statis). Backend Cursor
(`server/index.mjs`) butuh proses Node + Cursor SDK/CLI yang tidak bisa jalan di
Netlify Functions, jadi backend dijalankan terpisah (mis. di laptopmu).

**Langkah:**

1. Push repo ke GitHub, lalu di Netlify: **Add new site → Import from Git**.
2. Netlify otomatis membaca `netlify.toml`:
   - Build command: `npm run build`
   - Publish directory: `dist`
3. (Opsional) Set env var `VITE_CURSOR_PROXY_URL` bila backend tidak di `localhost:8787`.
4. Deploy. Kamu dapat URL HTTPS (mis. `https://namamu.netlify.app`).

**Pakai AI Cursor dari site Netlify (personal):**

- Jalankan backend di mesinmu: `npm run server`.
- Buka site Netlify → Settings → provider **Cursor** → Base URL `http://localhost:8787/v1`.
- Browser mengizinkan HTTPS→`http://localhost` (dikecualikan dari mixed-content), jadi
  AI tetap jalan selama laptop + backend nyala.

> Tanpa backend, site Netlify tetap berfungsi penuh sebagai editor dalam **Demo Mode**.
> CLI cepat: `npm i -g netlify-cli && netlify deploy --build --prod`.

## Deploy backend (Railway / Render / Fly.io)

> **Netlify & Vercel serverless tidak cocok** untuk backend ini — Cursor SDK runtime
> lokal butuh proses Node persisten + CLI `cursor-agent` + streaming, yang tidak
> didukung serverless. Gunakan platform berbasis container/VM di bawah. Sudah
> disediakan `Dockerfile`, `render.yaml`, dan `fly.toml`.

### Opsi A — Render (paling mudah, blueprint)

1. Push repo ke GitHub.
2. Render → **New → Blueprint** → pilih repo (baca `render.yaml` otomatis).
3. Isi env di dashboard Render:
   - `CURSOR_API_KEY` = key dari cursor.com/dashboard/integrations
   - `ALLOWED_ORIGINS` = `https://namamu.netlify.app` (URL frontend kamu)
   - `PUBLIC_FRONTEND_URL` = `https://namamu.netlify.app` (untuk link share ZIP `/zip/:id`)
4. Deploy → dapat URL `https://cursorgo-backend.onrender.com`.

### Opsi B — Railway

1. Railway → **New Project → Deploy from GitHub** (Dockerfile terdeteksi otomatis).
2. Variables: set `CURSOR_API_KEY` dan `ALLOWED_ORIGINS`.
3. Generate domain publik.

### Opsi C — Fly.io

```bash
fly launch --no-deploy         # terima fly.toml yang ada
fly secrets set CURSOR_API_KEY=key_xxx ALLOWED_ORIGINS=https://namamu.netlify.app
fly deploy
```

### Hubungkan frontend ke backend cloud

Di Netlify, set env **`VITE_CURSOR_PROXY_URL`** ke URL backend + `/v1`, mis.
`https://cursorgo-backend.onrender.com/v1`, lalu redeploy. Atau ubah manual Base URL
di dialog **Settings** aplikasi.

### Keamanan (penting)

- **Set `CURSOR_API_KEY` di server** dan **`ALLOWED_ORIGINS` = URL frontend kamu** agar
  key tidak ada di browser dan endpoint tidak bebas dipanggil orang lain.
- Kalau `CURSOR_API_KEY` diisi di server, request tanpa Bearer tetap dilayani memakai key
  server — makanya `ALLOWED_ORIGINS` wajib diisi supaya tidak disalahgunakan.
- Alternatif: kosongkan `CURSOR_API_KEY` di server → setiap user wajib menempel key sendiri
  di UI (dikirim sebagai Bearer per request).

### Catatan

- Cursor CLI diinstal di image via `curl https://cursor.com/install`. Jika path CLI berbeda,
  sesuaikan `ENV PATH` di `Dockerfile`.
- Backend memakai runtime **local** dengan cwd `server/.scratch` (folder kosong) — agent
  tidak menyentuh repo; konteks file dikirim inline dari panel chat.
- Upload ZIP disimpan di `server/uploads/` (di Render free tier disk **ephemeral** —
  file bisa hilang saat redeploy). Download publik: `GET /zips/:id/download` (tanpa auth).

## Shortcut

| Aksi                | Shortcut       |
| ------------------- | -------------- |
| Simpan file         | `Cmd/Ctrl + S` |
| Toggle AI Agent     | `Cmd/Ctrl + I` |
| Toggle Sidebar      | `Cmd/Ctrl + B` |
| Kirim chat          | `Enter`        |
| Baris baru di chat  | `Shift+Enter`  |

## Kompatibilitas Browser

Fitur buka/simpan file memerlukan **File System Access API** — gunakan
**Chrome / Edge / Brave / Opera** terbaru. Di browser lain, drag & drop tetap bisa
untuk membuka file (read-only).

## Struktur

```
src/
├─ components/
│  ├─ ai/        # AiPanel, ChatMessage, ChatInput, ModelSelector, SettingsDialog
│  ├─ editor/    # EditorArea, MonacoEditor, EditorTabs, Welcome
│  ├─ layout/    # ActivityBar, TitleBar, StatusBar, FileExplorer, FileTreeNode
│  ├─ magicui/   # BorderBeam, ShimmerButton, AnimatedShinyText, DotPattern, GradientText
│  └─ ui/        # Button, Dialog, Dropdown, Tooltip, ScrollArea, Switch (Radix)
├─ hooks/        # useWorkspace, useEditorTabs, useChat, useLocalStorage
├─ lib/          # ai.ts, fileSystem.ts, types.ts, utils.ts
├─ App.tsx       # komposisi layout utama
└─ main.tsx
```
