// Reglas del ta-te-tí. Casillas 0 a 8; 0 vacío, 1 = X (el que crea la partida), 2 = O.

export function datosIniciales() {
    return { tablero: Array(9).fill(0), ultimo: null };
}

const LINEAS = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];

export function lineaGanadora(t) {
    for (const l of LINEAS) if (t[l[0]] && t[l[0]] === t[l[1]] && t[l[1]] === t[l[2]]) return { jugador: t[l[0]], casillas: l };
    return null;
}

export const lleno = (t) => t.every(Boolean);

function minimax(t, turno, yo) {
    const g = lineaGanadora(t);
    if (g) return g.jugador === yo ? 10 : -10;
    if (lleno(t)) return 0;
    const valores = [];
    for (let i = 0; i < 9; i++) {
        if (t[i]) continue;
        t[i] = turno;
        valores.push(minimax(t, 3 - turno, yo));
        t[i] = 0;
    }
    return turno === yo ? Math.max(...valores) : Math.min(...valores);
}

// nivel 0: al azar · 1: a veces se equivoca · 2: no pierde nunca
export function jugadaCompu(tablero, yo, nivel) {
    const libres = tablero.flatMap((v, i) => (v ? [] : [i]));
    if (nivel === 0 || (nivel === 1 && Math.random() < 0.35)) return libres[Math.floor(Math.random() * libres.length)];
    let mejor = -Infinity;
    let opciones = [];
    for (const i of libres) {
        const t = [...tablero];
        t[i] = yo;
        const v = minimax(t, 3 - yo, yo);
        if (v > mejor) {
            mejor = v;
            opciones = [i];
        } else if (v === mejor) {
            opciones.push(i);
        }
    }
    return opciones[Math.floor(Math.random() * opciones.length)];
}
