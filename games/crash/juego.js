// Crash: el cohete sube y el multiplicador crece; retirate antes de que explote.
// El punto de explosión se sortea al despegar: P(llegar a x) = 0.96 / x, así la casa se queda con ~4%.
import { formatear, vibrar } from "../../js/comun3d.js";
import { fichas, cambiarFichas } from "../../js/fichas.js";
import { selectorApuesta, pintarSaldo, conectarRecarga } from "../../js/casino.js";
import { crearLienzo, bucle, crearChispas } from "../../js/lienzo2d.js";

const $ = (id) => document.getElementById(id);
const VELOCIDAD = 0.14; // m(t) = e^(VELOCIDAD·t)
const CASA = 0.96;

const apuesta = selectorApuesta({ menos: $("menos"), mas: $("mas"), texto: $("apuesta") });
const revisarRecarga = conectarRecarga($("recargar"), () => pintar());
const chispas = crearChispas();
let ancho = 300;
let alto = 300;
const lienzo = crearLienzo($("lienzo"), (d) => {
    ancho = d.ancho;
    alto = d.alto;
});

let fase = "esperando"; // esperando | volando | exploto
let t = 0;
let limite = 1;
let monto = 0;
let cobrado = 0;
let autoRetiro = 0;
let sacudida = 0;
const historial = [];
const estrellas = Array.from({ length: 90 }, () => ({ x: Math.random(), y: Math.random(), z: Math.random() }));
const humo = [];

const multiplicador = () => Math.exp(VELOCIDAD * t);
function sortearLimite() {
    const u = Math.random();
    // Con probabilidad 4% explota apenas despega
    return Math.max(1, Math.floor((CASA / (1 - u)) * 100) / 100);
}

function despegar() {
    const valor = apuesta();
    if (fase === "volando" || fichas() < valor) return;
    cambiarFichas(-valor);
    monto = valor;
    cobrado = 0;
    t = 0;
    limite = sortearLimite();
    fase = "volando";
    apuesta.bloquear(true);
    vibrar(30);
    pintar();
}

function retirar() {
    if (fase !== "volando" || cobrado) return;
    cobrado = multiplicador();
    const premio = Math.floor(monto * cobrado);
    cambiarFichas(premio);
    vibrar([30, 30, 60]);
    chispas.emitir(ancho / 2, alto * 0.25, "#7ee08f", 30, 220);
    pintar();
}

function explotar() {
    fase = "exploto";
    sacudida = 0.6;
    const p = puntaCohete();
    chispas.emitir(p.x, p.y, "#ff7a1a", 50, 300);
    chispas.emitir(p.x, p.y, "#ffd166", 30, 220);
    chispas.emitir(p.x, p.y, "#ffffff", 15, 160);
    vibrar(cobrado ? 40 : [120, 60, 200]);
    historial.unshift(limite);
    if (historial.length > 20) historial.pop();
    apuesta.bloquear(false);
    pintar();
}

// Escala del gráfico: se va agrandando a medida que sube
function escala() {
    const tMax = Math.max(8, t * 1.15);
    const mMax = Math.max(2, multiplicador() * 1.2);
    return { tMax, mMax };
}
function punto(tt, e) {
    const m = Math.exp(VELOCIDAD * tt);
    const x = 30 + (tt / e.tMax) * (ancho - 60);
    const y = alto - 30 - ((m - 1) / (e.mMax - 1)) * (alto - 80);
    return { x, y };
}
function puntaCohete() {
    return punto(t, escala());
}

bucle((dt) => {
    if (fase === "volando") {
        t += dt;
        const m = multiplicador();
        if (autoRetiro && !cobrado && m >= autoRetiro && autoRetiro <= limite) {
            t = Math.log(autoRetiro) / VELOCIDAD;
            retirar();
        }
        if (m >= limite) {
            t = Math.log(limite) / VELOCIDAD;
            explotar();
        }
        pintarMulti();
    }
    dibujar(dt);
});

