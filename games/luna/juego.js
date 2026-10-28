// Defensa lunar: los alienígenas bajan por 5 carriles. Los extractores dan energía para poner defensas.
// Cada nivel ganado da chips para el taller y destraba defensas nuevas.
import { cargar, guardar, vibrar } from "../../js/comun3d.js";
import { crearLienzo, bucle, crearChispas } from "../../js/lienzo2d.js";

const $ = (id) => document.getElementById(id);
const CLAVE = "luna";
const CARRILES = 5;
const FILAS = 8;

const DEFENSAS = {
    extractor: { nombre: "Extractor", costo: 50, vida: 300, recarga: 6, desde: 1, color: "#7df9ff" },
    torreta: { nombre: "Torreta", costo: 100, vida: 400, recarga: 6, desde: 1, color: "#4cc9f0", cada: 1.4, dano: 25 },
    muro: { nombre: "Muro", costo: 50, vida: 2400, recarga: 20, desde: 2, color: "#adb5bd" },
    mina: { nombre: "Mina", costo: 25, vida: 300, recarga: 22, desde: 3, color: "#ff9f1c", dano: 1100 },
    crio: { nombre: "Crio", costo: 150, vida: 300, recarga: 7, desde: 4, color: "#90e0ef", cada: 1.4, dano: 20, lento: true },
    doble: { nombre: "Doble", costo: 200, vida: 300, recarga: 7, desde: 6, color: "#4361ee", cada: 1.4, dano: 20, balas: 2 },
    tesla: { nombre: "Tesla", costo: 175, vida: 400, recarga: 10, desde: 8, color: "#c77dff", cada: 1.3, dano: 45 },
    bomba: { nombre: "Bomba", costo: 150, vida: 9999, recarga: 35, desde: 10, color: "#f72585", dano: 1800 },
    laser: { nombre: "Láser", costo: 300, vida: 350, recarga: 10, desde: 12, color: "#ff4d6d", cada: 2.2, dano: 60 },
};

const ALIENS = {
    comun: { vida: 190, velocidad: 0.22, mordida: 40, color: "#80ed99", desde: 1 },
    casco: { vida: 520, velocidad: 0.22, mordida: 40, color: "#57cc99", desde: 2, casco: true },
    rapido: { vida: 130, velocidad: 0.46, mordida: 35, color: "#ffd166", desde: 3 },
    saltador: { vida: 320, velocidad: 0.32, mordida: 40, color: "#f4a261", desde: 5, salta: true },
    escudo: { vida: 900, velocidad: 0.19, mordida: 70, color: "#4ea8de", desde: 7, casco: true },
    gigante: { vida: 2600, velocidad: 0.12, mordida: 500, color: "#38a3a5", desde: 9, gigante: true },
};

const TALLER = [
    { id: "energia", nombre: "Batería extra", detalle: (n) => `Empezás con +${25 * n} de energía`, max: 8 },
    { id: "dano", nombre: "Cañones afilados", detalle: (n) => `Las defensas pegan +${10 * n}%`, max: 15 },
    { id: "blindaje", nombre: "Blindaje", detalle: (n) => `Las defensas aguantan +${15 * n}%`, max: 10 },
    { id: "recarga", nombre: "Fábrica rápida", detalle: (n) => `Las cartas se recargan ${6 * n}% más rápido`, max: 8 },
    { id: "extraccion", nombre: "Taladros", detalle: (n) => `Los extractores dan +${10 * n}% de energía`, max: 10 },
];
const costoTaller = (n) => 3 + n * 3;

const estado = cargar(CLAVE, { chips: 0, maxNivel: 1, elegido: 1, taller: {} });
for (const m of TALLER) estado.taller[m.id] ??= 0;
const tal = (id) => estado.taller[id];

// ---------- Lienzo ----------
const chispas = crearChispas();
let juego = null;
let elegida = null;
let quitando = false;
let celda = 40;
let ox = 0;
let oy = 0;
let ancho = 300;
let alto = 400;
const lienzo = crearLienzo($("lienzo"), (d) => {
    ancho = d.ancho;
    alto = d.alto;
    // Una fila extra arriba para que aparezcan los aliens y media abajo para la base
    celda = Math.min(ancho / CARRILES, alto / (FILAS + 1.6));
    ox = (ancho - CARRILES * celda) / 2;
    oy = (alto - (FILAS + 1.6) * celda) / 2 + celda;
});
const aX = (x) => ox + x * celda;
const aY = (y) => oy + y * celda;

// Cráteres fijos
let semilla = 7;
const azar = () => ((semilla = (semilla * 16807) % 2147483647) / 2147483647);
const crateres = Array.from({ length: 26 }, () => ({ x: azar() * CARRILES, y: azar() * FILAS, r: 0.08 + azar() * 0.18 }));
const estrellas = Array.from({ length: 50 }, () => ({ x: azar(), y: azar(), r: azar() * 1.4 + 0.3, f: azar() * 6 }));

