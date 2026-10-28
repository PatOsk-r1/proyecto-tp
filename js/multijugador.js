// Multijugador: nombre de usuario, amigos y partidas entre amigos (Firestore).
// Las reglas que protegen estos datos están en firebase/firestore.rules.
import { app, auth } from "./sesion.js";
import {
    getFirestore, doc, getDoc, collection, query, where, onSnapshot, writeBatch, setDoc, updateDoc, deleteDoc, addDoc,
    serverTimestamp, deleteField, runTransaction, increment, orderBy, limit,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { fichas, billetera, avisoFichas, regalarFichas } from "./fichas.js";
import { EMOJIS, REACCIONES, htmlEmojiAnimado, soloEmojis } from "./emojis.js";
import { nivelDe, progresoNivel, catalogo, anotarXp } from "./experiencia.js";

export { nivelDe };

// 1500 → 1.5K, 2000000 → 2M (sin importar comun3d, que trae Three.js)
export const formatear = (n) =>
    n >= 1e6 ? `${+(n / 1e6).toFixed(2)}M` : n >= 1e3 ? `${+(n / 1e3).toFixed(1)}K` : String(Math.floor(n));

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
    return onSnapshot(q, (snap) => {
        const lista = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        lista.forEach(liquidar);
        lista.forEach(limpiar);
        alCambiar(lista);
    });
}

// Solo se guardan las partidas en curso: una terminada se borra cuando los dos cobraron
// y ya pasaron unos minutos (para que se pueda ver el resultado y pedir la revancha).
const EN_CURSO = ["invitada", "jugando"];
export const enCurso = (p) => EN_CURSO.includes(p.estado);
function limpiar(p) {
    const vieja = Date.now() - (p.actualizada?.toMillis?.() ?? Date.now()) > 10 * 60000;
    if (p.estado === "terminada" && vieja && p.jugadores.every((u) => p.cobrado?.[u])) deleteDoc(doc(db, "partidas", p.id)).catch(() => {});
}

// apuesta: fichas que pone cada uno; el ganador se lleva las dos (en empate vuelven)
export async function crearPartida(juego, miNombre, amigo, datos, apuesta = 0) {
    const ref = doc(collection(db, "partidas"));
    const lote = writeBatch(db);
    lote.set(ref, {
        juego,
        jugadores: [yo(), amigo.uid],
        nombres: { [yo()]: miNombre, [amigo.uid]: amigo.nombre },
        creador: yo(),
        estado: "invitada",
        turno: yo(),
        creada: serverTimestamp(),
        actualizada: serverTimestamp(),
        apuesta,
        pagado: apuesta ? { [yo()]: true } : {},
        ...datos,
    });
    if (apuesta) await cobrarEnLote(lote, -apuesta);
    await lote.commit();
    return ref.id;
}

// Suma o resta fichas de mi billetera dentro de un lote
async function cobrarEnLote(lote, cantidad) {
    const b = await billetera();
    if (!b) throw new Error("Tenés que iniciar sesión para apostar fichas.");
    if (cantidad < 0 && fichas() < -cantidad) throw new Error(`No te alcanzan las fichas (hacen falta ${formatear(-cantidad)}).`);
    lote.update(b.ref, { fichas: increment(cantidad) });
}

// Aceptar un desafío: si tiene apuesta, se pagan las fichas al aceptar
const aceptando = new Set();
export async function aceptarPartida(p) {
    if (p.estado !== "invitada" || p.creador === yo() || aceptando.has(p.id)) return true;
    aceptando.add(p.id);
    try {
        const lote = writeBatch(db);
        lote.update(doc(db, "partidas", p.id), { estado: "jugando", [`pagado.${yo()}`]: true, actualizada: serverTimestamp() });
        if (p.apuesta) await cobrarEnLote(lote, -p.apuesta);
        await lote.commit();
        return true;
    } catch (error) {
        aceptando.delete(p.id);
        alert(error.message);
        const amigos = new URL("../amigos.html", import.meta.url).href;
        if (location.href !== amigos) location.href = amigos;
        return false;
    }
}

// Rechazar o borrar: si el creador ya había pagado la apuesta, se le devuelve
export async function quitarPartida(p) {
    const yaPago = p.apuesta && p.pagado?.[p.creador] && p.estado === "invitada";
    if (yaPago && p.creador !== yo()) return updateDoc(doc(db, "partidas", p.id), { estado: "rechazada", actualizada: serverTimestamp() });
    if (yaPago || (p.estado === "rechazada" && p.creador === yo() && !p.cobrado?.[yo()])) {
        const lote = writeBatch(db);
        lote.delete(doc(db, "partidas", p.id));
        await cobrarEnLote(lote, p.apuesta);
        return lote.commit();
    }
    return deleteDoc(doc(db, "partidas", p.id));
}

// Se puede borrar una partida terminada cuando los dos ya cobraron
export const sePuedeBorrar = (p) => p.estado !== "terminada" || p.jugadores.every((u) => p.cobrado?.[u]);

// Al terminar, cada uno cobra lo suyo una sola vez y suma la partida a sus estadísticas
const liquidando = new Set();
export async function liquidar(p) {
    if (!p || liquidando.has(p.id) || p.cobrado?.[yo()]) return;
    if (p.estado === "rechazada" && p.creador === yo()) {
        liquidando.add(p.id);
        return quitarPartida(p).catch(() => liquidando.delete(p.id));
    }
    if (p.estado !== "terminada" || !p.ganador) return;
    liquidando.add(p.id);
    try {
        const b = await billetera();
        const lote = writeBatch(db);
        lote.update(doc(db, "partidas", p.id), { [`cobrado.${yo()}`]: true });
        if (b) {
            const resultado = p.ganador === "empate" ? "empates" : p.ganador === yo() ? "ganadas" : "perdidas";
            const pozo = p.apuesta && p.pagado?.[p.jugadores[0]] && p.pagado?.[p.jugadores[1]] ? p.apuesta : 0;
            const premio = resultado === "ganadas" ? pozo * 2 : resultado === "empates" ? pozo : 0;
            const xp = resultado === "ganadas" ? 30 : 10;
            lote.update(b.ref, {
                [`stats.${resultado}`]: increment(1),
                [`stats.juegos.${p.juego}.${resultado}`]: increment(1),
                [`stats.juegos.${p.juego}.xp`]: increment(xp),
                xp: increment(xp),
                ...(premio ? { fichas: increment(premio) } : {}),
            });
            await lote.commit();
            anotarXp(p.juego, xp);
            if (premio) avisoFichas(resultado === "ganadas" ? `🏆 ¡Ganaste el pozo! +${formatear(premio)} fichas` : `🤝 Empate: vuelven tus ${formatear(premio)} fichas`);
        } else {
            await lote.commit();
        }
    } catch {
        liquidando.delete(p.id);
    }
}

export function escucharPartida(id, alCambiar, alFallar) {
    let primera = true;
    return onSnapshot(
        doc(db, "partidas", id),
        (d) => {
            const p = d.exists() ? { id: d.id, ...d.data() } : null;
            if (p && primera) {
                primera = false;
                abrirChatPartida(p);
            }
            if (p) {
                pintarPozo(p);
                liquidar(p);
            }
            alCambiar(p);
        },
        alFallar
    );
}

// ---------- Chat ----------
// Mensajes en {ruta}/mensajes. ruta = ["chats", idAmistad] (amigos) o ["partidas", id] (dentro de un juego).
// En los chats de amigos, el documento chats/{id} guarda hasta cuándo leyó cada uno (visto) y quién está escribiendo.
export const TEXTO_MAX = 300;

