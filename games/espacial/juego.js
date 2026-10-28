// Corredor espacial: la nave sigue al dedo y dispara sola. Cada sector termina con un jefe.
// Los cristales que juntás se gastan en el hangar: naves nuevas y mejoras permanentes.
import { cargar, guardar, vibrar } from "../../js/comun3d.js";
import { crearLienzo, bucle, crearChispas } from "../../js/lienzo2d.js";

const $ = (id) => document.getElementById(id);
const CLAVE = "espacial";
const TAU = Math.PI * 2;
const DURACION_SECTOR = 42;

const NAVES = {
    halcon: { nombre: "Halcón", detalle: "Equilibrada", vidas: 3, agilidad: 14, cadencia: 0.17, dano: 1, nivel: 1, cuerpo: "#edf2f4", acento: "#4cc9f0", costo: 0 },
    rayo: { nombre: "Rayo", detalle: "Muy rápida y dispara seguido, pero frágil", vidas: 2, agilidad: 22, cadencia: 0.12, dano: 0.85, nivel: 1, cuerpo: "#ffd166", acento: "#ff7a1a", costo: 150 },
    titan: { nombre: "Titán", detalle: "Lenta, blindada y con balas pesadas", vidas: 5, agilidad: 10, cadencia: 0.25, dano: 2.1, nivel: 1, cuerpo: "#adb5bd", acento: "#ff4d6d", costo: 300 },
    fenix: { nombre: "Fénix", detalle: "Arranca con el arma en nivel 3", vidas: 3, agilidad: 16, cadencia: 0.16, dano: 1.1, nivel: 3, cuerpo: "#ff7a1a", acento: "#ffd166", costo: 600 },
};
const MEJORAS = [
    { id: "dano", ico: "💥", nombre: "Cañones", detalle: "+15% de daño", max: 8, costo: (n) => 20 * (n + 1) },
    { id: "cadencia", ico: "⚡", nombre: "Recarga", detalle: "Disparo 6% más rápido", max: 6, costo: (n) => 25 * (n + 1) },
    { id: "blindaje", ico: "🛡️", nombre: "Blindaje", detalle: "+1 vida", max: 3, costo: (n) => 80 * (n + 1) },
    { id: "iman", ico: "🧲", nombre: "Imán", detalle: "Atrae cristales de más lejos", max: 4, costo: (n) => 30 * (n + 1) },
    { id: "bombas", ico: "💣", nombre: "Bombas", detalle: "+1 bomba al despegar", max: 3, costo: (n) => 60 * (n + 1) },
    { id: "arma", ico: "🔫", nombre: "Arma mejorada", detalle: "Empezás con el arma un nivel más arriba", max: 2, costo: (n) => 150 * (n + 1) },
];

const TIPOS = {
    dron: { vida: 2, puntos: 10, radio: 14, color: "#ff4d6d", velocidad: 140, cristales: 1 },
    zigzag: { vida: 3, puntos: 25, radio: 15, color: "#ffd23f", velocidad: 110, cristales: 1 },
    kamikaze: { vida: 2, puntos: 30, radio: 13, color: "#ff7a1a", velocidad: 70, cristales: 1 },
    roca: { vida: 5, puntos: 15, radio: 21, color: "#9a8c98", velocidad: 85, cristales: 1 },
    piedra: { vida: 2, puntos: 5, radio: 11, color: "#9a8c98", velocidad: 120, cristales: 0 },
    tanque: { vida: 10, puntos: 60, radio: 24, color: "#c77dff", velocidad: 55, cristales: 3 },
    torreta: { vida: 14, puntos: 80, radio: 20, color: "#06d6a0", velocidad: 120, cristales: 3 },
};
const JEFES = [
    { nombre: "Acorazado", vida: 260, color: "#ff4d6d", ancho: 130 },
    { nombre: "Medusa", vida: 320, color: "#c77dff", ancho: 110 },
    { nombre: "Destructor", vida: 400, color: "#ffd166", ancho: 150 },
];

const estado = cargar(CLAVE, { record: 0, cristales: 0, naves: ["halcon"], nave: "halcon", mejoras: {}, mejorSector: 1 });
estado.cristales ??= 0;
estado.naves ??= ["halcon"];
estado.nave ??= "halcon";
estado.mejoras ??= {};
const mejora = (id) => estado.mejoras[id] ?? 0;
const nave = () => NAVES[estado.nave] ?? NAVES.halcon;

const chispas = crearChispas();
const lienzo = crearLienzo($("lienzo"));
let juego = null;

const estrellas = Array.from({ length: 140 }, () => ({ x: Math.random(), y: Math.random(), capa: 1 + Math.floor(Math.random() * 3) }));

// ---------- Partida ----------
function nuevo() {
    const n = nave();
    juego = {
        nave: { x: lienzo.ancho / 2, y: lienzo.alto * 0.82, objetivoX: lienzo.ancho / 2, objetivoY: lienzo.alto * 0.82, invencible: 2, inclinacion: 0 },
        balas: [],
        balasEnemigas: [],
        enemigos: [],
        caidas: [],
        efectos: [],
        textos: [],
        estela: [],
        jefe: null,
        puntos: 0,
        vidas: n.vidas + mejora("blindaje"),
        bombas: 1 + mejora("bombas"),
        nivelArma: Math.min(5, n.nivel + mejora("arma")),
        sector: 1,
        tiempoSector: 0,
        tiempo: 0,
        cadencia: 0,
        misiles: 0,
        aparicion: 1,
        escudo: false,
        sacudida: 0,
        destello: 0,
        cartel: { texto: "Sector 1", vida: 2 },
        vivo: true,
        cristalesPartida: 0,
    };
    $("bomba").hidden = false;
    pintarDatos();
}

const fuerza = () => 1 + (juego.sector - 1) * 0.35;
const danoBala = () => nave().dano * (1 + mejora("dano") * 0.15);
const radioIman = () => 70 * (1 + mejora("iman") * 0.35);

