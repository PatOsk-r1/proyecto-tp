// Granja: plantá, cosechá, criá animales y cumplí pedidos. Todo crece aunque la app esté cerrada.
import { formatear, cargar, guardar, vibrar } from "../../js/comun3d.js";
import { crearLienzo, bucle, crearChispas } from "../../js/lienzo2d.js";

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
const lienzo = crearLienzo($("lienzo"), (d) => {
    ancho = d.ancho;
    alto = d.alto;
});
const vuelos = [];
const textos = [];
const nubes = Array.from({ length: 3 }, (_, i) => ({ x: Math.random(), y: 0.03 + i * 0.03, v: 0.006 + Math.random() * 0.008, s: 0.7 + Math.random() * 0.6 }));

// Medidas: parcelas arriba y corral abajo
function medidas() {
    const corral = alto * 0.26;
    const filas = MAX_LOTES / COLUMNAS;
    const zonaH = alto - corral - 16;
    const lado = Math.min((ancho - 20) / COLUMNAS, zonaH / filas) - 6;
    const ox = (ancho - COLUMNAS * (lado + 6)) / 2 + 3;
    const oy = 8 + (zonaH - filas * (lado + 6)) / 2;
    return { lado, ox, oy, corralY: alto - corral, corral };
}
const rectParcela = (i, m = medidas()) => ({ x: m.ox + (i % COLUMNAS) * (m.lado + 6), y: m.oy + Math.floor(i / COLUMNAS) * (m.lado + 6), w: m.lado, h: m.lado });

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
    }
}

