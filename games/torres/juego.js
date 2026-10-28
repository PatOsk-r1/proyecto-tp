// Defensa de torres: 3 mapas, 7 torres, 7 enemigos y un laboratorio con mejoras permanentes.
// La partida se guarda al terminar cada oleada.
import { cargar, guardar, vibrar } from "../../js/comun3d.js";
import { crearLienzo, bucle, crearChispas } from "../../js/lienzo2d.js";

const $ = (id) => document.getElementById(id);
const CLAVE = "torres2";
const COLUMNAS = 9;
const FILAS = 14;

// ---------- Datos del juego ----------
const MAPAS = [
    {
        nombre: "Pradera", dificultad: 1, decoracion: "arbol",
        colores: { pasto: ["#5fa047", "#56963f"], camino: "#d9b77f", borde: "#a07c4a", fondo: "#16260f" },
        camino: [[-1, 1], [6, 1], [6, 4], [2, 4], [2, 7], [7, 7], [7, 10], [4, 10], [4, 12]],
    },
    {
        nombre: "Desierto", dificultad: 1.2, decoracion: "cactus",
        colores: { pasto: ["#e6c47d", "#dcb86f"], camino: "#b98352", borde: "#7a5230", fondo: "#3b2a12" },
        camino: [[-1, 2], [7, 2], [7, 5], [1, 5], [1, 8], [7, 8], [7, 11], [2, 11], [2, 12]],
    },
    {
        nombre: "Volcán", dificultad: 1.45, decoracion: "roca",
        colores: { pasto: ["#4b3a38", "#423331"], camino: "#7a2e1d", borde: "#ff6b35", fondo: "#160a0a" },
        camino: [[-1, 12], [2, 12], [2, 2], [5, 2], [5, 11], [7, 11], [7, 1]],
    },
];

const TORRES = {
    canon: { nombre: "Cañón", costo: 50, alcance: 2.2, cadencia: 0.85, dano: 24, aire: false, color: "#8d99ae" },
    hielo: { nombre: "Hielo", costo: 70, alcance: 2.0, cadencia: 1.0, dano: 8, lento: true, aire: true, color: "#4cc9f0" },
    laser: { nombre: "Láser", costo: 90, alcance: 2.5, cadencia: 0.2, dano: 7, aire: true, color: "#ff4d6d" },
    mortero: { nombre: "Mortero", costo: 120, alcance: 3.4, cadencia: 2.0, dano: 46, area: 1.15, aire: false, color: "#ffb703" },
    rayo: { nombre: "Rayo", costo: 150, alcance: 2.4, cadencia: 1.3, dano: 30, cadena: 3, aire: true, perfora: true, color: "#c77dff" },
    franco: { nombre: "Francotirador", costo: 170, alcance: 5, cadencia: 2.3, dano: 130, aire: true, perfora: true, color: "#2a9d8f", objetivo: "fuerte" },
    mina: { nombre: "Mina de oro", costo: 100, produce: 6, cada: 5, color: "#ffd23f" },
};

const ENEMIGOS = {
    comun: { vida: 40, velocidad: 1.1, oro: 5, color: "#7209b7", radio: 0.28 },
    rapido: { vida: 24, velocidad: 2.0, oro: 6, color: "#f72585", radio: 0.22 },
    blindado: { vida: 120, velocidad: 0.7, oro: 14, color: "#6c757d", radio: 0.34, armadura: 0.4 },
    volador: { vida: 45, velocidad: 1.4, oro: 9, color: "#48cae4", radio: 0.26, aire: true },
    curandero: { vida: 70, velocidad: 0.9, oro: 12, color: "#2a9d8f", radio: 0.28, cura: 6 },
    divisor: { vida: 90, velocidad: 1.0, oro: 8, color: "#ff9f1c", radio: 0.32, divide: true },
    mini: { vida: 22, velocidad: 1.6, oro: 2, color: "#ffbf69", radio: 0.18 },
    jefe: { vida: 1000, velocidad: 0.45, oro: 150, color: "#d00000", radio: 0.48, armadura: 0.3 },
};

const LAB = [
    { id: "oro", nombre: "Tesoro inicial", detalle: (n) => `Empezás con +${25 * n} de oro`, max: 10, costo: (n) => 2 + n * 2 },
    { id: "dano", nombre: "Pólvora mejorada", detalle: (n) => `Las torres hacen +${5 * n}% de daño`, max: 20, costo: (n) => 3 + n * 2 },
    { id: "vidas", nombre: "Murallas", detalle: (n) => `El castillo aguanta +${2 * n} golpes`, max: 10, costo: (n) => 2 + n * 2 },
    { id: "alcance", nombre: "Catalejos", detalle: (n) => `+${4 * n}% de alcance`, max: 10, costo: (n) => 4 + n * 3 },
    { id: "descuento", nombre: "Arquitectos", detalle: (n) => `Torres ${3 * n}% más baratas`, max: 10, costo: (n) => 4 + n * 3 },
    { id: "interes", nombre: "Banco", detalle: (n) => `Al final de cada oleada ganás ${2 * n}% de interés`, max: 5, costo: (n) => 5 + n * 4 },
];
const OBJETIVOS = ["primero", "fuerte", "cercano", "ultimo"];
const NOMBRE_OBJETIVO = { primero: "Primero", fuerte: "Más fuerte", cercano: "Más cerca", ultimo: "Último" };

const estado = cargar(CLAVE, { estrellas: 0, lab: {}, mejor: [0, 0, 0], mapa: 0, partida: null });
for (const m of LAB) estado.lab[m.id] ??= 0;
const nivelLab = (id) => estado.lab[id];

// ---------- Lienzo ----------
const chispas = crearChispas();
let juego = null;
let elegida = null;
let fantasma = null;
let torreSeleccionada = null;
let celda = 30;
let origenX = 0;
let origenY = 0;
const lienzo = crearLienzo($("lienzo"), ({ ancho, alto }) => {
    celda = Math.min(ancho / COLUMNAS, alto / FILAS);
    origenX = (ancho - COLUMNAS * celda) / 2;
    origenY = (alto - FILAS * celda) / 2;
});
const aX = (x) => origenX + x * celda;
const aY = (y) => origenY + y * celda;

