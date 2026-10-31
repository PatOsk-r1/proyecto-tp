// Granja: plantá, cosechá, criá animales y cumplí pedidos. Todo crece aunque la app esté cerrada.
import { formatear, cargar, guardar, vibrar } from "../../js/comun3d.js";
import { crearLienzo, bucle, crearChispas } from "../../js/lienzo2d.js";
import { sonidos, volumen, cambiarVolumen } from "./sonido.js";
import { dibujarPersona, frase, GRACIAS, persona } from "./visitas.js";
import { dibujarAnimal } from "./animales.js";
import { abrirGarra } from "./garra.js";
import { CAPITULOS } from "./misiones.js";
import { crearBase } from "../../js/incremental.js";

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
// Edificios que transforman productos: cada uno tiene una receta y una cola (se hacen de a uno)
const FABRICAS = [
    { id: "molino", nombre: "Molino", nivel: 3, costo: 400, receta: { trigo: 3 }, da: "harina", nombreProducto: "Harina", tiempo: 45, precio: 40, xp: 3 },
    { id: "lecheria", nombre: "Lechería", nivel: 5, costo: 1500, receta: { leche: 2 }, da: "queso", nombreProducto: "Queso", tiempo: 120, precio: 210, xp: 8 },
    { id: "panaderia", nombre: "Panadería", nivel: 6, costo: 3000, receta: { harina: 2, huevo: 2 }, da: "pan", nombreProducto: "Pan casero", tiempo: 90, precio: 160, xp: 6 },
    { id: "dulceria", nombre: "Dulcería", nivel: 9, costo: 12000, receta: { frutilla: 3 }, da: "mermelada", nombreProducto: "Mermelada", tiempo: 180, precio: 1350, xp: 25 },
];
const fabrica = (id) => FABRICAS.find((f) => f.id === id);
const PRODUCTOS = Object.fromEntries([
    ...CULTIVOS.map((c) => [c.id, { nombre: c.nombre, precio: c.precio, color: c.color }]),
    ...ANIMALES.map((a) => [a.producto, { nombre: a.nombreProducto, precio: a.precio, color: "#fff" }]),
    ...FABRICAS.map((f) => [f.da, { nombre: f.nombreProducto, precio: f.precio, color: "#fff" }]),
]);

const estado = cargar(CLAVE, { monedas: 30, xp: 0, nivel: 1, lotes: 6, parcelas: [], animales: [], granero: {}, mejoras: {}, pedidos: [], elegida: "trigo" });
const mejora = (id) => estado.mejoras[id] ?? 0;
const xpParaNivel = (n) => Math.round(12 * n ** 1.6);
// ---------- Estaciones del año: cambian cada 4 días de la granja (32 minutos) ----------
// En su temporada un cultivo crece 25% más rápido y se vende 20% más caro; en invierno todo crece un poco más lento
const ESTACIONES = [
    { id: "primavera", icono: "🌸", nombre: "Primavera", cultivos: ["zanahoria", "frutilla"], pasto: ["#8fd88f", "#55a865"] },
    { id: "verano", icono: "☀️", nombre: "Verano", cultivos: ["tomate", "maiz", "uva"], pasto: ["#9ccc65", "#5a9a3c"] },
    { id: "otono", icono: "🍂", nombre: "Otoño", cultivos: ["calabaza", "trigo"], pasto: ["#c5b358", "#8a8a3c"] },
    { id: "invierno", icono: "❄️", nombre: "Invierno", cultivos: [], pasto: ["#cfe2dc", "#7fa89c"] },
];
const DURACION_ESTACION = 4 * 8 * 60 * 1000;
const estacion = () => ESTACIONES[Math.floor(Date.now() / DURACION_ESTACION) % 4];
const faltaEstacion = () => DURACION_ESTACION - (Date.now() % DURACION_ESTACION);
const deTemporada = (id) => estacion().cultivos.includes(id);
const multEstacion = (id) => (deTemporada(id) ? 0.75 : estacion().id === "invierno" ? 1.15 : 1);
const tiempoCultivo = (c) => c.tiempo * (1 - mejora("regadera") * 0.08) * multEstacion(c.id) * 1000;
const tiempoAnimal = (a) => a.tiempo * (1 - mejora("comedero") * 0.1) * 1000;
const precioVenta = (id) => Math.round(PRODUCTOS[id].precio * (1 + mejora("mercado") * 0.08) * (deTemporada(id) ? 1.2 : 1));
const cultivo = (id) => CULTIVOS.find((c) => c.id === id);
const animal = (id) => ANIMALES.find((a) => a.id === id);
const costoLote = () => Math.round(50 * 2.2 ** (estado.lotes - 6));
const enGranero = () => Object.values(estado.granero).reduce((t, n) => t + n, 0);
// Registro de todo lo que se hizo (lo usan las misiones para medir el avance)
estado.registro ??= { cosecha: {}, recogido: {}, fabricado: {}, entregas: 0 };
function registrar(tipo, id, n) {
    if (tipo === "entregas") estado.registro.entregas += n;
    else estado.registro[tipo][id] = (estado.registro[tipo][id] ?? 0) + n;
}

// ---------- Taller: edificios que transforman productos ----------
// estado.fabricas[id] = { cola: [fin, fin…] } (momento en que termina cada tanda; se hacen de a una)
estado.fabricas ??= {};
const tengoFabrica = (id) => Boolean(estado.fabricas[id]);
const lugaresCola = (id) => 3 + (estado.fabricas[id]?.extra ?? 0);
const listosEn = (id) => (estado.fabricas[id]?.cola ?? []).filter((fin) => fin <= Date.now()).length;
const trabajando = (id) => (estado.fabricas[id]?.cola ?? []).some((fin) => fin > Date.now());
const alcanzaReceta = (f) => Object.entries(f.receta).every(([id, n]) => (estado.granero[id] ?? 0) >= n);
function hacerEnFabrica(id) {
    const f = fabrica(id);
    const datos = estado.fabricas[id];
    if (!datos || datos.cola.length >= lugaresCola(id) || !alcanzaReceta(f)) return false;
    for (const [p, n] of Object.entries(f.receta)) estado.granero[p] -= n;
    // Empieza cuando termina la anterior (o ya, si no hay nada)
    const desde = Math.max(Date.now(), ...datos.cola);
    datos.cola.push(desde + f.tiempo * 1000);
    return true;
}
function juntarFabrica(id) {
    const f = fabrica(id);
    const datos = estado.fabricas[id];
    const n = listosEn(id);
    if (!n) return 0;
    datos.cola = datos.cola.filter((fin) => fin > Date.now());
    estado.granero[f.da] = (estado.granero[f.da] ?? 0) + n;
    registrar("fabricado", f.da, n);
    sumarXP(f.xp * n);
    return n;
}

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
// Dibujos que no cambian (parcelas, plantas, brillos) se pintan una vez en un lienzo aparte y después
// solo se copian: es mucho más rápido que volver a dibujar todo con degradados en cada cuadro.
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
// Brillo redondo (luciérnagas y faroles): un solo degradado reutilizado
function brillo(color) {
    return sprite(`brillo-${color}`, 64, 64, (c) => {
        const g = c.createRadialGradient(32, 32, 0, 32, 32, 32);
        g.addColorStop(0, `rgba(${color},1)`);
        g.addColorStop(0.35, `rgba(${color},0.4)`);
        g.addColorStop(1, `rgba(${color},0)`);
        c.fillStyle = g;
        c.fillRect(0, 0, 64, 64);
    });
}
const lienzo = crearLienzo($("lienzo"), (d) => {
    ancho = d.ancho;
    alto = d.alto;
    fondoCache = null;
    sprites.clear();
}, 1.5);
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
const luciernagas = Array.from({ length: 28 }, () => ({ x: Math.random(), y: 0.1 + Math.random() * 0.9, fase: Math.random() * 10, v: 0.3 + Math.random() * 0.5 }));

// Medidas: cielo arriba, parcelas en el medio y corral abajo
// Solo se muestran las filas de parcelas que tenés más la del próximo terreno: así cada parcela es más grande
const filasVisibles = () => Math.min(MAX_LOTES / COLUMNAS, Math.ceil(Math.min(MAX_LOTES, estado.lotes + 1) / COLUMNAS));
const lotesVisibles = () => filasVisibles() * COLUMNAS;
let filasAntes = 0;
function medidas() {
    const cielo = Math.min(alto * 0.14, 80);
    const corral = alto * 0.24;
    const filas = filasVisibles();
    if (filas !== filasAntes) {
        // Cambió el tamaño de las parcelas: se vuelven a pintar el fondo y los dibujos guardados
        filasAntes = filas;
        fondoCache = null;
        sprites?.clear();
    }
    const hueco = 8;
    const zonaH = alto - cielo - corral - 8;
    const lado = Math.min((ancho - 20) / COLUMNAS, zonaH / filas, 150) - hueco;
    const ox = (ancho - COLUMNAS * (lado + hueco)) / 2 + hueco / 2;
    const oy = cielo + 4 + (zonaH - filas * (lado + hueco)) / 2;
    return { lado, ox, oy, hueco, cielo, corralY: alto - corral, corral, filas };
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

// Ciclo de día y noche de la granja: un día entero cada 8 minutos.
// 0 = de noche, 1 = pleno día (con atardecer y amanecer suaves)
const CICLO = 8 * 60 * 1000;
const momentoDelDia = () => (Date.now() % CICLO) / CICLO;
function luzDelDia() {
    const f = momentoDelDia();
    if (f < 0.6) return 1; // día
    if (f < 0.68) return 1 - (f - 0.6) / 0.08; // atardecer
    if (f < 0.92) return 0; // noche
    return (f - 0.92) / 0.08; // amanecer
}
let luzAnterior = luzDelDia();

// Faroles del campo: a los costados de las parcelas y sobre la cerca del corral
function posicionesFaroles(m) {
    const izq = Math.max(9, m.ox - 16);
    const der = Math.min(ancho - 9, ancho - m.ox + 16);
    const abajo = m.oy + m.filas * (m.lado + m.hueco);
    const lista = [];
    // Si no hay lugar a los costados de las parcelas (celular), todos los faroles van sobre la cerca
    if (m.ox < 24) {
        for (const x of [0.06, 0.3, 0.54, 0.78, 0.96]) lista.push([ancho * x, m.corralY + 2]);
        return lista;
    }
    for (const y of [m.oy + m.lado * 0.6, (m.oy + abajo) / 2 + m.lado * 0.3, abajo - m.lado * 0.2]) lista.push([izq, y], [der, y]);
    lista.push([ancho * 0.3, m.corralY + 2], [ancho * 0.7, m.corralY + 2]);
    return lista;
}
function dibujarFarol(ctx, x, y, prendido, tiempo, k) {
    // Poste de madera
    ctx.fillStyle = "#4a2e17";
    ctx.fillRect(x - 1.8, y - 22, 3.6, 26);
    ctx.fillRect(x - 1.8, y - 24, 8, 2.5);
    // Farol colgando
    const fx = x + 6;
    const fy = y - 17;
    ctx.strokeStyle = "#2b1a0e";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(fx, y - 22);
    ctx.lineTo(fx, fy - 4);
    ctx.stroke();
    ctx.fillStyle = "#2b1a0e";
    ctx.fillRect(fx - 4, fy - 5, 8, 2);
    ctx.fillRect(fx - 4, fy + 5, 8, 2);
    const titila = 0.85 + Math.sin(tiempo * 9 + k * 1.7) * 0.08 + Math.sin(tiempo * 23 + k) * 0.05;
    ctx.fillStyle = prendido ? `rgba(255, ${200 + titila * 40}, 110, ${0.6 + prendido * 0.4})` : "#6b7f8a";
    ctx.beginPath();
    ctx.roundRect(fx - 3.4, fy - 3, 6.8, 8, 2);
    ctx.fill();
    return { x: fx, y: fy + 1, titila };
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
        // Premio de nivel: un tiro en la garra (se acumulan)
        estado.garra = (estado.garra ?? 0) + 1;
        setTimeout(() => avisar(`🕹️ ¡Ganaste un tiro en la garra de premios! Tenés ${estado.garra}`, 2600), 2700);
        if (typeof completarPedidos === "function") completarPedidos();
    }
}