function aparecer() {
    const t = juego.tiempoSector + (juego.sector - 1) * 20;
    const opciones = ["dron", "dron", "roca"];
    if (t > 10) opciones.push("zigzag", "zigzag");
    if (t > 20) opciones.push("kamikaze");
    if (t > 30) opciones.push("tanque");
    if (t > 40) opciones.push("torreta");
    const tipo = opciones[Math.floor(Math.random() * opciones.length)];
    // Los zigzag llegan en formación de tres
    if (tipo === "zigzag") {
        const x = 40 + Math.random() * (lienzo.ancho - 80);
        for (let k = 0; k < 3; k++) crearEnemigo(tipo, x, -20 - k * 34, k * 0.6);
    } else crearEnemigo(tipo);
}

function crearEnemigo(tipo, x, y, fase = Math.random() * 6) {
    const base = TIPOS[tipo];
    const r = base.radio;
    juego.enemigos.push({
        tipo,
        x: x ?? r + Math.random() * (lienzo.ancho - 2 * r),
        y: y ?? -r,
        vida: base.vida * fuerza(),
        max: base.vida * fuerza(),
        fase,
        giro: (Math.random() - 0.5) * 2,
        recarga: 1 + Math.random(),
        golpe: 0,
        destino: lienzo.alto * (0.15 + Math.random() * 0.15),
        quieto: 0,
        lados: 7 + Math.floor(Math.random() * 3),
    });
}

function disparar() {
    const n = juego.nave;
    const d = danoBala();
    const bala = (dx, angulo, extra = {}) => juego.balas.push({ x: n.x + dx, y: n.y - 20, vx: Math.sin(angulo) * 640, vy: -Math.cos(angulo) * 640, dano: d, ...extra });
    const nivel = juego.nivelArma;
    if (nivel === 1) bala(0, 0);
    else if (nivel === 2) [-8, 8].forEach((dx) => bala(dx, 0));
    else {
        bala(0, 0);
        bala(-8, -0.14);
        bala(8, 0.14);
        if (nivel >= 4) {
            bala(-14, -0.35);
            bala(14, 0.35);
        }
    }
}

function paso(dt) {
    const { ancho, alto } = lienzo;
    const n = juego.nave;
    const datos = nave();
    juego.tiempo += dt;
    const antesX = n.x;
    n.x += (n.objetivoX - n.x) * Math.min(1, dt * datos.agilidad);
    n.y += (n.objetivoY - n.y) * Math.min(1, dt * datos.agilidad);
    n.inclinacion += (Math.max(-1, Math.min(1, (n.x - antesX) / (dt * 400))) - n.inclinacion) * Math.min(1, dt * 10);
    n.invencible = Math.max(0, n.invencible - dt);
    juego.estela.push({ x: n.x + (Math.random() - 0.5) * 6, y: n.y + 18, vida: 0.4 });

    // Disparo automático y misiles teledirigidos en nivel 5
    juego.cadencia -= dt;
    if (juego.cadencia <= 0) {
        juego.cadencia = datos.cadencia * (1 - mejora("cadencia") * 0.06);
        disparar();
    }
    if (juego.nivelArma >= 5) {
        juego.misiles -= dt;
        if (juego.misiles <= 0) {
            juego.misiles = 0.6;
            for (const lado of [-1, 1]) juego.balas.push({ x: n.x + lado * 16, y: n.y, vx: lado * 120, vy: -200, dano: danoBala() * 2.5, misil: true });
        }
    }
    for (const b of juego.balas) {
        if (b.misil) {
            const blanco = juego.jefe ?? juego.enemigos.reduce((mejor, e) => (!mejor || Math.hypot(e.x - b.x, e.y - b.y) < Math.hypot(mejor.x - b.x, mejor.y - b.y) ? e : mejor), null);
            if (blanco) {
                const a = Math.atan2(blanco.y - b.y, blanco.x - b.x);
                b.vx += Math.cos(a) * 1600 * dt;
                b.vy += Math.sin(a) * 1600 * dt;
                const v = Math.hypot(b.vx, b.vy);
                if (v > 520) {
                    b.vx *= 520 / v;
                    b.vy *= 520 / v;
                }
            }
        }
        b.x += b.vx * dt;
        b.y += b.vy * dt;
    }
    juego.balas = juego.balas.filter((b) => b.y > -30 && b.x > -30 && b.x < ancho + 30 && b.y < alto + 30);

    // Sector: oleadas y después el jefe
    if (!juego.jefe) {
        juego.tiempoSector += dt;
        if (juego.tiempoSector < DURACION_SECTOR) {
            juego.aparicion -= dt;
            if (juego.aparicion <= 0) {
                juego.aparicion = Math.max(0.35, 1.1 - juego.tiempoSector * 0.012 - juego.sector * 0.06);
                aparecer();
            }
        } else if (!juego.enemigos.length && !juego.avisoJefe) {
            juego.avisoJefe = 2.2;
            juego.cartel = { texto: "⚠ JEFE ⚠", vida: 2.2, color: "#ff4d6d" };
            vibrar([80, 80, 80]);
        }
        if (juego.avisoJefe) {
            juego.avisoJefe -= dt;
            if (juego.avisoJefe <= 0) {
                juego.avisoJefe = 0;
                crearJefe();
            }
        }
    } else pasoJefe(dt);

    for (const e of juego.enemigos) {
        const t = TIPOS[e.tipo];
        e.golpe = Math.max(0, e.golpe - dt);
        const vel = t.velocidad * (1 + juego.sector * 0.05);
        if (e.tipo === "kamikaze") {
            // Baja despacio y después se tira contra la nave
            if (!e.picada && e.y > alto * 0.18) {
                e.picada = true;
                const a = Math.atan2(n.y - e.y, n.x - e.x);
                e.vx = Math.cos(a) * 380;
                e.vy = Math.sin(a) * 380;
            }
            if (e.picada) {
                e.x += e.vx * dt;
                e.y += e.vy * dt;
            } else e.y += vel * dt;
        } else if (e.tipo === "torreta") {
            if (e.y < e.destino && !e.saliendo) e.y += vel * dt;
            else {
                e.quieto += dt;
                if (e.quieto > 8) e.saliendo = true;
                if (e.saliendo) e.y += vel * 0.6 * dt;
            }
            e.recarga -= dt;
            if (e.recarga <= 0 && e.y > 0) {
                e.recarga = 1.8;
                const a = Math.atan2(n.y - e.y, n.x - e.x);
                for (const d of [-0.25, 0, 0.25]) balaEnemiga(e.x, e.y, a + d, 200);
            }
        } else {
            e.y += vel * dt;
            if (e.tipo === "zigzag") e.x += Math.sin(juego.tiempo * 3 + e.fase) * 130 * dt;
            if (e.tipo === "tanque") {
                e.recarga -= dt;
                if (e.recarga <= 0 && e.y > 0) {
                    e.recarga = 1.6;
                    balaEnemiga(e.x, e.y, Math.atan2(n.y - e.y, n.x - e.x), 220);
                }
            }
        }
        e.fase += e.giro * dt;
        for (const b of juego.balas) {
            if (b.usada || Math.hypot(b.x - e.x, b.y - e.y) > t.radio + 4) continue;
            b.usada = true;
            danar(e, b.dano, b.x, b.y);
        }
        if (!e.muerto && Math.hypot(e.x - n.x, e.y - n.y) < t.radio + 12) {
            destruir(e);
            golpeNave();
        }
    }
    juego.balas = juego.balas.filter((b) => !b.usada);
    juego.enemigos = juego.enemigos.filter((e) => !e.muerto && e.y < alto + 40 && e.y > -200 && e.x > -60 && e.x < ancho + 60);

    for (const b of juego.balasEnemigas) {
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        if (Math.hypot(b.x - n.x, b.y - n.y) < 11) {
            b.usada = true;
            golpeNave();
        }
    }
    juego.balasEnemigas = juego.balasEnemigas.filter((b) => !b.usada && b.y < alto + 10 && b.y > -40 && b.x > -10 && b.x < ancho + 10);

    // Cristales y premios: el imán los atrae
    for (const c of juego.caidas) {
        const d = Math.hypot(c.x - n.x, c.y - n.y);
        if (c.tipo === "cristal" && d < radioIman()) {
            c.x += ((n.x - c.x) / d) * 420 * dt;
            c.y += ((n.y - c.y) / d) * 420 * dt;
        } else c.y += (c.tipo === "cristal" ? 90 : 110) * dt;
        c.giro = (c.giro ?? 0) + dt * 4;
        if (d < 24) {
            c.tomado = true;
            tomar(c);
        }
    }
    juego.caidas = juego.caidas.filter((c) => !c.tomado && c.y < alto + 20);
}

