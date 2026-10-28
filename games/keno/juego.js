// Keno: elegí hasta 10 números del 1 al 40; salen 10 bolillas y cobrás según cuántos acertaste.
import { formatear, textoFlotante, vibrar } from "../../js/comun3d.js";
import { fichas, cambiarFichas } from "../../js/fichas.js";
import { selectorApuesta, pintarSaldo, conectarRecarga } from "../../js/casino.js";
import { NUMEROS, SALEN, PAGOS } from "./tabla.js";

const $ = (id) => document.getElementById(id);
const MAX_ELEGIDOS = 10;

const apuesta = selectorApuesta({ menos: $("menos"), mas: $("mas"), texto: $("apuesta") });
const revisarRecarga = conectarRecarga($("recargar"), () => pintar());

const elegidos = new Set();
let salieron = [];
let sorteando = false;

const botones = Array.from({ length: NUMEROS }, (_, k) => {
    const n = k + 1;
    const b = document.createElement("button");
    b.className = "num";
    b.textContent = n;
    b.addEventListener("click", () => {
        if (sorteando) return;
        limpiarSorteo();
        if (elegidos.has(n)) elegidos.delete(n);
        else if (elegidos.size < MAX_ELEGIDOS) elegidos.add(n);
        else return vibrar(30);
        vibrar(8);
        pintar();
    });
    $("tablero").appendChild(b);
    return b;
});

function limpiarSorteo() {
    if (!salieron.length) return;
    salieron = [];
    $("bolillas").innerHTML = "";
    for (const b of botones) b.classList.remove("salio", "acierto");
}

async function jugar() {
    const valor = apuesta();
    if (sorteando || !elegidos.size || fichas() < valor) return;
    limpiarSorteo();
    cambiarFichas(-valor);
    sorteando = true;
    apuesta.bloquear(true);
    mensaje("Sorteando…");
    pintar();
    // Saca 10 números distintos, de a uno
    const bolsa = Array.from({ length: NUMEROS }, (_, k) => k + 1);
    for (let i = bolsa.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [bolsa[i], bolsa[j]] = [bolsa[j], bolsa[i]];
    }
    for (const n of bolsa.slice(0, SALEN)) {
        await new Promise((ok) => setTimeout(ok, 260));
        salieron.push(n);
        const acierto = elegidos.has(n);
        botones[n - 1].classList.add(acierto ? "acierto" : "salio");
        $("bolillas").insertAdjacentHTML("beforeend", `<span class="bolilla${acierto ? " acierto" : ""}">${n}</span>`);
        vibrar(acierto ? 25 : 6);
        pintarTabla();
    }
    const aciertos = salieron.filter((n) => elegidos.has(n)).length;
    const multi = PAGOS[elegidos.size][aciertos] ?? 0;
    const premio = Math.floor(valor * multi);
    cambiarFichas(premio);
    if (premio > 0) {
        mensaje(`${aciertos} aciertos · ×${multi} · +${formatear(premio)}`, "gano");
        const r = $("tablero").getBoundingClientRect();
        textoFlotante(r.left + r.width / 2, r.top + r.height / 2, `+${formatear(premio)}`, "#ffd166");
        vibrar(multi >= 10 ? [80, 40, 80, 40, 160] : 60);
    } else mensaje(`${aciertos} aciertos · esta vez no`);
    sorteando = false;
    apuesta.bloquear(false);
    pintar();
}

function mensaje(texto, tipo = "") {
    $("mensaje").textContent = texto;
    $("mensaje").className = `mensaje-k ${tipo}`;
}

function pintarTabla() {
    const fila = PAGOS[elegidos.size];
    if (!fila) {
        $("tabla").innerHTML = "";
        return;
    }
    const aciertos = salieron.filter((n) => elegidos.has(n)).length;
    $("tabla").innerHTML = fila
        .map((m, a) => (m > 0 ? `<span class="${salieron.length && a === aciertos ? "marcado" : ""}">${a} ✓ <b>×${m}</b></span>` : ""))
        .join("");
}

function pintar() {
    pintarSaldo($("fichas"));
    botones.forEach((b, k) => b.classList.toggle("elegido", elegidos.has(k + 1)));
    pintarTabla();
    $("jugar").disabled = sorteando || !elegidos.size || fichas() < apuesta();
    $("jugar").textContent = elegidos.size ? `Jugar (${elegidos.size})` : "Jugar";
    $("azar").disabled = $("limpiar").disabled = sorteando;
    if (!sorteando && !salieron.length) mensaje(elegidos.size ? `${elegidos.size} elegidos · tocá Jugar` : "Elegí de 1 a 10 números");
    revisarRecarga();
}

$("jugar").addEventListener("click", jugar);
$("limpiar").addEventListener("click", () => {
    if (sorteando) return;
    elegidos.clear();
    limpiarSorteo();
    pintar();
});
$("azar").addEventListener("click", () => {
    if (sorteando) return;
    limpiarSorteo();
    const cuantos = elegidos.size || 6;
    elegidos.clear();
    while (elegidos.size < cuantos) elegidos.add(1 + Math.floor(Math.random() * NUMEROS));
    vibrar(15);
    pintar();
});
pintar();
