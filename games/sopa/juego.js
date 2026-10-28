// Sopa de letras con temas. Se marca una palabra deslizando de la primera a la última letra.
import { cargar, guardar, vibrar } from "../../js/comun3d.js";

const $ = (id) => document.getElementById(id);
const CLAVE = "sopa";
const TEMAS = {
    Animales: ["PERRO", "GATO", "CABALLO", "TIGRE", "JIRAFA", "DELFIN", "AGUILA", "CONEJO", "TORTUGA", "PINGUINO", "LEON", "ZORRO", "BALLENA", "CAMELLO"],
    Frutas: ["MANZANA", "BANANA", "NARANJA", "FRUTILLA", "SANDIA", "MELON", "UVA", "PERA", "DURAZNO", "CEREZA", "KIWI", "ANANA", "LIMON", "MANGO"],
    Deportes: ["FUTBOL", "TENIS", "RUGBY", "HOCKEY", "BOXEO", "NATACION", "VOLEY", "GOLF", "CICLISMO", "PADEL", "BASQUET", "KARATE", "REMO", "ESGRIMA"],
    Países: ["ARGENTINA", "CHILE", "URUGUAY", "BRASIL", "PERU", "MEXICO", "ESPAÑA", "ITALIA", "FRANCIA", "JAPON", "CANADA", "EGIPTO", "CHINA", "INDIA"],
    Colores: ["ROJO", "AZUL", "VERDE", "AMARILLO", "VIOLETA", "NARANJA", "ROSA", "NEGRO", "BLANCO", "CELESTE", "GRIS", "MARRON", "DORADO", "TURQUESA"],
};
const NIVELES = [
    { lado: 9, palabras: 6, dirs: [[0, 1], [1, 0]] },
    { lado: 11, palabras: 8, dirs: [[0, 1], [1, 0], [1, 1], [-1, 1]] },
    { lado: 12, palabras: 10, dirs: [[0, 1], [1, 0], [1, 1], [-1, 1], [0, -1], [-1, 0], [-1, -1], [1, -1]] },
];
const COLORES = ["#ffd23f", "#7ee08f", "#7df9ff", "#ff8fab", "#c9a7ff", "#ffb36b", "#a0f0a0", "#ff6b6b", "#4cc9f0", "#f4a261"];
const LETRAS = "AAAABCDEEEEFGHIIIJLMNNOOOPQRRSSTTUUVXYZÑ";

const estado = cargar(CLAVE, { nivel: 1, completadas: 0 });
let j = null;
let reloj = null;
let arrastre = null;

function generar() {
    const n = NIVELES[estado.nivel];
    const nombresTemas = Object.keys(TEMAS);
    const tema = nombresTemas[Math.floor(Math.random() * nombresTemas.length)];
    const candidatas = TEMAS[tema].filter((p) => p.length <= n.lado).sort(() => Math.random() - 0.5);
    const grilla = Array(n.lado * n.lado).fill("");
    const ubicadas = [];
    for (const palabra of candidatas) {
        if (ubicadas.length >= n.palabras) break;
        for (let intento = 0; intento < 150; intento++) {
            const [df, dc] = n.dirs[Math.floor(Math.random() * n.dirs.length)];
            const f0 = Math.floor(Math.random() * n.lado);
            const c0 = Math.floor(Math.random() * n.lado);
            const celdas = [...palabra].map((_, k) => [f0 + df * k, c0 + dc * k]);
            if (celdas.some(([f, c]) => f < 0 || c < 0 || f >= n.lado || c >= n.lado)) continue;
            if (celdas.some(([f, c], k) => grilla[f * n.lado + c] && grilla[f * n.lado + c] !== palabra[k])) continue;
            celdas.forEach(([f, c], k) => (grilla[f * n.lado + c] = palabra[k]));
            ubicadas.push({ palabra, desde: celdas[0], hasta: celdas.at(-1), hallada: false });
            break;
        }
    }
    for (let i = 0; i < grilla.length; i++) if (!grilla[i]) grilla[i] = LETRAS[Math.floor(Math.random() * LETRAS.length)];
    j = { lado: n.lado, grilla, palabras: ubicadas, tema, segundos: 0 };
    dibujar();
    clearInterval(reloj);
    reloj = setInterval(() => {
        if (document.visibilityState !== "visible") return;
        j.segundos++;
        $("tiempo").textContent = `${Math.floor(j.segundos / 60)}:${String(j.segundos % 60).padStart(2, "0")}`;
    }, 1000);
    $("tiempo").textContent = "0:00";
}

function dibujar() {
    const letras = $("letras");
    letras.style.gridTemplateColumns = `repeat(${j.lado}, 1fr)`;
    const tamano = $("hoja").getBoundingClientRect().width / j.lado;
    letras.innerHTML = j.grilla.map((l) => `<div class="letra" style="font-size:${tamano * 0.55}px">${l}</div>`).join("");
    $("tema").textContent = `Tema: ${j.tema}`;
    pintarPalabras();
    pintarMarcas();
}

