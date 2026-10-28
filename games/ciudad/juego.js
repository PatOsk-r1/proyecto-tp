// Ciudad: construí edificios en un terreno en perspectiva. Cada uno produce plata, se mejora y crece.
// Los parques potencian a sus vecinos y las tiendas ganan más al lado de casas. Fundar otra ciudad da llaves.
import { formatear, cargar, guardar, textoFlotante, vibrar } from "../../js/comun3d.js";
import { crearLienzo, bucle, crearChispas } from "../../js/lienzo2d.js";

const $ = (id) => document.getElementById(id);
const CLAVE = "ciudad";
const COLS = 6;
const FILAS = 7;
const MAX_NIVEL = 10;
const MAX_HORAS = 4;

const EDIFICIOS = {
    casa: { nombre: "Casa", costo: 15, produce: 1, alto: 0.5, colores: ["#ffcad4", "#f4acb7", "#e5989b"], techo: "#d62828", detalle: "Gente que paga impuestos" },
    tienda: { nombre: "Tienda", costo: 150, produce: 9, alto: 0.6, colores: ["#bde0fe", "#a2d2ff", "#7fb3e6"], techo: "#457b9d", detalle: "+25% por cada casa vecina" },
    parque: { nombre: "Parque", costo: 400, produce: 0, alto: 0, colores: ["#95d5b2", "#74c69d", "#52b788"], techo: "#2d6a4f", detalle: "+20% a todos sus vecinos" },
    fabrica: { nombre: "Fábrica", costo: 2000, produce: 70, alto: 0.8, colores: ["#adb5bd", "#868e96", "#6c757d"], techo: "#495057", detalle: "Produce mucho" },
    oficina: { nombre: "Oficinas", costo: 18000, produce: 480, alto: 1.4, colores: ["#90e0ef", "#48cae4", "#0096c7"], techo: "#023e8a", detalle: "Torre de vidrio" },
    estadio: { nombre: "Estadio", costo: 200000, produce: 4800, alto: 0.7, colores: ["#ffd166", "#f4a261", "#e76f51"], techo: "#2a9d8f", detalle: "+10% a toda la ciudad" },
    rascacielos: { nombre: "Rascacielos", costo: 2.5e6, produce: 55000, alto: 2.4, colores: ["#cdb4db", "#b392ac", "#735d78"], techo: "#ffd166", detalle: "El orgullo de la ciudad" },
};
const TIPOS = Object.keys(EDIFICIOS);

const estado = cargar(CLAVE, { plata: 20, total: 0, llaves: 0, terreno: [], ultimaVez: Date.now() });
if (estado.terreno.length !== COLS * FILAS) estado.terreno = Array(COLS * FILAS).fill(null);
let elegida = -1;

// ---------- Producción ----------
const vecinos = (i) => {
    const c = i % COLS;
    const f = Math.floor(i / COLS);
    return [[c - 1, f], [c + 1, f], [c, f - 1], [c, f + 1]].filter(([x, y]) => x >= 0 && y >= 0 && x < COLS && y < FILAS).map(([x, y]) => y * COLS + x);
};
const cantidadDe = (tipo) => estado.terreno.filter((t) => t?.tipo === tipo).length;
const multiplicador = () => (1 + estado.llaves * 0.15) * (1 + cantidadDe("estadio") * 0.1);
function produceEn(i) {
    const t = estado.terreno[i];
    if (!t || !EDIFICIOS[t.tipo].produce) return 0;
    let p = EDIFICIOS[t.tipo].produce * t.nivel * 1.25 ** (t.nivel - 1);
    const vs = vecinos(i).map((v) => estado.terreno[v]);
    if (t.tipo === "tienda") p *= 1 + 0.25 * vs.filter((v) => v?.tipo === "casa").length;
    p *= 1 + 0.2 * vs.filter((v) => v?.tipo === "parque").reduce((s, v) => s + v.nivel, 0) ** 0.5;
    return p * multiplicador();
}
const porSegundo = () => estado.terreno.reduce((s, _, i) => s + produceEn(i), 0);
// El primer edificio de cada tipo es barato; los siguientes cuestan más
const costoConstruir = (tipo) => Math.round(EDIFICIOS[tipo].costo * 1.35 ** cantidadDe(tipo));
const costoMejora = (t) => Math.round(EDIFICIOS[t.tipo].costo * 0.8 * 1.9 ** t.nivel);
const llavesNuevas = () => Math.floor(Math.sqrt(estado.total / 1e6));
function ganar(n) {
    estado.plata += n;
    estado.total += n;
}

