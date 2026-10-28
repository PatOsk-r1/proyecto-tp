// Muralla: los enemigos bajan hacia el castillo. Mantené el dedo para apuntar la ballesta (dispara sola).
// Entre oleadas se compran mejoras con oro; las gemas compran mejoras permanentes en la forja.
import { cargar, guardar, vibrar } from "../../js/comun3d.js";
import { crearLienzo, bucle, crearChispas } from "../../js/lienzo2d.js";

const $ = (id) => document.getElementById(id);
const CLAVE = "muralla";
const TAU = Math.PI * 2;

const ENEMIGOS = {
    duende: { vida: 10, vel: 55, oro: 2, radio: 11, color: "#80b918", dano: 3 },
    orco: { vida: 28, vel: 36, oro: 4, radio: 15, color: "#55a630", dano: 6 },
    murcielago: { vida: 8, vel: 70, oro: 3, radio: 10, color: "#6a4c93", dano: 3, vuela: true },
    escudo: { vida: 45, vel: 30, oro: 6, radio: 16, color: "#8d99ae", dano: 10, armadura: 0.5 },
    troll: { vida: 120, vel: 22, oro: 14, radio: 24, color: "#386641", dano: 25 },
    dragon: { vida: 900, vel: 18, oro: 120, radio: 38, color: "#d00000", dano: 60, vuela: true },
};

// Mejoras de la partida: nivel → efecto. costo(n)
const MEJORAS = [
    { id: "dano", ico: "🗡️", nombre: "Puntas de acero", detalle: (n) => `Daño ${10 + n * 6}`, costo: (n) => 20 + n * 18, max: 15 },
    { id: "cadencia", ico: "⏱️", nombre: "Mecanismo rápido", detalle: (n) => `${(1 / cadencia(n)).toFixed(1)} flechas/s`, costo: (n) => 25 + n * 20, max: 10 },
    { id: "flechas", ico: "🏹", nombre: "Flechas múltiples", detalle: (n) => `${1 + n} por disparo`, costo: (n) => 60 + n * 70, max: 4 },
    { id: "perforar", ico: "📌", nombre: "Perforación", detalle: (n) => `Atraviesa ${n} enemigos`, costo: (n) => 50 + n * 60, max: 4 },
    { id: "fuego", ico: "🔥", nombre: "Flechas de fuego", detalle: (n) => (n ? `Queman ${n * 4} por segundo` : "Queman a los enemigos"), costo: (n) => 70 + n * 60, max: 5 },
    { id: "arqueros", ico: "🧝", nombre: "Arqueros en la muralla", detalle: (n) => `${n} arqueros disparan solos`, costo: (n) => 80 + n * 80, max: 6 },
    { id: "muro", ico: "🧱", nombre: "Muralla reforzada", detalle: (n) => `Vida máxima ${150 + n * 40}`, costo: (n) => 30 + n * 25, max: 10 },
];
const FORJA = [
    { id: "oro", ico: "🪙", nombre: "Cofre real", detalle: "+30 de oro al empezar", max: 10, costo: (n) => 2 + n * 2 },
    { id: "dano", ico: "⚔️", nombre: "Herrería", detalle: "+10% de daño", max: 15, costo: (n) => 3 + n * 2 },
    { id: "muro", ico: "🏰", nombre: "Piedra encantada", detalle: "+25 de vida de la muralla", max: 10, costo: (n) => 3 + n * 2 },
];
function cadencia(n) {
    return 0.45 * 0.88 ** n;
}

const estado = cargar(CLAVE, { gemas: 0, forja: {}, mejor: 0 });
const forja = (id) => estado.forja[id] ?? 0;

const chispas = crearChispas();
let ancho = 300;
let alto = 400;
const lienzo = crearLienzo($("lienzo"), (d) => {
    ancho = d.ancho;
    alto = d.alto;
});
const yMuro = () => alto - 70;
const ballesta = () => ({ x: ancho / 2, y: alto - 42 });

let juego = null;
let apuntando = null;

function nuevo() {
    juego = {
        oleada: 0,
        oro: 40 + forja("oro") * 30,
        niveles: Object.fromEntries(MEJORAS.map((m) => [m.id, 0])),
        vida: 0,
        enemigos: [],
        flechas: [],
        textos: [],
        cola: [],
        espera: 0,
        recarga: 0,
        recargaArqueros: 0,
        angulo: -Math.PI / 2,
        enCurso: false,
        vivo: true,
        sacudida: 0,
    };
    juego.vida = vidaMax();
    $("menu").hidden = true;
    siguienteOleada();
}
const nivel = (id) => juego.niveles[id];
const vidaMax = () => 150 + nivel("muro") * 40 + forja("muro") * 25;
const danoFlecha = () => (10 + nivel("dano") * 6) * (1 + forja("dano") * 0.1);

