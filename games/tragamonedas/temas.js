// Temáticas del tragamonedas. Todas usan las mismas reglas (reglas.js): solo cambian los dibujos,
// los colores, la marquesina y dónde se guardan los pozos y logros. Los nombres internos de los
// símbolos (cereza, limon, ... siete, comodin, bono) se mantienen; cada tema los dibuja a su manera.
const TAU = Math.PI * 2;

// h: { x (contexto centrado, ±64), radial, texto, sombra, sinSombra }
function dibujarEgipto(nombre, h) {
    const { x, radial, texto, sinSombra } = h;
    const oro = () => {
        const g = x.createLinearGradient(-50, -60, 50, 60);
        g.addColorStop(0, "#fff3b0");
        g.addColorStop(0.4, "#ffd166");
        g.addColorStop(1, "#9c6500");
        return g;
    };
    if (nombre === "cereza") {
        // Ankh
        x.strokeStyle = oro();
        x.lineWidth = 16;
        x.lineCap = "round";
        x.beginPath();
        x.ellipse(0, -30, 20, 26, 0, 0, TAU);
        x.moveTo(0, -4);
        x.lineTo(0, 58);
        x.moveTo(-36, 10);
        x.lineTo(36, 10);
        x.stroke();
    } else if (nombre === "limon") {
        // Escarabajo turquesa
        x.fillStyle = radial(0, 6, 44, "#4dd9c4", "#0b6e63");
        x.beginPath();
        x.ellipse(0, 8, 36, 44, 0, 0, TAU);
        x.fill();
        x.fillStyle = "#0b4f4a";
        x.beginPath();
        x.ellipse(0, -40, 20, 14, 0, 0, TAU);
        x.fill();
        sinSombra();
        x.strokeStyle = "#ffd166";
        x.lineWidth = 3;
        x.beginPath();
        x.moveTo(0, -30);
        x.lineTo(0, 52);
        x.stroke();
        x.lineWidth = 5;
        x.lineCap = "round";
        x.strokeStyle = "#0b4f4a";
        x.beginPath();
        for (const lado of [-1, 1]) for (const y of [-14, 8, 30]) {
            x.moveTo(lado * 34, y);
            x.lineTo(lado * 52, y + (y - 8) * 0.3 + 8);
        }
        x.stroke();
    } else if (nombre === "uva") {
        // Ojo de Horus
        x.fillStyle = "#fff8e7";
        x.beginPath();
        x.moveTo(-54, 0);
        x.quadraticCurveTo(0, -42, 54, 0);
        x.quadraticCurveTo(0, 30, -54, 0);
        x.fill();
        sinSombra();
        x.fillStyle = radial(0, -2, 18, "#4895ef", "#03045e");
        x.beginPath();
        x.arc(0, -2, 17, 0, TAU);
        x.fill();
        x.strokeStyle = "#1b263b";
        x.lineWidth = 7;
        x.lineCap = "round";
        x.beginPath();
        x.moveTo(-58, 0);
        x.quadraticCurveTo(0, -46, 58, -4);
        x.moveTo(-60, -26);
        x.quadraticCurveTo(0, -60, 50, -36);
        x.moveTo(-6, 22);
        x.lineTo(-10, 54);
        x.moveTo(14, 20);
        x.quadraticCurveTo(30, 54, 52, 38);
        x.stroke();
    } else if (nombre === "campana") {
        // Gato egipcio
        x.fillStyle = "#1b1b1b";
        x.beginPath();
        x.ellipse(0, 30, 30, 34, 0, 0, TAU);
        x.fill();
        x.beginPath();
        x.arc(0, -22, 22, 0, TAU);
        x.moveTo(-20, -30);
        x.lineTo(-18, -60);
        x.lineTo(-4, -40);
        x.moveTo(20, -30);
        x.lineTo(18, -60);
        x.lineTo(4, -40);
        x.fill();
        sinSombra();
        x.fillStyle = "#ffd166";
        x.fillRect(-20, -2, 40, 8);
        x.fillStyle = "#4dd9c4";
        for (const dx of [-14, 0, 14]) {
            x.beginPath();
            x.arc(dx, 8, 4, 0, TAU);
            x.fill();
        }
        x.fillStyle = "#c9f76f";
        for (const dx of [-9, 9]) {
            x.beginPath();
            x.ellipse(dx, -24, 5, 3, 0, 0, TAU);
            x.fill();
        }
    } else if (nombre === "bar") {
        // Pirámide al sol
        const g = x.createLinearGradient(-60, 0, 60, 0);
        g.addColorStop(0, "#f4d58d");
        g.addColorStop(0.5, "#e9b44c");
        g.addColorStop(0.51, "#b07d2b");
        g.addColorStop(1, "#8a5a00");
        x.fillStyle = g;
        x.beginPath();
        x.moveTo(0, -54);
        x.lineTo(62, 44);
        x.lineTo(-62, 44);
        x.closePath();
        x.fill();
        sinSombra();
        x.strokeStyle = "#8a5a0088";
        x.lineWidth = 2;
        x.beginPath();
        for (const y of [-20, 4, 26]) {
            const w = ((y + 54) / 98) * 62;
            x.moveTo(-w, y);
            x.lineTo(w, y);
        }
        x.stroke();
        x.fillStyle = "#ffd166";
        x.beginPath();
        x.moveTo(0, -54);
        x.lineTo(10, -38);
        x.lineTo(-10, -38);
        x.fill();
    } else if (nombre === "estrella") {
        // Sol de Ra
        x.fillStyle = oro();
        x.beginPath();
        for (let k = 0; k < 24; k++) {
            const a = (k / 24) * TAU;
            const r = k % 2 ? 40 : 60;
            x.lineTo(Math.cos(a) * r, Math.sin(a) * r);
        }
        x.closePath();
        x.fill();
        x.fillStyle = radial(0, 0, 34, "#ff8c42", "#c1121f");
        x.beginPath();
        x.arc(0, 0, 32, 0, TAU);
        x.fill();
    } else if (nombre === "diamante") {
        // Cartucho con jeroglíficos
        x.fillStyle = oro();
        x.beginPath();
        x.roundRect(-34, -60, 68, 120, 34);
        x.fill();
        sinSombra();
        x.strokeStyle = "#7a4a00";
        x.lineWidth = 4;
        x.stroke();
        x.fillStyle = "#1d3557";
        x.beginPath();
        x.arc(0, -34, 9, 0, TAU);
        x.fill();
        x.fillRect(-14, -14, 28, 6);
        x.beginPath();
        x.moveTo(-12, 8);
        x.lineTo(12, 8);
        x.lineTo(0, 26);
        x.fill();
        x.fillStyle = "#c1121f";
        x.beginPath();
        x.arc(0, 42, 7, 0, TAU);
        x.fill();
    } else if (nombre === "siete") {
        // Máscara del faraón
        x.fillStyle = "#1d4e89";
        x.beginPath();
        x.moveTo(-54, 60);
        x.lineTo(-46, -30);
        x.quadraticCurveTo(0, -78, 46, -30);
        x.lineTo(54, 60);
        x.closePath();
        x.fill();
        sinSombra();
        x.strokeStyle = "#ffd166";
        x.lineWidth = 7;
        x.beginPath();
        for (const dx of [-38, -26, 26, 38]) {
            x.moveTo(dx, -26);
            x.lineTo(dx * 1.15, 58);
        }
        x.stroke();
        x.fillStyle = oro();
        x.beginPath();
        x.ellipse(0, 2, 26, 34, 0, 0, TAU);
        x.fill();
        x.fillStyle = "#1b1b1b";
        for (const dx of [-11, 11]) {
            x.beginPath();
            x.ellipse(dx, -6, 7, 4, 0, 0, TAU);
            x.fill();
        }
        x.fillStyle = "#1d4e89";
        x.fillRect(-4, 34, 8, 22);
        x.fillStyle = "#ffd166";
        x.beginPath();
        x.moveTo(0, -48);
        x.lineTo(7, -36);
        x.lineTo(-7, -36);
        x.fill();
    } else if (nombre === "comodin") {
        const g = x.createLinearGradient(-60, -60, 60, 60);
        g.addColorStop(0, "#ffd166");
        g.addColorStop(1, "#9c6500");
        x.fillStyle = g;
        x.beginPath();
        x.roundRect(-64, -50, 128, 100, 22);
        x.fill();
        x.strokeStyle = "#1d4e89";
        x.lineWidth = 6;
        x.stroke();
        texto("WILD", 40, "#1d4e89", "#fff3b0", 4);
    } else if (nombre === "bono") {
        // Papiro
        x.fillStyle = "#f1dca7";
        x.beginPath();
        x.roundRect(-56, -42, 112, 84, 8);
        x.fill();
        x.fillStyle = "#c9a96e";
        for (const dx of [-60, 60]) {
            x.beginPath();
            x.ellipse(dx, 0, 9, 46, 0, 0, TAU);
            x.fill();
        }
        texto("BONO", 30, "#c1121f", "#fff3b0", 2);
    } else return false;
    return true;
}

