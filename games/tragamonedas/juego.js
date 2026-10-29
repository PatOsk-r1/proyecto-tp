// Tragamonedas de casino: 5 rodillos, 10 líneas, comodín, giros gratis, rueda del pozo,
// tres pozos acumulados y logros. Usa las fichas compartidas del casino.
import { formatear, vibrar, MONEDA } from "../../js/comun3d.js";
import { fichas, cambiarFichas, recargar, puedeRecargar } from "../../js/fichas.js";
import { APUESTAS, mantenerApretado } from "../../js/casino.js";
import { crearLienzo, bucle } from "../../js/lienzo2d.js";
import { SIMBOLOS, NOMBRES, LINEAS, POZOS, RUEDA, PROB_RUEDA, GIROS_GRATIS, PAGO_BONO, MULT_GRATIS, tirada, evaluar, sortear } from "./reglas.js";
import { TEMAS } from "./temas.js";

const $ = (id) => document.getElementById(id);
// Las variantes (games/faraon, games/pirata) cargan este mismo juego con otra temática
const TEMA = TEMAS[window.TEMA_TRAGAMONEDAS] ?? TEMAS.clasico;
const CLAVE = TEMA.clave;
document.querySelector(".marquesina").innerHTML = TEMA.marquesina;
document.body.classList.add(`tema-maquina-${window.TEMA_TRAGAMONEDAS ?? "clasico"}`);
const TAU = Math.PI * 2;
const COLORES_LINEA = ["#ff006e", "#ffbe0b", "#3a86ff", "#8ac926", "#ff7a1a", "#c77dff", "#00f5d4", "#f15bb5", "#fee440", "#00bbf9"];

const estado = (() => {
    const base = { pozos: {}, logros: {}, giros: 0, mayorPremio: 0, racha: 0 };
    try {
        return { ...base, ...JSON.parse(localStorage.getItem(CLAVE) || "{}") };
    } catch {
        return base;
    }
})();
for (const p in POZOS) estado.pozos[p] ??= POZOS[p].base;
const guardarEstado = () => {
    try {
        localStorage.setItem(CLAVE, JSON.stringify(estado));
    } catch {}
};

// ---------- Logros ----------
const LOGROS = [
    { id: "primero", icono: "🍀", nombre: "Primer premio", detalle: "Ganá cualquier premio", premio: 50 },
    { id: "giros100", icono: "🎰", nombre: "Habitué", detalle: "Girá 100 veces", premio: 300 },
    { id: "giros1000", icono: "👑", nombre: "Leyenda del casino", detalle: "Girá 1000 veces", premio: 3000 },
    { id: "lineas3", icono: "🎯", nombre: "Triple línea", detalle: "Ganá en 3 líneas a la vez", premio: 250 },
    { id: "cinco", icono: "🖐️", nombre: "Cinco iguales", detalle: "Cinco iguales en una línea", premio: 500 },
    { id: "sietes", icono: "7️⃣", nombre: "Suerte de siete", detalle: "Tres sietes o más en una línea", premio: 400 },
    { id: "comodines", icono: "🃏", nombre: "Comodines salvajes", detalle: "Tres comodines en la pantalla", premio: 200 },
    { id: "gratis", icono: "🎁", nombre: "Gratis es mejor", detalle: "Activá los giros gratis", premio: 300 },
    { id: "gran", icono: "💰", nombre: "Gran premio", detalle: "Ganá 10 veces tu apuesta", premio: 200 },
    { id: "mega", icono: "💎", nombre: "Mega premio", detalle: "Ganá 25 veces tu apuesta", premio: 600 },
    { id: "epico", icono: "🔥", nombre: "Premio épico", detalle: "Ganá 50 veces tu apuesta", premio: 1500 },
    { id: "racha", icono: "⚡", nombre: "En racha", detalle: "Ganá 4 giros seguidos", premio: 300 },
    { id: "rueda", icono: "🎡", nombre: "Que gire", detalle: "Activá la rueda del pozo", premio: 300 },
    { id: "mini", icono: "🥉", nombre: "Pozo mini", detalle: "Ganá el pozo MINI", premio: 500 },
    { id: "mayor", icono: "🥈", nombre: "Pozo mayor", detalle: "Ganá el pozo MAYOR", premio: 1500 },
    { id: "granpozo", icono: "🥇", nombre: "¡GRAN POZO!", detalle: "Ganá el GRAN POZO", premio: 10000 },
    { id: "maximo", icono: "🦈", nombre: "Tiburón", detalle: "Girá con la apuesta máxima", premio: 200 },
];
const colaLogros = [];
function logro(id) {
    if (estado.logros[id]) return;
    const l = LOGROS.find((x) => x.id === id);
    estado.logros[id] = Date.now();
    cambiarFichas(l.premio);
    colaLogros.push(l);
    if (colaLogros.length === 1) mostrarLogro();
    guardarEstado();
}
function mostrarLogro() {
    const l = colaLogros[0];
    if (!l) return;
    const el = $("aviso-logro");
    el.innerHTML = `<span style="font-size:1.6rem">${l.icono}</span><div>¡Logro! ${l.nombre}<small>+${formatear(l.premio)} fichas</small></div>`;
    el.hidden = false;
    vibrar([30, 40, 30]);
    setTimeout(() => {
        el.hidden = true;
        colaLogros.shift();
        pintar();
        setTimeout(mostrarLogro, 300);
    }, 2600);
}

