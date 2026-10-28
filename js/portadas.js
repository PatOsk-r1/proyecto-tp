// Portadas dibujadas en canvas para las tarjetas de la página principal (una por juego).
// dibujarPortada(canvas, clave) pinta la ilustración del juego cuya carpeta es games/<clave>/.
(function () {
    const TAU = Math.PI * 2;
    let ctx, W, H;

    function fondo(a, b, angulo = 1) {
        const g = ctx.createLinearGradient(0, 0, W * angulo, H);
        g.addColorStop(0, a);
        g.addColorStop(1, b);
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);
    }
    function circulo(x, y, r, color) {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, TAU);
        ctx.fill();
    }
    function bola(x, y, r, color, brillo = "#fff") {
        const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r);
        g.addColorStop(0, brillo);
        g.addColorStop(0.25, color);
        g.addColorStop(1, oscurecer(color));
        circulo(x, y, r, g);
    }
    function oscurecer(color) {
        return `color-mix(in srgb, ${color} 55%, #000)`;
    }
    function caja(x, y, w, h, r, color) {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, r);
        ctx.fill();
    }
    function sombra(x, y, rx, ry) {
        ctx.fillStyle = "#0005";
        ctx.beginPath();
        ctx.ellipse(x, y, rx, ry, 0, 0, TAU);
        ctx.fill();
    }
    function estrellas(n, semilla = 3) {
        let s = semilla;
        const azar = () => ((s = (s * 16807) % 2147483647) / 2147483647);
        for (let i = 0; i < n; i++) {
            ctx.globalAlpha = 0.3 + azar() * 0.7;
            ctx.fillStyle = "#fff";
            const r = azar() * 1.6 + 0.4;
            ctx.fillRect(azar() * W, azar() * H, r, r);
        }
        ctx.globalAlpha = 1;
    }
    function brillo(x, y, r, color) {
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, color);
        g.addColorStop(1, "transparent");
        ctx.fillStyle = g;
        ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
    function naipe(x, y, w, rot, palo, valor, rojo) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rot);
        ctx.shadowColor = "#0007";
        ctx.shadowBlur = 8;
        ctx.shadowOffsetY = 3;
        caja(-w / 2, -w * 0.7, w, w * 1.4, w * 0.12, "#fff");
        ctx.shadowColor = "transparent";
        ctx.fillStyle = rojo ? "#d62828" : "#1b1b1b";
        ctx.font = `900 ${w * 0.32}px sans-serif`;
        ctx.textAlign = "left";
        ctx.fillText(valor, -w * 0.4, -w * 0.38);
        ctx.font = `${w * 0.6}px sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(palo, 0, w * 0.12);
        ctx.textBaseline = "alphabetic";
        ctx.restore();
    }
    function ficha(x, y, r, color) {
        ctx.save();
        ctx.translate(x, y);
        circulo(0, 2, r, "#0006");
        circulo(0, 0, r, color);
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = r * 0.22;
        ctx.setLineDash([r * 0.45, r * 0.45]);
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.82, 0, TAU);
        ctx.stroke();
        ctx.setLineDash([]);
        circulo(0, 0, r * 0.5, color);
        ctx.restore();
    }

    const PORTADAS = {
        mina() {
            fondo("#2b1a0e", "#5c3a1e");
            for (let i = 0; i < 6; i++) caja(i * W * 0.18 - 10, H * 0.62 + (i % 2) * 6, W * 0.2, H, 6, i % 2 ? "#4a2e17" : "#3d2512");
            const gemas = [["#4cc9f0", 0.2, 0.45], ["#f72585", 0.78, 0.35], ["#ffd166", 0.6, 0.7], ["#80ed99", 0.32, 0.78]];
            for (const [c, x, y] of gemas) {
                brillo(W * x, H * y, 22, c + "66");
                ctx.fillStyle = c;
                ctx.beginPath();
                ctx.moveTo(W * x, H * y - 9);
                ctx.lineTo(W * x + 7, H * y);
                ctx.lineTo(W * x, H * y + 9);
                ctx.lineTo(W * x - 7, H * y);
                ctx.fill();
            }
            // Pico
            ctx.save();
            ctx.translate(W * 0.5, H * 0.45);
            ctx.rotate(-0.6);
            caja(-3, -4, 6, H * 0.45, 3, "#8d5a2b");
            ctx.fillStyle = "#ced4da";
            ctx.beginPath();
            ctx.moveTo(-W * 0.2, 6);
            ctx.quadraticCurveTo(0, -14, W * 0.2, 6);
            ctx.quadraticCurveTo(0, -4, -W * 0.2, 6);
            ctx.fill();
            ctx.restore();
        },
        granja() {
            fondo("#87c5ff", "#d7f0ff", 0.2);
            circulo(W * 0.85, H * 0.18, 12, "#ffd166");
            caja(0, H * 0.45, W, H, 0, "#74c69d");
            for (let k = 0; k < 3; k++) {
                const x = W * (0.08 + k * 0.2);
                caja(x, H * 0.55, W * 0.17, H * 0.32, 6, "#8d5a2b");
                ctx.fillStyle = ["#e9c46a", "#f77f00", "#e63946"][k];
                for (let j = 0; j < 3; j++) {
                    ctx.beginPath();
                    ctx.arc(x + W * 0.03 + j * W * 0.055, H * 0.68, 4, 0, TAU);
                    ctx.fill();
                }
                ctx.fillStyle = "#52b788";
                for (let j = 0; j < 3; j++) caja(x + W * 0.025 + j * W * 0.055, H * 0.6, 3, 7, 1, "#52b788");
            }
            // Granero rojo
            caja(W * 0.68, H * 0.42, W * 0.26, H * 0.4, 3, "#c1121f");
            ctx.fillStyle = "#780000";
            ctx.beginPath();
            ctx.moveTo(W * 0.65, H * 0.44);
            ctx.lineTo(W * 0.81, H * 0.24);
            ctx.lineTo(W * 0.97, H * 0.44);
            ctx.fill();
            caja(W * 0.76, H * 0.6, W * 0.1, H * 0.22, 2, "#fff");
            caja(W * 0.775, H * 0.62, W * 0.07, H * 0.2, 1, "#780000");
        },
        apilar() {
            fondo("#ff8fab", "#8ec5ff", 0.3);
            const colores = ["#ff595e", "#ffca3a", "#8ac926", "#1982c4", "#6a4c93", "#ff924c"];
            for (let i = 0; i < 6; i++) {
                const w = W * (0.55 - i * 0.04);
                const x = W * 0.5 - w / 2 + (i % 2 ? 6 : -4);
                const y = H * 0.85 - (i + 1) * H * 0.11;
                caja(x, y, w, H * 0.1, 3, colores[i]);
                caja(x, y, w, H * 0.03, 2, "#fff4");
            }
            caja(W * 0.62, H * 0.08, W * 0.3, H * 0.1, 3, "#fff");
        },
        espiral() {
            fondo("#ff5f8f", "#ffb36b");
            caja(W * 0.44, 0, W * 0.12, H, 4, "#fff6");
            for (let i = 0; i < 5; i++) {
                const y = H * 0.15 + i * H * 0.19;
                ctx.fillStyle = i === 3 ? "#2b2d42" : ["#06d6a0", "#118ab2", "#ffd166", "#ef476f", "#8338ec"][i];
                ctx.beginPath();
                ctx.ellipse(W * 0.5, y, W * 0.36, H * 0.07, 0, 0, TAU * 0.82);
                ctx.lineTo(W * 0.5, y);
                ctx.fill();
            }
            bola(W * 0.62, H * 0.08, 9, "#ff006e");
        },
        panaderia() {
            fondo("#5a2d0c", "#b5651d");
            for (let x = 0; x < W; x += 22) caja(x, 0, 11, H * 0.16, 0, "#e63946");
            caja(0, 0, W, H * 0.16, 0, "#0000");
            for (let x = 11; x < W; x += 22) caja(x, 0, 11, H * 0.16, 0, "#fff4e6");
            // Medialuna
            ctx.save();
            ctx.translate(W * 0.42, H * 0.6);
            for (let k = -2; k <= 2; k++) {
                const g = ctx.createRadialGradient(k * 13, -6, 2, k * 13, 0, 18);
                g.addColorStop(0, "#ffd58a");
                g.addColorStop(1, "#c46a14");
                ctx.fillStyle = g;
                ctx.beginPath();
                ctx.ellipse(k * 13, Math.abs(k) * 5, 13 - Math.abs(k) * 2, 15 - Math.abs(k) * 3, k * 0.4, 0, TAU);
                ctx.fill();
            }
            ctx.restore();
            // Dona
            circulo(W * 0.78, H * 0.62, 17, "#e9a05b");
            circulo(W * 0.78, H * 0.6, 15, "#ff8fab");
            circulo(W * 0.78, H * 0.6, 5, "#b5651d");
            for (const [dx, dy, c] of [[-8, -6, "#fff"], [6, -9, "#4cc9f0"], [9, 4, "#ffd166"], [-6, 8, "#80ed99"]]) caja(W * 0.78 + dx, H * 0.6 + dy, 4, 2, 1, c);
        },
        colonia() {
            fondo("#05031a", "#1b1060");
            estrellas(40);
            bola(W * 0.32, H * 0.62, H * 0.32, "#c77dff", "#f1d4ff");
            ctx.strokeStyle = "#ffd166aa";
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.ellipse(W * 0.32, H * 0.62, H * 0.52, H * 0.12, -0.3, 0, TAU);
            ctx.stroke();
            // Satélite
            ctx.save();
            ctx.translate(W * 0.75, H * 0.3);
            ctx.rotate(0.5);
            caja(-22, -5, 14, 10, 1, "#4361ee");
            caja(8, -5, 14, 10, 1, "#4361ee");
            caja(-8, -8, 16, 16, 3, "#dee2e6");
            ctx.restore();
        },
        heroe() {
            fondo("#87c5ff", "#d7f0ff", 0.2);
            caja(0, H * 0.75, W, H, 0, "#3e7b36");
            ctx.fillStyle = "#5c9e52";
            ctx.beginPath();
            ctx.ellipse(W * 0.3, H * 0.78, W * 0.5, H * 0.18, 0, Math.PI, 0);
            ctx.fill();
            // Espada grande
            ctx.save();
            ctx.translate(W * 0.36, H * 0.55);
            ctx.rotate(-0.7);
            const hoja = ctx.createLinearGradient(-5, 0, 5, 0);
            hoja.addColorStop(0, "#fff");
            hoja.addColorStop(1, "#8d99ae");
            ctx.fillStyle = hoja;
            ctx.beginPath();
            ctx.moveTo(-6, 0);
            ctx.lineTo(0, -H * 0.55);
            ctx.lineTo(6, 0);
            ctx.fill();
            caja(-16, -2, 32, 6, 2, "#ffd166");
            caja(-3, 4, 6, 16, 2, "#6c584c");
            ctx.restore();
            // Monstruo baba
            sombra(W * 0.72, H * 0.8, 26, 6);
            const g = ctx.createRadialGradient(W * 0.68, H * 0.5, 2, W * 0.72, H * 0.62, 34);
            g.addColorStop(0, "#d8f3dc");
            g.addColorStop(0.5, "#52b788");
            g.addColorStop(1, "#1b4332");
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.moveTo(W * 0.72 - 30, H * 0.8);
            ctx.quadraticCurveTo(W * 0.72 - 32, H * 0.38, W * 0.72, H * 0.4);
            ctx.quadraticCurveTo(W * 0.72 + 32, H * 0.38, W * 0.72 + 30, H * 0.8);
            ctx.fill();
            circulo(W * 0.69, H * 0.58, 5, "#fff");
            circulo(W * 0.77, H * 0.58, 5, "#fff");
            circulo(W * 0.685, H * 0.59, 2.5, "#000");
            circulo(W * 0.765, H * 0.59, 2.5, "#000");
        },
        ladrillos() {
            fondo("#10002b", "#3c096c");
            const colores = ["#ff006e", "#fb5607", "#ffbe0b", "#3a86ff", "#8338ec"];
            for (let f = 0; f < 4; f++) for (let c = 0; c < 6; c++) {
                if ((f + c) % 5 === 3) continue;
                caja(6 + c * (W - 12) / 6, 10 + f * 13, (W - 12) / 6 - 4, 10, 3, colores[(f + c) % 5]);
            }
            bola(W * 0.58, H * 0.62, 7, "#fff", "#fff");
            brillo(W * 0.58, H * 0.62, 20, "#ffffff55");
            caja(W * 0.35, H * 0.86, W * 0.3, 7, 4, "#7df9ff");
        },
        espacial() {
            fondo("#02010a", "#1a0b45");
            estrellas(50, 9);
            ctx.save();
            ctx.translate(W * 0.5, H * 0.66);
            brillo(0, 22, 18, "#ff9f1caa");
            ctx.fillStyle = "#dee2e6";
            ctx.beginPath();
            ctx.moveTo(0, -24);
            ctx.lineTo(14, 14);
            ctx.lineTo(0, 8);
            ctx.lineTo(-14, 14);
            ctx.fill();
            circulo(0, -4, 4, "#4cc9f0");
            ctx.restore();
            for (const [x, y] of [[0.25, 0.25], [0.75, 0.2], [0.82, 0.45]]) {
                ctx.fillStyle = "#f72585";
                ctx.beginPath();
                ctx.moveTo(W * x, H * y + 9);
                ctx.lineTo(W * x + 10, H * y - 5);
                ctx.lineTo(W * x - 10, H * y - 5);
                ctx.fill();
            }
            caja(W * 0.5 - 1.5, H * 0.2, 3, 14, 2, "#7df9ff");
        },
        torres() {
            fondo("#5fa047", "#3e7b36");
            ctx.strokeStyle = "#a07c4a";
            ctx.lineWidth = 18;
            ctx.lineJoin = "round";
            ctx.beginPath();
            ctx.moveTo(-5, H * 0.3);
            ctx.lineTo(W * 0.6, H * 0.3);
            ctx.lineTo(W * 0.6, H * 0.75);
            ctx.lineTo(W + 5, H * 0.75);
            ctx.stroke();
            ctx.strokeStyle = "#d9b77f";
            ctx.lineWidth = 13;
            ctx.stroke();
            // Torre
            sombra(W * 0.3, H * 0.75, 18, 5);
            caja(W * 0.3 - 13, H * 0.5, 26, 26, 6, "#868e96");
            circulo(W * 0.3, H * 0.6, 9, "#8d99ae");
            caja(W * 0.3 - 2, H * 0.45, 4, 13, 2, "#2b2d42");
            for (const [x, y, c] of [[0.2, 0.3, "#7209b7"], [0.42, 0.3, "#f72585"], [0.6, 0.55, "#7209b7"]]) bola(W * x, H * y, 6, c);
            circulo(W * 0.85, H * 0.4, 6, "#4cc9f0");
        },
        luna() {
            fondo("#05061a", "#151a3a");
            estrellas(30, 5);
            for (let c = 0; c < 4; c++) caja(c * W / 4, H * 0.35, W / 4 - 1, H, 0, c % 2 ? "#6c6f7d" : "#62656f");
            circulo(W * 0.85, H * 0.15, 10, "#3a86ff");
            // Alien
            const x = W * 0.35;
            const y = H * 0.55;
            ctx.strokeStyle = "#1b4332";
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.moveTo(x - 6, y - 12);
            ctx.lineTo(x - 10, y - 22);
            ctx.moveTo(x + 6, y - 12);
            ctx.lineTo(x + 10, y - 22);
            ctx.stroke();
            circulo(x - 10, y - 22, 3, "#ff4d6d");
            circulo(x + 10, y - 22, 3, "#ff4d6d");
            bola(x, y, 15, "#80ed99");
            circulo(x, y - 1, 6, "#fff");
            circulo(x, y + 1, 3, "#000");
            // Torreta
            circulo(W * 0.72, H * 0.82, 12, "#adb5bd");
            caja(W * 0.72 - 3, H * 0.6, 6, 14, 2, "#212529");
            circulo(W * 0.72, H * 0.81, 6, "#4cc9f0");
            caja(W * 0.72 - 2, H * 0.42, 4, 9, 2, "#4cc9f0");
        },
        pool() {
            fondo("#0b6b3a", "#064d29");
            ctx.strokeStyle = "#5a3215";
            ctx.lineWidth = 10;
            ctx.strokeRect(0, 0, W, H);
            const bolas = [["#ffd166", 0.55, 0.45], ["#3a86ff", 0.62, 0.38], ["#d62828", 0.62, 0.52], ["#111", 0.69, 0.45], ["#7b2cbf", 0.69, 0.31], ["#f77f00", 0.69, 0.59]];
            for (const [c, x, y] of bolas) bola(W * x, H * y, 8, c);
            bola(W * 0.25, H * 0.5, 8, "#f8f9fa");
            ctx.strokeStyle = "#e9c46a";
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(W * 0.02, H * 0.85);
            ctx.lineTo(W * 0.2, H * 0.56);
            ctx.stroke();
        },
        arco() {
            fondo("#a8dadc", "#457b9d", 0.2);
            caja(0, H * 0.8, W, H, 0, "#52b788");
            const x = W * 0.68;
            const y = H * 0.45;
            for (const [r, c] of [[26, "#fff"], [21, "#111"], [16, "#3a86ff"], [11, "#e63946"], [6, "#ffd166"]]) circulo(x, y, r, c);
            ctx.strokeStyle = "#6b4226";
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(W * 0.15, H * 0.62);
            ctx.lineTo(x - 2, y + 2);
            ctx.stroke();
            ctx.fillStyle = "#e63946";
            ctx.beginPath();
            ctx.moveTo(W * 0.15, H * 0.62);
            ctx.lineTo(W * 0.1, H * 0.58);
            ctx.lineTo(W * 0.12, H * 0.68);
            ctx.fill();
        },
        cuatro() {
            fondo("#1d3557", "#0b1d33");
            caja(W * 0.12, H * 0.1, W * 0.76, H * 0.82, 10, "#3a86ff");
            const fichas = "  R A  A R  A R R A R A A R R A".split("");
            let k = 0;
            for (let f = 0; f < 4; f++) for (let c = 0; c < 5; c++) {
                const x = W * 0.12 + (c + 0.5) * (W * 0.76) / 5;
                const y = H * 0.1 + (f + 0.5) * (H * 0.82) / 4;
                const v = [" ", " ", "R", " ", "A", " ", "A", "R", " ", "A", "R", "R", "A", "R", "A", "A", "R", "R", "A", "R"][k++];
                if (v === "R") bola(x, y, 8, "#e63946");
                else if (v === "A") bola(x, y, 8, "#ffd166");
                else circulo(x, y, 8, "#0b1d33");
            }
            void fichas;
        },
        tateti() {
            fondo("#ff9f1c", "#f3722c");
            ctx.strokeStyle = "#fff8";
            ctx.lineWidth = 4;
            ctx.lineCap = "round";
            for (const t of [1 / 3, 2 / 3]) {
                ctx.beginPath();
                ctx.moveTo(W * 0.25 + W * 0.5 * t, H * 0.1);
                ctx.lineTo(W * 0.25 + W * 0.5 * t, H * 0.9);
                ctx.moveTo(W * 0.25, H * 0.1 + H * 0.8 * t);
                ctx.lineTo(W * 0.75, H * 0.1 + H * 0.8 * t);
                ctx.stroke();
            }
            const celda = (c, f) => [W * 0.25 + (c + 0.5) * W * 0.5 / 3, H * 0.1 + (f + 0.5) * H * 0.8 / 3];
            ctx.lineWidth = 5;
            for (const [c, f] of [[0, 0], [1, 1], [2, 2]]) {
                const [x, y] = celda(c, f);
                ctx.strokeStyle = "#1d3557";
                ctx.beginPath();
                ctx.moveTo(x - 7, y - 7);
                ctx.lineTo(x + 7, y + 7);
                ctx.moveTo(x + 7, y - 7);
                ctx.lineTo(x - 7, y + 7);
                ctx.stroke();
            }
            for (const [c, f] of [[2, 0], [0, 2]]) {
                const [x, y] = celda(c, f);
                ctx.strokeStyle = "#fff";
                ctx.beginPath();
                ctx.arc(x, y, 8, 0, TAU);
                ctx.stroke();
            }
        },
        damas() {
            fondo("#3d2b1f", "#3d2b1f");
            const n = 6;
            const s = Math.max(W, H) / n;
            for (let f = 0; f < n; f++) for (let c = 0; c < n; c++) caja(c * s, f * s * 0.62, s, s * 0.62, 0, (c + f) % 2 ? "#6f4518" : "#e9c46a");
            for (const [c, f, col] of [[1, 0, "#d62828"], [3, 0, "#d62828"], [2, 1, "#d62828"], [0, 3, "#111"], [2, 3, "#111"], [3, 2, "#111"]]) {
                ficha(c * s + s / 2, f * s * 0.62 + s * 0.31, s * 0.26, col);
            }
        },
        mancala() {
            fondo("#6b4226", "#3d2512");
            caja(W * 0.05, H * 0.2, W * 0.9, H * 0.6, H * 0.3, "#a0703f");
            caja(W * 0.08, H * 0.26, W * 0.1, H * 0.48, 12, "#5c3a1e");
            caja(W * 0.82, H * 0.26, W * 0.1, H * 0.48, 12, "#5c3a1e");
            for (let i = 0; i < 4; i++) for (let f = 0; f < 2; f++) {
                const x = W * (0.29 + i * 0.14);
                const y = H * (0.38 + f * 0.24);
                circulo(x, y, 9, "#5c3a1e");
                for (let k = 0; k < 3; k++) bola(x + Math.cos(k * 2 + i) * 3.5, y + Math.sin(k * 2 + i) * 3.5, 2.6, ["#ffd166", "#06d6a0", "#ef476f"][k]);
            }
        },
        naval() {
            fondo("#0077b6", "#023e8a", 0.2);
            ctx.strokeStyle = "#ffffff22";
            for (let x = 0; x < W; x += 14) {
                ctx.beginPath();
                ctx.moveTo(x, 0);
                ctx.lineTo(x, H);
                ctx.stroke();
            }
            for (let y = 0; y < H; y += 14) {
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(W, y);
                ctx.stroke();
            }
            ctx.fillStyle = "#adb5bd";
            ctx.beginPath();
            ctx.moveTo(W * 0.15, H * 0.55);
            ctx.lineTo(W * 0.75, H * 0.55);
            ctx.lineTo(W * 0.68, H * 0.72);
            ctx.lineTo(W * 0.22, H * 0.72);
            ctx.fill();
            caja(W * 0.35, H * 0.4, W * 0.2, H * 0.16, 3, "#6c757d");
            caja(W * 0.43, H * 0.28, 5, H * 0.14, 2, "#495057");
            brillo(W * 0.8, H * 0.3, 22, "#ff9f1ccc");
            circulo(W * 0.8, H * 0.3, 6, "#ffd166");
        },
        reversi() {
            fondo("#2d6a4f", "#1b4332");
            const s = H / 4;
            for (let f = 0; f < 4; f++) for (let c = 0; c < 6; c++) {
                ctx.strokeStyle = "#0004";
                ctx.strokeRect(W / 2 - 3 * s + c * s, f * s, s, s);
                if ((f + c) % 3 !== 0) bola(W / 2 - 3 * s + c * s + s / 2, f * s + s / 2, s * 0.36, (f * 2 + c) % 2 ? "#f8f9fa" : "#212529", (f * 2 + c) % 2 ? "#fff" : "#777");
            }
        },
        cajas() {
            fondo("#4361ee", "#3a0ca3");
            const s = 22;
            const ox = W / 2 - s * 2.5;
            const oy = H / 2 - s * 1.5;
            caja(ox + s, oy, s, s, 2, "#ff9f1c88");
            caja(ox + s * 3, oy + s, s, s, 2, "#7df9ff88");
            caja(ox, oy + s * 2, s, s, 2, "#ff9f1c88");
            ctx.lineWidth = 3;
            ctx.lineCap = "round";
            for (let f = 0; f <= 3; f++) for (let c = 0; c <= 5; c++) {
                if (c < 5 && (f + c) % 2 === 0) {
                    ctx.strokeStyle = (f + c) % 4 ? "#ff9f1c" : "#7df9ff";
                    ctx.beginPath();
                    ctx.moveTo(ox + c * s, oy + f * s);
                    ctx.lineTo(ox + (c + 1) * s, oy + f * s);
                    ctx.stroke();
                }
                if (f < 3 && (f + c) % 3 !== 1) {
                    ctx.strokeStyle = (f + c) % 2 ? "#7df9ff" : "#ff9f1c";
                    ctx.beginPath();
                    ctx.moveTo(ox + c * s, oy + f * s);
                    ctx.lineTo(ox + c * s, oy + (f + 1) * s);
                    ctx.stroke();
                }
            }
            for (let f = 0; f <= 3; f++) for (let c = 0; c <= 5; c++) circulo(ox + c * s, oy + f * s, 3, "#fff");
        },
        blackjack() {
            fondo("#0b6b3a", "#063d21");
            naipe(W * 0.4, H * 0.55, 34, -0.2, "♠", "A", false);
            naipe(W * 0.6, H * 0.52, 34, 0.15, "♥", "K", true);
            ficha(W * 0.15, H * 0.75, 11, "#d62828");
            ficha(W * 0.85, H * 0.3, 11, "#1d3557");
        },
        ruleta() {
            fondo("#0b3d24", "#04170d");
            const x = W / 2;
            const y = H * 0.55;
            const r = H * 0.42;
            circulo(x, y, r + 5, "#6b4226");
            for (let i = 0; i < 18; i++) {
                ctx.fillStyle = i === 0 ? "#2a9d8f" : i % 2 ? "#d62828" : "#111";
                ctx.beginPath();
                ctx.moveTo(x, y);
                ctx.arc(x, y, r, (i / 18) * TAU, ((i + 1) / 18) * TAU);
                ctx.fill();
            }
            circulo(x, y, r * 0.55, "#8d5a2b");
            circulo(x, y, r * 0.2, "#ffd166");
            bola(x + r * 0.78, y - r * 0.3, 4, "#fff");
        },
        tragamonedas() {
            fondo("#7b2cbf", "#3c096c");
            caja(W * 0.1, H * 0.15, W * 0.8, H * 0.7, 10, "#ffd166");
            const simbolos = ["7", "🍒", "7"];
            for (let i = 0; i < 3; i++) {
                const x = W * 0.15 + i * W * 0.24;
                caja(x, H * 0.24, W * 0.22, H * 0.52, 6, "#fff");
                ctx.fillStyle = "#d62828";
                ctx.font = `900 ${H * 0.34}px sans-serif`;
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.fillText(simbolos[i], x + W * 0.11, H * 0.51);
            }
            ctx.textBaseline = "alphabetic";
        },
        crash() {
            fondo("#07041a", "#2a0b5e");
            estrellas(40, 11);
            ctx.strokeStyle = "#7df9ff";
            ctx.lineWidth = 3;
            ctx.shadowColor = "#7df9ff";
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.moveTo(W * 0.08, H * 0.9);
            ctx.quadraticCurveTo(W * 0.55, H * 0.85, W * 0.78, H * 0.25);
            ctx.stroke();
            ctx.shadowBlur = 0;
            ctx.save();
            ctx.translate(W * 0.8, H * 0.22);
            ctx.rotate(-1.1);
            ctx.fillStyle = "#ff7a1a";
            ctx.beginPath();
            ctx.moveTo(-10, -4);
            ctx.lineTo(-24, 0);
            ctx.lineTo(-10, 4);
            ctx.fill();
            ctx.fillStyle = "#e9ecef";
            ctx.beginPath();
            ctx.moveTo(14, 0);
            ctx.quadraticCurveTo(4, -8, -10, -6);
            ctx.lineTo(-10, 6);
            ctx.quadraticCurveTo(4, 8, 14, 0);
            ctx.fill();
            circulo(3, 0, 3, "#4cc9f0");
            ctx.restore();
            ctx.fillStyle = "#7ee08f";
            ctx.font = "900 22px sans-serif";
            ctx.textAlign = "left";
            ctx.fillText("2.47×", W * 0.1, H * 0.3);
        },
        minas() {
            fondo("#07131d", "#123048");
            const s = Math.min(W, H) / 5.2;
            const ox = W / 2 - s * 2.5;
            const oy = H / 2 - s * 2.5 + 2;
            for (let f = 0; f < 5; f++) for (let c = 0; c < 5; c++) {
                const x = ox + c * s + 1.5;
                const y = oy + f * s + 1.5;
                const abierta = (f * 5 + c) % 3 === 0;
                caja(x, y, s - 3, s - 3, 4, abierta ? "#0a1d2c" : "#2c5c80");
                if (abierta) {
                    ctx.fillStyle = f === 2 && c === 3 ? "#ff4d6d" : "#4ef0b3";
                    ctx.beginPath();
                    ctx.moveTo(x + s / 2 - 1.5, y + s * 0.2);
                    ctx.lineTo(x + s * 0.78, y + s * 0.45);
                    ctx.lineTo(x + s / 2 - 1.5, y + s * 0.75);
                    ctx.lineTo(x + s * 0.2, y + s * 0.45);
                    ctx.fill();
                }
            }
        },
        plinko() {
            fondo("#240046", "#5a189a");
            for (let f = 0; f < 5; f++) for (let c = 0; c <= f + 3; c++) circulo(W / 2 + (c - (f + 3) / 2) * 16, H * 0.14 + f * H * 0.14, 2.6, "#e0aaff");
            const colores = ["#ff006e", "#fb5607", "#ffbe0b", "#8ac926", "#ffbe0b", "#fb5607", "#ff006e"];
            colores.forEach((c, i) => caja(W / 2 + (i - 3.5) * 18 + 1, H * 0.86, 16, H * 0.12, 3, c));
            bola(W * 0.54, H * 0.4, 6, "#ffd166");
            brillo(W * 0.54, H * 0.4, 16, "#ffd16666");
        },
        dados() {
            fondo("#0b6b3a", "#063d21");
            const dado = (x, y, rot, n) => {
                ctx.save();
                ctx.translate(x, y);
                ctx.rotate(rot);
                ctx.shadowColor = "#0008";
                ctx.shadowBlur = 8;
                ctx.shadowOffsetY = 4;
                caja(-18, -18, 36, 36, 8, "#fff");
                ctx.shadowColor = "transparent";
                const p = { 5: [[-9, -9], [9, -9], [0, 0], [-9, 9], [9, 9]], 2: [[-9, -9], [9, 9]], 6: [[-9, -10], [9, -10], [-9, 0], [9, 0], [-9, 10], [9, 10]] }[n];
                for (const [px, py] of p) circulo(px, py, 3.6, "#d62828");
                ctx.restore();
            };
            dado(W * 0.38, H * 0.55, -0.3, 5);
            dado(W * 0.64, H * 0.48, 0.25, 6);
        },
    };

    window.dibujarPortada = function (canvas, clave) {
        const escala = Math.min(devicePixelRatio || 1, 2);
        W = canvas.clientWidth || 160;
        H = canvas.clientHeight || 100;
        canvas.width = Math.round(W * escala);
        canvas.height = Math.round(H * escala);
        ctx = canvas.getContext("2d");
        ctx.setTransform(escala, 0, 0, escala, 0, 0);
        (PORTADAS[clave] ?? (() => fondo("#3a0ca3", "#7209b7")))();
        // Viñeta suave
        const v = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, W * 0.75);
        v.addColorStop(0, "transparent");
        v.addColorStop(1, "#0006");
        ctx.fillStyle = v;
        ctx.fillRect(0, 0, W, H);
    };
})();