// ---------- Partida ----------
function armarNivel(n) {
    const tipos = Object.keys(ALIENS).filter((t) => ALIENS[t].desde <= n);
    const total = 6 + Math.round(n * 1.5);
    const lista = [];
    for (let i = 0; i < total; i++) {
        const comunes = i < 3 || Math.random() < 0.45;
        lista.push(comunes ? "comun" : tipos[Math.floor(Math.random() * tipos.length)]);
    }
    return lista;
}

function empezar(n) {
    juego = {
        nivel: n,
        energia: 150 + tal("energia") * 25,
        vidas: 5,
        defensas: [],
        aliens: [],
        balas: [],
        cristales: [],
        efectos: [],
        cola: armarNivel(n),
        total: 0,
        salidos: 0,
        espera: 20,
        cielo: 7,
        recargas: {},
        vivo: true,
        pausado: false,
        granOleada: false,
        alarma: 0,
        tiempo: 0,
    };
    juego.total = juego.cola.length;
    elegida = null;
    quitando = false;
    $("menu").hidden = true;
    $("pausa").hidden = false;
    armarCartas();
    pintar();
}

const fuerza = () => 1 + (juego.nivel - 1) * 0.05;
const danoDe = (tipo) => DEFENSAS[tipo].dano * (1 + tal("dano") * 0.1);
const recargaDe = (tipo) => DEFENSAS[tipo].recarga * (1 - tal("recarga") * 0.06);

function soltarAlien(tipo, carril = Math.floor(Math.random() * CARRILES)) {
    const base = ALIENS[tipo];
    const vida = base.vida * fuerza();
    juego.aliens.push({ tipo, carril, x: carril + 0.5, y: -0.6, vida, max: vida, lentoHasta: 0, golpe: 0, salto: 0, saltoHecho: false, comiendo: false, fase: Math.random() * 6 });
}