// ---------- Símbolos dibujados ----------
const TAM = 160;
const sprites = {};
function sprite(nombre) {
    const c = document.createElement("canvas");
    c.width = c.height = TAM;
    const x = c.getContext("2d");
    const m = TAM / 2;
    x.translate(m, m);
    const sombra = (blur = 8) => {
        x.shadowColor = "#0008";
        x.shadowBlur = blur;
        x.shadowOffsetY = 4;
    };
    const sinSombra = () => {
        x.shadowColor = "transparent";
    };
    const radial = (cx, cy, r, a, b) => {
        const g = x.createRadialGradient(cx - r * 0.35, cy - r * 0.4, r * 0.1, cx, cy, r);
        g.addColorStop(0, "#fff");
        g.addColorStop(0.2, a);
        g.addColorStop(1, b);
        return g;
    };
    const texto = (t, tam, relleno, borde, y = 0) => {
        x.font = `900 ${tam}px "Arial Black", sans-serif`;
        x.textAlign = "center";
        x.textBaseline = "middle";
        x.lineJoin = "round";
        x.lineWidth = tam * 0.16;
        x.strokeStyle = borde;
        x.strokeText(t, 0, y);
        x.fillStyle = relleno;
        x.fillText(t, 0, y);
    };
    sombra();
    if (TEMA.dibujar?.(nombre, { x, radial, texto, sombra, sinSombra })) return c;
    if (nombre === "cereza") {
        x.strokeStyle = "#2d6a4f";
        x.lineWidth = 6;
        x.beginPath();
        x.moveTo(-22, 18);
        x.quadraticCurveTo(-10, -30, 14, -48);
        x.moveTo(24, 22);
        x.quadraticCurveTo(22, -20, 14, -48);
        x.stroke();
        x.fillStyle = "#52b788";
        x.beginPath();
        x.ellipse(28, -46, 18, 9, -0.4, 0, TAU);
        x.fill();
        for (const [cx, cy] of [[-24, 26], [24, 30]]) {
            x.fillStyle = radial(cx, cy, 25, "#ff4d6d", "#7a0010");
            x.beginPath();
            x.arc(cx, cy, 25, 0, TAU);
            x.fill();
        }
    } else if (nombre === "limon") {
        x.fillStyle = radial(0, 0, 50, "#ffe94d", "#c79a00");
        x.beginPath();
        x.ellipse(0, 4, 50, 38, -0.25, 0, TAU);
        x.fill();
        x.beginPath();
        x.ellipse(-50, 16, 10, 7, -0.25, 0, TAU);
        x.ellipse(48, -8, 9, 6, -0.25, 0, TAU);
        x.fill();
        sinSombra();
        x.fillStyle = "#fff8";
        x.beginPath();
        x.ellipse(-14, -12, 16, 6, -0.4, 0, TAU);
        x.fill();
    } else if (nombre === "uva") {
        const granos = [[-24, -18], [0, -22], [24, -18], [-12, 4], [12, 4], [-24, 26], [0, 28], [24, 26], [-12, 48], [12, 48]];
        for (const [cx, cy] of granos) {
            x.fillStyle = radial(cx, cy - 10, 16, "#b15cff", "#3c096c");
            x.beginPath();
            x.arc(cx, cy - 10, 16, 0, TAU);
            x.fill();
        }
        x.fillStyle = "#40916c";
        x.beginPath();
        x.ellipse(10, -54, 22, 10, 0.3, 0, TAU);
        x.fill();
    } else if (nombre === "campana") {
        const g = x.createLinearGradient(-50, 0, 50, 0);
        g.addColorStop(0, "#b8860b");
        g.addColorStop(0.35, "#fff3b0");
        g.addColorStop(0.6, "#ffd166");
        g.addColorStop(1, "#8a5a00");
        x.fillStyle = g;
        x.beginPath();
        x.moveTo(-48, 34);
        x.quadraticCurveTo(-40, 26, -36, 0);
        x.quadraticCurveTo(-32, -50, 0, -52);
        x.quadraticCurveTo(32, -50, 36, 0);
        x.quadraticCurveTo(40, 26, 48, 34);
        x.closePath();
        x.fill();
        x.fillStyle = "#8a5a00";
        x.beginPath();
        x.arc(0, 42, 11, 0, TAU);
        x.fill();
        x.fillRect(-5, -64, 10, 14);
    } else if (nombre === "bar") {
        x.fillStyle = "#111";
        x.beginPath();
        x.roundRect(-62, -34, 124, 68, 14);
        x.fill();
        sinSombra();
        x.strokeStyle = "#ffd166";
        x.lineWidth = 5;
        x.stroke();
        texto("BAR", 44, "#ffd166", "#7a4a00", 2);
    } else if (nombre === "estrella") {
        const g = x.createRadialGradient(-10, -14, 4, 0, 0, 60);
        g.addColorStop(0, "#fffbe0");
        g.addColorStop(0.4, "#ffd60a");
        g.addColorStop(1, "#e85d04");
        x.fillStyle = g;
        x.beginPath();
        for (let k = 0; k < 10; k++) {
            const r = k % 2 ? 26 : 60;
            const a = -Math.PI / 2 + (k * Math.PI) / 5;
            x.lineTo(Math.cos(a) * r, Math.sin(a) * r + 4);
        }
        x.closePath();
        x.fill();
        sinSombra();
        x.strokeStyle = "#9d4300";
        x.lineWidth = 3;
        x.stroke();
    } else if (nombre === "diamante") {
        const caras = [
            [[-56, -14], [-30, -44], [0, -14], "#90e0ef"],
            [[0, -14], [-30, -44], [30, -44], "#caf0f8"],
            [[0, -14], [30, -44], [56, -14], "#48cae4"],
            [[-56, -14], [0, -14], [0, 58], "#00b4d8"],
            [[0, -14], [56, -14], [0, 58], "#0077b6"],
        ];
        for (const [a, b, c, color] of caras) {
            x.fillStyle = color;
            x.beginPath();
            x.moveTo(...a);
            x.lineTo(...b);
            x.lineTo(...c);
            x.closePath();
            x.fill();
            sinSombra();
        }
        x.fillStyle = "#fff";
        x.beginPath();
        x.moveTo(-26, -36);
        x.lineTo(-16, -22);
        x.lineTo(-34, -22);
        x.fill();
    } else if (nombre === "siete") {
        const g = x.createLinearGradient(0, -60, 0, 60);
        g.addColorStop(0, "#ff8fa3");
        g.addColorStop(0.45, "#e5383b");
        g.addColorStop(1, "#660708");
        x.font = '900 128px "Arial Black", sans-serif';
        x.textAlign = "center";
        x.textBaseline = "middle";
        x.lineJoin = "round";
        x.lineWidth = 18;
        x.strokeStyle = "#ffd166";
        x.strokeText("7", 0, 6);
        sinSombra();
        x.lineWidth = 8;
        x.strokeStyle = "#7a4a00";
        x.strokeText("7", 0, 6);
        x.fillStyle = g;
        x.fillText("7", 0, 6);
    } else if (nombre === "comodin") {
        const g = x.createLinearGradient(-60, -60, 60, 60);
        g.addColorStop(0, "#f72585");
        g.addColorStop(0.5, "#7209b7");
        g.addColorStop(1, "#3a0ca3");
        x.fillStyle = g;
        x.beginPath();
        x.roundRect(-64, -50, 128, 100, 22);
        x.fill();
        sinSombra();
        x.strokeStyle = "#ffd166";
        x.lineWidth = 5;
        x.stroke();
        texto("WILD", 40, "#fff", "#3a0ca3", 6);
        x.fillStyle = "#ffd166";
        x.beginPath();
        x.moveTo(-26, -38);
        x.lineTo(-26, -60);
        x.lineTo(-12, -48);
        x.lineTo(0, -66);
        x.lineTo(12, -48);
        x.lineTo(26, -60);
        x.lineTo(26, -38);
        x.fill();
    } else if (nombre === "bono") {
        x.fillStyle = radial(0, 0, 60, "#ffd166", "#9c6500");
        x.beginPath();
        x.arc(0, 0, 60, 0, TAU);
        x.fill();
        sinSombra();
        x.strokeStyle = "#fff3b0";
        x.lineWidth = 4;
        x.beginPath();
        x.arc(0, 0, 48, 0, TAU);
        x.stroke();
        texto("BONO", 30, "#fff", "#9c3d00", 2);
    }
    return c;
}
for (const n of NOMBRES) sprites[n] = sprite(n);

