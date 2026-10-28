// Rompeladrillos: niveles con formas, ladrillos especiales, poderes, combos y monedas para el taller.
import { cargar, guardar, vibrar } from "../../js/comun3d.js";
import { crearLienzo, bucle, crearChispas } from "../../js/lienzo2d.js";

const $ = (id) => document.getElementById(id);
const CLAVE = "ladrillos";
const COLUMNAS = 8;
const COLORES = ["#f72585", "#b5179e", "#7209b7", "#4361ee", "#4cc9f0", "#06d6a0", "#ffd166", "#ff7a1a"];

// . vacío · 1-3 golpes · M metal · X explosivo · G oro
const PATRONES = [
    ["11111111", "11111111", "11111111", "11111111"],
    [".11..11.", "11111111", "111GG111", ".111111.", "..1111..", "...11..."],
    ["..1..1..", "...11...", "..1111..", ".11XX11.", "11111111", "1.1111.1", "1.1..1.1", "...11..."],
    ["...GG...", "..2222..", ".111111.", "11111111", "MM....MM"],
    ["...22...", "..2XX2..", ".222222.", "222GG222", ".222222.", "..2222..", "...22..."],
    ["1.1.1.1.", ".1.1.1.1", "2.2.2.2.", ".2.2.2.2", "X.X.X.X.", ".G.G.G.G"],
    ["MMMMMMMM", "M222222M", "M2GXXG2M", "M222222M", "........", "11111111"],
    ["33333333", "1......3", "1.3333.3", "1.3GG1.3", "1.3..1.3", "1.1111.3", "1......3", "11111111"],
];

const PODERES = {
    ancha: { color: "#06d6a0", letra: "↔", peso: 14 },
    multi: { color: "#ffd166", letra: "×3", peso: 14 },
    lenta: { color: "#4cc9f0", letra: "⏱", peso: 10 },
    laser: { color: "#ff4d6d", letra: "⚡", peso: 10 },
    iman: { color: "#c77dff", letra: "🧲", peso: 8 },
    fuego: { color: "#ff7a1a", letra: "🔥", peso: 8 },
    escudo: { color: "#90e0ef", letra: "🛡", peso: 7 },
    vida: { color: "#ff4d6d", letra: "♥", peso: 4 },
    chica: { color: "#6c757d", letra: "⇥", peso: 7, malo: true },
};
const PESO_PODERES = Object.values(PODERES).reduce((t, p) => t + p.peso, 0);

const MEJORAS = [
    { id: "paleta", ico: "↔️", nombre: "Paleta más ancha", detalle: "+6% de ancho", max: 5, costo: (n) => 30 * (n + 1) },
    { id: "vidas", ico: "❤️", nombre: "Vida extra", detalle: "Empezás con una vida más", max: 2, costo: (n) => 150 * (n + 1) },
    { id: "suerte", ico: "🍀", nombre: "Suerte", detalle: "Caen más poderes", max: 5, costo: (n) => 40 * (n + 1) },
    { id: "duracion", ico: "⏳", nombre: "Poderes duraderos", detalle: "+15% de duración", max: 5, costo: (n) => 40 * (n + 1) },
    { id: "escudo", ico: "🛡️", nombre: "Escudo inicial", detalle: "Cada partida arranca con escudo", max: 1, costo: () => 200 },
    { id: "laser", ico: "⚡", nombre: "Arranque láser", detalle: "Cada nivel empieza con láser", max: 1, costo: () => 300 },
];
const ESTILOS = [
    { id: "neon", nombre: "Neón", paleta: ["#9bf6ff", "#4361ee"], pelota: "#ffffff", estela: "#4cc9f0", costo: 0 },
    { id: "fuego", nombre: "Fuego", paleta: ["#ffd166", "#e85d04"], pelota: "#fff3b0", estela: "#ff7a1a", costo: 100 },
    { id: "hielo", nombre: "Hielo", paleta: ["#e0fbfc", "#3d5a80"], pelota: "#e0fbfc", estela: "#98c1d9", costo: 100 },
    { id: "toxico", nombre: "Tóxico", paleta: ["#ccff33", "#38b000"], pelota: "#ccff33", estela: "#70e000", costo: 200 },
    { id: "oro", nombre: "Oro", paleta: ["#fff3b0", "#b8860b"], pelota: "#ffd166", estela: "#ffb703", costo: 300 },
    { id: "arcoiris", nombre: "Arcoíris", paleta: ["#ff006e", "#3a86ff"], pelota: "#ffffff", estela: "arcoiris", costo: 500 },
];

