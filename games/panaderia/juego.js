// Panadería: un local animado con hornos, vitrina y clientes que hacen fila. Horneás (cada horno con
// su receta), lo listo pasa a la vitrina y le vendés a cada cliente lo que pide antes de que se canse.
// Con encargados los hornos trabajan solos; con la cajera se vende sola. Abrir otra sucursal reinicia
// a cambio de estrellas (+10% de precio cada una, para siempre).
import { formatear, cargar, guardar, vibrar } from "../../js/comun3d.js";
import { crearLienzo, bucle, crearChispas } from "../../js/lienzo2d.js";
import { crearAudio, MUSICAS } from "../../js/sonido.js";
import { crearBase, calidadAutomatica } from "../../js/incremental.js";

const $ = (id) => document.getElementById(id);
const CLAVE = "panaderia2";
const TAU = Math.PI * 2;

const audio = crearAudio({ musica: MUSICAS.tranquila });
const { nota, golpe, efectos } = audio;
const sonidos = {
    horno: () => golpe({ dur: 0.18, vol: 0.12, filtro: 600, tipo: "lowpass" }),
    listo: () => [1319, 1760].forEach((f, k) => nota({ f, t: k * 0.12, dur: 0.4, vol: 0.12, onda: "sine" })),
    caja: () => {
        nota({ f: 1568, dur: 0.08, vol: 0.12, onda: "square" });
        nota({ f: 2093, t: 0.08, dur: 0.3, vol: 0.12, onda: "triangle" });
        golpe({ t: 0.02, dur: 0.06, vol: 0.1, filtro: 4000 });
    },
    campana: () => [1175, 1480].forEach((f, k) => nota({ f, t: k * 0.15, dur: 0.6, vol: 0.08, onda: "sine" })),
    enojo: () => nota({ f: 200, hasta: 140, dur: 0.3, vol: 0.12, onda: "sawtooth" }),
};

// ---------- Recetas ----------
const RECETAS = [
    { id: "pan", nombre: "Pan", tiempo: 3, costo: 1, precio: 5, nivel: 1, xp: 1 },
    { id: "medialuna", nombre: "Medialunas", tiempo: 5, costo: 3, precio: 13, nivel: 2, xp: 2 },
    { id: "galletita", nombre: "Galletitas", tiempo: 7, costo: 6, precio: 26, nivel: 3, xp: 3 },
    { id: "dona", nombre: "Donas", tiempo: 10, costo: 12, precio: 55, nivel: 5, xp: 5 },
    { id: "torta", nombre: "Torta", tiempo: 18, costo: 30, precio: 150, nivel: 7, xp: 9 },
    { id: "pastel", nombre: "Tarta de frutillas", tiempo: 30, costo: 80, precio: 420, nivel: 10, xp: 16 },
];
const receta = (id) => RECETAS.find((r) => r.id === id);

// ---------- Mejoras y personal ----------
const MEJORAS = [
    { id: "horno", icono: "🔥", nombre: "Horno nuevo", detalle: (n) => `Tenés ${1 + n} de 4 hornos`, max: 3, costo: (n) => [120, 1500, 18000][n] },
    { id: "rapido", icono: "⏱️", nombre: "Hornos más rápidos", detalle: (n) => `Hornean ${Math.round((1 - 0.88 ** n) * 100)}% más rápido`, max: 10, costo: (n) => Math.ceil(80 * 2.3 ** n) },
    { id: "vitrina", icono: "🧁", nombre: "Vitrina más grande", detalle: (n) => `Entran ${capacidad(n)} de cada producto`, max: 8, costo: (n) => Math.ceil(60 * 2.1 ** n) },
    { id: "deco", icono: "🌸", nombre: "Decoración", detalle: (n) => `Vienen más clientes y tienen ${n * 15}% más paciencia`, max: 10, costo: (n) => Math.ceil(150 * 2.2 ** n) },
    { id: "precio", icono: "🏷️", nombre: "Fama del barrio", detalle: (n) => `Todo se vende ${n * 12}% más caro`, max: 15, costo: (n) => Math.ceil(200 * 2.25 ** n) },
];
const capacidad = (n) => 6 + n * 4;

// ---------- Estado ----------
const viejo = (() => {
    try {
        return JSON.parse(localStorage.getItem("panaderia") || "null");
    } catch {
        return null;
    }
})();
const NUEVA_VIDA = () => ({ monedas: 20, nivel: 1, xp: 0, hornos: [{ receta: "pan", inicio: 0, fin: 0 }], vitrina: {}, mejoras: {}, encargados: {}, cajera: false, ganadoVida: 0 });
const estado = cargar(CLAVE, { ...NUEVA_VIDA(), estrellas: viejo?.estrellas ?? 0, elegida: "pan", ultimaVez: Date.now(), contadores: { vendidos: 0, horneados: 0, enojados: 0, sucursales: 0, ganado: 0 } });
const cont = estado.contadores;
const mejora = (id) => estado.mejoras[id] ?? 0;
const tiempoReceta = (r) => r.tiempo * 0.88 ** mejora("rapido");
const precioDe = (r) => Math.round(r.precio * (1 + mejora("precio") * 0.12) * (1 + estado.estrellas * 0.1));
const xpNivel = (n) => Math.round(15 * n ** 1.55);
const enVitrina = (id) => estado.vitrina[id] ?? 0;
const recetasDisponibles = () => RECETAS.filter((r) => r.nivel <= estado.nivel);

// ---------- Lienzo ----------
let ancho = 300;
let alto = 300;
const sprites = new Map();
function sprite(clave, w, h, dibujarlo) {
    let s = sprites.get(clave);
    if (!s) {
        const escala = Math.min(devicePixelRatio, 1.5);
        const c = document.createElement("canvas");
        c.width = Math.max(1, Math.ceil(w * escala));
        c.height = Math.max(1, Math.ceil(h * escala));
        const cx = c.getContext("2d");
        cx.scale(escala, escala);
        dibujarlo(cx);
        s = { c, w, h };
        sprites.set(clave, s);
    }
    return s;
}
let fondo = null;
const lienzo = crearLienzo($("lienzo"), (d) => {
    ancho = d.ancho;
    alto = d.alto;
    sprites.clear();
    fondo = null;
}, 1.5);
const vigilarCalidad = calidadAutomatica((n) => lienzo.cambiarEscala(n === 1 ? 1.15 : 1));
const chispas = crearChispas();
const textos = [];