// ---------- Rodillos ----------
let ancho = 300;
let alto = 180;
const lienzo = crearLienzo($("rodillos"), (d) => {
    ancho = d.ancho;
    alto = d.alto;
});
const marco = () => {
    const borde = ancho * 0.045;
    return { x: borde, y: borde * 1.4, w: ancho - borde * 2, h: alto - borde * 2.4 };
};

const rodillos = Array.from({ length: 5 }, () => ({ pos: 0, estado: "quieto", mapa: new Map(), desde: 0, hasta: 0, t: 0, dur: 0, vel: 0, anticipa: false, rebote: 0 }));
function simboloEn(r, i) {
    if (!r.mapa.has(i)) r.mapa.set(i, sortear());
    return r.mapa.get(i);
}
const facilSalida = (t) => {
    // Frena con un pequeño rebote al final
    const c1 = 1.4;
    const c3 = c1 + 1;
    return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2;
};

let resaltar = null; // { celdas, color, linea }
let tiempo = 0;
let parpadeo = 0;
let gratisActivo = false;

function dibujarMaquina(dt) {
    const { ctx } = lienzo;
    ctx.clearRect(0, 0, ancho, alto);
    const m = marco();
    // Gabinete dorado con luces
    const g = ctx.createLinearGradient(0, 0, 0, alto);
    g.addColorStop(0, gratisActivo ? "#c77dff" : TEMA.gabinete[0]);
    g.addColorStop(0.5, gratisActivo ? "#5a189a" : TEMA.gabinete[1]);
    g.addColorStop(1, gratisActivo ? "#240046" : TEMA.gabinete[2]);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.roundRect(0, 0, ancho, alto, 22);
    ctx.fill();
    ctx.strokeStyle = TEMA.borde;
    ctx.lineWidth = 3;
    ctx.stroke();
    // Bombitas
    const n = 26;
    for (let k = 0; k < n; k++) {
        const p = k / n;
        const perim = 2 * (ancho + alto);
        let d = p * perim;
        let bx;
        let by;
        if (d < ancho) [bx, by] = [d, 6];
        else if ((d -= ancho) < alto) [bx, by] = [ancho - 6, d];
        else if ((d -= alto) < ancho) [bx, by] = [ancho - d, alto - 6];
        else [bx, by] = [6, alto - (d - ancho)];
        const prendida = (k + Math.floor(tiempo * (parpadeo > 0 ? 14 : 3))) % 3 === 0;
        ctx.fillStyle = prendida ? TEMA.luz : "#ffd16655";
        ctx.shadowColor = prendida ? TEMA.luz : "transparent";
        ctx.shadowBlur = prendida ? 8 : 0;
        ctx.beginPath();
        ctx.arc(bx, by, 3, 0, TAU);
        ctx.fill();
    }
    ctx.shadowBlur = 0;
    // Ventana
    ctx.fillStyle = TEMA.ventana;
    ctx.beginPath();
    ctx.roundRect(m.x - 4, m.y - 4, m.w + 8, m.h + 8, 14);
    ctx.fill();
    const rw = m.w / 5;
    const rh = m.h / 3;
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(m.x, m.y, m.w, m.h, 10);
    ctx.clip();
    rodillos.forEach((r, i) => {
        const x0 = m.x + i * rw;
        const fondo = ctx.createLinearGradient(0, m.y, 0, m.y + m.h);
        fondo.addColorStop(0, TEMA.rodillo[0]);
        fondo.addColorStop(0.18, TEMA.rodillo[1]);
        fondo.addColorStop(0.82, TEMA.rodillo[1]);
        fondo.addColorStop(1, TEMA.rodillo[0]);
        ctx.fillStyle = fondo;
        ctx.fillRect(x0 + 1.5, m.y, rw - 3, m.h);
        if (r.anticipa && r.estado !== "quieto") {
            ctx.fillStyle = `rgba(255,209,102,${0.35 + Math.sin(tiempo * 20) * 0.2})`;
            ctx.fillRect(x0 + 1.5, m.y, rw - 3, m.h);
        }
        const base = Math.floor(r.pos);
        const frac = r.pos - base;
        const borroso = r.estado === "girando" || (r.estado === "frenando" && r.t / r.dur < 0.6);
        for (let fila = -1; fila <= 3; fila++) {
            const s = simboloEn(r, base + fila);
            const cy = m.y + (fila - frac) * rh + rh / 2;
            let tam = Math.min(rw, rh) * 0.86;
            const ganadora = resaltar?.celdas.some(([cr, cf]) => cr === i && cf === fila) && r.estado === "quieto" && frac === 0;
            if (ganadora) tam *= 1 + Math.sin(tiempo * 10) * 0.08 + 0.06;
            ctx.globalAlpha = borroso ? 0.75 : 1;
            if (borroso) {
                ctx.drawImage(sprites[s], x0 + rw / 2 - tam / 2, cy - tam * 0.7, tam, tam * 1.4);
            } else {
                if (ganadora) {
                    ctx.fillStyle = resaltar.color + "55";
                    ctx.fillRect(x0 + 3, cy - rh / 2 + 2, rw - 6, rh - 4);
                }
                ctx.drawImage(sprites[s], x0 + rw / 2 - tam / 2, cy - tam / 2, tam, tam);
            }
            ctx.globalAlpha = 1;
        }
        // Separador entre rodillos
        ctx.fillStyle = "#0003";
        ctx.fillRect(x0 + rw - 1.5, m.y, 3, m.h);
    });
    // Sombra arriba y abajo para que parezcan cilindros
    for (const [y, dir] of [[m.y, 1], [m.y + m.h, -1]]) {
        const s = ctx.createLinearGradient(0, y, 0, y + dir * rh * 0.45);
        s.addColorStop(0, "#0007");
        s.addColorStop(1, "#0000");
        ctx.fillStyle = s;
        ctx.fillRect(m.x, dir > 0 ? y : y - rh * 0.45, m.w, rh * 0.45);
    }
    // Línea ganadora
    if (resaltar?.linea !== undefined && resaltar.linea !== null) {
        const pts = LINEAS[resaltar.linea].map((fila, r) => [m.x + r * rw + rw / 2, m.y + fila * rh + rh / 2]);
        ctx.strokeStyle = resaltar.color;
        ctx.lineWidth = 5;
        ctx.lineJoin = "round";
        ctx.shadowColor = resaltar.color;
        ctx.shadowBlur = 14;
        ctx.beginPath();
        pts.forEach(([px, py], k) => (k ? ctx.lineTo(px, py) : ctx.moveTo(px, py)));
        ctx.stroke();
        ctx.shadowBlur = 0;
    }
    ctx.restore();
    // Brillo de vidrio
    const v = ctx.createLinearGradient(m.x, m.y, m.x + m.w * 0.6, m.y + m.h);
    v.addColorStop(0, "#ffffff22");
    v.addColorStop(0.4, "#ffffff00");
    ctx.fillStyle = v;
    ctx.fillRect(m.x, m.y, m.w, m.h);
    parpadeo = Math.max(0, parpadeo - dt);
}