const estado = cargar(CLAVE, { record: 0, monedas: 0, mejoras: {}, estilos: ["neon"], estilo: "neon" });
estado.monedas ??= 0;
estado.mejoras ??= {};
estado.estilos ??= ["neon"];
estado.estilo ??= "neon";
const mejora = (id) => estado.mejoras[id] ?? 0;
const estilo = () => ESTILOS.find((e) => e.id === estado.estilo) ?? ESTILOS[0];

const chispas = crearChispas();
let juego = null;
let ahora = 0;
const lienzo = crearLienzo($("lienzo"), () => juego && acomodarLadrillos());

// ---------- Partida ----------
function nuevoJuego() {
    juego = {
        puntos: 0,
        nivel: 1,
        vidas: 3 + mejora("vidas"),
        pelotas: [],
        caidas: [],
        ladrillos: [],
        balas: [],
        restos: [],
        textos: [],
        x: 0.5,
        poderes: {},
        escudo: mejora("escudo") > 0,
        combo: 0,
        sacudida: 0,
        cartel: 0,
        recarga: 0,
        enJuego: true,
        monedasPartida: 0,
    };
    armarNivel();
}

function armarNivel() {
    const patron = PATRONES[(juego.nivel - 1) % PATRONES.length];
    const vuelta = Math.floor((juego.nivel - 1) / PATRONES.length);
    juego.ladrillos = [];
    patron.forEach((fila, f) => {
        [...fila].forEach((ch, c) => {
            if (ch === ".") return;
            const tipo = ch === "M" ? "metal" : ch === "X" ? "explosivo" : ch === "G" ? "oro" : "normal";
            const golpes = tipo === "metal" ? 5 : tipo === "normal" ? Math.min(4, Number(ch) + vuelta) : 1;
            juego.ladrillos.push({ f, c, tipo, golpes, max: golpes, color: COLORES[(f + juego.nivel) % COLORES.length], brillo: 0 });
        });
    });
    acomodarLadrillos();
    juego.pelotas = [nuevaPelota()];
    juego.caidas = [];
    juego.balas = [];
    juego.poderes = {};
    if (mejora("laser")) activar("laser");
    juego.cartel = 1.8;
    pintarDatos();
}

function acomodarLadrillos() {
    const { ancho } = lienzo;
    const margen = 8;
    const w = (ancho - margen * 2) / COLUMNAS;
    const h = Math.max(16, w * 0.4);
    for (const l of juego.ladrillos) Object.assign(l, { x: margen + l.c * w + 2, y: 46 + l.f * (h + 4), w: w - 4, h });
}

const nuevaPelota = (pegada = true) => ({ x: 0, y: 0, vx: 0, vy: 0, pegada, offset: 0, r: Math.max(6, lienzo.ancho * 0.018), estela: [] });
const activo = (p) => (juego.poderes[p] ?? 0) > ahora;
const anchoPaleta = () => lienzo.ancho * (0.22 + mejora("paleta") * 0.013) * (activo("ancha") ? 1.55 : 1) * (activo("chica") ? 0.6 : 1);
const yPaleta = () => lienzo.alto - 44;
const velocidad = () => lienzo.alto * Math.min(1.25, 0.62 + juego.nivel * 0.035) * (activo("lenta") ? 0.6 : 1);
const duracion = (seg) => seg * 1000 * (1 + mejora("duracion") * 0.15);

function lanzar() {
    for (const p of juego.pelotas) {
        if (!p.pegada) continue;
        p.pegada = false;
        const a = -Math.PI / 2 + (p.offset ? p.offset * 0.9 : (Math.random() - 0.5) * 0.6);
        p.vx = Math.cos(a) * velocidad();
        p.vy = Math.sin(a) * velocidad();
    }
}

