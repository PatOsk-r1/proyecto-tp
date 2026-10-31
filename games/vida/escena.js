// Escenas ilustradas de Vidas cruzadas: el lugar dibujado (según la hora del día) y los personajes
// haciendo lo que eligieron. Todo se dibuja en un canvas, sin imágenes.
const TAU = Math.PI * 2;

// ---------- Personas ----------
// Origen en los pies, mide unas 130 unidades. pose: parado, caminar, compu, libro, pesas, taza,
// baile, saludo, sentado, dormir, comer. t: tiempo en segundos (para animar).
export function dibujarPersonaEn(ctx, x, y, s, p, pose = "parado", t = 0, mira = 1) {
    if (!p) return;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s * mira, s);
    if (pose === "dormir") {
        ctx.rotate(-Math.PI / 2);
        ctx.translate(10, 30);
    }
    const sentado = pose === "compu" || pose === "sentado" || pose === "comer";
    const bob = pose === "caminar" ? Math.abs(Math.sin(t * 7)) * 3 : pose === "baile" ? Math.abs(Math.sin(t * 5)) * 6 : 0;
    ctx.translate(0, -bob);
    const pantalon = "#2b3150";
    // Piernas
    ctx.fillStyle = pantalon;
    if (sentado) {
        ctx.beginPath();
        ctx.roundRect(-20, -26, 40, 12, 5);
        ctx.roundRect(8, -26, 12, 26, 5);
        ctx.roundRect(-20, -26, 12, 26, 5);
        ctx.fill();
    } else {
        const paso = pose === "caminar" ? Math.sin(t * 7) * 5 : 0;
        ctx.beginPath();
        ctx.roundRect(-17 + paso, -28, 14, 28, 6);
        ctx.roundRect(3 - paso, -28, 14, 28, 6);
        ctx.fill();
    }
    // Pelo largo de atrás
    ctx.fillStyle = p.pelo;
    if (p.peinado === "largo") {
        ctx.beginPath();
        ctx.roundRect(-28, -120, 56, 70, 26);
        ctx.fill();
    }
    // Torso
    ctx.fillStyle = p.ropa;
    ctx.beginPath();
    ctx.roundRect(-30, -62, 60, 40, [22, 22, 8, 8]);
    ctx.fill();
    // Brazos: del hombro a la mano según la pose
    const manos = posicionManos(pose, t);
    ctx.lineCap = "round";
    for (const [lado, m] of [[-1, manos[0]], [1, manos[1]]]) {
        const hx = lado * 26;
        const hy = -54;
        ctx.strokeStyle = p.ropa;
        ctx.lineWidth = 12;
        ctx.beginPath();
        ctx.moveTo(hx, hy);
        ctx.lineTo(hx + (m[0] - hx) * 0.55, hy + (m[1] - hy) * 0.55);
        ctx.stroke();
        ctx.strokeStyle = p.piel;
        ctx.lineWidth = 9;
        ctx.beginPath();
        ctx.moveTo(hx + (m[0] - hx) * 0.5, hy + (m[1] - hy) * 0.5);
        ctx.lineTo(m[0], m[1]);
        ctx.stroke();
    }
    objetoEnMano(ctx, pose, manos, t);
    // Cuello y cabeza
    ctx.fillStyle = p.piel;
    ctx.beginPath();
    ctx.roundRect(-7, -72, 14, 14, 4);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(0, -92, 22, 25, 0, 0, TAU);
    ctx.fill();
    pelo(ctx, p);
    // Cara
    ctx.fillStyle = "#1d1d2b";
    if (pose === "dormir") {
        ctx.strokeStyle = "#1d1d2b";
        ctx.lineWidth = 2;
        for (const dx of [-8, 8]) {
            ctx.beginPath();
            ctx.arc(dx, -91, 3, 0.1 * Math.PI, 0.9 * Math.PI);
            ctx.stroke();
        }
    } else {
        for (const dx of [-8, 8]) {
            ctx.beginPath();
            ctx.ellipse(dx, -90, 2.3, 3, 0, 0, TAU);
            ctx.fill();
        }
    }
    ctx.strokeStyle = "#00000070";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, -84, 6, 0.2 * Math.PI, 0.8 * Math.PI);
    ctx.stroke();
    ctx.restore();
}

