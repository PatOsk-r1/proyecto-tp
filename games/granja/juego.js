// Granja: plantá, cosechá, criá animales y cumplí pedidos. Todo crece aunque la app esté cerrada.
import { formatear, cargar, guardar, vibrar } from "../../js/comun3d.js";
import { crearLienzo, bucle, crearChispas } from "../../js/lienzo2d.js";
import { sonidos, volumen, cambiarVolumen } from "./sonido.js";
import { dibujarPersona, frase, GRACIAS } from "./visitas.js";

const $ = (id) => document.getElementById(id);
const CLAVE = "granja";
const TAU = Math.PI * 2;
const COLUMNAS = 4;
const MAX_LOTES = 16;

const CULTIVOS = [
    { id: "trigo", nombre: "Trigo", tiempo: 12, semilla: 2, precio: 5, xp: 1, nivel: 1, color: "#e9c46a" },
    { id: "zanahoria", nombre: "Zanahoria", tiempo: 30, semilla: 6, precio: 15, xp: 2, nivel: 2, color: "#f77f00" },
    { id: "maiz", nombre: "Maíz", tiempo: 60, semilla: 12, precio: 32, xp: 4, nivel: 3, color: "#ffd60a" },
    { id: "tomate", nombre: "Tomate", tiempo: 120, semilla: 25, precio: 70, xp: 7, nivel: 5, color: "#e63946" },
    { id: "calabaza", nombre: "Calabaza", tiempo: 300, semilla: 50, precio: 170, xp: 15, nivel: 7, color: "#fb8500" },
    { id: "frutilla", nombre: "Frutilla", tiempo: 600, semilla: 100, precio: 360, xp: 30, nivel: 9, color: "#ff4d6d" },
    { id: "uva", nombre: "Uva", tiempo: 1200, semilla: 200, precio: 780, xp: 55, nivel: 12, color: "#7209b7" },
];
const ANIMALES = [
    { id: "gallina", nombre: "Gallina", costo: 80, producto: "huevo", nombreProducto: "Huevo", tiempo: 40, precio: 18, xp: 2, nivel: 2, max: 6 },
    { id: "vaca", nombre: "Vaca", costo: 600, producto: "leche", nombreProducto: "Leche", tiempo: 90, precio: 75, xp: 6, nivel: 4, max: 4 },
    { id: "oveja", nombre: "Oveja", costo: 2000, producto: "lana", nombreProducto: "Lana", tiempo: 180, precio: 190, xp: 12, nivel: 6, max: 4 },
    { id: "cerdo", nombre: "Cerdo", costo: 6000, producto: "trufa", nombreProducto: "Trufa", tiempo: 300, precio: 460, xp: 25, nivel: 10, max: 3 },
];
const MEJORAS = [
    { id: "regadera", ico: "💧", nombre: "Regadera", detalle: "Los cultivos crecen 8% más rápido", max: 5, costo: (n) => 150 * 3 ** n },
    { id: "abono", ico: "🌿", nombre: "Abono", detalle: "+10% de chance de cosecha doble", max: 5, costo: (n) => 200 * 3 ** n },
    { id: "mercado", ico: "🏪", nombre: "Puesto en el mercado", detalle: "Todo se vende 8% más caro", max: 5, costo: (n) => 300 * 3 ** n },
    { id: "comedero", ico: "🌾", nombre: "Comedero", detalle: "Los animales producen 10% más rápido", max: 5, costo: (n) => 400 * 3 ** n },
    { id: "granjero", ico: "👩‍🌾", nombre: "Granjero", detalle: "Cosecha y vuelve a plantar solo", max: 1, costo: () => 5000 },
];
const PRODUCTOS = Object.fromEntries([
    ...CULTIVOS.map((c) => [c.id, { nombre: c.nombre, precio: c.precio, color: c.color }]),
    ...ANIMALES.map((a) => [a.producto, { nombre: a.nombreProducto, precio: a.precio, color: "#fff" }]),
]);

const estado = cargar(CLAVE, { monedas: 30, xp: 0, nivel: 1, lotes: 6, parcelas: [], animales: [], granero: {}, mejoras: {}, pedidos: [], elegida: "trigo" });
const mejora = (id) => estado.mejoras[id] ?? 0;
const xpParaNivel = (n) => Math.round(12 * n ** 1.6);
const tiempoCultivo = (c) => c.tiempo * (1 - mejora("regadera") * 0.08) * 1000;
const tiempoAnimal = (a) => a.tiempo * (1 - mejora("comedero") * 0.1) * 1000;
const precioVenta = (id) => Math.round(PRODUCTOS[id].precio * (1 + mejora("mercado") * 0.08));
const cultivo = (id) => CULTIVOS.find((c) => c.id === id);
const animal = (id) => ANIMALES.find((a) => a.id === id);
const costoLote = () => Math.round(50 * 2.2 ** (estado.lotes - 6));
const enGranero = () => Object.values(estado.granero).reduce((t, n) => t + n, 0);

// ---------- Lienzo ----------
const chispas = crearChispas();
let ancho = 300;
let alto = 300;
let fondoCache = null; // pasto, colinas, granero y corral (lo que no se mueve), redibujado al cambiar de tamaño

// Nombre para el cartel de la granja: el de usuario (se guarda para mostrarlo enseguida la próxima vez)
let nombreGranja = "";
try {
    nombreGranja = localStorage.getItem("granja-nombre") || "";
} catch {}
(async () => {
    try {
        const { usuarioActual } = await import("../../js/sesion.js");
        const usuario = await usuarioActual();
        if (!usuario) return;
        let nombre = "";
        try {
            const { miPerfil } = await import("../../js/multijugador.js");
            nombre = (await miPerfil())?.nombre ?? "";
        } catch {}
        nombre ||= usuario.displayName || (usuario.email ?? "").split("@")[0];
        nombre = nombre.slice(0, 20);
        if (nombre && nombre !== nombreGranja) {
            nombreGranja = nombre;
            fondoCache = null;
            try {
                localStorage.setItem("granja-nombre", nombre);
            } catch {}
        }
    } catch {}
})();
const lienzo = crearLienzo($("lienzo"), (d) => {
    ancho = d.ancho;
    alto = d.alto;
    fondoCache = null;
});
const vuelos = [];
const textos = [];
const rebotes = {}; // parcela → momento en que se plantó o cosechó (para el saltito)
const nubes = Array.from({ length: 4 }, (_, i) => ({ x: Math.random(), y: 0.15 + i * 0.12, v: 0.004 + Math.random() * 0.006, s: 0.6 + Math.random() * 0.5 }));

// Lluvia: al tocar una nube llueve un rato y los cultivos crecen más rápido. Después hay que esperar para otra.
const LLUVIA_SEG = 8;
const LLUVIA_ESPERA = 25;
const LLUVIA_EXTRA = 0.6; // 60% más rápido mientras llueve
let lluvia = 0; // segundos que quedan de lluvia
let esperaLluvia = 0;
let nubeLluvia = null;
const gotas = [];
function nubeEn(x, y) {
    const m = medidas();
    return nubes.find((n) => Math.hypot(n.x * ancho - x, m.cielo * n.y + 6 - y) < 26 * n.s + 10) ?? null;
}
function hacerLlover(n) {
    if (lluvia > 0) return;
    if (esperaLluvia > 0) return avisar(`☁️ Las nubes se están cargando… (${Math.ceil(esperaLluvia)} s)`);
    lluvia = LLUVIA_SEG;
    esperaLluvia = LLUVIA_SEG + LLUVIA_ESPERA;
    nubeLluvia = n;
    avisar("🌧️ ¡Lluvia! Los cultivos crecen más rápido", 2400);
    vibrar([20, 30, 20]);
    sonidos.lluvia(LLUVIA_SEG);
}
function avanzarLluvia(dt) {
    esperaLluvia = Math.max(0, esperaLluvia - dt);
    if (lluvia <= 0) return;
    lluvia = Math.max(0, lluvia - dt);
    // Adelanta lo que está creciendo (se guarda solo, porque cambia cuándo se plantó)
    for (const p of estado.parcelas) if (p && progreso(p) < 1) p.desde -= dt * 1000 * LLUVIA_EXTRA;
    if (lluvia === 0) nubeLluvia = null;
}
const mariposas = Array.from({ length: 3 }, (_, i) => ({ x: Math.random(), y: 0.3 + Math.random() * 0.4, fase: i * 2, color: ["#ffd166", "#ff8fab", "#a0c4ff"][i] }));
const luciernagas = Array.from({ length: 14 }, () => ({ x: Math.random(), y: 0.2 + Math.random() * 0.8, fase: Math.random() * 10 }));

// Medidas: cielo arriba, parcelas en el medio y corral abajo
function medidas() {
    const cielo = Math.min(alto * 0.15, 86);
    const corral = alto * 0.24;
    const filas = MAX_LOTES / COLUMNAS;
    const hueco = 8;
    const zonaH = alto - cielo - corral - 8;
    const lado = Math.min((ancho - 24) / COLUMNAS, zonaH / filas) - hueco;
    const ox = (ancho - COLUMNAS * (lado + hueco)) / 2 + hueco / 2;
    const oy = cielo + 4 + (zonaH - filas * (lado + hueco)) / 2;
    return { lado, ox, oy, hueco, cielo, corralY: alto - corral, corral };
}
const rectParcela = (i, m = medidas()) => ({
    x: m.ox + (i % COLUMNAS) * (m.lado + m.hueco),
    y: m.oy + Math.floor(i / COLUMNAS) * (m.lado + m.hueco),
    w: m.lado,
    h: m.lado,
});