function paso(dt) {
    const { ancho, alto } = lienzo;
    const px = juego.x * ancho;
    const pw = anchoPaleta();
    const py = yPaleta();

    for (const p of juego.pelotas) {
        if (p.pegada) {
            p.x = px + p.offset * pw / 2;
            p.y = py - p.r - 2;
            continue;
        }
        const v = Math.hypot(p.vx, p.vy) || 1;
        p.vx *= velocidad() / v;
        p.vy *= velocidad() / v;
        // Evita que quede rebotando casi horizontal
        if (Math.abs(p.vy) < velocidad() * 0.25) p.vy = Math.sign(p.vy || -1) * velocidad() * 0.25;
        // Sub-pasos para que no atraviese ladrillos a mucha velocidad
        const pasos = Math.ceil((velocidad() * dt) / (p.r * 0.8));
        for (let s = 0; s < pasos; s++) moverPelota(p, dt / pasos, px, pw, py);
        p.estela.unshift({ x: p.x, y: p.y });
        if (p.estela.length > 10) p.estela.pop();
    }
    juego.pelotas = juego.pelotas.filter((p) => !p.perdida);
    if (!juego.pelotas.length) perderVida();

    // Láser automático
    if (activo("laser")) {
        juego.recarga -= dt;
        if (juego.recarga <= 0) {
            juego.recarga = 0.35;
            for (const lado of [-1, 1]) juego.balas.push({ x: px + lado * (pw / 2 - 6), y: py - 4 });
        }
    }
    for (const b of juego.balas) {
        b.y -= alto * 1.1 * dt;
        const l = juego.ladrillos.find((l) => l.golpes > 0 && b.x > l.x && b.x < l.x + l.w && b.y > l.y && b.y < l.y + l.h);
        if (l) {
            b.usada = true;
            golpear(l);
        }
        if (b.y < 0) b.usada = true;
    }
    juego.balas = juego.balas.filter((b) => !b.usada);

    // Poderes y monedas que caen
    for (const c of juego.caidas) {
        c.y += alto * (c.moneda ? 0.32 : 0.24) * dt;
        c.giro = (c.giro ?? 0) + dt * 6;
        if (c.y > py - 10 && c.y < py + 14 && Math.abs(c.x - px) < pw / 2 + 14) {
            c.tomada = true;
            if (c.moneda) {
                juego.monedasPartida += c.valor;
                estado.monedas += c.valor;
                texto(c.x, py - 20, `+${c.valor} 🪙`, "#ffd166");
                vibrar(10);
            } else activar(c.tipo);
            pintarDatos();
        }
    }
    juego.caidas = juego.caidas.filter((c) => !c.tomada && c.y < alto + 20);

    if (juego.ladrillos.every((l) => l.golpes <= 0 || l.tipo === "metal")) pasarNivel();
}

function moverPelota(p, dt, px, pw, py) {
    const { ancho, alto } = lienzo;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    if (p.x < p.r) { p.x = p.r; p.vx = Math.abs(p.vx); }
    if (p.x > ancho - p.r) { p.x = ancho - p.r; p.vx = -Math.abs(p.vx); }
    if (p.y < p.r) { p.y = p.r; p.vy = Math.abs(p.vy); }
    // Paleta: el ángulo depende de dónde pega
    if (p.vy > 0 && p.y + p.r >= py && p.y < py + 12 && Math.abs(p.x - px) < pw / 2 + p.r) {
        const donde = Math.max(-1, Math.min(1, (p.x - px) / (pw / 2)));
        juego.combo = 0;
        if (activo("iman")) {
            p.pegada = true;
            p.offset = donde;
            return;
        }
        const a = -Math.PI / 2 + donde * 1.05;
        p.vx = Math.cos(a) * velocidad();
        p.vy = Math.sin(a) * velocidad();
        p.y = py - p.r;
        vibrar(8);
    }
    // Escudo: una barrera abajo que salva una vez
    if (juego.escudo && p.vy > 0 && p.y + p.r > alto - 10) {
        juego.escudo = false;
        p.vy = -Math.abs(p.vy);
        chispas.emitir(p.x, alto - 10, "#90e0ef", 20, 200);
        vibrar(40);
    }
    for (const l of juego.ladrillos) {
        if (l.golpes <= 0) continue;
        const cx = Math.max(l.x, Math.min(p.x, l.x + l.w));
        const cy = Math.max(l.y, Math.min(p.y, l.y + l.h));
        if (Math.hypot(p.x - cx, p.y - cy) > p.r) continue;
        // La pelota de fuego atraviesa todo menos el metal
        if (!activo("fuego") || l.tipo === "metal") {
            const solapeX = Math.min(p.x + p.r - l.x, l.x + l.w - (p.x - p.r));
            const solapeY = Math.min(p.y + p.r - l.y, l.y + l.h - (p.y - p.r));
            if (solapeX < solapeY) {
                p.vx = p.x < l.x + l.w / 2 ? -Math.abs(p.vx) : Math.abs(p.vx);
            } else {
                p.vy = p.y < l.y + l.h / 2 ? -Math.abs(p.vy) : Math.abs(p.vy);
            }
        }
        golpear(l, activo("fuego") && l.tipo !== "metal");
        break;
    }
    if (p.y > alto + 20) p.perdida = true;
}