function posicionManos(pose, t) {
    switch (pose) {
        case "caminar": return [[-32 + Math.sin(t * 7) * 7, -24], [32 - Math.sin(t * 7) * 7, -24]];
        case "compu": return [[-14 + Math.sin(t * 18) * 2, -40], [14 + Math.cos(t * 16) * 2, -40]];
        case "libro": return [[-14, -44], [14, -44]];
        case "pesas": {
            const y = -64 - (0.5 + 0.5 * Math.sin(t * 3.5)) * 44;
            return [[-38, y], [38, y]];
        }
        case "taza": {
            const tomar = Math.sin(t * 1.6) > 0.55;
            return [[-30, -26], tomar ? [8, -80] : [26, -36]];
        }
        case "baile": return [[-36, -84 + Math.sin(t * 5) * 14], [36, -84 - Math.sin(t * 5) * 14]];
        case "saludo": return [[-30, -26], [40, -96 + Math.sin(t * 8) * 6]];
        case "comer": return [[-16, -38], [16 + Math.sin(t * 3) * 3, -40 - Math.max(0, Math.sin(t * 3)) * 30]];
        case "abrazo": return [[-22, -46], [40, -50]];
        case "dormir": return [[-24, -30], [24, -30]];
        default: return [[-32, -22], [32, -22]];
    }
}

function objetoEnMano(ctx, pose, manos, t) {
    if (pose === "pesas") {
        ctx.fillStyle = "#3a3f55";
        for (const [x, y] of manos) {
            ctx.fillRect(x - 12, y - 3, 24, 6);
            ctx.fillRect(x - 14, y - 9, 6, 18);
            ctx.fillRect(x + 8, y - 9, 6, 18);
        }
    } else if (pose === "libro") {
        ctx.fillStyle = "#c0392b";
        ctx.fillRect(-18, -58, 36, 22);
        ctx.fillStyle = "#f4ead5";
        ctx.fillRect(-16, -56, 15, 18);
        ctx.fillRect(1, -56, 15, 18);
    } else if (pose === "taza") {
        const [x, y] = manos[1];
        ctx.fillStyle = "#f4ead5";
        ctx.fillRect(x - 6, y - 12, 12, 13);
        ctx.strokeStyle = "#f4ead5";
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(x + 7, y - 6, 4, -Math.PI / 2, Math.PI / 2);
        ctx.stroke();
        if (Math.sin(t * 1.6) <= 0.55) {
            ctx.strokeStyle = "#ffffff55";
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(x - 2, y - 15);
            ctx.quadraticCurveTo(x + 3, y - 21, x - 1, y - 27);
            ctx.stroke();
        }
    }
}

function pelo(ctx, p) {
    ctx.fillStyle = p.pelo;
    if (p.peinado === "rulos") {
        for (const [dx, dy, r] of [[-17, -104, 10], [-5, -113, 11], [8, -112, 11], [18, -103, 10], [-21, -92, 8], [22, -92, 8]]) {
            ctx.beginPath();
            ctx.arc(dx, dy, r, 0, TAU);
            ctx.fill();
        }
        return;
    }
    ctx.beginPath();
    ctx.ellipse(0, -100, 24, 19, 0, Math.PI, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-24, -100);
    ctx.quadraticCurveTo(-8, p.peinado === "corto" ? -96 : -92, 6, -101);
    ctx.quadraticCurveTo(16, -95, 24, -100);
    ctx.lineTo(24, -104);
    ctx.lineTo(-24, -104);
    ctx.fill();
    if (p.peinado === "recogido") {
        ctx.beginPath();
        ctx.arc(0, -122, 10, 0, TAU);
        ctx.fill();
    }
    if (p.peinado === "largo") {
        ctx.beginPath();
        ctx.roundRect(-25, -100, 7, 34, 4);
        ctx.roundRect(18, -100, 7, 34, 4);
        ctx.fill();
    }
}

