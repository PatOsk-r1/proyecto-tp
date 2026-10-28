// Rompeladrillos: paleta, pelotas, ladrillos con varios golpes y premios que caen.
import { cargar, guardar, vibrar } from "../../js/comun3d.js";
import { crearLienzo, bucle, crearChispas } from "../../js/lienzo2d.js";

const $ = (id) => document.getElementById(id);
const CLAVE = "ladrillos";
const COLUMNAS = 8;
const COLORES = ["#f72585", "#b5179e", "#7209b7", "#560bad", "#4361ee", "#4cc9f0", "#06d6a0", "#ffd166"];
const PREMIOS = [
    { tipo: "ancha", color: "#06d6a0", letra: "↔" },
    { tipo: "multi", color: "#ffd166", letra: "×3" },
    { tipo: "vida", color: "#ff4d6d", letra: "♥" },
    { tipo: "lenta", color: "#4cc9f0", letra: "⏱" },
];

const estado = cargar(CLAVE, { record: 0 });
const chispas = crearChispas();
let juego = null;
const lienzo = crearLienzo($("lienzo"), () => juego && acomodarLadrillos());

function nuevoJuego() {
    juego = { puntos: 0, nivel: 1, vidas: 3, pelotas: [], premios: [], ladrillos: [], paleta: { x: 0.5, ancho: 0.22, anchaHasta: 0 }, lentaHasta: 0, enJuego: true };
    armarNivel();
}

function armarNivel() {
    const filas = Math.min(4 + juego.nivel, 10);
    juego.ladrillos = [];
    for (let f = 0; f < filas; f++) {
        for (let c = 0; c < COLUMNAS; c++) {
            // Algunos huecos en niveles altos, y ladrillos duros arriba
            if (juego.nivel > 2 && Math.random() < 0.08) continue;
            const golpes = f < Math.floor(juego.nivel / 2) ? 2 : 1;
            juego.ladrillos.push({ f, c, golpes, color: COLORES[(f + juego.nivel) % COLORES.length] });
        }
    }
    acomodarLadrillos();
    juego.pelotas = [nuevaPelota()];
    juego.premios = [];
    pintarDatos();
}

function acomodarLadrillos() {
    const { ancho } = lienzo;
    const margen = 8;
    const w = (ancho - margen * 2) / COLUMNAS;
    const h = Math.max(16, w * 0.38);
    for (const l of juego.ladrillos) Object.assign(l, { x: margen + l.c * w + 2, y: 50 + l.f * (h + 4), w: w - 4, h });
}

function nuevaPelota(pegada = true) {
    return { x: 0, y: 0, vx: 0, vy: 0, pegada, r: Math.max(6, lienzo.ancho * 0.018) };
}

const anchoPaleta = () => lienzo.ancho * (juego.paleta.anchaHasta > performance.now() ? 0.34 : juego.paleta.ancho);
const yPaleta = () => lienzo.alto - 40;
const velocidadBase = () => lienzo.alto * (0.62 + juego.nivel * 0.04) * (juego.lentaHasta > performance.now() ? 0.6 : 1);

function lanzar() {
    for (const p of juego.pelotas) {
        if (!p.pegada) continue;
        p.pegada = false;
        const a = -Math.PI / 2 + (Math.random() - 0.5) * 0.6;
        p.vx = Math.cos(a) * velocidadBase();
        p.vy = Math.sin(a) * velocidadBase();
    }
}

