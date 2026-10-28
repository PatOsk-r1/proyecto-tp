// Multijugador: nombre de usuario, amigos y partidas entre amigos (Firestore).
// Las reglas que protegen estos datos están en firebase/firestore.rules.
import { app, auth } from "./sesion.js";
import {
    getFirestore, doc, getDoc, collection, query, where, onSnapshot, writeBatch, setDoc, updateDoc, deleteDoc, addDoc,
    serverTimestamp, deleteField, runTransaction, increment, orderBy, limit,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { fichas, billetera, avisoFichas, regalarFichas } from "./fichas.js";
import { STICKERS, PICANTES, EMOJIS, CSS_STICKERS, stickerDe, htmlSticker, picantesActivos, activarPicantes } from "./stickers.js";

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
        alCambiar(lista);
    });
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
            lote.update(b.ref, {
                [`stats.${resultado}`]: increment(1),
                [`stats.juegos.${p.juego}.${resultado}`]: increment(1),
                xp: increment(resultado === "ganadas" ? 30 : 10),
                ...(premio ? { fichas: increment(premio) } : {}),
            });
            await lote.commit();
            if (premio) avisoFichas(resultado === "ganadas" ? `🏆 ¡Ganaste el pozo! +${formatear(premio)} fichas` : `🤝 Empate: vuelven tus ${formatear(premio)} fichas`);
        } else {
            await lote.commit();
        }
    } catch {
        liquidando.delete(p.id);
    }
}

// Nivel según la experiencia (30 por victoria, 10 por derrota o empate)
export const nivelDe = (xp = 0) => Math.floor(Math.sqrt(xp / 40)) + 1;

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
export const TEXTO_MAX = 300;
export const RAPIDOS = ["👍", "😂", "😮", "😡", "🔥", "👏", "😎", "🙏", "¡Bien jugado!", "¡Suerte!", "Uff", "GG"];

export function escucharChat(ruta, alCambiar, cuantos = 60) {
    const q = query(collection(db, ...ruta, "mensajes"), orderBy("creado", "desc"), limit(cuantos));
    return onSnapshot(q, (snap) => alCambiar(snap.docs.map((d) => ({ id: d.id, ...d.data() })).reverse()), () => {});
}

// tipo: "texto" (por defecto), "sticker", "partida" (un juego mandado por el chat) o "regalo" (fichas regaladas).
// texto siempre lleva un resumen legible.
export function enviarMensaje(ruta, texto, extra = {}) {
    texto = String(texto).trim().slice(0, TEXTO_MAX);
    if (!texto) return;
    return addDoc(collection(db, ...ruta, "mensajes"), { de: yo(), texto, creado: serverTimestamp(), ...extra });
}

export const enviarSticker = (ruta, id) => {
    const s = stickerDe(id);
    return s && enviarMensaje(ruta, `${s.e} ${s.t}`, { tipo: "sticker", sticker: id });
};

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

// Arma una lista de mensajes con burbujas (se usa en el chat de amigos y en el de partidas)
export function htmlMensajes(mensajes, nombres = {}) {
    return mensajes
        .map((m) => {
            const mio = m.de === yo();
            const hora = m.creado?.toDate?.().toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" }) ?? "";
            const quien = mio ? "" : `<b>${escaparHtml(nombres[m.de] ?? "")}</b>`;
            let clase = "";
            let cuerpo;
            if (m.tipo === "sticker" && stickerDe(m.sticker)) {
                clase = "sticker-msj";
                cuerpo = htmlSticker(m.sticker);
            } else if (m.tipo === "partida" && JUEGOS_ONLINE[m.juego]) {
                const j = JUEGOS_ONLINE[m.juego];
                clase = "tarjeta";
                cuerpo = `<div class="tarjeta-msj"><span class="grande">${j.emoji}</span>
                    <strong>${mio ? "Desafiaste a" : "¡Te desafió a"} ${j.nombre}${mio ? "" : "!"}</strong>
                    ${m.apuesta ? `<span>🪙 Apuesta ${formatear(m.apuesta)} cada uno</span>` : "<span>Sin apuesta</span>"}
                    <a href="${urlJuego(m.juego, m.partida)}">${mio ? "Abrir partida" : "Jugar"}</a></div>`;
            } else if (m.tipo === "regalo") {
                clase = "tarjeta";
                cuerpo = `<div class="tarjeta-msj regalo"><span class="grande">🎁</span>
                    <strong>${mio ? "Regalaste" : "¡Te regaló"} 🪙 ${formatear(m.cantidad ?? 0)} fichas${mio ? "" : "!"}</strong></div>`;
            } else {
                clase = /^\p{Extended_Pictographic}{1,3}$/u.test(m.texto) ? "emoji" : "";
                cuerpo = `<span>${escaparHtml(m.texto)}</span>`;
            }
            return `<div class="msj ${mio ? "mio" : ""} ${clase}">${quien}${cuerpo}<small>${hora}</small></div>`;
        })
        .join("");
}

