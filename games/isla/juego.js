// Isla del tesoro: una isla tapada de niebla que se descubre casilla por casilla gastando energía
// (se recarga sola). Cada casilla trae algo: monedas, madera, cocos, piedra, gemas, cofres o pedazos
// del mapa. Con eso se arma el campamento; con los 3 pedazos aparece la X del gran tesoro, y con el
// muelle se zarpa a una isla nueva más grande, ganando brújulas (ventaja para siempre).
import { formatear, cargar, guardar, vibrar } from "../../js/comun3d.js";
import { crearLienzo, bucle, crearChispas } from "../../js/lienzo2d.js";
import { crearAudio, MUSICAS } from "../../js/sonido.js";
import { crearBase, calidadAutomatica } from "../../js/incremental.js";

const $ = (id) => document.getElementById(id);
const CLAVE = "isla";
const COLS = 9;
const FILAS = 11;
const TAU = Math.PI * 2;

const audio = crearAudio({ musica: MUSICAS.misterio });
const { nota, golpe, efectos } = audio;
const sonidos = {
    cavar: () => {
        golpe({ dur: 0.12, vol: 0.2, filtro: 700, tipo: "lowpass" });
        golpe({ t: 0.18, dur: 0.1, vol: 0.16, filtro: 900, tipo: "lowpass" });
    },
    descubrir: () => nota({ f: 520, hasta: 780, dur: 0.18, vol: 0.12, onda: "sine" }),
    cofre: () => [659, 784, 988, 1319].forEach((f, k) => nota({ f, t: k * 0.08, dur: 0.35, vol: 0.16 })),
    gema: () => [1568, 2093, 2637].forEach((f, k) => nota({ f, t: k * 0.06, dur: 0.4, vol: 0.1, onda: "sine" })),
    comer: () => {
        golpe({ dur: 0.08, vol: 0.18, filtro: 1500, tipo: "bandpass" });
        nota({ f: 300, hasta: 500, dur: 0.15, vol: 0.12, onda: "sine" });
    },
    ola: () => golpe({ dur: 0.8, vol: 0.06, filtro: 600, tipo: "lowpass" }),
};

// ---------- Terrenos ----------
// costo: energía para explorar · da(): recompensas
const TERRENOS = {
    arena: { nombre: "Arena", costo: 1, peso: 40 },
    pasto: { nombre: "Selva", costo: 1, peso: 14 },
    palmera: { nombre: "Palmera", costo: 2, peso: 18 },
    roca: { nombre: "Rocas", costo: 3, peso: 11 },
    cofre: { nombre: "Cofre", costo: 2, peso: 5 },
    cueva: { nombre: "Cueva", costo: 3, peso: 3 },
    loro: { nombre: "Loro", costo: 1, peso: 3 },
    mono: { nombre: "Mono", costo: 1, peso: 3 },
    ruina: { nombre: "Ruinas", costo: 2, peso: 0 }, // se ponen 3 a mano
    tesoro: { nombre: "Tesoro", costo: 3, peso: 0 }, // la X (una por isla)
};

// ---------- Campamento ----------
const EDIFICIOS = [
    { id: "fogata", icono: "🔥", nombre: "Fogata", detalle: (n) => `La energía se recarga ${Math.round((1 - 0.86 ** n) * 100)}% más rápido`, max: 10, costo: (n) => ({ madera: Math.ceil(6 * 1.75 ** n) }) },
    { id: "choza", icono: "🛖", nombre: "Choza", detalle: (n) => `+${n * 5} de energía máxima`, max: 12, costo: (n) => ({ madera: Math.ceil(10 * 1.8 ** n), piedra: Math.ceil(4 * 1.8 ** n) }) },
    { id: "pala", icono: "⛏️", nombre: "Pala mejor", detalle: (n) => `Encontrás +${n * 25}% de todo`, max: 15, costo: (n) => ({ piedra: Math.ceil(8 * 1.85 ** n), monedas: Math.ceil(60 * 2 ** n) }) },
    { id: "mirador", icono: "🗼", nombre: "Mirador", detalle: (n) => (n ? `Ves cofres y cuevas a ${n + 1} casillas` : "Muestra dónde hay cofres y cuevas"), max: 4, costo: (n) => ({ madera: Math.ceil(20 * 2.4 ** n), piedra: Math.ceil(15 * 2.4 ** n) }) },
    { id: "monos", icono: "🐒", nombre: "Monos ayudantes", detalle: (n) => (n ? `Juntan ${formatear(produccion().cocos * 60)} cocos y ${formatear(produccion().madera * 60)} madera por minuto` : "Juntan cocos y madera de las palmeras solos"), max: 20, costo: (n) => ({ cocos: Math.ceil(8 * 1.7 ** n), monedas: Math.ceil(100 * 1.9 ** n) }) },
    { id: "cantera", icono: "🏗️", nombre: "Cantera", detalle: (n) => (n ? `Saca ${formatear(produccion().piedra * 60)} piedra y ${formatear(produccion().monedas * 60)} monedas por minuto` : "Saca piedra y monedas de las rocas sola"), max: 20, costo: (n) => ({ madera: Math.ceil(25 * 1.8 ** n), monedas: Math.ceil(150 * 1.9 ** n) }) },
    { id: "muelle", icono: "⚓", nombre: "Muelle", detalle: () => "Para zarpar a una isla nueva", max: 1, costo: () => ({ madera: 80 * isla(), piedra: 50 * isla(), monedas: 600 * isla() }) },
];
const ICONOS_RECURSO = { monedas: "🪙", madera: "🪵", piedra: "🪨", cocos: "🥥", gemas: "💎" };

// ---------- Estado ----------
const NUEVA_ISLA = (n) => ({ numero: n, casillas: null, exploradas: 0, fragmentos: 0, tesoroAbierto: false, edificios: {} });
const estado = cargar(CLAVE, {
    monedas: 0, gemas: 0, madera: 0, piedra: 0, cocos: 3, energia: 20, ultimaEnergia: Date.now(),
    brujulas: 0, isla: NUEVA_ISLA(1), ultimaVez: Date.now(),
    contadores: { exploradas: 0, cofres: 0, tesoros: 0, islas: 0, gemas: 0, cocos: 0 },
});
const cont = estado.contadores;
const isla = () => estado.isla.numero;
const nivel = (id) => estado.isla.edificios[id] ?? 0;
const energiaMax = () => 20 + nivel("choza") * 5 + estado.brujulas;
const segundosPorEnergia = () => 30 * 0.86 ** nivel("fogata");
const multEncontrar = () => (1 + nivel("pala") * 0.25) * (1 + estado.brujulas * 0.1) * (1 + (isla() - 1) * 0.6);

