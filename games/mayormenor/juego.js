// Mayor o menor: adiviná si la próxima carta es mayor/igual o menor/igual. Cada acierto multiplica
// según la probabilidad (con 3% para la casa). Se puede cobrar en cualquier momento o saltar la carta.
import { formatear, textoFlotante, vibrar } from "../../js/comun3d.js";
import { fichas, cambiarFichas } from "../../js/fichas.js";
import { selectorApuesta, pintarSaldo, conectarRecarga } from "../../js/casino.js";
import { htmlNaipe } from "../../js/naipes.js";

const $ = (id) => document.getElementById(id);
const CASA = 0.97;
const SALTOS = 3;

const apuesta = selectorApuesta({ menos: $("menos"), mas: $("mas"), texto: $("apuesta") });
const revisarRecarga = conectarRecarga($("recargar"), () => pintar());

// Mazo infinito: cada carta es independiente, así las probabilidades son exactas
const nuevaCarta = () => ({ v: 1 + Math.floor(Math.random() * 13), palo: Math.floor(Math.random() * 4) });
// Probabilidad de que la próxima sea >= o <= (As vale 1, K vale 13)
const probMayor = (v) => (14 - v) / 13;
const probMenor = (v) => v / 13;
const pago = (p) => Math.floor((CASA / p) * 100) / 100;

let ronda = null; // { carta, multi, aciertos, monto, saltos, recorrido, terminada }

function mostrarCarta(clase = "") {
    $("carta").className = `carta-actual ${clase}`;
    $("carta").innerHTML = htmlNaipe(ronda.carta, 120);
}

function empezar() {
    const valor = apuesta();
    if (fichas() < valor) return;
    cambiarFichas(-valor);
    ronda = { carta: nuevaCarta(), multi: 1, aciertos: 0, monto: valor, saltos: SALTOS, recorrido: [], terminada: false };
    apuesta.bloquear(true);
    mostrarCarta();
    mensaje("¿La próxima será mayor o menor?");
    vibrar(15);
    pintar();
}

function elegir(mayor) {
    if (!ronda || ronda.terminada) return;
    const actual = ronda.carta;
    const siguiente = nuevaCarta();
    const p = mayor ? probMayor(actual.v) : probMenor(actual.v);
    const acierto = mayor ? siguiente.v >= actual.v : siguiente.v <= actual.v;
    ronda.recorrido.push(actual);
    ronda.carta = siguiente;
    if (acierto) {
        ronda.multi *= pago(p);
        ronda.aciertos++;
        mostrarCarta("acierto");
        mensaje(`¡Bien! ${ronda.multi.toFixed(2)}×`, "gano");
        const r = $("carta").getBoundingClientRect();
        textoFlotante(r.left + r.width / 2, r.top, `×${pago(p).toFixed(2)}`, "#7ee08f");
        vibrar(20 + ronda.aciertos * 4);
    } else {
        mostrarCarta("error");
        mensaje("Perdiste la apuesta", "perdio");
        vibrar([80, 40, 150]);
        terminar();
    }
    pintar();
}

function saltar() {
    if (!ronda || ronda.terminada || ronda.saltos <= 0) return;
    ronda.saltos--;
    ronda.recorrido.push(ronda.carta);
    ronda.carta = nuevaCarta();
    mostrarCarta();
    vibrar(10);
    pintar();
}

function cobrar() {
    if (!ronda || ronda.terminada || !ronda.aciertos) return;
    const premio = Math.floor(ronda.monto * ronda.multi);
    cambiarFichas(premio);
    mensaje(`¡Cobraste ${formatear(premio)}!`, "gano");
    const r = $("carta").getBoundingClientRect();
    textoFlotante(r.left + r.width / 2, r.top + r.height / 2, `+${formatear(premio)}`, "#ffd166");
    vibrar([40, 40, 80]);
    terminar();
    pintar();
}

function terminar() {
    ronda.terminada = true;
    apuesta.bloquear(false);
}

function mensaje(texto, tipo = "") {
    $("mensaje").textContent = texto;
    $("mensaje").className = `mensaje-casino ${tipo}`;
}

function pintar() {
    pintarSaldo($("fichas"));
    const jugando = ronda && !ronda.terminada;
    $("zona-eleccion").hidden = !jugando;
    $("zona-apuesta").hidden = Boolean(jugando);
    $("multi").textContent = `${(ronda?.multi ?? 1).toFixed(2)}×`;
    $("racha").textContent = ronda?.aciertos ?? 0;
    $("cobro").textContent = jugando && ronda.aciertos ? formatear(Math.floor(ronda.monto * ronda.multi)) : "—";
    if (jugando) {
        const v = ronda.carta.v;
        $("paga-mayor").textContent = v === 1 ? "seguro · ×0.97" : `paga ×${pago(probMayor(v)).toFixed(2)}`;
        $("paga-menor").textContent = v === 13 ? "seguro · ×0.97" : `paga ×${pago(probMenor(v)).toFixed(2)}`;
        $("saltos").textContent = `quedan ${ronda.saltos}`;
        $("saltar").disabled = ronda.saltos <= 0;
    }
    $("recorrido").innerHTML = (ronda?.recorrido ?? []).slice(-10).map((c) => htmlNaipe(c, 34)).join("");
    const boton = $("accion");
    if (jugando) {
        boton.textContent = ronda.aciertos ? `💰 Cobrar ${formatear(Math.floor(ronda.monto * ronda.multi))}` : "Elegí mayor o menor";
        boton.disabled = !ronda.aciertos;
    } else {
        boton.textContent = ronda ? "🃏 Otra ronda" : "🃏 Empezar";
        boton.disabled = fichas() < apuesta();
    }
    revisarRecarga();
}

$("accion").addEventListener("click", () => (ronda && !ronda.terminada ? cobrar() : empezar()));
$("mayor").addEventListener("click", () => elegir(true));
$("menor").addEventListener("click", () => elegir(false));
$("saltar").addEventListener("click", saltar);
document.querySelector(".mazo").innerHTML = htmlNaipe(null, 80, true);
$("carta").innerHTML = htmlNaipe(null, 120, true);
pintar();
