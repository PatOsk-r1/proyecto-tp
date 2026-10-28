// Página de multijugador: perfil, amigos, chat, regalos de fichas, ranking y partidas con apuesta.
import { exigirSesion } from "./sesion.js";
import {
    miPerfil, htmlAvatar, escucharAmistades, enviarSolicitud, aceptarAmistad, borrarAmistad,
    escucharPartidas, crearPartida, aceptarPartida, quitarPartida, sePuedeBorrar, JUEGOS_ONLINE,
    iniciarPresencia, escucharUsuario, enLinea, textoConexion, escucharBilletera, nivelDe, formatear,
    rutaChatAmigo, escucharChat, sinLeer, panelChat, idAmistad,
} from "./multijugador.js";
import { fichas, regalarFichas } from "./fichas.js";
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
const APUESTAS_DESAFIO = [0, 100, 1000, 10000, 100000, 1000000, 10000000];
const REGALOS = [100, 500, 1000, 10000, 100000, 1000000];

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
                    { texto: "⚔️", accion: () => elegirJuego(otro) },
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
    });
}

// Hoja inferior genérica
function hoja(html) {
    const fondo = document.createElement("div");
    fondo.className = "hoja-fondo";
    fondo.innerHTML = `<div class="hoja">${html}<button class="boton-chico secundario cerrar" type="button">Cerrar</button></div>`;
    const cerrar = () => fondo.remove();
    fondo.addEventListener("click", (e) => e.target === fondo && cerrar());
    fondo.querySelector(".cerrar").addEventListener("click", cerrar);
    document.body.appendChild(fondo);
    return { fondo, cerrar };
}

// Perfil de un amigo: estadísticas y acciones
function fichaAmigo(otro) {
    const b = billeteras[otro.uid];
    const s = b?.stats ?? {};
    const porJuego = Object.entries(s.juegos ?? {})
        .map(([j, r]) => `<li>${JUEGOS_ONLINE[j]?.emoji ?? "🎮"} ${JUEGOS_ONLINE[j]?.nombre ?? j}<span>${r.ganadas ?? 0}G · ${r.perdidas ?? 0}P · ${r.empates ?? 0}E</span></li>`)
        .join("");
    const { fondo, cerrar } = hoja(`
        <div class="ficha-amigo">
            <div class="avatar-grande">${htmlAvatar(perfiles[otro.uid], escapar(otro.nombre))}</div>
            <h2>${escapar(otro.nombre)}</h2>
            <span class="suave">${textoConexion(perfiles[otro.uid])}</span>
            <div class="numeros-perfil">
                <div><b>${nivelDe(b?.xp)}</b>Nivel</div><div><b>${s.ganadas ?? 0}</b>Victorias</div>
                <div><b>${s.perdidas ?? 0}</b>Derrotas</div><div><b>${b ? formatear(b.fichas ?? 0) : "?"}</b>Fichas</div>
            </div>
            ${porJuego ? `<ul class="por-juego">${porJuego}</ul>` : ""}
            <div class="botones-ficha">
                <button class="boton-chico" data-a="chat">💬 Chat</button>
                <button class="boton-chico" data-a="desafiar">⚔️ Desafiar</button>
                <button class="boton-chico" data-a="regalar">🎁 Regalar fichas</button>
                <button class="boton-chico peligro" data-a="borrar">Eliminar</button>
            </div>
        </div>`);
    const acciones = {
        chat: () => abrirChat(otro),
        desafiar: () => elegirJuego(otro),
        regalar: () => regalar(otro),
        borrar: () => confirm(`¿Eliminar a ${otro.nombre} de tus amigos?`) && borrarAmistad(otro.amistad),
    };
    for (const btn of fondo.querySelectorAll("[data-a]")) {
        btn.addEventListener("click", () => {
            cerrar();
            acciones[btn.dataset.a]();
        });
    }
}

