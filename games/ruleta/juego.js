// Ruleta europea (un solo cero). Usa las fichas compartidas del casino.
import { formatear, textoFlotante, vibrar, MONEDA } from "../../js/comun3d.js";
import { fichas, cambiarFichas, recargar, puedeRecargar, LIMITE_APUESTA } from "../../js/fichas.js";

const $ = (id) => document.getElementById(id);

const ORDEN = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26];
const ROJOS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
const colorDe = (n) => (n === 0 ? "verde" : ROJOS.has(n) ? "rojo" : "negro");
const SEGMENTO = (Math.PI * 2) / ORDEN.length;

// Apuestas de afuera: qué números cubren y cuánto pagan (además de devolver lo apostado)
const AFUERA = {
    d1: { texto: "1ª 12", paga: 2, gana: (n) => n >= 1 && n <= 12 },
    d2: { texto: "2ª 12", paga: 2, gana: (n) => n >= 13 && n <= 24 },
    d3: { texto: "3ª 12", paga: 2, gana: (n) => n >= 25 },
    bajo: { texto: "1-18", paga: 1, gana: (n) => n >= 1 && n <= 18 },
    par: { texto: "Par", paga: 1, gana: (n) => n > 0 && n % 2 === 0 },
    rojo: { texto: "Rojo", paga: 1, gana: (n) => ROJOS.has(n), clase: "rojo" },
    negro: { texto: "Negro", paga: 1, gana: (n) => n > 0 && !ROJOS.has(n), clase: "negro" },
    impar: { texto: "Impar", paga: 1, gana: (n) => n % 2 === 1 },
    alto: { texto: "19-36", paga: 1, gana: (n) => n >= 19 },
    c1: { texto: "2:1", paga: 2, gana: (n) => n > 0 && n % 3 === 1 },
    c2: { texto: "2:1", paga: 2, gana: (n) => n > 0 && n % 3 === 2 },
    c3: { texto: "2:1", paga: 2, gana: (n) => n > 0 && n % 3 === 0 },
};

let apuestas = {};
let anteriores = {};
let ficha = 10;
let girando = false;
let historial = [];

// ---------- Rueda ----------
const lienzo = $("rueda");
const ctx = lienzo.getContext("2d");
const C = lienzo.width / 2;
let anguloRueda = 0;
let anguloBola = 0;
let radioBola = C * 0.88;
let ganadorIndice = -1;
let brilloGanador = 0;

