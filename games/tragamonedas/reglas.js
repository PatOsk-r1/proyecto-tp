// Reglas del tragamonedas (sin pantalla, para poder simularlas): 5 rodillos, 3 filas y 10 líneas.
// pagos = multiplicador de la apuesta por línea con 3, 4 o 5 iguales desde la izquierda.
export const SIMBOLOS = {
    cereza: { peso: 30, pagos: [6, 15, 40] },
    limon: { peso: 28, pagos: [6, 16, 40] },
    uva: { peso: 24, pagos: [8, 20, 60] },
    campana: { peso: 18, pagos: [12, 35, 100] },
    bar: { peso: 14, pagos: [18, 60, 180] },
    estrella: { peso: 10, pagos: [20, 80, 250] },
    diamante: { peso: 7, pagos: [30, 120, 500] },
    siete: { peso: 4, pagos: [60, 300, 1500] },
    comodin: { peso: 4, pagos: [60, 300, 1500] },
    bono: { peso: 4, pagos: [0, 0, 0] },
};
export const NOMBRES = Object.keys(SIMBOLOS);
const PESO_TOTAL = NOMBRES.reduce((t, s) => t + SIMBOLOS[s].peso, 0);

export const LINEAS = [
    [1, 1, 1, 1, 1],
    [0, 0, 0, 0, 0],
    [2, 2, 2, 2, 2],
    [0, 1, 2, 1, 0],
    [2, 1, 0, 1, 2],
    [0, 0, 1, 2, 2],
    [2, 2, 1, 0, 0],
    [1, 0, 0, 0, 1],
    [1, 2, 2, 2, 1],
    [0, 1, 0, 1, 0],
];

// Bonos por cantidad de monedas BONO en cualquier lugar: giros gratis y premio en apuestas totales
export const GIROS_GRATIS = { 3: 8, 4: 12, 5: 20 };
export const PAGO_BONO = { 3: 3, 4: 10, 5: 50 };
export const MULT_GRATIS = 2;
export const PROB_RUEDA = 1 / 110;

export const POZOS = {
    mini: { base: 500, aporte: 0.004 },
    mayor: { base: 3000, aporte: 0.006 },
    gran: { base: 25000, aporte: 0.01 },
};
// Rueda del pozo: lo que puede tocar
export const RUEDA = [
    { tipo: "mult", valor: 10 },
    { tipo: "pozo", valor: "mini" },
    { tipo: "mult", valor: 20 },
    { tipo: "pozo", valor: "mayor" },
    { tipo: "mult", valor: 10 },
    { tipo: "pozo", valor: "mini" },
    { tipo: "mult", valor: 50 },
    { tipo: "pozo", valor: "gran" },
    { tipo: "mult", valor: 15 },
    { tipo: "pozo", valor: "mini" },
    { tipo: "mult", valor: 25 },
    { tipo: "pozo", valor: "mayor" },
];

export function sortear(azar = Math.random) {
    let r = azar() * PESO_TOTAL;
    for (const s of NOMBRES) {
        r -= SIMBOLOS[s].peso;
        if (r < 0) return s;
    }
    return "cereza";
}

// Grilla [rodillo][fila]
export const tirada = (azar = Math.random) => Array.from({ length: 5 }, () => Array.from({ length: 3 }, () => sortear(azar)));

// Evalúa una tirada. apuestaLinea = apuesta total / 10. Devuelve premios por línea y bonos.
export function evaluar(grilla, apuestaLinea, gratis = false) {
    const premios = [];
    LINEAS.forEach((linea, indice) => {
        const simbolos = linea.map((fila, r) => grilla[r][fila]);
        if (simbolos[0] === "bono") return;
        // El primer símbolo que no es comodín define la línea
        const base = simbolos.find((s) => s !== "comodin") ?? "comodin";
        if (base === "bono") return;
        let cantidad = 0;
        for (const s of simbolos) {
            if (s === base || s === "comodin") cantidad++;
            else break;
        }
        if (cantidad < 3) return;
        const pago = SIMBOLOS[base].pagos[cantidad - 3] * apuestaLinea * (gratis ? MULT_GRATIS : 1);
        premios.push({ linea: indice, simbolo: base, cantidad, pago, celdas: linea.slice(0, cantidad).map((fila, r) => [r, fila]) });
    });
    const bonos = grilla.flat().filter((s) => s === "bono").length;
    const celdasBono = [];
    grilla.forEach((col, r) => col.forEach((s, f) => s === "bono" && celdasBono.push([r, f])));
    const total = premios.reduce((t, p) => t + p.pago, 0) + (PAGO_BONO[bonos] ?? 0) * apuestaLinea * 10;
    // Cinco sietes de verdad (con comodines) en una línea: gran pozo
    const granPozo = premios.some((p) => p.simbolo === "siete" && p.cantidad === 5);
    return { premios, total, bonos, celdasBono, giros: GIROS_GRATIS[Math.min(bonos, 5)] ?? 0, granPozo };
}
