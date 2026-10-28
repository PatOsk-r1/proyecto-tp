// Reglas del Mancala (variante Kalah): 6 hoyos por lado con 4 semillas y un granero cada uno.
// Índices: 0-5 hoyos del jugador 1, 6 su granero, 7-12 hoyos del jugador 2, 13 su granero.

export const granero = (j) => (j === 1 ? 6 : 13);
export const hoyosDe = (j) => (j === 1 ? [0, 1, 2, 3, 4, 5] : [7, 8, 9, 10, 11, 12]);

export function datosIniciales() {
    const tablero = Array(14).fill(4);
    tablero[6] = tablero[13] = 0;
    return { tablero, ultimo: null, jugadas: 0 };
}

export const jugadasValidas = (t, j) => hoyosDe(j).filter((i) => t[i] > 0);

// Reparte las semillas del hoyo en sentido antihorario (saltea el granero rival).
// Devuelve el tablero nuevo, el recorrido (para animar), si repite turno y si terminó.
export function sembrar(t, j, hoyo) {
    const nuevo = [...t];
    let semillas = nuevo[hoyo];
    nuevo[hoyo] = 0;
    const recorrido = [];
    let i = hoyo;
    while (semillas > 0) {
        i = (i + 1) % 14;
        if (i === granero(3 - j)) continue;
        nuevo[i]++;
        recorrido.push(i);
        semillas--;
    }
    const mismoTurno = i === granero(j);
    let captura = null;
    // Si la última cae en un hoyo propio vacío, se lleva lo del hoyo de enfrente
    if (!mismoTurno && hoyosDe(j).includes(i) && nuevo[i] === 1 && nuevo[12 - i] > 0) {
        captura = { desde: [i, 12 - i], cantidad: nuevo[12 - i] + 1 };
        nuevo[granero(j)] += nuevo[12 - i] + 1;
        nuevo[i] = nuevo[12 - i] = 0;
    }
    // Si un lado se quedó sin semillas, cada uno junta lo que le queda
    const vacio1 = hoyosDe(1).every((k) => !nuevo[k]);
    const vacio2 = hoyosDe(2).every((k) => !nuevo[k]);
    const fin = vacio1 || vacio2;
    if (fin) {
        for (const jug of [1, 2]) {
            for (const k of hoyosDe(jug)) {
                nuevo[granero(jug)] += nuevo[k];
                nuevo[k] = 0;
            }
        }
    }
    return { tablero: nuevo, recorrido, mismoTurno: mismoTurno && !fin, captura, fin };
}
