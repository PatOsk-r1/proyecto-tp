// Reversi: contra la computadora o contra un amigo (online, por turnos).
import { cargar, guardar, vibrar } from "../../js/comun3d.js";
import { exigirSesion } from "../../js/sesion.js";
import { numerosDe, conectarOnline, pedirRevancha, conectarDificultad, mejorJugada } from "../../js/turnos.js";
import { datosIniciales, jugadasValidas, aplicar, cuenta, siguienteTurno, valorPara } from "./reglas.js";

const $ = (id) => document.getElementById(id);
const CLAVE = "reversi";
const PROFUNDIDAD = [1, 3, 4];
const NOMBRES_DIFICULTAD = ["Fácil", "Normal", "Difícil"];

const estado = cargar(CLAVE, { dificultad: 1, victorias: 0, derrotas: 0 });
const usuario = await exigirSesion();
const yo = usuario.uid ?? "yo";
const idPartida = new URLSearchParams(location.search).get("partida");

let partida = null;
let online = null;
let numeroDe = { [yo]: 1, bot: 2 };
let nombres = { [yo]: "Vos", bot: "Compu" };
let ocupado = false;
let nueva = -1;

const rival = () => partida.jugadores.find((j) => j !== yo);
const miNumero = () => numeroDe[yo];
const esMiTurno = () => partida && partida.estado !== "terminada" && partida.turno === yo && !ocupado;
const uidDe = (n) => partida.jugadores.find((u) => numeroDe[u] === n);

const casillas = Array.from({ length: 64 }, (_, i) => {
    const b = document.createElement("button");
    b.className = "casilla-r";
    b.innerHTML = '<span class="ficha-r" hidden><span class="cara negra"></span><span class="cara blanca"></span></span>';
    b.addEventListener("click", () => esMiTurno() && jugadasValidas(partida.tablero, miNumero()).includes(i) && jugar(i, yo));
    $("tablero").appendChild(b);
    return b;
});

function dibujar() {
    const posibles = esMiTurno() ? jugadasValidas(partida.tablero, miNumero()) : [];
    partida.tablero.forEach((v, i) => {
        const b = casillas[i];
        const ficha = b.firstElementChild;
        ficha.hidden = !v;
        ficha.classList.toggle("es-blanca", v === 2);
        ficha.classList.toggle("nueva", i === nueva);
        b.classList.toggle("posible", posibles.includes(i));
        b.classList.toggle("ultima", partida.ultimo === i);
    });
    const color = (n) => `<i class="ficha-mini ${n === 1 ? "n" : "b"}"></i>`;
    $("j-yo").querySelector("span").innerHTML = `${color(miNumero())}${nombres[yo]}`;
    $("j-rival").querySelector("span").innerHTML = `${color(3 - miNumero())}${nombres[rival()]}`;
    $("j-yo").querySelector(".puntos-t").textContent = cuenta(partida.tablero, miNumero());
    $("j-rival").querySelector(".puntos-t").textContent = cuenta(partida.tablero, 3 - miNumero());
    const fin = partida.estado === "terminada";
    $("j-yo").classList.toggle("turno", !fin && partida.turno === yo);
    $("j-rival").classList.toggle("turno", !fin && partida.turno === rival());
    $("estado").textContent = fin ? "Terminada" : partida.turno === yo ? "Tu turno" : `Turno de ${nombres[rival()]}`;
}

async function jugar(i, quien) {
    ocupado = true;
    const n = numeroDe[quien];
    const tablero = aplicar(partida.tablero, i, n);
    const sigue = siguienteTurno(tablero, n);
    let ganador = null;
    if (sigue === null) {
        const a = cuenta(tablero, 1);
        const b = cuenta(tablero, 2);
        ganador = a === b ? "empate" : uidDe(a > b ? 1 : 2);
    }
    const cambios = {
        tablero,
        ultimo: i,
        jugadas: (partida.jugadas ?? 0) + 1,
        turno: sigue === null ? null : uidDe(sigue),
        estado: sigue === null ? "terminada" : "jugando",
        ganador,
        marcador: Object.fromEntries(partida.jugadores.map((u) => [u, cuenta(tablero, numeroDe[u])])),
    };
    vibrar(15);
    if (online) return online.actualizarPartida(idPartida, cambios);
    Object.assign(partida, cambios);
    nueva = i;
    siguiente();
}

function siguiente() {
    ocupado = false;
    if (partida.estado !== "terminada" && partida.ultimo !== null) {
        const n = partida.turno ? numeroDe[partida.turno] : 0;
        const anterior = partida.tablero[partida.ultimo];
        $("aviso").textContent = n === anterior ? `${partida.turno === yo ? "Tu rival" : "Vos"} no tenía jugadas: pasa` : "";
    }
    dibujar();
    if (partida.estado === "terminada") return fin();
    if (!online && partida.turno === "bot") {
        ocupado = true;
        setTimeout(() => {
            const i = mejorJugada({
                estado: { t: partida.tablero, turno: 2 },
                profundidad: PROFUNDIDAD[estado.dificultad],
                jugadas: (e) => jugadasValidas(e.t, e.turno),
                aplicar: (e, i) => {
                    const t = aplicar(e.t, i, e.turno);
                    const s = siguienteTurno(t, e.turno);
                    return { estado: { t, turno: s ?? e.turno, fin: s === null }, mismoTurno: s === e.turno };
                },
                valor: (e) => (e.fin ? (cuenta(e.t, 2) - cuenta(e.t, 1)) * 1000 : valorPara(e.t, 2)),
                terminado: (e) => e.fin,
            });
            ocupado = false;
            jugar(i, "bot");
        }, 600);
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
    $("titulo-centro").innerHTML = `${empate ? "Empate" : gane ? "¡Ganaste!" : `Ganó ${nombres[rival()]}`}<div class="chico">${cuenta(partida.tablero, miNumero())} a ${cuenta(partida.tablero, 3 - miNumero())}</div>`;
    document.querySelector(".dificultad").hidden = Boolean(online);
    $("jugar").textContent = online ? online.textoRevancha(partida, yo) : "Otra vez";
    setTimeout(() => ($("centro").hidden = false), 900);
}

function empezarContraBot() {
    numeroDe = { [yo]: 1, bot: 2 };
    nombres = { [yo]: "Vos", bot: `Compu · ${NOMBRES_DIFICULTAD[estado.dificultad]}` };
    partida = { ...datosIniciales(), jugadores: [yo, "bot"], turno: yo, estado: "jugando", ganador: null };
    nueva = -1;
    $("centro").hidden = true;
    siguiente();
}

conectarDificultad(estado, guardar, CLAVE);
$("jugar").addEventListener("click", () => (online ? pedirRevancha(online, "reversi", partida, yo, datosIniciales) : empezarContraBot()));

if (idPartida) {
    $("centro").hidden = true;
    online = await conectarOnline({
        idPartida,
        yo,
        actividad: "Reversi",
        alFallar: (texto) => {
            $("titulo-centro").textContent = texto;
            $("jugar").hidden = true;
            $("centro").hidden = false;
        },
        alCambiar: (p, primera) => {
            if (primera) {
                numeroDe = numerosDe(p);
                nombres = { ...p.nombres, [yo]: "Vos" };
            } else {
                nueva = p.ultimo;
            }
            partida = p;
            siguiente();
        },
    });
} else {
    partida = { ...datosIniciales(), jugadores: [yo, "bot"], turno: null, estado: "esperando" };
    dibujar();
}