export function escucharChat(ruta, alCambiar, cuantos = 80) {
    const q = query(collection(db, ...ruta, "mensajes"), orderBy("creado", "desc"), limit(cuantos));
    return onSnapshot(q, (snap) => alCambiar(snap.docs.map((d) => ({ id: d.id, ...d.data() })).reverse()), () => {});
}

// tipo: "texto" (por defecto), "partida" (un juego mandado por el chat) o "regalo" (fichas regaladas).
// texto siempre lleva un resumen legible. responde: { id, de, texto } del mensaje al que se contesta.
export function enviarMensaje(ruta, texto, extra = {}) {
    texto = String(texto).trim().slice(0, TEXTO_MAX);
    if (!texto) return;
    return addDoc(collection(db, ...ruta, "mensajes"), { de: yo(), texto, creado: serverTimestamp(), ...extra });
}

// Reaccionar (o sacar la reacción si es la misma)
export function reaccionar(ruta, m, emoji) {
    const actual = m.reacciones?.[yo()];
    return updateDoc(doc(db, ...ruta, "mensajes", m.id), { [`reacciones.${yo()}`]: actual === emoji ? deleteField() : emoji });
}

export const borrarMensaje = (ruta, id) => deleteDoc(doc(db, ...ruta, "mensajes", id));

// Mensajes sin leer: se guarda en el dispositivo hasta cuándo leíste cada chat
export function marcarLeido(clave) {
    try {
        localStorage.setItem(`leido-${clave}`, Date.now());
    } catch {}
}
export function sinLeer(clave, mensajes) {
    let leido = 0;
    try {
        leido = Number(localStorage.getItem(`leido-${clave}`) || 0);
    } catch {}
    return mensajes.filter((m) => m.de !== yo() && (m.creado?.toMillis?.() ?? Date.now()) > leido).length;
}

const escaparHtml = (t) => String(t).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
export const urlJuego = (clave, id) => new URL(`../${JUEGOS_ONLINE[clave]?.carpeta ?? ""}?partida=${id}`, import.meta.url).href;
const ms = (ts) => ts?.toMillis?.() ?? Date.now();

function textoDia(fecha) {
    const hoy = new Date();
    const ayer = new Date(Date.now() - 86400000);
    if (fecha.toDateString() === hoy.toDateString()) return "Hoy";
    if (fecha.toDateString() === ayer.toDateString()) return "Ayer";
    return fecha.toLocaleDateString("es", { weekday: "long", day: "numeric", month: "long" });
}

// Una burbuja de mensaje. visto: hasta cuándo leyó el otro (para los ✓✓)
function htmlMensaje(m, { nombres, primero, ultimo, visto, activas }) {
    const mio = m.de === yo();
    const hora = m.creado?.toDate?.().toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" }) ?? "";
    const quien = !mio && primero && nombres[m.de] ? `<b class="autor">${escaparHtml(nombres[m.de])}</b>` : "";
    const cita = m.responde
        ? `<div class="cita"><b>${m.responde.de === yo() ? "Vos" : escaparHtml(nombres[m.responde.de] ?? "")}</b>${escaparHtml(m.responde.texto)}</div>`
        : "";
    let clase = "";
    let cuerpo;
    if (m.tipo === "partida" && JUEGOS_ONLINE[m.juego]) {
        const j = JUEGOS_ONLINE[m.juego];
        // Si la partida ya terminó (no está entre las que siguen en curso), queda como recuerdo sin botón
        const termino = activas && !activas.has(m.partida);
        clase = "tarjeta";
        cuerpo = `<div class="tarjeta-msj${termino ? " terminada" : ""}"><span class="grande">${htmlEmojiAnimado(j.emoji)}</span>
            <strong>${mio ? "Desafiaste a" : "¡Te desafió a"} ${j.nombre}${mio ? "" : "!"}</strong>
            <span>${m.apuesta ? `🪙 Apuesta ${formatear(m.apuesta)} cada uno` : "Sin apuesta"}</span>
            ${termino ? `<span class="fin-partida">Partida terminada</span>` : `<a href="${urlJuego(m.juego, m.partida)}">${mio ? "Abrir partida" : "Jugar"}</a>`}</div>`;
    } else if (m.tipo === "regalo") {
        clase = "tarjeta";
        cuerpo = `<div class="tarjeta-msj regalo"><span class="grande">${htmlEmojiAnimado("🎁")}</span>
            <strong>${mio ? "Regalaste" : "¡Te regaló"} 🪙 ${formatear(m.cantidad ?? 0)} fichas${mio ? "" : "!"}</strong></div>`;
    } else {
        const emojis = soloEmojis(m.texto);
        clase = emojis && !m.responde ? "emoji" : "";
        cuerpo = emojis && !m.responde
            ? `<span class="emojis">${emojis.map((e) => htmlEmojiAnimado(e)).join("")}</span>`
            : `<span class="texto">${escaparHtml(m.texto)}</span>`;
    }
    const reacciones = Object.values(m.reacciones ?? {});
    const htmlReacciones = reacciones.length
        ? `<span class="reacciones">${[...new Set(reacciones)].join("")}${reacciones.length > 1 ? `<small>${reacciones.length}</small>` : ""}</span>`
        : "";
    const tilde = mio ? `<i class="tilde${visto >= ms(m.creado) ? " visto" : ""}">${m.creado ? "✓✓" : "🕓"}</i>` : "";
    return `<div class="msj ${mio ? "mio" : ""} ${clase} ${primero ? "primero" : ""} ${ultimo ? "ultimo" : ""}${reacciones.length ? " con-reaccion" : ""}" data-id="${m.id}">
        ${quien}${cita}${cuerpo}<small class="hora">${hora}${tilde}</small>${htmlReacciones}</div>`;
}

// Lista completa con separadores de día y mensajes agrupados (seguidos del mismo, en pocos minutos)
// activas: ids de las partidas que siguen en curso (las tarjetas de las demás aparecen como terminadas)
export function htmlMensajes(mensajes, nombres = {}, visto = 0, activas = null) {
    let html = "";
    let diaAnterior = "";
    mensajes.forEach((m, i) => {
        const fecha = m.creado?.toDate?.() ?? new Date();
        const dia = fecha.toDateString();
        if (dia !== diaAnterior) {
            html += `<div class="separador-dia"><span>${textoDia(fecha)}</span></div>`;
            diaAnterior = dia;
        }
        const antes = mensajes[i - 1];
        const despues = mensajes[i + 1];
        const pegado = (a, b) => a && b && a.de === b.de && Math.abs(ms(a.creado) - ms(b.creado)) < 180000 &&
            (a.creado?.toDate?.() ?? new Date()).toDateString() === (b.creado?.toDate?.() ?? new Date()).toDateString();
        html += htmlMensaje(m, { nombres, primero: !pegado(antes, m), ultimo: !pegado(m, despues), visto, activas });
    });
    return html;
}

