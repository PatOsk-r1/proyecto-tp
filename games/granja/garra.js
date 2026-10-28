// Minijuego de la garra (como la de las ferias): movés la garra, la bajás y si agarra un premio
// lo lleva hasta la salida. Cada tiro se gana subiendo de nivel o entregando pedidos (se acumulan).
const TAU = Math.PI * 2;
const W = 320;
const H = 380;
const TECHO = 46;
const PISO = 338;
const SALIDA = { x: 22, ancho: 62 }; // agujero de la izquierda
const INICIO_X = 190;

// Premios: probabilidad de que salga, de que la garra lo agarre bien, y qué da
export const PREMIOS = [
    { id: "monedas", nombre: "Bolsa de monedas", peso: 34, agarre: 0.8 },
    { id: "abono", nombre: "2 bolsas de abono", peso: 20, agarre: 0.8 },
    { id: "estrella", nombre: "Estrella de experiencia", peso: 16, agarre: 0.7 },
    { id: "nube", nombre: "Nube de lluvia", peso: 12, agarre: 0.65 },
    { id: "huevo", nombre: "Huevo de oro", peso: 10, agarre: 0.45 },
    { id: "trebol", nombre: "Trébol mágico", peso: 8, agarre: 0.4 },
];
function premioAlAzar() {
    let r = Math.random() * PREMIOS.reduce((t, p) => t + p.peso, 0);
    for (const p of PREMIOS) if ((r -= p.peso) < 0) return p;
    return PREMIOS[0];
}

function dibujarPremio(ctx, id, x, y, r, t = 0) {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = "#0003";
    ctx.beginPath();
    ctx.ellipse(0, r * 0.9, r * 0.8, r * 0.22, 0, 0, TAU);
    ctx.fill();
    if (id === "monedas") {
        const g = ctx.createRadialGradient(-r * 0.3, -r * 0.2, 1, 0, 0, r);
        g.addColorStop(0, "#d4a373");
        g.addColorStop(1, "#7a4a22");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(-r * 0.35, -r * 0.55);
        ctx.quadraticCurveTo(-r * 1.05, r * 0.1, -r * 0.7, r * 0.75);
        ctx.quadraticCurveTo(0, r * 1.05, r * 0.7, r * 0.75);
        ctx.quadraticCurveTo(r * 1.05, r * 0.1, r * 0.35, -r * 0.55);
        ctx.fill();
        ctx.fillStyle = "#5c3a1e";
        ctx.fillRect(-r * 0.4, -r * 0.62, r * 0.8, r * 0.16);
        const m = ctx.createRadialGradient(-r * 0.1, r * 0.05, 1, 0, r * 0.2, r * 0.38);
        m.addColorStop(0, "#fff6c2");
        m.addColorStop(1, "#e09f3e");
        ctx.fillStyle = m;
        ctx.beginPath();
        ctx.arc(0, r * 0.22, r * 0.36, 0, TAU);
        ctx.fill();
        ctx.fillStyle = "#a8661b";
        ctx.font = `900 ${r * 0.5}px system-ui, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("$", 0, r * 0.25);
    } else if (id === "abono") {
        ctx.fillStyle = "#6a994e";
        ctx.beginPath();
        ctx.roundRect(-r * 0.7, -r * 0.6, r * 1.4, r * 1.45, r * 0.25);
        ctx.fill();
        ctx.fillStyle = "#a7c957";
        ctx.fillRect(-r * 0.7, -r * 0.6, r * 1.4, r * 0.3);
        ctx.fillStyle = "#386641";
        ctx.beginPath();
        ctx.ellipse(0, r * 0.25, r * 0.32, r * 0.18, -0.5, 0, TAU);
        ctx.fill();
        ctx.fillStyle = "#f2e8cf";
        ctx.font = `900 ${r * 0.34}px system-ui, sans-serif`;
        ctx.textAlign = "center";
        ctx.fillText("ABONO", 0, r * 0.68);
    } else if (id === "estrella") {
        ctx.rotate(Math.sin(t * 2) * 0.1);
        const g = ctx.createRadialGradient(-r * 0.2, -r * 0.3, 1, 0, 0, r);
        g.addColorStop(0, "#fff3b0");
        g.addColorStop(1, "#f4a261");
        ctx.fillStyle = g;
        ctx.beginPath();
        for (let k = 0; k < 10; k++) {
            const a = -Math.PI / 2 + (k / 10) * TAU;
            const rr = k % 2 ? r * 0.45 : r;
            ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
        }
        ctx.fill();
        ctx.fillStyle = "#7a4a22";
        ctx.font = `900 ${r * 0.45}px system-ui, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("XP", 0, r * 0.08);
    } else if (id === "nube") {
        ctx.fillStyle = "#48cae4";
        for (const dx of [-0.35, 0, 0.35]) {
            ctx.beginPath();
            ctx.ellipse(dx * r, r * 0.55, r * 0.08, r * 0.16, 0, 0, TAU);
            ctx.fill();
        }
        ctx.fillStyle = "#f8f9fa";
        for (const [dx, dy, rr] of [[-0.4, 0.05, 0.4], [0.05, -0.2, 0.52], [0.45, 0.05, 0.38], [0, 0.15, 0.45]]) {
            ctx.beginPath();
            ctx.arc(dx * r, dy * r, rr * r, 0, TAU);
            ctx.fill();
        }
    } else if (id === "huevo") {
        const g = ctx.createRadialGradient(-r * 0.25, -r * 0.35, 1, 0, 0, r);
        g.addColorStop(0, "#fffbe0");
        g.addColorStop(0.35, "#ffd166");
        g.addColorStop(1, "#b5651d");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.ellipse(0, r * 0.05, r * 0.68, r * 0.88, 0, 0, TAU);
        ctx.fill();
        // Brillo que pasa
        const brillo = (t * 0.6) % 1;
        ctx.fillStyle = `rgba(255,255,255,${0.8 - brillo * 0.8})`;
        ctx.beginPath();
        ctx.arc(-r * 0.25, -r * 0.35, r * 0.12 + brillo * r * 0.1, 0, TAU);
        ctx.fill();
    } else {
        // Trébol de cuatro hojas
        ctx.rotate(t * 0.5);
        for (let k = 0; k < 4; k++) {
            ctx.rotate(TAU / 4);
            const g = ctx.createRadialGradient(0, -r * 0.4, 1, 0, -r * 0.4, r * 0.5);
            g.addColorStop(0, "#b7e4c7");
            g.addColorStop(1, "#2d6a4f");
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(-r * 0.18, -r * 0.45, r * 0.3, 0, TAU);
            ctx.arc(r * 0.18, -r * 0.45, r * 0.3, 0, TAU);
            ctx.fill();
        }
        ctx.fillStyle = "#ffd166";
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.14, 0, TAU);
        ctx.fill();
    }
    ctx.restore();
}