// ---------- Fondos ----------
const LUZ = [
    { cielo: ["#8ecdf7", "#d8efff"], tinte: null },
    { cielo: ["#ff9f6b", "#ffd59a"], tinte: "rgba(255,140,60,0.10)" },
    { cielo: ["#0d1330", "#28305c"], tinte: "rgba(10,16,50,0.38)" },
];

function rect(ctx, x, y, w, h, color, r = 0) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    ctx.fill();
}

function ventana(ctx, x, y, w, h, momento) {
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, LUZ[momento].cielo[0]);
    g.addColorStop(1, LUZ[momento].cielo[1]);
    rect(ctx, x - 4, y - 4, w + 8, h + 8, "#f1ece4", 4);
    rect(ctx, x, y, w, h, g);
    ctx.fillStyle = "#f1ece4";
    ctx.fillRect(x + w / 2 - 2, y, 4, h);
    if (momento === 2) {
        ctx.fillStyle = "#fff";
        for (const [a, b] of [[0.2, 0.3], [0.7, 0.2], [0.4, 0.6]]) ctx.fillRect(x + w * a, y + h * b, 2, 2);
    }
}

// Cada fondo devuelve la línea del piso (y) donde se paran los personajes
const FONDOS = {
    trabajo(ctx, W, H, m) {
        rect(ctx, 0, 0, W, H, "#cfd6e2");
        ventana(ctx, W * 0.62, H * 0.12, W * 0.26, H * 0.36, m);
        rect(ctx, 0, H * 0.78, W, H * 0.22, "#8b93a7");
        rect(ctx, W * 0.08, H * 0.18, W * 0.2, H * 0.22, "#ffffff", 3);
        ctx.fillStyle = "#5ad1c2";
        ctx.fillRect(W * 0.1, H * 0.32, W * 0.04, H * 0.06);
        ctx.fillStyle = "#ff7a6b";
        ctx.fillRect(W * 0.16, H * 0.27, W * 0.04, H * 0.11);
        ctx.fillStyle = "#6c8cff";
        ctx.fillRect(W * 0.22, H * 0.22, W * 0.04, H * 0.16);
        return H * 0.86;
    },
    trabajoFrente(ctx, W, H, x) {
        // Escritorio con la pantalla, delante de la persona
        rect(ctx, x - 70, H * 0.66, 140, 12, "#6b4a2b", 3);
        rect(ctx, x - 64, H * 0.7, 10, H * 0.2, "#5a3d22");
        rect(ctx, x + 54, H * 0.7, 10, H * 0.2, "#5a3d22");
        rect(ctx, x - 34, H * 0.44, 68, 44, "#1f2433", 4);
        rect(ctx, x - 30, H * 0.44 + 4, 60, 36, "#5ad1c2", 2);
        rect(ctx, x - 6, H * 0.44 + 44, 12, 8, "#1f2433");
    },
    facultad(ctx, W, H, m) {
        rect(ctx, 0, 0, W, H, "#e8dfcf");
        rect(ctx, W * 0.1, H * 0.1, W * 0.8, H * 0.42, "#6b4a2b", 4);
        rect(ctx, W * 0.12, H * 0.13, W * 0.76, H * 0.36, "#24493a", 3);
        ctx.strokeStyle = "#ffffffaa";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(W * 0.18, H * 0.22);
        ctx.lineTo(W * 0.42, H * 0.22);
        ctx.moveTo(W * 0.18, H * 0.3);
        ctx.lineTo(W * 0.35, H * 0.3);
        ctx.moveTo(W * 0.55, H * 0.4);
        ctx.quadraticCurveTo(W * 0.65, H * 0.18, W * 0.78, H * 0.38);
        ctx.stroke();
        rect(ctx, 0, H * 0.8, W, H * 0.2, "#b98f5e");
        return H * 0.86;
    },
    gimnasio(ctx, W, H) {
        rect(ctx, 0, 0, W, H, "#2a2f45");
        rect(ctx, W * 0.06, H * 0.12, W * 0.88, H * 0.5, "#3b4466", 4);
        ctx.fillStyle = "#ffffff14";
        ctx.beginPath();
        ctx.moveTo(W * 0.2, H * 0.12);
        ctx.lineTo(W * 0.35, H * 0.12);
        ctx.lineTo(W * 0.22, H * 0.62);
        ctx.lineTo(W * 0.07, H * 0.62);
        ctx.fill();
        rect(ctx, 0, H * 0.78, W, H * 0.22, "#1a1d2b");
        for (let k = 0; k < 6; k++) rect(ctx, W * (0.08 + k * 0.03), H * 0.62, W * 0.02, H * 0.16, k % 2 ? "#ff7a6b" : "#5a627f", 2);
        return H * 0.86;
    },
    cafe(ctx, W, H, m) {
        rect(ctx, 0, 0, W, H, "#5b3b2a");
        rect(ctx, 0, H * 0.55, W, H * 0.45, "#7a5038");
        ventana(ctx, W * 0.08, H * 0.12, W * 0.26, H * 0.34, m);
        for (const x of [0.55, 0.78]) {
            ctx.strokeStyle = "#2a1a12";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(W * x, 0);
            ctx.lineTo(W * x, H * 0.16);
            ctx.stroke();
            ctx.fillStyle = "#ffcf7a";
            ctx.beginPath();
            ctx.arc(W * x, H * 0.2, 9, Math.PI, TAU);
            ctx.fill();
            const g = ctx.createRadialGradient(W * x, H * 0.22, 0, W * x, H * 0.22, 60);
            g.addColorStop(0, "#ffcf7a44");
            g.addColorStop(1, "#ffcf7a00");
            ctx.fillStyle = g;
            ctx.fillRect(W * x - 60, H * 0.22 - 60, 120, 120);
        }
        rect(ctx, 0, H * 0.82, W, H * 0.18, "#3d2619");
        return H * 0.88;
    },
    cafeFrente(ctx, W, H, x) {
        rect(ctx, x - 50, H * 0.68, 100, 8, "#e8dfcf", 4);
        rect(ctx, x - 4, H * 0.7, 8, H * 0.18, "#3d2619");
    },
    plaza(ctx, W, H, m) {
        const g = ctx.createLinearGradient(0, 0, 0, H * 0.7);
        g.addColorStop(0, LUZ[m].cielo[0]);
        g.addColorStop(1, LUZ[m].cielo[1]);
        rect(ctx, 0, 0, W, H, g);
        if (m === 2) {
            ctx.fillStyle = "#fff";
            for (let k = 0; k < 18; k++) ctx.fillRect((k * 53) % W, (k * 29) % (H * 0.5), 2, 2);
            ctx.fillStyle = "#f4ead5";
            ctx.beginPath();
            ctx.arc(W * 0.82, H * 0.18, 12, 0, TAU);
            ctx.fill();
        } else {
            ctx.fillStyle = m === 1 ? "#ffb066" : "#fff6c2";
            ctx.beginPath();
            ctx.arc(W * 0.82, H * 0.2, 16, 0, TAU);
            ctx.fill();
        }
        rect(ctx, 0, H * 0.66, W, H * 0.34, m === 2 ? "#1f3a2b" : "#6fbf73");
        rect(ctx, 0, H * 0.8, W, H * 0.08, m === 2 ? "#3a3a44" : "#d9c9a3");
        // Árbol
        rect(ctx, W * 0.12, H * 0.4, 12, H * 0.3, "#6b4a2b");
        ctx.fillStyle = m === 2 ? "#24452f" : "#3f8f4c";
        for (const [dx, dy, r] of [[0, 0, 34], [-24, 14, 24], [24, 12, 26]]) {
            ctx.beginPath();
            ctx.arc(W * 0.12 + 6 + dx, H * 0.36 + dy, r, 0, TAU);
            ctx.fill();
        }
        // Banco
        rect(ctx, W * 0.62, H * 0.66, W * 0.26, 8, "#8b5a2b", 3);
        rect(ctx, W * 0.64, H * 0.7, 6, 14, "#3a3a44");
        rect(ctx, W * 0.84, H * 0.7, 6, 14, "#3a3a44");
        // Farol de noche
        if (m === 2) {
            rect(ctx, W * 0.5, H * 0.3, 5, H * 0.5, "#2a2a33");
            const l = ctx.createRadialGradient(W * 0.5 + 2, H * 0.3, 0, W * 0.5, H * 0.3, 80);
            l.addColorStop(0, "#ffd98a66");
            l.addColorStop(1, "#ffd98a00");
            ctx.fillStyle = l;
            ctx.fillRect(W * 0.5 - 80, H * 0.3 - 80, 160, 200);
        }
        return H * 0.86;
    },
    bar(ctx, W, H, m, t) {
        rect(ctx, 0, 0, W, H, "#1b1230");
        // Luces de colores que se mueven
        for (const [i, c] of ["#ff4d9d", "#4dd8ff", "#ffd24d"].entries()) {
            const x = W * (0.25 + i * 0.25) + Math.sin(t * 1.3 + i * 2) * W * 0.12;
            const g = ctx.createRadialGradient(x, H * 0.5, 0, x, H * 0.5, H * 0.6);
            g.addColorStop(0, c + "40");
            g.addColorStop(1, c + "00");
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, W, H);
        }
        rect(ctx, W * 0.06, H * 0.14, W * 0.3, H * 0.1, "#ff4d9d22", 6);
        ctx.font = "900 18px system-ui, sans-serif";
        ctx.fillStyle = "#ff8cc2";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.shadowColor = "#ff4d9d";
        ctx.shadowBlur = 12;
        ctx.fillText("BAR", W * 0.21, H * 0.19 + 1);
        ctx.shadowBlur = 0;
        // Estante con botellas
        rect(ctx, W * 0.55, H * 0.3, W * 0.38, 4, "#5a3d22");
        for (let k = 0; k < 7; k++) rect(ctx, W * (0.57 + k * 0.05), H * 0.3 - 22, 8, 22, ["#5ad1c2", "#ff7a6b", "#ffc86b", "#b07cff"][k % 4], 2);
        rect(ctx, 0, H * 0.82, W, H * 0.18, "#120b22");
        return H * 0.88;
    },
    casa(ctx, W, H, m) {
        rect(ctx, 0, 0, W, H, "#e9d9c3");
        ventana(ctx, W * 0.66, H * 0.1, W * 0.22, H * 0.32, m);
        // Lámpara
        rect(ctx, W * 0.1, H * 0.34, 4, H * 0.4, "#4a3a2a");
        ctx.fillStyle = "#ffcf7a";
        ctx.beginPath();
        ctx.moveTo(W * 0.1 - 16, H * 0.34);
        ctx.lineTo(W * 0.1 + 20, H * 0.34);
        ctx.lineTo(W * 0.1 + 12, H * 0.2);
        ctx.lineTo(W * 0.1 - 8, H * 0.2);
        ctx.fill();
        rect(ctx, 0, H * 0.82, W, H * 0.18, "#a97f55");
        // Sillón
        rect(ctx, W * 0.24, H * 0.52, W * 0.52, H * 0.22, "#5a6fa8", 14);
        rect(ctx, W * 0.22, H * 0.6, W * 0.56, H * 0.2, "#4a5d93", 12);
        return H * 0.86;
    },
    cine(ctx, W, H) {
        rect(ctx, 0, 0, W, H, "#0b0d18");
        const g = ctx.createLinearGradient(0, H * 0.06, 0, H * 0.5);
        g.addColorStop(0, "#cfe3ff");
        g.addColorStop(1, "#7aa2e0");
        rect(ctx, W * 0.12, H * 0.06, W * 0.76, H * 0.36, g, 4);
        const luz = ctx.createLinearGradient(0, H * 0.42, 0, H);
        luz.addColorStop(0, "#9cc0ff30");
        luz.addColorStop(1, "#9cc0ff00");
        ctx.fillStyle = luz;
        ctx.fillRect(0, H * 0.42, W, H);
        return H * 0.92;
    },
    cineFrente(ctx, W, H) {
        for (let k = 0; k < 7; k++) rect(ctx, W * (0.02 + k * 0.14), H * 0.74, W * 0.12, H * 0.26, "#7a1f2e", 8);
    },
    restaurante(ctx, W, H, m) {
        rect(ctx, 0, 0, W, H, "#3a2430");
        ventana(ctx, W * 0.08, H * 0.1, W * 0.22, H * 0.3, 2);
        rect(ctx, 0, H * 0.84, W, H * 0.16, "#22141c");
        return H * 0.9;
    },
    restauranteFrente(ctx, W, H, x, t) {
        rect(ctx, x - 70, H * 0.66, 140, 10, "#f4ead5", 4);
        rect(ctx, x - 6, H * 0.68, 12, H * 0.2, "#22141c");
        rect(ctx, x - 3, H * 0.56, 6, 18, "#f4ead5", 2);
        ctx.fillStyle = `rgba(255, 200, 90, ${0.8 + Math.sin(t * 9) * 0.2})`;
        ctx.beginPath();
        ctx.ellipse(x, H * 0.54, 3.5, 6, 0, 0, TAU);
        ctx.fill();
        const g = ctx.createRadialGradient(x, H * 0.55, 0, x, H * 0.55, 70);
        g.addColorStop(0, "#ffc86b40");
        g.addColorStop(1, "#ffc86b00");
        ctx.fillStyle = g;
        ctx.fillRect(x - 70, H * 0.55 - 70, 140, 140);
    },
    boda(ctx, W, H) {
        const g = ctx.createLinearGradient(0, 0, 0, H);
        g.addColorStop(0, "#ffd9e6");
        g.addColorStop(1, "#fff6ec");
        rect(ctx, 0, 0, W, H, g);
        rect(ctx, 0, H * 0.82, W, H * 0.18, "#e8d8c8");
        ctx.strokeStyle = "#f4ead5";
        ctx.lineWidth = 10;
        ctx.beginPath();
        ctx.arc(W / 2, H * 0.6, H * 0.42, Math.PI, TAU);
        ctx.stroke();
        for (let k = 0; k <= 12; k++) {
            const a = Math.PI + (k / 12) * Math.PI;
            ctx.fillStyle = k % 2 ? "#ff8fab" : "#ffffff";
            ctx.beginPath();
            ctx.arc(W / 2 + Math.cos(a) * H * 0.42, H * 0.6 + Math.sin(a) * H * 0.42, 7, 0, TAU);
            ctx.fill();
        }
        return H * 0.88;
    },
};