function moverRodillos(dt) {
    for (const r of rodillos) {
        if (r.estado === "girando") {
            r.vel = Math.min(r.vel + dt * 80, turbo ? 34 : 26);
            r.pos += r.vel * dt;
        } else if (r.estado === "frenando") {
            r.t += dt;
            const p = Math.min(1, r.t / r.dur);
            r.pos = r.desde + (r.hasta - r.desde) * facilSalida(p);
            if (p >= 1) {
                r.pos = r.hasta;
                r.estado = "quieto";
                r.anticipa = false;
                // Limpio símbolos que ya no se ven
                for (const k of r.mapa.keys()) if (k < r.hasta - 2) r.mapa.delete(k);
                vibrar(12);
                r.alFrenar?.();
            }
        }
    }
}

function frenar(r, columna) {
    return new Promise((resolver) => {
        r.desde = r.pos;
        r.hasta = Math.floor(r.pos) + 8;
        columna.forEach((s, fila) => r.mapa.set(r.hasta + fila, s));
        r.t = 0;
        r.dur = turbo ? 0.35 : 0.6;
        r.estado = "frenando";
        r.alFrenar = resolver;
    });
}

// ---------- Lluvia de monedas (pantalla completa) ----------
const lluvia = document.createElement("canvas");
lluvia.style.cssText = "position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:45";
document.body.appendChild(lluvia);
const lienzoLluvia = crearLienzo(lluvia);
const monedas = [];
function soltarMonedas(cantidad) {
    for (let i = 0; i < cantidad; i++) {
        monedas.push({ x: Math.random() * lienzoLluvia.ancho, y: -20 - Math.random() * lienzoLluvia.alto * 0.8, vy: 150 + Math.random() * 250, vx: (Math.random() - 0.5) * 60, giro: Math.random() * TAU, r: 7 + Math.random() * 7 });
    }
}
function dibujarLluvia(dt) {
    const { ctx, ancho: w, alto: h } = lienzoLluvia;
    ctx.clearRect(0, 0, w, h);
    for (let i = monedas.length - 1; i >= 0; i--) {
        const c = monedas[i];
        c.vy += 300 * dt;
        c.y += c.vy * dt;
        c.x += c.vx * dt;
        c.giro += dt * 8;
        const ancho2 = Math.abs(Math.cos(c.giro)) * c.r;
        const g = ctx.createLinearGradient(c.x - c.r, 0, c.x + c.r, 0);
        g.addColorStop(0, "#9c6500");
        g.addColorStop(0.5, "#fff3b0");
        g.addColorStop(1, "#ffb703");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.ellipse(c.x, c.y, Math.max(1, ancho2), c.r, 0, 0, TAU);
        ctx.fill();
        if (c.y > h + 30) monedas.splice(i, 1);
    }
}