// ---------- Dibujo isométrico ----------
const chispas = crearChispas();
let ancho = 300;
let alto = 300;
let tw = 50;
let ox = 0;
let oy = 0;
const lienzo = crearLienzo($("lienzo"), (d) => {
    ancho = d.ancho;
    alto = d.alto;
    tw = Math.min((ancho * 0.96) / ((COLS + FILAS) / 2), (alto * 0.82) / ((COLS + FILAS) / 4 + 1.5));
    ox = ancho / 2 - ((COLS - FILAS) * tw) / 4;
    // Centra el terreno a lo alto, dejando lugar arriba para los edificios altos
    const altoTerreno = ((COLS + FILAS - 2) * tw) / 4;
    oy = Math.max(tw * 1.6, (alto - altoTerreno) / 2 + tw * 0.5);
});
const th = () => tw / 2;
// Centro de la casilla (c, f) en pantalla
const aPantalla = (c, f) => ({ x: ox + ((c - f) * tw) / 2, y: oy + ((c + f) * th()) / 2 });
let tiempo = 0;
const autos = Array.from({ length: 5 }, () => ({ t: Math.random(), v: 0.04 + Math.random() * 0.04, c: ["#e63946", "#ffd166", "#4cc9f0", "#fff"][Math.floor(Math.random() * 4)] }));

function rombo(ctx, x, y, color, borde) {
    ctx.beginPath();
    ctx.moveTo(x, y - th() / 2);
    ctx.lineTo(x + tw / 2, y);
    ctx.lineTo(x, y + th() / 2);
    ctx.lineTo(x - tw / 2, y);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    if (borde) {
        ctx.strokeStyle = borde;
        ctx.lineWidth = 1;
        ctx.stroke();
    }
}

// Prisma: caja con techo, para casi todos los edificios
function caja(ctx, x, y, w, altura, [arriba, izq, der], ventanas) {
    const hw = w / 2;
    const hh = w / 4;
    // Lado izquierdo
    ctx.fillStyle = izq;
    ctx.beginPath();
    ctx.moveTo(x - hw, y);
    ctx.lineTo(x, y + hh);
    ctx.lineTo(x, y + hh - altura);
    ctx.lineTo(x - hw, y - altura);
    ctx.closePath();
    ctx.fill();
    // Lado derecho
    ctx.fillStyle = der;
    ctx.beginPath();
    ctx.moveTo(x + hw, y);
    ctx.lineTo(x, y + hh);
    ctx.lineTo(x, y + hh - altura);
    ctx.lineTo(x + hw, y - altura);
    ctx.closePath();
    ctx.fill();
    // Techo
    ctx.fillStyle = arriba;
    ctx.beginPath();
    ctx.moveTo(x, y - hh - altura);
    ctx.lineTo(x + hw, y - altura);
    ctx.lineTo(x, y + hh - altura);
    ctx.lineTo(x - hw, y - altura);
    ctx.closePath();
    ctx.fill();
    if (ventanas) {
        const pisos = Math.max(1, Math.floor(altura / (w * 0.18)));
        for (let p = 0; p < pisos; p++) {
            for (let k = 0; k < 2; k++) {
                const prendida = (p * 3 + k * 7 + Math.floor(tiempo * 0.5)) % 5 !== 0;
                ctx.fillStyle = prendida ? "#fff3b0cc" : "#0004";
                const fy = y - (p + 0.6) * (altura / pisos);
                // Ventanas en las dos caras
                ctx.fillRect(x - hw * (0.75 - k * 0.4) - 2, fy + hh * (0.25 + k * 0.4) * 0.5, 4, 5);
                ctx.fillRect(x + hw * (0.35 + k * 0.4) - 2, fy + hh * (0.65 - k * 0.4) * 0.5, 4, 5);
            }
        }
    }
}

