// Acuario (simulador): varias peceras (agua dulce, arrecife y abismo) que se eligen desde un estante.
// Los animales nadan de verdad (cardúmenes, los del fondo, cangrejos que caminan, medusas que laten,
// pulpos que saltan), comen la comida que les comprás, crecen, tienen crías, los depredadores cazan,
// el agua se ensucia y las visitas pagan por mirar. La partida se guarda en "acuario-sim".
import { formatear, cargar, guardar, vibrar } from "../../js/comun3d.js";
import { crearLienzo, bucle } from "../../js/lienzo2d.js";
import { crearAudio, MUSICAS } from "../../js/sonido.js";
import { crearBase, calidadAutomatica } from "../../js/incremental.js";
import { ESPECIES, especie, TIPOS_PECERA, MAX_PECERAS, COMIDAS, comidaDe, PLANTAS, DECORACIONES, CUADROS, nombreAlAzar, dibujarPez, dibujarPlanta, dibujarDeco } from "./especies.js";

const $ = (id) => document.getElementById(id);
const CLAVE = "acuario-sim";
const TAU = Math.PI * 2;
const HORAS_HAMBRE = 3; // de lleno a muerto de hambre
const HORAS_SIN_COMER = 8; // con hambre total durante este tiempo, el animal se muere

const audio = crearAudio({ musica: MUSICAS.tranquila });
const { nota, golpe, efectos } = audio;
const sonidos = {
    comida: () => golpe({ dur: 0.05, vol: 0.08, filtro: 3000 }),
    bocado: () => nota({ f: 700 + Math.random() * 200, hasta: 400, dur: 0.06, vol: 0.06, onda: "sine" }),
    chapuzon: () => {
        golpe({ dur: 0.3, vol: 0.15, filtro: 800, tipo: "lowpass" });
        nota({ f: 300, hasta: 120, dur: 0.25, vol: 0.08, onda: "sine" });
    },
    limpiar: () => golpe({ dur: 0.6, vol: 0.12, filtro: 1800, tipo: "bandpass" }),
    triste: () => [392, 349, 311].forEach((f, k) => nota({ f, t: k * 0.2, dur: 0.4, vol: 0.1, onda: "sine" })),
    vidrio: () => [880, 1320].forEach((f, k) => nota({ f, t: k * 0.05, dur: 0.25, vol: 0.06, onda: "sine" })),
};

// ---------- Equipo (cada pecera tiene el suyo) ----------
const EQUIPO = [
    { id: "pecera", icono: "🫙", nombre: "Pecera más grande", detalle: (n) => `Entran ${capacidad(act(), n)} lugares${n < 6 ? ` (sube a ${capacidad(act(), n + 1)})` : ""}`, max: 6, costo: (n) => Math.ceil(300 * 3.2 ** n) },
    { id: "filtro", icono: "🌀", nombre: "Filtro", detalle: (n) => (n ? `Limpia el agua sola (${n * 20}% por hora)` : "Limpia el agua sola"), max: 5, costo: (n) => Math.ceil(250 * 2.6 ** n) },
    { id: "comedero", icono: "⏲️", nombre: "Comedero automático", detalle: (n) => (n ? `Les da escamas solo cada ${Math.max(10, 60 - n * 10)} min` : "Les da de comer cuando no estás"), max: 5, costo: (n) => Math.ceil(400 * 2.8 ** n) },
    { id: "luz", icono: "💡", nombre: "Luces de colores", detalle: (n) => `+${n * 20}% de visitas`, max: 5, costo: (n) => Math.ceil(500 * 2.7 ** n) },
    { id: "cartel", icono: "🪧", nombre: "Cartel en la puerta", detalle: (n) => `+${n * 15}% de lo que paga cada visita`, max: 8, costo: (n) => Math.ceil(800 * 2.5 ** n) },
];
const capacidad = (pc, n = nivelEquipo(pc, "pecera")) => TIPOS_PECERA[pc.tipo].base + n * 6;

// ---------- Estado ----------
const estado = cargar(CLAVE, {
    monedas: 150, ultimaVez: Date.now(),
    contadores: { crias: 0, limpiezas: 0, comidas: 0, ganado: 0, comidosPorDepredador: 0 },
});
estado.contadores ??= { crias: 0, limpiezas: 0, comidas: 0, ganado: 0, comidosPorDepredador: 0 };
const cont = estado.contadores;
cont.especiales ??= 0;
let idPez = Date.now();

function nuevoPez(esp, x, y, crece = 0.6) {
    return { id: (idPez++).toString(36), esp, nombre: nombreAlAzar(), nace: Date.now(), crece, hambre: 0.3, hambreDesde: 0, x, y, vx: 0, vy: 0, z: Math.random() };
}
function nuevaPecera(tipo, nombre) {
    return { id: (idPez++).toString(36), tipo, nombre, peces: [], plantas: [], deco: [], equipo: {}, suciedad: 0.05, tiempoComedero: 0, mimo: 0 };
}

// Partidas viejas (una sola pecera con peces de mar mezclados): los de mar se mudan a un arrecife de regalo
const SALADAS_VIEJAS = ["payaso", "globo", "leon", "tiburon"];
let mensajeMudanza = "";
if (!estado.peceras) {
    const viejos = estado.peces ?? [];
    const dulce = nuevaPecera("dulce", "Mi pecera");
    const aguaPlanta = (p) => PLANTAS.find((x) => x.id === p.tipo)?.agua;
    const aguaDeco = (d) => DECORACIONES.find((x) => x.id === d.tipo)?.agua ?? [];
    dulce.peces = viejos.filter((p) => !SALADAS_VIEJAS.includes(p.esp));
    dulce.plantas = (estado.plantas ?? []).filter((p) => aguaPlanta(p) === "dulce");
    dulce.deco = (estado.deco ?? []).filter((d) => aguaDeco(d).includes("dulce"));
    dulce.equipo = estado.equipo ?? {};
    dulce.suciedad = estado.suciedad ?? 0.05;
    dulce.tiempoComedero = estado.tiempoComedero ?? 0;
    estado.peceras = [dulce];
    const deMar = viejos.filter((p) => SALADAS_VIEJAS.includes(p.esp));
    const plantasMar = (estado.plantas ?? []).filter((p) => aguaPlanta(p) === "salada");
    const decoMar = (estado.deco ?? []).filter((d) => !aguaDeco(d).includes("dulce"));
    if (deMar.length || plantasMar.length || decoMar.length) {
        const mar = nuevaPecera("arrecife", "Mi arrecife");
        mar.peces = deMar;
        mar.plantas = plantasMar;
        mar.deco = decoMar;
        while (ocupados(mar) > capacidad(mar) && nivelEquipo(mar, "pecera") < 6) mar.equipo.pecera = nivelEquipo(mar, "pecera") + 1;
        estado.peceras.push(mar);
        mensajeMudanza = "🪸 ¡Regalo! Tus animales de mar se mudaron a un arrecife nuevo. Tocá 🗄️ para ver tus peceras";
    }
    if (!viejos.length) {
        for (let k = 0; k < 3; k++) dulce.peces.push(nuevoPez("neon", 0.3 + k * 0.15, 0.4 + k * 0.05, 0.7));
        dulce.plantas.push({ tipo: "alga", x: 0.18 }, { tipo: "valis", x: 0.82 });
        dulce.deco.push({ tipo: "roca", x: 0.6 });
    }
    for (const k of ["peces", "plantas", "deco", "equipo", "suciedad", "tiempoComedero", "ultimoComedero", "iniciado"]) delete estado[k];
    estado.actual = 0;
    estado.comidas = { gusanos: 3, artemia: 2 };
    estado.alimento = "escamas";
}
estado.comidas ??= {};
estado.alimento ??= "escamas";
for (const pc of estado.peceras) for (const p of pc.peces) p.z ??= Math.random();
if (!(estado.actual < estado.peceras.length)) estado.actual = 0;
const act = () => estado.peceras[estado.actual];
const tipoDe = (pc) => TIPOS_PECERA[pc.tipo];

