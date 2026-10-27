// Multijugador: nombre de usuario, amigos y partidas entre amigos (Firestore).
// Las reglas que protegen estos datos están en firebase/firestore.rules.
import { app, auth } from "./sesion.js";
import {
    getFirestore, doc, getDoc, collection, query, where, onSnapshot, writeBatch, setDoc, updateDoc, deleteDoc, addDoc,
    serverTimestamp,
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
    lote.set(doc(db, "usuarios", yo()), { nombre, nombreMin: min, creado: anterior?.creado ?? serverTimestamp() });
    await lote.commit();
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
export const borrarPartida = (id) => deleteDoc(doc(db, "partidas", id));

export const JUEGOS_ONLINE = {
    arco: { nombre: "Tiro con arco", emoji: "🏹", carpeta: "games/arco/", reglas: "../games/arco/reglas.js" },
    pool: { nombre: "Pool", emoji: "🎱", carpeta: "games/pool/", reglas: "../games/pool/reglas.js" },
};
