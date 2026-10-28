// Stickers y emojis del chat. Cada sticker es un emoji animado en 3D (Noto Animated Emoji de Google)
// con un texto grande con borde, al estilo de los stickers de WhatsApp. Si no hay versión animada,
// se usa la imagen fija del mismo emoji.
// Los "picantes" (+18: groserías y humor de adultos) se muestran solo si confirmás que sos mayor.
export const STICKERS = {
    fuego: { e: "🔥", t: "FUEGO", c: "#ff5400" },
    jaja: { e: "😂", t: "JAJAJA", c: "#ffb703" },
    gane: { e: "🏆", t: "GANÉ", c: "#e9c46a" },
    nooo: { e: "😭", t: "NOOO", c: "#4cc9f0" },
    suerte: { e: "🍀", t: "SUERTE", c: "#2ecc71" },
    facil: { e: "😎", t: "FÁCIL", c: "#3a86ff" },
    gg: { e: "🤝", t: "GG", c: "#9d4edd" },
    revancha: { e: "💪", t: "REVANCHA", c: "#e63946" },
    jugada: { e: "🤯", t: "¡QUÉ JUGADA!", c: "#f72585" },
    aburrido: { e: "🥱", t: "ABURRIDO", c: "#adb5bd" },
    quiero: { e: "❤️", t: "TE QUIERO", c: "#ff4d6d" },
    cabra: { e: "🐐", t: "EL MEJOR", c: "#f4a261" },
    fundi: { e: "💸", t: "ME FUNDÍ", c: "#52b788" },
    trampa: { e: "🙄", t: "TRAMPOSO", c: "#9d4edd" },
    vamos: { e: "🎉", t: "¡VAMOS!", c: "#06d6a0" },
    ojo: { e: "👀", t: "OJO...", c: "#ffbe0b" },
    mori: { e: "💀", t: "ME MORÍ", c: "#e0e1dd" },
    frio: { e: "🥶", t: "FRÍO", c: "#48cae4" },
    porfa: { e: "🥺", t: "PORFA", c: "#ffafcc" },
    muak: { e: "😘", t: "MUAK", c: "#ff70a6" },
    fiesta: { e: "🥳", t: "FIESTA", c: "#ff9f1c" },
    cien: { e: "💯", t: "100%", c: "#ef233c" },
    uff: { e: "😮‍💨", t: "UFF", c: "#90e0ef" },
    derrito: { e: "🫠", t: "ME DERRITO", c: "#ffd60a" },
    nervios: { e: "😬", t: "NERVIOS", c: "#80ffdb" },
    shh: { e: "🤫", t: "SHHH", c: "#cdb4db" },
    bomba: { e: "💣", t: "BOMBA", c: "#ff6d00" },
    tira: { e: "🎲", t: "TIRÁ", c: "#ffffff" },
    jackpot: { e: "🎰", t: "JACKPOT", c: "#ffd700" },
    donde: { e: "👻", t: "¿DÓNDE ESTÁS?", c: "#e5e5e5" },
};

export const PICANTES = {
    cagar: { e: "🖕", t: "ANDÁ A CAGAR", c: "#ff0a54" },
    orto: { e: "🍑", t: "QUÉ ORTO", c: "#ff9e80" },
    pedo: { e: "🍻", t: "EN PEDO", c: "#f9c74f" },
    puta: { e: "🤬", t: "LA PUTA MADRE", c: "#ff4d4d" },
    cagon: { e: "💩", t: "CAGÓN", c: "#bc8a5f" },
    calor: { e: "🥵", t: "QUÉ CALOR...", c: "#ff4800" },
    boludo: { e: "🤡", t: "BOLUDO", c: "#ff5d8f" },
    vino: { e: "🍷", t: "NECESITO UN VINO", c: "#c9184a" },
    bolas: { e: "🤑", t: "TE DEJÉ EN BOLAS", c: "#38b000" },
    papi: { e: "😏", t: "¿Y AHORA, PAPI?", c: "#c77dff" },
    diablo: { e: "😈", t: "TE VOY A ROMPER", c: "#9d4edd" },
    berenjena: { e: "🍆", t: "UFFF", c: "#b5179e" },
    beso: { e: "💋", t: "BESITO", c: "#ff006e" },
    noapto: { e: "🔞", t: "NO APTO", c: "#ef233c" },
    chupala: { e: "🍭", t: "CHUPALA", c: "#ff70a6" },
    asco: { e: "🤮", t: "ME DAS ASCO", c: "#70e000" },
    muerto: { e: "💀", t: "ESTÁS MUERTO", c: "#e0e1dd" },
    garca: { e: "🤑", t: "GARCA", c: "#ffd60a" },
    callate: { e: "🤫", t: "CALLATE", c: "#a2d2ff" },
    birra: { e: "🍺", t: "BIRRA", c: "#ffb703" },
};