// ---------- Mapa: camino, decoración ----------
let mapa = null;
function prepararMapa(indice) {
    const m = MAPAS[indice];
    const casillas = new Set();
    const pts = m.camino;
    for (let k = 0; k < pts.length - 1; k++) {
        const [c1, f1] = pts[k];
        const [c2, f2] = pts[k + 1];
        for (let c = Math.min(c1, c2); c <= Math.max(c1, c2); c++) for (let f = Math.min(f1, f2); f <= Math.max(f1, f2); f++) casillas.add(`${c},${f}`);
    }
    const tramos = pts.slice(1).map(([c, f], k) => Math.hypot(c - pts[k][0], f - pts[k][1]));
    // Decoración fija (mismo lugar cada vez) en casillas libres
    let semilla = indice * 977 + 13;
    const azar = () => ((semilla = (semilla * 16807) % 2147483647) / 2147483647);
    const decoracion = new Map();
    const matices = [];
    for (let f = 0; f < FILAS; f++) {
        for (let c = 0; c < COLUMNAS; c++) {
            matices.push(azar());
            if (!casillas.has(`${c},${f}`) && azar() < 0.16) decoracion.set(`${c},${f}`, azar());
        }
    }
    const piedras = Array.from({ length: 60 }, () => ({ t: azar(), dx: azar() - 0.5, dy: azar() - 0.5, r: 0.04 + azar() * 0.05 }));
    mapa = { ...m, indice, casillas, tramos, largo: tramos.reduce((a, b) => a + b, 0), decoracion, matices, piedras, castillo: pts.at(-1) };
}

function posicionEn(d) {
    for (let k = 0; k < mapa.tramos.length; k++) {
        if (d <= mapa.tramos[k]) {
            const t = d / mapa.tramos[k];
            const [c1, f1] = mapa.camino[k];
            const [c2, f2] = mapa.camino[k + 1];
            return { x: c1 + (c2 - c1) * t + 0.5, y: f1 + (f2 - f1) * t + 0.5 };
        }
        d -= mapa.tramos[k];
    }
    const [c, f] = mapa.castillo;
    return { x: c + 0.5, y: f + 0.5 };
}

// ---------- Partida ----------
const costoTorre = (tipo) => Math.round(TORRES[tipo].costo * (1 - 0.03 * nivelLab("descuento")));
const costoMejora = (t) => Math.round(costoTorre(t.tipo) * 0.75 * t.nivel);
const valorVenta = (t) => Math.round(t.invertido * 0.6);
const alcanceDe = (t) => TORRES[t.tipo].alcance * (1 + (t.nivel - 1) * 0.1) * (1 + nivelLab("alcance") * 0.04);
const danoDe = (t) => TORRES[t.tipo].dano * (1 + (t.nivel - 1) * 0.65) * (1 + nivelLab("dano") * 0.05);
const cadenciaDe = (t) => TORRES[t.tipo].cadencia / (1 + (t.nivel - 1) * 0.12);

function nuevaPartida(indiceMapa, guardada) {
    prepararMapa(indiceMapa);
    juego = {
        oro: 150 + 25 * nivelLab("oro"),
        vidas: 20 + 2 * nivelLab("vidas"),
        oleada: 0,
        torres: [],
        enemigos: [],
        balas: [],
        efectos: [],
        numeros: [],
        cola: [],
        esperando: true,
        velocidad: 1,
        auto: false,
        pausado: false,
        vivo: true,
        proximo: 0,
        sacudida: 0,
        siguienteAuto: 0,
    };
    if (guardada) {
        Object.assign(juego, { oro: guardada.oro, vidas: guardada.vidas, oleada: guardada.oleada });
        for (const t of guardada.torres) juego.torres.push(crearTorre(t.tipo, t.c, t.f, t));
    }
    torreSeleccionada = null;
    fantasma = null;
    $("panel-torre").hidden = true;
    $("pausa").hidden = false;
    pintarProxima();
    pintarDatos();
}

function crearTorre(tipo, c, f, extra = {}) {
    return { tipo, c, f, x: c + 0.5, y: f + 0.5, nivel: extra.nivel ?? 1, recarga: 0, angulo: -Math.PI / 2, objetivo: extra.objetivo ?? TORRES[tipo].objetivo ?? "primero", invertido: extra.invertido ?? costoTorre(tipo), produccion: 0 };
}

function armarOleada(n) {
    const tipos = ["comun"];
    if (n >= 3) tipos.push("rapido");
    if (n >= 4) tipos.push("volador");
    if (n >= 6) tipos.push("blindado");
    if (n >= 8) tipos.push("divisor");
    if (n >= 10) tipos.push("curandero");
    const total = 6 + Math.floor(n * 1.8);
    const lista = [];
    for (let i = 0; i < total; i++) {
        // Los primeros de cada oleada son comunes; después se mezcla
        const tipo = i < 3 ? "comun" : tipos[Math.floor(Math.random() * tipos.length)];
        lista.push(tipo);
    }
    if (n % 5 === 0) for (let k = 0; k <= Math.floor(n / 10); k++) lista.push("jefe");
    return lista;
}

const fuerzaDe = (n) => (1 + n * 0.16) * (1 + Math.max(0, n - 15) * 0.05) * mapa.dificultad;

function lanzarOleada() {
    if (!juego?.vivo || !juego.esperando) return;
    juego.oleada++;
    juego.esperando = false;
    const n = juego.oleada;
    juego.cola = armarOleada(n).map((tipo) => ({ tipo, fuerza: fuerzaDe(n) }));
    juego.espera = Math.max(0.32, 0.8 - n * 0.012);
    juego.proximo = 0.4;
    $("proxima").textContent = "";
    pintarDatos();
}

function terminarOleada() {
    juego.esperando = true;
    const n = juego.oleada;
    const bono = 20 + n * 3;
    const interes = Math.round(juego.oro * nivelLab("interes") * 0.02);
    juego.oro += bono + interes;
    // Estrellas: una por oleada y una extra cada 5, más en mapas difíciles
    const estrellas = Math.round((1 + (n % 5 === 0 ? 1 : 0)) * mapa.dificultad);
    estado.estrellas += estrellas;
    estado.mejor[mapa.indice] = Math.max(estado.mejor[mapa.indice], n);
    numero(aX(4.5), aY(6.5), `Oleada ${n} superada  +${bono + interes} oro  +${estrellas}⭐`, "#ffd23f", 2.2, 15);
    vibrar(50);
    guardarPartida();
    pintarProxima();
    pintarDatos();
    if (juego.auto) juego.siguienteAuto = 2;
}

function guardarPartida() {
    estado.partida = juego?.vivo
        ? { mapa: mapa.indice, oro: juego.oro, vidas: juego.vidas, oleada: juego.oleada, torres: juego.torres.map((t) => ({ tipo: t.tipo, c: t.c, f: t.f, nivel: t.nivel, objetivo: t.objetivo, invertido: t.invertido })) }
        : null;
    guardar(CLAVE, estado);
}

