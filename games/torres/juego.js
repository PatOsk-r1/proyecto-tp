// Defensa de torres: los monstruos siguen el camino; las torres los atacan. Cada oleada es más fuerte.
import { cargar, guardar, vibrar } from "../../js/comun3d.js";
import { crearLienzo, bucle, crearChispas } from "../../js/lienzo2d.js";

const $ = (id) => document.getElementById(id);
const CLAVE = "torres";
const COLUMNAS = 9;
const FILAS = 13;
// Camino por casillas (columna, fila): entra arriba y sale abajo al castillo
const PUNTOS_CAMINO = [[-1, 1], [6, 1], [6, 4], [2, 4], [2, 7], [7, 7], [7, 10], [4, 10], [4, 13]];

const TORRES = {
    canon: { costo: 50, alcance: 2.2, cadencia: 0.9, dano: 22, color: "#8d99ae", bala: "#2b2d42" },
    hielo: { costo: 70, alcance: 2.0, cadencia: 1.0, dano: 6, lento: 0.5, color: "#4cc9f0", bala: "#caf0f8" },
    laser: { costo: 90, alcance: 2.6, cadencia: 0.22, dano: 7, color: "#ff4d6d", bala: "#ff4d6d" },
    mortero: { costo: 120, alcance: 3.2, cadencia: 2.0, dano: 40, area: 1.1, color: "#ffb703", bala: "#6c584c" },
};
const ENEMIGOS = {
    comun: { vida: 40, velocidad: 1.1, oro: 6, color: "#7209b7", radio: 0.28 },
    rapido: { vida: 25, velocidad: 2.0, oro: 7, color: "#f72585", radio: 0.22 },
    tanque: { vida: 160, velocidad: 0.6, oro: 18, color: "#3a0ca3", radio: 0.38 },
    jefe: { vida: 900, velocidad: 0.5, oro: 120, color: "#d00000", radio: 0.46 },
};

const estado = cargar(CLAVE, { record: 0 });
const chispas = crearChispas();
let juego = null;
let elegida = "canon";
let torreSeleccionada = null;
let celda = 30;
let origenX = 0;
let origenY = 0;

const lienzo = crearLienzo($("lienzo"), ({ ancho, alto }) => {
    celda = Math.min(ancho / COLUMNAS, alto / FILAS);
    origenX = (ancho - COLUMNAS * celda) / 2;
    origenY = (alto - FILAS * celda) / 2;
});

// Casillas que ocupa el camino (no se puede construir ahí)
const caminoCasillas = new Set();
for (let k = 0; k < PUNTOS_CAMINO.length - 1; k++) {
    const [c1, f1] = PUNTOS_CAMINO[k];
    const [c2, f2] = PUNTOS_CAMINO[k + 1];
    for (let c = Math.min(c1, c2); c <= Math.max(c1, c2); c++) for (let f = Math.min(f1, f2); f <= Math.max(f1, f2); f++) caminoCasillas.add(`${c},${f}`);
}
const largosTramo = PUNTOS_CAMINO.slice(1).map(([c, f], k) => Math.hypot(c - PUNTOS_CAMINO[k][0], f - PUNTOS_CAMINO[k][1]));
const largoTotal = largosTramo.reduce((a, b) => a + b, 0);

// Posición (en casillas) a cierta distancia recorrida del camino
function posicionEn(d) {
    for (let k = 0; k < largosTramo.length; k++) {
        if (d <= largosTramo[k]) {
            const t = d / largosTramo[k];
            const [c1, f1] = PUNTOS_CAMINO[k];
            const [c2, f2] = PUNTOS_CAMINO[k + 1];
            return { x: c1 + (c2 - c1) * t + 0.5, y: f1 + (f2 - f1) * t + 0.5 };
        }
        d -= largosTramo[k];
    }
    return { x: 4.5, y: 13.5 };
}

function nuevo() {
    juego = { oro: 150, vidas: 20, oleada: 0, torres: [], enemigos: [], balas: [], cola: [], esperando: true, velocidad: 1, vivo: true, proximo: 0 };
    torreSeleccionada = null;
    $("panel-torre").hidden = true;
    pintarDatos();
}

