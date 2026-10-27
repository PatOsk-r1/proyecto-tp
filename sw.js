// Service worker: guarda los archivos para que la app funcione sin internet.
// Cada vez que publiques cambios, subí el número de VERSION para que
// el iPhone descargue la versión nueva.
const VERSION = "v1";
const CACHE = `proyecto-tp-${VERSION}`;

const ARCHIVOS_BASE = [
    "./",
    "index.html",
    "manifest.webmanifest",
    "css/estilos.css",
    "js/juegos.js",
    "js/app.js",
    "icons/icon-180.png",
    "icons/icon-192.png",
    "icons/icon-512.png",
];

self.addEventListener("install", (evento) => {
    evento.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ARCHIVOS_BASE)));
    self.skipWaiting();
});

// Borra las versiones viejas
self.addEventListener("activate", (evento) => {
    evento.waitUntil(
        caches.keys().then((claves) =>
            Promise.all(claves.filter((c) => c !== CACHE).map((c) => caches.delete(c)))
        )
    );
    self.clients.claim();
});

// Responde rápido con lo guardado y actualiza en segundo plano.
// Así los juegos nuevos quedan guardados la primera vez que se abren.
self.addEventListener("fetch", (evento) => {
    const pedido = evento.request;
    if (pedido.method !== "GET" || !pedido.url.startsWith(self.location.origin)) return;

    evento.respondWith(
        caches.open(CACHE).then(async (cache) => {
            const guardado = await cache.match(pedido, { ignoreSearch: true });
            const deRed = fetch(pedido)
                .then((respuesta) => {
                    if (respuesta.ok) cache.put(pedido, respuesta.clone());
                    return respuesta;
                })
                .catch(() => guardado);
            return guardado || deRed;
        })
    );
});
