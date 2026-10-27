// Página de multijugador: nombre de usuario, amigos y partidas.
import { exigirSesion } from "./sesion.js";
import {
    miPerfil, elegirNombre, escucharAmistades, enviarSolicitud, aceptarAmistad, borrarAmistad,
    escucharPartidas, crearPartida, actualizarPartida, borrarPartida, JUEGOS_ONLINE,
    iniciarPresencia, escucharUsuario, enLinea, textoConexion,
} from "./multijugador.js";
import { totales as totalesArco } from "../games/arco/reglas.js";

const $ = (id) => document.getElementById(id);
const usuario = await exigirSesion();
let perfil = await miPerfil();
let amistades = [];
let escuchando = false;
const perfiles = {}; // datos de conexión de cada amigo
const escuchados = new Set();

const COLORES = ["#ffcc33", "#7df9ff", "#ff8fab", "#a0f0a0", "#c9a7ff", "#ffb36b"];
const colorDe = (texto) => COLORES[[...texto].reduce((s, c) => s + c.charCodeAt(0), 0) % COLORES.length];
const escapar = (t) => String(t).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

function avisar(id, texto, ok = false) {
    $(id).textContent = texto;
    $(id).className = `aviso-linea${ok ? " ok" : ""}`;
    $(id).hidden = !texto;
}

function pintarPerfil() {
    if (perfil) {
        $("nombre-actual").innerHTML = `Sos <strong>${escapar(perfil.nombre)}</strong>. Tus amigos te encuentran con ese nombre.`;
        $("nombre").placeholder = "Cambiar nombre";
        $("resto").hidden = false;
        if (!escuchando) {
            escuchando = true;
            iniciarPresencia();
            escucharAmistades((lista) => {
                amistades = lista;
                pintarAmistades();
            });
            escucharPartidas(pintarPartidas);
            // "Visto hace X" cambia con el tiempo aunque no lleguen datos nuevos
            setInterval(pintarAmistades, 30000);
        }
    }
}

$("form-nombre").addEventListener("submit", async (e) => {
    e.preventDefault();
    const nombre = $("nombre").value.trim();
    if (!nombre) return;
    try {
        await elegirNombre(nombre, perfil);
        perfil = await miPerfil();
        $("nombre").value = "";
        avisar("aviso-nombre", "¡Listo!", true);
        pintarPerfil();
    } catch (error) {
        avisar("aviso-nombre", error.code === "permission-denied" ? "Ese nombre ya lo tiene otra persona." : error.message);
    }
});

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

function item({ nombre, detalle, acciones, destacado, conexion }) {
    const li = document.createElement("li");
    li.className = `item${destacado ? " destacado" : ""}`;
    const punto = conexion === undefined ? "" : `<i class="conexion${conexion ? " si" : ""}"></i>`;
    li.innerHTML = `
        <div class="avatar" style="--c:${colorDe(nombre)}">${escapar(nombre[0].toUpperCase())}${punto}</div>
        <div class="info"><strong>${escapar(nombre)}</strong><span>${detalle}</span></div>
        <div class="acciones"></div>`;
    for (const a of acciones) {
        const b = document.createElement("button");
        b.className = `boton-chico ${a.clase ?? ""}`;
        b.textContent = a.texto;
        b.addEventListener("click", async () => {
            b.disabled = true;
            try {
                await a.accion();
            } catch (error) {
                alert(error.message);
                b.disabled = false;
            }
        });
        li.querySelector(".acciones").appendChild(b);
    }
    return li;
}

function pintarAmistades() {
    const yo = usuario.uid;
    const nombreDe = (a) => a.nombres[a.uids.find((u) => u !== yo)] ?? "Alguien";
    const recibidas = amistades.filter((a) => a.estado === "pendiente" && a.para === yo);
    const enviadas = amistades.filter((a) => a.estado === "pendiente" && a.de === yo);
    const otroDe = (a) => a.uids.find((u) => u !== yo);
    const amigos = amistades
        .filter((a) => a.estado === "aceptada")
        .sort((a, b) => enLinea(perfiles[otroDe(b)]) - enLinea(perfiles[otroDe(a)]) || nombreDe(a).localeCompare(nombreDe(b)));
    for (const a of amigos) {
        const uid = otroDe(a);
        if (escuchados.has(uid)) continue;
        escuchados.add(uid);
        escucharUsuario(uid, (datos) => {
            perfiles[uid] = datos;
            pintarAmistades();
        });
    }
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
            const otro = { uid: otroDe(a), nombre: nombreDe(a) };
            const datos = perfiles[otro.uid];
            return item({
                nombre: datos?.nombre ?? otro.nombre,
                detalle: textoConexion(datos),
                conexion: enLinea(datos),
                acciones: [
                    { texto: "⚔️ Desafiar", accion: () => elegirJuego(otro) },
                    {
                        texto: "✕",
                        clase: "peligro",
                        accion: () => confirm(`¿Eliminar a ${otro.nombre} de tus amigos?`) && borrarAmistad(a.id),
                    },
                ],
            });
        })
    );
}

