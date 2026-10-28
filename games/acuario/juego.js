// Acuario: comprá peces que dan monedas solos. Tocá el agua para darles de comer (y ganar un poco más).
// Cada tanto pasa un pez dorado: si lo tocás, todo da ×5 por un rato. Empezar un acuario nuevo da conchas.
import { formatear, cargar, guardar, textoFlotante, vibrar } from "../../js/comun3d.js";
import { crearLienzo, bucle, crearChispas } from "../../js/lienzo2d.js";

const $ = (id) => document.getElementById(id);
const CLAVE = "acuario";
const CRECE = 1.15;
const HITOS = [10, 25, 50, 100, 200];
const MAX_HORAS = 4;
const TAU = Math.PI * 2;

const PECES = [
    { id: "payaso", nombre: "Pez payaso", costo: 15, da: 1, tam: 0.9, colores: ["#ff7b00", "#ffffff"] },
    { id: "globo", nombre: "Pez globo", costo: 130, da: 7, tam: 1.0, colores: ["#ffd166", "#f4a261"] },
    { id: "tortuga", nombre: "Tortuga", costo: 1100, da: 45, tam: 1.3, colores: ["#52b788", "#2d6a4f"] },
    { id: "medusa", nombre: "Medusa", costo: 9000, da: 280, tam: 1.1, colores: ["#e0aaff", "#c77dff"] },
    { id: "pulpo", nombre: "Pulpo", costo: 80000, da: 2000, tam: 1.3, colores: ["#ff4d6d", "#c9184a"] },
    { id: "tiburon", nombre: "Tiburón", costo: 700000, da: 14000, tam: 1.9, colores: ["#adb5bd", "#6c757d"] },
    { id: "ballena", nombre: "Ballena", costo: 7e6, da: 110000, tam: 2.6, colores: ["#4361ee", "#3a0ca3"] },
];

const estado = cargar(CLAVE, { monedas: 10, total: 0, conchas: 0, peces: {}, ultimaVez: Date.now() });
for (const p of PECES) estado.peces[p.id] ??= 0;
let compraDe = "1";
let impulsoHasta = 0;

const cantidad = (p) => estado.peces[p.id];
const multiplicador = () => (1 + estado.conchas * 0.1) * (impulsoHasta > Date.now() ? 5 : 1);
const daDe = (p) => p.da * cantidad(p) * 2 ** HITOS.filter((h) => cantidad(p) >= h).length * multiplicador();
const porSegundo = () => PECES.reduce((t, p) => t + daDe(p), 0);
const costoDe = (p, n) => (p.costo * CRECE ** cantidad(p) * (CRECE ** n - 1)) / (CRECE - 1);
const conchasNuevas = () => Math.floor(Math.sqrt(estado.total / 5e5));
function cuantas(p) {
    if (compraDe !== "max") return Number(compraDe);
    return Math.max(1, Math.floor(Math.log((estado.monedas * (CRECE - 1)) / (p.costo * CRECE ** cantidad(p)) + 1) / Math.log(CRECE)));
}
function ganar(n) {
    estado.monedas += n;
    estado.total += n;
}

// ---------- Pecera ----------
const chispas = crearChispas();
let ancho = 300;
let alto = 220;
const lienzo = crearLienzo($("lienzo"), (d) => {
    ancho = d.ancho;
    alto = d.alto;
});
let tiempo = 0;
const nadadores = []; // peces visibles
const burbujas = Array.from({ length: 24 }, () => ({ x: Math.random(), y: Math.random(), r: 1 + Math.random() * 3, v: 0.05 + Math.random() * 0.08 }));
const algas = Array.from({ length: 9 }, (_, i) => ({ x: (i + 0.5) / 9 + (Math.random() - 0.5) * 0.06, alto: 0.25 + Math.random() * 0.25, fase: Math.random() * 6, color: i % 2 ? "#2d6a4f" : "#40916c" }));
const comida = [];
const monedasFlotando = [];
let dorado = null;
let proximoDorado = 45;

