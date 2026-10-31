// Dado: sale un número de 0.00 a 99.99. Elegís con la barra si tiene que salir más o menos que un objetivo.
// Cuanto menos chance, más paga: paga = 99 / chance (la casa se queda con 1%).
import { formatear, textoFlotante, vibrar } from "../../js/comun3d.js";
import { fichas, cambiarFichas } from "../../js/fichas.js";
import { selectorApuesta, pintarSaldo, conectarRecarga } from "../../js/casino.js";
import { nota, golpe } from "../../js/sonido.js";

const $ = (id) => document.getElementById(id);
const DEVOLUCION = 99;
const MIN = 2;
const MAX = 98;

let objetivo = 50;
let modo = "mas";
let tirando = false;
let auto = false;
const historial = [];

const apuesta = selectorApuesta({ menos: $("menos"), mas: $("mas"), texto: $("apuesta"), alCambiar: () => pintar() });
const revisarRecarga = conectarRecarga($("recargar"), () => pintar());

const chance = () => (modo === "mas" ? 100 - objetivo : objetivo);
const paga = () => Math.floor((DEVOLUCION / chance()) * 10000) / 10000;

// ---------- Barra ----------
function moverDesde(e) {
    if (tirando) return;
    const r = $("pista").getBoundingClientRect();
    const v = Math.round(((e.clientX - r.left) / r.width) * 100);
    const nuevo = Math.min(MAX, Math.max(MIN, v));
    if (nuevo !== objetivo) {
        objetivo = nuevo;
        nota({ f: 500 + objetivo * 6, dur: 0.03, vol: 0.04, onda: "sine" });
        pintar();
    }
}
$("pista").addEventListener("pointerdown", (e) => {
    $("pista").setPointerCapture(e.pointerId);
    moverDesde(e);
});
$("pista").addEventListener("pointermove", (e) => e.buttons && moverDesde(e));

for (const b of document.querySelectorAll("[data-modo]")) {
    b.addEventListener("click", () => {
        if (tirando) return;
        modo = b.dataset.modo;
        pintar();
    });
}

// ---------- Tirada ----------
function tirar() {
    const valor = apuesta();
    if (tirando || fichas() < valor) {
        parar();
        return;
    }
    tirando = true;
    cambiarFichas(-valor);
    const resultado = Math.floor(Math.random() * 10000) / 100;
    const gano = modo === "mas" ? resultado > objetivo : resultado < objetivo;
    const premio = gano ? Math.floor(valor * paga()) : 0;

    // El número gira rápido y frena en el resultado
    const inicio = performance.now();
    const duracion = auto ? 260 : 420;
    const girar = (t) => {
        const p = Math.min(1, (t - inicio) / duracion);
        if (p < 1) {
            $("numero").textContent = (Math.random() * 100).toFixed(2);
            if (Math.random() < 0.3) golpe({ dur: 0.02, vol: 0.03, filtro: 6000 });
            requestAnimationFrame(girar);
            return;
        }
        $("numero").textContent = resultado.toFixed(2);
        $("numero").className = `numero-dado salto ${gano ? "gano-texto" : "pierde-texto"}`;
        $("marcador").textContent = resultado.toFixed(2);
        $("marcador").style.left = `${resultado}%`;
        $("marcador").className = `marcador${gano ? "" : " pierde"}`;
        $("leyenda").textContent = gano ? `Ganaste ${formatear(premio)}` : `Necesitabas ${modo === "mas" ? "más" : "menos"} de ${objetivo}`;
        if (gano) {
            cambiarFichas(premio);
            [880, 1320].forEach((f, k) => nota({ f, t: k * 0.07, dur: 0.18, vol: 0.1, onda: "sine" }));
            const r = $("numero").getBoundingClientRect();
            if (!auto) textoFlotante(r.left + r.width / 2, r.top, `+${formatear(premio)}`, "#2ee59d");
            vibrar(15);
        } else {
            nota({ f: 220, hasta: 150, dur: 0.15, vol: 0.08, onda: "triangle" });
        }
        historial.unshift({ resultado, gano });
        historial.length = Math.min(historial.length, 14);
        $("historial").innerHTML = historial.map((h) => `<span class="${h.gano ? "gano" : ""}">${h.resultado.toFixed(2)}</span>`).join("");
        tirando = false;
        pintar();
        if (auto) setTimeout(() => auto && tirar(), 380);
    };
    requestAnimationFrame(girar);
    pintar();
}

function parar() {
    auto = false;
    pintar();
}

function pintar() {
    pintarSaldo($("fichas"));
    $("tirador").style.left = `${objetivo}%`;
    const zona = $("zona");
    if (modo === "mas") {
        zona.style.left = `${objetivo}%`;
        zona.style.right = "0";
    } else {
        zona.style.left = "0";
        zona.style.right = `${100 - objetivo}%`;
    }
    $("objetivo").textContent = `${modo === "mas" ? ">" : "<"} ${objetivo.toFixed(2)}`;
    $("chance").textContent = `${chance()}%`;
    $("paga").textContent = `${paga().toFixed(2)}×`;
    for (const b of document.querySelectorAll("[data-modo]")) {
        b.classList.toggle("activo", b.dataset.modo === modo);
        b.disabled = tirando || auto;
    }
    $("accion").textContent = auto ? "Parar" : "Tirar";
    $("accion").disabled = !auto && (tirando || fichas() < apuesta());
    $("auto").classList.toggle("activo", auto);
    apuesta.bloquear(auto);
    revisarRecarga();
}

$("accion").addEventListener("click", () => (auto ? parar() : tirar()));
$("auto").addEventListener("click", () => {
    if (auto) return parar();
    auto = true;
    if (!tirando) tirar();
    pintar();
});
pintar();
