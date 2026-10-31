// Emojis del chat. Los mensajes que son solo emojis se muestran grandes, con la imagen fija
// de Noto Emoji de Google (sin animación).
const codigo = (e) => [...e].map((c) => c.codePointAt(0).toString(16)).join("_");
const urlEmoji = (e, formato) => `https://fonts.gstatic.com/s/e/notoemoji/latest/${codigo(e)}/${formato}`;

export const htmlEmoji = (e, clase = "") =>
    `<img class="${clase}" src="${urlEmoji(e, "512.png")}" alt="${e}" loading="lazy" draggable="false" onerror="this.replaceWith(this.alt)">`;

export const EMOJIS = [
    "😀", "😂", "🤣", "😅", "😊", "😍", "🥰", "😘", "😜", "🤪", "😎", "🤓", "🥳", "🤩", "😏", "😒",
    "🙄", "😬", "😳", "🥺", "😢", "😭", "😤", "😡", "🤬", "🤯", "😱", "🥶", "🥵", "🤢", "🤮", "🤡",
    "💀", "👻", "👽", "🤖", "😈", "💩", "🙈", "🙉", "🙊", "👍", "👎", "👏", "🙌", "🙏", "💪", "🤝",
    "✌️", "🤞", "🤟", "🤘", "👌", "🤌", "👀", "🫶", "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "💔",
    "🔥", "✨", "💯", "💥", "💫", "🎉", "🎊", "🏆", "🥇", "🎯", "🎲", "🃏", "🎰", "💰", "💸", "🪙",
    "🍕", "🍔", "🍟", "🍺", "🍻", "🍷", "🧉", "☕", "🍑", "🍆", "🌶️", "🍒", "⚽", "🏀", "🎮", "👑",
];

// Reacciones rápidas al mantener apretado un mensaje
export const REACCIONES = ["❤️", "😂", "😮", "😢", "😡", "👍"];

// Si el texto son solo 1 a 3 emojis, los devuelve separados (si no, null)
export function soloEmojis(texto) {
    const partes = [...new Intl.Segmenter("es", { granularity: "grapheme" }).segment(String(texto).trim())]
        .map((s) => s.segment)
        .filter((s) => s.trim());
    return partes.length && partes.length <= 3 && partes.every((s) => /\p{Extended_Pictographic}/u.test(s)) ? partes : null;
}
