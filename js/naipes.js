// Naipes franceses para los juegos de casino: mazo mezclado y dibujo de cada carta.
export const PALOS = ["♠", "♥", "♦", "♣"];
export const VALORES = ["", "A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

// valor: 1 (As) a 13 (K)
export function mazoMezclado(cantidadMazos = 1) {
    const cartas = [];
    for (let m = 0; m < cantidadMazos; m++) for (let palo = 0; palo < 4; palo++) for (let v = 1; v <= 13; v++) cartas.push({ palo, v });
    for (let i = cartas.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [cartas[i], cartas[j]] = [cartas[j], cartas[i]];
    }
    return cartas;
}

export function htmlNaipe(carta, ancho = 90, tapada = false) {
    if (tapada || !carta) return `<div class="naipe dorso" style="--w:${ancho}px"></div>`;
    const roja = carta.palo === 1 || carta.palo === 2 ? " roja" : "";
    return `<div class="naipe${roja}" style="--w:${ancho}px"><span class="v">${VALORES[carta.v]}<br>${PALOS[carta.palo]}</span><span class="c">${PALOS[carta.palo]}</span></div>`;
}
