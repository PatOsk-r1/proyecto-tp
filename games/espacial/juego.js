// Corredor espacial: la nave sigue al dedo y dispara sola. Oleadas cada vez más difíciles.
import { cargar, guardar, vibrar } from "../../js/comun3d.js";
import { crearLienzo, bucle, crearChispas } from "../../js/lienzo2d.js";

const $ = (id) => document.getElementById(id);
const CLAVE = "espacial";

const TIPOS = {
    dron: { vida: 1, puntos: 10, radio: 14, color: "#ff4d6d", velocidad: 140 },
    zigzag: { vida: 2, puntos: 25, radio: 15, color: "#ffd23f", velocidad: 110 },
    tanque: { vida: 6, puntos: 60, radio: 24, color: "#c77dff", velocidad: 60, dispara: true },
    roca: { vida: 3, puntos: 15, radio: 20, color: "#9a8c98", velocidad: 90 },
};

const estado = cargar(CLAVE, { record: 0 });
const chispas = crearChispas();
const lienzo = crearLienzo($("lienzo"));
let juego = null;

// Estrellas en tres capas (las de adelante se mueven más rápido)
const estrellas = Array.from({ length: 120 }, () => ({ x: Math.random(), y: Math.random(), capa: 1 + Math.floor(Math.random() * 3) }));

function nuevo() {
    juego = {
        nave: { x: lienzo.ancho / 2, y: lienzo.alto * 0.82, objetivoX: lienzo.ancho / 2, objetivoY: lienzo.alto * 0.82, invencible: 2 },
        balas: [],
        balasEnemigas: [],
        enemigos: [],
        premios: [],
        puntos: 0,
        vidas: 3,
        tiempo: 0,
        cadencia: 0,
        aparicion: 0,
        dobleHasta: 0,
        escudo: false,
        vivo: true,
    };
    pintarDatos();
}

function aparecer() {
    const t = juego.tiempo;
    const opciones = ["dron", "dron", "roca"];
    if (t > 15) opciones.push("zigzag", "zigzag");
    if (t > 35) opciones.push("tanque");
    const tipo = opciones[Math.floor(Math.random() * opciones.length)];
    const base = TIPOS[tipo];
    const r = base.radio;
    juego.enemigos.push({
        tipo,
        x: r + Math.random() * (lienzo.ancho - 2 * r),
        y: -r,
        vida: base.vida,
        fase: Math.random() * 6,
        giro: (Math.random() - 0.5) * 2,
        recarga: 1 + Math.random(),
        lados: 7 + Math.floor(Math.random() * 3),
    });
}

function paso(dt) {
    const { ancho, alto } = lienzo;
    const n = juego.nave;
    juego.tiempo += dt;
    n.x += (n.objetivoX - n.x) * Math.min(1, dt * 14);
    n.y += (n.objetivoY - n.y) * Math.min(1, dt * 14);
    n.invencible = Math.max(0, n.invencible - dt);

    // Disparo automático
    juego.cadencia -= dt;
    if (juego.cadencia <= 0) {
        juego.cadencia = 0.17;
        const doble = juego.dobleHasta > juego.tiempo;
        for (const dx of doble ? [-10, 10] : [0]) juego.balas.push({ x: n.x + dx, y: n.y - 22 });
    }
    for (const b of juego.balas) b.y -= 620 * dt;
    juego.balas = juego.balas.filter((b) => b.y > -20);

    // Enemigos
    juego.aparicion -= dt;
    if (juego.aparicion <= 0) {
        juego.aparicion = Math.max(0.28, 1.1 - juego.tiempo * 0.012);
        aparecer();
    }
    for (const e of juego.enemigos) {
        const t = TIPOS[e.tipo];
        e.y += t.velocidad * (1 + juego.tiempo * 0.008) * dt;
        if (e.tipo === "zigzag") e.x += Math.sin(juego.tiempo * 3 + e.fase) * 120 * dt;
        e.fase += e.giro * dt;
        if (t.dispara) {
            e.recarga -= dt;
            if (e.recarga <= 0 && e.y > 0) {
                e.recarga = 1.6;
                const a = Math.atan2(n.y - e.y, n.x - e.x);
                juego.balasEnemigas.push({ x: e.x, y: e.y, vx: Math.cos(a) * 220, vy: Math.sin(a) * 220 });
            }
        }
        // Impactos de mis balas
        for (const b of juego.balas) {
            if (b.usada || Math.hypot(b.x - e.x, b.y - e.y) > t.radio + 4) continue;
            b.usada = true;
            e.vida--;
            chispas.emitir(b.x, b.y, "#fff", 3, 90);
            if (e.vida <= 0) destruir(e);
        }
        // Choque con la nave
        if (!e.muerto && Math.hypot(e.x - n.x, e.y - n.y) < t.radio + 14) {
            destruir(e);
            golpeNave();
        }
    }
    juego.balas = juego.balas.filter((b) => !b.usada);
    juego.enemigos = juego.enemigos.filter((e) => !e.muerto && e.y < alto + 40);

    for (const b of juego.balasEnemigas) {
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        if (Math.hypot(b.x - n.x, b.y - n.y) < 14) {
            b.usada = true;
            golpeNave();
        }
    }
    juego.balasEnemigas = juego.balasEnemigas.filter((b) => !b.usada && b.y < alto + 10 && b.y > -10 && b.x > -10 && b.x < ancho + 10);

    for (const p of juego.premios) {
        p.y += 120 * dt;
        if (Math.hypot(p.x - n.x, p.y - n.y) < 26) {
            p.tomado = true;
            vibrar(40);
            if (p.tipo === "doble") juego.dobleHasta = juego.tiempo + 10;
            else juego.escudo = true;
        }
    }
    juego.premios = juego.premios.filter((p) => !p.tomado && p.y < alto + 20);
}