export const stickerDe = (id) => STICKERS[id] ?? PICANTES[id] ?? null;

// Código del emoji como lo nombra Google: 🔥 → 1f525, ❤️ → 2764_fe0f
const codigo = (e) => [...e].map((c) => c.codePointAt(0).toString(16)).join("_");
const urlEmoji = (e, formato) => `https://fonts.gstatic.com/s/e/notoemoji/latest/${codigo(e)}/${formato}`;

// Imagen del emoji: animada si existe, si no la fija
export const htmlEmojiAnimado = (e, clase = "") =>
    `<img class="${clase}" src="${urlEmoji(e, "512.webp")}" alt="${e}" loading="lazy" draggable="false" onerror="this.onerror=null;this.src='${urlEmoji(e, "512.png")}'">`;

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
    return `<div class="sticker" style="--c:${s.c}">${htmlEmojiAnimado(s.e)}<b>${s.t}</b></div>`;
}

export const CSS_STICKERS = `
.sticker { position: relative; width: 150px; display: flex; flex-direction: column; align-items: center; text-align: center; transform: rotate(-3deg); }
.sticker img { width: 128px; height: 128px; object-fit: contain; filter: drop-shadow(0 0 0 #fff) drop-shadow(0 0 3px #fff) drop-shadow(0 8px 10px #0008); -webkit-user-select: none; user-select: none; }
.sticker b { margin-top: -14px; max-width: 150px; font: 900 1.15rem/1 system-ui, -apple-system, "Arial Black", sans-serif; letter-spacing: 0.01em; color: var(--c); -webkit-text-stroke: 5px #111; paint-order: stroke fill; text-shadow: 0 4px 0 #111, 0 6px 10px #0009; transform: rotate(2deg); }
.msj.sticker-msj { background: none; padding: 2px; }
.msj.sticker-msj .sticker { animation: pegar 0.4s cubic-bezier(0.2, 1.6, 0.4, 1); }
@keyframes pegar { from { transform: scale(0.2) rotate(-35deg); opacity: 0; } }
.selector { display: none; flex-direction: column; gap: 6px; height: 40vh; flex-shrink: 0; }
.selector.abierto { display: flex; }
.selector .cuerpo-selector { flex: 1; min-height: 0; }
.selector nav { display: flex; gap: 6px; }
.selector nav button { flex: 1; font: 800 0.85rem system-ui, sans-serif; color: #fff; background: #ffffff14; border: 2px solid transparent; border-radius: 10px; padding: 6px; }
.selector nav button.activo { border-color: #ffd166; color: #ffd166; }
.grilla-emojis { display: grid; grid-template-columns: repeat(8, 1fr); gap: 2px; overflow-y: auto; }
.grilla-emojis button { font-size: 1.6rem; background: none; border: none; padding: 4px 0; border-radius: 8px; }
.grilla-emojis button:active { background: #ffffff22; }
.grilla-stickers { display: grid; grid-template-columns: repeat(auto-fill, minmax(84px, 1fr)); gap: 10px 4px; overflow-y: auto; padding: 6px 2px; }
.grilla-stickers button { background: none; border: none; padding: 4px 0; border-radius: 14px; }
.grilla-stickers button:active { background: #ffffff18; }
.grilla-stickers .sticker { width: 100%; transform: none; }
.grilla-stickers .sticker img { width: 64px; height: 64px; }
.grilla-stickers .sticker b { margin-top: -6px; font-size: 0.68rem; -webkit-text-stroke: 3px #111; text-shadow: 0 2px 0 #111; }
.aviso-18 { padding: 14px; border-radius: 14px; background: #ffffff10; text-align: center; font: 600 0.9rem system-ui, sans-serif; }
.aviso-18 button { margin-top: 8px; font: 900 0.9rem system-ui, sans-serif; border: none; border-radius: 10px; padding: 8px 14px; background: #ef233c; color: #fff; }
.tarjeta-msj { min-width: 200px; display: flex; flex-direction: column; gap: 6px; padding: 10px 12px; border-radius: 14px; background: linear-gradient(145deg, #3a0ca3, #7209b7); }
.tarjeta-msj.regalo { background: linear-gradient(145deg, #ffb703, #fb8500); color: #2a1400; }
.tarjeta-msj .grande { font-size: 2rem; line-height: 1; }
.tarjeta-msj .grande img { width: 56px; height: 56px; }
.tarjeta-msj strong { font-size: 1rem; }
.tarjeta-msj button, .tarjeta-msj a { font: 900 0.9rem system-ui, sans-serif; text-align: center; text-decoration: none; border: none; border-radius: 10px; padding: 8px; background: #ffd166; color: #2a1400; }
.msj.tarjeta { background: none; padding: 0; }
.msj.emoji img { width: 64px; height: 64px; display: block; }
`;
