// Minigolf de 9 hoyos: paredes, arena que frena, agua que te devuelve y molinos que giran.
import { cargar, guardar, vibrar } from "../../js/comun3d.js";
import { crearLienzo, bucle, crearChispas } from "../../js/lienzo2d.js";

const $ = (id) => document.getElementById(id);
const CLAVE = "minigolf";
// Cancha de 100 x 160 unidades. Rectángulos: [x, y, ancho, alto]
const HOYOS = [
    { par: 2, inicio: [50, 140], hoyo: [50, 25], paredes: [] },
    { par: 2, inicio: [20, 140], hoyo: [80, 25], paredes: [[0, 75, 65, 8]] },
    { par: 3, inicio: [50, 145], hoyo: [50, 20], paredes: [[25, 100, 75, 7], [0, 55, 75, 7]] },
    { par: 2, inicio: [50, 140], hoyo: [50, 30], paredes: [], arena: [[20, 60, 60, 30]] },
    { par: 3, inicio: [15, 145], hoyo: [85, 20], paredes: [[40, 40, 8, 120]], agua: [[55, 70, 45, 25]] },
    { par: 3, inicio: [50, 145], hoyo: [50, 20], paredes: [], molinos: [{ x: 50, y: 85, largo: 34, velocidad: 1.6 }] },
    { par: 3, inicio: [85, 145], hoyo: [15, 22], paredes: [[30, 110, 70, 7], [0, 70, 70, 7]], arena: [[60, 30, 40, 25]] },
    { par: 4, inicio: [50, 148], hoyo: [50, 18], paredes: [[0, 120, 40, 6], [60, 120, 40, 6], [20, 80, 60, 6]], agua: [[0, 40, 35, 20], [65, 40, 35, 20]], molinos: [{ x: 50, y: 52, largo: 26, velocidad: -2 }] },
    { par: 4, inicio: [12, 148], hoyo: [88, 15], paredes: [[25, 30, 6, 130], [50, 0, 6, 120], [75, 40, 6, 120]], arena: [[56, 125, 19, 20]] },
];
const RADIO = 2.4;
const RADIO_HOYO = 4;

const estado = cargar(CLAVE, { mejor: null });
const chispas = crearChispas();
let juego = null;
let escala = 1;
let ox = 0;
let oy = 0;
const lienzo = crearLienzo($("lienzo"), ({ ancho, alto }) => {
    escala = Math.min(ancho / 100, alto / 160);
    ox = (ancho - 100 * escala) / 2;
    oy = (alto - 160 * escala) / 2;
});

function empezar() {
    juego = { hoyo: 0, golpes: 0, tarjeta: [], bola: null, apuntando: null, adentro: 0, tiempo: 0 };
    cargarHoyo();
}

function cargarHoyo() {
    const h = HOYOS[juego.hoyo];
    juego.golpes = 0;
    juego.bola = { x: h.inicio[0], y: h.inicio[1], vx: 0, vy: 0, ultima: [...h.inicio], escala: 1 };
    juego.adentro = 0;
    pintarDatos();
}

const dentro = (r, x, y) => x > r[0] && x < r[0] + r[2] && y > r[1] && y < r[1] + r[3];

function rebotarRect(b, r) {
    const cx = Math.max(r[0], Math.min(b.x, r[0] + r[2]));
    const cy = Math.max(r[1], Math.min(b.y, r[1] + r[3]));
    const dx = b.x - cx;
    const dy = b.y - cy;
    const d = Math.hypot(dx, dy);
    if (d >= RADIO || d === 0) return;
    const nx = dx / d;
    const ny = dy / d;
    b.x = cx + nx * RADIO;
    b.y = cy + ny * RADIO;
    const v = b.vx * nx + b.vy * ny;
    if (v < 0) {
        b.vx -= 1.8 * v * nx;
        b.vy -= 1.8 * v * ny;
        if (Math.abs(v) > 20) vibrar(10);
    }
}

