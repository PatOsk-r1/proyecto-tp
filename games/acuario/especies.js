// Especies, peceras, comida y decoración del acuario, y sus dibujos. Cada animal se pinta mirando a la
// derecha, centrado en (0, 0), con un largo dado y en uno de 6 cuadros de animación.
const TAU = Math.PI * 2;
export const CUADROS = 6;

// ---------- Peceras ----------
// agua: qué especies entran · precio: la primera de ese tipo (las siguientes cuestan más)
export const TIPOS_PECERA = {
    dulce: { nombre: "Agua dulce", icono: "🌿", agua: "dulce", precio: 2500, nivel: 1, base: 8,
        agua1: "#5fd3e6", agua2: "#1b8fb5", agua3: "#0b3f63", arena1: "#d8b26e", arena2: "#8f6a35", luz: "#fffbe0" },
    arrecife: { nombre: "Arrecife de coral", icono: "🪸", agua: "salada", precio: 6000, nivel: 3, base: 10,
        agua1: "#7fe7f0", agua2: "#1aa3c9", agua3: "#05427a", arena1: "#f3e2b8", arena2: "#c9a46a", luz: "#ffffff" },
    abismo: { nombre: "Abismo profundo", icono: "🦑", agua: "abisal", precio: 60000, nivel: 6, base: 10,
        agua1: "#0d3b66", agua2: "#061a33", agua3: "#01060f", arena1: "#3a3f4a", arena2: "#14171d", luz: "#7ee0ff" },
};
export const MAX_PECERAS = 6;

// ---------- Especies ----------
// modo: nada · fondo (nada abajo) · camina (sobre la arena) · flota (medusas) · pulpo (camina y a veces nada) · vertical
// tam: largo relativo · vel: velocidad · cardumen: nadan juntos · depredador: tamaño máximo de presa
// belleza: cuánto atrae visitas · limpia: se come las sobras del fondo (el agua se ensucia menos) · brilla: luz propia
export const ESPECIES = [
    // Agua dulce
    { id: "neon", nombre: "Neón", agua: "dulce", modo: "nada", tam: 0.42, vel: 1.15, cardumen: true, precio: 20, belleza: 1, nivel: 1, caracter: "Pacífico · cardumen", detalle: "Chiquito y brillante, nada siempre en grupo" },
    { id: "guppy", nombre: "Guppy", agua: "dulce", modo: "nada", tam: 0.5, vel: 1, cardumen: true, precio: 35, belleza: 1.6, nivel: 1, caracter: "Pacífico · cardumen", detalle: "Cola enorme de colores; se reproduce fácil" },
    { id: "caracol", nombre: "Caracol manzana", agua: "dulce", modo: "camina", tam: 0.42, vel: 0.12, precio: 45, belleza: 0.8, nivel: 1, limpia: 1, caracter: "Limpiador", detalle: "Lento y amarillo; se come las sobras del fondo" },
    { id: "cory", nombre: "Corydora", agua: "dulce", modo: "fondo", tam: 0.5, vel: 0.8, cardumen: true, precio: 60, belleza: 1.4, nivel: 2, limpia: 0.6, caracter: "Pacífico · fondo", detalle: "Revuelve la arena con sus bigotes buscando comida" },
    { id: "camaron", nombre: "Camarón cereza", agua: "dulce", modo: "camina", tam: 0.36, vel: 0.35, precio: 70, belleza: 1.5, nivel: 2, limpia: 0.8, caracter: "Limpiador", detalle: "Rojito y transparente; limpia todo lo que encuentra" },
    { id: "betta", nombre: "Betta", agua: "dulce", modo: "nada", tam: 0.62, vel: 0.6, precio: 150, belleza: 4, nivel: 2, caracter: "Solitario", detalle: "Aletas larguísimas como un vestido de seda" },
    { id: "cangrejo", nombre: "Cangrejo rojo", agua: "dulce", modo: "camina", tam: 0.55, vel: 0.45, precio: 220, belleza: 3, nivel: 3, limpia: 0.7, caracter: "Curioso", detalle: "Camina de costado y pelea con sus pinzas" },
    { id: "angel", nombre: "Pez ángel", agua: "dulce", modo: "nada", tam: 0.95, vel: 0.7, precio: 300, belleza: 5, nivel: 3, caracter: "Pacífico", detalle: "Alto y elegante, se mueve con calma" },
    { id: "ajolote", nombre: "Ajolote", agua: "dulce", modo: "fondo", tam: 0.95, vel: 0.35, precio: 900, belleza: 9, nivel: 4, caracter: "Tranquilo", detalle: "Rosado y sonriente, respira con sus plumitas" },
    { id: "disco", nombre: "Disco", agua: "dulce", modo: "nada", tam: 1.1, vel: 0.65, precio: 1200, belleza: 10, nivel: 5, caracter: "Pacífico", detalle: "Plano y redondo, con dibujos que parecen pintados" },
    // Agua salada
    { id: "payaso", nombre: "Pez payaso", agua: "salada", modo: "nada", tam: 0.72, vel: 0.95, precio: 120, belleza: 3, nivel: 1, caracter: "Pacífico", detalle: "Naranja con rayas blancas, ama las anémonas" },
    { id: "ermitano", nombre: "Cangrejo ermitaño", agua: "salada", modo: "camina", tam: 0.5, vel: 0.3, precio: 140, belleza: 2.2, nivel: 1, limpia: 0.9, caracter: "Limpiador", detalle: "Vive dentro de un caracol prestado" },
    { id: "estrella", nombre: "Estrella de mar", agua: "salada", modo: "camina", tam: 0.6, vel: 0.06, precio: 260, belleza: 3.5, nivel: 2, limpia: 0.4, caracter: "Tranquila", detalle: "Se arrastra despacito con cientos de patitas" },
    { id: "cirujano", nombre: "Cirujano azul", agua: "salada", modo: "nada", tam: 0.85, vel: 1, precio: 450, belleza: 6, nivel: 3, caracter: "Pacífico", detalle: "Azul intenso con la cola amarilla, siempre nadando" },
    { id: "caballito", nombre: "Caballito de mar", agua: "salada", modo: "vertical", tam: 0.7, vel: 0.25, precio: 700, belleza: 8, nivel: 3, caracter: "Delicado", detalle: "Nada parado, moviendo una aletita en la espalda" },
    { id: "globo", nombre: "Pez globo", agua: "salada", modo: "nada", tam: 0.85, vel: 0.6, precio: 500, belleza: 6, nivel: 4, caracter: "Tranquilo", detalle: "Redondo y simpático; se infla si lo asustan" },
    { id: "medusa", nombre: "Medusa luna", agua: "salada", modo: "flota", tam: 0.8, vel: 0.3, precio: 1500, belleza: 11, nivel: 5, caracter: "Hipnótica", detalle: "Late despacio y flota con la corriente" },
    { id: "pulpo", nombre: "Pulpo", agua: "salada", modo: "pulpo", tam: 1.05, vel: 0.7, precio: 3000, belleza: 15, nivel: 5, caracter: "Inteligente", detalle: "Camina con sus 8 brazos y cambia de color" },
    { id: "leon", nombre: "Pez león", agua: "salada", modo: "nada", tam: 1.2, vel: 0.75, precio: 2500, belleza: 14, nivel: 6, depredador: 0.45, caracter: "⚠️ Depredador", detalle: "Hermoso pero peligroso: se come a los peces chicos" },
    { id: "tiburon", nombre: "Tiburón bambú", agua: "salada", modo: "fondo", tam: 1.6, vel: 0.9, precio: 8000, belleza: 25, nivel: 8, depredador: 0.55, caracter: "⚠️ Depredador", detalle: "Patrulla el fondo y caza a los que se descuidan" },
    // Abismo
    { id: "linterna", nombre: "Pez linterna", agua: "abisal", modo: "nada", tam: 0.45, vel: 1.1, cardumen: true, brilla: "#7ee0ff", precio: 400, belleza: 4, nivel: 6, caracter: "Cardumen · brilla", detalle: "Puntitos de luz en la oscuridad" },
    { id: "nautilo", nombre: "Nautilo", agua: "abisal", modo: "nada", tam: 0.8, vel: 0.35, precio: 2200, belleza: 12, nivel: 6, caracter: "Antiguo", detalle: "Existe desde la época de los dinosaurios" },
    { id: "medusaluz", nombre: "Medusa abisal", agua: "abisal", modo: "flota", tam: 0.85, vel: 0.3, brilla: "#b388ff", precio: 4000, belleza: 18, nivel: 7, caracter: "Hipnótica · brilla", detalle: "Se ilumina de violeta al latir" },
    { id: "dumbo", nombre: "Pulpo dumbo", agua: "abisal", modo: "flota", tam: 0.85, vel: 0.35, precio: 6000, belleza: 20, nivel: 7, caracter: "Adorable", detalle: "Nada aleteando con sus orejitas" },
    { id: "rape", nombre: "Rape abisal", agua: "abisal", modo: "nada", tam: 1, vel: 0.45, depredador: 0.5, brilla: "#ffe066", precio: 12000, belleza: 30, nivel: 8, caracter: "⚠️ Depredador · brilla", detalle: "Atrae a sus presas con una lucecita" },
];
export const especie = (id) => ESPECIES.find((e) => e.id === id) ?? ESPECIES[0];