// Medidas del local
function medidas() {
    const piso = alto * 0.8;
    const ladoHorno = Math.min(ancho * 0.155, alto * 0.22, 130);
    return {
        piso,
        ladoHorno,
        mostrador: { x: ancho * 0.35, y: piso - alto * 0.22, w: ancho * 0.36, h: alto * 0.22 },
        puertaX: ancho * 0.88,
        filaX: (i) => ancho * (0.76 + i * 0.075),
    };
}
function rectHorno(i, m = medidas()) {
    const col = i % 2;
    const fila = Math.floor(i / 2);
    const l = m.ladoHorno;
    return { x: ancho * 0.02 + col * (l + 6), y: m.piso - (fila + 1) * (l + 8), w: l, h: l };
}

// ---------- Dibujos ----------
function dibujarProducto(c, id, x, y, t) {
    c.save();
    c.translate(x, y);
    if (id === "pan") {
        const g = c.createLinearGradient(0, -t * 0.3, 0, t * 0.3);
        g.addColorStop(0, "#e9a45b");
        g.addColorStop(1, "#a0612a");
        c.fillStyle = g;
        c.beginPath();
        c.ellipse(0, 0, t * 0.45, t * 0.28, 0, 0, TAU);
        c.fill();
        c.strokeStyle = "#fbe3c0";
        c.lineWidth = Math.max(1, t * 0.06);
        for (const dx of [-0.18, 0, 0.18]) {
            c.beginPath();
            c.moveTo(dx * t - t * 0.06, -t * 0.1);
            c.lineTo(dx * t + t * 0.06, t * 0.1);
            c.stroke();
        }
    } else if (id === "medialuna") {
        c.fillStyle = "#e9a45b";
        c.beginPath();
        c.arc(0, t * 0.12, t * 0.4, Math.PI * 1.05, Math.PI * 1.95);
        c.arc(0, t * 0.22, t * 0.22, Math.PI * 1.95, Math.PI * 1.05, true);
        c.fill();
        c.strokeStyle = "#a0612a";
        c.lineWidth = Math.max(1, t * 0.04);
        for (const a of [1.3, 1.5, 1.7]) {
            c.beginPath();
            c.moveTo(Math.cos(Math.PI * a) * t * 0.22, t * 0.22 + Math.sin(Math.PI * a) * t * 0.22);
            c.lineTo(Math.cos(Math.PI * a) * t * 0.4, t * 0.12 + Math.sin(Math.PI * a) * t * 0.4);
            c.stroke();
        }
    } else if (id === "galletita") {
        c.fillStyle = "#d4a373";
        c.beginPath();
        c.arc(0, 0, t * 0.35, 0, TAU);
        c.fill();
        c.fillStyle = "#4a2e17";
        for (const [dx, dy] of [[-0.12, -0.1], [0.12, -0.05], [0, 0.12], [-0.15, 0.12], [0.16, 0.14]]) {
            c.beginPath();
            c.arc(dx * t, dy * t, t * 0.05, 0, TAU);
            c.fill();
        }
    } else if (id === "dona") {
        c.fillStyle = "#d4a373";
        c.beginPath();
        c.arc(0, 0, t * 0.38, 0, TAU);
        c.fill();
        c.fillStyle = "#ff8fab";
        c.beginPath();
        c.arc(0, -t * 0.02, t * 0.33, 0, TAU);
        c.fill();
        c.fillStyle = "#fdf0d5";
        c.beginPath();
        c.arc(0, 0, t * 0.12, 0, TAU);
        c.fill();
        const colores = ["#ffd166", "#4cc9f0", "#80ed99", "#fff"];
        for (let k = 0; k < 8; k++) {
            c.fillStyle = colores[k % 4];
            const a = k * 0.8;
            c.fillRect(Math.cos(a) * t * 0.23 - 1, Math.sin(a) * t * 0.23 - 1, t * 0.07, t * 0.03);
        }
    } else if (id === "torta") {
        c.fillStyle = "#fdf0d5";
        c.fillRect(-t * 0.4, -t * 0.12, t * 0.8, t * 0.4);
        c.fillStyle = "#6f4518";
        c.fillRect(-t * 0.4, t * 0.04, t * 0.8, t * 0.08);
        c.fillStyle = "#ffafcc";
        c.beginPath();
        c.ellipse(0, -t * 0.12, t * 0.4, t * 0.1, 0, 0, TAU);
        c.fill();
        c.fillStyle = "#e63946";
        c.beginPath();
        c.arc(0, -t * 0.22, t * 0.07, 0, TAU);
        c.fill();
    } else {
        // Tarta de frutillas
        c.fillStyle = "#c08552";
        c.beginPath();
        c.ellipse(0, t * 0.08, t * 0.42, t * 0.16, 0, 0, TAU);
        c.fill();
        c.fillStyle = "#fff3b0";
        c.beginPath();
        c.ellipse(0, t * 0.02, t * 0.36, t * 0.12, 0, 0, TAU);
        c.fill();
        c.fillStyle = "#e63946";
        for (const [dx, dy] of [[-0.2, 0], [0, -0.04], [0.2, 0], [-0.1, 0.05], [0.1, 0.05]]) {
            c.beginPath();
            c.ellipse(dx * t, dy * t, t * 0.07, t * 0.06, 0, 0, TAU);
            c.fill();
        }
    }
    c.restore();
}
const imgProducto = (id, t) => sprite(`prod-${id}-${Math.round(t)}`, t * 1.1, t * 0.9, (c) => dibujarProducto(c, id, t * 0.55, t * 0.45, t));