function dibujarEdificio(ctx, tipo, nivel, x, y, escala = 1) {
    const e = EDIFICIOS[tipo];
    const w = tw * 0.72 * escala;
    const altura = tw * e.alto * (1 + (nivel - 1) * 0.18) * escala;
    if (tipo === "parque") {
        for (const [dx, dy, r] of [[-0.18, 0, 0.16], [0.16, -0.04, 0.14], [0, 0.08, 0.12]]) {
            const px = x + dx * tw * escala;
            const py = y + dy * tw * escala;
            ctx.fillStyle = "#6f4518";
            ctx.fillRect(px - 1.5, py - tw * 0.12 * escala, 3, tw * 0.12 * escala);
            ctx.fillStyle = "#2d6a4f";
            ctx.beginPath();
            ctx.arc(px, py - tw * 0.18 * escala, r * tw * escala * (0.8 + nivel * 0.04), 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.fillStyle = "#4cc9f0";
        ctx.beginPath();
        ctx.ellipse(x + tw * 0.12 * escala, y + tw * 0.1 * escala, tw * 0.1 * escala, tw * 0.05 * escala, 0, 0, Math.PI * 2);
        ctx.fill();
        return;
    }
    if (tipo === "estadio") {
        caja(ctx, x, y, w * 1.2, altura, e.colores, false);
        ctx.fillStyle = "#52b788";
        ctx.beginPath();
        ctx.ellipse(x, y - altura, w * 0.35, w * 0.17, 0, 0, Math.PI * 2);
        ctx.fill();
        return;
    }
    caja(ctx, x, y, w, altura, e.colores, tipo !== "casa");
    if (tipo === "casa") {
        // Techo a dos aguas
        ctx.fillStyle = e.techo;
        ctx.beginPath();
        ctx.moveTo(x - w / 2, y - altura);
        ctx.lineTo(x, y - altura - w * 0.38);
        ctx.lineTo(x + w / 2, y - altura);
        ctx.lineTo(x, y - altura + w / 4);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "#6f4518";
        ctx.fillRect(x - w * 0.22, y - altura * 0.45, w * 0.12, altura * 0.45);
    } else if (tipo === "fabrica") {
        ctx.fillStyle = "#6c757d";
        ctx.fillRect(x + w * 0.12, y - altura - w * 0.5, w * 0.12, w * 0.5);
        // Humo
        for (let k = 0; k < 3; k++) {
            const t = (tiempo * 0.5 + k / 3) % 1;
            ctx.fillStyle = `rgba(220,220,220,${0.5 - t * 0.5})`;
            ctx.beginPath();
            ctx.arc(x + w * 0.18 + t * 10, y - altura - w * 0.55 - t * 26, 4 + t * 6, 0, Math.PI * 2);
            ctx.fill();
        }
    } else if (tipo === "rascacielos") {
        ctx.strokeStyle = "#adb5bd";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x, y - altura - w / 4);
        ctx.lineTo(x, y - altura - w * 0.7);
        ctx.stroke();
        ctx.fillStyle = Math.sin(tiempo * 4) > 0 ? "#ff4d6d" : "#7a0010";
        ctx.beginPath();
        ctx.arc(x, y - altura - w * 0.72, 2.5, 0, Math.PI * 2);
        ctx.fill();
    }
}

function dibujar(dt) {
    const { ctx } = lienzo;
    tiempo += dt;
    const g = ctx.createLinearGradient(0, 0, 0, alto);
    g.addColorStop(0, "#1d3557");
    g.addColorStop(1, "#457b9d");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, ancho, alto);
    // Nubes
    ctx.fillStyle = "#ffffff18";
    for (let k = 0; k < 3; k++) {
        const x = ((tiempo * 6 + k * 160) % (ancho + 120)) - 60;
        ctx.beginPath();
        ctx.arc(x, 40 + k * 18, 22, 0, Math.PI * 2);
        ctx.arc(x + 22, 36 + k * 18, 16, 0, Math.PI * 2);
        ctx.fill();
    }
    // Base de tierra debajo del terreno
    const esq = [aPantalla(-0.5, -0.5), aPantalla(COLS - 0.5, -0.5), aPantalla(COLS - 0.5, FILAS - 0.5), aPantalla(-0.5, FILAS - 0.5)];
    ctx.fillStyle = "#6f4518";
    ctx.beginPath();
    ctx.moveTo(esq[3].x, esq[3].y);
    ctx.lineTo(esq[2].x, esq[2].y);
    ctx.lineTo(esq[1].x, esq[1].y);
    ctx.lineTo(esq[1].x, esq[1].y + tw * 0.25);
    ctx.lineTo(esq[2].x, esq[2].y + tw * 0.25);
    ctx.lineTo(esq[3].x, esq[3].y + tw * 0.25);
    ctx.closePath();
    ctx.fill();
    // Casillas de pasto (de atrás hacia adelante)
    for (let f = 0; f < FILAS; f++) {
        for (let c = 0; c < COLS; c++) {
            const i = f * COLS + c;
            const p = aPantalla(c, f);
            rombo(ctx, p.x, p.y, (c + f) % 2 ? "#74c69d" : "#6ab88f", "#40916c55");
            if (i === elegida) rombo(ctx, p.x, p.y, `rgba(255,209,102,${0.35 + Math.sin(tiempo * 6) * 0.15})`, "#ffd166");
        }
    }
    // Autitos dando vuelta alrededor del terreno
    for (const a of autos) {
        a.t = (a.t + a.v * dt) % 1;
        const lados = [[esq[0], esq[1]], [esq[1], esq[2]], [esq[2], esq[3]], [esq[3], esq[0]]];
        const k = Math.floor(a.t * 4);
        const tt = a.t * 4 - k;
        const [p0, p1] = lados[k];
        ctx.fillStyle = a.c;
        ctx.fillRect(p0.x + (p1.x - p0.x) * tt - 3, p0.y + (p1.y - p0.y) * tt - 4, 6, 4);
    }
    // Edificios ordenados por profundidad
    for (let suma = 0; suma <= COLS + FILAS - 2; suma++) {
        for (let c = 0; c < COLS; c++) {
            const f = suma - c;
            if (f < 0 || f >= FILAS) continue;
            const t = estado.terreno[f * COLS + c];
            if (!t) continue;
            const p = aPantalla(c, f);
            const crece = Math.min(1, (t.crece ?? 1));
            dibujarEdificio(ctx, t.tipo, t.nivel, p.x, p.y, 0.4 + crece * 0.6);
            if (t.crece !== undefined && t.crece < 1) t.crece += dt * 3;
            // Nivel en estrellas chiquitas
            if (t.nivel > 1) {
                ctx.fillStyle = "#ffd166";
                ctx.font = "900 9px sans-serif";
                ctx.textAlign = "center";
                ctx.fillText(`★${t.nivel}`, p.x, p.y + th() * 0.45);
            }
        }
    }
    chispas.dibujar(ctx, dt);
}