function siguienteOleada() {
    juego.oleada++;
    const n = juego.oleada;
    const tipos = ["duende"];
    if (n >= 2) tipos.push("orco");
    if (n >= 3) tipos.push("murcielago");
    if (n >= 5) tipos.push("escudo");
    if (n >= 7) tipos.push("troll");
    const cantidad = 8 + Math.floor(n * 2.2);
    juego.cola = Array.from({ length: cantidad }, (_, k) => (k < 3 ? "duende" : tipos[Math.floor(Math.random() * tipos.length)]));
    if (n % 10 === 0) juego.cola.push("dragon");
    juego.fuerza = 1.13 ** (n - 1);
    juego.espera = 1;
    juego.enCurso = true;
    $("tienda").hidden = true;
    pintar();
}

function paso(dt) {
    // Aparecen enemigos
    if (juego.cola.length) {
        juego.espera -= dt;
        if (juego.espera <= 0) {
            const tipo = juego.cola.shift();
            const b = ENEMIGOS[tipo];
            const vida = b.vida * juego.fuerza;
            juego.enemigos.push({ tipo, x: 30 + Math.random() * (ancho - 60), y: -30, vida, max: vida, fase: Math.random() * 6, golpe: 0, quema: 0, pegando: 0 });
            juego.espera = Math.max(0.3, 1.1 - juego.oleada * 0.03);
        }
    }
    // Ballesta: dispara sola mientras apuntás
    const b = ballesta();
    if (apuntando) {
        // Ayuda de puntería: si hay un enemigo cerca de donde apuntás, apunta a él
        const cercano = juego.enemigos.filter((e) => Math.hypot(e.x - apuntando.x, e.y - apuntando.y) < 80).sort((p, q) => Math.hypot(p.x - apuntando.x, p.y - apuntando.y) - Math.hypot(q.x - apuntando.x, q.y - apuntando.y))[0];
        const objetivo = cercano ?? apuntando;
        juego.angulo = Math.atan2(objetivo.y - b.y, objetivo.x - b.x);
    }
    juego.recarga -= dt;
    if (apuntando && juego.recarga <= 0) {
        juego.recarga = cadencia(nivel("cadencia"));
        const cuantas = 1 + nivel("flechas");
        for (let k = 0; k < cuantas; k++) {
            const a = juego.angulo + (k - (cuantas - 1) / 2) * 0.09;
            disparar(b.x, b.y, a, danoFlecha(), true);
        }
        vibrar(4);
    }
    // Arqueros aliados: apuntan al más cercano a la muralla
    juego.recargaArqueros -= dt;
    if (nivel("arqueros") && juego.recargaArqueros <= 0 && juego.enemigos.length) {
        juego.recargaArqueros = 1.1 / nivel("arqueros");
        const objetivo = juego.enemigos.reduce((a, e) => (e.y > a.y ? e : a));
        const k = Math.floor(Math.random() * nivel("arqueros"));
        const ax = posArquero(k);
        disparar(ax, yMuro() - 4, Math.atan2(objetivo.y - yMuro(), objetivo.x - ax), danoFlecha() * 0.6, false);
    }
    // Flechas
    for (const f of juego.flechas) {
        f.x += Math.cos(f.a) * 620 * dt;
        f.y += Math.sin(f.a) * 620 * dt;
        for (const e of juego.enemigos) {
            if (e.vida <= 0 || f.tocados.includes(e)) continue;
            if (Math.hypot(e.x - f.x, e.y - f.y) < ENEMIGOS[e.tipo].radio + 4) {
                f.tocados.push(e);
                danar(e, f.dano);
                if (nivel("fuego") && f.principal) e.quema = 3;
                if (f.tocados.length > nivel("perforar")) {
                    f.usada = true;
                    break;
                }
            }
        }
        if (f.y < -20 || f.x < -20 || f.x > ancho + 20) f.usada = true;
    }
    juego.flechas = juego.flechas.filter((f) => !f.usada);
    // Enemigos: bajan; al llegar a la muralla la golpean
    for (const e of juego.enemigos) {
        const base = ENEMIGOS[e.tipo];
        e.fase += dt;
        e.golpe = Math.max(0, e.golpe - dt);
        if (e.quema > 0) {
            e.quema -= dt;
            danar(e, nivel("fuego") * 4 * dt * juego.fuerza ** 0.5, false);
        }
        if (e.y < yMuro() - base.radio) {
            e.y += base.vel * dt;
            if (base.vuela) e.x += Math.sin(e.fase * 3) * 40 * dt;
            e.x = Math.max(base.radio, Math.min(ancho - base.radio, e.x));
        } else {
            e.pegando -= dt;
            if (e.pegando <= 0) {
                e.pegando = 1;
                juego.vida -= base.dano * Math.sqrt(juego.fuerza);
                juego.sacudida = 0.2;
                chispas.emitir(e.x, yMuro(), "#adb5bd", 6, 90);
                vibrar(40);
                if (juego.vida <= 0) return fin();
            }
        }
    }
    juego.enemigos = juego.enemigos.filter((e) => e.vida > 0);
    if (juego.enCurso && !juego.cola.length && !juego.enemigos.length) terminarOleada();
}