function destruir(e) {
    e.muerto = true;
    const t = TIPOS[e.tipo];
    juego.puntos += t.puntos;
    chispas.emitir(e.x, e.y, t.color, e.tipo === "tanque" ? 30 : 16, 220);
    chispas.emitir(e.x, e.y, "#ffb703", 8, 140);
    vibrar(e.tipo === "tanque" ? 60 : 15);
    if (Math.random() < (e.tipo === "tanque" ? 0.6 : 0.06)) juego.premios.push({ x: e.x, y: e.y, tipo: Math.random() < 0.5 ? "doble" : "escudo" });
    pintarDatos();
}

function golpeNave() {
    const n = juego.nave;
    if (n.invencible > 0) return;
    if (juego.escudo) {
        juego.escudo = false;
        n.invencible = 1;
        chispas.emitir(n.x, n.y, "#4cc9f0", 20, 200);
        vibrar(60);
        return;
    }
    juego.vidas--;
    n.invencible = 2;
    chispas.emitir(n.x, n.y, "#ff6b35", 30, 260);
    vibrar(180);
    pintarDatos();
    if (juego.vidas <= 0) fin();
}

function fin() {
    juego.vivo = false;
    const nuevo = juego.puntos > estado.record;
    if (nuevo) estado.record = juego.puntos;
    guardar(CLAVE, estado);
    setTimeout(() => {
        $("titulo-centro").innerHTML = `${nuevo ? "¡Nuevo récord!" : "Nave destruida"}<div class="chico">${juego.puntos} puntos · ${Math.floor(juego.tiempo)} segundos</div>`;
        $("jugar").textContent = "Otra vez";
        $("centro").hidden = false;
        pintarDatos();
    }, 700);
}

function pintarDatos() {
    $("puntos").textContent = juego?.puntos ?? 0;
    $("vidas").textContent = juego?.vidas ?? 3;
    $("record").textContent = estado.record;
}

