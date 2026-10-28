// Héroe idle: tocá para pegarle al monstruo, contratá un equipo que pelea solo y avanzá de etapa.
// Cada 5 etapas hay un jefe con tiempo. Al renacer ganás almas: más daño para siempre y reliquias.
import { formatear, cargar, guardar, vibrar } from "../../js/comun3d.js";
import { crearLienzo, bucle, crearChispas } from "../../js/lienzo2d.js";

const $ = (id) => document.getElementById(id);
const CLAVE = "heroe";
const POR_ETAPA = 10;
const HITOS = [10, 25, 50, 100, 150, 200, 300, 400, 500];

const EQUIPO = [
    { id: "arquera", nombre: "Arquera", costo: 50, dps: 5, color: "#52b788", disparo: "flecha" },
    { id: "mago", nombre: "Mago", costo: 600, dps: 40, color: "#4361ee", disparo: "orbe" },
    { id: "caballero", nombre: "Caballero", costo: 7000, dps: 300, color: "#adb5bd", disparo: "tajo" },
    { id: "druida", nombre: "Druida", costo: 9e4, dps: 2400, color: "#95d5b2", disparo: "hoja" },
    { id: "ninja", nombre: "Ninja", costo: 1.2e6, dps: 2e4, color: "#343a40", disparo: "estrella" },
    { id: "dragon", nombre: "Dragón", costo: 1.8e7, dps: 1.8e5, color: "#e85d04", disparo: "fuego" },
    { id: "angel", nombre: "Ángel", costo: 3e8, dps: 1.8e6, color: "#ffe066", disparo: "orbe" },
    { id: "titan", nombre: "Titán", costo: 6e9, dps: 2e7, color: "#9d4edd", disparo: "tajo" },
];

const RELIQUIAS = [
    { id: "espada", nombre: "Espada antigua", detalle: "+30% daño por toque", max: 50 },
    { id: "estandarte", nombre: "Estandarte", detalle: "+30% daño del equipo", max: 50 },
    { id: "bolsa", nombre: "Bolsa sin fondo", detalle: "+20% de oro", max: 50 },
    { id: "reloj", nombre: "Reloj de arena", detalle: "+4 s para vencer al jefe", max: 6 },
    { id: "ojo", nombre: "Ojo de halcón", detalle: "+2% de golpe crítico (×6)", max: 10 },
    { id: "atajo", nombre: "Mapa del atajo", detalle: "Al renacer empezás 3 etapas más adelante", max: 10 },
    { id: "cofre", nombre: "Cofre del viajero", detalle: "+1 hora de oro mientras no jugás", max: 8 },
];
const costoReliquia = (n) => Math.ceil(1.6 ** n);

const HABILIDADES = {
    furia: { boton: "hab-furia", dura: 15, recarga: 60, desde: 5, texto: "¡Toques ×3!" },
    oro: { boton: "hab-oro", dura: 20, recarga: 120, desde: 15, texto: "¡Oro ×3!" },
    tormenta: { boton: "hab-tormenta", dura: 15, recarga: 90, desde: 30, texto: "¡Equipo ×4!" },
};

const BIOMAS = [
    { nombre: "Bosque", cielo: ["#87c5ff", "#d7f0ff"], lomas: "#5c9e52", suelo: "#3e7b36", tierra: "#6b4a2b" },
    { nombre: "Cueva", cielo: ["#1d1b2f", "#3b3654"], lomas: "#2b2840", suelo: "#4a4560", tierra: "#2a2638" },
    { nombre: "Desierto", cielo: ["#ffb26b", "#ffe6b3"], lomas: "#e0a85a", suelo: "#e9c46a", tierra: "#b98352" },
    { nombre: "Nieve", cielo: ["#a8c7e8", "#eef6ff"], lomas: "#dfe9f3", suelo: "#f5f9ff", tierra: "#9db4c9" },
    { nombre: "Volcán", cielo: ["#2b0b0b", "#7a1f12"], lomas: "#3b1d1d", suelo: "#4b2a24", tierra: "#ff6b35" },
    { nombre: "Cielo", cielo: ["#5ec8ff", "#fff0fa"], lomas: "#ffffff", suelo: "#f1e9ff", tierra: "#c9b6ff" },
    { nombre: "Abismo", cielo: ["#05010f", "#240b3d"], lomas: "#14072a", suelo: "#2a1250", tierra: "#7b2cbf" },
];
const FORMAS = ["baba", "ojo", "hongo", "golem", "fantasma"];

// ---------- Estado ----------
const NUEVO = () => ({ oro: 0, etapa: 1, muertes: 0, heroe: 1, equipo: {}, avanzar: true });
const estado = cargar(CLAVE, { ...NUEVO(), almas: 0, almasTotales: 0, maxEtapa: 1, reliquias: {}, habilidades: {}, ultimaVez: Date.now() });
for (const e of EQUIPO) estado.equipo[e.id] ??= 0;
for (const r of RELIQUIAS) estado.reliquias[r.id] ??= 0;
const rel = (id) => estado.reliquias[id];

const activa = (h) => (estado.habilidades[h]?.hasta ?? 0) > Date.now();
const multAlmas = () => 1 + estado.almasTotales * 0.1;
const hitos = (n) => HITOS.filter((h) => n >= h).length;