function lanzarOleada() {
    if (!juego?.vivo || !juego.esperando) return;
    juego.oleada++;
    juego.esperando = false;
    const n = juego.oleada;
    const fuerza = 1 + n * 0.22;
    const cola = [];
    const cantidad = 6 + n * 2;
    for (let i = 0; i < cantidad; i++) {
        let tipo = "comun";
        if (n >= 3 && i % 4 === 3) tipo = "rapido";
        if (n >= 5 && i % 6 === 5) tipo = "tanque";
        cola.push({ tipo, fuerza, espera: 0.7 });
    }
    if (n % 5 === 0) cola.push({ tipo: "jefe", fuerza, espera: 1.5 });
    juego.cola = cola;
    juego.proximo = 0.5;
    pintarDatos();
}

function paso(dt) {
    // Aparición de enemigos
    if (juego.cola.length) {
        juego.proximo -= dt;
        if (juego.proximo <= 0) {
            const e = juego.cola.shift();
            const base = ENEMIGOS[e.tipo];
            juego.enemigos.push({ tipo: e.tipo, recorrido: 0, vida: base.vida * e.fuerza, maxVida: base.vida * e.fuerza, lentoHasta: 0 });
            juego.proximo = e.espera;
        }
    }
    const ahora = performance.now() / 1000;
    for (const e of juego.enemigos) {
        const base = ENEMIGOS[e.tipo];
        const lento = e.lentoHasta > ahora ? 0.5 : 1;
        e.recorrido += base.velocidad * lento * dt;
        Object.assign(e, posicionEn(e.recorrido));
        if (e.recorrido >= largoTotal) {
            e.fuera = true;
            juego.vidas -= e.tipo === "jefe" ? 5 : 1;
            vibrar(80);
            if (juego.vidas <= 0) return fin();
        }
    }
    juego.enemigos = juego.enemigos.filter((e) => !e.fuera && e.vida > 0);

    // Torres
    for (const t of juego.torres) {
        const datos = TORRES[t.tipo];
        t.recarga -= dt;
        const alcance = datos.alcance * (1 + (t.nivel - 1) * 0.12);
        const objetivo = juego.enemigos
            .filter((e) => Math.hypot(e.x - t.x, e.y - t.y) <= alcance)
            .sort((a, b) => b.recorrido - a.recorrido)[0];
        if (!objetivo) continue;
        t.angulo = Math.atan2(objetivo.y - t.y, objetivo.x - t.x);
        if (t.recarga > 0) continue;
        t.recarga = datos.cadencia / (1 + (t.nivel - 1) * 0.15);
        const dano = datos.dano * (1 + (t.nivel - 1) * 0.6);
        juego.balas.push({ x: t.x, y: t.y, objetivo, dano, tipo: t.tipo, velocidad: t.tipo === "laser" ? 18 : t.tipo === "mortero" ? 5 : 9 });
    }

    // Balas
    for (const b of juego.balas) {
        const o = b.objetivo;
        const dx = o.x - b.x;
        const dy = o.y - b.y;
        const d = Math.hypot(dx, dy);
        if (d < 0.2 || o.vida <= 0) {
            b.usada = true;
            impactar(b);
            continue;
        }
        b.x += (dx / d) * b.velocidad * dt;
        b.y += (dy / d) * b.velocidad * dt;
    }
    juego.balas = juego.balas.filter((b) => !b.usada);

    if (!juego.cola.length && !juego.enemigos.length && !juego.esperando) {
        juego.esperando = true;
        juego.oro += 20 + juego.oleada * 4;
        pintarDatos();
    }
}

function impactar(b) {
    const datos = TORRES[b.tipo];
    const victimas = datos.area ? juego.enemigos.filter((e) => Math.hypot(e.x - b.objetivo.x, e.y - b.objetivo.y) <= datos.area) : [b.objetivo];
    if (datos.area) chispas.emitir(origenX + b.objetivo.x * celda, origenY + b.objetivo.y * celda, "#ffb703", 14, 140);
    for (const e of victimas) {
        if (e.vida <= 0) continue;
        e.vida -= b.dano;
        if (datos.lento) e.lentoHasta = performance.now() / 1000 + 1.6;
        if (e.vida <= 0) {
            juego.oro += ENEMIGOS[e.tipo].oro;
            chispas.emitir(origenX + e.x * celda, origenY + e.y * celda, ENEMIGOS[e.tipo].color, 12, 150);
            pintarDatos();
        }
    }
}

