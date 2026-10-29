// Acuario (simulador): peces que nadan de verdad (aceleran, giran, forman cardúmenes), comida que se hunde,
// hambre, crías, depredadores que se comen a los chicos, agua que se ensucia y visitas que pagan por mirar.
// La partida se guarda en "acuario-sim" (la del acuario viejo queda guardada aparte).
import { formatear, cargar, guardar, vibrar } from "../../js/comun3d.js";
import { crearLienzo, bucle } from "../../js/lienzo2d.js";
import { crearAudio, MUSICAS } from "../../js/sonido.js";
import { crearBase, calidadAutomatica } from "../../js/incremental.js";
import { ESPECIES, especie, PLANTAS, DECORACIONES, nombreAlAzar, dibujarPez } from "./especies.js";

const $ = (id) => document.getElementById(id);
const CLAVE = "acuario-sim";
const TAU = Math.PI * 2;
const HORAS_HAMBRE = 3; // de lleno a muerto de hambre
const HORAS_SIN_COMER = 8; // con hambre total durante este tiempo, el pez se muere

const audio = crearAudio({ musica: MUSICAS.tranquila });
const { nota, golpe, efectos } = audio;
const sonidos = {
    comida: () => golpe({ dur: 0.05, vol: 0.08, filtro: 3000 }),
    bocado: () => nota({ f: 700 + Math.random() * 200, hasta: 400, dur: 0.06, vol: 0.06, onda: "sine" }),
    burbuja: () => nota({ f: 400 + Math.random() * 300, hasta: 900, dur: 0.12, vol: 0.06, onda: "sine" }),
    chapuzon: () => {
        golpe({ dur: 0.3, vol: 0.15, filtro: 800, tipo: "lowpass" });
        nota({ f: 300, hasta: 120, dur: 0.25, vol: 0.08, onda: "sine" });
    },
    limpiar: () => golpe({ dur: 0.6, vol: 0.12, filtro: 1800, tipo: "bandpass" }),
    triste: () => [392, 349, 311].forEach((f, k) => nota({ f, t: k * 0.2, dur: 0.4, vol: 0.1, onda: "sine" })),
};

// ---------- Equipo ----------
const EQUIPO = [
    { id: "pecera", icono: "🫙", nombre: "Pecera más grande", detalle: (n) => `Entran ${capacidad(n)} lugares de peces${n < 6 ? ` (sube a ${capacidad(n + 1)})` : ""}`, max: 6, costo: (n) => Math.ceil(300 * 3.2 ** n) },
    { id: "filtro", icono: "🌀", nombre: "Filtro", detalle: (n) => (n ? `Limpia el agua sola (${n * 20}% por hora)` : "Limpia el agua sola"), max: 5, costo: (n) => Math.ceil(250 * 2.6 ** n) },
    { id: "comedero", icono: "⏲️", nombre: "Comedero automático", detalle: (n) => (n ? `Les da de comer solo cada ${Math.max(10, 60 - n * 10)} min` : "Les da de comer cuando no estás"), max: 5, costo: (n) => Math.ceil(400 * 2.8 ** n) },
    { id: "luz", icono: "💡", nombre: "Luces de colores", detalle: (n) => `+${n * 20}% de visitas`, max: 5, costo: (n) => Math.ceil(500 * 2.7 ** n) },
    { id: "cartel", icono: "🪧", nombre: "Cartel en la puerta", detalle: (n) => `+${n * 15}% de lo que paga cada visita`, max: 8, costo: (n) => Math.ceil(800 * 2.5 ** n) },
];
const capacidad = (n) => 8 + n * 6;

// ---------- Estado ----------
const estado = cargar(CLAVE, {
    monedas: 150, peces: [], plantas: [], deco: [], equipo: {}, suciedad: 0.05, ultimaVez: Date.now(), ultimoComedero: Date.now(),
    contadores: { crias: 0, limpiezas: 0, comidas: 0, ganado: 0, comidosPorDepredador: 0 },
});
const cont = estado.contadores;
const nivelEquipo = (id) => estado.equipo[id] ?? 0;
const lugares = () => capacidad(nivelEquipo("pecera"));
const ocupados = () => estado.peces.reduce((t, p) => t + Math.max(1, Math.round(especie(p.esp).tam * 2)), 0);
const espacioDe = (e) => Math.max(1, Math.round(e.tam * 2));
const nivelAcuario = () => 1 + Math.floor(Math.sqrt(cont.ganado / 400));
let idPez = Date.now();

// Un pez empieza chico (crece al comer). Si es la primera vez, la pecera arranca con 3 neones.
function nuevoPez(esp, x, y, crece = 0.6) {
    return { id: (idPez++).toString(36), esp, nombre: nombreAlAzar(), nace: Date.now(), crece, hambre: 0.3, hambreDesde: 0, x, y, vx: 0, vy: 0 };
}
if (!estado.peces.length && !estado.iniciado) {
    estado.iniciado = true;
    for (let k = 0; k < 3; k++) estado.peces.push(nuevoPez("neon", 0.3 + k * 0.15, 0.4 + k * 0.05, 0.7));
    estado.plantas.push({ tipo: "alga", x: 0.18 }, { tipo: "alga", x: 0.82 });
}

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
const vigilarCalidad = calidadAutomatica((n) => {
    lienzo.cambiarEscala(n === 1 ? 1.15 : 1);
    burbujasMax = n === 1 ? 18 : 10;
});
const arena = () => alto * 0.86;
const largoPez = (p) => Math.min(ancho, 560) * 0.19 * especie(p.esp).tam * (0.45 + p.crece * 0.55);

