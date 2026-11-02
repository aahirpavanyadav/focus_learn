# FocusLearn — Final static build

## Run
Extract the folder and open `index.html` in a modern browser. No build step,
framework, backend, database, external library, or API key is required.

## Features
- Responsive dashboard, course management, learning player, and settings
- Create courses and group lessons into modules
- Accept YouTube watch, youtu.be, shorts, live, and embed URLs
- Validate YouTube video IDs and preview standard thumbnails
- Privacy-enhanced embedded YouTube playback
- Mark lessons complete/incomplete and remember last watched lesson
- Calculate course and overall progress
- Remove lessons and delete courses
- Export/import validated JSON backups
- LocalStorage persistence

## Important limitations
- Course data and progress are stored in this browser only.
- YouTube thumbnails and embedded playback require internet access. Some videos
  cannot be embedded because of the owner's settings.
- Static-only code cannot securely provide real multi-user accounts, cross-device
  synchronization, or server-enforced admin/user permissions.
- Arbitrary YouTube titles cannot be fetched reliably without an external API.
  Lessons use generated labels such as “YouTube lesson 1”.
- Export backups before clearing browser data or moving devices.