function balaEnemiga(x, y, angulo, velocidad, color = "#ff4d6d") {
    juego.balasEnemigas.push({ x, y, vx: Math.cos(angulo) * velocidad, vy: Math.sin(angulo) * velocidad, color });
}

function danar(e, dano, x, y) {
    e.vida -= dano;
    e.golpe = 0.06;
    chispas.emitir(x, y, "#fff", 2, 80);
    if (e.vida <= 0) destruir(e);
}

function destruir(e) {
    if (e.muerto) return;
    e.muerto = true;
    const t = TIPOS[e.tipo];
    juego.puntos += t.puntos * juego.sector;
    explosion(e.x, e.y, t.color, e.tipo === "tanque" || e.tipo === "torreta" ? 1.4 : 0.8);
    vibrar(e.tipo === "tanque" ? 50 : 12);
    if (e.tipo === "roca") for (const lado of [-1, 1]) crearEnemigo("piedra", e.x + lado * 10, e.y);
    for (let k = 0; k < t.cristales; k++) juego.caidas.push({ tipo: "cristal", x: e.x + (Math.random() - 0.5) * 20, y: e.y + (Math.random() - 0.5) * 20 });
    const grande = e.tipo === "tanque" || e.tipo === "torreta";
    if (Math.random() < (grande ? 0.45 : 0.05)) soltarPremio(e.x, e.y);
    pintarDatos();
}

function soltarPremio(x, y) {
    const r = Math.random();
    const tipo = r < 0.5 ? "poder" : r < 0.72 ? "escudo" : r < 0.9 ? "bomba" : "vida";
    juego.caidas.push({ tipo, x, y });
}

function tomar(c) {
    vibrar(20);
    const n = juego.nave;
    if (c.tipo === "cristal") {
        estado.cristales++;
        juego.cristalesPartida++;
    } else if (c.tipo === "poder") {
        juego.nivelArma = Math.min(5, juego.nivelArma + 1);
        texto(n.x, n.y - 40, juego.nivelArma === 5 ? "¡ARMA AL MÁXIMO!" : `Arma nivel ${juego.nivelArma}`, "#ffd166");
    } else if (c.tipo === "escudo") {
        juego.escudo = true;
        texto(n.x, n.y - 40, "Escudo", "#4cc9f0");
    } else if (c.tipo === "bomba") {
        juego.bombas++;
        texto(n.x, n.y - 40, "+1 bomba", "#ff4d6d");
    } else if (c.tipo === "vida") {
        juego.vidas++;
        texto(n.x, n.y - 40, "+1 vida", "#ff8fa3");
    }
    pintarDatos();
}

function explosion(x, y, color, tamano = 1) {
    chispas.emitir(x, y, color, Math.round(16 * tamano), 220 * tamano);
    chispas.emitir(x, y, "#ffb703", Math.round(8 * tamano), 140 * tamano);
    juego.efectos.push({ tipo: "onda", x, y, r: 6, max: 40 * tamano, vida: 0.35, color });
    if (tamano > 1.2) juego.sacudida = Math.max(juego.sacudida, 0.15 * tamano);
}

function golpeNave() {
    const n = juego.nave;
    if (n.invencible > 0) return;
    if (juego.escudo) {
        juego.escudo = false;
        n.invencible = 1;
        chispas.emitir(n.x, n.y, "#4cc9f0", 20, 200);
        vibrar(60);
        return;
    }
    juego.vidas--;
    juego.nivelArma = Math.max(nave().nivel, juego.nivelArma - 1);
    n.invencible = 2;
    explosion(n.x, n.y, "#ff6b35", 1.5);
    vibrar(180);
    pintarDatos();
    if (juego.vidas <= 0) fin();
}