// Azar repetible (para que el pasto y las flores no cambien de lugar en cada cuadro)
function azar(semilla) {
    return () => {
        semilla = (semilla * 16807) % 2147483647;
        return semilla / 2147483647;
    };
}

// Hora del día real: 0 = de noche, 1 = pleno día (con amanecer y atardecer suaves)
function luzDelDia() {
    const d = new Date();
    const h = d.getHours() + d.getMinutes() / 60;
    if (h >= 8 && h <= 18.5) return 1;
    if (h <= 5.5 || h >= 21) return 0;
    return h < 12 ? (h - 5.5) / 2.5 : (21 - h) / 2.5;
}

// ---------- Lógica ----------
function progreso(p) {
    if (!p) return 0;
    return Math.min(1, (Date.now() - p.desde) / tiempoCultivo(cultivo(p.cultivo)));
}

function sumarXP(n) {
    estado.xp += n;
    while (estado.xp >= xpParaNivel(estado.nivel)) {
        estado.xp -= xpParaNivel(estado.nivel);
        estado.nivel++;
        const nuevos = [...CULTIVOS, ...ANIMALES].filter((x) => x.nivel === estado.nivel).map((x) => x.nombre);
        avisar(`⭐ ¡Nivel ${estado.nivel}!${nuevos.length ? " Nuevo: " + nuevos.join(", ") : ""}`, 2600);
        chispas.emitir(ancho / 2, alto / 3, "#ffd166", 40, 260);
        vibrar([40, 60, 80]);
        sonidos.nivel();
    }
}

function plantar(i, id) {
    const c = cultivo(id);
    if (!c || estado.monedas < c.semilla) return false;
    estado.monedas -= c.semilla;
    estado.parcelas[i] = { cultivo: id, desde: Date.now() };
    rebotes[i] = performance.now();
    return true;
}

function cosechar(i, automatico = false) {
    const p = estado.parcelas[i];
    if (!p || progreso(p) < 1) return;
    const c = cultivo(p.cultivo);
    const cantidad = Math.random() < mejora("abono") * 0.1 ? 2 : 1;
    estado.granero[c.id] = (estado.granero[c.id] ?? 0) + cantidad;
    sumarXP(c.xp * cantidad);
    estado.parcelas[i] = null;
    rebotes[i] = performance.now();
    const r = rectParcela(i);
    if (!automatico) {
        vuelos.push({ x: r.x + r.w / 2, y: r.y + r.h / 2, id: c.id, t: 0 });
        chispas.emitir(r.x + r.w / 2, r.y + r.h / 2, c.color, 10, 120);
        textos.push({ x: r.x + r.w / 2, y: r.y, t: `+${cantidad} ${c.nombre}${cantidad > 1 ? " ¡doble!" : ""}`, vida: 1 });
        vibrar(15);
        sonidos.cosechar();
    }
    // El granjero vuelve a plantar lo mismo
    if (mejora("granjero")) plantar(i, c.id);
}

function recoger(k) {
    const a = estado.animales[k];
    const datos = animal(a.tipo);
    if (Date.now() - a.desde < tiempoAnimal(datos)) return false;
    a.desde = Date.now();
    estado.granero[datos.producto] = (estado.granero[datos.producto] ?? 0) + 1;
    sumarXP(datos.xp);
    const pos = posAnimal(k);
    vuelos.push({ x: pos.x, y: pos.y - 20, id: datos.producto, t: 0 });
    textos.push({ x: pos.x, y: pos.y - 30, t: `+1 ${datos.nombreProducto}`, vida: 1 });
    vibrar(15);
    sonidos[a.tipo]?.();
    return true;
}

// Pedidos: piden cosas que ya podés producir y pagan más que el mercado
function nuevoPedido() {
    const disponibles = [...CULTIVOS.filter((c) => c.nivel <= estado.nivel).map((c) => c.id), ...ANIMALES.filter((a) => estado.animales.some((x) => x.tipo === a.id)).map((a) => a.producto)];
    const items = {};
    const cuantos = 1 + Math.floor(Math.random() * Math.min(3, disponibles.length));
    for (let k = 0; k < cuantos; k++) {
        const id = disponibles[Math.floor(Math.random() * disponibles.length)];
        items[id] = (items[id] ?? 0) + 1 + Math.floor(Math.random() * Math.max(2, 7 - PRODUCTOS[id].precio / 40));
    }
    const valor = Object.entries(items).reduce((t, [id, n]) => t + PRODUCTOS[id].precio * n, 0);
    const nombres = ["Doña Rosa", "El panadero", "La escuela", "Don Tito", "El restaurante", "La feria", "Abuela Marta"];
    return { quien: nombres[Math.floor(Math.random() * nombres.length)], items, premio: Math.round(valor * 1.6), xp: Math.round(valor / 8) + 2 };
}
while (estado.pedidos.length < 3) estado.pedidos.push(nuevoPedido());
const sePuede = (p) => Object.entries(p.items).every(([id, n]) => (estado.granero[id] ?? 0) >= n);

// ---------- Corral ----------
const andar = [];
function posAnimal(k) {
    const m = medidas();
    if (!andar[k]) andar[k] = { x: 0.1 + Math.random() * 0.8, y: Math.random(), vx: (Math.random() - 0.5) * 0.06, fase: Math.random() * 6 };
    const a = andar[k];
    return { x: 20 + a.x * (ancho - 40), y: m.corralY + 30 + a.y * (m.corral - 50) };
}

// ---------- Dibujo ----------
function dibujarPlanta(ctx, id, x, y, tam, prog, tiempo) {
    const c = cultivo(id);
    const vaiven = Math.sin(tiempo * 2 + x) * 0.06;
    ctx.save();
    ctx.translate(x, y);
    if (prog < 0.2) {
        // Montoncito de tierra recién sembrado con las semillas asomando
        ctx.fillStyle = "#4a2e17";
        ctx.beginPath();
        ctx.ellipse(0, tam * 0.08, tam * 0.2, tam * 0.07, 0, 0, TAU);
        ctx.fill();
        ctx.fillStyle = "#f2d49b";
        for (const [dx, dy] of [[-0.09, 0.06], [0.07, 0.09], [0, 0.04]]) {
            ctx.beginPath();
            ctx.ellipse(dx * tam, dy * tam, tam * 0.025, tam * 0.018, dx * 6, 0, TAU);
            ctx.fill();
        }
        ctx.restore();
        return;
    }
    ctx.rotate(vaiven);
    const verde = "#52b788";
    if (prog < 1) {
        // Brote que va creciendo: más alto y con más hojas a medida que avanza
        const s = 0.45 + prog * 0.55;
        const hoja = (x, y, rx, ry, giro) => {
            const g = ctx.createLinearGradient(x - rx, y, x + rx, y);
            g.addColorStop(0, "#2d6a4f");
            g.addColorStop(1, "#74c69d");
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.ellipse(x, y, rx, ry, giro, 0, TAU);
            ctx.fill();
        };
        ctx.fillStyle = "#4a2e17";
        ctx.beginPath();
        ctx.ellipse(0, tam * 0.2, tam * 0.16, tam * 0.05, 0, 0, TAU);
        ctx.fill();
        ctx.strokeStyle = "#2d6a4f";
        ctx.lineWidth = Math.max(2, tam * 0.03);
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(0, tam * 0.2);
        ctx.quadraticCurveTo(tam * 0.03, 0, 0, -tam * 0.2 * s);
        ctx.stroke();
        hoja(-tam * 0.1 * s, -tam * 0.02, tam * 0.12 * s, tam * 0.05 * s, 0.5);
        hoja(tam * 0.1 * s, -tam * 0.06, tam * 0.12 * s, tam * 0.05 * s, -0.5);
        if (prog >= 0.55) {
            hoja(-tam * 0.12 * s, -tam * 0.16 * s, tam * 0.1 * s, tam * 0.045 * s, 0.8);
            hoja(tam * 0.12 * s, -tam * 0.2 * s, tam * 0.1 * s, tam * 0.045 * s, -0.8);
            // Un adelanto del fruto
            ctx.fillStyle = c.color;
            ctx.globalAlpha = (prog - 0.55) * 1.6;
            ctx.beginPath();
            ctx.arc(0, -tam * 0.22 * s, tam * 0.04, 0, TAU);
            ctx.fill();
            ctx.globalAlpha = 1;
        }
        ctx.restore();
        return;
    }
    // Halo dorado detrás de lo que está listo
    const halo = ctx.createRadialGradient(0, 0, 0, 0, 0, tam * 0.42);
    halo.addColorStop(0, "#fff3b066");
    halo.addColorStop(1, "#fff3b000");
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(0, 0, tam * 0.42, 0, TAU);
    ctx.fill();
    ctx.scale(1.12, 1.12);
    // Maduro: cada cultivo con su dibujo
    if (id === "trigo") {
        ctx.strokeStyle = "#b08900";
        ctx.lineWidth = 2;
        for (let k = -2; k <= 2; k++) {
            ctx.beginPath();
            ctx.moveTo(k * tam * 0.06, tam * 0.2);
            ctx.lineTo(k * tam * 0.09, -tam * 0.2);
            ctx.stroke();
            ctx.fillStyle = c.color;
            ctx.beginPath();
            ctx.ellipse(k * tam * 0.09, -tam * 0.26, tam * 0.035, tam * 0.09, k * 0.1, 0, TAU);
            ctx.fill();
        }
    } else if (id === "zanahoria") {
        ctx.fillStyle = c.color;
        ctx.beginPath();
        ctx.moveTo(-tam * 0.08, tam * 0.02);
        ctx.lineTo(tam * 0.08, tam * 0.02);
        ctx.lineTo(0, tam * 0.24);
        ctx.fill();
        ctx.fillStyle = verde;
        for (const r of [-0.4, 0, 0.4]) {
            ctx.save();
            ctx.rotate(r);
            ctx.beginPath();
            ctx.ellipse(0, -tam * 0.12, tam * 0.04, tam * 0.14, 0, 0, TAU);
            ctx.fill();
            ctx.restore();
        }
    } else if (id === "maiz") {
        ctx.fillStyle = "#40916c";
        ctx.fillRect(-2, -tam * 0.25, 4, tam * 0.45);
        ctx.fillStyle = c.color;
        ctx.beginPath();
        ctx.ellipse(tam * 0.06, -tam * 0.05, tam * 0.06, tam * 0.15, 0.2, 0, TAU);
        ctx.fill();
        ctx.fillStyle = verde;
        ctx.beginPath();
        ctx.ellipse(-tam * 0.08, 0, tam * 0.04, tam * 0.16, -0.5, 0, TAU);
        ctx.fill();
    } else if (id === "tomate" || id === "frutilla" || id === "uva") {
        const mata = ctx.createRadialGradient(-tam * 0.05, -tam * 0.08, 0, 0, -tam * 0.02, tam * 0.24);
        mata.addColorStop(0, "#74c69d");
        mata.addColorStop(1, "#2d6a4f");
        ctx.fillStyle = mata;
        for (const [dx, dy, rr] of [[0, -0.04, 0.17], [-0.1, 0.03, 0.12], [0.1, 0.03, 0.12]]) {
            ctx.beginPath();
            ctx.arc(dx * tam, dy * tam, rr * tam, 0, TAU);
            ctx.fill();
        }
        const puntos = id === "uva" ? [[-0.08, -0.05], [0, -0.05], [0.08, -0.05], [-0.04, 0.04], [0.04, 0.04], [0, 0.12]] : [[-0.1, -0.08], [0.1, -0.05], [0, 0.08], [-0.12, 0.08], [0.12, 0.1]];
        for (const [dx, dy] of puntos) {
            const rf = tam * (id === "uva" ? 0.055 : 0.065);
            const g = ctx.createRadialGradient(dx * tam - rf * 0.35, dy * tam - rf * 0.35, 0, dx * tam, dy * tam, rf);
            g.addColorStop(0, "#ffffffdd");
            g.addColorStop(0.3, c.color);
            g.addColorStop(0.85, c.color);
            g.addColorStop(1, "#00000088");
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(dx * tam, dy * tam, tam * (id === "uva" ? 0.055 : 0.065), 0, TAU);
            ctx.fill();
        }
    } else if (id === "calabaza") {
        const g = ctx.createRadialGradient(-tam * 0.06, -tam * 0.05, 2, 0, 0, tam * 0.24);
        g.addColorStop(0, "#ffd29d");
        g.addColorStop(0.4, c.color);
        g.addColorStop(1, "#9c4a00");
        ctx.fillStyle = g;
        for (const dx of [-0.1, 0.1, 0]) {
            ctx.beginPath();
            ctx.ellipse(dx * tam, tam * 0.05, tam * 0.13, tam * 0.15, 0, 0, TAU);
            ctx.fill();
        }
        ctx.fillStyle = "#40916c";
        ctx.fillRect(-2, -tam * 0.16, 4, tam * 0.08);
    }
    ctx.restore();
    // Brillito de "listo"
    const t = (tiempo * 1.5 + x * 0.01) % 1;
    ctx.fillStyle = `rgba(255,255,200,${1 - t})`;
    ctx.beginPath();
    ctx.arc(x + tam * 0.22, y - tam * 0.3 - t * 6, 2.5, 0, TAU);
    ctx.fill();
}

