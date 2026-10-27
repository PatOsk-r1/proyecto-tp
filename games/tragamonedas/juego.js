// Tragamonedas de 3 rodillos y una línea. Usa las fichas compartidas del casino.
import { formatear, textoFlotante, vibrar, MONEDA } from "../../js/comun3d.js";
import { fichas, cambiarFichas, recargar } from "../../js/fichas.js";

const $ = (id) => document.getElementById(id);

// peso = qué tan seguido sale; paga = multiplicador con tres iguales
const SIMBOLOS = [
    { s: "7️⃣", peso: 3, paga: 200 },
    { s: "💎", peso: 5, paga: 80 },
    { s: "⭐", peso: 8, paga: 40 },
    { s: "🔔", peso: 12, paga: 25 },
    { s: "🍋", peso: 18, paga: 12 },
    { s: "🍒", peso: 24, paga: 8 },
];
const PESO_TOTAL = SIMBOLOS.reduce((t, x) => t + x.peso, 0);
const APUESTAS = [10, 25, 50, 100, 250, 500];
const ALTO = 70;
const VUELTAS = 24; // símbolos que pasan antes de frenar

let nivelApuesta = 0;
let girando = false;

function sortear() {
    let r = Math.random() * PESO_TOTAL;
    for (const x of SIMBOLOS) {
        r -= x.peso;
        if (r < 0) return x;
    }
    return SIMBOLOS.at(-1);
}

const rodillos = [...document.querySelectorAll(".rodillo .tira")].map((tira) => ({ tira, actual: [sortear(), sortear(), sortear()] }));

function armarTira(r, final) {
    // Arriba lo que se ve ahora, después símbolos al azar y al final el resultado en el medio
    const lista = [...r.actual];
    for (let i = 0; i < VUELTAS; i++) lista.push(sortear());
    lista.push(sortear(), final, sortear());
    r.tira.innerHTML = lista.map((x) => `<div class="simbolo">${x.s}</div>`).join("");
    r.tira.style.transition = "none";
    r.tira.style.transform = "translateY(0)";
    r.actual = lista.slice(-3);
    return lista.length;
}

function frenar(r, cantidad, demora) {
    return new Promise((resolver) => {
        void r.tira.offsetHeight;
        r.tira.style.transition = `transform ${1.4 + demora}s cubic-bezier(0.15, 0.6, 0.25, 1.06)`;
        r.tira.style.transform = `translateY(${-(cantidad - 3) * ALTO}px)`;
        r.tira.addEventListener("transitionend", () => {
            vibrar(15);
            resolver();
        }, { once: true });
    });
}

function premio(linea, apuesta) {
    const [a, b, c] = linea;
    if (a === b && b === c) return apuesta * a.paga;
    if (a === b) return apuesta;
    return 0;
}

async function girar() {
    const apuesta = APUESTAS[nivelApuesta];
    if (girando || fichas() < apuesta) return;
    girando = true;
    cambiarFichas(-apuesta);
    $("maquina").classList.remove("premio");
    $("mensaje").textContent = "…";
    pintar();
    vibrar(20);

    const linea = [sortear(), sortear(), sortear()];
    await Promise.all(rodillos.map((r, i) => frenar(r, armarTira(r, linea[i]), i * 0.45)));

    const ganado = premio(linea, apuesta);
    cambiarFichas(ganado);
    if (ganado > apuesta) {
        $("maquina").classList.add("premio");
        $("mensaje").textContent = linea[0] === linea[2] && linea[0].paga >= 40 ? `¡JACKPOT! +${formatear(ganado)}` : `¡Ganaste ${formatear(ganado)}!`;
        const caja = $("maquina").getBoundingClientRect();
        textoFlotante(caja.left + caja.width / 2, caja.top + caja.height / 2, `+${formatear(ganado)}`, "#ffd166");
        vibrar(80);
    } else if (ganado === apuesta) {
        $("mensaje").textContent = "Recuperaste la apuesta";
    } else {
        $("mensaje").textContent = "Otra vez será";
    }
    girando = false;
    pintar();
}

function pintar() {
    const apuesta = APUESTAS[nivelApuesta];
    $("fichas").innerHTML = `${MONEDA}${formatear(fichas())}`;
    $("apuesta").textContent = apuesta;
    $("girar").disabled = girando || fichas() < apuesta;
    $("menos").disabled = girando || nivelApuesta === 0;
    $("mas").disabled = girando || nivelApuesta === APUESTAS.length - 1;
    $("recargar").hidden = fichas() >= 10 || girando;
}

$("menos").addEventListener("click", () => {
    nivelApuesta = Math.max(0, nivelApuesta - 1);
    pintar();
});
$("mas").addEventListener("click", () => {
    nivelApuesta = Math.min(APUESTAS.length - 1, nivelApuesta + 1);
    pintar();
});
$("girar").addEventListener("click", girar);
$("recargar").addEventListener("click", () => {
    recargar();
    $("mensaje").textContent = "¡Fichas recargadas!";
    pintar();
});

for (const r of rodillos) r.tira.innerHTML = r.actual.map((x) => `<div class="simbolo">${x.s}</div>`).join("");
pintar();
