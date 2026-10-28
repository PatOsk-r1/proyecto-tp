// Reglas de Puntos y cajas: grilla de 5x5 cajas. Quien cierra una caja se la queda y juega otra vez.
// Líneas: 0-29 horizontales (fila 0-5, columna 0-4), 30-59 verticales (fila 0-4, columna 0-5).

export const N = 5;
export const H = (f, c) => f * N + c;
export const V = (f, c) => (N + 1) * N + f * (N + 1) + c;
export const TOTAL_LINEAS = 2 * N * (N + 1);

export function datosIniciales() {
    return { lineas: Array(TOTAL_LINEAS).fill(0), cajas: Array(N * N).fill(0), jugadas: 0, ultimo: null };
}

export const ladosDe = (f, c) => [H(f, c), H(f + 1, c), V(f, c), V(f, c + 1)];

// Cajas que toca una línea
export function cajasDe(i) {
    if (i < (N + 1) * N) {
        const f = Math.floor(i / N);
        const c = i % N;
        return [[f - 1, c], [f, c]].filter(([ff]) => ff >= 0 && ff < N);
    }
    const k = i - (N + 1) * N;
    const f = Math.floor(k / (N + 1));
    const c = k % (N + 1);
    return [[f, c - 1], [f, c]].filter(([, cc]) => cc >= 0 && cc < N);
}

export function aplicar(lineas, cajas, i, j) {
    const l = [...lineas];
    const k = [...cajas];
    l[i] = j;
    let cerradas = 0;
    for (const [f, c] of cajasDe(i)) {
        if (ladosDe(f, c).every((x) => l[x])) {
            k[f * N + c] = j;
            cerradas++;
        }
    }
    return { lineas: l, cajas: k, cerradas };
}

const ladosMarcados = (l, f, c) => ladosDe(f, c).filter((x) => l[x]).length;
const libres = (l) => l.flatMap((v, i) => (v ? [] : [i]));

// Computadora: cierra cajas si puede; si no, evita dejar cajas con 3 lados; si no queda otra, regala lo menos posible
export function jugadaCompu(lineas, nivel) {
    const disponibles = libres(lineas);
    if (nivel === 0 && Math.random() < 0.5) return disponibles[Math.floor(Math.random() * disponibles.length)];
    const cierra = disponibles.find((i) => cajasDe(i).some(([f, c]) => ladosMarcados(lineas, f, c) === 3));
    if (cierra !== undefined) return cierra;
    const seguras = disponibles.filter((i) => cajasDe(i).every(([f, c]) => ladosMarcados(lineas, f, c) < 2));
    if (seguras.length) return seguras[Math.floor(Math.random() * seguras.length)];
    if (nivel < 2) return disponibles[Math.floor(Math.random() * disponibles.length)];
    // Difícil: elige la línea que le deja al rival la cadena más corta
    let mejor = disponibles[0];
    let menor = Infinity;
    for (const i of disponibles) {
        let l = [...lineas];
        l[i] = 1;
        let regaladas = 0;
        for (;;) {
            const c = libres(l).find((x) => cajasDe(x).some(([f, cc]) => ladosMarcados(l, f, cc) === 3));
            if (c === undefined) break;
            regaladas += cajasDe(c).filter(([f, cc]) => ladosMarcados(l, f, cc) === 3).length;
            l[c] = 2;
        }
        if (regaladas < menor) {
            menor = regaladas;
            mejor = i;
        }
    }
    return mejor;
}