function disparar(x, y, a, dano, principal) {
    juego.flechas.push({ x, y, a, dano, principal, tocados: [] });
}

function danar(e, dano, mostrar = true) {
    if (e.vida <= 0) return;
    const base = ENEMIGOS[e.tipo];
    const real = dano * (1 - (base.armadura ?? 0));
    e.vida -= real;
    if (mostrar) {
        e.golpe = 0.07;
        if (real > 15) juego.textos.push({ x: e.x, y: e.y - base.radio, t: Math.round(real), color: "#fff", vida: 0.6, tam: 12 });
    }
    if (e.vida <= 0) {
        const oro = Math.round(base.oro * (1 + juego.oleada * 0.05));
        juego.oro += oro;
        chispas.emitir(e.x, e.y, base.color, e.tipo === "dragon" ? 50 : 12, e.tipo === "dragon" ? 260 : 140);
        juego.textos.push({ x: e.x, y: e.y, t: `+${oro}`, color: "#ffd166", vida: 0.9, tam: 13 });
        if (e.tipo === "dragon") {
            juego.sacudida = 0.6;
            vibrar([80, 40, 160]);
        }
    }
}

function terminarOleada() {
    juego.enCurso = false;
    const gemas = 1 + (juego.oleada % 5 === 0 ? 2 : 0);
    estado.gemas += gemas;
    estado.mejor = Math.max(estado.mejor, juego.oleada);
    guardar(CLAVE, estado);
    // La muralla se repara un poco entre oleadas
    juego.vida = Math.min(vidaMax(), juego.vida + vidaMax() * 0.25);
    apuntando = null;
    $("titulo-tienda").innerHTML = `¡Oleada ${juego.oleada} superada! <span style="color:#7df9ff">+${gemas} 💎</span>`;
    pintarTienda();
    $("tienda").hidden = false;
    vibrar([30, 40, 60]);
    pintar();
}

function fin() {
    juego.vivo = false;
    estado.mejor = Math.max(estado.mejor, juego.oleada);
    guardar(CLAVE, estado);
    vibrar(300);
    setTimeout(() => {
        $("titulo-menu").innerHTML = `¡Cayó la muralla!<div class="chico">Aguantaste hasta la oleada ${juego.oleada} · récord ${estado.mejor}. Gastá tus gemas en la forja.</div>`;
        $("jugar").textContent = "Defender otra vez";
        $("menu").hidden = false;
        pintar();
    }, 700);
}

// ---------- Dibujo ----------
const posArquero = (k) => ancho * ((k + 1) / (nivel("arqueros") + 1));
const arboles = Array.from({ length: 14 }, () => ({ x: Math.random(), y: Math.random() * 0.75, r: 0.6 + Math.random() * 0.6 }));