// Local: pared con azulejos, ventana, estantes, piso a cuadros y puerta (se pinta una vez)
function pintarFondo() {
    const m = medidas();
    const escala = Math.min(devicePixelRatio, 1.5);
    const can = document.createElement("canvas");
    can.width = Math.ceil(ancho * escala);
    can.height = Math.ceil(alto * escala);
    const c = can.getContext("2d");
    c.scale(escala, escala);
    const pared = c.createLinearGradient(0, 0, 0, m.piso);
    pared.addColorStop(0, "#fde2c4");
    pared.addColorStop(1, "#f4c79a");
    c.fillStyle = pared;
    c.fillRect(0, 0, ancho, m.piso);
    // Azulejos en la parte de abajo de la pared
    c.fillStyle = "#ffffff55";
    for (let y = m.piso - alto * 0.28; y < m.piso; y += 14) for (let x = (y / 14) % 2 ? 0 : 7; x < ancho; x += 14) c.fillRect(x, y, 12, 12);
    // Guarda
    c.fillStyle = "#c1694f";
    c.fillRect(0, m.piso - alto * 0.29, ancho, 5);
    // Ventana con toldo a rayas
    const vx = ancho * 0.4;
    const vw = ancho * 0.26;
    const vy = alto * 0.06;
    const vh = alto * 0.26;
    c.fillStyle = "#8ecae6";
    c.fillRect(vx, vy, vw, vh);
    c.fillStyle = "#ffffff55";
    c.beginPath();
    c.moveTo(vx + vw * 0.1, vy + vh);
    c.lineTo(vx + vw * 0.4, vy);
    c.lineTo(vx + vw * 0.55, vy);
    c.lineTo(vx + vw * 0.25, vy + vh);
    c.fill();
    c.strokeStyle = "#8d5a2b";
    c.lineWidth = 5;
    c.strokeRect(vx, vy, vw, vh);
    c.beginPath();
    c.moveTo(vx + vw / 2, vy);
    c.lineTo(vx + vw / 2, vy + vh);
    c.stroke();
    for (let k = 0; k < 8; k++) {
        c.fillStyle = k % 2 ? "#fff" : "#e63946";
        c.beginPath();
        c.moveTo(vx - 8 + (k * (vw + 16)) / 8, vy - 4);
        c.lineTo(vx - 8 + ((k + 1) * (vw + 16)) / 8, vy - 4);
        c.lineTo(vx - 8 + ((k + 1) * (vw + 16)) / 8, vy + 12);
        c.quadraticCurveTo(vx - 8 + ((k + 0.5) * (vw + 16)) / 8, vy + 18, vx - 8 + (k * (vw + 16)) / 8, vy + 12);
        c.fill();
    }
    // Cartel
    c.fillStyle = "#6f4518";
    c.beginPath();
    c.roundRect(ancho * 0.7, alto * 0.06, ancho * 0.26, alto * 0.08, 8);
    c.fill();
    c.fillStyle = "#fdf0d5";
    c.font = `900 ${Math.min(16, ancho * 0.035)}px Georgia, serif`;
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.fillText("PANADERÍA", ancho * 0.83, alto * 0.1);
    // Puerta
    c.fillStyle = "#8d5a2b";
    c.fillRect(m.puertaX, m.piso - alto * 0.42, ancho * 0.1, alto * 0.42);
    c.fillStyle = "#8ecae6aa";
    c.fillRect(m.puertaX + ancho * 0.015, m.piso - alto * 0.38, ancho * 0.07, alto * 0.16);
    c.fillStyle = "#ffd166";
    c.beginPath();
    c.arc(m.puertaX + ancho * 0.02, m.piso - alto * 0.2, 3, 0, TAU);
    c.fill();
    // Piso a cuadros
    for (let y = m.piso; y < alto; y += 16) {
        for (let x = ((y - m.piso) / 16) % 2 ? 0 : 16; x < ancho; x += 32) {
            c.fillStyle = "#e6ccb2";
            c.fillRect(x, y, 16, 16);
        }
    }
    c.fillStyle = "#ddb892";
    c.globalCompositeOperation = "destination-over";
    c.fillRect(0, m.piso, ancho, alto - m.piso);
    c.globalCompositeOperation = "source-over";
    // Mostrador (frente de madera; los productos se dibujan arriba en cada cuadro)
    const mo = m.mostrador;
    c.fillStyle = "#a9713f";
    c.fillRect(mo.x, mo.y + mo.h * 0.45, mo.w, mo.h * 0.55);
    c.fillStyle = "#8d5a2b";
    for (let x = mo.x + 10; x < mo.x + mo.w; x += 24) c.fillRect(x, mo.y + mo.h * 0.5, 3, mo.h * 0.45);
    c.fillStyle = "#6f4518";
    c.fillRect(mo.x - 4, mo.y + mo.h * 0.42, mo.w + 8, 6);
    // Vidrio de la vitrina
    c.fillStyle = "#caf0f855";
    c.fillRect(mo.x, mo.y, mo.w, mo.h * 0.43);
    c.strokeStyle = "#ffffffaa";
    c.lineWidth = 2;
    c.strokeRect(mo.x, mo.y, mo.w, mo.h * 0.43);
    return can;
}

