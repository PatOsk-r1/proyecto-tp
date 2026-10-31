// Fusión mágica: invocá magos al azar en la grilla, arrastrá uno sobre otro igual para fusionarlos
// y que suban de nivel. Los monstruos dan la vuelta alrededor de la grilla; si llegan al portal perdés vidas.
import { cargar, guardar, vibrar } from "../../js/comun3d.js";
import { crearLienzo, bucle, crearChispas } from "../../js/lienzo2d.js";

const $ = (id) => document.getElementById(id);
const CLAVE = "magos";
const COLS = 3;
const FILAS = 5;
const MAX_NIVEL = 7;
const TAU = Math.PI * 2;

const TIPOS = {
    fuego: { nombre: "Fuego", dano: 12, cada: 0.9, color: "#ff7a1a", claro: "#ffd29d", ico: "🔥" },
    hielo: { nombre: "Hielo", dano: 6, cada: 0.8, color: "#4cc9f0", claro: "#caf0f8", ico: "❄️" },
    rayo: { nombre: "Rayo", dano: 9, cada: 1.0, color: "#ffd166", claro: "#fff3b0", ico: "⚡" },
    veneno: { nombre: "Veneno", dano: 4, cada: 1.2, color: "#80ed99", claro: "#d8f3dc", ico: "☠️" },
    viento: { nombre: "Viento", dano: 4, cada: 0.3, color: "#e0e0ff", claro: "#ffffff", ico: "🌪️" },
};
const NOMBRES_TIPO = Object.keys(TIPOS);
const LAB = [
    ...NOMBRES_TIPO.map((t) => ({ id: t, ico: TIPOS[t].ico, nombre: `Grimorio de ${TIPOS[t].nombre.toLowerCase()}`, detalle: "+15% de daño", max: 10, costo: (n) => 2 + n * 2 })),
    { id: "mana", ico: "💧", nombre: "Pozo de maná", detalle: "+20 de maná al empezar", max: 10, costo: (n) => 3 + n * 2 },
    { id: "barato", ico: "🪄", nombre: "Varita gastada", detalle: "Invocar cuesta 5% menos", max: 6, costo: (n) => 4 + n * 3 },
];

const estado = cargar(CLAVE, { cristales: 0, lab: {}, mejor: 0 });
const lab = (id) => estado.lab[id] ?? 0;

const chispas = crearChispas();
let ancho = 300;
let alto = 400;
let s = 50;
let gx = 0;
let gy = 0;
let banda = 40;
const lienzo = crearLienzo($("lienzo"), (d) => {
    ancho = d.ancho;
    alto = d.alto;
    s = Math.min((ancho * 0.96) / (COLS + 1.8), (alto * 0.94) / (FILAS + 1.8));
    banda = s * 0.9;
    gx = (ancho - COLS * s) / 2;
    gy = (alto - FILAS * s) / 2 + banda * 0.15;
});

// Camino en U: sube por la izquierda, cruza arriba y baja por la derecha hasta el portal
function puntosCamino() {
    const izq = gx - banda / 2;
    const der = gx + COLS * s + banda / 2;
    const arriba = gy - banda / 2;
    const abajo = gy + FILAS * s + banda * 0.3;
    return [[izq, abajo], [izq, arriba], [der, arriba], [der, abajo]];
}
function largoCamino() {
    const p = puntosCamino();
    let l = 0;
    for (let k = 1; k < p.length; k++) l += Math.hypot(p[k][0] - p[k - 1][0], p[k][1] - p[k - 1][1]);
    return l;
}
function posicionEn(d) {
    const p = puntosCamino();
    for (let k = 1; k < p.length; k++) {
        const tramo = Math.hypot(p[k][0] - p[k - 1][0], p[k][1] - p[k - 1][1]);
        if (d <= tramo) {
            const t = d / tramo;
            return { x: p[k - 1][0] + (p[k][0] - p[k - 1][0]) * t, y: p[k - 1][1] + (p[k][1] - p[k - 1][1]) * t };
        }
        d -= tramo;
    }
    const u = p.at(-1);
    return { x: u[0], y: u[1] };
}

// ---------- Partida ----------
let juego = null;
let arrastre = null;

