// Ta-te-tí: contra la computadora o contra un amigo (online, por turnos).
import { cargar, guardar, vibrar } from "../../js/comun3d.js";
import { exigirSesion } from "../../js/sesion.js";
import { datosIniciales, lineaGanadora, lleno, jugadaCompu } from "./reglas.js";

const $ = (id) => document.getElementById(id);
const CLAVE = "tateti";
const NOMBRES_DIFICULTAD = ["Fácil", "Normal", "Imbatible"];
const SIMBOLO = { 1: "X", 2: "O" };

const estado = cargar(CLAVE, { dificultad: 1, victorias: 0, derrotas: 0, empates: 0 });
const usuario = await exigirSesion();
const yo = usuario.uid ?? "yo";
const idPartida = new URLSearchParams(location.search).get("partida");

let partida = null;
let online = null;
let jugadores = [yo, "bot"];
let numeroDe = { [yo]: 1, bot: 2 };
let nombres = { [yo]: "Vos", bot: "Compu" };
let ocupado = false;
let ultimaPintada = -1;

const rival = () => jugadores.find((j) => j !== yo);
const esMiTurno = () => partida && partida.estado !== "terminada" && partida.turno === yo && !ocupado;

// ---------- Tablero ----------
const celdas = Array.from({ length: 9 }, (_, i) => {
    const b = document.createElement("button");
    b.className = "celda";
    b.addEventListener("click", () => esMiTurno() && !partida.tablero[i] && jugar(i, yo));
    $("tablero").appendChild(b);
    return b;
});

const DIBUJO = {
    X: '<svg viewBox="0 0 100 100"><line x1="18" y1="18" x2="82" y2="82"/><line x1="82" y1="18" x2="18" y2="82"/></svg>',
    O: '<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="34"/></svg>',
};

// Línea dorada sobre los tres en línea
function dibujarLinea(casillas) {
    $("tablero").querySelector(".linea-ganadora")?.remove();
    if (!casillas) return;
    const centro = (i) => [((i % 3) + 0.5) * 33.33, (Math.floor(i / 3) + 0.5) * 33.33];
    const [x1, y1] = centro(casillas[0]);
    const [x2, y2] = centro(casillas[2]);
    $("tablero").insertAdjacentHTML("beforeend", `<svg class="linea-ganadora" viewBox="0 0 100 100" preserveAspectRatio="none"><line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" vector-effect="non-scaling-stroke"/></svg>`);
}

function confeti() {
    const colores = ["#ff4d6d", "#4cc9f0", "#ffd23f", "#80ed99", "#c77dff"];
    for (let k = 0; k < 60; k++) {
        const p = document.createElement("div");
        p.className = "confeti";
        p.style.left = `${Math.random() * 100}vw`;
        p.style.background = colores[k % colores.length];
        document.body.appendChild(p);
        p.animate(
            [
                { transform: "translateY(0) rotate(0deg)" },
                { transform: `translate(${(Math.random() - 0.5) * 120}px, ${innerHeight + 40}px) rotate(${Math.random() * 720}deg)` },
            ],
            { duration: 1600 + Math.random() * 1400, delay: Math.random() * 400, easing: "cubic-bezier(.3,.6,.6,1)" }
        ).onfinish = () => p.remove();
    }
}

let lineaDibujada = null;
function pintar() {
    if (!partida) return;
    const g = lineaGanadora(partida.tablero);
    const clave = g ? g.casillas.join() : null;
    if (clave !== lineaDibujada) {
        lineaDibujada = clave;
        dibujarLinea(g?.casillas);
    }
    partida.tablero.forEach((v, i) => {
        const c = celdas[i];
        const contenido = v ? SIMBOLO[v] : "";
        if (c.dataset.v !== contenido || i === ultimaPintada) {
            c.innerHTML = v ? DIBUJO[SIMBOLO[v]] : "";
            c.dataset.v = contenido;
        }
        c.className = `celda${v ? ` ${SIMBOLO[v].toLowerCase()}` : ""}${i === ultimaPintada ? " nueva" : ""}${g?.casillas.includes(i) ? " ganadora" : ""}`;
        c.disabled = !esMiTurno() || Boolean(v);
    });
    const marca = (uid) => `<span class="simbolo-${SIMBOLO[numeroDe[uid]].toLowerCase()}">${SIMBOLO[numeroDe[uid]]}</span>`;
    $("p0").querySelector(".nombre").innerHTML = `${marca(yo)}${nombres[yo]}`;
    $("p1").querySelector(".nombre").innerHTML = `${marca(rival())}${nombres[rival()]}`;
    const fin = partida.estado === "terminada";
    $("p0").classList.toggle("turno", !fin && partida.turno === yo);
    $("p1").classList.toggle("turno", !fin && partida.turno === rival());
    $("estado-turno").textContent = fin ? "Terminada" : partida.turno === yo ? "Tu turno" : `Turno de ${nombres[rival()]}`;
}