function dibujarHorno(c, r, h, t) {
    const enMarcha = h.fin > Date.now();
    const listo = h.fin && h.fin <= Date.now();
    // Cuerpo de ladrillo con boca
    c.fillStyle = "#c1694f";
    c.beginPath();
    c.roundRect(r.x, r.y, r.w, r.h, 10);
    c.fill();
    c.fillStyle = "#a0522d";
    for (let y = r.y + 8; y < r.y + r.h; y += 10) for (let x = r.x + ((y / 10) % 2 ? 4 : 10); x < r.x + r.w - 8; x += 14) c.fillRect(x, y, 10, 2);
    const bx = r.x + r.w * 0.15;
    const by = r.y + r.h * 0.35;
    const bw = r.w * 0.7;
    const bh = r.h * 0.45;
    c.fillStyle = "#2b1a0e";
    c.beginPath();
    c.roundRect(bx, by, bw, bh, 8);
    c.fill();
    if (enMarcha || listo) {
        // Brillo del fuego (titila)
        c.fillStyle = `rgba(255, ${140 + Math.sin(t * 10) * 30}, 40, ${listo ? 0.5 : 0.85})`;
        c.beginPath();
        c.ellipse(bx + bw / 2, by + bh * 0.8, bw * 0.4, bh * 0.25, 0, 0, TAU);
        c.fill();
        const img = imgProducto(h.receta, bw * 0.55);
        // El producto se infla mientras se hornea
        const p = listo ? 1 : 1 - (h.fin - Date.now()) / (tiempoReceta(receta(h.receta)) * 1000);
        const s = 0.7 + Math.min(1, p) * 0.3;
        c.drawImage(img.c, bx + bw / 2 - (img.w * s) / 2, by + bh * 0.55 - (img.h * s) / 2, img.w * s, img.h * s);
    }
    // Chimenea con humo
    c.fillStyle = "#6c757d";
    c.fillRect(r.x + r.w * 0.7, r.y - 10, r.w * 0.14, 12);
    // Barra de progreso o "¡listo!"
    if (enMarcha) {
        const p = 1 - (h.fin - Date.now()) / (tiempoReceta(receta(h.receta)) * 1000);
        c.fillStyle = "#0007";
        c.beginPath();
        c.roundRect(r.x + 6, r.y + 6, r.w - 12, 7, 4);
        c.fill();
        c.fillStyle = "#ffd166";
        c.beginPath();
        c.roundRect(r.x + 6, r.y + 6, (r.w - 12) * Math.min(1, p), 7, 4);
        c.fill();
    } else if (listo) {
        c.fillStyle = "#8fd14f";
        c.beginPath();
        c.roundRect(r.x + r.w * 0.15, r.y + 4, r.w * 0.7, 16, 8);
        c.fill();
        c.fillStyle = "#fff";
        c.font = `900 ${Math.min(11, r.w * 0.13)}px system-ui, sans-serif`;
        c.textAlign = "center";
        c.textBaseline = "middle";
        c.fillText("¡LISTO!", r.x + r.w / 2, r.y + 12);
    } else {
        c.fillStyle = "#fdf0d5cc";
        c.font = `800 ${Math.min(10, r.w * 0.12)}px system-ui, sans-serif`;
        c.textAlign = "center";
        c.textBaseline = "middle";
        c.fillText("tocá", r.x + r.w / 2, by + bh / 2);
    }
    if (estado.encargados[estado.hornos.indexOf(h)]) {
        // Gorro de encargado arriba del horno
        c.fillStyle = "#fff";
        c.beginPath();
        c.arc(r.x + 10, r.y + r.h - 10, 7, 0, TAU);
        c.fill();
        c.fillStyle = "#3a86ff";
        c.font = "900 9px system-ui, sans-serif";
        c.fillText("👩‍🍳", r.x + 10, r.y + r.h - 9);
    }
}

// Clientes: aspecto al azar, caminan hasta la fila, piden algo y esperan
const ROPAS = ["#e63946", "#3a86ff", "#8338ec", "#2a9d8f", "#f4a261", "#ff006e", "#06d6a0"];
const PIELES = ["#f1c7a3", "#e0ac69", "#c68b59", "#8d5524", "#ffdbac"];
const PELOS = ["#2b1a0e", "#5c3a1e", "#e9c46a", "#bdbdbd", "#c1121f", "#111"];
function dibujarCliente(c, k, paso) {
    const ropa = ROPAS[k % ROPAS.length];
    const piel = PIELES[(k * 3) % PIELES.length];
    const pelo = PELOS[(k * 5) % PELOS.length];
    c.fillStyle = "#0003";
    c.beginPath();
    c.ellipse(0, 0, 14, 4, 0, 0, TAU);
    c.fill();
    c.fillStyle = "#3d405b";
    c.fillRect(-7 + paso * 2, -24, 6, 24);
    c.fillRect(1 - paso * 2, -24, 6, 24);
    c.fillStyle = ropa;
    c.beginPath();
    c.roundRect(-11, -50, 22, 28, 7);
    c.fill();
    c.fillStyle = piel;
    c.beginPath();
    c.arc(0, -60, 10, 0, TAU);
    c.fill();
    c.fillStyle = pelo;
    c.beginPath();
    c.arc(0, -63, 10, Math.PI, 0);
    c.fill();
    if (k % 3 === 0) c.fillRect(-10, -63, 4, 12);
    c.fillStyle = "#111";
    c.fillRect(-5, -61, 2.5, 2.5);
}
const clientes = []; // { k, x, quiere, paciencia, max, estado: "entra" | "espera" | "sale", feliz }
let proximoCliente = 2;
const pacienciaMax = () => 22 * (1 + mejora("deco") * 0.15);
const cadaCuanto = () => Math.max(1.6, 6 * 0.9 ** mejora("deco"));
function nuevoCliente() {
    const opciones = recetasDisponibles();
    // Piden más seguido lo barato, pero también lo nuevo
    const pesos = opciones.map((r, i) => 1 / (1 + i * 0.5));
    let t = Math.random() * pesos.reduce((a, b) => a + b, 0);
    let quiere = opciones[0].id;
    for (let i = 0; i < opciones.length; i++) if ((t -= pesos[i]) < 0) {
        quiere = opciones[i].id;
        break;
    }
    clientes.push({ k: Math.floor(Math.random() * 1000), x: ancho + 20, quiere, paciencia: pacienciaMax(), max: pacienciaMax(), estado: "entra", feliz: false });
    if (clientes.length === 1) sonidos.campana();
}

function venderAlPrimero() {
    const c = clientes.find((x) => x.estado === "espera" && clientes.filter((y) => y.estado !== "sale").indexOf(x) === 0);
    if (!c) return false;
    if (enVitrina(c.quiere) < 1) return false;
    estado.vitrina[c.quiere]--;
    const r = receta(c.quiere);
    // Propina si lo atendiste rápido
    const propina = c.paciencia > c.max * 0.6 ? 1.2 : 1;
    const plata = Math.round(precioDe(r) * propina);
    estado.monedas += plata;
    estado.ganadoVida += plata;
    cont.ganado += plata;
    cont.vendidos++;
    sumarXp(r.xp);
    c.estado = "sale";
    c.feliz = true;
    const m = medidas();
    textos.push({ x: m.filaX(0), y: m.piso - 90, t: `+${formatear(plata)}${propina > 1 ? " 💕" : ""}`, color: "#ffd166", vida: 1.3 });
    chispas.emitir(m.filaX(0), m.piso - 70, "#ffd166", 10, 120);
    sonidos.caja();
    return true;
}