function dibujarAnimal(ctx, tipo, x, y, tam, fase, mira = 1) {
    const salto = Math.abs(Math.sin(fase * 4)) * 2;
    ctx.save();
    ctx.translate(x, y - salto);
    ctx.scale(mira, 1);
    ctx.fillStyle = "#0003";
    ctx.beginPath();
    ctx.ellipse(0, tam * 0.45 + salto, tam * 0.4, tam * 0.1, 0, 0, TAU);
    ctx.fill();
    if (tipo === "gallina") {
        ctx.fillStyle = "#fff";
        ctx.beginPath();
        ctx.ellipse(0, 0, tam * 0.3, tam * 0.25, 0, 0, TAU);
        ctx.arc(tam * 0.2, -tam * 0.22, tam * 0.15, 0, TAU);
        ctx.fill();
        ctx.fillStyle = "#e63946";
        ctx.beginPath();
        ctx.arc(tam * 0.22, -tam * 0.38, tam * 0.06, 0, TAU);
        ctx.fill();
        ctx.fillStyle = "#ffb703";
        ctx.beginPath();
        ctx.moveTo(tam * 0.33, -tam * 0.24);
        ctx.lineTo(tam * 0.45, -tam * 0.2);
        ctx.lineTo(tam * 0.33, -tam * 0.16);
        ctx.fill();
        ctx.fillRect(-tam * 0.08, tam * 0.22, 2, tam * 0.15);
        ctx.fillRect(tam * 0.06, tam * 0.22, 2, tam * 0.15);
    } else {
        const cuerpo = { vaca: "#fff", oveja: "#f1f1f1", cerdo: "#ffafcc" }[tipo];
        ctx.fillStyle = "#333";
        for (const dx of [-0.25, -0.1, 0.12, 0.27]) ctx.fillRect(dx * tam, tam * 0.15, tam * 0.07, tam * 0.28);
        ctx.fillStyle = cuerpo;
        if (tipo === "oveja") {
            for (const [dx, dy] of [[-0.2, 0], [0, -0.08], [0.18, 0], [-0.1, 0.1], [0.1, 0.1], [0, 0.04]]) {
                ctx.beginPath();
                ctx.arc(dx * tam, dy * tam, tam * 0.17, 0, TAU);
                ctx.fill();
            }
            ctx.fillStyle = "#333";
            ctx.beginPath();
            ctx.ellipse(tam * 0.38, -tam * 0.08, tam * 0.11, tam * 0.13, 0, 0, TAU);
            ctx.fill();
        } else {
            ctx.beginPath();
            ctx.ellipse(0, 0, tam * 0.38, tam * 0.24, 0, 0, TAU);
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(tam * 0.38, -tam * 0.1, tam * 0.15, tam * 0.13, 0, 0, TAU);
            ctx.fill();
            if (tipo === "vaca") {
                ctx.fillStyle = "#222";
                ctx.beginPath();
                ctx.ellipse(-tam * 0.12, -tam * 0.05, tam * 0.1, tam * 0.08, 0.3, 0, TAU);
                ctx.ellipse(tam * 0.12, tam * 0.07, tam * 0.08, tam * 0.06, 0, 0, TAU);
                ctx.fill();
                ctx.fillStyle = "#ffafcc";
                ctx.beginPath();
                ctx.ellipse(tam * 0.48, -tam * 0.04, tam * 0.07, tam * 0.06, 0, 0, TAU);
                ctx.fill();
            } else {
                ctx.fillStyle = "#ff8fab";
                ctx.beginPath();
                ctx.ellipse(tam * 0.5, -tam * 0.08, tam * 0.06, tam * 0.07, 0, 0, TAU);
                ctx.fill();
            }
        }
        ctx.fillStyle = "#000";
        ctx.beginPath();
        ctx.arc(tam * 0.4, -tam * 0.14, 1.8, 0, TAU);
        ctx.fill();
    }
    ctx.restore();
}

function iconoProducto(ctx, id, x, y, tam) {
    if (cultivo(id)) return dibujarPlanta(ctx, id, x, y + tam * 0.1, tam * 1.6, 1, 0);
    ctx.save();
    ctx.translate(x, y);
    // Contorno suave para que lo blanco se vea también sobre el papel crema
    ctx.strokeStyle = "#b8925a";
    ctx.lineWidth = 1.5;
    if (id === "huevo") {
        const g = ctx.createRadialGradient(-tam * 0.07, -tam * 0.1, 0, 0, 0, tam * 0.32);
        g.addColorStop(0, "#ffffff");
        g.addColorStop(1, "#f2dcb3");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.ellipse(0, 0, tam * 0.22, tam * 0.3, 0, 0, TAU);
        ctx.fill();
        ctx.stroke();
    } else if (id === "leche") {
        ctx.fillStyle = "#fff";
        ctx.fillRect(-tam * 0.18, -tam * 0.2, tam * 0.36, tam * 0.45);
        ctx.strokeRect(-tam * 0.18, -tam * 0.2, tam * 0.36, tam * 0.45);
        ctx.fillStyle = "#4361ee";
        ctx.fillRect(-tam * 0.18, -tam * 0.02, tam * 0.36, tam * 0.1);
        ctx.fillStyle = "#adb5bd";
        ctx.beginPath();
        ctx.moveTo(-tam * 0.18, -tam * 0.2);
        ctx.lineTo(0, -tam * 0.36);
        ctx.lineTo(tam * 0.18, -tam * 0.2);
        ctx.fill();
    } else if (id === "lana") {
        ctx.fillStyle = "#f1f1f1";
        for (const [dx, dy] of [[-0.1, 0], [0.1, 0], [0, -0.1], [0, 0.08]]) {
            ctx.beginPath();
            ctx.arc(dx * tam, dy * tam, tam * 0.15, 0, TAU);
            ctx.stroke();
        }
        for (const [dx, dy] of [[-0.1, 0], [0.1, 0], [0, -0.1], [0, 0.08]]) {
            ctx.beginPath();
            ctx.arc(dx * tam, dy * tam, tam * 0.15, 0, TAU);
            ctx.fill();
        }
    } else {
        ctx.fillStyle = "#6f4518";
        ctx.beginPath();
        ctx.arc(0, 0, tam * 0.24, 0, TAU);
        ctx.fill();
        ctx.fillStyle = "#3d2512";
        ctx.beginPath();
        ctx.arc(-tam * 0.06, -tam * 0.05, tam * 0.06, 0, TAU);
        ctx.fill();
    }
    ctx.restore();
}

