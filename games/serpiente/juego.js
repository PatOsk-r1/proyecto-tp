// Serpiente: comé frutas para crecer; cada fruta te hace más rápido. Las doradas valen más.
import { cargar, guardar, vibrar } from "../../js/comun3d.js";
import { crearLienzo, bucle, crearChispas } from "../../js/lienzo2d.js";

const $ = (id) => document.getElementById(id);
const CLAVE = "serpiente";
const COLUMNAS = 17;

const estado = cargar(CLAVE, { record: 0 });
let filas = 20;
let celda = 20;
let origenX = 0;
let origenY = 0;
let juego = null;
const chispas = crearChispas();

const lienzo = crearLienzo($("lienzo"), ({ ancho, alto }) => {
    celda = Math.floor(Math.min(ancho / COLUMNAS, alto / 12));
    filas = Math.max(12, Math.floor(alto / celda));
    origenX = (ancho - COLUMNAS * celda) / 2;
    origenY = (alto - filas * celda) / 2;
});

function nuevo() {
    const f = Math.floor(filas / 2);
    juego = {
        cuerpo: [{ x: 5, y: f }, { x: 4, y: f }, { x: 3, y: f }],
        dir: { x: 1, y: 0 },
        cola: [],
        fruta: null,
        dorada: null,
        puntos: 0,
        espera: 0,
        velocidad: 7,
        vivo: true,
        anterior: null,
    };
    ponerFruta();
    pintarDatos();
}

function libre() {
    for (;;) {
        const p = { x: Math.floor(Math.random() * COLUMNAS), y: Math.floor(Math.random() * filas) };
        if (!juego.cuerpo.some((s) => s.x === p.x && s.y === p.y)) return p;
    }
}

function ponerFruta() {
    juego.fruta = libre();
    if (!juego.dorada && Math.random() < 0.18) juego.dorada = { ...libre(), vida: 6 };
}

function girar(dx, dy) {
    if (!juego?.vivo) return;
    const ultima = juego.cola.at(-1) ?? juego.dir;
    if (dx === -ultima.x && dy === -ultima.y) return; // no se puede volver hacia atrás
    if (dx === ultima.x && dy === ultima.y) return;
    if (juego.cola.length < 2) juego.cola.push({ x: dx, y: dy });
}

function avanzar() {
    if (juego.cola.length) juego.dir = juego.cola.shift();
    juego.anterior = juego.cuerpo.map((s) => ({ ...s }));
    const cabeza = { x: juego.cuerpo[0].x + juego.dir.x, y: juego.cuerpo[0].y + juego.dir.y };
    const choca = cabeza.x < 0 || cabeza.y < 0 || cabeza.x >= COLUMNAS || cabeza.y >= filas || juego.cuerpo.slice(0, -1).some((s) => s.x === cabeza.x && s.y === cabeza.y);
    if (choca) return morir();
    juego.cuerpo.unshift(cabeza);
    const comeFruta = cabeza.x === juego.fruta.x && cabeza.y === juego.fruta.y;
    const comeDorada = juego.dorada && cabeza.x === juego.dorada.x && cabeza.y === juego.dorada.y;
    if (comeFruta || comeDorada) {
        const [px, py] = centro(cabeza.x, cabeza.y);
        chispas.emitir(px, py, comeDorada ? "#ffd23f" : "#ff4d6d", 14);
        juego.puntos += comeDorada ? 5 : 1;
        juego.velocidad = Math.min(16, juego.velocidad + 0.25);
        vibrar(comeDorada ? 50 : 20);
        if (comeDorada) {
            juego.dorada = null;
            juego.cuerpo.push({ ...juego.cuerpo.at(-1) }, { ...juego.cuerpo.at(-1) });
        }
        if (comeFruta) ponerFruta();
        pintarDatos();
    } else {
        juego.cuerpo.pop();
    }
}

function morir() {
    juego.vivo = false;
    vibrar(200);
    const [px, py] = centro(juego.cuerpo[0].x, juego.cuerpo[0].y);
    chispas.emitir(px, py, "#7ee08f", 30, 240);
    const nuevoRecord = juego.puntos > estado.record;
    if (nuevoRecord) estado.record = juego.puntos;
    guardar(CLAVE, estado);
    setTimeout(() => {
        $("titulo-centro").innerHTML = `${nuevoRecord ? "¡Nuevo récord!" : "¡Chocaste!"}<div class="chico">${juego.puntos} puntos · largo ${juego.cuerpo.length}</div>`;
        $("jugar").textContent = "Otra vez";
        $("centro").hidden = false;
        pintarDatos();
    }, 600);
}

function pintarDatos() {
    $("puntos").textContent = juego?.puntos ?? 0;
    $("largo").textContent = juego?.cuerpo.length ?? 3;
    $("record").textContent = estado.record;
}