bucle((dt) => {
    tiempo += dt;
    moverRodillos(dt);
    dibujarMaquina(dt);
    dibujarLluvia(dt);
    animarPozos(dt);
});

// ---------- Pozos ----------
const pozosMostrados = { ...estado.pozos };
function animarPozos(dt) {
    for (const p in POZOS) {
        pozosMostrados[p] += (estado.pozos[p] - pozosMostrados[p]) * Math.min(1, dt * 4);
        $(`pozo-${p}`).textContent = formatear(Math.floor(pozosMostrados[p]));
    }
}
function aportarPozos(apuesta) {
    for (const p in POZOS) estado.pozos[p] += apuesta * POZOS[p].aporte;
}
async function ganarPozo(nombre) {
    const monto = Math.floor(estado.pozos[nombre]);
    estado.pozos[nombre] = POZOS[nombre].base;
    pozosMostrados[nombre] = POZOS[nombre].base;
    const el = document.querySelector(`.pozo.${nombre}`);
    el.classList.remove("gano");
    void el.offsetWidth;
    el.classList.add("gano");
    cambiarFichas(monto);
    logro(nombre === "gran" ? "granpozo" : nombre);
    await celebrar({ mini: "¡POZO MINI!", mayor: "¡POZO MAYOR!", gran: "¡¡GRAN POZO!!" }[nombre], monto, nombre === "gran" ? 6 : 3.5);
    return monto;
}

// ---------- Celebraciones ----------
function celebrar(titulo, monto, duracion = 2.5) {
    return new Promise((resolver) => {
        const el = $("celebracion");
        $("titulo-celebracion").textContent = titulo;
        $("titulo-celebracion").style.animation = "none";
        void el.offsetWidth;
        $("titulo-celebracion").style.animation = "";
        el.hidden = false;
        soltarMonedas(Math.min(160, 30 + duracion * 25));
        vibrar([60, 40, 60, 40, 120]);
        parpadeo = duracion + 1;
        const inicio = performance.now();
        let listo = false;
        const contar = () => {
            const p = Math.min(1, (performance.now() - inicio) / (duracion * 1000));
            $("monto-celebracion").textContent = `+${formatear(Math.floor(monto * (1 - (1 - p) ** 3)))}`;
            if (p < 1 && !listo) requestAnimationFrame(contar);
            else $("monto-celebracion").textContent = `+${formatear(monto)}`;
        };
        contar();
        const terminar = () => {
            if (listo) return;
            listo = true;
            el.hidden = true;
            el.removeEventListener("click", terminar);
            resolver();
        };
        el.addEventListener("click", terminar);
        setTimeout(terminar, duracion * 1000 + 1500);
    });
}