const mezclar = (a, b, t) => {
    const ca = a.match(/\w\w/g).map((h) => parseInt(h, 16));
    const cb = b.match(/\w\w/g).map((h) => parseInt(h, 16));
    return `rgb(${ca.map((v, i) => Math.round(v + (cb[i] - v) * t)).join(",")})`;
};

// Cielo según la hora: sol o luna, nubes que pasan y estrellas de noche
function dibujarCielo(ctx, m, luz, tiempo, dt) {
    const g = ctx.createLinearGradient(0, 0, 0, m.cielo + 20);
    const atardecer = luz > 0 && luz < 1 ? 1 - Math.abs(luz - 0.5) * 2 : 0;
    g.addColorStop(0, mezclar("0b1d3a", atardecer ? "ff9e7a" : "5fb3e8", Math.max(luz, atardecer)));
    g.addColorStop(1, mezclar("1d3557", atardecer ? "ffd6a5" : "c9ecff", Math.max(luz, atardecer)));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, ancho, m.cielo + 20);
    if (luz < 0.6) {
        ctx.fillStyle = "#fff";
        const r = azar(7);
        for (let k = 0; k < 26; k++) {
            ctx.globalAlpha = (0.6 - luz) * (0.5 + 0.5 * Math.sin(tiempo * 2 + k));
            ctx.fillRect(r() * ancho, r() * m.cielo * 0.8, 1.5, 1.5);
        }
        ctx.globalAlpha = 1;
    }
    // Sol de día, luna de noche
    const x = ancho * 0.66;
    const y = m.cielo * (0.95 - Math.max(luz, 0.4) * 0.55);
    const astro = ctx.createRadialGradient(x, y, 0, x, y, m.cielo * 0.4);
    if (luz > 0.4) {
        astro.addColorStop(0, "#fff7c2");
        astro.addColorStop(0.3, "#ffd166");
        astro.addColorStop(1, "#ffd16600");
    } else {
        astro.addColorStop(0, "#f8f9fa");
        astro.addColorStop(0.25, "#dee2e6");
        astro.addColorStop(1, "#dee2e600");
    }
    ctx.fillStyle = astro;
    ctx.beginPath();
    ctx.arc(x, y, m.cielo * 0.4, 0, TAU);
    ctx.fill();
    for (const n of nubes) {
        n.x += n.v * dt;
        if (n.x > 1.25) n.x = -0.25;
        const llueve = n === nubeLluvia;
        ctx.fillStyle = llueve ? "#7d8597" : luz > 0.4 ? (esperaLluvia > 0 ? "#ffffffb0" : "#ffffffd9") : "#ffffff30";
        const cx = n.x * ancho + (llueve ? Math.sin(tiempo * 30) * 0.8 : 0);
        const cy = m.cielo * n.y + 6;
        for (const [dx, dy, r] of [[0, 0, 13], [14, 3, 10], [-14, 3, 9], [6, -6, 9]]) {
            ctx.beginPath();
            ctx.arc(cx + dx * n.s, cy + dy * n.s, r * n.s, 0, TAU);
            ctx.fill();
        }
    }
}

// Lo que no se mueve, pintado una sola vez: colinas, granero, pasto, flores y el corral
function pintarFondo(m) {
    const escala = Math.min(devicePixelRatio, 2);
    const c = document.createElement("canvas");
    c.width = Math.max(1, Math.round(ancho * escala));
    c.height = Math.max(1, Math.round(alto * escala));
    const ctx = c.getContext("2d");
    ctx.scale(escala, escala);
    const r = azar(42);
    // Colinas lejanas
    for (const [color, alturaCol, fase] of [["#76b583", 0.55, 0.3], ["#5aa469", 0.3, 1.7]]) {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(0, m.cielo + 10);
        for (let x = 0; x <= ancho; x += 8) ctx.lineTo(x, m.cielo - m.cielo * alturaCol * (0.6 + 0.4 * Math.sin(x / ancho * 5 + fase)));
        ctx.lineTo(ancho, m.cielo + 10);
        ctx.fill();
    }
    // Arbolitos en el horizonte
    for (let k = 0; k < 7; k++) {
        const x = r() * ancho;
        const y = m.cielo - 2 - r() * m.cielo * 0.15;
        const t = 7 + r() * 6;
        ctx.fillStyle = "#6f4518";
        ctx.fillRect(x - 1.5, y - t * 0.4, 3, t * 0.6);
        ctx.fillStyle = r() > 0.5 ? "#2d6a4f" : "#40916c";
        ctx.beginPath();
        ctx.arc(x, y - t * 0.8, t * 0.6, 0, TAU);
        ctx.fill();
    }
    // Granero rojo
    const gx = ancho * 0.08;
    const gw = Math.min(70, ancho * 0.18);
    const gh = gw * 0.7;
    const gy = m.cielo + 4 - gh;
    ctx.fillStyle = "#0003";
    ctx.beginPath();
    ctx.ellipse(gx + gw / 2, m.cielo + 4, gw * 0.65, 5, 0, 0, TAU);
    ctx.fill();
    const pared = ctx.createLinearGradient(gx, 0, gx + gw, 0);
    pared.addColorStop(0, "#c1121f");
    pared.addColorStop(1, "#8a0e17");
    ctx.fillStyle = pared;
    ctx.fillRect(gx, gy + gh * 0.35, gw, gh * 0.65);
    ctx.fillStyle = "#6a040f";
    ctx.beginPath();
    ctx.moveTo(gx - 4, gy + gh * 0.38);
    ctx.lineTo(gx + gw / 2, gy - gh * 0.05);
    ctx.lineTo(gx + gw + 4, gy + gh * 0.38);
    ctx.fill();
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    const px = gx + gw * 0.3;
    const pw = gw * 0.4;
    const py = gy + gh * 0.55;
    const ph = gh * 0.45;
    ctx.strokeRect(px, py, pw, ph);
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(px + pw, py + ph);
    ctx.moveTo(px + pw, py);
    ctx.lineTo(px, py + ph);
    ctx.stroke();
    ctx.fillStyle = "#ffd166";
    ctx.fillRect(gx + gw / 2 - 4, gy + gh * 0.2, 8, 7);

    // Cartel de madera: "La granja de (nombre)"
    {
        const texto = nombreGranja ? `La granja de ${nombreGranja}` : "Mi granja";
        let letra = Math.min(16, m.cielo * 0.2);
        ctx.font = `900 ${letra}px system-ui, sans-serif`;
        const maximo = ancho * 0.5;
        while (letra > 8 && ctx.measureText(texto).width > maximo - 24) {
            letra -= 0.5;
            ctx.font = `900 ${letra}px system-ui, sans-serif`;
        }
        const tw = ctx.measureText(texto).width + 24;
        const th = letra * 1.9;
        const cx = Math.max(gx + gw + 8 + tw / 2, ancho * 0.42);
        const by = Math.max(4, m.cielo - 6 - th);
        // Postes
        for (const lado of [-1, 1]) {
            const px = cx + lado * (tw / 2 - 12);
            ctx.fillStyle = "#5c3a1e";
            ctx.fillRect(px - 2.5, by + th - 4, 5, m.cielo + 6 - (by + th - 4));
        }
        ctx.fillStyle = "#0003";
        ctx.beginPath();
        ctx.roundRect(cx - tw / 2 + 2, by + 3, tw, th, 6);
        ctx.fill();
        const tabla = ctx.createLinearGradient(0, by, 0, by + th);
        tabla.addColorStop(0, "#d4a373");
        tabla.addColorStop(1, "#9c6b3f");
        ctx.fillStyle = tabla;
        ctx.beginPath();
        ctx.roundRect(cx - tw / 2, by, tw, th, 6);
        ctx.fill();
        ctx.strokeStyle = "#5c3a1e";
        ctx.lineWidth = 2;
        ctx.stroke();
        // Vetas de la madera
        ctx.strokeStyle = "#00000018";
        ctx.lineWidth = 1;
        for (const k of [0.33, 0.66]) {
            ctx.beginPath();
            ctx.moveTo(cx - tw / 2 + 6, by + th * k);
            ctx.lineTo(cx + tw / 2 - 6, by + th * k);
            ctx.stroke();
        }
        // Clavitos
        ctx.fillStyle = "#4a2e17";
        for (const lado of [-1, 1]) {
            ctx.beginPath();
            ctx.arc(cx + lado * (tw / 2 - 6), by + th / 2, 1.8, 0, TAU);
            ctx.fill();
        }
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "#fff4dc";
        ctx.fillText(texto, cx, by + th / 2 + 1.5);
        ctx.fillStyle = "#3a2400";
        ctx.fillText(texto, cx, by + th / 2);
    }

    // Pasto con textura
    const pasto = ctx.createLinearGradient(0, m.cielo, 0, alto);
    pasto.addColorStop(0, "#7cc68a");
    pasto.addColorStop(1, "#4c9a5b");
    ctx.fillStyle = pasto;
    ctx.fillRect(0, m.cielo + 4, ancho, alto - m.cielo);
    for (let k = 0; k < 260; k++) {
        const x = r() * ancho;
        const y = m.cielo + 6 + r() * (alto - m.cielo);
        ctx.strokeStyle = r() > 0.5 ? "#ffffff1c" : "#1b433222";
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + (r() - 0.5) * 3, y - 4 - r() * 3);
        ctx.stroke();
    }
    // Flores en los bordes
    for (let k = 0; k < 22; k++) {
        const x = r() < 0.5 ? r() * m.ox * 0.9 : ancho - r() * m.ox * 0.9;
        const y = m.oy + r() * (m.corralY - m.oy);
        ctx.fillStyle = ["#ffffff", "#ffd166", "#ff8fab", "#c9a7ff"][k % 4];
        for (let p = 0; p < 5; p++) {
            ctx.beginPath();
            ctx.arc(x + Math.cos((p / 5) * TAU) * 2.4, y + Math.sin((p / 5) * TAU) * 2.4, 1.8, 0, TAU);
            ctx.fill();
        }
        ctx.fillStyle = "#e09f3e";
        ctx.beginPath();
        ctx.arc(x, y, 1.4, 0, TAU);
        ctx.fill();
    }
    // Zona arada detrás de las parcelas
    ctx.fillStyle = "#3d251222";
    ctx.beginPath();
    ctx.roundRect(m.ox - 8, m.oy - 8, COLUMNAS * (m.lado + m.hueco) + 8, (MAX_LOTES / COLUMNAS) * (m.lado + m.hueco) + 8, 18);
    ctx.fill();

    // Corral: pasto más claro, bebedero, fardo de pasto y cerca de madera
    const cy = m.corralY;
    const corral = ctx.createLinearGradient(0, cy, 0, alto);
    corral.addColorStop(0, "#a7dca5");
    corral.addColorStop(1, "#7cc68a");
    ctx.fillStyle = corral;
    ctx.fillRect(0, cy, ancho, m.corral);
    for (let k = 0; k < 18; k++) {
        ctx.fillStyle = "#c9a26b55";
        ctx.beginPath();
        ctx.ellipse(r() * ancho, cy + 24 + r() * (m.corral - 30), 6 + r() * 6, 2 + r() * 2, 0, 0, TAU);
        ctx.fill();
    }
    const bx = ancho - 58;
    const by = alto - 22;
    ctx.fillStyle = "#5c3a1e";
    ctx.beginPath();
    ctx.roundRect(bx, by, 44, 12, 4);
    ctx.fill();
    ctx.fillStyle = "#48cae4";
    ctx.fillRect(bx + 3, by + 2, 38, 4);
    const fx = 14;
    const fy = alto - 30;
    const fardo = ctx.createLinearGradient(fx, fy, fx, fy + 20);
    fardo.addColorStop(0, "#f4d58d");
    fardo.addColorStop(1, "#d4a24c");
    ctx.fillStyle = fardo;
    ctx.beginPath();
    ctx.roundRect(fx, fy, 34, 20, 4);
    ctx.fill();
    ctx.strokeStyle = "#a1782f";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(fx + 11, fy);
    ctx.lineTo(fx + 11, fy + 20);
    ctx.moveTo(fx + 23, fy);
    ctx.lineTo(fx + 23, fy + 20);
    ctx.stroke();
    // Cerca
    const madera = (x, y, w, h) => {
        const g = ctx.createLinearGradient(x, y, x, y + h);
        g.addColorStop(0, "#b07a45");
        g.addColorStop(1, "#7a4a22");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, 2);
        ctx.fill();
    };
    ctx.fillStyle = "#0002";
    ctx.fillRect(0, cy + 22, ancho, 4);
    madera(0, cy + 3, ancho, 5);
    madera(0, cy + 13, ancho, 5);
    for (let x = 6; x < ancho; x += 30) {
        madera(x, cy - 5, 6, 28);
        ctx.fillStyle = "#c58d55";
        ctx.fillRect(x, cy - 5, 6, 2);
    }
    return c;
}

