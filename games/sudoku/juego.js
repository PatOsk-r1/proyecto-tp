// Sudoku con generador propio: cada tablero tiene una sola solución.
import { cargar, guardar, vibrar } from "../../js/comun3d.js";

const $ = (id) => document.getElementById(id);
const CLAVE = "sudoku";
const PISTAS_POR_NIVEL = [40, 32, 26];
const NOMBRES = ["Fácil", "Medio", "Difícil"];
const MAX_ERRORES = 3;

const estado = cargar(CLAVE, { nivel: 0, partida: null, ganados: [0, 0, 0] });
let p = null; // { inicial, solucion, actual, notas, errores, segundos }
let elegida = -1;
let modoNotas = false;
let reloj = null;

// ---------- Generador y solucionador ----------
const fila = (i) => Math.floor(i / 9);
const col = (i) => i % 9;
const cuadro = (i) => Math.floor(fila(i) / 3) * 3 + Math.floor(col(i) / 3);
const relacionadas = (i) => Array.from({ length: 81 }, (_, k) => k).filter((k) => k !== i && (fila(k) === fila(i) || col(k) === col(i) || cuadro(k) === cuadro(i)));
const VECINAS = Array.from({ length: 81 }, (_, i) => relacionadas(i));

function candidatos(t, i) {
    const usados = new Set(VECINAS[i].map((k) => t[k]));
    return [1, 2, 3, 4, 5, 6, 7, 8, 9].filter((n) => !usados.has(n));
}

// Cuenta soluciones (corta al llegar a "limite"); si "aleatorio", llena el tablero en orden al azar
function resolver(t, limite = 2, aleatorio = false) {
    let mejor = -1;
    let opciones = null;
    for (let i = 0; i < 81; i++) {
        if (t[i]) continue;
        const c = candidatos(t, i);
        if (!c.length) return 0;
        if (!opciones || c.length < opciones.length) {
            mejor = i;
            opciones = c;
        }
    }
    if (mejor < 0) return 1;
    if (aleatorio) opciones.sort(() => Math.random() - 0.5);
    let total = 0;
    for (const n of opciones) {
        t[mejor] = n;
        total += resolver(t, limite - total, aleatorio);
        if (total >= limite) {
            if (!aleatorio) t[mejor] = 0;
            return total;
        }
    }
    t[mejor] = 0;
    return total;
}

function generar(pistas) {
    const solucion = Array(81).fill(0);
    resolver(solucion, 1, true);
    const inicial = [...solucion];
    const orden = Array.from({ length: 81 }, (_, i) => i).sort(() => Math.random() - 0.5);
    let quedan = 81;
    for (const i of orden) {
        if (quedan <= pistas) break;
        const guardado = inicial[i];
        inicial[i] = 0;
        if (resolver([...inicial], 2) !== 1) inicial[i] = guardado;
        else quedan--;
    }
    return { inicial, solucion };
}

// ---------- Interfaz ----------
const celdas = Array.from({ length: 81 }, (_, i) => {
    const b = document.createElement("button");
    b.className = `celda-s${col(i) === 2 || col(i) === 5 ? " borde-d" : ""}${fila(i) === 2 || fila(i) === 5 ? " borde-a" : ""}`;
    b.addEventListener("click", () => {
        elegida = i;
        vibrar(5);
        pintar();
    });
    $("grilla").appendChild(b);
    return b;
});

const teclas = [1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => {
    const b = document.createElement("button");
    b.className = "tecla";
    b.textContent = n;
    b.addEventListener("click", () => poner(n));
    $("teclado").appendChild(b);
    return b;
});

function poner(n) {
    if (!p || elegida < 0 || p.inicial[elegida] || p.actual[elegida] === p.solucion[elegida]) return;
    if (modoNotas) {
        const notas = new Set(p.notas[elegida]);
        notas.has(n) ? notas.delete(n) : notas.add(n);
        p.notas[elegida] = [...notas];
    } else {
        p.actual[elegida] = n;
        p.notas[elegida] = [];
        if (n !== p.solucion[elegida]) {
            p.errores++;
            vibrar(120);
            if (p.errores >= MAX_ERRORES) return terminar(false);
        } else {
            // Borra esa nota de las casillas relacionadas
            for (const k of VECINAS[elegida]) p.notas[k] = p.notas[k].filter((x) => x !== n);
            vibrar(15);
            celdas[elegida].classList.add("ok");
            setTimeout(() => celdas[elegida]?.classList.remove("ok"), 500);
            if (p.actual.every((v, i) => v === p.solucion[i])) return terminar(true);
        }
    }
    guardarPartida();
    pintar();
}

