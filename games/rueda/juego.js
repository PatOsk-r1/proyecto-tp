// Rueda de la fortuna: 30 porciones con multiplicadores. Tres riesgos, todos devuelven 96% en promedio.
import { formatear, textoFlotante, vibrar } from "../../js/comun3d.js";
import { fichas, cambiarFichas } from "../../js/fichas.js";
import { selectorApuesta, pintarSaldo, conectarRecarga } from "../../js/casino.js";

const $ = (id) => document.getElementById(id);
const TAU = Math.PI * 2;
const PORCIONES = 30;

// [multiplicador, cantidad de porciones]
const RIESGOS = {
    bajo: [[0, 8], [1.2, 16], [1.5, 5], [2, 1]],
    medio: [[0, 15], [1.5, 7], [2, 5], [2.8, 3]],
    alto: [[0, 27], [4.4, 2], [20, 1]],
};
const COLOR = (m) => (m === 0 ? "#3a2a4a" : m < 1.5 ? "#8ac926" : m < 2 ? "#1982c4" : m < 2.5 ? "#ffbe0b" : m < 10 ? "#ff7a1a" : "#ff006e");

// Reparte las porciones intercalando valores para que la rueda quede variada
function armarRueda(riesgo) {
    const lista = [];
    const pendientes = RIESGOS[riesgo].map(([m, n]) => ({ m, n }));
    const ceros = pendientes.find((p) => p.m === 0);
    const otros = pendientes.filter((p) => p.m !== 0).sort((a, b) => b.n - a.n);
    const totalOtros = otros.reduce((t, p) => t + p.n, 0);
    let k = 0;
    while (lista.length < PORCIONES) {
        // Alterna ceros y premios en la proporción que corresponda
        const ponerCero = ceros.n > 0 && (lista.length % Math.max(1, Math.round(PORCIONES / Math.max(1, totalOtros))) !== 0 || otros.every((p) => !p.n));
        if (ponerCero && ceros.n) {
            lista.push(0);
            ceros.n--;
        } else {
            const p = otros[k % otros.length];
            k++;
            if (!p.n) continue;
            lista.push(p.m);
            p.n--;
        }
    }
    return lista;
}

const apuesta = selectorApuesta({ menos: $("menos"), mas: $("mas"), texto: $("apuesta") });
const revisarRecarga = conectarRecarga($("recargar"), () => pintar());
const lienzo = $("rueda");
const ctx = lienzo.getContext("2d");
const R = lienzo.width / 2;

let riesgo = "medio";
let rueda = armarRueda(riesgo);
let angulo = 0;
let girando = false;
let auto = false;
let ganadora = -1;

function dibujar() {
    ctx.clearRect(0, 0, lienzo.width, lienzo.height);
    ctx.save();
    ctx.translate(R, R);
    // Aro con bombitas
    const aro = ctx.createRadialGradient(0, 0, R * 0.85, 0, 0, R);
    aro.addColorStop(0, "#ffd166");
    aro.addColorStop(1, "#9c6500");
    ctx.fillStyle = aro;
    ctx.beginPath();
    ctx.arc(0, 0, R - 4, 0, TAU);
    ctx.fill();
    for (let k = 0; k < 30; k++) {
        const a = (k / 30) * TAU;
        ctx.fillStyle = (k + Math.floor(performance.now() / (girando ? 80 : 300))) % 2 ? "#fff" : "#ff7a1a";
        ctx.beginPath();
        ctx.arc(Math.cos(a) * (R - 22), Math.sin(a) * (R - 22), 8, 0, TAU);
        ctx.fill();
    }
    ctx.rotate(angulo);
    const paso = TAU / PORCIONES;
    rueda.forEach((m, i) => {
        const a0 = -Math.PI / 2 + i * paso - paso / 2;
        ctx.fillStyle = COLOR(m);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, R - 40, a0, a0 + paso);
        ctx.closePath();
        ctx.fill();
        if (i === ganadora && !girando) {
            ctx.fillStyle = `rgba(255,255,255,${0.25 + Math.sin(performance.now() / 120) * 0.2})`;
            ctx.fill();
        }
        ctx.strokeStyle = "#160326";
        ctx.lineWidth = 3;
        ctx.stroke();
        if (m > 0) {
            ctx.save();
            ctx.rotate(a0 + paso / 2);
            ctx.fillStyle = "#160326";
            ctx.font = "900 34px sans-serif";
            ctx.textAlign = "right";
            ctx.textBaseline = "middle";
            ctx.fillText(`${m}×`, R - 60, 0);
            ctx.restore();
        }
    });
    ctx.restore();
    // Centro
    const c = ctx.createRadialGradient(R - 20, R - 20, 5, R, R, 90);
    c.addColorStop(0, "#fff3b0");
    c.addColorStop(1, "#b5179e");
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.arc(R, R, 80, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.font = "900 46px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("★", R, R + 2);
    // Flecha arriba
    ctx.fillStyle = "#fff";
    ctx.strokeStyle = "#160326";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(R - 28, 6);
    ctx.lineTo(R + 28, 6);
    ctx.lineTo(R, 70);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
}

