// Ayudas para juegos 2D en canvas: tamaño nítido en pantallas retina, bucle de animación y partículas.

// Safari anterior a iOS 16 no tiene roundRect: versión simple con un solo radio
if (typeof CanvasRenderingContext2D !== "undefined" && !CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r = 0) {
        let radio = Array.isArray(r) ? r[0] ?? 0 : r;
        radio = Math.max(0, Math.min(radio, Math.abs(w) / 2, Math.abs(h) / 2));
        this.moveTo(x + radio, y);
        this.arcTo(x + w, y, x + w, y + h, radio);
        this.arcTo(x + w, y + h, x, y + h, radio);
        this.arcTo(x, y + h, x, y, radio);
        this.arcTo(x, y, x + w, y, radio);
        this.closePath();
    };
}

// maxEscala: resolución máxima (menos = más rápido en pantallas retina)
export function crearLienzo(canvas, alCambiarTamano, maxEscala = 2) {
    const ctx = canvas.getContext("2d");
    const datos = { ctx, ancho: 0, alto: 0, escala: 1 };
    // Para bajar o subir la resolución en marcha (calidad automática según el teléfono)
    datos.cambiarEscala = (nueva) => {
        maxEscala = nueva;
        medir();
    };
    function medir() {
        const caja = canvas.getBoundingClientRect();
        const escala = Math.min(devicePixelRatio, maxEscala);
        datos.escala = escala;
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