function rebotarSegmento(b, x1, y1, x2, y2) {
    const lx = x2 - x1;
    const ly = y2 - y1;
    const t = Math.max(0, Math.min(1, ((b.x - x1) * lx + (b.y - y1) * ly) / (lx * lx + ly * ly)));
    const cx = x1 + lx * t;
    const cy = y1 + ly * t;
    const dx = b.x - cx;
    const dy = b.y - cy;
    const d = Math.hypot(dx, dy);
    if (d >= RADIO + 1.5 || d === 0) return;
    const nx = dx / d;
    const ny = dy / d;
    b.x = cx + nx * (RADIO + 1.5);
    b.y = cy + ny * (RADIO + 1.5);
    const v = b.vx * nx + b.vy * ny;
    b.vx -= 1.9 * Math.min(v, 0) * nx - nx * 25;
    b.vy -= 1.9 * Math.min(v, 0) * ny - ny * 25;
    vibrar(15);
}

function paso(dt) {
    const h = HOYOS[juego.hoyo];
    const b = juego.bola;
    juego.tiempo += dt;
    if (juego.adentro) {
        juego.adentro -= dt;
        b.escala = Math.max(0, b.escala - dt * 3);
        if (juego.adentro <= 0) siguienteHoyo();
        return;
    }
    const pasos = 4;
    for (let k = 0; k < pasos; k++) {
        const d = dt / pasos;
        const enArena = (h.arena ?? []).some((r) => dentro(r, b.x, b.y));
        const v = Math.hypot(b.vx, b.vy);
        if (v > 0) {
            const nueva = Math.max(0, v - (enArena ? 160 : 38) * d - v * 0.6 * d);
            b.vx *= nueva / v;
            b.vy *= nueva / v;
        }
        b.x += b.vx * d;
        b.y += b.vy * d;
        for (const r of [[-10, -10, 120, 10], [-10, 160, 120, 10], [-10, -10, 10, 180], [100, -10, 10, 180], ...h.paredes]) rebotarRect(b, r);
        for (const m of h.molinos ?? []) {
            const a = juego.tiempo * m.velocidad;
            const ex = Math.cos(a) * m.largo;
            const ey = Math.sin(a) * m.largo;
            rebotarSegmento(b, m.x - ex, m.y - ey, m.x + ex, m.y + ey);
        }
        // Hoyo: entra si pasa cerca y no va muy rápido
        const dh = Math.hypot(b.x - h.hoyo[0], b.y - h.hoyo[1]);
        const rapidez = Math.hypot(b.vx, b.vy);
        if (dh < RADIO_HOYO && rapidez < 95) {
            b.x = h.hoyo[0];
            b.y = h.hoyo[1];
            b.vx = b.vy = 0;
            juego.adentro = 0.9;
            vibrar(80);
            chispas.emitir(ox + b.x * escala, oy + b.y * escala, "#ffd23f", 24, 160);
            return;
        } else if (dh < RADIO_HOYO + 2 && rapidez >= 95) {
            // Pasa de largo pero el borde la desvía un poco
            b.vx += (b.x - h.hoyo[0]) * 2;
            b.vy += (b.y - h.hoyo[1]) * 2;
        }
        if ((h.agua ?? []).some((r) => dentro(r, b.x, b.y))) {
            chispas.emitir(ox + b.x * escala, oy + b.y * escala, "#4cc9f0", 18, 140);
            Object.assign(b, { x: b.ultima[0], y: b.ultima[1], vx: 0, vy: 0 });
            juego.golpes++;
            vibrar(120);
            pintarDatos();
            return;
        }
    }
    if (Math.hypot(b.vx, b.vy) < 1.5) b.vx = b.vy = 0;
}

function siguienteHoyo() {
    juego.tarjeta.push(juego.golpes);
    juego.hoyo++;
    if (juego.hoyo >= HOYOS.length) return fin();
    cargarHoyo();
}