let acumulado = 0;
let monedaVisual = 0;
bucle((dt) => {
    ganar(porSegundo() * dt);
    dibujar(dt);
    acumulado += dt;
    monedaVisual += dt;
    // Cada tanto un edificio "paga" con un destello
    if (monedaVisual > 1.2) {
        monedaVisual = 0;
        const ocupadas = estado.terreno.map((t, i) => (t && produceEn(i) ? i : -1)).filter((i) => i >= 0);
        if (ocupadas.length) {
            const i = ocupadas[Math.floor(Math.random() * ocupadas.length)];
            const p = aPantalla(i % COLS, Math.floor(i / COLS));
            chispas.emitir(p.x, p.y - tw * 0.5, "#ffd166", 5, 60);
        }
    }
    if (acumulado > 0.25) {
        acumulado = 0;
        actualizar();
    }
});

// ---------- Toques ----------
function casillaEn(px, py) {
    // Pasa de pantalla a coordenadas de la grilla
    const dx = (px - ox) / (tw / 2);
    const dy = (py - oy) / (th() / 2);
    const c = Math.round((dx + dy) / 2);
    const f = Math.round((dy - dx) / 2);
    return c >= 0 && f >= 0 && c < COLS && f < FILAS ? f * COLS + c : -1;
}
$("lienzo").addEventListener("pointerdown", (e) => {
    const caja = $("lienzo").getBoundingClientRect();
    const i = casillaEn(e.clientX - caja.left, e.clientY - caja.top);
    if (i < 0) return;
    elegida = i;
    vibrar(8);
    pintarPanel();
});