function plantar(i, id) {
    const c = cultivo(id);
    if (!c) return false;
    // Sin monedas el trigo sale gratis: nunca te quedás sin poder plantar
    const gratis = c.id === "trigo" && estado.monedas < c.semilla;
    if (!gratis && estado.monedas < c.semilla) return false;
    if (!gratis) estado.monedas -= c.semilla;
    estado.parcelas[i] = gratis ? { cultivo: id, desde: Date.now(), gratis: true } : { cultivo: id, desde: Date.now() };
    rebotes[i] = performance.now();
    return true;
}

function cosechar(i, automatico = false) {
    const p = estado.parcelas[i];
    if (!p || progreso(p) < 1) return;
    const c = cultivo(p.cultivo);
    // El abono de caca da una de más; la mejora "Abono" da chance de doble
    const cantidad = (Math.random() < mejora("abono") * 0.1 ? 2 : 1) + (p.abonada ? 1 : 0);
    estado.granero[c.id] = (estado.granero[c.id] ?? 0) + cantidad;
    registrar("cosecha", c.id, cantidad);
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
    registrar("recogido", datos.producto, 1);
    sumarXP(datos.xp);
    const pos = posAnimal(k);
    vuelos.push({ x: pos.x, y: pos.y - 20, id: datos.producto, t: 0 });
    textos.push({ x: pos.x, y: pos.y - 30, t: `+1 ${datos.nombreProducto}`, vida: 1 });
    vibrar(15);
    sonidos[a.tipo]?.();
    return true;
}

// Pedidos: piden cosas que ya podés producir y pagan más que el mercado
// Según el nivel piden más cosas distintas y más cantidad (y pagan mejor por las combinaciones grandes)
const tiposPorPedido = () => Math.min(5, 1 + Math.floor(estado.nivel / 3)); // nivel 1: 1 · 3: 2 · 6: 3 · 9: 4 · 12+: 5
const pedidosALaVez = () => (estado.nivel >= 12 ? 5 : estado.nivel >= 6 ? 4 : 3);
function nuevoPedido() {
    const disponibles = [
        ...CULTIVOS.filter((c) => c.nivel <= estado.nivel).map((c) => c.id),
        ...ANIMALES.filter((a) => estado.animales.some((x) => x.tipo === a.id)).map((a) => a.producto),
        // Lo que hacen tus edificios del taller también se pide (y paga mejor)
        ...FABRICAS.filter((f) => tengoFabrica(f.id)).map((f) => f.da),
    ];
    const items = {};
    // Cuántas cosas distintas: entre la mitad y el máximo de su nivel
    const maximo = Math.min(tiposPorPedido(), disponibles.length);
    const cuantos = Math.max(1, Math.ceil(maximo / 2) + Math.floor(Math.random() * (maximo - Math.ceil(maximo / 2) + 1)));
    const mezcla = [...disponibles].sort(() => Math.random() - 0.5).slice(0, cuantos);
    const multiplicador = 1 + estado.nivel * 0.12;
    for (const id of mezcla) {
        const base = 1 + Math.floor(Math.random() * Math.max(2, 7 - PRODUCTOS[id].precio / 40));
        items[id] = Math.max(1, Math.round(base * multiplicador * (0.7 + Math.random() * 0.5)));
    }
    const valor = Object.entries(items).reduce((t, [id, n]) => t + PRODUCTOS[id].precio * n, 0);
    const extraCombinacion = 1.5 + (Object.keys(items).length - 1) * 0.12;
    const nombres = ["Doña Rosa", "El panadero", "La escuela", "Don Tito", "El restaurante", "La feria", "Abuela Marta"];
    return { quien: nombres[Math.floor(Math.random() * nombres.length)], items, premio: Math.round(valor * extraCombinacion), xp: Math.round(valor / 8) + 2 * Object.keys(items).length };
}
// Al subir de nivel aparecen más pedidos a la vez
function completarPedidos() {
    while (estado.pedidos.length < pedidosALaVez()) estado.pedidos.push(nuevoPedido());
}
completarPedidos();
const sePuede = (p) => Object.entries(p.items).every(([id, n]) => (estado.granero[id] ?? 0) >= n);

// ---------- Caca y abono ----------
// Los animales comen cada tanto y después hacen caca. Juntando 5 cacas se arma una bolsa de abono:
// el abono se le pone a lo que está creciendo, termina la mitad de lo que faltaba y da 1 de más al cosechar.
const CACAS_POR_BOLSA = 5;
const MAX_CACAS = 15;
estado.caca ??= [];
estado.estiercol ??= 0;
estado.abono ??= 0;
// Una sola vez: 2 tiros de la garra por cada nivel que ya se había subido antes de que existiera
if (!estado.garraInicial) {
    estado.garraInicial = true;
    const regalo = 2 * Math.max(0, estado.nivel - 1);
    estado.garra = (estado.garra ?? 0) + regalo;
    if (regalo) setTimeout(() => avisar(`🕹️ ¡Regalo! ${regalo} tiros en la garra por tus ${estado.nivel - 1} niveles`, 3500), 3600);
}
const intervaloCaca = (datos) => Math.max(45, datos.tiempo * 0.8) * 1000;
function hacerCaca(mov) {
    if (estado.caca.length >= MAX_CACAS) return;
    estado.caca.push({ x: Math.max(0.03, Math.min(0.97, mov.x - (mov.vx >= 0 ? 0.03 : -0.03))), y: Math.max(0, Math.min(1, mov.y + 0.05)), t: Date.now() });
    sonidos.plop?.();
}
// Lo que hicieron mientras la granja estuvo cerrada (como mucho unas pocas por animal)
for (const a of estado.animales) {
    const datos = ANIMALES.find((x) => x.id === a.tipo);
    if (!datos || !a.caca) continue;
    const veces = Math.min(3, Math.floor((Date.now() - a.caca) / intervaloCaca(datos)));
    for (let k = 0; k < veces && estado.caca.length < MAX_CACAS; k++) estado.caca.push({ x: 0.08 + Math.random() * 0.84, y: Math.random(), t: Date.now() });
    if (veces > 0) a.caca = Date.now();
}
function posCaca(c, m = medidas()) {
    const tam = Math.min(46, m.corral * 0.5);
    return { x: 20 + c.x * (ancho - 40), y: m.corralY + 30 + c.y * (m.corral - 50) + tam * 0.38 };
}
function dibujarCaca(ctx, pos, tiempo, c) {
    ctx.save();
    ctx.translate(pos.x, pos.y);
    const aparece = Math.min(1, (Date.now() - (c.t ?? 0)) / 300);
    ctx.scale(aparece, aparece);
    ctx.fillStyle = "#0002";
    ctx.beginPath();
    ctx.ellipse(0, 2, 9, 3, 0, 0, TAU);
    ctx.fill();
    // Tres rollitos marrones con brillo
    for (const [dy, rx, ry] of [[0, 8, 4], [-4.5, 6, 3.4], [-8.5, 3.8, 2.8]]) {
        const g = ctx.createRadialGradient(-2, dy - 2, 0, 0, dy, rx);
        g.addColorStop(0, "#9c6b3f");
        g.addColorStop(1, "#5a3a1e");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.ellipse(0, dy, rx, ry, 0, 0, TAU);
        ctx.fill();
    }
    ctx.fillStyle = "#5a3a1e";
    ctx.beginPath();
    ctx.moveTo(-1.5, -10.5);
    ctx.quadraticCurveTo(1, -14, 2.5, -12);
    ctx.lineTo(1, -10);
    ctx.fill();
    // Mosquitas dando vueltas
    ctx.fillStyle = "#222";
    for (let k = 0; k < 2; k++) {
        const a = tiempo * (3 + k) + (c.x + k) * 9;
        ctx.beginPath();
        ctx.arc(Math.cos(a) * 9, -16 + Math.sin(a * 1.3) * 4, 1.1, 0, TAU);
        ctx.fill();
    }
    ctx.restore();
}
// Junta las cacas que haya cerca del dedo
function juntarCaca(x, y) {
    const m = medidas();
    let juntadas = 0;
    for (let i = estado.caca.length - 1; i >= 0; i--) {
        const p = posCaca(estado.caca[i], m);
        if (Math.hypot(p.x - x, p.y - 6 - y) > 22) continue;
        estado.caca.splice(i, 1);
        estado.estiercol++;
        juntadas++;
        chispas.emitir(p.x, p.y - 4, "#7a4a22", 6, 70);
        textos.push({ x: p.x, y: p.y - 18, t: `💩 ${estado.estiercol}/${CACAS_POR_BOLSA}`, vida: 0.9 });
        if (estado.estiercol >= CACAS_POR_BOLSA) {
            estado.estiercol -= CACAS_POR_BOLSA;
            estado.abono++;
            avisar(`🧺 ¡Bolsa de abono! Tenés ${estado.abono}. Elegila en Semillas`, 2600);
            sonidos.comprar();
        }
    }
    if (juntadas) {
        sonidos.plop?.();
        vibrar(10);
    }
    return juntadas > 0;
}
// Pala: saca lo que está creciendo y devuelve la mitad de lo que costó la semilla
const SVG_PALA = `<svg viewBox="0 0 48 48" width="44" height="44" aria-hidden="true">
    <rect x="22" y="4" width="4" height="24" rx="2" fill="#a9713f"/><rect x="17" y="3" width="14" height="5" rx="2.5" fill="#7a4a22"/>
    <path d="M14 27h20v6c0 6-4.5 11-10 11S14 39 14 33z" fill="#adb5bd"/><path d="M16 29h16v4c0 5-3.6 9-8 9" fill="none" stroke="#e9ecef" stroke-width="2"/></svg>`;
function sacarConPala(i) {
    const p = estado.parcelas[i];
    if (!p || progreso(p) >= 1) return false;
    const c = cultivo(p.cultivo);
    const vuelve = p.gratis ? 0 : Math.floor(c.semilla / 2);
    estado.parcelas[i] = null;
    estado.monedas += vuelve;
    rebotes[i] = performance.now();
    const r = rectParcela(i);
    chispas.emitir(r.x + r.w / 2, r.y + r.h / 2, "#6f4518", 14, 120);
    textos.push({ x: r.x + r.w / 2, y: r.y + 8, t: vuelve ? `Sacado · +${vuelve}` : "Sacado", vida: 1 });
    sonidos.plop?.();
    vibrar(15);
    return true;
}

// Abonar lo que está creciendo
function abonar(i) {
    const p = estado.parcelas[i];
    if (!p || progreso(p) >= 1 || p.abonada) return false;
    if (estado.abono < 1) {
        avisar("No tenés abono: juntá la caca de los animales 💩");
        sonidos.error();
        return false;
    }
    const falta = (1 - progreso(p)) * tiempoCultivo(cultivo(p.cultivo));
    p.desde -= falta * 0.5;
    p.abonada = true;
    estado.abono--;
    estado.abonoUsado = (estado.abonoUsado ?? 0) + 1;
    rebotes[i] = performance.now();
    const r = rectParcela(i);
    chispas.emitir(r.x + r.w / 2, r.y + r.h / 2, "#8fd14f", 14, 110);
    textos.push({ x: r.x + r.w / 2, y: r.y + 8, t: "🌿 ¡Abonado!", vida: 1 });
    sonidos.plantar();
    vibrar(15);
    return true;
}