function paso(dt) {
    juego.tiempo += dt;
    const t = juego.tiempo;

    // Aparición de aliens: de a uno al principio, en grupo en la gran oleada final
    if (juego.cola.length) {
        juego.espera -= dt;
        if (!juego.granOleada && juego.salidos >= juego.total * 0.7) {
            juego.granOleada = true;
            juego.espera = 6;
            aviso("¡Gran oleada!", "#f72585");
            vibrar(80);
        }
        if (juego.espera <= 0) {
            if (juego.granOleada) {
                for (let k = 0; k < 2 && juego.cola.length; k++) {
                    soltarAlien(juego.cola.shift());
                    juego.salidos++;
                }
                juego.espera = 3.4;
            } else {
                soltarAlien(juego.cola.shift());
                juego.salidos++;
                juego.espera = Math.max(3.2, 10 - juego.nivel * 0.3 - juego.salidos * 0.25);
            }
        }
    }

    // Energía que cae del cielo
    juego.cielo -= dt;
    if (juego.cielo <= 0) {
        juego.cielo = 6.5;
        crearCristal(Math.random() * CARRILES, -0.5, 25, true);
    }

    // Defensas
    for (const d of juego.defensas) {
        const datos = DEFENSAS[d.tipo];
        d.golpe = Math.max(0, d.golpe - dt);
        if (d.tipo === "extractor") {
            d.carga += dt;
            if (d.carga >= 8) {
                d.carga = 0;
                crearCristal(d.c + 0.5, d.f + 0.2, Math.round(25 * (1 + tal("extraccion") * 0.1)));
            }
            continue;
        }
        if (d.tipo === "mina") {
            d.carga += dt;
            if (d.carga < 10) continue;
            const pisa = juego.aliens.find((a) => a.carril === d.c && Math.abs(a.y - (d.f + 0.5)) < 0.45 && !a.salto);
            if (pisa) explotar(d, d.c + 0.5, d.f + 0.5, 0.8);
            continue;
        }
        if (d.tipo === "bomba") {
            d.carga += dt;
            if (d.carga >= 0.9) explotar(d, d.c + 0.5, d.f + 0.5, 1.6);
            continue;
        }
        if (d.tipo === "muro") continue;
        d.carga -= dt;
        if (d.carga > 0) continue;
        if (d.tipo === "tesla") {
            const cerca = juego.aliens.filter((a) => Math.hypot(a.x - (d.c + 0.5), a.y - (d.f + 0.5)) < 1.5);
            if (!cerca.length) continue;
            d.carga = datos.cada;
            for (const a of cerca) {
                danar(a, danoDe("tesla"));
                juego.efectos.push({ tipo: "rayo", x1: d.c + 0.5, y1: d.f + 0.3, x2: a.x, y2: a.y, vida: 0.15 });
            }
            continue;
        }
        // Las que disparan por su carril hacia arriba, solo si hay algo adelante
        const adelante = juego.aliens.filter((a) => a.carril === d.c && a.y < d.f + 0.6 && a.y > -0.4);
        if (!adelante.length) continue;
        d.carga = datos.cada;
        d.retroceso = 0.12;
        if (d.tipo === "laser") {
            for (const a of adelante) danar(a, danoDe("laser"));
            juego.efectos.push({ tipo: "laser", c: d.c, f: d.f, vida: 0.2 });
            continue;
        }
        for (let k = 0; k < (datos.balas ?? 1); k++) {
            juego.balas.push({ c: d.c, x: d.c + 0.5 + (datos.balas ? (k - 0.5) * 0.2 : 0), y: d.f + 0.2 + k * 0.25, dano: danoDe(d.tipo), lento: datos.lento, color: datos.color });
        }
    }

    // Balas
    for (const b of juego.balas) {
        b.y -= 6 * dt;
        const blanco = juego.aliens.find((a) => a.carril === b.c && a.vida > 0 && Math.abs(a.y - b.y) < 0.3);
        if (blanco) {
            b.usada = true;
            danar(blanco, b.dano);
            if (b.lento) blanco.lentoHasta = t + 3;
            chispas.emitir(aX(b.x), aY(b.y), b.color, 4, 80);
        }
        if (b.y < -1) b.usada = true;
    }
    juego.balas = juego.balas.filter((b) => !b.usada);

    // Aliens: caminan, se paran a comer defensas, los saltadores pasan por arriba de la primera
    for (const a of juego.aliens) {
        const base = ALIENS[a.tipo];
        a.golpe = Math.max(0, a.golpe - dt);
        const vel = base.velocidad * (a.lentoHasta > t ? 0.5 : 1);
        if (a.salto > 0) {
            a.salto -= dt;
            a.y += dt * 1.6;
            continue;
        }
        const enfrente = juego.defensas.find((d) => d.c === a.carril && d.tipo !== "mina" && d.tipo !== "bomba" && a.y + 0.35 > d.f + 0.15 && a.y < d.f + 0.9);
        if (enfrente) {
            if (base.salta && !a.saltoHecho) {
                a.saltoHecho = true;
                a.salto = 0.7;
                continue;
            }
            a.comiendo = true;
            enfrente.vida -= base.mordida * dt * (base.gigante ? 1 : 1);
            enfrente.golpe = 0.1;
            if (enfrente.vida <= 0) {
                chispas.emitir(aX(enfrente.c + 0.5), aY(enfrente.f + 0.5), "#adb5bd", 14, 140);
                juego.defensas = juego.defensas.filter((d) => d !== enfrente);
            }
        } else {
            a.comiendo = false;
            a.y += vel * dt;
        }
        if (a.y > FILAS + 0.2) {
            a.fuera = true;
            juego.vidas--;
            juego.alarma = 0.6;
            vibrar(150);
            chispas.emitir(aX(a.x), aY(FILAS + 0.3), "#ff4d6d", 20, 180);
            if (juego.vidas <= 0) return terminar(false);
        }
    }
    juego.aliens = juego.aliens.filter((a) => !a.fuera && a.vida > 0);

    // Cristales: se juntan solos después de un rato o al tocarlos
    for (const c of juego.cristales) {
        c.vida += dt;
        if (c.cae && c.y < c.destino) c.y += dt * 1.2;
        if (c.volando) {
            c.x += (-0.5 - c.x) * dt * 5;
            c.y += (-1.3 - c.y) * dt * 5;
            if (c.y < -1.1) {
                c.usado = true;
                juego.energia += c.valor;
            }
        } else if (c.vida > 6) c.volando = true;
    }
    juego.cristales = juego.cristales.filter((c) => !c.usado);

    juego.alarma = Math.max(0, juego.alarma - dt);
    if (!juego.cola.length && !juego.aliens.length) terminar(true);
}

function crearCristal(x, y, valor, cae = false) {
    juego.cristales.push({ x, y, valor, cae, destino: 1 + Math.random() * (FILAS - 2), vida: 0, volando: false });
}

function explotar(d, x, y, radio) {
    chispas.emitir(aX(x), aY(y), "#ff9f1c", 30, 240);
    chispas.emitir(aX(x), aY(y), "#ffe066", 20, 160);
    juego.efectos.push({ tipo: "onda", x, y, radio, vida: 0.4 });
    for (const a of juego.aliens) if (Math.abs(a.x - x) <= radio && Math.abs(a.y - y) <= radio) danar(a, danoDe(d.tipo));
    juego.defensas = juego.defensas.filter((o) => o !== d);
    vibrar(60);
}

function danar(a, dano) {
    if (a.vida <= 0) return;
    a.vida -= dano;
    a.golpe = 0.08;
    if (a.vida <= 0) {
        chispas.emitir(aX(a.x), aY(a.y), ALIENS[a.tipo].color, ALIENS[a.tipo].gigante ? 30 : 14, 160);
    }
}

