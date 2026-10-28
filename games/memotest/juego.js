// Memotest: dar vuelta de a dos cartas y encontrar los pares.
import { cargar, guardar, vibrar } from "../../js/comun3d.js";
import { icono } from "../../js/iconos.js";

const $ = (id) => document.getElementById(id);
const CLAVE = "memotest";
const NIVELES = [
    { pares: 8, columnas: 4 },
    { pares: 10, columnas: 4 },
    { pares: 15, columnas: 5 },
];
const DIBUJOS = [
    "cereza", "limon", "campana", "estrella", "diamante", "siete", "pan", "medialuna",
    "galletita", "dona", "torta", "bombon", "pastel", "satelite", "luna", "cohete", "anillo", "excavadora",
];

const estado = cargar(CLAVE, { nivel: 0, records: [null, null, null] });
let cartas = [];
let vistas = [];
let pares = 0;
let intentos = 0;
let bloqueado = false;

function nueva() {
    const n = NIVELES[estado.nivel];
    const elegidos = [...DIBUJOS].sort(() => Math.random() - 0.5).slice(0, n.pares);
    cartas = [...elegidos, ...elegidos].sort(() => Math.random() - 0.5);
    vistas = [];
    pares = 0;
    intentos = 0;
    bloqueado = false;
    const filas = Math.ceil(cartas.length / n.columnas);
    const mesa = $("mesa");
    mesa.style.gridTemplateColumns = `repeat(${n.columnas}, 1fr)`;
    mesa.style.width = `${Math.min(innerWidth * 0.94, (innerHeight - 200) * (n.columnas / filas) * 0.8, 520)}px`;
    mesa.innerHTML = cartas.map((d, i) => `<button class="carta-m" data-i="${i}"><span class="dorso"></span><span class="frente">${icono(d)}</span></button>`).join("");
    pintar();
}

$("mesa").addEventListener("click", (e) => {
    const b = e.target.closest(".carta-m");
    if (!b || bloqueado || b.classList.contains("vista") || b.classList.contains("par")) return;
    b.classList.add("vista");
    vistas.push(b);
    vibrar(8);
    if (vistas.length < 2) return;
    intentos++;
    const [a, c] = vistas;
    if (cartas[a.dataset.i] === cartas[c.dataset.i]) {
        a.classList.replace("vista", "par");
        c.classList.replace("vista", "par");
        vistas = [];
        pares++;
        vibrar(40);
        if (pares === NIVELES[estado.nivel].pares) setTimeout(fin, 700);
    } else {
        bloqueado = true;
        setTimeout(() => {
            a.classList.remove("vista");
            c.classList.remove("vista");
            vistas = [];
            bloqueado = false;
        }, 800);
    }
    pintar();
});

function fin() {
    const record = estado.records[estado.nivel];
    const nuevo = record === null || intentos < record;
    if (nuevo) estado.records[estado.nivel] = intentos;
    guardar(CLAVE, estado);
    vibrar(90);
    $("titulo-centro").innerHTML = `¡Completo!<div class="chico">${intentos} intentos${nuevo ? " · ¡nuevo récord!" : ""}</div>`;
    $("jugar").textContent = "Otra vez";
    $("centro").hidden = false;
    pintar();
}

function pintar() {
    $("pares").textContent = `${pares}/${NIVELES[estado.nivel].pares}`;
    $("intentos").textContent = intentos;
    const r = estado.records[estado.nivel];
    $("record").textContent = r === null ? "—" : r;
    for (const b of document.querySelectorAll(".dificultad button")) b.classList.toggle("activa", Number(b.dataset.nivel) === estado.nivel);
}

for (const b of document.querySelectorAll(".dificultad button")) {
    b.addEventListener("click", () => {
        estado.nivel = Number(b.dataset.nivel);
        guardar(CLAVE, estado);
        pintar();
    });
}
$("jugar").addEventListener("click", () => {
    $("centro").hidden = true;
    nueva();
});

nueva();
