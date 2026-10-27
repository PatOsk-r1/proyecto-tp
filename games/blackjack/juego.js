// Blackjack contra la banca. 6 mazos, la banca se planta en 17, blackjack paga 3 a 2.
import { formatear, cargar, guardar, textoFlotante, vibrar, MONEDA } from "../../js/comun3d.js";
import { fichas, cambiarFichas, recargar, RECARGA } from "../../js/fichas.js";

const $ = (id) => document.getElementById(id);
const CLAVE = "blackjack";
const MAZOS = 6;
const PAUSA = 450;

const PALOS = ["♠", "♥", "♦", "♣"];
const VALORES = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

const estado = cargar(CLAVE, { fichas: 1000, jugadas: 0, ganadas: 0, racha: 0, mejorRacha: 0 });

let zapato = [];
let ronda = { apuesta: 0, jugador: [], banca: [], fase: "apostando" };

const espera = (ms) => new Promise((r) => setTimeout(r, ms));

function nuevoZapato() {
    zapato = [];
    for (let m = 0; m < MAZOS; m++) for (const palo of PALOS) for (const valor of VALORES) zapato.push({ palo, valor });
    for (let i = zapato.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [zapato[i], zapato[j]] = [zapato[j], zapato[i]];
    }
}

function sacar() {
    if (zapato.length < MAZOS * 52 * 0.25) nuevoZapato();
    return zapato.pop();
}

function puntos(cartas) {
    let total = 0;
    let ases = 0;
    for (const c of cartas) {
        if (c.oculta) continue;
        if (c.valor === "A") {
            total += 11;
            ases++;
        } else {
            total += ["J", "Q", "K"].includes(c.valor) ? 10 : Number(c.valor);
        }
    }
    while (total > 21 && ases > 0) {
        total -= 10;
        ases--;
    }
    return total;
}

const esBlackjack = (cartas) => cartas.length === 2 && puntos(cartas.map((c) => ({ ...c, oculta: false }))) === 21;

// ---------- Dibujo ----------
function elementoCarta(c) {
    const roja = c.palo === "♥" || c.palo === "♦";
    const el = document.createElement("div");
    el.className = `carta${c.oculta ? " oculta" : ""}`;
    el.innerHTML = `
        <div class="cara${roja ? " roja" : ""}">
            <div class="esquina">${c.valor}<br>${c.palo}</div>
            <div class="palo">${c.palo}</div>
            <div class="esquina abajo">${c.valor}<br>${c.palo}</div>
        </div>
        <div class="dorso"></div>`;
    c.el = el;
    return el;
}

function pintarTotal(id, cartas, mostrar) {
    const t = $(id);
    t.hidden = !mostrar || cartas.length === 0;
    const p = puntos(cartas);
    t.textContent = p;
    t.classList.toggle("pasado", p > 21);
}

function pintarTotales() {
    pintarTotal("total-jugador", ronda.jugador, true);
    pintarTotal("total-banca", ronda.banca, true);
}

async function repartirA(mano, contenedor, oculta = false) {
    const c = { ...sacar(), oculta };
    mano.push(c);
    $(contenedor).appendChild(elementoCarta(c));
    vibrar(8);
    pintarTotales();
    await espera(PAUSA);
    return c;
}

function mensaje(texto, tipo = "") {
    const m = $("mensaje");
    m.textContent = texto;
    m.className = `mensaje-mesa ${tipo}`;
}

function actualizar() {
    $("fichas").innerHTML = `${MONEDA}${formatear(fichas())}`;
    $("apuesta").textContent = formatear(ronda.apuesta);
    const apostando = ronda.fase === "apostando";
    $("zona-apuesta").hidden = !apostando;
    $("zona-juego").hidden = ronda.fase !== "jugando";
    for (const f of document.querySelectorAll(".ficha")) f.disabled = Number(f.dataset.valor) > fichas() - ronda.apuesta;
    $("repartir").disabled = ronda.apuesta === 0;
    $("borrar").disabled = ronda.apuesta === 0;
    const sinFichas = fichas() + ronda.apuesta < 10;
    $("recargar").hidden = !sinFichas;
    $("doblar").disabled = ronda.jugador.length !== 2 || fichas() < ronda.apuesta;
    const porcentaje = estado.jugadas ? Math.round((estado.ganadas / estado.jugadas) * 100) : 0;
    $("estadisticas").textContent = `Manos: ${estado.jugadas} · Ganadas: ${porcentaje}% · Mejor racha: ${estado.mejorRacha}`;
}

// ---------- Ronda ----------
async function repartir() {
    if (!ronda.apuesta || ronda.fase !== "apostando") return;
    cambiarFichas(-ronda.apuesta);
    ronda.base = ronda.apuesta;
    ronda.fase = "repartiendo";
    ronda.jugador = [];
    ronda.banca = [];
    $("cartas-jugador").innerHTML = "";
    $("cartas-banca").innerHTML = "";
    mensaje("");
    actualizar();

    await repartirA(ronda.jugador, "cartas-jugador");
    await repartirA(ronda.banca, "cartas-banca");
    await repartirA(ronda.jugador, "cartas-jugador");
    await repartirA(ronda.banca, "cartas-banca", true);

    // La banca mira si tiene blackjack
    if (esBlackjack(ronda.banca) || esBlackjack(ronda.jugador)) return turnoBanca(true);

    ronda.fase = "jugando";
    actualizar();
}