// ---------- Comida ----------
// pack: cuántas tiradas trae · hambre: cuánto llena cada bocado · crece: cuánto crece · mimo: alegría extra
export const COMIDAS = [
    { id: "escamas", nombre: "Escamas", icono: "🟠", precio: 0, pack: 0, hambre: 0.22, crece: 0.015, mimo: 0, hunde: 1, bocados: 4, detalle: "Gratis, la comida de todos los días" },
    { id: "gusanos", nombre: "Gusanos rojos", icono: "🪱", precio: 60, pack: 10, hambre: 0.4, crece: 0.04, mimo: 0.03, hunde: 1.6, bocados: 4, detalle: "Les encantan: crecen mucho más rápido" },
    { id: "artemia", nombre: "Artemia viva", icono: "🦐", precio: 90, pack: 10, hambre: 0.32, crece: 0.03, mimo: 0.05, hunde: 0.35, bocados: 6, detalle: "Camaroncitos que nadan: los peces los persiguen felices" },
    { id: "pastillas", nombre: "Pastillas de fondo", icono: "🟤", precio: 50, pack: 10, hambre: 0.5, crece: 0.025, mimo: 0.01, hunde: 4, bocados: 2, detalle: "Se hunden rápido: para cangrejos, caracoles y los del fondo" },
    { id: "krill", nombre: "Krill", icono: "🦞", precio: 250, pack: 10, hambre: 0.75, crece: 0.06, mimo: 0.03, hunde: 1.2, bocados: 2, detalle: "Para los grandes: un depredador lleno no caza" },
];
export const comidaDe = (id) => COMIDAS.find((c) => c.id === id) ?? COMIDAS[0];

// ---------- Plantas y decoración ----------
export const PLANTAS = [
    { id: "alga", nombre: "Alga cinta", agua: "dulce", forma: "cinta", precio: 30, felicidad: 2, color: "#52b788", alto: 0.45 },
    { id: "helecho", nombre: "Helecho de Java", agua: "dulce", forma: "helecho", precio: 80, felicidad: 4, color: "#2d6a4f", alto: 0.3 },
    { id: "valis", nombre: "Valisneria", agua: "dulce", forma: "cinta", precio: 160, felicidad: 6, color: "#7fb800", alto: 0.7 },
    { id: "roja", nombre: "Ludwigia roja", agua: "dulce", forma: "tallo", precio: 400, felicidad: 9, color: "#c1121f", alto: 0.4 },
    { id: "kelp", nombre: "Kelp gigante", agua: "salada", forma: "cinta", precio: 250, felicidad: 7, color: "#8a9a2b", alto: 0.78 },
    { id: "anemona", nombre: "Anémona", agua: "salada", forma: "anemona", precio: 300, felicidad: 9, color: "#ff8fab", alto: 0.13 },
    { id: "abanico", nombre: "Abanico de mar", agua: "salada", forma: "abanico", precio: 450, felicidad: 10, color: "#e85d75", alto: 0.22 },
    { id: "caulerpa", nombre: "Alga uva", agua: "salada", forma: "tallo", precio: 120, felicidad: 4, color: "#38b000", alto: 0.25 },
    { id: "tubos", nombre: "Gusanos tubo", agua: "abisal", forma: "tubos", precio: 900, felicidad: 10, color: "#e63946", alto: 0.22 },
    { id: "lirio", nombre: "Lirio de mar", agua: "abisal", forma: "anemona", precio: 1500, felicidad: 14, color: "#c77dff", alto: 0.19 },
    { id: "esponja", nombre: "Esponja de vidrio", agua: "abisal", forma: "esponja", precio: 2500, felicidad: 18, color: "#cfe8ff", alto: 0.3 },
];
export const DECORACIONES = [
    { id: "roca", nombre: "Roca volcánica", agua: ["dulce", "salada", "abisal"], icono: "🪨", precio: 60, felicidad: 3 },
    { id: "tronco", nombre: "Tronco hundido", agua: ["dulce"], icono: "🪵", precio: 180, felicidad: 6 },
    { id: "coral", nombre: "Coral rama", agua: ["salada"], icono: "🪸", precio: 220, felicidad: 6 },
    { id: "cerebro", nombre: "Coral cerebro", agua: ["salada"], icono: "🧠", precio: 500, felicidad: 9 },
    { id: "cofre", nombre: "Cofre pirata", agua: ["dulce", "salada"], icono: "🧰", precio: 600, felicidad: 10 },
    { id: "ancla", nombre: "Ancla vieja", agua: ["salada", "abisal"], icono: "⚓", precio: 900, felicidad: 12 },
    { id: "castillo", nombre: "Castillo hundido", agua: ["dulce", "salada"], icono: "🏰", precio: 1500, felicidad: 18 },
    { id: "chimenea", nombre: "Chimenea volcánica", agua: ["abisal"], icono: "🌋", precio: 5000, felicidad: 25 },
];

const NOMBRES = ["Burbuja", "Nemo", "Coral", "Perla", "Chispa", "Azul", "Mango", "Luna", "Toto", "Pancho", "Lola", "Rayo", "Kiwi", "Ola", "Tito", "Nube", "Sol", "Fideo", "Pipa", "Brisa", "Dory", "Pinzas", "Tentáculo", "Gelatina", "Marea", "Lucero"];
export const nombreAlAzar = () => NOMBRES[Math.floor(Math.random() * NOMBRES.length)];

