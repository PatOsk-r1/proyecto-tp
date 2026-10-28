// Mancala: contra la computadora o contra un amigo (online, por turnos).
import { cargar, guardar, vibrar } from "../../js/comun3d.js";
import { exigirSesion } from "../../js/sesion.js";
import { numerosDe, conectarOnline, pedirRevancha, conectarDificultad, mejorJugada } from "../../js/turnos.js";
import { datosIniciales, sembrar, jugadasValidas, granero, hoyosDe } from "./reglas.js";

const $ = (id) => document.getElementById(id);
const CLAVE = "mancala";
const PROFUNDIDAD = [1, 3, 6];
const NOMBRES_DIFICULTAD = ["Fácil", "Normal", "Difícil"];
const COLORES_SEMILLA = ["#ff6b6b", "#ffd166", "#06d6a0", "#4cc9f0", "#c77dff", "#f8f9fa"];

const estado = cargar(CLAVE, { dificultad: 1, victorias: 0, derrotas: 0 });
const usuario = await exigirSesion();
const yo = usuario.uid ?? "yo";
const idPartida = new URLSearchParams(location.search).get("partida");

let partida = null;
let online = null;
let numeroDe = { [yo]: 1, bot: 2 };
let nombres = { [yo]: "Vos", bot: "Compu" };
let animando = false;
let mostradas = 0;

const rival = () => partida.jugadores.find((j) => j !== yo);
const miNumero = () => numeroDe[yo];
const esMiTurno = () => partida && partida.estado !== "terminada" && partida.turno === yo && !animando;

// ---------- Tablero ----------
const hoyos = Array.from({ length: 14 }, (_, i) => {
    const b = document.createElement("button");
    b.className = `hoyo${i === 6 || i === 13 ? " granero" : ""}`;
    b.addEventListener("click", () => {
        if (esMiTurno() && hoyosDe(miNumero()).includes(i) && partida.tablero[i] > 0) jugar(i, yo);
    });
    $("tablero").appendChild(b);
    return b;
});

// Tablero vertical: mis hoyos en la columna derecha (de arriba hacia abajo) y mi granero abajo;
// los del rival en la izquierda, cada uno enfrente del hoyo opuesto, y su granero arriba.
function ubicar() {
    const j = miNumero();
    const mios = hoyosDe(j);
    const suyos = hoyosDe(3 - j);
    mios.forEach((i, k) => Object.assign(hoyos[i].style, { gridColumn: "2", gridRow: `${k + 2}` }));
    suyos.forEach((i, k) => Object.assign(hoyos[i].style, { gridColumn: "1", gridRow: `${7 - k}` }));
    Object.assign(hoyos[granero(j)].style, { gridColumn: "1 / 3", gridRow: "8" });
    Object.assign(hoyos[granero(3 - j)].style, { gridColumn: "1 / 3", gridRow: "1" });
}

// Posición "al azar" pero fija de cada semilla dentro del hoyo (en porcentaje)
function posicion(i, k, esGranero) {
    const a = (i * 7.3 + k * 2.39) % (Math.PI * 2);
    if (esGranero) return { left: 50 + Math.cos(a) * (8 + ((k * 13) % 34)), top: 50 + Math.sin(a) * (10 + ((k * 7) % 26)) };
    const r = k === 0 ? 0 : 8 + ((k * 11) % 20);
    return { left: 50 + Math.cos(a) * r, top: 52 + Math.sin(a) * r };
}
const colorSemilla = (i, k) => COLORES_SEMILLA[(i * 3 + k) % COLORES_SEMILLA.length];

function dibujar(tablero, recibe = -1) {
    tablero.forEach((n, i) => {
        const h = hoyos[i];
        const esGranero = i === 6 || i === 13;
        const visibles = Math.min(n, esGranero ? 40 : 16);
        let html = "";
        for (let k = 0; k < visibles; k++) {
            const p = posicion(i, k, esGranero);
            html += `<span class="semilla" style="left:${p.left}%;top:${p.top}%;--c:${colorSemilla(i, k)}"></span>`;
        }
        h.innerHTML = `${html}<span class="cuenta">${n}</span>`;
        if (i === recibe) {
            h.classList.remove("recibe");
            void h.offsetWidth;
            h.classList.add("recibe");
        } else h.classList.remove("recibe");
        h.classList.toggle("jugable", esMiTurno() && hoyosDe(miNumero()).includes(i) && n > 0);
    });
}

