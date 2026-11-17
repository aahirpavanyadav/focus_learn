# FocusLearn — Courses, Playlists, Pictures, Notes & PDF Library, Analytics

FocusLearn is a distraction-free, privacy-first personal learning space built as a 100% static web application.

## Run
Open `index.html` in any modern web browser. No build step, framework, Node.js server, external database, API key, or backend is required.

## Features

### 1. Smart Instagram-Style Navbar & Mobile Bar
FocusLearn features a clean, modern navigation architecture inspired by Instagram:
- **Clean Desktop Topbar with Frosted Glassmorphism**:
  - Replaced the fixed side navbar with an ultra-clean, sticky top navigation bar featuring background blur (`backdrop-filter: blur(20px)`), brand mark, pill tab links, live study indicators, and dynamic badge counters.
  - Generates significant horizontal breathing room for the multi-course management view, responsive course cards, video player, and document vaults.
  - **Insta-Inspired ＋ Create Button & Quick Menu**:
    - Tap **＋ Create** to reveal a quick dropdown menu to instantaneously scaffold a **New Course**, add a **Single Video Lesson**, add a **YouTube Playlist**, upload a **Picture**, write a **Formatted Note**, or import a **PDF Document**.
    - Fully accessible with keyboard navigation (`Escape` closes menu) and click-outside dismissal.
  - **Quick Theme Mode Switcher**: Instant 1-click toggle between Dark Mode and White / Light Mode right in the navbar.
  - **Settings & Profile Pill**: Fast access to appearance settings, color combos, and local storage status.
- **Instagram-Style Mobile Bottom Bar**:
  - Thumb-friendly fixed bottom bar on mobile screens (< 760px) with 6 iconic navigation tabs: `Home`, `Courses`, `Study`, `Pictures`, `Notes`, and `Settings`.
  - Floating, non-intrusive layout optimized for one-handed mobile navigation.

### 2. Notes & PDF Library (Document Vault)
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

### 3. Google Calendar Option & DayFlows Planner Integration
Stay consistent and plan your study routine with seamless 1-click access to Google Calendar and interactive DayFlows timeline integration:
- **1-Click Google Calendar Access**:
  - **Navbar Quick Calendar Button**: Instant 1-click **Calendar** button in the Instagram-style top navigation bar to open your study schedule.
  - **Quick Create Menu**: Open Quick Create (**＋ Create**) and click **Google Calendar** or **DayFlows Planner** from anywhere in the app.
  - **Direct Web Access Cards**: 1-click launch card opens `https://calendar.google.com/calendar/r` directly in your browser.
  - **Study Block Event Scheduler**:
    - Select your target course, enter lesson or revision topic, pick date, start time, duration (30 min, 45 min, 1 hr, 1.5 hr, 2 hrs chips), and optional learning notes.
    - Click **Add to Google Calendar ↗** to automatically generate a prefilled Google Calendar web intent URL (`action=TEMPLATE&text=...&dates=...&details=...&location=FocusLearn`).
    - Opens Google Calendar in a new tab with your study block preconfigured, ready to save with 1 click.
  - **Course Card & Player Scheduling**:
    - Click **📅 Schedule** on any course card in Course Management to schedule a study block specifically for that course.
    - Click **📅 Schedule** inside the video lesson player while studying to immediately book your next study session for that lesson.
- **DayFlows Integration (`https://dayflows.blogspot.com/?m=1`)**:
  - **Live Interactive Timeline Planner**: Embedded directly inside FocusLearn via a secure, responsive iframe (`https://dayflows.blogspot.com/?m=1`).
  - Plan your daily routine, arrange time-blocked learning sessions, schedule sleep/wake cycles, and manage task buckets right alongside your courses.
  - **DayFlows Controls**:
    - **🔄 Reload**: Refresh the embedded DayFlows frame at any time without reloading FocusLearn.
    - **⛶ Expand / Minimize**: Toggle an expanded, distraction-free widescreen view of the DayFlows daily planner.
    - **↗ Open in Tab**: Quick button to open DayFlows in a dedicated browser tab.
  - **Dedicated Schedule & Flow Page**:
    - Clean dual-tab view switching seamlessly between **⏳ DayFlows Timeline Planner** and **📅 Google Calendar & Study Scheduler**.
    - Stat card on the Dashboard gives 1-click access to your daily routine.

### 4. Screenshot Capture, Course Screenshot Folders & Visual Study Vault
- **Course Screenshot Folders**:
  - Organize screenshots directly inside courses using custom folders (e.g. `Lecture Slides`, `DSA Diagrams`, `Code Snippets`, `Formulas`, `General`).
  - Create new folders inside any course via **＋ New Folder** or inline folder modal.
  - Rename or delete custom folders anytime (deleting a folder safely migrates its screenshots back to `General`).
  - Each course card in Course Management displays a direct **📂 Screenshots & Folders (N)** button that opens that course's screenshot workspace.