export const CSS_CHAT = `
.chat-flotante { position: fixed; right: 8px; top: calc(58px + env(safe-area-inset-top)); z-index: 50; width: 44px; height: 44px; border-radius: 50%; border: none; font-size: 1.3rem; background: #ffd166e6; box-shadow: 0 6px 18px #0009; }
.chat-flotante .insignia-chat { position: absolute; top: -4px; right: -4px; min-width: 20px; padding: 1px 5px; border-radius: 999px; background: #ff4d6d; color: #fff; font: 900 0.75rem system-ui, sans-serif; }
.pozo-flotante { position: fixed; left: 50%; bottom: calc(6px + env(safe-area-inset-bottom)); transform: translateX(-50%); z-index: 40; padding: 4px 12px; border-radius: 999px; background: #000a; color: #ffd166; font: 900 0.8rem system-ui, sans-serif; pointer-events: none; border: 1px solid #ffd16655; }
.panel-chat { position: fixed; inset: 0; z-index: 60; display: flex; flex-direction: column; height: 100dvh; color: #fff; font-family: system-ui, -apple-system, sans-serif;
  background: radial-gradient(circle at 20% 10%, #2d2470 0, transparent 50%), radial-gradient(circle at 90% 80%, #3a1458 0, transparent 50%), #15103a; animation: entrar-chat 0.22s ease-out; }
@keyframes entrar-chat { from { transform: translateX(30%); opacity: 0; } }
.cabeza-chat { display: flex; align-items: center; gap: 10px; padding: calc(8px + env(safe-area-inset-top)) 10px 8px; background: #0d0a26e6; backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); border-bottom: 1px solid #ffffff14; }
.cabeza-chat .volver { font: 900 1.6rem system-ui, sans-serif; color: #ffd166; background: none; border: none; padding: 0 6px; line-height: 1; }
.cabeza-chat .avatar-c { position: relative; width: 40px; height: 40px; flex-shrink: 0; }
.cabeza-chat .avatar-c img, .cabeza-chat .avatar-c span { width: 100%; height: 100%; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 900; color: #1b1440; background: var(--c, #ffd166); object-fit: cover; }
.cabeza-chat .quien { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.cabeza-chat .quien strong { font-size: 1.02rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cabeza-chat .quien span { font-size: 0.78rem; color: #b9b3e6; }
.cabeza-chat .quien span.escribiendo { color: #7dffb0; font-weight: 700; }
.cabeza-chat .accion-c { font-size: 1.25rem; width: 40px; height: 40px; border-radius: 50%; border: none; background: #ffffff14; }
.lista-msj { flex: 1; min-height: 0; overflow-y: auto; display: flex; flex-direction: column; gap: 2px; padding: 10px 10px 6px; overscroll-behavior: contain; }
.vacio-chat { margin: auto; text-align: center; opacity: 0.7; font-size: 0.95rem; }
.vacio-chat span { display: block; font-size: 3rem; margin-bottom: 6px; }
.separador-dia { display: flex; justify-content: center; margin: 10px 0 6px; }
.separador-dia span { font-size: 0.72rem; font-weight: 800; padding: 4px 10px; border-radius: 999px; background: #ffffff14; color: #d6d1ff; text-transform: capitalize; }
.msj { position: relative; align-self: flex-start; max-width: 78%; padding: 6px 10px 5px; border-radius: 6px 18px 18px 6px; background: #ffffff1f; font-size: 0.97rem; line-height: 1.3; overflow-wrap: anywhere; -webkit-user-select: none; user-select: none; -webkit-touch-callout: none; transition: transform 0.15s; }
.msj.primero { border-top-left-radius: 18px; margin-top: 6px; }
.msj.ultimo { border-bottom-left-radius: 18px; }
.msj.mio { align-self: flex-end; border-radius: 18px 6px 6px 18px; background: linear-gradient(135deg, #7b5cff, #5a3de0); }
.msj.mio.primero { border-top-right-radius: 18px; }
.msj.mio.ultimo { border-bottom-right-radius: 18px; }
.msj.con-reaccion { margin-bottom: 14px; }
.msj.apretado { transform: scale(0.96); }
.msj .autor { display: block; font-size: 0.72rem; color: #ffd166; margin-bottom: 1px; }
.msj .hora { float: right; margin: 6px 0 -2px 8px; font-size: 0.64rem; opacity: 0.65; white-space: nowrap; }
.msj .tilde { font-style: normal; margin-left: 3px; letter-spacing: -3px; }
.msj .tilde.visto { color: #7dd3ff; opacity: 1; }
.msj.emoji { background: none; padding: 0 2px; }
.msj.emoji .emojis { display: flex; gap: 2px; }
.msj.emoji img { width: 64px; height: 64px; display: block; }
.msj.emoji .hora { float: none; display: block; text-align: right; }
.msj .cita { margin: 2px -4px 4px; padding: 5px 8px; border-left: 3px solid #ffd166; border-radius: 8px; background: #0003; font-size: 0.82rem; opacity: 0.9; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
.msj .cita b { display: block; font-size: 0.72rem; color: #ffd166; }
.msj .reacciones { position: absolute; bottom: -14px; right: 8px; display: flex; align-items: center; gap: 1px; padding: 1px 6px; border-radius: 999px; background: #2a2160; border: 2px solid #15103a; font-size: 0.85rem; animation: pop-reaccion 0.3s cubic-bezier(0.2, 1.6, 0.4, 1); }
.msj:not(.mio) .reacciones { right: auto; left: 8px; }
.msj .reacciones small { font-size: 0.68rem; margin-left: 2px; opacity: 0.8; }
@keyframes pop-reaccion { from { transform: scale(0); } }
.msj.tarjeta { background: none; padding: 0; }
.msj.tarjeta .hora { float: none; display: block; text-align: right; margin: 2px 4px 0; }
.tarjeta-msj { min-width: 210px; display: flex; flex-direction: column; gap: 6px; padding: 10px 12px; border-radius: 16px; background: linear-gradient(145deg, #3a0ca3, #7209b7); box-shadow: 0 6px 16px #0006; }
.tarjeta-msj.regalo { background: linear-gradient(145deg, #ffb703, #fb8500); color: #2a1400; }
.tarjeta-msj .grande img { width: 52px; height: 52px; }
.tarjeta-msj a { font: 900 0.9rem system-ui, sans-serif; text-align: center; text-decoration: none; border-radius: 10px; padding: 8px; background: #ffd166; color: #2a1400; }
.escribiendo-burbuja { align-self: flex-start; display: flex; gap: 4px; padding: 10px 12px; margin-top: 6px; border-radius: 18px; background: #ffffff1f; }
.escribiendo-burbuja i { width: 7px; height: 7px; border-radius: 50%; background: #fff; opacity: 0.5; animation: puntito 1.2s infinite; }
.escribiendo-burbuja i:nth-child(2) { animation-delay: 0.15s; } .escribiendo-burbuja i:nth-child(3) { animation-delay: 0.3s; }
@keyframes puntito { 30% { transform: translateY(-4px); opacity: 1; } }
.pie-chat { padding: 6px 8px calc(8px + env(safe-area-inset-bottom)); background: #0d0a26e6; border-top: 1px solid #ffffff14; display: flex; flex-direction: column; gap: 6px; }
.respondiendo { display: none; align-items: center; gap: 8px; padding: 6px 10px; border-left: 3px solid #ffd166; border-radius: 8px; background: #ffffff10; font-size: 0.85rem; }
.respondiendo.activo { display: flex; }
.respondiendo div { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.respondiendo b { color: #ffd166; margin-right: 4px; }
.respondiendo button { background: none; border: none; color: #fff; font-size: 1.1rem; }
.form-chat { display: flex; align-items: flex-end; gap: 6px; }
.form-chat textarea { flex: 1; min-width: 0; max-height: 120px; resize: none; font: inherit; font-size: 16px; line-height: 1.3; color: #fff; background: #ffffff12; border: 1px solid #ffffff22; border-radius: 20px; padding: 9px 14px; outline: none; }
.form-chat textarea:focus { border-color: #ffd16688; }
.form-chat .icono { flex-shrink: 0; width: 40px; height: 40px; border-radius: 50%; border: none; background: #ffffff14; font-size: 1.25rem; }
.form-chat .enviar { flex-shrink: 0; width: 42px; height: 42px; border-radius: 50%; border: none; background: #ffd166; color: #2a1400; font: 900 1.1rem system-ui, sans-serif; transition: transform 0.15s; }
.form-chat .enviar:disabled { opacity: 0.4; }
.form-chat .enviar:active { transform: scale(0.9); }
.grilla-emojis { display: none; grid-template-columns: repeat(8, 1fr); gap: 2px; max-height: 34vh; overflow-y: auto; }
.grilla-emojis.abierto { display: grid; }
.grilla-emojis button { font-size: 1.6rem; background: none; border: none; padding: 4px 0; border-radius: 8px; }
.grilla-emojis button:active { background: #ffffff22; }
.menu-msj-fondo { position: fixed; inset: 0; z-index: 80; background: #0008; backdrop-filter: blur(3px); -webkit-backdrop-filter: blur(3px); animation: aparecer-menu 0.15s; }
@keyframes aparecer-menu { from { opacity: 0; } }
.menu-msj { position: fixed; left: 50%; transform: translateX(-50%); width: min(320px, 92vw); display: flex; flex-direction: column; gap: 8px; }
.menu-msj .fila-reacciones { display: flex; justify-content: space-around; padding: 6px; border-radius: 999px; background: #2a2160; box-shadow: 0 10px 30px #000a; }
.menu-msj .fila-reacciones button { font-size: 1.7rem; background: none; border: none; border-radius: 50%; width: 46px; height: 46px; transition: transform 0.15s; animation: pop-reaccion 0.25s backwards; }
.menu-msj .fila-reacciones button.elegida { background: #ffffff22; }
.menu-msj .fila-reacciones button:active { transform: scale(1.3); }
.menu-msj .opciones { border-radius: 16px; overflow: hidden; background: #2a2160; box-shadow: 0 10px 30px #000a; }
.menu-msj .opciones button { display: block; width: 100%; text-align: left; font: 700 1rem system-ui, sans-serif; color: #fff; background: none; border: none; border-bottom: 1px solid #ffffff12; padding: 13px 16px; }
.menu-msj .opciones button:last-child { border-bottom: none; }
.menu-msj .opciones button.peligro { color: #ff8a8a; }
.burbuja-rival { position: fixed; left: 50%; top: 30%; transform: translateX(-50%); z-index: 55; padding: 10px 16px; border-radius: 18px; background: #fff; color: #1d1650; font: 800 1.05rem system-ui, sans-serif; box-shadow: 0 10px 30px #0009; animation: burbuja 2.6s ease-out forwards; pointer-events: none; max-width: 80vw; text-align: center; }
.burbuja-rival.emoji { background: none; box-shadow: none; display: flex; gap: 4px; }
.burbuja-rival.emoji img { width: 90px; height: 90px; }
@keyframes burbuja { 0% { opacity: 0; transform: translate(-50%, 20px) scale(0.6); } 12% { opacity: 1; transform: translate(-50%, 0) scale(1.05); } 80% { opacity: 1; transform: translate(-50%, -10px); } 100% { opacity: 0; transform: translate(-50%, -40px); } }
.hoja-chat-fondo { position: fixed; inset: 0; z-index: 70; display: flex; align-items: flex-end; justify-content: center; background: #0009; }
.hoja-chat { width: 100%; max-width: 560px; max-height: 88vh; overflow-y: auto; padding: 18px 16px calc(18px + env(safe-area-inset-bottom)); border-radius: 20px 20px 0 0; background: #241a5c; color: #fff; display: flex; flex-direction: column; gap: 10px; font-family: system-ui, sans-serif; animation: subir-hoja-chat 0.25s ease-out; }
@keyframes subir-hoja-chat { from { transform: translateY(100%); } }
.hoja-chat h2 { font-size: 1.1rem; }
.hoja-chat .suave { opacity: 0.7; font-size: 0.85rem; }
.hoja-chat .montos { display: flex; flex-wrap: wrap; gap: 6px; }
.hoja-chat .monto { font: 800 0.9rem system-ui, sans-serif; color: #fff; background: #ffffff14; border: 2px solid #ffffff22; border-radius: 999px; padding: 7px 12px; }
.hoja-chat .monto.elegido { border-color: #ffd166; color: #ffd166; }
.hoja-chat .monto:disabled { opacity: 0.35; }
.hoja-chat .juegos { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 8px; }
.hoja-chat .juegos button { display: flex; align-items: center; gap: 8px; font: 800 0.95rem system-ui, sans-serif; color: #fff; background: #ffffff10; border: 1px solid #ffffff22; border-radius: 14px; padding: 12px; text-align: left; }
.hoja-chat .juegos span { font-size: 1.5rem; }
.hoja-chat .fila { display: flex; gap: 8px; }
.hoja-chat input { flex: 1; min-width: 0; font: inherit; font-size: 16px; color: #fff; background: #ffffff12; border: 1px solid #ffffff22; border-radius: 12px; padding: 10px; }
.hoja-chat .boton { font: 900 0.95rem system-ui, sans-serif; border: none; border-radius: 12px; padding: 10px 14px; background: #ffd166; color: #2a1400; }
.hoja-chat .boton.gris { background: #ffffff18; color: #fff; }
.hoja-chat .error { color: #ffb4a8; font-size: 0.9rem; }
.cabeza-chat .avatar-c, .cabeza-chat .quien { cursor: pointer; }
.tarjeta-msj.terminada { background: linear-gradient(145deg, #3b3566, #2a2550); opacity: 0.85; }
.tarjeta-msj .fin-partida { font: 800 0.8rem system-ui, sans-serif; text-align: center; padding: 6px; border-radius: 10px; background: #0003; color: #c9c3f0; }
.partidas-chat { display: flex; gap: 8px; overflow-x: auto; padding: 8px 10px; background: #0d0a26b3; border-bottom: 1px solid #ffffff14; scrollbar-width: none; }
.partidas-chat[hidden] { display: none; }
.chip-partida { flex-shrink: 0; display: flex; align-items: center; gap: 8px; padding: 6px 6px 6px 10px; border-radius: 14px; border: 1px solid #ffffff22; background: #ffffff10; color: #fff; font: 700 0.85rem system-ui, sans-serif; text-align: left; animation: pop-reaccion 0.3s; }
.chip-partida .e { font-size: 1.4rem; }
.chip-partida b { display: block; font-size: 0.85rem; }
.chip-partida small { display: block; font-size: 0.72rem; color: #c9c3f0; }
.chip-partida i { font-style: normal; font-weight: 900; font-size: 0.8rem; padding: 6px 10px; border-radius: 10px; background: #ffffff1c; }
.chip-partida.urgente { border-color: #ffd166; background: #ffd16618; }
.chip-partida.urgente small { color: #ffd166; }
.chip-partida.urgente i { background: #ffd166; color: #2a1400; }
.perfil-hoja { display: flex; flex-direction: column; gap: 12px; }
.cabeza-perfil { display: flex; align-items: center; gap: 14px; }
.avatar-perfil { position: relative; width: 76px; height: 76px; flex-shrink: 0; }
.avatar-perfil img, .avatar-perfil > span:first-child { width: 100%; height: 100%; border-radius: 50%; display: flex; align-items: center; justify-content: center; font: 900 2rem system-ui, sans-serif; color: #1b1440; background: var(--c, #ffd166); object-fit: cover; box-shadow: 0 0 0 3px #ffd166; }
.nivel-insignia { position: absolute; right: -4px; bottom: -4px; min-width: 28px; height: 28px; padding: 0 6px; border-radius: 999px; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #ffd166, #ff9f1c); color: #2a1400; font: 900 0.9rem system-ui, sans-serif; border: 3px solid #241a5c; }
.datos-perfil { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
.datos-perfil h2 { font-size: 1.25rem; overflow: hidden; text-overflow: ellipsis; }
.barra-xp { height: 6px; border-radius: 999px; background: #ffffff1a; overflow: hidden; }
.barra-xp.grande { height: 9px; margin-top: 4px; }
.barra-xp i { display: block; height: 100%; border-radius: inherit; background: linear-gradient(90deg, #7ee0ff, #b388ff); transform-origin: left; animation: llenar-xp 0.8s ease-out; }
@keyframes llenar-xp { from { transform: scaleX(0); } }
.numeros-hoja { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; }
.numeros-hoja div { display: flex; flex-direction: column; align-items: center; padding: 8px 2px; border-radius: 12px; background: #ffffff10; font-size: 0.7rem; opacity: 0.9; }
.numeros-hoja b { font-size: 1.1rem; color: #ffd166; }
.perfil-hoja h3 { font-size: 0.95rem; margin-top: 4px; }
.niveles { list-style: none; display: flex; flex-direction: column; gap: 8px; padding: 0; margin: 0; }
.niveles li { display: flex; align-items: center; gap: 10px; padding: 8px 10px; border-radius: 12px; background: #ffffff0c; }
.niveles .e { font-size: 1.6rem; width: 32px; text-align: center; }
.dato-nivel { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px; }
.fila-nivel { display: flex; justify-content: space-between; gap: 8px; }
.fila-nivel b { font-size: 0.92rem; }
.fila-nivel .nv { flex-shrink: 0; font: 900 0.78rem system-ui, sans-serif; padding: 2px 8px; border-radius: 999px; background: #b388ff33; color: #d9c4ff; }
.dato-nivel small { font-size: 0.7rem; opacity: 0.7; }
.botones-perfil { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.hoja-chat .boton.peligro { background: #ff4d6d33; color: #ffb3c1; }
.aviso-copiado { position: fixed; left: 50%; bottom: 120px; transform: translateX(-50%); z-index: 90; padding: 8px 14px; border-radius: 999px; background: #000c; color: #fff; font: 700 0.85rem system-ui, sans-serif; animation: aparecer-menu 0.2s; }
`;

