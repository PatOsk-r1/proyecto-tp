// Batalla naval: contra la computadora o contra un amigo (online, por turnos). Acertar da otro tiro.
import { cargar, guardar, vibrar } from "../../js/comun3d.js";
import { exigirSesion } from "../../js/sesion.js";
import { conectarOnline, pedirRevancha, conectarDificultad } from "../../js/turnos.js";
import { LADO, datosIniciales, flotaAlAzar, hundido, todosHundidos, disparoCompu } from "./reglas.js";

const $ = (id) => document.getElementById(id);
const CLAVE = "naval";
const NOMBRES_DIFICULTAD = ["Fácil", "Normal", "Difícil"];
const PUNTERIA_BOT = [0, 0.6, 1]; // chance de usar la búsqueda inteligente

const estado = cargar(CLAVE, { dificultad: 1, victorias: 0, derrotas: 0 });
const usuario = await exigirSesion();
const yo = usuario.uid ?? "yo";
const idPartida = new URLSearchParams(location.search).get("partida");

let partida = null;
let online = null;
let nombres = { [yo]: "Vos", bot: "Compu" };
let miFlota = flotaAlAzar();
let ocupado = false;

const rival = () => partida.jugadores.find((j) => j !== yo);
const fase = () => partida?.fase ?? "colocando";
const disparosDe = (uid) => partida.disparos?.[uid] ?? [];
const flotaDe = (uid) => (uid === yo && fase() === "colocando" ? miFlota : partida.flotas?.[uid]);
const esMiTurno = () => partida && fase() === "batalla" && partida.estado !== "terminada" && partida.turno === yo && !ocupado;

// ---------- Tableros ----------
function crearMar(id, alTocar) {
    const mar = $(id);
    const celdas = Array.from({ length: LADO * LADO }, (_, i) => {
        const b = document.createElement("button");
        b.className = "celda-m";
        if (alTocar) b.addEventListener("click", () => alTocar(i));
        mar.appendChild(b);
        return b;
    });
    const barcos = document.createElement("div");
    barcos.className = "capa-barcos";
    const efectos = document.createElement("div");
    efectos.className = "capa-efectos";
    mar.append(barcos, efectos);
    return { mar, celdas, barcos, efectos };
}
const marArriba = crearMar("arriba", (i) => fase() === "batalla" && esMiTurno() && !disparosDe(yo).includes(i) && disparar(i, yo));
const marAbajo = crearMar("abajo");

// Casco de barco visto desde arriba, con cubierta y una torreta por casilla
let idGradiente = 0;
function svgBarco(largo, vertical) {
    const L = largo * 100;
    const ubicar = ([x, y]) => (vertical ? [y, x] : [x, y]).join(",");
    const casco = [[10, 24], [L - 40, 20], [L - 3, 50], [L - 40, 80], [10, 76], [3, 50]].map(ubicar).join(" ");
    const cubierta = [[22, 38], [L - 52, 36], [L - 30, 50], [L - 52, 64], [22, 62]].map(ubicar).join(" ");
    const id = `casco${idGradiente++}`;
    const torretas = Array.from({ length: largo }, (_, k) => {
        const [cx, cy] = vertical ? [50, k * 100 + 50] : [k * 100 + 50, 50];
        const [ex, ey] = vertical ? [50, k * 100 + 20] : [k * 100 + 80, 50];
        return `<line x1="${cx}" y1="${cy}" x2="${ex}" y2="${ey}" stroke="#2b3440" stroke-width="7" stroke-linecap="round"/>
            <circle cx="${cx}" cy="${cy}" r="14" fill="#5b6a7a" stroke="#2b3440" stroke-width="4"/>`;
    }).join("");
    return `<svg viewBox="0 0 ${vertical ? 100 : L} ${vertical ? L : 100}" preserveAspectRatio="none">
        <defs><linearGradient id="${id}" x1="0" y1="0" x2="${vertical ? 1 : 0}" y2="${vertical ? 0 : 1}">
            <stop offset="0" stop-color="#c7d2dd"/><stop offset="0.5" stop-color="#8796a6"/><stop offset="1" stop-color="#55626f"/>
        </linearGradient></defs>
        <polygon points="${casco}" fill="url(#${id})" stroke="#2b3440" stroke-width="4"/>
        <polygon points="${cubierta}" fill="#a3b0bd" opacity="0.7"/>
        ${torretas}
    </svg>`;
}

