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
    return Array.from({ length: LADO * LADO }, (_, i) => {
        const b = document.createElement("button");
        b.className = "celda-m";
        if (alTocar) b.addEventListener("click", () => alTocar(i));
        $(id).appendChild(b);
        return b;
    });
}
const celdasArriba = crearMar("arriba", (i) => fase() === "batalla" && esMiTurno() && !disparosDe(yo).includes(i) && disparar(i, yo));
const celdasAbajo = crearMar("abajo");

// flota: dónde están los barcos (o null si no se ven); disparos: tiros recibidos en ese tablero
function pintarMar(celdas, flota, disparos, mostrarBarcos, ultimo) {
    celdas.forEach((c, i) => {
        const barco = flota?.[i] ?? 0;
        const tiro = disparos.includes(i);
        let clase = "celda-m";
        if (tiro && barco) clase += hundido(flota, disparos, barco) ? " hundido disparada" : " tocado disparada";
        else if (tiro) clase += " agua disparada";
        else if (barco && mostrarBarcos) clase += " barco";
        if (i === ultimo) clase += " ultimo";
        c.className = clase;
        c.textContent = tiro && barco ? (hundido(flota, disparos, barco) ? "☠" : "💥") : "";
    });
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
        pintarMar(celdasArriba, miFlota, [], true, -1);
        $("estado").textContent = partida?.listos?.[yo] ? `Esperando a ${nombres[rival()] ?? "tu rival"}…` : "Ubicá tu flota";
        $("aviso").textContent = partida?.listos?.[yo] ? "Tu flota está lista" : "Mezclá hasta que te guste y tocá Listo";
    } else {
        $("titulo-arriba").textContent = `Flota de ${nombres[rival()]}`;
        pintarMar(celdasArriba, flotaDe(rival()), disparosDe(yo), partida.estado === "terminada", ultimo?.uid === yo ? ultimo.casilla : -1);
        pintarMar(celdasAbajo, flotaDe(yo), disparosDe(rival()), true, ultimo?.uid === rival() ? ultimo.casilla : -1);
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
    $("aviso").textContent = u.hundio ? `${quien}: ¡hundido! ☠ Tira de nuevo` : u.acierto ? `${quien}: ¡tocado! 💥 Tira de nuevo` : `${quien}: agua`;
}

function despues() {
    ocupado = false;
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
    $("jugar").textContent = online ? "Revancha" : "Otra vez";
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
