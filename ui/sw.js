/* VD-ATTR-v1:​‌‌​‌‌​​​‌‌​‌​​‌​‌‌​‌‌‌​​‌‌​‌​‌​​‌‌‌​‌​‌​‌‌​​‌​‌​‌‌​​​‌‌​‌‌​‌​​​​‌‌​​​​‌​‌‌​‌‌‌​​‌‌​​‌‌‌​​‌​‌‌‌‌​‌‌​‌​​‌​‌‌‌​​‌​​‌‌​‌‌‌‌​‌‌​‌‌‌​​‌‌​‌‌​‌​‌‌​​​​‌​‌‌​‌‌‌​​‌‌​‌‌​​​‌​​​​​​​‌‌‌​​​‌​‌‌‌​​​‌​​‌​‌‌‌​​‌‌​​​‌‌​‌‌​‌‌‌‌​‌‌​‌‌​‌:END */
// Cache the app shell only. Authentication, task data and video files are never cached.
const CACHE='videodock-shell-v1';
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(['/','/style.css','/app.js','/icon.svg']))));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))));
self.addEventListener('fetch',e=>{const u=new URL(e.request.url);if(e.request.method!=='GET'||u.origin!==self.location.origin||u.pathname.startsWith('/api/'))return;e.respondWith(fetch(e.request).catch(()=>caches.match(e.request)));});