// Molino de viento a la derecha, con las aspas girando
function dibujarMolino(ctx, m, tiempo) {
    const x = ancho * 0.88;
    const base = m.cielo + 4;
    const alturaM = Math.min(m.cielo * 0.95, 78);
    ctx.fillStyle = "#e9ecef";
    ctx.beginPath();
    ctx.moveTo(x - alturaM * 0.16, base);
    ctx.lineTo(x - alturaM * 0.08, base - alturaM * 0.75);
    ctx.lineTo(x + alturaM * 0.08, base - alturaM * 0.75);
    ctx.lineTo(x + alturaM * 0.16, base);
    ctx.fill();
    ctx.fillStyle = "#adb5bd";
    ctx.fillRect(x - alturaM * 0.04, base - alturaM * 0.22, alturaM * 0.08, alturaM * 0.22);
    ctx.save();
    ctx.translate(x, base - alturaM * 0.78);
    ctx.rotate(tiempo * 0.9);
    for (let k = 0; k < 4; k++) {
        ctx.rotate(TAU / 4);
        ctx.fillStyle = "#8d5a2b";
        ctx.fillRect(-1.2, 0, 2.4, alturaM * 0.5);
        ctx.fillStyle = "#f8f9fa";
        ctx.fillRect(1.2, alturaM * 0.12, alturaM * 0.11, alturaM * 0.36);
    }
    ctx.restore();
    ctx.fillStyle = "#6a040f";
    ctx.beginPath();
    ctx.arc(x, base - alturaM * 0.78, 3, 0, TAU);
    ctx.fill();
}

