// Reglas de las damas (clásicas de 8x8): las fichas mueven en diagonal hacia adelante,
// comer es obligatorio, se puede comer varias seguidas y al llegar al fondo se coronan.
// Casilla = fila * 8 + columna (fila 0 arriba). 0 vacío, 1/2 fichas, 3/4 damas coronadas.

export const dueno = (v) => (v === 1 || v === 3 ? 1 : v === 2 || v === 4 ? 2 : 0);
export const esDama = (v) => v >= 3;
const LIMITE_SIN_COMER = 80;

export function datosIniciales() {
    const tablero = Array(64).fill(0);
    for (let i = 0; i < 64; i++) {
        const f = Math.floor(i / 8);
        if ((f + (i % 8)) % 2 === 1) {
            if (f <= 2) tablero[i] = 2;
            if (f >= 5) tablero[i] = 1;
        }
    }
    return { tablero, ultimo: null, jugadas: 0, sinComer: 0 };
}

function direcciones(v) {
    if (esDama(v)) return [[-1, -1], [-1, 1], [1, -1], [1, 1]];
    return dueno(v) === 1 ? [[-1, -1], [-1, 1]] : [[1, -1], [1, 1]];
}

const dentro = (f, c) => f >= 0 && f < 8 && c >= 0 && c < 8;
const corona = (v, i) => (v === 1 && i < 8 ? 3 : v === 2 && i >= 56 ? 4 : v);

// Cadenas de capturas desde una casilla (recursivo). Cada jugada: { desde, camino, capturas }
function capturasDesde(t, i, v, capturadas = []) {
    const f = Math.floor(i / 8);
    const c = i % 8;
    const res = [];
    for (const [df, dc] of direcciones(v)) {
        const mf = f + df;
        const mc = c + dc;
        const lf = f + 2 * df;
        const lc = c + 2 * dc;
        if (!dentro(lf, lc)) continue;
        const medio = mf * 8 + mc;
        const llegada = lf * 8 + lc;
        if (dueno(t[medio]) !== 3 - dueno(v) || t[llegada] || capturadas.includes(medio)) continue;
        const coronada = corona(v, llegada);
        const t2 = [...t];
        t2[i] = 0;
        t2[llegada] = coronada;
        const siguientes = coronada !== v ? [] : capturasDesde(t2, llegada, v, [...capturadas, medio]);
        if (siguientes.length) {
            for (const s of siguientes) res.push({ camino: [llegada, ...s.camino], capturas: [medio, ...s.capturas] });
        } else {
            res.push({ camino: [llegada], capturas: [medio] });
        }
    }
    return res;
}

export function jugadasValidas(t, j) {
    const capturas = [];
    const simples = [];
    t.forEach((v, i) => {
        if (dueno(v) !== j) return;
        for (const cap of capturasDesde(t, i, v)) capturas.push({ desde: i, ...cap });
        const f = Math.floor(i / 8);
        const c = i % 8;
        for (const [df, dc] of direcciones(v)) {
            const nf = f + df;
            const nc = c + dc;
            if (dentro(nf, nc) && !t[nf * 8 + nc]) simples.push({ desde: i, camino: [nf * 8 + nc], capturas: [] });
        }
    });
    return capturas.length ? capturas : simples;
}

export function aplicar(t, jugada) {
    const nuevo = [...t];
    const v = nuevo[jugada.desde];
    nuevo[jugada.desde] = 0;
    for (const c of jugada.capturas) nuevo[c] = 0;
    const destino = jugada.camino.at(-1);
    nuevo[destino] = corona(v, destino);
    return nuevo;
}

// Resultado tras una jugada del jugador j: ganador o empate si corresponde
export function resultado(t, siguiente, sinComer) {
    if (!jugadasValidas(t, siguiente).length) return { fin: true, ganador: 3 - siguiente };
    if (sinComer >= LIMITE_SIN_COMER) return { fin: true, ganador: 0 };
    return { fin: false };
}

export function valorPara(t, j) {
    let total = 0;
    t.forEach((v, i) => {
        if (!v) return;
        const f = Math.floor(i / 8);
        const avance = dueno(v) === 1 ? (7 - f) * 0.04 : f * 0.04;
        const puntos = (esDama(v) ? 1.7 : 1) + (esDama(v) ? 0 : avance);
        total += dueno(v) === j ? puntos : -puntos;
    });
    return total;
}