function ponerCss() {
    if (document.getElementById("css-chat")) return;
    const s = document.createElement("style");
    s.id = "css-chat";
    s.textContent = CSS_CHAT;
    document.head.appendChild(s);
}

// Hoja inferior para elegir algo (juego, regalo)
function hojaChat(html, alCerrar) {
    ponerCss();
    const fondo = document.createElement("div");
    fondo.className = "hoja-chat-fondo";
    fondo.innerHTML = `<div class="hoja-chat">${html}<button class="boton gris cerrar" type="button">Cancelar</button></div>`;
    const cerrar = () => {
        fondo.remove();
        alCerrar?.();
    };
    fondo.addEventListener("click", (e) => e.target === fondo && cerrar());
    fondo.querySelector(".cerrar").addEventListener("click", cerrar);
    document.body.appendChild(fondo);
    return { fondo, cerrar };
}

// Perfil de un jugador (el tuyo o el de un amigo): nivel total, victorias, fichas y el nivel de cada juego.
// acciones: [{ texto, accion, clase }] para los botones de abajo. Se actualiza solo mientras está abierto.
export function hojaPerfil(uid, nombre, { acciones = [] } = {}) {
    let datos = null;
    let b = null;
    let juegos = [];
    const paradas = [];
    const { fondo, cerrar } = hojaChat(`<div class="perfil-hoja"></div>`, () => paradas.forEach((p) => p()));
    fondo.querySelector(".cerrar").textContent = "Cerrar";
    const caja = fondo.querySelector(".perfil-hoja");
    const infoJuego = (clave) =>
        juegos.find((j) => j.carpeta === `games/${clave}/`) ?? JUEGOS_ONLINE[clave] ?? { nombre: clave, emoji: "🎮" };

    function pintarPerfil() {
        const s = b?.stats ?? {};
        const filas = Object.entries(s.juegos ?? {})
            .map(([clave, r]) => ({ info: infoJuego(clave), r: r ?? {}, xp: r?.xp ?? 0 }))
            .filter((f) => f.xp > 0 || f.r.ganadas || f.r.perdidas || f.r.empates)
            .sort((x, y) => y.xp - x.xp);
        const total = progresoNivel(b?.xp ?? 0);
        const htmlFila = (f) => {
            const p = progresoNivel(f.xp);
            const r = f.r;
            const record = r.ganadas || r.perdidas || r.empates ? ` · ${r.ganadas ?? 0}G ${r.perdidas ?? 0}P${r.empates ? ` ${r.empates}E` : ""}` : "";
            return `<li><span class="e">${f.info.emoji}</span><div class="dato-nivel">
                <div class="fila-nivel"><b>${escaparHtml(f.info.nombre)}</b><span class="nv">Nv ${p.nivel}</span></div>
                <div class="barra-xp"><i style="width:${p.porcentaje}%"></i></div>
                <small>${formatear(f.xp)} XP · faltan ${formatear(p.falta)} para el ${p.nivel + 1}${record}</small></div></li>`;
        };
        caja.innerHTML = `
            <div class="cabeza-perfil">
                <div class="avatar-perfil">${htmlAvatar(datos, escaparHtml(nombre))}<span class="nivel-insignia">${total.nivel}</span></div>
                <div class="datos-perfil">
                    <h2>${escaparHtml(datos?.nombre ?? nombre)}</h2>
                    <span class="suave">${uid === yo() ? "Tu perfil" : textoConexion(datos)}</span>
                    <div class="barra-xp grande"><i style="width:${total.porcentaje}%"></i></div>
                    <small class="suave">Nivel ${total.nivel} · ${formatear(total.actual)}/${formatear(total.total)} XP</small>
                </div>
            </div>
            <div class="numeros-hoja">
                <div><b>${s.ganadas ?? 0}</b>Victorias</div><div><b>${s.perdidas ?? 0}</b>Derrotas</div>
                <div><b>${s.empates ?? 0}</b>Empates</div><div><b>${b ? formatear(b.fichas ?? 0) : "?"}</b>Fichas</div>
            </div>
            <h3>Nivel por juego</h3>
            ${filas.length
                ? `<ul class="niveles">${filas.map(htmlFila).join("")}</ul>`
                : `<p class="suave">Todavía no tiene niveles. Cada minuto jugado y cada partida ganada suman experiencia en ese juego.</p>`}
            ${acciones.length ? `<div class="botones-perfil">${acciones.map((a, i) => `<button type="button" class="boton ${a.clase ?? ""}" data-i="${i}">${a.texto}</button>`).join("")}</div>` : ""}`;
        for (const btn of caja.querySelectorAll("[data-i]")) {
            btn.addEventListener("click", () => {
                cerrar();
                acciones[btn.dataset.i].accion();
            });
        }
    }
    paradas.push(
        escucharUsuario(uid, (d) => {
            datos = d;
            pintarPerfil();
        }),
        escucharBilletera(uid, (d) => {
            b = d;
            pintarPerfil();
        })
    );
    catalogo().then((l) => {
        juegos = l;
        pintarPerfil();
    });
    pintarPerfil();
    return { cerrar };
}