function nuevo() {
    juego = {
        oleada: 0,
        vidas: 10,
        mana: 30 + lab("mana") * 20,
        invocaciones: 0,
        magos: Array(COLS * FILAS).fill(null),
        enemigos: [],
        balas: [],
        rayos: [],
        cola: [],
        enCurso: false,
        velocidad: 1,
        espera: 0,
        auto: 0,
        vivo: true,
        textos: [],
    };
    $("menu").hidden = true;
    pintar();
}

const costoInvocar = () => Math.round((10 + juego.invocaciones * 5) * (1 - lab("barato") * 0.05));
const danoDe = (m) => TIPOS[m.tipo].dano * 2.3 ** (m.nivel - 1) * (1 + lab(m.tipo) * 0.15);
const centroCasilla = (i) => ({ x: gx + (i % COLS) * s + s / 2, y: gy + Math.floor(i / COLS) * s + s / 2 });

function invocar() {
    if (!juego?.vivo) return;
    const libres = juego.magos.map((m, i) => (m ? -1 : i)).filter((i) => i >= 0);
    if (!libres.length || juego.mana < costoInvocar()) return vibrar(30);
    juego.mana -= costoInvocar();
    juego.invocaciones++;
    const i = libres[Math.floor(Math.random() * libres.length)];
    juego.magos[i] = { tipo: NOMBRES_TIPO[Math.floor(Math.random() * NOMBRES_TIPO.length)], nivel: 1, recarga: Math.random(), aparece: 0 };
    const c = centroCasilla(i);
    chispas.emitir(c.x, c.y, TIPOS[juego.magos[i].tipo].color, 14, 120);
    vibrar(15);
    pintar();
}

function lanzarOleada() {
    if (!juego?.vivo || juego.enCurso) return;
    juego.oleada++;
    juego.enCurso = true;
    const n = juego.oleada;
    const fuerza = 1.17 ** (n - 1);
    const cantidad = 8 + Math.floor(n * 1.5);
    juego.cola = [];
    for (let k = 0; k < cantidad; k++) {
        const r = Math.random();
        const tipo = n >= 3 && r < 0.25 ? "rapido" : n >= 5 && r < 0.4 ? "tanque" : "normal";
        juego.cola.push({ tipo, fuerza });
    }
    if (n % 10 === 0) juego.cola.push({ tipo: "jefe", fuerza });
    juego.espera = 0.3;
    pintar();
}

const ENEMIGOS = {
    normal: { vida: 30, vel: 1.0, color: "#9d4edd", r: 0.2, mana: 3 },
    rapido: { vida: 18, vel: 1.8, color: "#f72585", r: 0.16, mana: 3 },
    tanque: { vida: 90, vel: 0.6, color: "#6c757d", r: 0.27, mana: 6 },
    jefe: { vida: 750, vel: 0.45, color: "#d00000", r: 0.4, mana: 60 },
};

