// Página de multijugador: nombre de usuario, amigos y partidas.
import { exigirSesion } from "./sesion.js";
import {
    miPerfil, elegirNombre, escucharAmistades, enviarSolicitud, aceptarAmistad, borrarAmistad,
    escucharPartidas, crearPartida, actualizarPartida, borrarPartida, JUEGOS_ONLINE,
} from "./multijugador.js";
import { datosIniciales, totales } from "../games/arco/reglas.js";

const $ = (id) => document.getElementById(id);
const usuario = await exigirSesion();
let perfil = await miPerfil();
let amistades = [];
let escuchando = false;

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
            escucharAmistades((lista) => {
                amistades = lista;
                pintarAmistades();
            });
            escucharPartidas(pintarPartidas);
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

function item({ nombre, detalle, acciones, destacado }) {
    const li = document.createElement("li");
    li.className = `item${destacado ? " destacado" : ""}`;
    li.innerHTML = `
        <div class="avatar" style="--c:${colorDe(nombre)}">${escapar(nombre[0].toUpperCase())}</div>
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
    const amigos = amistades.filter((a) => a.estado === "aceptada").sort((a, b) => nombreDe(a).localeCompare(nombreDe(b)));

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
            const otro = { uid: a.uids.find((u) => u !== yo), nombre: nombreDe(a) };
            return item({
                nombre: otro.nombre,
                detalle: "Amigo",
                acciones: [
                    {
                        texto: `${JUEGOS_ONLINE.arco.emoji} Desafiar`,
                        accion: async () => {
                            const id = await crearPartida("arco", perfil.nombre, otro, datosIniciales());
                            location.href = `${JUEGOS_ONLINE.arco.carpeta}?partida=${id}`;
                        },
                    },
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
            const puntos = totales(p);
            const marcador = `${puntos[yo]} - ${puntos[otro]}`;
            let detalle;
            let acciones;
            if (p.estado === "terminada") {
                detalle = `${juego.emoji} ${puntos[yo] > puntos[otro] ? "Ganaste" : puntos[yo] < puntos[otro] ? "Perdiste" : "Empate"} ${marcador}`;
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
                detalle = `${juego.emoji} ${turno} · ${marcador}${p.estado === "invitada" ? " · falta que acepte" : ""}`;
                acciones = [{ texto: p.turno === yo ? "Jugar" : "Ver", clase: p.turno === yo ? "" : "secundario", accion: abrir }];
            }
            return item({ nombre: p.nombres[otro] ?? "Amigo", detalle, acciones, destacado: p.estado !== "terminada" && p.turno === yo });
        })
    );
}

pintarPerfil();