function regalar(otro) {
    const { fondo, cerrar } = hoja(`
        <h2>🎁 Regalar fichas a ${escapar(otro.nombre)}</h2>
        <p class="suave">Tenés 🪙 ${formatear(fichas())}. Se descuentan de tu saldo.</p>
        <div class="opciones-monto">${REGALOS.map((m) => `<button class="monto" data-m="${m}" ${m > fichas() ? "disabled" : ""}>${formatear(m)}</button>`).join("")}</div>
        <form class="fila-form"><input type="number" min="1" max="10000000" inputmode="numeric" placeholder="Otra cantidad"><button class="boton-chico">Regalar</button></form>
        <p class="aviso-linea" hidden></p>`);
    const aviso = fondo.querySelector(".aviso-linea");
    const enviar = async (cantidad) => {
        aviso.hidden = true;
        try {
            if (!confirm(`¿Regalarle ${formatear(cantidad)} fichas a ${otro.nombre}?`)) return;
            await regalarFichas(otro, cantidad, perfil.nombre);
            cerrar();
            alert(`¡Listo! Le regalaste ${formatear(cantidad)} fichas a ${otro.nombre} 🎁`);
        } catch (error) {
            aviso.textContent = error.code === "permission-denied" ? "No se pudo mandar el regalo." : error.message;
            aviso.hidden = false;
        }
    };
    for (const b of fondo.querySelectorAll(".monto")) b.addEventListener("click", () => enviar(Number(b.dataset.m)));
    fondo.querySelector("form").addEventListener("submit", (e) => {
        e.preventDefault();
        const n = Math.floor(Number(fondo.querySelector("input").value));
        if (n > 0) enviar(n);
    });
}

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
    partidas = partidas.filter((p) => p.estado !== "rechazada" || p.creador !== yo);
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
            const pozo = p.apuesta ? ` · 🪙 ${formatear(p.apuesta)}` : "";
            const borrar = { texto: "✕", clase: "secundario", accion: () => quitarPartida(p) };
            let detalle;
            let acciones;
            if (p.estado === "terminada") {
                const ganador = p.ganador ?? (puntos[yo] > puntos[otro] ? yo : puntos[yo] < puntos[otro] ? otro : "empate");
                const premio = p.apuesta ? (ganador === yo ? ` +${formatear(p.apuesta * 2)}` : ganador === "empate" ? "" : ` −${formatear(p.apuesta)}`) : "";
                detalle = `${juego.emoji} ${ganador === yo ? "Ganaste" : ganador === "empate" ? "Empate" : "Perdiste"} ${marcador}${premio ? ` · 🪙${premio}` : ""}`;
                acciones = [{ texto: "Ver", clase: "secundario", accion: abrir }, ...(sePuedeBorrar(p) ? [borrar] : [])];
            } else if (p.estado === "rechazada") {
                detalle = `${juego.emoji} Rechazada`;
                acciones = [];
            } else if (p.estado === "invitada" && p.creador !== yo) {
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
            return item({ nombre: p.nombres[otro] ?? "Amigo", detalle, acciones, destacado: p.estado !== "terminada" && p.turno === yo });
        })
    );
}

// Menú para elegir a qué juego desafiar y cuánto apostar
function elegirJuego(amigo) {
    let apuesta = 0;
    const { fondo } = hoja(`<h2>Desafiar a ${escapar(amigo.nombre)}</h2>
        <div class="apuesta-desafio"><span class="suave">Apuesta (cada uno pone):</span>
            <div class="opciones-monto">${APUESTAS_DESAFIO.map((m) => `<button class="monto${m === 0 ? " elegido" : ""}" data-m="${m}" ${m > fichas() ? "disabled" : ""}>${m ? formatear(m) : "Sin apuesta"}</button>`).join("")}</div>
            <span class="suave">Tenés 🪙 ${formatear(fichas())} · El que gana se lleva todo</span>
        </div>
        <div class="juegos-desafio"></div>`);
    for (const b of fondo.querySelectorAll(".monto")) {
        b.addEventListener("click", () => {
            apuesta = Number(b.dataset.m);
            for (const o of fondo.querySelectorAll(".monto")) o.classList.toggle("elegido", o === b);
        });
    }
    for (const [clave, juego] of Object.entries(JUEGOS_ONLINE)) {
        const b = document.createElement("button");
        b.className = "juego-desafio";
        b.innerHTML = `<span>${juego.emoji}</span>${juego.nombre}`;
        b.addEventListener("click", async () => {
            b.disabled = true;
            try {
                const { datosIniciales } = await import(juego.reglas);
                const id = await crearPartida(clave, perfil.nombre, amigo, datosIniciales(), apuesta);
                location.href = `${juego.carpeta}?partida=${id}`;
            } catch (error) {
                alert(error.message);
                b.disabled = false;
            }
        });
        fondo.querySelector(".juegos-desafio").appendChild(b);
    }
}

pintarPerfil();
