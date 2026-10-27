// Partes comunes de los juegos de casino: selector de apuesta, saldo y recarga.
import { formatear, MONEDA } from "./comun3d.js";
import { fichas, recargar } from "./fichas.js";

export const APUESTAS = [10, 25, 50, 100, 250, 500];

// Conecta los botones − / + y el texto de la apuesta. Devuelve una función que da la apuesta actual;
// con apuesta.bloquear(true) no se puede cambiar (por ejemplo, en medio de una mano).
export function selectorApuesta({ menos, mas, texto, alCambiar }) {
    let nivel = 0;
    let bloqueado = false;
    const pintarBotones = () => {
        menos.disabled = bloqueado || nivel === 0;
        mas.disabled = bloqueado || nivel === APUESTAS.length - 1;
    };
    const pintar = () => {
        texto.textContent = APUESTAS[nivel];
        pintarBotones();
        alCambiar?.();
    };
    menos.addEventListener("click", () => {
        nivel = Math.max(0, nivel - 1);
        pintar();
    });
    mas.addEventListener("click", () => {
        nivel = Math.min(APUESTAS.length - 1, nivel + 1);
        pintar();
    });
    texto.textContent = APUESTAS[nivel];
    pintarBotones();
    const valor = () => APUESTAS[nivel];
    valor.bloquear = (si) => {
        bloqueado = si;
        pintarBotones();
    };
    return valor;
}

export function pintarSaldo(el) {
    el.innerHTML = `${MONEDA}${formatear(fichas())}`;
}

// Muestra el botón de recarga solo si te quedaste sin fichas
export function conectarRecarga(boton, alRecargar) {
    const revisar = () => (boton.hidden = fichas() >= 10);
    boton.addEventListener("click", () => {
        recargar();
        revisar();
        alRecargar?.();
    });
    revisar();
    return revisar;
}
