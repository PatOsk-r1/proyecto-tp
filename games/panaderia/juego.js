// Panadería: tocá el horno para hornear, comprá más hornos y contratá encargados que hornean solos.
// Con la plata ganada podés abrir sucursales nuevas: empezás de cero pero todo rinde más.
import { formatear, cargar, guardar, textoFlotante, vibrar } from "../../js/comun3d.js";
import { icono } from "../../js/iconos.js";

const $ = (id) => document.getElementById(id);
const CLAVE = "panaderia";
const CRECIMIENTO = 1.09; // cuánto sube el precio de cada horno
const HITOS = [25, 50, 100, 200, 300, 400]; // en cada uno se hornea el doble de rápido
const MAX_HORAS_AUSENTE = 4;

const LINEAS = [
    { id: "pan", nombre: "Pan", icono: "pan", costo: 4, tiempo: 0.8, gana: 1, encargado: 400 },
    { id: "medialunas", nombre: "Medialunas", icono: "medialuna", costo: 60, tiempo: 3, gana: 60, encargado: 6000 },
    { id: "galletitas", nombre: "Galletitas", icono: "galletita", costo: 720, tiempo: 6, gana: 540, encargado: 80000 },
    { id: "donas", nombre: "Donas", icono: "dona", costo: 8640, tiempo: 12, gana: 4320, encargado: 1e6 },
    { id: "tortas", nombre: "Tortas", icono: "torta", costo: 103680, tiempo: 24, gana: 51840, encargado: 1.2e7 },
    { id: "bombones", nombre: "Bombones", icono: "bombon", costo: 1.24e6, tiempo: 96, gana: 622080, encargado: 1e8 },
    { id: "pasteleria", nombre: "Pastelería fina", icono: "pastel", costo: 1.49e7, tiempo: 384, gana: 7.46e6, encargado: 1e9 },
];

const estado = cargar(CLAVE, { dinero: 0, total: 0, estrellas: 0, lineas: {}, ultimaVez: Date.now() });
for (const l of LINEAS) estado.lineas[l.id] ??= { nivel: l.id === "pan" ? 1 : 0, encargado: false, progreso: 0 };
estado.recetas ??= {};
const UMBRAL_RECETA = [25, 100, 250];
const recetas = (l) => estado.recetas[l.id] ?? 0;
const costoReceta = (l) => l.costo * 60 * 12 ** recetas(l);
let impulsoHasta = 0;
const impulso = () => (impulsoHasta > Date.now() ? 7 : 1);

let compraDe = "1";

const multiplicador = () => 1 + estado.estrellas * 0.1;
const datos = (l) => estado.lineas[l.id];
const tiempoDe = (l) => l.tiempo / 2 ** HITOS.filter((h) => datos(l).nivel >= h).length;
const gananciaDe = (l) => l.gana * datos(l).nivel * multiplicador() * 3 ** recetas(l) * impulso();
const costoDe = (l, cantidad) => (l.costo * CRECIMIENTO ** datos(l).nivel * (CRECIMIENTO ** cantidad - 1)) / (CRECIMIENTO - 1);
const proximoHito = (l) => HITOS.find((h) => datos(l).nivel < h);
const estrellasNuevas = () => Math.floor(Math.sqrt(estado.total / 1e6));

function cuantasComprar(l) {
    if (compraDe !== "max") return Number(compraDe);
    // La mayor cantidad que alcanza con la plata actual
    const base = l.costo * CRECIMIENTO ** datos(l).nivel;
    return Math.max(1, Math.floor(Math.log((estado.dinero * (CRECIMIENTO - 1)) / base + 1) / Math.log(CRECIMIENTO)));
}

const porSegundo = () =>
    LINEAS.filter((l) => datos(l).encargado && datos(l).nivel > 0).reduce((t, l) => t + gananciaDe(l) / tiempoDe(l), 0);

function ganar(cantidad) {
    estado.dinero += cantidad;
    estado.total += cantidad;
}