// ---------- Ayudas de dibujo ----------
function formaCuerpo(c, L, a) {
    c.beginPath();
    c.moveTo(L * 0.5, 0);
    c.bezierCurveTo(L * 0.42, -a * 1.05, -L * 0.18, -a * 1.05, -L * 0.36, 0);
    c.bezierCurveTo(-L * 0.18, a * 1.05, L * 0.42, a * 1.05, L * 0.5, 0);
}
// Cuerpo con lomo oscuro y panza clara (como los peces de verdad)
function cuerpo(c, L, a, lomo, vientre) {
    const g = c.createLinearGradient(0, -a, 0, a);
    g.addColorStop(0, lomo);
    g.addColorStop(1, vientre);
    c.fillStyle = g;
    formaCuerpo(c, L, a);
    c.fill();
}
// Terminación realista: sombra arriba, escamas, opérculo y brillo (se recorta dentro del cuerpo)
function terminar(c, L, a, escamas = true) {
    c.save();
    formaCuerpo(c, L, a);
    c.clip();
    const s = c.createLinearGradient(0, -a, 0, a);
    s.addColorStop(0, "rgba(0,0,0,0.28)");
    s.addColorStop(0.45, "rgba(0,0,0,0)");
    s.addColorStop(0.75, "rgba(255,255,255,0.08)");
    s.addColorStop(1, "rgba(0,0,0,0.18)");
    c.fillStyle = s;
    c.fillRect(-L, -a * 1.2, L * 2, a * 2.4);
    if (escamas && L > 22) {
        c.strokeStyle = "rgba(255,255,255,0.09)";
        c.lineWidth = Math.max(0.5, L * 0.006);
        const paso = Math.max(3, L * 0.07);
        for (let y = -a; y < a; y += paso * 0.7) {
            for (let x = -L * 0.3 + ((y / paso) % 2 ? paso / 2 : 0); x < L * 0.3; x += paso) {
                c.beginPath();
                c.arc(x, y, paso * 0.55, -0.9, 0.9);
                c.stroke();
            }
        }
    }
    // Opérculo (agalla)
    c.strokeStyle = "rgba(0,0,0,0.22)";
    c.lineWidth = Math.max(0.7, L * 0.012);
    c.beginPath();
    c.arc(L * 0.38, 0, a * 0.75, Math.PI * 0.62, Math.PI * 1.38);
    c.stroke();
    // Brillo de la luz de arriba
    const b = c.createRadialGradient(L * 0.1, -a * 0.55, 0, L * 0.1, -a * 0.55, L * 0.35);
    b.addColorStop(0, "rgba(255,255,255,0.35)");
    b.addColorStop(1, "rgba(255,255,255,0)");
    c.fillStyle = b;
    c.fillRect(-L, -a * 1.2, L * 2, a * 2.4);
    c.restore();
}
// Aleta translúcida con radios
function aleta(c, puntos, color, radios = true) {
    c.fillStyle = color;
    c.beginPath();
    c.moveTo(puntos[0][0], puntos[0][1]);
    for (let i = 1; i < puntos.length; i++) c.lineTo(puntos[i][0], puntos[i][1]);
    c.closePath();
    c.fill();
    if (!radios) return;
    c.strokeStyle = "rgba(255,255,255,0.22)";
    c.lineWidth = 0.6;
    c.beginPath();
    for (let i = 1; i < puntos.length - 1; i++) {
        c.moveTo(puntos[0][0], puntos[0][1]);
        c.lineTo(puntos[i][0], puntos[i][1]);
    }
    c.stroke();
}
function cola(c, L, a, color, onda, larga = 1, horquilla = 0.25) {
    c.save();
    c.translate(-L * 0.34, 0);
    c.rotate(onda * 0.35);
    c.fillStyle = color;
    c.beginPath();
    c.moveTo(0, 0);
    c.quadraticCurveTo(-L * 0.12 * larga, -a * 0.4, -L * 0.24 * larga, -a * 0.95 * larga);
    c.quadraticCurveTo(-L * (0.24 - horquilla * 0.3) * larga, 0, -L * 0.24 * larga, a * 0.95 * larga);
    c.quadraticCurveTo(-L * 0.12 * larga, a * 0.4, 0, 0);
    c.fill();
    c.strokeStyle = "rgba(255,255,255,0.2)";
    c.lineWidth = 0.6;
    c.beginPath();
    for (let k = -3; k <= 3; k++) {
        c.moveTo(0, 0);
        c.lineTo(-L * 0.22 * larga, (k / 3) * a * 0.85 * larga);
    }
    c.stroke();
    c.restore();
}
function ojo(c, L, a, x = 0.32, y = -0.18, tam = 1) {
    const r = Math.max(1.4, L * 0.055) * tam;
    c.fillStyle = "#f1e9c6";
    c.beginPath();
    c.arc(L * x, a * y, r, 0, TAU);
    c.fill();
    c.fillStyle = "#0b0b0b";
    c.beginPath();
    c.arc(L * x + r * 0.12, a * y, r * 0.62, 0, TAU);
    c.fill();
    c.fillStyle = "#fff";
    c.beginPath();
    c.arc(L * x + r * 0.35, a * y - r * 0.35, r * 0.24, 0, TAU);
    c.fill();
}
function aletaPectoral(c, L, a, color, onda) {
    c.save();
    c.translate(L * 0.2, a * 0.25);
    c.rotate(0.5 + onda * 0.25);
    c.fillStyle = color;
    c.beginPath();
    c.ellipse(-L * 0.06, 0, L * 0.09, a * 0.22, 0, 0, TAU);
    c.fill();
    c.restore();
}
function patas(c, x, y, largo, cantidad, cuadro, color, grosor) {
    c.strokeStyle = color;
    c.lineWidth = grosor;
    c.lineCap = "round";
    c.beginPath();
    for (let k = 0; k < cantidad; k++) {
        const lado = k % 2 ? 1 : -1;
        const fase = Math.sin((cuadro / CUADROS) * TAU + k * 1.7) * 0.25;
        const bx = x + lado * largo * (0.25 + (Math.floor(k / 2) * 0.18));
        c.moveTo(bx, y);
        c.quadraticCurveTo(bx + lado * largo * 0.35, y - largo * 0.25, bx + lado * largo * (0.55 + fase), y + largo * 0.55);
    }
    c.stroke();
}
function caracolConcha(c, x, y, r, color1, color2) {
    const g = c.createRadialGradient(x - r * 0.3, y - r * 0.3, 0, x, y, r);
    g.addColorStop(0, color1);
    g.addColorStop(1, color2);
    c.fillStyle = g;
    c.beginPath();
    c.arc(x, y, r, 0, TAU);
    c.fill();
    c.strokeStyle = "rgba(60,30,10,0.55)";
    c.lineWidth = Math.max(0.8, r * 0.1);
    c.beginPath();
    for (let t = 0; t < 12; t += 0.25) {
        const rr = r * (1 - t / 13);
        const px = x + Math.cos(t * 1.6) * rr * 0.7;
        const py = y + Math.sin(t * 1.6) * rr * 0.7;
        if (t === 0) c.moveTo(px, py);
        else c.lineTo(px, py);
    }
    c.stroke();
}