function pintarProxima() {
    if (!juego) return;
    const cuenta = {};
    for (const t of armarOleada(juego.oleada + 1)) cuenta[t] = (cuenta[t] ?? 0) + 1;
    const nombres = { comun: "comunes", rapido: "rápidos", volador: "voladores", blindado: "blindados", divisor: "divisores", curandero: "curanderos", jefe: "JEFE" };
    $("proxima").textContent = `Próxima: ${Object.entries(cuenta).map(([t, n]) => (t === "jefe" ? `${n > 1 ? n + " " : ""}JEFE` : `${n} ${nombres[t]}`)).join(" · ")}`;
}

// ---------- Simulación ----------
function aparecerEnemigo(tipo, fuerza, recorrido = 0) {
    const base = ENEMIGOS[tipo];
    const vida = base.vida * fuerza;
    juego.enemigos.push({ tipo, recorrido, vida, maxVida: vida, lentoHasta: 0, golpeado: 0, fuerza, desvio: (Math.random() - 0.5) * 0.25, ...posicionEn(recorrido) });
}

function paso(dt) {
    juego.tiempo = (juego.tiempo ?? 0) + dt;
    if (juego.cola.length) {
        juego.proximo -= dt;
        if (juego.proximo <= 0) {
            const e = juego.cola.shift();
            aparecerEnemigo(e.tipo, e.fuerza);
            juego.proximo = e.tipo === "jefe" ? 1.6 : juego.espera;
        }
    }

    // Enemigos caminando
    for (const e of juego.enemigos) {
        const base = ENEMIGOS[e.tipo];
        const lento = e.lentoHasta > juego.tiempo ? 0.55 : 1;
        e.recorrido += base.velocidad * lento * dt;
        Object.assign(e, posicionEn(e.recorrido));
        e.golpeado = Math.max(0, e.golpeado - dt);
        if (base.cura) {
            for (const o of juego.enemigos) {
                if (o !== e && Math.hypot(o.x - e.x, o.y - e.y) < 1.3) o.vida = Math.min(o.maxVida, o.vida + base.cura * e.fuerza * dt);
            }
        }
        if (e.recorrido >= mapa.largo) {
            e.fuera = true;
            juego.vidas -= e.tipo === "jefe" ? 5 : 1;
            juego.sacudida = 0.35;
            vibrar(90);
            if (juego.vidas <= 0) {
                juego.vidas = 0;
                return fin();
            }
            pintarDatos();
        }
    }
    juego.enemigos = juego.enemigos.filter((e) => !e.fuera && e.vida > 0);

    // Torres
    for (const t of juego.torres) {
        const datos = TORRES[t.tipo];
        if (t.tipo === "mina") {
            if (juego.esperando) continue;
            t.produccion += dt;
            if (t.produccion >= datos.cada) {
                t.produccion = 0;
                const oro = Math.round(datos.produce * (1 + (t.nivel - 1) * 0.8));
                juego.oro += oro;
                numero(aX(t.x), aY(t.y) - celda * 0.4, `+${oro}`, "#ffd23f", 1, 13);
                pintarDatos();
            }
            continue;
        }
        t.recarga -= dt;
        const alcance = alcanceDe(t);
        const posibles = juego.enemigos.filter((e) => (datos.aire || !ENEMIGOS[e.tipo].aire) && Math.hypot(e.x - t.x, e.y - t.y) <= alcance);
        if (!posibles.length) continue;
        const criterio = {
            primero: (a, b) => b.recorrido - a.recorrido,
            ultimo: (a, b) => a.recorrido - b.recorrido,
            fuerte: (a, b) => b.vida - a.vida,
            cercano: (a, b) => Math.hypot(a.x - t.x, a.y - t.y) - Math.hypot(b.x - t.x, b.y - t.y),
        }[t.objetivo];
        const objetivo = posibles.sort(criterio)[0];
        t.angulo = Math.atan2(objetivo.y - t.y, objetivo.x - t.x);
        if (t.recarga > 0) continue;
        t.recarga = cadenciaDe(t);
        disparar(t, objetivo);
    }

    // Balas en vuelo
    for (const b of juego.balas) {
        b.t += dt;
        if (b.tipo === "mortero") {
            if (b.t >= b.duracion) {
                b.usada = true;
                explosion(b);
            }
            continue;
        }
        const o = b.objetivo;
        if (o.vida <= 0) {
            b.usada = true;
            continue;
        }
        const dx = o.x - b.x;
        const dy = o.y - b.y;
        const d = Math.hypot(dx, dy);
        if (d < 0.2) {
            b.usada = true;
            danar(o, b.dano, b.torre);
            if (b.tipo === "hielo") o.lentoHasta = juego.tiempo + 1.8;
            continue;
        }
        b.x += (dx / d) * b.velocidad * dt;
        b.y += (dy / d) * b.velocidad * dt;
    }
    juego.balas = juego.balas.filter((b) => !b.usada);

    if (!juego.esperando && !juego.cola.length && !juego.enemigos.length) terminarOleada();
    if (juego.esperando && juego.auto && juego.siguienteAuto > 0) {
        juego.siguienteAuto -= dt;
        if (juego.siguienteAuto <= 0) lanzarOleada();
    }
}

function disparar(t, o) {
    const dano = danoDe(t);
    const desde = { x: t.x + Math.cos(t.angulo) * 0.35, y: t.y + Math.sin(t.angulo) * 0.35 };
    if (t.tipo === "laser") {
        danar(o, dano, t);
        juego.efectos.push({ tipo: "rayo-recto", x1: desde.x, y1: desde.y, x2: o.x, y2: o.y, color: "#ff4d6d", vida: 0.06, grosor: 3 });
    } else if (t.tipo === "franco") {
        danar(o, dano, t);
        juego.efectos.push({ tipo: "rayo-recto", x1: desde.x, y1: desde.y, x2: o.x, y2: o.y, color: "#e9f5db", vida: 0.12, grosor: 2 });
        vibrar(8);
    } else if (t.tipo === "rayo") {
        // Salta de un enemigo al siguiente más cercano
        let actual = o;
        let fuerza = dano;
        const tocados = [];
        let anterior = desde;
        for (let k = 0; k < TORRES.rayo.cadena + Math.floor(t.nivel / 2); k++) {
            if (!actual) break;
            danar(actual, fuerza, t);
            tocados.push(actual);
            juego.efectos.push({ tipo: "electrico", x1: anterior.x, y1: anterior.y, x2: actual.x, y2: actual.y, vida: 0.15 });
            anterior = actual;
            fuerza *= 0.7;
            actual = juego.enemigos.filter((e) => !tocados.includes(e) && e.vida > 0 && Math.hypot(e.x - anterior.x, e.y - anterior.y) < 1.7).sort((a, b) => Math.hypot(a.x - anterior.x, a.y - anterior.y) - Math.hypot(b.x - anterior.x, b.y - anterior.y))[0];
        }
    } else if (t.tipo === "mortero") {
        juego.balas.push({ tipo: "mortero", torre: t, x0: desde.x, y0: desde.y, x1: o.x, y1: o.y, t: 0, duracion: 0.75, dano });
    } else {
        juego.balas.push({ tipo: t.tipo, torre: t, x: desde.x, y: desde.y, objetivo: o, dano, velocidad: t.tipo === "hielo" ? 8 : 10, t: 0 });
    }
}