function sumarXp(n) {
    estado.xp += n;
    while (estado.xp >= xpNivel(estado.nivel)) {
        estado.xp -= xpNivel(estado.nivel);
        estado.nivel++;
        const nueva = RECETAS.find((r) => r.nivel === estado.nivel);
        avisar(`⭐ ¡Nivel ${estado.nivel}!${nueva ? ` Nueva receta: ${nueva.nombre}` : ""}`);
        efectos.fanfarria();
        vibrar([40, 60, 80]);
    }
}

// ---------- Hornos ----------
function tocarHorno(i) {
    const h = estado.hornos[i];
    if (h.fin && h.fin <= Date.now()) return juntarHorno(i);
    if (h.fin > Date.now()) return avisar("Todavía se está horneando…");
    const r = receta(estado.elegida);
    if (estado.monedas < r.costo) return avisar(`Te faltan monedas para los ingredientes (${r.costo})`);
    if (enVitrina(r.id) >= capacidad(mejora("vitrina"))) return avisar(`La vitrina ya está llena de ${r.nombre}`);
    hornear(i, r.id);
}
function hornear(i, id) {
    const r = receta(id);
    const h = estado.hornos[i];
    estado.monedas -= r.costo;
    h.receta = id;
    h.inicio = Date.now();
    h.fin = Date.now() + tiempoReceta(r) * 1000;
    sonidos.horno();
}
function juntarHorno(i) {
    const h = estado.hornos[i];
    if (enVitrina(h.receta) >= capacidad(mejora("vitrina"))) {
        avisar("La vitrina está llena: vendé algo primero");
        return false;
    }
    estado.vitrina[h.receta] = enVitrina(h.receta) + 1;
    cont.horneados++;
    const r = rectHorno(i);
    chispas.emitir(r.x + r.w / 2, r.y + r.h / 2, "#ffd166", 8, 90);
    h.fin = 0;
    sonidos.listo();
    return true;
}

