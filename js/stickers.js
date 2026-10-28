// Stickers y emojis del chat. Cada sticker es un emoji grande con un texto, dibujado con CSS.
// Los "picantes" (+18: groserías y humor de adultos) se muestran solo si confirmás que sos mayor.
export const STICKERS = {
    fuego: { e: "🔥", t: "FUEGO", c: ["#ff7a00", "#ff006e"] },
    jaja: { e: "😂", t: "JAJAJA", c: ["#ffd166", "#ff9f1c"] },
    gane: { e: "🏆", t: "GANÉ", c: ["#ffd700", "#b8860b"] },
    nooo: { e: "😭", t: "NOOO", c: ["#4cc9f0", "#4361ee"] },
    suerte: { e: "🍀", t: "SUERTE", c: ["#2ecc71", "#138d4b"] },
    facil: { e: "😎", t: "FÁCIL", c: ["#3a86ff", "#1d3557"] },
    gg: { e: "🤝", t: "GG", c: ["#8338ec", "#3a0ca3"] },
    revancha: { e: "💪", t: "REVANCHA", c: ["#e63946", "#9d0208"] },
    jugada: { e: "🤯", t: "¡QUÉ JUGADA!", c: ["#f72585", "#7209b7"] },
    aburrido: { e: "🥱", t: "ABURRIDO", c: ["#adb5bd", "#495057"] },
    quiero: { e: "❤️", t: "TE QUIERO", c: ["#ff4d6d", "#c9184a"] },
    cabra: { e: "🐐", t: "EL MEJOR", c: ["#f4a261", "#e76f51"] },
    fundi: { e: "💸", t: "ME FUNDÍ", c: ["#52b788", "#1b4332"] },
    trampa: { e: "🙄", t: "TRAMPOSO", c: ["#9d4edd", "#5a189a"] },
    vamos: { e: "🎉", t: "¡VAMOS!", c: ["#06d6a0", "#118ab2"] },
    ojo: { e: "👀", t: "OJO...", c: ["#ffbe0b", "#fb5607"] },
};

export const PICANTES = {
    cagar: { e: "🖕", t: "ANDÁ A CAGAR", c: ["#d00000", "#370617"] },
    orto: { e: "🍑", t: "QUÉ ORTO", c: ["#ff9e80", "#ff5e78"] },
    pedo: { e: "🍺", t: "EN PEDO", c: ["#f9c74f", "#f3722c"] },
    puta: { e: "🤬", t: "LA PUTA MADRE", c: ["#9d0208", "#03071e"] },
    cagon: { e: "💩", t: "CAGÓN", c: ["#8d6e63", "#4e342e"] },
    calor: { e: "🥵", t: "QUÉ CALOR...", c: ["#ff4800", "#ff0054"] },
    boludo: { e: "🤡", t: "BOLUDO", c: ["#f72585", "#4361ee"] },
    vino: { e: "🍷", t: "NECESITO UN VINO", c: ["#9b2226", "#3d0c11"] },
    bolas: { e: "🤑", t: "TE DEJÉ EN BOLAS", c: ["#2d6a4f", "#081c15"] },
    papi: { e: "😏", t: "¿Y AHORA, PAPI?", c: ["#7b2cbf", "#240046"] },
    previa: { e: "🍻", t: "LA PREVIA", c: ["#ffb703", "#fb8500"] },
    diablo: { e: "😈", t: "TE VOY A ROMPER", c: ["#6a040f", "#000"] },
    berenjena: { e: "🍆", t: "UFFF", c: ["#7209b7", "#3c096c"] },
    beso: { e: "💋", t: "BESITO", c: ["#ff006e", "#8338ec"] },
    noapto: { e: "🔞", t: "NO APTO", c: ["#ef233c", "#2b2d42"] },
    chupala: { e: "🍭", t: "CHUPALA", c: ["#ff70a6", "#ff9770"] },
};

export const stickerDe = (id) => STICKERS[id] ?? PICANTES[id] ?? null;

export const EMOJIS = [
    "😀", "😂", "🤣", "😅", "😊", "😍", "🥰", "😘", "😜", "🤪", "😎", "🤓", "🥳", "🤩", "😏", "😒",
    "🙄", "😬", "😳", "🥺", "😢", "😭", "😤", "😡", "🤬", "🤯", "😱", "🥶", "🥵", "🤢", "🤮", "🤡",
    "💀", "👻", "👽", "🤖", "😈", "💩", "🙈", "🙉", "🙊", "👍", "👎", "👏", "🙌", "🙏", "💪", "🤝",
    "✌️", "🤞", "🤟", "🤘", "👌", "🤌", "👀", "🫶", "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "💔",
    "🔥", "✨", "💯", "💥", "💫", "🎉", "🎊", "🏆", "🥇", "🎯", "🎲", "🃏", "🎰", "💰", "💸", "🪙",
    "🍕", "🍔", "🍟", "🍺", "🍻", "🍷", "🧉", "☕", "🍑", "🍆", "🌶️", "🍒", "⚽", "🏀", "🎮", "👑",
];