// ---------- Dibujo ----------
function dibujarNave(ctx, n) {
    if (n.invencible > 0 && Math.floor(n.invencible * 10) % 2) return;
    const llama = 10 + Math.random() * 8;
    ctx.fillStyle = "#ffb703";
    ctx.beginPath();
    ctx.moveTo(n.x - 6, n.y + 14);
    ctx.lineTo(n.x, n.y + 14 + llama);
    ctx.lineTo(n.x + 6, n.y + 14);
    ctx.fill();
    const g = ctx.createLinearGradient(n.x - 18, 0, n.x + 18, 0);
    g.addColorStop(0, "#8d99ae");
    g.addColorStop(0.5, "#edf2f4");
    g.addColorStop(1, "#8d99ae");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(n.x, n.y - 22);
    ctx.lineTo(n.x + 18, n.y + 14);
    ctx.lineTo(n.x + 6, n.y + 10);
    ctx.lineTo(n.x - 6, n.y + 10);
    ctx.lineTo(n.x - 18, n.y + 14);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#4cc9f0";
    ctx.beginPath();
    ctx.ellipse(n.x, n.y - 4, 4, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    if (juego.escudo) {
        ctx.strokeStyle = "#4cc9f0aa";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(n.x, n.y, 28 + Math.sin(performance.now() / 120) * 2, 0, Math.PI * 2);
        ctx.stroke();
    }
}

function dibujarEnemigo(ctx, e) {
    const t = TIPOS[e.tipo];
    ctx.save();
    ctx.translate(e.x, e.y);
    ctx.shadowColor = t.color;
    ctx.shadowBlur = 12;
    if (e.tipo === "roca") {
        ctx.rotate(e.fase);
        ctx.fillStyle = "#6c757d";
        ctx.beginPath();
        for (let i = 0; i < e.lados; i++) {
            const a = (i / e.lados) * Math.PI * 2;
            const r = t.radio * (0.8 + ((i * 37) % 10) / 40);
            i ? ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r) : ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
        }
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "#495057";
        ctx.beginPath();
        ctx.arc(-5, -3, 4, 0, Math.PI * 2);
        ctx.arc(6, 5, 3, 0, Math.PI * 2);
        ctx.fill();
    } else {
        ctx.fillStyle = t.color;
        ctx.beginPath();
        if (e.tipo === "tanque") {
            ctx.roundRect(-t.radio, -t.radio * 0.6, t.radio * 2, t.radio * 1.2, 8);
        } else {
            ctx.moveTo(0, t.radio);
            ctx.lineTo(t.radio, -t.radio * 0.6);
            ctx.lineTo(0, -t.radio * 0.2);
            ctx.lineTo(-t.radio, -t.radio * 0.6);
            ctx.closePath();
        }
        ctx.fill();
        ctx.fillStyle = "#10002b";
        ctx.beginPath();
        ctx.arc(0, 0, t.radio * 0.28, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();
}

function dibujar(dt) {
    const { ctx, ancho, alto } = lienzo;
    ctx.fillStyle = "#03001c";
    ctx.fillRect(0, 0, ancho, alto);
    for (const s of estrellas) {
        s.y += dt * 0.05 * s.capa * (juego?.vivo ? 1.6 : 0.5);
        if (s.y > 1) s.y -= 1;
        ctx.fillStyle = `rgba(255,255,255,${0.25 * s.capa})`;
        ctx.fillRect(s.x * ancho, s.y * alto, s.capa, s.capa * (juego?.vivo ? 2 : 1));
    }
    if (!juego) return;
    ctx.fillStyle = "#9bf6ff";
    ctx.shadowColor = "#4cc9f0";
    ctx.shadowBlur = 8;
    for (const b of juego.balas) ctx.fillRect(b.x - 2, b.y - 8, 4, 14);
    ctx.fillStyle = "#ff4d6d";
    ctx.shadowColor = "#ff4d6d";
    for (const b of juego.balasEnemigas) {
        ctx.beginPath();
        ctx.arc(b.x, b.y, 5, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.shadowBlur = 0;
    for (const e of juego.enemigos) dibujarEnemigo(ctx, e);
    for (const p of juego.premios) {
        ctx.fillStyle = p.tipo === "doble" ? "#ffd23f" : "#4cc9f0";
        ctx.beginPath();
        ctx.arc(p.x, p.y, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#02010a";
        ctx.font = "900 12px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(p.tipo === "doble" ? "2×" : "◎", p.x, p.y + 1);
    }
    if (juego.vivo) dibujarNave(ctx, juego.nave);
    chispas.dibujar(ctx, dt);
}

bucle((dt) => {
    if (juego?.vivo && $("centro").hidden) paso(dt);
    dibujar(dt);
});

// ---------- Controles: la nave va hacia el dedo (un poco más arriba para verla) ----------
function mover(e) {
    if (!juego) return;
    const caja = $("lienzo").getBoundingClientRect();
    juego.nave.objetivoX = Math.max(18, Math.min(lienzo.ancho - 18, e.clientX - caja.left));
    juego.nave.objetivoY = Math.max(lienzo.alto * 0.45, Math.min(lienzo.alto - 30, e.clientY - caja.top - 60));
}
$("lienzo").addEventListener("pointerdown", mover);
$("lienzo").addEventListener("pointermove", mover);

$("jugar").addEventListener("click", () => {
    $("centro").hidden = true;
    chispas.limpiar();
    nuevo();
});
pintarDatos();
