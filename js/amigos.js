// Página de multijugador: perfil, amigos, chat, regalos de fichas, ranking y partidas con apuesta.
import { exigirSesion } from "./sesion.js";
import {
    miPerfil, htmlAvatar, escucharAmistades, enviarSolicitud, aceptarAmistad, borrarAmistad,
    escucharPartidas, aceptarPartida, quitarPartida, enCurso, JUEGOS_ONLINE,
    iniciarPresencia, escucharUsuario, enLinea, textoConexion, escucharBilletera, nivelDe, formatear,
    rutaChatAmigo, escucharChat, sinLeer, panelChat, idAmistad, hojaDesafio, hojaRegalo, hojaPerfil,
} from "./multijugador.js";
import { fichas } from "./fichas.js";
import { totales as totalesArco } from "../games/arco/reglas.js";

const $ = (id) => document.getElementById(id);
const usuario = await exigirSesion();
let perfil = await miPerfil();
let amistades = [];
let escuchando = false;
const perfiles = {}; // datos de conexión de cada amigo
const billeteras = {}; // fichas, estadísticas y experiencia de cada uno (yo incluido)
const chats = {}; // últimos mensajes con cada amigo
const escuchados = new Set();

const escapar = (t) => String(t).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

function avisar(id, texto, ok = false) {
    $(id).textContent = texto;
    $(id).className = `aviso-linea${ok ? " ok" : ""}`;
    $(id).hidden = !texto;
}

function textoStats(b) {
    const s = b?.stats ?? {};
    return `Nivel ${nivelDe(b?.xp)} · 🏆 ${s.ganadas ?? 0} · ${s.perdidas ?? 0} derrotas`;
}

function pintarPerfil() {
    $("mi-avatar").innerHTML = htmlAvatar(perfil, usuario.email ?? "?");
    if (perfil) {
        $("mi-nombre").textContent = perfil.nombre;
        $("mi-detalle").textContent = billeteras[usuario.uid] ? textoStats(billeteras[usuario.uid]) : "Tus amigos te encuentran con este nombre";
        $("mi-fichas").textContent = `🪙 ${formatear(fichas())}`;
        $("resto").hidden = false;
        if (!escuchando) {
            escuchando = true;
            iniciarPresencia();
            escucharAmistades((lista) => {
                amistades = lista;
                pintarAmistades();
            });
            escucharPartidas(pintarPartidas);
            escucharBilletera(usuario.uid, (b) => {
                billeteras[usuario.uid] = b;
                pintarPerfil();
                pintarRanking();
            });
            addEventListener("fichas", () => ($("mi-fichas").textContent = `🪙 ${formatear(fichas())}`));
            // "Visto hace X" cambia con el tiempo aunque no lleguen datos nuevos
            setInterval(pintarAmistades, 30000);
        }
    }
}

$("form-amigo").addEventListener("submit", async (e) => {
    e.preventDefault();
    const nombre = $("buscar").value.trim();
    if (!nombre) return;
    try {
        const otro = await enviarSolicitud(nombre, perfil.nombre, amistades);
        $("buscar").value = "";
        avisar("aviso-amigo", `Solicitud enviada a ${otro.nombre}.`, true);
    } catch (error) {
        avisar("aviso-amigo", error.code === "permission-denied" ? "No se pudo enviar la solicitud." : error.message);
    }
});

function item({ nombre, detalle, acciones, destacado, conexion, datos, alTocar }) {
    const li = document.createElement("li");
    li.className = `item${destacado ? " destacado" : ""}${alTocar ? " tocable" : ""}`;
    const punto = conexion === undefined ? "" : `<i class="conexion${conexion ? " si" : ""}"></i>`;
    li.innerHTML = `
        <div class="avatar">${htmlAvatar(datos, escapar(nombre))}${punto}</div>
        <div class="info"><strong>${escapar(nombre)}</strong><span>${detalle}</span></div>
        <div class="acciones"></div>`;
    if (alTocar) li.querySelector(".info").addEventListener("click", alTocar);
    for (const a of acciones) {
        const b = document.createElement("button");
        b.className = `boton-chico ${a.clase ?? ""}`;
        b.innerHTML = a.texto;
        b.addEventListener("click", async () => {
            b.disabled = true;
            try {
                await a.accion();
            } catch (error) {
                alert(error.message);
            }
            b.disabled = false;
        });
        li.querySelector(".acciones").appendChild(b);
    }
    return li;
}

