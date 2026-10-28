// Blackjack contra la banca. 6 mazos, la banca se planta en 17, blackjack paga 3 a 2.
// Se puede doblar, dividir pares en dos manos y tomar seguro cuando la banca muestra un As.
import { formatear, cargar, guardar, textoFlotante, vibrar, MONEDA } from "../../js/comun3d.js";
import { fichas, cambiarFichas, recargar, puedeRecargar, LIMITE_APUESTA } from "../../js/fichas.js";

const $ = (id) => document.getElementById(id);
const CLAVE = "blackjack";
const MAZOS = 6;
const PAUSA = 420;

const PALOS = ["♠", "♥", "♦", "♣"];
const VALORES = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
const COLOR_FICHA = [[500, "#212121"], [100, "#1e88e5"], [50, "#e53935"], [10, "#e8e8e8"]];

const estado = cargar(CLAVE, { fichas: 1000, jugadas: 0, ganadas: 0, racha: 0, mejorRacha: 0 });

let zapato = [];
// manos: [{ cartas, apuesta, doblada, terminada, el }]
let ronda = { apuesta: 0, manos: [], activa: 0, banca: [], fase: "apostando", seguro: 0 };

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

const valorCarta = (c) => (c.valor === "A" ? 11 : ["J", "Q", "K"].includes(c.valor) ? 10 : Number(c.valor));

function puntos(cartas) {
    let total = 0;
    let ases = 0;
    for (const c of cartas) {
        if (c.oculta) continue;
        total += valorCarta(c);
        if (c.valor === "A") ases++;
    }
    while (total > 21 && ases > 0) {
        total -= 10;
        ases--;
    }
    return total;
}

const esBlackjack = (cartas) => cartas.length === 2 && puntos(cartas.map((c) => ({ ...c, oculta: false }))) === 21;
const manoActual = () => ronda.manos[ronda.activa];

// ---------- Dibujo ----------
function elementoCarta(c, contenedor) {
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
    // La carta sale desde el zapato
    const zap = $("zapato").getBoundingClientRect();
    const dest = contenedor.getBoundingClientRect();
    el.style.setProperty("--dx", `${zap.left - dest.right + 20}px`);
    el.style.setProperty("--dy", `${zap.top - dest.top}px`);
    c.el = el;
    return el;
}

function pintarTotal(el, cartas) {
    el.hidden = cartas.length === 0;
    const p = puntos(cartas);
    el.textContent = p;
    el.classList.toggle("pasado", p > 21);
    el.classList.toggle("veintiuno", p === 21);
}

function armarManos() {
    $("manos").innerHTML = "";
    $("manos").classList.toggle("doble", ronda.manos.length > 1);
    ronda.manos.forEach((m, i) => {
        const el = document.createElement("div");
        el.className = "mano";
        el.innerHTML = `<div class="cartas"></div><div class="info-mano"><span class="total" hidden></span><span class="apuesta-mano"></span></div>`;
        $("manos").appendChild(el);
        m.el = el;
        for (const c of m.cartas) el.querySelector(".cartas").appendChild(elementoCarta(c, el.querySelector(".cartas")));
        void i;
    });
}

function pintarManos() {
    ronda.manos.forEach((m, i) => {
        pintarTotal(m.el.querySelector(".total"), m.cartas);
        m.el.querySelector(".apuesta-mano").innerHTML = ronda.manos.length > 1 ? `${MONEDA}${formatear(m.apuesta)}` : "";
        m.el.classList.toggle("activa", ronda.manos.length > 1 && i === ronda.activa && ronda.fase === "jugando");
        m.el.classList.toggle("terminada", m.terminada);
    });
    pintarTotal($("total-banca"), ronda.banca);
}

function pintarPila(total) {
    const pila = $("pila");
    pila.className = "pila-fichas";
    let resto = total;
    let html = "";
    let k = 0;
    for (const [valor, color] of COLOR_FICHA) {
        while (resto >= valor && k < 12) {
            html += `<span style="--c:${color};bottom:${k * 3}px"></span>`;
            resto -= valor;
            k++;
        }
    }
    pila.innerHTML = html;
}

async function repartirA(mano, contenedor, oculta = false) {
    const c = { ...sacar(), oculta };
    mano.push(c);
    contenedor.appendChild(elementoCarta(c, contenedor));
    vibrar(8);
    pintarManos();
    await espera(PAUSA);
    return c;
}

function mensaje(texto, tipo = "") {
    const m = $("mensaje");
    m.textContent = texto;
    m.className = `mensaje-mesa ${tipo}${texto.length > 26 ? " largo" : ""}`;
}