// Fondo fijo: agua, rayos de luz, rocas lejanas, arena y decoraciones
function pintarFondo() {
    const escala = Math.min(devicePixelRatio, 1.5);
    const can = document.createElement("canvas");
    can.width = Math.ceil(ancho * escala);
    can.height = Math.ceil(alto * escala);
    const c = can.getContext("2d");
    c.scale(escala, escala);
    const agua = c.createLinearGradient(0, 0, 0, alto);
    agua.addColorStop(0, "#48cae4");
    agua.addColorStop(0.45, "#0096c7");
    agua.addColorStop(1, "#023e8a");
    c.fillStyle = agua;
    c.fillRect(0, 0, ancho, alto);
    // Rayos de luz desde la superficie
    for (let k = 0; k < 6; k++) {
        const x = ancho * (0.08 + k * 0.17);
        const g = c.createLinearGradient(x, 0, x + ancho * 0.1, alto * 0.8);
        g.addColorStop(0, "#ffffff2a");
        g.addColorStop(1, "#ffffff00");
        c.fillStyle = g;
        c.beginPath();
        c.moveTo(x, 0);
        c.lineTo(x + ancho * 0.06, 0);
        c.lineTo(x + ancho * 0.2, alto * 0.85);
        c.lineTo(x + ancho * 0.06, alto * 0.85);
        c.fill();
    }
    // Rocas lejanas (siluetas azuladas)
    c.fillStyle = "#03045e55";
    c.beginPath();
    c.moveTo(0, arena());
    for (let x = 0; x <= ancho; x += 12) c.lineTo(x, arena() - alto * 0.08 - Math.sin(x / 50) * alto * 0.04 - Math.sin(x / 17) * alto * 0.015);
    c.lineTo(ancho, arena());
    c.fill();
    // Arena con piedritas
    const ar = c.createLinearGradient(0, arena(), 0, alto);
    ar.addColorStop(0, "#e9c46a");
    ar.addColorStop(1, "#b08900");
    c.fillStyle = ar;
    c.beginPath();
    c.moveTo(0, arena() + 6);
    for (let x = 0; x <= ancho; x += 10) c.lineTo(x, arena() + Math.sin(x / 40) * 4);
    c.lineTo(ancho, alto);
    c.lineTo(0, alto);
    c.fill();
    let s = 99;
    const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    for (let k = 0; k < 90; k++) {
        c.fillStyle = ["#f4a26188", "#6c757d88", "#fff3b088", "#8d5a2b88"][k % 4];
        c.beginPath();
        c.ellipse(r() * ancho, arena() + 6 + r() * (alto - arena() - 8), 1.5 + r() * 3, 1 + r() * 2, 0, 0, TAU);
        c.fill();
    }
    // Decoraciones compradas
    for (const d of estado.deco) dibujarDeco(c, d.tipo, d.x * ancho, arena() + 8);
    // Piedra difusora de aire (de ahí salen las burbujas)
    c.fillStyle = "#495057";
    c.beginPath();
    c.ellipse(ancho * 0.92, arena() + 4, 10, 5, 0, 0, TAU);
    c.fill();
    return can;
}
function dibujarDeco(c, tipo, x, y) {
    const t = Math.min(ancho, 520) * 0.12;
    if (tipo === "roca") {
        for (const [dx, dy, r, color] of [[-0.25, -0.1, 0.32, "#495057"], [0.2, -0.05, 0.25, "#6c757d"], [0, -0.3, 0.3, "#343a40"]]) {
            c.fillStyle = color;
            c.beginPath();
            c.ellipse(x + dx * t, y + dy * t, r * t, r * t * 0.75, 0, 0, TAU);
            c.fill();
        }
    } else if (tipo === "coral") {
        c.strokeStyle = "#ff8fab";
        c.lineCap = "round";
        c.lineWidth = t * 0.09;
        const rama = (x0, y0, ang, largo, n) => {
            const x1 = x0 + Math.cos(ang) * largo;
            const y1 = y0 + Math.sin(ang) * largo;
            c.beginPath();
            c.moveTo(x0, y0);
            c.lineTo(x1, y1);
            c.stroke();
            if (n > 0) {
                rama(x1, y1, ang - 0.45, largo * 0.72, n - 1);
                rama(x1, y1, ang + 0.45, largo * 0.72, n - 1);
            }
        };
        rama(x, y, -Math.PI / 2, t * 0.45, 3);
    } else if (tipo === "cofre") {
        c.fillStyle = "#6f4518";
        c.fillRect(x - t * 0.4, y - t * 0.35, t * 0.8, t * 0.35);
        c.fillStyle = "#8d5a2b";
        c.beginPath();
        c.ellipse(x, y - t * 0.35, t * 0.4, t * 0.2, 0, Math.PI, 0);
        c.fill();
        c.fillStyle = "#ffd166";
        c.fillRect(x - t * 0.4, y - t * 0.22, t * 0.8, t * 0.05);
        c.beginPath();
        c.arc(x + t * 0.1, y - t * 0.42, t * 0.06, 0, TAU);
        c.fill();
    } else {
        c.fillStyle = "#adb5bd";
        c.fillRect(x - t * 0.45, y - t * 0.6, t * 0.9, t * 0.6);
        for (const dx of [-0.45, 0.25]) {
            c.fillRect(x + dx * t, y - t * 0.95, t * 0.2, t * 0.95);
            c.fillStyle = "#868e96";
            for (let k = 0; k < 3; k++) c.fillRect(x + dx * t + k * t * 0.07, y - t * 1.02, t * 0.05, t * 0.07);
            c.fillStyle = "#adb5bd";
        }
        c.fillStyle = "#1b263b";
        c.beginPath();
        c.ellipse(x, y - t * 0.12, t * 0.14, t * 0.2, 0, Math.PI, 0);
        c.fill();
        c.fillRect(x - t * 0.14, y - t * 0.12, t * 0.28, t * 0.12);
        c.fillStyle = "#52b78888";
        c.beginPath();
        c.ellipse(x - t * 0.3, y - t * 0.2, t * 0.1, t * 0.05, 0.4, 0, TAU);
        c.fill();
    }
}