// ---------- Rueda del pozo ----------
const COLORES_RUEDA = { mini: "#2a9d8f", mayor: "#4361ee", gran: "#ffb703" };
function dibujarRueda(angulo) {
    const c = $("rueda");
    const x = c.getContext("2d");
    const r = c.width / 2;
    x.clearRect(0, 0, c.width, c.height);
    x.save();
    x.translate(r, r);
    x.fillStyle = "#ffd166";
    x.beginPath();
    x.arc(0, 0, r - 4, 0, TAU);
    x.fill();
    x.rotate(angulo);
    const paso = TAU / RUEDA.length;
    RUEDA.forEach((s, i) => {
        x.fillStyle = s.tipo === "pozo" ? COLORES_RUEDA[s.valor] : i % 4 === 0 ? "#b5179e" : "#7209b7";
        x.beginPath();
        x.moveTo(0, 0);
        x.arc(0, 0, r - 20, i * paso, (i + 1) * paso);
        x.closePath();
        x.fill();
        x.strokeStyle = "#fff8";
        x.lineWidth = 3;
        x.stroke();
        x.save();
        x.rotate(i * paso + paso / 2);
        x.fillStyle = "#fff";
        x.font = '900 30px "Arial Black", sans-serif';
        x.textAlign = "right";
        x.textBaseline = "middle";
        x.shadowColor = "#000a";
        x.shadowBlur = 4;
        x.fillText(s.tipo === "pozo" ? s.valor.toUpperCase() : `×${s.valor}`, r - 40, 0);
        x.restore();
    });
    x.restore();
    // Centro y bombitas
    x.fillStyle = "#12021f";
    x.beginPath();
    x.arc(r, r, 46, 0, TAU);
    x.fill();
    x.fillStyle = "#ffd166";
    x.font = '900 40px sans-serif';
    x.textAlign = "center";
    x.textBaseline = "middle";
    x.fillText("★", r, r + 2);
    for (let k = 0; k < 24; k++) {
        const a = (k / 24) * TAU;
        x.fillStyle = (k + Math.floor(performance.now() / 120)) % 2 ? "#fff" : "#ff7a1a";
        x.beginPath();
        x.arc(r + Math.cos(a) * (r - 11), r + Math.sin(a) * (r - 11), 5, 0, TAU);
        x.fill();
    }
    // Flecha arriba
    x.fillStyle = "#e63946";
    x.beginPath();
    x.moveTo(r - 20, 0);
    x.lineTo(r + 20, 0);
    x.lineTo(r, 44);
    x.closePath();
    x.fill();
    x.strokeStyle = "#fff";
    x.lineWidth = 3;
    x.stroke();
}

function girarRueda(apuesta) {
    return new Promise((resolver) => {
        logro("rueda");
        $("rueda-fondo").hidden = false;
        $("girar-rueda").disabled = false;
        let angulo = 0;
        let quieta = true;
        const brillar = () => {
            if (!quieta || $("rueda-fondo").hidden) return;
            dibujarRueda(angulo);
            requestAnimationFrame(brillar);
        };
        brillar();
        $("girar-rueda").onclick = () => {
            $("girar-rueda").disabled = true;
            quieta = false;
            const elegido = Math.floor(Math.random() * RUEDA.length);
            const paso = TAU / RUEDA.length;
            // El segmento elegido termina bajo la flecha (arriba = -90°)
            const final = -Math.PI / 2 - (elegido * paso + paso / 2) + TAU * 6 + (Math.random() - 0.5) * paso * 0.6;
            const inicio = performance.now();
            const dur = 4800;
            let ultimo = 0;
            const animar = (ahora) => {
                const p = Math.min(1, (ahora - inicio) / dur);
                angulo = final * (1 - (1 - p) ** 4);
                const tic = Math.floor(angulo / paso);
                if (tic !== ultimo) {
                    ultimo = tic;
                    vibrar(5);
                }
                dibujarRueda(angulo);
                if (p < 1) return requestAnimationFrame(animar);
                setTimeout(async () => {
                    $("rueda-fondo").hidden = true;
                    const s = RUEDA[elegido];
                    if (s.tipo === "pozo") await ganarPozo(s.valor);
                    else {
                        const monto = apuesta * s.valor;
                        cambiarFichas(monto);
                        await celebrar(`¡RUEDA ×${s.valor}!`, monto, 2.5);
                    }
                    resolver();
                }, 700);
            };
            requestAnimationFrame(animar);
        };
    });
}

// ---------- Jugada ----------
let nivelApuesta = 0;
let girando = false;
let turbo = false;
let auto = false;
let girosGratis = 0;
let mostrandoLineas = null;

