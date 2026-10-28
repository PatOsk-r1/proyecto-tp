// Íconos dibujados (SVG) para no depender de los emojis, que se ven distinto en cada celular.
// icono("cereza") devuelve el SVG como texto, listo para poner con innerHTML.

let siguienteId = 0;

// Degradado lineal de arriba hacia abajo; devuelve [definición, url]
function degradado(a, b) {
    const id = `ic${siguienteId++}`;
    return [`<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>`, `url(#${id})`];
}

function radial(a, b) {
    const id = `ic${siguienteId++}`;
    return [`<radialGradient id="${id}" cx="0.35" cy="0.3" r="0.8"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></radialGradient>`, `url(#${id})`];
}

const brillo = (x, y, rx = 6, ry = 4) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="#fff" opacity="0.55"/>`;

const DIBUJOS = {
    // ---------- Tragamonedas ----------
    cereza() {
        const [d1, r1] = radial("#ff8a8a", "#b3001b");
        return `<defs>${d1}</defs>
            <path d="M30 10 C34 22 36 30 22 40 M30 10 C34 22 40 28 44 38" stroke="#2e7d32" stroke-width="4" fill="none" stroke-linecap="round"/>
            <path d="M30 10 C38 6 48 8 52 14 C44 16 36 14 30 10Z" fill="#43a047"/>
            <circle cx="22" cy="44" r="12" fill="${r1}"/><circle cx="44" cy="42" r="12" fill="${r1}"/>
            ${brillo(18, 39, 4, 3)}${brillo(40, 37, 4, 3)}`;
    },
    limon() {
        const [d1, r1] = radial("#fff7a8", "#f2b705");
        return `<defs>${d1}</defs>
            <path d="M10 32 C10 18 22 12 32 12 C42 12 54 18 54 32 C54 46 42 52 32 52 C22 52 10 46 10 32Z" fill="${r1}" stroke="#c78f00" stroke-width="2"/>
            <path d="M8 32 L4 30 M56 32 L60 34" stroke="#c78f00" stroke-width="3" stroke-linecap="round"/>
            ${brillo(24, 22, 7, 4)}`;
    },
    campana() {
        const [d1, r1] = degradado("#ffe27a", "#d48800");
        return `<defs>${d1}</defs>
            <path d="M32 8 C20 8 16 20 16 30 C16 38 12 42 10 46 L54 46 C52 42 48 38 48 30 C48 20 44 8 32 8Z" fill="${r1}" stroke="#9a6200" stroke-width="2"/>
            <rect x="8" y="44" width="48" height="6" rx="3" fill="#b87400"/>
            <circle cx="32" cy="54" r="5" fill="#9a6200"/><circle cx="32" cy="7" r="3" fill="#9a6200"/>
            ${brillo(24, 20, 4, 7)}`;
    },
    estrella() {
        const [d1, r1] = radial("#fff6b0", "#ffb300");
        return `<defs>${d1}</defs>
            <path d="M32 4 L40 23 L60 24 L44 37 L50 57 L32 46 L14 57 L20 37 L4 24 L24 23Z" fill="${r1}" stroke="#d17f00" stroke-width="2" stroke-linejoin="round"/>
            ${brillo(26, 22, 5, 3)}`;
    },
    diamante() {
        return `<path d="M14 22 L22 10 L42 10 L50 22 L32 56Z" fill="#4fc3f7" stroke="#0277bd" stroke-width="2" stroke-linejoin="round"/>
            <path d="M14 22 L50 22 M22 10 L26 22 L32 56 L38 22 L42 10 M26 22 L32 10 L38 22" stroke="#0277bd" stroke-width="1.5" fill="none"/>
            <path d="M22 10 L26 22 L14 22Z" fill="#b3e5fc"/><path d="M32 10 L38 22 L26 22Z" fill="#e1f5fe"/>`;
    },
    siete() {
        const [d1, r1] = degradado("#ff5252", "#b71c1c");
        return `<defs>${d1}</defs>
            <path d="M12 10 L52 10 L52 18 C42 28 34 40 30 56 L18 56 C22 40 30 28 38 20 L12 20Z" fill="${r1}" stroke="#7f0000" stroke-width="2.5" stroke-linejoin="round"/>
            <path d="M15 13 L48 13" stroke="#fff" stroke-width="2" opacity="0.6"/>`;
    },

    // ---------- Panadería ----------
    pan() {
        const [d1, r1] = degradado("#f5c37a", "#b86b25");
        return `<defs>${d1}</defs>
            <path d="M8 40 C8 22 20 14 32 14 C44 14 56 22 56 40 C56 48 50 50 32 50 C14 50 8 48 8 40Z" fill="${r1}" stroke="#7a4214" stroke-width="2"/>
            <path d="M20 22 L26 34 M30 20 L34 34 M40 22 L42 34" stroke="#7a4214" stroke-width="3" stroke-linecap="round" opacity="0.6"/>`;
    },
    medialuna() {
        const [d1, r1] = degradado("#ffd28a", "#c9772a");
        return `<defs>${d1}</defs>
            <path d="M6 40 C10 22 24 12 32 12 C40 12 54 22 58 40 C50 34 44 34 40 38 C38 30 26 30 24 38 C20 34 14 34 6 40Z" fill="${r1}" stroke="#7a4214" stroke-width="2" stroke-linejoin="round"/>
            <path d="M24 18 L28 36 M40 18 L36 36" stroke="#7a4214" stroke-width="2" opacity="0.5"/>`;
    },
    galletita() {
        const [d1, r1] = radial("#e8b77a", "#a8692e");
        return `<defs>${d1}</defs><circle cx="32" cy="32" r="24" fill="${r1}" stroke="#7a4214" stroke-width="2"/>
            <circle cx="24" cy="24" r="4" fill="#4e2a12"/><circle cx="40" cy="28" r="3.5" fill="#4e2a12"/><circle cx="30" cy="40" r="4" fill="#4e2a12"/><circle cx="42" cy="42" r="3" fill="#4e2a12"/>`;
    },
    dona() {
        const [d1, r1] = radial("#ffd0a0", "#c97a3a");
        return `<defs>${d1}</defs><circle cx="32" cy="32" r="24" fill="${r1}"/>
            <path d="M12 30 C12 18 22 10 32 10 C42 10 52 18 52 30 C48 26 44 30 40 26 C36 30 30 26 26 30 C22 26 16 32 12 30Z" fill="#ff6fae"/>
            <circle cx="32" cy="32" r="8" fill="#3b1d08"/>
            <path d="M20 18 L22 21 M38 16 L41 18 M44 24 L46 27 M26 14 L28 16" stroke="#fff" stroke-width="2.5" stroke-linecap="round"/>`;
    },
    torta() {
        return `<rect x="10" y="28" width="44" height="24" rx="4" fill="#f8bbd0" stroke="#ad1457" stroke-width="2"/>
            <path d="M10 34 C16 38 20 30 26 34 C32 38 36 30 42 34 C48 38 50 32 54 34 L54 30 L10 30Z" fill="#fff"/>
            <rect x="10" y="42" width="44" height="4" fill="#ad1457" opacity="0.5"/>
            <rect x="30" y="14" width="4" height="14" rx="2" fill="#4fc3f7"/><path d="M32 6 C36 10 34 14 32 14 C30 14 28 10 32 6Z" fill="#ffb300"/>`;
    },
    bombon() {
        const [d1, r1] = radial("#8d5a3b", "#3e1f0f");
        return `<defs>${d1}</defs><path d="M8 34 L18 28 L18 40Z M56 34 L46 28 L46 40Z" fill="#e53935"/>
            <circle cx="32" cy="34" r="16" fill="${r1}" stroke="#2a1205" stroke-width="2"/>
            <path d="M22 30 C28 26 36 26 42 30" stroke="#c49a6c" stroke-width="2.5" fill="none" stroke-linecap="round"/>${brillo(26, 28, 4, 3)}`;
    },
    pastel() {
        return `<path d="M10 46 L32 18 L54 46Z" fill="#fff3e0" stroke="#8d6e63" stroke-width="2" stroke-linejoin="round"/>
            <path d="M10 46 L54 46 L54 52 L10 52Z" fill="#d7a86e" stroke="#8d6e63" stroke-width="2"/>
            <path d="M18 36 L46 36" stroke="#e57373" stroke-width="4"/>
            <circle cx="32" cy="16" r="5" fill="#e53935"/><path d="M32 11 C34 7 37 6 39 7" stroke="#2e7d32" stroke-width="2" fill="none"/>`;
    },

    // ---------- Colonia espacial ----------
    panel() {
        return `<rect x="8" y="16" width="48" height="30" rx="2" fill="#1d4fd8" stroke="#90caf9" stroke-width="2" transform="skewX(-12) translate(6 0)"/>
            <path d="M22 16 L16 46 M34 16 L28 46 M46 16 L40 46 M10 31 L54 31" stroke="#90caf9" stroke-width="1.5" transform="translate(4 0)"/>
            <rect x="29" y="46" width="4" height="12" fill="#9e9e9e"/>`;
    },
    satelite() {
        return `<rect x="2" y="26" width="18" height="12" fill="#1d4fd8" stroke="#90caf9" stroke-width="1.5"/>
            <rect x="44" y="26" width="18" height="12" fill="#1d4fd8" stroke="#90caf9" stroke-width="1.5"/>
            <rect x="20" y="30" width="24" height="4" fill="#9e9e9e"/>
            <rect x="24" y="22" width="16" height="20" rx="3" fill="#e0e0e0" stroke="#616161" stroke-width="2"/>
            <path d="M32 22 L32 12 M26 12 L38 12" stroke="#616161" stroke-width="2.5" stroke-linecap="round"/>`;
    },
    estacion() {
        return `<ellipse cx="32" cy="32" rx="26" ry="10" fill="none" stroke="#ffb703" stroke-width="5"/>
            <rect x="27" y="10" width="10" height="44" rx="5" fill="#eceff1" stroke="#607d8b" stroke-width="2"/>
            <circle cx="32" cy="32" r="6" fill="#4fc3f7"/>`;
    },
    luna() {
        const [d1, r1] = radial("#f5f5f5", "#8e8e8e");
        return `<defs>${d1}</defs><circle cx="32" cy="32" r="24" fill="${r1}"/>
            <circle cx="24" cy="26" r="5" fill="#9e9e9e"/><circle cx="40" cy="38" r="7" fill="#9e9e9e"/><circle cx="38" cy="20" r="3" fill="#9e9e9e"/>`;
    },
    cohete() {
        return `<path d="M32 4 C44 14 46 30 42 44 L22 44 C18 30 20 14 32 4Z" fill="#eceff1" stroke="#607d8b" stroke-width="2"/>
            <circle cx="32" cy="24" r="6" fill="#4fc3f7" stroke="#607d8b" stroke-width="2"/>
            <path d="M22 36 L12 48 L22 46Z M42 36 L52 48 L42 46Z" fill="#e53935"/>
            <path d="M24 46 C26 56 30 60 32 62 C34 60 38 56 40 46Z" fill="#ffb703"/>`;
    },
    anillo() {
        const [d1, r1] = radial("#fff59d", "#ff8f00");
        return `<defs>${d1}</defs><circle cx="32" cy="32" r="12" fill="${r1}"/>
            <ellipse cx="32" cy="32" rx="28" ry="12" fill="none" stroke="#ffd23f" stroke-width="4" transform="rotate(-20 32 32)"/>
            <ellipse cx="32" cy="32" rx="22" ry="22" fill="none" stroke="#ffd23f" stroke-width="2" stroke-dasharray="6 5" opacity="0.7"/>`;
    },
    toque() {
        return `<circle cx="32" cy="32" r="22" fill="none" stroke="#7df9ff" stroke-width="3" opacity="0.6"/>
            <circle cx="32" cy="32" r="12" fill="none" stroke="#7df9ff" stroke-width="3"/>
            <circle cx="32" cy="32" r="5" fill="#7df9ff"/>`;
    },

    // ---------- Mina ----------
    excavadora() {
        return `<rect x="6" y="40" width="36" height="10" rx="5" fill="#37474f"/>
            <rect x="10" y="26" width="26" height="14" rx="2" fill="#f6b800" stroke="#8a6500" stroke-width="2"/>
            <rect x="12" y="16" width="12" height="12" rx="2" fill="#9fdcff" stroke="#8a6500" stroke-width="2"/>
            <path d="M36 30 L50 20 L58 34" stroke="#f6b800" stroke-width="5" fill="none" stroke-linejoin="round"/>
            <path d="M52 32 L62 34 L58 44 L50 40Z" fill="#455a64"/>`;
    },
    pico() {
        return `<path d="M14 54 L44 18" stroke="#8b5a2b" stroke-width="6" stroke-linecap="round"/>
            <path d="M24 10 C36 6 50 12 56 24 C48 18 40 16 34 18 C30 16 26 14 24 10Z" fill="#cfd8dc" stroke="#546e7a" stroke-width="2"/>`;
    },
    fundicion() {
        return `<rect x="10" y="24" width="40" height="32" rx="3" fill="#a4452d" stroke="#5b2a1c" stroke-width="2"/>
            <rect x="38" y="8" width="8" height="18" fill="#3a2a24"/>
            <path d="M20 56 L20 40 C20 34 40 34 40 40 L40 56Z" fill="#ff7a1a"/><path d="M24 56 L24 44 C24 40 36 40 36 44 L36 56Z" fill="#ffe066"/>`;
    },
    taladro() {
        return `<path d="M14 10 L50 10 L46 18 L18 18Z" fill="#ff8a1f" stroke="#8a4a00" stroke-width="2"/>
            <rect x="29" y="18" width="6" height="16" fill="#78909c"/>
            <path d="M24 34 L40 34 L32 58Z" fill="#ffd54a" stroke="#a67c00" stroke-width="2"/>
            <path d="M26 40 L38 38 M28 46 L36 44" stroke="#a67c00" stroke-width="2"/>`;
    },
    orbe() {
        const [d1, r1] = radial("#e1bee7", "#6a1b9a");
        return `<defs>${d1}</defs><circle cx="32" cy="30" r="20" fill="${r1}" stroke="#4a148c" stroke-width="2"/>
            <path d="M18 54 L46 54 L40 48 L24 48Z" fill="#8d6e63"/>${brillo(26, 22, 6, 4)}`;
    },
};

export function icono(nombre, clase = "icono-svg") {
    const dibujo = DIBUJOS[nombre];
    return dibujo ? `<svg class="${clase}" viewBox="0 0 64 64" aria-hidden="true">${dibujo()}</svg>` : "";
}
