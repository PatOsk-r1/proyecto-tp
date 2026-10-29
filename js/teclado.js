// Teclado para jugar en la compu: flechas (o WASD) para mover y espacio o Enter para la acción.
// Los juegos leen las teclas en su ciclo (movimiento suave mientras se mantienen apretadas).
const apretadas = new Set();
const ESPECIALES = new Set(["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", " ", "Enter"]);
const escribiendo = (e) => e.target.closest?.("input, textarea, select, [contenteditable]");

addEventListener("keydown", (e) => {
    if (escribiendo(e)) return;
    if (ESPECIALES.has(e.key)) {
        e.preventDefault(); // que la página no se mueva
        // Si quedó enfocado un botón (por un clic), que el espacio no lo vuelva a tocar
        if (document.activeElement?.tagName === "BUTTON") document.activeElement.blur();
    }
    apretadas.add(e.key.length === 1 ? e.key.toLowerCase() : e.key);
});
addEventListener("keyup", (e) => {
    apretadas.delete(e.key.length === 1 ? e.key.toLowerCase() : e.key);
    if (ESPECIALES.has(e.key) && !escribiendo(e)) e.preventDefault();
});
addEventListener("blur", () => apretadas.clear());

export const tecla = (k) => apretadas.has(k);
export const accionApretada = () => tecla(" ") || tecla("Enter");
// -1, 0 o 1 según las flechas
export const ejeX = () => (tecla("ArrowRight") || tecla("d") ? 1 : 0) - (tecla("ArrowLeft") || tecla("a") ? 1 : 0);
export const ejeY = () => (tecla("ArrowDown") || tecla("s") ? 1 : 0) - (tecla("ArrowUp") || tecla("w") ? 1 : 0);

// Espacio o Enter (una vez por toque, sin repetir al mantener)
export function alAccion(fn) {
    addEventListener("keydown", (e) => {
        if (escribiendo(e) || e.repeat || (e.key !== " " && e.key !== "Enter")) return;
        fn(e);
    });
}
export function alSoltarAccion(fn) {
    addEventListener("keyup", (e) => {
        if (escribiendo(e) || (e.key !== " " && e.key !== "Enter")) return;
        fn(e);
    });
}
// Toca el botón si se ve en pantalla (para empezar o seguir con el espacio)
export function tocarSiVisible(...botones) {
    for (const b of botones) {
        if (b && b.getClientRects().length && !b.disabled) {
            b.click();
            return true;
        }
    }
    return false;
}