function nivelEquipo(pc, id) {
    return pc.equipo[id] ?? 0;
}
function espacioDe(e) {
    return Math.max(1, Math.round(e.tam * 2));
}
function ocupados(pc) {
    return pc.peces.reduce((t, p) => t + espacioDe(especie(p.esp)), 0);
}
const lugares = (pc) => capacidad(pc);
const nivelAcuario = () => 1 + Math.floor(Math.sqrt(cont.ganado / 400));
const todosLosPeces = () => estado.peceras.flatMap((pc) => pc.peces);

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
let frente = null;
const lienzo = crearLienzo($("lienzo"), (d) => {
    ancho = d.ancho;
    alto = d.alto;
    sprites.clear();
    fondo = null;
    frente = null;
}, 1.5);
let calidadBaja = false;
const vigilarCalidad = calidadAutomatica((n) => {
    lienzo.cambiarEscala(n === 1 ? 1.15 : 1);
    calidadBaja = true;
    burbujasMax = 10;
});
const arena = () => alto * 0.86;
const largoPez = (p) => Math.min(ancho, 560) * 0.19 * especie(p.esp).tam * (0.45 + p.crece * 0.55);

// Fondo fijo: agua con profundidad, rayos de luz, rocas lejanas con niebla, arena con textura y decoraciones
function pintarFondo() {
    const pc = act();
    const tp = tipoDe(pc);
    const escala = Math.min(devicePixelRatio, 1.5);
    const can = document.createElement("canvas");
    can.width = Math.ceil(ancho * escala);
    can.height = Math.ceil(alto * escala);
    const c = can.getContext("2d");
    c.scale(escala, escala);
    const agua = c.createLinearGradient(0, 0, 0, alto);
    agua.addColorStop(0, tp.agua1);
    agua.addColorStop(0.5, tp.agua2);
    agua.addColorStop(1, tp.agua3);
    c.fillStyle = agua;
    c.fillRect(0, 0, ancho, alto);
    // Rayos de luz que entran desde la superficie
    const abismo = pc.tipo === "abismo";
    for (let k = 0; k < 7; k++) {
        const x = ancho * (0.05 + k * 0.15);
        const g = c.createLinearGradient(x, 0, x + ancho * 0.1, alto * 0.85);
        g.addColorStop(0, abismo ? "rgba(126,224,255,0.08)" : "rgba(255,255,255,0.2)");
        g.addColorStop(1, "rgba(255,255,255,0)");
        c.fillStyle = g;
        c.beginPath();
        c.moveTo(x, 0);
        c.lineTo(x + ancho * (0.03 + (k % 3) * 0.02), 0);
        c.lineTo(x + ancho * 0.22, alto * 0.88);
        c.lineTo(x + ancho * 0.08, alto * 0.88);
        c.fill();
    }
    // Dos capas de rocas lejanas, la de atrás más perdida en el agua
    for (const [capa, color, alturaR] of [[0, abismo ? "rgba(0,0,0,0.35)" : "rgba(3,4,94,0.22)", 0.16], [1, abismo ? "rgba(0,0,0,0.55)" : "rgba(3,4,94,0.35)", 0.08]]) {
        c.fillStyle = color;
        c.beginPath();
        c.moveTo(0, arena());
        for (let x = 0; x <= ancho; x += 10) c.lineTo(x, arena() - alto * alturaR - Math.sin(x / (50 + capa * 20) + capa * 3) * alto * 0.04 - Math.sin(x / 17 + capa) * alto * 0.012);
        c.lineTo(ancho, arena());
        c.fill();
    }
    // Arena con ondas y granos
    const ar = c.createLinearGradient(0, arena(), 0, alto);
    ar.addColorStop(0, tp.arena1);
    ar.addColorStop(1, tp.arena2);
    c.fillStyle = ar;
    c.beginPath();
    c.moveTo(0, arena() + 6);
    for (let x = 0; x <= ancho; x += 8) c.lineTo(x, arena() + Math.sin(x / 40) * 4 + Math.sin(x / 13) * 1.2);
    c.lineTo(ancho, alto);
    c.lineTo(0, alto);
    c.fill();
    let s = 99;
    const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    c.strokeStyle = "rgba(0,0,0,0.08)";
    c.lineWidth = 1;
    for (let k = 0; k < 10; k++) {
        const y = arena() + 8 + r() * (alto - arena() - 10);
        const x = r() * ancho;
        c.beginPath();
        c.moveTo(x - 20, y);
        c.quadraticCurveTo(x, y - 3, x + 20, y);
        c.stroke();
    }
    for (let k = 0; k < 260; k++) {
        c.fillStyle = abismo ? ["#ffffff14", "#00000033", "#7ee0ff10"][k % 3] : ["#ffffff30", "#00000022", "#fff3b055", "#8d5a2b44", "#6c757d44"][k % 5];
        c.fillRect(r() * ancho, arena() + 4 + r() * (alto - arena() - 4), 1 + r() * 2, 1 + r() * 1.5);
    }
    // Piedritas
    for (let k = 0; k < 18; k++) {
        const x = r() * ancho;
        const y = arena() + 8 + r() * (alto - arena() - 12);
        const rr = 1.5 + r() * 3;
        const g = c.createRadialGradient(x - rr * 0.3, y - rr * 0.3, 0, x, y, rr);
        g.addColorStop(0, abismo ? "#6c757d" : "#f8f9fa");
        g.addColorStop(1, abismo ? "#212529" : "#868e96");
        c.fillStyle = g;
        c.beginPath();
        c.ellipse(x, y, rr * 1.3, rr, 0, 0, TAU);
        c.fill();
    }
    // Decoraciones compradas (con sombra en la arena)
    const t = Math.min(ancho, 520) * 0.12;
    for (const d of pc.deco) {
        c.fillStyle = "rgba(0,0,0,0.2)";
        c.beginPath();
        c.ellipse(d.x * ancho, arena() + 9, t * 0.5, t * 0.08, 0, 0, TAU);
        c.fill();
        dibujarDeco(c, d.tipo, d.x * ancho, arena() + 8, t);
    }
    // Piedra difusora de aire (de ahí salen las burbujas)
    c.fillStyle = "#495057";
    c.beginPath();
    c.ellipse(ancho * 0.92, arena() + 4, 10, 5, 0, 0, TAU);
    c.fill();
    return can;
}
// Vidrio de adelante: reflejos diagonales y bordes más oscuros
function pintarFrente() {
    const abismo = act().tipo === "abismo";
    const escala = Math.min(devicePixelRatio, 1.5);
    const can = document.createElement("canvas");
    can.width = Math.ceil(ancho * escala);
    can.height = Math.ceil(alto * escala);
    const c = can.getContext("2d");
    c.scale(escala, escala);
    const v = c.createRadialGradient(ancho / 2, alto * 0.45, Math.min(ancho, alto) * 0.3, ancho / 2, alto * 0.5, Math.max(ancho, alto) * 0.75);
    v.addColorStop(0, "rgba(0,0,0,0)");
    v.addColorStop(1, abismo ? "rgba(0,0,0,0.7)" : "rgba(0,10,30,0.35)");
    c.fillStyle = v;
    c.fillRect(0, 0, ancho, alto);
    c.fillStyle = "rgba(255,255,255,0.05)";
    for (const [x, w] of [[0.12, 0.08], [0.24, 0.025], [0.7, 0.05]]) {
        c.beginPath();
        c.moveTo(ancho * x, 0);
        c.lineTo(ancho * (x + w), 0);
        c.lineTo(ancho * (x + w - 0.18), alto);
        c.lineTo(ancho * (x - 0.18), alto);
        c.fill();
    }
    return can;
}
// Cáusticas: la red de luz que forman las olas en el fondo (una textura que se repite y se mueve)
function causticas() {
    return sprite("causticas", 256, 256, (c) => {
        c.strokeStyle = "rgba(255,255,255,0.55)";
        c.lineWidth = 2.2;
        c.lineCap = "round";
        let s = 7;
        const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
        const puntos = [];
        for (let y = 0; y < 5; y++) for (let x = 0; x < 5; x++) puntos.push([x * 64 + r() * 40, y * 64 + r() * 40]);
        for (const [x, y] of puntos) {
            for (const [ox, oy] of [[0, 0], [256, 0], [-256, 0], [0, 256], [0, -256]]) {
                c.beginPath();
                for (let k = 0; k <= 6; k++) {
                    const ang = (k / 6) * TAU;
                    const rr = 22 + Math.sin(k * 2.3 + x) * 7;
                    const px = x + ox + Math.cos(ang) * rr;
                    const py = y + oy + Math.sin(ang) * rr;
                    if (k === 0) c.moveTo(px, py);
                    else c.quadraticCurveTo(x + ox + Math.cos(ang - 0.5) * rr * 1.25, y + oy + Math.sin(ang - 0.5) * rr * 1.25, px, py);
                }
                c.stroke();
            }
        }
    });
}
const brilloLuz = (color) => sprite(`brillo-${color}`, 64, 64, (c) => {
    const g = c.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, color);
    g.addColorStop(1, "rgba(0,0,0,0)");
    c.fillStyle = g;
    c.fillRect(0, 0, 64, 64);
});

