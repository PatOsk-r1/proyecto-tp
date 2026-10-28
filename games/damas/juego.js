// Damas: contra la computadora o contra un amigo (online, por turnos).
import { cargar, guardar, vibrar } from "../../js/comun3d.js";
import { exigirSesion } from "../../js/sesion.js";
import { numerosDe, conectarOnline, pedirRevancha, conectarDificultad, mejorJugada } from "../../js/turnos.js";
import { datosIniciales, jugadasValidas, aplicar, resultado, valorPara, dueno, esDama } from "./reglas.js";

const $ = (id) => document.getElementById(id);
const CLAVE = "damas";
const PROFUNDIDAD = [1, 3, 5];
const NOMBRES_DIFICULTAD = ["Fácil", "Normal", "Difícil"];

const estado = cargar(CLAVE, { dificultad: 1, victorias: 0, derrotas: 0 });
const usuario = await exigirSesion();
const yo = usuario.uid ?? "yo";
const idPartida = new URLSearchParams(location.search).get("partida");

let partida = null;
let online = null;
let numeroDe = { [yo]: 1, bot: 2 };
let nombres = { [yo]: "Vos", bot: "Compu" };
let elegida = -1;
let animando = false;
let mostradas = 0;

const rival = () => partida.jugadores.find((j) => j !== yo);
const miNumero = () => numeroDe[yo];
const esMiTurno = () => partida && partida.estado !== "terminada" && partida.turno === yo && !animando;
// El jugador 2 ve el tablero dado vuelta, así siempre tiene sus fichas abajo
const aTablero = (d) => (miNumero() === 2 ? 63 - d : d);

// ---------- Tablero ----------
const casillas = Array.from({ length: 64 }, (_, d) => {
    const b = document.createElement("button");
    b.className = `casilla-d${(Math.floor(d / 8) + (d % 8)) % 2 ? " oscura" : ""}`;
    b.addEventListener("click", () => tocar(aTablero(d)));
    $("damero").appendChild(b);
    return b;
});

function misJugadas() {
    return esMiTurno() ? jugadasValidas(partida.tablero, miNumero()) : [];
}

function dibujar(tablero = partida.tablero) {
    const jugadas = misJugadas();
    const destinos = jugadas.filter((j) => j.desde === elegida).map((j) => j.camino.at(-1));
    const ultimas = partida.ultimo ? [partida.ultimo.desde, ...partida.ultimo.camino] : [];
    casillas.forEach((b, d) => {
        const i = aTablero(d);
        const v = tablero[i];
        b.classList.toggle("destino", destinos.includes(i));
        b.classList.toggle("ultima", ultimas.includes(i));
        if (!v) {
            b.innerHTML = "";
            return;
        }
        const clases = ["ficha-d", dueno(v) === 1 ? "roja" : "negra"];
        if (i === elegida) clases.push("elegida");
        else if (jugadas.some((j) => j.desde === i)) clases.push("puede");
        b.innerHTML = `<span class="${clases.join(" ")}">${esDama(v) ? "♛" : ""}</span>`;
    });
}

function pintarMarcador() {
    const cuenta = (j) => partida.tablero.filter((v) => dueno(v) === j).length;
    $("j-yo").querySelector("span").textContent = nombres[yo];
    $("j-rival").querySelector("span").textContent = nombres[rival()];
    $("j-yo").querySelector(".puntos-t").textContent = cuenta(miNumero());
    $("j-rival").querySelector(".puntos-t").textContent = cuenta(3 - miNumero());
    const fin = partida.estado === "terminada";
    $("j-yo").classList.toggle("turno", !fin && partida.turno === yo);
    $("j-rival").classList.toggle("turno", !fin && partida.turno === rival());
    $("estado").textContent = fin ? "Terminada" : partida.turno === yo ? "Tu turno" : `Turno de ${nombres[rival()]}`;
}

function tocar(i) {
    if (!esMiTurno()) return;
    const jugadas = misJugadas();
    if (dueno(partida.tablero[i]) === miNumero()) {
        if (!jugadas.some((j) => j.desde === i)) {
            $("aviso").textContent = jugadas[0]?.capturas.length ? "¡Tenés que comer!" : "Esa ficha no se puede mover";
            vibrar(30);
            return;
        }
        elegida = i;
        vibrar(8);
        return dibujar();
    }
    const jugada = jugadas.find((j) => j.desde === elegida && j.camino.at(-1) === i);
    if (jugada) {
        elegida = -1;
        jugar(jugada, yo);
    }
}

