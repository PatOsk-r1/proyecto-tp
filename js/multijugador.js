// Multijugador: nombre de usuario, amigos y partidas entre amigos (Firestore).
// Las reglas que protegen estos datos están en firebase/firestore.rules.
import { app, auth } from "./sesion.js";
import {
    getFirestore, doc, getDoc, collection, query, where, onSnapshot, writeBatch, setDoc, updateDoc, deleteDoc, addDoc,
    serverTimestamp, deleteField, runTransaction,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

export const db = app ? getFirestore(app) : null;

export const NOMBRE_VALIDO = /^[A-Za-z0-9_]{3,20}$/;
const yo = () => auth.currentUser.uid;
export const idAmistad = (a, b) => (a < b ? `${a}_${b}` : `${b}_${a}`);

// ---------- Nombre de usuario ----------
export async function miPerfil() {
    const d = await getDoc(doc(db, "usuarios", yo()));
    return d.exists() ? d.data() : null;
}

export async function elegirNombre(nombre, anterior) {
    if (!NOMBRE_VALIDO.test(nombre)) throw new Error("Usá de 3 a 20 letras, números o guion bajo (_), sin espacios.");
    const min = nombre.toLowerCase();
    const reservado = await getDoc(doc(db, "nombres", min));
    if (reservado.exists() && reservado.data().uid !== yo()) throw new Error("Ese nombre ya lo tiene otra persona.");
    const lote = writeBatch(db);
    if (anterior && anterior.nombreMin !== min) lote.delete(doc(db, "nombres", anterior.nombreMin));
    if (!reservado.exists()) lote.set(doc(db, "nombres", min), { uid: yo() });
    // merge: conserva la foto y el estado de conexión
    lote.set(doc(db, "usuarios", yo()), { nombre, nombreMin: min, creado: anterior?.creado ?? serverTimestamp() }, { merge: true });
    await lote.commit();
}

// Achica la imagen a un cuadrado de 128 px (unos 10 KB) para guardarla en el perfil
export function prepararFoto(archivo) {
    return new Promise((resolver, rechazar) => {
        const img = new Image();
        img.onload = () => {
            const lado = Math.min(img.width, img.height);
            const c = document.createElement("canvas");
            c.width = c.height = 128;
            c.getContext("2d").drawImage(img, (img.width - lado) / 2, (img.height - lado) / 2, lado, lado, 0, 0, 128, 128);
            URL.revokeObjectURL(img.src);
            resolver(c.toDataURL("image/jpeg", 0.8));
        };
        img.onerror = () => rechazar(new Error("No se pudo leer la imagen."));
        img.src = URL.createObjectURL(archivo);
    });
}

export const guardarFoto = (foto) => updateDoc(doc(db, "usuarios", yo()), { foto });
export const quitarFoto = () => updateDoc(doc(db, "usuarios", yo()), { foto: deleteField() });

// Avatar: la foto si tiene, si no la inicial sobre un color
const COLORES_AVATAR = ["#ffcc33", "#7df9ff", "#ff8fab", "#a0f0a0", "#c9a7ff", "#ffb36b"];
export function htmlAvatar(datos, nombre = "?") {
    if (datos?.foto) return `<img class="foto-avatar" src="${datos.foto}" alt="">`;
    const n = datos?.nombre ?? nombre;
    const color = COLORES_AVATAR[[...n].reduce((s, c) => s + c.charCodeAt(0), 0) % COLORES_AVATAR.length];
    return `<span class="inicial-avatar" style="--c:${color}">${n[0]?.toUpperCase() ?? "?"}</span>`;
}

export async function buscarUsuario(nombre) {
    const r = await getDoc(doc(db, "nombres", nombre.trim().toLowerCase()));
    if (!r.exists()) return null;
    const uid = r.data().uid;
    const perfil = await getDoc(doc(db, "usuarios", uid));
    return perfil.exists() ? { uid, ...perfil.data() } : null;
}

// ---------- Conexión ----------
// Mientras la app está abierta se avisa "estoy acá" cada minuto. Un amigo está en línea si avisó hace poco.
const EN_LINEA_MS = 150000;
let actividadActual = "";

export function iniciarPresencia(actividad = "") {
    if (!db || !auth.currentUser) return;
    actividadActual = actividad;
    const latido = () =>
        updateDoc(doc(db, "usuarios", yo()), { visto: serverTimestamp(), actividad: actividadActual }).catch(() => {});
    latido();
    setInterval(() => document.visibilityState === "visible" && latido(), 60000);
    document.addEventListener("visibilitychange", () => document.visibilityState === "visible" && latido());
}

export function escucharUsuario(uid, alCambiar) {
    return onSnapshot(doc(db, "usuarios", uid), (d) => alCambiar(d.exists() ? d.data() : null), () => {});
}

export const enLinea = (u) => Boolean(u?.visto && Date.now() - u.visto.toMillis() < EN_LINEA_MS);

export function textoConexion(u) {
    if (!u?.visto) return "Desconectado";
    if (enLinea(u)) return u.actividad ? `En línea · ${u.actividad}` : "En línea";
    const minutos = Math.floor((Date.now() - u.visto.toMillis()) / 60000);
    if (minutos < 60) return `Visto hace ${minutos} min`;
    const horas = Math.floor(minutos / 60);
    if (horas < 24) return `Visto hace ${horas} h`;
    return `Visto hace ${Math.floor(horas / 24)} d`;
}

// ---------- Amigos ----------
export function escucharAmistades(alCambiar) {
    const q = query(collection(db, "amistades"), where("uids", "array-contains", yo()));
    return onSnapshot(q, (snap) => alCambiar(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
}

export async function enviarSolicitud(nombre, miNombre, actuales) {
    const otro = await buscarUsuario(nombre);
    if (!otro) throw new Error("No existe ningún usuario con ese nombre.");
    if (otro.uid === yo()) throw new Error("Ese sos vos 🙂");
    const id = idAmistad(yo(), otro.uid);
    const existente = actuales.find((a) => a.id === id);
    if (existente) throw new Error(existente.estado === "aceptada" ? "Ya son amigos." : "Ya hay una solicitud pendiente.");
    await setDoc(doc(db, "amistades", id), {
        uids: [yo(), otro.uid],
        de: yo(),
        para: otro.uid,
        nombres: { [yo()]: miNombre, [otro.uid]: otro.nombre },
        estado: "pendiente",
        creada: serverTimestamp(),
    });
    return otro;
}

export const aceptarAmistad = (id) => updateDoc(doc(db, "amistades", id), { estado: "aceptada" });
export const borrarAmistad = (id) => deleteDoc(doc(db, "amistades", id));

// ---------- Partidas ----------
export function escucharPartidas(alCambiar) {
    const q = query(collection(db, "partidas"), where("jugadores", "array-contains", yo()));
    return onSnapshot(q, (snap) => alCambiar(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
}

export async function crearPartida(juego, miNombre, amigo, datos) {
    const ref = await addDoc(collection(db, "partidas"), {
        juego,
        jugadores: [yo(), amigo.uid],
        nombres: { [yo()]: miNombre, [amigo.uid]: amigo.nombre },
        creador: yo(),
        estado: "invitada",
        turno: yo(),
        creada: serverTimestamp(),
        actualizada: serverTimestamp(),
        ...datos,
    });
    return ref.id;
}

export function escucharPartida(id, alCambiar, alFallar) {
    return onSnapshot(
        doc(db, "partidas", id),
        (d) => alCambiar(d.exists() ? { id: d.id, ...d.data() } : null),
        alFallar
    );
}

export const actualizarPartida = (id, cambios) => updateDoc(doc(db, "partidas", id), { ...cambios, actualizada: serverTimestamp() });

// Revancha compartida: el primero que la pide crea la partida nueva y la anota en la terminada;
// si el otro también toca "Revancha", entra a esa misma. Es una transacción, así que aunque
// los dos toquen a la vez se crea una sola.
export function revancha(idAnterior, datosIniciales) {
    const refAnterior = doc(db, "partidas", idAnterior);
    return runTransaction(db, async (tx) => {
        const anterior = await tx.get(refAnterior);
        const p = anterior.data();
        if (p.revancha) return p.revancha;
        const rival = p.jugadores.find((j) => j !== yo());
        const nueva = doc(collection(db, "partidas"));
        tx.set(nueva, {
            juego: p.juego,
            jugadores: [yo(), rival],
            nombres: p.nombres,
            creador: yo(),
            estado: "invitada",
            turno: yo(),
            creada: serverTimestamp(),
            actualizada: serverTimestamp(),
            ...datosIniciales(),
        });
        tx.update(refAnterior, { revancha: nueva.id, revanchaDe: yo(), actualizada: serverTimestamp() });
        return nueva.id;
    });
}

// Texto del botón al terminar: si el rival ya pidió la revancha, se ofrece unirse
export const textoRevancha = (p, uid) =>
    !p.revancha ? "Revancha" : p.revanchaDe && p.revanchaDe !== uid ? "Aceptar revancha" : "Ir a la revancha";

// Va a la revancha (la crea si todavía no existe)
export async function irARevancha(partida, datosIniciales) {
    const id = partida.revancha ?? (await revancha(partida.id, datosIniciales));
    location.search = `?partida=${id}`;
}
export const borrarPartida = (id) => deleteDoc(doc(db, "partidas", id));

export const JUEGOS_ONLINE = {
    arco: { nombre: "Tiro con arco", emoji: "🏹", carpeta: "games/arco/", reglas: "../games/arco/reglas.js" },
    pool: { nombre: "Pool", emoji: "🎱", carpeta: "games/pool/", reglas: "../games/pool/reglas.js" },
    cuatro: { nombre: "4 en línea", emoji: "🔴", carpeta: "games/cuatro/", reglas: "../games/cuatro/reglas.js" },
    tateti: { nombre: "Ta-te-tí", emoji: "❌", carpeta: "games/tateti/", reglas: "../games/tateti/reglas.js" },
    damas: { nombre: "Damas", emoji: "⚫", carpeta: "games/damas/", reglas: "../games/damas/reglas.js" },
    mancala: { nombre: "Mancala", emoji: "🥥", carpeta: "games/mancala/", reglas: "../games/mancala/reglas.js" },
    naval: { nombre: "Batalla naval", emoji: "🚢", carpeta: "games/naval/", reglas: "../games/naval/reglas.js" },
};