// Pose de cada lugar
const POSES = { trabajo: "compu", facultad: "libro", gimnasio: "pesas", cafe: "taza", plaza: "caminar", bar: "baile", casa: "sentado" };

// ---------- Escena animada ----------
// escena: { lugar, momento, personas: [{ p, pose }], hijos: [p], texto, festejo }
export function crearEscena(canvas, alTexto) {
    const ctx = canvas.getContext("2d");
    let W = 0;
    let H = 0;
    let actual = null;
    let desde = 0;
    let confeti = [];
    function medir() {
        const caja = canvas.getBoundingClientRect();
        const escala = Math.min(devicePixelRatio || 1, 2);
        W = caja.width;
        H = caja.height;
        canvas.width = Math.round(W * escala);
        canvas.height = Math.round(H * escala);
        ctx.setTransform(escala, 0, 0, escala, 0, 0);
    }
    addEventListener("resize", medir);

    function cuadro(ahora) {
        requestAnimationFrame(cuadro);
        if (!actual || document.hidden) return;
        if (!W) medir();
        const t = ahora / 1000;
        const entra = Math.min(1, (ahora - desde) / 700);
        const e = actual;
        const fondo = FONDOS[e.lugar] ?? FONDOS.plaza;
        ctx.save();
        const piso = fondo(ctx, W, H, e.momento, t);
        const s = (H * 0.56) / 130;
        const n = e.personas.length;
        // Lugares en la escena: uno al centro o dos enfrentados
        const xs = n === 1 ? [W * 0.5] : [W * 0.38, W * 0.62];
        const centro = W * 0.5;
        // Hijos (en casa)
        (e.hijos ?? []).forEach((h, i) => {
            const x = W * (0.16 + i * 0.12);
            dibujarPersonaEn(ctx, x, piso, s * 0.62, h, "parado", t + i);
        });
        e.personas.forEach(({ p, pose }, i) => {
            // Entran caminando desde el costado
            const destino = xs[i];
            const origen = i === 0 && n === 1 ? -W * 0.15 : i === 0 ? -W * 0.15 : W * 1.15;
            const x = origen + (destino - origen) * (1 - (1 - entra) ** 3);
            const caminando = entra < 1;
            const mira = n === 2 ? (i === 0 ? 1 : -1) : 1;
            const yPose = pose === "dormir" ? piso - H * 0.16 : piso;
            dibujarPersonaEn(ctx, x, yPose, s, p, caminando ? "caminar" : pose, t + i * 0.7, mira);
        });
        // Muebles que van adelante de las personas
        if (e.lugar === "trabajo") FONDOS.trabajoFrente(ctx, W, H, centro);
        if (e.lugar === "cafe" && n === 2) FONDOS.cafeFrente(ctx, W, H, centro);
        if (e.lugar === "cine") FONDOS.cineFrente(ctx, W, H);
        if (e.lugar === "restaurante") FONDOS.restauranteFrente(ctx, W, H, centro, t);
        // Luz según la hora (adentro se nota menos)
        const tinte = LUZ[e.momento]?.tinte;
        if (tinte && !["bar", "cine", "restaurante", "boda"].includes(e.lugar)) {
            ctx.fillStyle = e.lugar === "plaza" ? tinte : tinte.replace(/0\.\d+\)$/, (v) => `${(parseFloat(v) * 0.5).toFixed(2)})`);
            ctx.fillRect(0, 0, W, H);
        }
        // Corazones cuando están juntos y bien
        if (e.corazones) {
            for (let k = 0; k < 3; k++) {
                const f = (t * 0.5 + k / 3) % 1;
                ctx.globalAlpha = 1 - f;
                corazon(ctx, centro + Math.sin(f * 6 + k) * 14, H * 0.42 - f * H * 0.3, 7 + f * 4);
            }
            ctx.globalAlpha = 1;
        }
        // Papelitos en la boda o en un nacimiento
        if (e.festejo) {
            if (confeti.length < 60) confeti.push({ x: Math.random() * W, y: -10, v: 40 + Math.random() * 60, c: ["#ff7a6b", "#5ad1c2", "#ffc86b", "#b07cff", "#ffffff"][confeti.length % 5], g: Math.random() * TAU });
            for (const c of confeti) {
                c.y += c.v / 60;
                c.g += 0.1;
                if (c.y > H) c.y = -10;
                ctx.fillStyle = c.c;
                ctx.save();
                ctx.translate(c.x + Math.sin(c.g) * 6, c.y);
                ctx.rotate(c.g);
                ctx.fillRect(-3, -2, 6, 4);
                ctx.restore();
            }
        }
        ctx.restore();
    }
    requestAnimationFrame(cuadro);

    return {
        mostrar(escena, animar = true) {
            const misma = actual && JSON.stringify(actual) === JSON.stringify(escena);
            if (misma) return;
            actual = escena;
            desde = animar ? performance.now() : 0;
            confeti = [];
            alTexto?.(escena.texto ?? "");
            medir();
        },
    };
}

function corazon(ctx, x, y, r) {
    ctx.fillStyle = "#ff6b8b";
    ctx.beginPath();
    ctx.moveTo(x, y + r * 0.9);
    ctx.bezierCurveTo(x - r * 1.6, y - r * 0.2, x - r * 0.6, y - r * 1.4, x, y - r * 0.4);
    ctx.bezierCurveTo(x + r * 0.6, y - r * 1.4, x + r * 1.6, y - r * 0.2, x, y + r * 0.9);
    ctx.fill();
}

export { POSES };