// ---------- Dibujo de cada especie ----------
export function dibujarPez(c, id, L, cuadro = 0) {
    const onda = Math.sin((cuadro / CUADROS) * TAU);
    c.lineJoin = "round";
    if (id === "neon") {
        const a = L * 0.16;
        cola(c, L, a, "rgba(207,232,255,0.55)", onda);
        aleta(c, [[-L * 0.05, -a * 0.8], [-L * 0.12, -a * 1.6], [-L * 0.22, -a * 0.6]], "rgba(220,240,255,0.5)");
        cuerpo(c, L, a, "#5f7f9a", "#eef6ff");
        c.save();
        formaCuerpo(c, L, a);
        c.clip();
        c.fillStyle = "#e63946";
        c.fillRect(-L * 0.36, a * 0.05, L * 0.55, a);
        const n = c.createLinearGradient(0, -a * 0.3, 0, a * 0.1);
        n.addColorStop(0, "#00f0ff");
        n.addColorStop(1, "#0077ff");
        c.fillStyle = n;
        c.fillRect(-L * 0.32, -a * 0.32, L * 0.72, a * 0.34);
        c.restore();
        terminar(c, L, a, false);
        ojo(c, L, a, 0.33);
    } else if (id === "guppy") {
        const a = L * 0.15;
        c.save();
        c.translate(-L * 0.3, 0);
        c.rotate(onda * 0.3);
        const g = c.createLinearGradient(0, 0, -L * 0.5, 0);
        g.addColorStop(0, "rgba(255,0,110,0.9)");
        g.addColorStop(0.5, "rgba(251,86,7,0.85)");
        g.addColorStop(1, "rgba(255,190,11,0.6)");
        c.fillStyle = g;
        c.beginPath();
        c.moveTo(0, 0);
        c.lineTo(-L * 0.5, -a * 2.3);
        c.quadraticCurveTo(-L * 0.62, 0, -L * 0.5, a * 2.3);
        c.closePath();
        c.fill();
        c.fillStyle = "rgba(20,20,60,0.35)";
        for (let k = 0; k < 6; k++) {
            c.beginPath();
            c.arc(-L * (0.2 + (k % 3) * 0.1), a * (k < 3 ? -0.8 : 0.8), L * 0.025, 0, TAU);
            c.fill();
        }
        c.restore();
        cuerpo(c, L * 0.8, a, "#8e7aa6", "#f1faee");
        c.fillStyle = "rgba(58,134,255,0.5)";
        c.fillRect(-L * 0.15, -a * 0.3, L * 0.3, a * 0.5);
        terminar(c, L * 0.8, a, false);
        ojo(c, L * 0.8, a, 0.33);
    } else if (id === "betta") {
        const a = L * 0.16;
        const ola = (k) => Math.sin((cuadro / CUADROS) * TAU + k) * a * 0.3;
        // Aletas enormes que ondean como tela
        const tela = c.createLinearGradient(0, -a * 3, 0, a * 3);
        tela.addColorStop(0, "rgba(58,12,163,0.85)");
        tela.addColorStop(0.5, "rgba(114,9,183,0.8)");
        tela.addColorStop(1, "rgba(247,37,133,0.75)");
        c.fillStyle = tela;
        c.beginPath();
        c.moveTo(L * 0.15, -a * 0.8);
        c.bezierCurveTo(-L * 0.1, -a * 3, -L * 0.7, -a * 2.6 + ola(0), -L * 0.85, ola(1));
        c.bezierCurveTo(-L * 0.7, a * 2.6 + ola(2), -L * 0.1, a * 3, L * 0.15, a * 0.8);
        c.closePath();
        c.fill();
        c.strokeStyle = "rgba(255,255,255,0.18)";
        c.lineWidth = 0.6;
        c.beginPath();
        for (let k = -5; k <= 5; k++) {
            c.moveTo(-L * 0.2, 0);
            c.lineTo(-L * 0.8, (k / 5) * a * 2.4 + ola(k));
        }
        c.stroke();
        cuerpo(c, L * 0.75, a, "#240046", "#5a189a");
        terminar(c, L * 0.75, a);
        ojo(c, L * 0.75, a, 0.34);
    } else if (id === "cory") {
        const a = L * 0.2;
        cola(c, L, a, "rgba(210,190,150,0.7)", onda, 0.8, 0.5);
        aleta(c, [[L * 0.1, -a * 0.8], [L * 0.02, -a * 1.9], [-L * 0.12, -a * 0.8]], "rgba(220,200,160,0.8)");
        cuerpo(c, L, a, "#8d7b5f", "#efe6d2");
        c.fillStyle = "rgba(40,30,20,0.6)";
        for (let k = 0; k < 9; k++) {
            c.beginPath();
            c.arc(L * (0.25 - (k % 5) * 0.12), a * (k < 5 ? -0.35 : 0.05), L * 0.03, 0, TAU);
            c.fill();
        }
        terminar(c, L, a, false);
        c.strokeStyle = "#5c4a30";
        c.lineWidth = Math.max(0.8, L * 0.015);
        c.beginPath();
        c.moveTo(L * 0.46, a * 0.3);
        c.lineTo(L * 0.56, a * 0.7);
        c.moveTo(L * 0.44, a * 0.35);
        c.lineTo(L * 0.5, a * 0.85);
        c.stroke();
        aletaPectoral(c, L, a, "rgba(220,200,160,0.8)", onda);
        ojo(c, L, a, 0.32, -0.25);
    } else if (id === "caracol") {
        // Pie que se estira y concha amarilla
        const est = onda * L * 0.03;
        c.fillStyle = "#c9b79c";
        c.beginPath();
        c.ellipse(L * 0.08 + est, L * 0.12, L * 0.42, L * 0.08, 0, 0, TAU);
        c.fill();
        c.strokeStyle = "#a8957a";
        c.lineWidth = Math.max(1, L * 0.03);
        c.lineCap = "round";
        c.beginPath();
        c.moveTo(L * 0.38 + est, L * 0.08);
        c.lineTo(L * 0.5 + est, -L * 0.1);
        c.moveTo(L * 0.34 + est, L * 0.08);
        c.lineTo(L * 0.4 + est, -L * 0.12);
        c.stroke();
        c.fillStyle = "#222";
        c.beginPath();
        c.arc(L * 0.5 + est, -L * 0.1, L * 0.025, 0, TAU);
        c.fill();
        caracolConcha(c, -L * 0.05, -L * 0.1, L * 0.26, "#fff3b0", "#e0a100");
    } else if (id === "camaron") {
        const a = L * 0.14;
        patas(c, 0, a * 0.7, L * 0.35, 8, cuadro, "rgba(220,40,40,0.75)", Math.max(0.6, L * 0.02));
        c.save();
        c.rotate(-0.08);
        const g = c.createLinearGradient(0, -a, 0, a);
        g.addColorStop(0, "rgba(200,20,30,0.95)");
        g.addColorStop(1, "rgba(255,120,110,0.75)");
        c.fillStyle = g;
        c.beginPath();
        c.moveTo(L * 0.42, 0);
        c.quadraticCurveTo(L * 0.2, -a * 1.6, -L * 0.25, -a * 0.7);
        c.quadraticCurveTo(-L * 0.45, -a * 0.2, -L * 0.42, a * 0.6);
        c.quadraticCurveTo(-L * 0.1, a * 1.1, L * 0.42, 0);
        c.fill();
        c.strokeStyle = "rgba(120,0,0,0.4)";
        c.lineWidth = 0.7;
        c.beginPath();
        for (let k = 0; k < 5; k++) {
            const x = L * (0.15 - k * 0.1);
            c.moveTo(x, -a * 0.9);
            c.lineTo(x - L * 0.03, a * 0.6);
        }
        c.stroke();
        c.restore();
        c.strokeStyle = "rgba(200,40,40,0.8)";
        c.lineWidth = 0.7;
        c.beginPath();
        c.moveTo(L * 0.4, -a * 0.2);
        c.quadraticCurveTo(L * 0.7, -a * 2, L * 0.9 + onda * 2, -a * 0.5);
        c.moveTo(L * 0.4, -a * 0.1);
        c.quadraticCurveTo(L * 0.65, -a * 1.4, L * 0.85, a * 0.5 + onda * 2);
        c.stroke();
        ojo(c, L, a, 0.36, -0.35, 0.7);
    } else if (id === "cangrejo" || id === "ermitano") {
        const r = L * 0.24;
        const rojo = id === "cangrejo";
        const pinza = Math.sin((cuadro / CUADROS) * TAU) * 0.2;
        patas(c, rojo ? 0 : L * 0.12, rojo ? r * 0.3 : r * 0.6, L * 0.5, 6, cuadro, rojo ? "#9d0208" : "#c1121f", Math.max(1, L * 0.035));
        if (!rojo) caracolConcha(c, -L * 0.12, -r * 0.2, r * 1.25, "#f8edeb", "#b5838d");
        // Pinzas
        for (const lado of [1, -1]) {
            if (!rojo && lado < 0) continue;
            c.save();
            c.translate((rojo ? lado * r * 0.9 : r * 1.0), -r * 0.2);
            c.rotate(lado * (-0.5 + pinza));
            c.fillStyle = rojo ? "#d00000" : "#e5383b";
            c.beginPath();
            c.ellipse(lado * r * 0.45, -r * 0.3, r * 0.42, r * 0.26, lado * -0.4, 0, TAU);
            c.fill();
            c.fillStyle = rojo ? "#9d0208" : "#a4161a";
            c.beginPath();
            c.moveTo(lado * r * 0.7, -r * 0.45);
            c.lineTo(lado * r * 1.05, -r * (0.75 + pinza));
            c.lineTo(lado * r * 0.85, -r * 0.3);
            c.fill();
            c.restore();
        }
        if (rojo) {
            const g = c.createRadialGradient(-r * 0.2, -r * 0.4, 0, 0, 0, r * 1.2);
            g.addColorStop(0, "#ff6b6b");
            g.addColorStop(1, "#9d0208");
            c.fillStyle = g;
            c.beginPath();
            c.ellipse(0, 0, r * 1.05, r * 0.72, 0, 0, TAU);
            c.fill();
            c.fillStyle = "rgba(255,255,255,0.25)";
            c.beginPath();
            c.ellipse(-r * 0.2, -r * 0.35, r * 0.4, r * 0.15, -0.2, 0, TAU);
            c.fill();
        }
        // Ojos en palitos
        const ox = rojo ? 0 : r * 0.75;
        c.strokeStyle = rojo ? "#9d0208" : "#c1121f";
        c.lineWidth = Math.max(1, L * 0.025);
        c.beginPath();
        c.moveTo(ox - r * 0.25, -r * 0.5);
        c.lineTo(ox - r * 0.3, -r * 1.05);
        c.moveTo(ox + r * 0.25, -r * 0.5);
        c.lineTo(ox + r * 0.3, -r * 1.05);
        c.stroke();
        c.fillStyle = "#111";
        for (const dx of [-0.3, 0.3]) {
            c.beginPath();
            c.arc(ox + r * dx, -r * 1.1, Math.max(1.2, L * 0.035), 0, TAU);
            c.fill();
        }
    } else if (id === "ajolote") {
        const a = L * 0.15;
        // Cola larga con aleta
        c.save();
        c.translate(-L * 0.2, 0);
        c.rotate(onda * 0.25);
        c.fillStyle = "rgba(255,200,210,0.75)";
        c.beginPath();
        c.moveTo(0, -a * 0.6);
        c.quadraticCurveTo(-L * 0.25, -a * 1.1, -L * 0.42, 0);
        c.quadraticCurveTo(-L * 0.25, a * 1.0, 0, a * 0.6);
        c.fill();
        c.restore();
        // Patitas
        c.fillStyle = "#f4a3b4";
        for (const [x, d] of [[0.25, 1], [-0.12, -1]]) {
            c.save();
            c.translate(L * x, a * 0.7);
            c.rotate(0.6 + onda * 0.3 * d);
            c.beginPath();
            c.ellipse(0, a * 0.4, a * 0.25, a * 0.55, 0, 0, TAU);
            c.fill();
            c.restore();
        }
        const g = c.createLinearGradient(0, -a, 0, a);
        g.addColorStop(0, "#f7a8b8");
        g.addColorStop(1, "#ffe5ec");
        c.fillStyle = g;
        c.beginPath();
        c.ellipse(-L * 0.02, 0, L * 0.3, a, 0, 0, TAU);
        c.fill();
        c.beginPath();
        c.ellipse(L * 0.3, -a * 0.1, L * 0.16, a * 1.15, 0, 0, TAU);
        c.fill();
        // Branquias con plumitas
        c.strokeStyle = "#e5466c";
        c.lineWidth = Math.max(1, L * 0.025);
        c.lineCap = "round";
        for (let k = 0; k < 3; k++) {
            const ang = -2.2 + k * 0.45 + onda * 0.08;
            const x0 = L * 0.24;
            const y0 = -a * 0.6;
            const x1 = x0 + Math.cos(ang) * L * 0.18;
            const y1 = y0 + Math.sin(ang) * L * 0.18;
            c.beginPath();
            c.moveTo(x0, y0);
            c.lineTo(x1, y1);
            c.stroke();
            c.lineWidth = Math.max(0.6, L * 0.012);
            c.beginPath();
            for (let j = 1; j < 4; j++) {
                const px = x0 + (x1 - x0) * (j / 4);
                const py = y0 + (y1 - y0) * (j / 4);
                c.moveTo(px, py);
                c.lineTo(px - L * 0.03, py - L * 0.03);
            }
            c.stroke();
            c.lineWidth = Math.max(1, L * 0.025);
        }
        c.fillStyle = "#222";
        c.beginPath();
        c.arc(L * 0.38, -a * 0.25, Math.max(1.2, L * 0.025), 0, TAU);
        c.fill();
        c.strokeStyle = "#c9184a";
        c.lineWidth = Math.max(0.7, L * 0.012);
        c.beginPath();
        c.arc(L * 0.38, a * 0.15, L * 0.06, 0.2, 1.4);
        c.stroke();
    } else if (id === "payaso") {
        const a = L * 0.22;
        cola(c, L, a, "#f77f00", onda);
        aleta(c, [[-L * 0.15, -a * 0.8], [L * 0.05, -a * 1.4], [L * 0.2, -a * 0.9]], "#f77f00");
        cuerpo(c, L, a, "#ff8c00", "#ffb347");
        c.save();
        formaCuerpo(c, L, a);
        c.clip();
        for (const x of [0.28, 0.02, -0.25]) {
            c.fillStyle = "#1b1b1b";
            c.fillRect(L * x - L * 0.055, -a, L * 0.11, a * 2);
            c.fillStyle = "#fff";
            c.fillRect(L * x - L * 0.035, -a, L * 0.07, a * 2);
        }
        c.restore();
        terminar(c, L, a, false);
        aletaPectoral(c, L, a, "#ff9f1c", onda);
        ojo(c, L, a, 0.36);
    } else if (id === "cirujano") {
        const a = L * 0.27;
        c.save();
        c.translate(-L * 0.34, 0);
        c.rotate(onda * 0.3);
        c.fillStyle = "#ffd60a";
        c.beginPath();
        c.moveTo(0, -a * 0.3);
        c.lineTo(-L * 0.2, -a * 0.9);
        c.quadraticCurveTo(-L * 0.12, 0, -L * 0.2, a * 0.9);
        c.lineTo(0, a * 0.3);
        c.fill();
        c.restore();
        aleta(c, [[L * 0.3, -a * 0.8], [-L * 0.3, -a * 1.15], [-L * 0.35, -a * 0.2]], "#0353a4");
        aleta(c, [[L * 0.2, a * 0.8], [-L * 0.3, a * 1.1], [-L * 0.35, a * 0.2]], "#0353a4");
        cuerpo(c, L, a, "#023e8a", "#4895ef");
        c.save();
        formaCuerpo(c, L, a);
        c.clip();
        c.fillStyle = "#03045e";
        c.beginPath();
        c.moveTo(L * 0.3, -a * 0.5);
        c.quadraticCurveTo(-L * 0.1, -a * 0.1, -L * 0.36, -a * 0.6);
        c.lineTo(-L * 0.36, -a * 0.1);
        c.quadraticCurveTo(-L * 0.05, a * 0.3, L * 0.15, -a * 0.1);
        c.fill();
        c.restore();
        terminar(c, L, a, false);
        aletaPectoral(c, L, a, "#ffd60a", onda);
        ojo(c, L, a, 0.34);
    } else if (id === "caballito") {
        // Parado: cabeza arriba, cola enrollada abajo
        c.save();
        c.rotate(onda * 0.05);
        const g = c.createLinearGradient(-L * 0.2, 0, L * 0.2, 0);
        g.addColorStop(0, "#f4a261");
        g.addColorStop(1, "#e76f51");
        c.strokeStyle = g;
        c.lineCap = "round";
        c.lineWidth = L * 0.16;
        c.beginPath();
        c.moveTo(L * 0.02, -L * 0.3);
        c.quadraticCurveTo(L * 0.16, -L * 0.05, L * 0.04, L * 0.18);
        c.quadraticCurveTo(-L * 0.04, L * 0.32, L * 0.05, L * 0.38);
        c.stroke();
        c.lineWidth = L * 0.05;
        c.beginPath();
        c.arc(L * 0.12, L * 0.38, L * 0.07, Math.PI, Math.PI * 2.6);
        c.stroke();
        // Anillos del cuerpo
        c.strokeStyle = "rgba(120,50,20,0.35)";
        c.lineWidth = 0.8;
        c.beginPath();
        for (let k = 0; k < 7; k++) {
            const y = -L * 0.22 + k * L * 0.065;
            c.moveTo(L * 0.0, y);
            c.lineTo(L * 0.14, y + L * 0.01);
        }
        c.stroke();
        // Cabeza y hocico
        c.fillStyle = "#f4a261";
        c.beginPath();
        c.ellipse(L * 0.04, -L * 0.36, L * 0.09, L * 0.08, 0, 0, TAU);
        c.fill();
        c.strokeStyle = "#e76f51";
        c.lineWidth = L * 0.05;
        c.beginPath();
        c.moveTo(L * 0.1, -L * 0.34);
        c.lineTo(L * 0.26, -L * 0.3);
        c.stroke();
        c.fillStyle = "#e76f51";
        c.beginPath();
        c.moveTo(-L * 0.02, -L * 0.44);
        c.lineTo(L * 0.02, -L * 0.52);
        c.lineTo(L * 0.06, -L * 0.43);
        c.fill();
        // Aletita dorsal que vibra
        c.fillStyle = "rgba(255,230,180,0.7)";
        c.beginPath();
        c.ellipse(-L * 0.06, -L * 0.04, L * 0.05, L * 0.08 + onda * L * 0.02, 0.2, 0, TAU);
        c.fill();
        c.restore();
        ojo(c, L, L, 0.06, -0.37, 0.75);
    } else if (id === "angel") {
        const a = L * 0.28;
        aleta(c, [[L * 0.15, -a * 0.8], [-L * 0.15, -a * 2.4], [-L * 0.3, -a * 0.4]], "rgba(222,226,230,0.8)");
        aleta(c, [[L * 0.15, a * 0.8], [-L * 0.15, a * 2.4], [-L * 0.3, a * 0.4]], "rgba(222,226,230,0.8)");
        cola(c, L, a, "rgba(233,236,239,0.7)", onda, 0.9, 0.4);
        cuerpo(c, L, a * 1.15, "#c9ced6", "#f8f9fa");
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
        c.fillStyle = "rgba(27,27,27,0.8)";
        for (const x of [0.2, -0.05, -0.28]) c.fillRect(L * x - L * 0.03, -a * 2.5, L * 0.06, a * 5);
        c.restore();
        terminar(c, L, a * 1.15, false);
        ojo(c, L, a, 0.32);
    } else if (id === "globo") {
        const a = L * 0.34;
        cola(c, L * 0.8, a * 0.7, "rgba(233,196,106,0.8)", onda, 0.7);
        const g = c.createRadialGradient(L * 0.05, -a * 0.3, 1, 0, 0, a * 1.2);
        g.addColorStop(0, "#fff3b0");
        g.addColorStop(0.6, "#e9c46a");
        g.addColorStop(1, "#8f6a00");
        c.fillStyle = g;
        c.beginPath();
        c.ellipse(L * 0.05, 0, L * 0.38, a, 0, 0, TAU);
        c.fill();
        c.fillStyle = "#fffdf0";
        c.beginPath();
        c.ellipse(L * 0.08, a * 0.35, L * 0.3, a * 0.55, 0, 0, Math.PI);
        c.fill();
        c.fillStyle = "rgba(111,69,24,0.65)";
        for (const [x, y] of [[-0.12, -0.4], [0.05, -0.55], [0.2, -0.35], [-0.2, -0.05], [0, -0.15], [-0.05, -0.75]]) {
            c.beginPath();
            c.arc(L * x, a * y, L * 0.03, 0, TAU);
            c.fill();
        }
        aletaPectoral(c, L, a * 0.8, "rgba(255,230,150,0.8)", onda);
        ojo(c, L, a * 0.9, 0.3, -0.18, 1.2);
    } else if (id === "disco") {
        const a = L * 0.42;
        cola(c, L * 0.8, a * 0.5, "rgba(231,111,81,0.8)", onda, 0.6);
        const g = c.createLinearGradient(0, -a, 0, a);
        g.addColorStop(0, "#1f7a70");
        g.addColorStop(1, "#e76f51");
        c.fillStyle = g;
        c.beginPath();
        c.ellipse(L * 0.04, 0, L * 0.42, a, 0, 0, TAU);
        c.fill();
        c.strokeStyle = "rgba(255,209,102,0.6)";
        c.lineWidth = Math.max(1, L * 0.02);
        for (let k = -3; k <= 3; k++) {
            c.beginPath();
            c.ellipse(L * 0.04, k * a * 0.22, L * 0.38, a * 0.08, 0, 0, Math.PI);
            c.stroke();
        }
        const b = c.createRadialGradient(L * 0.1, -a * 0.5, 0, L * 0.1, -a * 0.5, L * 0.4);
        b.addColorStop(0, "rgba(255,255,255,0.3)");
        b.addColorStop(1, "rgba(255,255,255,0)");
        c.fillStyle = b;
        c.beginPath();
        c.ellipse(L * 0.04, 0, L * 0.42, a, 0, 0, TAU);
        c.fill();
        ojo(c, L, a * 0.6, 0.34);
    } else if (id === "estrella") {
        c.save();
        c.scale(1, 0.62);
        c.rotate(onda * 0.04);
        const r = L * 0.45;
        const g = c.createRadialGradient(0, 0, 0, 0, 0, r);
        g.addColorStop(0, "#ffb703");
        g.addColorStop(1, "#d9480f");
        c.fillStyle = g;
        c.beginPath();
        for (let k = 0; k < 10; k++) {
            const ang = -Math.PI / 2 + (k * Math.PI) / 5;
            const rr = k % 2 ? r * 0.38 : r;
            c.lineTo(Math.cos(ang) * rr, Math.sin(ang) * rr);
        }
        c.closePath();
        c.fill();
        c.fillStyle = "rgba(255,240,200,0.75)";
        for (let k = 0; k < 5; k++) {
            const ang = -Math.PI / 2 + (k * TAU) / 5;
            for (let j = 1; j < 4; j++) {
                c.beginPath();
                c.arc(Math.cos(ang) * r * j * 0.22, Math.sin(ang) * r * j * 0.22, Math.max(0.8, L * 0.022), 0, TAU);
                c.fill();
            }
        }
        c.restore();
    } else if (id === "pulpo" || id === "dumbo") {
        const dumbo = id === "dumbo";
        const r = L * 0.24;
        const color1 = dumbo ? "#ffd6e0" : "#e85d04";
        const color2 = dumbo ? "#f08bb0" : "#9d0208";
        // Brazos ondulados
        c.lineCap = "round";
        for (let k = 0; k < 8; k++) {
            const base = -0.9 + k * 0.26;
            const fase = (cuadro / CUADROS) * TAU + k * 0.9;
            c.strokeStyle = k % 2 ? color2 : color1;
            c.lineWidth = r * (dumbo ? 0.28 : 0.32);
            c.beginPath();
            c.moveTo(Math.sin(base) * r * 0.6, r * 0.4);
            const largo = r * (dumbo ? 1.5 : 2.4);
            c.bezierCurveTo(
                Math.sin(base) * r * 1.2 + Math.sin(fase) * r * 0.4, r * 0.4 + largo * 0.35,
                Math.sin(base) * r * 2 + Math.cos(fase) * r * 0.5, r * 0.4 + largo * 0.7,
                Math.sin(base) * r * 2.4 + Math.sin(fase + 1) * r * 0.6, r * 0.4 + largo);
            c.stroke();
        }
        // Ventosas
        if (!dumbo && L > 30) {
            c.fillStyle = "#ffd8a8";
            for (let k = 0; k < 8; k++) {
                const base = -0.9 + k * 0.26;
                c.beginPath();
                c.arc(Math.sin(base) * r * 1.0, r * 0.9, r * 0.06, 0, TAU);
                c.fill();
            }
        }
        // Manto (cabeza)
        const g = c.createRadialGradient(-r * 0.2, -r * 0.6, 0, 0, -r * 0.2, r * 1.4);
        g.addColorStop(0, dumbo ? "#fff0f5" : "#ff9e5e");
        g.addColorStop(1, color2);
        c.fillStyle = g;
        c.beginPath();
        c.ellipse(-r * 0.15, -r * 0.35, r * 0.95, r * 1.05, -0.25, 0, TAU);
        c.fill();
        if (dumbo) {
            // Orejitas que aletean
            c.fillStyle = "#f6a6c1";
            for (const lado of [-1, 1]) {
                c.save();
                c.translate(lado * r * 0.75, -r * 0.9);
                c.rotate(lado * (0.5 + onda * 0.4));
                c.beginPath();
                c.ellipse(lado * r * 0.3, 0, r * 0.4, r * 0.22, 0, 0, TAU);
                c.fill();
                c.restore();
            }
        } else {
            c.fillStyle = "rgba(255,255,255,0.18)";
            for (const [x, y] of [[-0.4, -0.8], [0.1, -1.0], [-0.1, -0.4], [0.35, -0.5]]) {
                c.beginPath();
                c.arc(r * x, r * y, r * 0.09, 0, TAU);
                c.fill();
            }
        }
        ojo(c, r, r, 0.45, -0.05, 2.2);
    } else if (id === "medusa" || id === "medusaluz") {
        const luz = id === "medusaluz";
        const pulso = 1 + onda * 0.12;
        const r = L * 0.32;
        // Tentáculos
        c.strokeStyle = luz ? "rgba(199,125,255,0.6)" : "rgba(255,255,255,0.45)";
        c.lineWidth = Math.max(0.6, L * 0.012);
        c.beginPath();
        for (let k = 0; k < 9; k++) {
            const x0 = (k / 8 - 0.5) * r * 1.6 * pulso;
            const fase = (cuadro / CUADROS) * TAU + k;
            c.moveTo(x0, 0);
            c.bezierCurveTo(x0 + Math.sin(fase) * r * 0.3, r * 0.8, x0 - Math.sin(fase + 1) * r * 0.3, r * 1.5, x0 + Math.sin(fase + 2) * r * 0.2, r * 2.1);
        }
        c.stroke();
        // Brazos orales
        c.strokeStyle = luz ? "rgba(224,170,255,0.7)" : "rgba(255,200,220,0.7)";
        c.lineWidth = Math.max(1, L * 0.04);
        c.beginPath();
        for (const dx of [-0.15, 0.15]) {
            c.moveTo(r * dx, 0);
            c.quadraticCurveTo(r * (dx * 3 + onda * 0.2), r * 0.7, r * dx, r * 1.3);
        }
        c.stroke();
        // Campana translúcida
        const g = c.createRadialGradient(0, -r * 0.5, 0, 0, -r * 0.3, r * 1.2);
        g.addColorStop(0, luz ? "rgba(230,200,255,0.85)" : "rgba(255,255,255,0.75)");
        g.addColorStop(1, luz ? "rgba(123,44,191,0.35)" : "rgba(255,170,200,0.3)");
        c.fillStyle = g;
        c.beginPath();
        c.ellipse(0, 0, r * pulso, r * (1.1 - onda * 0.1), 0, Math.PI, 0);
        c.quadraticCurveTo(0, r * 0.2, -r * pulso, 0);
        c.fill();
        // Las 4 gónadas (el dibujo de trébol de la medusa luna)
        c.strokeStyle = luz ? "rgba(255,255,255,0.6)" : "rgba(255,140,180,0.7)";
        c.lineWidth = Math.max(0.8, L * 0.02);
        for (const dx of [-0.35, -0.12, 0.12, 0.35]) {
            c.beginPath();
            c.arc(r * dx, -r * 0.35, r * 0.1, 0, TAU);
            c.stroke();
        }
    } else if (id === "nautilo") {
        const r = L * 0.32;
        // Tentáculos cortos adelante
        c.strokeStyle = "#e9c46a";
        c.lineWidth = Math.max(0.8, L * 0.02);
        c.beginPath();
        for (let k = 0; k < 8; k++) {
            const y = (k / 7 - 0.5) * r * 0.8;
            c.moveTo(r * 0.6, y);
            c.quadraticCurveTo(r * 1.1, y + Math.sin((cuadro / CUADROS) * TAU + k) * r * 0.2, r * 1.45, y * 1.4);
        }
        c.stroke();
        const g = c.createRadialGradient(-r * 0.3, -r * 0.3, 0, 0, 0, r * 1.1);
        g.addColorStop(0, "#fffaf0");
        g.addColorStop(1, "#d4c4a8");
        c.fillStyle = g;
        c.beginPath();
        c.arc(0, 0, r, 0, TAU);
        c.fill();
        // Rayas de tigre
        c.save();
        c.beginPath();
        c.arc(0, 0, r, 0, TAU);
        c.clip();
        c.strokeStyle = "#9c4a1a";
        c.lineWidth = r * 0.14;
        for (let k = 0; k < 6; k++) {
            const ang = -Math.PI * 0.9 + k * 0.35;
            c.beginPath();
            c.moveTo(Math.cos(ang) * r * 0.3, Math.sin(ang) * r * 0.3);
            c.quadraticCurveTo(Math.cos(ang + 0.3) * r * 0.8, Math.sin(ang + 0.3) * r * 0.8, Math.cos(ang + 0.2) * r * 1.1, Math.sin(ang + 0.2) * r * 1.1);
            c.stroke();
        }
        c.restore();
        c.strokeStyle = "rgba(90,50,20,0.5)";
        c.lineWidth = Math.max(0.8, r * 0.05);
        c.beginPath();
        c.arc(r * 0.1, r * 0.05, r * 0.4, -1.2, 2.5);
        c.stroke();
        c.fillStyle = "#c08552";
        c.beginPath();
        c.ellipse(r * 0.7, 0, r * 0.25, r * 0.4, 0, 0, TAU);
        c.fill();
        ojo(c, r, r, 0.7, -0.15, 1.3);
    } else if (id === "linterna") {
        const a = L * 0.17;
        cola(c, L, a, "rgba(60,80,110,0.7)", onda);
        cuerpo(c, L, a, "#1b263b", "#415a77");
        terminar(c, L, a, false);
        c.fillStyle = "#7ee0ff";
        for (let k = 0; k < 7; k++) {
            c.beginPath();
            c.arc(L * (0.3 - k * 0.09), a * 0.55, Math.max(0.9, L * 0.025), 0, TAU);
            c.fill();
        }
        ojo(c, L, a, 0.33, -0.15, 1.3);
    } else if (id === "rape") {
        const r = L * 0.34;
        cola(c, L * 0.9, r * 0.6, "rgba(40,30,30,0.85)", onda, 0.6);
        const g = c.createRadialGradient(-r * 0.2, -r * 0.4, 0, 0, 0, r * 1.2);
        g.addColorStop(0, "#5c4033");
        g.addColorStop(1, "#1a0f0a");
        c.fillStyle = g;
        c.beginPath();
        c.ellipse(0, 0, r * 1.15, r, 0, 0, TAU);
        c.fill();
        // Bocota con dientes
        c.fillStyle = "#0a0505";
        c.beginPath();
        c.moveTo(r * 1.1, -r * 0.15);
        c.quadraticCurveTo(r * 0.4, r * 0.25, r * 1.05, r * 0.6);
        c.fill();
        c.fillStyle = "#f1faee";
        for (let k = 0; k < 5; k++) {
            const t = k / 4;
            const x = r * (1.08 - Math.sin(t * Math.PI) * 0.45);
            const y = -r * 0.15 + t * r * 0.75;
            c.beginPath();
            c.moveTo(x, y);
            c.lineTo(x - r * 0.18, y + r * 0.05);
            c.lineTo(x, y + r * 0.1);
            c.fill();
        }
        // Caña con la lucecita
        c.strokeStyle = "#3d2b1f";
        c.lineWidth = Math.max(1, L * 0.025);
        c.beginPath();
        c.moveTo(r * 0.3, -r * 0.9);
        c.quadraticCurveTo(r * 0.9, -r * 2.0, r * 1.5, -r * 1.3 + onda * r * 0.08);
        c.stroke();
        c.fillStyle = "#ffe066";
        c.beginPath();
        c.arc(r * 1.5, -r * 1.25 + onda * r * 0.08, r * 0.14, 0, TAU);
        c.fill();
        ojo(c, r, r, 0.45, -0.45, 1.2);
    } else if (id === "leon") {
        const a = L * 0.2;
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
        // Aletas pectorales como abanicos
        c.fillStyle = "rgba(193,18,31,0.35)";
        c.beginPath();
        c.moveTo(L * 0.15, a * 0.3);
        c.lineTo(-L * 0.25, a * (2.2 + onda * 0.2));
        c.lineTo(L * 0.05, a * 2.4);
        c.fill();
        cola(c, L, a, "rgba(193,18,31,0.6)", onda);
        cuerpo(c, L, a, "#e07a3f", "#fff1e6");
        c.save();
        formaCuerpo(c, L, a);
        c.clip();
        c.fillStyle = "rgba(157,2,8,0.8)";
        for (let k = 0; k < 6; k++) c.fillRect(L * (0.35 - k * 0.12), -a, L * 0.05, a * 2);
        c.restore();
        terminar(c, L, a, false);
        ojo(c, L, a, 0.34);
    } else {
        // Tiburón bambú
        const a = L * 0.13;
        cola(c, L * 1.1, a * 1.2, "#5c636a", onda, 1.2, 0.05);
        aleta(c, [[L * 0.05, -a * 0.8], [-L * 0.08, -a * 2.2], [-L * 0.18, -a * 0.8]], "#5c636a", false);
        aleta(c, [[L * 0.18, a * 0.6], [L * 0.05, a * 1.8], [-L * 0.02, a * 0.6]], "#6c757d", false);
        cuerpo(c, L, a, "#7d858d", "#eef0f2");
        c.fillStyle = "rgba(73,80,87,0.35)";
        for (let k = 0; k < 6; k++) {
            c.beginPath();
            c.arc(L * (0.25 - k * 0.1), -a * 0.3, L * 0.025, 0, TAU);
            c.fill();
        }
        terminar(c, L, a, false);
        ojo(c, L, a, 0.36, -0.2, 0.8);
    }
}

