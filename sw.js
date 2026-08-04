const CACHE_NAME = 'ledu-english-v1';
const ASSETS = [
    './',
    './index.html',
    './styles.css',
    './manifest.json',
    './js/storage.js',
    './js/parser.js',
    './js/sm2.js',
    './js/questions.js',
    './js/tts.js',
    './js/app.js'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
    );
    self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request);
        }).catch(() => caches.match('./index.html'))
    );
});
