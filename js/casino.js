// Partes comunes de los juegos de casino: selector de apuesta, saldo y recarga diaria.
import { formatear, MONEDA } from "./comun3d.js";
import { fichas, recargar, puedeRecargar, RECARGA } from "./fichas.js";

// De 10 fichas hasta el límite de 10 millones
export const APUESTAS = [
    10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000, 25000, 50000, 100000, 250000, 500000,
    1000000, 2500000, 5000000, 10000000,
];

// Dejar apretado un botón lo repite cada vez más rápido (para llegar a apuestas grandes)
export function mantenerApretado(boton) {
    let temporizador = 0;
    const parar = () => clearTimeout(temporizador);
    boton.addEventListener("pointerdown", () => {
        let espera = 380;
        const repetir = () => {
            if (boton.disabled) return;
            boton.click();
            espera = Math.max(60, espera * 0.75);
            temporizador = setTimeout(repetir, espera);
        };
        temporizador = setTimeout(repetir, espera);
    });
    for (const e of ["pointerup", "pointerleave", "pointercancel"]) boton.addEventListener(e, parar);
}

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
        texto.textContent = formatear(APUESTAS[nivel]);
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
    mantenerApretado(menos);
    mantenerApretado(mas);
    texto.textContent = formatear(APUESTAS[nivel]);
    pintarBotones();
    const valor = () => APUESTAS[nivel];
    valor.bloquear = (si) => {
        bloqueado = si;
        pintarBotones();
    };
    return valor;
}

// Muestra el saldo y lo mantiene al día (por ejemplo, si llega un regalo)
const saldos = new Set();
export function pintarSaldo(el) {
    el.innerHTML = `${MONEDA}${formatear(fichas())}`;
    if (!saldos.has(el)) {
        saldos.add(el);
        addEventListener("fichas", () => (el.innerHTML = `${MONEDA}${formatear(fichas())}`));
    }
}

// Botón de recarga diaria: aparece si todavía no la usaste hoy
export function conectarRecarga(boton, alRecargar) {
    boton.textContent = `🎁 Regalo diario +${RECARGA}`;
    const revisar = () => (boton.hidden = !puedeRecargar());
    boton.addEventListener("click", () => {
        recargar();
        revisar();
        alRecargar?.();
    });
    addEventListener("fichas", revisar);
    revisar();
    return revisar;
}