// ---------- Interfaz ----------
const tarjetas = LINEAS.map((l) => {
    const el = document.createElement("div");
    el.className = "linea";
    el.innerHTML = `
        <button class="horno">${icono(l.icono)}<span class="nivel-h"></span></button>
        <div class="info-l"><strong>${l.nombre}</strong><span class="detalle-l"></span></div>
        <div class="botones-l">
            <button class="comprar-l"></button>
            <button class="encargado-l"></button>
            <button class="receta-l"></button>
        </div>
        <div class="barra-l"><div></div><span></span></div>`;
    el.querySelector(".horno").addEventListener("click", (e) => {
        const d = datos(l);
        if (d.nivel === 0 || d.encargado || d.progreso > 0) return;
        d.progreso = 0.0001;
        vibrar(10);
        textoFlotante(e.clientX, e.clientY, "¡Al horno!", "#ffcf6e");
    });
    el.querySelector(".comprar-l").addEventListener("click", () => {
        const n = cuantasComprar(l);
        const costo = costoDe(l, n);
        if (estado.dinero < costo) return;
        estado.dinero -= costo;
        const antes = proximoHito(l);
        datos(l).nivel += n;
        if (antes && datos(l).nivel >= antes) avisar(`¡${l.nombre} ahora se hornea el doble de rápido!`);
        vibrar(20);
        actualizar();
    });
    el.querySelector(".encargado-l").addEventListener("click", () => {
        if (estado.dinero < l.encargado || datos(l).encargado || !datos(l).nivel) return;
        estado.dinero -= l.encargado;
        datos(l).encargado = true;
        datos(l).progreso ||= 0.0001;
        avisar(`Contrataste un encargado de ${l.nombre}`);
        vibrar(30);
        actualizar();
    });
    el.querySelector(".receta-l").addEventListener("click", () => {
        const costo = costoReceta(l);
        if (estado.dinero < costo || recetas(l) >= 3 || datos(l).nivel < UMBRAL_RECETA[recetas(l)]) return;
        estado.dinero -= costo;
        estado.recetas[l.id] = recetas(l) + 1;
        avisar(`📜 Receta secreta: ${l.nombre} ahora gana ×${3 ** recetas(l)}`);
        vibrar(40);
        actualizar();
    });
    $("lineas").appendChild(el);
    return { l, el };
});

function avisar(texto) {
    $("aviso").innerHTML = `<div class="chico">${texto}</div>`;
    $("aviso").hidden = false;
    clearTimeout(avisar.t);
    avisar.t = setTimeout(() => ($("aviso").hidden = true), 1800);
}

function actualizar() {
    $("dinero").textContent = `$${formatear(estado.dinero)}`;
    $("por-segundo").textContent = `$${formatear(porSegundo())} por segundo${estado.estrellas ? ` · ×${multiplicador().toFixed(1)}` : ""}`;
    $("estrellas").textContent = estado.estrellas;
    for (const { l, el } of tarjetas) {
        const d = datos(l);
        const n = cuantasComprar(l);
        const costo = costoDe(l, n);
        el.classList.toggle("bloqueada", d.nivel === 0);
        el.querySelector(".nivel-h").textContent = d.nivel;
        const hito = proximoHito(l);
        el.querySelector(".detalle-l").textContent = d.nivel
            ? `$${formatear(gananciaDe(l))} cada ${tiempoDe(l) < 1 ? tiempoDe(l).toFixed(2) : formatear(tiempoDe(l))}s${hito ? ` · ×2 al ${hito}` : ""}`
            : "Comprá el primer horno";
        const comprar = el.querySelector(".comprar-l");
        comprar.textContent = `${d.nivel ? "+" : "Comprar "}${n} · $${formatear(costo)}`;
        comprar.disabled = estado.dinero < costo;
        const enc = el.querySelector(".encargado-l");
        enc.hidden = d.encargado || d.nivel === 0;
        enc.textContent = `Encargado $${formatear(l.encargado)}`;
        enc.disabled = estado.dinero < l.encargado;
        const rec = el.querySelector(".receta-l");
        const r = recetas(l);
        rec.hidden = r >= 3 || d.nivel < UMBRAL_RECETA[r];
        rec.textContent = `📜 Receta ×3 · $${formatear(costoReceta(l))}`;
        rec.disabled = estado.dinero < costoReceta(l);
        el.querySelector(".info-l strong").textContent = `${l.nombre}${r ? " " + "⭐".repeat(r) : ""}`;
    }
}

function pintarBarras() {
    for (const { l, el } of tarjetas) {
        const d = datos(l);
        const rapido = tiempoDe(l) < 0.25 && d.encargado;
        el.querySelector(".barra-l > div").style.width = `${rapido ? 100 : Math.min(1, d.progreso) * 100}%`;
        el.querySelector(".barra-l span").textContent = d.nivel === 0 ? "" : d.encargado ? (rapido ? "¡A toda máquina!" : "Horneando solo") : d.progreso > 0 ? "Horneando…" : "Tocá el horno";
        el.querySelector(".horno").classList.toggle("horneando", d.progreso > 0);
    }
}

// ---------- Ciclo ----------
let antes = performance.now();
let acumulado = 0;
function ciclo(ahora) {
    const dt = Math.min((ahora - antes) / 1000, 1);
    antes = ahora;
    for (const l of LINEAS) {
        const d = datos(l);
        if (!d.nivel || d.progreso <= 0) continue;
        d.progreso += dt / tiempoDe(l);
        if (d.progreso >= 1) {
            const vueltas = Math.floor(d.progreso);
            ganar(gananciaDe(l) * vueltas);
            d.progreso = d.encargado ? d.progreso - vueltas || 0.0001 : 0;
            if (!d.encargado) {
                const caja = tarjetas.find((t) => t.l === l).el.getBoundingClientRect();
                textoFlotante(caja.left + caja.width / 2, caja.top + 10, `+$${formatear(gananciaDe(l))}`, "#ffcf6e");
                volarMonedas(caja.left + 40, caja.top + 30, 4);
            }
        }
    }
    pintarBarras();
    moverDorada(dt);
    document.body.classList.toggle("impulso", impulso() > 1);
    acumulado += dt;
    if (acumulado > 0.15) {
        acumulado = 0;
        actualizar();
    }
    requestAnimationFrame(ciclo);
}

