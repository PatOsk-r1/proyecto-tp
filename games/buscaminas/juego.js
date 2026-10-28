// Buscaminas: el primer toque nunca es mina. Tocar y mantener (o el modo bandera) marca una mina.
import { cargar, guardar, vibrar } from "../../js/comun3d.js";

const $ = (id) => document.getElementById(id);
const CLAVE = "buscaminas";
const NIVELES = [
    { columnas: 8, filas: 9, minas: 10 },
    { columnas: 10, filas: 13, minas: 22 },
    { columnas: 12, filas: 16, minas: 40 },
];

const SVG_BANDERA = `<svg viewBox="0 0 32 32"><rect x="9" y="5" width="3" height="22" fill="#5a3418"/><path d="M12 5 L26 10 L12 16Z" fill="#e63946"/><rect x="6" y="25" width="12" height="3" rx="1" fill="#333"/></svg>`;
const SVG_MINA = `<svg viewBox="0 0 32 32"><g stroke="#111" stroke-width="2.5" stroke-linecap="round"><path d="M16 3 V29 M3 16 H29 M7 7 L25 25 M25 7 L7 25"/></g><circle cx="16" cy="16" r="9" fill="#1a1a1a"/><circle cx="13" cy="13" r="2.5" fill="#fff" opacity="0.8"/></svg>`;

const estado = cargar(CLAVE, { nivel: 0, records: [null, null, null] });
let partida = null;
let modoBandera = false;
let reloj = null;

function vecinas(i) {
    const { columnas, filas } = partida;
    const f = Math.floor(i / columnas);
    const c = i % columnas;
    const res = [];
    for (let df = -1; df <= 1; df++) {
        for (let dc = -1; dc <= 1; dc++) {
            if (!df && !dc) continue;
            const ff = f + df;
            const cc = c + dc;
            if (ff >= 0 && ff < filas && cc >= 0 && cc < columnas) res.push(ff * columnas + cc);
        }
    }
    return res;
}

function nueva() {
    const n = NIVELES[estado.nivel];
    const total = n.columnas * n.filas;
    partida = { ...n, minasEn: null, abiertas: new Set(), banderas: new Set(), terminada: false, inicio: 0 };
    clearInterval(reloj);
    $("tiempo").textContent = "0";
    const campo = $("campo");
    campo.style.gridTemplateColumns = `repeat(${n.columnas}, 1fr)`;
    const ancho = Math.min(innerWidth * 0.94, (innerHeight - 260) * (n.columnas / n.filas), 520);
    campo.style.width = `${ancho}px`;
    campo.innerHTML = "";
    for (let i = 0; i < total; i++) {
        const b = document.createElement("button");
        b.className = "celda-b";
        b.style.fontSize = `${(ancho / n.columnas) * 0.5}px`;
        let presion = null;
        b.addEventListener("pointerdown", () => {
            presion = setTimeout(() => {
                presion = "larga";
                marcar(i);
            }, 380);
        });
        b.addEventListener("pointerup", () => {
            if (presion === "larga") return (presion = null);
            clearTimeout(presion);
            presion = null;
            modoBandera ? marcar(i) : abrir(i);
        });
        b.addEventListener("pointerleave", () => presion !== "larga" && clearTimeout(presion));
        b.addEventListener("contextmenu", (e) => e.preventDefault());
        campo.appendChild(b);
    }
    pintarDatos();
}

// Las minas se ubican en el primer toque, lejos de donde tocaste
function sembrar(seguro) {
    const total = partida.columnas * partida.filas;
    const prohibidas = new Set([seguro, ...vecinas(seguro)]);
    const posibles = Array.from({ length: total }, (_, i) => i).filter((i) => !prohibidas.has(i));
    for (let i = posibles.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [posibles[i], posibles[j]] = [posibles[j], posibles[i]];
    }
    partida.minasEn = new Set(posibles.slice(0, partida.minas));
    partida.inicio = Date.now();
    reloj = setInterval(() => ($("tiempo").textContent = Math.floor((Date.now() - partida.inicio) / 1000)), 500);
}

const alrededor = (i) => vecinas(i).filter((v) => partida.minasEn.has(v)).length;