function dibujarEnemigo(ctx, e) {
    const base = ENEMIGOS[e.tipo];
    const r = base.radio;
    const paso = Math.sin(e.fase * 10);
    ctx.save();
    ctx.translate(e.x, e.y);
    ctx.fillStyle = "#0004";
    ctx.beginPath();
    ctx.ellipse(0, r * (base.vuela ? 1.6 : 0.9), r * 0.8, r * 0.25, 0, 0, TAU);
    ctx.fill();
    const color = e.golpe > 0 ? "#fff" : e.quema > 0 ? "#ff9f1c" : base.color;
    if (base.vuela) {
        // Alas
        ctx.fillStyle = e.tipo === "dragon" ? "#9d0208" : "#4a2c6b";
        for (const lado of [-1, 1]) {
            ctx.beginPath();
            ctx.moveTo(lado * r * 0.3, 0);
            ctx.lineTo(lado * r * 1.6, -r * (0.6 + paso * 0.4));
            ctx.lineTo(lado * r * 1.1, r * 0.4);
            ctx.closePath();
            ctx.fill();
        }
    } else {
        ctx.fillStyle = "#3d2b1f";
        for (const lado of [-1, 1]) ctx.fillRect(lado * r * 0.35 - 3, r * 0.5 + lado * paso * 2, 6, r * 0.5);
    }
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.8, 0, TAU);
    ctx.fill();
    // Ojos y detalles
    ctx.fillStyle = e.tipo === "dragon" ? "#ffd166" : "#fff";
    ctx.beginPath();
    ctx.arc(-r * 0.28, -r * 0.1, r * 0.16, 0, TAU);
    ctx.arc(r * 0.28, -r * 0.1, r * 0.16, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "#000";
    ctx.beginPath();
    ctx.arc(-r * 0.28, -r * 0.05, r * 0.08, 0, TAU);
    ctx.arc(r * 0.28, -r * 0.05, r * 0.08, 0, TAU);
    ctx.fill();
    if (e.tipo === "escudo") {
        ctx.fillStyle = "#ced4da";
        ctx.beginPath();
        ctx.roundRect(-r * 0.7, r * 0.1, r * 1.4, r * 0.7, 4);
        ctx.fill();
        ctx.fillStyle = "#e63946";
        ctx.fillRect(-2, r * 0.15, 4, r * 0.6);
    }
    if (e.tipo === "troll" || e.tipo === "orco") {
        ctx.fillStyle = "#fff";
        ctx.beginPath();
        ctx.moveTo(-r * 0.35, r * 0.3);
        ctx.lineTo(-r * 0.25, r * 0.05);
        ctx.lineTo(-r * 0.15, r * 0.3);
        ctx.moveTo(r * 0.35, r * 0.3);
        ctx.lineTo(r * 0.25, r * 0.05);
        ctx.lineTo(r * 0.15, r * 0.3);
        ctx.fill();
    }
    if (e.tipo === "dragon") {
        ctx.fillStyle = "#ffd166";
        for (const lado of [-1, 1]) {
            ctx.beginPath();
            ctx.moveTo(lado * r * 0.4, -r * 0.6);
            ctx.lineTo(lado * r * 0.6, -r * 1.1);
            ctx.lineTo(lado * r * 0.2, -r * 0.7);
            ctx.fill();
        }
    }
    ctx.restore();
    if (e.vida < e.max) {
        const w = Math.max(r * 2, 18);
        ctx.fillStyle = "#000a";
        ctx.fillRect(e.x - w / 2, e.y - r - 9, w, 4);
        ctx.fillStyle = "#e63946";
        ctx.fillRect(e.x - w / 2, e.y - r - 9, w * Math.max(0, e.vida / e.max), 4);
    }
}