function crearNadador(tipo) {
    return { tipo, x: Math.random(), y: 0.25 + Math.random() * 0.55, vx: (Math.random() < 0.5 ? -1 : 1) * (0.03 + Math.random() * 0.04), fase: Math.random() * 6, objetivoY: 0.25 + Math.random() * 0.55 };
}
function sincronizarNadadores() {
    for (const p of PECES) {
        const quiero = Math.min(cantidad(p), 4);
        const tengo = nadadores.filter((n) => n.tipo === p.id);
        for (let k = tengo.length; k < quiero; k++) nadadores.push(crearNadador(p.id));
        for (let k = quiero; k < tengo.length; k++) nadadores.splice(nadadores.indexOf(tengo[k]), 1);
    }
}

function dibujarPez(ctx, tipo, x, y, escala, mira, fase) {
    const p = PECES.find((q) => q.id === tipo) ?? { colores: ["#ffd166", "#ff9f1c"], tam: 1 };
    const s = 14 * escala * p.tam;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(mira, 1);
    const cola = Math.sin(fase * 8) * 0.35;
    const [c1, c2] = p.colores;
    if (tipo === "medusa") {
        ctx.scale(mira, 1);
        const pulso = 1 + Math.sin(fase * 4) * 0.1;
        ctx.globalAlpha = 0.85;
        ctx.strokeStyle = c2;
        ctx.lineWidth = 2;
        for (let k = -2; k <= 2; k++) {
            ctx.beginPath();
            ctx.moveTo(k * s * 0.25, 0);
            ctx.quadraticCurveTo(k * s * 0.3 + Math.sin(fase * 5 + k) * 4, s * 0.8, k * s * 0.2, s * 1.4);
            ctx.stroke();
        }
        const g = ctx.createRadialGradient(0, -s * 0.2, 1, 0, 0, s);
        g.addColorStop(0, "#fff");
        g.addColorStop(1, c1);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.ellipse(0, 0, s * 0.8 * pulso, s * 0.6 / pulso, 0, Math.PI, 0);
        ctx.fill();
        ctx.restore();
        return;
    }
    if (tipo === "pulpo") {
        ctx.fillStyle = c1;
        for (let k = 0; k < 6; k++) {
            ctx.beginPath();
            ctx.ellipse(-s * 0.5 + k * s * 0.2, s * 0.5 + Math.sin(fase * 6 + k) * 3, s * 0.12, s * 0.5, Math.sin(fase * 4 + k) * 0.4, 0, TAU);
            ctx.fill();
        }
        ctx.beginPath();
        ctx.ellipse(0, -s * 0.1, s * 0.75, s * 0.7, 0, 0, TAU);
        ctx.fill();
        ctx.fillStyle = "#fff";
        ctx.beginPath();
        ctx.arc(s * 0.25, -s * 0.15, s * 0.16, 0, TAU);
        ctx.fill();
        ctx.fillStyle = "#000";
        ctx.beginPath();
        ctx.arc(s * 0.29, -s * 0.15, s * 0.08, 0, TAU);
        ctx.fill();
        ctx.restore();
        return;
    }
    if (tipo === "tortuga") {
        ctx.fillStyle = "#95d5b2";
        for (const [dx, dy, r] of [[0.55, -0.1, 0.25], [0.3, 0.45, 0.16], [-0.35, 0.45, 0.16], [0.3, -0.5, 0.16], [-0.35, -0.5, 0.16]]) {
            ctx.beginPath();
            ctx.ellipse(dx * s + (dy ? Math.sin(fase * 6) * 2 : 0), dy * s, r * s, r * s * 0.7, 0, 0, TAU);
            ctx.fill();
        }
        const g = ctx.createRadialGradient(-s * 0.1, -s * 0.2, 1, 0, 0, s * 0.7);
        g.addColorStop(0, "#74c69d");
        g.addColorStop(1, c2);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.ellipse(0, 0, s * 0.6, s * 0.48, 0, 0, TAU);
        ctx.fill();
        ctx.strokeStyle = "#1b4332";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(-s * 0.3, -s * 0.3);
        ctx.lineTo(s * 0.3, s * 0.3);
        ctx.moveTo(s * 0.3, -s * 0.3);
        ctx.lineTo(-s * 0.3, s * 0.3);
        ctx.stroke();
        ctx.restore();
        return;
    }
    // Peces comunes: cuerpo ovalado, cola que se mueve, aleta y ojo
    ctx.fillStyle = c2;
    ctx.beginPath();
    ctx.moveTo(-s * 0.8, 0);
    ctx.lineTo(-s * 1.35, -s * 0.5 + cola * s);
    ctx.lineTo(-s * 1.35, s * 0.5 + cola * s);
    ctx.closePath();
    ctx.fill();
    const g = ctx.createLinearGradient(0, -s * 0.6, 0, s * 0.6);
    g.addColorStop(0, c1);
    g.addColorStop(1, c2);
    ctx.fillStyle = g;
    ctx.beginPath();
    const gordo = tipo === "globo" ? 0.85 + Math.sin(fase * 2) * 0.1 : tipo === "ballena" ? 0.55 : tipo === "tiburon" ? 0.4 : 0.55;
    ctx.ellipse(0, 0, s, s * gordo, 0, 0, TAU);
    ctx.fill();
    if (tipo === "payaso") {
        ctx.fillStyle = "#fff";
        for (const dx of [-0.35, 0.25]) ctx.fillRect(dx * s, -s * 0.5, s * 0.16, s);
    }
    if (tipo === "tiburon") {
        ctx.fillStyle = c2;
        ctx.beginPath();
        ctx.moveTo(-s * 0.1, -s * 0.35);
        ctx.lineTo(s * 0.1, -s * 0.85);
        ctx.lineTo(s * 0.3, -s * 0.35);
        ctx.fill();
        ctx.fillStyle = "#fff";
        ctx.beginPath();
        ctx.ellipse(s * 0.2, s * 0.15, s * 0.7, s * 0.2, 0, 0, Math.PI);
        ctx.fill();
    }
    if (tipo === "globo") {
        ctx.fillStyle = "#9c6644";
        for (let k = 0; k < 8; k++) {
            const a = (k / 8) * TAU;
            ctx.fillRect(Math.cos(a) * s * 0.75 - 1, Math.sin(a) * s * 0.7 - 1, 3, 3);
        }
    }
    if (tipo === "ballena") {
        ctx.fillStyle = "#caf0f8";
        ctx.beginPath();
        ctx.ellipse(s * 0.1, s * 0.25, s * 0.8, s * 0.22, 0, 0, Math.PI);
        ctx.fill();
        // Chorrito de agua
        ctx.fillStyle = "#caf0f888";
        ctx.beginPath();
        ctx.arc(s * 0.3, -s * 0.8 - Math.abs(Math.sin(fase * 2)) * 6, 3, 0, TAU);
        ctx.fill();
    }
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(s * 0.55, -s * 0.12, s * 0.16, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "#000";
    ctx.beginPath();
    ctx.arc(s * 0.6, -s * 0.12, s * 0.08, 0, TAU);
    ctx.fill();
    ctx.restore();
}

function dibujar(dt) {
    const { ctx } = lienzo;
    tiempo += dt;
    // Agua y rayos de luz
    const g = ctx.createLinearGradient(0, 0, 0, alto);
    g.addColorStop(0, "#48cae4");
    g.addColorStop(0.5, "#0096c7");
    g.addColorStop(1, "#023e8a");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, ancho, alto);
    ctx.save();
    ctx.globalAlpha = 0.12;
    ctx.fillStyle = "#fff";
    for (let k = 0; k < 4; k++) {
        const x = ((k * 0.3 + Math.sin(tiempo * 0.2 + k) * 0.05) % 1) * ancho;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x + 40, 0);
        ctx.lineTo(x - 20, alto);
        ctx.lineTo(x - 70, alto);
        ctx.fill();
    }
    ctx.restore();
    // Arena con caracoles
    ctx.fillStyle = "#e9c46a";
    ctx.beginPath();
    ctx.moveTo(0, alto);
    for (let x = 0; x <= ancho; x += 20) ctx.lineTo(x, alto - 18 - Math.sin(x / 40) * 6);
    ctx.lineTo(ancho, alto);
    ctx.fill();
    ctx.fillStyle = "#ffafcc";
    for (const fx of [0.15, 0.62, 0.88]) {
        ctx.beginPath();
        ctx.arc(fx * ancho, alto - 12, 5, Math.PI, 0);
        ctx.fill();
    }
    // Algas que se mecen
    for (const a of algas) {
        ctx.strokeStyle = a.color;
        ctx.lineWidth = 6;
        ctx.lineCap = "round";
        ctx.beginPath();
        const x = a.x * ancho;
        ctx.moveTo(x, alto - 14);
        const h = a.alto * alto;
        ctx.quadraticCurveTo(x + Math.sin(tiempo + a.fase) * 14, alto - 14 - h / 2, x + Math.sin(tiempo * 1.3 + a.fase) * 20, alto - 14 - h);
        ctx.stroke();
    }
    // Burbujas
    ctx.strokeStyle = "#ffffff88";
    ctx.lineWidth = 1;
    for (const b of burbujas) {
        b.y -= b.v * dt;
        if (b.y < -0.05) {
            b.y = 1.05;
            b.x = Math.random();
        }
        ctx.beginPath();
        ctx.arc(b.x * ancho + Math.sin(tiempo * 2 + b.r) * 4, b.y * alto, b.r, 0, TAU);
        ctx.stroke();
    }
    // Comida que cae
    for (let i = comida.length - 1; i >= 0; i--) {
        const c = comida[i];
        c.y = Math.min(alto - 20, c.y + 30 * dt);
        c.vida -= dt;
        ctx.fillStyle = "#9c6644";
        ctx.beginPath();
        ctx.arc(c.x, c.y, 2.5, 0, TAU);
        ctx.fill();
        if (c.vida <= 0) comida.splice(i, 1);
    }
    // Peces: si hay comida van hacia ella
    for (const n of nadadores) {
        n.fase += dt;
        const objetivo = comida[0];
        if (objetivo) {
            const dx = objetivo.x / ancho - n.x;
            n.vx += Math.sign(dx) * dt * 0.2;
            n.vx = Math.max(-0.18, Math.min(0.18, n.vx));
            n.y += (objetivo.y / alto - n.y) * dt * 1.2;
            if (Math.abs(dx) < 0.03 && Math.abs(objetivo.y / alto - n.y) < 0.05) {
                comida.shift();
                chispas.emitir(n.x * ancho, n.y * alto, "#ffd166", 5, 60);
            }
        } else {
            if (Math.abs(n.vx) > 0.07) n.vx *= 0.98;
            n.y += (n.objetivoY - n.y) * dt * 0.3;
            if (Math.random() < dt * 0.2) n.objetivoY = 0.22 + Math.random() * 0.58;
        }
        n.x += n.vx * dt;
        if (n.x < 0.05 && n.vx < 0) n.vx = Math.abs(n.vx);
        if (n.x > 0.95 && n.vx > 0) n.vx = -Math.abs(n.vx);
        dibujarPez(ctx, n.tipo, n.x * ancho, n.y * alto + Math.sin(n.fase * 2) * 3, 1, n.vx >= 0 ? 1 : -1, n.fase);
        // A veces suelta una moneda que sube
        if (Math.random() < dt * 0.12) monedasFlotando.push({ x: n.x * ancho, y: n.y * alto, vida: 4 });
    }
    // Monedas que suben (tocarlas da 5 segundos de producción)
    for (let i = monedasFlotando.length - 1; i >= 0; i--) {
        const m = monedasFlotando[i];
        m.vida -= dt;
        m.y -= 18 * dt;
        ctx.globalAlpha = Math.min(1, m.vida);
        ctx.fillStyle = "#ffd166";
        ctx.strokeStyle = "#b8860b";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(m.x, m.y, 7 * Math.abs(Math.cos(tiempo * 3 + i)) + 1, 7, 0, 0, TAU);
        ctx.fill();
        ctx.stroke();
        ctx.globalAlpha = 1;
        if (m.vida <= 0) monedasFlotando.splice(i, 1);
    }
    // Pez dorado
    if (dorado) {
        dorado.t += dt / 8;
        dorado.x = -0.1 + dorado.t * 1.2;
        ctx.save();
        ctx.shadowColor = "#ffd166";
        ctx.shadowBlur = 20;
        dibujarPez(ctx, "dorado", dorado.x * ancho, dorado.y * alto + Math.sin(tiempo * 3) * 8, 1.3, 1, tiempo);
        ctx.restore();
        if (Math.random() < 0.4) chispas.emitir(dorado.x * ancho - 15, dorado.y * alto, "#ffd166", 1, 30);
        if (dorado.t >= 1) {
            dorado = null;
            proximoDorado = 60 + Math.random() * 60;
        }
    } else {
        proximoDorado -= dt;
        if (proximoDorado <= 0) dorado = { t: 0, x: -0.1, y: 0.25 + Math.random() * 0.4 };
    }
    chispas.dibujar(ctx, dt);
}