// Plantas que se mecen con el agua (se dibujan en cada cuadro, son pocas hojas)
function dibujarPlantas(ctx, t) {
    for (const p of estado.plantas) {
        const datos = PLANTAS.find((x) => x.id === p.tipo);
        const base = p.x * ancho;
        const alturaP = alto * datos.alto;
        const hojas = p.tipo === "helecho" ? 6 : 4;
        for (let k = 0; k < hojas; k++) {
            const dx = (k - (hojas - 1) / 2) * 6;
            const h = alturaP * (0.7 + ((k * 37) % 10) / 30);
            const vaiven = Math.sin(t * 0.9 + p.x * 10 + k) * 10;
            ctx.strokeStyle = k % 2 ? datos.color : shade(datos.color);
            ctx.lineWidth = p.tipo === "kelp" ? 7 : p.tipo === "helecho" ? 5 : 4;
            ctx.lineCap = "round";
            ctx.beginPath();
            ctx.moveTo(base + dx, arena() + 6);
            ctx.quadraticCurveTo(base + dx + vaiven * 0.5, arena() - h * 0.5, base + dx + vaiven, arena() - h);
            ctx.stroke();
        }
    }
}
const shade = (hex) => {
    const n = parseInt(hex.slice(1), 16);
    return `rgb(${(n >> 16) * 0.75},${((n >> 8) & 255) * 0.75},${(n & 255) * 0.75})`;
};

// ---------- Simulación ----------
const comida = []; // escamas: { x, y, vx, vy, enArena }
const burbujas = [];
let burbujasMax = 26;
const avisos = []; // textos flotantes
const sustos = new Map(); // id del pez → tiempo de susto (los que huyen)

function soltarComida(x, y, cantidad = 4) {
    for (let k = 0; k < cantidad; k++) comida.push({ x: x + (Math.random() - 0.5) * 24, y: Math.max(8, y - 10 + Math.random() * 10), vx: (Math.random() - 0.5) * 6, vy: 6 + Math.random() * 6, enArena: 0 });
    cont.comidas++;
    sonidos.comida();
}

function moverPeces(dt, t) {
    const lista = estado.peces;
    for (const p of lista) {
        const e = especie(p.esp);
        const L = largoPez(p);
        let px = p.x * ancho;
        let py = p.y * alto;
        let ax = 0;
        let ay = 0;
        const velMax = (40 + 60 * e.vel) * (0.7 + p.crece * 0.3) * (p.hambre >= 1 ? 0.5 : 1);
        // Paseo: un punto al que nadar, que cambia cada tanto
        if (!p.meta || Math.random() < dt * 0.25 || Math.hypot(p.meta.x * ancho - px, p.meta.y * alto - py) < 20) {
            p.meta = { x: 0.08 + Math.random() * 0.84, y: e.id === "tiburon" ? 0.62 + Math.random() * 0.2 : 0.12 + Math.random() * 0.66 };
        }
        let destinoX = p.meta.x * ancho;
        let destinoY = p.meta.y * alto;
        let apuro = 0.5;
        // Hambre: va a la escama más cercana
        if (p.hambre > 0.15 && comida.length) {
            let mejor = null;
            let mejorD = 260;
            for (const f of comida) {
                const d = Math.hypot(f.x - px, f.y - py);
                if (d < mejorD) {
                    mejorD = d;
                    mejor = f;
                }
            }
            if (mejor) {
                destinoX = mejor.x;
                destinoY = mejor.y;
                apuro = 1;
                if (mejorD < L * 0.45) {
                    comida.splice(comida.indexOf(mejor), 1);
                    p.hambre = Math.max(0, p.hambre - 0.22);
                    p.hambreDesde = 0;
                    p.crece = Math.min(1, p.crece + 0.015);
                    sonidos.bocado();
                }
            }
        }
        // Depredador con hambre: caza al pez chico más cercano
        if (e.depredador && p.hambre > 0.4) {
            let presa = null;
            let dPresa = 220;
            for (const o of lista) {
                if (o === p || largoPez(o) > L * e.depredador) continue;
                const d = Math.hypot(o.x * ancho - px, o.y * alto - py);
                if (d < dPresa) {
                    dPresa = d;
                    presa = o;
                }
            }
            if (presa) {
                destinoX = presa.x * ancho;
                destinoY = presa.y * alto;
                apuro = 1.4;
                sustos.set(presa.id, 1.5);
                if (dPresa < L * 0.4) comerPez(p, presa);
            }
        }
        // Susto: escapa del depredador
        if (sustos.get(p.id) > 0) {
            sustos.set(p.id, sustos.get(p.id) - dt);
            const caz = lista.find((o) => especie(o.esp).depredador && o !== p && largoPez(p) <= largoPez(o) * especie(o.esp).depredador);
            if (caz) {
                destinoX = px - (caz.x * ancho - px) * 3;
                destinoY = py - (caz.y * alto - py) * 3;
                apuro = 1.6;
            }
        }
        // Hacia el destino
        const dx = destinoX - px;
        const dy = destinoY - py;
        const d = Math.hypot(dx, dy) || 1;
        ax += (dx / d) * velMax * apuro - p.vx;
        ay += (dy / d) * velMax * apuro * 0.7 - p.vy;
        // Cardumen: se juntan y nadan parecido a los de su especie; todos se separan si están muy encima
        let cx = 0;
        let cy = 0;
        let vx = 0;
        let vy = 0;
        let n = 0;
        for (const o of lista) {
            if (o === p) continue;
            const ox = o.x * ancho;
            const oy = o.y * alto;
            const dd = Math.hypot(ox - px, oy - py);
            if (dd < L * 0.9 && dd > 0) {
                ax -= ((ox - px) / dd) * 60;
                ay -= ((oy - py) / dd) * 60;
            }
            if (e.cardumen && o.esp === p.esp && dd < 110) {
                cx += ox;
                cy += oy;
                vx += o.vx;
                vy += o.vy;
                n++;
            }
        }
        if (n) {
            ax += (cx / n - px) * 0.8 + (vx / n - p.vx) * 0.6;
            ay += (cy / n - py) * 0.8 + (vy / n - p.vy) * 0.6;
        }
        // Paredes, superficie y arena
        const margen = L * 0.6;
        if (px < margen) ax += 200;
        if (px > ancho - margen) ax -= 200;
        if (py < margen + 6) ay += 200;
        if (py > arena() - L * 0.4) ay -= 260;
        // Aceleración suave (los grandes giran más lento)
        const agilidad = 2.4 / (0.6 + e.tam);
        p.vx += ax * agilidad * dt;
        p.vy += ay * agilidad * dt;
        const v = Math.hypot(p.vx, p.vy);
        const tope = velMax * (apuro > 1 ? apuro : 1);
        if (v > tope) {
            p.vx *= tope / v;
            p.vy *= tope / v;
        }
        px += p.vx * dt;
        py += p.vy * dt;
        p.x = Math.max(0.02, Math.min(0.98, px / ancho));
        p.y = Math.max(0.03, Math.min(arena() / alto - 0.02, py / alto));
        // Mira hacia donde nada (gira de a poco) y mueve la cola según la velocidad
        const objetivoMira = p.vx >= 0 ? 1 : -1;
        p.mira = (p.mira ?? objetivoMira) + (objetivoMira - (p.mira ?? objetivoMira)) * Math.min(1, dt * 6);
        p.fase = (p.fase ?? Math.random() * 4) + dt * (3 + v * 0.08);
    }
}