function paso(dt) {
    const L = largoCamino();
    if (juego.enCurso && juego.cola.length) {
        juego.espera -= dt;
        if (juego.espera <= 0) {
            const e = juego.cola.shift();
            const base = ENEMIGOS[e.tipo];
            const vida = base.vida * e.fuerza;
            juego.enemigos.push({ tipo: e.tipo, d: 0, vida, max: vida, lento: 0, veneno: 0, venenoDano: 0, golpe: 0, fase: Math.random() * 6 });
            juego.espera = e.tipo === "jefe" ? 1.5 : Math.max(0.35, 0.9 - juego.oleada * 0.02);
        }
    }
    for (const e of juego.enemigos) {
        const base = ENEMIGOS[e.tipo];
        e.lento = Math.max(0, e.lento - dt);
        e.golpe = Math.max(0, e.golpe - dt);
        e.fase += dt;
        if (e.veneno > 0) {
            e.veneno -= dt;
            danar(e, e.venenoDano * dt, false);
        }
        e.d += base.vel * s * 0.9 * (e.lento > 0 ? 0.55 : 1) * dt;
        if (e.d >= L) {
            e.fuera = true;
            juego.vidas -= e.tipo === "jefe" ? 5 : 1;
            vibrar(120);
            if (juego.vidas <= 0) return fin();
        }
    }
    juego.enemigos = juego.enemigos.filter((e) => !e.fuera && e.vida > 0);

    // Magos: disparan al que va más adelantado
    juego.magos.forEach((m, i) => {
        if (!m) return;
        m.aparece = Math.min(1, m.aparece + dt * 3);
        m.recarga -= dt;
        if (m.recarga > 0 || !juego.enemigos.length) return;
        m.recarga = TIPOS[m.tipo].cada;
        const objetivo = juego.enemigos.reduce((a, b) => (b.d > a.d ? b : a));
        const c = centroCasilla(i);
        m.dispara = 0.15;
        if (m.tipo === "rayo") {
            let actual = objetivo;
            const tocados = [];
            let desde = c;
            let dano = danoDe(m);
            for (let k = 0; k < 2 + Math.floor(m.nivel / 2) && actual; k++) {
                const p = posicionEn(actual.d);
                juego.rayos.push({ x1: desde.x, y1: desde.y, x2: p.x, y2: p.y, vida: 0.18 });
                danar(actual, dano);
                tocados.push(actual);
                desde = p;
                dano *= 0.7;
                actual = juego.enemigos.filter((e) => !tocados.includes(e) && e.vida > 0).sort((a, b) => Math.abs(a.d - tocados.at(-1).d) - Math.abs(b.d - tocados.at(-1).d))[0];
            }
        } else {
            juego.balas.push({ tipo: m.tipo, x: c.x, y: c.y, objetivo, dano: danoDe(m), nivel: m.nivel, rastro: [] });
        }
    });

    for (const b of juego.balas) {
        if (b.objetivo.vida <= 0 || b.objetivo.fuera) {
            b.usada = true;
            continue;
        }
        const p = posicionEn(b.objetivo.d);
        const dx = p.x - b.x;
        const dy = p.y - b.y;
        const dist = Math.hypot(dx, dy);
        const vel = s * (b.tipo === "viento" ? 12 : 8);
        b.rastro.unshift({ x: b.x, y: b.y });
        if (b.rastro.length > 5) b.rastro.pop();
        if (dist < vel * dt + 4) {
            b.usada = true;
            impacto(b, p);
        } else {
            b.x += (dx / dist) * vel * dt;
            b.y += (dy / dist) * vel * dt;
        }
    }
    juego.balas = juego.balas.filter((b) => !b.usada);

    if (juego.enCurso && !juego.cola.length && !juego.enemigos.length) {
        juego.enCurso = false;
        const bono = 10 + juego.oleada * 2;
        juego.mana += bono;
        const cristales = 1 + (juego.oleada % 10 === 0 ? 3 : 0);
        estado.cristales += cristales;
        estado.mejor = Math.max(estado.mejor, juego.oleada);
        guardar(CLAVE, estado);
        texto(ancho / 2, alto / 2, `Oleada ${juego.oleada} superada · +${bono} maná · +${cristales}💠`, "#ffd166");
        juego.auto = 5;
    }
    if (!juego.enCurso && juego.auto > 0) {
        juego.auto -= dt;
        if (juego.auto <= 0) lanzarOleada();
    }
}

function impacto(b, p) {
    const e = b.objetivo;
    const t = TIPOS[b.tipo];
    chispas.emitir(p.x, p.y, t.color, 5, 70);
    if (b.tipo === "fuego") {
        // Explota y quema a los que estén cerca
        for (const o of juego.enemigos) if (Math.abs(o.d - e.d) < s * 0.8) danar(o, o === e ? b.dano : b.dano * 0.5);
        chispas.emitir(p.x, p.y, "#ffd29d", 8, 120);
    } else {
        danar(e, b.dano);
        if (b.tipo === "hielo") e.lento = 1.5 + b.nivel * 0.2;
        if (b.tipo === "veneno") {
            e.veneno = 4;
            e.venenoDano = Math.max(e.venenoDano, b.dano * 0.8);
        }
    }
}

function danar(e, dano, mostrar = true) {
    if (e.vida <= 0) return;
    e.vida -= dano;
    if (mostrar) e.golpe = 0.08;
    if (e.vida <= 0) {
        const base = ENEMIGOS[e.tipo];
        const mana = base.mana + Math.floor(juego.oleada / 3);
        juego.mana += mana;
        const p = posicionEn(e.d);
        chispas.emitir(p.x, p.y, base.color, e.tipo === "jefe" ? 40 : 12, e.tipo === "jefe" ? 240 : 140);
        texto(p.x, p.y - 12, `+${mana}`, "#7df9ff", 0.8, 12);
        if (e.tipo === "jefe") vibrar([60, 40, 120]);
        pintar();
    }
}

