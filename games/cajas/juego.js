// Puntos y cajas: contra la computadora o contra un amigo (online, por turnos).
import { cargar, guardar, vibrar } from "../../js/comun3d.js";
import { exigirSesion } from "../../js/sesion.js";
import { numerosDe, conectarOnline, pedirRevancha, conectarDificultad } from "../../js/turnos.js";
import { N, TOTAL_LINEAS, datosIniciales, aplicar, jugadaCompu } from "./reglas.js";

const $ = (id) => document.getElementById(id);
const CLAVE = "cajas";
const NOMBRES_DIFICULTAD = ["Fácil", "Normal", "Difícil"];
const MARGEN = 60;
const PASO = (600 - 2 * MARGEN) / N;

const estado = cargar(CLAVE, { dificultad: 1, victorias: 0, derrotas: 0 });
const usuario = await exigirSesion();
const yo = usuario.uid ?? "yo";
const idPartida = new URLSearchParams(location.search).get("partida");

let partida = null;
let online = null;
let numeroDe = { [yo]: 1, bot: 2 };
let nombres = { [yo]: "Vos", bot: "Compu" };
let ocupado = false;

const rival = () => partida.jugadores.find((j) => j !== yo);
const miNumero = () => numeroDe[yo];
const esMiTurno = () => partida && partida.estado !== "terminada" && partida.turno === yo && !ocupado;
const uidDe = (n) => partida.jugadores.find((u) => numeroDe[u] === n);
const cajasDe = (n) => partida.cajas.filter((v) => v === n).length;

// ---------- Dibujo en SVG ----------
const svg = $("hoja");
const NS = "http://www.w3.org/2000/svg";
const extremos = (i) => {
    if (i < (N + 1) * N) {
        const f = Math.floor(i / N);
        const c = i % N;
        return [MARGEN + c * PASO, MARGEN + f * PASO, MARGEN + (c + 1) * PASO, MARGEN + f * PASO];
    }
    const k = i - (N + 1) * N;
    const f = Math.floor(k / (N + 1));
    const c = k % (N + 1);
    return [MARGEN + c * PASO, MARGEN + f * PASO, MARGEN + c * PASO, MARGEN + (f + 1) * PASO];
};

function crear(tipo, atributos, padre = svg) {
    const el = document.createElementNS(NS, tipo);
    for (const [k, v] of Object.entries(atributos)) el.setAttribute(k, v);
    padre.appendChild(el);
    return el;
}

const cajas = [];
const letras = [];
for (let f = 0; f < N; f++) {
    for (let c = 0; c < N; c++) {
        cajas.push(crear("rect", { class: "caja-c", x: MARGEN + c * PASO + 4, y: MARGEN + f * PASO + 4, width: PASO - 8, height: PASO - 8, rx: 8, fill: "transparent" }));
        letras.push(crear("text", { class: "letra-c", x: MARGEN + (c + 0.5) * PASO, y: MARGEN + (f + 0.5) * PASO, "font-size": PASO * 0.45 }));
    }
}
const lineas = Array.from({ length: TOTAL_LINEAS }, (_, i) => {
    const [x1, y1, x2, y2] = extremos(i);
    const dibujo = crear("line", { class: "linea-c libre", x1, y1, x2, y2, "stroke-width": 9 });
    const toque = crear("line", { class: "zona-toque", x1, y1, x2, y2, "stroke-width": 44 });
    toque.addEventListener("click", () => esMiTurno() && !partida.lineas[i] && jugar(i, yo));
    // Al apoyar el dedo se marca la raya que vas a dibujar
    toque.addEventListener("pointerdown", () => esMiTurno() && !partida.lineas[i] && dibujo.classList.add("apuntada"));
    toque.addEventListener("pointerleave", () => dibujo.classList.remove("apuntada"));
    return dibujo;
});
for (let f = 0; f <= N; f++) for (let c = 0; c <= N; c++) crear("circle", { class: "punto-c", cx: MARGEN + c * PASO, cy: MARGEN + f * PASO, r: 8 });

let antes = { lineas: [], cajas: [] };

// Chispas y cartel cuando se cierra una caja
function festejoCaja(k, n, combo) {
    const cx = MARGEN + ((k % N) + 0.5) * PASO;
    const cy = MARGEN + (Math.floor(k / N) + 0.5) * PASO;
    const color = n === 1 ? "#e63946" : "#3a86ff";
    for (let p = 0; p < 10; p++) {
        const a = (p / 10) * Math.PI * 2;
        const ch = crear("circle", { class: "chispa-c", cx, cy, r: 5, fill: p % 2 ? color : "#ffd23f" });
        ch.animate([{ transform: "translate(0,0)", opacity: 1 }, { transform: `translate(${Math.cos(a) * 55}px, ${Math.sin(a) * 55}px)`, opacity: 0 }], { duration: 500, easing: "ease-out" }).onfinish = () => ch.remove();
    }
    if (combo > 1) {
        const t = crear("text", { class: "combo-c", x: cx, y: cy - PASO * 0.5, "font-size": 34 });
        t.textContent = `¡×${combo}!`;
        t.animate([{ transform: "translateY(0)", opacity: 1 }, { transform: "translateY(-40px)", opacity: 0 }], { duration: 900, easing: "ease-out" }).onfinish = () => t.remove();
    }
}