// ---------- Panel ----------
function retrato(tipo, nivel = 1) {
    const c = document.createElement("canvas");
    c.width = 92;
    c.height = 92;
    const ctx = c.getContext("2d");
    ctx.scale(2, 2);
    const guardado = tw;
    tw = 34;
    dibujarEdificio(ctx, tipo, nivel, 23, 36, 1);
    tw = guardado;
    return c;
}

function pintarPanel() {
    const panel = $("panel");
    panel.innerHTML = "";
    if (elegida < 0) {
        panel.innerHTML = `<div class="titulo-c">Tocá un terreno vacío para construir o un edificio para mejorarlo</div>`;
        return;
    }
    const t = estado.terreno[elegida];
    if (!t) {
        panel.insertAdjacentHTML("beforeend", `<div class="titulo-c">Construir en este terreno</div>`);
        for (const tipo of TIPOS) {
            const e = EDIFICIOS[tipo];
            const costo = costoConstruir(tipo);
            const b = document.createElement("button");
            b.className = "fila-c";
            b.disabled = estado.plata < costo;
            b.dataset.construir = tipo;
            b.appendChild(retrato(tipo));
            b.insertAdjacentHTML("beforeend", `<span class="txt">${e.nombre}<small>${e.produce ? `$${formatear(e.produce * multiplicador())}/s · ` : ""}${e.detalle}</small></span><span class="precio">$${formatear(costo)}</span>`);
            panel.appendChild(b);
        }
    } else {
        const e = EDIFICIOS[t.tipo];
        const b = document.createElement("div");
        b.className = "fila-c";
        b.appendChild(retrato(t.tipo, t.nivel));
        b.insertAdjacentHTML("beforeend", `<span class="txt">${e.nombre} · nivel ${t.nivel}/${MAX_NIVEL}<small>${produceEn(elegida) ? `Produce $${formatear(produceEn(elegida))}/s` : e.detalle}</small></span>`);
        panel.appendChild(b);
        const tope = t.nivel >= MAX_NIVEL;
        panel.insertAdjacentHTML(
            "beforeend",
            `<div class="botones-c">
                <button class="accion" data-mejorar type="button" ${tope || estado.plata < costoMejora(t) ? "disabled" : ""}>${tope ? "Nivel máximo" : `⬆️ Mejorar · $${formatear(costoMejora(t))}`}</button>
                <button class="accion secundaria" data-vender type="button">Demoler (+$${formatear(Math.round(costoMejora(t) * 0.25))})</button>
            </div>`
        );
    }
}

