// Experiencia y nivel por juego. Cada minuto que jugás (con la pantalla prendida y tocando) suma XP
// a ese juego; ganar una partida online suma más. Se junta en el dispositivo y se manda a la billetera
// (billeteras/{uid}: stats.juegos.{juego}.xp y xp total), así se ve en tu perfil y en el de tus amigos.
const FIRESTORE = "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
const XP_MINUTO = 5;
const PENDIENTE = "xp-pendiente"; // XP que todavía no se mandó: { juego: n }
const CACHE = "xp-juegos"; // última XP conocida de cada juego (para mostrar el nivel sin esperar a la nube)

// Nivel 2 a los 40 XP, 3 a los 160, 4 a los 360… (cada nivel cuesta un poco más)
export const nivelDe = (xp = 0) => Math.floor(Math.sqrt(Math.max(0, xp) / 40)) + 1;
export const xpDelNivel = (n) => 40 * (n - 1) ** 2;
// { nivel, actual, falta, porcentaje } para dibujar la barra hasta el próximo nivel
export function progresoNivel(xp = 0) {
    const nivel = nivelDe(xp);
    const desde = xpDelNivel(nivel);
    const hasta = xpDelNivel(nivel + 1);
    return { nivel, actual: xp - desde, total: hasta - desde, falta: hasta - xp, porcentaje: Math.round(((xp - desde) / (hasta - desde)) * 100) };
}