function usarBomba() {
    if (!juego?.vivo || juego.bombas <= 0) return;
    juego.bombas--;
    juego.destello = 0.5;
    juego.sacudida = 0.4;
    vibrar([100, 50, 100]);
    juego.balasEnemigas = [];
    for (const e of [...juego.enemigos]) danar(e, 50 * fuerza(), e.x, e.y);
    if (juego.jefe) danarJefe(juego.jefe.max * 0.08);
    juego.efectos.push({ tipo: "onda", x: juego.nave.x, y: juego.nave.y, r: 10, max: Math.max(lienzo.ancho, lienzo.alto), vida: 0.6, color: "#ffffff" });
    pintarDatos();
}

// ---------- Jefes ----------
function crearJefe() {
    const indice = (juego.sector - 1) % JEFES.length;
    const base = JEFES[indice];
    const vida = base.vida * fuerza() * (1 + Math.floor((juego.sector - 1) / JEFES.length) * 0.5) * danoBala();
    juego.jefe = { ...base, indice, x: lienzo.ancho / 2, y: -80, vida, max: vida, t: 0, ataque: 1.5, fase: 0, golpe: 0, rayo: 0 };
}

function pasoJefe(dt) {
    const j = juego.jefe;
    const n = juego.nave;
    const { ancho, alto } = lienzo;
    j.t += dt;
    j.golpe = Math.max(0, j.golpe - dt);
    // Entra desde arriba y después se mueve de lado a lado
    const yObjetivo = alto * 0.17;
    if (j.y < yObjetivo) j.y += 70 * dt;
    else j.x = ancho / 2 + Math.sin(j.t * (0.6 + j.indice * 0.15)) * (ancho / 2 - j.ancho / 2 - 10);
    const enojado = j.vida < j.max * 0.4;
    j.ataque -= dt * (enojado ? 1.5 : 1);
    if (j.y >= yObjetivo && j.ataque <= 0) {
        j.fase++;
        if (j.indice === 0) {
            if (j.fase % 2) {
                for (let k = -3; k <= 3; k++) balaEnemiga(j.x, j.y + 30, Math.PI / 2 + k * 0.18, 210, "#ff4d6d");
                j.ataque = 1.4;
            } else {
                const a = Math.atan2(n.y - j.y, n.x - j.x);
                for (let k = 0; k < 3; k++) setTimeout(() => juego?.jefe && balaEnemiga(j.x - 40, j.y + 20, a, 300, "#ffd166"), k * 120);
                for (let k = 0; k < 3; k++) setTimeout(() => juego?.jefe && balaEnemiga(j.x + 40, j.y + 20, a, 300, "#ffd166"), k * 120);
                j.ataque = 1.1;
            }
        } else if (j.indice === 1) {
            if (j.fase % 3 === 0) {
                for (let k = 0; k < 3; k++) crearEnemigo("dron", j.x + (k - 1) * 40, j.y + 30);
                j.ataque = 1.5;
            } else {
                // Espiral
                for (let k = 0; k < 12; k++) balaEnemiga(j.x, j.y, (k / 12) * TAU + j.t * 1.3, 170, "#c77dff");
                j.ataque = 0.9;
            }
        } else {
            if (j.fase % 3 === 0) {
                j.rayo = 2.0; // aviso 0.9 s y después dispara el rayo
                j.rayoX = n.x;
                j.ataque = 2.6;
            } else {
                for (let k = 0; k < 16; k++) balaEnemiga(j.x, j.y + 20, (k / 16) * TAU, 160 + (j.fase % 2) * 60, "#ffd166");
                j.ataque = 1.2;
            }
        }
    }
    if (j.rayo > 0) {
        j.rayo -= dt;
        if (j.rayo < 1.1 && Math.abs(n.x - j.rayoX) < 22) golpeNave();
    }
    for (const b of juego.balas) {
        if (b.usada || Math.abs(b.x - j.x) > j.ancho / 2 || Math.abs(b.y - j.y) > 40) continue;
        b.usada = true;
        chispas.emitir(b.x, b.y, "#fff", 2, 80);
        danarJefe(b.dano);
    }
    if (Math.abs(n.x - j.x) < j.ancho / 2 && Math.abs(n.y - j.y) < 40) golpeNave();
}

function danarJefe(dano) {
    const j = juego.jefe;
    if (!j) return;
    j.vida -= dano;
    j.golpe = 0.05;
    if (j.vida > 0) return;
    // Jefe destruido: cadena de explosiones, premios y siguiente sector
    for (let k = 0; k < 8; k++) setTimeout(() => juego && explosion(j.x + (Math.random() - 0.5) * j.ancho, j.y + (Math.random() - 0.5) * 50, k % 2 ? j.color : "#ffb703", 1.8), k * 110);
    juego.sacudida = 0.7;
    vibrar([120, 60, 200]);
    const bono = 10 + juego.sector * 5;
    for (let k = 0; k < 12; k++) juego.caidas.push({ tipo: "cristal", x: j.x + (Math.random() - 0.5) * j.ancho, y: j.y + (Math.random() - 0.5) * 40 });
    soltarPremio(j.x, j.y);
    estado.cristales += bono;
    juego.cristalesPartida += bono;
    juego.puntos += 500 * juego.sector;
    juego.jefe = null;
    juego.balasEnemigas = [];
    juego.sector++;
    juego.tiempoSector = 0;
    juego.bombas++;
    estado.mejorSector = Math.max(estado.mejorSector ?? 1, juego.sector);
    juego.cartel = { texto: `¡${j.nombre} destruido!`, sub: `+${bono} 💎 · Sector ${juego.sector}`, vida: 2.8, color: "#ffd166" };
    guardar(CLAVE, estado);
    pintarDatos();
}