function pintar() {
    if (!p) return;
    const valor = elegida >= 0 ? p.actual[elegida] : 0;
    celdas.forEach((c, i) => {
        const v = p.actual[i];
        c.className = c.className.replace(/ (fija|relacionada|igual|elegida|error)/g, "");
        if (p.inicial[i]) c.classList.add("fija");
        if (elegida >= 0 && VECINAS[elegida].includes(i)) c.classList.add("relacionada");
        if (valor && v === valor) c.classList.add("igual");
        if (i === elegida) c.classList.add("elegida");
        if (v && v !== p.solucion[i]) c.classList.add("error");
        c.innerHTML = v
            ? v
            : p.notas[i].length
              ? `<span class="notas">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => `<span>${p.notas[i].includes(n) ? n : ""}</span>`).join("")}</span>`
              : "";
    });
    teclas.forEach((t, k) => t.classList.toggle("agotada", p.actual.filter((v, i) => v === k + 1 && v === p.solucion[i]).length >= 9));
    $("errores").textContent = `${p.errores}/${MAX_ERRORES}`;
    $("nivel").textContent = NOMBRES[p.nivel];
    $("notas").classList.toggle("activo", modoNotas);
}

function pintarTiempo() {
    const s = p?.segundos ?? 0;
    $("tiempo").textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function arrancarReloj() {
    clearInterval(reloj);
    reloj = setInterval(() => {
        if (document.visibilityState !== "visible" || !p) return;
        p.segundos++;
        pintarTiempo();
        if (p.segundos % 10 === 0) guardarPartida();
    }, 1000);
}

function guardarPartida() {
    estado.partida = p;
    guardar(CLAVE, estado);
}

function terminar(gano) {
    clearInterval(reloj);
    if (gano) estado.ganados[p.nivel]++;
    estado.partida = null;
    guardar(CLAVE, estado);
    vibrar(gano ? 90 : 160);
    $("titulo-centro").innerHTML = gano
        ? `¡Resuelto!<div class="chico">${NOMBRES[p.nivel]} en ${$("tiempo").textContent} · ${p.errores} errores</div>`
        : `Se terminaron los intentos<div class="chico">Tuviste ${MAX_ERRORES} errores</div>`;
    $("continuar").hidden = true;
    $("centro").hidden = false;
    pintar();
}

function empezar() {
    $("titulo-centro").innerHTML = 'Armando el sudoku…<div class="chico">Un segundo</div>';
    setTimeout(() => {
        const { inicial, solucion } = generar(PISTAS_POR_NIVEL[estado.nivel]);
        p = { nivel: estado.nivel, inicial, solucion, actual: [...inicial], notas: Array.from({ length: 81 }, () => []), errores: 0, segundos: 0 };
        elegida = -1;
        guardarPartida();
        $("centro").hidden = true;
        pintar();
        pintarTiempo();
        arrancarReloj();
    }, 30);
}

$("notas").addEventListener("click", () => {
    modoNotas = !modoNotas;
    pintar();
});
$("borrar").addEventListener("click", () => {
    if (!p || elegida < 0 || p.inicial[elegida] || p.actual[elegida] === p.solucion[elegida]) return;
    p.actual[elegida] = 0;
    p.notas[elegida] = [];
    guardarPartida();
    pintar();
});
$("pista").addEventListener("click", () => {
    if (!p) return;
    const vacias = p.actual.flatMap((v, i) => (v === p.solucion[i] ? [] : [i]));
    const i = elegida >= 0 && vacias.includes(elegida) ? elegida : vacias[Math.floor(Math.random() * vacias.length)];
    if (i === undefined) return;
    elegida = i;
    const viejo = modoNotas;
    modoNotas = false;
    poner(p.solucion[i]);
    modoNotas = viejo;
});
$("menu").addEventListener("click", () => {
    clearInterval(reloj);
    $("titulo-centro").innerHTML = 'Sudoku<div class="chico">Tu partida queda guardada</div>';
    $("continuar").hidden = !p;
    $("centro").hidden = false;
});
$("continuar").addEventListener("click", () => {
    $("centro").hidden = true;
    arrancarReloj();
});
$("jugar").addEventListener("click", empezar);
for (const b of document.querySelectorAll(".dificultad button")) {
    b.addEventListener("click", () => {
        estado.nivel = Number(b.dataset.nivel);
        guardar(CLAVE, estado);
        for (const x of document.querySelectorAll(".dificultad button")) x.classList.toggle("activa", x === b);
    });
}
for (const x of document.querySelectorAll(".dificultad button")) x.classList.toggle("activa", Number(x.dataset.nivel) === estado.nivel);

// Teclado físico (en la compu)
addEventListener("keydown", (e) => {
    if (/^[1-9]$/.test(e.key)) poner(Number(e.key));
    if (e.key === "Backspace" || e.key === "Delete") $("borrar").click();
});

if (estado.partida) {
    p = estado.partida;
    $("continuar").hidden = false;
    pintar();
    pintarTiempo();
}
