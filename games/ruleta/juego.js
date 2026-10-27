// Ruleta europea (un solo cero). Usa las fichas compartidas del casino.
import { formatear, textoFlotante, vibrar, MONEDA } from "../../js/comun3d.js";
import { fichas, cambiarFichas, recargar } from "../../js/fichas.js";

const $ = (id) => document.getElementById(id);

const ORDEN = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26];
const ROJOS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
const colorDe = (n) => (n === 0 ? "verde" : ROJOS.has(n) ? "rojo" : "negro");
const SEGMENTO = (Math.PI * 2) / ORDEN.length;

// Apuestas de afuera: qué números cubren y cuánto pagan (además de devolver lo apostado)
const AFUERA = {
    d1: { texto: "1ª docena", paga: 2, gana: (n) => n >= 1 && n <= 12 },
    d2: { texto: "2ª docena", paga: 2, gana: (n) => n >= 13 && n <= 24 },
    d3: { texto: "3ª docena", paga: 2, gana: (n) => n >= 25 },
    bajo: { texto: "1 a 18", paga: 1, gana: (n) => n >= 1 && n <= 18 },
    par: { texto: "Par", paga: 1, gana: (n) => n > 0 && n % 2 === 0 },
    rojo: { texto: "Rojo", paga: 1, gana: (n) => ROJOS.has(n), clase: "rojo" },
    negro: { texto: "Negro", paga: 1, gana: (n) => n > 0 && !ROJOS.has(n), clase: "negro" },
    impar: { texto: "Impar", paga: 1, gana: (n) => n % 2 === 1 },
    alto: { texto: "19 a 36", paga: 1, gana: (n) => n >= 19 },
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

    // Bola
    const bx = C + Math.cos(anguloBola - Math.PI / 2) * radioBola;
    const by = C + Math.sin(anguloBola - Math.PI / 2) * radioBola;
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
            // La bola baja de la pista al número en el último tramo
            radioBola = C * (t < 0.7 ? 0.88 : 0.88 - ((t - 0.7) / 0.3) * 0.16);
            dibujar();
            if (t < 1) requestAnimationFrame(cuadro);
            else resolver();
        }
        requestAnimationFrame(cuadro);
    });
}

// ---------- Paño ----------
function crearPano() {
    const pano = $("pano");
    const agregar = (clave, texto, clase) => {
        const b = document.createElement("button");
        b.className = `casilla ${clase}`;
        b.dataset.clave = clave;
        b.textContent = texto;
        b.addEventListener("click", () => apostar(clave));
        pano.appendChild(b);
    };
    agregar("n0", "0", "verde cero");
    for (let n = 1; n <= 36; n++) agregar(`n${n}`, n, colorDe(n));
    for (const [clave, a] of Object.entries(AFUERA)) agregar(clave, a.texto, `ancha ${a.clase ?? ""}`);
}

function apostar(clave) {
    if (girando) return;
    const disponible = fichas() - totalApostado();
    if (ficha > disponible) return mensaje("No te alcanzan las fichas", "perdio");
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
    mensaje("No va más…");
    pintar();

    const n = ORDEN[Math.floor(Math.random() * ORDEN.length)];
    await girarRueda(n);

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
    if (ganado > 0) {
        mensaje(`¡Salió ${n}! Ganaste ${formatear(ganado)}`, "gano");
        const caja = $("rueda").getBoundingClientRect();
        textoFlotante(caja.left + caja.width / 2, caja.top + caja.height / 2, `+${formatear(ganado)}`, "#ffd166");
        vibrar(60);
    } else {
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
        if (monto) c.insertAdjacentHTML("beforeend", `<span class="apostado">${formatear(monto)}</span>`);
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
    $("recargar").hidden = fichas() >= 10 || girando;
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
