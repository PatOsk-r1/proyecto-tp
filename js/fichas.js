// Fichas del casino: una sola billetera para todos los juegos de casino y los desafíos con apuesta.
// Se guarda en este dispositivo y, con sesión iniciada, también en la nube (Firestore: billeteras/{uid}),
// así se pueden regalar fichas a amigos y el saldo es el mismo en todos tus dispositivos.
const CLAVE = "casino-fichas";
const CLAVE_RECARGA = "casino-recarga";
const INICIAL = 1000;
export const RECARGA = 500; // una vez por día
export const LIMITE_APUESTA = 10_000_000;

const FIRESTORE = "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

function leer() {
    try {
        const guardado = localStorage.getItem(CLAVE);
        if (guardado !== null) return Number(guardado);
        // La primera vez se traen las fichas que había en el blackjack
        const blackjack = JSON.parse(localStorage.getItem("blackjack") || "null");
        return blackjack?.fichas ?? INICIAL;
    } catch {
        return INICIAL;
    }
}

function escribir(valor) {
    try {
        localStorage.setItem(CLAVE, Math.max(0, Math.round(valor)));
    } catch {}
    dispatchEvent(new CustomEvent("fichas"));
}

export const fichas = () => leer();

// ---------- Nube ----------
let nube = null; // { fs, ref }
let pendiente = 0; // cambios locales que todavía no se mandaron
let temporizador = 0;
let recargaNube = null;

function mandar() {
    clearTimeout(temporizador);
    if (!nube || !pendiente) return;
    const delta = pendiente;
    pendiente = 0;
    nube.fs.updateDoc(nube.ref, { fichas: nube.fs.increment(delta), actualizada: nube.fs.serverTimestamp() }).catch(() => {
        pendiente += delta;
    });
}

export function cambiarFichas(cantidad) {
    const antes = leer();
    const nuevo = Math.max(0, Math.round(antes + cantidad));
    escribir(nuevo);
    pendiente += nuevo - antes;
    clearTimeout(temporizador);
    temporizador = setTimeout(mandar, 400);
    return nuevo;
}

const hoy = () => new Date().toLocaleDateString("sv"); // AAAA-MM-DD en hora local

function ultimaRecarga() {
    try {
        return recargaNube ?? localStorage.getItem(CLAVE_RECARGA) ?? "";
    } catch {
        return recargaNube ?? "";
    }
}

export const puedeRecargar = () => ultimaRecarga() !== hoy();

// Regalo diario: 500 fichas una vez por día
export function recargar() {
    if (!puedeRecargar()) return false;
    const dia = hoy();
    recargaNube = dia;
    try {
        localStorage.setItem(CLAVE_RECARGA, dia);
    } catch {}
    cambiarFichas(RECARGA);
    nube?.fs.updateDoc(nube.ref, { recarga: dia }).catch(() => {});
    return true;
}

// Aviso flotante (regalos recibidos)
export function avisoFichas(texto) {
    const el = document.createElement("div");
    el.className = "aviso-fichas";
    el.textContent = texto;
    Object.assign(el.style, {
        position: "fixed", left: "50%", top: "calc(12px + env(safe-area-inset-top))", transform: "translateX(-50%)",
        zIndex: 999, padding: "10px 16px", borderRadius: "14px", background: "#ffd166", color: "#2a1400",
        font: "800 0.95rem system-ui, sans-serif", boxShadow: "0 8px 24px #0008", maxWidth: "90vw", textAlign: "center",
        transition: "opacity 0.4s, transform 0.4s",
    });
    document.body.appendChild(el);
    setTimeout(() => {
        el.style.opacity = "0";
        el.style.transform = "translateX(-50%) translateY(-20px)";
        setTimeout(() => el.remove(), 500);
    }, 3500);
}

async function conectarNube() {
    try {
        if (location.hostname === "localhost" && localStorage.getItem("modo-prueba") === "1") return;
    } catch {}
    const { usuarioActual } = await import("./sesion.js");
    const usuario = await usuarioActual();
    if (!usuario) return;
    const [{ db }, fs] = await Promise.all([import("./multijugador.js"), import(FIRESTORE)]);
    if (!db) return;
    const ref = fs.doc(db, "billeteras", usuario.uid);
    const actual = await fs.getDoc(ref);
    if (!actual.exists()) {
        // Primera vez en la nube: se suben las fichas que había en este dispositivo
        await fs.setDoc(ref, { fichas: leer(), recarga: ultimaRecarga(), actualizada: fs.serverTimestamp() });
    }
    nube = { fs, ref };
    mandar();
    fs.onSnapshot(ref, (d) => {
        if (!d.exists()) return;
        const datos = d.data();
        recargaNube = datos.recarga ?? "";
        escribir((datos.fichas ?? 0) + pendiente);
    });
    // Regalos que te mandaron: se cobran solos
    const q = fs.query(fs.collection(db, "regalos"), fs.where("para", "==", usuario.uid), fs.where("cobrado", "==", false));
    fs.onSnapshot(q, (snap) => {
        for (const d of snap.docs) {
            const r = d.data();
            const lote = fs.writeBatch(db);
            lote.update(d.ref, { cobrado: true });
            lote.update(ref, { fichas: fs.increment(r.cantidad) });
            lote.commit().then(
                () => avisoFichas(`🎁 ${r.nombreDe ?? "Un amigo"} te regaló ${r.cantidad.toLocaleString("es")} fichas`),
                () => {}
            );
        }
    }, () => {});
    addEventListener("pagehide", mandar);
    document.addEventListener("visibilitychange", () => document.visibilityState === "hidden" && mandar());
}

export const listo = conectarNube().catch(() => {});

// Regalar fichas a un amigo: se descuentan de tu billetera y le llegan a la suya
export async function regalarFichas(amigo, cantidad, miNombre) {
    cantidad = Math.floor(cantidad);
    if (!(cantidad > 0) || cantidad > LIMITE_APUESTA) throw new Error("Cantidad inválida.");
    await listo;
    if (!nube) throw new Error("Tenés que iniciar sesión para regalar fichas.");
    mandar();
    if (leer() < cantidad) throw new Error("No te alcanzan las fichas.");
    const { fs, ref } = nube;
    const db = ref.firestore;
    const lote = fs.writeBatch(db);
    const regalo = fs.doc(fs.collection(db, "regalos"));
    lote.set(regalo, {
        de: ref.id, para: amigo.uid, nombreDe: miNombre, cantidad, cobrado: false, creado: fs.serverTimestamp(),
    });
    lote.update(ref, { fichas: fs.increment(-cantidad) });
    // El regalo también aparece en el chat con ese amigo
    const chat = ref.id < amigo.uid ? `${ref.id}_${amigo.uid}` : `${amigo.uid}_${ref.id}`;
    lote.set(fs.doc(fs.collection(db, "chats", chat, "mensajes")), {
        de: ref.id, texto: `🎁 Te regalé ${cantidad.toLocaleString("es")} fichas`, creado: fs.serverTimestamp(),
        tipo: "regalo", regalo: regalo.id, cantidad,
    });
    await lote.commit();
}

// Para mover fichas dentro de un lote de Firestore junto con otros cambios (apuestas de desafíos)
export async function billetera() {
    await listo;
    if (nube) mandar();
    return nube;
}

// Saldo de otro jugador (para el ranking de amigos)
export async function fichasDe(uid) {
    await listo;
    if (!nube) return null;
    const d = await nube.fs.getDoc(nube.fs.doc(nube.ref.firestore, "billeteras", uid));
    return d.exists() ? d.data().fichas : null;
}