function fin() {
    const total = juego.tarjeta.reduce((a, b) => a + b, 0);
    const par = HOYOS.reduce((a, h) => a + h.par, 0);
    const nuevo = estado.mejor === null || total < estado.mejor;
    if (nuevo) estado.mejor = total;
    guardar(CLAVE, estado);
    const dif = total - par;
    $("titulo-centro").innerHTML = `${nuevo ? "¡Nuevo récord!" : "Fin de la vuelta"}<div class="chico tarjeta-golpes">${total} golpes (${dif === 0 ? "par" : dif > 0 ? `+${dif}` : dif})<br>${juego.tarjeta.join(" · ")}</div>`;
    $("jugar").textContent = "Otra vuelta";
    $("centro").hidden = false;
    juego = null;
    pintarDatos();
}

function pintarDatos() {
    const total = juego ? juego.tarjeta.reduce((a, b) => a + b, 0) + juego.golpes : 0;
    $("hoyo").textContent = `${(juego?.hoyo ?? 0) + 1}/${HOYOS.length}`;
    $("par").textContent = HOYOS[juego?.hoyo ?? 0].par;
    $("golpes").textContent = juego?.golpes ?? 0;
    $("total").textContent = total;
    $("mejor").textContent = estado.mejor === null ? "" : `Mejor vuelta: ${estado.mejor} golpes`;
}

// ---------- Dibujo ----------
const X = (v) => ox + v * escala;
const Y = (v) => oy + v * escala;