let acumulado = 0;
bucle((dt) => {
    ganar(porSegundo() * dt);
    dibujar(dt);
    acumulado += dt;
    if (acumulado > 0.2) {
        acumulado = 0;
        actualizar();
    }
});

$("lienzo").addEventListener("pointerdown", (e) => {
    const caja = $("lienzo").getBoundingClientRect();
    const x = e.clientX - caja.left;
    const y = e.clientY - caja.top;
    if (dorado && Math.hypot(dorado.x * ancho - x, dorado.y * alto - y) < 40) {
        impulsoHasta = Date.now() + 20000;
        chispas.emitir(x, y, "#ffd166", 40, 220);
        dorado = null;
        proximoDorado = 70 + Math.random() * 60;
        avisar("✨ ¡Pez dorado! Todo da ×5 por 20 segundos");
        vibrar([40, 40, 80]);
        return;
    }
    const moneda = monedasFlotando.findIndex((m) => Math.hypot(m.x - x, m.y - y) < 22);
    if (moneda >= 0) {
        const premio = Math.max(1, porSegundo() * 5);
        ganar(premio);
        chispas.emitir(x, y, "#ffd166", 10, 90);
        textoFlotante(e.clientX, e.clientY, `+${formatear(premio)}`, "#ffd166");
        monedasFlotando.splice(moneda, 1);
        vibrar(15);
        return;
    }
    // Dar de comer: unas bolitas caen y los peces van a buscarlas
    for (let k = 0; k < 4; k++) comida.push({ x: x + (Math.random() - 0.5) * 20, y: y + (Math.random() - 0.5) * 8, vida: 8 });
    const premio = 1 + porSegundo() * 0.05;
    ganar(premio);
    textoFlotante(e.clientX, e.clientY, `+${formatear(premio)}`, "#caf0f8");
    vibrar(6);
});

