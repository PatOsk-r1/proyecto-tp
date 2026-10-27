// Fichas del casino: una sola billetera para todos los juegos de casino (se guarda en este dispositivo).
const CLAVE = "casino-fichas";
const INICIAL = 1000;
export const RECARGA = 500;

function leer() {
    try {
        const guardado = localStorage.getItem(CLAVE);
        if (guardado !== null) return Number(guardado);
        // La primera vez se traen las fichas que había en el blackjack
        const blackjack = JSON.parse(localStorage.getItem("blackjack") || "null");
        return blackjack?.fichas ?? INICIAL;
    } catch {
        return INICIAL;
    }
}

export const fichas = () => leer();

export function cambiarFichas(cantidad) {
    const nuevo = Math.max(0, Math.round(leer() + cantidad));
    try {
        localStorage.setItem(CLAVE, nuevo);
    } catch {}
    return nuevo;
}

// Si te quedaste sin fichas, se regalan algunas para seguir jugando
export function recargar() {
    if (leer() >= 10) return false;
    cambiarFichas(RECARGA);
    return true;
}