function pintarPalabras() {
    $("palabras").innerHTML = j.palabras
        .map((p, k) => `<span class="palabra${p.hallada ? " hallada" : ""}" style="--c:${COLORES[k % COLORES.length]}">${p.palabra}</span>`)
        .join("");
    const halladas = j.palabras.filter((p) => p.hallada).length;
    $("encontradas").textContent = `${halladas}/${j.palabras.length}`;
    $("completadas").textContent = estado.completadas;
}

// Cápsulas de color sobre las palabras encontradas (y la que se está marcando)
function capsula(desde, hasta, color, opacidad) {
    const t = 100 / j.lado;
    const x1 = (desde[1] + 0.5) * t;
    const y1 = (desde[0] + 0.5) * t;
    const x2 = (hasta[1] + 0.5) * t;
    const y2 = (hasta[0] + 0.5) * t;
    return `<line x1="${x1}%" y1="${y1}%" x2="${x2}%" y2="${y2}%" stroke="${color}" stroke-opacity="${opacidad}" stroke-linecap="round" stroke-width="${t * 0.78}%"/>`;
}

function pintarMarcas() {
    let svg = j.palabras.map((p, k) => (p.hallada ? capsula(p.desde, p.hasta, COLORES[k % COLORES.length], 0.75) : "")).join("");
    if (arrastre?.hasta) svg += capsula(arrastre.desde, arrastre.hasta, "#ff9f1c", 0.55);
    $("marcas").innerHTML = svg;
}

function celdaEn(e) {
    const caja = $("letras").getBoundingClientRect();
    const c = Math.floor(((e.clientX - caja.left) / caja.width) * j.lado);
    const f = Math.floor(((e.clientY - caja.top) / caja.height) * j.lado);
    return f >= 0 && c >= 0 && f < j.lado && c < j.lado ? [f, c] : null;
}

// Ajusta el final a una línea recta (horizontal, vertical o diagonal)
function enLinea(desde, hacia) {
    const df = hacia[0] - desde[0];
    const dc = hacia[1] - desde[1];
    const largo = Math.max(Math.abs(df), Math.abs(dc));
    if (!largo) return desde;
    const sf = Math.round(df / largo);
    const sc = Math.round(dc / largo);
    return [desde[0] + sf * largo, desde[1] + sc * largo].map((v) => Math.max(0, Math.min(j.lado - 1, v)));
}

$("hoja").addEventListener("pointerdown", (e) => {
    const c = celdaEn(e);
    if (!c || !j) return;
    arrastre = { desde: c, hasta: c };
    $("hoja").setPointerCapture(e.pointerId);
    pintarMarcas();
});
$("hoja").addEventListener("pointermove", (e) => {
    if (!arrastre) return;
    const c = celdaEn(e);
    if (c) arrastre.hasta = enLinea(arrastre.desde, c);
    pintarMarcas();
});
$("hoja").addEventListener("pointerup", () => {
    if (!arrastre) return;
    const { desde, hasta } = arrastre;
    arrastre = null;
    const igual = (a, b) => a[0] === b[0] && a[1] === b[1];
    const p = j.palabras.find((x) => !x.hallada && ((igual(x.desde, desde) && igual(x.hasta, hasta)) || (igual(x.desde, hasta) && igual(x.hasta, desde))));
    if (p) {
        p.hallada = true;
        vibrar(40);
        pintarPalabras();
        if (j.palabras.every((x) => x.hallada)) fin();
    }
    pintarMarcas();
});

function fin() {
    clearInterval(reloj);
    estado.completadas++;
    guardar(CLAVE, estado);
    vibrar(100);
    setTimeout(() => {
        $("titulo-centro").innerHTML = `¡Completaste la sopa!<div class="chico">${j.tema} · ${$("tiempo").textContent}</div>`;
        $("jugar").textContent = "Otra sopa";
        $("centro").hidden = false;
        pintarPalabras();
    }, 500);
}

for (const b of document.querySelectorAll(".dificultad button")) {
    b.addEventListener("click", () => {
        estado.nivel = Number(b.dataset.nivel);
        guardar(CLAVE, estado);
        for (const x of document.querySelectorAll(".dificultad button")) x.classList.toggle("activa", x === b);
    });
}
for (const x of document.querySelectorAll(".dificultad button")) x.classList.toggle("activa", Number(x.dataset.nivel) === estado.nivel);
$("jugar").addEventListener("click", () => {
    $("centro").hidden = true;
    generar();
});
new ResizeObserver(() => j && dibujar()).observe($("hoja"));
generar();