function dibujar(dt) {
    const { ctx, ancho, alto } = lienzo;
    ctx.fillStyle = "#0b2a1e";
    ctx.fillRect(0, 0, ancho, alto);
    const h = HOYOS[juego?.hoyo ?? 0];
    // Pasto a rayas
    for (let i = 0; i < 16; i++) {
        ctx.fillStyle = i % 2 ? "#52b788" : "#5fbf93";
        ctx.fillRect(X(0), Y(i * 10), 100 * escala, 10 * escala);
    }
    for (const r of h.arena ?? []) {
        ctx.fillStyle = "#e9c46a";
        ctx.beginPath();
        ctx.roundRect(X(r[0]), Y(r[1]), r[2] * escala, r[3] * escala, 6 * escala);
        ctx.fill();
    }
    for (const r of h.agua ?? []) {
        const g = ctx.createLinearGradient(0, Y(r[1]), 0, Y(r[1] + r[3]));
        g.addColorStop(0, "#4cc9f0");
        g.addColorStop(1, "#1d6fb8");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.roundRect(X(r[0]), Y(r[1]), r[2] * escala, r[3] * escala, 6 * escala);
        ctx.fill();
        ctx.strokeStyle = "#ffffff55";
        ctx.lineWidth = 1.5;
        for (let k = 0; k < 3; k++) {
            const yy = Y(r[1] + r[3] * (0.3 + k * 0.2)) + Math.sin(performance.now() / 400 + k) * 2;
            ctx.beginPath();
            ctx.moveTo(X(r[0] + 4), yy);
            ctx.lineTo(X(r[0] + r[2] - 4), yy);
            ctx.stroke();
        }
    }
    // Paredes de madera (incluido el borde)
    ctx.strokeStyle = "#7f5539";
    ctx.lineWidth = 3 * escala;
    ctx.strokeRect(X(0), Y(0), 100 * escala, 160 * escala);
    for (const r of h.paredes) {
        const g = ctx.createLinearGradient(0, Y(r[1]), 0, Y(r[1] + r[3]));
        g.addColorStop(0, "#b08968");
        g.addColorStop(1, "#7f5539");
        ctx.fillStyle = g;
        ctx.fillRect(X(r[0]), Y(r[1]), r[2] * escala, r[3] * escala);
    }
    // Hoyo con bandera
    ctx.fillStyle = "#1b1b1b";
    ctx.beginPath();
    ctx.arc(X(h.hoyo[0]), Y(h.hoyo[1]), RADIO_HOYO * escala, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#eee";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(X(h.hoyo[0]), Y(h.hoyo[1]));
    ctx.lineTo(X(h.hoyo[0]), Y(h.hoyo[1] - 16));
    ctx.stroke();
    ctx.fillStyle = "#e63946";
    ctx.beginPath();
    ctx.moveTo(X(h.hoyo[0]), Y(h.hoyo[1] - 16));
    ctx.lineTo(X(h.hoyo[0] + 9 + Math.sin(performance.now() / 200)), Y(h.hoyo[1] - 13));
    ctx.lineTo(X(h.hoyo[0]), Y(h.hoyo[1] - 10));
    ctx.fill();
    // Molinos
    for (const m of h.molinos ?? []) {
        const a = (juego?.tiempo ?? 0) * m.velocidad;
        ctx.strokeStyle = "#e63946";
        ctx.lineWidth = 3 * escala;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(X(m.x - Math.cos(a) * m.largo), Y(m.y - Math.sin(a) * m.largo));
        ctx.lineTo(X(m.x + Math.cos(a) * m.largo), Y(m.y + Math.sin(a) * m.largo));
        ctx.stroke();
        ctx.fillStyle = "#fff";
        ctx.beginPath();
        ctx.arc(X(m.x), Y(m.y), 3 * escala, 0, Math.PI * 2);
        ctx.fill();
    }
    if (!juego) return;
    const b = juego.bola;
    // Mira: línea punteada hacia donde va y barra de fuerza
    if (juego.apuntando) {
        const { dx, dy, fuerza } = juego.apuntando;
        ctx.setLineDash([4, 6]);
        ctx.strokeStyle = "#ffffffcc";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(X(b.x), Y(b.y));
        ctx.lineTo(X(b.x + dx * fuerza * 40), Y(b.y + dy * fuerza * 40));
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = `hsl(${120 - fuerza * 120}, 90%, 55%)`;
        ctx.fillRect(X(4), Y(155) - fuerza * 60 * escala, 4 * escala, fuerza * 60 * escala);
    }
    ctx.fillStyle = "#00000055";
    ctx.beginPath();
    ctx.ellipse(X(b.x + 0.8), Y(b.y + 1), RADIO * escala * b.escala, RADIO * escala * 0.7 * b.escala, 0, 0, Math.PI * 2);
    ctx.fill();
    const g = ctx.createRadialGradient(X(b.x - 0.8), Y(b.y - 0.8), 1, X(b.x), Y(b.y), RADIO * escala);
    g.addColorStop(0, "#ffffff");
    g.addColorStop(1, "#cfd8dc");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(X(b.x), Y(b.y), RADIO * escala * b.escala, 0, Math.PI * 2);
    ctx.fill();
    chispas.dibujar(ctx, dt);
}

bucle((dt) => {
    if (juego && $("centro").hidden) paso(dt);
    dibujar(dt);
});

// ---------- Controles: arrastrar hacia atrás y soltar ----------
let inicio = null;
$("lienzo").addEventListener("pointerdown", (e) => {
    if (!juego || juego.adentro || Math.hypot(juego.bola.vx, juego.bola.vy) > 0) return;
    inicio = { x: e.clientX, y: e.clientY };
    $("lienzo").setPointerCapture(e.pointerId);
});
$("lienzo").addEventListener("pointermove", (e) => {
    if (!inicio) return;
    const dx = inicio.x - e.clientX;
    const dy = inicio.y - e.clientY;
    const l = Math.hypot(dx, dy);
    if (l < 8) return (juego.apuntando = null);
    juego.apuntando = { dx: dx / l, dy: dy / l, fuerza: Math.min(1, l / (escala * 55)) };
});
$("lienzo").addEventListener("pointerup", () => {
    inicio = null;
    if (!juego?.apuntando) return;
    const { dx, dy, fuerza } = juego.apuntando;
    juego.apuntando = null;
    const b = juego.bola;
    b.ultima = [b.x, b.y];
    b.vx = dx * fuerza * 230;
    b.vy = dy * fuerza * 230;
    juego.golpes++;
    vibrar(15);
    pintarDatos();
});

$("jugar").addEventListener("click", () => {
    $("centro").hidden = true;
    chispas.limpiar();
    empezar();
});
pintarDatos();