// ---------- Generar la isla ----------
function azar(semilla) {
    let s = semilla >>> 0 || 1;
    return () => {
        s = (s + 0x6d2b79f5) >>> 0;
        let t = Math.imul(s ^ (s >>> 15), 1 | s);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
function generarIsla(n) {
    const r = azar(n * 7919 + 13);
    const cx = (COLS - 1) / 2;
    const cy = (FILAS - 1) / 2;
    const radio = Math.min(1.05, 0.72 + n * 0.06); // las islas siguientes son más grandes
    const casillas = [];
    for (let y = 0; y < FILAS; y++) {
        for (let x = 0; x < COLS; x++) {
            const dx = (x - cx) / (COLS / 2);
            const dy = (y - cy) / (FILAS / 2);
            const angulo = Math.atan2(dy, dx);
            const borde = radio * (0.82 + Math.sin(angulo * 3 + n) * 0.1 + Math.sin(angulo * 5 + n * 2) * 0.06) + (r() - 0.5) * 0.12;
            const tierra = Math.hypot(dx, dy) < borde;
            casillas.push({ x, y, tierra, tipo: null, vista: false, vacia: false });
        }
    }
    const tierra = casillas.filter((c) => c.tierra);
    const total = Object.values(TERRENOS).reduce((t, d) => t + d.peso, 0);
    for (const c of tierra) {
        let t = r() * total;
        for (const [id, d] of Object.entries(TERRENOS)) if ((t -= d.peso) < 0) {
            c.tipo = id;
            break;
        }
    }
    // Campamento en el centro (y sus vecinas ya descubiertas)
    const centro = casillas[Math.round(cy) * COLS + Math.round(cx)];
    centro.tierra = true;
    centro.tipo = "campamento";
    centro.vista = true;
    for (const v of vecinas(centro, casillas)) if (v.tierra) {
        v.vista = true;
        v.vacia = true;
        if (!v.tipo || v.tipo === "campamento") v.tipo = "arena";
    }
    // 3 ruinas con pedazos del mapa y la X del tesoro, lejos del centro
    const lejanas = tierra.filter((c) => !c.vista && c !== centro).sort((a, b) => dist(b, centro) - dist(a, centro));
    const elegidas = [];
    for (const c of lejanas) {
        if (elegidas.length >= 4) break;
        if (elegidas.every((o) => dist(o, c) >= 3)) elegidas.push(c);
    }
    elegidas.forEach((c, i) => (c.tipo = i < 3 ? "ruina" : "tesoro"));
    return casillas;
}
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
function vecinas(c, casillas = estado.isla.casillas) {
    const lista = [];
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const x = c.x + dx;
        const y = c.y + dy;
        if (x >= 0 && y >= 0 && x < COLS && y < FILAS) lista.push(casillas[y * COLS + x]);
    }
    return lista;
}
if (!estado.isla.casillas) estado.isla.casillas = generarIsla(isla());
const casillas = () => estado.isla.casillas;
const tierras = () => casillas().filter((c) => c.tierra);
// Se puede explorar si es tierra sin ver y toca una casilla ya vista
const explorable = (c) => c.tierra && !c.vista && vecinas(c).some((v) => v.vista);
const porcentajeExplorado = () => tierras().filter((c) => c.vista).length / tierras().length;

// ---------- Energía (se recarga sola, también con la app cerrada) ----------
function recargarEnergia() {
    const ahora = Date.now();
    const paso = segundosPorEnergia() * 1000;
    if (estado.energia >= energiaMax()) {
        estado.ultimaEnergia = ahora;
        return 0;
    }
    const ganadas = Math.floor((ahora - estado.ultimaEnergia) / paso);
    if (ganadas > 0) {
        const antes = estado.energia;
        estado.energia = Math.min(energiaMax(), estado.energia + ganadas);
        estado.ultimaEnergia += ganadas * paso;
        return estado.energia - antes;
    }
    return 0;
}

// ---------- Producción de los ayudantes (por segundo) ----------
function produccion() {
    const vistas = tierras().filter((c) => c.vista);
    const palmeras = vistas.filter((c) => c.tipo === "palmera").length;
    const rocas = vistas.filter((c) => c.tipo === "roca").length;
    const m = multEncontrar();
    return {
        cocos: (nivel("monos") * palmeras * 0.004 + nivel("monos") * 0.003) * m,
        madera: (nivel("monos") * palmeras * 0.006) * m,
        piedra: (nivel("cantera") * rocas * 0.006 + nivel("cantera") * 0.003) * m,
        monedas: (nivel("cantera") * (rocas + 2) * 0.05) * m,
    };
}

// ---------- Lienzo ----------
const chispas = crearChispas();
const textos = [];
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
let fondo = null; // mar + isla ya descubierta (se rehace al cambiar algo)
const lienzo = crearLienzo($("lienzo"), (d) => {
    ancho = d.ancho;
    alto = d.alto;
    sprites.clear();
    fondo = null;
}, 1.5);
const vigilarCalidad = calidadAutomatica((n) => lienzo.cambiarEscala(n === 1 ? 1.15 : 1));

// La cámara encuadra solo la isla (más un poco de mar), así las casillas se ven lo más grandes posible
let encuadre = null;
function medidas() {
    if (!encuadre || encuadre.isla !== estado.isla) {
        const t = tierras();
        // Margen justo: un poquito de mar a los costados y lugar abajo para el muelle
        const minX = Math.min(...t.map((c) => c.x)) - 0.25;
        const maxX = Math.max(...t.map((c) => c.x)) + 1.25;
        const minY = Math.min(...t.map((c) => c.y)) - 0.25;
        const maxY = Math.max(...t.map((c) => c.y)) + 1.6;
        encuadre = { isla: estado.isla, minX, minY, w: maxX - minX, h: maxY - minY };
    }
    const arriba = 34; // barra de energía
    const abajo = 30; // recursos y botón de comer (pueden quedar sobre el mar)
    const lado = Math.floor(Math.min((ancho - 4) / encuadre.w, (alto - arriba - abajo) / encuadre.h, 110));
    const ox = Math.floor((ancho - lado * encuadre.w) / 2 - encuadre.minX * lado);
    const oy = Math.floor(arriba + (alto - arriba - abajo - lado * encuadre.h) / 2 - encuadre.minY * lado);
    return { lado, ox, oy };
}
const centroCasilla = (c, m = medidas()) => ({ x: m.ox + (c.x + 0.5) * m.lado, y: m.oy + (c.y + 0.5) * m.lado });

// Explorador: camina hasta la casilla que se excava
const explorador = { x: 0, y: 0, destino: null, cavando: 0, casilla: null, mira: 1, paso: 0 };
{
    const c = casillas().find((k) => k.tipo === "campamento");
    explorador.casilla = c;
}

// ---------- Dibujos ----------
function dibujarPalmera(c, x, y, l) {
    c.strokeStyle = "#8d5a2b";
    c.lineWidth = l * 0.08;
    c.lineCap = "round";
    c.beginPath();
    c.moveTo(x, y + l * 0.3);
    c.quadraticCurveTo(x + l * 0.12, y, x + l * 0.04, y - l * 0.22);
    c.stroke();
    c.fillStyle = "#2d6a4f";
    for (let k = 0; k < 5; k++) {
        const a = -Math.PI / 2 + (k - 2) * 0.7;
        c.beginPath();
        c.ellipse(x + l * 0.04 + Math.cos(a) * l * 0.18, y - l * 0.22 + Math.sin(a) * l * 0.1 + l * 0.04, l * 0.2, l * 0.06, a, 0, TAU);
        c.fill();
    }
    c.fillStyle = "#6f4518";
    for (const dx of [-0.03, 0.05]) {
        c.beginPath();
        c.arc(x + l * (0.04 + dx), y - l * 0.17, l * 0.04, 0, TAU);
        c.fill();
    }
}
function dibujarRoca(c, x, y, l) {
    for (const [dx, dy, r, color] of [[-0.12, 0.08, 0.17, "#6c757d"], [0.12, 0.1, 0.14, "#868e96"], [0, -0.04, 0.2, "#adb5bd"]]) {
        c.fillStyle = color;
        c.beginPath();
        c.ellipse(x + dx * l, y + dy * l, r * l, r * l * 0.8, 0, 0, TAU);
        c.fill();
    }
    c.fillStyle = "#ffffff55";
    c.beginPath();
    c.ellipse(x - l * 0.05, y - l * 0.1, l * 0.07, l * 0.04, -0.4, 0, TAU);
    c.fill();
}
function dibujarCofre(c, x, y, l, abierto) {
    c.fillStyle = "#0003";
    c.beginPath();
    c.ellipse(x, y + l * 0.2, l * 0.28, l * 0.07, 0, 0, TAU);
    c.fill();
    c.fillStyle = "#8d5a2b";
    c.fillRect(x - l * 0.24, y - l * 0.04, l * 0.48, l * 0.24);
    c.fillStyle = "#ffd166";
    c.fillRect(x - l * 0.24, y + l * 0.04, l * 0.48, l * 0.04);
    if (abierto) {
        c.fillStyle = "#5c3a1e";
        c.fillRect(x - l * 0.24, y - l * 0.2, l * 0.48, l * 0.12);
        c.fillStyle = "#ffe066";
        c.beginPath();
        c.arc(x, y - l * 0.04, l * 0.12, Math.PI, 0);
        c.fill();
    } else {
        c.fillStyle = "#a9713f";
        c.beginPath();
        c.ellipse(x, y - l * 0.04, l * 0.24, l * 0.12, 0, Math.PI, 0);
        c.fill();
        c.fillStyle = "#ffd166";
        c.fillRect(x - l * 0.03, y - l * 0.06, l * 0.06, l * 0.08);
    }
}
function dibujarRuina(c, x, y, l) {
    c.fillStyle = "#ced4da";
    c.fillRect(x - l * 0.22, y - l * 0.2, l * 0.1, l * 0.38);
    c.fillRect(x + l * 0.1, y - l * 0.06, l * 0.1, l * 0.24);
    c.fillStyle = "#adb5bd";
    c.fillRect(x - l * 0.26, y - l * 0.24, l * 0.18, l * 0.06);
    c.fillStyle = "#95d5b2";
    c.beginPath();
    c.ellipse(x - l * 0.17, y + l * 0.05, l * 0.07, l * 0.03, 0.6, 0, TAU);
    c.fill();
}
function dibujarCueva(c, x, y, l) {
    c.fillStyle = "#6c757d";
    c.beginPath();
    c.ellipse(x, y + l * 0.05, l * 0.32, l * 0.24, 0, Math.PI, 0);
    c.fill();
    c.fillStyle = "#1b1b1b";
    c.beginPath();
    c.ellipse(x, y + l * 0.08, l * 0.17, l * 0.14, 0, Math.PI, 0);
    c.fill();
    c.fillStyle = "#b388ff";
    c.beginPath();
    c.arc(x + l * 0.2, y + l * 0.12, l * 0.04, 0, TAU);
    c.fill();
}
function dibujarCampamento(c, x, y, l) {
    c.fillStyle = "#e76f51";
    c.beginPath();
    c.moveTo(x - l * 0.3, y + l * 0.2);
    c.lineTo(x - l * 0.05, y - l * 0.25);
    c.lineTo(x + l * 0.2, y + l * 0.2);
    c.fill();
    c.fillStyle = "#9c3d2a";
    c.beginPath();
    c.moveTo(x - l * 0.08, y + l * 0.2);
    c.lineTo(x - l * 0.05, y - l * 0.02);
    c.lineTo(x + l * 0.03, y + l * 0.2);
    c.fill();
    c.fillStyle = "#6f4518";
    c.fillRect(x + l * 0.18, y + l * 0.15, l * 0.16, l * 0.04);
}
function dibujarAnimal(c, tipo, x, y, l) {
    if (tipo === "loro") {
        c.fillStyle = "#e63946";
        c.beginPath();
        c.ellipse(x, y, l * 0.12, l * 0.17, 0.2, 0, TAU);
        c.fill();
        c.fillStyle = "#4361ee";
        c.beginPath();
        c.ellipse(x - l * 0.05, y + l * 0.04, l * 0.07, l * 0.13, 0.4, 0, TAU);
        c.fill();
        c.fillStyle = "#ffd166";
        c.beginPath();
        c.moveTo(x + l * 0.08, y - l * 0.1);
        c.lineTo(x + l * 0.16, y - l * 0.06);
        c.lineTo(x + l * 0.08, y - l * 0.03);
        c.fill();
    } else {
        c.fillStyle = "#8d5a2b";
        c.beginPath();
        c.arc(x, y + l * 0.05, l * 0.15, 0, TAU);
        c.arc(x, y - l * 0.12, l * 0.1, 0, TAU);
        c.fill();
        c.fillStyle = "#e9c46a";
        c.beginPath();
        c.ellipse(x, y - l * 0.1, l * 0.06, l * 0.05, 0, 0, TAU);
        c.fill();
    }
}
function dibujarX(c, x, y, l) {
    c.strokeStyle = "#d62828";
    c.lineWidth = l * 0.1;
    c.lineCap = "round";
    c.beginPath();
    c.moveTo(x - l * 0.2, y - l * 0.2);
    c.lineTo(x + l * 0.2, y + l * 0.2);
    c.moveTo(x + l * 0.2, y - l * 0.2);
    c.lineTo(x - l * 0.2, y + l * 0.2);
    c.stroke();
}

// Mar + toda la isla vista: se pinta una vez y se rehace solo cuando cambia algo
function pintarFondo() {
    const m = medidas();
    const escala = Math.min(devicePixelRatio, 1.5);
    const can = document.createElement("canvas");
    can.width = Math.ceil(ancho * escala);
    can.height = Math.ceil(alto * escala);
    const c = can.getContext("2d");
    c.scale(escala, escala);
    const mar = c.createRadialGradient(ancho / 2, alto / 2, 10, ancho / 2, alto / 2, Math.max(ancho, alto) * 0.7);
    mar.addColorStop(0, "#2ec4b6");
    mar.addColorStop(0.45, "#168aad");
    mar.addColorStop(1, "#0b4f6c");
    c.fillStyle = mar;
    c.fillRect(0, 0, ancho, alto);
    const l = m.lado;
    // Orilla clara alrededor de la tierra
    c.fillStyle = "#90e0ef88";
    for (const k of tierras()) {
        const p = centroCasilla(k, m);
        c.beginPath();
        c.arc(p.x, p.y, l * 0.78, 0, TAU);
        c.fill();
    }
    // Arena de todas las casillas de tierra (la niebla se dibuja encima de las no vistas)
    for (const k of tierras()) {
        const p = centroCasilla(k, m);
        c.fillStyle = k.tipo === "pasto" && k.vista ? "#74c69d" : "#f4d58d";
        c.beginPath();
        c.roundRect(p.x - l * 0.54, p.y - l * 0.54, l * 1.08, l * 1.08, l * 0.32);
        c.fill();
    }
    // Detalles de las casillas vistas
    for (const k of tierras()) {
        if (!k.vista) continue;
        const p = centroCasilla(k, m);
        if (k.tipo === "arena" || k.tipo === "pasto") {
            c.fillStyle = "#0000000f";
            c.beginPath();
            c.arc(p.x - l * 0.15, p.y + l * 0.1, l * 0.05, 0, TAU);
            c.arc(p.x + l * 0.18, p.y - l * 0.12, l * 0.04, 0, TAU);
            c.fill();
        }
        if (k.tipo === "pasto") {
            c.fillStyle = "#40916c";
            for (const [dx, dy] of [[-0.18, -0.1], [0.12, 0.14], [0.2, -0.18]]) {
                c.beginPath();
                c.ellipse(p.x + dx * l, p.y + dy * l, l * 0.09, l * 0.05, 0.5, 0, TAU);
                c.fill();
            }
        }
        if (k.tipo === "palmera") dibujarPalmera(c, p.x, p.y, l);
        else if (k.tipo === "roca") dibujarRoca(c, p.x, p.y, l);
        else if (k.tipo === "cofre") dibujarCofre(c, p.x, p.y, l, true);
        else if (k.tipo === "ruina") dibujarRuina(c, p.x, p.y, l);
        else if (k.tipo === "cueva") dibujarCueva(c, p.x, p.y, l);
        else if (k.tipo === "campamento") dibujarCampamento(c, p.x, p.y, l);
        else if (k.tipo === "tesoro") dibujarCofre(c, p.x, p.y, l, estado.isla.tesoroAbierto);
        else if (k.tipo === "loro" || k.tipo === "mono") dibujarAnimal(c, k.tipo, p.x, p.y, l);
    }
    // Muelle (si está construido) saliendo de la orilla de abajo
    if (nivel("muelle")) {
        const sur = tierras().reduce((a, b) => (b.y > a.y || (b.y === a.y && Math.abs(b.x - 4) < Math.abs(a.x - 4)) ? b : a));
        const p = centroCasilla(sur, m);
        c.fillStyle = "#8d5a2b";
        c.fillRect(p.x - l * 0.12, p.y + l * 0.3, l * 0.24, l * 1.1);
        c.fillStyle = "#e9ecef";
        c.beginPath();
        c.moveTo(p.x + l * 0.2, p.y + l * 1.2);
        c.lineTo(p.x + l * 0.2, p.y + l * 0.55);
        c.lineTo(p.x + l * 0.6, p.y + l * 1.1);
        c.fill();
        c.fillStyle = "#6f4518";
        c.beginPath();
        c.roundRect(p.x + l * 0.05, p.y + l * 1.15, l * 0.7, l * 0.2, l * 0.08);
        c.fill();
    }
    return can;
}

// Nube de niebla (una sola, reutilizada en cada casilla sin explorar)
const nube = (l) => sprite(`nube-${l}`, l * 1.4, l * 1.4, (c) => {
    const g = c.createRadialGradient(l * 0.7, l * 0.7, l * 0.1, l * 0.7, l * 0.7, l * 0.7);
    g.addColorStop(0, "#f8f9fa");
    g.addColorStop(0.6, "#e9ecefee");
    g.addColorStop(1, "#dee2e600");
    c.fillStyle = g;
    for (const [dx, dy, r] of [[0, 0, 0.5], [-0.25, 0.1, 0.35], [0.25, 0.08, 0.38], [0, -0.2, 0.32]]) {
        c.beginPath();
        c.arc(l * (0.7 + dx), l * (0.7 + dy), l * r, 0, TAU);
        c.fill();
    }
});

function dibujarExplorador(c, x, y, l, t) {
    const paso = Math.sin(explorador.paso * 10) * (explorador.destino ? 1 : 0);
    c.save();
    c.translate(x, y);
    c.scale(explorador.mira, 1);
    c.fillStyle = "#0003";
    c.beginPath();
    c.ellipse(0, l * 0.3, l * 0.18, l * 0.05, 0, 0, TAU);
    c.fill();
    c.fillStyle = "#3d405b";
    c.fillRect(-l * 0.08 + paso * l * 0.03, l * 0.12, l * 0.06, l * 0.18);
    c.fillRect(l * 0.02 - paso * l * 0.03, l * 0.12, l * 0.06, l * 0.18);
    c.fillStyle = "#f4f1de";
    c.beginPath();
    c.roundRect(-l * 0.12, -l * 0.08, l * 0.24, l * 0.24, l * 0.06);
    c.fill();
    c.fillStyle = "#e07a5f";
    c.fillRect(-l * 0.12, l * 0.04, l * 0.24, l * 0.04);
    c.fillStyle = "#f2cc8f";
    c.beginPath();
    c.arc(0, -l * 0.17, l * 0.1, 0, TAU);
    c.fill();
    // Sombrero de explorador
    c.fillStyle = "#a98467";
    c.beginPath();
    c.ellipse(0, -l * 0.23, l * 0.17, l * 0.04, 0, 0, TAU);
    c.fill();
    c.beginPath();
    c.ellipse(0, -l * 0.27, l * 0.09, l * 0.06, 0, Math.PI, 0);
    c.fill();
    c.fillStyle = "#1b1b1b";
    c.fillRect(l * 0.03, -l * 0.19, l * 0.025, l * 0.025);
    // Pala (se mueve al cavar)
    c.save();
    c.translate(l * 0.14, l * 0.02);
    c.rotate(explorador.cavando > 0 ? -0.8 + Math.abs(Math.sin(t * 14)) * 1.4 : 0.3);
    c.fillStyle = "#8d5a2b";
    c.fillRect(-l * 0.015, -l * 0.2, l * 0.03, l * 0.32);
    c.fillStyle = "#adb5bd";
    c.beginPath();
    c.ellipse(0, l * 0.14, l * 0.05, l * 0.07, 0, 0, TAU);
    c.fill();
    c.restore();
    c.restore();
}

function dibujar(dt) {
    const { ctx } = lienzo;
    const t = performance.now() / 1000;
    const m = medidas();
    const l = m.lado;
    if (!fondo) fondo = pintarFondo();
    ctx.drawImage(fondo, 0, 0, ancho, alto);
    // Brillos que se mueven en el agua
    ctx.strokeStyle = "#ffffff30";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let k = 0; k < 14; k++) {
        const x = ((k * 97 + t * 14 * (k % 2 ? 1 : -1)) % (ancho + 40) + ancho + 40) % (ancho + 40) - 20;
        const y = (k * 61) % alto;
        ctx.moveTo(x - 8, y);
        ctx.quadraticCurveTo(x, y - 3, x + 8, y);
    }
    ctx.stroke();
    // Niebla sobre lo que falta explorar; las casillas que se pueden explorar brillan
    const nb = nube(l);
    const vistaMirador = nivel("mirador");
    for (const k of tierras()) {
        if (k.vista) continue;
        const p = centroCasilla(k, m);
        const vaiven = Math.sin(t * 0.8 + k.x * 1.3 + k.y) * l * 0.04;
        ctx.drawImage(nb.c, p.x - l * 0.7 + vaiven, p.y - l * 0.7, nb.w, nb.h);
        if (explorable(k)) {
            ctx.strokeStyle = `rgba(255,209,102,${0.55 + Math.sin(t * 4 + k.x) * 0.3})`;
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.roundRect(p.x - l * 0.46, p.y - l * 0.46, l * 0.92, l * 0.92, l * 0.26);
            ctx.stroke();
            ctx.fillStyle = "#3d2c00";
            ctx.font = `900 ${Math.max(9, l * 0.26)}px system-ui, sans-serif`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(`⚡${TERRENOS[k.tipo].costo}`, p.x, p.y + l * 0.02);
        }
        // El mirador deja ver cofres y cuevas cerca de lo explorado
        if (vistaMirador && (k.tipo === "cofre" || k.tipo === "cueva" || k.tipo === "tesoro") && casillas().some((v) => v.vista && dist(v, k) <= vistaMirador + 1)) {
            ctx.globalAlpha = 0.65 + Math.sin(t * 3) * 0.2;
            ctx.fillStyle = k.tipo === "cueva" ? "#b388ff" : "#ffd166";
            ctx.beginPath();
            ctx.arc(p.x + l * 0.28, p.y - l * 0.28, l * 0.1, 0, TAU);
            ctx.fill();
            ctx.globalAlpha = 1;
        }
    }
    // Con los 3 pedazos del mapa, la X del tesoro se ve aunque haya niebla
    const x = casillas().find((k) => k.tipo === "tesoro");
    if (x && estado.isla.fragmentos >= 3 && !estado.isla.tesoroAbierto) {
        const p = centroCasilla(x, m);
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.scale(1 + Math.sin(t * 4) * 0.08, 1 + Math.sin(t * 4) * 0.08);
        dibujarX(ctx, 0, 0, l);
        ctx.restore();
    }
    // Explorador caminando o cavando
    if (explorador.destino) {
        const d = centroCasilla(explorador.destino, m);
        const dx = d.x - explorador.x;
        const dy = d.y - explorador.y;
        const largo = Math.hypot(dx, dy);
        const vel = l * 5;
        explorador.paso += dt;
        if (Math.abs(dx) > 1) explorador.mira = Math.sign(dx);
        if (largo < vel * dt) {
            explorador.x = d.x;
            explorador.y = d.y;
            explorador.casilla = explorador.destino;
            explorador.destino = null;
            // Solo cava si fue a explorar (si no, solo caminó hasta ahí)
            explorador.cavando = excavando ? 0.7 : 0;
        } else {
            explorador.x += (dx / largo) * vel * dt;
            explorador.y += (dy / largo) * vel * dt;
        }
    } else if (explorador.cavando > 0) {
        explorador.cavando -= dt;
        if (Math.random() < dt * 20) chispas.emitir(explorador.x + l * 0.15, explorador.y + l * 0.25, "#c9a26b", 2, 60);
        if (explorador.cavando <= 0) terminarExcavacion();
    }
    dibujarExplorador(ctx, explorador.x, explorador.y - l * 0.1, l * 0.9, t);
    chispas.dibujar(ctx, dt);
    for (let i = textos.length - 1; i >= 0; i--) {
        const tx = textos[i];
        tx.vida -= dt;
        tx.y -= dt * 28;
        ctx.globalAlpha = Math.max(0, Math.min(1, tx.vida * 1.5));
        ctx.font = "900 14px system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.lineWidth = 3;
        ctx.strokeStyle = "#0b4f6c";
        ctx.strokeText(tx.t, tx.x, tx.y);
        ctx.fillStyle = "#fff";
        ctx.fillText(tx.t, tx.x, tx.y);
        if (tx.vida <= 0) textos.splice(i, 1);
    }
    ctx.globalAlpha = 1;
}