// Dibuja los barcos que se ven: los propios siempre, los del rival solo cuando se hunden
function dibujarBarcos(capa, flota, disparos, mostrarTodos) {
    if (!flota) return (capa.innerHTML = "");
    let html = "";
    for (let b = 1; b <= 5; b++) {
        const celdas = flota.flatMap((v, i) => (v === b ? [i] : []));
        if (!celdas.length) continue;
        const hundidoB = hundido(flota, disparos, b);
        if (!mostrarTodos && !hundidoB) continue;
        const filas = celdas.map((i) => Math.floor(i / LADO));
        const columnas = celdas.map((i) => i % LADO);
        const vertical = new Set(columnas).size === 1 && celdas.length > 1;
        const f0 = Math.min(...filas) + 1;
        const c0 = Math.min(...columnas) + 1;
        const ubicacion = vertical
            ? `grid-column:${c0};grid-row:${f0} / span ${celdas.length}`
            : `grid-column:${c0} / span ${celdas.length};grid-row:${f0}`;
        html += `<div class="barco-dibujo${hundidoB ? " hundido" : ""}" style="${ubicacion}">${svgBarco(celdas.length, vertical)}</div>`;
    }
    capa.innerHTML = html;
}

// flota: dónde están los barcos (o null si no se ven); disparos: tiros recibidos en ese tablero
function pintarMar(tablero, flota, disparos, mostrarBarcos, ultimo) {
    tablero.celdas.forEach((c, i) => {
        const barco = flota?.[i] ?? 0;
        const tiro = disparos.includes(i);
        let clase = "celda-m";
        if (tiro && barco) clase += hundido(flota, disparos, barco) ? " hundido disparada" : " tocado disparada";
        else if (tiro) clase += " agua disparada";
        if (i === ultimo) clase += " ultimo";
        c.className = clase;
    });
    dibujarBarcos(tablero.barcos, flota, disparos, mostrarBarcos);
}

// Bala que cae y después salpica o explota
let efectosVistos = 0;
function mostrarEfecto(u) {
    const tablero = u.uid === yo ? marArriba : marAbajo;
    const e = document.createElement("div");
    e.className = `efecto ${u.acierto ? "explota" : "salpica"}`;
    e.style.gridColumn = `${(u.casilla % LADO) + 1}`;
    e.style.gridRow = `${Math.floor(u.casilla / LADO) + 1}`;
    e.innerHTML = '<span class="bala"></span>';
    tablero.efectos.appendChild(e);
    setTimeout(() => e.remove(), 1400);
    if (u.acierto) {
        setTimeout(() => {
            tablero.mar.classList.remove("temblor");
            void tablero.mar.offsetWidth;
            tablero.mar.classList.add("temblor");
            vibrar(u.hundio ? 120 : 50);
        }, 330);
    }
}

function pintar() {
    const enBatalla = fase() === "batalla" || partida?.estado === "terminada";
    $("botones-colocar").hidden = enBatalla || Boolean(partida?.listos?.[yo]);
    $("abajo").hidden = !enBatalla;
    $("titulo-abajo").hidden = !enBatalla;
    $("arriba").classList.toggle("apuntable", esMiTurno());
    const ultimo = partida?.ultimo;
    if (!enBatalla) {
        $("titulo-arriba").textContent = "Tu flota";
        pintarMar(marArriba, miFlota, [], true, -1);
        $("estado").textContent = partida?.listos?.[yo] ? `Esperando a ${nombres[rival()] ?? "tu rival"}…` : "Ubicá tu flota";
        $("aviso").textContent = partida?.listos?.[yo] ? "Tu flota está lista" : "Mezclá hasta que te guste y tocá Listo";
    } else {
        $("titulo-arriba").textContent = `Flota de ${nombres[rival()]}`;
        pintarMar(marArriba, flotaDe(rival()), disparosDe(yo), partida.estado === "terminada", ultimo?.uid === yo ? ultimo.casilla : -1);
        pintarMar(marAbajo, flotaDe(yo), disparosDe(rival()), true, ultimo?.uid === rival() ? ultimo.casilla : -1);
        const fin = partida.estado === "terminada";
        $("estado").textContent = fin ? "Terminada" : partida.turno === yo ? "Tu turno: disparale" : `Turno de ${nombres[rival()]}`;
    }
    if (partida) {
        const aciertos = (uid) => disparosDe(uid).filter((i) => flotaDe(partida.jugadores.find((j) => j !== uid))?.[i]).length;
        $("j-yo").querySelector("span").textContent = nombres[yo];
        $("j-rival").querySelector("span").textContent = nombres[rival()] ?? "Rival";
        $("j-yo").querySelector(".puntos-t").textContent = enBatalla ? aciertos(yo) : "";
        $("j-rival").querySelector(".puntos-t").textContent = enBatalla ? aciertos(rival()) : "";
        $("j-yo").classList.toggle("turno", esMiTurno());
        $("j-rival").classList.toggle("turno", fase() === "batalla" && partida.estado !== "terminada" && partida.turno === rival());
    }
}