function fin() {
    juego.vivo = false;
    $("bomba").hidden = true;
    const nuevo = juego.puntos > estado.record;
    if (nuevo) estado.record = juego.puntos;
    guardar(CLAVE, estado);
    setTimeout(() => {
        $("titulo-centro").innerHTML = `${nuevo ? "¡Nuevo récord!" : "Nave destruida"}<div class="chico">${juego.puntos} puntos · sector ${juego.sector} · +${juego.cristalesPartida} 💎<br>Récord: <span id="record">${estado.record}</span></div>`;
        $("jugar").textContent = "Otra vez";
        $("centro").hidden = false;
        pintarDatos();
    }, 900);
}

function texto(x, y, t, color) {
    juego.textos.push({ x, y, t, color, vida: 1.2 });
}

function pintarDatos() {
    $("puntos").textContent = juego?.puntos ?? 0;
    $("sector").textContent = juego?.sector ?? 1;
    $("vidas").textContent = juego?.vidas ?? nave().vidas + mejora("blindaje");
    $("cristales").textContent = estado.cristales;
    $("bombas").textContent = juego?.bombas ?? 0;
    $("bomba").disabled = !juego?.bombas;
    const r = $("record");
    if (r) r.textContent = estado.record;
}

// ---------- Dibujo ----------
function dibujarNave(ctx, x, y, datos, inclinacion = 0, escala = 1) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(escala * (1 - Math.abs(inclinacion) * 0.25), escala);
    // Llama del motor
    const llama = 12 + Math.random() * 10;
    const gl = ctx.createLinearGradient(0, 12, 0, 12 + llama);
    gl.addColorStop(0, "#fff");
    gl.addColorStop(0.3, datos.acento);
    gl.addColorStop(1, "transparent");
    ctx.fillStyle = gl;
    ctx.beginPath();
    ctx.moveTo(-6, 12);
    ctx.lineTo(0, 14 + llama);
    ctx.lineTo(6, 12);
    ctx.fill();
    // Alas
    const g = ctx.createLinearGradient(-22, 0, 22, 0);
    g.addColorStop(0, "#495057");
    g.addColorStop(0.5, datos.cuerpo);
    g.addColorStop(1, "#495057");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(0, -24);
    ctx.lineTo(7, -6);
    ctx.lineTo(22, 10);
    ctx.lineTo(22, 16);
    ctx.lineTo(7, 12);
    ctx.lineTo(-7, 12);
    ctx.lineTo(-22, 16);
    ctx.lineTo(-22, 10);
    ctx.lineTo(-7, -6);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = datos.acento;
    ctx.fillRect(-21, 8, 4, 8);
    ctx.fillRect(17, 8, 4, 8);
    ctx.fillRect(-1.5, -18, 3, 10);
    // Cabina
    const c = ctx.createRadialGradient(-1, -6, 1, 0, -3, 7);
    c.addColorStop(0, "#fff");
    c.addColorStop(0.4, datos.acento);
    c.addColorStop(1, "#03045e");
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.ellipse(0, -3, 4.5, 8, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
}

function dibujarEnemigo(ctx, e) {
    const t = TIPOS[e.tipo];
    ctx.save();
    ctx.translate(e.x, e.y);
    ctx.shadowColor = t.color;
    ctx.shadowBlur = 12;
    const color = e.golpe > 0 ? "#fff" : t.color;
    if (e.tipo === "roca" || e.tipo === "piedra") {
        ctx.rotate(e.fase);
        const g = ctx.createRadialGradient(-t.radio * 0.3, -t.radio * 0.3, 2, 0, 0, t.radio);
        g.addColorStop(0, e.golpe > 0 ? "#fff" : "#adb5bd");
        g.addColorStop(1, "#343a40");
        ctx.fillStyle = g;
        ctx.beginPath();
        for (let i = 0; i < e.lados; i++) {
            const a = (i / e.lados) * TAU;
            const r = t.radio * (0.8 + ((i * 37) % 10) / 40);
            i ? ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r) : ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
        }
        ctx.closePath();
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = "#0004";
        ctx.beginPath();
        ctx.arc(-t.radio * 0.25, -t.radio * 0.1, t.radio * 0.2, 0, TAU);
        ctx.arc(t.radio * 0.3, t.radio * 0.25, t.radio * 0.14, 0, TAU);
        ctx.fill();
    } else if (e.tipo === "tanque") {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.roundRect(-t.radio, -t.radio * 0.6, t.radio * 2, t.radio * 1.2, 8);
        ctx.fill();
        ctx.fillStyle = "#3c096c";
        ctx.fillRect(-4, t.radio * 0.3, 8, t.radio * 0.6);
        ctx.fillStyle = "#e0aaff";
        for (const dx of [-0.6, 0.6]) {
            ctx.beginPath();
            ctx.arc(dx * t.radio, 0, 4, 0, TAU);
            ctx.fill();
        }
    } else if (e.tipo === "torreta") {
        ctx.rotate(e.fase * 0.5);
        ctx.fillStyle = color;
        ctx.beginPath();
        for (let k = 0; k < 6; k++) {
            const a = (k / 6) * TAU;
            ctx.lineTo(Math.cos(a) * t.radio, Math.sin(a) * t.radio);
        }
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "#03001c";
        ctx.beginPath();
        ctx.arc(0, 0, t.radio * 0.4, 0, TAU);
        ctx.fill();
        ctx.fillStyle = "#06d6a0";
        ctx.beginPath();
        ctx.arc(0, 0, t.radio * 0.2, 0, TAU);
        ctx.fill();
    } else if (e.tipo === "kamikaze") {
        if (e.picada) ctx.rotate(Math.atan2(e.vy, e.vx) - Math.PI / 2);
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(0, t.radio * 1.3);
        ctx.lineTo(t.radio, -t.radio);
        ctx.lineTo(0, -t.radio * 0.4);
        ctx.lineTo(-t.radio, -t.radio);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "#fff3b0";
        ctx.beginPath();
        ctx.arc(0, 0, 3, 0, TAU);
        ctx.fill();
    } else {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(0, t.radio);
        ctx.lineTo(t.radio, -t.radio * 0.6);
        ctx.lineTo(t.radio * 0.4, -t.radio * 0.2);
        ctx.lineTo(0, -t.radio * 0.5);
        ctx.lineTo(-t.radio * 0.4, -t.radio * 0.2);
        ctx.lineTo(-t.radio, -t.radio * 0.6);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "#10002b";
        ctx.beginPath();
        ctx.arc(0, 0, t.radio * 0.28, 0, TAU);
        ctx.fill();
        ctx.fillStyle = "#fff";
        ctx.beginPath();
        ctx.arc(0, 2, t.radio * 0.1, 0, TAU);
        ctx.fill();
    }
    ctx.restore();
}