// ---------- Explorar ----------
let excavando = null;
function explorar(k) {
    if (excavando || explorador.destino) return;
    const costo = TERRENOS[k.tipo].costo;
    if (estado.energia < costo) {
        avisar(`Te falta energía (⚡${costo}). Esperá un rato o comé un coco 🥥`);
        efectos.error();
        return;
    }
    estado.energia -= costo;
    excavando = k;
    explorador.destino = k;
    efectos.toque();
    refrescar();
}
function dar(recurso, cantidad, p, k) {
    cantidad = Math.max(1, Math.round(cantidad));
    estado[recurso] += cantidad;
    if (recurso === "gemas") cont.gemas += cantidad;
    textos.push({ x: p.x, y: p.y - k * 16, t: `+${formatear(cantidad)} ${ICONOS_RECURSO[recurso]}`, vida: 1.3 });
}
function terminarExcavacion() {
    const k = excavando;
    excavando = null;
    if (!k) return;
    k.vista = true;
    cont.exploradas++;
    const p = centroCasilla(k);
    const mult = multEncontrar();
    sonidos.cavar();
    vibrar(15);
    chispas.emitir(p.x, p.y, "#f4d58d", 14, 120);
    const r = Math.random;
    if (k.tipo === "arena" || k.tipo === "pasto") {
        dar("monedas", (4 + r() * 10) * mult, p, 0);
        sonidos.descubrir();
    } else if (k.tipo === "palmera") {
        dar("madera", (2 + r() * 3) * mult, p, 0);
        dar("cocos", (1 + r() * 2) * mult, p, 1);
        sonidos.descubrir();
    } else if (k.tipo === "roca") {
        dar("piedra", (2 + r() * 3) * mult, p, 0);
        dar("monedas", (6 + r() * 8) * mult, p, 1);
        sonidos.descubrir();
    } else if (k.tipo === "cofre") {
        cont.cofres++;
        dar("monedas", (60 + r() * 60) * mult, p, 0);
        if (r() < 0.5) dar("gemas", 1 + Math.floor(r() * 2), p, 1);
        sonidos.cofre();
        avisar("🧰 ¡Un cofre!");
    } else if (k.tipo === "cueva") {
        dar("gemas", 1 + Math.floor(r() * 3 * Math.sqrt(isla())), p, 0);
        dar("piedra", (4 + r() * 4) * mult, p, 1);
        sonidos.gema();
    } else if (k.tipo === "ruina") {
        estado.isla.fragmentos = Math.min(3, estado.isla.fragmentos + 1);
        sonidos.cofre();
        avisar(estado.isla.fragmentos >= 3 ? "🗺️ ¡Completaste el mapa! Buscá la X roja del tesoro" : `🗺️ Encontraste un pedazo del mapa (${estado.isla.fragmentos}/3)`);
    } else if (k.tipo === "tesoro") {
        abrirTesoro(k, p);
    } else if (k.tipo === "loro") {
        // El loro avisa dónde hay un cofre: lo descubre
        const cofre = tierras().filter((c) => !c.vista && c.tipo === "cofre").sort((a, b) => dist(a, k) - dist(b, k))[0];
        avisar(cofre ? "🦜 ¡El loro te mostró un cofre escondido!" : "🦜 El loro te regaló monedas");
        if (cofre) {
            cofre.vista = true;
            cont.exploradas++;
            const pc = centroCasilla(cofre);
            dar("monedas", (60 + r() * 60) * mult, pc, 0);
            cont.cofres++;
        } else dar("monedas", 30 * mult, p, 0);
        sonidos.descubrir();
    } else if (k.tipo === "mono") {
        dar("cocos", (3 + r() * 4) * mult, p, 0);
        avisar("🐒 Un mono te tiró cocos");
        sonidos.descubrir();
    }
    fondo = null;
    refrescar();
}
function abrirTesoro(k, p) {
    if (estado.isla.fragmentos < 3) {
        // Sin el mapa completo es solo arena con un poco de monedas
        dar("monedas", 20 * multEncontrar(), p, 0);
        avisar("Acá hay algo enterrado… pero te falta el mapa completo 🗺️");
        k.vista = true;
        k.tipo = "tesoro";
        estado.isla.tesoroAbierto = false;
        return;
    }
    estado.isla.tesoroAbierto = true;
    cont.tesoros++;
    const mult = multEncontrar();
    dar("monedas", 800 * mult, p, 0);
    dar("gemas", 5 + isla() * 3, p, 1);
    dar("madera", 30 * mult, p, 2);
    efectos.fanfarria();
    vibrar([60, 40, 120]);
    for (let n = 0; n < 4; n++) chispas.emitir(p.x, p.y, ["#ffd166", "#ff4d6d", "#7ee0ff", "#8fd14f"][n], 20, 220);
    avisar("💰 ¡ENCONTRASTE EL GRAN TESORO!");
}
// Si la X ya se excavó sin mapa, se puede volver a cavar con el mapa completo
function tocarTesoroVisto(k) {
    if (k.tipo !== "tesoro" || estado.isla.tesoroAbierto || estado.isla.fragmentos < 3) return false;
    if (estado.energia < TERRENOS.tesoro.costo) {
        avisar("Te falta energía para desenterrar el tesoro");
        return true;
    }
    estado.energia -= TERRENOS.tesoro.costo;
    excavando = { ...k, vista: false, tipo: "tesoro", real: k };
    explorador.destino = k;
    return true;
}