// Confirmación de mayoría de edad para los picantes (se guarda en este dispositivo)
export function picantesActivos() {
    try {
        return localStorage.getItem("stickers-18") === "1";
    } catch {
        return false;
    }
}
export function activarPicantes() {
    try {
        localStorage.setItem("stickers-18", "1");
    } catch {}
}

export function htmlSticker(id) {
    const s = stickerDe(id);
    if (!s) return "";
    return `<div class="sticker" style="--a:${s.c[0]};--b:${s.c[1]}"><span>${s.e}</span><b>${s.t}</b></div>`;
}

export const CSS_STICKERS = `
.sticker { width: 118px; aspect-ratio: 1; border-radius: 26px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; background: linear-gradient(145deg, var(--a), var(--b)); box-shadow: 0 6px 16px #0007, inset 0 0 0 4px #fff; transform: rotate(-4deg); text-align: center; padding: 6px; }
.sticker span { font-size: 3rem; line-height: 1; filter: drop-shadow(0 3px 2px #0006); }
.sticker b { font: 900 0.8rem/1.05 system-ui, sans-serif; color: #fff; text-shadow: 0 2px 0 #000a, 0 0 6px #0008; letter-spacing: 0.02em; }
.msj.sticker-msj { background: none; padding: 2px; }
.msj.sticker-msj .sticker { animation: pegar 0.35s cubic-bezier(0.2, 1.6, 0.4, 1); }
@keyframes pegar { from { transform: scale(0.3) rotate(-30deg); } }
.selector { display: none; flex-direction: column; gap: 6px; height: 38vh; flex-shrink: 0; }
.selector .cuerpo-selector { flex: 1; min-height: 0; }
.selector.abierto { display: flex; }
.selector nav { display: flex; gap: 6px; }
.selector nav button { flex: 1; font: 800 0.85rem system-ui, sans-serif; color: #fff; background: #ffffff14; border: 2px solid transparent; border-radius: 10px; padding: 6px; }
.selector nav button.activo { border-color: #ffd166; color: #ffd166; }
.grilla-emojis { display: grid; grid-template-columns: repeat(8, 1fr); gap: 2px; overflow-y: auto; }
.grilla-emojis button { font-size: 1.6rem; background: none; border: none; padding: 4px 0; border-radius: 8px; }
.grilla-emojis button:active { background: #ffffff22; }
.grilla-stickers { display: grid; grid-template-columns: repeat(auto-fill, minmax(82px, 1fr)); gap: 8px; overflow-y: auto; padding: 4px; }
.grilla-stickers button { background: none; border: none; padding: 0; }
.grilla-stickers .sticker { width: 100%; border-radius: 18px; box-shadow: 0 4px 10px #0006, inset 0 0 0 3px #fff; transform: none; }
.grilla-stickers .sticker span { font-size: 2rem; }
.grilla-stickers .sticker b { font-size: 0.6rem; }
.aviso-18 { padding: 14px; border-radius: 14px; background: #ffffff10; text-align: center; font: 600 0.9rem system-ui, sans-serif; }
.aviso-18 button { margin-top: 8px; font: 900 0.9rem system-ui, sans-serif; border: none; border-radius: 10px; padding: 8px 14px; background: #ef233c; color: #fff; }
.tarjeta-msj { min-width: 200px; display: flex; flex-direction: column; gap: 6px; padding: 10px 12px; border-radius: 14px; background: linear-gradient(145deg, #3a0ca3, #7209b7); }
.tarjeta-msj.regalo { background: linear-gradient(145deg, #ffb703, #fb8500); color: #2a1400; }
.tarjeta-msj .grande { font-size: 2rem; line-height: 1; }
.tarjeta-msj strong { font-size: 1rem; }
.tarjeta-msj button, .tarjeta-msj a { font: 900 0.9rem system-ui, sans-serif; text-align: center; text-decoration: none; border: none; border-radius: 10px; padding: 8px; background: #ffd166; color: #2a1400; }
.msj.tarjeta { background: none; padding: 0; }
`;