// ---------- Lista ----------
const filas = PECES.map((p, k) => {
    const el = document.createElement("div");
    el.className = "fila-a";
    el.innerHTML = `<canvas width="104" height="80"></canvas><span class="txt"><span class="nom"></span><small></small></span><button type="button"></button>`;
    const ctx = el.querySelector("canvas").getContext("2d");
    ctx.scale(2, 2);
    dibujarPez(ctx, p.id, 26, p.id === "medusa" ? 14 : 20, Math.min(1, 1.2 / p.tam), 1, 0.3);
    el.querySelector("button").addEventListener("click", () => {
        const n = cuantas(p);
        const costo = costoDe(p, n);
        if (estado.monedas < costo) return;
        estado.monedas -= costo;
        const antes = cantidad(p);
        estado.peces[p.id] += n;
        if (!antes) avisar(`¡Llegó ${p.nombre === "Medusa" || p.nombre === "Tortuga" || p.nombre === "Ballena" ? "una" : "un"} ${p.nombre.toLowerCase()}!`);
        if (HITOS.some((h) => antes < h && cantidad(p) >= h)) avisar(`¡${p.nombre} ahora da el doble!`);
        sincronizarNadadores();
        vibrar(20);
        actualizar();
    });
    $("lista").appendChild(el);
    return { p, el, k };
});

