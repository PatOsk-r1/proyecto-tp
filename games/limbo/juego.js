// Limbo: elegís un multiplicador objetivo y sale un número al azar. Si sale igual o más, cobrás
// la apuesta por tu objetivo. El número sale con P(≥ x) = 0.99 / x (la casa se queda con 1%).
import { formatear, textoFlotante, vibrar, cargar, guardar } from "../../js/comun3d.js";
import { fichas, cambiarFichas } from "../../js/fichas.js";
import { selectorApuesta, pintarSaldo, conectarRecarga, mantenerApretado } from "../../js/casino.js";
import { crearLienzo, bucle } from "../../js/lienzo2d.js";
import { nota } from "../../js/sonido.js";

const $ = (id) => document.getElementById(id);
const DEVOLUCION = 0.99;
const MAX_OBJETIVO = 1000000;
// Pasos del − / +: finos cerca de 1 y más grandes después
const PASOS = [];
for (let v = 1.1; v < 3; v += 0.1) PASOS.push(Math.round(v * 100) / 100);
for (const base of [3, 10, 100, 1000, 10000, 100000]) for (const k of [1, 1.5, 2, 2.5, 3, 4, 5, 6, 7.5]) if (base * k < base * 10) PASOS.push(base * k);
PASOS.push(MAX_OBJETIVO);
const unicos = [...new Set(PASOS.map((v) => Math.round(v * 100) / 100))].filter((v) => v <= MAX_OBJETIVO).sort((a, b) => a - b);

let objetivo = 2;
let jugando = false;
let auto = false;
const historial = [];
const estado = cargar("limbo", { record: 0 });

const apuesta = selectorApuesta({ menos: $("menos"), mas: $("mas"), texto: $("apuesta"), alCambiar: () => pintar() });
const revisarRecarga = conectarRecarga($("recargar"), () => pintar());

const textoMulti = (m) => (m >= 1000 ? `${formatear(Math.floor(m))}×` : `${m.toFixed(2)}×`);

// ---------- Fondo animado: partículas que suben más rápido mientras el número crece ----------
let ancho = 300;
let alto = 200;
const lienzo = crearLienzo($("lienzo"), (d) => {
    ancho = d.ancho;
    alto = d.alto;
});
const puntos = Array.from({ length: 60 }, () => ({ x: Math.random(), y: Math.random(), v: 0.03 + Math.random() * 0.08, r: 0.6 + Math.random() * 1.6 }));
let velocidad = 1;
let destello = 0;
let colorDestello = "#8b7bff";
bucle((dt) => {
    const { ctx } = lienzo;
    ctx.clearRect(0, 0, ancho, alto);
    velocidad += ((jugando ? 8 : 1) - velocidad) * Math.min(1, dt * 3);
    for (const p of puntos) {
        p.y -= p.v * velocidad * dt;
        if (p.y < -0.05) {
            p.y = 1.05;
            p.x = Math.random();
        }
        ctx.globalAlpha = 0.25 + p.r * 0.2;
        ctx.fillStyle = "#b9b0ff";
        ctx.fillRect(p.x * ancho, p.y * alto, p.r, p.r * (1 + velocidad * 0.8));
    }
    ctx.globalAlpha = 1;
    if (destello > 0) {
        destello = Math.max(0, destello - dt * 1.6);
        const g = ctx.createRadialGradient(ancho / 2, alto / 2, 0, ancho / 2, alto / 2, Math.max(ancho, alto) * 0.7);
        g.addColorStop(0, colorDestello);
        g.addColorStop(1, "transparent");
        ctx.globalAlpha = destello * 0.35;
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, ancho, alto);
        ctx.globalAlpha = 1;
    }
});

// ---------- Objetivo ----------
function cambiarObjetivo(v) {
    if (jugando || auto) return;
    objetivo = Math.min(MAX_OBJETIVO, Math.max(1.01, v));
    pintar();
}
$("subir").addEventListener("click", () => cambiarObjetivo(unicos.find((v) => v > objetivo + 1e-9) ?? MAX_OBJETIVO));
$("bajar").addEventListener("click", () => cambiarObjetivo([...unicos].reverse().find((v) => v < objetivo - 1e-9) ?? 1.01));
mantenerApretado($("subir"));
mantenerApretado($("bajar"));
for (const b of document.querySelectorAll("[data-o]")) b.addEventListener("click", () => cambiarObjetivo(Number(b.dataset.o)));