function plantar(i, id) {
    const c = cultivo(id);
    if (!c || estado.monedas < c.semilla) return false;
    estado.monedas -= c.semilla;
    estado.parcelas[i] = { cultivo: id, desde: Date.now() };
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
    const r = rectParcela(i);
    if (!automatico) {
        vuelos.push({ x: r.x + r.w / 2, y: r.y + r.h / 2, id: c.id, t: 0 });
        chispas.emitir(r.x + r.w / 2, r.y + r.h / 2, c.color, 10, 120);
        textos.push({ x: r.x + r.w / 2, y: r.y, t: `+${cantidad} ${c.nombre}${cantidad > 1 ? " ¡doble!" : ""}`, vida: 1 });
        vibrar(15);
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
    if (prog < 0.25) {
        ctx.fillStyle = "#5c3a1e";
        for (const [dx, dy] of [[-0.15, 0], [0.12, 0.08], [0, -0.1]]) {
            ctx.beginPath();
            ctx.arc(dx * tam, dy * tam, tam * 0.04, 0, TAU);
            ctx.fill();
        }
        ctx.restore();
        return;
    }
    ctx.rotate(vaiven);
    const verde = "#52b788";
    if (prog < 1) {
        const s = prog < 0.6 ? 0.5 : 0.8;
        ctx.strokeStyle = "#2d6a4f";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, tam * 0.2);
        ctx.lineTo(0, -tam * 0.15 * s);
        ctx.stroke();
        ctx.fillStyle = verde;
        for (const lado of [-1, 1]) {
            ctx.beginPath();
            ctx.ellipse(lado * tam * 0.1 * s, -tam * 0.05 * s, tam * 0.12 * s, tam * 0.05 * s, lado * 0.5, 0, TAU);
            ctx.fill();
        }
        ctx.restore();
        return;
    }
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
        ctx.fillStyle = "#2d6a4f";
        ctx.beginPath();
        ctx.arc(0, -tam * 0.02, tam * 0.22, 0, TAU);
        ctx.fill();
        const puntos = id === "uva" ? [[-0.08, -0.05], [0, -0.05], [0.08, -0.05], [-0.04, 0.04], [0.04, 0.04], [0, 0.12]] : [[-0.1, -0.08], [0.1, -0.05], [0, 0.08], [-0.12, 0.08], [0.12, 0.1]];
        for (const [dx, dy] of puntos) {
            const g = ctx.createRadialGradient(dx * tam - 2, dy * tam - 2, 1, dx * tam, dy * tam, tam * 0.07);
            g.addColorStop(0, "#fff");
            g.addColorStop(0.3, c.color);
            g.addColorStop(1, "#000");
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
    if (id === "huevo") {
        ctx.fillStyle = "#fff5e1";
        ctx.beginPath();
        ctx.ellipse(0, 0, tam * 0.22, tam * 0.3, 0, 0, TAU);
        ctx.fill();
    } else if (id === "leche") {
        ctx.fillStyle = "#fff";
        ctx.fillRect(-tam * 0.18, -tam * 0.2, tam * 0.36, tam * 0.45);
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

function dibujar(dt) {
    const { ctx } = lienzo;
    const tiempo = performance.now() / 1000;
    const m = medidas();
    // Pasto con matas
    const g = ctx.createLinearGradient(0, 0, 0, alto);
    g.addColorStop(0, "#74c69d");
    g.addColorStop(1, "#40916c");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, ancho, alto);
    ctx.fillStyle = "#ffffff12";
    for (let k = 0; k < 40; k++) {
        const x = (k * 97) % ancho;
        const y = (k * 61) % alto;
        ctx.fillRect(x, y, 2, 5);
        ctx.fillRect(x + 3, y + 1, 2, 4);
    }
    for (const n of nubes) {
        n.x += n.v * dt;
        if (n.x > 1.2) n.x = -0.2;
        ctx.fillStyle = "#ffffff22";
        for (const [dx, r] of [[0, 18], [20, 14], [-18, 12]]) {
            ctx.beginPath();
            ctx.arc(n.x * ancho + dx * n.s, alto * n.y + 20, r * n.s, 0, TAU);
            ctx.fill();
        }
    }

    // Parcelas
    for (let i = 0; i < MAX_LOTES; i++) {
        const r = rectParcela(i, m);
        if (i >= estado.lotes) {
            ctx.fillStyle = "#00000022";
            ctx.beginPath();
            ctx.roundRect(r.x, r.y, r.w, r.h, 10);
            ctx.fill();
            if (i === estado.lotes) {
                ctx.setLineDash([5, 5]);
                ctx.strokeStyle = "#ffffff88";
                ctx.lineWidth = 2;
                ctx.stroke();
                ctx.setLineDash([]);
                ctx.fillStyle = estado.monedas >= costoLote() ? "#ffd166" : "#ffffffaa";
                ctx.font = `900 ${Math.max(10, r.w * 0.15)}px sans-serif`;
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.fillText("+ Terreno", r.x + r.w / 2, r.y + r.h * 0.4);
                ctx.fillText(`🪙 ${formatear(costoLote())}`, r.x + r.w / 2, r.y + r.h * 0.62);
            }
            continue;
        }
        const tierra = ctx.createLinearGradient(0, r.y, 0, r.y + r.h);
        tierra.addColorStop(0, "#9c6644");
        tierra.addColorStop(1, "#6f4518");
        ctx.fillStyle = tierra;
        ctx.beginPath();
        ctx.roundRect(r.x, r.y, r.w, r.h, 10);
        ctx.fill();
        ctx.strokeStyle = "#00000025";
        ctx.lineWidth = 2;
        for (let k = 1; k < 4; k++) {
            ctx.beginPath();
            ctx.moveTo(r.x + 6, r.y + (r.h * k) / 4);
            ctx.lineTo(r.x + r.w - 6, r.y + (r.h * k) / 4);
            ctx.stroke();
        }
        ctx.strokeStyle = "#5c3a1e";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(r.x, r.y, r.w, r.h, 10);
        ctx.stroke();
        const p = estado.parcelas[i];
        if (!p) continue;
        const prog = progreso(p);
        dibujarPlanta(ctx, p.cultivo, r.x + r.w / 2, r.y + r.h * 0.55, r.w, prog, tiempo);
        if (prog < 1) {
            ctx.strokeStyle = "#0005";
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.arc(r.x + r.w - 12, r.y + 12, 7, 0, TAU);
            ctx.stroke();
            ctx.strokeStyle = "#ffd166";
            ctx.beginPath();
            ctx.arc(r.x + r.w - 12, r.y + 12, 7, -Math.PI / 2, -Math.PI / 2 + prog * TAU);
            ctx.stroke();
        } else {
            ctx.strokeStyle = `rgba(255,209,102,${0.5 + Math.sin(tiempo * 5) * 0.3})`;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.roundRect(r.x - 1, r.y - 1, r.w + 2, r.h + 2, 11);
            ctx.stroke();
        }
    }

    // Corral con cerca
    ctx.fillStyle = "#95d5b2";
    ctx.fillRect(0, m.corralY, ancho, m.corral);
    ctx.fillStyle = "#8d5a2b";
    ctx.fillRect(0, m.corralY + 4, ancho, 4);
    ctx.fillRect(0, m.corralY + 14, ancho, 4);
    for (let x = 6; x < ancho; x += 28) ctx.fillRect(x, m.corralY - 4, 5, 26);
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
    // El granjero cosecha solo lo que está listo
    if (mejora("granjero")) estado.parcelas.forEach((p, i) => p && progreso(p) >= 1 && cosechar(i, true));
    dibujar(dt);
    acumulado += dt;
    if (acumulado > 0.5) {
        acumulado = 0;
        pintarDatos();
        if (pestana === "pedidos" || pestana === "animales") pintarPanel();
    }
});

// ---------- Toques ----------
$("lienzo").addEventListener("pointerdown", (e) => {
    const caja = $("lienzo").getBoundingClientRect();
    const x = e.clientX - caja.left;
    const y = e.clientY - caja.top;
    const m = medidas();
    // Animales
    for (let k = 0; k < estado.animales.length; k++) {
        const pos = posAnimal(k);
        if (Math.hypot(pos.x - x, pos.y - 10 - y) < 34 && recoger(k)) return refrescar();
    }
    for (let i = 0; i < MAX_LOTES; i++) {
        const r = rectParcela(i, m);
        if (x < r.x || x > r.x + r.w || y < r.y || y > r.y + r.h) continue;
        if (i >= estado.lotes) {
            if (i === estado.lotes && estado.monedas >= costoLote()) {
                estado.monedas -= costoLote();
                estado.lotes++;
                chispas.emitir(r.x + r.w / 2, r.y + r.h / 2, "#ffd166", 20, 160);
                vibrar(40);
                refrescar();
            } else if (i === estado.lotes) avisar(`Necesitás 🪙 ${formatear(costoLote())}`);
            return;
        }
        const p = estado.parcelas[i];
        if (!p) {
            const c = cultivo(estado.elegida);
            if (!c) return;
            if (plantar(i, c.id)) {
                chispas.emitir(r.x + r.w / 2, r.y + r.h / 2, "#9c6644", 8, 80);
                vibrar(10);
                refrescar();
            } else avisar(`Te faltan monedas para ${c.nombre}`);
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
function pintarIconos() {
    for (const c of $("panel").querySelectorAll("canvas[data-icono]")) {
        const ctx = c.getContext("2d");
        ctx.scale(2, 2);
        const id = c.dataset.icono;
        if (animal(id)) dibujarAnimal(ctx, id, 22, 24, 34, 0);
        else iconoProducto(ctx, id, 22, 24, 26);
    }
}

function pintarPanel() {
    const panel = $("panel");
    const scroll = panel.scrollTop;
    if (pestana === "semillas") {
        panel.innerHTML = `<div class="semillas">${CULTIVOS.map((c) => {
            const bloqueado = c.nivel > estado.nivel;
            return `<button class="semilla-c${estado.elegida === c.id ? " elegida" : ""}" data-semilla="${c.id}" ${bloqueado ? "disabled" : ""}>
                ${canvasProducto(c.id)}${c.nombre}<small>${bloqueado ? `🔒 Nivel ${c.nivel}` : `🪙${c.semilla} · ${c.tiempo >= 60 ? c.tiempo / 60 + "min" : c.tiempo + "s"} · vende ${precioVenta(c.id)}`}</small></button>`;
        }).join("")}</div><p class="vacio-g" style="padding:6px">Elegí una semilla y tocá una parcela vacía. Tocá lo maduro para cosechar.</p>`;
    } else if (pestana === "pedidos") {
        panel.innerHTML = estado.pedidos.map((p, k) => `<div class="fila-g${sePuede(p) ? " listo" : ""}">
            <span class="ico">📋</span>
            <span class="txt">${p.quien}<small>Paga 🪙 ${formatear(p.premio)} · ⭐ ${p.xp}</small>
                <span class="pedido-items">${Object.entries(p.items).map(([id, n]) => `<span class="${(estado.granero[id] ?? 0) >= n ? "ok" : ""}">${PRODUCTOS[id].nombre} ${Math.min(estado.granero[id] ?? 0, n)}/${n}</span>`).join("")}</span></span>
            <span style="display:flex;flex-direction:column;gap:4px"><button data-entregar="${k}" ${sePuede(p) ? "" : "disabled"}>Entregar</button><button class="boton-g secundario" data-cambiar="${k}">Cambiar</button></span></div>`).join("");
    } else if (pestana === "almacen") {
        const items = Object.entries(estado.granero).filter(([, n]) => n > 0);
        const total = items.reduce((t, [id, n]) => t + precioVenta(id) * n, 0);
        panel.innerHTML = items.length
            ? `<button class="boton-g" data-vender-todo>Vender todo · 🪙 ${formatear(total)}</button>` +
              items.map(([id, n]) => `<div class="fila-g">${canvasProducto(id)}<span class="txt">${PRODUCTOS[id].nombre} ×${n}<small>🪙 ${precioVenta(id)} cada uno</small></span><button data-vender="${id}">Vender 1</button></div>`).join("")
            : `<p class="vacio-g">El granero está vacío. ¡A cosechar!</p>`;
    } else if (pestana === "animales") {
        panel.innerHTML = ANIMALES.map((a) => {
            const tengo = estado.animales.filter((x) => x.tipo === a.id).length;
            const bloqueado = a.nivel > estado.nivel;
            return `<div class="fila-g">${canvasProducto(a.id)}<span class="txt">${a.nombre} <small>${bloqueado ? `🔒 Nivel ${a.nivel}` : `Da ${a.nombreProducto} (🪙${precioVenta(a.producto)}) cada ${a.tiempo >= 60 ? a.tiempo / 60 + " min" : a.tiempo + " s"} · tenés ${tengo}/${a.max}`}</small></span>
                <button data-animal="${a.id}" ${bloqueado || tengo >= a.max || estado.monedas < a.costo ? "disabled" : ""}>${tengo >= a.max ? "Lleno" : `🪙 ${formatear(a.costo)}`}</button></div>`;
        }).join("") + `<p class="vacio-g" style="padding:6px">Tocá a los animales con burbuja para recoger lo que producen.</p>`;
    } else {
        panel.innerHTML = MEJORAS.map((m) => {
            const n = mejora(m.id);
            const tope = n >= m.max;
            return `<div class="fila-g"><span class="ico">${m.ico}</span><span class="txt">${m.nombre}<small>${m.detalle} · ${n}/${m.max}</small></span>
                <button data-mejora="${m.id}" ${tope || estado.monedas < m.costo(n) ? "disabled" : ""}>${tope ? "Listo" : `🪙 ${formatear(m.costo(n))}`}</button></div>`;
        }).join("");
    }
    pintarIconos();
    panel.scrollTop = scroll;
}

$("panel").addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b || b.disabled) return;
    const d = b.dataset;
    if (d.semilla) estado.elegida = d.semilla;
    else if (d.entregar !== undefined) {
        const p = estado.pedidos[Number(d.entregar)];
        if (!sePuede(p)) return;
        for (const [id, n] of Object.entries(p.items)) estado.granero[id] -= n;
        estado.monedas += p.premio;
        sumarXP(p.xp);
        estado.pedidos[Number(d.entregar)] = nuevoPedido();
        avisar(`📦 ¡Pedido entregado! +🪙${formatear(p.premio)}`);
        chispas.emitir(ancho / 2, alto / 2, "#ffd166", 30, 220);
        vibrar([30, 40, 30]);
    } else if (d.cambiar !== undefined) estado.pedidos[Number(d.cambiar)] = nuevoPedido();
    else if (d.venderTodo !== undefined) {
        let total = 0;
        for (const [id, n] of Object.entries(estado.granero)) {
            total += precioVenta(id) * n;
            estado.granero[id] = 0;
        }
        estado.monedas += total;
        avisar(`Vendiste todo: +🪙${formatear(total)}`);
        vibrar(30);
    } else if (d.vender) {
        if ((estado.granero[d.vender] ?? 0) < 1) return;
        estado.granero[d.vender]--;
        estado.monedas += precioVenta(d.vender);
    } else if (d.animal) {
        const a = animal(d.animal);
        if (estado.monedas < a.costo) return;
        estado.monedas -= a.costo;
        estado.animales.push({ tipo: a.id, desde: Date.now() });
        avisar(`¡Nuevo animal: ${a.nombre}!`);
        vibrar(30);
    } else if (d.mejora) {
        const m = MEJORAS.find((x) => x.id === d.mejora);
        const costo = m.costo(mejora(m.id));
        if (estado.monedas < costo) return;
        estado.monedas -= costo;
        estado.mejoras[m.id] = mejora(m.id) + 1;
        avisar(`${m.ico} ${m.nombre} mejorado`);
        vibrar(30);
    }
    refrescar();
});

for (const p of document.querySelectorAll(".pestana-g")) {
    p.addEventListener("click", () => {
        pestana = p.dataset.p;
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

setInterval(() => guardar(CLAVE, estado), 5000);
addEventListener("pagehide", () => guardar(CLAVE, estado));
// Si estuvo cerrada con granjero, cosecha lo que maduró
pintarDatos();
pintarPanel();