function dibujar() {
    ctx.clearRect(0, 0, lienzo.width, lienzo.height);
    // Borde de madera
    const madera = ctx.createRadialGradient(C, C, C * 0.8, C, C, C);
    madera.addColorStop(0, "#5a2e10");
    madera.addColorStop(1, "#2a1405");
    ctx.fillStyle = madera;
    ctx.beginPath();
    ctx.arc(C, C, C, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.translate(C, C);
    ctx.rotate(anguloRueda);
    ORDEN.forEach((n, i) => {
        const a0 = -Math.PI / 2 + i * SEGMENTO - SEGMENTO / 2;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, C * 0.82, a0, a0 + SEGMENTO);
        ctx.closePath();
        ctx.fillStyle = n === 0 ? "#0f8a3c" : ROJOS.has(n) ? "#c62828" : "#1a1a1a";
        ctx.fill();
        ctx.strokeStyle = "#e6c46a";
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.save();
        ctx.rotate(a0 + SEGMENTO / 2 + Math.PI / 2);
        ctx.fillStyle = "#fff";
        ctx.font = "bold 22px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(String(n), 0, -C * 0.7);
        ctx.restore();
    });
    // Casilla ganadora iluminada
    if (ganadorIndice >= 0 && brilloGanador > 0) {
        const a0 = -Math.PI / 2 + ganadorIndice * SEGMENTO - SEGMENTO / 2;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, C * 0.82, a0, a0 + SEGMENTO);
        ctx.closePath();
        ctx.fillStyle = `rgba(255,209,102,${0.25 + Math.sin(performance.now() / 120) * 0.15})`;
        ctx.fill();
    }
    // Aro de metal con rombos
    ctx.strokeStyle = "#e6c46a";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, 0, C * 0.6, 0, Math.PI * 2);
    ctx.stroke();
    for (let k = 0; k < 8; k++) {
        ctx.save();
        ctx.rotate((k / 8) * Math.PI * 2);
        const g = ctx.createLinearGradient(-8, 0, 8, 0);
        g.addColorStop(0, "#8d7a4a");
        g.addColorStop(0.5, "#fff6d5");
        g.addColorStop(1, "#8d7a4a");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(0, -C * 0.92);
        ctx.lineTo(7, -C * 0.88);
        ctx.lineTo(0, -C * 0.84);
        ctx.lineTo(-7, -C * 0.88);
        ctx.fill();
        ctx.restore();
    }
    // Centro dorado
    const centro = ctx.createRadialGradient(-10, -10, 5, 0, 0, C * 0.45);
    centro.addColorStop(0, "#ffe9a8");
    centro.addColorStop(1, "#a8761f");
    ctx.fillStyle = "#3b1e0a";
    ctx.beginPath();
    ctx.arc(0, 0, C * 0.55, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = centro;
    ctx.beginPath();
    ctx.arc(0, 0, C * 0.2, 0, Math.PI * 2);
    ctx.fill();
    for (let k = 0; k < 4; k++) {
        ctx.rotate(Math.PI / 2);
        ctx.fillRect(-4, -C * 0.45, 8, C * 0.3);
    }
    ctx.restore();

    // Brillo de vidrio sobre la rueda
    const vidrio = ctx.createLinearGradient(0, 0, lienzo.width, lienzo.height);
    vidrio.addColorStop(0, "rgba(255,255,255,0.14)");
    vidrio.addColorStop(0.45, "rgba(255,255,255,0)");
    ctx.fillStyle = vidrio;
    ctx.beginPath();
    ctx.arc(C, C, C * 0.82, 0, Math.PI * 2);
    ctx.fill();

    // Bola con sombra
    const bx = C + Math.cos(anguloBola - Math.PI / 2) * radioBola;
    const by = C + Math.sin(anguloBola - Math.PI / 2) * radioBola;
    ctx.fillStyle = "#0006";
    ctx.beginPath();
    ctx.ellipse(bx + 4, by + 5, 12, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    const brillo = ctx.createRadialGradient(bx - 4, by - 4, 2, bx, by, 13);
    brillo.addColorStop(0, "#ffffff");
    brillo.addColorStop(1, "#bdbdbd");
    ctx.fillStyle = brillo;
    ctx.beginPath();
    ctx.arc(bx, by, 12, 0, Math.PI * 2);
    ctx.fill();

    // Marcador arriba
    ctx.fillStyle = "#ffd166";
    ctx.beginPath();
    ctx.moveTo(C - 14, 4);
    ctx.lineTo(C + 14, 4);
    ctx.lineTo(C, 30);
    ctx.closePath();
    ctx.fill();
}

function girarRueda(resultado) {
    return new Promise((resolver) => {
        const i = ORDEN.indexOf(resultado);
        const inicioRueda = anguloRueda;
        // Que el número ganador termine arriba, después de varias vueltas
        const destinoRueda = anguloRueda - (((anguloRueda + i * SEGMENTO) % (Math.PI * 2)) + Math.PI * 2 * 5);
        const inicioBola = anguloBola;
        const destinoBola = Math.ceil(anguloBola / (Math.PI * 2)) * Math.PI * 2 + Math.PI * 2 * 8;
        const duracion = 5200;
        const t0 = performance.now();
        function cuadro(ahora) {
            const t = Math.min(1, (ahora - t0) / duracion);
            const suave = 1 - (1 - t) ** 3;
            anguloRueda = inicioRueda + (destinoRueda - inicioRueda) * suave;
            anguloBola = inicioBola + (destinoBola - inicioBola) * (1 - (1 - t) ** 2.4);
            // La bola baja de la pista al número en el último tramo, rebotando entre casillas
            radioBola = C * (t < 0.7 ? 0.88 : 0.88 - ((t - 0.7) / 0.3) * 0.16);
            if (t > 0.7 && t < 0.93) {
                const r = (t - 0.7) / 0.23;
                radioBola += Math.abs(Math.sin(r * Math.PI * 4)) * C * 0.05 * (1 - r);
                anguloBola += Math.sin(r * Math.PI * 6) * SEGMENTO * 0.6 * (1 - r);
                if (Math.random() < 0.08) vibrar(4);
            }
            dibujar();
            if (t < 1) requestAnimationFrame(cuadro);
            else resolver();
        }
        requestAnimationFrame(cuadro);
    });
}

// ---------- Paño ----------
// Disposición clásica: el 0 ocupa la primera columna; los números van de a 3 por columna
// (abajo 1, 4, 7…; al medio 2, 5, 8…; arriba 3, 6, 9…) y debajo las apuestas de afuera.
const UBICACION_AFUERA = {
    d1: [2, 6, 4], d2: [6, 10, 4], d3: [10, 14, 4],
    bajo: [2, 4, 5], par: [4, 6, 5], rojo: [6, 8, 5], negro: [8, 10, 5], impar: [10, 12, 5], alto: [12, 14, 5],
    c1: [14, 15, 3], c2: [14, 15, 2], c3: [14, 15, 1],
};
function crearPano() {
    const pano = $("pano");
    const agregar = (clave, texto, clase, columna, fila) => {
        const b = document.createElement("button");
        b.className = `casilla ${clase}`;
        b.dataset.clave = clave;
        b.textContent = texto;
        b.style.gridColumn = columna;
        b.style.gridRow = fila;
        b.addEventListener("click", () => apostar(clave));
        pano.appendChild(b);
    };
    agregar("n0", "0", "verde", "1", "1 / 4");
    for (let n = 1; n <= 36; n++) {
        const columna = Math.ceil(n / 3) + 1;
        const fila = 3 - ((n - 1) % 3);
        agregar(`n${n}`, n, colorDe(n), `${columna}`, `${fila}`);
    }
    for (const [clave, a] of Object.entries(AFUERA)) {
        const [desde, hasta, fila] = UBICACION_AFUERA[clave];
        agregar(clave, a.texto, `afuera ${a.clase ?? ""}`, `${desde} / ${hasta}`, `${fila}`);
    }
}

function apostar(clave) {
    if (girando) return;
    const disponible = fichas() - totalApostado();
    if (ficha > disponible) return mensaje("No te alcanzan las fichas", "perdio");
    if (totalApostado() + ficha > LIMITE_APUESTA) return mensaje("Límite: 10M por tirada", "perdio");
    apuestas[clave] = (apuestas[clave] ?? 0) + ficha;
    vibrar(10);
    mensaje(`Apostado: ${formatear(totalApostado())}`);
    pintar();
}

const totalApostado = () => Object.values(apuestas).reduce((s, v) => s + v, 0);

function premioPara(clave, n) {
    if (clave.startsWith("n")) return Number(clave.slice(1)) === n ? 36 : 0;
    return AFUERA[clave].gana(n) ? AFUERA[clave].paga + 1 : 0;
}

async function girar() {
    const total = totalApostado();
    if (girando || total === 0) return;
    girando = true;
    anteriores = { ...apuestas };
    cambiarFichas(-total);
    $("resultado").hidden = true;
    document.querySelectorAll(".ganadora").forEach((c) => c.classList.remove("ganadora"));
    brilloGanador = 0;
    mensaje("No va más…");
    pintar();

    const n = ORDEN[Math.floor(Math.random() * ORDEN.length)];
    ganadorIndice = -1;
    await girarRueda(n);
    ganadorIndice = ORDEN.indexOf(n);
    brilloGanador = 1;
    const animarBrillo = () => {
        dibujar();
        if (!girando && brilloGanador > 0) requestAnimationFrame(animarBrillo);
    };
    setTimeout(animarBrillo, 0);

    let ganado = 0;
    for (const [clave, monto] of Object.entries(apuestas)) ganado += monto * premioPara(clave, n);
    cambiarFichas(ganado);

    $("resultado").textContent = n;
    $("resultado").className = `resultado ${colorDe(n)}`;
    $("resultado").hidden = false;
    historial = [n, ...historial].slice(0, 10);
    for (const c of document.querySelectorAll(".casilla")) {
        if (premioPara(c.dataset.clave, n) > 0) c.classList.add("ganadora");
    }
    const pleno = apuestas[`n${n}`];
    $("resultado").classList.toggle("pleno", Boolean(pleno));
    if (pleno) {
        mensaje(`¡PLENO AL ${n}! Ganaste ${formatear(ganado)}`, "gano");
        const caja = $("rueda").getBoundingClientRect();
        textoFlotante(caja.left + caja.width / 2, caja.top + caja.height * 0.3, "¡PLENO!", "#ffd166");
        vibrar([80, 50, 80, 50, 160]);
    }
    if (ganado > 0 && !pleno) {
        mensaje(`¡Salió ${n}! Ganaste ${formatear(ganado)}`, "gano");
        const caja = $("rueda").getBoundingClientRect();
        textoFlotante(caja.left + caja.width / 2, caja.top + caja.height / 2, `+${formatear(ganado)}`, "#ffd166");
        vibrar(60);
    } else if (!pleno) {
        mensaje(`Salió ${n}. Esta vez no`, "perdio");
        vibrar(100);
    }
    apuestas = {};
    girando = false;
    pintar();
}

function mensaje(texto, tipo = "") {
    $("mensaje").textContent = texto;
    $("mensaje").className = `mensaje-mesa ${tipo}`;
}

function pintar() {
    $("fichas").innerHTML = `${MONEDA}${formatear(fichas() - (girando ? 0 : totalApostado()))}`;
    for (const c of document.querySelectorAll(".casilla")) {
        c.querySelector(".apostado")?.remove();
        const monto = apuestas[c.dataset.clave];
        if (monto) c.insertAdjacentHTML("beforeend", `<span class="apostado" style="--c:${monto >= 500 ? "#212121" : monto >= 100 ? "#1e88e5" : monto >= 50 ? "#e53935" : "#e8e8e8"}">${formatear(monto)}</span>`);
    }
    for (const f of document.querySelectorAll(".ficha")) {
        f.classList.toggle("elegida", Number(f.dataset.valor) === ficha);
        f.disabled = girando;
    }
    const nada = totalApostado() === 0;
    $("girar").disabled = girando || nada;
    $("girar").textContent = nada && Object.keys(anteriores).length && !girando ? "Repetir apuesta" : "Girar";
    if (nada && Object.keys(anteriores).length && !girando) $("girar").disabled = false;
    $("borrar").disabled = girando || nada;
    $("recargar").hidden = !puedeRecargar() || girando;
    $("historial").innerHTML = historial.map((n) => `<span class="${colorDe(n)}">${n}</span>`).join("");
}

for (const f of document.querySelectorAll(".ficha")) {
    f.addEventListener("click", () => {
        ficha = Number(f.dataset.valor);
        pintar();
    });
}
$("borrar").addEventListener("click", () => {
    apuestas = {};
    mensaje("Elegí una ficha y tocá dónde apostar");
    pintar();
});
$("girar").addEventListener("click", () => {
    // Sin apuestas: repite las de la vuelta anterior si alcanzan las fichas
    if (totalApostado() === 0 && Object.keys(anteriores).length) {
        const costo = Object.values(anteriores).reduce((s, v) => s + v, 0);
        if (costo > fichas()) return mensaje("No te alcanzan para repetir", "perdio");
        apuestas = { ...anteriores };
    }
    girar();
});
$("recargar").addEventListener("click", () => {
    recargar();
    mensaje("¡Fichas recargadas!", "gano");
    pintar();
});

crearPano();
dibujar();
pintar();
addEventListener("fichas", () => !girando && pintar());
