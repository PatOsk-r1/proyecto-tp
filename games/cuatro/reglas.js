// Reglas del 4 en línea: tablero de 7 columnas por 6 filas.
// Casilla = fila * COLUMNAS + columna; la fila 0 es la de abajo. 0 vacío, 1 y 2 son los jugadores.

export const COLUMNAS = 7;
export const FILAS = 6;

export function datosIniciales() {
    return { tablero: Array(COLUMNAS * FILAS).fill(0), ultimo: null };
}

// Fila donde cae una ficha en esa columna, o -1 si está llena
export function filaLibre(tablero, col) {
    for (let f = 0; f < FILAS; f++) if (!tablero[f * COLUMNAS + col]) return f;
    return -1;
}

const DIRECCIONES = [[1, 0], [0, 1], [1, 1], [1, -1]];

// Devuelve las 4 casillas ganadoras si alguien hizo 4 en línea
export function lineaGanadora(tablero) {
    for (let f = 0; f < FILAS; f++) {
        for (let c = 0; c < COLUMNAS; c++) {
            const j = tablero[f * COLUMNAS + c];
            if (!j) continue;
            for (const [dc, df] of DIRECCIONES) {
                const casillas = [];
                for (let k = 0; k < 4; k++) {
                    const cc = c + dc * k;
                    const ff = f + df * k;
                    if (cc < 0 || cc >= COLUMNAS || ff < 0 || ff >= FILAS || tablero[ff * COLUMNAS + cc] !== j) break;
                    casillas.push(ff * COLUMNAS + cc);
                }
                if (casillas.length === 4) return { jugador: j, casillas };
            }
        }
    }
    return null;
}

export const lleno = (tablero) => tablero.every(Boolean);

// ---------- Computadora: minimax con poda alfa-beta ----------
function puntajeVentana(v, yo) {
    const otro = 3 - yo;
    const mias = v.filter((x) => x === yo).length;
    const suyas = v.filter((x) => x === otro).length;
    const vacias = v.filter((x) => x === 0).length;
    if (mias === 4) return 1000;
    if (mias === 3 && vacias === 1) return 6;
    if (mias === 2 && vacias === 2) return 2;
    if (suyas === 3 && vacias === 1) return -8;
    return 0;
}

function evaluar(t, yo) {
    let total = 0;
    // El centro vale más
    for (let f = 0; f < FILAS; f++) if (t[f * COLUMNAS + 3] === yo) total += 3;
    for (let f = 0; f < FILAS; f++) {
        for (let c = 0; c < COLUMNAS; c++) {
            for (const [dc, df] of DIRECCIONES) {
                const ventana = [];
                for (let k = 0; k < 4; k++) {
                    const cc = c + dc * k;
                    const ff = f + df * k;
                    if (cc < 0 || cc >= COLUMNAS || ff < 0 || ff >= FILAS) break;
                    ventana.push(t[ff * COLUMNAS + cc]);
                }
                if (ventana.length === 4) total += puntajeVentana(ventana, yo);
            }
        }
    }
    return total;
}

const ORDEN_COLUMNAS = [3, 2, 4, 1, 5, 0, 6];

function minimax(t, profundidad, alfa, beta, maximiza, yo) {
    const g = lineaGanadora(t);
    if (g) return g.jugador === yo ? 100000 + profundidad : -100000 - profundidad;
    if (lleno(t)) return 0;
    if (profundidad === 0) return evaluar(t, yo);
    const quien = maximiza ? yo : 3 - yo;
    let mejor = maximiza ? -Infinity : Infinity;
    for (const c of ORDEN_COLUMNAS) {
        const f = filaLibre(t, c);
        if (f < 0) continue;
        t[f * COLUMNAS + c] = quien;
        const v = minimax(t, profundidad - 1, alfa, beta, !maximiza, yo);
        t[f * COLUMNAS + c] = 0;
        if (maximiza) {
            mejor = Math.max(mejor, v);
            alfa = Math.max(alfa, v);
        } else {
            mejor = Math.min(mejor, v);
            beta = Math.min(beta, v);
        }
        if (beta <= alfa) break;
    }
    return mejor;
}

export function jugadaCompu(tablero, yo, profundidad) {
    const t = [...tablero];
    let mejores = [];
    let mejorValor = -Infinity;
    for (const c of ORDEN_COLUMNAS) {
        const f = filaLibre(t, c);
        if (f < 0) continue;
        t[f * COLUMNAS + c] = yo;
        const v = minimax(t, profundidad - 1, -Infinity, Infinity, false, yo);
        t[f * COLUMNAS + c] = 0;
        if (v > mejorValor) {
            mejorValor = v;
            mejores = [c];
        } else if (v === mejorValor) {
            mejores.push(c);
        }
    }
    return mejores[Math.floor(Math.random() * mejores.length)];
}