const APUESTAS_DESAFIO = [0, 100, 1000, 10000, 100000, 1000000, 10000000];
const REGALOS = [100, 500, 1000, 10000, 100000, 1000000];

// Elegir juego y apuesta para desafiar a un amigo. Crea la partida y la manda por el chat.
// alCrear(id, clave) decide qué hacer después (por defecto, ir a jugar).
export function hojaDesafio(amigo, miNombre, alCrear = (id, clave) => (location.href = urlJuego(clave, id))) {
    let apuesta = 0;
    const { fondo, cerrar } = hojaChat(`<h2>⚔️ Desafiar a ${escaparHtml(amigo.nombre)}</h2>
        <span class="suave">Apuesta (cada uno pone, el que gana se lleva todo). Tenés 🪙 ${formatear(fichas())}</span>
        <div class="montos">${APUESTAS_DESAFIO.map((m) => `<button class="monto${m ? "" : " elegido"}" data-m="${m}" ${m > fichas() ? "disabled" : ""}>${m ? formatear(m) : "Sin apuesta"}</button>`).join("")}</div>
        <div class="juegos"></div><p class="error" hidden></p>`);
    for (const b of fondo.querySelectorAll(".monto")) {
        b.addEventListener("click", () => {
            apuesta = Number(b.dataset.m);
            for (const o of fondo.querySelectorAll(".monto")) o.classList.toggle("elegido", o === b);
        });
    }
    for (const [clave, juego] of Object.entries(JUEGOS_ONLINE)) {
        const b = document.createElement("button");
        b.innerHTML = `<span>${juego.emoji}</span>${juego.nombre}`;
        b.addEventListener("click", async () => {
            b.disabled = true;
            try {
                const { datosIniciales } = await import(juego.reglas);
                const id = await crearPartida(clave, miNombre, amigo, datosIniciales(), apuesta);
                await enviarMensaje(rutaChatAmigo(amigo.uid), `${juego.emoji} Te desafío a ${juego.nombre}${apuesta ? ` por ${formatear(apuesta)} fichas` : ""}`, {
                    tipo: "partida", partida: id, juego: clave, apuesta,
                }).catch(() => {});
                cerrar();
                alCrear(id, clave);
            } catch (error) {
                const p = fondo.querySelector(".error");
                p.textContent = error.message;
                p.hidden = false;
                b.disabled = false;
            }
        });
        fondo.querySelector(".juegos").appendChild(b);
    }
}