function dibujarJefe(ctx, j) {
    ctx.save();
    ctx.translate(j.x, j.y);
    ctx.shadowColor = j.color;
    ctx.shadowBlur = 20;
    const color = j.golpe > 0 ? "#fff" : j.color;
    const w = j.ancho;
    if (j.indice === 0) {
        const g = ctx.createLinearGradient(0, -40, 0, 40);
        g.addColorStop(0, "#495057");
        g.addColorStop(1, "#212529");
        ctx.fillStyle = j.golpe > 0 ? "#fff" : g;
        ctx.beginPath();
        ctx.moveTo(-w / 2, -20);
        ctx.lineTo(w / 2, -20);
        ctx.lineTo(w / 2 - 15, 20);
        ctx.lineTo(15, 38);
        ctx.lineTo(-15, 38);
        ctx.lineTo(-w / 2 + 15, 20);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = color;
        for (const dx of [-40, 40]) ctx.fillRect(dx - 6, 10, 12, 22);
        ctx.beginPath();
        ctx.arc(0, 0, 13, 0, TAU);
        ctx.fill();
    } else if (j.indice === 1) {
        for (let k = 0; k < 8; k++) {
            ctx.strokeStyle = color;
            ctx.lineWidth = 5;
            ctx.beginPath();
            const x0 = -w / 2 + 10 + (k * (w - 20)) / 7;
            ctx.moveTo(x0, 10);
            ctx.quadraticCurveTo(x0 + Math.sin(j.t * 4 + k) * 14, 40, x0 + Math.sin(j.t * 3 + k) * 8, 62);
            ctx.stroke();
        }
        const g = ctx.createRadialGradient(-15, -15, 4, 0, 0, w / 2);
        g.addColorStop(0, "#fff");
        g.addColorStop(0.3, color);
        g.addColorStop(1, "#3c096c");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.ellipse(0, 0, w / 2, 32, 0, Math.PI, 0);
        ctx.lineTo(w / 2, 10);
        ctx.lineTo(-w / 2, 10);
        ctx.fill();
        ctx.fillStyle = "#fff";
        for (const dx of [-18, 18]) {
            ctx.beginPath();
            ctx.arc(dx, -6, 7, 0, TAU);
            ctx.fill();
        }
        ctx.fillStyle = "#10002b";
        for (const dx of [-18, 18]) {
            ctx.beginPath();
            ctx.arc(dx, -4, 3.5, 0, TAU);
            ctx.fill();
        }
    } else {
        ctx.fillStyle = j.golpe > 0 ? "#fff" : "#343a40";
        ctx.beginPath();
        ctx.moveTo(0, 44);
        ctx.lineTo(w / 2, -10);
        ctx.lineTo(w / 2 - 20, -34);
        ctx.lineTo(-w / 2 + 20, -34);
        ctx.lineTo(-w / 2, -10);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(0, 30);
        ctx.lineTo(18, 0);
        ctx.lineTo(-18, 0);
        ctx.closePath();
        ctx.fill();
        for (const dx of [-w / 2 + 14, w / 2 - 14]) {
            ctx.beginPath();
            ctx.arc(dx, -12, 8, 0, TAU);
            ctx.fill();
        }
    }
    ctx.restore();
    // Rayo del Destructor: primero una línea de aviso, después el rayo
    if (j.rayo > 0) {
        if (j.rayo >= 1.1) {
            ctx.strokeStyle = `rgba(255,77,109,${0.3 + Math.sin(performance.now() / 50) * 0.3})`;
            ctx.lineWidth = 2;
            ctx.setLineDash([8, 8]);
            ctx.beginPath();
            ctx.moveTo(j.rayoX, j.y);
            ctx.lineTo(j.rayoX, lienzo.alto);
            ctx.stroke();
            ctx.setLineDash([]);
        } else {
            const g = ctx.createLinearGradient(j.rayoX - 22, 0, j.rayoX + 22, 0);
            g.addColorStop(0, "transparent");
            g.addColorStop(0.3, "#ffd166cc");
            g.addColorStop(0.5, "#ffffff");
            g.addColorStop(0.7, "#ffd166cc");
            g.addColorStop(1, "transparent");
            ctx.fillStyle = g;
            ctx.fillRect(j.rayoX - 22, j.y, 44, lienzo.alto);
        }
    }
}

function dibujarCaida(ctx, c) {
    if (c.tipo === "cristal") {
        ctx.save();
        ctx.translate(c.x, c.y);
        ctx.rotate(c.giro);
        ctx.fillStyle = "#7df9ff";
        ctx.shadowColor = "#7df9ff";
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.moveTo(0, -7);
        ctx.lineTo(5, 0);
        ctx.lineTo(0, 7);
        ctx.lineTo(-5, 0);
        ctx.fill();
        ctx.restore();
        return;
    }
    const info = { poder: ["#ffd166", "P"], escudo: ["#4cc9f0", "◎"], bomba: ["#ff4d6d", "💣"], vida: ["#ff8fa3", "♥"] }[c.tipo];
    ctx.save();
    ctx.shadowColor = info[0];
    ctx.shadowBlur = 14;
    const g = ctx.createRadialGradient(c.x - 4, c.y - 4, 2, c.x, c.y, 14);
    g.addColorStop(0, "#fff");
    g.addColorStop(0.4, info[0]);
    g.addColorStop(1, "#000a");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(c.x, c.y, 13 + Math.sin(c.giro * 2) * 1.5, 0, TAU);
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = "#02010a";
    ctx.font = "900 13px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(info[1], c.x, c.y + 1);
}