const centro = (x, y) => [origenX + (x + 0.5) * celda, origenY + (y + 0.5) * celda];

// ---------- Dibujo ----------
function dibujar(t) {
    const { ctx, ancho, alto } = lienzo;
    ctx.clearRect(0, 0, ancho, alto);
    // Pasto a cuadros
    for (let y = 0; y < filas; y++) {
        for (let x = 0; x < COLUMNAS; x++) {
            ctx.fillStyle = (x + y) % 2 ? "#52b788" : "#74c69d";
            ctx.fillRect(origenX + x * celda, origenY + y * celda, celda, celda);
        }
    }
    if (!juego) return;

    // Frutas
    const latido = 1 + Math.sin(performance.now() / 180) * 0.08;
    const fruta = (p, color, brillo) => {
        const [cx, cy] = centro(p.x, p.y);
        const g = ctx.createRadialGradient(cx - celda * 0.12, cy - celda * 0.12, 1, cx, cy, celda * 0.42);
        g.addColorStop(0, brillo);
        g.addColorStop(1, color);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(cx, cy, celda * 0.38 * latido, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#2d6a4f";
        ctx.beginPath();
        ctx.ellipse(cx + celda * 0.1, cy - celda * 0.36, celda * 0.13, celda * 0.07, -0.6, 0, Math.PI * 2);
        ctx.fill();
    };
    fruta(juego.fruta, "#d62828", "#ff8a80");
    if (juego.dorada) {
        ctx.shadowColor = "#ffd23f";
        ctx.shadowBlur = 14;
        fruta(juego.dorada, "#f0a500", "#fff3a8");
        ctx.shadowBlur = 0;
    }

    // Serpiente: interpolada entre el paso anterior y el actual para que se mueva suave
    const prev = juego.anterior ?? juego.cuerpo;
    const n = juego.cuerpo.length;
    for (let i = n - 1; i >= 0; i--) {
        const a = prev[Math.min(i, prev.length - 1)];
        const b = juego.cuerpo[i];
        const x = a.x + (b.x - a.x) * t;
        const y = a.y + (b.y - a.y) * t;
        const [cx, cy] = centro(x, y);
        const tono = 140 - (i / n) * 30;
        ctx.fillStyle = `hsl(${tono}, 65%, ${i === 0 ? 32 : 38 - (i % 2) * 4}%)`;
        ctx.beginPath();
        ctx.arc(cx, cy, celda * (i === 0 ? 0.5 : 0.46 - (i / n) * 0.1), 0, Math.PI * 2);
        ctx.fill();
        if (i === 0) {
            // Ojos mirando hacia donde va
            const d = juego.dir;
            for (const lado of [-1, 1]) {
                const ox = cx + d.x * celda * 0.18 + -d.y * lado * celda * 0.2;
                const oy = cy + d.y * celda * 0.18 + d.x * lado * celda * 0.2;
                ctx.fillStyle = "#fff";
                ctx.beginPath();
                ctx.arc(ox, oy, celda * 0.13, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = "#111";
                ctx.beginPath();
                ctx.arc(ox + d.x * celda * 0.05, oy + d.y * celda * 0.05, celda * 0.07, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }
}

bucle((dt) => {
    let t = 1;
    if (juego?.vivo && $("centro").hidden) {
        juego.espera += dt;
        const paso = 1 / juego.velocidad;
        while (juego.espera >= paso && juego.vivo) {
            juego.espera -= paso;
            avanzar();
        }
        t = Math.min(1, juego.espera / paso);
        if (juego.dorada) {
            juego.dorada.vida -= dt;
            if (juego.dorada.vida <= 0) juego.dorada = null;
        }
    }
    dibujar(t);
    chispas.dibujar(lienzo.ctx, dt);
});

// ---------- Controles ----------
let toque = null;
$("lienzo").addEventListener("pointerdown", (e) => (toque = { x: e.clientX, y: e.clientY }));
$("lienzo").addEventListener("pointermove", (e) => {
    if (!toque) return;
    const dx = e.clientX - toque.x;
    const dy = e.clientY - toque.y;
    if (Math.hypot(dx, dy) < 24) return;
    Math.abs(dx) > Math.abs(dy) ? girar(Math.sign(dx), 0) : girar(0, Math.sign(dy));
    toque = { x: e.clientX, y: e.clientY };
});
addEventListener("pointerup", () => (toque = null));
for (const b of document.querySelectorAll(".flechas button")) {
    b.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        const [dx, dy] = b.dataset.dir.split(",").map(Number);
        girar(dx, dy);
        vibrar(5);
    });
}
addEventListener("keydown", (e) => {
    const teclas = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] };
    if (teclas[e.key]) girar(...teclas[e.key]);
});

$("jugar").addEventListener("click", () => {
    $("centro").hidden = true;
    chispas.limpiar();
    nuevo();
});
pintarDatos();
