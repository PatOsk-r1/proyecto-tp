// Cruzar la calle: tu personaje avanza carril por carril. En cada carril hay una chance de que lo
// pise un auto (según la dificultad); cada carril cruzado multiplica la apuesta y podés cobrar cuando quieras.
// Multiplicador = (1 / (1 - riesgo)) por carril, menos 1% de la casa. El resultado se sortea al avanzar.
import { formatear, textoFlotante, vibrar } from "../../js/comun3d.js";
import { fichas, cambiarFichas } from "../../js/fichas.js";
import { selectorApuesta, pintarSaldo, conectarRecarga } from "../../js/casino.js";
import { crearLienzo, bucle, crearChispas } from "../../js/lienzo2d.js";
import { nota, golpe } from "../../js/sonido.js";

const $ = (id) => document.getElementById(id);
const CARRILES = 10;
const DEVOLUCION = 0.99;
const RIESGOS = { facil: 0.04, medio: 0.1, dificil: 0.2, extremo: 0.4 };
const COLORES_AUTO = ["#e63946", "#3a86ff", "#f4a261", "#2a9d8f", "#e9ecef", "#8338ec", "#ffbe0b", "#1d3557"];

let dificultad = "medio";
let ronda = null; // { carril, monto, terminada, gano }

const apuesta = selectorApuesta({ menos: $("menos"), mas: $("mas"), texto: $("apuesta"), alCambiar: () => pintar() });
const revisarRecarga = conectarRecarga($("recargar"), () => pintar());

const multiplicador = (n) => (n ? Math.floor((1 / (1 - RIESGOS[dificultad])) ** n * DEVOLUCION * 100) / 100 : 1);

// ---------- Escena ----------
let ancho = 300;
let alto = 300;
const lienzo = crearLienzo($("lienzo"), (d) => {
    ancho = d.ancho;
    alto = d.alto;
});
const chispas = crearChispas();
const altoCarril = () => Math.min(86, alto / 4.6);
const xJugador = () => ancho * 0.5;

// Carril 0 = vereda de salida, 1..CARRILES = calle, CARRILES + 1 = vereda de llegada
let carriles = [];
function armarCarriles() {
    carriles = Array.from({ length: CARRILES + 2 }, (_, i) => {
        const calle = i >= 1 && i <= CARRILES;
        const sentido = i % 2 ? 1 : -1;
        return { calle, sentido, velocidad: 160 + Math.random() * 160, autos: [], proximo: Math.random() * 0.8, frenado: false, seguro: false };
    });
}
armarCarriles();

const jugador = { carril: 0, visual: 0, salto: 0, caido: 0 };
let camara = 0;
let atropello = null; // { carril, x, auto }

function nuevoAuto(c, x) {
    const largo = 70 + Math.random() * 30;
    c.autos.push({ x: x ?? (c.sentido > 0 ? -largo : ancho + largo), largo, color: COLORES_AUTO[Math.floor(Math.random() * COLORES_AUTO.length)], v: c.velocidad });
}