function golpear(l, destruir = false) {
    if (l.golpes <= 0) return;
    l.golpes = destruir ? 0 : l.golpes - 1;
    l.brillo = 0.15;
    vibrar(10);
    if (l.golpes > 0) {
        chispas.emitir(l.x + l.w / 2, l.y + l.h / 2, l.tipo === "metal" ? "#dee2e6" : "#ffffff", 4, 90);
        return;
    }
    juego.combo++;
    const puntos = Math.round(10 * juego.nivel * (1 + Math.floor(juego.combo / 3) * 0.5) * (l.tipo === "oro" ? 5 : 1));
    juego.puntos += puntos;
    if (juego.combo >= 3 && juego.combo % 3 === 0) texto(l.x + l.w / 2, l.y, `Combo ×${1 + Math.floor(juego.combo / 3) * 0.5}`, "#ff9f1c", 16);
    romper(l);
    if (l.tipo === "explosivo") explotar(l);
    if (l.tipo === "oro") soltarMoneda(l, 5);
    else if (Math.random() < 0.18) soltarMoneda(l, 1);
    if (Math.random() < 0.12 + mejora("suerte") * 0.03) soltarPoder(l);
    pintarDatos();
}

function romper(l) {
    const color = l.tipo === "oro" ? "#ffd166" : l.tipo === "explosivo" ? "#ff4d6d" : l.tipo === "metal" ? "#adb5bd" : l.color;
    chispas.emitir(l.x + l.w / 2, l.y + l.h / 2, color, 10, 170);
    // Pedacitos del ladrillo que caen girando
    for (let k = 0; k < 6; k++) {
        juego.restos.push({ x: l.x + Math.random() * l.w, y: l.y + Math.random() * l.h, vx: (Math.random() - 0.5) * 160, vy: -Math.random() * 140, giro: Math.random() * 6, vg: (Math.random() - 0.5) * 12, w: l.w * (0.12 + Math.random() * 0.15), h: l.h * 0.35, color, vida: 1.2 });
    }
}

function explotar(l) {
    juego.sacudida = 0.3;
    vibrar(70);
    chispas.emitir(l.x + l.w / 2, l.y + l.h / 2, "#ffd166", 30, 260);
    for (const o of juego.ladrillos) {
        if (o.golpes > 0 && Math.abs(o.c - l.c) <= 1 && Math.abs(o.f - l.f) <= 1 && o !== l) setTimeout(() => golpear(o, o.tipo !== "metal"), 60);
    }
}

function soltarMoneda(l, valor) {
    juego.caidas.push({ moneda: true, valor, x: l.x + l.w / 2, y: l.y + l.h / 2 });
}

function soltarPoder(l) {
    let r = Math.random() * PESO_PODERES;
    for (const [tipo, p] of Object.entries(PODERES)) {
        r -= p.peso;
        if (r < 0) return juego.caidas.push({ tipo, ...p, x: l.x + l.w / 2, y: l.y + l.h / 2 });
    }
}

function activar(tipo) {
    vibrar(30);
    const nombres = { ancha: "Paleta ancha", multi: "¡Multipelota!", lenta: "Cámara lenta", laser: "¡Láser!", iman: "Imán", fuego: "¡Pelota de fuego!", escudo: "Escudo", vida: "+1 vida", chica: "Paleta chica…" };
    if (juego.cartel <= 0) texto(lienzo.ancho / 2, lienzo.alto * 0.55, nombres[tipo], PODERES[tipo].color, 20);
    if (tipo === "vida") juego.vidas++;
    else if (tipo === "escudo") juego.escudo = true;
    else if (tipo === "multi") {
        const base = juego.pelotas.find((p) => !p.pegada) ?? juego.pelotas[0];
        if (!base) return;
        for (const giro of [-0.5, 0.5]) {
            const p = nuevaPelota(false);
            const a = base.pegada ? -Math.PI / 2 + giro : Math.atan2(base.vy, base.vx) + giro;
            Object.assign(p, { x: base.x, y: base.y, vx: Math.cos(a) * velocidad(), vy: Math.sin(a) * velocidad() });
            juego.pelotas.push(p);
        }
    } else {
        if (tipo === "ancha") delete juego.poderes.chica;
        if (tipo === "chica") delete juego.poderes.ancha;
        juego.poderes[tipo] = ahora + duracion(tipo === "chica" ? 8 : tipo === "fuego" ? 8 : 12);
        if (tipo === "iman" || tipo === "laser") juego.recarga = 0;
    }
    pintarDatos();
}

