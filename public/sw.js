// オフラインでも遊べるようにする（requirements.md 2章）。
// 通信できるときは常に新しいものを取りに行き、取れたものを保存しておく。通信できないときは保存したものを使う
// 保存の仕方を変えたときだけ名前を変える。ビルドごとに変える必要はない
const CACHE = 'summoner-v72';

// 入れたときに、ページと、ページが読み込むファイル（ビルドで名前が変わる）を先に保存する
self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      const page = await fetch('./', { cache: 'no-cache' });
      const html = await page.clone().text();
      await cache.put('./', page);
      const files = [...html.matchAll(/(?:src|href)="\.?\/?((?:assets\/)[^"]+)"/g)].map((m) => `./${m[1]}`);
      await cache.addAll([...new Set([...files, './manifest.webmanifest', './icon-180.png', './icon-192.png'])]);
      // 前のビルドのファイルは、もう使わないので消す
      const current = new Set(files.map((f) => new URL(f, self.location).href));
      for (const key of await cache.keys()) {
        if (key.url.includes('/assets/') && !current.has(key.url)) await cache.delete(key);
      }
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys()) if (key !== CACHE) await caches.delete(key);
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      try {
        const response = await fetch(request);
        if (response.ok) await cache.put(request.mode === 'navigate' ? './' : request, response.clone());
        return response;
      } catch {
        // 開発用のサーバーなどは「Vary: Origin」を付けるので、それは見ないで探す
        const saved = await cache.match(request.mode === 'navigate' ? './' : request, { ignoreSearch: true, ignoreVary: true });
        return saved ?? Response.error();
      }
    })(),
  );
});