// ---------- Dibujo principal ----------
function dibujar(dt) {
    const { ctx } = lienzo;
    const t = performance.now() / 1000;
    const m = medidas();
    if (!fondo) fondo = pintarFondo();
    ctx.drawImage(fondo, 0, 0, ancho, alto);
    // Hornos
    estado.hornos.forEach((h, i) => dibujarHorno(ctx, rectHorno(i, m), h, t));
    // Humo de las chimeneas de los hornos encendidos
    estado.hornos.forEach((h, i) => {
        if (h.fin <= Date.now()) return;
        const r = rectHorno(i, m);
        for (let k = 0; k < 3; k++) {
            const f = (t * 0.5 + k / 3 + i * 0.2) % 1;
            ctx.fillStyle = `rgba(255,255,255,${0.5 * (1 - f)})`;
            ctx.beginPath();
            ctx.arc(r.x + r.w * 0.77 + Math.sin(f * 6 + k) * 4, r.y - 12 - f * 30, 4 + f * 6, 0, TAU);
            ctx.fill();
        }
    });
    // Productos en la vitrina (filas por receta, se ven los que hay)
    const mo = m.mostrador;
    const disponibles = recetasDisponibles();
    const tamP = Math.min(mo.w / 7, mo.h * 0.32);
    disponibles.forEach((r, fila) => {
        const n = enVitrina(r.id);
        if (!n) return;
        const img = imgProducto(r.id, tamP);
        const porFila = 3;
        const columnas = Math.ceil(disponibles.length / 2);
        const col = fila % columnas;
        const sub = Math.floor(fila / columnas);
        const x0 = mo.x + 6 + col * (mo.w / columnas);
        const y0 = mo.y + mo.h * 0.43 - tamP * 0.75 - sub * tamP * 0.62;
        for (let k = 0; k < Math.min(n, porFila); k++) ctx.drawImage(img.c, x0 + k * tamP * 0.42, y0, img.w, img.h);
        if (n > porFila) {
            ctx.fillStyle = "#6f4518";
            ctx.font = "900 10px system-ui, sans-serif";
            ctx.textAlign = "left";
            ctx.fillText(`×${n}`, x0 + porFila * tamP * 0.42 + tamP * 0.6, y0 + tamP * 0.5);
        }
    });
    // Panadero detrás del mostrador (se balancea)
    const px = mo.x + mo.w * 0.15;
    const py = mo.y + mo.h * 0.42;
    ctx.save();
    ctx.translate(px, py + Math.sin(t * 2) * 1.5);
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.roundRect(-11, -34, 22, 30, 7);
    ctx.fill();
    ctx.fillStyle = "#f1c7a3";
    ctx.beginPath();
    ctx.arc(0, -44, 10, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.fillRect(-9, -60, 18, 8);
    for (const dx of [-6, 0, 6]) {
        ctx.beginPath();
        ctx.arc(dx, -62, 6, 0, TAU);
        ctx.fill();
    }
    ctx.fillStyle = "#5c3a1e";
    ctx.fillRect(-6, -40, 12, 3);
    ctx.restore();
    if (estado.cajera) {
        // Cajera al lado de la caja
        const cx = mo.x + mo.w * 0.85;
        ctx.save();
        ctx.translate(cx, py + Math.sin(t * 2 + 1) * 1.5);
        ctx.fillStyle = "#ff8fab";
        ctx.beginPath();
        ctx.roundRect(-10, -32, 20, 28, 7);
        ctx.fill();
        ctx.fillStyle = "#e0ac69";
        ctx.beginPath();
        ctx.arc(0, -42, 9, 0, TAU);
        ctx.fill();
        ctx.fillStyle = "#2b1a0e";
        ctx.beginPath();
        ctx.arc(0, -45, 9, Math.PI, 0);
        ctx.fill();
        ctx.restore();
    }
    // Caja registradora
    ctx.fillStyle = "#495057";
    ctx.fillRect(mo.x + mo.w - 30, mo.y + mo.h * 0.42 - 16, 26, 16);
    ctx.fillStyle = "#8fd14f";
    ctx.fillRect(mo.x + mo.w - 26, mo.y + mo.h * 0.42 - 13, 18, 5);
    // Clientes
    const enFila = clientes.filter((c) => c.estado !== "sale");
    for (const cl of clientes) {
        let destino;
        if (cl.estado === "sale") destino = ancho + 40;
        else destino = m.filaX(Math.min(enFila.indexOf(cl), 6));
        const dx = destino - cl.x;
        const vel = 120;
        if (Math.abs(dx) > 2) {
            cl.x += Math.sign(dx) * Math.min(Math.abs(dx), vel * dt);
            cl.paso = (cl.paso ?? 0) + dt * 10;
        } else if (cl.estado === "entra") cl.estado = "espera";
        if (cl.estado === "espera" && enFila.indexOf(cl) === 0) cl.paciencia -= dt;
        else if (cl.estado === "espera") cl.paciencia -= dt * 0.35;
        if (cl.estado === "espera" && cl.paciencia <= 0) {
            cl.estado = "sale";
            cl.feliz = false;
            cont.enojados++;
            textos.push({ x: cl.x, y: m.piso - 100, t: "😠", color: "#fff", vida: 1.3 });
            sonidos.enojo();
        }
        const paso = Math.abs(dx) > 2 ? Math.sin(cl.paso ?? 0) : 0;
        const img = sprite(`cliente-${cl.k % 35}-${paso > 0.3 ? 1 : paso < -0.3 ? 2 : 0}`, 40, 80, (c) => {
            c.translate(20, 76);
            dibujarCliente(c, cl.k % 35, paso > 0.3 ? 1 : paso < -0.3 ? -1 : 0);
        });
        ctx.save();
        if (cl.estado !== "sale") {
            ctx.translate(cl.x, 0);
            ctx.scale(-1, 1);
            ctx.translate(-cl.x, 0);
        }
        ctx.drawImage(img.c, cl.x - 20, m.piso - 76, 40, 80);
        ctx.restore();
        // Burbuja con lo que quiere y su paciencia
        if (cl.estado === "espera") {
            const bx = cl.x;
            const by = m.piso - 112;
            ctx.fillStyle = "#fff";
            ctx.beginPath();
            ctx.roundRect(bx - 18, by - 18, 36, 30, 10);
            ctx.moveTo(bx - 4, by + 12);
            ctx.lineTo(bx, by + 18);
            ctx.lineTo(bx + 4, by + 12);
            ctx.fill();
            const ip = imgProducto(cl.quiere, 26);
            ctx.drawImage(ip.c, bx - ip.w / 2, by - 15, ip.w, ip.h);
            const p = Math.max(0, cl.paciencia / cl.max);
            ctx.fillStyle = "#0003";
            ctx.fillRect(bx - 16, by + 8, 32, 3);
            ctx.fillStyle = p > 0.5 ? "#8fd14f" : p > 0.25 ? "#ffd166" : "#ff4d6d";
            ctx.fillRect(bx - 16, by + 8, 32 * p, 3);
            if (enVitrina(cl.quiere) > 0 && enFila.indexOf(cl) === 0) {
                ctx.strokeStyle = `rgba(143,209,79,${0.6 + Math.sin(t * 6) * 0.3})`;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.roundRect(bx - 19, by - 19, 38, 32, 11);
                ctx.stroke();
            }
        }
    }
    for (let i = clientes.length - 1; i >= 0; i--) if (clientes[i].estado === "sale" && clientes[i].x > ancho + 30) clientes.splice(i, 1);
    chispas.dibujar(ctx, dt);
    for (let i = textos.length - 1; i >= 0; i--) {
        const tx = textos[i];
        tx.vida -= dt;
        tx.y -= dt * 30;
        ctx.globalAlpha = Math.max(0, Math.min(1, tx.vida * 1.5));
        ctx.font = "900 15px system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.lineWidth = 3;
        ctx.strokeStyle = "#4a2e17";
        ctx.strokeText(tx.t, tx.x, tx.y);
        ctx.fillStyle = tx.color;
        ctx.fillText(tx.t, tx.x, tx.y);
        if (tx.vida <= 0) textos.splice(i, 1);
    }
    ctx.globalAlpha = 1;
}

// ---------- Toques ----------
$("lienzo").addEventListener("pointerdown", (e) => {
    const caja = $("lienzo").getBoundingClientRect();
    const x = e.clientX - caja.left;
    const y = e.clientY - caja.top;
    const m = medidas();
    for (let i = 0; i < estado.hornos.length; i++) {
        const r = rectHorno(i, m);
        if (x >= r.x && x <= r.x + r.w && y >= r.y - 10 && y <= r.y + r.h) {
            tocarHorno(i);
            return refrescar();
        }
    }
    // Tocar la fila o el mostrador le vende al primero
    if (x > m.mostrador.x && y > m.piso - alto * 0.5) {
        if (!venderAlPrimero()) {
            const primero = clientes.find((c) => c.estado === "espera");
            if (primero) avisar(`Quiere ${receta(primero.quiere).nombre}: horneá y pasalo a la vitrina`);
        }
        refrescar();
    }
});

// ---------- Panel ----------
let pestana = "recetas";
let ultimoPanel = "";
const MONEDA = '<i class="moneda-p chica"></i>';
function pintarPanel() {
    let html = "";
    if (pestana === "recetas") {
        html = RECETAS.map((r) => {
            const bloqueada = r.nivel > estado.nivel;
            return `<button class="fila-p receta-p${estado.elegida === r.id ? " elegida" : ""}" data-receta="${r.id}" ${bloqueada ? "disabled" : ""}>
                <canvas width="88" height="72" data-prod="${r.id}"></canvas>
                <span class="txt"><strong>${r.nombre}</strong><small>${bloqueada ? `🔒 Nivel ${r.nivel}` : `⏱ ${formatearSeg(tiempoReceta(r))} · ingredientes ${MONEDA}${r.costo} · vende ${MONEDA}${precioDe(r)}`}</small></span>
                <span class="cant-p">${bloqueada ? "" : `${enVitrina(r.id)}/${capacidad(mejora("vitrina"))}`}</span></button>`;
        }).join("") + `<p class="ayuda-p">Elegí qué hornear y tocá un horno. Lo listo va a la vitrina; tocá al cliente para venderle.</p>`;
    } else if (pestana === "mejoras") {
        html = MEJORAS.map((q) => {
            const n = mejora(q.id);
            const tope = n >= q.max;
            return `<div class="fila-p"><span class="ico-p">${q.icono}</span><span class="txt"><strong>${q.nombre}${n ? ` <em>Nv ${n}</em>` : ""}</strong><small>${q.detalle(n)}</small></span>
                <button type="button" data-mejora="${q.id}" ${tope || estado.monedas < q.costo(n) ? "disabled" : ""}>${tope ? "Máximo" : `${MONEDA}${formatear(q.costo(n))}`}</button></div>`;
        }).join("");
    } else if (pestana === "personal") {
        html = estado.hornos.map((h, i) => {
            const tiene = estado.encargados[i];
            const costo = costoEncargado(i);
            return `<div class="fila-p"><span class="ico-p">👨‍🍳</span><span class="txt"><strong>Encargado del horno ${i + 1}</strong><small>${tiene ? `Hornea ${receta(h.receta).nombre} solo (elegí otra receta y tocá el horno para cambiarla)` : "Hornea y pasa a la vitrina solo, sin parar"}</small></span>
                <button type="button" data-encargado="${i}" ${tiene || estado.monedas < costo ? "disabled" : ""}>${tiene ? "Contratado" : `${MONEDA}${formatear(costo)}`}</button></div>`;
        }).join("") + `<div class="fila-p"><span class="ico-p">💁‍♀️</span><span class="txt"><strong>Cajera</strong><small>${estado.cajera ? "Atiende sola a los clientes" : "Les vende sola a los clientes"}</small></span>
            <button type="button" data-cajera ${estado.cajera || estado.monedas < COSTO_CAJERA ? "disabled" : ""}>${estado.cajera ? "Contratada" : `${MONEDA}${formatear(COSTO_CAJERA)}`}</button></div>`;
    } else {
        const nuevas = estrellasNuevas();
        html = `<div class="tarjeta-p"><strong>🏪 Sucursal ${cont.sucursales + 1}</strong><span>⭐ ${estado.estrellas} estrellas: todo se vende ${estado.estrellas * 10}% más caro</span></div>
            <div class="fila-p"><span class="ico-p">🏬</span><span class="txt"><strong>Abrir otra sucursal</strong><small>Empezás de cero (se pierden monedas, mejoras y personal) y ganás ${nuevas} estrella${nuevas === 1 ? "" : "s"}. Ganás más cuanto más vendas en esta.</small></span>
            <button type="button" data-sucursal ${nuevas < 1 ? "disabled" : ""}>${nuevas < 1 ? "Vendé más" : "Abrir"}</button></div>`;
    }
    if (html === ultimoPanel) return;
    ultimoPanel = html;
    $("panel").innerHTML = html;
    for (const c of $("panel").querySelectorAll("canvas[data-prod]")) {
        const ctx = c.getContext("2d");
        ctx.scale(2, 2);
        dibujarProducto(ctx, c.dataset.prod, 22, 18, 32);
    }
}
const formatearSeg = (s) => (s >= 60 ? `${Math.round(s / 6) / 10} min` : `${Math.round(s * 10) / 10} s`);
const costoEncargado = (i) => [150, 2000, 25000, 300000][i] ?? 1e6;
const COSTO_CAJERA = 800;
const estrellasNuevas = () => Math.floor(Math.sqrt(estado.ganadoVida / 20000));
$("panel").addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b || b.disabled) return;
    const d = b.dataset;
    if (d.receta) {
        estado.elegida = d.receta;
        efectos.toque();
    } else if (d.mejora) {
        const q = MEJORAS.find((x) => x.id === d.mejora);
        const n = mejora(q.id);
        if (n >= q.max || estado.monedas < q.costo(n)) return;
        estado.monedas -= q.costo(n);
        estado.mejoras[q.id] = n + 1;
        if (q.id === "horno") estado.hornos.push({ receta: estado.elegida, inicio: 0, fin: 0 });
        efectos.comprar();
    } else if (d.encargado !== undefined) {
        const i = Number(d.encargado);
        if (estado.monedas < costoEncargado(i)) return;
        estado.monedas -= costoEncargado(i);
        estado.encargados[i] = true;
        avisar(`👨‍🍳 El horno ${i + 1} ya tiene encargado`);
        efectos.comprar();
    } else if (d.cajera !== undefined) {
        if (estado.monedas < COSTO_CAJERA) return;
        estado.monedas -= COSTO_CAJERA;
        estado.cajera = true;
        avisar("💁‍♀️ ¡Contrataste a la cajera!");
        efectos.comprar();
    } else if (d.sucursal !== undefined) {
        const nuevas = estrellasNuevas();
        if (nuevas < 1 || !confirm(`¿Abrir otra sucursal? Empezás de cero y ganás ${nuevas} estrellas.`)) return;
        estado.estrellas += nuevas;
        cont.sucursales++;
        Object.assign(estado, NUEVA_VIDA(), { elegida: "pan" });
        clientes.length = 0;
        efectos.fanfarria();
        avisar(`🏬 ¡Nueva sucursal! Tenés ${estado.estrellas} estrellas`);
    }
    refrescar();
});
for (const p of document.querySelectorAll(".pestana-p")) {
    p.addEventListener("click", () => {
        pestana = p.dataset.p;
        for (const x of document.querySelectorAll(".pestana-p")) x.classList.toggle("activa", x === p);
        efectos.toque();
        pintarPanel();
    });
}