const danoToque = () => (1 + estado.heroe) * 2 ** hitos(estado.heroe) * multAlmas() * (1 + rel("espada") * 0.3) * (activa("furia") ? 3 : 1);
const dpsDe = (e) => e.dps * estado.equipo[e.id] * 2 ** hitos(estado.equipo[e.id]);
const dpsEquipo = () => EQUIPO.reduce((t, e) => t + dpsDe(e), 0) * multAlmas() * (1 + rel("estandarte") * 0.3) * (activa("tormenta") ? 4 : 1);
const probCritico = () => 0.05 + rel("ojo") * 0.02;

const esJefe = (s) => s % 5 === 0;
const vidaEn = (s) => 10 * 1.5 ** (Math.min(s, 120) - 1) * 1.16 ** Math.max(0, s - 120) * (esJefe(s) ? 8 : 1);
const oroEn = (s) => Math.ceil((vidaEn(s) / 5) * (esJefe(s) ? 0.6 : 1) * (1 + rel("bolsa") * 0.2));
const tiempoJefe = () => 30 + rel("reloj") * 4;

const CRECE_HEROE = 1.075;
const CRECE_EQUIPO = 1.08;
const costoSerie = (base, crece, nivel, n) => (base * crece ** nivel * (crece ** n - 1)) / (crece - 1);
const costoHeroe = (n) => costoSerie(5, CRECE_HEROE, estado.heroe, n);
const costoEquipo = (e, n) => costoSerie(e.costo, CRECE_EQUIPO, estado.equipo[e.id], n);

let compraDe = "1";
function cuantas(base, crece, nivel) {
    if (compraDe !== "max") return Number(compraDe);
    return Math.max(1, Math.floor(Math.log((estado.oro * (crece - 1)) / (base * crece ** nivel) + 1) / Math.log(crece)));
}

// ---------- Monstruo ----------
let monstruo = null;
let jefeRestante = 0;
function nuevoMonstruo() {
    const s = estado.etapa;
    const vida = vidaEn(s);
    const bioma = Math.floor((s - 1) / 10) % BIOMAS.length;
    monstruo = {
        vida,
        max: vida,
        jefe: esJefe(s),
        forma: FORMAS[(s * 7 + estado.muertes * 3) % FORMAS.length],
        tono: (bioma * 53 + s * 37 + estado.muertes * 71) % 360,
        golpe: 0,
        entrada: 1,
        muerte: 0,
    };
    jefeRestante = monstruo.jefe ? tiempoJefe() : 0;
}

function danar(cantidad, critico = false, desdeToque = false) {
    if (!monstruo || monstruo.muerte > 0) return;
    monstruo.vida -= cantidad;
    if (desdeToque) monstruo.golpe = 0.12;
    if (desdeToque || critico) numero(cantidad, critico);
    if (monstruo.vida <= 0) matar();
}

function matar() {
    const s = estado.etapa;
    let oro = oroEn(s) * (activa("oro") ? 3 : 1);
    const cofre = !monstruo.jefe && Math.random() < 0.03;
    if (cofre) oro *= 10;
    estado.oro += oro;
    monstruo.muerte = 0.45;
    const { x, y } = posMonstruo();
    chispas.emitir(x, y, `hsl(${monstruo.tono},80%,60%)`, monstruo.jefe ? 40 : 16, monstruo.jefe ? 260 : 170);
    for (let i = 0; i < (monstruo.jefe ? 14 : cofre ? 10 : 4); i++) monedas.push({ x, y, vx: (Math.random() - 0.5) * 220, vy: -150 - Math.random() * 200, vida: 1.2 });
    flotantes.push({ x, y: y - 50, texto: `${cofre ? "¡COFRE! " : ""}+${formatear(oro)}`, color: "#ffd166", vida: 1.2, total: 1.2, tam: cofre ? 20 : 15 });
    if (monstruo.jefe) {
        vibrar(80);
        avisar(`¡Jefe derrotado! Etapa ${s + 1}`);
        estado.etapa++;
        estado.muertes = 0;
    } else if (estado.avanzar) {
        estado.muertes++;
        if (estado.muertes >= POR_ETAPA) {
            estado.etapa++;
            estado.muertes = 0;
        }
    }
    estado.maxEtapa = Math.max(estado.maxEtapa, estado.etapa);
    actualizar();
}

function fallarJefe() {
    estado.etapa--;
    estado.muertes = 0;
    estado.avanzar = false;
    avisar("Se acabó el tiempo. Mejorá el equipo y volvé a intentar.");
    vibrar(150);
    nuevoMonstruo();
    actualizar();
}

// ---------- Dibujo ----------
const chispas = crearChispas();
const flotantes = [];
const monedas = [];
const disparos = [];
let ancho = 300;
let alto = 200;
let ataque = 0;
let tiempo = 0;
const lienzo = crearLienzo($("lienzo"), (d) => {
    ancho = d.ancho;
    alto = d.alto;
});
const suelo = () => alto * 0.8;
const posHeroe = () => ({ x: ancho * 0.3, y: suelo() });
const posMonstruo = () => ({ x: ancho * 0.72, y: suelo() - (monstruo?.forma === "ojo" || monstruo?.forma === "fantasma" ? alto * 0.18 : alto * 0.11) });

function numero(valor, critico) {
    const { x, y } = posMonstruo();
    flotantes.push({ x: x + (Math.random() - 0.5) * 50, y: y - 30, texto: formatear(valor), color: critico ? "#ffd166" : "#ffffff", vida: 0.8, total: 0.8, tam: critico ? 24 : 15 });
}