function pasarNivel() {
    const bono = 5 + juego.nivel;
    estado.monedas += bono;
    juego.monedasPartida += bono;
    juego.puntos += 100 * juego.nivel;
    juego.nivel++;
    texto(lienzo.ancho / 2, lienzo.alto * 0.5, `¡Nivel superado! +${bono} 🪙`, "#ffd166", 20);
    vibrar([40, 50, 80]);
    guardar(CLAVE, estado);
    armarNivel();
}

function perderVida() {
    juego.vidas--;
    juego.combo = 0;
    juego.sacudida = 0.25;
    vibrar(150);
    if (juego.vidas <= 0) return fin();
    juego.pelotas = [nuevaPelota()];
    juego.poderes = {};
    pintarDatos();
}

function fin() {
    juego.enJuego = false;
    const nuevo = juego.puntos > estado.record;
    if (nuevo) estado.record = juego.puntos;
    guardar(CLAVE, estado);
    $("titulo-centro").innerHTML = `${nuevo ? "¡Nuevo récord!" : "Fin del juego"}<div class="chico">${juego.puntos} puntos · nivel ${juego.nivel} · +${juego.monedasPartida} 🪙<br>Récord: <span id="record">${estado.record}</span></div>`;
    $("jugar").textContent = "Otra vez";
    $("centro").hidden = false;
    pintarDatos();
}

function texto(x, y, t, color, tam = 14) {
    juego.textos.push({ x, y, t, color, tam, vida: 1.2 });
}

function pintarDatos() {
    $("puntos").textContent = juego?.puntos ?? 0;
    $("nivel").textContent = juego?.nivel ?? 1;
    $("vidas").textContent = juego?.vidas ?? 3 + mejora("vidas");
    $("monedas").textContent = estado.monedas;
    const r = $("record");
    if (r) r.textContent = estado.record;
}

// ---------- Dibujo ----------
const estrellas = Array.from({ length: 60 }, () => ({ x: Math.random(), y: Math.random(), z: Math.random() }));

function dibujarFondo(ctx, ancho, alto, dt) {
    const fondo = ctx.createLinearGradient(0, 0, 0, alto);
    fondo.addColorStop(0, "#1a0533");
    fondo.addColorStop(1, "#05000c");
    ctx.fillStyle = fondo;
    ctx.fillRect(0, 0, ancho, alto);
    for (const e of estrellas) {
        e.y += dt * 0.01 * (0.3 + e.z);
        if (e.y > 1) e.y = 0;
        ctx.globalAlpha = 0.25 + e.z * 0.5;
        ctx.fillStyle = "#fff";
        ctx.fillRect(e.x * ancho, e.y * alto, 1 + e.z, 1 + e.z);
    }
    ctx.globalAlpha = 1;
    // Grilla en perspectiva abajo
    ctx.strokeStyle = "#7209b733";
    ctx.lineWidth = 1;
    const horizonte = alto * 0.55;
    for (let k = -8; k <= 8; k++) {
        ctx.beginPath();
        ctx.moveTo(ancho / 2 + k * 8, horizonte);
        ctx.lineTo(ancho / 2 + k * ancho * 0.18, alto);
        ctx.stroke();
    }
    const desplazar = (ahora / 1000) % 1;
    for (let k = 0; k < 8; k++) {
        const t = ((k + desplazar) / 8) ** 2;
        const y = horizonte + (alto - horizonte) * t;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(ancho, y);
        ctx.stroke();
    }
}

