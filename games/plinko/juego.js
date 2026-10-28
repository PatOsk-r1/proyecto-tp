// Plinko: la bola rebota entre clavos y cae en una casilla que multiplica la apuesta.
// El camino se sortea al soltarla (izquierda o derecha en cada fila) y la animación lo sigue.
import { formatear, textoFlotante, vibrar } from "../../js/comun3d.js";
import { fichas, cambiarFichas } from "../../js/fichas.js";
import { selectorApuesta, pintarSaldo, conectarRecarga } from "../../js/casino.js";
import { crearLienzo, bucle, crearChispas } from "../../js/lienzo2d.js";
import { TABLAS } from "./tablas.js";

const $ = (id) => document.getElementById(id);
const TIEMPO_FILA = 0.13;

let filas = 12;
let riesgo = "medio";
let auto = false;
let proximoAuto = 0;
const multiplicadores = () => TABLAS[filas][riesgo];
const colorMulti = (m) => (m >= 10 ? "#ff006e" : m >= 3 ? "#ff7a1a" : m >= 1.2 ? "#ffbe0b" : m >= 0.9 ? "#8ac926" : "#4cc9f0");

const apuesta = selectorApuesta({ menos: $("menos"), mas: $("mas"), texto: $("apuesta") });
const revisarRecarga = conectarRecarga($("recargar"), () => pintarSaldo($("fichas")));

const chispas = crearChispas();
let ancho = 300;
let alto = 300;
const lienzo = crearLienzo($("tablero"), (d) => {
    ancho = d.ancho;
    alto = d.alto;
});
const sep = () => Math.min(ancho / (filas + 2.4), (alto - 30) / (filas + 1.8));
// Separación vertical: puede ser más alta que la horizontal para aprovechar la pantalla
const sepY = () => Math.min(sep() * 1.5, (alto - 30) / (filas + 1.8));
const cx = () => ancho / 2;
const arriba = () => Math.max(16, (alto - (filas + 1) * sepY()) / 2);
const yFila = (r) => arriba() + r * sepY();
const xClavo = (r, j) => cx() + (j - (r + 2) / 2) * sep();
const xCasilla = (k) => cx() + (k - filas / 2) * sep();

let bolas = [];
let luces = new Map(); // "fila,indice" → brillo
let brillosCasilla = [];
let ultimos = [];

function soltar() {
    const valor = apuesta();
    if (fichas() < valor) {
        auto = false;
        pintarBotones();
        return;
    }
    cambiarFichas(-valor);
    pintarSaldo($("fichas"));
    revisarRecarga();
    // Camino sorteado: true = derecha
    const camino = Array.from({ length: filas }, () => Math.random() < 0.5);
    bolas.push({ camino, t: 0, apuesta: valor, filas, riesgo, estela: [], hue: Math.random() * 360 });
    vibrar(8);
}

// Posición de la bola en el tiempo t (en filas recorridas)
function posicion(b) {
    const s = sep();
    const r = Math.floor(b.t);
    const p = b.t - r;
    let derechas = 0;
    for (let i = 0; i < Math.min(r, b.camino.length); i++) if (b.camino[i]) derechas++;
    if (r >= b.filas) {
        return { x: xCasilla(derechas), y: yFila(b.filas) + s * 0.35 };
    }
    // Toca el clavo de la fila r y salta hacia la fila siguiente
    const x0 = r === 0 ? cx() : cx() + (derechas - r / 2) * s;
    const x1 = cx() + (derechas + (b.camino[r] ? 1 : 0) - (r + 1) / 2) * s;
    const y0 = yFila(r) - s * 0.32;
    const y1 = yFila(r + 1) - s * 0.32;
    const x = x0 + (x1 - x0) * p;
    // Pequeño rebote hacia arriba y después cae
    const y = y0 + (y1 - y0) * p * p - Math.sin(p * Math.PI) * sepY() * 0.3;
    return { x, y, fila: r, indice: derechas + 1 };
}

function paso(dt) {
    for (const b of bolas) {
        const antes = Math.floor(b.t);
        b.t += dt / TIEMPO_FILA;
        const ahora = Math.floor(b.t);
        if (ahora !== antes && antes < b.filas) {
            // Golpeó el clavo de la fila "antes"
            let derechas = 0;
            for (let i = 0; i < antes; i++) if (b.camino[i]) derechas++;
            luces.set(`${antes},${derechas + 1}`, 1);
        }
        const p = posicion(b);
        b.estela.unshift(p);
        if (b.estela.length > 6) b.estela.pop();
        if (b.t >= b.filas && !b.fin) {
            b.fin = true;
            const casilla = b.camino.filter(Boolean).length;
            const multi = TABLAS[b.filas][b.riesgo][casilla];
            const premio = Math.round(b.apuesta * multi);
            cambiarFichas(premio);
            pintarSaldo($("fichas"));
            revisarRecarga();
            brillosCasilla.push({ k: casilla, vida: 1 });
            ultimos = [multi, ...ultimos].slice(0, 10);
            $("ultimos").innerHTML = ultimos.map((m) => `<span style="--c:${colorMulti(m)}">×${m}</span>`).join("");
            chispas.emitir(p.x, p.y, colorMulti(multi), multi >= 3 ? 24 : 8, multi >= 3 ? 200 : 90);
            if (multi >= 10) {
                const caja = $("tablero").getBoundingClientRect();
                textoFlotante(caja.left + p.x, caja.top + p.y - 30, `×${multi} · +${formatear(premio)}`, colorMulti(multi));
                vibrar([60, 40, 120]);
            } else vibrar(multi >= 1 ? 15 : 5);
        }
    }
    bolas = bolas.filter((b) => b.t < b.filas + 0.6);
    if (auto) {
        proximoAuto -= dt;
        if (proximoAuto <= 0) {
            proximoAuto = 0.35;
            soltar();
        }
    }
}