function aviso(texto, color = "#7df9ff") {
    juego.efectos.push({ tipo: "texto", texto, color, vida: 2 });
}

function terminar(gano) {
    if (!juego.vivo) return;
    juego.vivo = false;
    let texto;
    if (gano) {
        const chips = 2 + juego.nivel + (juego.vidas === 5 ? 2 : 0);
        estado.chips += chips;
        const nuevo = juego.nivel === estado.maxNivel;
        if (nuevo) estado.maxNivel++;
        estado.elegido = Math.min(estado.maxNivel, juego.nivel + 1);
        const destrabada = Object.values(DEFENSAS).find((d) => d.desde === juego.nivel + 1);
        texto = `¡Nivel ${juego.nivel} superado!<div class="chico">+${chips} chips${juego.vidas === 5 ? " (base intacta +2)" : ""}${nuevo && destrabada ? `<br>Nueva defensa: <b>${destrabada.nombre}</b>` : ""}</div>`;
        vibrar([40, 60, 40]);
    } else {
        texto = `Invadieron la base<div class="chico">Probá con más extractores al principio o mejorá algo en el taller.</div>`;
        vibrar(300);
    }
    guardar(CLAVE, estado);
    setTimeout(() => {
        $("titulo-menu").innerHTML = texto;
        abrirMenu();
    }, 900);
}

