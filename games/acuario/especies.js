// Especies del acuario y su dibujo. Cada pez se pinta mirando a la derecha, centrado en (0, 0),
// con un largo dado y la cola en una de 4 posiciones (cuadros de nado).
const TAU = Math.PI * 2;

// tam: largo relativo · vel: velocidad · cardumen: nadan juntos · come: si es depredador, el tamaño
// máximo de presa (en proporción a su largo) · belleza: cuánto atrae visitas
export const ESPECIES = [
    { id: "neon", nombre: "Neón", tam: 0.42, vel: 1.15, cardumen: true, precio: 20, belleza: 1, nivel: 1, caracter: "Pacífico · cardumen", detalle: "Chiquito y brillante, nada siempre en grupo" },
    { id: "guppy", nombre: "Guppy", tam: 0.5, vel: 1, cardumen: true, precio: 35, belleza: 1.6, nivel: 1, caracter: "Pacífico · cardumen", detalle: "Cola enorme de colores; se reproduce fácil" },
    { id: "payaso", nombre: "Pez payaso", tam: 0.72, vel: 0.95, precio: 120, belleza: 3, nivel: 2, caracter: "Pacífico", detalle: "Naranja con rayas blancas, muy curioso" },
    { id: "angel", nombre: "Pez ángel", tam: 0.95, vel: 0.7, precio: 300, belleza: 5, nivel: 3, caracter: "Pacífico", detalle: "Alto y elegante, se mueve con calma" },
    { id: "globo", nombre: "Pez globo", tam: 0.85, vel: 0.6, precio: 500, belleza: 6, nivel: 4, caracter: "Tranquilo", detalle: "Redondo y simpático; se infla si lo asustan" },
    { id: "disco", nombre: "Disco", tam: 1.1, vel: 0.65, precio: 1200, belleza: 10, nivel: 5, caracter: "Pacífico", detalle: "Plano y redondo, con dibujos que parecen pintados" },
    { id: "leon", nombre: "Pez león", tam: 1.2, vel: 0.75, precio: 2500, belleza: 14, nivel: 6, depredador: 0.45, caracter: "⚠️ Depredador", detalle: "Hermoso pero peligroso: se come a los peces chicos" },
    { id: "tiburon", nombre: "Tiburón bambú", tam: 1.6, vel: 0.9, precio: 8000, belleza: 25, nivel: 8, depredador: 0.55, caracter: "⚠️ Depredador", detalle: "Patrulla el fondo y caza a los que se descuidan" },
];
export const especie = (id) => ESPECIES.find((e) => e.id === id);

export const PLANTAS = [
    { id: "alga", nombre: "Alga cinta", precio: 30, felicidad: 2, color: "#52b788", alto: 0.45 },
    { id: "helecho", nombre: "Helecho de Java", precio: 80, felicidad: 4, color: "#2d6a4f", alto: 0.3 },
    { id: "kelp", nombre: "Kelp gigante", precio: 250, felicidad: 7, color: "#6a994e", alto: 0.75 },
    { id: "roja", nombre: "Ludwigia roja", precio: 400, felicidad: 9, color: "#c1121f", alto: 0.4 },
];
export const DECORACIONES = [
    { id: "roca", nombre: "Roca volcánica", precio: 60, felicidad: 3 },
    { id: "coral", nombre: "Coral", precio: 220, felicidad: 6 },
    { id: "cofre", nombre: "Cofre pirata", precio: 600, felicidad: 10 },
    { id: "castillo", nombre: "Castillo hundido", precio: 1500, felicidad: 18 },
];

const NOMBRES = ["Burbuja", "Nemo", "Coral", "Perla", "Chispa", "Azul", "Mango", "Luna", "Toto", "Pancho", "Lola", "Rayo", "Kiwi", "Ola", "Tito", "Nube", "Sol", "Fideo", "Pipa", "Brisa"];
export const nombreAlAzar = () => NOMBRES[Math.floor(Math.random() * NOMBRES.length)];

