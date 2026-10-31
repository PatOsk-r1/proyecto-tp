// Torre: 8 pisos; en cada uno elegís una puerta y algunas tienen trampa. Cada piso superado multiplica
// la apuesta; podés cobrar cuando quieras. Multiplicador justo = (puertas / seguras) por piso, menos 1% de la casa.
import { formatear, textoFlotante, vibrar } from "../../js/comun3d.js";
import { fichas, cambiarFichas } from "../../js/fichas.js";
import { selectorApuesta, pintarSaldo, conectarRecarga } from "../../js/casino.js";
import { nota, golpe } from "../../js/sonido.js";

const $ = (id) => document.getElementById(id);
const PISOS = 8;
const DEVOLUCION = 0.99;
const DIFICULTADES = {
    facil: { puertas: 4, trampas: 1 },
    medio: { puertas: 3, trampas: 1 },
    dificil: { puertas: 2, trampas: 1 },
    experto: { puertas: 3, trampas: 2 },
};
const ICONO_SEGURA = '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="#2ee59d" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const ICONO_TRAMPA = '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18" fill="none" stroke="#ff4d6a" stroke-width="3" stroke-linecap="round"/></svg>';

let dificultad = "medio";
let ronda = null; // { trampas: [Set por piso], piso, monto, terminada, gano }

const apuesta = selectorApuesta({ menos: $("menos"), mas: $("mas"), texto: $("apuesta"), alCambiar: () => pintar() });
const revisarRecarga = conectarRecarga($("recargar"), () => pintar());

const config = () => DIFICULTADES[dificultad];
function multiplicador(pisos) {
    const { puertas, trampas } = config();
    return pisos ? Math.floor((puertas / (puertas - trampas)) ** pisos * DEVOLUCION * 100) / 100 : 1;
}

// ---------- Armar la torre ----------
let filas = [];
function armarTorre() {
    const { puertas } = config();
    $("torre").innerHTML = "";
    filas = Array.from({ length: PISOS }, (_, p) => {
        const fila = document.createElement("div");
        fila.className = "piso";
        fila.innerHTML = `<span class="valor">${multiplicador(p + 1).toFixed(2)}×</span>`;
        const botones = Array.from({ length: puertas }, (_, i) => {
            const b = document.createElement("button");
            b.className = "puerta";
            b.type = "button";
            b.addEventListener("click", () => elegir(p, i));
            fila.appendChild(b);
            return b;
        });
        $("torre").appendChild(fila);
        return { fila, botones };
    });
}

// ---------- Juego ----------
function empezar() {
    const valor = apuesta();
    if (fichas() < valor) return;
    cambiarFichas(-valor);
    const { puertas, trampas } = config();
    const lista = Array.from({ length: PISOS }, () => {
        const s = new Set();
        while (s.size < trampas) s.add(Math.floor(Math.random() * puertas));
        return s;
    });
    ronda = { trampas: lista, piso: 0, monto: valor, terminada: false };
    armarTorre();
    golpe({ dur: 0.08, vol: 0.08, filtro: 900, tipo: "lowpass" });
    vibrar(12);
    pintar();
}

function elegir(p, i) {
    if (!ronda || ronda.terminada || p !== ronda.piso) return;
    const b = filas[p].botones[i];
    if (ronda.trampas[p].has(i)) {
        b.classList.add("trampa");
        b.innerHTML = ICONO_TRAMPA;
        $("torre").classList.remove("temblor");
        void $("torre").offsetWidth;
        $("torre").classList.add("temblor");
        nota({ f: 180, hasta: 90, dur: 0.35, vol: 0.12, onda: "sawtooth" });
        vibrar([100, 50, 200]);
        return terminar(false);
    }
    b.classList.add("segura");
    b.innerHTML = ICONO_SEGURA;
    ronda.piso++;
    nota({ f: 520 + ronda.piso * 90, dur: 0.15, vol: 0.1, onda: "sine" });
    vibrar(10 + ronda.piso * 2);
    const r = b.getBoundingClientRect();
    textoFlotante(r.left + r.width / 2, r.top, `${multiplicador(ronda.piso).toFixed(2)}×`, "#ffb547");
    if (ronda.piso === PISOS) return cobrar();
    pintar();
}

function cobrar() {
    if (!ronda || ronda.terminada || !ronda.piso) return;
    const premio = Math.floor(ronda.monto * multiplicador(ronda.piso));
    cambiarFichas(premio);
    const r = $("torre").getBoundingClientRect();
    textoFlotante(r.left + r.width / 2, r.top + r.height / 2, `+${formatear(premio)}`, "#2ee59d");
    [784, 988, 1319].forEach((f, k) => nota({ f, t: k * 0.08, dur: 0.25, vol: 0.1, onda: "triangle" }));
    vibrar([40, 40, 80]);
    terminar(true);
}

function terminar(gano) {
    ronda.terminada = true;
    ronda.gano = gano;
    // Muestra dónde estaban las trampas de los pisos que faltaban
    filas.forEach(({ botones }, p) => {
        botones.forEach((b, i) => {
            if (b.classList.contains("segura") || b.classList.contains("trampa")) return;
            if (!ronda.trampas[p].has(i)) return;
            setTimeout(() => {
                b.classList.add("trampa", "revelada");
                b.innerHTML = ICONO_TRAMPA;
            }, 150 + p * 50);
        });
    });
    pintar();
}

function pintar() {
    pintarSaldo($("fichas"));
    const jugando = ronda && !ronda.terminada;
    const piso = ronda?.piso ?? 0;
    filas.forEach(({ fila, botones }, p) => {
        fila.classList.toggle("actual", Boolean(jugando) && p === piso);
        fila.classList.toggle("pasado", Boolean(ronda) && p < piso);
        for (const b of botones) b.disabled = !jugando || p !== piso;
    });
    const m = multiplicador(piso);
    $("multi").textContent = `${m.toFixed(2)}×`;
    $("proximo").textContent = jugando && piso < PISOS ? `${multiplicador(piso + 1).toFixed(2)}×` : "—";
    $("ganancia").textContent = jugando ? formatear(Math.floor(ronda.monto * m)) : ronda?.terminada ? (ronda.gano ? `+${formatear(Math.floor(ronda.monto * m))}` : "0") : "0";
    $("ganancia").className = ronda?.terminada ? (ronda.gano ? "gano-texto" : "pierde-texto") : "";
    for (const b of document.querySelectorAll("[data-d]")) {
        b.classList.toggle("activo", b.dataset.d === dificultad);
        b.disabled = Boolean(jugando);
    }
    const boton = $("accion");
    if (jugando && piso) {
        boton.className = "accion cobrar";
        boton.textContent = `Cobrar ${formatear(Math.floor(ronda.monto * m))}`;
        boton.disabled = false;
    } else {
        boton.className = "accion";
        boton.textContent = jugando ? "Elegí una puerta" : "Empezar";
        boton.disabled = Boolean(jugando) || fichas() < apuesta();
    }
    apuesta.bloquear(Boolean(jugando));
    revisarRecarga();
}

$("accion").addEventListener("click", () => (ronda && !ronda.terminada ? cobrar() : empezar()));
for (const b of document.querySelectorAll("[data-d]")) {
    b.addEventListener("click", () => {
        if (ronda && !ronda.terminada) return;
        dificultad = b.dataset.d;
        ronda = null;
        armarTorre();
        pintar();
    });
}
armarTorre();
pintar();