// ---------- Plantas (se dibujan en cada cuadro porque se mecen) ----------
export function dibujarPlanta(c, datos, x, piso, alto, t, semilla) {
    const h = alto * datos.alto;
    const color = datos.color;
    const vaiven = (k) => Math.sin(t * 0.9 + semilla * 10 + k) * h * 0.06;
    if (datos.forma === "cinta") {
        for (let k = 0; k < 5; k++) {
            const dx = (k - 2) * 5;
            const hh = h * (0.65 + ((k * 37 + semilla * 100) % 10) / 28);
            const v = vaiven(k) * 1.6;
            c.fillStyle = k % 2 ? color : oscurecer(color);
            c.beginPath();
            c.moveTo(x + dx - 2.5, piso);
            c.quadraticCurveTo(x + dx + v * 0.5 - 3, piso - hh * 0.5, x + dx + v, piso - hh);
            c.quadraticCurveTo(x + dx + v * 0.5 + 3, piso - hh * 0.5, x + dx + 2.5, piso);
            c.fill();
        }
    } else if (datos.forma === "helecho") {
        for (let k = 0; k < 6; k++) {
            const ang = -Math.PI / 2 + (k - 2.5) * 0.28;
            const hh = h * (0.7 + (k % 3) * 0.15);
            const v = vaiven(k);
            const px = x + Math.cos(ang) * hh * 0.5 + v;
            const py = piso + Math.sin(ang) * hh;
            c.fillStyle = k % 2 ? color : oscurecer(color);
            c.beginPath();
            c.moveTo(x, piso);
            c.quadraticCurveTo((x + px) / 2 - 6, (piso + py) / 2, px, py);
            c.quadraticCurveTo((x + px) / 2 + 6, (piso + py) / 2, x, piso);
            c.fill();
        }
    } else if (datos.forma === "tallo") {
        for (let k = 0; k < 3; k++) {
            const bx = x + (k - 1) * 9;
            const hh = h * (0.75 + k * 0.12);
            const v = vaiven(k);
            c.strokeStyle = oscurecer(color);
            c.lineWidth = 2;
            c.beginPath();
            c.moveTo(bx, piso);
            c.quadraticCurveTo(bx + v * 0.5, piso - hh / 2, bx + v, piso - hh);
            c.stroke();
            c.fillStyle = color;
            for (let j = 1; j <= 6; j++) {
                const f = j / 6;
                const lx = bx + v * f * f;
                const ly = piso - hh * f;
                c.beginPath();
                c.ellipse(lx - 4, ly, 5, 2.2, 0.5, 0, TAU);
                c.ellipse(lx + 4, ly, 5, 2.2, -0.5, 0, TAU);
                c.fill();
            }
        }
    } else if (datos.forma === "anemona") {
        c.fillStyle = oscurecer(color);
        c.beginPath();
        c.ellipse(x, piso - 4, h * 0.35, 7, 0, 0, TAU);
        c.fill();
        c.strokeStyle = color;
        c.lineWidth = 4;
        c.lineCap = "round";
        c.beginPath();
        for (let k = 0; k < 11; k++) {
            const bx = x + (k - 5) * h * 0.06;
            const v = vaiven(k) * 2;
            c.moveTo(bx, piso - 6);
            c.quadraticCurveTo(bx + v, piso - h * 0.6, bx + v * 1.6 + (k - 5) * 2, piso - h);
        }
        c.stroke();
        c.fillStyle = "#fff5";
        for (let k = 0; k < 11; k += 2) {
            const bx = x + (k - 5) * h * 0.06 + vaiven(k) * 3.2 + (k - 5) * 2;
            c.beginPath();
            c.arc(bx, piso - h, 2, 0, TAU);
            c.fill();
        }
    } else if (datos.forma === "abanico") {
        const v = vaiven(0) * 0.6;
        c.strokeStyle = color;
        c.lineWidth = 1.4;
        c.beginPath();
        for (let k = 0; k < 9; k++) {
            const ang = -Math.PI / 2 + (k - 4) * 0.17;
            c.moveTo(x, piso);
            c.quadraticCurveTo(x + Math.cos(ang) * h * 0.5, piso + Math.sin(ang) * h * 0.5, x + Math.cos(ang) * h + v, piso + Math.sin(ang) * h);
        }
        for (let j = 1; j <= 4; j++) {
            const rr = (h * j) / 4;
            c.moveTo(x + Math.cos(-Math.PI / 2 - 0.68) * rr + v * j / 4, piso + Math.sin(-Math.PI / 2 - 0.68) * rr);
            c.arc(x + v * j / 4, piso, rr, -Math.PI / 2 - 0.68, -Math.PI / 2 + 0.68);
        }
        c.stroke();
    } else if (datos.forma === "tubos") {
        for (let k = 0; k < 5; k++) {
            const bx = x + (k - 2) * 7;
            const hh = h * (0.6 + (k % 3) * 0.2);
            c.fillStyle = "#e9ecef";
            c.fillRect(bx - 2, piso - hh, 4, hh);
            const abre = 0.8 + Math.sin(t * 1.5 + k + semilla * 5) * 0.3;
            c.fillStyle = color;
            c.beginPath();
            c.ellipse(bx, piso - hh - 4 * abre, 6 * abre, 5 * abre, 0, Math.PI, 0);
            c.fill();
        }
    } else {
        // Esponja de vidrio (jarrón calado)
        c.strokeStyle = color;
        c.lineWidth = 1.2;
        c.beginPath();
        c.moveTo(x - 6, piso);
        c.quadraticCurveTo(x - h * 0.3, piso - h * 0.6, x - h * 0.22, piso - h);
        c.moveTo(x + 6, piso);
        c.quadraticCurveTo(x + h * 0.3, piso - h * 0.6, x + h * 0.22, piso - h);
        for (let j = 1; j < 8; j++) {
            const yy = piso - (h * j) / 8;
            const w = 6 + (h * 0.22 - 6) * (j / 8) + Math.sin(j) * 2;
            c.moveTo(x - w, yy);
            c.lineTo(x + w, yy);
        }
        for (let j = -2; j <= 2; j++) {
            c.moveTo(x + j * 3, piso);
            c.lineTo(x + j * h * 0.09, piso - h);
        }
        c.stroke();
    }
}
export function oscurecer(hex) {
    const n = parseInt(hex.slice(1, 7), 16);
    return `rgb(${(n >> 16) * 0.72 | 0},${((n >> 8) & 255) * 0.72 | 0},${(n & 255) * 0.72 | 0})`;
}