async function pedir() {
    if (ronda.fase !== "jugando") return;
    ronda.fase = "repartiendo";
    actualizar();
    await repartirA(ronda.jugador, "cartas-jugador");
    const p = puntos(ronda.jugador);
    if (p > 21) return resolver();
    if (p === 21) return turnoBanca();
    ronda.fase = "jugando";
    actualizar();
}

async function doblar() {
    if (ronda.fase !== "jugando" || ronda.jugador.length !== 2 || fichas() < ronda.apuesta) return;
    cambiarFichas(-ronda.apuesta);
    ronda.apuesta *= 2;
    ronda.fase = "repartiendo";
    actualizar();
    await repartirA(ronda.jugador, "cartas-jugador");
    if (puntos(ronda.jugador) > 21) return resolver();
    turnoBanca();
}

async function turnoBanca(soloDestapar = false) {
    ronda.fase = "banca";
    actualizar();
    const oculta = ronda.banca.find((c) => c.oculta);
    if (oculta) {
        oculta.oculta = false;
        oculta.el.classList.remove("oculta");
        pintarTotales();
        await espera(PAUSA + 150);
    }
    if (!soloDestapar) {
        while (puntos(ronda.banca) < 17) await repartirA(ronda.banca, "cartas-banca");
    }
    resolver();
}

function resolver() {
    const jugador = puntos(ronda.jugador);
    const banca = puntos(ronda.banca.map((c) => ({ ...c, oculta: false })));
    const bjJugador = esBlackjack(ronda.jugador);
    const bjBanca = esBlackjack(ronda.banca);

    let pago = 0;
    let texto;
    let tipo;
    if (jugador > 21) {
        texto = "Te pasaste";
        tipo = "perdio";
    } else if (bjJugador && !bjBanca) {
        pago = ronda.apuesta * 2.5;
        texto = "¡Blackjack!";
        tipo = "gano";
    } else if (bjBanca && !bjJugador) {
        texto = "Blackjack de la banca";
        tipo = "perdio";
    } else if (banca > 21) {
        pago = ronda.apuesta * 2;
        texto = "¡La banca se pasó!";
        tipo = "gano";
    } else if (jugador > banca) {
        pago = ronda.apuesta * 2;
        texto = "¡Ganaste!";
        tipo = "gano";
    } else if (jugador === banca) {
        pago = ronda.apuesta;
        texto = "Empate";
    } else {
        texto = "Perdiste";
        tipo = "perdio";
    }

    // Si la carta oculta seguía tapada (te pasaste), se muestra igual
    for (const c of ronda.banca) {
        if (c.oculta) {
            c.oculta = false;
            c.el.classList.remove("oculta");
        }
    }
    pintarTotales();

    cambiarFichas(pago);
    estado.jugadas++;
    if (tipo === "gano") {
        estado.ganadas++;
        estado.racha++;
        estado.mejorRacha = Math.max(estado.mejorRacha, estado.racha);
        const caja = $("cartas-jugador").getBoundingClientRect();
        textoFlotante(caja.left + caja.width / 2, caja.top, `+${formatear(pago - ronda.apuesta)}`, "#ffd166");
        vibrar(50);
    } else if (tipo === "perdio") {
        estado.racha = 0;
        vibrar(120);
    }
    mensaje(texto, tipo);
    guardar(CLAVE, estado);

    // La próxima mano arranca con la misma apuesta inicial (sin el doble) si alcanza
    ronda.fase = "apostando";
    ronda.apuesta = ronda.base <= fichas() ? ronda.base : 0;
    actualizar();
}

// ---------- Botones ----------
for (const f of document.querySelectorAll(".ficha")) {
    f.addEventListener("click", () => {
        const valor = Number(f.dataset.valor);
        if (ronda.fase !== "apostando" || valor > fichas() - ronda.apuesta) return;
        ronda.apuesta += valor;
        vibrar(10);
        mensaje(`Apuesta: ${formatear(ronda.apuesta)}`);
        actualizar();
    });
}

$("borrar").addEventListener("click", () => {
    ronda.apuesta = 0;
    mensaje("Elegí tu apuesta");
    actualizar();
});
$("repartir").addEventListener("click", repartir);
$("pedir").addEventListener("click", pedir);
$("plantarse").addEventListener("click", () => ronda.fase === "jugando" && turnoBanca());
$("doblar").addEventListener("click", doblar);
$("recargar").addEventListener("click", () => {
    recargar();
    guardar(CLAVE, estado);
    mensaje("¡Fichas recargadas!", "gano");
    actualizar();
});

nuevoZapato();
actualizar();
