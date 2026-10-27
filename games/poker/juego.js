// Video póker (Jacks or Better): 5 cartas, guardás las que quieras y cambiás el resto una vez.
import { formatear, textoFlotante, vibrar } from "../../js/comun3d.js";
import { fichas, cambiarFichas } from "../../js/fichas.js";
import { selectorApuesta, pintarSaldo, conectarRecarga } from "../../js/casino.js";

const $ = (id) => document.getElementById(id);
const PALOS = ["♠", "♥", "♦", "♣"];
const VALORES = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];

const PAGOS = [
    { nombre: "Escalera real", paga: 250 },
    { nombre: "Escalera de color", paga: 50 },
    { nombre: "Póker", paga: 25 },
    { nombre: "Full", paga: 9 },
    { nombre: "Color", paga: 6 },
    { nombre: "Escalera", paga: 4 },
    { nombre: "Trío", paga: 3 },
    { nombre: "Doble par", paga: 2 },
    { nombre: "Par de J o más", paga: 1 },
];

let mazo = [];
let mano = [];
let guardadas = [false, false, false, false, false];
let fase = "apostar"; // apostar → cambiar → apostar
let apuestaHecha = 0;

const apuesta = selectorApuesta({ menos: $("menos"), mas: $("mas"), texto: $("apuesta"), alCambiar: () => pintar() });
const revisarRecarga = conectarRecarga($("recargar"), () => pintar());

function nuevoMazo() {
    mazo = PALOS.flatMap((p) => VALORES.map((v, i) => ({ palo: p, valor: v, rango: i + 2 })));
    for (let i = mazo.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [mazo[i], mazo[j]] = [mazo[j], mazo[i]];
    }
}

// Qué jugada es (índice en PAGOS) o -1 si no paga
function evaluar(cartas) {
    const rangos = cartas.map((c) => c.rango).sort((a, b) => a - b);
    const color = cartas.every((c) => c.palo === cartas[0].palo);
    const unicos = [...new Set(rangos)];
    const rueda = unicos.length === 5 && rangos.join() === "2,3,4,5,14"; // A-2-3-4-5
    const escalera = unicos.length === 5 && (rangos[4] - rangos[0] === 4 || rueda);
    const cuenta = {};
    for (const r of rangos) cuenta[r] = (cuenta[r] ?? 0) + 1;
    const repes = Object.values(cuenta).sort((a, b) => b - a);
    if (escalera && color && rangos[0] === 10) return 0;
    if (escalera && color) return 1;
    if (repes[0] === 4) return 2;
    if (repes[0] === 3 && repes[1] === 2) return 3;
    if (color) return 4;
    if (escalera) return 5;
    if (repes[0] === 3) return 6;
    if (repes[0] === 2 && repes[1] === 2) return 7;
    if (repes[0] === 2 && Object.entries(cuenta).some(([r, n]) => n === 2 && Number(r) >= 11)) return 8;
    return -1;
}

function pintarCartas(nuevas = []) {
    $("mano").innerHTML = "";
    for (let i = 0; i < 5; i++) {
        const c = mano[i];
        const b = document.createElement("button");
        if (!c) {
            b.className = "carta-p dorso";
        } else {
            const roja = c.palo === "♥" || c.palo === "♦";
            b.className = `carta-p${roja ? " roja" : ""}${guardadas[i] ? " guardada" : ""}${nuevas.includes(i) ? " nueva" : ""}`;
            b.innerHTML = `<span class="valor">${c.valor}<br>${c.palo}</span><span class="centro">${c.palo}</span>${guardadas[i] ? '<span class="guardar">GUARDADA</span>' : ""}`;
            b.style.animationDelay = `${nuevas.indexOf(i) * 0.08}s`;
        }
        b.addEventListener("click", () => {
            if (fase !== "cambiar") return;
            guardadas[i] = !guardadas[i];
            vibrar(10);
            pintarCartas();
        });
        $("mano").appendChild(b);
    }
}

function pintar(jugada = -2) {
    pintarSaldo($("fichas"));
    $("pagos").innerHTML = PAGOS.map(
        (p, i) => `<span class="${i === jugada ? "activa" : ""}">${p.nombre}</span><span class="${i === jugada ? "activa" : ""}">${formatear(p.paga * apuesta())}</span>`
    ).join("");
    $("accion").textContent = fase === "cambiar" ? "Cambiar" : "Repartir";
    $("accion").disabled = fase === "apostar" && fichas() < apuesta();
    apuesta.bloquear?.(fase === "cambiar");
    revisarRecarga();
}

$("accion").addEventListener("click", () => {
    if (fase === "apostar") {
        apuestaHecha = apuesta();
        if (fichas() < apuestaHecha) return;
        cambiarFichas(-apuestaHecha);
        nuevoMazo();
        mano = mazo.splice(0, 5);
        guardadas = [false, false, false, false, false];
        fase = "cambiar";
        const j = evaluar(mano);
        $("resultado").textContent = j >= 0 ? PAGOS[j].nombre : "";
        $("resultado").className = "resultado-p";
        $("ayuda").textContent = "Tocá las cartas que querés guardar";
        pintarCartas([0, 1, 2, 3, 4]);
        pintar(j);
    } else {
        const cambiadas = [];
        mano = mano.map((c, i) => (guardadas[i] ? c : (cambiadas.push(i), mazo.pop())));
        guardadas = guardadas.map(() => false);
        fase = "apostar";
        const j = evaluar(mano);
        const premio = j >= 0 ? PAGOS[j].paga * apuestaHecha : 0;
        cambiarFichas(premio);
        pintarCartas(cambiadas);
        if (premio > 0) {
            $("resultado").textContent = `${PAGOS[j].nombre}: +${formatear(premio)}`;
            $("resultado").className = "resultado-p gano";
            const caja = $("mano").getBoundingClientRect();
            textoFlotante(caja.left + caja.width / 2, caja.top, `+${formatear(premio)}`, "#ffd166");
            vibrar(70);
        } else {
            $("resultado").textContent = "Sin premio";
            $("resultado").className = "resultado-p";
        }
        $("ayuda").textContent = "Apostá y repartí otra vez";
        pintar(j);
    }
});

pintarCartas();
pintar();