function pintarDatos() {
    $("monedas").textContent = formatear(Math.floor(estado.monedas));
    $("nivel").textContent = estado.nivel;
    $("xp").style.width = `${(estado.xp / xpNivel(estado.nivel)) * 100}%`;
}
function refrescar() {
    guardarEstado();
    pintarDatos();
    pintarPanel();
}
function avisar(texto, ms = 2200) {
    $("aviso").textContent = texto;
    $("aviso").hidden = false;
    clearTimeout(avisar.t);
    avisar.t = setTimeout(() => ($("aviso").hidden = true), ms);
}
function guardarEstado() {
    estado.ultimaVez = Date.now();
    guardar(CLAVE, estado);
}

// ---------- Base común ----------
const LOGROS = [
    { id: "venta10", icono: "🥖", nombre: "Primeras ventas", detalle: "Vendé 10 productos", meta: 10, valor: () => cont.vendidos, fichas: 200 },
    { id: "venta200", icono: "🧁", nombre: "Panadería del barrio", detalle: "Vendé 200 productos", meta: 200, valor: () => cont.vendidos, fichas: 1200 },
    { id: "venta2000", icono: "🎂", nombre: "Famosa en la ciudad", detalle: "Vendé 2000 productos", meta: 2000, valor: () => cont.vendidos, fichas: 6000 },
    { id: "hornos4", icono: "🔥", nombre: "Cuatro hornos", detalle: "Tené 4 hornos", meta: 4, valor: () => estado.hornos.length, fichas: 2000 },
    { id: "encargados", icono: "👨‍🍳", nombre: "Equipo completo", detalle: "Contratá encargados para 4 hornos", meta: 4, valor: () => Object.keys(estado.encargados).length, fichas: 4000 },
    { id: "cajera", icono: "💁‍♀️", nombre: "Atención al cliente", detalle: "Contratá a la cajera", meta: 1, valor: () => (estado.cajera ? 1 : 0), fichas: 600 },
    { id: "tarta", icono: "🍓", nombre: "Pastelera", detalle: "Desbloqueá la tarta de frutillas", meta: 10, valor: () => estado.nivel, fichas: 2500 },
    { id: "sucursal", icono: "🏬", nombre: "Cadena de panaderías", detalle: "Abrí otra sucursal", meta: 1, valor: () => cont.sucursales, fichas: 3000 },
    { id: "ganado", icono: "💰", nombre: "Gran negocio", detalle: "Ganá 100K en total", meta: 100000, valor: () => cont.ganado, fichas: 5000 },
];
const base = crearBase({
    juego: "panaderia",
    barra: document.querySelector(".barra-pan"),
    logros: LOGROS,
    audio,
    regaloDiario: (dia) => {
        const m = Math.round(Math.max(50, precioDe(recetasDisponibles().at(-1)) * 4) * dia);
        return { icono: dia === 7 ? "🎂" : "🪙", texto: `${formatear(m)} monedas`, dar: () => ((estado.monedas += m), refrescar()) };
    },
});

