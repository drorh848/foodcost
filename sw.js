// Service Worker — FoodCost offline support
// גרסה 2.3
const CACHE_NAME = 'foodcost-v5';

const PRECACHE = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  'https://fonts.googleapis.com/css2?family=Heebo:wght@300;400;500;700;900&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
  'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js',
  'https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js',
  'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js'
];

// התקנה — שמור הכל ב-cache
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

// הפעלה — נקה גרסאות ישנות
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// בקשות — network first ל-HTML (תמיד גרסה חדשה), cache first לשאר
self.addEventListener('fetch', event => {
  const url = event.request.url;

  // בקשות Firebase database (נתונים) — תמיד רשת, בלי cache
  if (url.includes('firebasedatabase.app') || url.includes('identitytoolkit') || url.includes('securetoken')) {
    return;
  }

  // דף ה-HTML עצמו — network first: תמיד מנסה גרסה חדשה, cache רק בלי רשת
  if (event.request.mode === 'navigate' || url.endsWith('index.html') || url.endsWith('/')) {
    event.respondWith(
      fetch(event.request).then(response => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => caches.match(event.request).then(c => c || caches.match('./index.html')))
    );
    return;
  }

  // ספריות/פונטים/אייקונים — cache first עם עדכון ברקע
  event.respondWith(
    caches.match(event.request).then(cached => {
      const fetchPromise = fetch(event.request).then(response => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => cached);
      return cached || fetchPromise;
    })
  );
});
