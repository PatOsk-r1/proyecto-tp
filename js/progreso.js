// Progreso en la nube: todo lo que los juegos guardan en el dispositivo (localStorage) se copia a
// Firestore (progreso/{uid}/claves/{clave}), así no se pierde al borrar el teléfono o cambiar de dispositivo.
// Al abrir un juego primero se traen los datos de la nube (como mucho unos segundos) y recién después arranca.
// Si dos dispositivos guardaron lo mismo, gana el cambio más nuevo.
const FIRESTORE = "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
const ESPERA_MAX = 3500;
const META = "nube-meta"; // cuándo se cambió cada clave en este dispositivo
// Claves que no se suben: las fichas van en su billetera y el resto es solo de este dispositivo
const NO_SUBIR = /^(nube-meta|modo-prueba|casino-fichas|casino-recarga|leido-.*|pestana|ultimo-juego|firebase.*)$/;

const guardarOriginal = Storage.prototype.setItem;
const borrarOriginal = Storage.prototype.removeItem;

function leerMeta() {
    try {
        return JSON.parse(localStorage.getItem(META) || "{}");
    } catch {
        return {};
    }
}
let meta = leerMeta();
const guardarMeta = () => {
    try {
        guardarOriginal.call(localStorage, META, JSON.stringify(meta));
    } catch {}
};

const sucias = new Set();
let nube = null; // { fs, coleccion }
let temporizador = 0;

function subir() {
    clearTimeout(temporizador);
    if (!nube) return;
    const { fs, coleccion } = nube;
    for (const clave of sucias) {
        const ref = fs.doc(coleccion, encodeURIComponent(clave));
        const valor = localStorage.getItem(clave);
        const promesa = valor === null
            ? fs.deleteDoc(ref)
            : fs.setDoc(ref, { valor, tsLocal: meta[clave] ?? Date.now(), ts: fs.serverTimestamp() });
        promesa.catch(() => sucias.add(clave));
    }
    sucias.clear();
}

function marcar(clave) {
    if (this !== localStorage || NO_SUBIR.test(clave)) return;
    meta[clave] = Date.now();
    guardarMeta();
    sucias.add(clave);
    clearTimeout(temporizador);
    temporizador = setTimeout(subir, 5000);
}

// Cada vez que un juego guarda algo, queda anotado para subirlo
Storage.prototype.setItem = function (clave, valor) {
    guardarOriginal.call(this, clave, valor);
    marcar.call(this, String(clave));
};
Storage.prototype.removeItem = function (clave) {
    borrarOriginal.call(this, clave);
    marcar.call(this, String(clave));
};

async function sincronizar() {
    try {
        if (location.hostname === "localhost" && localStorage.getItem("modo-prueba") === "1") return;
    } catch {
        return;
    }
    const { usuarioActual, app } = await import("./sesion.js");
    const usuario = await usuarioActual();
    if (!usuario || !app) return;
    const fs = await import(FIRESTORE);
    const coleccion = fs.collection(fs.getFirestore(app), "progreso", usuario.uid, "claves");
    const docs = await fs.getDocs(coleccion);
    const enNube = new Set();
    for (const d of docs.docs) {
        const clave = decodeURIComponent(d.id);
        const { valor, tsLocal = 0 } = d.data();
        enNube.add(clave);
        // Si la nube tardó y el juego ya arrancó, no se le cambian los datos por debajo: gana lo de este dispositivo
        if (tarde) {
            if (NO_SUBIR.test(clave) || localStorage.getItem(clave) === null) continue;
            meta[clave] = Math.max(meta[clave] ?? 0, tsLocal + 1);
            sucias.add(clave);
        } else if (tsLocal > (meta[clave] ?? 0)) {
            // La nube tiene algo más nuevo: se trae sin volver a subirlo
            guardarOriginal.call(localStorage, clave, valor);
            meta[clave] = tsLocal;
        } else if ((meta[clave] ?? 0) > tsLocal) {
            sucias.add(clave);
        }
    }
    // Lo que había solo en este dispositivo (por ejemplo, partidas de antes de esta versión) se sube
    for (let i = 0; i < localStorage.length; i++) {
        const clave = localStorage.key(i);
        if (!NO_SUBIR.test(clave) && !enNube.has(clave)) {
            meta[clave] ??= Date.now();
            sucias.add(clave);
        }
    }
    guardarMeta();
    nube = { fs, coleccion };
    subir();
    addEventListener("pagehide", subir);
    document.addEventListener("visibilitychange", () => document.visibilityState === "hidden" && subir());
}

// Espera la sincronización, pero sin trabar el juego si no hay internet
let tarde = false;
await Promise.race([
    sincronizar().catch(() => {}),
    new Promise((ok) => setTimeout(() => ok((tarde = true)), ESPERA_MAX)),
]);