function paso(dt) {
    const { ancho, alto } = lienzo;
    const px = juego.paleta.x * ancho;
    const pw = anchoPaleta();
    const py = yPaleta();
    for (const p of juego.pelotas) {
        if (p.pegada) {
            p.x = px;
            p.y = py - p.r - 2;
            continue;
        }
        // Mantiene la velocidad pareja (por si cambió la lentitud)
        const v = Math.hypot(p.vx, p.vy);
        const objetivo = velocidadBase();
        p.vx *= objetivo / v;
        p.vy *= objetivo / v;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (p.x < p.r) { p.x = p.r; p.vx = Math.abs(p.vx); }
        if (p.x > ancho - p.r) { p.x = ancho - p.r; p.vx = -Math.abs(p.vx); }
        if (p.y < p.r) { p.y = p.r; p.vy = Math.abs(p.vy); }
        // Paleta: el ángulo depende de dónde pega
        if (p.vy > 0 && p.y + p.r >= py && p.y < py + 10 && Math.abs(p.x - px) < pw / 2 + p.r) {
            const donde = (p.x - px) / (pw / 2);
            const a = -Math.PI / 2 + donde * 1.05;
            p.vx = Math.cos(a) * objetivo;
            p.vy = Math.sin(a) * objetivo;
            p.y = py - p.r;
            vibrar(8);
        }
        // Ladrillos
        for (const l of juego.ladrillos) {
            if (l.golpes <= 0) continue;
            const cx = Math.max(l.x, Math.min(p.x, l.x + l.w));
            const cy = Math.max(l.y, Math.min(p.y, l.y + l.h));
            if (Math.hypot(p.x - cx, p.y - cy) > p.r) continue;
            // Rebota según el lado por donde entró
            const solapeX = Math.min(p.x + p.r - l.x, l.x + l.w - (p.x - p.r));
            const solapeY = Math.min(p.y + p.r - l.y, l.y + l.h - (p.y - p.r));
            if (solapeX < solapeY) p.vx = -p.vx;
            else p.vy = -p.vy;
            golpear(l);
            break;
        }
        if (p.y > alto + 20) p.perdida = true;
    }
    juego.pelotas = juego.pelotas.filter((p) => !p.perdida);
    if (!juego.pelotas.length) perderVida();

    // Premios que caen
    for (const pr of juego.premios) {
        pr.y += alto * 0.25 * dt;
        if (pr.y > py - 8 && pr.y < py + 12 && Math.abs(pr.x - px) < pw / 2 + 14) {
            pr.tomado = true;
            aplicarPremio(pr.tipo);
        }
    }
    juego.premios = juego.premios.filter((pr) => !pr.tomado && pr.y < alto + 20);

    if (juego.ladrillos.every((l) => l.golpes <= 0)) {
        juego.nivel++;
        juego.puntos += 100;
        vibrar(80);
        armarNivel();
    }
}

function golpear(l) {
    l.golpes--;
    vibrar(12);
    if (l.golpes > 0) return;
    juego.puntos += 10 * juego.nivel;
    chispas.emitir(l.x + l.w / 2, l.y + l.h / 2, l.color, 12, 180);
    if (Math.random() < 0.12) {
        const premio = PREMIOS[Math.floor(Math.random() * PREMIOS.length)];
        juego.premios.push({ ...premio, x: l.x + l.w / 2, y: l.y + l.h / 2 });
    }
    pintarDatos();
}

function aplicarPremio(tipo) {
    vibrar(40);
    if (tipo === "ancha") juego.paleta.anchaHasta = performance.now() + 12000;
    if (tipo === "lenta") juego.lentaHasta = performance.now() + 10000;
    if (tipo === "vida") juego.vidas++;
    if (tipo === "multi") {
        const base = juego.pelotas[0];
        if (base) {
            for (const giro of [-0.5, 0.5]) {
                const p = nuevaPelota(false);
                const a = Math.atan2(base.vy, base.vx) + giro;
                Object.assign(p, { x: base.x, y: base.y, vx: Math.cos(a) * velocidadBase(), vy: Math.sin(a) * velocidadBase() });
                juego.pelotas.push(p);
            }
        }
    }
    pintarDatos();
}

function perderVida() {
    juego.vidas--;
    vibrar(150);
    if (juego.vidas <= 0) return fin();
    juego.pelotas = [nuevaPelota()];
    pintarDatos();
}

function fin() {
    juego.enJuego = false;
    const nuevo = juego.puntos > estado.record;
    if (nuevo) estado.record = juego.puntos;
    guardar(CLAVE, estado);
    $("titulo-centro").innerHTML = `${nuevo ? "¡Nuevo récord!" : "Fin del juego"}<div class="chico">${juego.puntos} puntos · nivel ${juego.nivel}</div>`;
    $("jugar").textContent = "Otra vez";
    $("centro").hidden = false;
    pintarDatos();
}