function fin() {
    juego.vivo = false;
    const nuevoRecord = juego.oleada > estado.record;
    if (nuevoRecord) estado.record = juego.oleada;
    guardar(CLAVE, estado);
    vibrar(200);
    $("titulo-centro").innerHTML = `${nuevoRecord ? "¡Nuevo récord!" : "Cayó el castillo"}<div class="chico">Llegaste a la oleada ${juego.oleada}</div>`;
    $("jugar").textContent = "Otra vez";
    $("centro").hidden = false;
    pintarDatos();
}

function pintarDatos() {
    $("oleada").textContent = juego?.oleada ?? 0;
    $("vidas").textContent = juego?.vidas ?? 20;
    $("oro").textContent = juego?.oro ?? 150;
    $("record").textContent = estado.record;
    for (const b of document.querySelectorAll(".torre-btn")) {
        b.classList.toggle("elegida", b.dataset.tipo === elegida);
        b.disabled = (juego?.oro ?? 0) < TORRES[b.dataset.tipo].costo;
    }
    $("oleada-btn").disabled = !juego?.esperando;
    $("oleada-btn").textContent = juego?.esperando ? "▶ Oleada" : "En curso…";
    if (torreSeleccionada) {
        $("mejorar").textContent = `Mejorar (${costoMejora(torreSeleccionada)})`;
        $("mejorar").disabled = torreSeleccionada.nivel >= 5 || juego.oro < costoMejora(torreSeleccionada);
        $("vender").textContent = `Vender (+${valorVenta(torreSeleccionada)})`;
    }
}

const costoMejora = (t) => Math.round(TORRES[t.tipo].costo * 0.8 * t.nivel);
const valorVenta = (t) => Math.round(TORRES[t.tipo].costo * 0.6 * t.nivel);