// ---------- Efectos ----------
function volarMonedas(x, y, cantidad) {
    const destino = $("dinero").getBoundingClientRect();
    for (let k = 0; k < cantidad; k++) {
        const m = document.createElement("span");
        m.className = "moneda-vuela";
        m.style.left = `${x}px`;
        m.style.top = `${y}px`;
        document.body.appendChild(m);
        const dx = destino.left + destino.width / 2 - x;
        const dy = destino.top + destino.height / 2 - y;
        m.animate(
            [
                { transform: "translate(0,0) scale(0.6)", opacity: 1 },
                { transform: `translate(${dx * 0.3 + (Math.random() - 0.5) * 60}px, ${dy * 0.3 - 40}px) scale(1.1)`, opacity: 1, offset: 0.35 },
                { transform: `translate(${dx}px, ${dy}px) scale(0.5)`, opacity: 0.6 },
            ],
            { duration: 650 + k * 70, easing: "ease-in" }
        ).onfinish = () => m.remove();
    }
}

// Medialuna dorada: cruza la pantalla cada tanto; si la tocás, todo gana ×7 por 20 segundos
const dorada = document.createElement("button");
dorada.className = "dorada";
dorada.type = "button";
dorada.hidden = true;
dorada.innerHTML = icono("medialuna");
document.body.appendChild(dorada);
let proximaDorada = 40 + Math.random() * 50;
let doradaT = 0;
function moverDorada(dt) {
    if (dorada.hidden) {
        proximaDorada -= dt;
        if (proximaDorada <= 0) {
            dorada.hidden = false;
            doradaT = 0;
            dorada.dataset.y = 18 + Math.random() * 50;
        }
        return;
    }
    doradaT += dt / 9;
    if (doradaT >= 1) {
        dorada.hidden = true;
        proximaDorada = 60 + Math.random() * 60;
        return;
    }
    const x = -60 + doradaT * (innerWidth + 120);
    const y = (innerHeight * dorada.dataset.y) / 100 + Math.sin(doradaT * 12) * 18;
    dorada.style.transform = `translate(${x}px, ${y}px) rotate(${Math.sin(doradaT * 20) * 15}deg)`;
}
dorada.addEventListener("click", () => {
    const caja = dorada.getBoundingClientRect();
    dorada.hidden = true;
    proximaDorada = 70 + Math.random() * 60;
    impulsoHasta = Date.now() + 20000;
    avisar("✨ ¡Medialuna dorada! Todo gana ×7 por 20 segundos");
    textoFlotante(caja.left + 30, caja.top + 20, "×7", "#ffe08a");
    volarMonedas(caja.left + 30, caja.top + 30, 10);
    vibrar([40, 40, 80]);
});

// ---------- Sucursales ----------
$("abrir-sucursal").addEventListener("click", () => {
    $("estrellas-nuevas").textContent = estrellasNuevas();
    $("confirmar-sucursal").disabled = estrellasNuevas() < 1;
    $("sucursal").hidden = false;
});
$("cancelar-sucursal").addEventListener("click", () => ($("sucursal").hidden = true));
$("confirmar-sucursal").addEventListener("click", () => {
    const nuevas = estrellasNuevas();
    if (nuevas < 1) return;
    estado.estrellas += nuevas;
    estado.dinero = 0;
    estado.total = 0;
    for (const l of LINEAS) estado.lineas[l.id] = { nivel: l.id === "pan" ? 1 : 0, encargado: false, progreso: 0 };
    estado.recetas = {};
    $("sucursal").hidden = true;
    avisar(`⭐ ¡Nueva sucursal! Ahora todo gana ×${multiplicador().toFixed(1)}`);
    guardarProgreso();
    actualizar();
});

for (const b of document.querySelectorAll(".cantidad")) {
    b.addEventListener("click", () => {
        compraDe = b.dataset.cantidad;
        for (const x of document.querySelectorAll(".cantidad")) x.classList.toggle("activa", x === b);
        actualizar();
    });
}

// ---------- Guardado y ganancias mientras no estabas ----------
function guardarProgreso() {
    estado.ultimaVez = Date.now();
    guardar(CLAVE, estado);
}
setInterval(guardarProgreso, 5000);
document.addEventListener("visibilitychange", guardarProgreso);
addEventListener("pagehide", guardarProgreso);

const ausente = Math.min((Date.now() - estado.ultimaVez) / 1000, MAX_HORAS_AUSENTE * 3600);
const ganadoAusente = porSegundo() * ausente;
if (ganadoAusente >= 1) {
    ganar(ganadoAusente);
    setTimeout(() => avisar(`Mientras no estabas los encargados ganaron $${formatear(ganadoAusente)}`), 400);
}

actualizar();
requestAnimationFrame(ciclo);
