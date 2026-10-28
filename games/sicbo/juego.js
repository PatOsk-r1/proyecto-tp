// Sic Bo: tres dados. Se pueden poner fichas en varias apuestas a la vez (pagos clásicos de casino).
import { formatear, textoFlotante, vibrar } from "../../js/comun3d.js";
import { fichas, cambiarFichas } from "../../js/fichas.js";
import { selectorApuesta, pintarSaldo, conectarRecarga } from "../../js/casino.js";

const $ = (id) => document.getElementById(id);
const PUNTOS = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
const CARAS = [
    { n: 1, t: "rotateY(0deg)", ver: [0, 0] },
    { n: 6, t: "rotateY(180deg)", ver: [0, 180] },
    { n: 2, t: "rotateY(90deg)", ver: [0, -90] },
    { n: 5, t: "rotateY(-90deg)", ver: [0, 90] },
    { n: 3, t: "rotateX(90deg)", ver: [-90, 0] },
    { n: 4, t: "rotateX(-90deg)", ver: [90, 0] },
];
// Pago "a 1" de cada total exacto
const PAGO_TOTAL = { 4: 50, 5: 18, 6: 14, 7: 12, 8: 8, 9: 6, 10: 6, 11: 6, 12: 6, 13: 8, 14: 12, 15: 14, 16: 18, 17: 50 };

// Cada apuesta: texto, cómo se muestra, y cuánto devuelve (multiplicador total) para unos dados
const APUESTAS = {
    chico: { texto: "CHICO", sub: "4 a 10 · 1 a 1", clase: "ancha", paga: (d, s, t) => (s >= 4 && s <= 10 && !t ? 2 : 0) },
    grande: { texto: "GRANDE", sub: "11 a 17 · 1 a 1", clase: "ancha", paga: (d, s, t) => (s >= 11 && s <= 17 && !t ? 2 : 0) },
    ...Object.fromEntries(Object.entries(PAGO_TOTAL).map(([n, p]) => [`t${n}`, { texto: n, sub: `${p} a 1`, paga: (d, s) => (s === Number(n) ? p + 1 : 0) }])),
    triple: { texto: "CUALQUIER TRIPLE", sub: "30 a 1", clase: "media", paga: (d, s, t) => (t ? 31 : 0) },
    ...Object.fromEntries([1, 2, 3, 4, 5, 6].map((n) => [`n${n}`, { texto: `<span class="mini-dado">${n}</span>`, sub: "1·2·3 a 1", paga: (d) => {
        const veces = d.filter((x) => x === n).length;
        return veces ? veces + 1 : 0;
    } }])),
};

const apuesta = selectorApuesta({ menos: $("menos"), mas: $("mas"), texto: $("apuesta") });
const revisarRecarga = conectarRecarga($("recargar"), () => pintar());

let apuestas = {};
let tirando = false;
const historial = [];
const vueltas = [0, 0, 0];
const dadosEl = [...document.querySelectorAll(".dado")];

function armarDados() {
    for (const el of dadosEl) {
        el.innerHTML = CARAS.map((c) => `<div class="cara-dado ${["", "uno", "", "", "cuatro"][c.n] ?? ""}" style="transform:${c.t} translateZ(28px)">${Array.from({ length: 9 }, (_, i) => (PUNTOS[c.n].includes(i) ? "<i></i>" : "<span></span>")).join("")}</div>`).join("");
    }
}
function mostrar(i, valor) {
    const cara = CARAS.find((c) => c.n === valor);
    vueltas[i] += 2 + Math.floor(Math.random() * 2);
    dadosEl[i].style.transform = `rotateX(${cara.ver[0] + 360 * vueltas[i]}deg) rotateY(${cara.ver[1] + 360 * vueltas[i]}deg) rotateZ(${(Math.random() - 0.5) * 20}deg)`;
}

// Paño: chico/grande, totales, triple y números
function armarPano() {
    const orden = ["chico", "grande", ...Object.keys(PAGO_TOTAL).map((n) => `t${n}`), "triple", "n1", "n2", "n3", "n4", "n5", "n6"];
    $("pano").innerHTML = orden
        .map((k) => `<button class="casilla-s ${APUESTAS[k].clase ?? ""}" data-k="${k}" type="button">${APUESTAS[k].texto}<small>${APUESTAS[k].sub}</small></button>`)
        .join("");
}

