# FocusLearn — Courses, Playlists, Pictures, Notes & PDF Library, Analytics

FocusLearn is a distraction-free, privacy-first personal learning space built as a 100% static web application.

## Run
Open `index.html` in any modern web browser. No build step, framework, Node.js server, external database, API key, or backend is required.

## Features

### 1. Notes & PDF Library (Document Vault)
Store, edit, save, view, and delete both PDF documents and created study notes directly in your browser:
- **Created Notes**:
  - Write notes directly in the in-page **Write Note** workspace or via the **＋ Create note** dialog.
  - Store Note Title, Category (Lecture Notes, Summary, Formula Sheet, Cheatsheet, Revision, Assignment, Other), optional Linked Course, Note Details / Key Takeaways, and full Note Content.
  - **Edit Notes & Note Details**: Update title, category, course link, summary takeaways, and full content at any time.
  - **View & Copy**: Read notes in a clean typography modal reader, copy note text with one click, or download as a `.txt` file.
  - **Delete Notes**: Remove notes with a single click and confirmation.
- **Store & View PDFs**:
  - Upload PDF files via file browser or drag-and-drop into the upload dropzone.
  - Store PDF Title, Category (Textbook, Lecture Slides, Research Paper, Lecture Notes, Cheatsheet, Syllabus, Other), optional Linked Course, and PDF Details / Summary Notes.
  - **Embedded PDF Viewer**: Open and read PDFs directly in the browser via an integrated viewer modal with zoom and page controls.
  - **Edit PDF Details**: Update title, category, linked course, and summary description (or replace the PDF file).
  - **Download & Delete**: Download the original PDF document or delete it with confirmation.
- **Search & Filters**: Search across all notes and PDFs by title, content, or details; filter by course, category, or document type.
- **Player Integration**: Click **✎ Notes & PDFs** inside the video lesson player to view or create materials linked to the current course.

### 2. Pictures & Visual Notes (Visual Study Vault)
- **Save Pictures**: Upload diagrams, formula sheets, whiteboard captures, screenshots, and handwritten notes.
- **Clipboard Paste**: Press `Ctrl+V` (`Cmd+V`) anywhere to paste an image directly from your clipboard into your library.
- **Automatic Optimization**: Client-side canvas downscaling for oversized photos to prevent storage bloat.
- **Edit Pictures & Details**: Edit title, category, course association, and notes; rotate images 90° clockwise; replace images.
- **Fullscreen Lightbox**: View full-resolution images with zoom toggle and details sidebar.
- **Download & Delete**: Save picture files locally or remove them with confirmation.

### 3. Courses, Playlists & Lesson Management
- Group lessons and playlists into customizable courses and organized modules.
- **YouTube Playlist Support**:
  - Add full YouTube playlists by playlist URL (`youtube.com/playlist?list=...`) or playlist ID (`PL...`, `UU...`, `FL...`, `RD...`, `OLAK...`).
  - Interactive playlist playback in the distraction-free player via YouTube's native `videoseries` player with playlist drawer, track index, and auto-progression.
  - **Batch Video Importer**: Paste a multiline list of YouTube video URLs extracted from a playlist or syllabus to add multiple lessons in one click.
- **Edit, Save & Delete Content**:
  - Modal editor for both playlists and individual video lessons: update Title, Module assignment, and YouTube URL/ID with live validation and preview.
  - Delete individual videos or entire playlists from any module with a single click and confirmation.
  - Reorder, reorganize, or reassign lessons to different modules at any time.
- **Video & Embed Support**:
  - Accept YouTube watch, youtu.be, shorts, live, playlist (`videoseries`), and embed URLs with live thumbnail preview.
  - Privacy-enhanced embedded YouTube playback (`youtube-nocookie.com`).
- **Learning Tracking**:
  - Mark lessons and playlists complete/incomplete; automatically remembers last watched position.
  - Distraction-free theatre mode, quick module drawer, and direct links to linked notes, PDFs, and visual diagrams.

### 4. Learning Analytics
- Tracked study time, active days, streak, and 7-day consistency chart
- Manual study timer in the lesson player with browser tab visibility detection

### 5. Settings & Complete Backup Portability
- **Export Backup**: Download a single JSON file containing all your courses, modules, lessons, analytics sessions, saved pictures, created notes, and stored PDFs.
- **Import Backup**: Restore your complete library on any device or browser.
- **Reset Library**: Clear all courses, pictures, notes, and PDFs from client storage with confirmation.

## Data and privacy
- FocusLearn data is stored directly in your browser (`courses` & `sessions` in `localStorage`, `pictures` & `documents` in `IndexedDB`).
- No user data is sent to any external server.
- Everything runs 100% client-side.