function dibujar(dt) {
    const { ctx } = lienzo;
    ctx.save();
    if (sacudida > 0) {
        ctx.translate((Math.random() - 0.5) * 14 * sacudida, (Math.random() - 0.5) * 14 * sacudida);
        sacudida = Math.max(0, sacudida - dt);
    }
    const g = ctx.createLinearGradient(0, 0, 0, alto);
    const calor = fase === "volando" ? Math.min(1, (multiplicador() - 1) / 9) : 0;
    g.addColorStop(0, `hsl(${250 - calor * 60}, 70%, ${8 + calor * 6}%)`);
    g.addColorStop(1, "#1a0b45");
    ctx.fillStyle = g;
    ctx.fillRect(-20, -20, ancho + 40, alto + 40);
    // Estrellas que caen más rápido cuanto más alto va
    const vel = fase === "volando" ? 0.05 + multiplicador() * 0.02 : 0.01;
    for (const s of estrellas) {
        s.y += dt * vel * (0.3 + s.z);
        s.x -= dt * vel * 0.5 * (0.3 + s.z);
        if (s.y > 1) s.y = 0;
        if (s.x < 0) s.x = 1;
        ctx.fillStyle = `rgba(255,255,255,${0.3 + s.z * 0.6})`;
        ctx.fillRect(s.x * ancho, s.y * alto, 1 + s.z, 1 + s.z * (fase === "volando" ? 3 : 1));
    }

    const e = escala();
    // Líneas de referencia
    ctx.strokeStyle = "#ffffff14";
    ctx.fillStyle = "#ffffff55";
    ctx.font = "700 10px sans-serif";
    ctx.textAlign = "left";
    const pasos = e.mMax > 20 ? [2, 5, 10, 20, 50, 100] : e.mMax > 5 ? [1.5, 2, 3, 5, 10] : [1.2, 1.5, 2, 3];
    for (const m of pasos) {
        if (m > e.mMax) continue;
        const y = alto - 30 - ((m - 1) / (e.mMax - 1)) * (alto - 80);
        ctx.beginPath();
        ctx.moveTo(30, y);
        ctx.lineTo(ancho - 10, y);
        ctx.stroke();
        ctx.fillText(`${m}×`, 4, y + 3);
    }

    if (fase !== "esperando") {
        // Curva con relleno degradado
        ctx.beginPath();
        const inicio = punto(0, e);
        ctx.moveTo(inicio.x, inicio.y);
        for (let k = 1; k <= 60; k++) {
            const p = punto((t * k) / 60, e);
            ctx.lineTo(p.x, p.y);
        }
        const fin = punto(t, e);
        const relleno = ctx.createLinearGradient(0, fin.y, 0, alto);
        relleno.addColorStop(0, fase === "exploto" && !cobrado ? "#ff4d6d66" : "#7df9ff55");
        relleno.addColorStop(1, "#7df9ff00");
        ctx.save();
        ctx.lineTo(fin.x, alto - 30);
        ctx.lineTo(inicio.x, alto - 30);
        ctx.closePath();
        ctx.fillStyle = relleno;
        ctx.fill();
        ctx.restore();
        ctx.strokeStyle = fase === "exploto" && !cobrado ? "#ff4d6d" : "#7df9ff";
        ctx.lineWidth = 4;
        ctx.shadowColor = ctx.strokeStyle;
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.moveTo(inicio.x, inicio.y);
        for (let k = 1; k <= 60; k++) {
            const p = punto((t * k) / 60, e);
            ctx.lineTo(p.x, p.y);
        }
        ctx.stroke();
        ctx.shadowBlur = 0;
        // Marca donde te retiraste
        if (cobrado) {
            const p = punto(Math.log(cobrado) / VELOCIDAD, e);
            ctx.fillStyle = "#7ee08f";
            ctx.beginPath();
            ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.font = "900 12px sans-serif";
            ctx.fillText(`💰 ${cobrado.toFixed(2)}×`, p.x - 20, p.y - 12);
        }
    }

    // Cohete
    const p = fase === "esperando" ? { x: 50, y: alto - 50 } : puntaCohete();
    if (fase !== "exploto") {
        const antes = fase === "volando" ? punto(Math.max(0, t - 0.3), e) : { x: p.x - 10, y: p.y + 10 };
        const angulo = Math.atan2(p.y - antes.y, p.x - antes.x);
        if (fase === "volando" && Math.random() < 0.8) humo.push({ x: p.x - Math.cos(angulo) * 18, y: p.y - Math.sin(angulo) * 18, r: 4, vida: 0.8 });
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(angulo);
        const llama = 10 + Math.random() * 10;
        const gl = ctx.createLinearGradient(-14 - llama, 0, -10, 0);
        gl.addColorStop(0, "transparent");
        gl.addColorStop(0.5, "#ff7a1a");
        gl.addColorStop(1, "#fff3b0");
        ctx.fillStyle = gl;
        if (fase === "volando") {
            ctx.beginPath();
            ctx.moveTo(-10, -5);
            ctx.lineTo(-14 - llama, 0);
            ctx.lineTo(-10, 5);
            ctx.fill();
        }
        ctx.fillStyle = "#e9ecef";
        ctx.beginPath();
        ctx.moveTo(16, 0);
        ctx.quadraticCurveTo(6, -9, -10, -7);
        ctx.lineTo(-10, 7);
        ctx.quadraticCurveTo(6, 9, 16, 0);
        ctx.fill();
        ctx.fillStyle = "#e63946";
        ctx.beginPath();
        ctx.moveTo(-6, -7);
        ctx.lineTo(-13, -13);
        ctx.lineTo(-10, -5);
        ctx.moveTo(-6, 7);
        ctx.lineTo(-13, 13);
        ctx.lineTo(-10, 5);
        ctx.fill();
        ctx.fillStyle = "#4cc9f0";
        ctx.beginPath();
        ctx.arc(4, 0, 3.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
    for (let i = humo.length - 1; i >= 0; i--) {
        const h = humo[i];
        h.vida -= dt;
        h.r += dt * 12;
        ctx.fillStyle = `rgba(200,200,255,${Math.max(0, h.vida * 0.3)})`;
        ctx.beginPath();
        ctx.arc(h.x, h.y, h.r, 0, Math.PI * 2);
        ctx.fill();
        if (h.vida <= 0) humo.splice(i, 1);
    }
    chispas.dibujar(ctx, dt);
    ctx.restore();
}

function pintarMulti() {
    const el = $("multi");
    const m = fase === "esperando" ? 1 : multiplicador();
    if (fase === "exploto") {
        el.className = "multi exploto";
        el.innerHTML = `💥 ${limite.toFixed(2)}×<small>${cobrado ? `Te retiraste a ${cobrado.toFixed(2)}× · +${formatear(Math.floor(monto * cobrado))}` : "¡Explotó!"}</small>`;
    } else if (fase === "volando") {
        el.className = `multi${cobrado ? " cobrado" : ""}`;
        el.innerHTML = `${m.toFixed(2)}×<small>${cobrado ? `💰 Cobraste ${formatear(Math.floor(monto * cobrado))}` : `Ganarías ${formatear(Math.floor(monto * m))}`}</small>`;
    } else {
        el.className = "multi";
        el.innerHTML = `1.00×<small>Apostá y despegá</small>`;
    }
}

function pintar() {
    pintarSaldo($("fichas"));
    const boton = $("accion");
    if (fase === "volando" && !cobrado) {
        boton.className = "accion retirar";
        boton.textContent = `💰 Retirar ${formatear(Math.floor(monto * multiplicador()))}`;
        boton.disabled = false;
    } else {
        boton.className = "accion";
        boton.textContent = fase === "volando" ? "Esperando que aterrice…" : "🚀 Despegar";
        boton.disabled = fase === "volando" || fichas() < apuesta();
    }
    for (const b of document.querySelectorAll("[data-auto]")) b.classList.toggle("activo", Number(b.dataset.auto) === autoRetiro);
    $("historial").innerHTML = historial.map((m) => `<span class="${m < 2 ? "bajo" : m < 10 ? "medio" : "alto"}">${m.toFixed(2)}×</span>`).join("");
    revisarRecarga();
    pintarMulti();
}

// El texto del botón de retiro se actualiza mientras sube
setInterval(() => fase === "volando" && !cobrado && pintar(), 120);

$("accion").addEventListener("click", () => (fase === "volando" ? retirar() : despegar()));
for (const b of document.querySelectorAll("[data-auto]")) {
    b.addEventListener("click", () => {
        autoRetiro = Number(b.dataset.auto);
        pintar();
    });
}
pintar();