export const CSS_CHAT = `
.chat-flotante { position: fixed; right: 8px; top: calc(58px + env(safe-area-inset-top)); z-index: 50; width: 44px; height: 44px; border-radius: 50%; border: none; font-size: 1.3rem; background: #ffd166e6; box-shadow: 0 6px 18px #0009; }
.chat-flotante .insignia-chat { position: absolute; top: -4px; right: -4px; min-width: 20px; padding: 1px 5px; border-radius: 999px; background: #ff4d6d; color: #fff; font: 900 0.75rem system-ui, sans-serif; }
.pozo-flotante { position: fixed; left: 50%; bottom: calc(6px + env(safe-area-inset-bottom)); transform: translateX(-50%); z-index: 40; padding: 4px 12px; border-radius: 999px; background: #000a; color: #ffd166; font: 900 0.8rem system-ui, sans-serif; pointer-events: none; border: 1px solid #ffd16655; }
.panel-chat { position: fixed; inset: auto 0 0 0; z-index: 60; max-width: 560px; margin: 0 auto; height: min(82vh, 640px); display: flex; flex-direction: column; gap: 6px; background: #1d1650; border-radius: 20px 20px 0 0; box-shadow: 0 -10px 30px #000a; padding: 12px 12px calc(12px + env(safe-area-inset-bottom)); color: #fff; font-family: system-ui, sans-serif; animation: subir-chat 0.25s ease-out; }
@keyframes subir-chat { from { transform: translateY(100%); } }
.panel-chat header { display: flex; justify-content: space-between; align-items: center; font-weight: 900; }
.panel-chat header button { font: inherit; background: #ffffff18; color: #fff; border: none; border-radius: 10px; padding: 6px 12px; }
.lista-msj { flex: 1; min-height: 0; overflow-y: auto; display: flex; flex-direction: column; gap: 6px; padding: 4px 2px; }
.msj { align-self: flex-start; max-width: 80%; padding: 7px 11px; border-radius: 16px 16px 16px 4px; background: #ffffff1c; font-size: 0.95rem; overflow-wrap: anywhere; }
.msj.mio { align-self: flex-end; border-radius: 16px 16px 4px 16px; background: #6c4cf5; }
.msj b { display: block; font-size: 0.7rem; color: #ffd166; }
.msj small { display: block; text-align: right; font-size: 0.62rem; opacity: 0.6; }
.msj.emoji { background: none; font-size: 2rem; padding: 0 4px; }
.rapidos { display: flex; gap: 6px; overflow-x: auto; scrollbar-width: none; }
.rapidos button { flex-shrink: 0; font: 700 0.95rem system-ui, sans-serif; color: #fff; background: #ffffff14; border: 1px solid #ffffff22; border-radius: 999px; padding: 6px 10px; }
.form-chat { display: flex; gap: 6px; }
.form-chat input { flex: 1; min-width: 0; font: inherit; font-size: 16px; color: #fff; background: #ffffff12; border: 1px solid #ffffff22; border-radius: 12px; padding: 10px; outline: none; }
.form-chat button { font: 900 1rem system-ui, sans-serif; border: none; border-radius: 12px; padding: 0 12px; background: #ffd166; color: #2a1400; }
.form-chat button.icono { background: #ffffff18; color: #fff; font-size: 1.2rem; padding: 0 10px; }
.burbuja-rival { position: fixed; left: 50%; top: 30%; transform: translateX(-50%); z-index: 55; padding: 10px 16px; border-radius: 18px; background: #fff; color: #1d1650; font: 800 1.05rem system-ui, sans-serif; box-shadow: 0 10px 30px #0009; animation: burbuja 2.6s ease-out forwards; pointer-events: none; max-width: 80vw; text-align: center; }
.burbuja-rival.emoji { font-size: 3rem; background: none; box-shadow: none; }
.burbuja-rival.sin-fondo { background: none; box-shadow: none; padding: 0; }
@keyframes burbuja { 0% { opacity: 0; transform: translate(-50%, 20px) scale(0.6); } 12% { opacity: 1; transform: translate(-50%, 0) scale(1.05); } 80% { opacity: 1; transform: translate(-50%, -10px); } 100% { opacity: 0; transform: translate(-50%, -40px); } }
.hoja-chat-fondo { position: fixed; inset: 0; z-index: 70; display: flex; align-items: flex-end; justify-content: center; background: #0009; }
.hoja-chat { width: 100%; max-width: 560px; max-height: 88vh; overflow-y: auto; padding: 18px 16px calc(18px + env(safe-area-inset-bottom)); border-radius: 20px 20px 0 0; background: #241a5c; color: #fff; display: flex; flex-direction: column; gap: 10px; font-family: system-ui, sans-serif; animation: subir-chat 0.25s ease-out; }
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
${CSS_STICKERS}
`;

