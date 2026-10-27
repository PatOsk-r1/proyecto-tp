// Service worker: guarda los archivos para que la app funcione sin internet.
// publicar.ps1 sube solo el número de VERSION en cada publicación para que
// el iPhone descargue la versión nueva.
const VERSION = "v3";
const CACHE = `proyecto-tp-${VERSION}`;

const ARCHIVOS_BASE = [
    "./",
    "index.html",
    "manifest.webmanifest",
    "css/estilos.css",
    "js/juegos.js",
    "js/app.js",
    "js/sesion.js",
    "js/login.js",
    "js/firebase-config.js",
    "login.html",
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

// Además de los archivos propios, guarda la librería de Firebase para que
// la sesión funcione sin internet. Los pedidos de login a Firebase nunca se guardan.
const FIREBASE_SDK = "https://www.gstatic.com/firebasejs/";

// Responde rápido con lo guardado y actualiza en segundo plano.
// Así los juegos nuevos quedan guardados la primera vez que se abren.
self.addEventListener("fetch", (evento) => {
    const pedido = evento.request;
    const propio = pedido.url.startsWith(self.location.origin);
    if (pedido.method !== "GET" || !(propio || pedido.url.startsWith(FIREBASE_SDK))) return;

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