// ---------- Vida de los animales: ir al comedero, comer, tomar agua, hacer caca y producir ----------
// Comedero a la izquierda y bebedero a la derecha, abajo del corral (posiciones como las de los animales: 0 a 1)
const COMEDERO = { x: 0.1, y: 0.92 };
const BEBEDERO = { x: 0.9, y: 0.92 };
let comida = 1; // cuánto pasto queda en el comedero (se vuelve a llenar solo)
let ondas = -10; // cuándo tomó agua alguien (para las ondas)
const pxCorral = (x, y, m = medidas()) => ({ x: 20 + x * (ancho - 40), y: m.corralY + 30 + y * (m.corral - 50) });
const suave = (t) => t * t * (3 - 2 * t);

// Mueve al animal según lo que esté haciendo y devuelve la pose para dibujarlo
function actualizarAnimal(a, mov, datos, dt, duermen, pos, tam) {
    // Cada uno con su horario (así no les da hambre a todos juntos)
    a.caca ??= Date.now() - Math.random() * intervaloCaca(datos) * 0.7;
    const listo = Date.now() - a.desde >= tiempoAnimal(datos);
    // Recién terminó de producir: animación de poner el huevo, dar leche…
    if (mov.listoAntes === false && listo && !mov.anim) {
        mov.anim = { tipo: "producir", t: 0, dur: 1.5 };
        mov.objetivo = null;
        sonidos[a.tipo]?.();
    }
    mov.listoAntes = listo;
    if (!mov.anim && !mov.objetivo && !duermen) {
        // Al comedero van de a uno: si hay otro comiendo (o yendo), espera su turno
        const ocupado = andar.some((o) => o && o !== mov && (o.objetivo?.luego === "comer" || o.anim?.tipo === "comer"));
        if (Date.now() - a.caca > intervaloCaca(datos) && !ocupado) {
            // Tiene hambre: va al comedero (se para a la derecha, mirando hacia él)
            mov.objetivo = { x: COMEDERO.x + 0.09 + Math.random() * 0.03, y: COMEDERO.y - Math.random() * 0.12, luego: "comer", mira: -1 };
        } else if (Math.random() < dt * 0.015) {
            const tomando = andar.some((o) => o && o !== mov && (o.objetivo?.luego === "beber" || o.anim?.tipo === "beber"));
            if (!tomando) mov.objetivo = { x: BEBEDERO.x - 0.09 - Math.random() * 0.03, y: BEBEDERO.y - Math.random() * 0.12, luego: "beber", mira: 1 };
        }
    }
    if (duermen && !mov.anim) mov.objetivo = null;
    const pose = {};
    if (mov.anim) {
        const an = mov.anim;
        an.t += dt;
        const p = Math.min(1, an.t / an.dur);
        if (an.tipo === "comer") {
            const entra = suave(Math.min(1, an.t / 0.3));
            pose.cabeza = a.tipo === "gallina" ? entra * Math.abs(Math.sin(an.t * 9)) : entra * (0.85 + Math.sin(an.t * 7) * 0.12);
            pose.masticar = Math.abs(Math.sin(an.t * 16));
            if (p >= 1) pose.cabeza = 0;
            // Pedacitos de pasto
            if (Math.random() < dt * 6) {
                const m = medidas();
                const c = pxCorral(COMEDERO.x, COMEDERO.y, m);
                chispas.emitir(c.x + (Math.random() - 0.5) * 14, c.y + tam * 0.25, Math.random() < 0.5 ? "#8fd14f" : "#e9c46a", 2, 50);
            }
            comida = Math.max(0, comida - dt * 0.05);
        } else if (an.tipo === "beber") {
            pose.cabeza = suave(Math.min(1, an.t / 0.3)) * (p > 0.85 ? (1 - p) / 0.15 : 1);
            pose.masticar = Math.abs(Math.sin(an.t * 10)) * 0.5;
            ondas = performance.now() / 1000;
        } else if (an.tipo === "cagar") {
            // Se agacha, levanta la cola, cierra los ojos… ¡y plop!
            pose.aplastar = Math.sin(p * Math.PI) * 0.75;
            pose.cola = p < 0.85 ? Math.min(1, p * 4) : 0;
            pose.ojos = p > 0.25 && p < 0.7 ? "cerrados" : p >= 0.7 ? "felices" : undefined;
            if (p > 0.6 && !an.hecho) {
                an.hecho = true;
                a.caca = Date.now();
                hacerCaca(mov);
            }
        } else if (an.tipo === "producir") {
            if (a.tipo === "gallina") {
                pose.aleteo = p < 0.75 ? 1 : 0;
                pose.aplastar = Math.sin(p * Math.PI * 3) * 0.35;
                pose.ojos = p > 0.6 ? "felices" : undefined;
                if (p > 0.6 && !an.hecho) {
                    an.hecho = true;
                    chispas.emitir(pos.x - tam * 0.1, pos.y + tam * 0.3, "#fff5e1", 8, 90);
                }
            } else if (a.tipo === "cerdo") {
                // Escarba buscando la trufa
                pose.cabeza = 0.5 + Math.abs(Math.sin(an.t * 14)) * 0.5;
                if (Math.random() < dt * 14) chispas.emitir(pos.x + tam * 0.45 * (mov.vx >= 0 ? 1 : -1), pos.y + tam * 0.35, "#6f4518", 2, 80);
            } else {
                // Vaca y oveja: se estiran contentas y largan algo (leche o lana)
                pose.aplastar = -Math.sin(p * Math.PI) * 0.5;
                pose.ojos = "felices";
                if (p > 0.5 && !an.hecho) {
                    an.hecho = true;
                    chispas.emitir(pos.x, pos.y - tam * 0.2, a.tipo === "oveja" ? "#ffffff" : "#e8f4ff", 12, 110);
                }
            }
        }
        if (p >= 1) {
            const venia = an.tipo;
            mov.anim = null;
            if (venia === "producir") mov.burbuja = performance.now();
            if (venia === "comer") {
                // Después de comer se aleja un poco y al rato hace caca
                mov.vx = (Math.random() * 0.04 + 0.03);
                mov.caca = 1.4 + Math.random() * 1.2;
            }
        }
    } else if (mov.objetivo) {
        // Camina hacia el comedero o el bebedero
        const o = mov.objetivo;
        const dx = o.x - mov.x;
        const dy = o.y - mov.y;
        const dist = Math.hypot(dx, dy);
        const vel = 0.11;
        if (dist < 0.012) {
            mov.vx = o.mira * 0.0001;
            mov.anim = { tipo: o.luego, t: 0, dur: o.luego === "comer" ? 3.2 : 2.2 };
            mov.objetivo = null;
        } else {
            mov.x += (dx / dist) * vel * dt;
            mov.y += (dy / dist) * vel * dt;
            mov.vx = Math.sign(dx || 1) * vel;
            mov.fase += dt * 1.4;
        }
    } else if (!duermen) {
        mov.x += mov.vx * dt;
        if (mov.x < 0.05 || mov.x > 0.95) mov.vx *= -1;
        mov.x = Math.max(0.04, Math.min(0.96, mov.x));
        if (Math.random() < dt * 0.3) mov.vx = (Math.random() - 0.5) * 0.08;
        mov.fase += dt * (Math.abs(mov.vx) > 0.01 ? 1 : 0.2);
        if (mov.caca) {
            mov.caca -= dt;
            if (mov.caca <= 0) {
                mov.caca = 0;
                mov.vx *= 0.0001;
                mov.anim = { tipo: "cagar", t: 0, dur: 1.5 };
            }
        }
    }
    return pose;
}

// Comedero de madera con pasto y bebedero con agua que se mueve
function dibujarEstablo(ctx, m, tiempo, dt) {
    comida = Math.min(1, comida + dt * 0.01);
    // Comedero y bebedero se pintan una vez (según cuánto pasto queda) y solo se mueven los brillos del agua
    const nivel = Math.round(comida * 5) / 5;
    const fijo = sprite(`establo-${nivel}-${Math.round(m.corralY)}`, ancho, m.corral, (c) => {
        c.translate(0, -m.corralY);
        dibujarEstabloFijo(c, m, nivel);
    });
    ctx.drawImage(fijo.c, 0, m.corralY, fijo.w, fijo.h);
    const tam = Math.min(46, m.corral * 0.5);
    const b = pxCorral(BEBEDERO.x, BEBEDERO.y, m);
    const bw = Math.min(58, ancho * 0.15);
    const by = b.y + tam * 0.24;
    const ax = b.x - bw / 2 + 3;
    const aw = bw - 6;
    ctx.save();
    ctx.beginPath();
    ctx.rect(ax, by, aw, 7);
    ctx.clip();
    ctx.strokeStyle = "#ffffffaa";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (let k = 0; k < 3; k++) {
        const fx = ax + ((tiempo * 12 + (k * aw) / 3) % aw);
        ctx.moveTo(fx - 5, by + 2 + k * 1.5);
        ctx.quadraticCurveTo(fx, by + 1 + k * 1.5, fx + 5, by + 2 + k * 1.5);
    }
    ctx.stroke();
    // Ondas cuando un animal toma agua
    const desde = tiempo - ondas;
    if (desde >= 0 && desde < 1.2) {
        for (let k = 0; k < 2; k++) {
            const r = ((desde + k * 0.4) % 1.2) * 14;
            ctx.strokeStyle = `rgba(255,255,255,${0.7 - r / 20})`;
            ctx.beginPath();
            ctx.ellipse(ax + 8, by + 3.5, r, r * 0.3, 0, 0, TAU);
            ctx.stroke();
        }
    }
    ctx.restore();
}

