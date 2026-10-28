// Minas: 25 baldosas con gemas y bombas. Cada gema sube el multiplicador; cobrá antes de pisar una bomba.
// Multiplicador justo = producto de (restantes / gemas restantes) por cada gema; la casa se queda con 3%.
import { formatear, textoFlotante, vibrar } from "../../js/comun3d.js";
import { fichas, cambiarFichas } from "../../js/fichas.js";
import { selectorApuesta, pintarSaldo, conectarRecarga } from "../../js/casino.js";

const $ = (id) => document.getElementById(id);
const TOTAL = 25;
const CASA = 0.97;
const GEMA = '<svg class="gema-svg" viewBox="0 0 100 100"><polygon points="50,8 88,36 72,88 28,88 12,36" fill="#4ef0b3"/><polygon points="50,8 88,36 50,46 12,36" fill="#b7ffe6"/><polygon points="12,36 50,46 28,88" fill="#2fbf8a"/><polygon points="88,36 72,88 50,46" fill="#14b885"/></svg>';

const BOMBA = '<svg class="bomba-svg" viewBox="0 0 100 100"><circle cx="46" cy="58" r="30" fill="#1b1b22"/><circle cx="36" cy="48" r="8" fill="#ffffff55"/><rect x="58" y="22" width="14" height="16" rx="3" transform="rotate(35 65 30)" fill="#555"/><path d="M70 22 q8 -12 18 -6" stroke="#ffb703" stroke-width="5" fill="none"/><circle cx="88" cy="16" r="6" fill="#ff7a1a"/></svg>';

const apuesta = selectorApuesta({ menos: $("menos"), mas: $("mas"), texto: $("apuesta") });
const revisarRecarga = conectarRecarga($("recargar"), () => pintar());

let minas = 3;
let ronda = null; // { bombas: Set, abiertas: Set, monto, terminada }

const baldosas = Array.from({ length: TOTAL }, (_, i) => {
    const b = document.createElement("button");
    b.className = "baldosa";
    b.innerHTML = '<span class="tapa"></span><span class="fondo-b"></span>';
    b.addEventListener("click", () => abrir(i));
    $("grilla").appendChild(b);
    return b;
});

function multiplicadorCon(abiertas) {
    let m = 1;
    for (let k = 0; k < abiertas; k++) m *= (TOTAL - k) / (TOTAL - minas - k);
    return m * CASA;
}

function empezar() {
    const valor = apuesta();
    if (fichas() < valor || (ronda && !ronda.terminada)) return;
    cambiarFichas(-valor);
    const bombas = new Set();
    while (bombas.size < minas) bombas.add(Math.floor(Math.random() * TOTAL));
    ronda = { bombas, abiertas: new Set(), monto: valor, terminada: false };
    for (const b of baldosas) {
        b.className = "baldosa";
        b.querySelector(".fondo-b").innerHTML = "";
    }
    apuesta.bloquear(true);
    vibrar(15);
    pintar();
}

function abrir(i) {
    if (!ronda || ronda.terminada || ronda.abiertas.has(i)) return;
    const b = baldosas[i];
    if (ronda.bombas.has(i)) {
        b.classList.add("abierta", "bomba");
        b.querySelector(".fondo-b").innerHTML = BOMBA;
        $("grilla").classList.remove("temblor");
        void $("grilla").offsetWidth;
        $("grilla").classList.add("temblor");
        vibrar([100, 50, 200]);
        terminar(false);
        return;
    }
    ronda.abiertas.add(i);
    b.classList.add("abierta", "gema");
    b.querySelector(".fondo-b").innerHTML = GEMA;
    vibrar(12 + ronda.abiertas.size * 2);
    const r = b.getBoundingClientRect();
    textoFlotante(r.left + r.width / 2, r.top, `${multiplicadorCon(ronda.abiertas.size).toFixed(2)}×`, "#4ef0b3");
    // Si abrió todas las gemas, cobra solo
    if (ronda.abiertas.size === TOTAL - minas) return cobrar();
    pintar();
}

function cobrar() {
    if (!ronda || ronda.terminada || !ronda.abiertas.size) return;
    const premio = Math.floor(ronda.monto * multiplicadorCon(ronda.abiertas.size));
    cambiarFichas(premio);
    const r = $("grilla").getBoundingClientRect();
    textoFlotante(r.left + r.width / 2, r.top + r.height / 2, `+${formatear(premio)}`, "#ffd166");
    vibrar([40, 40, 80]);
    terminar(true);
}

function terminar(gano) {
    ronda.terminada = true;
    ronda.gano = gano;
    // Muestra dónde estaba todo
    baldosas.forEach((b, i) => {
        if (b.classList.contains("abierta")) return;
        setTimeout(() => {
            b.classList.add("abierta", "revelada", ronda.bombas.has(i) ? "bomba" : "gema");
            b.querySelector(".fondo-b").innerHTML = ronda.bombas.has(i) ? BOMBA : GEMA;
        }, 250 + i * 25);
    });
    apuesta.bloquear(false);
    pintar();
}

function pintar() {
    pintarSaldo($("fichas"));
    const jugando = ronda && !ronda.terminada;
    $("grilla").classList.toggle("jugando", Boolean(jugando));
    const abiertas = ronda?.abiertas.size ?? 0;
    const m = abiertas ? multiplicadorCon(abiertas) : 1;
    $("multi").textContent = `${m.toFixed(2)}×`;
    $("proximo").textContent = jugando && abiertas < TOTAL - minas ? `${multiplicadorCon(abiertas + 1).toFixed(2)}×` : "—";
    $("ganancia").textContent = jugando ? formatear(Math.floor(ronda.monto * m)) : ronda?.terminada ? (ronda.gano ? `+${formatear(Math.floor(ronda.monto * m))}` : "💥 0") : "0";
    for (const b of baldosas) b.disabled = !jugando;
    for (const b of document.querySelectorAll("[data-minas]")) {
        b.classList.toggle("activa", Number(b.dataset.minas) === minas);
        b.disabled = Boolean(jugando);
    }
    const boton = $("accion");
    if (jugando && abiertas) {
        boton.className = "accion cobrar";
        boton.textContent = `💰 Cobrar ${formatear(Math.floor(ronda.monto * m))}`;
        boton.disabled = false;
    } else {
        boton.className = "accion";
        boton.textContent = jugando ? "Elegí una baldosa" : "💎 Empezar";
        boton.disabled = jugando || fichas() < apuesta();
    }
    revisarRecarga();
}

$("accion").addEventListener("click", () => (ronda && !ronda.terminada ? cobrar() : empezar()));
for (const b of document.querySelectorAll("[data-minas]")) {
    b.addEventListener("click", () => {
        if (ronda && !ronda.terminada) return;
        minas = Number(b.dataset.minas);
        pintar();
    });
}
pintar();