function texto(x, y, t, color, vida = 1.6, tam = 15) {
    juego.textos.push({ x, y, t, color, vida, total: vida, tam });
}

function fin() {
    juego.vivo = false;
    estado.mejor = Math.max(estado.mejor, juego.oleada);
    guardar(CLAVE, estado);
    vibrar(250);
    setTimeout(() => {
        $("titulo-menu").innerHTML = `¡Rompieron el portal!<div class="chico">Llegaste a la oleada ${juego.oleada} · récord ${estado.mejor}. Usá los cristales en la biblioteca.</div>`;
        $("jugar").textContent = "Otra vez";
        $("menu").hidden = false;
        pintar();
    }, 700);
}

// ---------- Dibujo ----------
function dibujarMago(ctx, x, y, tam, tipo, nivel, extra = {}) {
    const t = TIPOS[tipo];
    const bob = Math.sin(performance.now() / 400 + x) * tam * 0.04;
    ctx.save();
    ctx.translate(x, y + bob);
    const esc = (extra.aparece ?? 1) * (1 + (extra.dispara ?? 0));
    ctx.scale(esc, esc);
    // Aura por nivel
    if (nivel >= 3) {
        const g = ctx.createRadialGradient(0, 0, tam * 0.1, 0, 0, tam * 0.55);
        g.addColorStop(0, t.color + "66");
        g.addColorStop(1, "transparent");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(0, 0, tam * 0.55, 0, TAU);
        ctx.fill();
    }
    // Túnica
    const tunica = ctx.createLinearGradient(0, -tam * 0.1, 0, tam * 0.4);
    tunica.addColorStop(0, t.color);
    tunica.addColorStop(1, "#1b0b33");
    ctx.fillStyle = tunica;
    ctx.beginPath();
    ctx.moveTo(-tam * 0.24, tam * 0.36);
    ctx.lineTo(0, -tam * 0.12);
    ctx.lineTo(tam * 0.24, tam * 0.36);
    ctx.closePath();
    ctx.fill();
    // Cara
    ctx.fillStyle = "#ffd6a5";
    ctx.beginPath();
    ctx.arc(0, -tam * 0.12, tam * 0.11, 0, TAU);
    ctx.fill();
    // Barba
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.moveTo(-tam * 0.08, -tam * 0.08);
    ctx.lineTo(0, tam * 0.08);
    ctx.lineTo(tam * 0.08, -tam * 0.08);
    ctx.fill();
    // Sombrero
    ctx.fillStyle = t.color;
    ctx.beginPath();
    ctx.moveTo(-tam * 0.18, -tam * 0.18);
    ctx.lineTo(tam * 0.04, -tam * 0.5);
    ctx.lineTo(tam * 0.18, -tam * 0.18);
    ctx.fill();
    ctx.fillStyle = t.claro;
    ctx.fillRect(-tam * 0.19, -tam * 0.2, tam * 0.38, tam * 0.04);
    // Bastón con orbe
    ctx.strokeStyle = "#8d5a2b";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(tam * 0.22, tam * 0.34);
    ctx.lineTo(tam * 0.22, -tam * 0.2);
    ctx.stroke();
    ctx.fillStyle = t.claro;
    ctx.shadowColor = t.color;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(tam * 0.22, -tam * 0.24, tam * 0.06, 0, TAU);
    ctx.fill();
    ctx.restore();
    // Nivel: estrellitas
    ctx.fillStyle = "#ffd166";
    ctx.font = `900 ${Math.max(8, tam * 0.17)}px sans-serif`;
    ctx.textAlign = "center";
    ctx.fillText("★".repeat(nivel), x, y + tam * 0.48);
}