// Mueve la ficha salto por salto
async function animar(antes, jugada) {
    animando = true;
    let t = [...antes];
    let desde = jugada.desde;
    for (let k = 0; k < jugada.camino.length; k++) {
        const paso = { desde, camino: [jugada.camino[k]], capturas: jugada.capturas[k] !== undefined ? [jugada.capturas[k]] : [] };
        t = aplicar(t, paso);
        desde = jugada.camino[k];
        dibujar(t);
        vibrar(paso.capturas.length ? 25 : 8);
        await new Promise((ok) => setTimeout(ok, 260));
    }
    animando = false;
}

async function jugar(jugada, quien) {
    const numero = numeroDe[quien];
    const tablero = aplicar(partida.tablero, jugada);
    const sinComer = jugada.capturas.length ? 0 : (partida.sinComer ?? 0) + 1;
    const r = resultado(tablero, 3 - numero, sinComer);
    const otro = partida.jugadores.find((j) => j !== quien);
    const ganadorUid = r.fin ? (r.ganador === 0 ? "empate" : partida.jugadores.find((u) => numeroDe[u] === r.ganador)) : null;
    const cambios = {
        tablero,
        ultimo: jugada,
        jugadas: (partida.jugadas ?? 0) + 1,
        sinComer,
        turno: r.fin ? null : otro,
        estado: r.fin ? "terminada" : "jugando",
        ganador: ganadorUid,
    };
    animando = true;
    if (online) return online.actualizarPartida(idPartida, cambios);
    await animar(partida.tablero, jugada);
    Object.assign(partida, cambios);
    mostradas = partida.jugadas;
    siguiente();
}

function siguiente() {
    $("aviso").textContent = esMiTurno() ? (misJugadas()[0]?.capturas.length ? "¡Tenés que comer!" : "Tocá una ficha y después adónde moverla") : "";
    dibujar();
    pintarMarcador();
    if (partida.estado === "terminada") return fin();
    if (!online && partida.turno === "bot") {
        animando = true;
        setTimeout(() => {
            const jugada = mejorJugada({
                estado: { t: partida.tablero, turno: 2 },
                profundidad: PROFUNDIDAD[estado.dificultad],
                jugadas: (e) => jugadasValidas(e.t, e.turno),
                aplicar: (e, j) => ({ estado: { t: aplicar(e.t, j), turno: 3 - e.turno }, mismoTurno: false }),
                valor: (e) => valorPara(e.t, 2),
                terminado: (e) => !jugadasValidas(e.t, e.turno).length,
            });
            animando = false;
            jugar(jugada, "bot");
        }, 450);
    }
}

function fin() {
    const gane = partida.ganador === yo;
    const empate = partida.ganador === "empate";
    if (!online && !empate) {
        if (gane) estado.victorias++;
        else estado.derrotas++;
        guardar(CLAVE, estado);
    }
    vibrar(gane ? 90 : 140);
    $("titulo-centro").innerHTML = `${empate ? "Empate" : gane ? "¡Ganaste!" : `Ganó ${nombres[rival()]}`}<div class="chico">${
        empate ? "Muchas jugadas sin comer" : gane ? "Tu rival se quedó sin jugadas" : "Te quedaste sin jugadas"
    }</div>`;
    document.querySelector(".dificultad").hidden = Boolean(online);
    $("jugar").textContent = online ? online.textoRevancha(partida, yo) : "Otra vez";
    setTimeout(() => ($("centro").hidden = false), 800);
}

// ---------- Inicio ----------
function empezarContraBot() {
    numeroDe = { [yo]: 1, bot: 2 };
    nombres = { [yo]: "Vos", bot: `Compu · ${NOMBRES_DIFICULTAD[estado.dificultad]}` };
    partida = { ...datosIniciales(), jugadores: [yo, "bot"], turno: yo, estado: "jugando", ganador: null };
    elegida = -1;
    animando = false;
    $("centro").hidden = true;
    siguiente();
}

conectarDificultad(estado, guardar, CLAVE);
$("jugar").addEventListener("click", () => (online ? pedirRevancha(online, "damas", partida, yo, datosIniciales) : empezarContraBot()));

if (idPartida) {
    $("centro").hidden = true;
    online = await conectarOnline({
        idPartida,
        yo,
        actividad: "Damas",
        alFallar: (texto) => {
            $("titulo-centro").textContent = texto;
            $("jugar").hidden = true;
            $("centro").hidden = false;
        },
        alCambiar: async (p, primera) => {
            const antes = partida?.tablero;
            partida = p;
            if (primera) {
                numeroDe = numerosDe(p);
                nombres = { ...p.nombres, [yo]: "Vos" };
                mostradas = p.jugadas ?? 0;
            } else if ((p.jugadas ?? 0) > mostradas && antes && p.ultimo) {
                mostradas = p.jugadas;
                await animar(antes, p.ultimo);
            }
            animando = false;
            siguiente();
        },
    });
} else {
    partida = { ...datosIniciales(), jugadores: [yo, "bot"], turno: null, estado: "esperando" };
    dibujar();
}