function dibujarAuto(ctx, a, y, sentido, frenando) {
    const h = altoCarril() * 0.56;
    ctx.save();
    ctx.translate(a.x, y);
    ctx.scale(sentido, 1);
    ctx.fillStyle = "#0006";
    ctx.beginPath();
    ctx.roundRect(-a.largo / 2 + 3, -h / 2 + 5, a.largo, h, 10);
    ctx.fill();
    ctx.fillStyle = a.color;
    ctx.beginPath();
    ctx.roundRect(-a.largo / 2, -h / 2, a.largo, h, 10);
    ctx.fill();
    // Techo y vidrios
    ctx.fillStyle = "#0b0f15cc";
    ctx.beginPath();
    ctx.roundRect(-a.largo * 0.18, -h * 0.36, a.largo * 0.42, h * 0.72, 6);
    ctx.fill();
    ctx.fillStyle = "#ffffff22";
    ctx.fillRect(-a.largo * 0.16, -h * 0.32, a.largo * 0.1, h * 0.64);
    // Luces de adelante y de atrás
    ctx.fillStyle = "#fff6c2";
    ctx.fillRect(a.largo / 2 - 5, -h * 0.4, 4, h * 0.18);
    ctx.fillRect(a.largo / 2 - 5, h * 0.22, 4, h * 0.18);
    ctx.fillStyle = frenando ? "#ff2a3d" : "#7a1520";
    ctx.fillRect(-a.largo / 2 + 1, -h * 0.4, 4, h * 0.18);
    ctx.fillRect(-a.largo / 2 + 1, h * 0.22, 4, h * 0.18);
    if (frenando) {
        ctx.fillStyle = "#ff2a3d55";
        ctx.beginPath();
        ctx.arc(-a.largo / 2, 0, h * 0.6, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();
}

function dibujarPersona(ctx, x, y, t, caido) {
    const s = altoCarril() / 70;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    if (caido) {
        ctx.rotate(Math.PI / 2 * Math.min(1, caido));
        ctx.globalAlpha = 1 - Math.max(0, caido - 1);
    }
    ctx.fillStyle = "#0005";
    ctx.beginPath();
    ctx.ellipse(0, 22, 14, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    const paso = Math.sin(t * 14) * (jugador.salto > 0 ? 4 : 0);
    ctx.strokeStyle = "#1b2433";
    ctx.lineWidth = 6;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-4, 6);
    ctx.lineTo(-5 + paso, 20);
    ctx.moveTo(4, 6);
    ctx.lineTo(5 - paso, 20);
    ctx.stroke();
    ctx.fillStyle = "#4fc3ff";
    ctx.beginPath();
    ctx.roundRect(-10, -14, 20, 24, 7);
    ctx.fill();
    ctx.fillStyle = "#ffffff55";
    ctx.fillRect(-10, -2, 20, 3);
    ctx.fillStyle = "#e0ac69";
    ctx.beginPath();
    ctx.arc(0, -22, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#2b1a0e";
    ctx.beginPath();
    ctx.arc(0, -25, 9, Math.PI * 1.05, Math.PI * 1.95);
    ctx.fill();
    ctx.restore();
}

bucle((dt) => {
    const { ctx } = lienzo;
    const t = performance.now() / 1000;
    const h = altoCarril();
    // El personaje se desliza hasta su carril y la cámara lo sigue
    jugador.visual += (jugador.carril - jugador.visual) * Math.min(1, dt * 9);
    jugador.salto = Math.max(0, jugador.salto - dt * 3);
    const objetivoCamara = jugador.visual * h - alto * 0.32;
    camara += (Math.max(0, objetivoCamara) - camara) * Math.min(1, dt * 5);
    const yCarril = (i) => alto - (i + 0.5) * h + camara;

    ctx.fillStyle = "#2b2f36";
    ctx.fillRect(0, 0, ancho, alto);
    carriles.forEach((c, i) => {
        const y = yCarril(i);
        if (y < -h || y > alto + h) return;
        if (!c.calle) {
            // Vereda con baldosas
            ctx.fillStyle = "#8d939c";
            ctx.fillRect(0, y - h / 2, ancho, h);
            ctx.fillStyle = "#7b818a";
            for (let x = 0; x < ancho; x += 28) ctx.fillRect(x, y - h / 2, 2, h);
            ctx.fillStyle = "#c7ccd3";
            ctx.fillRect(0, i === 0 ? y - h / 2 : y + h / 2 - 5, ancho, 5);
            if (i === CARRILES + 1) {
                ctx.fillStyle = "#0b0f15aa";
                ctx.font = "800 13px system-ui, sans-serif";
                ctx.textAlign = "center";
                ctx.fillText("LLEGADA", ancho / 2, y + 5);
            }
            return;
        }
        ctx.fillStyle = i % 2 ? "#30353d" : "#2c3138";
        ctx.fillRect(0, y - h / 2, ancho, h);
        // Línea discontinua entre carriles
        if (i < CARRILES) {
            ctx.fillStyle = "#f1f3f5aa";
            for (let x = -((t * 0) % 40); x < ancho; x += 40) ctx.fillRect(x, y - h / 2 - 1, 20, 2);
        }
        // Senda peatonal donde cruza el personaje
        ctx.fillStyle = "#ffffff10";
        for (let k = -2; k <= 2; k++) ctx.fillRect(xJugador() + k * 12 - 4, y - h / 2 + 4, 7, h - 8);
        // Multiplicador del carril
        const pasado = ronda && i <= ronda.carril;
        ctx.fillStyle = pasado ? "#2ee59d" : "#ffffff22";
        ctx.beginPath();
        ctx.roundRect(ancho - 66, y - 12, 58, 24, 12);
        ctx.fill();
        ctx.fillStyle = pasado ? "#04140d" : "#ffffffcc";
        ctx.font = "800 12px system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(`${multiplicador(i).toFixed(2)}×`, ancho - 37, y + 4);
        // Barrera en los carriles ya cruzados
        if (c.seguro) {
            const bx = xJugador() - c.sentido * 46;
            ctx.fillStyle = "#ff8c1a";
            ctx.fillRect(bx - 3, y - h * 0.34, 6, h * 0.68);
            ctx.fillStyle = "#fff";
            for (let k = 0; k < 3; k++) ctx.fillRect(bx - 3, y - h * 0.3 + k * h * 0.22, 6, h * 0.08);
        }

        // Autos: aparecen, pasan y frenan antes de la barrera
        c.proximo -= dt;
        if (c.proximo <= 0 && !(atropello && atropello.carril === i)) {
            c.proximo = 0.8 + Math.random() * 1.4;
            nuevoAuto(c);
        }
        for (const a of c.autos) {
            const limite = xJugador() - c.sentido * (52 + a.largo / 2);
            const antes = a.x;
            let frenando = false;
            if (c.seguro && (c.sentido > 0 ? a.x <= limite : a.x >= limite)) {
                // Frena detrás del auto de adelante o de la barrera
                const adelante = c.autos.filter((o) => o !== a && (c.sentido > 0 ? o.x > a.x : o.x < a.x)).sort((p, q) => Math.abs(p.x - a.x) - Math.abs(q.x - a.x))[0];
                const tope = adelante && Math.abs(adelante.x - limite) < Math.abs(a.x - limite) + a.largo ? adelante.x - c.sentido * (adelante.largo / 2 + a.largo / 2 + 8) : limite;
                a.x = c.sentido > 0 ? Math.min(tope, a.x + a.v * dt) : Math.max(tope, a.x - a.v * dt);
                frenando = Math.abs(a.x - antes) < a.v * dt * 0.5;
            } else {
                a.x += c.sentido * a.v * dt;
            }
            dibujarAuto(ctx, a, y, c.sentido, frenando);
        }
        c.autos = c.autos.filter((a) => a.x > -150 && a.x < ancho + 150);
    });

    // Auto que atropella: entra rápido y pasa por el lugar del personaje
    if (atropello) {
        const a = atropello.auto;
        const c = carriles[atropello.carril];
        a.x += c.sentido * a.v * dt;
        const y = yCarril(atropello.carril);
        dibujarAuto(ctx, a, y, c.sentido, false);
        if (!atropello.golpe && Math.abs(a.x - xJugador()) < a.largo / 2) {
            atropello.golpe = true;
            golpe({ dur: 0.25, vol: 0.25, filtro: 500, tipo: "lowpass" });
            nota({ f: 160, hasta: 70, dur: 0.4, vol: 0.12, onda: "sawtooth" });
            vibrar([120, 60, 220]);
            chispas.emitir(xJugador(), y, "#ff4d6a", 22, 220);
            jugador.caido = 0.01;
            $("cartel").textContent = "¡Lo pisó un auto!";
        }
    }
    if (jugador.caido) jugador.caido = Math.min(2, jugador.caido + dt * 2.5);

    const yJ = alto - (jugador.visual + 0.5) * h + camara - Math.sin(jugador.salto * Math.PI) * 10;
    if (jugador.caido < 2) dibujarPersona(ctx, xJugador(), yJ, t, jugador.caido);
    chispas.dibujar(ctx, dt);
});

// ---------- Juego ----------
function empezar() {
    const valor = apuesta();
    if (fichas() < valor) return;
    cambiarFichas(-valor);
    ronda = { carril: 0, monto: valor, terminada: false };
    for (const c of carriles) c.seguro = false;
    Object.assign(jugador, { carril: 0, salto: 0, caido: 0 });
    atropello = null;
    $("cartel").textContent = "Tocá Avanzar para cruzar un carril";
    vibrar(12);
    pintar();
}

let moviendo = false;
function avanzar() {
    if (!ronda || ronda.terminada || moviendo) return;
    moviendo = true;
    const siguiente = ronda.carril + 1;
    const pierde = Math.random() < RIESGOS[dificultad];
    jugador.carril = siguiente;
    jugador.salto = 1;
    nota({ f: 600, hasta: 760, dur: 0.1, vol: 0.06, onda: "sine" });
    pintar();
    if (pierde) {
        const c = carriles[siguiente];
        // Saca los autos del carril y manda uno rápido directo al personaje
        c.autos = [];
        const largo = 85;
        atropello = { carril: siguiente, auto: { x: c.sentido > 0 ? -largo : ancho + largo, largo, color: "#d90429", v: 900 }, golpe: false };
        setTimeout(() => {
            moviendo = false;
            terminar(false);
        }, 700);
        return;
    }
    setTimeout(() => {
        carriles[siguiente].seguro = true;
        ronda.carril = siguiente;
        moviendo = false;
        nota({ f: 700 + siguiente * 60, dur: 0.14, vol: 0.09, onda: "triangle" });
        vibrar(10);
        $("cartel").textContent = siguiente === CARRILES ? "¡Cruzaste todo!" : `Carril ${siguiente} de ${CARRILES} · ${multiplicador(siguiente).toFixed(2)}×`;
        if (siguiente === CARRILES) {
            jugador.carril = CARRILES + 1;
            return cobrar();
        }
        pintar();
    }, 330);
}

function cobrar() {
    if (!ronda || ronda.terminada || !ronda.carril || moviendo) return;
    const premio = Math.floor(ronda.monto * multiplicador(ronda.carril));
    cambiarFichas(premio);
    const r = $("lienzo").getBoundingClientRect();
    textoFlotante(r.left + r.width / 2, r.top + r.height * 0.4, `+${formatear(premio)}`, "#2ee59d");
    [784, 988, 1319].forEach((f, k) => nota({ f, t: k * 0.08, dur: 0.25, vol: 0.1, onda: "triangle" }));
    vibrar([40, 40, 80]);
    $("cartel").textContent = `Cobraste ${formatear(premio)}`;
    terminar(true);
}

function terminar(gano) {
    ronda.terminada = true;
    ronda.gano = gano;
    pintar();
}

function pintar() {
    pintarSaldo($("fichas"));
    const jugando = ronda && !ronda.terminada;
    const n = ronda?.carril ?? 0;
    const m = multiplicador(n);
    $("multi").textContent = `${m.toFixed(2)}×`;
    $("proximo").textContent = jugando && n < CARRILES ? `${multiplicador(n + 1).toFixed(2)}×` : "—";
    $("ganancia").textContent = jugando ? formatear(Math.floor(ronda.monto * m)) : ronda?.terminada ? (ronda.gano ? `+${formatear(Math.floor(ronda.monto * m))}` : "0") : "0";
    $("ganancia").className = ronda?.terminada ? (ronda.gano ? "gano-texto" : "pierde-texto") : "";
    for (const b of document.querySelectorAll("[data-d]")) {
        b.classList.toggle("activo", b.dataset.d === dificultad);
        b.disabled = Boolean(jugando);
    }
    $("cobrar").hidden = !jugando || !n;
    $("cobrar").textContent = `Cobrar ${formatear(Math.floor((ronda?.monto ?? 0) * m))}`;
    $("cobrar").disabled = moviendo;
    const boton = $("accion");
    boton.textContent = jugando ? "Avanzar" : ronda?.terminada ? "Jugar otra vez" : "Empezar";
    boton.classList.toggle("avanzar", Boolean(jugando));
    boton.disabled = jugando ? moviendo : fichas() < apuesta();
    apuesta.bloquear(Boolean(jugando));
    revisarRecarga();
}

$("accion").addEventListener("click", () => {
    if (ronda && !ronda.terminada) return avanzar();
    if (ronda?.terminada) {
        // Vuelve a la vereda antes de la próxima ronda
        for (const c of carriles) c.seguro = false;
        Object.assign(jugador, { carril: 0, visual: 0, caido: 0 });
        atropello = null;
    }
    empezar();
});
$("cobrar").addEventListener("click", cobrar);
for (const b of document.querySelectorAll("[data-d]")) {
    b.addEventListener("click", () => {
        if (ronda && !ronda.terminada) return;
        dificultad = b.dataset.d;
        pintar();
    });
}
pintar();