function dibujarLadrillo(ctx, l) {
    const { x, y, w, h } = l;
    let base = l.color;
    if (l.tipo === "metal") base = "#8d99ae";
    if (l.tipo === "oro") base = "#ffb703";
    if (l.tipo === "explosivo") base = "#d00000";
    ctx.save();
    if (l.tipo === "explosivo") {
        ctx.shadowColor = "#ff4d6d";
        ctx.shadowBlur = 8 + Math.sin(ahora / 150) * 6;
    } else {
        ctx.shadowColor = base;
        ctx.shadowBlur = 6;
    }
    ctx.fillStyle = base;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 5);
    ctx.fill();
    ctx.restore();
    // Bisel: luz arriba, sombra abajo
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, "#ffffff88");
    g.addColorStop(0.35, "#ffffff10");
    g.addColorStop(0.7, "#00000000");
    g.addColorStop(1, "#00000066");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 5);
    ctx.fill();
    ctx.strokeStyle = "#ffffff30";
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 2.5, y + 2.5, w - 5, h - 5);
    if (l.tipo === "metal") {
        ctx.fillStyle = "#495057";
        for (const [dx, dy] of [[4, 4], [w - 4, 4], [4, h - 4], [w - 4, h - 4]]) {
            ctx.beginPath();
            ctx.arc(x + dx, y + dy, 1.8, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    if (l.tipo === "oro") {
        // Destello que cruza
        const p = ((ahora / 1400 + l.c * 0.1) % 1.6) - 0.3;
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, 5);
        ctx.clip();
        ctx.fillStyle = "#ffffffaa";
        ctx.beginPath();
        ctx.moveTo(x + p * w, y);
        ctx.lineTo(x + p * w + 8, y);
        ctx.lineTo(x + p * w - 4, y + h);
        ctx.lineTo(x + p * w - 12, y + h);
        ctx.fill();
        ctx.restore();
    }
    if (l.tipo === "explosivo") {
        ctx.fillStyle = "#ffd166";
        ctx.font = `900 ${h * 0.7}px sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("✸", x + w / 2, y + h / 2 + 1);
    }
    if (l.tipo === "normal" && l.max > 1) {
        // Puntitos de los golpes que le quedan
        ctx.fillStyle = "#ffffffcc";
        for (let k = 0; k < l.golpes; k++) {
            ctx.beginPath();
            ctx.arc(x + w / 2 + (k - (l.golpes - 1) / 2) * 7, y + h / 2, 2, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    // Grietas según el daño
    const dano = 1 - l.golpes / l.max;
    if (dano > 0) {
        ctx.strokeStyle = "#000a";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(x + w * 0.3, y);
        ctx.lineTo(x + w * 0.42, y + h * 0.5);
        ctx.lineTo(x + w * 0.35, y + h);
        if (dano > 0.4) {
            ctx.moveTo(x + w * 0.42, y + h * 0.5);
            ctx.lineTo(x + w * 0.7, y + h * 0.35);
            ctx.lineTo(x + w * 0.85, y + h);
        }
        ctx.stroke();
    }
    if (l.brillo > 0) {
        ctx.fillStyle = `rgba(255,255,255,${l.brillo * 4})`;
        ctx.fillRect(x, y, w, h);
    }
}

function dibujar(dt) {
    ahora = performance.now();
    const { ctx, ancho, alto } = lienzo;
    ctx.save();
    if (juego?.sacudida > 0) {
        ctx.translate((Math.random() - 0.5) * 10 * juego.sacudida * 3, (Math.random() - 0.5) * 10 * juego.sacudida * 3);
        juego.sacudida = Math.max(0, juego.sacudida - dt);
    }
    dibujarFondo(ctx, ancho, alto, dt);
    if (!juego) return ctx.restore();
    const e = estilo();

    for (const l of juego.ladrillos) {
        if (l.golpes <= 0) continue;
        l.brillo = Math.max(0, l.brillo - dt);
        dibujarLadrillo(ctx, l);
    }

    for (const r of juego.restos) {
        r.vida -= dt;
        r.vy += 500 * dt;
        r.x += r.vx * dt;
        r.y += r.vy * dt;
        r.giro += r.vg * dt;
        ctx.save();
        ctx.globalAlpha = Math.max(0, r.vida);
        ctx.translate(r.x, r.y);
        ctx.rotate(r.giro);
        ctx.fillStyle = r.color;
        ctx.fillRect(-r.w / 2, -r.h / 2, r.w, r.h);
        ctx.restore();
    }
    juego.restos = juego.restos.filter((r) => r.vida > 0);

    for (const c of juego.caidas) {
        if (c.moneda) {
            const w = Math.abs(Math.cos(c.giro)) * 8 + 1;
            ctx.fillStyle = "#ffd166";
            ctx.strokeStyle = "#9c6500";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.ellipse(c.x, c.y, w, 9, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            continue;
        }
        ctx.save();
        ctx.shadowColor = c.color;
        ctx.shadowBlur = 12;
        const g = ctx.createLinearGradient(0, c.y - 11, 0, c.y + 11);
        g.addColorStop(0, "#fff");
        g.addColorStop(0.4, c.color);
        g.addColorStop(1, c.malo ? "#212529" : c.color);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.roundRect(c.x - 18, c.y - 11, 36, 22, 11);
        ctx.fill();
        ctx.restore();
        ctx.fillStyle = "#10002b";
        ctx.font = "900 13px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(c.letra, c.x, c.y + 1);
    }

    // Láser
    ctx.fillStyle = "#ff4d6d";
    ctx.shadowColor = "#ff4d6d";
    ctx.shadowBlur = 10;
    for (const b of juego.balas) ctx.fillRect(b.x - 1.5, b.y - 10, 3, 14);
    ctx.shadowBlur = 0;

    // Escudo
    if (juego.escudo) {
        ctx.strokeStyle = `rgba(144,224,239,${0.6 + Math.sin(ahora / 200) * 0.3})`;
        ctx.lineWidth = 3;
        ctx.shadowColor = "#90e0ef";
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.moveTo(0, alto - 8);
        ctx.lineTo(ancho, alto - 8);
        ctx.stroke();
        ctx.shadowBlur = 0;
    }

    // Paleta
    const pw = anchoPaleta();
    const px = juego.x * ancho;
    const py = yPaleta();
    const pg = ctx.createLinearGradient(0, py, 0, py + 14);
    pg.addColorStop(0, e.paleta[0]);
    pg.addColorStop(1, e.paleta[1]);
    ctx.fillStyle = pg;
    ctx.shadowColor = e.paleta[0];
    ctx.shadowBlur = 16;
    ctx.beginPath();
    ctx.roundRect(px - pw / 2, py, pw, 14, 7);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#ffffff66";
    ctx.fillRect(px - pw / 2 + 8, py + 2, pw - 16, 3);
    if (activo("laser")) {
        ctx.fillStyle = "#ff4d6d";
        for (const lado of [-1, 1]) ctx.fillRect(px + lado * (pw / 2 - 6) - 3, py - 6, 6, 8);
    }
    if (activo("iman")) {
        ctx.strokeStyle = "#c77dff88";
        ctx.lineWidth = 2;
        for (let k = 0; k < 3; k++) {
            const t = ((ahora / 600 + k / 3) % 1);
            ctx.globalAlpha = 1 - t;
            ctx.beginPath();
            ctx.ellipse(px, py, pw / 2 + t * 14, 8 + t * 10, 0, Math.PI, 0);
            ctx.stroke();
        }
        ctx.globalAlpha = 1;
    }

    // Pelotas con estela
    const fuego = activo("fuego");
    for (const p of juego.pelotas) {
        p.estela.forEach((s, k) => {
            ctx.globalAlpha = (1 - k / p.estela.length) * 0.5;
            ctx.fillStyle = fuego ? (k % 2 ? "#ff7a1a" : "#ffd166") : e.estela === "arcoiris" ? `hsl(${(ahora / 5 + k * 30) % 360},90%,60%)` : e.estela;
            ctx.beginPath();
            ctx.arc(s.x, s.y, p.r * (1 - k / p.estela.length * 0.6), 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.globalAlpha = 1;
        ctx.fillStyle = fuego ? "#fff3b0" : e.pelota;
        ctx.shadowColor = fuego ? "#ff7a1a" : e.pelota;
        ctx.shadowBlur = fuego ? 20 : 12;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.shadowBlur = 0;
    chispas.dibujar(ctx, dt);

    // Poderes activos (barritas arriba)
    let bx = 8;
    for (const [tipo, hasta] of Object.entries(juego.poderes)) {
        const resto = (hasta - ahora) / duracion(12);
        if (resto <= 0) continue;
        ctx.fillStyle = "#0008";
        ctx.fillRect(bx, 8, 44, 22);
        ctx.fillStyle = PODERES[tipo].color;
        ctx.fillRect(bx, 26, 44 * Math.min(1, resto), 4);
        ctx.fillStyle = "#fff";
        ctx.font = "900 12px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(PODERES[tipo].letra, bx + 22, 17);
        bx += 50;
    }

    for (const t of juego.textos) {
        t.vida -= dt;
        t.y -= dt * 30;
        ctx.globalAlpha = Math.min(1, t.vida * 1.5);
        ctx.font = `900 ${t.tam}px sans-serif`;
        ctx.textAlign = "center";
        ctx.lineWidth = 3;
        ctx.strokeStyle = "#000";
        ctx.strokeText(t.t, t.x, t.y);
        ctx.fillStyle = t.color;
        ctx.fillText(t.t, t.x, t.y);
    }
    ctx.globalAlpha = 1;
    juego.textos = juego.textos.filter((t) => t.vida > 0);

    if (juego.cartel > 0) {
        juego.cartel -= dt;
        ctx.globalAlpha = Math.min(1, juego.cartel);
        ctx.font = "900 34px sans-serif";
        ctx.textAlign = "center";
        ctx.lineWidth = 5;
        ctx.strokeStyle = "#000";
        ctx.strokeText(`Nivel ${juego.nivel}`, ancho / 2, alto * 0.6);
        ctx.fillStyle = "#4cc9f0";
        ctx.fillText(`Nivel ${juego.nivel}`, ancho / 2, alto * 0.6);
        ctx.globalAlpha = 1;
    } else if (juego.pelotas.some((p) => p.pegada) && juego.enJuego) {
        ctx.fillStyle = "#ffffffcc";
        ctx.font = "800 15px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("Tocá para lanzar", ancho / 2, alto * 0.66);
    }
    ctx.restore();
}

bucle((dt) => {
    if (juego?.enJuego && $("centro").hidden) paso(dt);
    dibujar(dt);
});

// ---------- Controles ----------
function moverPaleta(e) {
    if (!juego) return;
    const caja = $("lienzo").getBoundingClientRect();
    juego.x = Math.max(0.05, Math.min(0.95, (e.clientX - caja.left) / caja.width));
}
$("lienzo").addEventListener("pointerdown", (e) => {
    moverPaleta(e);
    lanzar();
});
$("lienzo").addEventListener("pointermove", moverPaleta);
addEventListener("keydown", (e) => {
    if (!juego) return;
    if (e.key === "ArrowLeft") juego.x = Math.max(0.05, juego.x - 0.05);
    if (e.key === "ArrowRight") juego.x = Math.min(0.95, juego.x + 0.05);
    if (e.key === " ") lanzar();
});

$("jugar").addEventListener("click", () => {
    $("centro").hidden = true;
    chispas.limpiar();
    nuevoJuego();
});

// ---------- Taller ----------
function pintarTaller() {
    $("monedas-taller").textContent = estado.monedas;
    $("mejoras-taller").innerHTML = MEJORAS.map((m) => {
        const n = mejora(m.id);
        const tope = n >= m.max;
        return `<button class="item-taller" data-mejora="${m.id}" type="button" ${tope || estado.monedas < m.costo(n) ? "disabled" : ""}>
            <span class="ico">${m.ico}</span><span class="txt">${m.nombre}<small>${m.detalle} · ${n}/${m.max}</small></span>
            <span class="precio">${tope ? "Listo" : `🪙 ${m.costo(n)}`}</span></button>`;
    }).join("");
    $("estilos-taller").innerHTML = ESTILOS.map((e) => {
        const tiene = estado.estilos.includes(e.id);
        const puesto = estado.estilo === e.id;
        return `<button class="item-taller${puesto ? " puesto" : ""}" data-estilo="${e.id}" type="button" ${!tiene && estado.monedas < e.costo ? "disabled" : ""}>
            <span class="ico" style="display:inline-block;width:38px;height:12px;border-radius:6px;background:linear-gradient(90deg,${e.paleta[0]},${e.paleta[1]});box-shadow:0 0 10px ${e.paleta[0]}"></span>
            <span class="txt">${e.nombre}</span>
            <span class="precio">${puesto ? "Puesto" : tiene ? "Usar" : `🪙 ${e.costo}`}</span></button>`;
    }).join("");
}
$("taller").addEventListener("click", (ev) => {
    const b = ev.target.closest(".item-taller");
    if (!b || b.disabled) return;
    if (b.dataset.mejora) {
        const m = MEJORAS.find((x) => x.id === b.dataset.mejora);
        const costo = m.costo(mejora(m.id));
        if (estado.monedas < costo || mejora(m.id) >= m.max) return;
        estado.monedas -= costo;
        estado.mejoras[m.id] = mejora(m.id) + 1;
    } else {
        const e = ESTILOS.find((x) => x.id === b.dataset.estilo);
        if (!estado.estilos.includes(e.id)) {
            if (estado.monedas < e.costo) return;
            estado.monedas -= e.costo;
            estado.estilos.push(e.id);
        }
        estado.estilo = e.id;
    }
    vibrar(25);
    guardar(CLAVE, estado);
    pintarTaller();
    pintarDatos();
});
$("abrir-taller").addEventListener("click", () => {
    pintarTaller();
    $("centro").hidden = true;
    $("taller").hidden = false;
});
$("cerrar-taller").addEventListener("click", () => {
    $("taller").hidden = true;
    $("centro").hidden = false;
});
pintarDatos();