function dibujarFondo(ctx) {
    const b = BIOMAS[Math.floor((estado.etapa - 1) / 10) % BIOMAS.length];
    const g = ctx.createLinearGradient(0, 0, 0, suelo());
    g.addColorStop(0, b.cielo[0]);
    g.addColorStop(1, b.cielo[1]);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, ancho, alto);
    // Lomas lejanas que se mueven despacio
    ctx.fillStyle = b.lomas;
    ctx.globalAlpha = 0.7;
    ctx.beginPath();
    ctx.moveTo(0, suelo());
    for (let x = 0; x <= ancho; x += 10) ctx.lineTo(x, suelo() - alto * 0.12 - Math.sin((x + tiempo * 8) / 60) * alto * 0.05 - Math.sin((x + tiempo * 8) / 23) * alto * 0.02);
    ctx.lineTo(ancho, suelo());
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = b.suelo;
    ctx.fillRect(0, suelo(), ancho, alto - suelo());
    ctx.fillStyle = b.tierra;
    ctx.fillRect(0, suelo() + alto * 0.05, ancho, alto);
    ctx.fillStyle = "#0002";
    for (let x = (-tiempo * 20) % 40; x < ancho; x += 40) ctx.fillRect(x, suelo() + 3, 18, 3);
}

function dibujarPersonaje(ctx, x, y, tam, color, tipo, anim = 0) {
    // Cuerpo redondo con casco/sombrero distinto según el tipo
    const brinco = Math.abs(Math.sin(tiempo * 4 + x)) * tam * 0.05;
    y -= brinco;
    ctx.fillStyle = "#0004";
    ctx.beginPath();
    ctx.ellipse(x, y + brinco + tam * 0.02, tam * 0.35, tam * 0.08, 0, 0, Math.PI * 2);
    ctx.fill();
    // Piernas
    ctx.fillStyle = "#2b2d42";
    ctx.fillRect(x - tam * 0.17, y - tam * 0.2, tam * 0.12, tam * 0.2);
    ctx.fillRect(x + tam * 0.05, y - tam * 0.2, tam * 0.12, tam * 0.2);
    // Torso
    const g = ctx.createLinearGradient(x - tam * 0.3, 0, x + tam * 0.3, 0);
    g.addColorStop(0, color);
    g.addColorStop(1, "#00000088");
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(x - tam * 0.25, y - tam * 0.62, tam * 0.5, tam * 0.46, tam * 0.12);
    ctx.fill();
    ctx.fillStyle = g;
    ctx.globalAlpha = 0.4;
    ctx.fill();
    ctx.globalAlpha = 1;
    // Cabeza
    ctx.fillStyle = tipo === "titan" ? "#c77dff" : tipo === "dragon" ? "#e85d04" : "#ffd6a5";
    ctx.beginPath();
    ctx.arc(x, y - tam * 0.8, tam * 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#111";
    ctx.beginPath();
    ctx.arc(x + tam * 0.08, y - tam * 0.82, tam * 0.03, 0, Math.PI * 2);
    ctx.arc(x - tam * 0.04, y - tam * 0.82, tam * 0.03, 0, Math.PI * 2);
    ctx.fill();
    // Sombreros
    ctx.fillStyle = color;
    if (tipo === "heroe" || tipo === "caballero") {
        ctx.fillStyle = "#ced4da";
        ctx.beginPath();
        ctx.arc(x, y - tam * 0.84, tam * 0.22, Math.PI, 0);
        ctx.fill();
        ctx.fillStyle = "#e63946";
        ctx.fillRect(x - tam * 0.03, y - tam * 1.12, tam * 0.06, tam * 0.12);
    } else if (tipo === "mago" || tipo === "druida") {
        ctx.beginPath();
        ctx.moveTo(x - tam * 0.26, y - tam * 0.9);
        ctx.lineTo(x + tam * 0.05, y - tam * 1.35);
        ctx.lineTo(x + tam * 0.26, y - tam * 0.9);
        ctx.fill();
    } else if (tipo === "arquera") {
        ctx.beginPath();
        ctx.ellipse(x, y - tam * 0.95, tam * 0.24, tam * 0.08, -0.2, 0, Math.PI * 2);
        ctx.fill();
    } else if (tipo === "ninja") {
        ctx.fillStyle = "#111";
        ctx.fillRect(x - tam * 0.2, y - tam * 0.95, tam * 0.4, tam * 0.08);
        ctx.fillStyle = "#e63946";
        ctx.fillRect(x - tam * 0.3, y - tam * 0.93, tam * 0.1, tam * 0.04);
    } else if (tipo === "angel") {
        ctx.strokeStyle = "#ffe066";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(x, y - tam * 1.08, tam * 0.16, tam * 0.05, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = "#ffffffcc";
        for (const lado of [-1, 1]) {
            ctx.beginPath();
            ctx.ellipse(x - tam * 0.3, y - tam * 0.5, tam * 0.22, tam * 0.1, lado * 0.5, 0, Math.PI * 2);
            ctx.fill();
        }
    } else if (tipo === "dragon" || tipo === "titan") {
        ctx.fillStyle = "#fff3";
        for (const lado of [-1, 1]) {
            ctx.beginPath();
            ctx.moveTo(x + lado * tam * 0.12, y - tam * 0.95);
            ctx.lineTo(x + lado * tam * 0.2, y - tam * 1.15);
            ctx.lineTo(x + lado * tam * 0.04, y - tam * 0.98);
            ctx.fill();
        }
    }
    // Arma del héroe: espada que gira al atacar
    if (tipo === "heroe") {
        ctx.save();
        ctx.translate(x + tam * 0.25, y - tam * 0.45);
        ctx.rotate(-1.2 + anim * 2.4);
        ctx.fillStyle = "#6c584c";
        ctx.fillRect(-tam * 0.03, -tam * 0.08, tam * 0.06, tam * 0.16);
        ctx.fillStyle = "#ffd166";
        ctx.fillRect(-tam * 0.1, -tam * 0.1, tam * 0.2, tam * 0.04);
        const hoja = ctx.createLinearGradient(0, -tam * 0.7, 0, 0);
        hoja.addColorStop(0, "#ffffff");
        hoja.addColorStop(1, "#adb5bd");
        ctx.fillStyle = hoja;
        ctx.beginPath();
        ctx.moveTo(-tam * 0.05, -tam * 0.1);
        ctx.lineTo(0, -tam * 0.72);
        ctx.lineTo(tam * 0.05, -tam * 0.1);
        ctx.fill();
        ctx.restore();
    }
}

function dibujarMonstruo(ctx, m, x, y, tam) {
    const sx = 1 + m.golpe * 1.5;
    const sy = 1 - m.golpe * 1.5;
    const salto = Math.sin(tiempo * 3) * tam * 0.03;
    ctx.save();
    ctx.translate(x + m.entrada * ancho * 0.4, y + salto);
    if (m.muerte > 0) {
        ctx.globalAlpha = m.muerte / 0.45;
        ctx.scale(1 + (0.45 - m.muerte), 1 - (0.45 - m.muerte) * 1.5);
    }
    ctx.scale(sx, sy);
    const color = `hsl(${m.tono},65%,52%)`;
    const oscuro = `hsl(${m.tono},60%,25%)`;
    const claro = `hsl(${m.tono},80%,75%)`;
    const g = ctx.createRadialGradient(-tam * 0.15, -tam * 0.2, 2, 0, 0, tam * 0.6);
    g.addColorStop(0, claro);
    g.addColorStop(0.5, color);
    g.addColorStop(1, oscuro);
    ctx.fillStyle = m.golpe > 0 ? "#fff" : g;
    // Sombra en el suelo
    ctx.save();
    ctx.fillStyle = "#0004";
    ctx.beginPath();
    ctx.ellipse(0, suelo() - y + 2, tam * 0.45, tam * 0.08, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.beginPath();
    if (m.forma === "baba") {
        ctx.moveTo(-tam * 0.5, tam * 0.3);
        ctx.quadraticCurveTo(-tam * 0.55, -tam * 0.45, 0, -tam * 0.45);
        ctx.quadraticCurveTo(tam * 0.55, -tam * 0.45, tam * 0.5, tam * 0.3);
        ctx.closePath();
    } else if (m.forma === "ojo") {
        ctx.arc(0, 0, tam * 0.38, 0, Math.PI * 2);
        const ala = Math.sin(tiempo * 14) * 0.4;
        for (const lado of [-1, 1]) {
            ctx.moveTo(lado * tam * 0.3, -tam * 0.05);
            ctx.lineTo(lado * tam * 0.85, -tam * (0.35 + ala));
            ctx.lineTo(lado * tam * 0.7, tam * 0.1);
            ctx.closePath();
        }
    } else if (m.forma === "hongo") {
        ctx.ellipse(0, -tam * 0.15, tam * 0.5, tam * 0.32, 0, Math.PI, 0);
        ctx.closePath();
        ctx.roundRect(-tam * 0.2, -tam * 0.15, tam * 0.4, tam * 0.45, tam * 0.1);
    } else if (m.forma === "golem") {
        ctx.roundRect(-tam * 0.42, -tam * 0.5, tam * 0.84, tam * 0.8, tam * 0.1);
        ctx.roundRect(-tam * 0.6, -tam * 0.35, tam * 0.2, tam * 0.5, tam * 0.06);
        ctx.roundRect(tam * 0.4, -tam * 0.35, tam * 0.2, tam * 0.5, tam * 0.06);
    } else {
        ctx.moveTo(-tam * 0.4, tam * 0.35);
        ctx.quadraticCurveTo(-tam * 0.45, -tam * 0.5, 0, -tam * 0.5);
        ctx.quadraticCurveTo(tam * 0.45, -tam * 0.5, tam * 0.4, tam * 0.35);
        for (let k = 3; k >= 0; k--) ctx.lineTo(-tam * 0.4 + k * tam * 0.2 + tam * 0.1, tam * (k % 2 ? 0.2 : 0.4) + Math.sin(tiempo * 6 + k) * 3);
        ctx.closePath();
        ctx.globalAlpha *= 0.9;
    }
    ctx.fill();
    // Detalles: manchas del hongo, grietas del golem
    if (m.forma === "hongo" && m.golpe <= 0) {
        ctx.fillStyle = "#ffffffcc";
        for (const [dx, dy, r] of [[-0.22, -0.3, 0.08], [0.12, -0.36, 0.06], [0.28, -0.2, 0.05]]) {
            ctx.beginPath();
            ctx.arc(dx * tam, dy * tam, r * tam, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    // Cara (mira hacia el héroe)
    const ojoY = m.forma === "hongo" ? tam * 0.05 : -tam * 0.1;
    if (m.forma === "ojo") {
        ctx.fillStyle = "#fff";
        ctx.beginPath();
        ctx.arc(-tam * 0.05, 0, tam * 0.22, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#d00000";
        ctx.beginPath();
        ctx.arc(-tam * 0.12, 0, tam * 0.11, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#000";
        ctx.beginPath();
        ctx.arc(-tam * 0.14, 0, tam * 0.05, 0, Math.PI * 2);
        ctx.fill();
    } else {
        for (const dx of [-0.18, 0.08]) {
            ctx.fillStyle = "#fff";
            ctx.beginPath();
            ctx.arc(dx * tam, ojoY, tam * 0.09, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = "#000";
            ctx.beginPath();
            ctx.arc(dx * tam - tam * 0.03, ojoY + tam * 0.01, tam * 0.045, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.strokeStyle = "#000a";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-tam * 0.18, ojoY + tam * 0.16);
        ctx.quadraticCurveTo(-tam * 0.05, ojoY + tam * (m.golpe > 0 ? 0.08 : 0.22), tam * 0.08, ojoY + tam * 0.16);
        ctx.stroke();
    }
    if (m.jefe) {
        // Cuernos y corona
        ctx.fillStyle = "#f1faee";
        for (const lado of [-1, 1]) {
            ctx.beginPath();
            ctx.moveTo(lado * tam * 0.25, -tam * 0.4);
            ctx.quadraticCurveTo(lado * tam * 0.55, -tam * 0.6, lado * tam * 0.45, -tam * 0.85);
            ctx.lineTo(lado * tam * 0.15, -tam * 0.45);
            ctx.fill();
        }
        ctx.fillStyle = "#ffd166";
        ctx.beginPath();
        ctx.moveTo(-tam * 0.2, -tam * 0.48);
        for (let k = 0; k <= 4; k++) ctx.lineTo(-tam * 0.2 + k * tam * 0.1, -tam * (k % 2 ? 0.58 : 0.72));
        ctx.lineTo(tam * 0.2, -tam * 0.48);
        ctx.fill();
    }
    ctx.restore();
}

function dibujarDisparo(ctx, d) {
    const p = d.t / d.duracion;
    const x = d.x0 + (d.x1 - d.x0) * p;
    const y = d.y0 + (d.y1 - d.y0) * p - Math.sin(p * Math.PI) * d.arco;
    ctx.save();
    ctx.translate(x, y);
    if (d.tipo === "flecha") {
        ctx.rotate(Math.atan2(d.y1 - d.y0, d.x1 - d.x0) - Math.cos(p * Math.PI) * 0.5);
        ctx.fillStyle = "#6b4226";
        ctx.fillRect(-10, -1, 16, 2);
        ctx.fillStyle = "#ddd";
        ctx.beginPath();
        ctx.moveTo(6, -3);
        ctx.lineTo(11, 0);
        ctx.lineTo(6, 3);
        ctx.fill();
    } else if (d.tipo === "estrella") {
        ctx.rotate(tiempo * 20);
        ctx.fillStyle = "#ced4da";
        ctx.beginPath();
        for (let k = 0; k < 8; k++) {
            const r = k % 2 ? 2 : 7;
            const a = (k / 8) * Math.PI * 2;
            ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
        }
        ctx.fill();
    } else if (d.tipo === "tajo") {
        ctx.strokeStyle = d.color;
        ctx.lineWidth = 3;
        ctx.shadowColor = d.color;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(0, 0, 10, -1, 1);
        ctx.stroke();
    } else if (d.tipo === "hoja") {
        ctx.rotate(tiempo * 8);
        ctx.fillStyle = "#52b788";
        ctx.beginPath();
        ctx.ellipse(0, 0, 7, 3, 0, 0, Math.PI * 2);
        ctx.fill();
    } else {
        ctx.fillStyle = d.color;
        ctx.shadowColor = d.color;
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(0, 0, d.tipo === "fuego" ? 7 : 5, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();
}

function lugarEquipo(i) {
    // Dos filas detrás del héroe
    const fila = i % 2;
    const col = Math.floor(i / 2);
    return { x: ancho * (0.17 - col * 0.045) + fila * ancho * 0.02, y: suelo() - fila * alto * 0.06 };
}

let siguienteDisparo = 0;
function dibujar(dt) {
    const { ctx } = lienzo;
    dibujarFondo(ctx);
    const tam = Math.min(alto * 0.42, ancho * 0.22);

    // Equipo
    const contratados = EQUIPO.filter((e) => estado.equipo[e.id] > 0);
    contratados.map((e, i) => ({ e, i })).reverse().forEach(({ e, i }) => {
        const { x, y } = lugarEquipo(i);
        dibujarPersonaje(ctx, x, y, tam * 0.55, e.color, e.id);
    });
    const h = posHeroe();
    dibujarPersonaje(ctx, h.x, h.y, tam, "#3a86ff", "heroe", ataque > 0 ? Math.sin((1 - ataque / 0.18) * Math.PI) : 0);

    // Disparos decorativos del equipo (el daño real es continuo)
    siguienteDisparo -= dt;
    if (contratados.length && siguienteDisparo <= 0 && monstruo && monstruo.muerte <= 0 && monstruo.entrada < 0.2) {
        siguienteDisparo = Math.max(0.12, 0.7 / contratados.length);
        const i = Math.floor(Math.random() * contratados.length);
        const e = contratados[i];
        const desde = lugarEquipo(i);
        const m = posMonstruo();
        disparos.push({ tipo: e.disparo, color: e.color, x0: desde.x + 10, y0: desde.y - tam * 0.35, x1: m.x - 10, y1: m.y, t: 0, duracion: 0.45, arco: e.disparo === "flecha" ? 40 : 15 });
    }

    if (monstruo) {
        const m = posMonstruo();
        dibujarMonstruo(ctx, monstruo, m.x, m.y, tam * (monstruo.jefe ? 1.25 : 0.9));
        // Barra de vida
        const bw = ancho * 0.36;
        const bx = ancho * 0.72 - bw / 2;
        const by = 12;
        ctx.fillStyle = "#000a";
        ctx.beginPath();
        ctx.roundRect(bx - 2, by - 2, bw + 4, 16, 8);
        ctx.fill();
        const frac = Math.max(0, monstruo.vida / monstruo.max);
        ctx.fillStyle = monstruo.jefe ? "#e63946" : "#7ee08f";
        ctx.beginPath();
        ctx.roundRect(bx, by, bw * frac, 12, 6);
        ctx.fill();
        ctx.fillStyle = "#fff";
        ctx.font = "800 10px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(formatear(Math.max(0, monstruo.vida)), bx + bw / 2, by + 10);
        ctx.font = "900 12px sans-serif";
        ctx.textAlign = "left";
        const b = BIOMAS[Math.floor((estado.etapa - 1) / 10) % BIOMAS.length];
        const sombra = (t, x, y) => {
            ctx.fillStyle = "#000a";
            ctx.fillText(t, x + 1, y + 1);
            ctx.fillStyle = "#fff";
            ctx.fillText(t, x, y);
        };
        sombra(`${b.nombre} · etapa ${estado.etapa}`, 10, 22);
        if (monstruo.jefe) {
            sombra(`👑 JEFE  ⏱ ${Math.ceil(jefeRestante)}s`, 10, 40);
            ctx.fillStyle = "#e63946";
            ctx.fillRect(10, 46, ancho * 0.3 * (jefeRestante / tiempoJefe()), 4);
        } else {
            sombra(estado.avanzar ? `${estado.muertes}/${POR_ETAPA}` : "Juntando oro", 10, 40);
        }
    }

    for (const d of disparos) {
        d.t += dt;
        dibujarDisparo(ctx, d);
    }
    for (let i = disparos.length - 1; i >= 0; i--) if (disparos[i].t >= disparos[i].duracion) disparos.splice(i, 1);

    chispas.dibujar(ctx, dt);

    for (let i = monedas.length - 1; i >= 0; i--) {
        const c = monedas[i];
        c.vida -= dt;
        c.vy += 500 * dt;
        c.x += c.vx * dt;
        c.y += c.vy * dt;
        if (c.y > suelo() + 4) {
            c.y = suelo() + 4;
            c.vy *= -0.4;
            c.vx *= 0.7;
        }
        ctx.globalAlpha = Math.min(1, c.vida * 2);
        ctx.fillStyle = "#ffd166";
        ctx.strokeStyle = "#b5838d";
        ctx.beginPath();
        ctx.ellipse(c.x, c.y, 5 * Math.abs(Math.cos(tiempo * 8 + i)), 5, 0, 0, Math.PI * 2);
        ctx.fill();
        if (c.vida <= 0) monedas.splice(i, 1);
    }
    ctx.globalAlpha = 1;

    for (let i = flotantes.length - 1; i >= 0; i--) {
        const f = flotantes[i];
        f.vida -= dt;
        f.y -= dt * 50;
        ctx.globalAlpha = Math.max(0, Math.min(1, (f.vida / f.total) * 2));
        ctx.font = `900 ${f.tam}px sans-serif`;
        ctx.textAlign = "center";
        ctx.lineWidth = 3;
        ctx.strokeStyle = "#000";
        ctx.strokeText(f.texto, f.x, f.y);
        ctx.fillStyle = f.color;
        ctx.fillText(f.texto, f.x, f.y);
        if (f.vida <= 0) flotantes.splice(i, 1);
    }
    ctx.globalAlpha = 1;

    // Tajo del último toque
    if (ataque > 0 && monstruo) {
        const m = posMonstruo();
        ctx.strokeStyle = `rgba(255,255,255,${ataque / 0.18})`;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(m.x - tam * 0.2, m.y, tam * 0.5, -1.1, 0.6);
        ctx.stroke();
    }
}

// ---------- Ciclo ----------
let acumulado = 0;
bucle((dt) => {
    tiempo += dt;
    ataque = Math.max(0, ataque - dt);
    if (!monstruo) nuevoMonstruo();
    const m = monstruo;
    m.golpe = Math.max(0, m.golpe - dt);
    m.entrada = Math.max(0, m.entrada - dt * 4);
    if (m.muerte > 0) {
        m.muerte -= dt;
        if (m.muerte <= 0) nuevoMonstruo();
    } else if (m.entrada <= 0) {
        danar(dpsEquipo() * dt);
        if (monstruo.jefe && monstruo.muerte <= 0) {
            jefeRestante -= dt;
            if (jefeRestante <= 0) fallarJefe();
        }
    }
    dibujar(dt);
    acumulado += dt;
    if (acumulado > 0.2) {
        acumulado = 0;
        actualizar();
        pintarHabilidades();
    }
});

$("lienzo").addEventListener("pointerdown", () => {
    if (!monstruo || monstruo.muerte > 0 || monstruo.entrada > 0.2) return;
    const critico = Math.random() < probCritico();
    ataque = 0.18;
    danar(danoToque() * (critico ? 6 : 1), critico, true);
    if (critico) vibrar(25);
    const p = posMonstruo();
    chispas.emitir(p.x - 10, p.y, critico ? "#ffd166" : "#ffffff", critico ? 10 : 4, 140);
});

// ---------- Lista de compras ----------
function retrato(e, tipo, color) {
    const c = document.createElement("canvas");
    c.width = 92;
    c.height = 92;
    const ctx = c.getContext("2d");
    const guardado = tiempo;
    tiempo = 0;
    dibujarPersonaje(ctx, 46, 84, 70, color, tipo);
    tiempo = guardado;
    return c;
}

const filas = [];
function crearFila(datos) {
    const el = document.createElement("div");
    el.className = "fila";
    el.appendChild(retrato(null, datos.tipo, datos.color));
    el.insertAdjacentHTML("beforeend", `<div class="txt"><strong></strong><span></span></div><button type="button"></button>`);
    el.querySelector("button").addEventListener("click", datos.comprar);
    $("lista").appendChild(el);
    filas.push({ el, ...datos });
}

crearFila({
    tipo: "heroe",
    color: "#3a86ff",
    comprar() {
        const n = cuantas(5, CRECE_HEROE, estado.heroe);
        if (estado.oro < costoHeroe(n)) return;
        estado.oro -= costoHeroe(n);
        estado.heroe += n;
        vibrar(15);
        actualizar();
    },
    pintar(el) {
        const n = cuantas(5, CRECE_HEROE, estado.heroe);
        const hito = HITOS.find((h) => estado.heroe < h);
        el.querySelector("strong").innerHTML = `Héroe <em>Nv ${estado.heroe}</em>`;
        el.querySelector("span").textContent = `${formatear(danoToque())} por toque${hito ? ` · ×2 al nivel ${hito}` : ""}`;
        const b = el.querySelector("button");
        b.textContent = `+${n} · ${formatear(costoHeroe(n))}`;
        b.disabled = estado.oro < costoHeroe(n);
    },
});

for (const e of EQUIPO) {
    crearFila({
        tipo: e.id,
        color: e.color,
        comprar() {
            const n = cuantas(e.costo, CRECE_EQUIPO, estado.equipo[e.id]);
            if (estado.oro < costoEquipo(e, n)) return;
            estado.oro -= costoEquipo(e, n);
            if (!estado.equipo[e.id]) avisar(`¡${e.nombre} se unió al equipo!`);
            estado.equipo[e.id] += n;
            vibrar(15);
            actualizar();
        },
        pintar(el) {
            const nivel = estado.equipo[e.id];
            const n = cuantas(e.costo, CRECE_EQUIPO, nivel);
            const hito = HITOS.find((h) => nivel < h);
            const mult = multAlmas() * (1 + rel("estandarte") * 0.3);
            el.querySelector("strong").innerHTML = `${e.nombre} ${nivel ? `<em>Nv ${nivel}</em>` : ""}`;
            el.querySelector("span").textContent = nivel
                ? `${formatear(dpsDe(e) * mult)} de daño/s${hito ? ` · ×2 al nivel ${hito}` : ""}`
                : `Pega ${formatear(e.dps * mult)}/s`;
            const b = el.querySelector("button");
            b.textContent = `${nivel ? "+" + n : "Contratar"} · ${formatear(costoEquipo(e, n))}`;
            b.disabled = estado.oro < costoEquipo(e, n);
            // Solo se muestran los que ya se pueden ver venir
            const indice = EQUIPO.indexOf(e);
            el.hidden = indice > 0 && !estado.equipo[EQUIPO[indice - 1].id] && !nivel;
            el.classList.toggle("bloqueada", !nivel && estado.oro < costoEquipo(e, 1));
        },
    });
}

function actualizar() {
    $("etapa").textContent = estado.etapa;
    $("oro").textContent = formatear(Math.floor(estado.oro));
    $("por-toque").textContent = formatear(danoToque());
    $("dps").textContent = formatear(dpsEquipo());
    $("almas").textContent = estado.almas;
    $("abrir-renacer").classList.toggle("listo", almasNuevas() >= Math.max(1, estado.almasTotales * 0.5));
    $("avanzar").hidden = estado.avanzar;
    for (const f of filas) f.pintar(f.el);
}

function avisar(texto) {
    $("aviso").innerHTML = `<div class="chico">${texto}</div>`;
    $("aviso").hidden = false;
    clearTimeout(avisar.t);
    avisar.t = setTimeout(() => ($("aviso").hidden = true), 1600);
}

$("avanzar").addEventListener("click", () => {
    estado.avanzar = true;
    estado.muertes = POR_ETAPA - 1;
    actualizar();
});

for (const b of document.querySelectorAll(".cantidad")) {
    b.addEventListener("click", () => {
        compraDe = b.dataset.cantidad;
        for (const x of document.querySelectorAll(".cantidad")) x.classList.toggle("activa", x === b);
        actualizar();
    });
}

for (const p of document.querySelectorAll(".pestana")) {
    p.addEventListener("click", () => {
        for (const x of document.querySelectorAll(".pestana")) x.classList.toggle("activa", x === p);
        $("lista").hidden = p.dataset.p !== "equipo";
        $("reliquias").hidden = p.dataset.p !== "reliquias";
        if (p.dataset.p === "reliquias") pintarReliquias();
    });
}

// ---------- Habilidades ----------
function pintarHabilidades() {
    const ahora = Date.now();
    for (const [id, h] of Object.entries(HABILIDADES)) {
        const b = $(h.boton);
        const d = estado.habilidades[id] ?? {};
        const bloqueada = estado.maxEtapa < h.desde;
        const espera = Math.max(0, ((d.listo ?? 0) - ahora) / 1000);
        b.disabled = bloqueada || espera > 0;
        b.classList.toggle("activa", activa(id));
        b.querySelector("small").textContent = bloqueada ? `Etapa ${h.desde}` : activa(id) ? `${Math.ceil((d.hasta - ahora) / 1000)}s` : espera > 0 ? `${Math.ceil(espera)}s` : b.dataset.nombre;
        b.querySelector("i").style.height = `${bloqueada ? 100 : (espera / h.recarga) * 100}%`;
    }
}
for (const [id, h] of Object.entries(HABILIDADES)) {
    const b = $(h.boton);
    b.dataset.nombre = b.querySelector("small").textContent;
    b.addEventListener("click", () => {
        const ahora = Date.now();
        if (estado.maxEtapa < h.desde || (estado.habilidades[id]?.listo ?? 0) > ahora) return;
        estado.habilidades[id] = { hasta: ahora + h.dura * 1000, listo: ahora + h.recarga * 1000 };
        avisar(h.texto);
        vibrar(40);
        pintarHabilidades();
        actualizar();
    });
}

// ---------- Renacer y reliquias ----------
const almasNuevas = () => (estado.maxEtapa < 25 ? 0 : Math.floor(((estado.maxEtapa - 20) / 5) ** 1.4));

$("abrir-renacer").addEventListener("click", () => {
    $("almas-nuevas").textContent = almasNuevas();
    $("req-renacer").textContent = estado.maxEtapa < 25 ? `Se puede renacer desde la etapa 25 (llegaste a la ${estado.maxEtapa}).` : `Tu mejor etapa en esta vida: ${estado.maxEtapa}. Cuanto más lejos llegues, más almas.`;
    $("confirmar-renacer").disabled = almasNuevas() < 1;
    $("renacer").hidden = false;
});
$("cancelar-renacer").addEventListener("click", () => ($("renacer").hidden = true));
$("confirmar-renacer").addEventListener("click", () => {
    const nuevas = almasNuevas();
    if (nuevas < 1) return;
    estado.almas += nuevas;
    estado.almasTotales += nuevas;
    Object.assign(estado, NUEVO());
    for (const e of EQUIPO) estado.equipo[e.id] = 0;
    estado.etapa = 1 + rel("atajo") * 3;
    estado.maxEtapa = estado.etapa;
    estado.habilidades = {};
    $("renacer").hidden = true;
    disparos.length = 0;
    nuevoMonstruo();
    avisar(`👻 Renaciste con ${estado.almasTotales} almas: daño ×${multAlmas().toFixed(1)}`);
    guardarProgreso();
    actualizar();
    pintarReliquias();
});

function pintarReliquias() {
    $("reliquias").innerHTML =
        `<div class="fila"><div class="txt"><strong>👻 ${estado.almas} almas para gastar</strong><span>Tenés ${estado.almasTotales} almas en total: todo pega ×${multAlmas().toFixed(1)}. Gastarlas no baja ese bono.</span></div></div>` +
        RELIQUIAS.map((r) => {
            const n = rel(r.id);
            const tope = n >= r.max;
            return `<div class="fila"><div class="txt"><strong>${r.nombre} <em>${n}/${r.max}</em></strong><span>${r.detalle}</span></div>
                <button class="alma" data-id="${r.id}" type="button" ${tope || estado.almas < costoReliquia(n) ? "disabled" : ""}>${tope ? "Máx" : `👻 ${costoReliquia(n)}`}</button></div>`;
        }).join("");
}
$("reliquias").addEventListener("click", (e) => {
    const b = e.target.closest("button[data-id]");
    if (!b) return;
    const r = RELIQUIAS.find((x) => x.id === b.dataset.id);
    const costo = costoReliquia(rel(r.id));
    if (rel(r.id) >= r.max || estado.almas < costo) return;
    estado.almas -= costo;
    estado.reliquias[r.id]++;
    vibrar(30);
    pintarReliquias();
    actualizar();
});

// ---------- Guardado y oro mientras no estabas ----------
function guardarProgreso() {
    estado.ultimaVez = Date.now();
    guardar(CLAVE, estado);
}
setInterval(guardarProgreso, 5000);
document.addEventListener("visibilitychange", guardarProgreso);
addEventListener("pagehide", guardarProgreso);

// El equipo sigue juntando oro en la etapa actual (sin avanzar) mientras no jugás
const ausente = Math.min((Date.now() - estado.ultimaVez) / 1000, (2 + rel("cofre")) * 3600);
const etapaGranja = esJefe(estado.etapa) ? estado.etapa - 1 : estado.etapa;
const ganadoAusente = Math.floor((dpsEquipo() / vidaEn(etapaGranja)) * oroEn(etapaGranja) * ausente * 0.5);
if (ganadoAusente >= 1 && ausente > 60) {
    estado.oro += ganadoAusente;
    setTimeout(() => avisar(`Mientras no estabas el equipo juntó ${formatear(ganadoAusente)} de oro`), 500);
}

nuevoMonstruo();
actualizar();
pintarHabilidades();