// ---------- Simulación ----------
const comida = []; // { x, y, vx, vy, enArena, tipo }
const burbujas = [];
let burbujasMax = 26;
const avisos = []; // textos flotantes
const sustos = new Map(); // id del pez → tiempo de susto
const motas = Array.from({ length: 28 }, () => ({ x: Math.random(), y: Math.random(), v: 0.004 + Math.random() * 0.01, f: Math.random() * 6 }));

function soltarComida(x, y) {
    let a = comidaDe(estado.alimento);
    if (a.pack && !(estado.comidas[a.id] > 0)) {
        estado.alimento = "escamas";
        avisar(`Se te terminó: ${a.nombre}. Comprá más en 🍽️ Comida`);
        a = comidaDe("escamas");
    }
    if (a.pack) {
        estado.comidas[a.id]--;
        cont.especiales++;
    }
    for (let k = 0; k < a.bocados; k++) comida.push({ x: x + (Math.random() - 0.5) * 24, y: Math.max(8, y - 10 + Math.random() * 10), vx: (Math.random() - 0.5) * 6, vy: 4 + Math.random() * 6 * a.hunde, enArena: 0, tipo: a.id });
    cont.comidas++;
    sonidos.comida();
    pintarComidas();
}
// Un bocado: llena, hace crecer y (las comidas ricas) pone contentos a todos
function comer(p, f, pc) {
    const a = comidaDe(f.tipo);
    comida.splice(comida.indexOf(f), 1);
    p.hambre = Math.max(0, p.hambre - a.hambre);
    p.hambreDesde = 0;
    p.crece = Math.min(1, p.crece + a.crece);
    pc.mimo = Math.min(1, (pc.mimo ?? 0) + a.mimo);
    sonidos.bocado();
}
const caminante = (e) => e.modo === "camina" || e.modo === "pulpo";
const velocidadDe = (e, p) => (caminante(e) && !(p.salto > 0) ? 4 + 60 * e.vel : (40 + 60 * e.vel) * (0.7 + p.crece * 0.3)) * (p.hambre >= 1 ? 0.5 : 1);

function comidaCercana(px, py, radio, soloFondo) {
    let mejor = null;
    let mejorD = radio;
    for (const f of comida) {
        if (soloFondo && f.y < arena() - 14) continue;
        const d = Math.hypot(f.x - px, f.y - py);
        if (d < mejorD) {
            mejorD = d;
            mejor = f;
        }
    }
    return mejor ? { f: mejor, d: mejorD } : null;
}