function dibujar(dt) {
    const { ctx } = lienzo;
    const g = ctx.createLinearGradient(0, 0, 0, alto);
    g.addColorStop(0, "#14092e");
    g.addColorStop(1, "#0b0520");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, ancho, alto);
    // Camino de piedra
    const p = puntosCamino();
    const trazo = (w, c) => {
        ctx.strokeStyle = c;
        ctx.lineWidth = w;
        ctx.lineJoin = "round";
        ctx.beginPath();
        p.forEach(([x, y], k) => (k ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
        ctx.stroke();
    };
    trazo(banda, "#3c2a5c");
    trazo(banda * 0.8, "#5a4380");
    ctx.setLineDash([4, 14]);
    trazo(2, "#ffffff22");
    ctx.setLineDash([]);
    // Cueva de salida de monstruos y portal
    const [ix, iy] = p[0];
    ctx.fillStyle = "#000";
    ctx.beginPath();
    ctx.arc(ix, iy + banda * 0.2, banda * 0.45, Math.PI, 0);
    ctx.fill();
    const [px, py] = p.at(-1);
    for (let k = 0; k < 3; k++) {
        ctx.strokeStyle = ["#c77dff", "#7df9ff", "#ff4d6d"][k];
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(px, py, banda * (0.2 + k * 0.1), performance.now() / (300 + k * 100), performance.now() / (300 + k * 100) + 4);
        ctx.stroke();
    }
    // Casillas con runas
    for (let i = 0; i < COLS * FILAS; i++) {
        const c = centroCasilla(i);
        ctx.fillStyle = "#ffffff0c";
        ctx.beginPath();
        ctx.roundRect(c.x - s / 2 + 3, c.y - s / 2 + 3, s - 6, s - 6, 10);
        ctx.fill();
        ctx.strokeStyle = "#c77dff22";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(c.x, c.y, s * 0.3, 0, TAU);
        ctx.stroke();
    }
    if (!juego) return;
    // Casillas donde se puede fusionar el que estás arrastrando
    if (arrastre) {
        juego.magos.forEach((m, i) => {
            if (!m || i === arrastre.desde) return;
            const a = juego.magos[arrastre.desde];
            if (m.tipo === a.tipo && m.nivel === a.nivel && m.nivel < MAX_NIVEL) {
                const c = centroCasilla(i);
                ctx.strokeStyle = TIPOS[m.tipo].color;
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.roundRect(c.x - s / 2 + 3, c.y - s / 2 + 3, s - 6, s - 6, 10);
                ctx.stroke();
            }
        });
    }
    // Sin arrastrar: un brillo suave marca los magos que tienen pareja para fusionar
    if (!arrastre) {
        const cuenta = {};
        for (const m of juego.magos) if (m && m.nivel < MAX_NIVEL) cuenta[`${m.tipo}-${m.nivel}`] = (cuenta[`${m.tipo}-${m.nivel}`] ?? 0) + 1;
        const pulso = 0.35 + Math.sin(performance.now() / 260) * 0.25;
        juego.magos.forEach((m, i) => {
            if (!m || (cuenta[`${m.tipo}-${m.nivel}`] ?? 0) < 2) return;
            const c = centroCasilla(i);
            ctx.globalAlpha = pulso;
            ctx.strokeStyle = TIPOS[m.tipo].color;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.roundRect(c.x - s / 2 + 3, c.y - s / 2 + 3, s - 6, s - 6, 10);
            ctx.stroke();
            ctx.globalAlpha = 1;
        });
    }
    juego.magos.forEach((m, i) => {
        if (!m || arrastre?.desde === i) return;
        m.dispara = Math.max(0, (m.dispara ?? 0) - dt);
        const c = centroCasilla(i);
        dibujarMago(ctx, c.x, c.y, s, m.tipo, m.nivel, m);
    });
    // Enemigos
    for (const e of juego.enemigos) {
        const base = ENEMIGOS[e.tipo];
        const pos = posicionEn(e.d);
        const r = base.r * s;
        const y = pos.y + Math.sin(e.fase * 8) * 1.5;
        ctx.fillStyle = "#0005";
        ctx.beginPath();
        ctx.ellipse(pos.x, pos.y + r * 0.9, r * 0.8, r * 0.25, 0, 0, TAU);
        ctx.fill();
        const gr = ctx.createRadialGradient(pos.x - r * 0.3, y - r * 0.3, 1, pos.x, y, r);
        gr.addColorStop(0, "#fff");
        gr.addColorStop(0.3, e.veneno > 0 ? "#80ed99" : base.color);
        gr.addColorStop(1, "#10002b");
        ctx.fillStyle = e.golpe > 0 ? "#fff" : gr;
        ctx.beginPath();
        ctx.arc(pos.x, y, r, 0, TAU);
        ctx.fill();
        if (e.lento > 0) {
            ctx.strokeStyle = "#caf0f8";
            ctx.lineWidth = 2;
            ctx.stroke();
        }
        ctx.fillStyle = "#fff";
        ctx.beginPath();
        ctx.arc(pos.x - r * 0.3, y - r * 0.15, r * 0.22, 0, TAU);
        ctx.arc(pos.x + r * 0.3, y - r * 0.15, r * 0.22, 0, TAU);
        ctx.fill();
        ctx.fillStyle = "#d00000";
        ctx.beginPath();
        ctx.arc(pos.x - r * 0.28, y - r * 0.1, r * 0.1, 0, TAU);
        ctx.arc(pos.x + r * 0.32, y - r * 0.1, r * 0.1, 0, TAU);
        ctx.fill();
        if (e.tipo === "jefe") {
            ctx.fillStyle = "#ffd166";
            ctx.beginPath();
            ctx.moveTo(pos.x - r * 0.5, y - r * 0.8);
            for (let k = 0; k <= 4; k++) ctx.lineTo(pos.x - r * 0.5 + k * r * 0.25, y - r * (k % 2 ? 0.95 : 1.25));
            ctx.lineTo(pos.x + r * 0.5, y - r * 0.8);
            ctx.fill();
        }
        const w = Math.max(r * 2, 16);
        ctx.fillStyle = "#000a";
        ctx.fillRect(pos.x - w / 2, y - r - 8, w, 3);
        ctx.fillStyle = "#ff4d6d";
        ctx.fillRect(pos.x - w / 2, y - r - 8, w * Math.max(0, e.vida / e.max), 3);
    }
    // Proyectiles
    for (const b of juego.balas) {
        const t = TIPOS[b.tipo];
        b.rastro.forEach((r, k) => {
            ctx.globalAlpha = (1 - k / b.rastro.length) * 0.5;
            ctx.fillStyle = t.color;
            ctx.beginPath();
            ctx.arc(r.x, r.y, 4 - k * 0.6, 0, TAU);
            ctx.fill();
        });
        ctx.globalAlpha = 1;
        ctx.fillStyle = t.claro;
        ctx.shadowColor = t.color;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.tipo === "fuego" ? 6 : 4.5, 0, TAU);
        ctx.fill();
        ctx.shadowBlur = 0;
    }
    for (const r of juego.rayos) {
        r.vida -= dt;
        ctx.strokeStyle = "#fff3b0";
        ctx.lineWidth = 2.5;
        ctx.shadowColor = "#ffd166";
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.moveTo(r.x1, r.y1);
        for (let k = 1; k < 5; k++) ctx.lineTo(r.x1 + ((r.x2 - r.x1) * k) / 5 + (Math.random() - 0.5) * 10, r.y1 + ((r.y2 - r.y1) * k) / 5 + (Math.random() - 0.5) * 10);
        ctx.lineTo(r.x2, r.y2);
        ctx.stroke();
        ctx.shadowBlur = 0;
    }
    juego.rayos = juego.rayos.filter((r) => r.vida > 0);
    chispas.dibujar(ctx, dt);
    // Mago que estás arrastrando
    if (arrastre) {
        const m = juego.magos[arrastre.desde];
        ctx.globalAlpha = 0.85;
        dibujarMago(ctx, arrastre.x, arrastre.y, s * 1.15, m.tipo, m.nivel);
        ctx.globalAlpha = 1;
    }
    for (const t of juego.textos) {
        t.vida -= dt;
        t.y -= dt * 25;
        ctx.globalAlpha = Math.max(0, Math.min(1, (t.vida / t.total) * 2));
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
}

bucle((dt) => {
    if (juego?.vivo && $("menu").hidden && $("lab").hidden) for (let k = 0; k < juego.velocidad; k++) paso(dt);
    dibujar(dt);
});

// ---------- Arrastrar para fusionar ----------
function casillaEn(x, y) {
    const c = Math.floor((x - gx) / s);
    const f = Math.floor((y - gy) / s);
    return c >= 0 && f >= 0 && c < COLS && f < FILAS ? f * COLS + c : -1;
}
function puntoLocal(e) {
    const caja = $("lienzo").getBoundingClientRect();
    return { x: e.clientX - caja.left, y: e.clientY - caja.top };
}
$("lienzo").addEventListener("pointerdown", (e) => {
    if (!juego?.vivo) return;
    const p = puntoLocal(e);
    const i = casillaEn(p.x, p.y);
    if (i < 0 || !juego.magos[i]) return;
    arrastre = { desde: i, ...p };
    $("lienzo").setPointerCapture(e.pointerId);
    vibrar(8);
});
$("lienzo").addEventListener("pointermove", (e) => {
    if (!arrastre) return;
    Object.assign(arrastre, puntoLocal(e));
});
$("lienzo").addEventListener("pointerup", (e) => {
    if (!arrastre) return;
    const p = puntoLocal(e);
    const destino = casillaEn(p.x, p.y);
    const a = juego.magos[arrastre.desde];
    const b = destino >= 0 ? juego.magos[destino] : null;
    if (destino >= 0 && destino !== arrastre.desde) {
        if (b && b.tipo === a.tipo && b.nivel === a.nivel && b.nivel < MAX_NIVEL) {
            b.nivel++;
            b.aparece = 0.3;
            juego.magos[arrastre.desde] = null;
            const c = centroCasilla(destino);
            chispas.emitir(c.x, c.y, TIPOS[b.tipo].color, 26, 180);
            chispas.emitir(c.x, c.y, "#ffd166", 12, 120);
            texto(c.x, c.y - s * 0.4, `¡Nivel ${b.nivel}!`, TIPOS[b.tipo].claro, 1, 14);
            vibrar([20, 30, 40]);
        } else if (!b) {
            juego.magos[destino] = a;
            juego.magos[arrastre.desde] = null;
        }
    }
    arrastre = null;
    pintar();
});

// ---------- Interfaz ----------
function pintar() {
    $("oleada").textContent = juego?.oleada ?? 0;
    $("vidas").textContent = juego?.vidas ?? 10;
    $("mana").textContent = Math.floor(juego?.mana ?? 0);
    $("cristales").textContent = estado.cristales;
    const libres = juego ? juego.magos.filter((m) => !m).length : 0;
    $("costo").textContent = juego ? (libres ? `${costoInvocar()} maná` : "grilla llena") : "10 maná";
    $("invocar").disabled = !juego?.vivo || !libres || juego.mana < costoInvocar();
    $("oleada-btn").disabled = !juego?.vivo || juego.enCurso;
    $("oleada-btn").textContent = juego?.enCurso ? "En curso" : "▶ Oleada";
}
setInterval(() => juego && pintar(), 300);

$("invocar").addEventListener("click", invocar);
$("oleada-btn").addEventListener("click", lanzarOleada);
$("velocidad").addEventListener("click", () => {
    if (!juego) return;
    juego.velocidad = (juego.velocidad % 3) + 1;
    $("velocidad").textContent = `×${juego.velocidad}`;
});
$("jugar").addEventListener("click", () => {
    chispas.limpiar();
    nuevo();
    $("velocidad").textContent = "×1";
});

function pintarLab() {
    $("cristales-lab").textContent = estado.cristales;
    $("lista-lab").innerHTML = LAB.map((m) => {
        const n = lab(m.id);
        const tope = n >= m.max;
        return `<button class="mejora-m" data-id="${m.id}" type="button" ${tope || estado.cristales < m.costo(n) ? "disabled" : ""}>
            <span class="ico">${m.ico}</span><span class="txt">${m.nombre}<small>${m.detalle} · ${n}/${m.max}</small></span>
            <span class="precio">${tope ? "Máx" : `💠 ${m.costo(n)}`}</span></button>`;
    }).join("");
}
$("lista-lab").addEventListener("click", (e) => {
    const b = e.target.closest(".mejora-m");
    if (!b || b.disabled) return;
    const m = LAB.find((x) => x.id === b.dataset.id);
    const costo = m.costo(lab(m.id));
    if (estado.cristales < costo) return;
    estado.cristales -= costo;
    estado.lab[m.id] = lab(m.id) + 1;
    guardar(CLAVE, estado);
    vibrar(25);
    pintarLab();
    pintar();
});
$("abrir-lab").addEventListener("click", () => {
    pintarLab();
    $("menu").hidden = true;
    $("lab").hidden = false;
});
$("cerrar-lab").addEventListener("click", () => {
    $("lab").hidden = true;
    $("menu").hidden = false;
});
pintar();