function dibujar() {
    const nuevasCajas = partida.cajas.map((v, k) => (v && !antes.cajas[k] ? k : -1)).filter((k) => k >= 0);
    partida.lineas.forEach((v, i) => lineas[i].setAttribute("class", `linea-c ${v ? `j${v}` : "libre"}${partida.ultimo === i ? " ultima" : ""}${v && !antes.lineas[i] ? " nueva" : ""}`));
    nuevasCajas.forEach((k, idx) => setTimeout(() => festejoCaja(k, partida.cajas[k], idx + 1 + (antes.racha ?? 0)), 150 + idx * 120));
    partida.cajas.forEach((v, k) => {
        cajas[k].setAttribute("class", `caja-c${v ? ` j${v}` : ""}${nuevasCajas.includes(k) ? " nueva" : ""}`);
        letras[k].setAttribute("class", `letra-c${nuevasCajas.includes(k) ? " nueva" : ""}`);
        const dueno = v ? uidDe(v) : null;
        letras[k].textContent = dueno ? (nombres[dueno] ?? "?")[0].toUpperCase() : "";
        letras[k].setAttribute("fill", v === 1 ? "#e63946" : "#3a86ff");
    });
    const clase = (n) => `color-j${n}`;
    $("j-yo").querySelector("span").innerHTML = `<b class="${clase(miNumero())}">●</b> ${nombres[yo]}`;
    $("j-rival").querySelector("span").innerHTML = `<b class="${clase(3 - miNumero())}">●</b> ${nombres[rival()]}`;
    $("j-yo").querySelector(".puntos-t").textContent = cajasDe(miNumero());
    $("j-rival").querySelector(".puntos-t").textContent = cajasDe(3 - miNumero());
    const fin = partida.estado === "terminada";
    $("j-yo").classList.toggle("turno", !fin && partida.turno === yo);
    $("j-rival").classList.toggle("turno", !fin && partida.turno === rival());
    $("estado").textContent = fin ? "Terminada" : partida.turno === yo ? "Tu turno" : `Turno de ${nombres[rival()]}`;
    // La racha sigue mientras el mismo jugador sigue cerrando cajas
    const racha = nuevasCajas.length ? (antes.turno === partida.turno ? (antes.racha ?? 0) : 0) + nuevasCajas.length : 0;
    antes = { lineas: [...partida.lineas], cajas: [...partida.cajas], turno: partida.turno, racha };
}

async function jugar(i, quien) {
    ocupado = true;
    const n = numeroDe[quien];
    const r = aplicar(partida.lineas, partida.cajas, i, n);
    const fin = r.lineas.every(Boolean);
    let ganador = null;
    if (fin) {
        const a = r.cajas.filter((v) => v === 1).length;
        const b = r.cajas.filter((v) => v === 2).length;
        ganador = a === b ? "empate" : uidDe(a > b ? 1 : 2);
    }
    const cambios = {
        lineas: r.lineas,
        cajas: r.cajas,
        ultimo: i,
        jugadas: (partida.jugadas ?? 0) + 1,
        turno: fin ? null : r.cerradas ? quien : partida.jugadores.find((j) => j !== quien),
        estado: fin ? "terminada" : "jugando",
        ganador,
        marcador: Object.fromEntries(partida.jugadores.map((u) => [u, r.cajas.filter((v) => v === numeroDe[u]).length])),
    };
    vibrar(r.cerradas ? 40 : 10);
    if (online) return online.actualizarPartida(idPartida, cambios);
    Object.assign(partida, cambios);
    siguiente();
}

function siguiente() {
    ocupado = false;
    dibujar();
    if (partida.estado === "terminada") return fin();
    if (!online && partida.turno === "bot") {
        ocupado = true;
        setTimeout(() => {
            ocupado = false;
            jugar(jugadaCompu(partida.lineas, estado.dificultad), "bot");
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
    $("titulo-centro").innerHTML = `${empate ? "Empate" : gane ? "¡Ganaste!" : `Ganó ${nombres[rival()]}`}<div class="chico">${cajasDe(miNumero())} cajas a ${cajasDe(3 - miNumero())}</div>`;
    document.querySelector(".dificultad").hidden = Boolean(online);
    $("jugar").textContent = online ? online.textoRevancha(partida, yo) : "Otra vez";
    setTimeout(() => ($("centro").hidden = false), 800);
}

function empezarContraBot() {
    numeroDe = { [yo]: 1, bot: 2 };
    nombres = { [yo]: "Vos", bot: `Compu · ${NOMBRES_DIFICULTAD[estado.dificultad]}` };
    partida = { ...datosIniciales(), jugadores: [yo, "bot"], turno: yo, estado: "jugando", ganador: null };
    $("centro").hidden = true;
    siguiente();
}

conectarDificultad(estado, guardar, CLAVE);
$("jugar").addEventListener("click", () => (online ? pedirRevancha(online, "cajas", partida, yo, datosIniciales) : empezarContraBot()));

if (idPartida) {
    $("centro").hidden = true;
    online = await conectarOnline({
        idPartida,
        yo,
        actividad: "Puntos y cajas",
        alFallar: (texto) => {
            $("titulo-centro").textContent = texto;
            $("jugar").hidden = true;
            $("centro").hidden = false;
        },
        alCambiar: (p, primera) => {
            if (primera) {
                numeroDe = numerosDe(p);
                nombres = { ...p.nombres, [yo]: "Vos" };
            }
            partida = p;
            siguiente();
        },
    });
} else {
    partida = { ...datosIniciales(), jugadores: [yo, "bot"], turno: null, estado: "esperando" };
    dibujar();
}