function actualizar() {
    $("monedas").textContent = `🪙 ${formatear(Math.floor(estado.monedas))}`;
    $("por-segundo").textContent = `${formatear(porSegundo())} por segundo${impulsoHasta > Date.now() ? " · ✨×5" : ""} · tocá el agua para dar de comer`;
    $("conchas").textContent = estado.conchas;
    for (const { p, el, k } of filas) {
        const n = cuantas(p);
        const costo = costoDe(p, n);
        const hito = HITOS.find((h) => cantidad(p) < h);
        el.classList.toggle("oculta", k > 0 && !cantidad(PECES[k - 1]) && !cantidad(p));
        el.querySelector(".nom").innerHTML = `${p.nombre} ${cantidad(p) ? `<em>×${cantidad(p)}</em>` : ""}`;
        el.querySelector("small").textContent = cantidad(p) ? `${formatear(daDe(p))}/s${hito ? ` · ×2 al tener ${hito}` : ""}` : `Da ${formatear(p.da * multiplicador())}/s cada uno`;
        const b = el.querySelector("button");
        b.textContent = `${cantidad(p) ? "+" + n : "Comprar"} · ${formatear(costo)}`;
        b.disabled = estado.monedas < costo;
    }
}

function avisar(texto) {
    $("aviso").innerHTML = `<div class="chico">${texto}</div>`;
    $("aviso").hidden = false;
    clearTimeout(avisar.t);
    avisar.t = setTimeout(() => ($("aviso").hidden = true), 1800);
}