// ---------- Dibujo ----------
function dibujar(dt) {
    const { ctx, ancho, alto } = lienzo;
    ctx.fillStyle = "#1a2e14";
    ctx.fillRect(0, 0, ancho, alto);
    for (let f = 0; f < FILAS; f++) {
        for (let c = 0; c < COLUMNAS; c++) {
            const x = origenX + c * celda;
            const y = origenY + f * celda;
            const camino = caminoCasillas.has(`${c},${f}`);
            ctx.fillStyle = camino ? ((c + f) % 2 ? "#c9a46b" : "#d4b07a") : (c + f) % 2 ? "#4f8a3a" : "#5a9a43";
            ctx.fillRect(x, y, celda, celda);
        }
    }
    // Castillo a la salida
    const cx = origenX + 4.5 * celda;
    const cy = origenY + 12.6 * celda;
    ctx.fillStyle = "#adb5bd";
    ctx.fillRect(cx - celda * 0.7, cy - celda * 0.4, celda * 1.4, celda * 0.6);
    for (const dx of [-0.7, -0.15, 0.4]) ctx.fillRect(cx + dx * celda, cy - celda * 0.6, celda * 0.3, celda * 0.25);
    if (!juego) return;

    for (const t of juego.torres) {
        const datos = TORRES[t.tipo];
        const x = origenX + t.x * celda;
        const y = origenY + t.y * celda;
        if (t === torreSeleccionada) {
            ctx.strokeStyle = "#ffffff66";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(x, y, datos.alcance * (1 + (t.nivel - 1) * 0.12) * celda, 0, Math.PI * 2);
            ctx.stroke();
        }
        ctx.fillStyle = "#3d405b";
        ctx.beginPath();
        ctx.arc(x, y, celda * 0.42, 0, Math.PI * 2);
        ctx.fill();
        const g = ctx.createRadialGradient(x - celda * 0.1, y - celda * 0.1, 1, x, y, celda * 0.34);
        g.addColorStop(0, "#fff");
        g.addColorStop(1, datos.color);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, y, celda * 0.32, 0, Math.PI * 2);
        ctx.fill();
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(t.angulo ?? -Math.PI / 2);
        ctx.fillStyle = "#2b2d42";
        ctx.fillRect(0, -celda * 0.07, celda * 0.42, celda * 0.14);
        ctx.restore();
        for (let k = 0; k < t.nivel; k++) {
            ctx.fillStyle = "#ffd23f";
            ctx.fillRect(x - celda * 0.3 + k * celda * 0.13, y + celda * 0.3, celda * 0.1, celda * 0.08);
        }
    }

    for (const e of juego.enemigos) {
        const base = ENEMIGOS[e.tipo];
        const x = origenX + e.x * celda;
        const y = origenY + e.y * celda;
        const r = base.radio * celda;
        const g = ctx.createRadialGradient(x - r / 3, y - r / 3, 1, x, y, r);
        g.addColorStop(0, "#fff");
        g.addColorStop(0.3, base.color);
        g.addColorStop(1, "#10002b");
        ctx.fillStyle = e.lentoHasta > performance.now() / 1000 ? "#90e0ef" : g;
        ctx.beginPath();
        ctx.arc(x, y + Math.sin(e.recorrido * 8) * 1.5, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#fff";
        ctx.beginPath();
        ctx.arc(x - r * 0.3, y - r * 0.15, r * 0.22, 0, Math.PI * 2);
        ctx.arc(x + r * 0.3, y - r * 0.15, r * 0.22, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#000";
        ctx.fillRect(x - r, y - r - 8, r * 2, 4);
        ctx.fillStyle = "#7ee08f";
        ctx.fillRect(x - r, y - r - 8, r * 2 * Math.max(0, e.vida / e.maxVida), 4);
    }

    for (const b of juego.balas) {
        const datos = TORRES[b.tipo];
        ctx.fillStyle = datos.bala;
        ctx.shadowColor = datos.bala;
        ctx.shadowBlur = b.tipo === "laser" ? 10 : 0;
        ctx.beginPath();
        ctx.arc(origenX + b.x * celda, origenY + b.y * celda, celda * (b.tipo === "mortero" ? 0.14 : 0.08), 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.shadowBlur = 0;
    chispas.dibujar(ctx, dt);
}

bucle((dt) => {
    if (juego?.vivo && $("centro").hidden) for (let i = 0; i < juego.velocidad; i++) paso(dt);
    dibujar(dt);
});

// ---------- Controles ----------
$("lienzo").addEventListener("pointerdown", (e) => {
    if (!juego?.vivo) return;
    const caja = $("lienzo").getBoundingClientRect();
    const c = Math.floor((e.clientX - caja.left - origenX) / celda);
    const f = Math.floor((e.clientY - caja.top - origenY) / celda);
    if (c < 0 || f < 0 || c >= COLUMNAS || f >= FILAS) return;
    const existente = juego.torres.find((t) => t.c === c && t.f === f);
    if (existente) {
        torreSeleccionada = existente;
        $("panel-torre").hidden = false;
        return pintarDatos();
    }
    torreSeleccionada = null;
    $("panel-torre").hidden = true;
    if (caminoCasillas.has(`${c},${f}`)) return;
    const datos = TORRES[elegida];
    if (juego.oro < datos.costo) return vibrar(40);
    juego.oro -= datos.costo;
    juego.torres.push({ tipo: elegida, c, f, x: c + 0.5, y: f + 0.5, nivel: 1, recarga: 0 });
    chispas.emitir(origenX + (c + 0.5) * celda, origenY + (f + 0.5) * celda, datos.color, 10, 100);
    vibrar(20);
    pintarDatos();
});

for (const b of document.querySelectorAll(".torre-btn")) {
    b.addEventListener("click", () => {
        elegida = b.dataset.tipo;
        pintarDatos();
    });
}
$("mejorar").addEventListener("click", () => {
    const t = torreSeleccionada;
    if (!t || t.nivel >= 5 || juego.oro < costoMejora(t)) return;
    juego.oro -= costoMejora(t);
    t.nivel++;
    vibrar(30);
    pintarDatos();
});
$("vender").addEventListener("click", () => {
    const t = torreSeleccionada;
    if (!t) return;
    juego.oro += valorVenta(t);
    juego.torres = juego.torres.filter((x) => x !== t);
    torreSeleccionada = null;
    $("panel-torre").hidden = true;
    pintarDatos();
});
$("cerrar-panel").addEventListener("click", () => {
    torreSeleccionada = null;
    $("panel-torre").hidden = true;
});
$("oleada-btn").addEventListener("click", lanzarOleada);
$("velocidad").addEventListener("click", () => {
    if (!juego) return;
    juego.velocidad = juego.velocidad === 1 ? 2 : 1;
    $("velocidad").textContent = `×${juego.velocidad}`;
});
$("jugar").addEventListener("click", () => {
    $("centro").hidden = true;
    chispas.limpiar();
    nuevo();
    $("velocidad").textContent = "×1";
});
pintarDatos();