// ---------- Disparos ----------
async function disparar(casilla, quien) {
    ocupado = true;
    const otro = partida.jugadores.find((j) => j !== quien);
    const flotaRival = partida.flotas[otro];
    const tiros = [...(partida.disparos?.[quien] ?? []), casilla];
    const acierto = Boolean(flotaRival[casilla]);
    const gana = todosHundidos(flotaRival, tiros);
    const cambios = {
        [`disparos.${quien}`]: tiros,
        ultimo: { uid: quien, casilla, acierto, hundio: acierto && hundido(flotaRival, tiros, flotaRival[casilla]) },
        jugadas: (partida.jugadas ?? 0) + 1,
        turno: gana ? null : acierto ? quien : otro,
        estado: gana ? "terminada" : "jugando",
        ganador: gana ? quien : null,
    };
    vibrar(acierto ? 40 : 10);
    if (online) return online.actualizarPartida(idPartida, cambios);
    partida.disparos[quien] = tiros;
    Object.assign(partida, { ultimo: cambios.ultimo, jugadas: cambios.jugadas, turno: cambios.turno, estado: cambios.estado, ganador: cambios.ganador });
    despues();
}

function avisarUltimo() {
    const u = partida.ultimo;
    if (!u) return;
    const quien = u.uid === yo ? "Vos" : nombres[u.uid];
    $("aviso").textContent = u.hundio ? `${quien}: ¡hundido! Tira de nuevo` : u.acierto ? `${quien}: ¡tocado! Tira de nuevo` : `${quien}: agua`;
}

function despues() {
    ocupado = false;
    if ((partida.jugadas ?? 0) > efectosVistos && partida.ultimo) {
        efectosVistos = partida.jugadas;
        mostrarEfecto(partida.ultimo);
    }
    avisarUltimo();
    pintar();
    if (partida.estado === "terminada") return fin();
    if (!online && partida.turno === "bot") {
        ocupado = true;
        pintar();
        setTimeout(() => {
            const tiros = partida.disparos.bot ?? [];
            const inteligente = Math.random() < PUNTERIA_BOT[estado.dificultad];
            let casilla = inteligente ? disparoCompu(partida.flotas[yo], tiros) : null;
            if (casilla === null || casilla === undefined) {
                const libres = Array.from({ length: LADO * LADO }, (_, i) => i).filter((i) => !tiros.includes(i));
                casilla = libres[Math.floor(Math.random() * libres.length)];
            }
            ocupado = false;
            disparar(casilla, "bot");
        }, 700);
    }
}

function fin() {
    const gane = partida.ganador === yo;
    if (!online) {
        if (gane) estado.victorias++;
        else estado.derrotas++;
        guardar(CLAVE, estado);
    }
    vibrar(gane ? 90 : 140);
    $("titulo-centro").innerHTML = `${gane ? "¡Ganaste!" : `Ganó ${nombres[rival()]}`}<div class="chico">${gane ? "Hundiste toda la flota" : "Te hundieron la flota"}</div>`;
    document.querySelector(".dificultad").hidden = Boolean(online);
    $("jugar").textContent = online ? online.textoRevancha(partida, yo) : "Otra vez";
    setTimeout(() => ($("centro").hidden = false), 1200);
}

// ---------- Colocar la flota ----------
$("mezclar").addEventListener("click", () => {
    miFlota = flotaAlAzar();
    vibrar(10);
    pintar();
});

$("listo").addEventListener("click", async () => {
    if (online) {
        await online.actualizarPartida(idPartida, { [`flotas.${yo}`]: miFlota, [`listos.${yo}`]: true });
        return;
    }
    partida.flotas = { [yo]: miFlota, bot: flotaAlAzar() };
    partida.fase = "batalla";
    partida.turno = yo;
    $("aviso").textContent = "Tocá una casilla del mar enemigo";
    pintar();
});

// ---------- Inicio ----------
function empezarContraBot() {
    nombres = { [yo]: "Vos", bot: `Compu · ${NOMBRES_DIFICULTAD[estado.dificultad]}` };
    partida = { ...datosIniciales(), jugadores: [yo, "bot"], creador: yo, estado: "jugando", disparos: { [yo]: [], bot: [] } };
    miFlota = flotaAlAzar();
    ocupado = false;
    efectosVistos = 0;
    $("centro").hidden = true;
    pintar();
}

conectarDificultad(estado, guardar, CLAVE);
$("jugar").addEventListener("click", () => (online ? pedirRevancha(online, "naval", partida, yo, datosIniciales) : empezarContraBot()));

if (idPartida) {
    $("centro").hidden = true;
    online = await conectarOnline({
        idPartida,
        yo,
        actividad: "Batalla naval",
        alFallar: (texto) => {
            $("titulo-centro").textContent = texto;
            $("jugar").hidden = true;
            $("centro").hidden = false;
        },
        alCambiar: (p, primera) => {
            partida = p;
            if (primera) {
                nombres = { ...p.nombres, [yo]: "Vos" };
                if (p.flotas?.[yo]) miFlota = p.flotas[yo];
                efectosVistos = p.jugadas ?? 0;
            }
            // Cuando los dos están listos, el que creó la partida arranca la batalla
            if (p.fase === "colocando" && p.creador === yo && p.jugadores.every((j) => p.listos?.[j])) {
                online.actualizarPartida(idPartida, { fase: "batalla", turno: p.creador });
            }
            despues();
        },
    });
} else {
    pintar();
}
