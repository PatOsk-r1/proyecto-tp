// Reglas de la batalla naval: tablero de 8x8 y 5 barcos.
// Una flota es un arreglo de 64 números: 0 agua, 1 a 5 el número de barco.

export const LADO = 8;
export const BARCOS = [4, 3, 3, 2, 2];

export function datosIniciales() {
    return { fase: "colocando", flotas: {}, disparos: {}, listos: {}, jugadas: 0, ultimo: null };
}

// Ubica los barcos al azar sin que se toquen
export function flotaAlAzar() {
    for (;;) {
        const flota = Array(LADO * LADO).fill(0);
        let ok = true;
        BARCOS.forEach((largo, b) => {
            if (!ok) return;
            for (let intento = 0; intento < 200; intento++) {
                const horizontal = Math.random() < 0.5;
                const f = Math.floor(Math.random() * (horizontal ? LADO : LADO - largo + 1));
                const c = Math.floor(Math.random() * (horizontal ? LADO - largo + 1 : LADO));
                const celdas = Array.from({ length: largo }, (_, k) => (horizontal ? f * LADO + c + k : (f + k) * LADO + c));
                const libre = celdas.every((i) => vecinas(i, true).every((v) => !flota[v]));
                if (libre) {
                    for (const i of celdas) flota[i] = b + 1;
                    return;
                }
            }
            ok = false;
        });
        if (ok) return flota;
    }
}

// Casillas alrededor (con o sin diagonales), incluida la propia si conMisma
export function vecinas(i, conDiagonales = false) {
    const f = Math.floor(i / LADO);
    const c = i % LADO;
    const res = [i];
    for (let df = -1; df <= 1; df++) {
        for (let dc = -1; dc <= 1; dc++) {
            if (!df && !dc) continue;
            if (!conDiagonales && df && dc) continue;
            const ff = f + df;
            const cc = c + dc;
            if (ff >= 0 && ff < LADO && cc >= 0 && cc < LADO) res.push(ff * LADO + cc);
        }
    }
    return res;
}

export const hundido = (flota, disparos, barco) => flota.every((v, i) => v !== barco || disparos.includes(i));
export const todosHundidos = (flota, disparos) => flota.every((v, i) => !v || disparos.includes(i));

// Computadora: si tocó un barco sin hundirlo, busca alrededor; si no, tira al azar en damero
export function disparoCompu(flotaRival, disparos) {
    const tocados = disparos.filter((i) => flotaRival[i] && !hundido(flotaRival, disparos, flotaRival[i]));
    if (tocados.length) {
        // Si hay dos tocados en línea, sigue esa dirección
        const candidatos = new Set();
        for (const t of tocados) for (const v of vecinas(t)) if (v !== t && !disparos.includes(v)) candidatos.add(v);
        const enLinea = [...candidatos].filter((v) =>
            tocados.some((a) => tocados.some((b) => a !== b && (Math.floor(a / LADO) === Math.floor(b / LADO) ? Math.floor(v / LADO) === Math.floor(a / LADO) : v % LADO === a % LADO && a % LADO === b % LADO)))
        );
        const lista = enLinea.length ? enLinea : [...candidatos];
        if (lista.length) return lista[Math.floor(Math.random() * lista.length)];
    }
    const libres = [];
    for (let i = 0; i < LADO * LADO; i++) if (!disparos.includes(i) && (Math.floor(i / LADO) + (i % LADO)) % 2 === 0) libres.push(i);
    const todos = libres.length ? libres : Array.from({ length: LADO * LADO }, (_, i) => i).filter((i) => !disparos.includes(i));
    return todos[Math.floor(Math.random() * todos.length)];
}