// Regalar fichas a un amigo (el regalo aparece en el chat)
export function hojaRegalo(amigo, miNombre, alRegalar) {
    const { fondo, cerrar } = hojaChat(`<h2>🎁 Regalar fichas a ${escaparHtml(amigo.nombre)}</h2>
        <span class="suave">Tenés 🪙 ${formatear(fichas())}. Se descuentan de tu saldo.</span>
        <div class="montos">${REGALOS.map((m) => `<button class="monto" data-m="${m}" ${m > fichas() ? "disabled" : ""}>${formatear(m)}</button>`).join("")}</div>
        <form class="fila"><input type="number" min="1" max="10000000" inputmode="numeric" placeholder="Otra cantidad"><button class="boton">Regalar</button></form>
        <p class="error" hidden></p>`);
    const error = fondo.querySelector(".error");
    const enviar = async (cantidad) => {
        error.hidden = true;
        if (!confirm(`¿Regalarle ${formatear(cantidad)} fichas a ${amigo.nombre}?`)) return;
        try {
            await regalarFichas(amigo, cantidad, miNombre);
            cerrar();
            alRegalar?.(cantidad);
        } catch (e) {
            error.textContent = e.code === "permission-denied" ? "No se pudo mandar el regalo." : e.message;
            error.hidden = false;
        }
    };
    for (const b of fondo.querySelectorAll(".monto")) b.addEventListener("click", () => enviar(Number(b.dataset.m)));
    fondo.querySelector("form").addEventListener("submit", (e) => {
        e.preventDefault();
        const n = Math.floor(Number(fondo.querySelector("input").value));
        if (n > 0) enviar(n);
    });
}

function avisoCorto(texto) {
    const el = document.createElement("div");
    el.className = "aviso-copiado";
    el.textContent = texto;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1400);
}

// Menú al mantener apretado un mensaje: reacciones, responder, copiar y borrar
function menuMensaje(m, el, { ruta, alResponder }) {
    navigator.vibrate?.(15);
    const r = el.getBoundingClientRect();
    const fondo = document.createElement("div");
    fondo.className = "menu-msj-fondo";
    const mia = m.reacciones?.[yo()];
    const opciones = [`<button data-o="responder">↩️ Responder</button>`];
    if (!m.tipo || m.tipo === "texto") opciones.push(`<button data-o="copiar">📋 Copiar</button>`);
    if (m.de === yo()) opciones.push(`<button data-o="borrar" class="peligro">🗑️ Borrar para todos</button>`);
    fondo.innerHTML = `<div class="menu-msj">
        <div class="fila-reacciones">${REACCIONES.map((e, i) => `<button data-e="${e}" class="${e === mia ? "elegida" : ""}" style="animation-delay:${i * 30}ms">${e}</button>`).join("")}</div>
        <div class="opciones">${opciones.join("")}</div></div>`;
    const menu = fondo.querySelector(".menu-msj");
    // Arriba o abajo del mensaje, según dónde haya lugar
    const alto = 60 + opciones.length * 48;
    menu.style.top = `${Math.max(12, Math.min(innerHeight - alto - 12, r.bottom + alto + 12 < innerHeight ? r.bottom + 8 : r.top - alto - 8))}px`;
    const cerrar = () => fondo.remove();
    fondo.addEventListener("click", (e) => e.target === fondo && cerrar());
    for (const b of fondo.querySelectorAll("[data-e]")) {
        b.addEventListener("click", () => {
            reaccionar(ruta, m, b.dataset.e).catch(() => {});
            cerrar();
        });
    }
    const acciones = {
        responder: () => alResponder(m),
        copiar: () => navigator.clipboard?.writeText(m.texto).then(() => avisoCorto("Copiado")),
        borrar: () => confirm("¿Borrar este mensaje para los dos?") && borrarMensaje(ruta, m.id).catch(() => {}),
    };
    for (const b of fondo.querySelectorAll("[data-o]")) {
        b.addEventListener("click", () => {
            cerrar();
            acciones[b.dataset.o]();
        });
    }
    document.body.appendChild(fondo);
}

