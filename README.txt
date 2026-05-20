STOCKIFY PRO ULTRA — Standalone Build
======================================

FILES IN THIS FOLDER:
  index.html      — Main HTML (open this)
  app.js          — Application logic
  manifest.json   — PWA manifest (installable + offline)
  sw.js           — Service Worker (offline cache)
  sabbir.jpg      — Developer photo (REPLACE this with your own photo,
                    same filename: sabbir.jpg). If missing, an "S" badge
                    will show instead.

HOW TO RUN:
  1. Keep all files inside ONE folder.
  2. Camera (scanner) requires HTTPS or http://localhost.
     - For local testing run:  python -m http.server 8080
       then open: http://localhost:8080
     - Or upload to GitHub Pages / Netlify / Vercel for HTTPS.
  3. First load needs internet (to cache assets).
     After that, the app works fully OFFLINE — products you've already
     loaded stay available, and any edits sync automatically when you
     reconnect (Firestore offline persistence + Service Worker).

FEATURES:
  • Auto-start scanner when you open the Scanner page.
  • Scan known SKU  →  product details modal opens instantly.
  • Scan unknown SKU →  Add Product form opens with SKU pre-filled.
  • Offline-ready: shell + data cache via Service Worker + IndexedDB.
  • Developer info in Settings (Sabbir Hosen Akash + photo).