function explosion(b) {
    chispas.emitir(aX(b.x1), aY(b.y1), "#ffb703", 16, 150);
    chispas.emitir(aX(b.x1), aY(b.y1), "#6c584c", 8, 90);
    juego.efectos.push({ tipo: "onda", x: b.x1, y: b.y1, vida: 0.3, radio: TORRES.mortero.area });
    for (const e of juego.enemigos) {
        if (!ENEMIGOS[e.tipo].aire && Math.hypot(e.x - b.x1, e.y - b.y1) <= TORRES.mortero.area) danar(e, b.dano, b.torre);
    }
}

function danar(e, dano, torre) {
    if (e.vida <= 0) return;
    const base = ENEMIGOS[e.tipo];
    const real = base.armadura && !TORRES[torre.tipo].perfora ? dano * (1 - base.armadura) : dano;
    e.vida -= real;
    e.golpeado = 0.08;
    if (real >= 15) numero(aX(e.x), aY(e.y) - celda * 0.3, Math.round(real), base.armadura && !TORRES[torre.tipo].perfora ? "#adb5bd" : "#fff", 0.6, 11);
    if (e.vida <= 0) {
        juego.oro += Math.round(base.oro * (1 + juego.oleada * 0.02));
        chispas.emitir(aX(e.x), aY(e.y), base.color, e.tipo === "jefe" ? 40 : 12, e.tipo === "jefe" ? 260 : 150);
        if (base.divide) for (const d of [-0.25, 0.25]) aparecerEnemigo("mini", e.fuerza, Math.max(0, e.recorrido + d));
        if (e.tipo === "jefe") vibrar(120);
        pintarDatos();
    }
}

function numero(x, y, texto, color, vida = 0.8, tamano = 12) {
    juego.numeros.push({ x, y, texto, color, vida, total: vida, tamano });
}

function fin() {
    juego.vivo = false;
    vibrar(250);
    estado.mejor[mapa.indice] = Math.max(estado.mejor[mapa.indice], juego.oleada);
    estado.partida = null;
    guardar(CLAVE, estado);
    setTimeout(() => {
        $("titulo-menu").innerHTML = `Cayó el castillo<div class="chico">${mapa.nombre}: llegaste a la oleada ${juego.oleada}. Usá tus estrellas en el laboratorio.</div>`;
        abrirMenu();
    }, 800);
}

// ---------- Dibujo ----------
function dibujarFondo(ctx) {
    const c = mapa.colores;
    for (let f = 0; f < FILAS; f++) {
        for (let col = 0; col < COLUMNAS; col++) {
            const m = mapa.matices[f * COLUMNAS + col];
            ctx.fillStyle = c.pasto[(col + f) % 2];
            ctx.fillRect(aX(col), aY(f), celda + 0.5, celda + 0.5);
            ctx.fillStyle = `rgba(0,0,0,${m * 0.07})`;
            ctx.fillRect(aX(col), aY(f), celda + 0.5, celda + 0.5);
        }
    }
    // Camino como una franja continua con borde
    const trazo = (ancho, color) => {
        ctx.strokeStyle = color;
        ctx.lineWidth = ancho;
        ctx.lineJoin = "round";
        ctx.lineCap = "round";
        ctx.beginPath();
        mapa.camino.forEach(([cc, ff], k) => (k ? ctx.lineTo : ctx.moveTo).call(ctx, aX(cc + 0.5), aY(ff + 0.5)));
        ctx.stroke();
    };
    trazo(celda * 0.98, c.borde);
    trazo(celda * 0.8, c.camino);
    ctx.fillStyle = "rgba(0,0,0,0.12)";
    for (const p of mapa.piedras) {
        const pos = posicionEn(p.t * mapa.largo);
        ctx.beginPath();
        ctx.arc(aX(pos.x + p.dx * 0.6), aY(pos.y + p.dy * 0.6), p.r * celda, 0, Math.PI * 2);
        ctx.fill();
    }
    // Decoración
    for (const [clave, r] of mapa.decoracion) {
        if (juego?.torres.some((t) => `${t.c},${t.f}` === clave)) continue;
        const [col, f] = clave.split(",").map(Number);
        const x = aX(col + 0.5);
        const y = aY(f + 0.5);
        if (MAPAS[mapa.indice].decoracion === "arbol") {
            ctx.fillStyle = "#00000033";
            ctx.beginPath();
            ctx.ellipse(x + 3, y + celda * 0.25, celda * 0.3, celda * 0.12, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = "#6b4226";
            ctx.fillRect(x - 2, y, 4, celda * 0.25);
            ctx.fillStyle = r > 0.5 ? "#2d6a4f" : "#40916c";
            ctx.beginPath();
            ctx.arc(x, y - celda * 0.05, celda * (0.25 + r * 0.1), 0, Math.PI * 2);
            ctx.fill();
        } else if (MAPAS[mapa.indice].decoracion === "cactus") {
            ctx.fillStyle = "#2d6a4f";
            ctx.beginPath();
            ctx.roundRect(x - celda * 0.07, y - celda * 0.3, celda * 0.14, celda * 0.55, 4);
            ctx.roundRect(x - celda * 0.24, y - celda * 0.1, celda * 0.1, celda * 0.22, 3);
            ctx.roundRect(x + celda * 0.14, y - celda * 0.18, celda * 0.1, celda * 0.22, 3);
            ctx.fill();
        } else {
            ctx.fillStyle = r > 0.5 ? "#2b2020" : "#3a2b2b";
            ctx.beginPath();
            ctx.moveTo(x - celda * 0.3, y + celda * 0.2);
            ctx.lineTo(x - celda * 0.1, y - celda * 0.25);
            ctx.lineTo(x + celda * 0.25, y - celda * 0.1);
            ctx.lineTo(x + celda * 0.3, y + celda * 0.2);
            ctx.fill();
            ctx.fillStyle = "#ff6b3555";
            ctx.fillRect(x - 2, y - 2, 4, 4);
        }
    }
}

function dibujarCastillo(ctx) {
    const [c, f] = mapa.castillo;
    const s = juego?.sacudida > 0 ? (Math.random() - 0.5) * 6 : 0;
    const x = aX(c + 0.5) + s;
    const y = aY(f + 0.5);
    const w = celda * 0.95;
    ctx.fillStyle = "#00000044";
    ctx.beginPath();
    ctx.ellipse(x, y + w * 0.38, w * 0.55, w * 0.15, 0, 0, Math.PI * 2);
    ctx.fill();
    const g = ctx.createLinearGradient(0, y - w / 2, 0, y + w / 2);
    g.addColorStop(0, "#dee2e6");
    g.addColorStop(1, "#868e96");
    ctx.fillStyle = g;
    ctx.fillRect(x - w * 0.45, y - w * 0.15, w * 0.9, w * 0.5);
    for (const dx of [-0.45, -0.1, 0.25]) ctx.fillRect(x + dx * w, y - w * 0.38, w * 0.2, w * 0.25);
    ctx.fillStyle = "#495057";
    ctx.beginPath();
    ctx.roundRect(x - w * 0.1, y + w * 0.05, w * 0.2, w * 0.3, [w * 0.1, w * 0.1, 0, 0]);
    ctx.fill();
    ctx.strokeStyle = "#343a40";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x, y - w * 0.38);
    ctx.lineTo(x, y - w * 0.75);
    ctx.stroke();
    ctx.fillStyle = "#e63946";
    ctx.beginPath();
    ctx.moveTo(x, y - w * 0.75);
    ctx.lineTo(x + w * 0.3 + Math.sin(performance.now() / 200) * 2, y - w * 0.66);
    ctx.lineTo(x, y - w * 0.57);
    ctx.fill();
}

