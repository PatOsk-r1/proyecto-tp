// Medidas de la mesa y armado del triángulo. Lo usan el juego y la página de amigos.

export const ANCHO = 4.4;
export const LARGO = 8.8;
export const R = 0.12;

export const esLisa = (n) => n >= 1 && n <= 7;
export const esRayada = (n) => n >= 9 && n <= 15;

// Triángulo: la 1 adelante, la 8 en el centro, una lisa y una rayada en las esquinas de atrás
export function armarTriangulo() {
    const bolas = [{ n: 0, x: 0, z: LARGO / 4, activa: true }];
    const resto = [2, 3, 4, 5, 6, 7, 9, 10, 11, 12, 13, 14, 15].sort(() => Math.random() - 0.5);
    const lisa = resto.splice(resto.findIndex(esLisa), 1)[0];
    const rayada = resto.splice(resto.findIndex(esRayada), 1)[0];
    for (let fila = 0; fila < 5; fila++) {
        for (let k = 0; k <= fila; k++) {
            let n;
            if (fila === 0) n = 1;
            else if (fila === 2 && k === 1) n = 8;
            else if (fila === 4 && k === 0) n = lisa;
            else if (fila === 4 && k === 4) n = rayada;
            else n = resto.pop();
            bolas.push({
                n,
                x: (k - fila / 2) * 2 * R * 1.01,
                z: -LARGO / 4 - fila * Math.sqrt(3) * R * 1.01,
                activa: true,
            });
        }
    }
    return bolas;
}

export function datosIniciales() {
    return { bolas: armarTriangulo(), grupos: {}, ultimo: null, tiroN: 0 };
}
