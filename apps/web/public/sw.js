/* StockOps mobile service worker
 * Strategy:
 *  - Precache: app shell for /mobile so the first paint works offline.
 *  - Runtime cache: navigation requests fall back to /mobile/offline when the network is down.
 *  - Offline Sync Queue: POST/PUT/DELETE requests are queued in IndexedDB when offline.
 */

const CACHE_VERSION = "v2";
const SHELL_CACHE = `stockops-shell-${CACHE_VERSION}`;
const OFFLINE_URL = "/mobile/offline";
const SYNC_DB = "stockops-sync-db";
const SYNC_STORE = "sync-queue";

const PRECACHE_URLS = [
  "/mobile",
  "/mobile/receive",
  "/mobile/pick",
  "/mobile/stocktake",
  OFFLINE_URL,
  "/manifest.webmanifest",
  "/icons/icon-192.svg",
  "/icons/icon-512.svg",
  "/icons/icon-maskable.svg",
];

// --- IndexedDB Helpers ---
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(SYNC_DB, 1);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(SYNC_STORE)) {
        db.createObjectStore(SYNC_STORE, { keyPath: "id", autoIncrement: true });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function saveToQueue(requestData) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(SYNC_STORE, "readwrite");
    const store = tx.objectStore(SYNC_STORE);
    store.add(requestData);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}

async function getQueue() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(SYNC_STORE, "readonly");
    const store = tx.objectStore(SYNC_STORE);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function deleteFromQueue(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(SYNC_STORE, "readwrite");
    const store = tx.objectStore(SYNC_STORE);
    store.delete(id);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}

// --- Sync Manager ---
async function syncQueue() {
  try {
    const queue = await getQueue();
    for (const item of queue) {
      try {
        const headers = new Headers(item.headers);
        const req = new Request(item.url, {
          method: item.method,
          headers,
          body: item.body,
        });
        await fetch(req);
        await deleteFromQueue(item.id);
      } catch (err) {
        console.error("Sync failed for item", item.id, err);
        // İlgili işlem başarısız olduysa veya ağ henüz gelmediyse sıradakileri bekletir.
      }
    }
  } catch (e) {
    console.error("Queue sync error:", e);
  }
}

self.addEventListener("sync", (event) => {
  if (event.tag === "stockops-sync") {
    event.waitUntil(syncQueue());
  }
});

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .catch(() => undefined)
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith("stockops-shell-") && key !== SHELL_CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") {
    self.skipWaiting();
  } else if (event.data === "FORCE_SYNC") {
    syncQueue();
  }
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (url.origin !== self.location.origin) {
    return;
  }

  // Sadece Mutasyonlar için (Offline Sync Queue)
  if (request.method !== "GET") {
    event.respondWith(
      fetch(request.clone()).catch(async () => {
        const reqClone = request.clone();
        
        let bodyContent = null;
        const contentType = reqClone.headers.get("content-type") || "";
        
        // Form veya diğer verileri ArrayBuffer (blob) olarak okumak daha güvenlidir
        if (contentType.includes("multipart/form-data") || contentType.includes("application/x-www-form-urlencoded")) {
           bodyContent = await reqClone.arrayBuffer();
        } else {
           bodyContent = await reqClone.text();
        }

        const headersObj = {};
        for (const [key, value] of reqClone.headers.entries()) {
           headersObj[key] = value;
        }

        await saveToQueue({
          url: reqClone.url,
          method: reqClone.method,
          headers: headersObj,
          body: bodyContent,
          timestamp: Date.now()
        });

        if ("sync" in self.registration) {
          try {
            await self.registration.sync.register("stockops-sync");
          } catch(e) {
            console.error("Sync registration failed", e);
          }
        }
        
        // Uygulamanın çökmaması için 202 Accepted dönüyoruz.
        return new Response(
          JSON.stringify({ status: "queued", message: "Çevrimdışı: İşlem kuyruğa alındı." }), 
          {
            status: 202,
            headers: { "Content-Type": "application/json" }
          }
        );
      })
    );
    return;
  }

  // Normal Navigasyon ve GET İstekleri
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(async () => {
        const cache = await caches.open(SHELL_CACHE);
        const fallback = await cache.match(OFFLINE_URL);
        return fallback || Response.error();
      }),
    );
    return;
  }

  if (
    url.pathname.startsWith("/icons/") ||
    url.pathname === "/manifest.webmanifest"
  ) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            const copy = response.clone();
            caches.open(SHELL_CACHE).then((cache) => cache.put(request, copy));
            return response;
          }),
      ),
    );
  }
});