function dibujarPirata(nombre, h) {
    const { x, radial, texto, sinSombra } = h;
    if (nombre === "cereza") {
        // Doblón
        x.fillStyle = radial(0, 0, 54, "#ffe066", "#a8661b");
        x.beginPath();
        x.arc(0, 0, 54, 0, TAU);
        x.fill();
        sinSombra();
        x.strokeStyle = "#7a4a00";
        x.lineWidth = 4;
        x.beginPath();
        x.arc(0, 0, 44, 0, TAU);
        x.stroke();
        x.fillStyle = "#7a4a00";
        x.beginPath();
        x.arc(0, -6, 16, 0, TAU);
        x.fill();
        x.fillRect(-9, 6, 18, 12);
        x.fillStyle = "#ffe066";
        for (const dx of [-6, 6]) {
            x.beginPath();
            x.arc(dx, -8, 4, 0, TAU);
            x.fill();
        }
    } else if (nombre === "limon") {
        // Botella de ron
        x.fillStyle = radial(0, 14, 40, "#6a994e", "#1b4332");
        x.beginPath();
        x.moveTo(-10, -60);
        x.lineTo(10, -60);
        x.lineTo(10, -30);
        x.quadraticCurveTo(34, -20, 34, 6);
        x.lineTo(34, 54);
        x.quadraticCurveTo(0, 62, -34, 54);
        x.lineTo(-34, 6);
        x.quadraticCurveTo(-34, -20, -10, -30);
        x.closePath();
        x.fill();
        sinSombra();
        x.fillStyle = "#8d5a2b";
        x.fillRect(-11, -66, 22, 12);
        x.fillStyle = "#f1dca7";
        x.fillRect(-26, 6, 52, 30);
        texto("RON", 18, "#7a0010", "#f1dca7", 21);
        x.fillStyle = "#fff5";
        x.fillRect(-28, -6, 6, 50);
    } else if (nombre === "uva") {
        // Brújula
        x.fillStyle = radial(0, 0, 56, "#d4a373", "#6f4518");
        x.beginPath();
        x.arc(0, 0, 56, 0, TAU);
        x.fill();
        sinSombra();
        x.fillStyle = "#fff8e7";
        x.beginPath();
        x.arc(0, 0, 44, 0, TAU);
        x.fill();
        x.fillStyle = "#c1121f";
        x.beginPath();
        x.moveTo(0, -40);
        x.lineTo(10, 0);
        x.lineTo(-10, 0);
        x.fill();
        x.fillStyle = "#1b263b";
        x.beginPath();
        x.moveTo(0, 40);
        x.lineTo(10, 0);
        x.lineTo(-10, 0);
        x.fill();
        texto("N", 16, "#1b263b", "#fff8e7", -30);
    } else if (nombre === "campana") {
        // Ancla
        x.strokeStyle = radial(0, 0, 60, "#adb5bd", "#343a40");
        x.lineWidth = 12;
        x.lineCap = "round";
        x.beginPath();
        x.moveTo(0, -40);
        x.lineTo(0, 50);
        x.moveTo(-30, -24);
        x.lineTo(30, -24);
        x.moveTo(-50, 14);
        x.quadraticCurveTo(-40, 56, 0, 56);
        x.quadraticCurveTo(40, 56, 50, 14);
        x.stroke();
        x.lineWidth = 8;
        x.beginPath();
        x.arc(0, -52, 12, 0, TAU);
        x.stroke();
    } else if (nombre === "bar") {
        // Mapa del tesoro
        x.fillStyle = "#f1dca7";
        x.beginPath();
        x.moveTo(-58, -40);
        x.lineTo(54, -46);
        x.lineTo(58, 42);
        x.lineTo(-54, 46);
        x.closePath();
        x.fill();
        sinSombra();
        x.strokeStyle = "#8d5a2b";
        x.setLineDash([6, 6]);
        x.lineWidth = 3;
        x.beginPath();
        x.moveTo(-40, 30);
        x.quadraticCurveTo(-10, -30, 26, 4);
        x.stroke();
        x.setLineDash([]);
        x.strokeStyle = "#c1121f";
        x.lineWidth = 7;
        x.beginPath();
        x.moveTo(20, -6);
        x.lineTo(40, 14);
        x.moveTo(40, -6);
        x.lineTo(20, 14);
        x.stroke();
    } else if (nombre === "estrella") {
        // Loro
        x.fillStyle = radial(0, 0, 50, "#ff4d4d", "#9d0208");
        x.beginPath();
        x.ellipse(0, 8, 30, 46, 0.15, 0, TAU);
        x.fill();
        x.fillStyle = "#4361ee";
        x.beginPath();
        x.ellipse(-12, 20, 16, 34, 0.5, 0, TAU);
        x.fill();
        x.fillStyle = "#ffd60a";
        x.beginPath();
        x.ellipse(10, 44, 12, 18, -0.3, 0, TAU);
        x.fill();
        sinSombra();
        x.fillStyle = "#1b1b1b";
        x.beginPath();
        x.moveTo(20, -26);
        x.quadraticCurveTo(44, -24, 34, -4);
        x.lineTo(20, -12);
        x.fill();
        x.fillStyle = "#fff";
        x.beginPath();
        x.arc(6, -28, 7, 0, TAU);
        x.fill();
        x.fillStyle = "#111";
        x.beginPath();
        x.arc(8, -28, 3.5, 0, TAU);
        x.fill();
    } else if (nombre === "diamante") {
        // Espadas cruzadas
        for (const s of [1, -1]) {
            x.save();
            x.rotate(s * 0.7);
            const g = x.createLinearGradient(-6, 0, 6, 0);
            g.addColorStop(0, "#e9ecef");
            g.addColorStop(1, "#868e96");
            x.fillStyle = g;
            x.beginPath();
            x.moveTo(-5, 30);
            x.lineTo(-5, -50);
            x.lineTo(0, -62);
            x.lineTo(5, -50);
            x.lineTo(5, 30);
            x.fill();
            x.fillStyle = "#ffd166";
            x.fillRect(-18, 28, 36, 7);
            x.fillStyle = "#6f4518";
            x.fillRect(-4, 35, 8, 20);
            x.restore();
        }
    } else if (nombre === "siete") {
        // Calavera pirata
        x.fillStyle = "#1b1b1b";
        x.beginPath();
        x.moveTo(-60, -20);
        x.quadraticCurveTo(0, -84, 60, -20);
        x.quadraticCurveTo(0, -34, -60, -20);
        x.fill();
        sinSombra();
        x.fillStyle = "#c1121f";
        x.fillRect(-40, -30, 80, 6);
        x.fillStyle = "#f8f9fa";
        x.beginPath();
        x.ellipse(0, 4, 36, 34, 0, 0, TAU);
        x.fill();
        x.fillRect(-20, 30, 40, 18);
        x.fillStyle = "#1b1b1b";
        for (const dx of [-14, 14]) {
            x.beginPath();
            x.ellipse(dx, 2, 10, 11, 0, 0, TAU);
            x.fill();
        }
        x.beginPath();
        x.moveTo(0, 14);
        x.lineTo(5, 24);
        x.lineTo(-5, 24);
        x.fill();
        x.fillRect(-12, 36, 4, 12);
        x.fillRect(-2, 36, 4, 12);
        x.fillRect(8, 36, 4, 12);
    } else if (nombre === "comodin") {
        x.fillStyle = "#1b1b1b";
        x.beginPath();
        x.roundRect(-64, -50, 128, 100, 22);
        x.fill();
        x.strokeStyle = "#c1121f";
        x.lineWidth = 6;
        x.stroke();
        texto("WILD", 40, "#fff", "#c1121f", 4);
    } else if (nombre === "bono") {
        // Cofre del tesoro
        x.fillStyle = "#6f4518";
        x.fillRect(-56, -6, 112, 50);
        x.fillStyle = "#8d5a2b";
        x.beginPath();
        x.ellipse(0, -6, 56, 30, 0, Math.PI, 0);
        x.fill();
        sinSombra();
        x.fillStyle = "#ffd166";
        x.fillRect(-56, 2, 112, 7);
        x.fillRect(-6, -10, 12, 20);
        texto("BONO", 26, "#ffd166", "#3d2310", 30);
    } else return false;
    return true;
}

