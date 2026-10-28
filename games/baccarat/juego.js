// Baccarat (punto y banca) con 6 mazos y las reglas oficiales de la tercera carta.
// Jugador paga 1 a 1, Banca 0.95 a 1 (5% de comisión), Empate 8 a 1; si hay empate, Jugador y Banca se devuelven.
import { formatear, textoFlotante, vibrar } from "../../js/comun3d.js";
import { fichas, cambiarFichas } from "../../js/fichas.js";
import { selectorApuesta, pintarSaldo, conectarRecarga } from "../../js/casino.js";
import { mazoMezclado, htmlNaipe } from "../../js/naipes.js";

const $ = (id) => document.getElementById(id);
const PAUSA = 550;
const PAGO = { jugador: 2, banca: 1.95, empate: 9 };
const NOMBRE = { jugador: "Jugador", banca: "Banca", empate: "Empate" };

const apuesta = selectorApuesta({ menos: $("menos"), mas: $("mas"), texto: $("apuesta") });
const revisarRecarga = conectarRecarga($("recargar"), () => pintar());

let zapato = mazoMezclado(6);
let lado = "jugador";
let jugando = false;
const historial = [];

const espera = (ms) => new Promise((ok) => setTimeout(ok, ms));
const valor = (c) => (c.v >= 10 ? 0 : c.v);
const puntos = (mano) => mano.reduce((t, c) => t + valor(c), 0) % 10;
function sacar() {
    if (zapato.length < 52) zapato = mazoMezclado(6);
    return zapato.pop();
}

async function dar(mano, id, tercera = false) {
    const c = sacar();
    mano.push(c);
    $(`cartas-${id}`).insertAdjacentHTML("beforeend", htmlNaipe(c, 78).replace('class="naipe', `class="naipe${tercera ? " tercera" : ""}`));
    $(`puntos-${id}`).textContent = puntos(mano);
    vibrar(8);
    await espera(PAUSA);
    return c;
}

// Regla de la banca cuando el jugador sacó tercera carta
function bancaPide(b, tercera) {
    if (b <= 2) return true;
    if (b === 3) return tercera !== 8;
    if (b === 4) return tercera >= 2 && tercera <= 7;
    if (b === 5) return tercera >= 4 && tercera <= 7;
    if (b === 6) return tercera === 6 || tercera === 7;
    return false;
}

async function repartir() {
    const monto = apuesta();
    if (jugando || fichas() < monto) return;
    jugando = true;
    cambiarFichas(-monto);
    apuesta.bloquear(true);
    $("cartas-jugador").innerHTML = "";
    $("cartas-banca").innerHTML = "";
    $("mano-jugador").classList.remove("gana");
    $("mano-banca").classList.remove("gana");
    mensaje("…");
    pintar();
    const jugador = [];
    const banca = [];
    await dar(jugador, "jugador");
    await dar(banca, "banca");
    await dar(jugador, "jugador");
    await dar(banca, "banca");
    const natural = puntos(jugador) >= 8 || puntos(banca) >= 8;
    if (!natural) {
        let tercera = null;
        if (puntos(jugador) <= 5) tercera = valor(await dar(jugador, "jugador", true));
        if (tercera === null ? puntos(banca) <= 5 : bancaPide(puntos(banca), tercera)) await dar(banca, "banca", true);
    }
    const pj = puntos(jugador);
    const pb = puntos(banca);
    const resultado = pj > pb ? "jugador" : pb > pj ? "banca" : "empate";
    historial.push(resultado);
    if (historial.length > 60) historial.shift();
    if (resultado !== "empate") $(`mano-${resultado}`).classList.add("gana");

    let pago = 0;
    if (lado === resultado) pago = Math.floor(monto * PAGO[lado]);
    else if (resultado === "empate") pago = monto; // Jugador o Banca se devuelven en empate
    cambiarFichas(pago);
    const titulo = `${natural ? "¡Natural! " : ""}${NOMBRE[resultado]} ${resultado === "empate" ? `${pj} a ${pb}` : `gana ${Math.max(pj, pb)} a ${Math.min(pj, pb)}`}`;
    if (pago > monto) {
        mensaje(`${titulo} · +${formatear(pago)}`, "gano");
        const r = $("mensaje").getBoundingClientRect();
        textoFlotante(r.left + r.width / 2, r.top, `+${formatear(pago)}`, "#ffd166");
        vibrar(lado === "empate" ? [80, 40, 160] : 60);
    } else if (pago === monto) mensaje(`${titulo} · se devuelve la apuesta`);
    else {
        mensaje(titulo, "perdio");
        vibrar(90);
    }
    jugando = false;
    apuesta.bloquear(false);
    pintar();
}

function mensaje(texto, tipo = "") {
    $("mensaje").textContent = texto;
    $("mensaje").className = `mensaje-casino ${tipo}`;
}

function pintar() {
    pintarSaldo($("fichas"));
    for (const b of document.querySelectorAll(".lado-b")) {
        b.classList.toggle("elegido", b.dataset.lado === lado);
        b.disabled = jugando;
    }
    $("repartir").disabled = jugando || fichas() < apuesta();
    // Camino de cuentas: una bolita por mano, de arriba abajo y de izquierda a derecha
    $("camino").innerHTML = historial.map((r) => `<span class="${r === "jugador" ? "J" : r === "banca" ? "B" : "E"}">${r === "jugador" ? "J" : r === "banca" ? "B" : "E"}</span>`).join("");
    $("camino").scrollLeft = $("camino").scrollWidth;
    revisarRecarga();
}

for (const b of document.querySelectorAll(".lado-b")) {
    b.addEventListener("click", () => {
        if (jugando) return;
        lado = b.dataset.lado;
        vibrar(8);
        pintar();
    });
}
$("repartir").addEventListener("click", repartir);
pintar();
