// Service worker: guarda los archivos para que la app funcione sin internet.
// publicar.ps1 sube solo el número de VERSION en cada publicación para que
// el iPhone descargue la versión nueva.
const VERSION = "v116";
const CACHE = `proyecto-tp-${VERSION}`;

const ARCHIVOS_BASE = [
    "./",
    "index.html",
    "manifest.webmanifest",
    "css/estilos.css",
    "css/juegos3d.css",
    "js/juegos.js",
    "js/app.js",
    "js/portadas.js",
    "js/sesion.js",
    "js/login.js",
    "js/firebase-config.js",
    "js/comun3d.js",
    "js/progreso.js",
    "js/emojis.js",
    "js/chats.js",
    "js/experiencia.js",
    "js/sonido.js",
    "js/incremental.js",
    "js/teclado.js",
    "js/ayuda.js",
    "login.html",
    "css/login.css",
    "amigos.html",
    "perfil.html",
    "js/perfil.js",
    "js/fichas.js",
    "css/amigos.css",
    "js/amigos.js",
    "js/multijugador.js",
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

// Además de los archivos propios, guarda las librerías externas (Firebase y
// Three.js para los juegos 3D) para que funcionen sin internet.
// Los pedidos de login a Firebase nunca se guardan.
const LIBRERIAS = ["https://www.gstatic.com/firebasejs/", "https://cdn.jsdelivr.net/npm/three@"];

// Archivos propios: primero la red (así nunca se mezclan archivos viejos y nuevos de un juego)
// y lo guardado solo si no hay internet. Librerías externas: primero lo guardado (no cambian).
self.addEventListener("fetch", (evento) => {
    const pedido = evento.request;
    const propio = pedido.url.startsWith(self.location.origin);
    const libreria = LIBRERIAS.some((prefijo) => pedido.url.startsWith(prefijo));
    if (pedido.method !== "GET" || !(propio || libreria)) return;

    evento.respondWith(
        caches.open(CACHE).then(async (cache) => {
            const guardado = await cache.match(pedido, { ignoreSearch: true });
            if (libreria && guardado) return guardado;
            try {
                const respuesta = await fetch(pedido, { cache: "no-cache" });
                if (respuesta.ok) cache.put(pedido, respuesta.clone());
                return respuesta;
            } catch {
                return guardado || Response.error();
            }
        })
    );
});
