// Raspadita: comprás un boleto y raspás 9 casillas. Tres símbolos iguales pagan ese premio.
// El resultado se sortea al comprar (probabilidades fijas, devuelve ~95%) y después se arma el boleto.
import { formatear, textoFlotante, vibrar } from "../../js/comun3d.js";
import { fichas, cambiarFichas } from "../../js/fichas.js";
import { selectorApuesta, pintarSaldo, conectarRecarga } from "../../js/casino.js";

const $ = (id) => document.getElementById(id);
// simbolo, multiplicador, probabilidad por boleto
const PREMIOS = [
    { s: "💎", m: 1000, p: 0.0001 },
    { s: "👑", m: 100, p: 0.001 },
    { s: "⭐", m: 20, p: 0.008 },
    { s: "🍀", m: 5, p: 0.03 },
    { s: "🍒", m: 2, p: 0.09 },
    { s: "🔔", m: 1, p: 0.26 },
];
const SIMBOLOS = PREMIOS.map((x) => x.s);

const apuesta = selectorApuesta({ menos: $("menos"), mas: $("mas"), texto: $("apuesta") });
const revisarRecarga = conectarRecarga($("recargar"), () => pintar());

let boleto = null; // { celdas, premio, revelado, monto }

function sortearPremio() {
    let r = Math.random();
    for (const x of PREMIOS) {
        if (r < x.p) return x;
        r -= x.p;
    }
    return null;
}

const mezclar = (lista) => {
    for (let i = lista.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [lista[i], lista[j]] = [lista[j], lista[i]];
    }
    return lista;
};

// Arma las 9 casillas: tres del premio (si hay) y el resto sin formar otro trío
function armarCeldas(premio) {
    const celdas = premio ? [premio.s, premio.s, premio.s] : [];
    const cuenta = Object.fromEntries(SIMBOLOS.map((s) => [s, 0]));
    if (premio) cuenta[premio.s] = 3;
    while (celdas.length < 9) {
        const s = SIMBOLOS[Math.floor(Math.random() * SIMBOLOS.length)];
        if (premio && s === premio.s) continue;
        if (cuenta[s] >= 2) continue;
        cuenta[s]++;
        celdas.push(s);
    }
    return mezclar(celdas);
}

// ---------- Capa para raspar ----------
const capa = $("capa");
const ctx = capa.getContext("2d");
let raspando = false;
let raspado = 0;

function pintarCapa() {
    const caja = capa.getBoundingClientRect();
    const escala = Math.min(devicePixelRatio, 2);
    capa.width = caja.width * escala;
    capa.height = caja.height * escala;
    ctx.setTransform(escala, 0, 0, escala, 0, 0);
    const w = caja.width;
    const h = caja.height;
    ctx.globalCompositeOperation = "source-over";
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, "#d9d9d9");
    g.addColorStop(0.3, "#f8f9fa");
    g.addColorStop(0.5, "#adb5bd");
    g.addColorStop(0.7, "#f1f3f5");
    g.addColorStop(1, "#868e96");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    // Brillitos y texto
    for (let k = 0; k < 120; k++) {
        ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.6})`;
        ctx.fillRect(Math.random() * w, Math.random() * h, 2, 2);
    }
    ctx.fillStyle = "#6c757d";
    ctx.font = `900 ${w * 0.1}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("RASPÁ AQUÍ", w / 2, h / 2);
    ctx.font = `${w * 0.08}px sans-serif`;
    ctx.fillText("👆", w / 2, h / 2 + w * 0.13);
    raspado = 0;
}

