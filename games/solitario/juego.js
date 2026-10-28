// Solitario clásico (Klondike, de a una carta). Tocá una carta y va sola al mejor lugar posible.
import { cargar, guardar, vibrar } from "../../js/comun3d.js";

const $ = (id) => document.getElementById(id);
const CLAVE = "solitario";
const PALOS = ["♠", "♥", "♦", "♣"];
const VALORES = ["", "A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
const esRoja = (c) => c.palo === 1 || c.palo === 2;

const estado = cargar(CLAVE, { ganados: 0, partida: null });
let p = null; // { mazo, descarte, bases[4], columnas[7], movimientos, segundos }
let historial = [];
let reloj = null;
let ultimaMovida = null;

function repartir() {
    const cartas = [];
    for (let palo = 0; palo < 4; palo++) for (let v = 1; v <= 13; v++) cartas.push({ palo, v, arriba: false });
    for (let i = cartas.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [cartas[i], cartas[j]] = [cartas[j], cartas[i]];
    }
    const columnas = Array.from({ length: 7 }, (_, i) => {
        const col = cartas.splice(0, i + 1);
        col.at(-1).arriba = true;
        return col;
    });
    p = { mazo: cartas, descarte: [], bases: [[], [], [], []], columnas, movimientos: 0, segundos: 0 };
    historial = [];
    guardarPartida();
    pintar();
}

const copia = () => JSON.parse(JSON.stringify(p));
function guardarPartida() {
    estado.partida = p;
    guardar(CLAVE, estado);
}

// ---------- Reglas ----------
function puedeIrABase(carta, base) {
    const tope = base.at(-1);
    return tope ? tope.palo === carta.palo && tope.v === carta.v - 1 : carta.v === 1;
}
function puedeIrAColumna(carta, col) {
    const tope = col.at(-1);
    return tope ? tope.arriba && esRoja(tope) !== esRoja(carta) && tope.v === carta.v + 1 : carta.v === 13;
}

// Busca adónde mover; devuelve true si movió
function moverDesde(origen, indice) {
    const lista = origen.tipo === "columna" ? p.columnas[origen.i] : origen.tipo === "descarte" ? p.descarte : p.bases[origen.i];
    const cartas = lista.slice(indice);
    if (!cartas.length || !cartas[0].arriba) return false;
    const primera = cartas[0];
    let destino = null;
    // 1) A una base si es una sola carta
    if (cartas.length === 1 && origen.tipo !== "base") {
        const b = p.bases.findIndex((base) => puedeIrABase(primera, base));
        if (b >= 0) destino = p.bases[b];
    }
    // 2) A una columna (primero las que tienen cartas, después vacías)
    if (!destino) {
        const opciones = p.columnas
            .map((col, i) => ({ col, i }))
            .filter(({ i }) => !(origen.tipo === "columna" && origen.i === i))
            .filter(({ col }) => puedeIrAColumna(primera, col))
            .sort((a, b) => (a.col.length ? 0 : 1) - (b.col.length ? 0 : 1));
        // Un rey que ya está solo abajo de una columna no se mueve a otra vacía
        const reyYaUbicado = primera.v === 13 && origen.tipo === "columna" && indice === 0;
        if (opciones.length && !(reyYaUbicado && !opciones[0].col.length)) destino = opciones[0].col;
    }
    if (!destino) return false;
    historial.push(copia());
    lista.splice(indice);
    destino.push(...cartas);
    ultimaMovida = cartas;
    if (origen.tipo === "columna") {
        const nueva = p.columnas[origen.i].at(-1);
        if (nueva && !nueva.arriba) nueva.arriba = true;
    }
    p.movimientos++;
    vibrar(10);
    return true;
}

function sacarDelMazo() {
    historial.push(copia());
    if (p.mazo.length) {
        const c = p.mazo.pop();
        c.arriba = true;
        p.descarte.push(c);
        ultimaMovida = [c];
    } else {
        // Se da vuelta el descarte y vuelve a ser mazo
        p.mazo = p.descarte.reverse().map((c) => ({ ...c, arriba: false }));
        p.descarte = [];
    }
    p.movimientos++;
    vibrar(6);
    despues();
}

function despues() {
    guardarPartida();
    pintar();
    if (p.bases.every((b) => b.length === 13)) ganar();
}

function ganar() {
    clearInterval(reloj);
    estado.ganados++;
    estado.partida = null;
    guardar(CLAVE, estado);
    vibrar(120);
    $("titulo-centro").innerHTML = `¡Ganaste!<div class="chico">${p.movimientos} movimientos · ${$("tiempo").textContent}</div>`;
    $("centro").hidden = false;
}

// Terminar solo: cuando todo está a la vista, manda las cartas a las bases de a una
function autocompletar() {
    $("auto").hidden = true;
    const paso = () => {
        for (let i = 0; i < 7; i++) {
            const col = p.columnas[i];
            if (!col.length) continue;
            const b = p.bases.findIndex((base) => puedeIrABase(col.at(-1), base));
            if (b >= 0) {
                p.bases[b].push(col.pop());
                p.movimientos++;
                pintar();
                vibrar(5);
                return setTimeout(paso, 90);
            }
        }
        despues();
    };
    paso();
}

// ---------- Dibujo ----------
function htmlCarta(c, top, datos) {
    const roja = esRoja(c) ? " roja" : "";
    const boca = c.arriba ? "" : " boca-abajo";
    const mueve = ultimaMovida?.some((x) => x.palo === c.palo && x.v === c.v) ? " mueve" : "";
    return `<div class="carta-s${roja}${boca}${mueve}" style="top:${top}px" ${datos}>
        <span class="esq">${VALORES[c.v]}<br>${PALOS[c.palo]}</span><span class="grande">${PALOS[c.palo]}</span></div>`;
}

function pintar() {
    const alto = $("mazo").getBoundingClientRect().height || 100;
    $("mazo").innerHTML = p.mazo.length ? htmlCarta({ ...p.mazo.at(-1), arriba: false }, -2, "") : '<span class="vacio">↻</span>';
    $("descarte").innerHTML = p.descarte.length ? htmlCarta(p.descarte.at(-1), -2, 'data-origen="descarte"') : "";
    document.querySelectorAll(".base").forEach((el, i) => {
        const tope = p.bases[i].at(-1);
        el.innerHTML = tope ? htmlCarta(tope, -2, `data-origen="base" data-i="${i}"`) : "";
    });
    $("columnas").innerHTML = p.columnas
        .map((col, i) => {
            let top = -2;
            const cartas = col
                .map((c, k) => {
                    const html = htmlCarta(c, top, `data-origen="columna" data-i="${i}" data-k="${k}"`);
                    top += c.arriba ? alto * 0.27 : alto * 0.13;
                    return html;
                })
                .join("");
            return `<div class="columna" style="height:${Math.max(alto, top + alto)}px">${cartas}</div>`;
        })
        .join("");
    ultimaMovida = null;
    $("movimientos").textContent = p.movimientos;
    $("ganados").textContent = estado.ganados;
    const todoVisible = !p.mazo.length && !p.descarte.length && p.columnas.every((c) => c.every((x) => x.arriba));
    $("auto").hidden = !todoVisible || p.bases.every((b) => b.length === 13);
}

function pintarTiempo() {
    $("tiempo").textContent = `${Math.floor(p.segundos / 60)}:${String(p.segundos % 60).padStart(2, "0")}`;
}

// ---------- Toques ----------
$("mesa").addEventListener("click", (e) => {
    if (e.target.closest("#mazo")) return sacarDelMazo();
    const el = e.target.closest(".carta-s[data-origen]");
    if (!el) return;
    const origen = { tipo: el.dataset.origen, i: Number(el.dataset.i) };
    const lista = origen.tipo === "columna" ? p.columnas[origen.i] : origen.tipo === "descarte" ? p.descarte : p.bases[origen.i];
    const indice = origen.tipo === "columna" ? Number(el.dataset.k) : lista.length - 1;
    if (moverDesde(origen, indice)) despues();
    else {
        el.classList.remove("no-va");
        void el.offsetWidth;
        el.classList.add("no-va");
        vibrar(30);
    }
});

$("deshacer").addEventListener("click", () => {
    if (!historial.length) return;
    p = historial.pop();
    guardarPartida();
    pintar();
});
$("auto").addEventListener("click", autocompletar);
$("nueva").addEventListener("click", () => {
    if (p.movimientos > 0 && !confirm("¿Empezar una partida nueva?")) return;
    repartir();
});
$("otra").addEventListener("click", () => {
    $("centro").hidden = true;
    repartir();
    arrancarReloj();
});

function arrancarReloj() {
    clearInterval(reloj);
    reloj = setInterval(() => {
        if (document.visibilityState !== "visible") return;
        p.segundos++;
        pintarTiempo();
        if (p.segundos % 10 === 0) guardarPartida();
    }, 1000);
}

new ResizeObserver(() => p && pintar()).observe($("mesa"));

if (estado.partida) {
    p = estado.partida;
    pintar();
} else {
    repartir();
}
pintarTiempo();
arrancarReloj();