// ---------- Jugada ----------
function sortear() {
    const u = Math.random();
    return Math.max(1, Math.floor((DEVOLUCION / (1 - u)) * 100) / 100);
}

function jugar() {
    const valor = apuesta();
    if (jugando || fichas() < valor) {
        parar();
        return;
    }
    jugando = true;
    cambiarFichas(-valor);
    const resultado = sortear();
    const gano = resultado >= objetivo;
    const premio = gano ? Math.floor(valor * objetivo) : 0;
    const inicio = performance.now();
    // Sube rápido desde 1.00 hasta el resultado (más tiempo si el número es grande)
    const duracion = (auto ? 350 : 650) + Math.min(700, Math.log10(resultado) * 260);
    $("numero").className = "numero-limbo";
    const subir = (t) => {
        const p = Math.min(1, (t - inicio) / duracion);
        const suave = 1 - (1 - p) ** 3;
        const actual = Math.exp(Math.log(resultado) * suave);
        $("numero").textContent = textoMulti(actual);
        if (p < 1) return requestAnimationFrame(subir);

        jugando = false;
        $("numero").textContent = textoMulti(resultado);
        $("numero").className = `numero-limbo salto ${gano ? "gano-texto" : "pierde-texto"}`;
        destello = 1;
        colorDestello = gano ? "#2ee59d" : "#ff4d6a";
        if (gano) {
            cambiarFichas(premio);
            $("leyenda").textContent = `Ganaste ${formatear(premio)}`;
            [988, 1319, 1760].forEach((f, k) => nota({ f, t: k * 0.06, dur: 0.2, vol: 0.09, onda: "sine" }));
            const r = $("numero").getBoundingClientRect();
            if (!auto) textoFlotante(r.left + r.width / 2, r.top, `+${formatear(premio)}`, "#2ee59d");
            vibrar(objetivo >= 10 ? [40, 30, 80] : 15);
            if (objetivo > estado.record) {
                estado.record = objetivo;
                guardar("limbo", estado);
            }
        } else {
            $("leyenda").textContent = `Necesitabas ${textoMulti(objetivo)}`;
            nota({ f: 260, hasta: 140, dur: 0.2, vol: 0.08, onda: "triangle" });
        }
        historial.unshift({ resultado, gano });
        historial.length = Math.min(historial.length, 14);
        $("historial").innerHTML = historial.map((h) => `<span class="${h.gano ? "gano" : ""}">${textoMulti(h.resultado)}</span>`).join("");
        pintar();
        if (auto) setTimeout(() => auto && jugar(), 450);
    };
    requestAnimationFrame(subir);
    pintar();
}

function parar() {
    auto = false;
    pintar();
}

function pintar() {
    pintarSaldo($("fichas"));
    $("objetivo").textContent = textoMulti(objetivo);
    const chance = (DEVOLUCION / objetivo) * 100;
    $("chance").textContent = `${chance >= 1 ? chance.toFixed(2) : chance.toPrecision(2)}%`;
    $("ganancia").textContent = formatear(Math.floor(apuesta() * objetivo));
    $("record").textContent = estado.record ? `${textoMulti(estado.record)}` : "—";
    for (const b of document.querySelectorAll("[data-o]")) {
        b.classList.toggle("activo", Number(b.dataset.o) === objetivo);
        b.disabled = jugando || auto;
    }
    $("subir").disabled = jugando || auto || objetivo >= MAX_OBJETIVO;
    $("bajar").disabled = jugando || auto || objetivo <= 1.01;
    $("accion").textContent = auto ? "Parar" : "Jugar";
    $("accion").disabled = !auto && (jugando || fichas() < apuesta());
    $("auto").classList.toggle("activo", auto);
    apuesta.bloquear(auto || jugando);
    revisarRecarga();
}

$("accion").addEventListener("click", () => (auto ? parar() : jugar()));
$("auto").addEventListener("click", () => {
    if (auto) return parar();
    auto = true;
    if (!jugando) jugar();
    pintar();
});
pintar();