function comerPez(cazador, presa) {
    estado.peces = estado.peces.filter((x) => x !== presa);
    cazador.hambre = Math.max(0, cazador.hambre - 0.7);
    cazador.crece = Math.min(1, cazador.crece + 0.05);
    cont.comidosPorDepredador++;
    avisar(`😱 ${cazador.nombre} (${especie(cazador.esp).nombre}) se comió a ${presa.nombre}`);
    sonidos.triste();
    vibrar([40, 30, 80]);
    flotante(cazador.x * ancho, cazador.y * alto - 20, "¡ÑAM!", "#ff8fab");
    if (fichaAbierta === presa.id) cerrarFicha();
}

// Crías: dos adultos de la misma especie, felices y con lugar, a veces tienen un bebé
function revisarCrias(dt) {
    if (felicidad() < 0.6 || ocupados() >= lugares()) return;
    if (Math.random() > dt / 45) return;
    const adultos = estado.peces.filter((p) => p.crece >= 0.9 && p.hambre < 0.5);
    const porEspecie = {};
    for (const a of adultos) (porEspecie[a.esp] ??= []).push(a);
    const parejas = Object.entries(porEspecie).filter(([esp, l]) => l.length >= 2 && !especie(esp).depredador);
    if (!parejas.length) return;
    const [esp, l] = parejas[Math.floor(Math.random() * parejas.length)];
    if (espacioDe(especie(esp)) + ocupados() > lugares()) return;
    const bebe = nuevoPez(esp, l[0].x, l[0].y, 0.15);
    estado.peces.push(bebe);
    cont.crias++;
    avisar(`🥚 ¡Nació un ${especie(esp).nombre} bebé! Se llama ${bebe.nombre}`);
    efectos.logro();
}

// ---------- Felicidad, agua y visitas ----------
const bonusAmbiente = () => [...estado.plantas.map((p) => PLANTAS.find((x) => x.id === p.tipo).felicidad), ...estado.deco.map((d) => DECORACIONES.find((x) => x.id === d.tipo).felicidad)].reduce((t, n) => t + n, 0);
function felicidad() {
    if (!estado.peces.length) return 0.5;
    const hambrientos = estado.peces.filter((p) => p.hambre > 0.75).length / estado.peces.length;
    const lleno = Math.max(0, ocupados() / lugares() - 0.85) * 2;
    return Math.max(0, Math.min(1, 0.45 + Math.min(0.4, bonusAmbiente() * 0.01) - estado.suciedad * 0.6 - hambrientos * 0.4 - lleno + (estado.peces.length >= 3 ? 0.1 : 0)));
}
// Monedas por segundo que dejan las visitas
function porSegundo() {
    const belleza = estado.peces.reduce((t, p) => t + especie(p.esp).belleza * (0.4 + p.crece * 0.6), 0);
    return belleza * 0.12 * (0.25 + felicidad()) * (1 + nivelEquipo("luz") * 0.2) * (1 + nivelEquipo("cartel") * 0.15);
}
// El agua se ensucia de a poco (más con más peces y comida tirada); el filtro limpia
function cambiarSuciedad(segundos) {
    const ensucia = (0.03 + estado.peces.length * 0.006) / 3600;
    const limpia = (nivelEquipo("filtro") * 0.2) / 3600;
    estado.suciedad = Math.max(0, Math.min(1, estado.suciedad + (ensucia - limpia) * segundos));
}
// El hambre sube con el tiempo; si un pez pasa mucho con hambre total, se muere
function cambiarHambre(segundos) {
    const muertos = [];
    for (const p of estado.peces) {
        p.hambre = Math.min(1, p.hambre + segundos / (HORAS_HAMBRE * 3600));
        if (p.hambre >= 1) {
            p.hambreDesde = (p.hambreDesde || 0) + segundos;
            if (p.hambreDesde > HORAS_SIN_COMER * 3600) muertos.push(p);
        }
    }
    if (muertos.length) estado.peces = estado.peces.filter((p) => !muertos.includes(p));
    return muertos;
}
// Comedero automático: cuando hay hambre, tira comida (también mientras no estás)
function usarComedero(segundos, enVivo) {
    const n = nivelEquipo("comedero");
    if (!n) return;
    const cada = Math.max(10, 60 - n * 10) * 60;
    estado.tiempoComedero = (estado.tiempoComedero ?? 0) + segundos;
    while (estado.tiempoComedero >= cada) {
        estado.tiempoComedero -= cada;
        if (enVivo) soltarComida(ancho * (0.3 + Math.random() * 0.4), 14, 6);
        else for (const p of estado.peces) p.hambre = Math.max(0, p.hambre - 0.35);
    }
}