export const TEMAS = {
    clasico: {
        clave: "tragamonedas",
        marquesina: "<span>★</span> FORTUNA DORADA <span>★</span>",
        gabinete: ["#ffd166", "#b5179e", "#560bad"],
        borde: "#fff3b0",
        ventana: "#1a0526",
        rodillo: ["#d9d9e6", "#ffffff"],
        luz: "#fffbe0",
        dibujar: null,
    },
    egipto: {
        clave: "tragamonedas-faraon",
        marquesina: "<span>☥</span> TESORO DEL FARAÓN <span>☥</span>",
        gabinete: ["#ffd166", "#b07d2b", "#3d2a0c"],
        borde: "#4dd9c4",
        ventana: "#1d1404",
        rodillo: ["#e8d3a2", "#fbf1d9"],
        luz: "#4dd9c4",
        dibujar: dibujarEgipto,
    },
    pirata: {
        clave: "tragamonedas-pirata",
        marquesina: "<span>☠</span> TESORO PIRATA <span>☠</span>",
        gabinete: ["#c08552", "#6f4518", "#2b1a0c"],
        borde: "#ffd166",
        ventana: "#120a03",
        rodillo: ["#cdb891", "#f6ead2"],
        luz: "#ffd166",
        dibujar: dibujarPirata,
    },
};