// ---------- Decoraciones (van en el fondo fijo) ----------
export function dibujarDeco(c, tipo, x, y, t) {
    if (tipo === "roca") {
        for (const [dx, dy, r, color] of [[-0.25, -0.1, 0.32, "#495057"], [0.2, -0.05, 0.25, "#6c757d"], [0, -0.3, 0.3, "#343a40"]]) {
            const g = c.createRadialGradient(x + dx * t - r * t * 0.3, y + dy * t - r * t * 0.4, 0, x + dx * t, y + dy * t, r * t);
            g.addColorStop(0, "#adb5bd");
            g.addColorStop(1, color);
            c.fillStyle = g;
            c.beginPath();
            c.ellipse(x + dx * t, y + dy * t, r * t, r * t * 0.75, 0, 0, TAU);
            c.fill();
        }
    } else if (tipo === "tronco") {
        const g = c.createLinearGradient(0, y - t * 0.4, 0, y);
        g.addColorStop(0, "#8d6748");
        g.addColorStop(1, "#4a3220");
        c.strokeStyle = g;
        c.lineCap = "round";
        c.lineWidth = t * 0.22;
        c.beginPath();
        c.moveTo(x - t * 0.7, y - t * 0.05);
        c.quadraticCurveTo(x, y - t * 0.35, x + t * 0.6, y - t * 0.1);
        c.moveTo(x - t * 0.1, y - t * 0.25);
        c.quadraticCurveTo(x + t * 0.1, y - t * 0.7, x + t * 0.35, y - t * 0.95);
        c.stroke();
        c.strokeStyle = "rgba(40,25,10,0.5)";
        c.lineWidth = 1;
        c.beginPath();
        for (let k = 0; k < 6; k++) {
            c.moveTo(x - t * 0.6 + k * t * 0.2, y - t * 0.12);
            c.lineTo(x - t * 0.5 + k * t * 0.2, y - t * 0.2);
        }
        c.stroke();
        c.fillStyle = "#2d6a4f";
        c.beginPath();
        c.ellipse(x + t * 0.3, y - t * 0.95, t * 0.12, t * 0.05, 0.5, 0, TAU);
        c.fill();
    } else if (tipo === "coral") {
        c.strokeStyle = "#ff8fab";
        c.lineCap = "round";
        const rama = (x0, y0, ang, largo, n) => {
            const x1 = x0 + Math.cos(ang) * largo;
            const y1 = y0 + Math.sin(ang) * largo;
            c.lineWidth = t * 0.03 * (n + 1);
            c.beginPath();
            c.moveTo(x0, y0);
            c.lineTo(x1, y1);
            c.stroke();
            if (n > 0) {
                rama(x1, y1, ang - 0.45, largo * 0.72, n - 1);
                rama(x1, y1, ang + 0.45, largo * 0.72, n - 1);
            }
        };
        rama(x, y, -Math.PI / 2, t * 0.45, 3);
    } else if (tipo === "cerebro") {
        const g = c.createRadialGradient(x - t * 0.1, y - t * 0.35, 0, x, y - t * 0.2, t * 0.5);
        g.addColorStop(0, "#d8f3a6");
        g.addColorStop(1, "#7a9a3a");
        c.fillStyle = g;
        c.beginPath();
        c.ellipse(x, y - t * 0.15, t * 0.45, t * 0.32, 0, Math.PI, 0);
        c.fill();
        c.strokeStyle = "rgba(60,80,20,0.6)";
        c.lineWidth = 1.2;
        for (let k = 0; k < 5; k++) {
            c.beginPath();
            const yy = y - t * (0.15 + k * 0.05);
            for (let px = -0.4; px <= 0.4; px += 0.05) c.lineTo(x + px * t * (1 - k * 0.18), yy + Math.sin(px * 30 + k) * t * 0.02);
            c.stroke();
        }
    } else if (tipo === "cofre") {
        c.fillStyle = "#6f4518";
        c.fillRect(x - t * 0.4, y - t * 0.35, t * 0.8, t * 0.35);
        c.fillStyle = "#8d5a2b";
        c.beginPath();
        c.ellipse(x, y - t * 0.35, t * 0.4, t * 0.2, 0, Math.PI, 0);
        c.fill();
        c.fillStyle = "#ffd166";
        c.fillRect(x - t * 0.4, y - t * 0.22, t * 0.8, t * 0.05);
        c.beginPath();
        c.arc(x + t * 0.1, y - t * 0.42, t * 0.06, 0, TAU);
        c.fill();
        c.fillStyle = "#ffe066aa";
        for (const dx of [-0.25, -0.1, 0.05]) {
            c.beginPath();
            c.arc(x + dx * t, y - t * 0.02, t * 0.05, 0, TAU);
            c.fill();
        }
    } else if (tipo === "ancla") {
        c.strokeStyle = "#5a5f66";
        c.lineCap = "round";
        c.lineWidth = t * 0.09;
        c.save();
        c.translate(x, y - t * 0.1);
        c.rotate(0.35);
        c.beginPath();
        c.moveTo(0, -t * 0.8);
        c.lineTo(0, 0);
        c.moveTo(-t * 0.25, -t * 0.62);
        c.lineTo(t * 0.25, -t * 0.62);
        c.moveTo(-t * 0.4, -t * 0.25);
        c.quadraticCurveTo(0, t * 0.2, t * 0.4, -t * 0.25);
        c.stroke();
        c.lineWidth = t * 0.05;
        c.beginPath();
        c.arc(0, -t * 0.88, t * 0.09, 0, TAU);
        c.stroke();
        c.fillStyle = "#8b5e3c88";
        c.beginPath();
        c.arc(t * 0.15, -t * 0.4, t * 0.06, 0, TAU);
        c.fill();
        c.restore();
    } else if (tipo === "chimenea") {
        const g = c.createLinearGradient(x - t * 0.3, 0, x + t * 0.3, 0);
        g.addColorStop(0, "#1b1b1b");
        g.addColorStop(0.5, "#4a4e57");
        g.addColorStop(1, "#1b1b1b");
        c.fillStyle = g;
        c.beginPath();
        c.moveTo(x - t * 0.45, y);
        c.lineTo(x - t * 0.15, y - t * 1.1);
        c.lineTo(x + t * 0.15, y - t * 1.1);
        c.lineTo(x + t * 0.45, y);
        c.fill();
        c.fillStyle = "#ff6d00";
        c.beginPath();
        c.ellipse(x, y - t * 1.1, t * 0.14, t * 0.04, 0, 0, TAU);
        c.fill();
        c.fillStyle = "#ffffff22";
        c.fillRect(x - t * 0.1, y - t * 1.0, t * 0.04, t * 0.9);
    } else {
        // Castillo
        c.fillStyle = "#adb5bd";
        c.fillRect(x - t * 0.45, y - t * 0.6, t * 0.9, t * 0.6);
        for (const dx of [-0.45, 0.25]) {
            c.fillRect(x + dx * t, y - t * 0.95, t * 0.2, t * 0.95);
            c.fillStyle = "#868e96";
            for (let k = 0; k < 3; k++) c.fillRect(x + dx * t + k * t * 0.07, y - t * 1.02, t * 0.05, t * 0.07);
            c.fillStyle = "#adb5bd";
        }
        c.fillStyle = "#1b263b";
        c.beginPath();
        c.ellipse(x, y - t * 0.12, t * 0.14, t * 0.2, 0, Math.PI, 0);
        c.fill();
        c.fillRect(x - t * 0.14, y - t * 0.12, t * 0.28, t * 0.12);
        c.fillStyle = "#52b78888";
        c.beginPath();
        c.ellipse(x - t * 0.3, y - t * 0.2, t * 0.1, t * 0.05, 0.4, 0, TAU);
        c.fill();
    }
}