async function jugar(i, quien) {
    ocupado = true;
    const tablero = [...partida.tablero];
    tablero[i] = numeroDe[quien];
    const g = lineaGanadora(tablero);
    const empate = !g && lleno(tablero);
    const cambios = {
        tablero,
        ultimo: i,
        turno: g || empate ? null : jugadores.find((j) => j !== quien),
        estado: g || empate ? "terminada" : "jugando",
        ganador: g ? quien : empate ? "empate" : null,
    };
    vibrar(15);
    if (online) return online.actualizarPartida(idPartida, cambios);
    Object.assign(partida, cambios);
    ultimaPintada = i;
    despues();
}

function despues() {
    ocupado = false;
    pintar();
    if (partida.estado === "terminada") return fin();
    if (!online && partida.turno === "bot") {
        ocupado = true;
        pintar();
        setTimeout(() => {
            ocupado = false;
            jugar(jugadaCompu(partida.tablero, 2, estado.dificultad), "bot");
        }, 550);
    }
}

function fin() {
    const gane = partida.ganador === yo;
    const empate = partida.ganador === "empate";
    if (!online) {
        if (empate) estado.empates++;
        else if (gane) estado.victorias++;
        else estado.derrotas++;
        guardar(CLAVE, estado);
    }
    vibrar(gane ? 90 : 140);
    if (gane) confeti();
    $("titulo-centro").innerHTML = `${empate ? "Empate" : gane ? "¡Ganaste!" : `Ganó ${nombres[rival()]}`}<div class="chico">${
        online ? "" : `${estado.victorias} ganadas · ${estado.empates} empates · ${estado.derrotas} perdidas`
    }</div>`;
    $("opciones").hidden = Boolean(online);
    $("jugar").textContent = online ? online.textoRevancha(partida, yo) : "Otra vez";
    setTimeout(() => ($("centro").hidden = false), 900);
}

// ---------- Inicio ----------
function empezarContraBot() {
    // Se turnan para empezar: una vez arrancás vos, otra la compu
    const empiezaBot = (estado.victorias + estado.derrotas + estado.empates) % 2 === 1;
    jugadores = [yo, "bot"];
    numeroDe = empiezaBot ? { bot: 1, [yo]: 2 } : { [yo]: 1, bot: 2 };
    nombres = { [yo]: "Vos", bot: `Compu · ${NOMBRES_DIFICULTAD[estado.dificultad]}` };
    partida = { ...datosIniciales(), turno: empiezaBot ? "bot" : yo, estado: "jugando", ganador: null };
    ultimaPintada = -1;
    for (const c of celdas) c.dataset.v = "";
    $("centro").hidden = true;
    despues();
}

function pintarDificultad() {
    for (const b of document.querySelectorAll(".dificultad button")) b.classList.toggle("activa", Number(b.dataset.nivel) === estado.dificultad);
}
for (const b of document.querySelectorAll(".dificultad button")) {
    b.addEventListener("click", () => {
        estado.dificultad = Number(b.dataset.nivel);
        guardar(CLAVE, estado);
        pintarDificultad();
    });
}

$("jugar").addEventListener("click", async () => {
    if (!online) return empezarContraBot();
    await online.irARevancha(partida, datosIniciales);
});

if (idPartida) {
    online = await import("../../js/multijugador.js");
    online.iniciarPresencia("Ta-te-tí");
    $("centro").hidden = true;
    online.escucharPartida(
        idPartida,
        (p) => {
            if (!p) {
                $("titulo-centro").innerHTML = "La partida ya no existe";
                $("opciones").hidden = true;
                $("jugar").hidden = true;
                $("centro").hidden = false;
                return;
            }
            if (!partida) {
                jugadores = [...p.jugadores];
                numeroDe = { [p.creador]: 1, [p.jugadores.find((j) => j !== p.creador)]: 2 };
                nombres = { ...p.nombres, [yo]: "Vos" };
                if (p.estado === "invitada" && p.creador !== yo) online.actualizarPartida(idPartida, { estado: "jugando" });
            }
            partida = p;
            ultimaPintada = p.ultimo ?? -1;
            ocupado = false;
            pintar();
            if (p.estado === "terminada") fin();
        },
        () => {
            $("titulo-centro").innerHTML = "No tenés acceso a esta partida";
            $("jugar").hidden = true;
            $("centro").hidden = false;
        }
    );
}

pintarDificultad();
