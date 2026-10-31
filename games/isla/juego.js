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
// Mejoras cuyo texto en nivel 0 diría "0%": se muestra lo que da el primer nivel
const SIN_EFECTO_EN_0 = ["fogata", "choza", "pala"];
const ICONOS_RECURSO = { monedas: "🪙", madera: "🪵", piedra: "🪨", cocos: "🥥", gemas: "💎" };

// ---------- Estado ----------
const NUEVA_ISLA = (n) => ({ numero: n, casillas: null, exploradas: 0, fragmentos: 0, tesoroAbierto: false, edificios: {} });
const estado = cargar(CLAVE, {
    monedas: 0, gemas: 0, madera: 0, piedra: 0, cocos: 3, energia: 20, ultimaEnergia: Date.now(),
    brujulas: 0, isla: NUEVA_ISLA(1), ultimaVez: Date.now(),
    contadores: { exploradas: 0, cofres: 0, tesoros: 0, islas: 0, gemas: 0, cocos: 0 },
});
const cont = estado.contadores;
cont.piratas ??= 0;
const isla = () => estado.isla.numero;
const nivel = (id) => estado.isla.edificios[id] ?? 0;

// ---------- Objetos del explorador (se compran con gemas y se conservan al zarpar) ----------
const OBJETOS = [
    { id: "botas", icono: "🥾", nombre: "Botas de explorador", detalle: (n) => `${n * 12}% de chance de explorar sin gastar energía`, max: 5, costo: (n) => 3 * 2 ** n },
    { id: "cantimplora", icono: "🫗", nombre: "Cantimplora", detalle: (n) => `+${n * 3} de energía máxima`, max: 5, costo: (n) => 2 * 2 ** n },
    { id: "linterna", icono: "🔦", nombre: "Linterna", detalle: (n) => `Cuevas y cofres dan +${n * 40}%`, max: 5, costo: (n) => 4 * 2 ** n },
    { id: "catalejo", icono: "🔭", nombre: "Catalejo", detalle: (n) => `Destellos ${n * 25}% más seguido y +${n * 30}% de botín`, max: 4, costo: (n) => 5 * 2 ** n },
    { id: "loro", icono: "🦜", nombre: "Loro compañero", detalle: (n) => (n ? `Eventos +${n * 35}% de premio y ${n * 3} s más para reaccionar` : "Mejora los premios de piratas, tormentas y mercaderes"), max: 3, costo: (n) => Math.ceil(8 * 2.5 ** n) },
];
estado.objetos ??= {};
const objeto = (id) => estado.objetos[id] ?? 0;
const extraLoro = () => 1 + objeto("loro") * 0.35;

