// Tabla de pagos del Keno: 40 números, salen 10. PAGOS[elegidos][aciertos] = multiplicador.
// Cada fila se escala para que devuelva exactamente DEVOLUCION en promedio (probabilidad hipergeométrica).
export const NUMEROS = 40;
export const SALEN = 10;
export const DEVOLUCION = 0.95;

const BASE = {
    1: [0, 3.8],
    2: [0, 1.7, 5.2],
    3: [0, 0, 2.7, 48],
    4: [0, 0, 1.7, 10, 84],
    5: [0, 0, 1.4, 4, 14, 390],
    6: [0, 0, 0, 3, 9, 180, 710],
    7: [0, 0, 0, 2, 7, 30, 400, 800],
    8: [0, 0, 0, 2, 4, 11, 67, 400, 900],
    9: [0, 0, 0, 2, 2.5, 5, 15, 100, 500, 1000],
    10: [0, 0, 0, 1.6, 2, 4, 7, 26, 100, 500, 1000],
};

function combinaciones(n, k) {
    if (k < 0 || k > n) return 0;
    let r = 1;
    for (let i = 1; i <= k; i++) r = (r * (n - k + i)) / i;
    return r;
}
// Probabilidad de acertar a de e elegidos
export const probabilidad = (e, a) => (combinaciones(e, a) * combinaciones(NUMEROS - e, SALEN - a)) / combinaciones(NUMEROS, SALEN);

export const PAGOS = Object.fromEntries(
    Object.entries(BASE).map(([e, fila]) => {
        const esperado = fila.reduce((t, m, a) => t + m * probabilidad(Number(e), a), 0);
        const factor = DEVOLUCION / esperado;
        return [e, fila.map((m) => Math.round(m * factor * 100) / 100)];
    })
);