const otroDe = (a) => a.uids.find((u) => u !== usuario.uid);
const nombreDe = (a) => perfiles[otroDe(a)]?.nombre ?? a.nombres[otroDe(a)] ?? "Alguien";
const amigosAceptados = () => amistades.filter((a) => a.estado === "aceptada");

function escucharAmigo(uid) {
    if (escuchados.has(uid)) return;
    escuchados.add(uid);
    escucharUsuario(uid, (datos) => {
        perfiles[uid] = datos;
        pintarAmistades();
    });
    escucharBilletera(uid, (b) => {
        billeteras[uid] = b;
        pintarRanking();
    });
    escucharChat(rutaChatAmigo(uid), (mensajes) => {
        chats[uid] = mensajes;
        pintarAmistades();
    }, 20);
}

function pintarAmistades() {
    const yo = usuario.uid;
    const recibidas = amistades.filter((a) => a.estado === "pendiente" && a.para === yo);
    const enviadas = amistades.filter((a) => a.estado === "pendiente" && a.de === yo);
    const sinLeerDe = (uid) => sinLeer(`amigo-${idAmistad(yo, uid)}`, chats[uid] ?? []);
    const amigos = amigosAceptados().sort(
        (a, b) =>
            sinLeerDe(otroDe(b)) - sinLeerDe(otroDe(a)) ||
            enLinea(perfiles[otroDe(b)]) - enLinea(perfiles[otroDe(a)]) ||
            nombreDe(a).localeCompare(nombreDe(b))
    );
    amigos.forEach((a) => escucharAmigo(otroDe(a)));
    const conectados = amigos.filter((a) => enLinea(perfiles[otroDe(a)])).length;
    $("conectados").textContent = amigos.length ? `${conectados} en línea de ${amigos.length}` : "";

    $("seccion-solicitudes").hidden = recibidas.length + enviadas.length === 0;
    $("solicitudes").replaceChildren(
        ...recibidas.map((a) =>
            item({
                nombre: nombreDe(a),
                detalle: "Quiere ser tu amigo",
                destacado: true,
                acciones: [
                    { texto: "Aceptar", accion: () => aceptarAmistad(a.id) },
                    { texto: "✕", clase: "secundario", accion: () => borrarAmistad(a.id) },
                ],
            })
        ),
        ...enviadas.map((a) =>
            item({
                nombre: nombreDe(a),
                detalle: "Esperando que acepte",
                acciones: [{ texto: "Cancelar", clase: "secundario", accion: () => borrarAmistad(a.id) }],
            })
        )
    );

    $("sin-amigos").hidden = amigos.length > 0;
    $("amigos").replaceChildren(
        ...amigos.map((a) => {
            const otro = { uid: otroDe(a), nombre: nombreDe(a), amistad: a.id };
            const datos = perfiles[otro.uid];
            const n = sinLeerDe(otro.uid);
            const ultimo = chats[otro.uid]?.at(-1);
            const detalle = n && ultimo ? `💬 ${escapar(ultimo.texto.slice(0, 40))}` : textoConexion(datos);
            return item({
                nombre: otro.nombre,
                detalle,
                conexion: enLinea(datos),
                datos,
                destacado: n > 0,
                alTocar: () => fichaAmigo(otro),
                acciones: [
                    { texto: `💬${n ? `<span class="insignia">${n}</span>` : ""}`, clase: "secundario", accion: () => abrirChat(otro) },
                    { texto: "⚔️", accion: () => hojaDesafio(otro, perfil.nombre) },
                ],
            });
        })
    );
}

function abrirChat(otro) {
    panelChat({
        titulo: `💬 ${otro.nombre}`,
        ruta: rutaChatAmigo(otro.uid),
        nombres: { [otro.uid]: otro.nombre },
        clave: `amigo-${idAmistad(usuario.uid, otro.uid)}`,
        alCerrar: pintarAmistades,
        amigo: otro,
        miNombre: perfil.nombre,
    });
}