// ---------- Toques ----------
$("lienzo").addEventListener("pointerdown", (e) => {
    const caja = $("lienzo").getBoundingClientRect();
    const m = medidas();
    const cx = Math.floor((e.clientX - caja.left - m.ox) / m.lado);
    const cy = Math.floor((e.clientY - caja.top - m.oy) / m.lado);
    if (cx < 0 || cy < 0 || cx >= COLS || cy >= FILAS) return;
    const k = casillas()[cy * COLS + cx];
    if (!k.tierra) return;
    if (k.vista) {
        if (tocarTesoroVisto(k)) return;
        if (!explorador.destino && !excavando) explorador.destino = k; // caminar hasta ahí
        return;
    }
    if (!explorable(k)) {
        avisar("Explorá primero las casillas de al lado (las que brillan)");
        return;
    }
    explorar(k);
});

// ---------- Panel ----------
let pestana = "campamento";
function puedePagar(costo) {
    return Object.entries(costo).every(([r, n]) => estado[r] >= n);
}
const textoCosto = (costo) => Object.entries(costo).map(([r, n]) => `${ICONOS_RECURSO[r]}${formatear(n)}`).join(" ");
let ultimoPanel = "";
function pintarPanel() {
    let html;
    if (pestana === "campamento") {
        html = EDIFICIOS.map((ed) => {
            const n = nivel(ed.id);
            const tope = n >= ed.max;
            const costo = ed.costo(n);
            return `<div class="fila-i"><span class="ico-i">${ed.icono}</span><div class="txt"><strong>${ed.nombre}${n ? ` <em>Nv ${n}</em>` : ""}</strong><span>${ed.detalle(n)}</span></div>
                <button type="button" data-edificio="${ed.id}" ${tope || !puedePagar(costo) ? "disabled" : ""}>${tope ? "Listo" : textoCosto(costo)}</button></div>`;
        }).join("");
    } else {
        const pct = Math.round(porcentajeExplorado() * 100);
        const nuevas = brujulasAlZarpar();
        html = `<div class="tarjeta-isla"><strong>🏝️ Isla ${isla()}</strong>
            <div class="progreso-isla"><i style="width:${pct}%"></i></div><span>${pct}% explorada · 🗺️ ${estado.isla.fragmentos}/3 · ${estado.isla.tesoroAbierto ? "💰 tesoro encontrado" : "tesoro sin encontrar"}</span></div>
            <div class="fila-i"><span class="ico-i">🧭</span><div class="txt"><strong>Brújulas: ${estado.brujulas}</strong><span>Cada una: +10% de todo y +1 de energía máxima, para siempre</span></div></div>
            <div class="fila-i zarpar"><span class="ico-i">⛵</span><div class="txt"><strong>Zarpar a la isla ${isla() + 1}</strong>
                <span>${nivel("muelle") ? `Empezás de nuevo en una isla más grande y rica. Ganás ${nuevas} brújula${nuevas === 1 ? "" : "s"}.` : "Primero construí el muelle en el campamento."}</span></div>
                <button type="button" data-zarpar ${nivel("muelle") && nuevas > 0 ? "" : "disabled"}>Zarpar</button></div>
            <p class="ayuda-i">Tocá las casillas que brillan para explorarlas. Los 3 pedazos del mapa 🗺️ muestran la X del gran tesoro. Cuanto más explores antes de zarpar, más brújulas.</p>`;
    }
    if (html === ultimoPanel) return;
    ultimoPanel = html;
    $("panel").innerHTML = html;
}
const brujulasAlZarpar = () => Math.floor(porcentajeExplorado() * 3 * isla() + (estado.isla.tesoroAbierto ? 2 * isla() : 0));
$("panel").addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b || b.disabled) return;
    if (b.dataset.edificio) {
        const ed = EDIFICIOS.find((x) => x.id === b.dataset.edificio);
        const costo = ed.costo(nivel(ed.id));
        if (!puedePagar(costo) || nivel(ed.id) >= ed.max) return;
        for (const [r, n] of Object.entries(costo)) estado[r] -= n;
        estado.isla.edificios[ed.id] = nivel(ed.id) + 1;
        efectos.comprar();
        avisar(`${ed.icono} ${ed.nombre} ${nivel(ed.id) > 1 ? `nivel ${nivel(ed.id)}` : "construido"}`);
        fondo = null;
    } else if (b.dataset.zarpar !== undefined) {
        const nuevas = brujulasAlZarpar();
        if (!confirm(`¿Zarpar a la isla ${isla() + 1}? Empezás de nuevo (se pierden recursos y campamento) y ganás ${nuevas} brújulas.`)) return;
        estado.brujulas += nuevas;
        cont.islas++;
        const siguiente = isla() + 1;
        Object.assign(estado, { monedas: 0, madera: 0, piedra: 0, cocos: 3, isla: NUEVA_ISLA(siguiente) });
        estado.isla.casillas = generarIsla(siguiente);
        estado.energia = energiaMax();
        explorador.casilla = casillas().find((k) => k.tipo === "campamento");
        const p = centroCasilla(explorador.casilla);
        explorador.x = p.x;
        explorador.y = p.y;
        efectos.fanfarria();
        sonidos.ola();
        avisar(`⛵ ¡Llegaste a la isla ${siguiente}! Tenés ${estado.brujulas} brújulas`);
        fondo = null;
    }
    refrescar();
});
for (const p of document.querySelectorAll(".pestana-i")) {
    p.addEventListener("click", () => {
        // Tocar la pestaña que ya está abierta achica el panel (más lugar para la isla en el celular)
        const cuerpo = document.querySelector(".cuerpo-i");
        if (pestana === p.dataset.p && !cuerpo.classList.contains("panel-chico")) {
            cuerpo.classList.add("panel-chico");
            efectos.toque();
            return;
        }
        cuerpo.classList.remove("panel-chico");
        pestana = p.dataset.p;
        for (const x of document.querySelectorAll(".pestana-i")) x.classList.toggle("activa", x === p);
        efectos.toque();
        pintarPanel();
    });
}
$("comer").addEventListener("click", () => {
    if (estado.cocos < 1) return avisar("No tenés cocos: los dan las palmeras y los monos 🥥");
    if (estado.energia >= energiaMax()) return avisar("Ya tenés la energía llena ⚡");
    estado.cocos--;
    cont.cocos++;
    estado.energia = Math.min(energiaMax(), estado.energia + 5);
    sonidos.comer();
    refrescar();
});

