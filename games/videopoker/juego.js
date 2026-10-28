// Video póker (Jacks or Better): se reparten 5 cartas, elegís cuáles guardar y se cambian las demás.
// Paga según la mano final, desde un par de J o más. Tabla 9/6 (devuelve cerca del 99%).
import { formatear, textoFlotante, vibrar } from "../../js/comun3d.js";
import { fichas, cambiarFichas } from "../../js/fichas.js";
import { selectorApuesta, pintarSaldo, conectarRecarga } from "../../js/casino.js";
import { mazoMezclado, htmlNaipe } from "../../js/naipes.js";

const $ = (id) => document.getElementById(id);

// Cuántas veces la apuesta devuelve cada mano (incluye lo apostado)
const MANOS = [
    { id: "real", nombre: "Escalera real", paga: 800 },
    { id: "color-escalera", nombre: "Escalera de color", paga: 50 },
    { id: "poker", nombre: "Póker", paga: 25 },
    { id: "full", nombre: "Full", paga: 9 },
    { id: "color", nombre: "Color", paga: 6 },
    { id: "escalera", nombre: "Escalera", paga: 4 },
    { id: "trio", nombre: "Trío", paga: 3 },
    { id: "doble", nombre: "Doble par", paga: 2 },
    { id: "jotas", nombre: "Par de J o más", paga: 1 },
];

const apuesta = selectorApuesta({ menos: $("menos"), mas: $("mas"), texto: $("apuesta"), alCambiar: () => pintarTabla() });
const revisarRecarga = conectarRecarga($("recargar"), () => pintar());

let mazo = [];
let mano = [];
let guardadas = [false, false, false, false, false];
let fase = "apostar"; // apostar → elegir → apostar
let monto = 0;

// Qué mano es (null si no paga)
export function evaluar(cartas) {
    const valores = cartas.map((c) => c.v).sort((a, b) => a - b);
    const cuenta = {};
    for (const v of valores) cuenta[v] = (cuenta[v] ?? 0) + 1;
    const grupos = Object.values(cuenta).sort((a, b) => b - a);
    const color = cartas.every((c) => c.palo === cartas[0].palo);
    const distintos = grupos.length === 5;
    const altaConAs = valores.join() === "1,10,11,12,13";
    const escalera = distintos && (valores[4] - valores[0] === 4 || altaConAs);
    if (escalera && color) return altaConAs ? "real" : "color-escalera";
    if (grupos[0] === 4) return "poker";
    if (grupos[0] === 3 && grupos[1] === 2) return "full";
    if (color) return "color";
    if (escalera) return "escalera";
    if (grupos[0] === 3) return "trio";
    if (grupos[0] === 2 && grupos[1] === 2) return "doble";
    const par = Object.entries(cuenta).find(([v, n]) => n === 2);
    if (par && (Number(par[0]) === 1 || Number(par[0]) >= 11)) return "jotas";
    return null;
}

function pintarTabla(resaltar = null) {
    const a = apuesta();
    $("tabla").innerHTML = MANOS.map(
        (m) => `<li class="${m.id === resaltar ? "gano" : ""}"><span>${m.nombre}</span><b>${formatear(m.paga * a)}</b></li>`
    ).join("");
}

function pintarCartas(nuevas = []) {
    $("mano").innerHTML = mano
        .map((c, i) => `<button class="carta-vp${guardadas[i] ? " guardada" : ""}${nuevas.includes(i) ? " nueva" : ""}" data-i="${i}" style="--d:${nuevas.indexOf(i) * 80}ms" ${fase !== "elegir" ? "disabled" : ""}>
            ${htmlNaipe(c, 64)}<span class="marca">GUARDADA</span></button>`)
        .join("");
    for (const b of $("mano").querySelectorAll(".carta-vp")) {
        b.addEventListener("click", () => {
            const i = Number(b.dataset.i);
            guardadas[i] = !guardadas[i];
            vibrar(8);
            b.classList.toggle("guardada", guardadas[i]);
        });
    }
}

function repartir() {
    monto = apuesta();
    if (fichas() < monto) return;
    cambiarFichas(-monto);
    mazo = mazoMezclado();
    mano = mazo.splice(0, 5);
    guardadas = [false, false, false, false, false];
    fase = "elegir";
    apuesta.bloquear(true);
    const posible = evaluar(mano);
    mensaje(posible ? `Tenés ${MANOS.find((m) => m.id === posible).nombre}. Tocá las cartas para guardarlas` : "Tocá las cartas que querés guardar");
    pintarTabla(posible);
    pintarCartas([0, 1, 2, 3, 4]);
    vibrar(12);
    pintar();
}

function cambiar() {
    const nuevas = [];
    mano = mano.map((c, i) => {
        if (guardadas[i]) return c;
        nuevas.push(i);
        return mazo.shift();
    });
    fase = "apostar";
    apuesta.bloquear(false);
    const resultado = evaluar(mano);
    pintarTabla(resultado);
    pintarCartas(nuevas);
    if (resultado) {
        const m = MANOS.find((x) => x.id === resultado);
        const premio = m.paga * monto;
        setTimeout(() => {
            cambiarFichas(premio);
            mensaje(`¡${m.nombre}! Ganaste ${formatear(premio)}`, "gano");
            const r = $("mano").getBoundingClientRect();
            textoFlotante(r.left + r.width / 2, r.top, `+${formatear(premio)}`, "#ffd166");
            vibrar(m.paga >= 25 ? [60, 40, 60, 40, 160] : [30, 30, 60]);
            if (m.paga >= 25) $("mesa").classList.add("festejo");
            setTimeout(() => $("mesa").classList.remove("festejo"), 1600);
            pintar();
        }, nuevas.length * 80 + 350);
    } else {
        mensaje("Sin premio. ¡Otra mano!", "perdio");
        vibrar([40, 30, 80]);
    }
    pintar();
}

function mensaje(texto, tipo = "") {
    $("mensaje").textContent = texto;
    $("mensaje").className = `mensaje-casino ${tipo}`;
}

function pintar() {
    pintarSaldo($("fichas"));
    const b = $("accion");
    if (fase === "elegir") {
        b.textContent = guardadas.every(Boolean) ? "✋ Plantarse" : "🔄 Cambiar cartas";
        b.disabled = false;
    } else {
        b.textContent = mano.length ? "🃏 Otra mano" : "🃏 Repartir";
        b.disabled = fichas() < apuesta();
    }
    revisarRecarga();
}

$("accion").addEventListener("click", () => (fase === "elegir" ? cambiar() : repartir()));
$("mano").addEventListener("click", () => fase === "elegir" && pintar());
$("mano").innerHTML = Array.from({ length: 5 }, () => `<div class="carta-vp">${htmlNaipe(null, 64, true)}</div>`).join("");
pintarTabla();
pintar();