// Perfil de un amigo: estadísticas, nivel de cada juego y acciones
function fichaAmigo(otro) {
    hojaPerfil(otro.uid, otro.nombre, {
        acciones: [
            { texto: "💬 Chat", accion: () => abrirChat(otro) },
            { texto: "⚔️ Desafiar", accion: () => hojaDesafio(otro, perfil.nombre) },
            { texto: "🎁 Regalar fichas", accion: () => hojaRegalo(otro, perfil.nombre, (n) => alert(`¡Listo! Le regalaste ${formatear(n)} fichas a ${otro.nombre} 🎁`)) },
            { texto: "Eliminar", clase: "peligro", accion: () => confirm(`¿Eliminar a ${otro.nombre} de tus amigos?`) && borrarAmistad(otro.amistad) },
        ],
    });
}

// Mi perfil, como lo ven mis amigos
$("ver-perfil").addEventListener("click", () => perfil && hojaPerfil(usuario.uid, perfil.nombre));

// Ranking de amigos por fichas
function pintarRanking() {
    const filas = [usuario.uid, ...amigosAceptados().map(otroDe)]
        .filter((uid) => billeteras[uid])
        .map((uid) => ({
            uid,
            nombre: uid === usuario.uid ? perfil?.nombre ?? "Vos" : perfiles[uid]?.nombre ?? "Amigo",
            b: billeteras[uid],
        }))
        .sort((a, b) => (b.b.fichas ?? 0) - (a.b.fichas ?? 0));
    $("seccion-ranking").hidden = filas.length < 2;
    const medallas = ["🥇", "🥈", "🥉"];
    $("ranking").innerHTML = filas
        .map(
            (f, i) => `<li class="fila-ranking${f.uid === usuario.uid ? " yo" : ""}">
                <span class="puesto">${medallas[i] ?? i + 1}</span>
                <span class="nombre-ranking">${escapar(f.nombre)}<small>Nivel ${nivelDe(f.b.xp)} · 🏆 ${f.b.stats?.ganadas ?? 0}</small></span>
                <b>🪙 ${formatear(f.b.fichas ?? 0)}</b></li>`
        )
        .join("");
}

function pintarPartidas(partidas) {
    const yo = usuario.uid;
    // Solo las que siguen en curso (las terminadas no se guardan)
    partidas = partidas.filter(enCurso);
    const orden = (p) => (p.turno === yo || (p.estado === "invitada" && p.creador !== yo) ? 0 : 1);
    partidas.sort((a, b) => orden(a) - orden(b) || (b.actualizada?.seconds ?? 0) - (a.actualizada?.seconds ?? 0));
    $("sin-partidas").hidden = partidas.length > 0;
    $("partidas").replaceChildren(
        ...partidas.map((p) => {
            const otro = p.jugadores.find((j) => j !== yo);
            const juego = JUEGOS_ONLINE[p.juego] ?? { emoji: "🎮", carpeta: "./" };
            const abrir = () => (location.href = `${juego.carpeta}?partida=${p.id}`);
            const puntos = p.marcador ?? (p.juego === "arco" ? totalesArco(p) : null);
            const marcador = puntos ? `${puntos[yo] ?? 0} - ${puntos[otro] ?? 0}` : "";
            const pozo = p.apuesta ? ` · 🪙 ${formatear(p.apuesta)}` : "";
            const borrar = { texto: "✕", clase: "secundario", accion: () => quitarPartida(p) };
            let detalle;
            let acciones;
            if (p.estado === "invitada" && p.creador !== yo) {
                detalle = `${juego.emoji} ¡Te desafió!${pozo ? ` Apuesta${pozo}` : ""}`;
                acciones = [
                    { texto: "Aceptar", accion: async () => (await aceptarPartida(p)) && abrir() },
                    borrar,
                ];
            } else {
                const turno = p.turno === yo ? "Tu turno" : `Turno de ${p.nombres[otro]}`;
                detalle = `${juego.emoji} ${turno}${marcador ? ` · ${marcador}` : ""}${pozo}${p.estado === "invitada" ? " · falta que acepte" : ""}`;
                acciones = [
                    { texto: p.turno === yo ? "Jugar" : "Ver", clase: p.turno === yo ? "" : "secundario", accion: abrir },
                    ...(p.estado === "invitada" ? [borrar] : []),
                ];
            }
            return item({ nombre: p.nombres[otro] ?? "Amigo", detalle, acciones, destacado: orden(p) === 0 });
        })
    );
}

pintarPerfil();