function dibujar(dt) {
    const { ctx } = lienzo;
    ctx.clearRect(0, 0, ancho, alto);
    const s = sep();
    // Clavos
    for (let r = 0; r < filas; r++) {
        for (let j = 0; j < r + 3; j++) {
            const clave = `${r},${j}`;
            const luz = luces.get(clave) ?? 0;
            const x = xClavo(r, j);
            const y = yFila(r);
            if (luz > 0) {
                ctx.fillStyle = `rgba(255,79,216,${luz * 0.35})`;
                ctx.beginPath();
                ctx.arc(x, y, s * 0.3 * luz, 0, Math.PI * 2);
                ctx.fill();
                luces.set(clave, Math.max(0, luz - dt * 3));
            }
            const g = ctx.createRadialGradient(x - 1, y - 1, 0, x, y, s * 0.1);
            g.addColorStop(0, "#fff");
            g.addColorStop(1, luz > 0 ? "#ff4fd8" : "#b8a6ff");
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(x, y, s * 0.09 * (1 + luz * 0.5), 0, Math.PI * 2);
            ctx.fill();
        }
    }
    // Casillas
    const yc = yFila(filas) + s * 0.05;
    multiplicadores().forEach((m, k) => {
        const brillo = brillosCasilla.find((b) => b.k === k)?.vida ?? 0;
        const x = xCasilla(k) - s / 2;
        const baja = brillo * 6;
        ctx.save();
        ctx.shadowColor = colorMulti(m);
        ctx.shadowBlur = 6 + brillo * 16;
        const g = ctx.createLinearGradient(0, yc, 0, yc + s * 0.7);
        g.addColorStop(0, colorMulti(m));
        g.addColorStop(1, "#0006");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.roundRect(x + 1.5, yc + baja, s - 3, Math.max(s * 0.68, sepY() * 0.6), 5);
        ctx.fill();
        ctx.restore();
        ctx.fillStyle = "#10002b";
        ctx.font = `900 ${Math.max(7, s * (m >= 100 ? 0.22 : 0.27))}px sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(m >= 100 ? `${m}` : `${m}×`, x + s / 2, yc + baja + Math.max(s * 0.68, sepY() * 0.6) / 2);
    });
    brillosCasilla = brillosCasilla.map((b) => ({ ...b, vida: b.vida - dt * 2.5 })).filter((b) => b.vida > 0);

    // Bolas con estela
    const r = s * 0.2;
    for (const b of bolas) {
        b.estela.forEach((p, k) => {
            ctx.globalAlpha = (1 - k / b.estela.length) * 0.4;
            ctx.fillStyle = `hsl(${b.hue},90%,65%)`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, r * (1 - k * 0.12), 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.globalAlpha = 1;
        const p = b.estela[0];
        if (!p) continue;
        const g = ctx.createRadialGradient(p.x - r / 3, p.y - r / 3, 1, p.x, p.y, r);
        g.addColorStop(0, "#ffffff");
        g.addColorStop(1, `hsl(${b.hue},90%,55%)`);
        ctx.fillStyle = g;
        ctx.shadowColor = `hsl(${b.hue},90%,60%)`;
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
    }
    chispas.dibujar(ctx, dt);
}

bucle((dt) => {
    paso(dt);
    dibujar(dt);
});

// ---------- Controles ----------
function pintarBotones() {
    for (const b of document.querySelectorAll("[data-filas]")) b.classList.toggle("activa", Number(b.dataset.filas) === filas);
    for (const b of document.querySelectorAll("[data-riesgo]")) b.classList.toggle("activa", b.dataset.riesgo === riesgo);
    const ocupado = bolas.length > 0;
    for (const b of document.querySelectorAll("[data-filas],[data-riesgo]")) b.disabled = ocupado;
    $("auto").classList.toggle("activo", auto);
    $("auto").textContent = auto ? "■ Parar" : "🔁 Auto";
}
setInterval(pintarBotones, 300);
for (const b of document.querySelectorAll("[data-filas]")) b.addEventListener("click", () => {
    if (bolas.length) return;
    filas = Number(b.dataset.filas);
    pintarBotones();
});
for (const b of document.querySelectorAll("[data-riesgo]")) b.addEventListener("click", () => {
    if (bolas.length) return;
    riesgo = b.dataset.riesgo;
    pintarBotones();
});
$("soltar").addEventListener("click", soltar);
$("auto").addEventListener("click", () => {
    auto = !auto;
    proximoAuto = 0;
    pintarBotones();
});
pintarSaldo($("fichas"));
pintarBotones();