function dibujarFondo(ctx, ancho, alto, dt) {
    const tono = ((juego?.sector ?? 1) * 55) % 360;
    ctx.fillStyle = "#03001c";
    ctx.fillRect(0, 0, ancho, alto);
    // Nebulosas
    const t = performance.now() / 9000;
    for (const [px, py, r, desfase] of [[0.2, 0.3, 0.6, 0], [0.85, 0.7, 0.5, 120]]) {
        const x = ancho * (px + Math.sin(t + desfase) * 0.05);
        const y = alto * ((py + t * 0.3) % 1.4 - 0.2);
        const g = ctx.createRadialGradient(x, y, 0, x, y, ancho * r);
        g.addColorStop(0, `hsla(${(tono + desfase) % 360},80%,45%,0.22)`);
        g.addColorStop(1, "transparent");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, ancho, alto);
    }
    const rapido = juego?.vivo ? 1.6 : 0.5;
    for (const s of estrellas) {
        s.y += dt * 0.05 * s.capa * rapido;
        if (s.y > 1) s.y -= 1;
        ctx.fillStyle = `rgba(255,255,255,${0.25 * s.capa})`;
        ctx.fillRect(s.x * ancho, s.y * alto, s.capa * 0.8, s.capa * (juego?.vivo ? 3 : 1));
    }
}

function dibujar(dt) {
    const { ctx, ancho, alto } = lienzo;
    ctx.save();
    if (juego?.sacudida > 0) {
        ctx.translate((Math.random() - 0.5) * 16 * juego.sacudida, (Math.random() - 0.5) * 16 * juego.sacudida);
        juego.sacudida = Math.max(0, juego.sacudida - dt);
    }
    dibujarFondo(ctx, ancho, alto, dt);
    if (!juego) {
        dibujarNave(ctx, ancho / 2, alto * 0.75, nave(), 0, 1.6);
        return ctx.restore();
    }

    // Estela del motor
    for (const s of juego.estela) {
        s.vida -= dt;
        s.y += 160 * dt;
        ctx.globalAlpha = Math.max(0, s.vida * 1.5);
        ctx.fillStyle = nave().acento;
        ctx.beginPath();
        ctx.arc(s.x, s.y, Math.max(0.1, 3 * s.vida * 2.5), 0, TAU);
        ctx.fill();
    }
    ctx.globalAlpha = 1;
    juego.estela = juego.estela.filter((s) => s.vida > 0);

    for (const c of juego.caidas) dibujarCaida(ctx, c);

    ctx.shadowBlur = 8;
    for (const b of juego.balas) {
        if (b.misil) {
            ctx.fillStyle = "#ffd166";
            ctx.shadowColor = "#ff7a1a";
            ctx.save();
            ctx.translate(b.x, b.y);
            ctx.rotate(Math.atan2(b.vy, b.vx) + Math.PI / 2);
            ctx.fillRect(-2, -7, 4, 12);
            ctx.restore();
        } else {
            ctx.fillStyle = nave().dano > 1.5 ? "#ff8fa3" : "#9bf6ff";
            ctx.shadowColor = nave().acento;
            ctx.save();
            ctx.translate(b.x, b.y);
            ctx.rotate(Math.atan2(b.vy, b.vx) + Math.PI / 2);
            ctx.beginPath();
            ctx.roundRect(-2, -8, nave().dano > 1.5 ? 5 : 4, 15, 2);
            ctx.fill();
            ctx.restore();
        }
    }
    for (const b of juego.balasEnemigas) {
        ctx.fillStyle = b.color;
        ctx.shadowColor = b.color;
        ctx.beginPath();
        ctx.arc(b.x, b.y, 5, 0, TAU);
        ctx.fill();
        ctx.fillStyle = "#fff";
        ctx.beginPath();
        ctx.arc(b.x, b.y, 2, 0, TAU);
        ctx.fill();
    }
    ctx.shadowBlur = 0;
    for (const e of juego.enemigos) dibujarEnemigo(ctx, e);
    if (juego.jefe) dibujarJefe(ctx, juego.jefe);

    const n = juego.nave;
    if (juego.vivo && !(n.invencible > 0 && Math.floor(n.invencible * 10) % 2)) {
        dibujarNave(ctx, n.x, n.y, nave(), n.inclinacion);
        if (juego.escudo) {
            ctx.strokeStyle = "#4cc9f0aa";
            ctx.lineWidth = 3;
            ctx.shadowColor = "#4cc9f0";
            ctx.shadowBlur = 12;
            ctx.beginPath();
            ctx.arc(n.x, n.y, 28 + Math.sin(performance.now() / 120) * 2, 0, TAU);
            ctx.stroke();
            ctx.shadowBlur = 0;
        }
    }

    for (const ef of juego.efectos) {
        ef.vida -= dt;
        ef.r += (ef.max - ef.r) * Math.min(1, dt * 10);
        ctx.strokeStyle = ef.color;
        ctx.globalAlpha = Math.max(0, ef.vida * 2.5);
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(ef.x, ef.y, ef.r, 0, TAU);
        ctx.stroke();
    }
    ctx.globalAlpha = 1;
    juego.efectos = juego.efectos.filter((ef) => ef.vida > 0);
    chispas.dibujar(ctx, dt);

    for (const t of juego.textos) {
        t.vida -= dt;
        t.y -= dt * 30;
        ctx.globalAlpha = Math.min(1, t.vida * 1.5);
        ctx.font = "900 15px sans-serif";
        ctx.textAlign = "center";
        ctx.lineWidth = 3;
        ctx.strokeStyle = "#000";
        ctx.strokeText(t.t, t.x, t.y);
        ctx.fillStyle = t.color;
        ctx.fillText(t.t, t.x, t.y);
    }
    ctx.globalAlpha = 1;
    juego.textos = juego.textos.filter((t) => t.vida > 0);

    // Barra del jefe o del sector, arriba
    ctx.fillStyle = "#0008";
    ctx.fillRect(10, 8, ancho - 20, 8);
    if (juego.jefe) {
        ctx.fillStyle = juego.jefe.color;
        ctx.fillRect(10, 8, (ancho - 20) * Math.max(0, juego.jefe.vida / juego.jefe.max), 8);
        ctx.fillStyle = "#fff";
        ctx.font = "800 11px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(juego.jefe.nombre.toUpperCase(), ancho / 2, 30);
    } else {
        ctx.fillStyle = "#7df9ff88";
        ctx.fillRect(10, 8, (ancho - 20) * Math.min(1, juego.tiempoSector / DURACION_SECTOR), 8);
    }
    // Nivel del arma
    ctx.textAlign = "left";
    ctx.font = "800 11px sans-serif";
    ctx.fillStyle = "#ffd166";
    ctx.fillText(`ARMA ${"▮".repeat(juego.nivelArma)}${"▯".repeat(5 - juego.nivelArma)}`, 12, 32);

    if (juego.cartel?.vida > 0) {
        const c = juego.cartel;
        c.vida -= dt;
        ctx.globalAlpha = Math.min(1, c.vida);
        ctx.textAlign = "center";
        ctx.font = "900 30px sans-serif";
        ctx.lineWidth = 5;
        ctx.strokeStyle = "#000";
        ctx.strokeText(c.texto, ancho / 2, alto * 0.42);
        ctx.fillStyle = c.color ?? "#7df9ff";
        ctx.fillText(c.texto, ancho / 2, alto * 0.42);
        if (c.sub) {
            ctx.font = "800 16px sans-serif";
            ctx.strokeText(c.sub, ancho / 2, alto * 0.42 + 28);
            ctx.fillStyle = "#fff";
            ctx.fillText(c.sub, ancho / 2, alto * 0.42 + 28);
        }
        ctx.globalAlpha = 1;
    }
    if (juego.destello > 0) {
        ctx.fillStyle = `rgba(255,255,255,${juego.destello})`;
        ctx.fillRect(0, 0, ancho, alto);
        juego.destello = Math.max(0, juego.destello - dt);
    }
    ctx.restore();
}

