// Reglas y física del tiro con arco. Las usan el juego y la página de amigos (para crear partidas).
// La simulación es la misma en los dos celulares; igual se guarda dónde pegó cada flecha.

export const RONDAS = 5;
export const DISTANCIA = 30; // metros hasta la diana
export const RADIO_DIANA = 1; // metros (cada anillo mide 10 cm)
export const ALTURA_DIANA = 1.3; // altura del centro
export const ALTURA_TIRADOR = 1.5;
export const VELOCIDAD = 70; // m/s
// Caída suave (más de juego que real): apuntando al medio la flecha baja poco y lo que más la desvía es el viento
const GRAVEDAD = 3;
const PASO = 1 / 240;

const redondear = (n) => Math.round(n * 10) / 10;

// Viento por ronda: lateral (x) y vertical (y), en m/s²
export function generarVientos() {
    return Array.from({ length: RONDAS }, (_, i) => ({
        x: redondear((Math.random() * 2 - 1) * (2.5 + i * 0.9)),
        y: redondear((Math.random() * 2 - 1) * 0.8),
    }));
}

export function datosIniciales() {
    return { rondas: RONDAS, vientos: generarVientos(), tiros: [] };
}

// Vuela la flecha. yaw > 0 apunta a la derecha, pitch > 0 hacia arriba (radianes).
// Devuelve el impacto relativo al centro de la diana y, si se pide, el recorrido.
export function simular(yaw, pitch, viento, recorrido) {
    let x = 0;
    let y = ALTURA_TIRADOR;
    let z = 0;
    let vx = VELOCIDAD * Math.cos(pitch) * Math.sin(yaw);
    let vy = VELOCIDAD * Math.sin(pitch);
    const vz = -VELOCIDAD * Math.cos(pitch) * Math.cos(yaw);
    for (let i = 0; i < 4000; i++) {
        vx += viento.x * PASO;
        vy += (viento.y - GRAVEDAD) * PASO;
        const nz = z + vz * PASO;
        if (nz <= -DISTANCIA) {
            const f = (-DISTANCIA - z) / (nz - z);
            x += vx * PASO * f;
            y += vy * PASO * f;
            recorrido?.push([x, y, -DISTANCIA]);
            return { x, y: y - ALTURA_DIANA, enDiana: Math.hypot(x, y - ALTURA_DIANA) < RADIO_DIANA * 1.15 };
        }
        x += vx * PASO;
        y += vy * PASO;
        z = nz;
        if (i % 4 === 0) recorrido?.push([x, y, z]);
        if (y < 0) return { x, y: -ALTURA_DIANA, enDiana: false, suelo: z };
    }
    return { x: 99, y: 99, enDiana: false };
}

export function puntos(impacto) {
    const r = Math.hypot(impacto.x, impacto.y);
    return r >= RADIO_DIANA ? 0 : 10 - Math.floor(r / (RADIO_DIANA / 10));
}

// De quién es el turno: en cada ronda tira primero el que creó la partida
export function turnoDe(partida) {
    const otro = partida.jugadores.find((j) => j !== partida.creador);
    return partida.tiros.length % 2 === 0 ? partida.creador : otro;
}

export const rondaActual = (partida) => Math.floor(partida.tiros.length / 2);
export const terminada = (partida) => partida.tiros.length >= partida.rondas * 2;

export function totales(partida) {
    const t = Object.fromEntries(partida.jugadores.map((j) => [j, 0]));
    for (const tiro of partida.tiros) t[tiro.uid] += tiro.puntos;
    return t;
}
