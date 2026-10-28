// Ayudas para juegos 2D en canvas: tamaño nítido en pantallas retina, bucle de animación y partículas.

export function crearLienzo(canvas, alCambiarTamano) {
    const ctx = canvas.getContext("2d");
    const datos = { ctx, ancho: 0, alto: 0 };
    function medir() {
        const caja = canvas.getBoundingClientRect();
        const escala = Math.min(devicePixelRatio, 2);
        canvas.width = Math.round(caja.width * escala);
        canvas.height = Math.round(caja.height * escala);
        ctx.setTransform(escala, 0, 0, escala, 0, 0);
        datos.ancho = caja.width;
        datos.alto = caja.height;
        alCambiarTamano?.(datos);
    }
    new ResizeObserver(medir).observe(canvas);
    medir();
    return datos;
}

// Llama a fn(dt) en cada cuadro; dt en segundos (máximo 0.05 para que no salte si la pestaña se pausó)
export function bucle(fn) {
    let antes = performance.now();
    function cuadro(ahora) {
        const dt = Math.min((ahora - antes) / 1000, 0.05);
        antes = ahora;
        fn(dt);
        requestAnimationFrame(cuadro);
    }
    requestAnimationFrame(cuadro);
}

// Chispas simples: emitir(x, y, color, cantidad) y dibujar(ctx, dt)
export function crearChispas() {
    const lista = [];
    return {
        emitir(x, y, color, cantidad = 10, fuerza = 160) {
            for (let i = 0; i < cantidad; i++) {
                const a = Math.random() * Math.PI * 2;
                const v = fuerza * (0.3 + Math.random() * 0.7);
                lista.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, vida: 0.6 + Math.random() * 0.4, total: 1, color, r: 2 + Math.random() * 3 });
            }
        },
        dibujar(ctx, dt) {
            for (let i = lista.length - 1; i >= 0; i--) {
                const p = lista[i];
                p.vida -= dt;
                if (p.vida <= 0) {
                    lista.splice(i, 1);
                    continue;
                }
                p.vy += 300 * dt;
                p.x += p.vx * dt;
                p.y += p.vy * dt;
                ctx.globalAlpha = Math.max(0, p.vida);
                ctx.fillStyle = p.color;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.r * p.vida, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.globalAlpha = 1;
        },
        limpiar() {
            lista.length = 0;
        },
    };
}