function moverPeces(dt) {
    const pc = act();
    const lista = pc.peces;
    for (const p of lista) {
        const e = especie(p.esp);
        const L = largoPez(p);
        let px = p.x * ancho;
        let py = p.y * alto;
        const velMax = velocidadDe(e, p);
        if (caminante(e) && !(p.salto > 0)) {
            moverCaminante(p, e, L, px, dt, velMax, pc);
            continue;
        }
        if (e.modo === "flota") {
            moverFlotante(p, e, L, px, py, dt, pc);
            continue;
        }
        let ax = 0;
        let ay = 0;
        // Paseo: un punto al que nadar, que cambia cada tanto
        const delFondo = e.modo === "fondo";
        if (!p.meta || Math.random() < dt * (e.modo === "vertical" ? 0.08 : 0.25) || Math.hypot(p.meta.x * ancho - px, p.meta.y * alto - py) < 20) {
            p.meta = { x: 0.08 + Math.random() * 0.84, y: delFondo ? 0.7 + Math.random() * 0.12 : p.salto > 0 ? 0.45 + Math.random() * 0.25 : 0.12 + Math.random() * 0.66 };
        }
        let destinoX = p.meta.x * ancho;
        let destinoY = p.meta.y * alto;
        let apuro = 0.5;
        // Hambre: va a la comida más cercana
        if (p.hambre > 0.15 && comida.length) {
            const c = comidaCercana(px, py, 260, false);
            if (c) {
                destinoX = c.f.x;
                destinoY = c.f.y;
                apuro = 1;
                if (c.d < L * 0.45) comer(p, c.f, pc);
            }
        }
        // Depredador con hambre: caza al pez chico más cercano (cangrejos, caracoles y medusas no)
        if (e.depredador && p.hambre > 0.4) {
            let presa = null;
            let dPresa = 220;
            for (const o of lista) {
                const eo = especie(o.esp);
                if (o === p || caminante(eo) || eo.modo === "flota" || largoPez(o) > L * e.depredador) continue;
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
                if (dPresa < L * 0.4) comerPez(p, presa, pc);
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
            if (dd < L * 0.9 && dd > 0 && Math.abs((o.z ?? 0.5) - (p.z ?? 0.5)) < 0.4) {
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
        const margen = L * 0.6;
        if (px < margen) ax += 200;
        if (px > ancho - margen) ax -= 200;
        if (py < margen + 6) ay += 200;
        if (py > arena() - L * 0.35) ay -= 260;
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
        // El pulpo, después de nadar un rato, vuelve a bajar a caminar
        if (p.salto > 0) {
            p.salto -= dt;
            if (p.salto <= 0) p.meta = null;
        }
        const objetivoMira = p.vx >= 0 ? 1 : -1;
        p.mira = (p.mira ?? objetivoMira) + (objetivoMira - (p.mira ?? objetivoMira)) * Math.min(1, dt * 6);
        p.fase = (p.fase ?? Math.random() * 4) + dt * (3 + v * 0.08);
    }
}
// Cangrejos, caracoles, estrellas, camarones y el pulpo cuando no nada: caminan sobre la arena
function moverCaminante(p, e, L, px, dt, velMax, pc) {
    const piso = arena() - (e.id === "estrella" ? L * 0.12 : e.id === "caracol" ? L * 0.2 : L * 0.25);
    if (!p.meta || Math.random() < dt * 0.15 || Math.abs(p.meta.x * ancho - px) < 6) p.meta = { x: 0.06 + Math.random() * 0.88, y: 0.8 };
    let destino = p.meta.x * ancho;
    if (p.hambre > 0.1 && comida.length) {
        const c = comidaCercana(px, piso, 280, true);
        if (c) {
            destino = c.f.x;
            if (Math.abs(c.f.x - px) < L * 0.4) comer(p, c.f, pc);
        }
    }
    const dx = destino - px;
    const objetivo = Math.abs(dx) > 4 ? Math.sign(dx) * velMax : 0;
    p.vx += (objetivo - p.vx) * Math.min(1, dt * 3);
    p.vy = 0;
    px += p.vx * dt;
    p.x = Math.max(0.03, Math.min(0.97, px / ancho));
    p.y += (piso / alto - p.y) * Math.min(1, dt * 2); // si venía nadando, baja de a poco
    if (Math.abs(p.vx) > 1) p.mira = Math.sign(p.vx);
    p.fase = (p.fase ?? 0) + dt * Math.min(8, 1 + Math.abs(p.vx) * 0.25);
    // El pulpo a veces se lanza a nadar
    if (e.modo === "pulpo" && Math.random() < dt * 0.05) {
        p.salto = 3 + Math.random() * 4;
        p.vy = -velocidadDe(e, p) * 1.2;
        p.meta = null;
    }
}
// Medusas y el pulpo dumbo: laten (impulso hacia arriba) y se hunden despacio
function moverFlotante(p, e, L, px, py, dt, pc) {
    const periodo = 2.4;
    p.pulso = (p.pulso ?? Math.random() * periodo) + dt;
    if (!p.meta || Math.random() < dt * 0.1) p.meta = { x: 0.1 + Math.random() * 0.8, y: 0.15 + Math.random() * 0.5 };
    if (p.pulso >= periodo) {
        p.pulso = 0;
        const sube = p.meta.y * alto < py ? 1 : 0.3;
        p.vy -= 38 * sube * (0.6 + e.vel);
        p.vx += Math.sign(p.meta.x * ancho - px) * 12;
    }
    p.vy += 9 * dt;
    p.vx *= 1 - Math.min(1, dt * 0.5);
    p.vy *= 1 - Math.min(1, dt * 0.6);
    if (py < L * 0.6) p.vy += 40 * dt;
    if (py > arena() - L * 1.2) p.vy -= 60 * dt;
    px += p.vx * dt;
    py += p.vy * dt;
    p.x = Math.max(0.04, Math.min(0.96, px / ancho));
    p.y = Math.max(0.05, Math.min(arena() / alto - 0.05, py / alto));
    p.mira = 1;
    p.fase = (p.pulso / periodo) * CUADROS;
    // Comen lo que les pasa cerca
    if (p.hambre > 0.1) {
        const c = comidaCercana(px, py + L * 0.3, L * 0.55, false);
        if (c) comer(p, c.f, pc);
    }
}

function comerPez(cazador, presa, pc) {
    pc.peces = pc.peces.filter((x) => x !== presa);
    cazador.hambre = Math.max(0, cazador.hambre - 0.7);
    cazador.crece = Math.min(1, cazador.crece + 0.05);
    cont.comidosPorDepredador++;
    avisar(`😱 ${cazador.nombre} (${especie(cazador.esp).nombre}) se comió a ${presa.nombre}. Dale krill 🦞 para que no cace`);
    sonidos.triste();
    vibrar([40, 30, 80]);
    flotante(cazador.x * ancho, cazador.y * alto - 20, "¡ÑAM!", "#ff8fab");
    if (fichaAbierta === presa.id) cerrarFicha();
}

// Crías: dos adultos de la misma especie, felices y con lugar, a veces tienen un bebé
function revisarCrias(pc, dt) {
    if (felicidad(pc) < 0.6 || ocupados(pc) >= lugares(pc)) return;
    if (Math.random() > dt / 45) return;
    const adultos = pc.peces.filter((p) => p.crece >= 0.9 && p.hambre < 0.5);
    const porEspecie = {};
    for (const a of adultos) (porEspecie[a.esp] ??= []).push(a);
    const parejas = Object.entries(porEspecie).filter(([esp, l]) => l.length >= 2 && !especie(esp).depredador);
    if (!parejas.length) return;
    const [esp, l] = parejas[Math.floor(Math.random() * parejas.length)];
    if (espacioDe(especie(esp)) + ocupados(pc) > lugares(pc)) return;
    const bebe = nuevoPez(esp, l[0].x, l[0].y, 0.15);
    pc.peces.push(bebe);
    cont.crias++;
    avisar(`🥚 ¡Nació un ${especie(esp).nombre} bebé en "${pc.nombre}"! Se llama ${bebe.nombre}`);
    efectos.logro();
}

// ---------- Felicidad, agua y visitas ----------
const bonusAmbiente = (pc) => [...pc.plantas.map((p) => PLANTAS.find((x) => x.id === p.tipo)?.felicidad ?? 0), ...pc.deco.map((d) => DECORACIONES.find((x) => x.id === d.tipo)?.felicidad ?? 0)].reduce((t, n) => t + n, 0);
function felicidad(pc) {
    if (!pc.peces.length) return 0.5;
    const hambrientos = pc.peces.filter((p) => p.hambre > 0.75).length / pc.peces.length;
    const lleno = Math.max(0, ocupados(pc) / lugares(pc) - 0.85) * 2;
    return Math.max(0, Math.min(1, 0.45 + Math.min(0.4, bonusAmbiente(pc) * 0.01) + (pc.mimo ?? 0) * 0.15 - pc.suciedad * 0.6 - hambrientos * 0.4 - lleno + (pc.peces.length >= 3 ? 0.1 : 0)));
}
// Monedas por segundo que dejan las visitas de una pecera
function porSegundo(pc) {
    const belleza = pc.peces.reduce((t, p) => t + especie(p.esp).belleza * (0.4 + p.crece * 0.6), 0);
    return belleza * 0.12 * (0.25 + felicidad(pc)) * (1 + nivelEquipo(pc, "luz") * 0.2) * (1 + nivelEquipo(pc, "cartel") * 0.15);
}
const porSegundoTotal = () => estado.peceras.reduce((t, pc) => t + porSegundo(pc), 0);
// El agua se ensucia de a poco; el filtro y los limpiadores (caracoles, cangrejos, camarones) ayudan
function cambiarAgua(pc, segundos) {
    const limpiadores = pc.peces.reduce((t, p) => t + (especie(p.esp).limpia ?? 0), 0);
    const ensucia = (0.03 + pc.peces.length * 0.006) / 3600;
    const limpia = (nivelEquipo(pc, "filtro") * 0.2 + Math.min(0.3, limpiadores * 0.04)) / 3600;
    pc.suciedad = Math.max(0, Math.min(1, pc.suciedad + (ensucia - limpia) * segundos));
    pc.mimo = Math.max(0, (pc.mimo ?? 0) - segundos / 3600);
}
function cambiarHambre(pc, segundos) {
    const muertos = [];
    for (const p of pc.peces) {
        p.hambre = Math.min(1, p.hambre + segundos / (HORAS_HAMBRE * 3600));
        if (p.hambre >= 1) {
            p.hambreDesde = (p.hambreDesde || 0) + segundos;
            if (p.hambreDesde > HORAS_SIN_COMER * 3600) muertos.push(p);
        }
    }
    if (muertos.length) pc.peces = pc.peces.filter((p) => !muertos.includes(p));
    return muertos;
}
function usarComedero(pc, segundos, enVivo) {
    const n = nivelEquipo(pc, "comedero");
    if (!n) return;
    const cada = Math.max(10, 60 - n * 10) * 60;
    pc.tiempoComedero = (pc.tiempoComedero ?? 0) + segundos;
    while (pc.tiempoComedero >= cada) {
        pc.tiempoComedero -= cada;
        if (enVivo) for (let k = 0; k < 6; k++) comida.push({ x: ancho * (0.3 + Math.random() * 0.4), y: 14, vx: (Math.random() - 0.5) * 6, vy: 6, enArena: 0, tipo: "escamas" });
        else for (const p of pc.peces) p.hambre = Math.max(0, p.hambre - 0.35);
    }
}
// Nunca quedarse sin nada: si no hay ningún animal y no alcanza para comprar, llegan dos de regalo
function revisarRescate() {
    if (todosLosPeces().length) return;
    const pc = act();
    const agua = tipoDe(pc).agua;
    const barato = ESPECIES.filter((e) => e.agua === agua).sort((a, b) => a.precio - b.precio)[0];
    if (estado.monedas >= barato.precio * 2) return;
    for (let k = 0; k < 2; k++) pc.peces.push(nuevoPez(barato.id, 0.4 + k * 0.2, 0.3, 0.6));
    avisar(`🎁 Un vecino te regaló 2 ${barato.nombre} para empezar de nuevo`);
    refrescar();
}

// ---------- Dibujo ----------
const MODO_PLANO = { camina: true, flota: true, vertical: true }; // no se inclinan al nadar
function dibujarPeces(ctx, t) {
    const pc = act();
    // Sombras en la arena (los que están más cerca del fondo, más marcada)
    ctx.fillStyle = "rgba(0,0,0,0.13)";
    ctx.beginPath();
    for (const p of pc.peces) {
        const L = largoPez(p);
        const h = (arena() - p.y * alto) / arena();
        const w = L * 0.45 * (1 - h * 0.6);
        ctx.moveTo(p.x * ancho + w, arena() + 6);
        ctx.ellipse(p.x * ancho, arena() + 6, w, w * 0.18, 0, 0, TAU);
    }
    ctx.fill();
    // Los de atrás (más lejos) primero, más chicos y apagados
    const orden = [...pc.peces].sort((a, b) => (a.z ?? 0.5) - (b.z ?? 0.5) || largoPez(a) - largoPez(b));
    for (const p of orden) {
        const e = especie(p.esp);
        const z = caminante(e) ? 1 : p.z ?? 0.5;
        const L = largoPez(p) * (0.8 + z * 0.2);
        const cuadro = Math.floor(p.fase ?? 0) % CUADROS;
        const Lr = Math.max(8, Math.round(L / 3) * 3);
        const img = sprite(`pez-${p.esp}-${Lr}-${cuadro}`, Lr * 2.4, Lr * 2.4, (c) => {
            c.translate(Lr * 1.2, Lr * 1.2);
            dibujarPez(c, p.esp, Lr, cuadro);
        });
        const x = p.x * ancho;
        const y = p.y * alto;
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(e.modo === "flota" ? 1 : p.mira ?? 1, 1);
        if (!MODO_PLANO[e.modo] && !(caminante(e) && !(p.salto > 0))) ctx.rotate(Math.max(-0.5, Math.min(0.5, Math.atan2(p.vy, Math.abs(p.vx) + 1))));
        ctx.globalAlpha = (p.hambre >= 1 ? 0.65 : 1) * (0.72 + z * 0.28);
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
    ctx.globalAlpha = 1;
    // Luz propia de los del abismo
    ctx.globalCompositeOperation = "lighter";
    for (const p of pc.peces) {
        const e = especie(p.esp);
        if (!e.brilla) continue;
        const L = largoPez(p);
        const late = 0.6 + Math.sin(t * 3 + (p.z ?? 0) * 9) * 0.25;
        const b = brilloLuz(e.brilla);
        const gx = p.x * ancho + (e.id === "rape" ? (p.mira ?? 1) * L * 0.5 : 0);
        const gy = p.y * alto - (e.id === "rape" ? L * 0.42 : 0);
        const r = e.id === "rape" ? L * 0.6 : L * 0.9;
        ctx.globalAlpha = late;
        ctx.drawImage(b.c, gx - r, gy - r, r * 2, r * 2);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
}

function dibujarComida(ctx, dt, t) {
    for (let i = comida.length - 1; i >= 0; i--) {
        const f = comida[i];
        const a = comidaDe(f.tipo);
        if (f.y < arena() - 2) {
            if (f.tipo === "artemia") {
                // Nadan un poco y se hunden muy despacio
                f.vx += (Math.random() - 0.5) * 80 * dt;
                f.vx *= 0.96;
                f.vy = Math.min(5, f.vy + dt * 1.5) + Math.sin(t * 6 + i) * 2;
            } else f.vy = Math.min(26 * a.hunde, f.vy + dt * 6 * a.hunde);
            f.x += (f.vx + Math.sin(t * 2 + i) * 6 / a.hunde) * dt;
            f.y += f.vy * dt;
            f.x = Math.max(4, Math.min(ancho - 4, f.x));
        } else {
            f.enArena += dt;
            if (f.enArena > 30) {
                comida.splice(i, 1);
                act().suciedad = Math.min(1, act().suciedad + 0.004);
                continue;
            }
        }
        if (f.tipo === "gusanos") {
            ctx.strokeStyle = "#c1121f";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(f.x - 4, f.y);
            ctx.quadraticCurveTo(f.x - 1, f.y - 3 + Math.sin(t * 8 + i) * 2, f.x + 1, f.y);
            ctx.quadraticCurveTo(f.x + 3, f.y + 3, f.x + 5, f.y + Math.sin(t * 8 + i));
            ctx.stroke();
        } else if (f.tipo === "artemia") {
            ctx.fillStyle = "#ff8fab";
            ctx.beginPath();
            ctx.ellipse(f.x, f.y, 2.6, 1.3, f.vx * 0.05, 0, TAU);
            ctx.fill();
        } else if (f.tipo === "pastillas") {
            ctx.fillStyle = "#6f4518";
            ctx.beginPath();
            ctx.arc(f.x, f.y, 3.4, 0, TAU);
            ctx.fill();
            ctx.fillStyle = "#a9713f";
            ctx.beginPath();
            ctx.arc(f.x - 1, f.y - 1, 1.3, 0, TAU);
            ctx.fill();
        } else if (f.tipo === "krill") {
            ctx.strokeStyle = "#e76f51";
            ctx.lineWidth = 3;
            ctx.lineCap = "round";
            ctx.beginPath();
            ctx.arc(f.x, f.y, 4, 0.3, 2.6);
            ctx.stroke();
        } else {
            ctx.fillStyle = "#f4a261";
            ctx.fillRect(f.x - 1.6, f.y - 1.6, 3.2, 3.2);
        }
    }
}

function dibujar(dt) {
    const { ctx } = lienzo;
    const t = performance.now() / 1000;
    const pc = act();
    const abismo = pc.tipo === "abismo";
    if (!fondo) fondo = pintarFondo();
    if (!frente) frente = pintarFrente();
    ctx.drawImage(fondo, 0, 0, ancho, alto);
    // Cáusticas que se mueven sobre todo (no llegan al abismo)
    if (!abismo && !calidadBaja) {
        const cau = causticas();
        ctx.globalCompositeOperation = "lighter";
        for (const [vel, alfa, esc] of [[9, 0.07, 1.4], [-6, 0.06, 1]]) {
            const tam = 256 * esc;
            const ox = ((t * vel) % tam + tam) % tam;
            const oy = (t * 4 * esc) % tam;
            ctx.globalAlpha = alfa;
            for (let x = -ox; x < ancho; x += tam) for (let y = -oy; y < alto; y += tam) ctx.drawImage(cau.c, x, y, tam, tam);
        }
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = "source-over";
    }
    for (const p of pc.plantas) {
        const datos = PLANTAS.find((x) => x.id === p.tipo);
        if (datos) dibujarPlanta(ctx, datos, p.x * ancho, arena() + 6, alto, t, p.x);
    }
    dibujarComida(ctx, dt, t);
    dibujarPeces(ctx, t);
    // Burbujas: del difusor y de las chimeneas del abismo
    const fuentes = [ancho * 0.92, ...pc.deco.filter((d) => d.tipo === "chimenea").map((d) => d.x * ancho)];
    if (burbujas.length < burbujasMax && Math.random() < dt * 8 * fuentes.length) {
        const fx = fuentes[Math.floor(Math.random() * fuentes.length)];
        const alturaFuente = fx === ancho * 0.92 ? 0 : Math.min(ancho, 520) * 0.12 * 1.1;
        burbujas.push({ x: fx + (Math.random() - 0.5) * 8, y: arena() + 6 - alturaFuente, r: 1.5 + Math.random() * 3.5, v: 40 + Math.random() * 40, fase: Math.random() * 6 });
    }
    ctx.strokeStyle = "rgba(255,255,255,0.7)";
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    ctx.lineWidth = 1.1;
    for (let i = burbujas.length - 1; i >= 0; i--) {
        const b = burbujas[i];
        b.y -= b.v * dt;
        b.fase += dt * 4;
        if (b.y < 4) {
            burbujas.splice(i, 1);
            continue;
        }
        const x = b.x + Math.sin(b.fase) * 3;
        ctx.beginPath();
        ctx.arc(x, b.y, b.r, 0, TAU);
        ctx.stroke();
        ctx.fillRect(x - b.r * 0.45, b.y - b.r * 0.45, b.r * 0.35, b.r * 0.35);
    }
    // Partículas flotando en el agua (le dan profundidad)
    ctx.fillStyle = abismo ? "rgba(180,230,255,0.45)" : "rgba(255,255,255,0.35)";
    for (const m of motas) {
        m.y += m.v * dt * (abismo ? 0.5 : 1);
        if (m.y > 0.86) m.y = 0;
        ctx.fillRect((m.x + Math.sin(t * 0.3 + m.f) * 0.01) * ancho, m.y * alto, 1.4, 1.4);
    }
    // Superficie del agua: una franja que ondula
    ctx.fillStyle = abismo ? "rgba(126,224,255,0.06)" : "rgba(255,255,255,0.22)";
    ctx.beginPath();
    ctx.moveTo(0, 0);
    for (let x = 0; x <= ancho; x += 16) ctx.lineTo(x, 5 + Math.sin(x / 30 + t * 1.6) * 2.5 + Math.sin(x / 11 - t * 2.3));
    ctx.lineTo(ancho, 0);
    ctx.fill();
    // Agua sucia: velo verdoso
    if (pc.suciedad > 0.05) {
        ctx.fillStyle = `rgba(80, 110, 40, ${Math.min(0.45, pc.suciedad * 0.5)})`;
        ctx.fillRect(0, 0, ancho, alto);
    }
    ctx.drawImage(frente, 0, 0, ancho, alto);
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

// ---------- Toques: un animal → su ficha; el agua → comida ----------
let fichaAbierta = null;
$("lienzo").addEventListener("pointerdown", (e) => {
    const caja = $("lienzo").getBoundingClientRect();
    const x = e.clientX - caja.left;
    const y = e.clientY - caja.top;
    const tocado = [...act().peces].reverse().find((p) => Math.hypot(p.x * ancho - x, p.y * alto - y) < Math.max(18, largoPez(p) * 0.6));
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
    const p = act().peces.find((x) => x.id === fichaAbierta);
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
    const pc = act();
    const p = pc.peces.find((x) => x.id === b.dataset.venderPez);
    if (!p || !confirm(`¿Regalar a ${p.nombre}? Se va a otro acuario.`)) return;
    pc.peces = pc.peces.filter((x) => x !== p);
    estado.monedas += Math.round(especie(p.esp).precio * 0.4 * p.crece);
    efectos.monedas();
    cerrarFicha();
    refrescar();
});
$("limpiar").addEventListener("click", () => {
    const pc = act();
    if (pc.suciedad < 0.02) return avisar("El agua ya está limpia 💧");
    pc.suciedad = Math.max(0, pc.suciedad - 0.35);
    for (let i = comida.length - 1; i >= 0; i--) if (comida[i].enArena > 0) comida.splice(i, 1);
    cont.limpiezas++;
    sonidos.limpiar();
    for (let k = 0; k < 12; k++) burbujas.push({ x: Math.random() * ancho, y: arena() - Math.random() * 20, r: 2 + Math.random() * 3, v: 80 + Math.random() * 60, fase: Math.random() * 6 });
    refrescar();
});

// ---------- Barra de comida (en la pecera) ----------
let ultimasComidas = "";
function pintarComidas() {
    const html = COMIDAS.filter((a) => !a.pack || estado.comidas[a.id] > 0).map((a) => `<button type="button" class="chip-comida${estado.alimento === a.id ? " activa" : ""}" data-alimento="${a.id}" title="${a.nombre}">${a.icono}${a.pack ? `<b>${estado.comidas[a.id]}</b>` : ""}</button>`).join("");
    if (html === ultimasComidas) return;
    ultimasComidas = html;
    $("comidas").innerHTML = html;
}
$("comidas").addEventListener("click", (e) => {
    const b = e.target.closest("[data-alimento]");
    if (!b) return;
    estado.alimento = b.dataset.alimento;
    efectos.toque();
    pintarComidas();
    avisar(`${comidaDe(estado.alimento).icono} ${comidaDe(estado.alimento).nombre}: tocá el agua para tirar`, 1600);
});

// ---------- Estante de peceras ----------
function precioPecera(tipo) {
    const tengo = estado.peceras.filter((pc) => pc.tipo === tipo).length;
    return Math.round(TIPOS_PECERA[tipo].precio * 2 ** tengo);
}
// Miniatura quieta de una pecera para el estante
function miniatura(can, pc) {
    const c = can.getContext("2d");
    const w = can.width;
    const h = can.height;
    const tp = tipoDe(pc);
    const g = c.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, tp.agua1);
    g.addColorStop(0.55, tp.agua2);
    g.addColorStop(1, tp.agua3);
    c.fillStyle = g;
    c.fillRect(0, 0, w, h);
    const piso = h * 0.86;
    c.fillStyle = tp.arena1;
    c.fillRect(0, piso, w, h - piso);
    const t = w * 0.12;
    for (const d of pc.deco) dibujarDeco(c, d.tipo, d.x * w, piso + 6, t);
    for (const p of pc.plantas) {
        const datos = PLANTAS.find((x) => x.id === p.tipo);
        if (datos) dibujarPlanta(c, datos, p.x * w, piso + 4, h * 0.9, 0, p.x);
    }
    for (const p of pc.peces) {
        c.save();
        c.translate(p.x * w, Math.min(p.y, 0.84) * h);
        c.scale(p.mira < 0 ? -1 : 1, 1);
        dibujarPez(c, p.esp, w * 0.19 * especie(p.esp).tam * (0.45 + p.crece * 0.55), 1);
        c.restore();
    }
}
function abrirEstante() {
    const repisas = estado.peceras.map((pc, i) => {
        const tp = tipoDe(pc);
        return `<button type="button" class="tarro${i === estado.actual ? " viendo" : ""}" data-ir="${i}">
            <canvas class="mini-pecera" width="320" height="200" data-mini="${i}"></canvas>
            <strong>${pc.nombre}</strong><small>${tp.icono} ${tp.nombre} · ${pc.peces.length} animales · 👀 ${formatear(porSegundo(pc) * 60)}/min</small>
            ${i === estado.actual ? `<em>Mirando</em>` : ""}</button>`;
    }).join("");
    const comprar = estado.peceras.length >= MAX_PECERAS ? `<p class="ayuda-a">Tenés el estante lleno (${MAX_PECERAS} peceras)</p>`
        : Object.entries(TIPOS_PECERA).map(([id, tp]) => {
            const bloqueada = tp.nivel > nivelAcuario();
            const precio = precioPecera(id);
            return `<div class="tarro nuevo"><span class="ico-tarro">${tp.icono}</span><strong>${tp.nombre}</strong>
                <small>${id === "dulce" ? "Peces de río, caracoles, cangrejos y ajolotes" : id === "arrecife" ? "Payasos, pulpos, medusas, caballitos y estrellas" : "Criaturas que brillan en la oscuridad"}</small>
                <button type="button" data-pecera-nueva="${id}" ${bloqueada || estado.monedas < precio ? "disabled" : ""}>${bloqueada ? `🔒 Nivel ${tp.nivel}` : `<i class="moneda-a chica"></i>${formatear(precio)}`}</button></div>`;
        }).join("");
    $("estante").innerHTML = `<div class="estante-caja">
        <header><strong>🗄️ Mis peceras</strong><button type="button" class="cerrar-estante" aria-label="Cerrar">✕</button></header>
        <div class="repisa">${repisas}</div>
        <h3 class="titulo-a">Comprar otra pecera</h3>
        <div class="repisa">${comprar}</div></div>`;
    for (const can of $("estante").querySelectorAll("canvas[data-mini]")) miniatura(can, estado.peceras[+can.dataset.mini]);
    $("estante").hidden = false;
    efectos.abrir?.();
}
function irAPecera(i) {
    if (i === estado.actual) return;
    estado.actual = i;
    comida.length = 0;
    burbujas.length = 0;
    sustos.clear();
    cerrarFicha();
    fondo = null;
    frente = null;
    sonidos.vidrio();
    refrescar();
    avisar(`${tipoDe(act()).icono} ${act().nombre}`, 1400);
}
$("abrir-estante").addEventListener("click", abrirEstante);
$("estante").addEventListener("click", (e) => {
    if (e.target === $("estante") || e.target.closest(".cerrar-estante")) {
        $("estante").hidden = true;
        return;
    }
    const ir = e.target.closest("[data-ir]");
    if (ir) {
        irAPecera(+ir.dataset.ir);
        $("estante").hidden = true;
        return;
    }
    const b = e.target.closest("[data-pecera-nueva]");
    if (!b || b.disabled) return;
    const tipo = b.dataset.peceraNueva;
    const precio = precioPecera(tipo);
    if (estado.monedas < precio || estado.peceras.length >= MAX_PECERAS) return;
    estado.monedas -= precio;
    const n = estado.peceras.filter((pc) => pc.tipo === tipo).length + 1;
    const pc = nuevaPecera(tipo, `${TIPOS_PECERA[tipo].nombre}${n > 1 ? ` ${n}` : ""}`);
    pc.deco.push({ tipo: "roca", x: 0.3 });
    estado.peceras.push(pc);
    efectos.fanfarria();
    irAPecera(estado.peceras.length - 1);
    $("estante").hidden = true;
    avisar(`🎉 ¡Pecera nueva: ${pc.nombre}! Comprale animales en 🐠`);
});

// ---------- Panel ----------
let pestana = "peces";
let ultimoPanel = "";
const MONEDA = '<i class="moneda-a chica"></i>';
function iconoPez(id) {
    return `<canvas class="ico-pez" width="96" height="64" data-pez="${id}"></canvas>`;
}
function pintarPanel() {
    const pc = act();
    const agua = tipoDe(pc).agua;
    let html = "";
    if (pestana === "peces") {
        html = ESPECIES.filter((e) => e.agua === agua).map((e) => {
            const bloqueado = e.nivel > nivelAcuario();
            const sinLugar = ocupados(pc) + espacioDe(e) > lugares(pc);
            return `<div class="fila-a${bloqueado ? " bloqueada" : ""}">${iconoPez(e.id)}<div class="txt"><strong>${e.nombre}</strong><span class="${e.depredador ? "peligro" : ""}">${e.caracter}</span><small>${e.detalle} · ocupa ${espacioDe(e)}</small></div>
                <button type="button" data-comprar="${e.id}" ${bloqueado || sinLugar || estado.monedas < e.precio ? "disabled" : ""}>${bloqueado ? `🔒 Nivel ${e.nivel}` : sinLugar ? "Sin lugar" : `${MONEDA}${formatear(e.precio)}`}</button></div>`;
        }).join("") + `<p class="ayuda-a">Nivel del acuario: ${nivelAcuario()} (sube con lo que ganás) · Lugar: ${ocupados(pc)}/${lugares(pc)}<br>Otras especies viven en otras peceras: tocá 🗄️</p>`;
    } else if (pestana === "comida") {
        html = COMIDAS.map((a) => `<div class="fila-a${estado.alimento === a.id ? " elegida" : ""}"><span class="ico-a">${a.icono}</span><div class="txt"><strong>${a.nombre}${a.pack ? ` <em>tenés ${estado.comidas[a.id] ?? 0}</em>` : ""}</strong><small>${a.detalle}</small></div>
                <div class="botones-a">${a.pack ? `<button type="button" data-comida="${a.id}" ${estado.monedas < a.precio ? "disabled" : ""}>+${a.pack} ${MONEDA}${formatear(a.precio)}</button>` : ""}
                <button type="button" class="usar" data-alimento-panel="${a.id}" ${a.pack && !(estado.comidas[a.id] > 0) ? "disabled" : ""}>${estado.alimento === a.id ? "✓ Usando" : "Usar"}</button></div></div>`).join("")
            + `<p class="ayuda-a">Elegí una comida y tocá el agua para tirarla. Los que caminan solo comen lo que llega al fondo.</p>`;
    } else if (pestana === "deco") {
        html = `<h3 class="titulo-a">Plantas</h3>` + PLANTAS.filter((p) => p.agua === agua).map((p) => `<div class="fila-a"><span class="ico-a" style="color:${p.color}">${{ anemona: "🌸", abanico: "🪭", tubos: "🪱", esponja: "🏺" }[p.forma] ?? "🌿"}</span><div class="txt"><strong>${p.nombre}</strong><small>+${p.felicidad} de felicidad · tenés ${pc.plantas.filter((x) => x.tipo === p.id).length}</small></div>
                <button type="button" data-planta="${p.id}" ${estado.monedas < p.precio || pc.plantas.length >= 12 ? "disabled" : ""}>${MONEDA}${formatear(p.precio)}</button></div>`).join("")
            + `<h3 class="titulo-a">Decoración</h3>` + DECORACIONES.filter((d) => d.agua.includes(agua)).map((d) => `<div class="fila-a"><span class="ico-a">${d.icono}</span><div class="txt"><strong>${d.nombre}</strong><small>+${d.felicidad} de felicidad · tenés ${pc.deco.filter((x) => x.tipo === d.id).length}</small></div>
                <button type="button" data-deco="${d.id}" ${estado.monedas < d.precio || pc.deco.length >= 8 ? "disabled" : ""}>${MONEDA}${formatear(d.precio)}</button></div>`).join("");
    } else if (pestana === "equipo") {
        html = EQUIPO.map((q) => {
            const n = nivelEquipo(pc, q.id);
            const tope = n >= q.max;
            return `<div class="fila-a"><span class="ico-a">${q.icono}</span><div class="txt"><strong>${q.nombre}${n ? ` <em>Nv ${n}</em>` : ""}</strong><small>${q.detalle(n)}</small></div>
                <button type="button" data-equipo="${q.id}" ${tope || estado.monedas < q.costo(n) ? "disabled" : ""}>${tope ? "Máximo" : `${MONEDA}${formatear(q.costo(n))}`}</button></div>`;
        }).join("") + `<p class="ayuda-a">El equipo es de esta pecera: "${pc.nombre}"</p>`;
    } else {
        const orden = [...pc.peces].sort((a, b) => b.hambre - a.hambre);
        html = orden.length
            ? orden.map((p) => `<div class="fila-a pez-mio" data-ver="${p.id}">${iconoPez(p.esp)}<div class="txt"><strong>${p.nombre}</strong><small>${especie(p.esp).nombre}${p.crece >= 0.9 ? " adulto" : " joven"}</small>
                <div class="barra-a hambre chica"><i style="width:${Math.round(p.hambre * 100)}%"></i></div></div><span class="estado-pez">${p.hambre >= 1 ? "😵" : p.hambre > 0.75 ? "😟" : p.hambre > 0.4 ? "🙂" : "😋"}</span></div>`).join("")
            : `<p class="ayuda-a">La pecera está vacía. ¡Comprá animales en 🐠!</p>`;
    }
    if (html === ultimoPanel) return;
    ultimoPanel = html;
    $("panel").innerHTML = html;
    for (const c of $("panel").querySelectorAll("canvas[data-pez]")) {
        const ctx = c.getContext("2d");
        const e = especie(c.dataset.pez);
        const alto = e.modo === "flota" || e.modo === "pulpo" || e.modo === "vertical";
        ctx.scale(2, 2);
        ctx.translate(24, alto ? 11 : 16);
        dibujarPez(ctx, e.id, alto ? 20 : Math.min(38, 24 + e.tam * 10), 1);
    }
}
$("panel").addEventListener("click", (e) => {
    const ver = e.target.closest("[data-ver]");
    if (ver) {
        const p = act().peces.find((x) => x.id === ver.dataset.ver);
        if (p) abrirFicha(p);
        return;
    }
    const b = e.target.closest("button");
    if (!b || b.disabled) return;
    const d = b.dataset;
    const pc = act();
    if (d.comprar) {
        const esp = especie(d.comprar);
        if (estado.monedas < esp.precio || ocupados(pc) + espacioDe(esp) > lugares(pc)) return;
        estado.monedas -= esp.precio;
        const p = nuevoPez(esp.id, 0.2 + Math.random() * 0.6, 0.05);
        p.vy = 60;
        pc.peces.push(p);
        sonidos.chapuzon();
        avisar(`🐟 ¡Llegó ${p.nombre}, un ${esp.nombre}!${esp.depredador ? " Cuidado: se come a los chicos" : ""}`);
        for (let k = 0; k < 8; k++) burbujas.push({ x: p.x * ancho + (Math.random() - 0.5) * 20, y: 30 + Math.random() * 20, r: 2 + Math.random() * 3, v: 60, fase: Math.random() * 6 });
    } else if (d.comida) {
        const a = comidaDe(d.comida);
        if (estado.monedas < a.precio) return;
        estado.monedas -= a.precio;
        estado.comidas[a.id] = (estado.comidas[a.id] ?? 0) + a.pack;
        estado.alimento = a.id;
        efectos.comprar();
        pintarComidas();
    } else if (d.alimentoPanel) {
        estado.alimento = d.alimentoPanel;
        efectos.toque();
        pintarComidas();
    } else if (d.planta) {
        const p = PLANTAS.find((x) => x.id === d.planta);
        if (estado.monedas < p.precio) return;
        estado.monedas -= p.precio;
        pc.plantas.push({ tipo: p.id, x: 0.06 + Math.random() * 0.82 });
        efectos.comprar();
    } else if (d.deco) {
        const dd = DECORACIONES.find((x) => x.id === d.deco);
        if (estado.monedas < dd.precio) return;
        estado.monedas -= dd.precio;
        pc.deco.push({ tipo: dd.id, x: 0.12 + Math.random() * 0.7 });
        fondo = null;
        efectos.comprar();
    } else if (d.equipo) {
        const q = EQUIPO.find((x) => x.id === d.equipo);
        const n = nivelEquipo(pc, q.id);
        if (n >= q.max || estado.monedas < q.costo(n)) return;
        estado.monedas -= q.costo(n);
        pc.equipo[q.id] = n + 1;
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
    const pc = act();
    $("monedas").textContent = formatear(Math.floor(estado.monedas));
    $("visitas").textContent = formatear(porSegundoTotal() * 60);
    $("nombre-pecera").textContent = `${tipoDe(pc).icono} ${pc.nombre}`;
    $("felicidad").style.width = `${Math.round(felicidad(pc) * 100)}%`;
    $("agua").style.width = `${Math.round((1 - pc.suciedad) * 100)}%`;
    $("poblacion").textContent = `${ocupados(pc)}/${lugares(pc)}`;
    $("limpiar").classList.toggle("urgente", pc.suciedad > 0.4);
    $("abrir-estante").querySelector("b").textContent = estado.peceras.length;
    if (fichaAbierta) pintarFicha();
}
function refrescar() {
    guardarEstado();
    pintarDatos();
    pintarPanel();
    pintarComidas();
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
const especiesDistintas = () => new Set(todosLosPeces().map((p) => p.esp)).size;
const LOGROS = [
    { id: "peces5", icono: "🐟", nombre: "Primer cardumen", detalle: "Tené 5 animales a la vez", meta: 5, valor: () => todosLosPeces().length, fichas: 300 },
    { id: "peces15", icono: "🐠", nombre: "Pecera llena de vida", detalle: "Tené 15 animales a la vez", meta: 15, valor: () => todosLosPeces().length, fichas: 1500 },
    { id: "especies4", icono: "🌈", nombre: "Variedad", detalle: "Tené 4 especies distintas", meta: 4, valor: especiesDistintas, fichas: 800 },
    { id: "especies8", icono: "🏆", nombre: "Coleccionista", detalle: "Tené 8 especies distintas", meta: 8, valor: especiesDistintas, fichas: 3000 },
    { id: "especies25", icono: "👑", nombre: "Colección completa", detalle: `Tené las ${ESPECIES.length} especies`, meta: ESPECIES.length, valor: especiesDistintas, fichas: 15000 },
    { id: "cria1", icono: "🥚", nombre: "¡Nació un bebé!", detalle: "Lográ que nazca una cría", meta: 1, valor: () => cont.crias, fichas: 600 },
    { id: "cria20", icono: "👨‍👩‍👧", nombre: "Gran familia", detalle: "Lográ 20 crías", meta: 20, valor: () => cont.crias, fichas: 4000 },
    { id: "feliz", icono: "😊", nombre: "Peces felices", detalle: "Llegá a 90% de felicidad", meta: 90, valor: () => Math.round(felicidad(act()) * 100), fichas: 1200 },
    { id: "limpio", icono: "🧽", nombre: "Agua cristalina", detalle: "Limpiá 20 veces", meta: 20, valor: () => cont.limpiezas, fichas: 500 },
    { id: "gourmet", icono: "🪱", nombre: "Gourmet", detalle: "Dales 50 comidas especiales", meta: 50, valor: () => cont.especiales, fichas: 1500 },
    { id: "ganado", icono: "💰", nombre: "Acuario famoso", detalle: "Ganá 50K con las visitas", meta: 50000, valor: () => cont.ganado, fichas: 3000 },
    { id: "peceras2", icono: "🗄️", nombre: "Segunda pecera", detalle: "Tené 2 peceras", meta: 2, valor: () => estado.peceras.length, fichas: 1500 },
    { id: "peceras4", icono: "🏛️", nombre: "Gran acuario", detalle: "Tené 4 peceras", meta: 4, valor: () => estado.peceras.length, fichas: 6000 },
    { id: "pulpo", icono: "🐙", nombre: "Ocho brazos", detalle: "Tené un pulpo", meta: 1, valor: () => todosLosPeces().filter((p) => p.esp === "pulpo" || p.esp === "dumbo").length, fichas: 2500 },
    { id: "abismo", icono: "🦑", nombre: "Al fondo del mar", detalle: "Comprá la pecera del abismo", meta: 1, valor: () => estado.peceras.filter((pc) => pc.tipo === "abismo").length, fichas: 5000 },
    { id: "depredador", icono: "🦈", nombre: "Vida salvaje", detalle: "Tené un depredador", meta: 1, valor: () => todosLosPeces().filter((p) => especie(p.esp).depredador).length, fichas: 1500 },
];
const base = crearBase({
    juego: "acuario",
    barra: document.querySelector(".barra-acuario"),
    logros: LOGROS,
    audio,
    regaloDiario: (dia) => {
        const m = Math.round(Math.max(60, porSegundoTotal() * 600) * dia);
        return dia === 7
            ? { icono: "🪱", texto: `${formatear(m)} monedas y 20 gusanos`, dar: () => ((estado.monedas += m), (estado.comidas.gusanos = (estado.comidas.gusanos ?? 0) + 20), refrescar()) }
            : dia % 3 === 0
                ? { icono: "🦐", texto: `10 artemias y ${formatear(m)} monedas`, dar: () => ((estado.monedas += m), (estado.comidas.artemia = (estado.comidas.artemia ?? 0) + 10), refrescar()) }
                : { icono: "🪙", texto: `${formatear(m)} monedas`, dar: () => ((estado.monedas += m), refrescar()) };
    },
});

// ---------- Mientras no estabas (hasta 8 horas) ----------
const ausenteTotal = (Date.now() - estado.ultimaVez) / 1000;
const ausente = Math.min(ausenteTotal, 8 * 3600);
const ganadoAusente = porSegundoTotal() * ausente * 0.6;
estado.monedas += ganadoAusente;
cont.ganado += ganadoAusente;
const muertosAusente = [];
for (const pc of estado.peceras) {
    usarComedero(pc, ausente, false);
    muertosAusente.push(...cambiarHambre(pc, ausente));
    cambiarAgua(pc, ausente);
}
const conHambre = todosLosPeces().filter((p) => p.hambre > 0.75).length;
const sucias = estado.peceras.filter((pc) => pc.suciedad > 0.4).map((pc) => pc.nombre);
const mostro = ausenteTotal > 60 && base.resumenAlVolver(ausenteTotal, [
    { icono: "👀", texto: "Lo que pagaron las visitas", valor: ganadoAusente >= 1 ? formatear(ganadoAusente) : "" },
    { icono: "😟", texto: "Animales con mucha hambre", valor: conHambre ? `${conHambre} (tocá el agua para darles de comer)` : "" },
    { icono: "💀", texto: "No aguantaron sin comer", valor: muertosAusente.length ? muertosAusente.map((p) => p.nombre).join(", ") : "" },
    { icono: "💧", texto: "Agua sucia en", valor: sucias.join(", ") },
]);
if (!mostro) setTimeout(() => base.revisarRegalo(), 600);
if (mensajeMudanza) setTimeout(() => avisar(mensajeMudanza, 5000), 900);

// ---------- Ciclo ----------
let segundo = 0;
let acumulado = 0;
bucle((dt) => {
    const inicio = performance.now();
    moverPeces(dt);
    dibujar(dt);
    segundo += dt;
    acumulado += dt;
    if (segundo >= 1) {
        const ganado = porSegundoTotal() * segundo;
        estado.monedas += ganado;
        cont.ganado += ganado;
        for (const pc of estado.peceras) {
            const muertos = cambiarHambre(pc, segundo);
            if (muertos.length) {
                avisar(`💀 ${muertos.map((p) => p.nombre).join(", ")} no aguantó sin comer (${pc.nombre})`);
                sonidos.triste();
            }
            cambiarAgua(pc, segundo);
            usarComedero(pc, segundo, pc === act());
            revisarCrias(pc, segundo);
        }
        revisarRescate();
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
pintarComidas();