function abrir(i) {
    if (partida.terminada || partida.banderas.has(i)) return;
    if (!partida.minasEn) sembrar(i);
    if (partida.abiertas.has(i)) {
        // Tocar un número con todas sus banderas puestas abre las casillas de alrededor
        const n = alrededor(i);
        const vs = vecinas(i);
        if (n && vs.filter((v) => partida.banderas.has(v)).length === n) vs.forEach((v) => !partida.abiertas.has(v) && abrir(v));
        return;
    }
    if (partida.minasEn.has(i)) return perder(i);
    // Destapa en cascada las casillas sin minas alrededor
    const cola = [i];
    while (cola.length) {
        const k = cola.pop();
        if (partida.abiertas.has(k) || partida.banderas.has(k)) continue;
        partida.abiertas.add(k);
        const celda = $("campo").children[k];
        celda.classList.add("abierta");
        const n = alrededor(k);
        celda.textContent = n || "";
        if (n) celda.classList.add(`n${n}`);
        else cola.push(...vecinas(k));
    }
    vibrar(8);
    if (partida.abiertas.size === partida.columnas * partida.filas - partida.minas) ganar();
}

function marcar(i) {
    if (partida.terminada || partida.abiertas.has(i)) return;
    const celda = $("campo").children[i];
    if (partida.banderas.has(i)) {
        partida.banderas.delete(i);
        celda.innerHTML = "";
    } else {
        partida.banderas.add(i);
        celda.innerHTML = SVG_BANDERA;
    }
    vibrar(20);
    pintarDatos();
}

function perder(i) {
    partida.terminada = true;
    clearInterval(reloj);
    vibrar(200);
    const celdas = $("campo").children;
    celdas[i].classList.add("mina-roja", "explota");
    let demora = 0;
    for (const m of partida.minasEn) {
        setTimeout(() => {
            celdas[m].classList.add("abierta");
            celdas[m].innerHTML = SVG_MINA;
        }, m === i ? 0 : (demora += 40));
    }
    setTimeout(() => mostrarFin("¡Boom!", "Pisaste una mina"), demora + 500);
}

function ganar() {
    partida.terminada = true;
    clearInterval(reloj);
    const segundos = Math.floor((Date.now() - partida.inicio) / 1000);
    const record = estado.records[estado.nivel];
    const nuevo = record === null || segundos < record;
    if (nuevo) estado.records[estado.nivel] = segundos;
    guardar(CLAVE, estado);
    vibrar(90);
    for (const m of partida.minasEn) $("campo").children[m].innerHTML = SVG_BANDERA;
    mostrarFin("¡Ganaste!", `${segundos} segundos${nuevo ? " · ¡nuevo récord!" : ""}`);
}

function mostrarFin(titulo, detalle) {
    $("titulo-centro").innerHTML = `${titulo}<div class="chico">${detalle}</div>`;
    $("jugar").textContent = "Otra vez";
    $("centro").hidden = false;
    pintarDatos();
}

function pintarDatos() {
    $("minas").textContent = partida ? partida.minas - partida.banderas.size : NIVELES[estado.nivel].minas;
    const r = estado.records[estado.nivel];
    $("record").textContent = r === null ? "—" : `${r}s`;
    for (const b of document.querySelectorAll(".dificultad button")) b.classList.toggle("activa", Number(b.dataset.nivel) === estado.nivel);
}

function cambiarModo(bandera) {
    modoBandera = bandera;
    $("modo-abrir").classList.toggle("activo", !bandera);
    $("modo-bandera").classList.toggle("activo", bandera);
}

for (const b of document.querySelectorAll(".dificultad button")) {
    b.addEventListener("click", () => {
        estado.nivel = Number(b.dataset.nivel);
        guardar(CLAVE, estado);
        pintarDatos();
    });
}
$("jugar").addEventListener("click", () => {
    $("centro").hidden = true;
    nueva();
});
$("reiniciar").addEventListener("click", () => {
    $("centro").hidden = true;
    nueva();
});
$("modo-abrir").addEventListener("click", () => cambiarModo(false));
$("modo-bandera").addEventListener("click", () => cambiarModo(true));

nueva();