// ---------- Mientras no estabas: los hornos con encargado siguen, y si hay cajera se vende ----------
const ausenteTotal = (Date.now() - estado.ultimaVez) / 1000;
const ausente = Math.min(ausenteTotal, 8 * 3600);
let ganadoAusente = 0;
let horneadoAusente = 0;
estado.hornos.forEach((h, i) => {
    if (!estado.encargados[i]) return;
    const r = receta(h.receta);
    const tandas = ausente / tiempoReceta(r);
    horneadoAusente += tandas;
    if (estado.cajera) ganadoAusente += tandas * (precioDe(r) - r.costo) * 0.5; // no todos los clientes compran
});
if (!estado.cajera) {
    // Sin cajera se llena la vitrina
    estado.hornos.forEach((h, i) => {
        if (!estado.encargados[i]) return;
        estado.vitrina[h.receta] = Math.min(capacidad(mejora("vitrina")), enVitrina(h.receta) + Math.floor(ausente / tiempoReceta(receta(h.receta))));
    });
}
estado.monedas += ganadoAusente;
estado.ganadoVida += ganadoAusente;
cont.ganado += ganadoAusente;
const mostro = ausenteTotal > 60 && base.resumenAlVolver(ausenteTotal, [
    { icono: "🥐", texto: "Lo que hornearon los encargados", valor: horneadoAusente >= 1 ? formatear(horneadoAusente) : "" },
    { icono: "🪙", texto: "Lo que vendió la cajera", valor: ganadoAusente >= 1 ? formatear(ganadoAusente) : "" },
]);
if (!mostro) setTimeout(() => base.revisarRegalo(), 600);

// ---------- Ciclo ----------
let acumulado = 0;
let cajeraEspera = 0;
bucle((dt) => {
    const inicio = performance.now();
    // Llegan clientes (como mucho 6 en la fila)
    proximoCliente -= dt;
    if (proximoCliente <= 0) {
        proximoCliente = cadaCuanto() * (0.7 + Math.random() * 0.6);
        if (clientes.filter((c) => c.estado !== "sale").length < 6) nuevoCliente();
    }
    // Encargados: juntan y vuelven a hornear solos
    estado.hornos.forEach((h, i) => {
        if (!estado.encargados[i]) return;
        if (h.fin && h.fin <= Date.now()) {
            if (enVitrina(h.receta) < capacidad(mejora("vitrina"))) juntarHorno(i);
        }
        if (!h.fin && estado.monedas >= receta(h.receta).costo && enVitrina(h.receta) < capacidad(mejora("vitrina"))) hornear(i, h.receta);
    });
    // Cajera: vende sola cada tanto
    if (estado.cajera) {
        cajeraEspera -= dt;
        if (cajeraEspera <= 0) {
            cajeraEspera = 1.3;
            venderAlPrimero();
        }
    }
    dibujar(dt);
    acumulado += dt;
    if (acumulado > 0.5) {
        acumulado = 0;
        pintarDatos();
    } else if (acumulado > 0.25 && acumulado - dt <= 0.25) pintarPanel();
    const ms = performance.now() - inicio;
    base.medir(ms);
    vigilarCalidad(ms);
});
setInterval(guardarEstado, 5000);
addEventListener("pagehide", guardarEstado);
pintarDatos();
pintarPanel();