function pintarDatos() {
    $("puntos").textContent = juego?.puntos ?? 0;
    $("nivel").textContent = juego?.nivel ?? 1;
    $("vidas").textContent = juego?.vidas ?? 3;
    $("record").textContent = estado.record;
}

// ---------- Dibujo ----------
function redondeado(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
}

function dibujar(dt) {
    const { ctx, ancho, alto } = lienzo;
    const fondo = ctx.createLinearGradient(0, 0, 0, alto);
    fondo.addColorStop(0, "#1a0533");
    fondo.addColorStop(1, "#05000c");
    ctx.fillStyle = fondo;
    ctx.fillRect(0, 0, ancho, alto);
    if (!juego) return;

    for (const l of juego.ladrillos) {
        if (l.golpes <= 0) continue;
        const g = ctx.createLinearGradient(0, l.y, 0, l.y + l.h);
        g.addColorStop(0, "#ffffffaa");
        g.addColorStop(0.25, l.color);
        g.addColorStop(1, l.color);
        ctx.fillStyle = g;
        ctx.shadowColor = l.color;
        ctx.shadowBlur = 8;
        redondeado(ctx, l.x, l.y, l.w, l.h, 5);
        ctx.fill();
        if (l.golpes > 1) {
            ctx.strokeStyle = "#ffffffcc";
            ctx.lineWidth = 2;
            ctx.stroke();
        }
    }
    ctx.shadowBlur = 0;

    for (const pr of juego.premios) {
        ctx.fillStyle = pr.color;
        redondeado(ctx, pr.x - 16, pr.y - 10, 32, 20, 10);
        ctx.fill();
        ctx.fillStyle = "#10002b";
        ctx.font = "900 13px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(pr.letra, pr.x, pr.y + 1);
    }

    const pw = anchoPaleta();
    const px = juego.paleta.x * ancho;
    const pg = ctx.createLinearGradient(0, yPaleta(), 0, yPaleta() + 14);
    pg.addColorStop(0, "#9bf6ff");
    pg.addColorStop(1, "#4361ee");
    ctx.fillStyle = pg;
    ctx.shadowColor = "#4cc9f0";
    ctx.shadowBlur = 14;
    redondeado(ctx, px - pw / 2, yPaleta(), pw, 14, 7);
    ctx.fill();

    for (const p of juego.pelotas) {
        ctx.fillStyle = "#ffffff";
        ctx.shadowColor = "#ffffff";
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.shadowBlur = 0;
    chispas.dibujar(ctx, dt);

    if (juego.pelotas.some((p) => p.pegada) && juego.enJuego) {
        ctx.fillStyle = "#ffffffcc";
        ctx.font = "800 15px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("Tocá para lanzar", ancho / 2, alto * 0.62);
    }
}

bucle((dt) => {
    if (juego?.enJuego && $("centro").hidden) paso(dt);
    dibujar(dt);
});

// ---------- Controles ----------
function moverPaleta(e) {
    if (!juego) return;
    const caja = $("lienzo").getBoundingClientRect();
    juego.paleta.x = Math.max(0.05, Math.min(0.95, (e.clientX - caja.left) / caja.width));
}
$("lienzo").addEventListener("pointerdown", (e) => {
    moverPaleta(e);
    lanzar();
});
$("lienzo").addEventListener("pointermove", moverPaleta);
addEventListener("keydown", (e) => {
    if (!juego) return;
    if (e.key === "ArrowLeft") juego.paleta.x = Math.max(0.05, juego.paleta.x - 0.05);
    if (e.key === "ArrowRight") juego.paleta.x = Math.min(0.95, juego.paleta.x + 0.05);
    if (e.key === " ") lanzar();
});

$("jugar").addEventListener("click", () => {
    $("centro").hidden = true;
    chispas.limpiar();
    nuevoJuego();
});
pintarDatos();