function pintarDatos() {
    $("monedas").textContent = formatear(Math.floor(estado.monedas));
    $("gemas").textContent = formatear(estado.gemas);
    $("madera").textContent = formatear(Math.floor(estado.madera));
    $("piedra").textContent = formatear(Math.floor(estado.piedra));
    $("cocos").textContent = formatear(Math.floor(estado.cocos));
    $("fragmentos").textContent = `${estado.isla.fragmentos}/3`;
    const max = energiaMax();
    $("barra-energia").style.width = `${(Math.min(estado.energia, max) / max) * 100}%`;
    $("texto-energia").textContent = `${Math.floor(estado.energia)}/${max}`;
    const falta = estado.energia >= max ? 0 : Math.ceil(segundosPorEnergia() - (Date.now() - estado.ultimaEnergia) / 1000);
    $("recarga").textContent = falta > 0 ? `+1 en ${falta} s` : "llena";
    $("comer").disabled = estado.cocos < 1;
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

// ---------- Base común: logros, regalo diario, resumen al volver ----------
const LOGROS = [
    { id: "explorar20", icono: "👣", nombre: "Primeros pasos", detalle: "Explorá 20 casillas", meta: 20, valor: () => cont.exploradas, fichas: 200 },
    { id: "explorar100", icono: "🧭", nombre: "Explorador", detalle: "Explorá 100 casillas", meta: 100, valor: () => cont.exploradas, fichas: 1000 },
    { id: "explorar500", icono: "🌍", nombre: "Cartógrafo", detalle: "Explorá 500 casillas", meta: 500, valor: () => cont.exploradas, fichas: 5000 },
    { id: "cofres10", icono: "🧰", nombre: "Cazador de cofres", detalle: "Abrí 10 cofres", meta: 10, valor: () => cont.cofres, fichas: 800 },
    { id: "cofres50", icono: "👑", nombre: "Rey pirata", detalle: "Abrí 50 cofres", meta: 50, valor: () => cont.cofres, fichas: 4000 },
    { id: "tesoro1", icono: "💰", nombre: "¡El gran tesoro!", detalle: "Encontrá un gran tesoro", meta: 1, valor: () => cont.tesoros, fichas: 1500 },
    { id: "tesoro5", icono: "🏴‍☠️", nombre: "Leyenda de los mares", detalle: "Encontrá 5 grandes tesoros", meta: 5, valor: () => cont.tesoros, fichas: 8000 },
    { id: "zarpar1", icono: "⛵", nombre: "A toda vela", detalle: "Zarpá a una isla nueva", meta: 1, valor: () => cont.islas, fichas: 1200 },
    { id: "zarpar5", icono: "🚢", nombre: "Navegante", detalle: "Visitá 5 islas", meta: 5, valor: () => cont.islas, fichas: 6000 },
    { id: "gemas25", icono: "💎", nombre: "Brillante", detalle: "Juntá 25 gemas", meta: 25, valor: () => cont.gemas, fichas: 1500 },
    { id: "cocos50", icono: "🥥", nombre: "Comecocos", detalle: "Comé 50 cocos", meta: 50, valor: () => cont.cocos, fichas: 600 },
    { id: "campamento", icono: "⛺", nombre: "Campamento completo", detalle: "Construí los 7 edificios", meta: EDIFICIOS.length, valor: () => EDIFICIOS.filter((e) => nivel(e.id) > 0).length, fichas: 3000 },
];
const base = crearBase({
    juego: "isla",
    barra: document.querySelector(".barra-isla"),
    logros: LOGROS,
    audio,
    regaloDiario: (dia) => dia === 7
        ? { icono: "💎", texto: `5 gemas y energía llena`, dar: () => ((estado.gemas += 5), (estado.energia = energiaMax()), refrescar()) }
        : { icono: dia % 2 ? "🥥" : "🪙", texto: dia % 2 ? `${dia * 2} cocos` : `${formatear(80 * dia * multEncontrar())} monedas`, dar: () => (dia % 2 ? (estado.cocos += dia * 2) : (estado.monedas += Math.round(80 * dia * multEncontrar())), refrescar()) },
});

// ---------- Mientras no estabas ----------
const ausente = Math.min((Date.now() - estado.ultimaVez) / 1000, 8 * 3600);
const energiaAntes = estado.energia;
recargarEnergia();
const pr = produccion();
const ganado = { cocos: pr.cocos * ausente, madera: pr.madera * ausente, piedra: pr.piedra * ausente, monedas: pr.monedas * ausente };
for (const [r, n] of Object.entries(ganado)) estado[r] += n;
const mostro = ausente > 60 && base.resumenAlVolver((Date.now() - estado.ultimaVez) / 1000, [
    { icono: "⚡", texto: "Energía recargada", valor: estado.energia > energiaAntes ? `+${Math.floor(estado.energia - energiaAntes)}` : "" },
    { icono: "🥥", texto: "Cocos de los monos", valor: ganado.cocos >= 1 ? formatear(ganado.cocos) : "" },
    { icono: "🪵", texto: "Madera de los monos", valor: ganado.madera >= 1 ? formatear(ganado.madera) : "" },
    { icono: "🪨", texto: "Piedra de la cantera", valor: ganado.piedra >= 1 ? formatear(ganado.piedra) : "" },
    { icono: "🪙", texto: "Monedas de la cantera", valor: ganado.monedas >= 1 ? formatear(ganado.monedas) : "" },
]);
if (!mostro) setTimeout(() => base.revisarRegalo(), 600);

// ---------- Ciclo ----------
let acumulado = 0;
let segundo = 0;
bucle((dt) => {
    const inicio = performance.now();
    // Al empezar o si cambió el tamaño de la pantalla, el explorador se ubica en su casilla
    const tamano = `${ancho}x${alto}`;
    if (!explorador.x || tamano !== explorador.tamano) {
        explorador.tamano = tamano;
        const p = centroCasilla(explorador.destino ?? explorador.casilla ?? casillas().find((k) => k.tipo === "campamento"));
        explorador.x = p.x;
        explorador.y = p.y;
    }
    dibujar(dt);
    acumulado += dt;
    segundo += dt;
    if (segundo >= 1) {
        // Producción de los ayudantes y energía, una vez por segundo
        const p = produccion();
        estado.cocos += p.cocos * segundo;
        estado.madera += p.madera * segundo;
        estado.piedra += p.piedra * segundo;
        estado.monedas += p.monedas * segundo;
        segundo = 0;
        recargarEnergia();
    }
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