- **Zero-Prompt Direct Paste & Drag-and-Drop (Instant Save)**:
  - Open any folder inside a course to enter the **Direct Instant Save Zone**.
  - **Direct Paste (`Ctrl+V`)**: Press `Ctrl+V` anywhere to paste clipboard screenshots directly into the active course folder without any modal popping up or asking for title/details.
  - **Direct Drag & Drop**: Drop single or multiple image files directly onto the folder dropzone — all images save instantly into the selected folder with zero forms or prompts.
  - **Direct Screen Snapshot**: Click **📸 Snap Screen Direct** (or **📸 Snapshot** in the video player) to capture your screen and save directly to the course folder without interruptions.
- **Add / Edit Details Later**:
  - Add or modify picture details whenever you want: click **Edit** on any screenshot card to customize its Title, Folder assignment, Category, Tags, Linked Course, and Study Notes & Details.
- **Comprehensive Categorization & Tags**:
  - Categorize visual study artifacts: `Screenshot`, `Code Screenshot`, `Lecture Slide`, `Diagram`, `Formula`, `Whiteboard`, `Mindmap`, `Cheatsheet`, or `Other`.
  - Add custom space- or comma-separated tags (e.g. `#dsa #tree #binarysearch`) for granular multi-tag retrieval.
  - Category filter pills (`📸 Screenshots`, `💻 Code`, `📝 Slides`, `📊 Diagrams`, `📐 Formulas`, `📋 Whiteboard`) in the Pictures Vault for 1-click filtering.
- **Fullscreen Lightbox**: View full-resolution images with category badges, folder badge, tag pills, zoom toggle, and details sidebar.
- **Download & Delete**: Save picture files locally or remove them with confirmation.

### 5. Universal Smart Adder (`Ctrl+K` / `⌘K`)
- **One Universal Intake for All Study Content**:
  - Accessible from anywhere by pressing `Ctrl+K` / `⌘K`, clicking **⚡ Smart Add** in the navbar, or choosing it in Course Management or Quick Create.
  - Simply paste a link, drop a file, or type text — the auto-detection engine instantaneously recognizes the content type:
    - **📺 Single YouTube Video**: Auto-extracts video ID and displays live thumbnail preview.
    - **📑 YouTube Playlist**: Auto-extracts playlist ID and offers 1-click import into a course module.
    - **📸 Screenshot / Image**: Instant paste or capture with image preview, dimensions, and category assignment.
    - **📝 Study Note**: Auto-detects multi-line text and markdown headings, generating a structured study note with target course linking.
    - **📄 PDF Document**: Drag-and-drop or file upload with auto-detection of PDF documents.
    - **📦 FocusLearn Course Package**: Detects shared course JSON packages and routes directly to course import.
- **1-Click Add & Inline Course Creation**: Select an existing course or choose `＋ Create new course...` directly inside the Smart Adder modal.

### 6. Course Sharing & Receiving (JSON & Peer-to-Peer URL)
- **Share Courses via JSON**:
  - Click **↗ Share** on any course card in Course Management to open the Course Share Hub.
  - **Copy JSON**: Copies the clean, portable JSON package (`FocusLearn_Course`) to clipboard.
  - **Download JSON**: Generates a downloadable `FocusLearn-Course-[Name].json` file containing all course modules, lessons, and playlist entries.
  - **Shareable URL Hash**: Generates a shareable URL containing the encoded course package (`#course_json=...`). Opening this link on any device automatically opens the Receive Course dialog with the course pre-loaded!
- **Receive Courses via JSON**:
  - Click **📥 Receive Course** in Course Management (or in Quick Create).
  - Paste course JSON text or drop a `.json` file.
  - **Interactive Real-Time Preview**: Displays course title, category, theme color, module count, lesson list, and validation status before importing.
  - **Smart Conflict Handling**: Choose to **Import as new course** (generates fresh unique IDs, preserving your existing courses) or **Update existing course** if you are updating a shared syllabus.