async function girar() {
    const apuesta = APUESTAS[nivelApuesta];
    const gratis = girosGratis > 0;
    if (girando) return pararYa();
    if (!gratis && fichas() < apuesta) {
        auto = false;
        return pintar();
    }
    girando = true;
    clearInterval(mostrandoLineas);
    resaltar = null;
    $("mensaje").classList.remove("premio");
    if (gratis) {
        girosGratis--;
        $("mensaje").textContent = `Giro gratis · quedan ${girosGratis}`;
    } else {
        cambiarFichas(-apuesta);
        aportarPozos(apuesta);
        estado.giros++;
        $("mensaje").textContent = "¡Suerte!";
        if (nivelApuesta === APUESTAS.length - 1) logro("maximo");
    }
    gratisActivo = gratis || girosGratis > 0;
    pintar();
    vibrar(20);

    const grilla = tirada();
    const res = evaluar(grilla, apuesta / 10, gratis);

    for (const r of rodillos) {
        r.estado = "girando";
        r.vel = 0;
    }
    // Frenan de izquierda a derecha; si ya hay 2 BONO, los que siguen tardan más (suspenso)
    let espera = turbo ? 250 : 600;
    let bonosVistos = 0;
    for (let i = 0; i < 5; i++) {
        const suspenso = bonosVistos >= 2;
        if (suspenso) {
            rodillos[i].anticipa = true;
            espera += turbo ? 500 : 1100;
        }
        await esperar(espera, i);
        await frenar(rodillos[i], grilla[i]);
        bonosVistos += grilla[i].filter((s) => s === "bono").length;
        espera = parado ? 0 : turbo ? 90 : 260;
    }
    parado = false;
    await mostrarResultado(res, apuesta, gratis, grilla);
    girando = false;
    gratisActivo = girosGratis > 0;
    guardarEstado();
    pintar();

    if (girosGratis > 0) setTimeout(girar, turbo ? 500 : 900);
    else if (auto) setTimeout(() => auto && !girando && girar(), turbo ? 350 : 800);
}

let parado = false;
let despertar = null;
function esperar(ms) {
    if (parado) return Promise.resolve();
    return new Promise((resolver) => {
        const t = setTimeout(resolver, ms);
        despertar = () => {
            clearTimeout(t);
            resolver();
        };
    });
}
// Tocar mientras gira frena todos los rodillos enseguida
function pararYa() {
    if (parado) return;
    parado = true;
    despertar?.();
}

async function mostrarResultado(res, apuesta, gratis, grilla) {
    let ganado = res.total;
    if (ganado > 0) {
        cambiarFichas(ganado);
        estado.racha++;
        logro("primero");
        if (estado.racha >= 4) logro("racha");
    } else estado.racha = 0;
    if (res.premios.length >= 3) logro("lineas3");
    if (res.premios.some((p) => p.cantidad === 5)) logro("cinco");
    if (res.premios.some((p) => p.simbolo === "siete")) logro("sietes");
    if (grilla.flat().filter((s) => s === "comodin").length >= 3) logro("comodines");
    if (estado.giros >= 100) logro("giros100");
    if (estado.giros >= 1000) logro("giros1000");

    // Recorre las líneas ganadoras una por una
    if (res.premios.length) {
        let k = 0;
        const siguiente = () => {
            const p = res.premios[k % res.premios.length];
            resaltar = { celdas: p.celdas, color: COLORES_LINEA[p.linea], linea: p.linea };
            k++;
        };
        siguiente();
        mostrandoLineas = setInterval(siguiente, 1100);
    } else if (res.bonos >= 3) {
        resaltar = { celdas: res.celdasBono, color: "#ffd166", linea: null };
    }

    const veces = ganado / apuesta;
    if (veces >= 10) logro("gran");
    if (veces >= 25) logro("mega");
    if (veces >= 50) logro("epico");
    estado.mayorPremio = Math.max(estado.mayorPremio, ganado);

    if (veces >= 10) {
        const titulo = veces >= 100 ? "¡¡LEGENDARIO!!" : veces >= 50 ? "¡PREMIO ÉPICO!" : veces >= 25 ? "¡MEGA PREMIO!" : "¡GRAN PREMIO!";
        await celebrar(titulo, ganado, veces >= 50 ? 4.5 : veces >= 25 ? 3.5 : 2.5);
    } else if (ganado > 0) {
        $("mensaje").textContent = `¡Ganaste ${formatear(ganado)}!${gratis ? " (×2)" : ""}`;
        $("mensaje").classList.add("premio");
        soltarMonedas(Math.min(30, 4 + veces * 3));
        vibrar(50);
    } else if (!gratis) {
        $("mensaje").textContent = ["Casi…", "Otra vez será", "¡La próxima!", "Seguí probando"][Math.floor(Math.random() * 4)];
    }

    if (res.granPozo) ganado += await ganarPozo("gran");

    if (res.giros) {
        girosGratis += res.giros;
        logro("gratis");
        gratisActivo = true;
        await celebrar(`¡${res.giros} GIROS GRATIS!`, (PAGO_BONO[Math.min(res.bonos, 5)] ?? 0) * apuesta, 2.2);
        $("mensaje").textContent = `Giros gratis: todos los premios ×${MULT_GRATIS}`;
    }

    if (!gratis && Math.random() < PROB_RUEDA) {
        await new Promise((r) => setTimeout(r, 500));
        await girarRueda(apuesta);
    }
}