function actualizar() {
    $("fichas").innerHTML = `${MONEDA}${formatear(fichas())}`;
    $("apuesta").textContent = formatear(ronda.apuesta);
    const apostando = ronda.fase === "apostando";
    $("zona-apuesta").hidden = !apostando;
    $("zona-juego").hidden = ronda.fase !== "jugando";
    $("zona-seguro").hidden = ronda.fase !== "seguro";
    for (const f of document.querySelectorAll(".ficha")) f.disabled = Number(f.dataset.valor) > fichas() - ronda.apuesta;
    $("repartir").disabled = ronda.apuesta === 0;
    $("borrar").disabled = ronda.apuesta === 0;
    $("recargar").hidden = !puedeRecargar();
    const m = manoActual();
    $("doblar").disabled = !m || m.cartas.length !== 2 || fichas() < m.apuesta;
    // Se puede dividir un par (mismo valor) una sola vez
    const par = m && ronda.manos.length === 1 && m.cartas.length === 2 && valorCarta(m.cartas[0]) === valorCarta(m.cartas[1]);
    $("dividir").hidden = !par;
    $("dividir").disabled = !par || fichas() < m.apuesta;
    if (apostando) pintarPila(ronda.apuesta);
    const porcentaje = estado.jugadas ? Math.round((estado.ganadas / estado.jugadas) * 100) : 0;
    $("estadisticas").textContent = `Manos: ${estado.jugadas} · Ganadas: ${porcentaje}% · Racha: ${estado.racha} · Mejor: ${estado.mejorRacha}`;
}

// ---------- Ronda ----------
async function repartir() {
    if (!ronda.apuesta || ronda.fase !== "apostando") return;
    cambiarFichas(-ronda.apuesta);
    ronda.base = ronda.apuesta;
    ronda.fase = "repartiendo";
    ronda.manos = [{ cartas: [], apuesta: ronda.apuesta, terminada: false }];
    ronda.activa = 0;
    ronda.banca = [];
    ronda.seguro = 0;
    armarManos();
    $("cartas-banca").innerHTML = "";
    mensaje("");
    actualizar();

    const cont = ronda.manos[0].el.querySelector(".cartas");
    await repartirA(ronda.manos[0].cartas, cont);
    await repartirA(ronda.banca, $("cartas-banca"));
    await repartirA(ronda.manos[0].cartas, cont);
    await repartirA(ronda.banca, $("cartas-banca"), true);

    // Seguro: la banca muestra un As
    if (ronda.banca[0].valor === "A" && !esBlackjack(ronda.manos[0].cartas) && fichas() >= Math.ceil(ronda.apuesta / 2)) {
        ronda.fase = "seguro";
        $("costo-seguro").textContent = formatear(Math.ceil(ronda.apuesta / 2));
        mensaje("¿Seguro?");
        actualizar();
        return;
    }
    seguirDespuesDeSeguro();
}

function seguirDespuesDeSeguro() {
    if (esBlackjack(ronda.banca) || esBlackjack(ronda.manos[0].cartas)) return turnoBanca(true);
    if (ronda.seguro) mensaje("La banca no tiene blackjack: perdiste el seguro");
    ronda.fase = "jugando";
    pintarManos();
    actualizar();
}

async function pedir() {
    if (ronda.fase !== "jugando") return;
    const m = manoActual();
    ronda.fase = "repartiendo";
    actualizar();
    await repartirA(m.cartas, m.el.querySelector(".cartas"));
    const p = puntos(m.cartas);
    if (p >= 21) return terminarMano();
    ronda.fase = "jugando";
    pintarManos();
    actualizar();
}

async function doblar() {
    const m = manoActual();
    if (ronda.fase !== "jugando" || m.cartas.length !== 2 || fichas() < m.apuesta) return;
    cambiarFichas(-m.apuesta);
    m.apuesta *= 2;
    m.doblada = true;
    pintarPila(ronda.manos.reduce((t, x) => t + x.apuesta, 0));
    ronda.fase = "repartiendo";
    actualizar();
    await repartirA(m.cartas, m.el.querySelector(".cartas"));
    terminarMano();
}

async function dividir() {
    const m = manoActual();
    if (ronda.fase !== "jugando" || ronda.manos.length !== 1 || fichas() < m.apuesta) return;
    cambiarFichas(-m.apuesta);
    const segunda = { cartas: [m.cartas.pop()], apuesta: m.apuesta, terminada: false };
    ronda.manos.push(segunda);
    pintarPila(m.apuesta * 2);
    armarManos();
    ronda.fase = "repartiendo";
    actualizar();
    vibrar(20);
    await repartirA(m.cartas, m.el.querySelector(".cartas"));
    await repartirA(segunda.cartas, segunda.el.querySelector(".cartas"));
    // Ases divididos reciben una sola carta
    if (m.cartas[0].valor === "A") {
        m.terminada = segunda.terminada = true;
        return turnoBanca();
    }
    if (puntos(m.cartas) === 21) return terminarMano();
    ronda.fase = "jugando";
    pintarManos();
    actualizar();
}

function terminarMano() {
    manoActual().terminada = true;
    if (ronda.activa < ronda.manos.length - 1) {
        ronda.activa++;
        ronda.fase = "jugando";
        pintarManos();
        actualizar();
        if (puntos(manoActual().cartas) === 21) terminarMano();
        return;
    }
    // Si todas las manos se pasaron, la banca no necesita jugar
    if (ronda.manos.every((x) => puntos(x.cartas) > 21)) return resolver();
    turnoBanca();
}