const total = () => Object.values(apuestas).reduce((t, v) => t + v, 0);
const colorFicha = (m) => (m >= 500 ? "#212121" : m >= 100 ? "#1e88e5" : m >= 50 ? "#e53935" : "#2a9d8f");

$("pano").addEventListener("click", (e) => {
    const b = e.target.closest(".casilla-s");
    if (!b || tirando) return;
    const valor = apuesta();
    if (fichas() - total() < valor) return vibrar(40);
    limpiarResaltado();
    apuestas[b.dataset.k] = (apuestas[b.dataset.k] ?? 0) + valor;
    vibrar(8);
    pintar();
});

function limpiarResaltado() {
    for (const c of document.querySelectorAll(".casilla-s.gana")) c.classList.remove("gana");
}

async function tirar() {
    const apostado = total();
    if (tirando || !apostado || apostado > fichas()) return;
    tirando = true;
    cambiarFichas(-apostado);
    limpiarResaltado();
    $("resultado").textContent = "…";
    $("resultado").className = "resultado-s";
    $("cubilete").classList.add("agitando");
    pintar();
    vibrar([20, 20, 20, 20, 20]);
    await new Promise((ok) => setTimeout(ok, 600));
    $("cubilete").classList.remove("agitando");
    const dados = [0, 0, 0].map(() => 1 + Math.floor(Math.random() * 6));
    dados.forEach((v, i) => mostrar(i, v));
    await new Promise((ok) => setTimeout(ok, 1200));
    const suma = dados.reduce((a, b) => a + b, 0);
    const triple = dados[0] === dados[1] && dados[1] === dados[2];
    let premio = 0;
    for (const [k, monto] of Object.entries(apuestas)) premio += monto * APUESTAS[k].paga(dados, suma, triple);
    for (const c of document.querySelectorAll(".casilla-s")) if (APUESTAS[c.dataset.k].paga(dados, suma, triple)) c.classList.add("gana");
    cambiarFichas(premio);
    historial.unshift({ suma, triple });
    if (historial.length > 14) historial.pop();
    const desc = `${dados.join(" · ")} = ${suma}${triple ? " · ¡TRIPLE!" : suma <= 10 ? " · chico" : " · grande"}`;
    if (premio > 0) {
        $("resultado").textContent = `${desc} · +${formatear(premio)}`;
        $("resultado").className = "resultado-s gano";
        const r = $("cubilete").getBoundingClientRect();
        textoFlotante(r.left + r.width / 2, r.top, `+${formatear(premio)}`, "#ffd166");
        vibrar(premio >= apostado * 10 ? [80, 40, 160] : 60);
    } else {
        $("resultado").textContent = desc;
        vibrar(80);
    }
    tirando = false;
    pintar();
}

function pintar() {
    pintarSaldo($("fichas"));
    for (const c of document.querySelectorAll(".casilla-s")) {
        c.querySelector(".apostado")?.remove();
        const monto = apuestas[c.dataset.k];
        if (monto) c.insertAdjacentHTML("beforeend", `<span class="apostado" style="--c:${colorFicha(monto)}">${formatear(monto)}</span>`);
    }
    $("tirar").disabled = tirando || !total() || total() > fichas();
    $("tirar").textContent = total() ? `🎲 Tirar (${formatear(total())})` : "🎲 Tirar";
    $("borrar").disabled = tirando || !total();
    $("historial").innerHTML = historial.map((h) => `<span class="${h.triple ? "triple" : h.suma <= 10 ? "chico" : "grande"}">${h.suma}</span>`).join("");
    revisarRecarga();
}

$("tirar").addEventListener("click", tirar);
$("borrar").addEventListener("click", () => {
    if (tirando) return;
    apuestas = {};
    limpiarResaltado();
    pintar();
});
armarDados();
armarPano();
[3, 5, 6].forEach((v, i) => mostrar(i, v));
pintar();