// ---------- Dibujo ----------
function dibujarDefensa(ctx, tipo, x, y, tam, d = {}) {
    const datos = DEFENSAS[tipo];
    const r = tam * 0.36;
    ctx.save();
    ctx.translate(x, y);
    if (d.golpe > 0) ctx.translate((Math.random() - 0.5) * 3, 0);
    ctx.fillStyle = "#0006";
    ctx.beginPath();
    ctx.ellipse(0, r * 0.85, r, r * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();
    const metal = ctx.createLinearGradient(0, -r, 0, r);
    metal.addColorStop(0, "#dee2e6");
    metal.addColorStop(1, "#495057");
    if (tipo === "extractor") {
        ctx.fillStyle = metal;
        ctx.beginPath();
        ctx.roundRect(-r * 0.8, -r * 0.2, r * 1.6, r, r * 0.2);
        ctx.fill();
        const carga = Math.min(1, (d.carga ?? 4) / 9);
        ctx.fillStyle = datos.color;
        ctx.shadowColor = datos.color;
        ctx.shadowBlur = 8 + carga * 10;
        ctx.beginPath();
        ctx.moveTo(0, -r * 1.1);
        ctx.lineTo(r * 0.4, -r * 0.3);
        ctx.lineTo(0, r * 0.3);
        ctx.lineTo(-r * 0.4, -r * 0.3);
        ctx.fill();
    } else if (tipo === "muro") {
        const dano = 1 - (d.vida ?? 1) / (d.max ?? 1);
        ctx.fillStyle = metal;
        ctx.beginPath();
        ctx.roundRect(-r, -r * 0.8, r * 2, r * 1.6, r * 0.25);
        ctx.fill();
        ctx.strokeStyle = "#343a40";
        ctx.lineWidth = 2;
        for (const yy of [-0.25, 0.3]) {
            ctx.beginPath();
            ctx.moveTo(-r, yy * r);
            ctx.lineTo(r, yy * r);
            ctx.stroke();
        }
        if (dano > 0.4) {
            ctx.beginPath();
            ctx.moveTo(-r * 0.3, -r * 0.8);
            ctx.lineTo(0, -r * 0.2);
            ctx.lineTo(-r * 0.2, r * 0.4);
            ctx.stroke();
        }
    } else if (tipo === "mina") {
        const armada = (d.carga ?? 10) >= 10;
        ctx.fillStyle = "#495057";
        ctx.beginPath();
        ctx.ellipse(0, r * 0.3, r * 0.75, r * 0.35, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = armada ? (Math.sin(performance.now() / 150) > 0 ? "#ff4d6d" : "#ff9f1c") : "#6c757d";
        ctx.beginPath();
        ctx.arc(0, r * 0.15, r * 0.2, 0, Math.PI * 2);
        ctx.fill();
    } else if (tipo === "bomba") {
        const s = 1 + Math.sin(performance.now() / 60) * 0.08;
        ctx.scale(s, s);
        ctx.fillStyle = "#212529";
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.75, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = datos.color;
        ctx.fillRect(-r * 0.75, -r * 0.12, r * 1.5, r * 0.24);
        ctx.fillStyle = "#ffe066";
        ctx.beginPath();
        ctx.arc(r * 0.45, -r * 0.7, r * 0.15, 0, Math.PI * 2);
        ctx.fill();
    } else if (tipo === "tesla") {
        ctx.fillStyle = metal;
        ctx.fillRect(-r * 0.2, -r * 0.4, r * 0.4, r * 1.2);
        ctx.fillRect(-r * 0.6, r * 0.5, r * 1.2, r * 0.3);
        ctx.fillStyle = datos.color;
        ctx.shadowColor = datos.color;
        ctx.shadowBlur = 14;
        ctx.beginPath();
        ctx.arc(0, -r * 0.55, r * 0.38, 0, Math.PI * 2);
        ctx.fill();
    } else {
        // Torretas: base redonda y cañón hacia arriba
        const atras = (d.retroceso ?? 0) * r * 2;
        ctx.fillStyle = metal;
        ctx.beginPath();
        ctx.arc(0, r * 0.2, r * 0.75, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#212529";
        const canones = tipo === "doble" ? [-0.25, 0.25] : [0];
        for (const dx of canones) ctx.fillRect(dx * r - r * 0.13, -r * 1.05 + atras, r * 0.26, r * 0.9);
        ctx.fillStyle = datos.color;
        ctx.shadowColor = datos.color;
        ctx.shadowBlur = tipo === "laser" ? 14 : 6;
        ctx.beginPath();
        ctx.arc(0, r * 0.1, r * 0.4, 0, Math.PI * 2);
        ctx.fill();
        if (tipo === "crio") {
            ctx.fillStyle = "#fff";
            ctx.font = `${r * 0.6}px sans-serif`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText("❄", 0, r * 0.12);
        }
    }
    ctx.restore();
    if (d.max && d.vida < d.max) {
        ctx.fillStyle = "#000a";
        ctx.fillRect(x - r, y + r * 1.05, r * 2, 3);
        ctx.fillStyle = "#7ee08f";
        ctx.fillRect(x - r, y + r * 1.05, r * 2 * (d.vida / d.max), 3);
    }
}

function dibujarAlien(ctx, a) {
    const base = ALIENS[a.tipo];
    const r = celda * (base.gigante ? 0.42 : 0.28);
    const x = aX(a.x) + Math.sin(a.fase + juego.tiempo * 2) * 2;
    const alturaSalto = a.salto > 0 ? Math.sin((a.salto / 0.7) * Math.PI) * celda * 0.7 : 0;
    const y = aY(a.y) - alturaSalto;
    const paso = Math.sin(juego.tiempo * 8 + a.fase);
    ctx.fillStyle = "#0005";
    ctx.beginPath();
    ctx.ellipse(aX(a.x), aY(a.y) + r * 0.8, r * 0.8, r * 0.25, 0, 0, Math.PI * 2);
    ctx.fill();
    // Patitas
    ctx.strokeStyle = "#1b4332";
    ctx.lineWidth = 3;
    for (const lado of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(x + lado * r * 0.35, y + r * 0.4);
        ctx.lineTo(x + lado * r * 0.45, y + r * 0.85 + lado * paso * 3);
        ctx.stroke();
    }
    // Antenas
    ctx.beginPath();
    ctx.moveTo(x - r * 0.3, y - r * 0.7);
    ctx.lineTo(x - r * 0.45, y - r * 1.2);
    ctx.moveTo(x + r * 0.3, y - r * 0.7);
    ctx.lineTo(x + r * 0.45, y - r * 1.2);
    ctx.stroke();
    ctx.fillStyle = "#ff4d6d";
    ctx.beginPath();
    ctx.arc(x - r * 0.45, y - r * 1.2, 3, 0, Math.PI * 2);
    ctx.arc(x + r * 0.45, y - r * 1.2, 3, 0, Math.PI * 2);
    ctx.fill();
    // Cuerpo
    const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, 1, x, y, r * 1.1);
    g.addColorStop(0, "#ffffff");
    g.addColorStop(0.3, base.color);
    g.addColorStop(1, "#081c15");
    ctx.fillStyle = a.golpe > 0 ? "#fff" : g;
    ctx.beginPath();
    ctx.ellipse(x, y, r * 0.8, r * (a.comiendo ? 0.9 + Math.abs(paso) * 0.1 : 0.95), 0, 0, Math.PI * 2);
    ctx.fill();
    if (a.lentoHasta > juego.tiempo) {
        ctx.fillStyle = "#90e0ef66";
        ctx.fill();
    }
    // Ojo grande que mira hacia abajo
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(x, y - r * 0.05, r * 0.36, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#000";
    ctx.beginPath();
    ctx.arc(x, y + r * 0.08, r * 0.17, 0, Math.PI * 2);
    ctx.fill();
    if (a.comiendo) {
        ctx.fillStyle = "#3a0a0a";
        ctx.beginPath();
        ctx.ellipse(x, y + r * 0.55, r * 0.3, r * 0.12 + Math.abs(paso) * r * 0.1, 0, 0, Math.PI * 2);
        ctx.fill();
    }
    if (base.casco) {
        ctx.fillStyle = a.tipo === "escudo" ? "#4ea8decc" : "#adb5bd";
        ctx.beginPath();
        ctx.ellipse(x, y - r * 0.55, r * 0.85, r * 0.45, 0, Math.PI, 0);
        ctx.fill();
    }
    if (base.gigante) {
        ctx.fillStyle = "#212529";
        ctx.fillRect(x - r * 0.6, y - r * 0.95, r * 1.2, r * 0.15);
    }
    if (a.vida < a.max) {
        ctx.fillStyle = "#000a";
        ctx.fillRect(x - r, y - r - 8, r * 2, 4);
        ctx.fillStyle = "#ff4d6d";
        ctx.fillRect(x - r, y - r - 8, r * 2 * Math.max(0, a.vida / a.max), 4);
    }
}

function dibujarCristal(ctx, x, y, tam) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.sin(performance.now() / 300) * 0.2);
    ctx.fillStyle = "#7df9ff";
    ctx.shadowColor = "#7df9ff";
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.moveTo(0, -tam);
    ctx.lineTo(tam * 0.6, 0);
    ctx.lineTo(0, tam);
    ctx.lineTo(-tam * 0.6, 0);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.moveTo(0, -tam * 0.7);
    ctx.lineTo(tam * 0.25, 0);
    ctx.lineTo(0, -tam * 0.1);
    ctx.fill();
    ctx.restore();
}

function dibujar(dt) {
    const { ctx } = lienzo;
    const g = ctx.createLinearGradient(0, 0, 0, alto);
    g.addColorStop(0, "#05061a");
    g.addColorStop(1, "#151a3a");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, ancho, alto);
    for (const e of estrellas) {
        ctx.globalAlpha = 0.4 + Math.sin(performance.now() / 700 + e.f) * 0.3;
        ctx.fillStyle = "#fff";
        ctx.fillRect(e.x * ancho, e.y * alto, e.r, e.r);
    }
    ctx.globalAlpha = 1;
    // Tierra a lo lejos
    ctx.fillStyle = "#3a86ff";
    ctx.beginPath();
    ctx.arc(ancho * 0.85, aY(-0.55), celda * 0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#52b788";
    ctx.beginPath();
    ctx.arc(ancho * 0.85 - celda * 0.08, aY(-0.6), celda * 0.15, 0, Math.PI * 2);
    ctx.fill();

    // Suelo lunar por carriles
    for (let f = 0; f < FILAS; f++) {
        for (let c = 0; c < CARRILES; c++) {
            ctx.fillStyle = (c + f) % 2 ? "#6c6f7d" : "#62656f";
            ctx.fillRect(aX(c), aY(f), celda + 0.5, celda + 0.5);
        }
    }
    for (const k of crateres) {
        ctx.fillStyle = "#4a4d57";
        ctx.beginPath();
        ctx.arc(aX(k.x), aY(k.y), k.r * celda, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#8a8d99";
        ctx.beginPath();
        ctx.arc(aX(k.x) + 1.5, aY(k.y) + 1.5, k.r * celda * 0.7, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#55585f";
        ctx.beginPath();
        ctx.arc(aX(k.x), aY(k.y), k.r * celda * 0.65, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.strokeStyle = "#0003";
    ctx.lineWidth = 2;
    for (let c = 1; c < CARRILES; c++) {
        ctx.beginPath();
        ctx.moveTo(aX(c), aY(0));
        ctx.lineTo(aX(c), aY(FILAS));
        ctx.stroke();
    }

    // Base al fondo
    const alarma = juego?.alarma > 0;
    const gb = ctx.createLinearGradient(0, aY(FILAS), 0, aY(FILAS + 0.6));
    gb.addColorStop(0, alarma ? "#ff4d6d" : "#4cc9f0");
    gb.addColorStop(1, "#0b0d1f");
    ctx.fillStyle = gb;
    ctx.fillRect(aX(0), aY(FILAS), CARRILES * celda, celda * 0.6);
    for (let c = 0; c < CARRILES; c++) {
        ctx.fillStyle = "#dee2e6";
        ctx.beginPath();
        ctx.arc(aX(c + 0.5), aY(FILAS + 0.45), celda * 0.28, Math.PI, 0);
        ctx.fill();
        ctx.fillStyle = alarma ? "#ff4d6d" : "#7df9ff";
        ctx.fillRect(aX(c + 0.5) - 3, aY(FILAS + 0.3), 6, 4);
    }

    if (!juego) return;

    // Casilla donde se puede poner
    if (elegida && juego.vivo) {
        ctx.fillStyle = "#7df9ff14";
        for (let f = 0; f < FILAS; f++) for (let c = 0; c < CARRILES; c++) if (!juego.defensas.some((d) => d.c === c && d.f === f)) ctx.fillRect(aX(c) + 2, aY(f) + 2, celda - 4, celda - 4);
    }

    for (const d of juego.defensas) dibujarDefensa(ctx, d.tipo, aX(d.c + 0.5), aY(d.f + 0.5), celda, d);
    for (const d of juego.defensas) d.retroceso = Math.max(0, (d.retroceso ?? 0) - dt);

    for (const a of [...juego.aliens].sort((p, q) => p.y - q.y)) dibujarAlien(ctx, a);

    for (const b of juego.balas) {
        ctx.fillStyle = b.color;
        ctx.shadowColor = b.color;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.ellipse(aX(b.x), aY(b.y), celda * 0.06, celda * 0.13, 0, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.shadowBlur = 0;

    for (const ef of juego.efectos) {
        ef.vida -= dt;
        if (ef.tipo === "rayo") {
            ctx.strokeStyle = "#e0aaff";
            ctx.lineWidth = 2;
            ctx.shadowColor = "#c77dff";
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.moveTo(aX(ef.x1), aY(ef.y1));
            for (let k = 1; k < 4; k++) ctx.lineTo(aX(ef.x1 + ((ef.x2 - ef.x1) * k) / 4) + (Math.random() - 0.5) * 10, aY(ef.y1 + ((ef.y2 - ef.y1) * k) / 4) + (Math.random() - 0.5) * 10);
            ctx.lineTo(aX(ef.x2), aY(ef.y2));
            ctx.stroke();
            ctx.shadowBlur = 0;
        } else if (ef.tipo === "laser") {
            ctx.fillStyle = `rgba(255,77,109,${ef.vida / 0.2})`;
            ctx.shadowColor = "#ff4d6d";
            ctx.shadowBlur = 16;
            ctx.fillRect(aX(ef.c + 0.5) - 3, aY(-1), 6, aY(ef.f + 0.2) - aY(-1));
            ctx.shadowBlur = 0;
        } else if (ef.tipo === "onda") {
            ctx.strokeStyle = `rgba(255,159,28,${ef.vida / 0.4})`;
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.arc(aX(ef.x), aY(ef.y), ef.radio * celda * (1.3 - ef.vida), 0, Math.PI * 2);
            ctx.stroke();
        } else if (ef.tipo === "texto") {
            ctx.globalAlpha = Math.min(1, ef.vida);
            ctx.font = "900 26px sans-serif";
            ctx.textAlign = "center";
            ctx.lineWidth = 4;
            ctx.strokeStyle = "#000";
            ctx.strokeText(ef.texto, ancho / 2, alto * 0.4);
            ctx.fillStyle = ef.color;
            ctx.fillText(ef.texto, ancho / 2, alto * 0.4);
            ctx.globalAlpha = 1;
        }
    }
    juego.efectos = juego.efectos.filter((ef) => ef.vida > 0);

    for (const c of juego.cristales) dibujarCristal(ctx, aX(c.x), aY(c.y), celda * 0.2);

    chispas.dibujar(ctx, dt);

    if (juego.pausado) {
        ctx.fillStyle = "#0008";
        ctx.fillRect(0, 0, ancho, alto);
        ctx.fillStyle = "#fff";
        ctx.font = "900 28px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("Pausa", ancho / 2, alto / 2);
    }
}

let acumulado = 0;
bucle((dt) => {
    if (juego?.vivo && !juego.pausado) {
        paso(dt);
        for (const tipo in juego.recargas) juego.recargas[tipo] = Math.max(0, juego.recargas[tipo] - dt);
    }
    dibujar(dt);
    acumulado += dt;
    if (acumulado > 0.1) {
        acumulado = 0;
        pintar();
    }
});

// ---------- Cartas e interacción ----------
const disponibles = () => Object.keys(DEFENSAS).filter((t) => DEFENSAS[t].desde <= estado.maxNivel);

function armarCartas() {
    $("cartas").innerHTML = "";
    for (const tipo of disponibles()) {
        const b = document.createElement("button");
        b.className = "carta";
        b.dataset.tipo = tipo;
        b.innerHTML = `<i></i><canvas width="72" height="72"></canvas>${DEFENSAS[tipo].nombre}<b>${DEFENSAS[tipo].costo}</b>`;
        dibujarDefensa(b.querySelector("canvas").getContext("2d"), tipo, 36, 32, 70);
        b.addEventListener("click", () => {
            elegida = elegida === tipo ? null : tipo;
            quitando = false;
            pintar();
        });
        $("cartas").appendChild(b);
    }
}

function pintar() {
    $("nivel").textContent = juego?.nivel ?? estado.elegido;
    $("energia").textContent = juego ? Math.floor(juego.energia) : 0;
    $("vidas").textContent = juego?.vidas ?? 5;
    $("chips").textContent = estado.chips;
    $("progreso").firstElementChild.style.width = `${juego ? (juego.salidos / juego.total) * 100 : 0}%`;
    $("quitar").classList.toggle("elegida", quitando);
    for (const b of document.querySelectorAll(".carta")) {
        const tipo = b.dataset.tipo;
        const espera = juego?.recargas[tipo] ?? 0;
        b.classList.toggle("elegida", tipo === elegida);
        b.disabled = !juego || juego.energia < DEFENSAS[tipo].costo || espera > 0;
        b.querySelector("i").style.height = `${(espera / recargaDe(tipo)) * 100}%`;
    }
}

$("lienzo").addEventListener("pointerdown", (e) => {
    if (!juego?.vivo || juego.pausado) return;
    const caja = $("lienzo").getBoundingClientRect();
    const px = e.clientX - caja.left;
    const py = e.clientY - caja.top;
    // Primero: tocar un cristal lo junta
    const cristal = juego.cristales.find((c) => !c.volando && Math.hypot(aX(c.x) - px, aY(c.y) - py) < celda * 0.5);
    if (cristal) {
        cristal.volando = true;
        vibrar(10);
        return;
    }
    const c = Math.floor((px - ox) / celda);
    const f = Math.floor((py - oy) / celda);
    if (c < 0 || f < 0 || c >= CARRILES || f >= FILAS) return;
    const ocupada = juego.defensas.find((d) => d.c === c && d.f === f);
    if (quitando) {
        if (ocupada) {
            juego.defensas = juego.defensas.filter((d) => d !== ocupada);
            juego.energia += Math.floor(DEFENSAS[ocupada.tipo].costo * 0.25);
            quitando = false;
            pintar();
        }
        return;
    }
    if (!elegida || ocupada) return;
    const datos = DEFENSAS[elegida];
    if (juego.energia < datos.costo || (juego.recargas[elegida] ?? 0) > 0) return vibrar(30);
    juego.energia -= datos.costo;
    juego.recargas[elegida] = recargaDe(elegida);
    const vida = datos.vida * (1 + tal("blindaje") * 0.15);
    juego.defensas.push({ tipo: elegida, c, f, vida, max: vida, carga: elegida === "extractor" ? 4 : 0, golpe: 0 });
    chispas.emitir(aX(c + 0.5), aY(f + 0.5), datos.color, 10, 100);
    vibrar(15);
    elegida = null;
    pintar();
});

$("quitar").addEventListener("click", () => {
    quitando = !quitando;
    elegida = null;
    pintar();
});
$("pausa").addEventListener("click", () => {
    if (!juego?.vivo) return;
    juego.pausado = !juego.pausado;
    $("pausa").textContent = juego.pausado ? "▶" : "⏸";
});
document.addEventListener("visibilitychange", () => {
    if (document.hidden && juego?.vivo) {
        juego.pausado = true;
        $("pausa").textContent = "▶";
    }
});

// ---------- Menú y taller ----------
function abrirMenu() {
    $("pausa").hidden = true;
    $("nivel-elegido").textContent = estado.elegido;
    $("nivel-menos").disabled = estado.elegido <= 1;
    $("nivel-mas").disabled = estado.elegido >= estado.maxNivel;
    $("menu").hidden = false;
    pintar();
}
$("nivel-menos").addEventListener("click", () => {
    estado.elegido = Math.max(1, estado.elegido - 1);
    abrirMenu();
});
$("nivel-mas").addEventListener("click", () => {
    estado.elegido = Math.min(estado.maxNivel, estado.elegido + 1);
    abrirMenu();
});
$("jugar").addEventListener("click", () => {
    chispas.limpiar();
    empezar(estado.elegido);
});

function pintarTaller() {
    $("chips-taller").textContent = estado.chips;
    $("mejoras").innerHTML = TALLER.map((m) => {
        const n = tal(m.id);
        const tope = n >= m.max;
        return `<button class="mejora-t" data-id="${m.id}" type="button" ${tope || estado.chips < costoTaller(n) ? "disabled" : ""}>
            <span class="txt">${m.nombre} <small>${m.detalle(n + (tope ? 0 : 1))} · nivel ${n}/${m.max}</small></span>
            <span class="precio">${tope ? "Máx" : `💾 ${costoTaller(n)}`}</span></button>`;
    }).join("");
}
$("mejoras").addEventListener("click", (e) => {
    const b = e.target.closest(".mejora-t");
    if (!b || b.disabled) return;
    const n = tal(b.dataset.id);
    if (estado.chips < costoTaller(n)) return;
    estado.chips -= costoTaller(n);
    estado.taller[b.dataset.id]++;
    guardar(CLAVE, estado);
    vibrar(30);
    pintarTaller();
    pintar();
});
$("abrir-taller").addEventListener("click", () => {
    pintarTaller();
    $("menu").hidden = true;
    $("taller").hidden = false;
});
$("cerrar-taller").addEventListener("click", () => {
    $("taller").hidden = true;
    abrirMenu();
});

armarCartas();
abrirMenu();