// ---------- Dibujo ----------
function dibujarPeces(ctx, t) {
    // Los más chicos se dibujan primero (quedan detrás de los grandes)
    const orden = [...estado.peces].sort((a, b) => largoPez(a) - largoPez(b));
    for (const p of orden) {
        const L = largoPez(p);
        const cuadro = Math.floor(p.fase ?? 0) % 4;
        const Lr = Math.max(8, Math.round(L / 3) * 3);
        const img = sprite(`pez-${p.esp}-${Lr}-${cuadro}`, Lr * 2.2, Lr * 1.6, (c) => {
            c.translate(Lr * 1.1, Lr * 0.8);
            dibujarPez(c, p.esp, Lr, cuadro);
        });
        const x = p.x * ancho;
        const y = p.y * alto;
        const inclinacion = Math.max(-0.5, Math.min(0.5, Math.atan2(p.vy, Math.abs(p.vx) + 1)));
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(p.mira ?? 1, 1);
        ctx.rotate(inclinacion);
        if (p.hambre >= 1) ctx.globalAlpha = 0.65; // pálido de hambre
        ctx.drawImage(img.c, -img.w / 2, -img.h / 2, img.w, img.h);
        ctx.restore();
        if (fichaAbierta === p.id) {
            ctx.strokeStyle = "#ffd166";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(x, y, L * 0.75, 0, TAU);
            ctx.stroke();
        }
    }
}

function dibujar(dt) {
    const { ctx } = lienzo;
    const t = performance.now() / 1000;
    if (!fondo) fondo = pintarFondo();
    ctx.drawImage(fondo, 0, 0, ancho, alto);
    // Reflejos de luz moviéndose cerca de la superficie
    const luz = sprite("caustica", 120, 60, (c) => {
        const g = c.createRadialGradient(60, 30, 0, 60, 30, 60);
        g.addColorStop(0, "#ffffff55");
        g.addColorStop(1, "#ffffff00");
        c.fillStyle = g;
        c.beginPath();
        c.ellipse(60, 30, 60, 30, 0, 0, TAU);
        c.fill();
    });
    for (let k = 0; k < 3; k++) {
        const x = ((t * (12 + k * 5) + k * ancho * 0.35) % (ancho + 160)) - 80;
        ctx.globalAlpha = 0.5;
        ctx.drawImage(luz.c, x - 60, alto * (0.06 + k * 0.08), 120, 60);
    }
    ctx.globalAlpha = 1;
    dibujarPlantas(ctx, t);
    // Comida cayendo (se va al fondo y ensucia si nadie la come)
    ctx.fillStyle = "#f4a261";
    for (let i = comida.length - 1; i >= 0; i--) {
        const f = comida[i];
        if (f.y < arena() - 2) {
            f.vy = Math.min(26, f.vy + dt * 6);
            f.x += (f.vx + Math.sin(t * 2 + i) * 6) * dt;
            f.y += f.vy * dt;
        } else {
            f.enArena += dt;
            if (f.enArena > 25) {
                comida.splice(i, 1);
                estado.suciedad = Math.min(1, estado.suciedad + 0.004);
                continue;
            }
        }
        ctx.fillRect(f.x - 1.6, f.y - 1.6, 3.2, 3.2);
    }
    dibujarPeces(ctx, t);
    // Burbujas que suben desde la piedra difusora
    if (burbujas.length < burbujasMax && Math.random() < dt * 8) burbujas.push({ x: ancho * 0.92 + (Math.random() - 0.5) * 8, y: arena(), r: 1.5 + Math.random() * 3.5, v: 40 + Math.random() * 40, fase: Math.random() * 6 });
    ctx.strokeStyle = "#ffffffaa";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (let i = burbujas.length - 1; i >= 0; i--) {
        const b = burbujas[i];
        b.y -= b.v * dt;
        b.fase += dt * 4;
        if (b.y < 4) {
            burbujas.splice(i, 1);
            continue;
        }
        const x = b.x + Math.sin(b.fase) * 3;
        ctx.moveTo(x + b.r, b.y);
        ctx.arc(x, b.y, b.r, 0, TAU);
    }
    ctx.stroke();
    // Agua sucia: velo verdoso
    if (estado.suciedad > 0.05) {
        ctx.fillStyle = `rgba(80, 110, 40, ${Math.min(0.45, estado.suciedad * 0.5)})`;
        ctx.fillRect(0, 0, ancho, alto);
    }
    // Textos flotantes
    for (let i = avisos.length - 1; i >= 0; i--) {
        const a = avisos[i];
        a.vida -= dt;
        a.y -= dt * 24;
        ctx.globalAlpha = Math.max(0, Math.min(1, a.vida * 1.5));
        ctx.font = "900 14px system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.lineWidth = 3;
        ctx.strokeStyle = "#023e8a";
        ctx.strokeText(a.t, a.x, a.y);
        ctx.fillStyle = a.color;
        ctx.fillText(a.t, a.x, a.y);
        if (a.vida <= 0) avisos.splice(i, 1);
    }
    ctx.globalAlpha = 1;
}
const flotante = (x, y, t, color = "#fff") => avisos.push({ x, y, t, color, vida: 1.2 });

