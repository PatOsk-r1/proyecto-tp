// Los clientes de la granja: cómo se ven (dibujados en canvas) y cómo piden las cosas.
const TAU = Math.PI * 2;

// piel, pelo, ropa, gorro, anteojos, bigote… y cómo saluda cada uno
export const PERSONAS = {
    "Don Tito": { piel: "#e8b894", pelo: "#d9d9d9", peinado: "pelado", ropa: "#3a6ea5", detalle: "#c1121f", gorro: "gorra", bigote: true, saludo: "¡Hola, granjero!" },
    "Doña Rosa": { piel: "#f1c7a3", pelo: "#bdbdbd", peinado: "rodete", ropa: "#e5989b", detalle: "#fff", aros: true, saludo: "¡Buen día, querido!" },
    "El panadero": { piel: "#d9a066", pelo: "#5c3a1e", peinado: "corto", ropa: "#ffffff", detalle: "#e9c46a", gorro: "chef", bigote: true, mejillas: true, saludo: "¡Buenas! Para el pan de mañana," },
    "La escuela": { piel: "#c68b59", pelo: "#2b1a0e", peinado: "largo", ropa: "#6a994e", detalle: "#f2e8cf", anteojos: true, saludo: "¡Hola! Para el comedor de la escuela," },
    "El restaurante": { piel: "#f3d1b0", pelo: "#1b1b1b", peinado: "corto", ropa: "#f8f9fa", detalle: "#d62828", gorro: "chef", bigote: "grande", saludo: "¡Buenas! Para la cocina del restaurante," },
    "La feria": { piel: "#e0ac69", pelo: "#ff8c42", peinado: "largo", ropa: "#7b2cbf", detalle: "#ffd166", gorro: "rayas", mejillas: true, saludo: "¡Hola, hola! Para mi puesto de la feria," },
    "Abuela Marta": { piel: "#f6d5b8", pelo: "#f1f1f1", peinado: "rulos", ropa: "#9d4edd", detalle: "#e0aaff", anteojos: true, chal: true, saludo: "¡Hola, tesoro!" },
};
const POR_DEFECTO = { piel: "#e8b894", pelo: "#5c3a1e", peinado: "corto", ropa: "#2a9d8f", detalle: "#fff", saludo: "¡Hola!" };
export const persona = (quien) => PERSONAS[quien] ?? POR_DEFECTO;

// Cómo se nombra cada cosa según la cantidad
const NOMBRES = {
    trigo: (n) => `${n} de trigo`,
    zanahoria: (n) => `${n} zanahoria${n > 1 ? "s" : ""}`,
    maiz: (n) => `${n} choclo${n > 1 ? "s" : ""}`,
    tomate: (n) => `${n} tomate${n > 1 ? "s" : ""}`,
    calabaza: (n) => `${n} calabaza${n > 1 ? "s" : ""}`,
    frutilla: (n) => `${n} frutilla${n > 1 ? "s" : ""}`,
    uva: (n) => `${n} racimo${n > 1 ? "s" : ""} de uva`,
    huevo: (n) => `${n} huevo${n > 1 ? "s" : ""}`,
    leche: (n) => `${n} botella${n > 1 ? "s" : ""} de leche`,
    lana: (n) => `${n} ovillo${n > 1 ? "s" : ""} de lana`,
    trufa: (n) => `${n} trufa${n > 1 ? "s" : ""}`,
};
const lista = (partes) => (partes.length > 1 ? `${partes.slice(0, -1).join(", ")} y ${partes.at(-1)}` : partes[0]);

// "¡Hola, granjero! ¿Me vendés 3 de trigo y 2 huevos? Te pago 218 monedas."
export function frase(pedido, formatear) {
    const p = persona(pedido.quien);
    const cosas = lista(Object.entries(pedido.items).map(([id, n]) => (NOMBRES[id] ?? ((k) => `${k} ${id}`))(n)));
    const pregunta = p.saludo.endsWith(",") ? `${p.saludo} ¿me vendés ${cosas}?` : `${p.saludo} ¿Me vendés ${cosas}?`;
    return `${pregunta} Te pago ${formatear(pedido.premio)} monedas.`;
}
export const GRACIAS = ["¡Muchas gracias, granjero!", "¡Gracias! Está todo fresquito.", "¡Qué lindo todo! Gracias.", "¡Perfecto, hasta la próxima!"];