// ---------- Animaciones: un puñado de semillas que viaja de hoyo en hoyo ----------
const pausa = (ms) => new Promise((ok) => setTimeout(ok, ms));
function centro(i) {
    const h = hoyos[i];
    return { x: h.offsetLeft + h.offsetWidth / 2, y: h.offsetTop + h.offsetHeight / 2 };
}
function crearMano(i, cantidad) {
    const mano = document.createElement("div");
    mano.className = "mano";
    for (let k = 0; k < Math.min(cantidad, 14); k++) {
        const a = k * 2.4;
        const r = k === 0 ? 0 : 6 + (k % 3) * 5;
        mano.insertAdjacentHTML("beforeend", `<span style="left:${28 + Math.cos(a) * r}px;top:${28 + Math.sin(a) * r}px;--c:${colorSemilla(i, k)}"></span>`);
    }
    $("capa").appendChild(mano);
    mover(mano, i, true);
    return mano;
}
function mover(mano, i, instantaneo = false) {
    const { x, y } = centro(i);
    if (instantaneo) mano.style.transition = "none";
    mano.style.transform = `translate(${x - 28}px, ${y - 28 - (instantaneo ? 0 : 10)}px) scale(${instantaneo ? 1 : 1.1})`;
    if (instantaneo) {
        void mano.offsetWidth;
        mano.style.transition = "";
    }
}
function flotante(i, texto, color = "#ffd166") {
    const { x, y } = centro(i);
    const el = document.createElement("div");
    el.className = "flotante-m";
    el.style.cssText = `left:${x}px;top:${y}px;color:${color}`;
    el.textContent = texto;
    $("capa").appendChild(el);
    setTimeout(() => el.remove(), 1400);
}

function pintarMarcador() {
    const t = partida.tablero;
    $("j-yo").querySelector("span").textContent = nombres[yo];
    $("j-rival").querySelector("span").textContent = nombres[rival()];
    $("j-yo").querySelector(".puntos-t").textContent = t[granero(miNumero())];
    $("j-rival").querySelector(".puntos-t").textContent = t[granero(3 - miNumero())];
    const fin = partida.estado === "terminada";
    $("j-yo").classList.toggle("turno", !fin && partida.turno === yo);
    $("j-rival").classList.toggle("turno", !fin && partida.turno === rival());
    $("estado").textContent = fin ? "Terminada" : partida.turno === yo ? "Tu turno" : `Turno de ${nombres[rival()]}`;
}

// Muestra la siembra semilla por semilla
async function animar(antes, hoyo, numero) {
    animando = true;
    const r = sembrar(antes, numero, hoyo);
    const t = [...antes];
    const mano = crearMano(hoyo, t[hoyo]);
    t[hoyo] = 0;
    dibujar(t, hoyo);
    await pausa(120);
    const paso = r.recorrido.length > 10 ? 150 : 210;
    for (const i of r.recorrido) {
        mover(mano, i);
        await pausa(paso);
        mano.lastElementChild?.remove();
        t[i]++;
        dibujar(t, i);
        vibrar(5);
    }
    mano.remove();
    const mio = granero(numero);
    if (r.captura) {
        // Las semillas del hoyo propio y del de enfrente vuelan al granero
        await pausa(200);
        for (const i of r.captura.desde) hoyos[i].classList.add("captura");
        flotante(r.captura.desde[1], `¡Captura +${r.captura.cantidad}!`, "#ff8fa3");
        vibrar([30, 30, 60]);
        await pausa(450);
        const manos = r.captura.desde.map((i) => {
            const m = crearMano(i, t[i]);
            t[i] = 0;
            return m;
        });
        for (const i of r.captura.desde) hoyos[i].classList.remove("captura");
        dibujar(t);
        await pausa(30);
        manos.forEach((m) => mover(m, mio));
        await pausa(260);
        manos.forEach((m) => m.remove());
        t[mio] += r.captura.cantidad;
        dibujar(t, mio);
        $("aviso").textContent = `¡Captura de ${r.captura.cantidad} semillas!`;
    } else if (r.mismoTurno) {
        flotante(mio, "¡Otra vez!");
        $("aviso").textContent = "¡Cayó en el granero: juega otra vez!";
    } else $("aviso").textContent = "";
    if (r.fin) {
        // Lo que queda en cada lado se va a su granero
        await pausa(300);
        const manos = [];
        for (const jug of [1, 2]) {
            for (const i of hoyosDe(jug)) {
                if (!t[i]) continue;
                const m = crearMano(i, t[i]);
                manos.push([m, granero(jug)]);
                t[granero(jug)] += t[i];
                t[i] = 0;
            }
        }
        dibujar(t);
        await pausa(30);
        manos.forEach(([m, g]) => mover(m, g));
        await pausa(300);
        manos.forEach(([m]) => m.remove());
    }
    await pausa(200);
    animando = false;
    return r;
}

