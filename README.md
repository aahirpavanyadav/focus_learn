# FocusLearn — Pictures & Visual Notes, Analytics + My Notes integration

FocusLearn is a distraction-free, privacy-first personal learning space built as a 100% static web application.

## Run
Open `index.html` in any modern web browser. No build step, framework, Node.js server, external database, API key, or backend is required.

## New Feature: Pictures & Visual Notes (Study Vault)
Store, edit, save, and delete study pictures and visual notes directly in your browser without any backend:
- **Save Pictures**:
  - Upload diagrams, formula sheets, whiteboard captures, screenshots, and handwritten notes.
  - Drag-and-drop onto the dropzone, click to browse files, or press `Ctrl+V` (`Cmd+V`) anywhere to paste directly from your clipboard.
  - Add details for each picture: Title, Category (Diagram, Formula, Cheatsheet, Lecture Note, Screenshot, Mindmap, Other), optional Link to a Course, and detailed study notes.
  - Automatic client-side canvas optimization: images are downscaled if oversized, saving space while maintaining crisp clarity.
- **Edit Pictures & Details**:
  - Edit picture title, category, linked course, and notes/explanations at any time.
  - Rotate pictures 90° clockwise with the rotate tool (perfect for whiteboard or textbook phone snapshots).
  - Replace or change the image file whenever needed.
- **View in Fullscreen Lightbox**:
  - Click any picture card to open an immersive high-resolution lightbox with zoom toggle and a full details sidebar.
- **Delete Pictures**:
  - Remove pictures with a single click and confirmation, instantly freeing client storage.
- **Download & Backup**:
  - Download original image files to your device.
  - Complete JSON backup export and import in Settings (includes courses, study sessions, and all pictures).

## Existing features
- Responsive dashboard, course management, learning player, and settings
- Create courses and group lessons into modules
- Accept YouTube watch, youtu.be, shorts, live, and embed URLs
- Validate YouTube video IDs and preview standard thumbnails
- Privacy-enhanced embedded YouTube playback
- Mark lessons complete/incomplete and remember last watched lesson
- Remove lessons and delete courses
- Edit course names, descriptions, and lesson titles/modules/URLs
- Learning Analytics with tracked study time, active days, streak, and 7-day chart
- Manual study timer in the lesson player with visibility detection
- My Notes workspace embedded from https://aahirpavanyadav.github.io/My-notes/
- Export/import full JSON backups
- 100% client-side persistence (IndexedDB + localStorage)

## Data and privacy
- FocusLearn data is stored directly in your browser (courses & sessions in `localStorage`, pictures in `IndexedDB`).
- No user data is sent to any external server.
- YouTube playback is embedded securely using YouTube's privacy-enhanced domain (`youtube-nocookie.com`).