function pintarPartidas(partidas) {
    const yo = usuario.uid;
    const orden = (p) => (p.estado === "terminada" ? 2 : p.turno === yo ? 0 : 1);
    partidas.sort((a, b) => orden(a) - orden(b) || (b.actualizada?.seconds ?? 0) - (a.actualizada?.seconds ?? 0));
    $("sin-partidas").hidden = partidas.length > 0;
    $("partidas").replaceChildren(
        ...partidas.map((p) => {
            const otro = p.jugadores.find((j) => j !== yo);
            const juego = JUEGOS_ONLINE[p.juego] ?? { emoji: "🎮", carpeta: "./" };
            const abrir = () => (location.href = `${juego.carpeta}?partida=${p.id}`);
            const puntos = p.marcador ?? (p.juego === "arco" ? totalesArco(p) : null);
            const marcador = puntos ? `${puntos[yo] ?? 0} - ${puntos[otro] ?? 0}` : "";
            let detalle;
            let acciones;
            if (p.estado === "terminada") {
                const ganador = p.ganador ?? (puntos[yo] > puntos[otro] ? yo : puntos[yo] < puntos[otro] ? otro : "empate");
                detalle = `${juego.emoji} ${ganador === yo ? "Ganaste" : ganador === "empate" ? "Empate" : "Perdiste"} ${marcador}`;
                acciones = [
                    { texto: "Ver", clase: "secundario", accion: abrir },
                    { texto: "✕", clase: "secundario", accion: () => borrarPartida(p.id) },
                ];
            } else if (p.estado === "invitada" && p.creador !== yo) {
                detalle = `${juego.emoji} ¡Te desafió!`;
                acciones = [
                    { texto: "Aceptar", accion: async () => { await actualizarPartida(p.id, { estado: "jugando" }); abrir(); } },
                    { texto: "✕", clase: "secundario", accion: () => borrarPartida(p.id) },
                ];
            } else {
                const turno = p.turno === yo ? "Tu turno" : `Turno de ${p.nombres[otro]}`;
                detalle = `${juego.emoji} ${turno}${marcador ? ` · ${marcador}` : ""}${p.estado === "invitada" ? " · falta que acepte" : ""}`;
                acciones = [{ texto: p.turno === yo ? "Jugar" : "Ver", clase: p.turno === yo ? "" : "secundario", accion: abrir }];
            }
            return item({ nombre: p.nombres[otro] ?? "Amigo", detalle, acciones, destacado: p.estado !== "terminada" && p.turno === yo });
        })
    );
}

// Menú para elegir a qué juego desafiar
function elegirJuego(amigo) {
    const fondo = document.createElement("div");
    fondo.className = "hoja-fondo";
    fondo.innerHTML = `<div class="hoja"><h2>Desafiar a ${escapar(amigo.nombre)}</h2><div class="juegos-desafio"></div>
        <button class="boton-chico secundario cerrar" type="button">Cancelar</button></div>`;
    const cerrar = () => fondo.remove();
    fondo.addEventListener("click", (e) => e.target === fondo && cerrar());
    fondo.querySelector(".cerrar").addEventListener("click", cerrar);
    for (const [clave, juego] of Object.entries(JUEGOS_ONLINE)) {
        const b = document.createElement("button");
        b.className = "juego-desafio";
        b.innerHTML = `<span>${juego.emoji}</span>${juego.nombre}`;
        b.addEventListener("click", async () => {
            b.disabled = true;
            const { datosIniciales } = await import(juego.reglas);
            const id = await crearPartida(clave, perfil.nombre, amigo, datosIniciales());
            location.href = `${juego.carpeta}?partida=${id}`;
        });
        fondo.querySelector(".juegos-desafio").appendChild(b);
    }
    document.body.appendChild(fondo);
}

pintarPerfil();