function dibujarTorre(ctx, t, x, y, tam, apagada = false) {
    const datos = TORRES[t.tipo];
    ctx.save();
    if (apagada) ctx.globalAlpha = 0.55;
    // Base de piedra
    ctx.fillStyle = "#00000040";
    ctx.beginPath();
    ctx.ellipse(x + 2, y + tam * 0.36, tam * 0.42, tam * 0.14, 0, 0, Math.PI * 2);
    ctx.fill();
    const base = ctx.createLinearGradient(0, y - tam * 0.4, 0, y + tam * 0.4);
    base.addColorStop(0, "#adb5bd");
    base.addColorStop(1, "#495057");
    ctx.fillStyle = base;
    ctx.beginPath();
    ctx.roundRect(x - tam * 0.4, y - tam * 0.38, tam * 0.8, tam * 0.76, tam * 0.16);
    ctx.fill();
    if ((t.nivel ?? 1) >= 3) {
        ctx.strokeStyle = "#ffd23f";
        ctx.lineWidth = 2;
        ctx.stroke();
    }
    ctx.translate(x, y);
    const color = datos.color;
    if (t.tipo === "mina") {
        for (const [dx, dy, r] of [[-0.12, 0.08, 0.14], [0.1, 0.1, 0.13], [0, -0.04, 0.15]]) {
            const g = ctx.createRadialGradient(dx * tam - 2, dy * tam - 2, 1, dx * tam, dy * tam, r * tam);
            g.addColorStop(0, "#fff3b0");
            g.addColorStop(1, "#e09f00");
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(dx * tam, dy * tam, r * tam, 0, Math.PI * 2);
            ctx.fill();
        }
    } else {
        ctx.rotate(t.angulo ?? -Math.PI / 2);
        if (t.tipo === "canon") {
            ctx.fillStyle = "#2b2d42";
            ctx.fillRect(0, -tam * 0.08, tam * 0.42, tam * 0.16);
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(0, 0, tam * 0.22, 0, Math.PI * 2);
            ctx.fill();
        } else if (t.tipo === "hielo") {
            ctx.shadowColor = color;
            ctx.shadowBlur = 10;
            ctx.fillStyle = "#caf0f8";
            ctx.beginPath();
            for (let k = 0; k < 6; k++) {
                const a = (k / 6) * Math.PI * 2;
                const r = k % 2 ? tam * 0.16 : tam * 0.28;
                k ? ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r) : ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
            }
            ctx.closePath();
            ctx.fill();
        } else if (t.tipo === "laser") {
            ctx.fillStyle = "#3d0a12";
            ctx.fillRect(0, -tam * 0.06, tam * 0.36, tam * 0.12);
            ctx.fillStyle = color;
            ctx.shadowColor = color;
            ctx.shadowBlur = 12;
            ctx.beginPath();
            ctx.arc(0, 0, tam * 0.18, 0, Math.PI * 2);
            ctx.arc(tam * 0.36, 0, tam * 0.06, 0, Math.PI * 2);
            ctx.fill();
        } else if (t.tipo === "mortero") {
            ctx.fillStyle = "#6c584c";
            ctx.beginPath();
            ctx.roundRect(-tam * 0.05, -tam * 0.13, tam * 0.3, tam * 0.26, 4);
            ctx.fill();
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(0, 0, tam * 0.2, 0, Math.PI * 2);
            ctx.fill();
        } else if (t.tipo === "rayo") {
            for (const [r, c] of [[0.26, "#5a189a"], [0.19, "#9d4edd"], [0.12, "#e0aaff"]]) {
                ctx.fillStyle = c;
                ctx.beginPath();
                ctx.arc(0, 0, tam * r, 0, Math.PI * 2);
                ctx.fill();
            }
            if (Math.random() < 0.15) {
                ctx.strokeStyle = "#e0aaff";
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo((Math.random() - 0.5) * tam * 0.7, (Math.random() - 0.5) * tam * 0.7);
                ctx.stroke();
            }
        } else if (t.tipo === "franco") {
            ctx.fillStyle = "#1b4332";
            ctx.fillRect(0, -tam * 0.04, tam * 0.55, tam * 0.08);
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(0, 0, tam * 0.19, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = "#b7e4c7";
            ctx.fillRect(tam * 0.08, -tam * 0.11, tam * 0.12, tam * 0.06);
        }
    }
    ctx.restore();
    // Nivel: puntitos abajo
    for (let k = 0; k < (t.nivel ?? 0); k++) {
        ctx.fillStyle = "#ffd23f";
        ctx.beginPath();
        ctx.arc(x - tam * 0.24 + k * tam * 0.12, y + tam * 0.32, tam * 0.04, 0, Math.PI * 2);
        ctx.fill();
    }
}