// ---------- Toques: un pez → su ficha; el agua → comida ----------
let fichaAbierta = null;
$("lienzo").addEventListener("pointerdown", (e) => {
    const caja = $("lienzo").getBoundingClientRect();
    const x = e.clientX - caja.left;
    const y = e.clientY - caja.top;
    const tocado = [...estado.peces].reverse().find((p) => Math.hypot(p.x * ancho - x, p.y * alto - y) < Math.max(18, largoPez(p) * 0.6));
    if (tocado) return abrirFicha(tocado);
    if (y < arena()) soltarComida(x, y);
});
function abrirFicha(p) {
    fichaAbierta = p.id;
    efectos.toque();
    pintarFicha();
    $("ficha").hidden = false;
}
function cerrarFicha() {
    fichaAbierta = null;
    $("ficha").hidden = true;
}
function pintarFicha() {
    const p = estado.peces.find((x) => x.id === fichaAbierta);
    if (!p) return cerrarFicha();
    const e = especie(p.esp);
    const dias = Math.floor((Date.now() - p.nace) / 86400000);
    const horas = Math.floor((Date.now() - p.nace) / 3600000);
    $("ficha").innerHTML = `<button class="cerrar-ficha" type="button" aria-label="Cerrar">✕</button>
        <strong>${p.nombre}</strong><span>${e.nombre} · ${e.caracter}</span>
        <div class="dato-ficha"><span>Hambre</span><div class="barra-a hambre"><i style="width:${Math.round(p.hambre * 100)}%"></i></div></div>
        <div class="dato-ficha"><span>Tamaño</span><div class="barra-a"><i style="width:${Math.round(p.crece * 100)}%"></i></div></div>
        <small>${dias ? `${dias} día${dias > 1 ? "s" : ""}` : `${horas} h`} de vida${p.crece >= 0.9 ? " · adulto" : " · crece comiendo"}</small>
        <button class="vender-pez" type="button" data-vender-pez="${p.id}">Regalar a otro acuario (+${formatear(Math.round(e.precio * 0.4 * p.crece))})</button>`;
}
$("ficha").addEventListener("click", (e) => {
    if (e.target.closest(".cerrar-ficha")) return cerrarFicha();
    const b = e.target.closest("[data-vender-pez]");
    if (!b) return;
    const p = estado.peces.find((x) => x.id === b.dataset.venderPez);
    if (!p || !confirm(`¿Regalar a ${p.nombre}? Se va a otro acuario.`)) return;
    estado.peces = estado.peces.filter((x) => x !== p);
    estado.monedas += Math.round(especie(p.esp).precio * 0.4 * p.crece);
    efectos.monedas();
    cerrarFicha();
    refrescar();
});
$("limpiar").addEventListener("click", () => {
    if (estado.suciedad < 0.02) return avisar("El agua ya está limpia 💧");
    estado.suciedad = Math.max(0, estado.suciedad - 0.35);
    comida.splice(0, comida.filter((f) => f.enArena > 0).length);
    cont.limpiezas++;
    sonidos.limpiar();
    for (let k = 0; k < 12; k++) burbujas.push({ x: Math.random() * ancho, y: arena() - Math.random() * 20, r: 2 + Math.random() * 3, v: 80 + Math.random() * 60, fase: Math.random() * 6 });
    refrescar();
});