function rascar(e) {
    if (!boleto || boleto.revelado) return;
    const caja = capa.getBoundingClientRect();
    const x = e.clientX - caja.left;
    const y = e.clientY - caja.top;
    ctx.globalCompositeOperation = "destination-out";
    const r = caja.width * 0.075;
    ctx.beginPath();
    if (rascar.ultimo) {
        ctx.lineWidth = r * 2;
        ctx.lineCap = "round";
        ctx.moveTo(rascar.ultimo.x, rascar.ultimo.y);
        ctx.lineTo(x, y);
        ctx.stroke();
    }
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    rascar.ultimo = { x, y };
    raspado++;
    if (raspado % 4 === 0) vibrar(4);
    // Cada tanto mide cuánto se raspó; con 65% se revela todo
    if (raspado % 10 === 0 && porcentajeRaspado() > 0.65) revelar();
}

function porcentajeRaspado() {
    const datos = ctx.getImageData(0, 0, capa.width, capa.height).data;
    let vacios = 0;
    let total = 0;
    for (let i = 3; i < datos.length; i += 4 * 16) {
        total++;
        if (datos[i] < 30) vacios++;
    }
    return vacios / total;
}

capa.addEventListener("pointerdown", (e) => {
    raspando = true;
    rascar.ultimo = null;
    capa.setPointerCapture(e.pointerId);
    rascar(e);
});
capa.addEventListener("pointermove", (e) => raspando && rascar(e));
capa.addEventListener("pointerup", () => {
    raspando = false;
    rascar.ultimo = null;
});

// ---------- Juego ----------
function comprar() {
    const valor = apuesta();
    if (fichas() < valor || (boleto && !boleto.revelado)) return;
    cambiarFichas(-valor);
    const premio = sortearPremio();
    boleto = { celdas: armarCeldas(premio), premio, revelado: false, monto: valor };
    $("casillas").innerHTML = boleto.celdas.map((s) => `<span>${s}</span>`).join("");
    capa.style.transition = "none";
    capa.style.opacity = 1;
    pintarCapa();
    apuesta.bloquear(true);
    mensaje("¡Raspá!");
    vibrar(15);
    pintar();
}

function revelar() {
    if (!boleto || boleto.revelado) return;
    boleto.revelado = true;
    capa.style.transition = "opacity 0.5s";
    capa.style.opacity = 0;
    const { premio, monto } = boleto;
    if (premio) {
        const pago = Math.floor(monto * premio.m);
        cambiarFichas(pago);
        [...$("casillas").children].forEach((c, i) => boleto.celdas[i] === premio.s && c.classList.add("gana"));
        mensaje(premio.m === 1 ? `${premio.s}${premio.s}${premio.s} · recuperaste tu boleto` : `${premio.s}${premio.s}${premio.s} · ¡Ganaste ${formatear(pago)}!`, premio.m > 1 ? "gano" : "");
        if (premio.m > 1) {
            const r = $("casillas").getBoundingClientRect();
            textoFlotante(r.left + r.width / 2, r.top + r.height / 2, `+${formatear(pago)}`, "#ffd166");
            vibrar(premio.m >= 20 ? [80, 40, 80, 40, 200] : [40, 40, 80]);
        }
    } else {
        mensaje("Sin premio · ¡probá otro!");
        vibrar(40);
    }
    apuesta.bloquear(false);
    pintar();
}

function mensaje(texto, tipo = "") {
    $("mensaje").textContent = texto;
    $("mensaje").className = `mensaje-r ${tipo}`;
}

function pintar() {
    pintarSaldo($("fichas"));
    const abierto = boleto && !boleto.revelado;
    $("revelar").disabled = !abierto;
    $("comprar").disabled = abierto || fichas() < apuesta();
    $("comprar").textContent = boleto ? "🎟️ Otro boleto" : "🎟️ Comprar boleto";
    revisarRecarga();
}

$("tabla").innerHTML = PREMIOS.map((x) => `<span>${x.s}${x.s}${x.s} <b>×${x.m}</b></span>`).join("");
$("comprar").addEventListener("click", comprar);
$("revelar").addEventListener("click", revelar);
$("casillas").innerHTML = Array(9).fill("<span>?</span>").join("");
requestAnimationFrame(pintarCapa);
new ResizeObserver(() => (!boleto || !boleto.revelado) && pintarCapa()).observe(capa);
pintar();