function dibujarEnemigo(ctx, e) {
    const base = ENEMIGOS[e.tipo];
    const x = aX(e.x + e.desvio);
    const vuela = base.aire;
    const y = aY(e.y) - (vuela ? celda * 0.28 : 0);
    const r = base.radio * celda;
    const paso = Math.sin(e.recorrido * 12);
    ctx.fillStyle = "#00000044";
    ctx.beginPath();
    ctx.ellipse(x, aY(e.y) + r * 0.7, r * 0.8, r * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();
    if (vuela) {
        ctx.fillStyle = "#ade8f4cc";
        for (const lado of [-1, 1]) {
            ctx.beginPath();
            ctx.ellipse(x + lado * r * 0.9, y - r * 0.2, r * 0.7, r * (0.25 + Math.abs(paso) * 0.25), lado * 0.4, 0, Math.PI * 2);
            ctx.fill();
        }
    } else {
        ctx.fillStyle = "#1a1a1a";
        for (const lado of [-1, 1]) {
            ctx.beginPath();
            ctx.ellipse(x + lado * r * 0.45, y + r * 0.8 + (lado * paso * r) / 6, r * 0.28, r * 0.18, 0, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    const g = ctx.createRadialGradient(x - r / 3, y - r / 3, 1, x, y, r);
    g.addColorStop(0, "#ffffff");
    g.addColorStop(0.25, base.color);
    g.addColorStop(1, "#10002b");
    ctx.fillStyle = e.golpeado > 0 ? "#ffffff" : g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    if (e.lentoHasta > juego.tiempo) {
        ctx.fillStyle = "#90e0ef77";
        ctx.beginPath();
        ctx.arc(x, y, r * 1.1, 0, Math.PI * 2);
        ctx.fill();
    }
    if (base.armadura) {
        ctx.strokeStyle = "#dee2e6";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, r * 0.75, Math.PI * 1.1, Math.PI * 1.9);
        ctx.stroke();
    }
    if (base.cura) {
        ctx.fillStyle = "#fff";
        ctx.fillRect(x - r * 0.12, y - r * 0.45, r * 0.24, r * 0.9);
        ctx.fillRect(x - r * 0.45, y - r * 0.12, r * 0.9, r * 0.24);
    } else {
        ctx.fillStyle = "#fff";
        ctx.beginPath();
        ctx.arc(x - r * 0.32, y - r * 0.15, r * 0.24, 0, Math.PI * 2);
        ctx.arc(x + r * 0.32, y - r * 0.15, r * 0.24, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#000";
        ctx.beginPath();
        ctx.arc(x - r * 0.28, y - r * 0.12, r * 0.11, 0, Math.PI * 2);
        ctx.arc(x + r * 0.36, y - r * 0.12, r * 0.11, 0, Math.PI * 2);
        ctx.fill();
    }
    if (e.tipo === "jefe") {
        ctx.fillStyle = "#ffd23f";
        ctx.beginPath();
        ctx.moveTo(x - r * 0.5, y - r * 0.8);
        ctx.lineTo(x - r * 0.5, y - r * 1.25);
        ctx.lineTo(x - r * 0.2, y - r * 1.0);
        ctx.lineTo(x, y - r * 1.35);
        ctx.lineTo(x + r * 0.2, y - r * 1.0);
        ctx.lineTo(x + r * 0.5, y - r * 1.25);
        ctx.lineTo(x + r * 0.5, y - r * 0.8);
        ctx.fill();
    }
    // Barra de vida
    const bw = Math.max(r * 2, 18);
    ctx.fillStyle = "#000a";
    ctx.fillRect(x - bw / 2, y - r - 9, bw, 4);
    const frac = Math.max(0, e.vida / e.maxVida);
    ctx.fillStyle = frac > 0.5 ? "#7ee08f" : frac > 0.25 ? "#ffd23f" : "#ff4d4d";
    ctx.fillRect(x - bw / 2, y - r - 9, bw * frac, 4);
}

function dibujar(dt) {
    const { ctx, ancho, alto } = lienzo;
    ctx.fillStyle = mapa?.colores.fondo ?? "#16260f";
    ctx.fillRect(0, 0, ancho, alto);
    if (!mapa) return;
    dibujarFondo(ctx);
    dibujarCastillo(ctx);
    if (!juego) return;

    // Vista previa de la torre a construir
    if (fantasma) {
        const libre = !mapa.casillas.has(`${fantasma.c},${fantasma.f}`) && juego.oro >= costoTorre(fantasma.tipo);
        const t = crearTorre(fantasma.tipo, fantasma.c, fantasma.f);
        if (fantasma.tipo !== "mina") {
            ctx.fillStyle = libre ? "#ffffff22" : "#ff4d4d33";
            ctx.strokeStyle = libre ? "#ffffffaa" : "#ff4d4d";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(aX(t.x), aY(t.y), alcanceDe(t) * celda, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        }
        dibujarTorre(ctx, t, aX(t.x), aY(t.y), celda, true);
    }

    for (const t of juego.torres) {
        if (t === torreSeleccionada && t.tipo !== "mina") {
            ctx.strokeStyle = "#ffffff88";
            ctx.lineWidth = 2;
            ctx.setLineDash([6, 5]);
            ctx.beginPath();
            ctx.arc(aX(t.x), aY(t.y), alcanceDe(t) * celda, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
        }
        dibujarTorre(ctx, t, aX(t.x), aY(t.y), celda);
    }

    // Primero los de tierra, después los voladores (pasan por arriba)
    const ordenados = [...juego.enemigos].sort((a, b) => (ENEMIGOS[a.tipo].aire ? 1 : 0) - (ENEMIGOS[b.tipo].aire ? 1 : 0));
    for (const e of ordenados) dibujarEnemigo(ctx, e);

    for (const b of juego.balas) {
        if (b.tipo === "mortero") {
            const p = b.t / b.duracion;
            const x = b.x0 + (b.x1 - b.x0) * p;
            const y = b.y0 + (b.y1 - b.y0) * p;
            const altura = Math.sin(p * Math.PI) * 1.4;
            ctx.fillStyle = "#00000044";
            ctx.beginPath();
            ctx.arc(aX(x), aY(y), celda * 0.08, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = "#3d2b1f";
            ctx.beginPath();
            ctx.arc(aX(x), aY(y - altura), celda * 0.13, 0, Math.PI * 2);
            ctx.fill();
        } else {
            ctx.fillStyle = b.tipo === "hielo" ? "#caf0f8" : "#212529";
            ctx.shadowColor = b.tipo === "hielo" ? "#4cc9f0" : "transparent";
            ctx.shadowBlur = b.tipo === "hielo" ? 8 : 0;
            ctx.beginPath();
            ctx.arc(aX(b.x), aY(b.y), celda * 0.08, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
        }
    }

    for (const ef of juego.efectos) {
        ef.vida -= dt;
        if (ef.tipo === "rayo-recto") {
            ctx.strokeStyle = ef.color;
            ctx.lineWidth = ef.grosor;
            ctx.shadowColor = ef.color;
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.moveTo(aX(ef.x1), aY(ef.y1));
            ctx.lineTo(aX(ef.x2), aY(ef.y2));
            ctx.stroke();
            ctx.shadowBlur = 0;
        } else if (ef.tipo === "electrico") {
            ctx.strokeStyle = "#e0aaff";
            ctx.lineWidth = 2.5;
            ctx.shadowColor = "#c77dff";
            ctx.shadowBlur = 12;
            ctx.beginPath();
            ctx.moveTo(aX(ef.x1), aY(ef.y1));
            for (let k = 1; k < 5; k++) {
                const p = k / 5;
                ctx.lineTo(aX(ef.x1 + (ef.x2 - ef.x1) * p) + (Math.random() - 0.5) * 10, aY(ef.y1 + (ef.y2 - ef.y1) * p) + (Math.random() - 0.5) * 10);
            }
            ctx.lineTo(aX(ef.x2), aY(ef.y2));
            ctx.stroke();
            ctx.shadowBlur = 0;
        } else if (ef.tipo === "onda") {
            ctx.strokeStyle = `rgba(255,183,3,${ef.vida / 0.3})`;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(aX(ef.x), aY(ef.y), ef.radio * celda * (1 - ef.vida / 0.3 + 0.3), 0, Math.PI * 2);
            ctx.stroke();
        }
    }
    juego.efectos = juego.efectos.filter((ef) => ef.vida > 0);

    chispas.dibujar(ctx, dt);

    for (const n of juego.numeros) {
        n.vida -= dt;
        n.y -= dt * 28;
        ctx.globalAlpha = Math.max(0, Math.min(1, n.vida / n.total * 1.5));
        ctx.fillStyle = n.color;
        ctx.strokeStyle = "#000";
        ctx.lineWidth = 3;
        ctx.font = `900 ${n.tamano}px sans-serif`;
        ctx.textAlign = "center";
        ctx.strokeText(n.texto, n.x, n.y);
        ctx.fillText(n.texto, n.x, n.y);
    }
    ctx.globalAlpha = 1;
    juego.numeros = juego.numeros.filter((n) => n.vida > 0);
    juego.sacudida = Math.max(0, juego.sacudida - dt);

    if (juego.pausado) {
        ctx.fillStyle = "#0008";
        ctx.fillRect(0, 0, ancho, alto);
        ctx.fillStyle = "#fff";
        ctx.font = "900 28px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("Pausa", ancho / 2, alto / 2);
    }
}

bucle((dt) => {
    if (juego?.vivo && !juego.pausado && $("menu").hidden && $("lab").hidden) {
        for (let i = 0; i < juego.velocidad; i++) {
            paso(dt);
            if (!juego.vivo) break;
        }
    }
    dibujar(dt);
});

// ---------- Interfaz ----------
function pintarDatos() {
    $("oleada").textContent = juego?.oleada ?? 0;
    $("vidas").textContent = juego?.vidas ?? 20 + 2 * nivelLab("vidas");
    $("oro").textContent = juego?.oro ?? 150 + 25 * nivelLab("oro");
    $("estrellas").textContent = estado.estrellas;
    for (const b of document.querySelectorAll(".torre-btn")) {
        b.classList.toggle("elegida", b.dataset.tipo === elegida);
        b.disabled = (juego?.oro ?? 0) < costoTorre(b.dataset.tipo);
        b.querySelector("b").textContent = costoTorre(b.dataset.tipo);
    }
    $("oleada-btn").disabled = !juego?.esperando || !juego.vivo;
    $("oleada-btn").textContent = !juego || juego.esperando ? "▶ Oleada" : "En curso";
    $("auto").classList.toggle("activo", Boolean(juego?.auto));
    pintarPanelTorre();
}

function pintarPanelTorre() {
    const t = torreSeleccionada;
    $("panel-torre").hidden = !t;
    if (!t) return;
    const datos = TORRES[t.tipo];
    $("nombre-torre").textContent = datos.nombre;
    $("nivel-torre").textContent = `Nv ${t.nivel}/5`;
    $("stats-torre").innerHTML =
        t.tipo === "mina"
            ? `<span>Produce <b>${Math.round(datos.produce * (1 + (t.nivel - 1) * 0.8))}</b> oro cada ${datos.cada}s durante las oleadas</span>`
            : `<span>Daño <b>${Math.round(danoDe(t))}</b></span><span>Alcance <b>${alcanceDe(t).toFixed(1)}</b></span><span>Cada <b>${cadenciaDe(t).toFixed(2)}s</b></span>${datos.aire ? "" : "<span>No le pega a voladores</span>"}`;
    $("mejorar").textContent = t.nivel >= 5 ? "Nivel máximo" : `Mejorar (${costoMejora(t)})`;
    $("mejorar").disabled = t.nivel >= 5 || juego.oro < costoMejora(t);
    $("objetivo").hidden = t.tipo === "mina";
    $("objetivo").textContent = `🎯 ${NOMBRE_OBJETIVO[t.objetivo]}`;
    $("vender").textContent = `Vender (+${valorVenta(t)})`;
}

// Íconos de la tienda dibujados con el mismo código que el juego
const tienda = $("torres-tienda");
for (const tipo of Object.keys(TORRES)) {
    const b = document.createElement("button");
    b.className = "torre-btn";
    b.dataset.tipo = tipo;
    b.innerHTML = `<canvas width="68" height="68"></canvas>${TORRES[tipo].nombre.split(" ")[0]}<b></b>`;
    const ctx = b.querySelector("canvas").getContext("2d");
    dibujarTorre(ctx, { tipo, nivel: 0, angulo: -Math.PI / 4 }, 34, 34, 58);
    b.addEventListener("click", () => {
        elegida = elegida === tipo ? null : tipo;
        fantasma = null;
        torreSeleccionada = null;
        pintarDatos();
    });
    tienda.appendChild(b);
}

$("lienzo").addEventListener("pointerdown", (e) => {
    if (!juego?.vivo) return;
    const caja = $("lienzo").getBoundingClientRect();
    const c = Math.floor((e.clientX - caja.left - origenX) / celda);
    const f = Math.floor((e.clientY - caja.top - origenY) / celda);
    if (c < 0 || f < 0 || c >= COLUMNAS || f >= FILAS) return;
    const existente = juego.torres.find((t) => t.c === c && t.f === f);
    if (existente) {
        torreSeleccionada = existente;
        fantasma = null;
        return pintarDatos();
    }
    torreSeleccionada = null;
    if (!elegida || mapa.casillas.has(`${c},${f}`)) {
        fantasma = null;
        return pintarDatos();
    }
    // Primer toque: muestra la torre y su alcance; segundo toque en el mismo lugar: construye
    if (!fantasma || fantasma.c !== c || fantasma.f !== f) {
        fantasma = { tipo: elegida, c, f };
        return pintarDatos();
    }
    const costo = costoTorre(elegida);
    if (juego.oro < costo) return vibrar(40);
    juego.oro -= costo;
    juego.torres.push(crearTorre(elegida, c, f));
    fantasma = null;
    chispas.emitir(aX(c + 0.5), aY(f + 0.5), TORRES[elegida].color, 12, 110);
    vibrar(20);
    pintarDatos();
});

$("mejorar").addEventListener("click", () => {
    const t = torreSeleccionada;
    if (!t || t.nivel >= 5 || juego.oro < costoMejora(t)) return;
    juego.oro -= costoMejora(t);
    t.invertido += costoMejora(t);
    t.nivel++;
    chispas.emitir(aX(t.x), aY(t.y), "#ffd23f", 14, 120);
    vibrar(30);
    pintarDatos();
});
$("objetivo").addEventListener("click", () => {
    const t = torreSeleccionada;
    if (!t) return;
    t.objetivo = OBJETIVOS[(OBJETIVOS.indexOf(t.objetivo) + 1) % OBJETIVOS.length];
    pintarDatos();
});
$("vender").addEventListener("click", () => {
    const t = torreSeleccionada;
    if (!t) return;
    juego.oro += valorVenta(t);
    juego.torres = juego.torres.filter((x) => x !== t);
    torreSeleccionada = null;
    pintarDatos();
});
$("cerrar-panel").addEventListener("click", () => {
    torreSeleccionada = null;
    pintarDatos();
});
$("oleada-btn").addEventListener("click", lanzarOleada);
$("velocidad").addEventListener("click", () => {
    if (!juego) return;
    juego.velocidad = (juego.velocidad % 3) + 1;
    $("velocidad").textContent = `×${juego.velocidad}`;
});
$("auto").addEventListener("click", () => {
    if (!juego) return;
    juego.auto = !juego.auto;
    if (juego.auto && juego.esperando) juego.siguienteAuto = 1;
    pintarDatos();
});
$("pausa").addEventListener("click", () => {
    if (!juego?.vivo) return;
    juego.pausado = !juego.pausado;
    $("pausa").textContent = juego.pausado ? "▶" : "⏸";
});

// ---------- Menú, mapas y laboratorio ----------
const desbloqueado = (i) => i === 0 || estado.mejor[i - 1] >= 10;

function pintarMapas() {
    const colores = ["#40916c", "#c9a227", "#9d0208"];
    $("mapas").innerHTML = MAPAS.map(
        (m, i) => `<button class="mapa-btn${estado.mapa === i ? " elegido" : ""}" data-i="${i}" style="--c:${colores[i]}" ${desbloqueado(i) ? "" : "disabled"}>
            ${m.nombre}<small>${desbloqueado(i) ? `Mejor: ${estado.mejor[i]}` : "🔒 Oleada 10 en el anterior"}</small></button>`
    ).join("");
}

$("mapas").addEventListener("click", (e) => {
    const b = e.target.closest(".mapa-btn");
    if (!b || b.disabled) return;
    estado.mapa = Number(b.dataset.i);
    guardar(CLAVE, estado);
    prepararMapa(estado.mapa);
    pintarMapas();
});

function abrirMenu() {
    $("continuar").hidden = !estado.partida;
    if (estado.partida) $("continuar").textContent = `Continuar (${MAPAS[estado.partida.mapa].nombre}, oleada ${estado.partida.oleada})`;
    $("pausa").hidden = true;
    pintarMapas();
    pintarDatos();
    $("menu").hidden = false;
}

function pintarLab() {
    $("estrellas-lab").textContent = estado.estrellas;
    $("mejoras-lab").innerHTML = LAB.map((m) => {
        const n = nivelLab(m.id);
        const tope = n >= m.max;
        const costo = m.costo(n);
        return `<button class="mejora-lab" data-id="${m.id}" ${tope || estado.estrellas < costo ? "disabled" : ""}>
            <span class="txt">${m.nombre} <small>${m.detalle(n + (tope ? 0 : 1))} · nivel ${n}/${m.max}</small></span>
            <span class="precio-lab">${tope ? "Máx" : `⭐ ${costo}`}</span></button>`;
    }).join("");
}

$("mejoras-lab").addEventListener("click", (e) => {
    const b = e.target.closest(".mejora-lab");
    if (!b || b.disabled) return;
    const m = LAB.find((x) => x.id === b.dataset.id);
    const costo = m.costo(nivelLab(m.id));
    if (estado.estrellas < costo) return;
    estado.estrellas -= costo;
    estado.lab[m.id]++;
    guardar(CLAVE, estado);
    vibrar(30);
    pintarLab();
    pintarDatos();
});

$("abrir-lab").addEventListener("click", () => {
    pintarLab();
    $("menu").hidden = true;
    $("lab").hidden = false;
});
$("cerrar-lab").addEventListener("click", () => {
    $("lab").hidden = true;
    abrirMenu();
});
$("jugar").addEventListener("click", () => {
    if (estado.partida && !confirm("Se va a perder la partida guardada. ¿Empezar otra?")) return;
    estado.partida = null;
    $("menu").hidden = true;
    chispas.limpiar();
    nuevaPartida(estado.mapa);
    $("velocidad").textContent = "×1";
});
$("continuar").addEventListener("click", () => {
    $("menu").hidden = true;
    estado.mapa = estado.partida.mapa;
    nuevaPartida(estado.partida.mapa, estado.partida);
    $("velocidad").textContent = "×1";
});

// Al salir de la página en medio de una oleada se guarda lo último entre oleadas (no se pierde nada construido antes)
prepararMapa(desbloqueado(estado.mapa) ? estado.mapa : 0);
abrirMenu();
