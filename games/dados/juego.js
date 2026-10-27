// Dados "Bajo / Siete / Sobre": se tiran dos dados y se apuesta a la suma.
import { formatear, textoFlotante, vibrar } from "../../js/comun3d.js";
import { fichas, cambiarFichas } from "../../js/fichas.js";
import { selectorApuesta, pintarSaldo, conectarRecarga } from "../../js/casino.js";

const $ = (id) => document.getElementById(id);
const OPCIONES = {
    bajo: { gana: (s) => s < 7, paga: 1 },
    siete: { gana: (s) => s === 7, paga: 4 },
    sobre: { gana: (s) => s > 7, paga: 1 },
};
// Puntos de cada cara (posiciones en una grilla de 3x3) y giro para mostrarla adelante
const PUNTOS = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
const CARAS = [
    { n: 1, t: "rotateY(0deg)", ver: [0, 0] },
    { n: 6, t: "rotateY(180deg)", ver: [0, 180] },
    { n: 2, t: "rotateY(90deg)", ver: [0, -90] },
    { n: 5, t: "rotateY(-90deg)", ver: [0, 90] },
    { n: 3, t: "rotateX(90deg)", ver: [-90, 0] },
    { n: 4, t: "rotateX(-90deg)", ver: [90, 0] },
];

let eleccion = "sobre";
let tirando = false;
const vueltas = [0, 0];

const apuesta = selectorApuesta({ menos: $("menos"), mas: $("mas"), texto: $("apuesta") });
const revisarRecarga = conectarRecarga($("recargar"), () => pintar());

function armarDado(el) {
    el.innerHTML = CARAS.map(
        (c) => `<div class="cara-dado" style="transform:${c.t} translateZ(35px)">${Array.from({ length: 9 }, (_, i) => (PUNTOS[c.n].includes(i) ? "<i></i>" : "<span></span>")).join("")}</div>`
    ).join("");
}

function mostrar(el, i, valor) {
    const cara = CARAS.find((c) => c.n === valor);
    vueltas[i] += 2;
    el.style.transform = `rotateX(${cara.ver[0] + 360 * vueltas[i]}deg) rotateY(${cara.ver[1] + 360 * vueltas[i]}deg)`;
}

function pintar() {
    pintarSaldo($("fichas"));
    for (const b of document.querySelectorAll(".opcion-dado")) b.classList.toggle("elegida", b.dataset.apuesta === eleccion);
    $("tirar").disabled = tirando || fichas() < apuesta();
    revisarRecarga();
}

$("tirar").addEventListener("click", () => {
    const valor = apuesta();
    if (tirando || fichas() < valor) return;
    tirando = true;
    cambiarFichas(-valor);
    $("suma").textContent = "…";
    $("suma").className = "suma";
    pintar();
    vibrar(20);
    const d1 = 1 + Math.floor(Math.random() * 6);
    const d2 = 1 + Math.floor(Math.random() * 6);
    mostrar($("dado1"), 0, d1);
    mostrar($("dado2"), 1, d2);
    setTimeout(() => {
        const suma = d1 + d2;
        const op = OPCIONES[eleccion];
        const premio = op.gana(suma) ? valor * (op.paga + 1) : 0;
        cambiarFichas(premio);
        if (premio) {
            $("suma").textContent = `Salió ${suma} · ¡Ganaste ${formatear(premio)}!`;
            $("suma").className = "suma gano";
            const caja = $("suma").getBoundingClientRect();
            textoFlotante(caja.left + caja.width / 2, caja.top, `+${formatear(premio)}`, "#ffd166");
            vibrar(60);
        } else {
            $("suma").textContent = `Salió ${suma}`;
            vibrar(100);
        }
        tirando = false;
        pintar();
    }, 1300);
});

for (const b of document.querySelectorAll(".opcion-dado")) {
    b.addEventListener("click", () => {
        if (tirando) return;
        eleccion = b.dataset.apuesta;
        vibrar(10);
        pintar();
    });
}

armarDado($("dado1"));
armarDado($("dado2"));
pintar();