function cuerpo(c, L, alto, color1, color2) {
    const g = c.createLinearGradient(0, -alto, 0, alto);
    g.addColorStop(0, color1);
    g.addColorStop(1, color2);
    c.fillStyle = g;
    c.beginPath();
    c.moveTo(L * 0.5, 0);
    c.bezierCurveTo(L * 0.42, -alto * 1.05, -L * 0.18, -alto * 1.05, -L * 0.36, 0);
    c.bezierCurveTo(-L * 0.18, alto * 1.05, L * 0.42, alto * 1.05, L * 0.5, 0);
    c.fill();
}
function cola(c, L, alto, color, onda, larga = 1, horquilla = 0.25) {
    c.save();
    c.translate(-L * 0.34, 0);
    c.rotate(onda * 0.35);
    c.fillStyle = color;
    c.beginPath();
    c.moveTo(0, 0);
    c.quadraticCurveTo(-L * 0.12 * larga, -alto * 0.4, -L * 0.24 * larga, -alto * 0.95 * larga);
    c.quadraticCurveTo(-L * (0.24 - horquilla * 0.3) * larga, 0, -L * 0.24 * larga, alto * 0.95 * larga);
    c.quadraticCurveTo(-L * 0.12 * larga, alto * 0.4, 0, 0);
    c.fill();
    c.restore();
}
function ojo(c, L, alto, x = 0.32) {
    c.fillStyle = "#fff";
    c.beginPath();
    c.arc(L * x, -alto * 0.18, Math.max(1.4, L * 0.055), 0, TAU);
    c.fill();
    c.fillStyle = "#111";
    c.beginPath();
    c.arc(L * (x + 0.008), -alto * 0.18, Math.max(0.9, L * 0.032), 0, TAU);
    c.fill();
    c.fillStyle = "#fff";
    c.beginPath();
    c.arc(L * (x + 0.02), -alto * 0.22, Math.max(0.4, L * 0.012), 0, TAU);
    c.fill();
}
function aleta(c, puntos, color) {
    c.fillStyle = color;
    c.beginPath();
    c.moveTo(puntos[0][0], puntos[0][1]);
    for (let i = 1; i < puntos.length; i++) c.lineTo(puntos[i][0], puntos[i][1]);
    c.closePath();
    c.fill();
}
function brillo(c, L, alto) {
    c.fillStyle = "#ffffff40";
    c.beginPath();
    c.ellipse(L * 0.08, -alto * 0.45, L * 0.22, alto * 0.18, 0, 0, TAU);
    c.fill();
}

