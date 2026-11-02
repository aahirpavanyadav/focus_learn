# FocusLearn — Analytics + My Notes integration

## Run
Open `index.html` in a modern browser. No build step, framework, backend, database,
external library, or API key is required.

## New in this release
- Learning Analytics page with total tracked study time, active days, current streak,
  completed lesson count, last-seven-days activity chart, course progress, and recent sessions.
- Manual study timer in the lesson player. Time is counted only while the timer is running
  and the browser tab remains visible. Switching tabs or leaving the player saves the session.
- My Notes workspace embedded from https://aahirpavanyadav.github.io/My-notes/ with an
  “Open in new tab” fallback.

## Existing features
- Responsive dashboard, course management, learning player, and settings
- Create courses and group lessons into modules
- Accept YouTube watch, youtu.be, shorts, live, and embed URLs
- Validate YouTube video IDs and preview standard thumbnails
- Privacy-enhanced embedded YouTube playback
- Mark lessons complete/incomplete and remember last watched lesson
- Remove lessons and delete courses
- Export/import JSON backups (now includes analytics sessions)
- LocalStorage persistence

## Data and privacy limitations
- FocusLearn data is stored in this browser's localStorage.
- My Notes is a separate origin/domain and has its own browser storage. FocusLearn cannot
  directly access its note contents or combine its backup with the FocusLearn JSON file.
  Use the My Notes app's own Export function for its notes.
- The My Notes host may disallow iframe embedding in some browser/hosting configurations.
  If the embedded view is blank or blocked, click “Open in new tab”.
- Study time is measured by the explicit FocusLearn timer, not by reading YouTube playback
  state. The YouTube iframe does not provide reliable watch-time data to this static app.
- YouTube thumbnails and videos need internet access; some videos disable embedding.
- Static-only code cannot securely provide real multi-user accounts, cross-device sync,
  or server-enforced admin/user permissions.


## Notes page layout fix
The My Notes iframe now has explicit full-width and tall responsive dimensions in both
inline styles and the stylesheet, avoiding the browser's default small iframe dimensions.
The fallback link is also available directly beneath the embedded workspace.