// ---------- Interfaz ----------
function pintar() {
    const apuesta = APUESTAS[nivelApuesta];
    $("fichas").innerHTML = `${MONEDA}${formatear(fichas())}`;
    $("apuesta").textContent = apuesta;
    $("girar").textContent = girando ? (girosGratis > 0 || auto ? "■ PARAR" : "■ PARAR") : girosGratis > 0 ? `GRATIS (${girosGratis})` : "GIRAR";
    $("girar").classList.toggle("parar", girando);
    $("girar").disabled = !girando && girosGratis === 0 && fichas() < apuesta;
    $("menos").disabled = girando || girosGratis > 0 || nivelApuesta === 0;
    $("mas").disabled = girando || girosGratis > 0 || nivelApuesta === APUESTAS.length - 1;
    $("recargar").hidden = !puedeRecargar() || girando || girosGratis > 0;
    $("auto").classList.toggle("activo", auto);
    $("turbo").classList.toggle("activo", turbo);
    $("giros-gratis").hidden = girosGratis === 0 && !gratisActivo;
    $("giros-restantes").textContent = girosGratis;
    $("logros-cuenta").textContent = `${Object.keys(estado.logros).length}/${LOGROS.length}`;
}

mantenerApretado($("menos"));
mantenerApretado($("mas"));
addEventListener("fichas", () => !girando && pintar());
$("menos").addEventListener("click", () => {
    nivelApuesta = Math.max(0, nivelApuesta - 1);
    pintar();
});
$("mas").addEventListener("click", () => {
    nivelApuesta = Math.min(APUESTAS.length - 1, nivelApuesta + 1);
    pintar();
});
$("girar").addEventListener("click", () => {
    if (girando && auto) auto = false;
    girar();
});
$("auto").addEventListener("click", () => {
    auto = !auto;
    pintar();
    if (auto && !girando) girar();
});
$("turbo").addEventListener("click", () => {
    turbo = !turbo;
    pintar();
});
$("recargar").addEventListener("click", () => {
    recargar();
    $("mensaje").textContent = "¡+500 fichas de regalo! Volvé mañana por más";
    pintar();
});
$("rodillos").addEventListener("click", () => girando && pararYa());

function abrirPanel(titulo, html) {
    $("panel-titulo").textContent = titulo;
    $("panel-contenido").innerHTML = html;
    $("panel").hidden = false;
}
$("cerrar-panel").addEventListener("click", () => ($("panel").hidden = true));
$("info").addEventListener("click", () => {
    const apuestaLinea = APUESTAS[nivelApuesta] / 10;
    abrirPanel(
        "Premios",
        `<p class="texto-panel">Apostás en 10 líneas a la vez. Pagan 3, 4 o 5 iguales seguidos desde la izquierda. El <b>WILD</b> reemplaza a cualquiera. Con tu apuesta actual cada línea vale ${formatear(apuestaLinea)}.</p>` +
            NOMBRES.filter((n) => n !== "bono" && n !== "comodin")
                .reverse()
                .map((n) => `<div class="fila-premio"><canvas data-s="${n}" width="68" height="68"></canvas><span class="pagos">${SIMBOLOS[n].pagos.map((p, i) => `<span><i>${i + 3}×</i> ${formatear(p * apuestaLinea)}</span>`).join("")}</span></div>`)
                .join("") +
            `<div class="fila-premio"><canvas data-s="bono" width="68" height="68"></canvas><span class="texto-panel">3, 4 o 5 BONO en cualquier lugar: ${GIROS_GRATIS[3]}, ${GIROS_GRATIS[4]} o ${GIROS_GRATIS[5]} giros gratis con premios ×${MULT_GRATIS}</span></div>
            <p class="texto-panel">💰 <b>Pozos:</b> cada giro suma a los pozos MINI, MAYOR y GRAN. Cinco 7 en una línea se llevan el GRAN POZO. Cada tanto aparece la <b>rueda del pozo</b>, que puede dar cualquiera de los tres.</p>`
    );
    for (const c of document.querySelectorAll("#panel-contenido canvas")) c.getContext("2d").drawImage(sprites[c.dataset.s], 0, 0, 68, 68);
});
$("logros").addEventListener("click", () => {
    abrirPanel(
        `Logros ${Object.keys(estado.logros).length}/${LOGROS.length}`,
        `<p class="texto-panel">Giros: ${formatear(estado.giros)} · Mayor premio: ${formatear(estado.mayorPremio)}</p>` +
            LOGROS.map((l) => `<div class="logro${estado.logros[l.id] ? " hecho" : ""}"><span class="medalla">${l.icono}</span><span class="txt">${l.nombre}<small>${l.detalle}</small></span><b>+${formatear(l.premio)}</b></div>`).join("")
    );
});

// Primera pantalla: símbolos al azar en todos los rodillos
for (const r of rodillos) for (let f = -1; f <= 3; f++) simboloEn(r, f);
pintar();