// Juego de la página actual (la carpeta: games/pool/ → "pool")
export const claveJuego = () => location.pathname.match(/\/games\/([^/]+)\//)?.[1] ?? null;

function leer(clave) {
    try {
        return JSON.parse(localStorage.getItem(clave) || "{}");
    } catch {
        return {};
    }
}
function escribir(clave, valor) {
    try {
        localStorage.setItem(clave, JSON.stringify(valor));
    } catch {}
}

// Lista de juegos (js/juegos.js es un script común: si la página no lo cargó, se agrega)
let catalogoCargado = null;
export function catalogo() {
    // eslint-disable-next-line no-undef
    if (typeof JUEGOS !== "undefined") return Promise.resolve(JUEGOS);
    catalogoCargado ??= new Promise((ok) => {
        const s = document.createElement("script");
        s.src = new URL("./juegos.js", import.meta.url).href;
        // eslint-disable-next-line no-undef
        s.onload = () => ok(typeof JUEGOS !== "undefined" ? JUEGOS : []);
        s.onerror = () => ok([]);
        document.head.appendChild(s);
    });
    return catalogoCargado;
}

// Guarda la XP de cada juego que vino de la nube (la usa la página principal para las insignias)
export function recordarXp(stats) {
    const juegos = stats?.juegos ?? {};
    const xp = Object.fromEntries(Object.entries(juegos).map(([j, r]) => [j, r?.xp ?? 0]));
    escribir(CACHE, xp);
}
export const xpGuardada = () => leer(CACHE);
// XP que ya se mandó a la nube por otro lado (premios de partidas online)
export function anotarXp(juego, cantidad) {
    const xp = leer(CACHE);
    xp[juego] = (xp[juego] ?? 0) + cantidad;
    escribir(CACHE, xp);
}

// ---------- Mientras se juega ----------
let nube = null; // { fs, ref }
let mandando = false;

async function conectar() {
    try {
        if (location.hostname === "localhost" && localStorage.getItem("modo-prueba") === "1") return null;
    } catch {}
    const { usuarioActual, app } = await import("./sesion.js");
    const usuario = await usuarioActual();
    if (!usuario || !app) return null;
    const fs = await import(FIRESTORE);
    nube = { fs, ref: fs.doc(fs.getFirestore(app), "billeteras", usuario.uid) };
    return nube;
}

// Manda toda la XP juntada (de este juego y de otros que hayan quedado sin mandar)
async function mandar() {
    const pendiente = leer(PENDIENTE);
    const juegos = Object.entries(pendiente).filter(([, n]) => n > 0);
    if (!nube || mandando || !juegos.length) return;
    mandando = true;
    const { fs, ref } = nube;
    const total = juegos.reduce((s, [, n]) => s + n, 0);
    const cambios = { xp: fs.increment(total) };
    for (const [j, n] of juegos) cambios[`stats.juegos.${j}.xp`] = fs.increment(n);
    try {
        await fs.updateDoc(ref, cambios);
        // Se descuenta lo mandado (mientras tanto pudo sumarse más)
        const ahora = leer(PENDIENTE);
        for (const [j, n] of juegos) ahora[j] = Math.max(0, (ahora[j] ?? 0) - n);
        escribir(PENDIENTE, ahora);
        juegos.forEach(([j, n]) => anotarXp(j, n));
    } catch {}
    mandando = false;
}

function aviso(html, color = "#ffd166") {
    const el = document.createElement("div");
    el.innerHTML = html;
    Object.assign(el.style, {
        position: "fixed", left: "50%", bottom: "calc(18px + env(safe-area-inset-bottom))", transform: "translate(-50%, 30px)",
        zIndex: 998, padding: "8px 14px", borderRadius: "999px", background: "#14102ee6", color: "#fff",
        border: `2px solid ${color}`, font: "800 0.85rem system-ui, sans-serif", boxShadow: "0 8px 24px #0009",
        whiteSpace: "nowrap", opacity: "0", transition: "opacity 0.35s, transform 0.35s", pointerEvents: "none",
    });
    document.body.appendChild(el);
    requestAnimationFrame(() => Object.assign(el.style, { opacity: "1", transform: "translate(-50%, 0)" }));
    setTimeout(() => {
        Object.assign(el.style, { opacity: "0", transform: "translate(-50%, 30px)" });
        setTimeout(() => el.remove(), 400);
    }, 3200);
}

const xpActual = (juego) => (xpGuardada()[juego] ?? 0) + (leer(PENDIENTE)[juego] ?? 0);

// Suma XP a un juego (y avisa si subiste de nivel)
export function sumarXp(juego, cantidad) {
    if (!juego || !(cantidad > 0)) return;
    const antes = nivelDe(xpActual(juego));
    const pendiente = leer(PENDIENTE);
    pendiente[juego] = (pendiente[juego] ?? 0) + cantidad;
    escribir(PENDIENTE, pendiente);
    const despues = nivelDe(xpActual(juego));
    if (despues > antes && juego === claveJuego()) {
        navigator.vibrate?.([30, 40, 60]);
        aviso(`⭐ ¡Subiste a nivel ${despues}!`);
    }
}

function iniciar(juego) {
    let ultimoToque = 0;
    let activo = 0; // segundos jugando desde el último minuto contado
    const tocar = () => (ultimoToque = Date.now());
    for (const ev of ["pointerdown", "keydown", "touchstart"]) addEventListener(ev, tocar, { passive: true, capture: true });
    setInterval(() => {
        if (document.visibilityState !== "visible" || Date.now() - ultimoToque > 90000) return;
        activo += 15;
        if (activo >= 60) {
            activo -= 60;
            sumarXp(juego, XP_MINUTO);
        }
    }, 15000);
    conectar()
        .then(async (n) => {
            if (!n) return;
            // Nivel actual de este juego al entrar
            const d = await n.fs.getDoc(n.ref).catch(() => null);
            if (d?.exists()) recordarXp(d.data().stats);
            const p = progresoNivel(xpActual(juego));
            setTimeout(() => aviso(`🎮 Nivel ${p.nivel} · ${p.porcentaje}% al ${p.nivel + 1}`, "#7ee0ff"), 1200);
            mandar();
            setInterval(mandar, 120000);
            addEventListener("pagehide", mandar);
            document.addEventListener("visibilitychange", () => document.visibilityState === "hidden" && mandar());
        })
        .catch(() => {});
}

if (claveJuego()) iniciar(claveJuego());
