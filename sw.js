const CACHE = 'classdraw-v3';
const ASSETS = ['./','./index.html','./app.js','./style.css','./manifest.json','./icon-192.png','./icon-512.png','./apple-touch-icon.png'];
self.addEventListener('install', e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate', e=>{
  e.waitUntil(caches.keys().then(keys=>Promise.all(keys.map(k=>{ if(k!==CACHE) return caches.delete(k); }))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch', e=>{
  if(e.request.method!=='GET') return;
  e.respondWith(
    caches.match(e.request).then(hit=>{
      const fetched = fetch(e.request).then(res=>{
        if(res && res.status===200 && e.request.url.startsWith(self.location.origin)){
          const clone=res.clone();
          caches.open(CACHE).then(c=>c.put(e.request, clone));
        }
        return res;
      }).catch(()=>hit);
      return hit || fetched;
    })
  );
});