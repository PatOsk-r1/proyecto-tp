// Multiplicadores por cantidad de filas y riesgo (casilla 0 = borde izquierdo).
// La bola baja eligiendo izquierda/derecha al 50% en cada fila, así que la casilla sigue una binomial.
const BASE = {
    8: {
        bajo: [5.6, 2.1, 1.1, 1, 0.5, 1, 1.1, 2.1, 5.6],
        medio: [13, 3, 1.3, 0.7, 0.4, 0.7, 1.3, 3, 13],
        alto: [29, 4, 1.5, 0.3, 0.2, 0.3, 1.5, 4, 29],
    },
    12: {
        bajo: [10, 3, 1.6, 1.4, 1.1, 1, 0.5, 1, 1.1, 1.4, 1.6, 3, 10],
        medio: [33, 11, 4, 2, 1.1, 0.6, 0.3, 0.6, 1.1, 2, 4, 11, 33],
        alto: [170, 24, 8.1, 2, 0.7, 0.2, 0.2, 0.2, 0.7, 2, 8.1, 24, 170],
    },
    16: {
        bajo: [16, 9, 2, 1.4, 1.4, 1.2, 1.1, 1, 0.5, 1, 1.1, 1.2, 1.4, 1.4, 2, 9, 16],
        medio: [110, 41, 10, 5, 3, 1.5, 1, 0.5, 0.3, 0.5, 1, 1.5, 3, 5, 10, 41, 110],
        alto: [1000, 130, 26, 9, 4, 2, 0.2, 0.2, 0.2, 0.2, 0.2, 2, 4, 9, 26, 130, 1000],
    },
};
// La casa se queda con un poco: todo se multiplica por este factor
export const AJUSTE = 0.97;
export const TABLAS = Object.fromEntries(
    Object.entries(BASE).map(([filas, riesgos]) => [
        filas,
        Object.fromEntries(Object.entries(riesgos).map(([r, lista]) => [r, lista.map((m) => Math.round(m * AJUSTE * 100) / 100)])),
    ])
);

// Combinatoria para calcular la devolución esperada (se usa en la simulación)
export function devolucion(filas, riesgo) {
    const n = Number(filas);
    let c = 1;
    let total = 0;
    TABLAS[filas][riesgo].forEach((m, k) => {
        total += (c / 2 ** n) * m;
        c = (c * (n - k)) / (k + 1);
    });
    return total;
}