// ---------- Panel ----------
let pestana = "peces";
let ultimoPanel = "";
const MONEDA = '<i class="moneda-a chica"></i>';
function iconoPez(id) {
    return `<canvas class="ico-pez" width="96" height="64" data-pez="${id}"></canvas>`;
}
function pintarPanel() {
    let html = "";
    if (pestana === "peces") {
        html = ESPECIES.map((e) => {
            const bloqueado = e.nivel > nivelAcuario();
            const sinLugar = ocupados() + espacioDe(e) > lugares();
            return `<div class="fila-a${bloqueado ? " bloqueada" : ""}">${iconoPez(e.id)}<div class="txt"><strong>${e.nombre}</strong><span class="${e.depredador ? "peligro" : ""}">${e.caracter}</span><small>${e.detalle} · ocupa ${espacioDe(e)}</small></div>
                <button type="button" data-comprar="${e.id}" ${bloqueado || sinLugar || estado.monedas < e.precio ? "disabled" : ""}>${bloqueado ? `🔒 Nivel ${e.nivel}` : sinLugar ? "Sin lugar" : `${MONEDA}${formatear(e.precio)}`}</button></div>`;
        }).join("") + `<p class="ayuda-a">Nivel del acuario: ${nivelAcuario()} (sube con lo que ganás) · Lugar: ${ocupados()}/${lugares()}</p>`;
    } else if (pestana === "deco") {
        html = `<h3 class="titulo-a">Plantas</h3>` + PLANTAS.map((p) => `<div class="fila-a"><span class="ico-a" style="color:${p.color}">🌿</span><div class="txt"><strong>${p.nombre}</strong><small>+${p.felicidad} de felicidad · tenés ${estado.plantas.filter((x) => x.tipo === p.id).length}</small></div>
                <button type="button" data-planta="${p.id}" ${estado.monedas < p.precio || estado.plantas.length >= 12 ? "disabled" : ""}>${MONEDA}${formatear(p.precio)}</button></div>`).join("")
            + `<h3 class="titulo-a">Decoración</h3>` + DECORACIONES.map((d) => `<div class="fila-a"><span class="ico-a">${{ roca: "🪨", coral: "🪸", cofre: "🧰", castillo: "🏰" }[d.id]}</span><div class="txt"><strong>${d.nombre}</strong><small>+${d.felicidad} de felicidad · tenés ${estado.deco.filter((x) => x.tipo === d.id).length}</small></div>
                <button type="button" data-deco="${d.id}" ${estado.monedas < d.precio || estado.deco.length >= 8 ? "disabled" : ""}>${MONEDA}${formatear(d.precio)}</button></div>`).join("");
    } else if (pestana === "equipo") {
        html = EQUIPO.map((q) => {
            const n = nivelEquipo(q.id);
            const tope = n >= q.max;
            return `<div class="fila-a"><span class="ico-a">${q.icono}</span><div class="txt"><strong>${q.nombre}${n ? ` <em>Nv ${n}</em>` : ""}</strong><small>${q.detalle(n)}</small></div>
                <button type="button" data-equipo="${q.id}" ${tope || estado.monedas < q.costo(n) ? "disabled" : ""}>${tope ? "Máximo" : `${MONEDA}${formatear(q.costo(n))}`}</button></div>`;
        }).join("");
    } else {
        const orden = [...estado.peces].sort((a, b) => b.hambre - a.hambre);
        html = orden.length
            ? orden.map((p) => `<div class="fila-a pez-mio" data-ver="${p.id}">${iconoPez(p.esp)}<div class="txt"><strong>${p.nombre}</strong><small>${especie(p.esp).nombre}${p.crece >= 0.9 ? " adulto" : " joven"}</small>
                <div class="barra-a hambre chica"><i style="width:${Math.round(p.hambre * 100)}%"></i></div></div><span class="estado-pez">${p.hambre >= 1 ? "😵" : p.hambre > 0.75 ? "😟" : p.hambre > 0.4 ? "🙂" : "😋"}</span></div>`).join("")
            : `<p class="ayuda-a">La pecera está vacía. ¡Comprá peces!</p>`;
    }
    if (html === ultimoPanel) return;
    ultimoPanel = html;
    $("panel").innerHTML = html;
    for (const c of $("panel").querySelectorAll("canvas[data-pez]")) {
        const ctx = c.getContext("2d");
        const e = especie(c.dataset.pez);
        const L = 30 + e.tam * 12;
        ctx.scale(2, 2);
        ctx.translate(24, 16);
        dibujarPez(ctx, e.id, L, 1);
    }
}
$("panel").addEventListener("click", (e) => {
    const ver = e.target.closest("[data-ver]");
    if (ver) {
        const p = estado.peces.find((x) => x.id === ver.dataset.ver);
        if (p) abrirFicha(p);
        return;
    }
    const b = e.target.closest("button");
    if (!b || b.disabled) return;
    const d = b.dataset;
    if (d.comprar) {
        const esp = especie(d.comprar);
        if (estado.monedas < esp.precio || ocupados() + espacioDe(esp) > lugares()) return;
        estado.monedas -= esp.precio;
        const p = nuevoPez(esp.id, 0.2 + Math.random() * 0.6, 0.05);
        p.vy = 60;
        estado.peces.push(p);
        sonidos.chapuzon();
        avisar(`🐟 ¡Llegó ${p.nombre}, un ${esp.nombre}!${esp.depredador ? " Cuidado: se come a los chicos" : ""}`);
        for (let k = 0; k < 8; k++) burbujas.push({ x: p.x * ancho + (Math.random() - 0.5) * 20, y: 30 + Math.random() * 20, r: 2 + Math.random() * 3, v: 60, fase: Math.random() * 6 });
    } else if (d.planta) {
        const p = PLANTAS.find((x) => x.id === d.planta);
        if (estado.monedas < p.precio) return;
        estado.monedas -= p.precio;
        estado.plantas.push({ tipo: p.id, x: 0.06 + Math.random() * 0.82 });
        efectos.comprar();
    } else if (d.deco) {
        const dd = DECORACIONES.find((x) => x.id === d.deco);
        if (estado.monedas < dd.precio) return;
        estado.monedas -= dd.precio;
        estado.deco.push({ tipo: dd.id, x: 0.12 + Math.random() * 0.7 });
        fondo = null;
        efectos.comprar();
    } else if (d.equipo) {
        const q = EQUIPO.find((x) => x.id === d.equipo);
        const n = nivelEquipo(q.id);
        if (n >= q.max || estado.monedas < q.costo(n)) return;
        estado.monedas -= q.costo(n);
        estado.equipo[q.id] = n + 1;
        efectos.comprar();
        avisar(`${q.icono} ${q.nombre} ${n ? `nivel ${n + 1}` : "instalado"}`);
    }
    refrescar();
});
for (const p of document.querySelectorAll(".pestana-a")) {
    p.addEventListener("click", () => {
        pestana = p.dataset.p;
        for (const x of document.querySelectorAll(".pestana-a")) x.classList.toggle("activa", x === p);
        efectos.toque();
        pintarPanel();
    });
}

