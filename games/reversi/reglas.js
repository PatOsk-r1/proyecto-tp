// Reglas del Reversi (8x8). 0 vacío, 1 negras (empiezan), 2 blancas.
// Una jugada es válida si encierra fichas rivales en línea; esas fichas se dan vuelta.

const DIRS = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];

export function datosIniciales() {
    const tablero = Array(64).fill(0);
    tablero[27] = tablero[36] = 2;
    tablero[28] = tablero[35] = 1;
    return { tablero, ultimo: null, jugadas: 0 };
}

// Fichas que se dan vuelta si j juega en la casilla i
export function volteadas(t, i, j) {
    if (t[i]) return [];
    const f = Math.floor(i / 8);
    const c = i % 8;
    const res = [];
    for (const [df, dc] of DIRS) {
        const linea = [];
        let ff = f + df;
        let cc = c + dc;
        while (ff >= 0 && ff < 8 && cc >= 0 && cc < 8 && t[ff * 8 + cc] === 3 - j) {
            linea.push(ff * 8 + cc);
            ff += df;
            cc += dc;
        }
        if (linea.length && ff >= 0 && ff < 8 && cc >= 0 && cc < 8 && t[ff * 8 + cc] === j) res.push(...linea);
    }
    return res;
}

export const jugadasValidas = (t, j) => t.flatMap((_, i) => (volteadas(t, i, j).length ? [i] : []));

export function aplicar(t, i, j) {
    const nuevo = [...t];
    for (const k of volteadas(t, i, j)) nuevo[k] = j;
    nuevo[i] = j;
    return nuevo;
}

export const cuenta = (t, j) => t.filter((v) => v === j).length;

// Quién juega después: el rival si puede, si no repite el mismo; null si nadie puede (fin)
export function siguienteTurno(t, j) {
    if (jugadasValidas(t, 3 - j).length) return 3 - j;
    if (jugadasValidas(t, j).length) return j;
    return null;
}

// Valor de cada casilla para la computadora: esquinas buenísimas, al lado de esquinas malas
const PESOS = [
    100, -20, 10, 5, 5, 10, -20, 100,
    -20, -50, -2, -2, -2, -2, -50, -20,
    10, -2, 1, 1, 1, 1, -2, 10,
    5, -2, 1, 0, 0, 1, -2, 5,
    5, -2, 1, 0, 0, 1, -2, 5,
    10, -2, 1, 1, 1, 1, -2, 10,
    -20, -50, -2, -2, -2, -2, -50, -20,
    100, -20, 10, 5, 5, 10, -20, 100,
];

export function valorPara(t, j) {
    let v = 0;
    t.forEach((x, i) => {
        if (x === j) v += PESOS[i];
        else if (x) v -= PESOS[i];
    });
    return v + (jugadasValidas(t, j).length - jugadasValidas(t, 3 - j).length) * 5;
}