function dibujarEstabloFijo(ctx, m, comida) {
    const tam = Math.min(46, m.corral * 0.5);
    const madera = (x, y, w, h, r = 3) => {
        const g = ctx.createLinearGradient(x, y, x, y + h);
        g.addColorStop(0, "#b07a45");
        g.addColorStop(1, "#6f4518");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, r);
        ctx.fill();
    };
    // --- Comedero ---
    const c = pxCorral(COMEDERO.x, COMEDERO.y, m);
    const cw = Math.min(54, ancho * 0.14);
    const cy = c.y + tam * 0.22;
    const cx = c.x - cw / 2;
    ctx.fillStyle = "#0003";
    ctx.beginPath();
    ctx.ellipse(c.x, cy + 16, cw * 0.6, 4, 0, 0, TAU);
    ctx.fill();
    madera(cx + 3, cy + 8, 4, 9, 1);
    madera(cx + cw - 7, cy + 8, 4, 9, 1);
    // Batea en forma de V
    ctx.fillStyle = "#5c3a1e";
    ctx.beginPath();
    ctx.moveTo(cx, cy - 2);
    ctx.lineTo(cx + cw, cy - 2);
    ctx.lineTo(cx + cw - 6, cy + 11);
    ctx.lineTo(cx + 6, cy + 11);
    ctx.closePath();
    ctx.fill();
    // Pasto adentro (baja cuando comen)
    const alto = 3 + comida * 8;
    for (let k = 0; k < 14; k++) {
        const hx = cx + 4 + (k / 13) * (cw - 8);
        const hh = alto * (0.7 + ((k * 37) % 10) / 30);
        ctx.strokeStyle = k % 3 ? "#e9c46a" : "#8fd14f";
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(hx, cy + 2);
        ctx.quadraticCurveTo(hx + ((k % 2) - 0.5) * 4, cy + 2 - hh * 0.6, hx + ((k % 3) - 1) * 3, cy + 2 - hh);
        ctx.stroke();
    }
    madera(cx - 2, cy - 4, cw + 4, 4, 2);
    madera(cx + 4, cy + 8, cw - 8, 3, 1);
    ctx.fillStyle = "#c58d55";
    ctx.fillRect(cx - 2, cy - 4, cw + 4, 1.2);

    // --- Bebedero ---
    const b = pxCorral(BEBEDERO.x, BEBEDERO.y, m);
    const bw = Math.min(58, ancho * 0.15);
    const by = b.y + tam * 0.24;
    const bx = b.x - bw / 2;
    ctx.fillStyle = "#0003";
    ctx.beginPath();
    ctx.ellipse(b.x, by + 14, bw * 0.6, 4, 0, 0, TAU);
    ctx.fill();
    madera(bx, by - 2, bw, 14, 5);
    // Agua con brillo que se mueve
    const ax = bx + 3;
    const aw = bw - 6;
    const agua = ctx.createLinearGradient(0, by, 0, by + 7);
    agua.addColorStop(0, "#8ee3ff");
    agua.addColorStop(1, "#2a9fd6");
    ctx.fillStyle = agua;
    ctx.beginPath();
    ctx.roundRect(ax, by, aw, 7, 3);
    ctx.fill();
    // Borde de madera con brillo
    ctx.strokeStyle = "#4a2e17";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(bx, by - 2, bw, 14, 5);
    ctx.stroke();
    ctx.fillStyle = "#c58d55";
    ctx.fillRect(bx + 4, by - 2, bw - 8, 1.2);
}

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
    } else if (id === "tomate") {
        // Tomatera: tutor de caña, hojas y tomates grandes y redondos con la estrellita verde arriba
        ctx.strokeStyle = "#c9a26b";
        ctx.lineWidth = Math.max(2, tam * 0.03);
        ctx.beginPath();
        ctx.moveTo(0, tam * 0.22);
        ctx.lineTo(0, -tam * 0.3);
        ctx.stroke();
        ctx.fillStyle = "#2d6a4f";
        for (const [dx, dy, giro] of [[-0.12, -0.2, 0.6], [0.12, -0.12, -0.6], [-0.13, 0.05, 0.4], [0.13, 0.08, -0.4]]) {
            ctx.beginPath();
            ctx.ellipse(dx * tam, dy * tam, tam * 0.1, tam * 0.045, giro, 0, TAU);
            ctx.fill();
        }
        for (const [dx, dy, rr] of [[-0.07, -0.08, 0.1], [0.08, 0.02, 0.11], [-0.04, 0.13, 0.085]]) {
            const rf = rr * tam;
            const g = ctx.createRadialGradient(dx * tam - rf * 0.4, dy * tam - rf * 0.4, 0, dx * tam, dy * tam, rf);
            g.addColorStop(0, "#ffb4a2");
            g.addColorStop(0.35, "#e63946");
            g.addColorStop(1, "#9d0208");
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(dx * tam, dy * tam, rf, 0, TAU);
            ctx.fill();
            // Estrellita de hojas
            ctx.fillStyle = "#40916c";
            for (let k = 0; k < 5; k++) {
                const a = (k / 5) * TAU - Math.PI / 2;
                ctx.beginPath();
                ctx.ellipse(dx * tam + Math.cos(a) * rf * 0.3, dy * tam - rf * 0.75 + Math.sin(a) * rf * 0.2, rf * 0.28, rf * 0.1, a, 0, TAU);
                ctx.fill();
            }
        }
    } else if (id === "frutilla") {
        // Frutilla: planta bajita de hojas de a tres y frutillas con forma de corazón, puntitos amarillos y coronita
        ctx.fillStyle = "#40916c";
        for (const [dx, dy] of [[-0.12, -0.06], [0.12, -0.08], [0, -0.16]]) {
            for (let k = 0; k < 3; k++) {
                const a = -Math.PI / 2 + (k - 1) * 0.8;
                ctx.beginPath();
                ctx.ellipse(dx * tam + Math.cos(a) * tam * 0.05, dy * tam + Math.sin(a) * tam * 0.05, tam * 0.055, tam * 0.035, a, 0, TAU);
                ctx.fill();
            }
        }
        for (const [dx, dy, s] of [[-0.09, 0.06, 1], [0.08, 0.09, 1.1], [0, 0.0, 0.85]]) {
            const fx = dx * tam;
            const fy = dy * tam;
            const ft = tam * 0.12 * s;
            const g = ctx.createLinearGradient(fx, fy - ft * 0.5, fx, fy + ft);
            g.addColorStop(0, "#ff4d6d");
            g.addColorStop(1, "#c9184a");
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.moveTo(fx, fy + ft);
            ctx.bezierCurveTo(fx - ft * 0.9, fy + ft * 0.2, fx - ft * 0.8, fy - ft * 0.55, fx, fy - ft * 0.4);
            ctx.bezierCurveTo(fx + ft * 0.8, fy - ft * 0.55, fx + ft * 0.9, fy + ft * 0.2, fx, fy + ft);
            ctx.fill();
            ctx.fillStyle = "#ffe066";
            for (const [sx, sy] of [[-0.3, 0], [0.3, 0], [0, 0.15], [-0.15, 0.45], [0.15, 0.45], [0, -0.15]]) {
                ctx.beginPath();
                ctx.ellipse(fx + sx * ft, fy + sy * ft, ft * 0.06, ft * 0.09, 0, 0, TAU);
                ctx.fill();
            }
            ctx.fillStyle = "#2d6a4f";
            for (let k = 0; k < 4; k++) {
                ctx.beginPath();
                ctx.ellipse(fx + (k - 1.5) * ft * 0.22, fy - ft * 0.45, ft * 0.16, ft * 0.07, (k - 1.5) * 0.5, 0, TAU);
                ctx.fill();
            }
        }
    } else if (id === "uva") {
        // Parra: hoja grande y racimo de uvas en triángulo
        ctx.fillStyle = "#40916c";
        ctx.beginPath();
        ctx.ellipse(-tam * 0.1, -tam * 0.16, tam * 0.13, tam * 0.09, -0.4, 0, TAU);
        ctx.ellipse(tam * 0.1, -tam * 0.18, tam * 0.12, tam * 0.08, 0.4, 0, TAU);
        ctx.fill();
        ctx.strokeStyle = "#6f4518";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, -tam * 0.2);
        ctx.lineTo(0, -tam * 0.1);
        ctx.stroke();
        for (const [dx, dy] of [[-0.09, -0.06], [0, -0.06], [0.09, -0.06], [-0.045, 0.02], [0.045, 0.02], [-0.09, 0.02], [0.09, 0.02], [0, 0.1], [-0.045, 0.1], [0.045, 0.1], [0, 0.18]]) {
            const rf = tam * 0.05;
            const g = ctx.createRadialGradient(dx * tam - rf * 0.35, dy * tam - rf * 0.35, 0, dx * tam, dy * tam, rf);
            g.addColorStop(0, "#e0aaff");
            g.addColorStop(0.4, c.color);
            g.addColorStop(1, "#3c096c");
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(dx * tam, dy * tam, rf, 0, TAU);
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
    } else if (id === "harina") {
        // Bolsa de harina atada
        ctx.fillStyle = "#f8f1e3";
        ctx.beginPath();
        ctx.moveTo(-tam * 0.1, -tam * 0.24);
        ctx.quadraticCurveTo(-tam * 0.3, tam * 0.05, -tam * 0.22, tam * 0.28);
        ctx.lineTo(tam * 0.22, tam * 0.28);
        ctx.quadraticCurveTo(tam * 0.3, tam * 0.05, tam * 0.1, -tam * 0.24);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = "#c9a26b";
        ctx.fillRect(-tam * 0.12, -tam * 0.24, tam * 0.24, tam * 0.06);
        ctx.fillStyle = "#e9c46a";
        ctx.beginPath();
        ctx.ellipse(0, tam * 0.06, tam * 0.08, tam * 0.11, 0, 0, TAU);
        ctx.fill();
    } else if (id === "queso") {
        // Porción de queso con agujeros
        ctx.fillStyle = "#ffd166";
        ctx.beginPath();
        ctx.moveTo(-tam * 0.28, tam * 0.2);
        ctx.lineTo(tam * 0.28, tam * 0.2);
        ctx.lineTo(tam * 0.28, -tam * 0.04);
        ctx.lineTo(-tam * 0.2, -tam * 0.2);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = "#c98a1b";
        ctx.stroke();
        ctx.fillStyle = "#e0a93a";
        for (const [dx, dy, r] of [[-0.08, 0.06, 0.05], [0.12, 0.08, 0.04], [0.04, -0.04, 0.03]]) {
            ctx.beginPath();
            ctx.arc(dx * tam, dy * tam, r * tam, 0, TAU);
            ctx.fill();
        }
    } else if (id === "pan") {
        // Pan casero con cortes
        const g = ctx.createLinearGradient(0, -tam * 0.2, 0, tam * 0.2);
        g.addColorStop(0, "#e9a45b");
        g.addColorStop(1, "#a0612a");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.ellipse(0, tam * 0.04, tam * 0.3, tam * 0.18, 0, 0, TAU);
        ctx.fill();
        ctx.strokeStyle = "#fbe3c0";
        ctx.lineWidth = 2;
        for (const dx of [-0.12, 0, 0.12]) {
            ctx.beginPath();
            ctx.moveTo(dx * tam - tam * 0.04, -tam * 0.04);
            ctx.lineTo(dx * tam + tam * 0.04, tam * 0.08);
            ctx.stroke();
        }
    } else if (id === "mermelada") {
        // Frasco de mermelada con tapa a cuadros
        ctx.fillStyle = "#c9184a";
        ctx.beginPath();
        ctx.roundRect(-tam * 0.18, -tam * 0.12, tam * 0.36, tam * 0.4, tam * 0.06);
        ctx.fill();
        ctx.fillStyle = "#ffffff55";
        ctx.fillRect(-tam * 0.13, -tam * 0.08, tam * 0.05, tam * 0.28);
        ctx.fillStyle = "#fdf0d5";
        ctx.fillRect(-tam * 0.14, tam * 0.02, tam * 0.28, tam * 0.12);
        ctx.fillStyle = "#e63946";
        ctx.beginPath();
        ctx.roundRect(-tam * 0.21, -tam * 0.24, tam * 0.42, tam * 0.12, tam * 0.04);
        ctx.fill();
        ctx.fillStyle = "#fff";
        for (let k = 0; k < 4; k++) ctx.fillRect(-tam * 0.19 + k * tam * 0.1, -tam * 0.22, tam * 0.05, tam * 0.04);
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
    const radioAstro = m.cielo * 0.4;
    const dia = luz > 0.4;
    const astro = sprite(`astro-${dia}`, 64, 64, (c) => {
        const g = c.createRadialGradient(32, 32, 0, 32, 32, 32);
        g.addColorStop(0, dia ? "#fff7c2" : "#f8f9fa");
        g.addColorStop(dia ? 0.3 : 0.25, dia ? "#ffd166" : "#dee2e6");
        g.addColorStop(1, dia ? "#ffd16600" : "#dee2e600");
        c.fillStyle = g;
        c.fillRect(0, 0, 64, 64);
    });
    ctx.drawImage(astro.c, x - radioAstro, y - radioAstro, radioAstro * 2, radioAstro * 2);
    for (const n of nubes) {
        n.x += n.v * dt;
        if (n.x > 1.25) n.x = -0.25;
        const llueve = n === nubeLluvia;
        const color = llueve ? "#7d8597" : "#ffffff";
        ctx.globalAlpha = llueve ? 1 : dia ? (esperaLluvia > 0 ? 0.7 : 0.85) : 0.19;
        // Cada nube es un dibujo guardado (según su tamaño y si llueve)
        const nube = sprite(`nube-${n.s.toFixed(2)}-${color}`, 56 * n.s, 34 * n.s, (c) => {
            c.fillStyle = color;
            for (const [dx, dy, r] of [[0, 0, 13], [14, 3, 10], [-14, 3, 9], [6, -6, 9]]) {
                c.beginPath();
                c.arc(28 * n.s + dx * n.s, 17 * n.s + dy * n.s, r * n.s, 0, TAU);
                c.fill();
            }
        });
        const cx = n.x * ancho + (llueve ? Math.sin(tiempo * 30) * 0.8 : 0);
        const cy = m.cielo * n.y + 6;
        ctx.drawImage(nube.c, cx - 28 * n.s, cy - 17 * n.s, nube.w, nube.h);
    }
    ctx.globalAlpha = 1;
}

