// Dados: se tiran dos dados y se apuesta a la suma o a combinaciones especiales.
import { formatear, textoFlotante, vibrar } from "../../js/comun3d.js";
import { fichas, cambiarFichas } from "../../js/fichas.js";
import { selectorApuesta, pintarSaldo, conectarRecarga } from "../../js/casino.js";

const $ = (id) => document.getElementById(id);
// paga = multiplicador total (incluye la apuesta)
const OPCIONES = {
    bajo: { gana: (a, b) => a + b < 7, paga: 2 },
    siete: { gana: (a, b) => a + b === 7, paga: 5 },
    sobre: { gana: (a, b) => a + b > 7, paga: 2 },
    dobles: { gana: (a, b) => a === b, paga: 5 },
    serpiente: { gana: (a, b) => a === 1 && b === 1, paga: 31 },
    doce: { gana: (a, b) => a === 6 && b === 6, paga: 31 },
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
let racha = 0;
const historial = [];
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
    vueltas[i] += 2 + Math.floor(Math.random() * 2);
    el.style.transform = `rotateX(${cara.ver[0] + 360 * vueltas[i]}deg) rotateY(${cara.ver[1] + 360 * vueltas[i]}deg) rotateZ(${(Math.random() - 0.5) * 16}deg)`;
}

function pintarHistorial() {
    $("historial").innerHTML = historial
        .map((s) => `<span class="${s < 7 ? "bajo" : s === 7 ? "siete" : "sobre"}">${s}</span>`)
        .join("");
}

function pintar() {
    pintarSaldo($("fichas"));
    for (const b of document.querySelectorAll(".opcion-dado")) b.classList.toggle("elegida", b.dataset.apuesta === eleccion);
    $("tirar").disabled = tirando || fichas() < apuesta();
    $("racha").textContent = racha >= 2 ? `🔥 Racha de ${racha} aciertos` : "";
    revisarRecarga();
}

$("tirar").addEventListener("click", () => {
    const valor = apuesta();
    if (tirando || fichas() < valor) return;
    tirando = true;
    apuesta.bloquear(true);
    cambiarFichas(-valor);
    $("suma").textContent = "🎲 …";
    $("suma").className = "suma";
    for (const d of document.querySelectorAll(".dado")) d.classList.remove("gana");
    pintar();
    vibrar(20);
    const d1 = 1 + Math.floor(Math.random() * 6);
    const d2 = 1 + Math.floor(Math.random() * 6);
    // Los dados vuelan desde la mano, rebotan y giran hasta la cara final
    for (const t of document.querySelectorAll(".tiro")) {
        t.classList.remove("volando");
        void t.offsetWidth;
        t.classList.add("volando");
    }
    mostrar($("dado1"), 0, d1);
    mostrar($("dado2"), 1, d2);
    setTimeout(() => vibrar(15), 750);
    setTimeout(() => vibrar(10), 1050);
    setTimeout(() => {
        const suma = d1 + d2;
        const op = OPCIONES[eleccion];
        const premio = op.gana(d1, d2) ? valor * op.paga : 0;
        cambiarFichas(premio);
        historial.unshift(suma);
        if (historial.length > 12) historial.pop();
        pintarHistorial();
        if (premio) {
            racha++;
            $("suma").textContent = `${d1} + ${d2} = ${suma} · ¡Ganaste ${formatear(premio)}!`;
            $("suma").className = "suma gano";
            for (const d of document.querySelectorAll(".dado")) d.classList.add("gana");
            const boton = document.querySelector(`[data-apuesta="${eleccion}"]`);
            boton.classList.remove("acierto");
            void boton.offsetWidth;
            boton.classList.add("acierto");
            const caja = $("suma").getBoundingClientRect();
            textoFlotante(caja.left + caja.width / 2, caja.top, `+${formatear(premio)}`, "#ffd166");
            vibrar(op.paga > 10 ? [80, 50, 80, 50, 160] : 60);
        } else {
            racha = 0;
            $("suma").textContent = `${d1} + ${d2} = ${suma}`;
            vibrar(100);
        }
        tirando = false;
        apuesta.bloquear(false);
        pintar();
    }, 1400);
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
mostrar($("dado1"), 0, 5);
mostrar($("dado2"), 1, 6);
pintar();