// Chat a pantalla completa. otroUid: con quién se habla (encabezado con foto y conexión).
// Con amigo (y miNombre) suma botones para mandar un juego o regalar fichas. Devuelve { cerrar }.
export function panelChat({ titulo, ruta, nombres, clave, alCerrar, amigo, miNombre, otroUid }) {
    ponerCss();
    otroUid ??= amigo?.uid;
    const esAmigo = ruta[0] === "chats";
    const panel = document.createElement("div");
    panel.className = "panel-chat";
    panel.innerHTML = `
        <header class="cabeza-chat">
            <button type="button" class="volver" aria-label="Volver">‹</button>
            <div class="avatar-c">${htmlAvatar(null, escaparHtml(titulo.replace(/^💬\s*/, "")))}</div>
            <div class="quien"><strong>${escaparHtml(titulo.replace(/^💬\s*/, ""))}</strong><span class="estado"></span></div>
            ${amigo ? `<button type="button" class="accion-c" data-a="juego" aria-label="Mandar un juego">🎮</button><button type="button" class="accion-c" data-a="regalo" aria-label="Regalar fichas">🎁</button>` : ""}
        </header>
        <div class="partidas-chat" hidden></div>
        <div class="lista-msj"></div>
        <div class="pie-chat">
            <div class="respondiendo"><div></div><button type="button" aria-label="Cancelar respuesta">✕</button></div>
            <div class="grilla-emojis">${EMOJIS.map((e) => `<button type="button">${e}</button>`).join("")}</div>
            <form class="form-chat">
                <button type="button" class="icono" data-a="emojis" aria-label="Emojis">😀</button>
                <textarea rows="1" maxlength="${TEXTO_MAX}" placeholder="Mensaje" enterkeyhint="send"></textarea>
                <button class="enviar" aria-label="Enviar" disabled>➤</button>
            </form>
        </div>`;
    const lista = panel.querySelector(".lista-msj");
    const texto = panel.querySelector("textarea");
    const enviar = panel.querySelector(".enviar");
    const grilla = panel.querySelector(".grilla-emojis");
    const barraRespuesta = panel.querySelector(".respondiendo");
    const estado = panel.querySelector(".estado");
    const paradas = [];
    let mensajes = [];
    let respondiendo = null;
    let perfilOtro = null;
    let meta = {};

    // Encabezado: foto, en línea o escribiendo
    const pintarEstado = () => {
        const escribe = esAmigo && meta.escribiendo?.[otroUid] && Date.now() - ms(meta.escribiendo[otroUid]) < 6000;
        estado.textContent = escribe ? "escribiendo…" : perfilOtro ? textoConexion(perfilOtro) : "";
        estado.classList.toggle("escribiendo", Boolean(escribe));
        lista.querySelector(".escribiendo-burbuja")?.remove();
        if (escribe) {
            lista.insertAdjacentHTML("beforeend", `<div class="escribiendo-burbuja"><i></i><i></i><i></i></div>`);
            if (lista.scrollHeight - lista.scrollTop - lista.clientHeight < 120) lista.scrollTop = lista.scrollHeight;
        }
    };
    if (otroUid) {
        paradas.push(escucharUsuario(otroUid, (d) => {
            perfilOtro = d;
            panel.querySelector(".avatar-c").innerHTML = htmlAvatar(d, escaparHtml(titulo.replace(/^💬\s*/, "")));
            pintarEstado();
        }));
    }
    const refMeta = esAmigo ? doc(db, ...ruta) : null;
    if (refMeta) paradas.push(onSnapshot(refMeta, (d) => {
        meta = d.data() ?? {};
        pintar();
    }, () => {}));
    const reloj = setInterval(pintarEstado, 3000);

    // Visto: se avisa hasta cuándo leíste (como mucho cada 2 segundos)
    let ultimoVisto = 0;
    const avisarVisto = () => {
        marcarLeido(clave);
        if (!refMeta || Date.now() - ultimoVisto < 2000) return;
        ultimoVisto = Date.now();
        setDoc(refMeta, { leido: { [yo()]: serverTimestamp() } }, { merge: true }).catch(() => {});
    };
    // Escribiendo: se avisa como mucho cada 3 segundos mientras tipeás
    let ultimoEscribiendo = 0;
    const avisarEscribiendo = () => {
        if (!refMeta || Date.now() - ultimoEscribiendo < 3000) return;
        ultimoEscribiendo = Date.now();
        setDoc(refMeta, { escribiendo: { [yo()]: serverTimestamp() } }, { merge: true }).catch(() => {});
    };

    // Partidas en curso con este amigo: arriba del chat, para entrar a jugar o aceptar
    let activas = null;
    const barraPartidas = panel.querySelector(".partidas-chat");
    if (esAmigo && otroUid) {
        const q = query(collection(db, "partidas"), where("jugadores", "array-contains", yo()));
        paradas.push(onSnapshot(q, (snap) => {
            const enCursoConEl = snap.docs
                .map((d) => ({ id: d.id, ...d.data() }))
                .filter((p) => p.jugadores.includes(otroUid) && enCurso(p))
                .sort((a, b) => (b.turno === yo()) - (a.turno === yo()) || ms(b.actualizada) - ms(a.actualizada));
            activas = new Set(enCursoConEl.map((p) => p.id));
            pintarPartidas(enCursoConEl);
            pintar();
        }, () => {}));
    }
    function pintarPartidas(partidas) {
        barraPartidas.hidden = !partidas.length;
        barraPartidas.replaceChildren(...partidas.map((p) => {
            const j = JUEGOS_ONLINE[p.juego] ?? { emoji: "🎮", nombre: p.juego };
            const meDesafio = p.estado === "invitada" && p.creador !== yo();
            const miTurno = p.estado === "jugando" && p.turno === yo();
            const texto = meDesafio ? "¡Te desafió!" : p.estado === "invitada" ? "Falta que acepte" : miTurno ? "Tu turno" : "Turno del otro";
            const b = document.createElement("button");
            b.type = "button";
            b.className = `chip-partida${meDesafio || miTurno ? " urgente" : ""}`;
            b.innerHTML = `<span class="e">${j.emoji}</span><span><b>${escaparHtml(j.nombre)}</b><small>${texto}${p.apuesta ? ` · 🪙${formatear(p.apuesta)}` : ""}</small></span><i>${meDesafio ? "Aceptar" : miTurno ? "Jugar" : "Ver"}</i>`;
            b.addEventListener("click", async () => {
                if (meDesafio && !(await aceptarPartida(p))) return;
                location.href = urlJuego(p.juego, p.id);
            });
            return b;
        }));
    }

    function pintar() {
        const abajo = lista.scrollHeight - lista.scrollTop - lista.clientHeight < 120;
        const visto = meta.leido?.[otroUid] ? ms(meta.leido[otroUid]) : 0;
        lista.innerHTML = mensajes.length
            ? htmlMensajes(mensajes, nombres, visto, activas)
            : `<div class="vacio-chat"><span>👋</span>Todavía no hay mensajes.<br>¡Saludá!</div>`;
        pintarEstado();
        if (abajo || !pintar.yaBajo) {
            lista.scrollTop = lista.scrollHeight;
            pintar.yaBajo = true;
        }
    }
    paradas.push(escucharChat(ruta, (lista) => {
        const nuevoDelOtro = lista.length && lista.at(-1).de !== yo() && lista.at(-1).id !== mensajes.at(-1)?.id && mensajes.length;
        mensajes = lista;
        pintar();
        avisarVisto();
        if (nuevoDelOtro) navigator.vibrate?.(20);
    }));

    // Mantener apretado (o doble toque = ❤️)
    let temporizador = 0;
    let ultimoToque = { id: null, t: 0 };
    const mensajeDe = (e) => {
        const el = e.target.closest(".msj");
        return el && !e.target.closest("a") ? { el, m: mensajes.find((x) => x.id === el.dataset.id) } : null;
    };
    lista.addEventListener("pointerdown", (e) => {
        const r = mensajeDe(e);
        if (!r?.m) return;
        r.el.classList.add("apretado");
        temporizador = setTimeout(() => {
            r.el.classList.remove("apretado");
            menuMensaje(r.m, r.el, { ruta, alResponder: responder });
        }, 450);
    });
    const soltar = () => {
        clearTimeout(temporizador);
        lista.querySelector(".apretado")?.classList.remove("apretado");
    };
    for (const ev of ["pointerup", "pointercancel", "pointerleave"]) lista.addEventListener(ev, soltar);
    lista.addEventListener("scroll", soltar, { passive: true });
    lista.addEventListener("contextmenu", (e) => e.preventDefault());
    lista.addEventListener("click", (e) => {
        const r = mensajeDe(e);
        if (!r?.m) return;
        const ahora = Date.now();
        if (ultimoToque.id === r.m.id && ahora - ultimoToque.t < 320) {
            reaccionar(ruta, r.m, "❤️").catch(() => {});
            ultimoToque = { id: null, t: 0 };
        } else ultimoToque = { id: r.m.id, t: ahora };
    });

    function responder(m) {
        respondiendo = m;
        barraRespuesta.querySelector("div").innerHTML = `<b>${m.de === yo() ? "Vos" : escaparHtml(nombres[m.de] ?? "")}</b>${escaparHtml(m.texto)}`;
        barraRespuesta.classList.add("activo");
        texto.focus();
    }
    barraRespuesta.querySelector("button").addEventListener("click", () => {
        respondiendo = null;
        barraRespuesta.classList.remove("activo");
    });

    const ajustarAlto = () => {
        texto.style.height = "auto";
        texto.style.height = `${Math.min(120, texto.scrollHeight)}px`;
        enviar.disabled = !texto.value.trim();
    };
    texto.addEventListener("input", () => {
        ajustarAlto();
        avisarEscribiendo();
    });
    // Enter manda (Shift+Enter hace una línea nueva)
    texto.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            panel.querySelector("form").requestSubmit();
        }
    });
    panel.querySelector("form").addEventListener("submit", (e) => {
        e.preventDefault();
        if (!texto.value.trim()) return;
        const extra = respondiendo ? { responde: { id: respondiendo.id, de: respondiendo.de, texto: respondiendo.texto.slice(0, 120) } } : {};
        enviarMensaje(ruta, texto.value, extra)?.catch(() => avisoCorto("No se pudo mandar"));
        texto.value = "";
        ajustarAlto();
        respondiendo = null;
        barraRespuesta.classList.remove("activo");
        grilla.classList.remove("abierto");
        lista.scrollTop = lista.scrollHeight;
    });
    for (const b of grilla.querySelectorAll("button")) {
        b.addEventListener("click", () => {
            texto.value += b.textContent;
            ajustarAlto();
        });
    }

    const cerrar = () => {
        paradas.forEach((p) => p());
        clearInterval(reloj);
        panel.remove();
        marcarLeido(clave);
        alCerrar?.();
    };
    const acciones = {
        emojis: () => grilla.classList.toggle("abierto"),
        juego: () => hojaDesafio(amigo, miNombre, () => {}),
        regalo: () => hojaRegalo(amigo, miNombre),
    };
    for (const b of panel.querySelectorAll("[data-a]")) b.addEventListener("click", () => acciones[b.dataset.a]());
    // Tocar la foto o el nombre abre su perfil (con sus niveles)
    const verPerfil = () =>
        otroUid && hojaPerfil(otroUid, titulo.replace(/^💬\s*/, ""), {
            acciones: amigo ? [{ texto: "⚔️ Desafiar", accion: acciones.juego }, { texto: "🎁 Regalar", accion: acciones.regalo }] : [],
        });
    panel.querySelector(".avatar-c").addEventListener("click", verPerfil);
    panel.querySelector(".quien").addEventListener("click", verPerfil);
    panel.querySelector(".volver").addEventListener("click", cerrar);
    document.body.appendChild(panel);
    return { cerrar };
}