// Una parcela: cantero de madera con tierra arada (mojada mientras crece) y lo plantado encima
function dibujarParcela(ctx, i, r, tiempo) {
    const radio = Math.max(8, r.w * 0.16);
    if (i >= estado.lotes) {
        if (i !== estado.lotes) {
            ctx.fillStyle = "#1b433218";
            ctx.beginPath();
            ctx.roundRect(r.x, r.y, r.w, r.h, radio);
            ctx.fill();
            return;
        }
        // El próximo terreno para comprar: cartelito de madera
        const alcanza = estado.monedas >= costoLote();
        ctx.setLineDash([6, 5]);
        ctx.strokeStyle = alcanza ? "#ffd166" : "#ffffff88";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(r.x + 1, r.y + 1, r.w - 2, r.h - 2, radio);
        ctx.stroke();
        ctx.setLineDash([]);
        const cw = r.w * 0.78;
        const ch = r.h * 0.42;
        const cx = r.x + (r.w - cw) / 2;
        const cy = r.y + r.h * 0.22 + (alcanza ? Math.sin(tiempo * 3) * 2 : 0);
        ctx.fillStyle = "#7a4a22";
        ctx.fillRect(r.x + r.w / 2 - 2, cy + ch, 4, r.h * 0.3);
        const tabla = ctx.createLinearGradient(0, cy, 0, cy + ch);
        tabla.addColorStop(0, "#d4a373");
        tabla.addColorStop(1, "#a9713f");
        ctx.fillStyle = tabla;
        ctx.beginPath();
        ctx.roundRect(cx, cy, cw, ch, 6);
        ctx.fill();
        ctx.fillStyle = "#3a2400";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        // Letra que entre en el cartel aunque el precio sea largo
        const precio = `🪙 ${formatear(costoLote())}`;
        let letra = Math.max(8, Math.min(r.w * 0.14, ch * 0.36));
        ctx.font = `900 ${letra}px system-ui, sans-serif`;
        while (letra > 7 && Math.max(ctx.measureText(precio).width, ctx.measureText("+ Terreno").width) > cw * 0.88) {
            letra -= 0.5;
            ctx.font = `900 ${letra}px system-ui, sans-serif`;
        }
        ctx.fillText("+ Terreno", r.x + r.w / 2, cy + ch * 0.32);
        ctx.fillText(precio, r.x + r.w / 2, cy + ch * 0.72);
        return;
    }
    const p = estado.parcelas[i];
    const prog = progreso(p);
    // Sombra y marco de madera
    ctx.fillStyle = "#00000033";
    ctx.beginPath();
    ctx.roundRect(r.x + 2, r.y + 5, r.w, r.h, radio);
    ctx.fill();
    const marco = ctx.createLinearGradient(0, r.y, 0, r.y + r.h);
    marco.addColorStop(0, "#c08552");
    marco.addColorStop(1, "#7a4a22");
    ctx.fillStyle = marco;
    ctx.beginPath();
    ctx.roundRect(r.x, r.y, r.w, r.h, radio);
    ctx.fill();
    // Tierra: oscura y húmeda si está creciendo
    const b = Math.max(4, r.w * 0.08);
    const regada = p && prog < 1;
    const tierra = ctx.createLinearGradient(0, r.y + b, 0, r.y + r.h - b);
    tierra.addColorStop(0, regada ? "#5a3a22" : "#8b5e3c");
    tierra.addColorStop(1, regada ? "#3b2414" : "#6b4423");
    ctx.fillStyle = tierra;
    ctx.beginPath();
    ctx.roundRect(r.x + b, r.y + b, r.w - b * 2, r.h - b * 2, radio * 0.6);
    ctx.fill();
    // Surcos
    for (let k = 1; k <= 3; k++) {
        const y = r.y + b + ((r.h - b * 2) * k) / 4;
        ctx.fillStyle = "#00000030";
        ctx.fillRect(r.x + b + 3, y, r.w - b * 2 - 6, 2);
        ctx.fillStyle = "#ffffff14";
        ctx.fillRect(r.x + b + 3, y - 2, r.w - b * 2 - 6, 1.5);
    }
    ctx.strokeStyle = "#ffffff30";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(r.x + radio, r.y + 1.5);
    ctx.lineTo(r.x + r.w - radio, r.y + 1.5);
    ctx.stroke();
    if (!p) return;
    // Saltito al plantar o cosechar
    const desde = (performance.now() - (rebotes[i] ?? -1e9)) / 1000;
    const salto = desde < 0.45 ? 1 + Math.sin(desde * 14) * 0.18 * (1 - desde / 0.45) : 1;
    ctx.save();
    ctx.translate(r.x + r.w / 2, r.y + r.h * 0.62);
    ctx.scale(salto, salto);
    dibujarPlanta(ctx, p.cultivo, 0, 0, r.w, prog, tiempo + i);
    ctx.restore();
    if (prog < 1) {
        // Barra de crecimiento abajo
        const bw = r.w * 0.62;
        const bx = r.x + (r.w - bw) / 2;
        const by = r.y + r.h - b - 7;
        ctx.fillStyle = "#0007";
        ctx.beginPath();
        ctx.roundRect(bx, by, bw, 5, 3);
        ctx.fill();
        ctx.fillStyle = "#95d5b2";
        ctx.beginPath();
        ctx.roundRect(bx, by, Math.max(5, bw * prog), 5, 3);
        ctx.fill();
    } else {
        ctx.strokeStyle = `rgba(255,209,102,${0.55 + Math.sin(tiempo * 5) * 0.3})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.roundRect(r.x - 1, r.y - 1, r.w + 2, r.h + 2, radio + 1);
        ctx.stroke();
        // Brillitos subiendo
        for (let k = 0; k < 2; k++) {
            const t = (tiempo * 0.8 + k * 0.5 + i * 0.13) % 1;
            ctx.fillStyle = `rgba(255,250,200,${1 - t})`;
            ctx.beginPath();
            ctx.arc(r.x + r.w * (0.25 + k * 0.5), r.y + r.h * 0.4 - t * r.h * 0.4, 2.2, 0, TAU);
            ctx.fill();
        }
    }
}

function dibujar(dt) {
    const { ctx } = lienzo;
    const tiempo = performance.now() / 1000;
    const m = medidas();
    const luz = luzDelDia();
    dibujarCielo(ctx, m, luz, tiempo, dt);
    if (!fondoCache) fondoCache = pintarFondo(m);
    ctx.drawImage(fondoCache, 0, 0, ancho, alto);
    dibujarMolino(ctx, m, tiempo);

    // Parcelas
    for (let i = 0; i < MAX_LOTES; i++) dibujarParcela(ctx, i, rectParcela(i, m), tiempo);

    if (!estado.animales.length) {
        ctx.fillStyle = "#1b433288";
        ctx.font = "800 13px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(estado.nivel >= 2 ? "Comprá animales en la pestaña 🐔" : "Los animales se destraban en el nivel 2", ancho / 2, m.corralY + m.corral / 2 + 8);
    }
    const orden = estado.animales.map((a, k) => ({ a, k, pos: posAnimal(k) })).sort((p, q) => p.pos.y - q.pos.y);
    for (const { a, k, pos } of orden) {
        const mov = andar[k];
        mov.x += mov.vx * dt;
        if (mov.x < 0.05 || mov.x > 0.95) mov.vx *= -1;
        if (Math.random() < dt * 0.3) mov.vx = (Math.random() - 0.5) * 0.08;
        mov.fase += dt * (Math.abs(mov.vx) > 0.01 ? 1 : 0.2);
        const tam = Math.min(46, m.corral * 0.5);
        dibujarAnimal(ctx, a.tipo, pos.x, pos.y, tam, mov.fase, mov.vx >= 0 ? 1 : -1);
        const datos = animal(a.tipo);
        const listo = Date.now() - a.desde >= tiempoAnimal(datos);
        if (listo) {
            const by = pos.y - tam * 0.7 + Math.sin(tiempo * 4 + k) * 3;
            ctx.fillStyle = "#fff";
            ctx.beginPath();
            ctx.arc(pos.x, by, 13, 0, TAU);
            ctx.fill();
            iconoProducto(ctx, datos.producto, pos.x, by, 22);
        }
    }

    // Lo cosechado vuela hacia el granero (arriba a la derecha)
    for (const v of vuelos) {
        v.t += dt * 1.6;
        const p = Math.min(1, v.t);
        const x = v.x + (ancho - 30 - v.x) * p;
        const y = v.y + (-20 - v.y) * p - Math.sin(p * Math.PI) * 60;
        iconoProducto(ctx, v.id, x, y, 24 * (1 - p * 0.4));
    }
    for (let i = vuelos.length - 1; i >= 0; i--) if (vuelos[i].t >= 1) vuelos.splice(i, 1);

    // Lluvia: el campo se oscurece un poco, caen gotas y salpican al llegar al piso
    const intensidad = Math.min(1, lluvia / 1.2, (LLUVIA_SEG - lluvia) / 0.6 + 0.001);
    if (lluvia > 0) {
        ctx.fillStyle = `rgba(40, 60, 90, ${0.18 * intensidad})`;
        ctx.fillRect(0, 0, ancho, alto);
        for (let k = 0; k < Math.round(ancho * 0.12 * intensidad * dt * 30); k++) {
            gotas.push({ x: Math.random() * (ancho + 60), y: m.cielo * (0.3 + Math.random() * 0.4), fin: m.cielo + Math.random() * (alto - m.cielo), v: 520 + Math.random() * 200 });
        }
    }
    ctx.strokeStyle = "#e3f2ffee";
    ctx.lineWidth = 1.7;
    ctx.beginPath();
    for (const g of gotas) {
        g.y += g.v * dt;
        g.x -= g.v * dt * 0.12;
        ctx.moveTo(g.x, g.y);
        ctx.lineTo(g.x + 2.4, g.y - 11);
    }
    ctx.stroke();
    ctx.fillStyle = "#cfe8ff99";
    for (let i = gotas.length - 1; i >= 0; i--) {
        const g = gotas[i];
        if (g.y < g.fin) continue;
        ctx.beginPath();
        ctx.ellipse(g.x, g.fin, 3, 1.2, 0, 0, TAU);
        ctx.fill();
        gotas.splice(i, 1);
    }

    // Mariposas de día, luciérnagas y un poco de oscuridad de noche
    if (luz > 0.3 && lluvia === 0) {
        for (const b of mariposas) {
            b.fase += dt;
            const x = (b.x + Math.sin(b.fase * 0.3) * 0.35 + 1) % 1 * ancho;
            const y = m.cielo + (alto - m.cielo) * (b.y + Math.sin(b.fase * 0.7) * 0.12);
            const aleteo = Math.abs(Math.sin(b.fase * 14));
            ctx.fillStyle = b.color;
            for (const lado of [-1, 1]) {
                ctx.beginPath();
                ctx.ellipse(x + lado * 4 * aleteo, y, 4 * aleteo + 1, 3.5, lado * 0.4, 0, TAU);
                ctx.fill();
            }
            ctx.fillStyle = "#3d2512";
            ctx.fillRect(x - 0.7, y - 3, 1.4, 6);
        }
    }
    if (luz < 1) {
        ctx.fillStyle = `rgba(12, 18, 60, ${(1 - luz) * 0.32})`;
        ctx.fillRect(0, m.cielo, ancho, alto - m.cielo);
        ctx.globalAlpha = 1 - luz;
        for (const f of luciernagas) {
            f.fase += dt;
            const x = (f.x + Math.sin(f.fase * 0.4) * 0.05) * ancho;
            const y = m.cielo + (alto - m.cielo) * (f.y + Math.cos(f.fase * 0.5) * 0.03);
            const brillo = (Math.sin(f.fase * 3) + 1) / 2;
            const g = ctx.createRadialGradient(x, y, 0, x, y, 8);
            g.addColorStop(0, `rgba(230,255,140,${brillo})`);
            g.addColorStop(1, "rgba(230,255,140,0)");
            ctx.fillStyle = g;
            ctx.fillRect(x - 8, y - 8, 16, 16);
        }
        ctx.globalAlpha = 1;
    }

    chispas.dibujar(ctx, dt);
    for (const t of textos) {
        t.vida -= dt;
        t.y -= dt * 30;
        ctx.globalAlpha = Math.max(0, Math.min(1, t.vida * 1.5));
        ctx.font = "900 14px sans-serif";
        ctx.textAlign = "center";
        ctx.lineWidth = 3;
        ctx.strokeStyle = "#1b4332";
        ctx.strokeText(t.t, t.x, t.y);
        ctx.fillStyle = "#fff";
        ctx.fillText(t.t, t.x, t.y);
    }
    ctx.globalAlpha = 1;
    for (let i = textos.length - 1; i >= 0; i--) if (textos[i].vida <= 0) textos.splice(i, 1);
}

let acumulado = 0;
bucle((dt) => {
    avanzarLluvia(dt);
    if (pantallaGrande.matches) animarVisita(dt);
    // El granjero cosecha solo lo que está listo
    if (mejora("granjero")) estado.parcelas.forEach((p, i) => p && progreso(p) >= 1 && cosechar(i, true));
    dibujar(dt);
    acumulado += dt;
    if (acumulado > 0.5) {
        acumulado = 0;
        pintarDatos();
        pintarPanel();
    }
});

// ---------- Toques ----------
// Tocar o deslizar el dedo: al arrastrar sobre varias parcelas se planta o cosecha en todas
// (lo mismo que hizo la primera), y al pasar sobre los animales se recoge lo que tengan.
let arrastre = null; // { modo: "plantar" | "cosechar" | "recoger", vistas: Set }
const parcelaEn = (x, y, m = medidas()) => {
    for (let i = 0; i < MAX_LOTES; i++) {
        const r = rectParcela(i, m);
        if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return i;
    }
    return -1;
};
function puntoDe(e) {
    const caja = $("lienzo").getBoundingClientRect();
    return { x: e.clientX - caja.left, y: e.clientY - caja.top };
}
function recogerEn(x, y) {
    let alguno = false;
    for (let k = 0; k < estado.animales.length; k++) {
        const pos = posAnimal(k);
        if (Math.hypot(pos.x - x, pos.y - 10 - y) < 34 && recoger(k)) alguno = true;
    }
    return alguno;
}
$("lienzo").addEventListener("pointermove", (e) => {
    if (!arrastre) return;
    const { x, y } = puntoDe(e);
    if (arrastre.modo === "recoger") {
        if (recogerEn(x, y)) refrescar();
        return;
    }
    const i = parcelaEn(x, y);
    if (i < 0 || i >= estado.lotes || arrastre.vistas.has(i)) return;
    arrastre.vistas.add(i);
    const p = estado.parcelas[i];
    const r = rectParcela(i);
    if (arrastre.modo === "cosechar" && p && progreso(p) >= 1) {
        cosechar(i);
        refrescar();
    } else if (arrastre.modo === "plantar" && !p) {
        const c = cultivo(estado.elegida);
        if (c && plantar(i, c.id)) {
            chispas.emitir(r.x + r.w / 2, r.y + r.h / 2, "#9c6644", 6, 70);
            vibrar(8);
            sonidos.plantar();
            refrescar();
        }
    }
});
for (const ev of ["pointerup", "pointercancel", "pointerleave"]) $("lienzo").addEventListener(ev, () => (arrastre = null));

$("lienzo").addEventListener("pointerdown", (e) => {
    const { x, y } = puntoDe(e);
    const m = medidas();
    arrastre = null;
    // Nubes: tocar una hace llover
    const nube = y < m.cielo + 10 ? nubeEn(x, y) : null;
    if (nube) return hacerLlover(nube);
    // Animales
    if (recogerEn(x, y)) {
        arrastre = { modo: "recoger", vistas: new Set() };
        return refrescar();
    }
    for (let i = 0; i < MAX_LOTES; i++) {
        const r = rectParcela(i, m);
        if (x < r.x || x > r.x + r.w || y < r.y || y > r.y + r.h) continue;
        const p0 = estado.parcelas[i];
        if (i < estado.lotes) arrastre = { modo: !p0 ? "plantar" : progreso(p0) >= 1 ? "cosechar" : null, vistas: new Set([i]) };
        if (arrastre && !arrastre.modo) arrastre = null;
        if (i >= estado.lotes) {
            if (i === estado.lotes && estado.monedas >= costoLote()) {
                estado.monedas -= costoLote();
                estado.lotes++;
                chispas.emitir(r.x + r.w / 2, r.y + r.h / 2, "#ffd166", 20, 160);
                vibrar(40);
                sonidos.comprar();
                refrescar();
            } else if (i === estado.lotes) {
                avisar(`Necesitás 🪙 ${formatear(costoLote())}`);
                sonidos.error();
            }
            return;
        }
        const p = estado.parcelas[i];
        if (!p) {
            const c = cultivo(estado.elegida);
            if (!c) return;
            if (plantar(i, c.id)) {
                chispas.emitir(r.x + r.w / 2, r.y + r.h / 2, "#9c6644", 8, 80);
                vibrar(10);
                sonidos.plantar();
                refrescar();
            } else {
                avisar(`Te faltan monedas para ${c.nombre}`);
                sonidos.error();
            }
        } else if (progreso(p) >= 1) {
            cosechar(i);
            refrescar();
        } else {
            const resto = Math.ceil(((1 - progreso(p)) * tiempoCultivo(cultivo(p.cultivo))) / 1000);
            textos.push({ x: r.x + r.w / 2, y: r.y + 10, t: resto >= 60 ? `${Math.floor(resto / 60)}m ${resto % 60}s` : `${resto}s`, vida: 0.9 });
        }
        return;
    }
});

// ---------- Panel ----------
let pestana = "semillas";
function avisar(texto, ms = 1600) {
    $("aviso").textContent = texto;
    $("aviso").hidden = false;
    clearTimeout(avisar.t);
    avisar.t = setTimeout(() => ($("aviso").hidden = true), ms);
}

function canvasProducto(id) {
    return `<canvas width="88" height="88" data-icono="${id}"></canvas>`;
}
const MONEDA_G = '<i class="moneda-g"></i>';
const CARAS = { "Doña Rosa": "👵", "El panadero": "🧑‍🍳", "La escuela": "🏫", "Don Tito": "👴", "El restaurante": "👨‍🍳", "La feria": "🎪", "Abuela Marta": "👵🏻" };

// Pedidos con el dibujito de cada cosa que piden (y cuántas tenés de cada una)
function htmlPedidos() {
    return estado.pedidos.map((p, k) => `<div class="pedido-g${sePuede(p) ? " listo" : ""}" data-k="${k}">
        <div class="cliente-p"><span class="cara">${CARAS[p.quien] ?? "🧑‍🌾"}</span>
            <span class="quien-p">${p.quien}<small>${MONEDA_G}${formatear(p.premio)} · ⭐ ${p.xp}</small></span>
            <button class="cambiar-p" data-cambiar="${k}" aria-label="Cambiar pedido" title="Cambiar pedido">↻</button></div>
        <div class="items-p">${Object.entries(p.items).map(([id, n]) => {
            const tengo = estado.granero[id] ?? 0;
            return `<span class="item-p${tengo >= n ? " ok" : ""}" title="${PRODUCTOS[id].nombre}">${canvasProducto(id)}<b>${Math.min(tengo, n)}/${n}</b></span>`;
        }).join("")}</div>
        <button class="boton-verde" data-entregar="${k}" ${sePuede(p) ? "" : "disabled"}>${sePuede(p) ? "✔ Entregar" : "Te faltan cosas"}</button></div>`).join("");
}

// Pedidos al costado (pantallas grandes): solo se redibujan si cambió algo
const pantallaGrande = matchMedia("(min-width: 900px)");
let ultimoLado = "";
function pintarLado() {
    if (!pantallaGrande.matches) return;
    const html = htmlPedidos();
    if (html === ultimoLado) return;
    ultimoLado = html;
    $("pedidos-lado").innerHTML = html;
    pintarIconos($("pedidos-lado"));
    marcarVisita();
}

// ---------- Visitas (pantallas grandes): la persona que pide, dibujada, diciendo lo que quiere ----------
const visita = { k: -1, quien: "", texto: "", mostrado: 0, tiempo: 0, gracias: false };
const ESPERA_VISITA = 9; // segundos que se queda después de hablar, antes de pasar al próximo pedido
function hablar(quien, texto, gracias = false) {
    Object.assign(visita, { quien, texto, mostrado: 0, tiempo: 0, gracias });
    $("visita-nombre").textContent = quien;
    $("visita-texto").textContent = "";
}
function elegirVisita(k) {
    const p = estado.pedidos[k];
    if (!p) return;
    visita.k = k;
    hablar(p.quien, frase(p, formatear));
    marcarVisita();
}
function marcarVisita() {
    for (const el of $("pedidos-lado").querySelectorAll(".pedido-g")) el.classList.toggle("hablando", Number(el.dataset.k) === visita.k && !visita.gracias);
}
let tamPersona = "";
function animarVisita(dt) {
    if (visita.k < 0) elegirVisita(0);
    visita.tiempo += dt;
    if (visita.mostrado < visita.texto.length) {
        visita.mostrado = Math.min(visita.texto.length, visita.mostrado + dt * 40);
        $("visita-texto").textContent = visita.texto.slice(0, Math.floor(visita.mostrado));
    } else if (visita.tiempo > visita.texto.length / 40 + (visita.gracias ? 2.5 : ESPERA_VISITA)) {
        elegirVisita(visita.gracias ? visita.k : (visita.k + 1) % estado.pedidos.length);
    }
    // Lienzo nítido del tamaño que le da el CSS
    const c = $("persona");
    const caja = c.getBoundingClientRect();
    const escala = Math.min(devicePixelRatio, 2);
    const tam = `${caja.width}x${caja.height}`;
    if (tam !== tamPersona) {
        tamPersona = tam;
        c.width = Math.round(caja.width * escala);
        c.height = Math.round(caja.height * escala);
    }
    const ctx = c.getContext("2d");
    ctx.setTransform(escala, 0, 0, escala, 0, 0);
    dibujarPersona(ctx, visita.quien, caja.width, caja.height, performance.now() / 1000, visita.mostrado < visita.texto.length);
}
pantallaGrande.addEventListener("change", () => {
    ultimoLado = "";
    if (pantallaGrande.matches && pestana === "pedidos") document.querySelector('.pestana-g[data-p="semillas"]').click();
    pintarLado();
});

function pintarIconos(contenedor = $("panel")) {
    for (const c of contenedor.querySelectorAll("canvas[data-icono]")) {
        const ctx = c.getContext("2d");
        ctx.scale(2, 2);
        const id = c.dataset.icono;
        if (animal(id)) dibujarAnimal(ctx, id, 22, 24, 34, 0);
        else iconoProducto(ctx, id, 22, 24, 26);
    }
}

let ultimoPanel = "";
function pintarPanel() {
    const panel = $("panel");
    const scroll = panel.scrollTop;
    let html;
    if (pestana === "semillas") {
        html = `<div class="semillas">${CULTIVOS.map((c) => {
            const bloqueado = c.nivel > estado.nivel;
            return `<button class="semilla-c${estado.elegida === c.id ? " elegida" : ""}" data-semilla="${c.id}" ${bloqueado ? "disabled" : ""}>
                ${canvasProducto(c.id)}<span class="nombre-s">${c.nombre}</span><small>${bloqueado ? `🔒 Nivel ${c.nivel}` : `${MONEDA_G}${c.semilla} · ⏱ ${c.tiempo >= 60 ? c.tiempo / 60 + " min" : c.tiempo + " s"}`}</small>
                ${bloqueado ? "" : `<span class="vende-s">vende ${precioVenta(c.id)}</span>`}</button>`;
        }).join("")}</div><p class="ayuda-g">Elegí una semilla y tocá o deslizá el dedo sobre las parcelas vacías. Deslizá sobre lo maduro para cosechar.</p>`;
    } else if (pestana === "pedidos") {
        html = `<div class="lista-pedidos">${htmlPedidos()}</div>`;
    } else if (pestana === "almacen") {
        const items = Object.entries(estado.granero).filter(([, n]) => n > 0);
        const total = items.reduce((t, [id, n]) => t + precioVenta(id) * n, 0);
        html = items.length
            ? `<button class="boton-verde ancho" data-vender-todo>Vender todo · ${MONEDA_G}${formatear(total)}</button><div class="grilla-granero">` +
              items.map(([id, n]) => `<button class="caja-granero" data-vender="${id}" title="Vender 1">${canvasProducto(id)}<b>×${n}</b><small>${MONEDA_G}${precioVenta(id)}</small></button>`).join("") +
              `</div><p class="ayuda-g">Tocá una caja para vender una unidad.</p>`
            : `<p class="vacio-g">El granero está vacío. ¡A cosechar!</p>`;
    } else if (pestana === "animales") {
        html = ANIMALES.map((a) => {
            const tengo = estado.animales.filter((x) => x.tipo === a.id).length;
            const bloqueado = a.nivel > estado.nivel;
            return `<div class="fila-g">${canvasProducto(a.id)}<span class="txt">${a.nombre} <small>${bloqueado ? `🔒 Nivel ${a.nivel}` : `Da ${a.nombreProducto} (${MONEDA_G}${precioVenta(a.producto)}) cada ${a.tiempo >= 60 ? a.tiempo / 60 + " min" : a.tiempo + " s"} · tenés ${tengo}/${a.max}`}</small></span>
                <button class="boton-verde" data-animal="${a.id}" ${bloqueado || tengo >= a.max || estado.monedas < a.costo ? "disabled" : ""}>${tengo >= a.max ? "Lleno" : `${MONEDA_G}${formatear(a.costo)}`}</button></div>`;
        }).join("") + `<p class="ayuda-g">Tocá a los animales con burbuja para recoger lo que producen.</p>`;
    } else {
        html = MEJORAS.map((m) => {
            const n = mejora(m.id);
            const tope = n >= m.max;
            return `<div class="fila-g"><span class="ico">${m.ico}</span><span class="txt">${m.nombre}<small>${m.detalle}</small>
                <span class="niveles-m">${Array.from({ length: m.max }, (_, k) => `<i class="${k < n ? "si" : ""}"></i>`).join("")}</span></span>
                <button class="boton-verde" data-mejora="${m.id}" ${tope || estado.monedas < m.costo(n) ? "disabled" : ""}>${tope ? "Máximo" : `${MONEDA_G}${formatear(m.costo(n))}`}</button></div>`;
        }).join("");
    }
    pintarLado();
    // Si no cambió nada no se redibuja (así no titilan los dibujitos)
    if (html === ultimoPanel) return;
    ultimoPanel = html;
    panel.innerHTML = html;
    pintarIconos();
    panel.scrollTop = scroll;
}

function alTocarPanel(e) {
    const b = e.target.closest("button");
    // Tocar un pedido del costado hace que esa persona lo diga
    const tarjeta = e.target.closest("#pedidos-lado .pedido-g");
    if (!b && tarjeta) return elegirVisita(Number(tarjeta.dataset.k));
    if (!b || b.disabled) return;
    const d = b.dataset;
    if (d.semilla) {
        estado.elegida = d.semilla;
        sonidos.toque();
    }
    else if (d.entregar !== undefined) {
        const p = estado.pedidos[Number(d.entregar)];
        if (!sePuede(p)) return;
        for (const [id, n] of Object.entries(p.items)) estado.granero[id] -= n;
        estado.monedas += p.premio;
        sumarXP(p.xp);
        estado.pedidos[Number(d.entregar)] = nuevoPedido();
        // Quien recibió el pedido da las gracias, y después aparece el que viene
        visita.k = Number(d.entregar);
        hablar(p.quien, GRACIAS[Math.floor(Math.random() * GRACIAS.length)], true);
        avisar(`📦 ¡Pedido entregado! +🪙${formatear(p.premio)}`);
        chispas.emitir(ancho / 2, alto / 2, "#ffd166", 30, 220);
        vibrar([30, 40, 30]);
        sonidos.monedas();
    } else if (d.cambiar !== undefined) {
        estado.pedidos[Number(d.cambiar)] = nuevoPedido();
        if (visita.k === Number(d.cambiar)) elegirVisita(visita.k);
    }
    else if (d.venderTodo !== undefined) {
        let total = 0;
        for (const [id, n] of Object.entries(estado.granero)) {
            total += precioVenta(id) * n;
            estado.granero[id] = 0;
        }
        estado.monedas += total;
        avisar(`Vendiste todo: +🪙${formatear(total)}`);
        vibrar(30);
        sonidos.monedas();
    } else if (d.vender) {
        if ((estado.granero[d.vender] ?? 0) < 1) return;
        estado.granero[d.vender]--;
        estado.monedas += precioVenta(d.vender);
        sonidos.monedas();
    } else if (d.animal) {
        const a = animal(d.animal);
        if (estado.monedas < a.costo) return;
        estado.monedas -= a.costo;
        estado.animales.push({ tipo: a.id, desde: Date.now() });
        avisar(`¡Nuevo animal: ${a.nombre}!`);
        vibrar(30);
        sonidos.comprar();
        sonidos[a.id]?.();
    } else if (d.mejora) {
        const m = MEJORAS.find((x) => x.id === d.mejora);
        const costo = m.costo(mejora(m.id));
        if (estado.monedas < costo) return;
        estado.monedas -= costo;
        estado.mejoras[m.id] = mejora(m.id) + 1;
        avisar(`${m.ico} ${m.nombre} mejorado`);
        vibrar(30);
        sonidos.comprar();
    }
    refrescar();
}
$("panel").addEventListener("click", alTocarPanel);
$("pedidos-lado").addEventListener("click", alTocarPanel);

for (const p of document.querySelectorAll(".pestana-g")) {
    p.addEventListener("click", () => {
        pestana = p.dataset.p;
        sonidos.toque();
        for (const x of document.querySelectorAll(".pestana-g")) x.classList.toggle("activa", x === p);
        $("panel").scrollTop = 0;
        pintarPanel();
    });
}

function pintarDatos() {
    $("monedas").textContent = formatear(estado.monedas);
    $("nivel").textContent = estado.nivel;
    $("xp").style.width = `${(estado.xp / xpParaNivel(estado.nivel)) * 100}%`;
    $("granero").textContent = enGranero();
    $("pedidos-listos").hidden = !estado.pedidos.some(sePuede);
}

function refrescar() {
    guardar(CLAVE, estado);
    pintarDatos();
    pintarPanel();
}

// ---------- Ajustes: volumen de la música y de los sonidos ----------
function pintarVolumen() {
    const v = volumen();
    for (const tipo of ["musica", "efectos"]) {
        $(`vol-${tipo}`).value = Math.round(v[tipo] * 100);
        $(`vol-${tipo}`).style.setProperty("--lleno", `${Math.round(v[tipo] * 100)}%`);
        $(`txt-${tipo}`).textContent = v[tipo] === 0 ? "🔇" : `${Math.round(v[tipo] * 100)}%`;
    }
}
for (const tipo of ["musica", "efectos"]) {
    $(`vol-${tipo}`).addEventListener("input", (e) => {
        cambiarVolumen(tipo, Number(e.target.value) / 100);
        pintarVolumen();
    });
    $(`vol-${tipo}`).addEventListener("change", () => tipo === "efectos" && sonidos.cosechar());
}
$("ajustes").addEventListener("click", () => {
    pintarVolumen();
    $("hoja-ajustes").hidden = false;
    sonidos.toque();
});
$("cerrar-ajustes").addEventListener("click", () => ($("hoja-ajustes").hidden = true));
$("hoja-ajustes").addEventListener("click", (e) => e.target === $("hoja-ajustes") && ($("hoja-ajustes").hidden = true));

setInterval(() => guardar(CLAVE, estado), 5000);
addEventListener("pagehide", () => guardar(CLAVE, estado));
pintarDatos();
pintarPanel();

// Al volver: qué pasó mientras la granja estuvo cerrada
{
    const listos = estado.parcelas.filter((p) => p && progreso(p) >= 1).length;
    const animalesListos = estado.animales.filter((a) => Date.now() - a.desde >= tiempoAnimal(animal(a.tipo))).length;
    const partes = [listos && `${listos} cultivo${listos > 1 ? "s" : ""}`, animalesListos && `${animalesListos} animal${animalesListos > 1 ? "es" : ""}`].filter(Boolean);
    if (mejora("granjero") && estado.parcelas.some(Boolean)) avisar("👩‍🌾 El granjero cuidó el campo mientras no estabas", 2800);
    else if (partes.length) avisar(`🌾 Listos para juntar: ${partes.join(" y ")} · deslizá el dedo`, 3200);
}