function ponerCss() {
    if (document.getElementById("css-chat")) return;
    const s = document.createElement("style");
    s.id = "css-chat";
    s.textContent = CSS_CHAT;
    document.head.appendChild(s);
}

// Hoja inferior para elegir algo (juego, regalo)
function hojaChat(html) {
    ponerCss();
    const fondo = document.createElement("div");
    fondo.className = "hoja-chat-fondo";
    fondo.innerHTML = `<div class="hoja-chat">${html}<button class="boton gris cerrar" type="button">Cancelar</button></div>`;
    const cerrar = () => fondo.remove();
    fondo.addEventListener("click", (e) => e.target === fondo && cerrar());
    fondo.querySelector(".cerrar").addEventListener("click", cerrar);
    document.body.appendChild(fondo);
    return { fondo, cerrar };
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

// Selector de emojis y stickers (con la pestaña +18 aparte)
function armarSelector(selector, input, ruta) {
    let pestana = "emojis";
    const pintar = () => {
        for (const b of selector.querySelectorAll("nav button")) b.classList.toggle("activo", b.dataset.p === pestana);
        const cuerpo = selector.querySelector(".cuerpo-selector");
        if (pestana === "emojis") {
            cuerpo.className = "cuerpo-selector grilla-emojis";
            cuerpo.innerHTML = EMOJIS.map((e) => `<button type="button">${e}</button>`).join("");
            for (const b of cuerpo.querySelectorAll("button")) b.addEventListener("click", () => (input.value += b.textContent));
        } else if (pestana === "picantes" && !picantesActivos()) {
            cuerpo.className = "cuerpo-selector";
            cuerpo.innerHTML = `<div class="aviso-18">🔞 Stickers con groserías y humor de adultos.<br><button type="button">Tengo 18 años o más</button></div>`;
            cuerpo.querySelector("button").addEventListener("click", () => {
                activarPicantes();
                pintar();
            });
        } else {
            const lista = pestana === "picantes" ? PICANTES : STICKERS;
            cuerpo.className = "cuerpo-selector grilla-stickers";
            cuerpo.innerHTML = Object.keys(lista).map((id) => `<button type="button" data-id="${id}">${htmlSticker(id)}</button>`).join("");
            for (const b of cuerpo.querySelectorAll("button")) {
                b.addEventListener("click", () => {
                    enviarSticker(ruta, b.dataset.id);
                    selector.classList.remove("abierto");
                });
            }
        }
    };
    selector.innerHTML = `<nav><button type="button" data-p="emojis">😀 Emojis</button><button type="button" data-p="stickers">⭐ Stickers</button><button type="button" data-p="picantes">🌶️ +18</button></nav><div class="cuerpo-selector"></div>`;
    for (const b of selector.querySelectorAll("nav button")) {
        b.addEventListener("click", () => {
            pestana = b.dataset.p;
            pintar();
        });
    }
    pintar();
}

// Panel de chat reutilizable. Con amigo (y miNombre) suma botones para mandar un juego o regalar fichas.
// Devuelve { cerrar }.
export function panelChat({ titulo, ruta, nombres, clave, alCerrar, amigo, miNombre }) {
    ponerCss();
    const panel = document.createElement("div");
    panel.className = "panel-chat";
    const extras = amigo ? `<button type="button" class="icono" data-a="juego" title="Mandar un juego">🎮</button><button type="button" class="icono" data-a="regalo" title="Regalar fichas">🎁</button>` : "";
    panel.innerHTML = `<header><span>${escaparHtml(titulo)}</span><button type="button">Cerrar</button></header>
        <div class="lista-msj"></div>
        <div class="rapidos">${RAPIDOS.map((r) => `<button type="button">${r}</button>`).join("")}</div>
        <div class="selector"></div>
        <form class="form-chat">${extras}<button type="button" class="icono" data-a="emojis" title="Emojis y stickers">😀</button>
            <input maxlength="${TEXTO_MAX}" placeholder="Mensaje…" autocomplete="off"><button>➤</button></form>`;
    const lista = panel.querySelector(".lista-msj");
    const input = panel.querySelector("input");
    const selector = panel.querySelector(".selector");
    armarSelector(selector, input, ruta);
    const parar = escucharChat(ruta, (mensajes) => {
        lista.innerHTML = mensajes.length ? htmlMensajes(mensajes, nombres) : `<p style="opacity:.6;text-align:center">Todavía no hay mensajes. ¡Saludá!</p>`;
        lista.scrollTop = lista.scrollHeight;
        marcarLeido(clave);
    });
    const cerrar = () => {
        parar();
        panel.remove();
        marcarLeido(clave);
        alCerrar?.();
    };
    panel.querySelector("header button").addEventListener("click", cerrar);
    for (const b of panel.querySelectorAll(".rapidos button")) b.addEventListener("click", () => enviarMensaje(ruta, b.textContent));
    const acciones = {
        emojis: () => selector.classList.toggle("abierto"),
        juego: () => hojaDesafio(amigo, miNombre, () => {}),
        regalo: () => hojaRegalo(amigo, miNombre),
    };
    for (const b of panel.querySelectorAll("[data-a]")) b.addEventListener("click", () => acciones[b.dataset.a]());
    panel.querySelector("form").addEventListener("submit", (e) => {
        e.preventDefault();
        enviarMensaje(ruta, input.value);
        input.value = "";
        selector.classList.remove("abierto");
    });
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
                if (m.tipo === "sticker" && stickerDe(m.sticker)) {
                    b.className = "burbuja-rival sin-fondo";
                    b.innerHTML = htmlSticker(m.sticker);
                } else {
                    b.className = `burbuja-rival${/^\p{Extended_Pictographic}{1,3}$/u.test(m.texto) ? " emoji" : ""}`;
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
        abierto = panelChat({ titulo: `💬 ${p.nombres?.[rival] ?? "Chat"}`, ruta, nombres: p.nombres, clave, alCerrar: () => (abierto = null) });
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