bucle((dt) => {
    if (juego?.vivo && $("centro").hidden && $("hangar").hidden) paso(dt);
    dibujar(dt);
});

// ---------- Controles: la nave va hacia el dedo (un poco más arriba para verla) ----------
function mover(e) {
    if (!juego) return;
    const caja = $("lienzo").getBoundingClientRect();
    juego.nave.objetivoX = Math.max(18, Math.min(lienzo.ancho - 18, e.clientX - caja.left));
    juego.nave.objetivoY = Math.max(lienzo.alto * 0.4, Math.min(lienzo.alto - 30, e.clientY - caja.top - 60));
}
$("lienzo").addEventListener("pointerdown", mover);
$("lienzo").addEventListener("pointermove", mover);
$("bomba").addEventListener("click", usarBomba);

$("jugar").addEventListener("click", () => {
    $("centro").hidden = true;
    chispas.limpiar();
    nuevo();
});

// ---------- Hangar ----------
function pintarHangar() {
    $("cristales-hangar").textContent = estado.cristales;
    $("naves").innerHTML = Object.entries(NAVES).map(([id, n]) => {
        const tiene = estado.naves.includes(id);
        const puesta = estado.nave === id;
        return `<button class="item-h${puesta ? " puesta" : ""}" data-nave="${id}" type="button" ${!tiene && estado.cristales < n.costo ? "disabled" : ""}>
            <canvas width="96" height="96"></canvas>
            <span class="txt">${n.nombre}<small>${n.detalle} · ${n.vidas} vidas</small></span>
            <span class="precio">${puesta ? "En uso" : tiene ? "Usar" : `💎 ${n.costo}`}</span></button>`;
    }).join("");
    for (const b of document.querySelectorAll("[data-nave]")) {
        const ctx = b.querySelector("canvas").getContext("2d");
        ctx.scale(2, 2);
        dibujarNave(ctx, 24, 24, NAVES[b.dataset.nave], 0, 0.85);
    }
    $("mejoras").innerHTML = MEJORAS.map((m) => {
        const n = mejora(m.id);
        const tope = n >= m.max;
        return `<button class="item-h" data-mejora="${m.id}" type="button" ${tope || estado.cristales < m.costo(n) ? "disabled" : ""}>
            <span class="ico">${m.ico}</span><span class="txt">${m.nombre}<small>${m.detalle} · ${n}/${m.max}</small></span>
            <span class="precio">${tope ? "Listo" : `💎 ${m.costo(n)}`}</span></button>`;
    }).join("");
}
$("hangar").addEventListener("click", (ev) => {
    const b = ev.target.closest(".item-h");
    if (!b || b.disabled) return;
    if (b.dataset.nave) {
        const id = b.dataset.nave;
        if (!estado.naves.includes(id)) {
            if (estado.cristales < NAVES[id].costo) return;
            estado.cristales -= NAVES[id].costo;
            estado.naves.push(id);
        }
        estado.nave = id;
    } else {
        const m = MEJORAS.find((x) => x.id === b.dataset.mejora);
        const costo = m.costo(mejora(m.id));
        if (estado.cristales < costo || mejora(m.id) >= m.max) return;
        estado.cristales -= costo;
        estado.mejoras[m.id] = mejora(m.id) + 1;
    }
    vibrar(25);
    guardar(CLAVE, estado);
    pintarHangar();
    pintarDatos();
});
$("abrir-hangar").addEventListener("click", () => {
    pintarHangar();
    $("centro").hidden = true;
    $("hangar").hidden = false;
});
$("cerrar-hangar").addEventListener("click", () => {
    $("hangar").hidden = true;
    $("centro").hidden = false;
});

// Los cristales se guardan seguido por si se cierra la app en medio de una partida
setInterval(() => juego?.vivo && guardar(CLAVE, estado), 5000);
pintarDatos();