for (const b of document.querySelectorAll(".cantidad")) {
    b.addEventListener("click", () => {
        compraDe = b.dataset.cantidad;
        for (const x of document.querySelectorAll(".cantidad")) x.classList.toggle("activa", x === b);
        actualizar();
    });
}

// ---------- Acuario nuevo (prestigio) ----------
$("abrir-nuevo").addEventListener("click", () => {
    $("conchas-nuevas").textContent = conchasNuevas();
    $("confirmar-nuevo").disabled = conchasNuevas() < 1;
    $("nuevo").hidden = false;
});
$("cancelar-nuevo").addEventListener("click", () => ($("nuevo").hidden = true));
$("confirmar-nuevo").addEventListener("click", () => {
    const nuevas = conchasNuevas();
    if (nuevas < 1) return;
    estado.conchas += nuevas;
    estado.monedas = 10;
    estado.total = 0;
    for (const p of PECES) estado.peces[p.id] = 0;
    sincronizarNadadores();
    $("nuevo").hidden = true;
    avisar(`🐚 ¡Acuario nuevo! Todo da ×${(1 + estado.conchas * 0.1).toFixed(1)}`);
    guardarProgreso();
    actualizar();
});

// ---------- Guardado ----------
function guardarProgreso() {
    estado.ultimaVez = Date.now();
    guardar(CLAVE, estado);
}
setInterval(guardarProgreso, 5000);
document.addEventListener("visibilitychange", guardarProgreso);
addEventListener("pagehide", guardarProgreso);

const ausente = Math.min((Date.now() - estado.ultimaVez) / 1000, MAX_HORAS * 3600);
const ganado = porSegundo() * ausente;
if (ganado >= 1 && ausente > 30) {
    ganar(ganado);
    setTimeout(() => avisar(`Mientras no estabas los peces juntaron 🪙 ${formatear(ganado)}`), 400);
}
sincronizarNadadores();
actualizar();
