// Multiplicadores por cantidad de filas y riesgo (casilla 0 = borde izquierdo).
// Las probabilidades de cada casilla salen de distribucion() (ver INERCIA).
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
// La bola tiene inercia: en cada clavo sigue para el mismo lado que venía con esta probabilidad.
// Así rebota más hacia los costados y llega a los multiplicadores grandes bastante más seguido.
export const INERCIA = 0.55;

// Probabilidad de caer en cada casilla (camino con inercia; el primer rebote es 50/50)
export function distribucion(filas) {
    const n = Number(filas);
    let estados = new Map([["0,", 1]]); // "derechas,ultimoLado" → probabilidad
    for (let i = 0; i < n; i++) {
        const nuevos = new Map();
        for (const [clave, p] of estados) {
            const [k, ultimo] = clave.split(",");
            const pDerecha = ultimo === "" ? 0.5 : ultimo === "d" ? INERCIA : 1 - INERCIA;
            for (const [lado, pp] of [["d", pDerecha], ["i", 1 - pDerecha]]) {
                const nueva = `${Number(k) + (lado === "d" ? 1 : 0)},${lado}`;
                nuevos.set(nueva, (nuevos.get(nueva) ?? 0) + p * pp);
            }
        }
        estados = nuevos;
    }
    const casillas = new Array(n + 1).fill(0);
    for (const [clave, p] of estados) casillas[Number(clave.split(",")[0])] += p;
    return casillas;
}

// La casa se queda con un poco: cada tabla se ajusta para devolver este promedio
export const DEVOLUCION = 0.99;
const redondear = (m) => (m >= 100 ? Math.round(m) : m >= 10 ? Math.round(m * 10) / 10 : Math.round(m * 100) / 100);
export const TABLAS = Object.fromEntries(
    Object.entries(BASE).map(([filas, riesgos]) => {
        const probabilidades = distribucion(filas);
        return [
            filas,
            Object.fromEntries(
                Object.entries(riesgos).map(([r, lista]) => {
                    const promedio = lista.reduce((t, m, k) => t + m * probabilidades[k], 0);
                    return [r, lista.map((m) => redondear((m * DEVOLUCION) / promedio))];
                })
            ),
        ];
    })
);

// Devolución esperada (se usa en la simulación)
export function devolucion(filas, riesgo) {
    const probabilidades = distribucion(filas);
    return TABLAS[filas][riesgo].reduce((t, m, k) => t + m * probabilidades[k], 0);
}