function pintarDatos() {
    $("monedas").textContent = formatear(Math.floor(estado.monedas));
    $("visitas").textContent = formatear(porSegundo() * 60);
    $("felicidad").style.width = `${Math.round(felicidad() * 100)}%`;
    $("agua").style.width = `${Math.round((1 - estado.suciedad) * 100)}%`;
    $("poblacion").textContent = `${ocupados()}/${lugares()}`;
    $("limpiar").classList.toggle("urgente", estado.suciedad > 0.4);
    if (fichaAbierta) pintarFicha();
}
function refrescar() {
    guardarEstado();
    pintarDatos();
    pintarPanel();
}
function avisar(texto, ms = 2600) {
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
    { id: "peces5", icono: "🐟", nombre: "Primer cardumen", detalle: "Tené 5 peces a la vez", meta: 5, valor: () => estado.peces.length, fichas: 300 },
    { id: "peces15", icono: "🐠", nombre: "Pecera llena de vida", detalle: "Tené 15 peces a la vez", meta: 15, valor: () => estado.peces.length, fichas: 1500 },
    { id: "especies4", icono: "🌈", nombre: "Variedad", detalle: "Tené 4 especies distintas", meta: 4, valor: () => new Set(estado.peces.map((p) => p.esp)).size, fichas: 800 },
    { id: "especies8", icono: "🏆", nombre: "Colección completa", detalle: "Tené las 8 especies", meta: 8, valor: () => new Set(estado.peces.map((p) => p.esp)).size, fichas: 8000 },
    { id: "cria1", icono: "🥚", nombre: "¡Nació un bebé!", detalle: "Lográ que nazca una cría", meta: 1, valor: () => cont.crias, fichas: 600 },
    { id: "cria20", icono: "👨‍👩‍👧", nombre: "Gran familia", detalle: "Lográ 20 crías", meta: 20, valor: () => cont.crias, fichas: 4000 },
    { id: "feliz", icono: "😊", nombre: "Peces felices", detalle: "Llegá a 90% de felicidad", meta: 90, valor: () => Math.round(felicidad() * 100), fichas: 1200 },
    { id: "limpio", icono: "🧽", nombre: "Agua cristalina", detalle: "Limpiá la pecera 20 veces", meta: 20, valor: () => cont.limpiezas, fichas: 500 },
    { id: "ganado", icono: "💰", nombre: "Acuario famoso", detalle: "Ganá 50K con las visitas", meta: 50000, valor: () => cont.ganado, fichas: 3000 },
    { id: "depredador", icono: "🦈", nombre: "Vida salvaje", detalle: "Tené un depredador", meta: 1, valor: () => estado.peces.filter((p) => especie(p.esp).depredador).length, fichas: 1500 },
];
const base = crearBase({
    juego: "acuario",
    barra: document.querySelector(".barra-acuario"),
    logros: LOGROS,
    audio,
    regaloDiario: (dia) => {
        const m = Math.round(Math.max(60, porSegundo() * 600) * dia);
        return dia === 7
            ? { icono: "🐠", texto: `${formatear(m)} monedas y un guppy`, dar: () => ((estado.monedas += m), ocupados() + 1 <= lugares() && estado.peces.push(nuevoPez("guppy", 0.5, 0.3, 0.5)), refrescar()) }
            : { icono: "🪙", texto: `${formatear(m)} monedas`, dar: () => ((estado.monedas += m), refrescar()) };
    },
});

// ---------- Mientras no estabas (hasta 8 horas) ----------
const ausenteTotal = (Date.now() - estado.ultimaVez) / 1000;
const ausente = Math.min(ausenteTotal, 8 * 3600);
const ganadoAusente = porSegundo() * ausente * 0.6;
estado.monedas += ganadoAusente;
cont.ganado += ganadoAusente;
usarComedero(ausente, false);
const muertosAusente = cambiarHambre(ausente);
cambiarSuciedad(ausente);
const conHambre = estado.peces.filter((p) => p.hambre > 0.75).length;
const mostro = ausenteTotal > 60 && base.resumenAlVolver(ausenteTotal, [
    { icono: "👀", texto: "Lo que pagaron las visitas", valor: ganadoAusente >= 1 ? formatear(ganadoAusente) : "" },
    { icono: "😟", texto: "Peces con mucha hambre", valor: conHambre ? `${conHambre} (tocá el agua para darles de comer)` : "" },
    { icono: "💀", texto: "Peces que no aguantaron sin comer", valor: muertosAusente.length ? muertosAusente.map((p) => p.nombre).join(", ") : "" },
    { icono: "💧", texto: "El agua está sucia", valor: estado.suciedad > 0.4 ? "¡limpiala!" : "" },
]);
if (!mostro) setTimeout(() => base.revisarRegalo(), 600);

// ---------- Ciclo ----------
let segundo = 0;
let acumulado = 0;
bucle((dt) => {
    const inicio = performance.now();
    moverPeces(dt, inicio / 1000);
    dibujar(dt);
    segundo += dt;
    acumulado += dt;
    if (segundo >= 1) {
        const ganado = porSegundo() * segundo;
        estado.monedas += ganado;
        cont.ganado += ganado;
        const muertos = cambiarHambre(segundo);
        if (muertos.length) {
            avisar(`💀 ${muertos.map((p) => p.nombre).join(", ")} no aguantó sin comer`);
            sonidos.triste();
        }
        cambiarSuciedad(segundo);
        usarComedero(segundo, true);
        revisarCrias(segundo);
        segundo = 0;
    }
    if (acumulado > 0.5) {
        acumulado = 0;
        pintarDatos();
    } else if (acumulado > 0.25 && acumulado - dt <= 0.25 && pestana === "mios") pintarPanel();
    const ms = performance.now() - inicio;
    base.medir(ms);
    vigilarCalidad(ms);
});
setInterval(guardarEstado, 5000);
addEventListener("pagehide", guardarEstado);
pintarDatos();
pintarPanel();
