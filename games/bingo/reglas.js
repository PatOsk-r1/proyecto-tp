// Reglas del Bingo de 75 bolillas: cartón de 5×5 con el centro libre, salen BOLILLAS bolillas.
// Se cobra según cuántas líneas (filas, columnas y diagonales) se completan; el cartón lleno paga el pozo.
export const BOLILLAS = 32;
export const PAGOS = { 1: 3.1, 2: 12, 3: 100, 4: 300, 5: 1000 }; // líneas → multiplicador (5 o más = 1000), RTP ≈ 95,5%
export const CARTON_LLENO = 5000;

export function nuevoCarton(azar = Math.random) {
    // Columna B: 1-15, I: 16-30, N: 31-45, G: 46-60, O: 61-75
    const columnas = [0, 1, 2, 3, 4].map((k) => {
        const disponibles = Array.from({ length: 15 }, (_, i) => k * 15 + i + 1);
        const elegidos = [];
        while (elegidos.length < 5) elegidos.push(disponibles.splice(Math.floor(azar() * disponibles.length), 1)[0]);
        return elegidos;
    });
    // carton[fila][col]; el centro es 0 (libre)
    const carton = [0, 1, 2, 3, 4].map((f) => columnas.map((col) => col[f]));
    carton[2][2] = 0;
    return carton;
}

export function sacarBolillas(azar = Math.random) {
    const bolsa = Array.from({ length: 75 }, (_, i) => i + 1);
    for (let i = bolsa.length - 1; i > 0; i--) {
        const j = Math.floor(azar() * (i + 1));
        [bolsa[i], bolsa[j]] = [bolsa[j], bolsa[i]];
    }
    return bolsa.slice(0, BOLILLAS);
}

export const LINEAS = [
    ...[0, 1, 2, 3, 4].map((f) => [0, 1, 2, 3, 4].map((c) => [f, c])),
    ...[0, 1, 2, 3, 4].map((c) => [0, 1, 2, 3, 4].map((f) => [f, c])),
    [0, 1, 2, 3, 4].map((k) => [k, k]),
    [0, 1, 2, 3, 4].map((k) => [k, 4 - k]),
];

export function resultado(carton, salieron) {
    const marcado = (f, c) => carton[f][c] === 0 || salieron.has(carton[f][c]);
    const lineas = LINEAS.filter((l) => l.every(([f, c]) => marcado(f, c)));
    const lleno = carton.every((fila, f) => fila.every((_, c) => marcado(f, c)));
    const multi = lleno ? CARTON_LLENO : PAGOS[Math.min(5, lineas.length)] ?? 0;
    return { lineas, lleno, multi };
}