// Lo que no se mueve, pintado una sola vez: colinas, granero, pasto, flores y el corral
function pintarFondo(m) {
    const escala = Math.min(devicePixelRatio, 1.5);
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
    pasto.addColorStop(0, estacion().pasto[0]);
    pasto.addColorStop(1, estacion().pasto[1]);
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
    ctx.roundRect(m.ox - 8, m.oy - 8, COLUMNAS * (m.lado + m.hueco) + 8, m.filas * (m.lado + m.hueco) + 8, 18);
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
let anguloMolino = 0;
let estacionAnterior = null;
const copos = [];
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
    ctx.rotate(anguloMolino);
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
    // Cantero (sombra, madera, tierra y surcos): se pinta una vez y se copia
    const b = Math.max(4, r.w * 0.08);
    const regada = p && prog < 1;
    const base = sprite(`parcela-${regada ? "m" : "s"}-${p?.abonada ? "a" : ""}-${Math.round(r.w)}`, r.w + 4, r.h + 6, (c) => {
        c.fillStyle = "#00000033";
        c.beginPath();
        c.roundRect(2, 5, r.w, r.h, radio);
        c.fill();
        const marco = c.createLinearGradient(0, 0, 0, r.h);
        marco.addColorStop(0, "#c08552");
        marco.addColorStop(1, "#7a4a22");
        c.fillStyle = marco;
        c.beginPath();
        c.roundRect(0, 0, r.w, r.h, radio);
        c.fill();
        const tierra = c.createLinearGradient(0, b, 0, r.h - b);
        tierra.addColorStop(0, regada ? "#5a3a22" : "#8b5e3c");
        tierra.addColorStop(1, regada ? "#3b2414" : "#6b4423");
        c.fillStyle = tierra;
        c.beginPath();
        c.roundRect(b, b, r.w - b * 2, r.h - b * 2, radio * 0.6);
        c.fill();
        for (let k = 1; k <= 3; k++) {
            const y = b + ((r.h - b * 2) * k) / 4;
            c.fillStyle = "#00000030";
            c.fillRect(b + 3, y, r.w - b * 2 - 6, 2);
            c.fillStyle = "#ffffff14";
            c.fillRect(b + 3, y - 2, r.w - b * 2 - 6, 1.5);
        }
        c.strokeStyle = "#ffffff30";
        c.lineWidth = 1.5;
        c.beginPath();
        c.moveTo(radio, 1.5);
        c.lineTo(r.w - radio, 1.5);
        c.stroke();
        if (p?.abonada) {
            // Tierra abonada: puntitos oscuros y una hojita en la esquina
            c.fillStyle = "#2b1a0e";
            const r2 = azar(7);
            for (let k = 0; k < 10; k++) {
                c.beginPath();
                c.arc(b + 4 + r2() * (r.w - b * 2 - 8), b + 4 + r2() * (r.h - b * 2 - 8), 1.6, 0, TAU);
                c.fill();
            }
            c.fillStyle = "#8fd14f";
            c.beginPath();
            c.ellipse(b + 7, b + 7, 5, 2.6, -0.7, 0, TAU);
            c.fill();
        }
    });
    ctx.drawImage(base.c, r.x, r.y, base.w, base.h);
    if (!p) return;
    // La planta según su etapa (también guardada), con un vaivén suave y el saltito al plantar o cosechar
    const etapa = prog < 0.2 ? 0 : prog < 1 ? 1 + Math.min(5, Math.floor(prog * 6)) : 9;
    const lado = r.w * 1.4;
    const planta = sprite(`planta-${p.cultivo}-${etapa}-${Math.round(r.w)}`, lado, lado, (c) => {
        const progEtapa = etapa === 0 ? 0.1 : etapa === 9 ? 1 : Math.min(0.99, etapa / 6);
        dibujarPlanta(c, p.cultivo, lado / 2, lado / 2, r.w, progEtapa, -lado / 4);
    });
    const desde = (performance.now() - (rebotes[i] ?? -1e9)) / 1000;
    const salto = desde < 0.45 ? 1 + Math.sin(desde * 14) * 0.18 * (1 - desde / 0.45) : 1;
    ctx.save();
    ctx.translate(r.x + r.w / 2, r.y + r.h * 0.62 + r.w * 0.2);
    ctx.rotate(etapa ? Math.sin(tiempo * 2 + i) * 0.05 : 0);
    ctx.scale(salto, salto);
    ctx.drawImage(planta.c, -lado / 2, -lado / 2 - r.w * 0.2, lado, lado);
    ctx.restore();
    if (prog < 1) {
        // Mini indicador: qué está creciendo (dibujito con anillo de progreso) y cuánto falta
        const rr = Math.max(8, Math.min(12, r.w * 0.12));
        const ix = r.x + r.w - rr - 2;
        const iy = r.y + rr + 2;
        ctx.fillStyle = "#00000040";
        ctx.beginPath();
        ctx.arc(ix + 1, iy + 1.5, rr + 2, 0, TAU);
        ctx.fill();
        ctx.fillStyle = "#fff4dc";
        ctx.beginPath();
        ctx.arc(ix, iy, rr + 1.5, 0, TAU);
        ctx.fill();
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = "#d9c39a";
        ctx.beginPath();
        ctx.arc(ix, iy, rr, 0, TAU);
        ctx.stroke();
        ctx.strokeStyle = p.abonada ? "#2f9e44" : "#5cb85c";
        ctx.beginPath();
        ctx.arc(ix, iy, rr, -Math.PI / 2, -Math.PI / 2 + prog * TAU);
        ctx.stroke();
        ctx.save();
        ctx.beginPath();
        ctx.arc(ix, iy, rr - 1.5, 0, TAU);
        ctx.clip();
        const ico = sprite(`icono-${p.cultivo}-${Math.round(rr)}`, rr * 2, rr * 2, (c) => iconoProducto(c, p.cultivo, rr, rr * 1.15, rr * 1.15));
        ctx.drawImage(ico.c, ix - rr, iy - rr, rr * 2, rr * 2);
        ctx.restore();
        // Tiempo que falta
        const seg = Math.ceil(((1 - prog) * tiempoCultivo(cultivo(p.cultivo))) / 1000);
        const texto = seg >= 60 ? `${Math.floor(seg / 60)}:${String(seg % 60).padStart(2, "0")}` : `${seg}s`;
        ctx.font = `900 ${Math.max(8, Math.min(11, r.w * 0.12))}px system-ui, sans-serif`;
        const tw = ctx.measureText(texto).width + 8;
        const ty = r.y + r.h - b - 9;
        ctx.fillStyle = "#000000a0";
        ctx.beginPath();
        ctx.roundRect(r.x + r.w / 2 - tw / 2, ty - 5, tw, 11, 5);
        ctx.fill();
        ctx.fillStyle = "#fff";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(texto, r.x + r.w / 2, ty + 0.5);
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
    // El molino gira más rápido cuando está moliendo
    anguloMolino += dt * (trabajando("molino") ? 3.5 : 0.9);
    dibujarMolino(ctx, m, tiempo);

    // Parcelas
    for (let i = 0; i < lotesVisibles(); i++) dibujarParcela(ctx, i, rectParcela(i, m), tiempo);

    if (!estado.animales.length) {
        // Cartelito legible sobre el corral vacío
        const texto = estado.nivel >= 2 ? "Comprá animales en la pestaña Animales" : "Los animales se destraban en el nivel 2";
        ctx.font = "800 13px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        const ty = m.corralY + m.corral / 2 + 8;
        const tw = ctx.measureText(texto).width + 22;
        ctx.fillStyle = "#1b4332cc";
        ctx.beginPath();
        ctx.roundRect(ancho / 2 - tw / 2, ty - 13, tw, 26, 13);
        ctx.fill();
        ctx.fillStyle = "#fff";
        ctx.fillText(texto, ancho / 2, ty + 1);
    }
    const tam = Math.min(46, m.corral * 0.5);
    dibujarEstablo(ctx, m, tiempo, dt);
    // Caca en el piso del corral (se junta tocándola)
    for (const c of estado.caca ?? []) dibujarCaca(ctx, posCaca(c, m), tiempo, c);
    const duermen = luz < 0.25;
    const orden = estado.animales.map((a, k) => ({ a, k, pos: posAnimal(k) })).sort((p, q) => p.pos.y - q.pos.y);
    for (const { a, k, pos } of orden) {
        const mov = andar[k];
        const datos = animal(a.tipo);
        const pose = actualizarAnimal(a, mov, datos, dt, duermen, pos, tam);
        const mira = mov.vx >= 0 ? 1 : -1;
        if (mov.anim) {
            // Animaciones especiales (comer, caca, producir): se dibujan en vivo
            const quieto = mov.anim.tipo === "comer" || mov.anim.tipo === "beber";
            dibujarAnimal(ctx, a.tipo, pos.x, pos.y, tam, quieto ? 0 : mov.fase, mira, pose);
        } else {
            // Caminando o quieto: uno de 8 cuadros del paso, guardado (más los ojos cerrados al parpadear)
            const cuadro = Math.round(((mov.fase * 4) / Math.PI) * 4) % 8;
            const parpadea = (performance.now() / 1000 + pos.x * 0.013) % 3.7 < 0.12;
            const lado = tam * 1.5;
            const img = sprite(`animal-${a.tipo}-${mira}-${cuadro}-${parpadea ? 1 : 0}-${Math.round(tam)}`, lado, lado, (c) =>
                dibujarAnimal(c, a.tipo, lado / 2, lado * 0.52, tam, (cuadro * Math.PI) / 16, mira, { ojos: parpadea ? "cerrados" : "abiertos" })
            );
            ctx.drawImage(img.c, pos.x - lado / 2, pos.y - lado * 0.52, lado, lado);
        }
        if (duermen && !mov.anim) {
            // Zzz
            for (let z = 0; z < 3; z++) {
                const t = (tiempo * 0.6 + z / 3 + k * 0.2) % 1;
                ctx.globalAlpha = 1 - t;
                ctx.fillStyle = "#e0e7ff";
                ctx.font = `900 ${9 + t * 6}px system-ui, sans-serif`;
                ctx.fillText("z", pos.x + tam * 0.3 + t * 12, pos.y - tam * 0.5 - t * 20);
            }
            ctx.globalAlpha = 1;
        }
        // Burbuja con lo que produjo (aparece después de la animación)
        const listo = Date.now() - a.desde >= tiempoAnimal(datos);
        if (listo && mov.anim?.tipo !== "producir") {
            const aparece = Math.min(1, (performance.now() - (mov.burbuja ?? 0)) / 350);
            const escala = aparece < 1 ? 0.4 + Math.sin(aparece * Math.PI * 0.75) * 0.75 : 1;
            const by = pos.y - tam * 0.72 + Math.sin(tiempo * 4 + k) * 3;
            ctx.save();
            ctx.translate(pos.x, by);
            ctx.scale(escala, escala);
            ctx.fillStyle = "#0003";
            ctx.beginPath();
            ctx.arc(1, 2, 14, 0, TAU);
            ctx.fill();
            ctx.fillStyle = "#fff";
            ctx.beginPath();
            ctx.arc(0, 0, 14, 0, TAU);
            ctx.moveTo(-4, 12);
            ctx.lineTo(0, 19);
            ctx.lineTo(4, 12);
            ctx.fill();
            iconoProducto(ctx, datos.producto, 0, 0, 22);
            ctx.restore();
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

    // Estación: aviso al cambiar y partículas (pétalos, hojas o nieve)
    const est = estacion();
    if (est.id !== estacionAnterior) {
        if (estacionAnterior) {
            const nombres = est.cultivos.map((id) => cultivo(id).nombre.toLowerCase());
            avisar(`${est.icono} ¡Llegó ${est.nombre.toLowerCase()}!${nombres.length ? ` De temporada: ${nombres.join(", ")}` : " Todo crece un poco más lento"}`, 3500);
        }
        estacionAnterior = est.id;
        fondoCache = null;
        ultimoPanel = "";
    }
    if (est.id !== "verano") {
        while (copos.length < (calidad.nivel ? 22 : 10)) copos.push({ x: Math.random() * ancho, y: Math.random() * alto, v: 14 + Math.random() * 22, fase: Math.random() * 6 });
        for (const c of copos) {
            c.y += c.v * dt;
            c.fase += dt;
            c.x += Math.sin(c.fase) * 12 * dt;
            if (c.y > alto) {
                c.y = -6;
                c.x = Math.random() * ancho;
            }
            if (est.id === "invierno") {
                ctx.fillStyle = "#ffffffd0";
                ctx.beginPath();
                ctx.arc(c.x, c.y, 2, 0, TAU);
                ctx.fill();
            } else {
                ctx.save();
                ctx.translate(c.x, c.y);
                ctx.rotate(c.fase * 2);
                ctx.fillStyle = est.id === "otono" ? (c.v > 25 ? "#d4772c" : "#a1612b") : "#ffafcc";
                ctx.beginPath();
                ctx.ellipse(0, 0, 4, 2, 0, 0, TAU);
                ctx.fill();
                ctx.restore();
            }
        }
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
    // Faroles (se prenden al anochecer) y la oscuridad de la noche
    const prendido = Math.max(0, Math.min(1, (0.7 - luz) / 0.4));
    const luces = posicionesFaroles(m).map(([x, y], k) => dibujarFarol(ctx, x, y, prendido, tiempo, k));
    if (luz < 1) {
        ctx.fillStyle = `rgba(10, 16, 55, ${(1 - luz) * 0.3})`; // suave: los cultivos se tienen que ver igual
        ctx.fillRect(0, m.cielo, ancho, alto - m.cielo);
        if (prendido > 0) {
            // Luz cálida de cada farol que ilumina alrededor
            ctx.globalCompositeOperation = "lighter";
            const luzFarol = brillo("255,170,80");
            ctx.globalAlpha = 0.42 * prendido;
            for (const l of luces) {
                const radio = 62 * l.titila;
                ctx.drawImage(luzFarol.c, l.x - radio, l.y - radio, radio * 2, radio * 2);
            }
            ctx.globalAlpha = 1;
            ctx.globalCompositeOperation = "source-over";
            // El vidrio del farol brilla
            for (const l of luces) {
                ctx.fillStyle = `rgba(255, 245, 200, ${prendido})`;
                ctx.beginPath();
                ctx.arc(l.x, l.y, 1.8, 0, TAU);
                ctx.fill();
            }
        }
        ctx.globalAlpha = 1 - luz;
        for (const f of luciernagas) {
            f.fase += dt;
            // Vuelan despacio dando vueltas
            const x = (f.x + Math.sin(f.fase * 0.35 * f.v) * 0.08 + Math.sin(f.fase * 1.7) * 0.01) * ancho;
            const y = m.cielo + (alto - m.cielo) * (f.y + Math.cos(f.fase * 0.45 * f.v) * 0.05);
            ctx.globalAlpha = (1 - luz) * (Math.sin(f.fase * 3) + 1) / 2;
            ctx.drawImage(brillo("230,255,140").c, x - 9, y - 9, 18, 18);
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
let cuadroVisita = false;
let panelPendiente = false;
// Medidor de rendimiento (se prende en Ajustes): cuadros por segundo y el cuadro más lento
const medidor = { prendido: false, cuadros: 0, desde: performance.now(), anterior: performance.now(), peor: 0, trabajo: 0, suma: 0 };
try {
    medidor.prendido = localStorage.getItem("granja-fps") === "1";
} catch {}
function medirCuadro(inicio) {
    const ahora = performance.now();
    medidor.cuadros++;
    medidor.peor = Math.max(medidor.peor, ahora - medidor.anterior);
    medidor.trabajo = Math.max(medidor.trabajo, ahora - inicio);
    medidor.suma += ahora - inicio;
    medidor.anterior = ahora;
    if (ahora - medidor.desde < 1000) return;
    const fps = Math.round((medidor.cuadros * 1000) / (ahora - medidor.desde));
    // Verde si cada cuadro se dibuja en menos de 11 ms (lo que hace falta para 90 por segundo)
    const el = $("medidor-fps");
    const promedio = medidor.suma / medidor.cuadros;
    el.textContent = `${fps} fps · dibujo ${promedio.toFixed(1)} ms (máx ${medidor.trabajo.toFixed(1)}) · calidad ${calidad.nivel + 1}/3`;
    el.className = `medidor-fps ${promedio < 8 ? "bien" : promedio < 11 ? "justo" : "mal"}`;
    Object.assign(medidor, { cuadros: 0, desde: ahora, peor: 0, trabajo: 0, suma: 0 });
}
// Calidad automática: si el teléfono tarda en dibujar (más de 8 ms por cuadro durante un rato),
// se baja la resolución y se sacan efectos de fondo para que siga fluido. No vuelve a subir sola.
const calidad = { nivel: 2, suma: 0, cuadros: 0, malos: 0 };
function vigilarCalidad(ms) {
    calidad.suma += ms;
    if (++calidad.cuadros < 60) return;
    const promedio = calidad.suma / calidad.cuadros;
    calidad.suma = calidad.cuadros = 0;
    calidad.malos = promedio > 8 ? calidad.malos + 1 : 0;
    if (calidad.malos >= 2 && calidad.nivel > 0) {
        calidad.nivel--;
        calidad.malos = 0;
        if (calidad.nivel === 1) lienzo.cambiarEscala(1.15);
        else {
            lienzo.cambiarEscala(1);
            luciernagas.length = 12;
            mariposas.length = 1;
        }
    }
}
bucle((dt) => {
    const inicioCuadro = performance.now();
    avanzarLluvia(dt);
    // La persona se dibuja a la mitad de cuadros (alcanza para que se vea fluida)
    cuadroVisita = !cuadroVisita;
    if (pantallaGrande.matches && cuadroVisita) animarVisita(dt * 2);
    // Aviso cuando anochece o amanece
    const luzAhora = luzDelDia();
    if (luzAnterior >= 0.5 && luzAhora < 0.5) avisar("🌙 Anochece: se prenden los faroles", 2600);
    if (luzAnterior < 0.5 && luzAhora >= 0.5) avisar("☀️ ¡Buen día, granjero!", 2400);
    luzAnterior = luzAhora;
    // El granjero cosecha solo lo que está listo
    if (mejora("granjero")) estado.parcelas.forEach((p, i) => p && progreso(p) >= 1 && cosechar(i, true));
    dibujar(dt);
    acumulado += dt;
    if (acumulado > 0.5) {
        acumulado = 0;
        pintarDatos();
        panelPendiente = true;
    } else if (panelPendiente) {
        // El panel se actualiza en el cuadro siguiente, para no juntar todo el trabajo en uno solo
        panelPendiente = false;
        pintarPanel();
    }
    if (medidor.prendido) medirCuadro(inicioCuadro);
    vigilarCalidad(performance.now() - inicioCuadro);
});

// ---------- Toques ----------
// Tocar o deslizar el dedo: al arrastrar sobre varias parcelas se planta o cosecha en todas
// (lo mismo que hizo la primera), y al pasar sobre los animales se recoge lo que tengan.
let arrastre = null; // { modo: "plantar" | "cosechar" | "recoger", vistas: Set }
const parcelaEn = (x, y, m = medidas()) => {
    for (let i = 0; i < lotesVisibles(); i++) {
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
    let alguno = juntarCaca(x, y);
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
    } else if (arrastre.modo === "abonar") {
        if (abonar(i)) refrescar();
    } else if (arrastre.modo === "pala") {
        if (sacarConPala(i)) refrescar();
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
    for (let i = 0; i < lotesVisibles(); i++) {
        const r = rectParcela(i, m);
        if (x < r.x || x > r.x + r.w || y < r.y || y > r.y + r.h) continue;
        const p0 = estado.parcelas[i];
        const conAbono = estado.elegida === "abono";
        const conPala = estado.elegida === "pala";
        if (i < estado.lotes) {
            arrastre = {
                modo: !p0 ? (conAbono || conPala ? null : "plantar") : progreso(p0) >= 1 ? "cosechar" : conAbono ? "abonar" : conPala ? "pala" : null,
                vistas: new Set([i]),
            };
        }
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
        if (conPala) {
            if (p && progreso(p) < 1 && sacarConPala(i)) refrescar();
            else if (p) {
                cosechar(i);
                refrescar();
            } else avisar("La pala saca lo que está creciendo 🌱");
            return;
        }
        if (p && conAbono && progreso(p) < 1) {
            if (p.abonada) avisar("Esta parcela ya tiene abono");
            else if (abonar(i)) refrescar();
            return;
        }
        if (!p) {
            const c = cultivo(estado.elegida);
            if (!c) return conAbono && avisar("El abono va sobre lo que está creciendo 🌱");
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
        const antes = Math.floor(visita.mostrado);
        visita.mostrado = Math.min(visita.texto.length, visita.mostrado + dt * 40);
        const ahora = Math.floor(visita.mostrado);
        $("visita-texto").textContent = visita.texto.slice(0, ahora);
        // Ruidito de diálogo: un "blip" cada 3 letras (no en los espacios)
        for (let i = antes + 1; i <= ahora; i++) {
            if (i % 3 === 0 && /[a-záéíóúñ¡¿!?0-9]/i.test(visita.texto[i - 1] ?? "")) sonidos.hablar(persona(visita.quien).voz);
        }
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
    for (const c of contenedor.querySelectorAll("canvas[data-fabrica]")) dibujarFabrica(c.getContext("2d"), c.dataset.fabrica);
    // Barras de los productos en marcha: el CSS las anima solo (no hace falta redibujar el panel)
    for (const el of contenedor.querySelectorAll(".lugar[data-fin] .progreso-lugar")) {
        const lugar = el.parentElement;
        const dur = Number(lugar.dataset.dur);
        const falta = Math.max(0, (Number(lugar.dataset.fin) - Date.now()) / 1000);
        el.style.animationDuration = `${dur}s`;
        el.style.animationDelay = `${-(dur - Math.min(dur, falta))}s`;
    }
}

// Dibujo de cada edificio del taller (en su tarjeta)
function dibujarFabrica(ctx, id) {
    ctx.save();
    ctx.scale(2, 2);
    const W = 60;
    ctx.fillStyle = "#95d5b2";
    ctx.beginPath();
    ctx.ellipse(W / 2, 42, 28, 6, 0, 0, TAU);
    ctx.fill();
    if (id === "molino") {
        ctx.fillStyle = "#f8f1e3";
        ctx.beginPath();
        ctx.moveTo(20, 42);
        ctx.lineTo(25, 14);
        ctx.lineTo(35, 14);
        ctx.lineTo(40, 42);
        ctx.fill();
        ctx.fillStyle = "#8d5a2b";
        ctx.fillRect(27, 32, 6, 10);
        ctx.fillStyle = "#c1121f";
        ctx.beginPath();
        ctx.moveTo(23, 15);
        ctx.lineTo(30, 6);
        ctx.lineTo(37, 15);
        ctx.fill();
        ctx.translate(30, 15);
        for (let k = 0; k < 4; k++) {
            ctx.rotate(Math.PI / 2);
            ctx.fillStyle = "#8d5a2b";
            ctx.fillRect(-0.8, 0, 1.6, 14);
            ctx.fillStyle = "#fff";
            ctx.fillRect(1, 4, 4, 10);
        }
    } else if (id === "lecheria") {
        ctx.fillStyle = "#e63946";
        ctx.fillRect(14, 20, 32, 22);
        ctx.fillStyle = "#9d0208";
        ctx.beginPath();
        ctx.moveTo(11, 21);
        ctx.lineTo(30, 9);
        ctx.lineTo(49, 21);
        ctx.fill();
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 1.5;
        ctx.strokeRect(24, 28, 12, 14);
        ctx.fillStyle = "#e9ecef";
        ctx.beginPath();
        ctx.roundRect(42, 31, 9, 11, 2);
        ctx.fill();
        ctx.fillStyle = "#adb5bd";
        ctx.fillRect(43, 29, 7, 3);
    } else if (id === "panaderia") {
        ctx.fillStyle = "#c1694f";
        ctx.beginPath();
        ctx.moveTo(14, 42);
        ctx.lineTo(14, 26);
        ctx.quadraticCurveTo(30, 6, 46, 26);
        ctx.lineTo(46, 42);
        ctx.fill();
        ctx.strokeStyle = "#8a3b25";
        ctx.lineWidth = 1;
        for (let y = 30; y < 42; y += 4) {
            ctx.beginPath();
            ctx.moveTo(15, y);
            ctx.lineTo(45, y);
            ctx.stroke();
        }
        ctx.fillStyle = "#2b1a0e";
        ctx.beginPath();
        ctx.ellipse(30, 36, 8, 7, 0, Math.PI, 0);
        ctx.fill();
        ctx.fillRect(22, 36, 16, 6);
        ctx.fillStyle = "#ff9f1c";
        ctx.beginPath();
        ctx.ellipse(30, 38, 5, 3, 0, 0, TAU);
        ctx.fill();
        ctx.fillStyle = "#6c757d";
        ctx.fillRect(38, 8, 5, 10);
    } else {
        ctx.fillStyle = "#ffafcc";
        ctx.fillRect(14, 20, 32, 22);
        for (let k = 0; k < 4; k++) {
            ctx.fillStyle = k % 2 ? "#fff" : "#e63946";
            ctx.beginPath();
            ctx.moveTo(12 + k * 9, 16);
            ctx.lineTo(21 + k * 9, 16);
            ctx.lineTo(21 + k * 9, 23);
            ctx.quadraticCurveTo(16.5 + k * 9, 26, 12 + k * 9, 23);
            ctx.fill();
        }
        ctx.fillStyle = "#c9184a";
        for (const x of [20, 30, 40]) {
            ctx.beginPath();
            ctx.roundRect(x - 3, 30, 6, 8, 1.5);
            ctx.fill();
        }
    }
    ctx.restore();
}

let ultimoPanel = "";
function pintarPanel() {
    const panel = $("panel");
    const scroll = panel.scrollTop;
    let html;
    if (pestana === "semillas") {
        // Primero la bolsa de abono (se arma juntando la caca de los animales)
        const abono = `<button class="semilla-c abono-c${estado.elegida === "abono" ? " elegida" : ""}" data-semilla="abono" ${estado.abono > 0 || estado.elegida === "abono" ? "" : "disabled"}>
            <span class="bolsa-abono">🧺</span><span class="nombre-s">Abono ×${estado.abono}</span>
            <small>💩 ${estado.estiercol}/${CACAS_POR_BOLSA} para otra</small><span class="vende-s">más rápido</span></button>`;
        const pala = `<button class="semilla-c pala-c${estado.elegida === "pala" ? " elegida" : ""}" data-semilla="pala">
            <span class="bolsa-abono">${SVG_PALA}</span><span class="nombre-s">Pala</span>
            <small>Saca lo que crece</small><span class="vende-s">devuelve ½</span></button>`;
        html = `<div class="semillas">${pala}${abono}${CULTIVOS.map((c) => {
            const bloqueado = c.nivel > estado.nivel;
            return `<button class="semilla-c${estado.elegida === c.id ? " elegida" : ""}" data-semilla="${c.id}" ${bloqueado ? "disabled" : ""}>
                ${canvasProducto(c.id)}<span class="nombre-s">${c.nombre}</span><small>${bloqueado ? `🔒 Nivel ${c.nivel}` : `${MONEDA_G}${c.semilla} · ⏱ ${c.tiempo >= 60 ? c.tiempo / 60 + " min" : c.tiempo + " s"}`}</small>
                ${bloqueado ? "" : `<span class="vende-s">vende ${precioVenta(c.id)}</span>`}${!bloqueado && deTemporada(c.id) ? `<span class="temporada-s">${estacion().icono} temporada</span>` : ""}</button>`;
        }).join("")}</div><p class="ayuda-g ayuda-semillas">Elegí una semilla y tocá o deslizá el dedo sobre las parcelas vacías. Deslizá sobre lo maduro para cosechar. Juntá la caca del corral 💩 para hacer abono y ponéselo a lo que está creciendo.</p>`;
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
    } else if (pestana === "taller") {
        html = FABRICAS.map((f) => {
            const datos = estado.fabricas[f.id];
            const receta = Object.entries(f.receta).map(([id, n]) => `<span class="ing${(estado.granero[id] ?? 0) >= n ? " ok" : ""}">${canvasProducto(id)}<b>${Math.min(estado.granero[id] ?? 0, n)}/${n}</b></span>`).join("");
            const encabezado = `<canvas width="120" height="96" data-fabrica="${f.id}" class="dibujo-fabrica"></canvas>
                <div class="txt"><strong>${f.nombre}</strong><small>${PRODUCTOS[f.da].nombre} · ⏱ ${f.tiempo >= 60 ? `${f.tiempo / 60} min` : `${f.tiempo} s`} · vende ${precioVenta(f.da)}</small></div>`;
            if (!datos) {
                const bloqueada = f.nivel > estado.nivel;
                return `<div class="fabrica bloqueada">${encabezado}
                    <button class="boton-verde" data-construir="${f.id}" ${bloqueada || estado.monedas < f.costo ? "disabled" : ""}>${bloqueada ? `🔒 Nivel ${f.nivel}` : `Construir ${MONEDA_G}${formatear(f.costo)}`}</button></div>`;
            }
            const listos = listosEn(f.id);
            // Cola: cada lugar con el producto; los que están en marcha muestran una barra (la anima el CSS)
            const lugares = Array.from({ length: lugaresCola(f.id) }, (_, i) => {
                const fin = datos.cola[i];
                if (fin === undefined) return `<span class="lugar vacio"></span>`;
                const listo = fin <= Date.now();
                return `<span class="lugar${listo ? " listo" : ""}" data-fin="${fin}" data-dur="${f.tiempo}">${canvasProducto(f.da)}${listo ? "" : `<i class="progreso-lugar"></i>`}</span>`;
            }).join("");
            return `<div class="fabrica${listos ? " con-listos" : ""}">${encabezado}
                <div class="receta">${receta}<span class="flecha">➜</span>${canvasProducto(f.da)}</div>
                <div class="cola">${lugares}</div>
                <div class="botones-fabrica">
                    <button class="boton-verde" data-hacer="${f.id}" ${datos.cola.length >= lugaresCola(f.id) || !alcanzaReceta(f) ? "disabled" : ""}>Hacer ${PRODUCTOS[f.da].nombre}</button>
                    ${listos ? `<button class="boton-verde juntar" data-juntar="${f.id}">Juntar ${listos}</button>` : ""}
                </div></div>`;
        }).join("") + `<p class="ayuda-g">Los edificios transforman lo que cosechás en productos que valen mucho más y que la gente pide en los pedidos.</p>`;
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
    } else if (d.construir) {
        const f = fabrica(d.construir);
        if (estado.monedas < f.costo || f.nivel > estado.nivel || tengoFabrica(f.id)) return;
        estado.monedas -= f.costo;
        estado.fabricas[f.id] = { cola: [] };
        avisar(`🏭 ¡${f.nombre} construida!`);
        sonidos.comprar();
        vibrar(30);
        completarPedidos();
    } else if (d.hacer) {
        if (hacerEnFabrica(d.hacer)) {
            sonidos.plantar();
            vibrar(10);
        } else sonidos.error();
    } else if (d.juntar) {
        const n = juntarFabrica(d.juntar);
        if (n) {
            avisar(`📦 +${n} ${PRODUCTOS[fabrica(d.juntar).da].nombre}`);
            sonidos.cosechar();
            vibrar(20);
        }
    }
    else if (d.entregar !== undefined) {
        const p = estado.pedidos[Number(d.entregar)];
        if (!sePuede(p)) return;
        for (const [id, n] of Object.entries(p.items)) estado.granero[id] -= n;
        estado.monedas += p.premio;
        sumarXP(p.xp);
        estado.pedidos[Number(d.entregar)] = nuevoPedido();
        // Cada 6 pedidos entregados, un tiro de regalo en la garra
        estado.entregados = (estado.entregados ?? 0) + 1;
        registrar("entregas", null, 1);
        if (estado.entregados % 6 === 0) {
            estado.garra = (estado.garra ?? 0) + 1;
            setTimeout(() => avisar("🕹️ ¡6 pedidos entregados! +1 tiro en la garra", 2400), 1700);
        }
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
    $("taller-listo").hidden = !FABRICAS.some((f) => listosEn(f.id) > 0);
    pintarMision();
    const est = estacion();
    $("estacion").textContent = `${est.icono} ${est.nombre} · ${Math.ceil(faltaEstacion() / 60000)} min`;
    $("tiros-garra").textContent = estado.garra ?? 0;
    $("boton-garra").classList.toggle("hay", (estado.garra ?? 0) > 0);
}

function refrescar() {
    guardar(CLAVE, estado);
    pintarDatos();
    pintarPanel();
}

// ---------- Misiones en cadena ----------
estado.mision ??= { cap: 0, num: 0, base: null };
const misionActual = () => CAPITULOS[estado.mision.cap]?.misiones[estado.mision.num] ?? null;
// Cuánto llevaba el registro al empezar la misión (para contar desde ahí)
function valorRegistro(m) {
    if (m.tipo === "cosechar") return estado.registro.cosecha[m.id] ?? 0;
    if (m.tipo === "recoger") return estado.registro.recogido[m.id] ?? 0;
    if (m.tipo === "fabricar") return estado.registro.fabricado[m.id] ?? 0;
    if (m.tipo === "entregar") return estado.registro.entregas;
    return 0;
}
function avanceMision(m = misionActual()) {
    if (!m) return 0;
    if (["cosechar", "recoger", "fabricar", "entregar"].includes(m.tipo)) {
        estado.mision.base ??= valorRegistro(m);
        return Math.min(m.meta, valorRegistro(m) - estado.mision.base);
    }
    if (m.tipo === "construir") return tengoFabrica(m.id) ? 1 : 0;
    if (m.tipo === "animal") return Math.min(m.meta, estado.animales.filter((a) => a.tipo === m.id).length);
    if (m.tipo === "nivel") return Math.min(m.meta, estado.nivel);
    if (m.tipo === "mejora") return Math.min(m.meta, mejora(m.id));
    if (m.tipo === "lotes") return Math.min(m.meta, estado.lotes);
    return 0;
}
const textoPremio = (p) => [p.monedas && `🪙 ${formatear(p.monedas)}`, p.abono && `🧺 ${p.abono} abono`, p.garra && `🕹️ ${p.garra} tiro${p.garra > 1 ? "s" : ""}`, p.xp && `⭐ ${p.xp}`].filter(Boolean).join(" · ");
let avisoMisionDado = false;
function pintarMision() {
    const m = misionActual();
    const b = $("boton-mision");
    if (!m) {
        b.hidden = true;
        return;
    }
    const av = avanceMision(m);
    const lista = av >= m.meta;
    b.hidden = false;
    b.classList.toggle("lista", lista);
    b.innerHTML = `📜 <b>${lista ? "¡Cobrar!" : `${av}/${m.meta}`}</b>`;
    if (lista && !avisoMisionDado) {
        avisoMisionDado = true;
        avisar(`📜 ¡Misión cumplida! Tocá el botón para cobrar`, 2600);
        sonidos.nivel();
    }
}
function abrirMision() {
    const m = misionActual();
    if (!m) return;
    const cap = CAPITULOS[estado.mision.cap];
    const av = avanceMision(m);
    const lista = av >= m.meta;
    const fondo = document.createElement("div");
    fondo.className = "fondo-ajustes";
    fondo.innerHTML = `<div class="ajustes-g mision-hoja">
        <small class="capitulo">Capítulo ${estado.mision.cap + 1}: ${cap.titulo} · ${estado.mision.num + 1}/${cap.misiones.length}</small>
        <div class="quien-mision"><span class="cara">${CARAS[m.quien] ?? "🧑‍🌾"}</span><div><b>${m.quien}</b><p>${m.texto}</p></div></div>
        <div class="barra-xp"><div style="width:${(av / m.meta) * 100}%"></div></div>
        <small class="premio-mision">${av}/${m.meta} · Premio: ${textoPremio(m.premio)}</small>
        <button class="boton-verde ancho" type="button" ${lista ? "" : "disabled"}>${lista ? "Cobrar premio" : "En eso estoy"}</button>
        <button class="boton-g secundario" type="button" data-cerrar>Cerrar</button></div>`;
    const cerrar = () => fondo.remove();
    fondo.addEventListener("click", (e) => e.target === fondo && cerrar());
    fondo.querySelector("[data-cerrar]").addEventListener("click", cerrar);
    fondo.querySelector(".boton-verde").addEventListener("click", () => {
        if (avanceMision(m) < m.meta) return;
        const p = m.premio;
        estado.monedas += p.monedas ?? 0;
        estado.abono += p.abono ?? 0;
        estado.garra = (estado.garra ?? 0) + (p.garra ?? 0);
        if (p.xp) sumarXP(p.xp);
        estado.mision.num++;
        estado.mision.base = null;
        avisoMisionDado = false;
        if (estado.mision.num >= cap.misiones.length) {
            estado.mision.cap++;
            estado.mision.num = 0;
            avisar(CAPITULOS[estado.mision.cap] ? `📖 ¡Capítulo terminado! Empieza: ${CAPITULOS[estado.mision.cap].titulo}` : "📖 ¡Terminaste todas las misiones! Pronto habrá más", 3500);
        } else avisar(`📜 +${textoPremio(p)}`);
        sonidos.monedas();
        vibrar([30, 40, 30]);
        cerrar();
        refrescar();
    });
    document.body.appendChild(fondo);
    sonidos.toque();
}
$("boton-mision").addEventListener("click", abrirMision);

// Botón "Cosechar todo": aparece cuando hay 2 o más parcelas maduras
const maduras = () => estado.parcelas.map((p, i) => (p && progreso(p) >= 1 && i < lotesVisibles() ? i : -1)).filter((i) => i >= 0);
let ultimasMaduras = -1;
function pintarCosecharTodo() {
    const n = maduras().length;
    if (n === ultimasMaduras) return;
    ultimasMaduras = n;
    $("cosechar-todo").hidden = n < 2;
    $("cosechar-todo").textContent = `Cosechar todo (${n})`;
}
$("cosechar-todo").addEventListener("click", () => {
    const lista = maduras();
    lista.forEach((i, k) => setTimeout(() => cosechar(i), k * 70));
    setTimeout(() => {
        ultimasMaduras = -1;
        refrescar();
    }, lista.length * 70 + 50);
});
setInterval(pintarCosecharTodo, 400);

// ---------- Garra de premios ----------
function premioGarra(p) {
    let texto = p.nombre;
    if (p.id === "monedas" || p.id === "huevo") {
        const n = Math.round((p.id === "huevo" ? 250 : 40 + Math.random() * 60) * Math.max(1, estado.nivel));
        estado.monedas += n;
        texto = `${formatear(n)} monedas`;
    } else if (p.id === "abono") {
        estado.abono += 2;
        texto = "2 bolsas de abono";
    } else if (p.id === "estrella") {
        const xp = Math.round(xpParaNivel(estado.nivel) * 0.35);
        sumarXP(xp);
        texto = `${xp} de experiencia`;
    } else if (p.id === "nube") {
        esperaLluvia = 0;
        lluvia = 0;
        hacerLlover(null);
        texto = "¡Lluvia mágica!";
    } else if (p.id === "trebol") {
        // Todo lo que está creciendo queda listo
        let n = 0;
        for (const parcela of estado.parcelas) {
            if (parcela && progreso(parcela) < 1) {
                parcela.desde = 0;
                n++;
            }
        }
        texto = n ? `¡${n} cultivo${n > 1 ? "s" : ""} listo${n > 1 ? "s" : ""} ya!` : "Trébol de la suerte (+monedas)";
        if (!n) estado.monedas += 100 * estado.nivel;
    }
    refrescar();
    return texto;
}
$("boton-garra").addEventListener("click", () => {
    sonidos.toque();
    abrirGarra({
        tiros: () => estado.garra ?? 0,
        usarTiro: () => {
            estado.garra = Math.max(0, (estado.garra ?? 0) - 1);
            refrescar();
        },
        ganar: premioGarra,
        sonidos,
    });
});

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
// Número de versión instalada (el nombre del caché del service worker, ej. proyecto-tp-v75)
async function pintarVersion() {
    let version = "";
    try {
        version = (await caches.keys())
            .filter((k) => k.startsWith("proyecto-tp-"))
            .map((k) => k.replace("proyecto-tp-", ""))
            .sort((a, b) => parseInt(b.slice(1)) - parseInt(a.slice(1)))[0] ?? "";
    } catch {}
    if (!version) {
        try {
            version = (await (await fetch("../../sw.js", { cache: "no-store" })).text()).match(/VERSION = "([^"]+)"/)?.[1] ?? "";
        } catch {}
    }
    $("version-app").textContent = version ? `Versión ${version}` : "";
}
$("ajustes").addEventListener("click", () => {
    pintarVersion();
    pintarVolumen();
    $("hoja-ajustes").hidden = false;
    sonidos.toque();
});
$("cerrar-ajustes").addEventListener("click", () => ($("hoja-ajustes").hidden = true));
$("mostrar-fps").checked = medidor.prendido;
$("medidor-fps").hidden = !medidor.prendido;
$("mostrar-fps").addEventListener("change", (e) => {
    medidor.prendido = e.target.checked;
    $("medidor-fps").hidden = !medidor.prendido;
    try {
        localStorage.setItem("granja-fps", medidor.prendido ? "1" : "0");
    } catch {}
});
$("hoja-ajustes").addEventListener("click", (e) => e.target === $("hoja-ajustes") && ($("hoja-ajustes").hidden = true));

setInterval(() => guardar(CLAVE, estado), 5000);
addEventListener("pagehide", () => guardar(CLAVE, estado));
pintarDatos();
pintarPanel();

// ---------- Base común: logros, regalo diario y resumen al volver (la Granja tiene sus propios ajustes) ----------
const LOGROS = [
    { id: "nivel5", icono: "⭐", nombre: "Granjero novato", detalle: "Llegá a nivel 5", meta: 5, valor: () => estado.nivel, fichas: 300 },
    { id: "nivel10", icono: "🌟", nombre: "Granjero experto", detalle: "Llegá a nivel 10", meta: 10, valor: () => estado.nivel, fichas: 1500 },
    { id: "nivel15", icono: "👑", nombre: "Rey del campo", detalle: "Llegá a nivel 15", meta: 15, valor: () => estado.nivel, fichas: 6000 },
    { id: "trigo100", icono: "🌾", nombre: "Mar de trigo", detalle: "Cosechá 100 de trigo", meta: 100, valor: () => estado.registro.cosecha.trigo ?? 0, fichas: 500 },
    { id: "cosecha500", icono: "🧺", nombre: "Gran cosecha", detalle: "Cosechá 500 cultivos en total", meta: 500, valor: () => Object.values(estado.registro.cosecha).reduce((a, b) => a + b, 0), fichas: 2000 },
    { id: "pedidos25", icono: "📦", nombre: "Repartidor", detalle: "Entregá 25 pedidos", meta: 25, valor: () => estado.registro.entregas, fichas: 1200 },
    { id: "pedidos100", icono: "🚚", nombre: "La granja del pueblo", detalle: "Entregá 100 pedidos", meta: 100, valor: () => estado.registro.entregas, fichas: 5000 },
    { id: "animales", icono: "🐄", nombre: "Corral lleno", detalle: "Tené 8 animales", meta: 8, valor: () => estado.animales.length, fichas: 1500 },
    { id: "taller", icono: "🏭", nombre: "Industria rural", detalle: "Construí los 4 edificios del taller", meta: 4, valor: () => FABRICAS.filter((f) => tengoFabrica(f.id)).length, fichas: 4000 },
    { id: "terreno", icono: "🗺️", nombre: "Hacendado", detalle: "Comprá los 16 terrenos", meta: 16, valor: () => estado.lotes, fichas: 3000 },
    { id: "capitulo2", icono: "📖", nombre: "Buena vecina", detalle: "Terminá el capítulo 1 de misiones", meta: 1, valor: () => estado.mision.cap, fichas: 1000 },
    { id: "capitulo4", icono: "🏆", nombre: "Leyenda del pueblo", detalle: "Terminá todas las misiones", meta: 4, valor: () => estado.mision.cap, fichas: 10000 },
    { id: "abono", icono: "💩", nombre: "Nada se desperdicia", detalle: "Juntá 50 cacas", meta: 50, valor: () => (estado.abono + estado.abonoUsado) * 5 + estado.estiercol, fichas: 800 },
];
estado.abonoUsado ??= 0;
const base = crearBase({
    juego: "granja",
    barra: document.querySelector(".barra-granja"),
    logros: LOGROS,
    ajustes: false,
    regaloDiario: (dia) => {
        const m = Math.round(Math.max(80, estado.nivel * 40) * dia);
        if (dia === 7) return { icono: "🕹️", texto: `${formatear(m)} monedas, 3 tiros de garra y 3 abonos`, dar: () => ((estado.monedas += m), (estado.garra = (estado.garra ?? 0) + 3), (estado.abono += 3), refrescar()) };
        if (dia === 4) return { icono: "🧺", texto: `${formatear(m)} monedas y 2 abonos`, dar: () => ((estado.monedas += m), (estado.abono += 2), refrescar()) };
        return { icono: "🪙", texto: `${formatear(m)} monedas`, dar: () => ((estado.monedas += m), refrescar()) };
    },
});
// El botón de logros va antes de la ruedita de ajustes
$("ajustes").before(document.querySelector(".barra-granja .boton-base"));

// Al volver: qué pasó mientras la granja estuvo cerrada
{
    const ausente = (Date.now() - (estado.ultimaVisita ?? Date.now())) / 1000;
    const listos = estado.parcelas.filter((p) => p && progreso(p) >= 1).length;
    const animalesListos = estado.animales.filter((a) => Date.now() - a.desde >= tiempoAnimal(animal(a.tipo))).length;
    const taller = FABRICAS.reduce((t, f) => t + listosEn(f.id), 0);
    const mostro = ausente > 60 && base.resumenAlVolver(ausente, [
        { icono: "🌾", texto: "Cultivos listos para cosechar", valor: listos ? `${listos} (deslizá el dedo)` : "" },
        { icono: "🥚", texto: "Animales con algo para juntar", valor: animalesListos || "" },
        { icono: "🏭", texto: "Productos listos en el taller", valor: taller || "" },
        { icono: "💩", texto: "Caca para juntar en el corral", valor: estado.caca.length || "" },
        { icono: "👩‍🌾", texto: "El granjero cuidó el campo", valor: mejora("granjero") && estado.parcelas.some(Boolean) ? "✔" : "" },
    ]);
    if (!mostro) setTimeout(() => base.revisarRegalo(), 600);
}
setInterval(() => (estado.ultimaVisita = Date.now()), 4000);
addEventListener("pagehide", () => {
    estado.ultimaVisita = Date.now();
    guardar(CLAVE, estado);
});