(function animarLuces() {
    if (!girando) dibujar();
    requestAnimationFrame(animarLuces);
})();

function girar() {
    const valor = apuesta();
    if (girando || fichas() < valor) {
        auto = false;
        return pintar();
    }
    cambiarFichas(-valor);
    girando = true;
    ganadora = -1;
    apuesta.bloquear(true);
    $("resultado").textContent = "…";
    $("resultado").className = "resultado-r";
    pintar();
    const indice = Math.floor(Math.random() * PORCIONES);
    const paso = TAU / PORCIONES;
    // La porción elegida termina bajo la flecha (arriba)
    const vueltas = 5 + Math.floor(Math.random() * 2);
    const actual = ((angulo % TAU) + TAU) % TAU;
    const destino = angulo - actual + TAU * vueltas - indice * paso + (Math.random() - 0.5) * paso * 0.7;
    const inicio = angulo;
    const t0 = performance.now();
    const dur = 4200;
    let ultimoTic = -1;
    function cuadro(ahora) {
        const t = Math.min(1, (ahora - t0) / dur);
        angulo = inicio + (destino - inicio) * (1 - (1 - t) ** 4);
        const tic = Math.floor(angulo / paso);
        if (tic !== ultimoTic) {
            ultimoTic = tic;
            if (t < 0.9) vibrar(3);
        }
        dibujar();
        if (t < 1) return requestAnimationFrame(cuadro);
        terminar(indice, valor);
    }
    requestAnimationFrame(cuadro);
}

function terminar(indice, valor) {
    girando = false;
    ganadora = indice;
    const m = rueda[indice];
    const premio = Math.floor(valor * m);
    cambiarFichas(premio);
    if (premio > 0) {
        $("resultado").textContent = `${m}× · ¡Ganaste ${formatear(premio)}!`;
        $("resultado").className = "resultado-r gano";
        const r = lienzo.getBoundingClientRect();
        textoFlotante(r.left + r.width / 2, r.top + r.height * 0.3, `+${formatear(premio)}`, COLOR(m));
        vibrar(m >= 10 ? [80, 40, 80, 40, 200] : 50);
    } else {
        $("resultado").textContent = "0× · otra vez será";
        vibrar(60);
    }
    apuesta.bloquear(false);
    pintar(m);
    if (auto) setTimeout(() => auto && girar(), 900);
}

function pintar(toco) {
    pintarSaldo($("fichas"));
    for (const b of document.querySelectorAll("[data-riesgo]")) {
        b.classList.toggle("activa", b.dataset.riesgo === riesgo);
        b.disabled = girando;
    }
    $("leyenda").innerHTML = RIESGOS[riesgo]
        .map(([m, n]) => `<span class="${toco === m ? "toco" : ""}" style="--c:${COLOR(m)};${m === 0 ? "color:#fff" : ""}">${m}× · ${n}/${PORCIONES}</span>`)
        .join("");
    $("girar").disabled = girando || fichas() < apuesta();
    $("auto").classList.toggle("activo", auto);
    $("auto").textContent = auto ? "■ Parar" : "🔁 Auto";
    revisarRecarga();
}

for (const b of document.querySelectorAll("[data-riesgo]")) {
    b.addEventListener("click", () => {
        if (girando) return;
        riesgo = b.dataset.riesgo;
        rueda = armarRueda(riesgo);
        ganadora = -1;
        pintar();
    });
}
$("girar").addEventListener("click", girar);
$("auto").addEventListener("click", () => {
    auto = !auto;
    pintar();
    if (auto && !girando) girar();
});
pintar();