$("panel").addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b || b.disabled || elegida < 0) return;
    const p = aPantalla(elegida % COLS, Math.floor(elegida / COLS));
    if (b.dataset.construir) {
        const tipo = b.dataset.construir;
        const costo = costoConstruir(tipo);
        if (estado.plata < costo) return;
        estado.plata -= costo;
        estado.terreno[elegida] = { tipo, nivel: 1, crece: 0 };
        chispas.emitir(p.x, p.y, EDIFICIOS[tipo].colores[0], 18, 120);
        vibrar(25);
    } else if (b.dataset.mejorar !== undefined) {
        const t = estado.terreno[elegida];
        const costo = costoMejora(t);
        if (estado.plata < costo) return;
        estado.plata -= costo;
        t.nivel++;
        t.crece = 0.7;
        chispas.emitir(p.x, p.y - tw * 0.4, "#ffd166", 16, 120);
        vibrar(25);
    } else if (b.dataset.vender !== undefined) {
        ganar(Math.round(costoMejora(estado.terreno[elegida]) * 0.25));
        estado.terreno[elegida] = null;
        chispas.emitir(p.x, p.y, "#adb5bd", 14, 100);
        vibrar(30);
    }
    guardarProgreso();
    actualizar();
    pintarPanel();
});

function actualizar() {
    $("plata").textContent = `$${formatear(Math.floor(estado.plata))}`;
    $("por-segundo").textContent = `$${formatear(porSegundo())} por segundo · tocá un terreno`;
    $("llaves").textContent = estado.llaves;
    // Refresca los botones habilitados sin rearmar el panel
    for (const b of $("panel").querySelectorAll("[data-construir]")) b.disabled = estado.plata < costoConstruir(b.dataset.construir);
    const mejorar = $("panel").querySelector("[data-mejorar]");
    const t = estado.terreno[elegida];
    if (mejorar && t) mejorar.disabled = t.nivel >= MAX_NIVEL || estado.plata < costoMejora(t);
}

function avisar(texto) {
    $("aviso").innerHTML = `<div class="chico">${texto}</div>`;
    $("aviso").hidden = false;
    clearTimeout(avisar.t);
    avisar.t = setTimeout(() => ($("aviso").hidden = true), 2000);
}

// ---------- Fundar otra ciudad ----------
$("abrir-nueva").addEventListener("click", () => {
    $("llaves-nuevas").textContent = llavesNuevas();
    $("confirmar-nueva").disabled = llavesNuevas() < 1;
    $("nueva").hidden = false;
});
$("cancelar-nueva").addEventListener("click", () => ($("nueva").hidden = true));
$("confirmar-nueva").addEventListener("click", () => {
    const nuevas = llavesNuevas();
    if (nuevas < 1) return;
    estado.llaves += nuevas;
    Object.assign(estado, { plata: 20, total: 0, terreno: Array(COLS * FILAS).fill(null) });
    elegida = -1;
    $("nueva").hidden = true;
    avisar(`🔑 ¡Ciudad nueva! Todo produce ×${(1 + estado.llaves * 0.15).toFixed(2)}`);
    guardarProgreso();
    pintarPanel();
    actualizar();
});

// ---------- Guardado ----------
function guardarProgreso() {
    estado.ultimaVez = Date.now();
    guardar(CLAVE, { ...estado, terreno: estado.terreno.map((t) => (t ? { tipo: t.tipo, nivel: t.nivel } : null)) });
}
setInterval(guardarProgreso, 5000);
document.addEventListener("visibilitychange", guardarProgreso);
addEventListener("pagehide", guardarProgreso);

const ausente = Math.min((Date.now() - estado.ultimaVez) / 1000, MAX_HORAS * 3600);
const ganado = porSegundo() * ausente;
if (ganado >= 1 && ausente > 30) {
    ganar(ganado);
    setTimeout(() => avisar(`Mientras no estabas la ciudad juntó $${formatear(ganado)}`), 400);
}
pintarPanel();
actualizar();