// Botón de chat flotante dentro de las partidas online (aparece solo en todos los juegos)
function abrirChatPartida(p) {
    if (document.querySelector(".chat-flotante")) return;
    ponerCss();
    const ruta = ["partidas", p.id];
    const clave = `partida-${p.id}`;
    const boton = document.createElement("button");
    boton.className = "chat-flotante";
    boton.type = "button";
    boton.innerHTML = `💬<span class="insignia-chat" hidden></span>`;
    let abierto = null;
    let vistos = null;
    escucharChat(ruta, (mensajes) => {
        const nuevos = vistos === null ? [] : mensajes.filter((m) => !vistos.has(m.id) && m.de !== yo());
        vistos = new Set(mensajes.map((m) => m.id));
        // Los mensajes del rival aparecen un momento en el medio de la pantalla
        if (!abierto) {
            for (const m of nuevos.slice(-1)) {
                const b = document.createElement("div");
                const emojis = soloEmojis(m.texto);
                if (emojis) {
                    b.className = "burbuja-rival emoji";
                    b.innerHTML = emojis.map((e) => htmlEmojiAnimado(e)).join("");
                } else {
                    b.className = "burbuja-rival";
                    b.textContent = m.texto;
                }
                document.body.appendChild(b);
                setTimeout(() => b.remove(), 2700);
                navigator.vibrate?.(30);
            }
        }
        const n = abierto ? 0 : sinLeer(clave, mensajes);
        const insignia = boton.querySelector(".insignia-chat");
        insignia.hidden = !n;
        insignia.textContent = n;
    });
    boton.addEventListener("click", () => {
        if (abierto) return abierto.cerrar();
        boton.querySelector(".insignia-chat").hidden = true;
        const rival = p.jugadores.find((j) => j !== yo());
        abierto = panelChat({ titulo: p.nombres?.[rival] ?? "Chat", ruta, nombres: p.nombres, clave, otroUid: rival, alCerrar: () => (abierto = null) });
    });
    document.body.appendChild(boton);
}

// Cartel con el pozo de la apuesta arriba del juego
function pintarPozo(p) {
    if (!p.apuesta) return;
    let el = document.querySelector(".pozo-flotante");
    if (!el) {
        ponerCss();
        el = document.createElement("div");
        el.className = "pozo-flotante";
        document.body.appendChild(el);
    }
    const ambos = p.pagado?.[p.jugadores[0]] && p.pagado?.[p.jugadores[1]];
    el.textContent = p.estado === "terminada"
        ? p.ganador === "empate" ? `🤝 Empate · vuelven ${formatear(p.apuesta)}` : `🏆 Pozo ${formatear(p.apuesta * 2)} para ${p.nombres?.[p.ganador] ?? "?"}`
        : `🪙 Pozo ${formatear(p.apuesta * (ambos ? 2 : 1))}${ambos ? "" : " · falta que acepte"}`;
}

export const actualizarPartida = (id, cambios) => updateDoc(doc(db, "partidas", id), { ...cambios, actualizada: serverTimestamp() });

// Revancha compartida: el primero que la pide crea la partida nueva y la anota en la terminada;
// si el otro también toca "Revancha", entra a esa misma. Es una transacción, así que aunque
// los dos toquen a la vez se crea una sola.
export async function revancha(idAnterior, datosIniciales) {
    const refAnterior = doc(db, "partidas", idAnterior);
    const b = await billetera();
    return runTransaction(db, async (tx) => {
        const anterior = await tx.get(refAnterior);
        const p = anterior.data();
        if (p.revancha) return p.revancha;
        const rival = p.jugadores.find((j) => j !== yo());
        const nueva = doc(collection(db, "partidas"));
        // Se repite la misma apuesta si te alcanzan las fichas
        const apuesta = b && p.apuesta && fichas() >= p.apuesta ? p.apuesta : 0;
        if (apuesta) tx.update(b.ref, { fichas: increment(-apuesta) });
        tx.set(nueva, {
            apuesta,
            pagado: apuesta ? { [yo()]: true } : {},
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

// Chat entre dos amigos: chats/{idAmistad}/mensajes
export const rutaChatAmigo = (uid) => ["chats", idAmistad(yo(), uid)];

// Billetera y estadísticas de un jugador (para el ranking y el perfil)
export function escucharBilletera(uid, alCambiar) {
    return onSnapshot(doc(db, "billeteras", uid), (d) => alCambiar(d.exists() ? d.data() : null), () => {});
}

export const JUEGOS_ONLINE = {
    arco: { nombre: "Tiro con arco", emoji: "🏹", carpeta: "games/arco/", reglas: "../games/arco/reglas.js" },
    pool: { nombre: "Pool", emoji: "🎱", carpeta: "games/pool/", reglas: "../games/pool/reglas.js" },
    cuatro: { nombre: "4 en línea", emoji: "🔴", carpeta: "games/cuatro/", reglas: "../games/cuatro/reglas.js" },
    tateti: { nombre: "Ta-te-tí", emoji: "❌", carpeta: "games/tateti/", reglas: "../games/tateti/reglas.js" },
    damas: { nombre: "Damas", emoji: "⚫", carpeta: "games/damas/", reglas: "../games/damas/reglas.js" },
    mancala: { nombre: "Mancala", emoji: "🥥", carpeta: "games/mancala/", reglas: "../games/mancala/reglas.js" },
    naval: { nombre: "Batalla naval", emoji: "🚢", carpeta: "games/naval/", reglas: "../games/naval/reglas.js" },
    reversi: { nombre: "Reversi", emoji: "⚪", carpeta: "games/reversi/", reglas: "../games/reversi/reglas.js" },
    cajas: { nombre: "Puntos y cajas", emoji: "🟦", carpeta: "games/cajas/", reglas: "../games/cajas/reglas.js" },
};