### 7. Courses, Multi-Course Smart Management & YouTube Playlists
- Group lessons and playlists into customizable courses and organized modules.
- **Smart Multi-Course Management (for managing dozens of courses)**:
  - **Live Search**: Instant real-time search across Course Titles, Categories, Descriptions, Module names, Lesson titles, and Playlist contents.
  - **Category Filtering & Badges**: Organize courses with clear categories (Programming, Computer Science & AI, Design & UI/UX, Academics & Science, Languages, Business & Finance, Personal Development, General, Other).
  - **Status Filtering**: Instantly isolate courses by completion state (`All Status`, `In progress 1-99%`, `Completed 100%`, `Not started 0%`).
  - **Sort Options**: Sort by `Recently added`, `Title (A-Z)`, `Title (Z-A)`, `Progress (Highest)`, `Progress (Lowest)`, `Most lessons`, and `Oldest first`.
  - **Collapsible Course Cards (Accordion)**:
    - Click any course card header (or chevron `▼`/`▶`) to collapse or expand its modules and lessons.
    - Collapsed courses transform into sleek, compact summary cards showing title, category badge, lesson count, module breakdown, and inline progress bar.
    - One-click **▼ Expand all** and **▲ Collapse all** toggles to view your entire curriculum or keep a zero-clutter workspace.
  - **Sleek Course Editor Modal**: Edit Course Name, Category, and Description with a clean modal dialog.
  - **Dashboard Multi-Course Search & Quick Filters**: Search and filter courses directly from the main Dashboard hub.

- **YouTube Playlist Support & Dedicated Side Panel**:
  - Add full YouTube playlists by playlist URL (`youtube.com/playlist?list=...`) or playlist ID (`PL...`, `UU...`, `FL...`, `RD...`, `OLAK...`).
  - **Dedicated Playlist Side Panel in Learning Space**:
    - When a playlist is active, the player sidebar automatically switches to a dedicated **Playlist Videos** tab.
    - Shows all videos in that YouTube playlist with thumbnail, track index, title, completed status, and active playing indicator (`▶`).
    - **One-Click Play**: Click any video in the playlist side panel to immediately load and play it in the main player with continuous playlist context!
    - **Individual Video Tracking**: Mark individual playlist videos complete (`✓`/`○`) with live course progress calculation.
    - **Edit & Delete Playlist Videos**: Click `✎` to edit any video's title or URL, or `🗑` to delete it directly from the playlist side panel.
    - **Quick Add & Paste**: Add single videos (`＋ Add`) or bulk-paste video links (`📋 Paste`) directly into the active playlist.
    - **Auto-Fetch from YouTube**: Click `⚡ Fetch` to attempt automatically retrieving playlist video titles and IDs via public YouTube feeds.
    - **Full Series Mode**: Click `≡ Series` to switch to continuous full playlist playback.
  - **Course Management Expanded Sublist**:
    - In Course Management, playlists display their video count and an expandable `▼ Videos (X)` sublist.
    - Directly manage, play, edit, add, or delete individual videos in the playlist from Course Management.
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

### 8. Learning Analytics
- Tracked study time, active days, streak, and 7-day consistency chart
- Manual study timer in the lesson player with browser tab visibility detection

### 9. Settings, Dark & White Themes, UI/UX Combos & Portability
- **Dark and White / Light Mode Engine**:
  - Seamless 1-click **☀️ White Theme / 🌙 Dark Theme toggle** in the Topbar header and in Settings.
  - **White / Light Theme**: Pure white studio canvas, crisp slate typography, gentle card elevations, high-contrast borders, and clean readability for bright daylight.
  - **Dark Theme**: Deep obsidian surfaces, high contrast, reduced eye fatigue, and glowing accents for late-night sessions.
- **UI/UX Color Combos & Themes Panel**:
  - Choose between 5 carefully tuned color combinations designed for long study sessions:
    1. **Cosmic Violet** (Default): Electric violet & purple.
    2. **Emerald Mint**: Fresh forest sage & lush emerald mint.
    3. **Cyberpunk Amber**: Radiant golden amber & honey slate.
    4. **Oceanic Cyan**: Nordic arctic cyan & sky blue.
    5. **Crimson Rose**: Vibrant ruby coral & rose.
  - Every UI element dynamically updates in both dark and white modes: sidebar, topbar, cards, inputs, buttons, video player, playlist panel, notes reader, pdf viewer, lightbox, analytics charts, and badges.
  - Theme mode and palette choices persist in `localStorage` and are preserved across sessions and JSON backups.
- **Export Backup**: Download a single JSON file containing all your courses, modules, lessons, playlist videos, analytics sessions, visual pictures, created notes, stored PDFs, and theme settings.
- **Import Backup**: Restore your complete library on any device or browser.
- **Reset Library**: Clear all courses, pictures, notes, and PDFs from client storage with confirmation.

## Data and privacy
- FocusLearn data is stored directly in your browser (`courses` & `sessions` in `localStorage`, `pictures` & `documents` in `IndexedDB`).
- No user data is sent to any external server.
- Everything runs 100% client-side.
