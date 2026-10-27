// Plinko: la bola rebota entre clavos y cae en una casilla que multiplica la apuesta.
import { vibrar } from "../../js/comun3d.js";
import { fichas, cambiarFichas } from "../../js/fichas.js";
import { selectorApuesta, pintarSaldo, conectarRecarga } from "../../js/casino.js";

const $ = (id) => document.getElementById(id);
const FILAS = 10;
const MULTIPLICADORES = [10, 4, 1.6, 1.2, 0.9, 0.4, 0.9, 1.2, 1.6, 4, 10];
const colorMulti = (m) => (m >= 4 ? "#ff4fd8" : m >= 1.2 ? "#ffd23f" : m >= 0.9 ? "#7df9ff" : "#9b8cff");

const apuesta = selectorApuesta({ menos: $("menos"), mas: $("mas"), texto: $("apuesta") });
const revisarRecarga = conectarRecarga($("recargar"), () => pintarSaldo($("fichas")));

const lienzo = $("tablero");
const ctx = lienzo.getContext("2d");
let ancho = 0;
let alto = 0;
let separacion = 0;
let radioClavo = 0;
let radioBola = 0;
let clavos = [];
let bolas = [];
let brillos = []; // casillas que se iluminan al recibir una bola
let ultimos = [];

function medir() {
    const caja = lienzo.getBoundingClientRect();
    const escala = Math.min(devicePixelRatio, 2);
    lienzo.width = caja.width * escala;
    lienzo.height = caja.height * escala;
    ctx.setTransform(escala, 0, 0, escala, 0, 0);
    ancho = caja.width;
    alto = caja.height;
    separacion = Math.min(ancho / (FILAS + 2), (alto - 60) / (FILAS + 1.5));
    radioClavo = separacion * 0.09;
    radioBola = separacion * 0.2;
    clavos = [];
    for (let f = 0; f < FILAS; f++) {
        const cantidad = f + 3;
        for (let k = 0; k < cantidad; k++) {
            clavos.push({ x: ancho / 2 + (k - (cantidad - 1) / 2) * separacion, y: 30 + f * separacion, luz: 0 });
        }
    }
}
new ResizeObserver(medir).observe(lienzo);
medir();

const fondoCasillas = () => 30 + (FILAS - 0.3) * separacion;

function soltar() {
    const valor = apuesta();
    if (fichas() < valor) return;
    cambiarFichas(-valor);
    pintarSaldo($("fichas"));
    revisarRecarga();
    bolas.push({ x: ancho / 2 + (Math.random() - 0.5) * separacion * 0.3, y: 6, vx: 0, vy: 0, apuesta: valor });
    vibrar(10);
}

function casillaEn(x) {
    const ultimaFila = FILAS + 2;
    const izquierda = ancho / 2 - ((ultimaFila - 1) / 2) * separacion;
    return Math.max(0, Math.min(MULTIPLICADORES.length - 1, Math.floor((x - izquierda) / separacion)));
}

function paso(dt) {
    const g = separacion * 18;
    for (const b of bolas) {
        b.vy += g * dt;
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        for (const c of clavos) {
            const dx = b.x - c.x;
            const dy = b.y - c.y;
            const d = Math.hypot(dx, dy);
            const min = radioBola + radioClavo;
            if (d < min && d > 0) {
                const nx = dx / d;
                const ny = dy / d;
                b.x = c.x + nx * min;
                b.y = c.y + ny * min;
                const v = b.vx * nx + b.vy * ny;
                if (v < 0) {
                    b.vx -= 1.5 * v * nx;
                    b.vy -= 1.5 * v * ny;
                    // Un empujoncito al azar para que no sea siempre igual
                    b.vx += (Math.random() - 0.5) * separacion * 1.6;
                    b.vx *= 0.82;
                    b.vy *= 0.6;
                    c.luz = 1;
                }
            }
        }
        if (b.y > fondoCasillas() && !b.fin) {
            b.fin = true;
            const i = casillaEn(b.x);
            const multi = MULTIPLICADORES[i];
            const premio = Math.round(b.apuesta * multi);
            cambiarFichas(premio);
            pintarSaldo($("fichas"));
            revisarRecarga();
            brillos.push({ i, vida: 1 });
            ultimos = [multi, ...ultimos].slice(0, 8);
            $("ultimos").innerHTML = ultimos.map((m) => `<span style="--c:${colorMulti(m)}">×${m}</span>`).join("");
            vibrar(multi >= 4 ? 80 : 15);
        }
    }
    bolas = bolas.filter((b) => b.y < alto + 20);
}

function dibujar() {
    ctx.clearRect(0, 0, ancho, alto);
    for (const c of clavos) {
        c.luz = Math.max(0, c.luz - 0.05);
        ctx.beginPath();
        ctx.arc(c.x, c.y, radioClavo * (1 + c.luz * 0.6), 0, Math.PI * 2);
        ctx.fillStyle = c.luz > 0 ? `rgba(255, 79, 216, ${0.5 + c.luz / 2})` : "#e9e2ff";
        ctx.shadowColor = "#ff4fd8";
        ctx.shadowBlur = c.luz * 14;
        ctx.fill();
    }
    ctx.shadowBlur = 0;

    // Casillas con multiplicadores
    const y = fondoCasillas();
    const izquierda = ancho / 2 - ((FILAS + 1) / 2) * separacion;
    MULTIPLICADORES.forEach((m, i) => {
        const brillo = brillos.find((b) => b.i === i)?.vida ?? 0;
        const x = izquierda + i * separacion;
        ctx.fillStyle = colorMulti(m);
        ctx.globalAlpha = 0.75 + brillo * 0.25;
        const subir = brillo * 6;
        ctx.beginPath();
        ctx.roundRect(x + 2, y + 4 - subir, separacion - 4, separacion * 0.75, 6);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.fillStyle = "#10002b";
        ctx.font = `900 ${Math.max(9, separacion * 0.28)}px sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(`×${m}`, x + separacion / 2, y + 4 - subir + separacion * 0.38);
    });
    brillos = brillos.map((b) => ({ ...b, vida: b.vida - 0.04 })).filter((b) => b.vida > 0);

    for (const b of bolas) {
        const grad = ctx.createRadialGradient(b.x - radioBola / 3, b.y - radioBola / 3, 1, b.x, b.y, radioBola);
        grad.addColorStop(0, "#ffffff");
        grad.addColorStop(1, "#ff4fd8");
        ctx.fillStyle = grad;
        ctx.shadowColor = "#ff4fd8";
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(b.x, b.y, radioBola, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
    }
}

let antes = performance.now();
function ciclo(ahora) {
    const dt = Math.min((ahora - antes) / 1000, 0.05);
    antes = ahora;
    const pasos = 4;
    for (let i = 0; i < pasos; i++) paso(dt / pasos);
    dibujar();
    requestAnimationFrame(ciclo);
}
requestAnimationFrame(ciclo);

$("soltar").addEventListener("click", soltar);
pintarSaldo($("fichas"));