// cuadro: 0..3 (posición de la cola al nadar)
export function dibujarPez(c, id, L, cuadro = 0) {
    const onda = Math.sin((cuadro / 4) * TAU);
    if (id === "neon") {
        const a = L * 0.16;
        cola(c, L, a, "#cfe8ffaa", onda);
        cuerpo(c, L, a, "#a9d6ff", "#e0f2ff");
        c.fillStyle = "#e63946";
        c.beginPath();
        c.ellipse(-L * 0.05, a * 0.35, L * 0.28, a * 0.38, 0, 0, TAU);
        c.fill();
        c.fillStyle = "#00e5ff";
        c.fillRect(-L * 0.3, -a * 0.25, L * 0.7, a * 0.32);
        ojo(c, L, a, 0.33);
    } else if (id === "guppy") {
        const a = L * 0.15;
        // Cola grande en abanico de colores
        c.save();
        c.translate(-L * 0.3, 0);
        c.rotate(onda * 0.3);
        const g = c.createLinearGradient(0, 0, -L * 0.5, 0);
        g.addColorStop(0, "#ff006e");
        g.addColorStop(0.5, "#fb5607");
        g.addColorStop(1, "#ffbe0b");
        c.fillStyle = g;
        c.beginPath();
        c.moveTo(0, 0);
        c.lineTo(-L * 0.5, -a * 2.3);
        c.quadraticCurveTo(-L * 0.62, 0, -L * 0.5, a * 2.3);
        c.closePath();
        c.fill();
        c.restore();
        cuerpo(c, L * 0.8, a, "#cdb4db", "#f1faee");
        c.fillStyle = "#3a86ff88";
        c.fillRect(-L * 0.15, -a * 0.3, L * 0.3, a * 0.5);
        ojo(c, L * 0.8, a, 0.33);
    } else if (id === "payaso") {
        const a = L * 0.22;
        cola(c, L, a, "#f77f00", onda);
        aleta(c, [[-L * 0.15, -a * 0.8], [L * 0.05, -a * 1.4], [L * 0.2, -a * 0.9]], "#f77f00");
        cuerpo(c, L, a, "#ff9f1c", "#f77f00");
        for (const x of [0.28, 0.02, -0.25]) {
            c.fillStyle = "#1b1b1b";
            c.fillRect(L * x - L * 0.05, -a, L * 0.1, a * 2);
            c.fillStyle = "#fff";
            c.fillRect(L * x - L * 0.035, -a, L * 0.07, a * 2);
        }
        c.globalCompositeOperation = "destination-in";
        cuerpo(c, L, a, "#000", "#000");
        c.globalCompositeOperation = "source-over";
        cola(c, L, a, "#f77f00", onda);
        aleta(c, [[-L * 0.15, -a * 0.8], [L * 0.05, -a * 1.35], [L * 0.2, -a * 0.9]], "#ff9f1c");
        ojo(c, L, a, 0.34);
    } else if (id === "angel") {
        const a = L * 0.28;
        // Aletas altísimas arriba y abajo
        aleta(c, [[L * 0.15, -a * 0.8], [-L * 0.15, -a * 2.4], [-L * 0.3, -a * 0.4]], "#dee2e6dd");
        aleta(c, [[L * 0.15, a * 0.8], [-L * 0.15, a * 2.4], [-L * 0.3, a * 0.4]], "#dee2e6dd");
        cola(c, L, a, "#e9ecefcc", onda, 0.9, 0.4);
        cuerpo(c, L, a * 1.15, "#f8f9fa", "#ced4da");
        // Rayas negras solo dentro del cuerpo y las aletas (recorte con un solo camino)
        c.save();
        const h = a * 1.15;
        c.beginPath();
        c.moveTo(L * 0.5, 0);
        c.bezierCurveTo(L * 0.42, -h * 1.05, -L * 0.18, -h * 1.05, -L * 0.36, 0);
        c.bezierCurveTo(-L * 0.18, h * 1.05, L * 0.42, h * 1.05, L * 0.5, 0);
        c.moveTo(L * 0.15, -a * 0.8);
        c.lineTo(-L * 0.15, -a * 2.4);
        c.lineTo(-L * 0.3, -a * 0.4);
        c.closePath();
        c.moveTo(L * 0.15, a * 0.8);
        c.lineTo(-L * 0.15, a * 2.4);
        c.lineTo(-L * 0.3, a * 0.4);
        c.closePath();
        c.clip();
        c.fillStyle = "#1b1b1bcc";
        for (const x of [0.2, -0.05, -0.28]) c.fillRect(L * x - L * 0.03, -a * 2.5, L * 0.06, a * 5);
        c.restore();
        ojo(c, L, a, 0.32);
    } else if (id === "globo") {
        const a = L * 0.34;
        cola(c, L * 0.8, a * 0.7, "#e9c46a", onda, 0.7);
        const g = c.createRadialGradient(L * 0.05, -a * 0.3, 1, 0, 0, a * 1.2);
        g.addColorStop(0, "#fff3b0");
        g.addColorStop(0.6, "#e9c46a");
        g.addColorStop(1, "#b08900");
        c.fillStyle = g;
        c.beginPath();
        c.ellipse(L * 0.05, 0, L * 0.38, a, 0, 0, TAU);
        c.fill();
        c.fillStyle = "#fffdf0";
        c.beginPath();
        c.ellipse(L * 0.08, a * 0.35, L * 0.3, a * 0.55, 0, 0, Math.PI);
        c.fill();
        c.fillStyle = "#6f4518aa";
        for (const [x, y] of [[-0.12, -0.4], [0.05, -0.55], [0.2, -0.35], [-0.2, -0.05], [0, -0.15]]) {
            c.beginPath();
            c.arc(L * x, a * y, L * 0.03, 0, TAU);
            c.fill();
        }
        ojo(c, L, a * 0.9, 0.3);
    } else if (id === "disco") {
        const a = L * 0.42;
        cola(c, L * 0.8, a * 0.5, "#e76f51", onda, 0.6);
        const g = c.createLinearGradient(0, -a, 0, a);
        g.addColorStop(0, "#2a9d8f");
        g.addColorStop(1, "#e76f51");
        c.fillStyle = g;
        c.beginPath();
        c.ellipse(L * 0.04, 0, L * 0.42, a, 0, 0, TAU);
        c.fill();
        c.strokeStyle = "#ffd16699";
        c.lineWidth = Math.max(1, L * 0.02);
        for (let k = -3; k <= 3; k++) {
            c.beginPath();
            c.ellipse(L * 0.04, k * a * 0.22, L * 0.38, a * 0.08, 0, 0, Math.PI);
            c.stroke();
        }
        ojo(c, L, a * 0.6, 0.34);
    } else if (id === "leon") {
        const a = L * 0.2;
        // Espinas largas a rayas
        for (let k = 0; k < 7; k++) {
            const x = L * (0.2 - k * 0.07);
            c.strokeStyle = k % 2 ? "#fff" : "#c1121f";
            c.lineWidth = Math.max(1, L * 0.018);
            c.beginPath();
            c.moveTo(x, -a * 0.8);
            c.lineTo(x - L * 0.08, -a * 2.4);
            c.moveTo(x, a * 0.6);
            c.lineTo(x - L * 0.12, a * (1.8 + Math.sin(k + onda) * 0.2));
            c.stroke();
        }
        cola(c, L, a, "#c1121faa", onda);
        cuerpo(c, L, a, "#f4a261", "#fff1e6");
        c.fillStyle = "#9d0208cc";
        for (let k = 0; k < 6; k++) c.fillRect(L * (0.35 - k * 0.12), -a, L * 0.05, a * 2);
        c.globalCompositeOperation = "destination-in";
        cuerpo(c, L, a, "#000", "#000");
        c.globalCompositeOperation = "source-over";
        cola(c, L, a, "#c1121faa", onda);
        ojo(c, L, a, 0.34);
    } else {
        // Tiburón bambú: gris, alargado, aleta dorsal y manchas
        const a = L * 0.13;
        cola(c, L * 1.1, a * 1.2, "#6c757d", onda, 1.2, 0.05);
        aleta(c, [[L * 0.05, -a * 0.8], [-L * 0.08, -a * 2.2], [-L * 0.18, -a * 0.8]], "#6c757d");
        aleta(c, [[L * 0.18, a * 0.6], [L * 0.05, a * 1.8], [-L * 0.02, a * 0.6]], "#868e96");
        cuerpo(c, L, a, "#adb5bd", "#e9ecef");
        c.fillStyle = "#49505755";
        for (let k = 0; k < 6; k++) {
            c.beginPath();
            c.arc(L * (0.25 - k * 0.1), -a * 0.3, L * 0.025, 0, TAU);
            c.fill();
        }
        ojo(c, L, a, 0.36);
    }
    brillo(c, L * 0.8, L * 0.12);
}