// tiros(): cuántos quedan · usarTiro(): gasta uno · ganar(premio) → texto del premio · sonidos: efectos del juego
export function abrirGarra({ tiros, usarTiro, ganar, sonidos }) {
    const fondo = document.createElement("div");
    fondo.className = "fondo-garra";
    fondo.innerHTML = `
        <div class="maquina-garra">
            <div class="cartel-garra"><span>🕹️ Garra de premios</span><b class="tiros-garra"></b></div>
            <canvas class="lienzo-garra"></canvas>
            <div class="mensaje-garra">Mové la garra y bajala sobre un premio</div>
            <div class="controles-garra">
                <button type="button" class="flecha-garra" data-dir="-1" aria-label="Izquierda">◀</button>
                <button type="button" class="bajar-garra">⬇ Bajar</button>
                <button type="button" class="flecha-garra" data-dir="1" aria-label="Derecha">▶</button>
            </div>
            <button type="button" class="salir-garra">Salir</button>
        </div>`;
    document.body.appendChild(fondo);
    const lienzo = fondo.querySelector("canvas");
    const ctx = lienzo.getContext("2d");
    const escala = Math.min(devicePixelRatio, 2);
    lienzo.width = W * escala;
    lienzo.height = H * escala;
    ctx.scale(escala, escala);
    const mensaje = fondo.querySelector(".mensaje-garra");
    const botonBajar = fondo.querySelector(".bajar-garra");

    // Montaña de premios en el piso (dos filas)
    const premios = [];
    const ponerPremio = (x, fila) => {
        const p = premioAlAzar();
        premios.push({ ...p, x, y: PISO - 18 - fila * 26, piso: PISO - 18 - fila * 26, vy: 0, r: 17 });
    };
    for (let k = 0; k < 7; k++) ponerPremio(108 + k * 30 + (Math.random() - 0.5) * 6, 0);
    for (let k = 0; k < 5; k++) ponerPremio(122 + k * 32 + (Math.random() - 0.5) * 8, 1);
    premios.sort((a, b) => a.piso - b.piso);

    const garra = { x: INICIO_X, y: TECHO + 10, abre: 1, fase: "mover", dir: 0, agarrado: null, seSuelta: false, t: 0 };
    const chispas = [];
    let banner = null;

    function pintarTiros() {
        const n = tiros();
        fondo.querySelector(".tiros-garra").textContent = `Tiros: ${n}`;
        botonBajar.disabled = garra.fase !== "mover" || n <= 0;
        if (n <= 0 && garra.fase === "mover" && !banner) mensaje.textContent = "No te quedan tiros: ganás más subiendo de nivel y entregando pedidos";
    }

    function bajar() {
        if (garra.fase !== "mover" || tiros() <= 0) return;
        usarTiro();
        garra.fase = "bajando";
        garra.dir = 0;
        mensaje.textContent = "¡Allá va…!";
        sonidos?.toque?.();
        pintarTiros();
    }

    // Premio que queda debajo de la garra (el de más arriba)
    const debajo = () =>
        premios.filter((p) => p !== garra.agarrado && Math.abs(p.x - garra.x) < p.r * 0.9).sort((a, b) => a.y - b.y)[0];

    function festejo(x, y) {
        const colores = ["#ffd166", "#ff4d6d", "#7ee0ff", "#8fd14f", "#c77dff"];
        for (let k = 0; k < 40; k++) {
            const a = Math.random() * TAU;
            const v = 80 + Math.random() * 160;
            chispas.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 80, vida: 1, color: colores[k % colores.length] });
        }
    }

    let anterior = performance.now();
    let abierto = true;
    function cuadro(ahora) {
        if (!abierto) return;
        const dt = Math.min(0.05, (ahora - anterior) / 1000);
        anterior = ahora;
        const t = ahora / 1000;
        actualizar(dt);
        dibujar(t, dt);
        requestAnimationFrame(cuadro);
    }

    function actualizar(dt) {
        const vel = 120;
        if (garra.fase === "mover") {
            garra.x = Math.max(36, Math.min(W - 30, garra.x + garra.dir * vel * dt));
            garra.y = TECHO + 10 + Math.sin(performance.now() / 300) * 1.5;
        } else if (garra.fase === "bajando") {
            garra.abre = Math.min(1, garra.abre + dt * 3);
            garra.y += 150 * dt;
            const p = debajo();
            const tope = p ? p.y - p.r * 0.6 : PISO - 14;
            if (garra.y >= tope) {
                garra.y = tope;
                garra.fase = "cerrando";
                garra.t = 0;
            }
        } else if (garra.fase === "cerrando") {
            garra.t += dt;
            garra.abre = Math.max(0, 1 - garra.t * 2.5);
            if (garra.t > 0.45) {
                const p = debajo();
                if (p && Math.abs(p.x - garra.x) < p.r * 0.75) {
                    garra.agarrado = p;
                    // Se decide ahora si se le va a resbalar en el camino
                    const centrado = 1 - Math.abs(p.x - garra.x) / (p.r * 0.75);
                    garra.seSuelta = Math.random() > p.agarre * (0.75 + centrado * 0.35);
                    sonidos?.plantar?.();
                }
                garra.fase = "subiendo";
            }
        } else if (garra.fase === "subiendo") {
            garra.y -= 110 * dt;
            if (garra.agarrado && garra.seSuelta && garra.y < (TECHO + PISO) / 2) {
                // ¡Se resbaló!
                garra.agarrado.vy = 0;
                garra.agarrado.cayendo = true;
                garra.agarrado = null;
                garra.abre = 0.6;
                mensaje.textContent = "¡Uy, se le resbaló!";
                sonidos?.error?.();
            }
            if (garra.y <= TECHO + 10) {
                garra.y = TECHO + 10;
                garra.fase = garra.agarrado ? "llevando" : "volviendo";
                if (!garra.agarrado && !mensaje.textContent.includes("resbal")) mensaje.textContent = "No agarró nada… ¡probá de nuevo!";
            }
        } else if (garra.fase === "llevando") {
            const destino = SALIDA.x + SALIDA.ancho / 2;
            garra.x -= vel * dt;
            if (garra.x <= destino) {
                garra.x = destino;
                garra.fase = "soltando";
                garra.t = 0;
            }
        } else if (garra.fase === "soltando") {
            garra.t += dt;
            garra.abre = Math.min(1, garra.t * 3);
            if (garra.agarrado && garra.t > 0.25) {
                garra.agarrado.cayendo = true;
                garra.agarrado.alSalir = true;
                garra.agarrado.vy = 0;
                garra.agarrado = null;
            }
            if (garra.t > 0.8) garra.fase = "volviendo";
        } else if (garra.fase === "volviendo") {
            garra.abre = Math.min(1, garra.abre + dt * 2);
            garra.x += Math.sign(INICIO_X - garra.x) * vel * dt;
            if (Math.abs(garra.x - INICIO_X) < 3) {
                garra.x = INICIO_X;
                garra.fase = "mover";
                if (!banner) mensaje.textContent = tiros() > 0 ? "Mové la garra y bajala sobre un premio" : mensaje.textContent;
                pintarTiros();
            }
        }
        // El premio agarrado va colgado de la garra
        if (garra.agarrado) {
            garra.agarrado.x = garra.x;
            garra.agarrado.y = garra.y + 24;
        }
        // Premios cayendo (al soltarse o en la salida)
        for (let i = premios.length - 1; i >= 0; i--) {
            const p = premios[i];
            if (!p.cayendo) continue;
            p.vy += 700 * dt;
            p.y += p.vy * dt;
            if (p.alSalir) {
                if (p.y > H + 30) {
                    premios.splice(i, 1);
                    const texto = ganar(p);
                    banner = { texto, id: p.id, t: 0 };
                    mensaje.textContent = `🎉 ¡Ganaste: ${texto}!`;
                    festejo(SALIDA.x + SALIDA.ancho / 2, PISO - 30);
                    sonidos?.nivel?.();
                    // Se repone un premio nuevo en la montaña
                    setTimeout(() => {
                        const p2 = premioAlAzar();
                        const x = 110 + Math.random() * 180;
                        premios.push({ ...p2, x, y: TECHO, piso: PISO - 18 - (Math.random() < 0.5 ? 0 : 26), vy: 0, r: 17, cayendo: true });
                    }, 600);
                }
            } else if (p.y >= p.piso) {
                p.y = p.piso;
                p.vy = -p.vy * 0.3;
                if (Math.abs(p.vy) < 30) {
                    p.vy = 0;
                    p.cayendo = false;
                }
            }
        }
        if (banner) {
            banner.t += dt;
            if (banner.t > 2.4) banner = null;
        }
    }

    function dibujar(t, dt) {
        // Fondo de la máquina
        ctx.clearRect(0, 0, W, H);
        const caja = ctx.createLinearGradient(0, 0, 0, H);
        caja.addColorStop(0, "#2b1d5c");
        caja.addColorStop(1, "#140d33");
        ctx.fillStyle = caja;
        ctx.fillRect(0, 0, W, H);
        // Luces de la marquesina
        for (let k = 0; k < 14; k++) {
            const prendida = Math.floor(t * 6 + k) % 3 === 0;
            ctx.fillStyle = prendida ? "#ffd166" : "#7a5c1d";
            ctx.beginPath();
            ctx.arc(14 + k * 22.5, 14, 4, 0, TAU);
            ctx.fill();
        }
        // Riel de arriba
        ctx.fillStyle = "#adb5bd";
        ctx.fillRect(16, TECHO - 8, W - 32, 6);
        // Salida (agujero) a la izquierda
        ctx.fillStyle = "#0b0720";
        ctx.fillRect(SALIDA.x, PISO - 40, SALIDA.ancho, 60);
        ctx.fillStyle = "#ff4d6d";
        ctx.fillRect(SALIDA.x - 4, PISO - 44, SALIDA.ancho + 8, 6);
        ctx.fillStyle = "#fff";
        ctx.font = "900 10px system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("PREMIO", SALIDA.x + SALIDA.ancho / 2, PISO - 50);
        // Piso
        ctx.fillStyle = "#3d2c7a";
        ctx.fillRect(SALIDA.x + SALIDA.ancho + 4, PISO, W - SALIDA.x - SALIDA.ancho - 4, H - PISO);
        // Premios
        for (const p of premios) if (p !== garra.agarrado) dibujarPremio(ctx, p.id, p.x, p.y, p.r, t);
        // Cable y garra
        ctx.strokeStyle = "#ced4da";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(garra.x, TECHO - 4);
        ctx.lineTo(garra.x, garra.y);
        ctx.stroke();
        ctx.fillStyle = "#6c757d";
        ctx.beginPath();
        ctx.roundRect(garra.x - 12, TECHO - 10, 24, 10, 3);
        ctx.fill();
        if (garra.agarrado) dibujarPremio(ctx, garra.agarrado.id, garra.agarrado.x, garra.agarrado.y, garra.agarrado.r, t);
        ctx.save();
        ctx.translate(garra.x, garra.y);
        const metal = ctx.createLinearGradient(-14, 0, 14, 0);
        metal.addColorStop(0, "#adb5bd");
        metal.addColorStop(0.5, "#f8f9fa");
        metal.addColorStop(1, "#6c757d");
        ctx.fillStyle = metal;
        ctx.beginPath();
        ctx.roundRect(-10, -6, 20, 12, 4);
        ctx.fill();
        ctx.strokeStyle = metal;
        ctx.lineWidth = 4;
        ctx.lineCap = "round";
        for (const lado of [-1, 1]) {
            const a = lado * (0.25 + garra.abre * 0.55);
            ctx.save();
            ctx.rotate(a);
            ctx.beginPath();
            ctx.moveTo(0, 4);
            ctx.lineTo(0, 22);
            ctx.lineTo(-lado * 7, 30);
            ctx.stroke();
            ctx.restore();
        }
        ctx.restore();
        // Vidrio con reflejo
        ctx.fillStyle = "#ffffff10";
        ctx.beginPath();
        ctx.moveTo(30, 30);
        ctx.lineTo(80, 30);
        ctx.lineTo(40, H);
        ctx.lineTo(16, H);
        ctx.fill();
        // Festejo
        for (let i = chispas.length - 1; i >= 0; i--) {
            const c = chispas[i];
            c.vida -= dt * 0.8;
            c.vy += 300 * dt;
            c.x += c.vx * dt;
            c.y += c.vy * dt;
            if (c.vida <= 0) {
                chispas.splice(i, 1);
                continue;
            }
            ctx.globalAlpha = c.vida;
            ctx.fillStyle = c.color;
            ctx.fillRect(c.x, c.y, 5, 7);
        }
        ctx.globalAlpha = 1;
        if (banner) {
            const s = Math.min(1, banner.t * 4);
            ctx.save();
            ctx.translate(W / 2, H / 2 - 30);
            ctx.scale(s, s);
            ctx.fillStyle = "#fff4dcee";
            ctx.strokeStyle = "#4a2e17";
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.roundRect(-120, -48, 240, 96, 16);
            ctx.fill();
            ctx.stroke();
            dibujarPremio(ctx, banner.id, 0, -16, 20, performance.now() / 1000);
            ctx.fillStyle = "#4a2e17";
            ctx.font = "900 14px system-ui, sans-serif";
            ctx.textAlign = "center";
            ctx.fillText(banner.texto, 0, 32, 220);
            ctx.restore();
        }
    }

    // Controles: mantener apretadas las flechas (o las teclas ← → y espacio)
    for (const b of fondo.querySelectorAll(".flecha-garra")) {
        const dir = Number(b.dataset.dir);
        b.addEventListener("pointerdown", (e) => {
            e.preventDefault();
            if (garra.fase === "mover") garra.dir = dir;
        });
        for (const ev of ["pointerup", "pointerleave", "pointercancel"]) b.addEventListener(ev, () => garra.dir === dir && (garra.dir = 0));
    }
    // También se puede arrastrar el dedo sobre la máquina
    lienzo.addEventListener("pointermove", (e) => {
        if (garra.fase !== "mover" || !e.buttons) return;
        const r = lienzo.getBoundingClientRect();
        garra.x = Math.max(36, Math.min(W - 30, ((e.clientX - r.left) / r.width) * W));
    });
    botonBajar.addEventListener("click", bajar);
    const teclas = (e) => {
        if (e.key === "ArrowLeft") garra.dir = e.type === "keydown" ? -1 : 0;
        else if (e.key === "ArrowRight") garra.dir = e.type === "keydown" ? 1 : 0;
        else if ((e.key === " " || e.key === "ArrowDown") && e.type === "keydown") bajar();
        else return;
        e.preventDefault();
    };
    addEventListener("keydown", teclas);
    addEventListener("keyup", teclas);
    const cerrar = () => {
        abierto = false;
        removeEventListener("keydown", teclas);
        removeEventListener("keyup", teclas);
        fondo.remove();
    };
    fondo.querySelector(".salir-garra").addEventListener("click", cerrar);
    pintarTiros();
    requestAnimationFrame(cuadro);
}