async function jugar(hoyo, quien) {
    const numero = numeroDe[quien];
    const r = sembrar(partida.tablero, numero, hoyo);
    const otro = partida.jugadores.find((j) => j !== quien);
    const marcador = Object.fromEntries(partida.jugadores.map((u) => [u, r.tablero[granero(numeroDe[u])]]));
    let ganador = null;
    if (r.fin) {
        const [a, b] = partida.jugadores;
        ganador = marcador[a] === marcador[b] ? "empate" : marcador[a] > marcador[b] ? a : b;
    }
    const cambios = {
        tablero: r.tablero,
        ultimo: { hoyo, jugador: numero },
        jugadas: (partida.jugadas ?? 0) + 1,
        turno: r.fin ? null : r.mismoTurno ? quien : otro,
        estado: r.fin ? "terminada" : "jugando",
        ganador,
        marcador,
    };
    animando = true;
    if (online) return online.actualizarPartida(idPartida, cambios);
    const antes = partida.tablero;
    await animar(antes, hoyo, numero);
    Object.assign(partida, cambios);
    mostradas = partida.jugadas;
    siguiente();
}

function siguiente() {
    dibujar(partida.tablero);
    pintarMarcador();
    if (partida.estado === "terminada") return fin();
    if (!online && partida.turno === "bot") {
        animando = true;
        setTimeout(() => {
            const hoyo = mejorJugada({
                estado: { t: partida.tablero, turno: 2 },
                profundidad: PROFUNDIDAD[estado.dificultad],
                jugadas: (e) => jugadasValidas(e.t, e.turno),
                aplicar: (e, h) => {
                    const r = sembrar(e.t, e.turno, h);
                    return { estado: { t: r.tablero, turno: r.mismoTurno ? e.turno : 3 - e.turno, fin: r.fin }, mismoTurno: r.mismoTurno };
                },
                valor: (e) => e.t[13] - e.t[6],
                terminado: (e) => e.fin,
            });
            animando = false;
            jugar(hoyo, "bot");
        }, 500);
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
    const t = partida.tablero;
    $("titulo-centro").innerHTML = `${empate ? "Empate" : gane ? "¡Ganaste!" : `Ganó ${nombres[rival()]}`}<div class="chico">${t[granero(miNumero())]} a ${t[granero(3 - miNumero())]}</div>`;
    document.querySelector(".dificultad").hidden = Boolean(online);
    $("jugar").textContent = online ? online.textoRevancha(partida, yo) : "Otra vez";
    setTimeout(() => ($("centro").hidden = false), 700);
}

// ---------- Inicio ----------
function empezarContraBot() {
    numeroDe = { [yo]: 1, bot: 2 };
    nombres = { [yo]: "Vos", bot: `Compu · ${NOMBRES_DIFICULTAD[estado.dificultad]}` };
    partida = { ...datosIniciales(), jugadores: [yo, "bot"], turno: yo, estado: "jugando", ganador: null };
    mostradas = 0;
    animando = false;
    ubicar();
    $("aviso").textContent = "Tocá uno de tus hoyos para sembrar";
    $("centro").hidden = true;
    siguiente();
}

conectarDificultad(estado, guardar, CLAVE);
$("jugar").addEventListener("click", () => (online ? pedirRevancha(online, "mancala", partida, yo, datosIniciales) : empezarContraBot()));

if (idPartida) {
    $("centro").hidden = true;
    online = await conectarOnline({
        idPartida,
        yo,
        actividad: "Mancala",
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
                ubicar();
                mostradas = p.jugadas ?? 0;
            } else if ((p.jugadas ?? 0) > mostradas && antes && p.ultimo) {
                mostradas = p.jugadas;
                await animar(antes, p.ultimo.hoyo, p.ultimo.jugador);
            }
            animando = false;
            siguiente();
        },
    });
} else {
    // Fondo mientras se elige: tablero inicial
    partida = { ...datosIniciales(), jugadores: [yo, "bot"], turno: null, estado: "esperando" };
    ubicar();
    dibujar(partida.tablero);
}