const energiaMax = () => 20 + nivel("choza") * 5 + estado.brujulas + objeto("cantimplora") * 3;
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
    conectarIsla(casillas);
    return casillas;
}
// Toda la tierra tiene que poder alcanzarse desde el campamento: los islotes sueltos se hunden.
// Si tenían una ruina o la X, se mudan a una casilla alcanzable (si ya está todo explorado,
// esa casilla se vuelve a tapar con niebla para poder excavarla).
function conectarIsla(lista) {
    const centro = lista.find((c) => c.tipo === "campamento");
    const alcanzable = new Set([centro]);
    const cola = [centro];
    while (cola.length) for (const v of vecinas(cola.pop(), lista)) if (v.tierra && !alcanzable.has(v)) {
        alcanzable.add(v);
        cola.push(v);
    }
    const especial = (c) => ["ruina", "tesoro", "campamento"].includes(c.tipo);
    for (const c of lista) {
        if (!c.tierra || alcanzable.has(c)) continue;
        if ((c.tipo === "ruina" || c.tipo === "tesoro") && !c.vista) {
            const libres = [...alcanzable].filter((d) => !especial(d) && !d.vacia);
            const destino = libres.filter((d) => !d.vista).sort((a, b) => dist(b, centro) - dist(a, centro))[0]
                ?? libres.filter((d) => d.tipo === "arena" || d.tipo === "pasto").sort((a, b) => dist(b, centro) - dist(a, centro))[0];
            if (destino) {
                destino.tipo = c.tipo;
                destino.vista = false;
            }
        }
        c.tierra = false;
        c.tipo = null;
        c.vista = false;
    }
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
else conectarIsla(estado.isla.casillas); // arregla partidas viejas con islotes imposibles de alcanzar
estado.isla.brillos ??= [];
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
    // Destellos: algo nuevo enterrado en casillas ya exploradas
    ctx.fillStyle = "#fff6b0";
    for (const i of estado.isla.brillos) {
        const p = centroCasilla(casillas()[i], m);
        const r = l * (0.16 + Math.sin(t * 5 + i) * 0.04);
        const bx = p.x + l * 0.24;
        const by = p.y - l * 0.24;
        ctx.beginPath();
        ctx.moveTo(bx, by - r);
        ctx.quadraticCurveTo(bx, by, bx + r, by);
        ctx.quadraticCurveTo(bx, by, bx, by + r);
        ctx.quadraticCurveTo(bx, by, bx - r, by);
        ctx.quadraticCurveTo(bx, by, bx, by - r);
        ctx.fill();
    }
    dibujarEvento(ctx, m, t);
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
            explorador.cavando = excavando ? 0.45 : 0;
        } else {
            explorador.x += (dx / largo) * vel * dt;
            explorador.y += (dy / largo) * vel * dt;
        }
    } else if (explorador.cavando > 0) {
        explorador.cavando -= dt;
        if (Math.random() < dt * 20) chispas.emitir(explorador.x + l * 0.15, explorador.y + l * 0.25, "#c9a26b", 2, 60);
        if (explorador.cavando <= 0) terminarExcavacion();
    }
    // Si está libre, sigue con la próxima casilla que tocaste
    if (!explorador.destino && !excavando && explorador.cavando <= 0 && cola.length) seguirCola();
    // Marcas de las casillas en espera (1, 2, 3…)
    cola.forEach((k, i) => {
        const p = centroCasilla(k, m);
        ctx.fillStyle = "#0b4f6ccc";
        ctx.beginPath();
        ctx.arc(p.x + l * 0.28, p.y - l * 0.28, l * 0.17, 0, TAU);
        ctx.fill();
        ctx.fillStyle = "#fff";
        ctx.font = `900 ${Math.round(l * 0.2)}px system-ui, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(i + 1, p.x + l * 0.28, p.y - l * 0.27);
    });
    ctx.textBaseline = "alphabetic";
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
// Casillas tocadas mientras el explorador camina o cava: las explora en orden
const cola = [];
const MAX_COLA = 8;
const energiaEnCola = () => cola.reduce((t, k) => t + (k.vista ? 1 : TERRENOS[k.tipo].costo), 0);
const pegadas = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y) === 1;
function ponerEnCola(k) {
    if (cola.includes(k)) {
        cola.splice(cola.indexOf(k), 1); // tocarla de nuevo la saca de la lista
        return;
    }
    if (cola.length >= MAX_COLA) return avisar("Ya tenés muchas casillas en espera", 1200);
    const costo = k.vista ? 1 : TERRENOS[k.tipo].costo;
    if (estado.energia < energiaEnCola() + costo) {
        avisar(`No te alcanza la energía para tantas (⚡${energiaEnCola() + costo})`, 1400);
        efectos.error();
        return;
    }
    cola.push(k);
    efectos.toque();
}
function seguirCola() {
    while (cola.length) {
        const k = cola.shift();
        if (k.vista) {
            if (tocarDestello(k)) return;
            continue;
        }
        if (explorable(k)) return explorar(k);
    }
}
function explorar(k) {
    if (excavando || explorador.destino) return;
    const costo = TERRENOS[k.tipo].costo;
    if (estado.energia < costo) {
        avisar(`Te falta energía (⚡${costo}). Esperá un rato o comé un coco 🥥`);
        efectos.error();
        return;
    }
    // Las botas a veces ahorran la energía
    if (Math.random() < objeto("botas") * 0.12) avisar("🥾 ¡Explorás sin gastar energía!", 1400);
    else estado.energia -= costo;
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
    if (k.brillo) return cavarDestello(k.real);
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
        dar("monedas", (60 + r() * 60) * mult * (1 + objeto("linterna") * 0.4), p, 0);
        if (r() < 0.5) dar("gemas", 1 + Math.floor(r() * 2), p, 1);
        sonidos.cofre();
        avisar("🧰 ¡Un cofre!");
    } else if (k.tipo === "cueva") {
        dar("gemas", (1 + Math.floor(r() * 3 * Math.sqrt(isla()))) * (1 + objeto("linterna") * 0.4), p, 0);
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

// ---------- Destellos ----------
// Cada tanto aparece algo enterrado en una casilla ya explorada: así siempre hay cómo seguir
// juntando recursos aunque la isla esté toda descubierta (para el muelle y zarpar).
const indice = (k) => k.y * COLS + k.x;
const maxDestellos = () => (porcentajeExplorado() >= 1 ? 5 : 3);
let relojDestellos = 0;
function sumarDestello(dt) {
    relojDestellos += dt;
    const cada = (porcentajeExplorado() >= 1 ? 12 : 35) / (1 + objeto("catalejo") * 0.25);
    if (relojDestellos < cada) return;
    relojDestellos = 0;
    if (estado.isla.brillos.length >= maxDestellos()) return;
    const libres = tierras().filter((k) => k.vista && k.tipo !== "campamento" && !estado.isla.brillos.includes(indice(k)));
    if (libres.length) estado.isla.brillos.push(indice(libres[Math.floor(Math.random() * libres.length)]));
}
function tocarDestello(k) {
    if (!estado.isla.brillos.includes(indice(k))) return false;
    if (excavando || explorador.destino) return true;
    if (estado.energia < 1) {
        avisar("Te falta energía (⚡1). Esperá un rato o comé un coco 🥥");
        efectos.error();
        return true;
    }
    estado.energia -= 1;
    excavando = { brillo: true, real: k };
    explorador.destino = k;
    efectos.toque();
    refrescar();
    return true;
}
function cavarDestello(k) {
    estado.isla.brillos = estado.isla.brillos.filter((i) => i !== indice(k));
    const p = centroCasilla(k);
    const mult = multEncontrar() * 0.8 * (1 + objeto("catalejo") * 0.3);
    const r = Math.random;
    sonidos.cavar();
    chispas.emitir(p.x, p.y, "#fff6b0", 12, 110);
    if (k.tipo === "palmera" || k.tipo === "mono") {
        dar("madera", (3 + r() * 3) * mult, p, 0);
        dar("cocos", (1 + r() * 2) * mult, p, 1);
    } else if (k.tipo === "roca" || k.tipo === "cueva" || k.tipo === "ruina") {
        dar("piedra", (3 + r() * 3) * mult, p, 0);
        dar("monedas", (10 + r() * 10) * mult, p, 1);
    } else {
        dar("monedas", (15 + r() * 20) * mult, p, 0);
        dar(r() < 0.5 ? "madera" : "piedra", (1 + r() * 3) * mult, p, 1);
    }
    if (r() < 0.08) dar("gemas", 1, p, 2);
    sonidos.descubrir();
    refrescar();
}

// ---------- Eventos: piratas, tormentas y barcos mercantes ----------
let evento = null;
let proximoEvento = 80 + Math.random() * 60;
function revisarEvento(dt) {
    if (document.hidden) return;
    if (evento) {
        if (Date.now() > evento.fin) terminarEvento();
        else if (evento.tipo === "mercader") pintarEvento();
        return;
    }
    proximoEvento -= dt;
    if (proximoEvento > 0 || tierras().filter((k) => k.vista).length < 6) return;
    proximoEvento = 120 + Math.random() * 120;
    empezarEvento(["piratas", "tormenta", "mercader"][Math.floor(Math.random() * 3)]);
}
function empezarEvento(tipo) {
    const dur = (tipo === "tormenta" ? 14 : tipo === "piratas" ? 12 : 25) + objeto("loro") * 3;
    evento = { tipo, dur, fin: Date.now() + dur * 1000 };
    if (tipo === "piratas") {
        const libres = tierras().filter((k) => k.vista && k.tipo !== "campamento").sort(() => Math.random() - 0.5);
        evento.piratas = libres.slice(0, 3).map((k) => ({ i: indice(k), vivo: true }));
        avisar("🏴‍☠️ ¡Desembarcaron piratas! Tocalos antes de que te roben", 3000);
        sonidos.ola();
        vibrar([40, 40, 40]);
    } else if (tipo === "tormenta") {
        avisar("⛈️ ¡Tormenta! Cuando pase, el mar deja cosas en la playa", 3000);
        sonidos.ola();
    } else {
        evento.oferta = ofertaMercader();
        avisar("⛵ Llegó un barco mercante", 1800);
        pintarEvento();
    }
}
// Solo en la compu de desarrollo: permite disparar un evento desde la consola para probarlo
if (location.hostname === "localhost") window.probarEvento = empezarEvento;
function ofertaMercader() {
    const m = multEncontrar();
    const opciones = [
        { da: { madera: Math.ceil(15 * m) }, recibe: { monedas: Math.ceil(160 * m) } },
        { da: { piedra: Math.ceil(12 * m) }, recibe: { monedas: Math.ceil(170 * m) } },
        { da: { monedas: Math.ceil(400 * m) }, recibe: { gemas: 3 } },
        { da: { cocos: 4 }, recibe: { madera: Math.ceil(20 * m), piedra: Math.ceil(10 * m) } },
    ];
    return opciones[Math.floor(Math.random() * opciones.length)];
}
function pintarEvento() {
    const caja = $("evento");
    if (evento?.tipo !== "mercader") {
        caja.hidden = true;
        return;
    }
    const o = evento.oferta;
    const resto = Math.max(0, (evento.fin - Date.now()) / (evento.dur * 1000));
    caja.innerHTML = `<strong>⛵ Barco mercante</strong>Te doy ${textoCosto(o.recibe)} por ${textoCosto(o.da)}
        <div class="botones-evento"><button type="button" data-trato ${puedePagar(o.da) ? "" : "disabled"}>Trato hecho</button><button type="button" class="no" data-no-trato>No, gracias</button></div>
        <div class="tiempo-evento"><i style="transform:scaleX(${resto.toFixed(2)})"></i></div>`;
    caja.hidden = false;
}
$("evento").addEventListener("click", (e) => {
    if (evento?.tipo !== "mercader") return;
    if (e.target.closest("[data-trato]")) {
        const o = evento.oferta;
        if (!puedePagar(o.da)) return;
        for (const [r, n] of Object.entries(o.da)) estado[r] -= n;
        let k = 0;
        for (const [r, n] of Object.entries(o.recibe)) dar(r, r === "gemas" ? n : n * extraLoro(), { x: ancho / 2, y: alto * 0.7 }, k++);
        efectos.monedas();
        terminarEvento();
    } else if (e.target.closest("[data-no-trato]")) terminarEvento();
});
function terminarEvento() {
    const ev = evento;
    evento = null;
    $("evento").hidden = true;
    if (ev.tipo === "piratas") {
        const quedan = ev.piratas.filter((p) => p.vivo).length;
        if (!quedan) {
            cont.piratas++;
            dar("gemas", 1 + objeto("loro"), { x: ancho / 2, y: alto / 2 }, 0);
            avisar("⚔️ ¡Echaste a todos los piratas!");
            efectos.fanfarria();
        } else {
            const robo = Math.floor(estado.monedas * 0.06 * quedan);
            estado.monedas -= robo;
            avisar(robo ? `🏴‍☠️ Los piratas se llevaron ${formatear(robo)} monedas` : "🏴‍☠️ Los piratas se fueron");
            efectos.error();
        }
    } else if (ev.tipo === "tormenta") {
        const libres = tierras().filter((k) => k.vista && k.tipo !== "campamento" && !estado.isla.brillos.includes(indice(k)));
        for (let n = 0; n < 4 && libres.length; n++) estado.isla.brillos.push(indice(libres.splice(Math.floor(Math.random() * libres.length), 1)[0]));
        avisar("✨ La tormenta dejó cosas en la playa: cavá los destellos");
    }
    refrescar();
}
function tocarPirata(k) {
    const pirata = evento?.tipo === "piratas" && evento.piratas.find((p) => p.vivo && p.i === indice(k));
    if (!pirata) return false;
    pirata.vivo = false;
    const p = centroCasilla(k);
    dar("monedas", (30 + Math.random() * 30) * multEncontrar() * extraLoro(), p, 0);
    chispas.emitir(p.x, p.y, "#e63946", 16, 160);
    sonidos.cavar();
    vibrar(25);
    if (evento.piratas.every((x) => !x.vivo)) terminarEvento();
    return true;
}
function dibujarPirata(c, x, y, l) {
    c.fillStyle = "#0003";
    c.beginPath();
    c.ellipse(x, y + l * 0.3, l * 0.16, l * 0.05, 0, 0, TAU);
    c.fill();
    c.fillStyle = "#3d405b";
    c.fillRect(x - l * 0.08, y + l * 0.1, l * 0.06, l * 0.2);
    c.fillRect(x + l * 0.02, y + l * 0.1, l * 0.06, l * 0.2);
    c.fillStyle = "#f8f9fa";
    c.fillRect(x - l * 0.12, y - l * 0.08, l * 0.24, l * 0.2);
    c.fillStyle = "#e63946";
    c.fillRect(x - l * 0.12, y - l * 0.04, l * 0.24, l * 0.04);
    c.fillRect(x - l * 0.12, y + l * 0.04, l * 0.24, l * 0.04);
    c.fillStyle = "#f2cc8f";
    c.beginPath();
    c.arc(x, y - l * 0.17, l * 0.1, 0, TAU);
    c.fill();
    c.fillStyle = "#1b1b1b";
    c.beginPath();
    c.moveTo(x - l * 0.18, y - l * 0.2);
    c.quadraticCurveTo(x, y - l * 0.42, x + l * 0.18, y - l * 0.2);
    c.fill();
    c.fillStyle = "#f8f9fa";
    c.beginPath();
    c.arc(x, y - l * 0.27, l * 0.03, 0, TAU);
    c.fill();
    c.fillStyle = "#1b1b1b";
    c.fillRect(x + l * 0.02, y - l * 0.2, l * 0.06, l * 0.035);
    c.strokeStyle = "#ced4da";
    c.lineWidth = l * 0.03;
    c.beginPath();
    c.moveTo(x + l * 0.14, y + l * 0.04);
    c.lineTo(x + l * 0.3, y - l * 0.18);
    c.stroke();
}
function dibujarEvento(ctx, m, t) {
    if (!evento) return;
    const l = m.lado;
    if (evento.tipo === "piratas") {
        for (const pi of evento.piratas) {
            if (!pi.vivo) continue;
            const p = centroCasilla(casillas()[pi.i], m);
            dibujarPirata(ctx, p.x, p.y - l * 0.05 + Math.sin(t * 6 + pi.i) * l * 0.04, l);
        }
    } else if (evento.tipo === "mercader") {
        // Barco anclado cerca de la costa
        const x = ancho * 0.86;
        const y = 92 + Math.sin(t * 1.5) * 3;
        ctx.fillStyle = "#6f4518";
        ctx.beginPath();
        ctx.moveTo(x - 34, y);
        ctx.lineTo(x + 34, y);
        ctx.lineTo(x + 24, y + 16);
        ctx.lineTo(x - 24, y + 16);
        ctx.fill();
        ctx.fillStyle = "#8d5a2b";
        ctx.fillRect(x - 2, y - 46, 4, 46);
        ctx.fillStyle = "#f8f9fa";
        ctx.beginPath();
        ctx.moveTo(x + 2, y - 44);
        ctx.quadraticCurveTo(x + 30, y - 26, x + 2, y - 6);
        ctx.fill();
        ctx.fillStyle = "#2a9d8f";
        ctx.fillRect(x - 2, y - 52, 16, 8);
    } else {
        // Tormenta: cielo oscuro, lluvia y algún relámpago
        ctx.fillStyle = "rgba(10,20,45,0.38)";
        ctx.fillRect(0, 0, ancho, alto);
        ctx.strokeStyle = "rgba(200,220,255,0.45)";
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        for (let k = 0; k < 60; k++) {
            const x = ((k * 53 + t * 220) % (ancho + 40)) - 20;
            const y = ((k * 97 + t * 520) % (alto + 40)) - 20;
            ctx.moveTo(x, y);
            ctx.lineTo(x - 5, y + 14);
        }
        ctx.stroke();
        if (Math.sin(t * 1.3) > 0.985) {
            ctx.fillStyle = "rgba(255,255,255,0.45)";
            ctx.fillRect(0, 0, ancho, alto);
        }
    }
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
    if (tocarPirata(k)) return;
    const ocupado = Boolean(explorador.destino || excavando || explorador.cavando > 0);
    if (k.vista) {
        if (ocupado && estado.isla.brillos.includes(indice(k))) return ponerEnCola(k);
        if (tocarTesoroVisto(k) || tocarDestello(k)) return;
        if (!ocupado) explorador.destino = k; // caminar hasta ahí
        return;
    }
    // Se puede encolar una casilla pegada a otra que ya está en la lista
    const alcanzable = explorable(k) || cola.some((q) => !q.vista && pegadas(q, k));
    if (!alcanzable) {
        avisar("Explorá primero las casillas de al lado (las que brillan)");
        return;
    }
    if (ocupado || cola.length) return ponerEnCola(k);
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
            return `<div class="fila-i"><span class="ico-i">${ed.icono}</span><div class="txt"><strong>${ed.nombre}${n ? ` <em>Nv ${n}</em>` : ""}</strong><span>${n || !SIN_EFECTO_EN_0.includes(ed.id) ? ed.detalle(n) : `Al construirla: ${ed.detalle(1)}`}</span></div>
                <button type="button" data-edificio="${ed.id}" ${tope || !puedePagar(costo) ? "disabled" : ""}>${tope ? "Listo" : textoCosto(costo)}</button></div>`;
        }).join("");
    } else if (pestana === "explorador") {
        html = OBJETOS.map((o) => {
            const n = objeto(o.id);
            const tope = n >= o.max;
            const costo = o.costo(n);
            return `<div class="fila-i"><span class="ico-i">${o.icono}</span><div class="txt"><strong>${o.nombre}${n ? ` <em>Nv ${n}</em>` : ""}</strong><span>${o.detalle(tope ? n : Math.max(n, 1))}</span></div>
                <button type="button" data-objeto="${o.id}" ${tope || estado.gemas < costo ? "disabled" : ""}>${tope ? "Máximo" : `💎${costo}`}</button></div>`;
        }).join("") + `<p class="ayuda-i">Se compran con gemas 💎 (cuevas, cofres, piratas y mercaderes) y los conservás al zarpar a otra isla.</p>`;
    } else {
        const pct = Math.round(porcentajeExplorado() * 100);
        const nuevas = brujulasAlZarpar();
        html = `<div class="tarjeta-isla"><strong>🏝️ Isla ${isla()}</strong>
            <div class="progreso-isla"><i style="width:${pct}%"></i></div><span>${pct}% explorada · 🗺️ ${estado.isla.fragmentos}/3 · ${estado.isla.tesoroAbierto ? "💰 tesoro encontrado" : "tesoro sin encontrar"}</span></div>
            <div class="fila-i"><span class="ico-i">🧭</span><div class="txt"><strong>Brújulas: ${estado.brujulas}</strong><span>Cada una: +10% de todo y +1 de energía máxima, para siempre</span></div></div>
            <div class="fila-i zarpar"><span class="ico-i">⛵</span><div class="txt"><strong>Zarpar a la isla ${isla() + 1}</strong>
                <span>${nivel("muelle") ? `Empezás de nuevo en una isla más grande y rica. Ganás ${nuevas} brújula${nuevas === 1 ? "" : "s"}.` : "Primero construí el muelle en el campamento."}</span></div>
                <button type="button" data-zarpar ${nivel("muelle") && nuevas > 0 ? "" : "disabled"}>Zarpar</button></div>
            ${pct >= 100 ? `<p class="ayuda-i"><strong>¡Isla explorada!</strong> Cavá los destellos ✨ que aparecen para seguir juntando, construí el muelle ⚓ y zarpá a una isla nueva.</p>` : ""}
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
    if (b.dataset.objeto) {
        const o = OBJETOS.find((x) => x.id === b.dataset.objeto);
        const n = objeto(o.id);
        if (n >= o.max || estado.gemas < o.costo(n)) return;
        estado.gemas -= o.costo(n);
        estado.objetos[o.id] = n + 1;
        efectos.comprar();
        avisar(`${o.icono} ${o.nombre} ${n ? `nivel ${n + 1}` : "comprado"}`);
    } else if (b.dataset.edificio) {
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
    { id: "piratas5", icono: "⚔️", nombre: "Terror de los piratas", detalle: "Echá a los piratas 5 veces", meta: 5, valor: () => cont.piratas, fichas: 2500 },
    { id: "explorador", icono: "🎒", nombre: "Bien equipado", detalle: "Tené los 5 objetos del explorador", meta: OBJETOS.length, valor: () => OBJETOS.filter((o) => objeto(o.id) > 0).length, fichas: 3000 },
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
        sumarDestello(segundo);
        revisarEvento(segundo);
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