function dibujar(dt) {
    const { ctx } = lienzo;
    ctx.save();
    if (juego?.sacudida > 0) {
        ctx.translate((Math.random() - 0.5) * 10 * juego.sacudida * 3, (Math.random() - 0.5) * 10 * juego.sacudida * 3);
        juego.sacudida = Math.max(0, juego.sacudida - dt);
    }
    // Pasto y árboles
    const g = ctx.createLinearGradient(0, 0, 0, alto);
    g.addColorStop(0, "#3d4f24");
    g.addColorStop(1, "#6a994e");
    ctx.fillStyle = g;
    ctx.fillRect(-20, -20, ancho + 40, alto + 40);
    for (const a of arboles) {
        const x = a.x * ancho;
        const y = a.y * yMuro();
        // Pinos (con forma distinta a los enemigos para no confundirlos)
        ctx.fillStyle = "#0003";
        ctx.beginPath();
        ctx.ellipse(x + 4, y + 16 * a.r, 10 * a.r, 4 * a.r, 0, 0, TAU);
        ctx.fill();
        ctx.fillStyle = "#5c3a1e";
        ctx.fillRect(x - 2 * a.r, y + 8 * a.r, 4 * a.r, 8 * a.r);
        for (const [dy, w] of [[8, 13], [0, 10], [-8, 7]]) {
            ctx.fillStyle = dy === -8 ? "#2d6a4f" : "#1b4332";
            ctx.beginPath();
            ctx.moveTo(x - w * a.r, y + dy * a.r + 4 * a.r);
            ctx.lineTo(x, y + dy * a.r - 10 * a.r);
            ctx.lineTo(x + w * a.r, y + dy * a.r + 4 * a.r);
            ctx.fill();
        }
    }
    // Muralla de piedra con almenas
    const ym = yMuro();
    ctx.fillStyle = "#6c757d";
    ctx.fillRect(0, ym, ancho, alto - ym);
    ctx.fillStyle = "#868e96";
    for (let x = 0; x < ancho; x += 26) ctx.fillRect(x + 2, ym - 12, 18, 14);
    ctx.strokeStyle = "#495057";
    ctx.lineWidth = 1;
    for (let y = ym + 10; y < alto; y += 14) {
        for (let x = (y / 14) % 2 ? 0 : 13; x < ancho; x += 26) ctx.strokeRect(x, y, 26, 14);
    }
    // Daño en la muralla
    if (juego) {
        const dano = 1 - juego.vida / vidaMax();
        ctx.strokeStyle = "#212529";
        ctx.lineWidth = 2;
        for (let k = 0; k < dano * 8; k++) {
            const x = ((k * 97) % ancho) + 10;
            ctx.beginPath();
            ctx.moveTo(x, ym);
            ctx.lineTo(x + 8, ym + 14);
            ctx.lineTo(x - 4, ym + 24);
            ctx.stroke();
        }
    }
    if (!juego) return ctx.restore();
    // Arqueros aliados
    for (let k = 0; k < nivel("arqueros"); k++) {
        const x = posArquero(k);
        ctx.fillStyle = "#2d6a4f";
        ctx.beginPath();
        ctx.arc(x, ym - 16, 7, 0, TAU);
        ctx.fill();
        ctx.fillStyle = "#ffd6a5";
        ctx.beginPath();
        ctx.arc(x, ym - 25, 5, 0, TAU);
        ctx.fill();
    }
    for (const e of [...juego.enemigos].sort((a, b) => a.y - b.y)) dibujarEnemigo(ctx, e);
    // Flechas
    for (const f of juego.flechas) {
        ctx.save();
        ctx.translate(f.x, f.y);
        ctx.rotate(f.a);
        ctx.fillStyle = "#8d5a2b";
        ctx.fillRect(-12, -1, 16, 2);
        ctx.fillStyle = f.principal && nivel("fuego") ? "#ff7a1a" : "#ced4da";
        ctx.beginPath();
        ctx.moveTo(4, -3);
        ctx.lineTo(10, 0);
        ctx.lineTo(4, 3);
        ctx.fill();
        ctx.restore();
    }
    // Línea de mira y ballesta
    const b = ballesta();
    if (apuntando) {
        ctx.strokeStyle = "#ffffff44";
        ctx.setLineDash([6, 8]);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(b.x, b.y);
        ctx.lineTo(b.x + Math.cos(juego.angulo) * alto, b.y + Math.sin(juego.angulo) * alto);
        ctx.stroke();
        ctx.setLineDash([]);
    }
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.fillStyle = "#495057";
    ctx.beginPath();
    ctx.arc(0, 0, 18, 0, TAU);
    ctx.fill();
    ctx.rotate(juego.angulo);
    ctx.fillStyle = "#6f4518";
    ctx.fillRect(-6, -5, 34, 10);
    ctx.strokeStyle = "#3d2b1f";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(18, 0, 18, -1.2, 1.2);
    ctx.stroke();
    ctx.restore();
    chispas.dibujar(ctx, dt);
    for (const t of juego.textos) {
        t.vida -= dt;
        t.y -= dt * 30;
        ctx.globalAlpha = Math.max(0, Math.min(1, t.vida * 2));
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
    ctx.restore();
}

bucle((dt) => {
    if (juego?.vivo && juego.enCurso && $("menu").hidden && $("tienda").hidden) paso(dt);
    dibujar(dt);
});
setInterval(() => juego && pintar(), 250);

// ---------- Controles ----------
function puntoLocal(e) {
    const caja = $("lienzo").getBoundingClientRect();
    return { x: e.clientX - caja.left, y: Math.min(e.clientY - caja.top, yMuro() - 20) };
}
$("lienzo").addEventListener("pointerdown", (e) => {
    apuntando = puntoLocal(e);
    $("lienzo").setPointerCapture(e.pointerId);
});
$("lienzo").addEventListener("pointermove", (e) => apuntando && (apuntando = puntoLocal(e)));
$("lienzo").addEventListener("pointerup", () => (apuntando = null));
$("lienzo").addEventListener("pointercancel", () => (apuntando = null));

// ---------- Interfaz ----------
function pintar() {
    $("oleada").textContent = juego?.oleada ?? 0;
    $("vida").textContent = juego ? Math.max(0, Math.ceil(juego.vida)) : 150 + forja("muro") * 25;
    $("oro").textContent = juego?.oro ?? 40 + forja("oro") * 30;
    $("gemas").textContent = estado.gemas;
}

function pintarTienda() {
    $("oro-tienda").textContent = juego.oro;
    const reparar = Math.ceil(vidaMax() - juego.vida);
    $("lista").innerHTML =
        `<button class="item-m" data-reparar type="button" ${reparar <= 0 || juego.oro < Math.ceil(reparar * 0.5) ? "disabled" : ""}>
            <span class="ico">🔧</span><span class="txt">Reparar muralla<small>${Math.ceil(juego.vida)}/${vidaMax()} de vida</small></span>
            <span class="precio">${reparar <= 0 ? "Entera" : `🪙 ${Math.ceil(reparar * 0.5)}`}</span></button>` +
        MEJORAS.map((m) => {
            const n = nivel(m.id);
            const tope = n >= m.max;
            return `<button class="item-m" data-id="${m.id}" type="button" ${tope || juego.oro < m.costo(n) ? "disabled" : ""}>
                <span class="ico">${m.ico}</span><span class="txt">${m.nombre} <small>Ahora: ${m.detalle(n)}${tope ? "" : ` → ${m.detalle(n + 1)}`}</small></span>
                <span class="precio">${tope ? "Máx" : `🪙 ${m.costo(n)}`}</span></button>`;
        }).join("");
}
$("lista").addEventListener("click", (e) => {
    const b = e.target.closest(".item-m");
    if (!b || b.disabled) return;
    if (b.dataset.reparar !== undefined) {
        const costo = Math.ceil((vidaMax() - juego.vida) * 0.5);
        if (juego.oro < costo) return;
        juego.oro -= costo;
        juego.vida = vidaMax();
    } else {
        const m = MEJORAS.find((x) => x.id === b.dataset.id);
        const costo = m.costo(nivel(m.id));
        if (juego.oro < costo) return;
        juego.oro -= costo;
        const antes = vidaMax();
        juego.niveles[m.id]++;
        if (m.id === "muro") juego.vida += vidaMax() - antes;
    }
    vibrar(20);
    pintarTienda();
    pintar();
});
$("seguir").addEventListener("click", () => siguienteOleada());
$("jugar").addEventListener("click", () => {
    chispas.limpiar();
    nuevo();
});

function pintarForja() {
    $("gemas-forja").textContent = estado.gemas;
    $("lista-forja").innerHTML = FORJA.map((m) => {
        const n = forja(m.id);
        const tope = n >= m.max;
        return `<button class="item-m" data-id="${m.id}" type="button" ${tope || estado.gemas < m.costo(n) ? "disabled" : ""}>
            <span class="ico">${m.ico}</span><span class="txt">${m.nombre}<small>${m.detalle} · ${n}/${m.max}</small></span>
            <span class="precio" style="color:#7df9ff">${tope ? "Máx" : `💎 ${m.costo(n)}`}</span></button>`;
    }).join("");
}
$("lista-forja").addEventListener("click", (e) => {
    const b = e.target.closest(".item-m");
    if (!b || b.disabled) return;
    const m = FORJA.find((x) => x.id === b.dataset.id);
    const costo = m.costo(forja(m.id));
    if (estado.gemas < costo) return;
    estado.gemas -= costo;
    estado.forja[m.id] = forja(m.id) + 1;
    guardar(CLAVE, estado);
    vibrar(25);
    pintarForja();
    pintar();
});
$("abrir-forja").addEventListener("click", () => {
    pintarForja();
    $("menu").hidden = true;
    $("forja").hidden = false;
});
$("cerrar-forja").addEventListener("click", () => {
    $("forja").hidden = true;
    $("menu").hidden = false;
});
pintar();
