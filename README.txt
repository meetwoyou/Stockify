STOCKIFY PRO ULTRA — v5 (Standalone Build)
==========================================

FILES IN THIS FOLDER:
  index.html        — Main HTML (open this)
  app.js            — Application logic
  manifest.json     — PWA manifest (installable + offline)
  sw.js             — Service Worker (offline cache)
  icon-192.png      — App icon 192x192 (auto-generated)
  icon-512.png      — App icon 512x512 (auto-generated)
  icon-maskable.png — Maskable icon for Android adaptive (auto-generated)
  sabbir.jpg        — Developer photo (REPLACE this with your own photo,
                      same filename: sabbir.jpg). If missing, an "S" badge
                      will show instead.

WHAT'S NEW IN v5:
  1. Same barcode + same name now supports many expiry dates/batches.
     If the same date already exists, new stock is added into that date batch.
  2. Barcode scan now shows every date/batch for that product, total stock,
     and an Add Date button to add another purchase date quickly.
  3. Currency defaults to Saudi Riyal (ر.س). Other currencies can still be
     selected or added from Settings if needed.
  4. Image upload auto-compresses any size (even 10 MB) down to ~250 KB
     before uploading to Cloudinary. New "Camera" button opens the device
     camera so you can snap and upload instantly.
  5. Scanner is much more reliable: waits for the library to load, lists
     available cameras, prefers the back camera, falls back gracefully,
     and shows a clear error if something is wrong. HTTPS required
     (GitHub Pages works out of the box).
  6. Settings: Developer card now shows Website, Facebook, Instagram
     links. "Install App" button appears when your browser supports it
     (and a top banner pops up automatically on first eligible visit).

HOW TO RUN:
  1. Keep all files inside ONE folder.
  2. Camera (scanner) requires HTTPS or http://localhost.
     - Local: python -m http.server 8080  →  http://localhost:8080
     - Or push to GitHub Pages (https://USERNAME.github.io/REPO)
  3. First load needs internet (to cache assets). After that, the app
     works fully OFFLINE — products you've loaded stay available, and
     any edits sync automatically when you reconnect (Firestore offline
     persistence + Service Worker).

INSTALL TO HOME SCREEN:
  - On supported browsers (Chrome, Edge, Android), a banner appears on
    eligible visits, or use the "Install" button in Settings.
  - On iOS Safari: Share → Add to Home Screen.

PC + MOBILE:
  - Phone: in-app scanner uses the back camera.
  - PC: connect a USB barcode scanner — most act like a keyboard,
    so scanning into the SKU field works automatically.