async function turnoBanca(soloDestapar = false) {
    ronda.fase = "banca";
    pintarManos();
    actualizar();
    const oculta = ronda.banca.find((c) => c.oculta);
    if (oculta) {
        oculta.oculta = false;
        oculta.el.classList.remove("oculta");
        pintarManos();
        await espera(PAUSA + 150);
    }
    if (!soloDestapar) {
        while (puntos(ronda.banca) < 17) await repartirA(ronda.banca, $("cartas-banca"));
    }
    resolver();
}

function resolver() {
    const banca = puntos(ronda.banca.map((c) => ({ ...c, oculta: false })));
    const bjBanca = esBlackjack(ronda.banca);
    for (const c of ronda.banca) {
        if (c.oculta) {
            c.oculta = false;
            c.el.classList.remove("oculta");
        }
    }

    let pagoTotal = 0;
    let apostadoTotal = 0;
    const resultados = ronda.manos.map((m) => {
        const jugador = puntos(m.cartas);
        // Un blackjack después de dividir cuenta como 21 común
        const bj = ronda.manos.length === 1 && esBlackjack(m.cartas);
        apostadoTotal += m.apuesta;
        let pago = 0;
        let r;
        if (jugador > 21) r = "Te pasaste";
        else if (bj && !bjBanca) {
            pago = m.apuesta * 2.5;
            r = "¡Blackjack!";
        } else if (bjBanca && !bj) r = "Blackjack de la banca";
        else if (banca > 21) {
            pago = m.apuesta * 2;
            r = "¡La banca se pasó!";
        } else if (jugador > banca) {
            pago = m.apuesta * 2;
            r = "¡Ganaste!";
        } else if (jugador === banca) {
            pago = m.apuesta;
            r = "Empate";
        } else r = "Perdiste";
        pagoTotal += pago;
        return { r, gano: pago > m.apuesta, perdio: pago === 0 };
    });

    // Seguro: paga 2 a 1 si la banca tenía blackjack
    let textoSeguro = "";
    if (ronda.seguro) {
        if (bjBanca) {
            pagoTotal += ronda.seguro * 3;
            textoSeguro = " · el seguro pagó";
        }
        apostadoTotal += ronda.seguro;
    }
    pintarManos();
    cambiarFichas(pagoTotal);

    const neto = pagoTotal - apostadoTotal;
    const texto = (resultados.length > 1 ? resultados.map((x, i) => `Mano ${i + 1}: ${x.r}`).join(" · ") : resultados[0].r) + textoSeguro;
    const tipo = neto > 0 ? "gano" : neto < 0 ? "perdio" : "";
    estado.jugadas++;
    if (neto > 0) {
        estado.ganadas++;
        estado.racha++;
        estado.mejorRacha = Math.max(estado.mejorRacha, estado.racha);
        const caja = $("manos").getBoundingClientRect();
        textoFlotante(caja.left + caja.width / 2, caja.top, `+${formatear(neto)}`, "#ffd166");
        vibrar(esBlackjack(ronda.manos[0].cartas) ? [50, 40, 100] : 50);
        $("pila").classList.add("cobrar");
    } else if (neto < 0) {
        estado.racha = 0;
        vibrar(120);
        $("pila").classList.add("perder");
    }
    mensaje(texto, tipo);
    guardar(CLAVE, estado);

    // La próxima mano arranca con la misma apuesta inicial si alcanza
    ronda.fase = "apostando";
    ronda.apuesta = ronda.base <= fichas() ? ronda.base : 0;
    setTimeout(() => ronda.fase === "apostando" && pintarPila(ronda.apuesta), 700);
    actualizar();
    $("pila").className = `pila-fichas ${neto > 0 ? "cobrar" : neto < 0 ? "perder" : ""}`;
}

// ---------- Botones ----------
for (const f of document.querySelectorAll(".ficha")) {
    f.addEventListener("click", () => {
        const valor = Number(f.dataset.valor);
        if (ronda.fase !== "apostando" || valor > fichas() - ronda.apuesta) return;
        if (ronda.apuesta + valor > LIMITE_APUESTA) return mensaje("Límite: 10M por mano");
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
$("plantarse").addEventListener("click", () => ronda.fase === "jugando" && terminarMano());
$("doblar").addEventListener("click", doblar);
$("dividir").addEventListener("click", dividir);
$("con-seguro").addEventListener("click", () => {
    if (ronda.fase !== "seguro") return;
    ronda.seguro = Math.ceil(ronda.apuesta / 2);
    cambiarFichas(-ronda.seguro);
    seguirDespuesDeSeguro();
});
$("sin-seguro").addEventListener("click", () => ronda.fase === "seguro" && seguirDespuesDeSeguro());
$("recargar").addEventListener("click", () => {
    recargar();
    guardar(CLAVE, estado);
    mensaje("¡Fichas recargadas!", "gano");
    actualizar();
});

nuevoZapato();
actualizar();
addEventListener("fichas", actualizar);
