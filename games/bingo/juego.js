// Bingo: comprás de 1 a 4 cartones, salen 32 bolillas y se cobra por las líneas completas de cada cartón.
import { formatear, textoFlotante, vibrar } from "../../js/comun3d.js";
import { fichas, cambiarFichas } from "../../js/fichas.js";
import { selectorApuesta, pintarSaldo, conectarRecarga } from "../../js/casino.js";
import { BOLILLAS, PAGOS, CARTON_LLENO, nuevoCarton, sacarBolillas, resultado } from "./reglas.js";

const $ = (id) => document.getElementById(id);
const LETRAS = "BINGO";
const COLORES = ["#e63946", "#f77f00", "#2a9d8f", "#4361ee", "#7209b7"];
const colorDe = (n) => COLORES[Math.floor((n - 1) / 15)];
const letraDe = (n) => LETRAS[Math.floor((n - 1) / 15)];

const apuesta = selectorApuesta({ menos: $("menos"), mas: $("mas"), texto: $("apuesta") });
const revisarRecarga = conectarRecarga($("recargar"), () => pintar());

let cuantos = 1;
let cartones = [nuevoCarton()];
let jugando = false;

function dibujarCartones(salieron = new Set(), enLinea = []) {
    $("cartones").innerHTML = cartones
        .map((carton, k) => {
            const celdas = carton
                .flatMap((fila, f) =>
                    fila.map((n, c) => {
                        const clases = [];
                        if (n === 0) clases.push("libre");
                        else if (salieron.has(n)) clases.push("marcado");
                        if (enLinea[k]?.some(([lf, lc]) => lf === f && lc === c)) clases.push("en-linea");
                        return `<span class="${clases.join(" ")}">${n === 0 ? "★" : n}</span>`;
                    })
                )
                .join("");
            return `<div class="carton" data-k="${k}"><div class="cabeza">${[...LETRAS].map((l) => `<span>${l}</span>`).join("")}</div><div class="numeros">${celdas}</div></div>`;
        })
        .join("");
}

async function jugar() {
    const valor = apuesta();
    const total = valor * cuantos;
    if (jugando || fichas() < total) return;
    jugando = true;
    cambiarFichas(-total);
    cartones = Array.from({ length: cuantos }, () => nuevoCarton());
    apuesta.bloquear(true);
    dibujarCartones();
    $("ultimas").innerHTML = "";
    $("mensaje").textContent = "¡Salen las bolillas!";
    $("mensaje").className = "mensaje-b";
    pintar();
    const bolillas = sacarBolillas();
    const salieron = new Set();
    for (let k = 0; k < bolillas.length; k++) {
        const n = bolillas[k];
        salieron.add(n);
        const b = $("bolilla");
        b.style.setProperty("--c", colorDe(n));
        b.innerHTML = `<div><small>${letraDe(n)}</small>${n}</div>`;
        b.style.animation = "none";
        void b.offsetWidth;
        b.style.animation = "";
        $("contador").textContent = `${k + 1}/${BOLILLAS}`;
        $("ultimas").insertAdjacentHTML("afterbegin", `<span style="--c:${colorDe(n)}">${n}</span>`);
        while ($("ultimas").children.length > 4) $("ultimas").lastElementChild.remove();
        const estaba = cartones.some((c) => c.flat().includes(n));
        dibujarCartones(salieron, cartones.map((c) => resultado(c, salieron).lineas.flat()));
        if (estaba) vibrar(12);
        await new Promise((ok) => setTimeout(ok, 230));
    }
    // Resultado de cada cartón
    let premio = 0;
    let mejor = 0;
    const lineasPorCarton = [];
    cartones.forEach((c, k) => {
        const r = resultado(c, salieron);
        premio += Math.floor(valor * r.multi);
        mejor = Math.max(mejor, r.lleno ? 99 : r.lineas.length);
        lineasPorCarton[k] = r.lineas.flat();
    });
    dibujarCartones(salieron, lineasPorCarton);
    cartones.forEach((c, k) => resultado(c, salieron).multi && document.querySelector(`.carton[data-k="${k}"]`).classList.add("gano"));
    cambiarFichas(premio);
    if (premio > 0) {
        $("mensaje").textContent = mejor === 99 ? `¡¡BINGO!! Cartón lleno · +${formatear(premio)}` : `${mejor} línea${mejor > 1 ? "s" : ""} · +${formatear(premio)}`;
        $("mensaje").className = "mensaje-b gano";
        const r = $("cartones").getBoundingClientRect();
        textoFlotante(r.left + r.width / 2, r.top + r.height / 2, `+${formatear(premio)}`, "#ffd166");
        vibrar(mejor >= 3 ? [80, 40, 80, 40, 200] : [40, 40, 80]);
    } else {
        $("mensaje").textContent = "Sin líneas esta vez";
        vibrar(60);
    }
    jugando = false;
    apuesta.bloquear(false);
    pintar();
}

function pintar() {
    pintarSaldo($("fichas"));
    for (const b of document.querySelectorAll("[data-cuantos]")) {
        b.classList.toggle("activo", Number(b.dataset.cuantos) === cuantos);
        b.disabled = jugando;
    }
    const total = apuesta() * cuantos;
    $("jugar").disabled = jugando || fichas() < total;
    $("jugar").textContent = jugando ? "Sorteando…" : `🎱 Jugar · ${formatear(total)}`;
    revisarRecarga();
}

for (const b of document.querySelectorAll("[data-cuantos]")) {
    b.addEventListener("click", () => {
        if (jugando) return;
        cuantos = Number(b.dataset.cuantos);
        cartones = Array.from({ length: cuantos }, () => nuevoCarton());
        dibujarCartones();
        pintar();
    });
}
document.querySelector("#menos").addEventListener("click", pintar);
document.querySelector("#mas").addEventListener("click", pintar);
$("jugar").addEventListener("click", jugar);
$("pagos").innerHTML =
    Object.entries(PAGOS)
        .map(([l, m]) => `<span>${l}${l === "5" ? "+" : ""} línea${l > 1 ? "s" : ""} <b>×${m}</b></span>`)
        .join("") + `<span>Cartón lleno <b>×${CARTON_LLENO}</b></span>`;
dibujarCartones();
pintar();