// Dibuja a la persona de medio cuerpo. habla: abre y cierra la boca; t: tiempo para parpadear y respirar
export function dibujarPersona(ctx, quien, w, h, t, habla) {
    const p = persona(quien);
    ctx.clearRect(0, 0, w, h);
    const s = Math.min(w / 100, h / 130);
    ctx.save();
    ctx.translate(w / 2, h - 2);
    ctx.scale(s, s);
    ctx.translate(0, Math.sin(t * 1.6) * 0.8); // respira

    // Cuerpo
    const ropa = ctx.createLinearGradient(-40, -55, 40, 0);
    ropa.addColorStop(0, p.ropa);
    ropa.addColorStop(1, oscurecer(p.ropa, 0.25));
    ctx.fillStyle = ropa;
    ctx.beginPath();
    ctx.moveTo(-42, 0);
    ctx.quadraticCurveTo(-42, -48, 0, -52);
    ctx.quadraticCurveTo(42, -48, 42, 0);
    ctx.fill();
    if (p.chal) {
        ctx.fillStyle = p.detalle;
        ctx.beginPath();
        ctx.moveTo(-36, -30);
        ctx.quadraticCurveTo(0, -10, 36, -30);
        ctx.lineTo(30, -46);
        ctx.quadraticCurveTo(0, -36, -30, -46);
        ctx.fill();
    } else if (p.gorro === "chef" || p.ropa === "#ffffff") {
        // Delantal / chaqueta con botones
        ctx.fillStyle = p.detalle;
        for (const y of [-38, -26, -14]) {
            ctx.beginPath();
            ctx.arc(0, y, 2.4, 0, TAU);
            ctx.fill();
        }
        ctx.fillStyle = p.detalle;
        ctx.beginPath();
        ctx.moveTo(-14, -52);
        ctx.lineTo(0, -42);
        ctx.lineTo(14, -52);
        ctx.lineTo(10, -54);
        ctx.lineTo(-10, -54);
        ctx.fill();
    } else {
        // Cuello / tiradores
        ctx.fillStyle = p.detalle;
        ctx.fillRect(-20, -48, 5, 48);
        ctx.fillRect(15, -48, 5, 48);
    }
    // Cuello
    ctx.fillStyle = oscurecer(p.piel, 0.12);
    ctx.fillRect(-7, -60, 14, 10);

    // Pelo de atrás (largo o rodete)
    ctx.fillStyle = p.pelo;
    if (p.peinado === "largo") {
        // Pelo largo: atrás de la cabeza y cayendo a los costados (sin tapar la cara)
        ctx.beginPath();
        ctx.ellipse(0, -88, 27, 26, 0, 0, TAU);
        ctx.fill();
        ctx.beginPath();
        ctx.roundRect(-28, -90, 11, 38, 5);
        ctx.roundRect(17, -90, 11, 38, 5);
        ctx.fill();
    } else if (p.peinado === "rodete") {
        ctx.beginPath();
        ctx.arc(0, -112, 10, 0, TAU);
        ctx.fill();
    }

    // Cabeza
    const cara = ctx.createRadialGradient(-6, -90, 4, 0, -84, 28);
    cara.addColorStop(0, aclarar(p.piel, 0.12));
    cara.addColorStop(1, p.piel);
    ctx.fillStyle = cara;
    ctx.beginPath();
    ctx.ellipse(0, -84, 22, 25, 0, 0, TAU);
    ctx.fill();
    // Orejas
    ctx.fillStyle = p.piel;
    for (const lado of [-1, 1]) {
        ctx.beginPath();
        ctx.ellipse(lado * 22, -82, 4, 6, 0, 0, TAU);
        ctx.fill();
    }
    if (p.aros) {
        ctx.fillStyle = "#ffd166";
        for (const lado of [-1, 1]) {
            ctx.beginPath();
            ctx.arc(lado * 23, -74, 2.2, 0, TAU);
            ctx.fill();
        }
    }

    // Pelo de arriba
    ctx.fillStyle = p.pelo;
    if (p.peinado === "pelado") {
        for (const lado of [-1, 1]) {
            ctx.beginPath();
            ctx.ellipse(lado * 19, -90, 5, 9, lado * 0.3, 0, TAU);
            ctx.fill();
        }
    } else if (p.peinado === "rulos") {
        for (let k = 0; k < 9; k++) {
            const a = Math.PI + (k / 8) * Math.PI;
            ctx.beginPath();
            ctx.arc(Math.cos(a) * 21, -88 + Math.sin(a) * 23, 7, 0, TAU);
            ctx.fill();
        }
    } else {
        ctx.beginPath();
        ctx.ellipse(0, -100, 23, 13, 0, Math.PI, TAU);
        ctx.fill();
        if (p.peinado === "largo" || p.peinado === "rodete") {
            ctx.beginPath();
            ctx.moveTo(-23, -96);
            ctx.quadraticCurveTo(-8, -110, 12, -100);
            ctx.quadraticCurveTo(-4, -96, -23, -88);
            ctx.fill();
        }
    }

    // Ojos (parpadean de vez en cuando)
    const parpadeo = (t % 4.2) < 0.13;
    ctx.fillStyle = "#2b1a0e";
    for (const lado of [-1, 1]) {
        ctx.beginPath();
        if (parpadeo) ctx.fillRect(lado * 8 - 3.5, -86, 7, 1.6);
        else ctx.ellipse(lado * 8, -86, 2.8, 3.4, 0, 0, TAU);
        ctx.fill();
    }
    if (!parpadeo) {
        ctx.fillStyle = "#fff";
        for (const lado of [-1, 1]) {
            ctx.beginPath();
            ctx.arc(lado * 8 + 1, -87.5, 1, 0, TAU);
            ctx.fill();
        }
    }
    // Cejas
    ctx.strokeStyle = oscurecer(p.pelo === "#f1f1f1" || p.pelo === "#d9d9d9" || p.pelo === "#bdbdbd" ? "#9e9e9e" : p.pelo, 0.1);
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    for (const lado of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(lado * 4.5, -93 - (habla ? 1 : 0));
        ctx.lineTo(lado * 11.5, -92.5);
        ctx.stroke();
    }
    if (p.anteojos) {
        ctx.strokeStyle = "#3d2512";
        ctx.lineWidth = 1.6;
        for (const lado of [-1, 1]) {
            ctx.beginPath();
            ctx.arc(lado * 8, -86, 6, 0, TAU);
            ctx.stroke();
        }
        ctx.beginPath();
        ctx.moveTo(-2, -86);
        ctx.lineTo(2, -86);
        ctx.stroke();
    }
    // Nariz y mejillas
    ctx.fillStyle = oscurecer(p.piel, 0.15);
    ctx.beginPath();
    ctx.ellipse(0, -79, 3, 4, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "#ff8fa355";
    for (const lado of [-1, 1]) {
        ctx.beginPath();
        ctx.arc(lado * 13, -76, p.mejillas ? 5 : 3.5, 0, TAU);
        ctx.fill();
    }
    // Boca: se mueve mientras habla
    const abierta = habla ? 1.5 + Math.abs(Math.sin(t * 18)) * 3.5 : 0;
    ctx.fillStyle = "#7a2e2e";
    ctx.beginPath();
    if (abierta) ctx.ellipse(0, -70, 5, abierta, 0, 0, TAU);
    else {
        ctx.strokeStyle = "#7a2e2e";
        ctx.lineWidth = 2;
        ctx.arc(0, -73, 6, 0.2 * Math.PI, 0.8 * Math.PI);
        ctx.stroke();
    }
    if (abierta) ctx.fill();
    if (p.bigote) {
        ctx.fillStyle = p.bigote === "grande" ? "#1b1b1b" : p.pelo === "#5c3a1e" ? "#5c3a1e" : "#bdbdbd";
        const ancho = p.bigote === "grande" ? 13 : 9;
        for (const lado of [-1, 1]) {
            ctx.beginPath();
            ctx.ellipse(lado * ancho * 0.5, -74.5, ancho * 0.6, 3, lado * -0.25, 0, TAU);
            ctx.fill();
        }
    }

    // Gorros
    if (p.gorro === "gorra") {
        ctx.fillStyle = p.detalle;
        ctx.beginPath();
        ctx.ellipse(0, -101, 23, 12, 0, Math.PI, TAU);
        ctx.fill();
        ctx.fillRect(-23, -102, 46, 4);
        ctx.beginPath();
        ctx.ellipse(14, -99, 16, 4, 0.08, 0, TAU);
        ctx.fill();
    } else if (p.gorro === "chef") {
        ctx.fillStyle = "#fff";
        ctx.strokeStyle = "#ddd";
        ctx.lineWidth = 1;
        ctx.fillRect(-18, -112, 36, 12);
        for (const [dx, r] of [[-12, 11], [0, 14], [12, 11]]) {
            ctx.beginPath();
            ctx.arc(dx, -118, r, 0, TAU);
            ctx.fill();
        }
    } else if (p.gorro === "rayas") {
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(-22, -100);
        ctx.lineTo(0, -132);
        ctx.lineTo(22, -100);
        ctx.closePath();
        ctx.clip();
        for (let k = 0; k < 8; k++) {
            ctx.fillStyle = k % 2 ? "#ffd166" : "#e63946";
            ctx.fillRect(-24, -132 + k * 4.5, 48, 4.5);
        }
        ctx.restore();
        ctx.fillStyle = "#fff";
        ctx.beginPath();
        ctx.arc(0, -133, 4, 0, TAU);
        ctx.fill();
    }
    ctx.restore();
}

function ajustar(hex, f) {
    const c = hex.match(/\w\w/g).map((x) => parseInt(x, 16));
    return `rgb(${c.map((v) => Math.round(f < 0 ? v * (1 + f) : v + (255 - v) * f)).join(",")})`;
}
const oscurecer = (hex, k) => ajustar(hex, -k);
const aclarar = (hex, k) => ajustar(hex, k);
