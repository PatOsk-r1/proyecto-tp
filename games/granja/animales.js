// Dibujo de los animales del corral con poses para animarlos.
// pose: { cabeza: 0..1 (baja la cabeza a comer), aplastar: -1..1 (se agacha o se estira),
//         cola: 0..1 (levanta la cola), aleteo: 0..1 (gallina), ojos: "abiertos" | "cerrados" | "felices",
//         masticar: 0..1 (mueve la boca) }
const TAU = Math.PI * 2;

function elipse(ctx, x, y, rx, ry, giro = 0) {
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, giro, 0, TAU);
    ctx.fill();
}
// Los degradados se guardan y se reutilizan (crearlos en cada cuadro es lo que más cuesta).
// Sus coordenadas son relativas al animal, así que sirven igual aunque el animal se mueva.
const degradados = new WeakMap();
function degradado(ctx, x, y, r, claro, oscuro) {
    let porCtx = degradados.get(ctx);
    if (!porCtx) degradados.set(ctx, (porCtx = new Map()));
    const clave = `${x.toFixed(1)}|${y.toFixed(1)}|${r.toFixed(1)}|${claro}|${oscuro}`;
    let g = porCtx.get(clave);
    if (!g) {
        if (porCtx.size > 400) porCtx.clear(); // la cabeza al comer cambia de lugar: que no crezca sin fin
        g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.45, r * 0.1, x, y, r * 1.1);
        g.addColorStop(0, claro);
        g.addColorStop(1, oscuro);
        porCtx.set(clave, g);
    }
    return g;
}
function ojo(ctx, x, y, r, estado) {
    if (estado === "cerrados" || estado === "felices") {
        ctx.strokeStyle = "#1b1b1b";
        ctx.lineWidth = Math.max(1.2, r * 0.7);
        ctx.lineCap = "round";
        ctx.beginPath();
        if (estado === "felices") ctx.arc(x, y + r * 0.4, r, Math.PI * 1.15, Math.PI * 1.85);
        else {
            ctx.moveTo(x - r, y);
            ctx.lineTo(x + r, y);
        }
        ctx.stroke();
        return;
    }
    ctx.fillStyle = "#1b1b1b";
    elipse(ctx, x, y, r, r * 1.15);
    ctx.fillStyle = "#fff";
    elipse(ctx, x + r * 0.35, y - r * 0.4, r * 0.38, r * 0.38);
}

export function dibujarAnimal(ctx, tipo, x, y, tam, fase, mira = 1, pose = {}) {
    const { cabeza = 0, aplastar = 0, cola = 0, aleteo = 0, masticar = 0 } = pose;
    // Parpadeo propio de cada animal
    const ojos = pose.ojos ?? ((performance.now() / 1000 + x * 0.013) % 3.7 < 0.12 ? "cerrados" : "abiertos");
    const caminando = Math.abs(Math.sin(fase * 4));
    const salto = tipo === "gallina" ? caminando * 2.5 : caminando * 1.2;
    const pie = tam * 0.45;
    ctx.save();
    ctx.translate(x, y);
    // Sombra (no se aplasta)
    ctx.fillStyle = "#0000002e";
    elipse(ctx, 0, pie, tam * 0.42 * (1 - salto * 0.02), tam * 0.1);
    ctx.scale(mira, 1);
    // Aplastarse / estirarse desde los pies
    ctx.translate(0, pie);
    ctx.scale(1 + aplastar * 0.1, 1 - aplastar * 0.16);
    ctx.translate(0, -pie - salto);
    const paso = Math.sin(fase * 4);

    if (tipo === "gallina") {
        const s = tam;
        // Patas
        ctx.strokeStyle = "#f4a261";
        ctx.lineWidth = Math.max(1.5, s * 0.04);
        ctx.lineCap = "round";
        for (const [dx, f] of [[-0.07, paso], [0.07, -paso]]) {
            ctx.beginPath();
            ctx.moveTo(dx * s, s * 0.2);
            ctx.lineTo(dx * s + f * s * 0.05, s * 0.42);
            ctx.lineTo(dx * s + f * s * 0.05 + s * 0.06, s * 0.43);
            ctx.stroke();
        }
        // Cola de plumas
        ctx.save();
        ctx.translate(-s * 0.26, -s * 0.06);
        ctx.rotate(-0.3 - cola * 0.5);
        ctx.fillStyle = "#e9e3d5";
        for (const [r, l] of [[-0.35, 0.2], [0, 0.24], [0.35, 0.19]]) {
            ctx.save();
            ctx.rotate(r);
            elipse(ctx, -s * l * 0.5, 0, s * l * 0.5, s * 0.06);
            ctx.restore();
        }
        ctx.restore();
        // Cuerpo
        ctx.fillStyle = degradado(ctx, 0, 0, s * 0.3, "#ffffff", "#e6dccb");
        elipse(ctx, 0, 0.02 * s, s * 0.3, s * 0.24);
        // Ala (aletea)
        ctx.save();
        ctx.translate(-s * 0.02, -s * 0.02);
        ctx.rotate(-aleteo * 0.9 * Math.abs(Math.sin(performance.now() / 70)));
        ctx.fillStyle = "#efe7d8";
        elipse(ctx, -s * 0.04, s * 0.03, s * 0.17, s * 0.11, 0.2);
        ctx.strokeStyle = "#d6cbb5";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(-s * 0.04, s * 0.03, s * 0.1, 0.2, 2.4);
        ctx.stroke();
        ctx.restore();
        // Cabeza: baja a picotear
        const hx = s * (0.2 + cabeza * 0.12);
        const hy = -s * 0.24 + cabeza * s * 0.42;
        ctx.fillStyle = "#fff";
        elipse(ctx, s * 0.12 + cabeza * s * 0.06, -s * 0.1 + cabeza * s * 0.15, s * 0.1, s * 0.14, 0.4 + cabeza * 0.6);
        ctx.fillStyle = degradado(ctx, hx, hy, s * 0.14, "#ffffff", "#ece4d4");
        elipse(ctx, hx, hy, s * 0.13, s * 0.13);
        ctx.fillStyle = "#e63946";
        for (const [dx, dy, r] of [[-0.04, -0.13, 0.045], [0.01, -0.15, 0.05], [0.06, -0.13, 0.04]]) elipse(ctx, hx + dx * s, hy + dy * s, r * s, r * s);
        elipse(ctx, hx + s * 0.1, hy + s * 0.07 + masticar * 1.5, s * 0.03, s * 0.05);
        ctx.fillStyle = "#ffb703";
        ctx.beginPath();
        ctx.moveTo(hx + s * 0.1, hy - s * 0.03);
        ctx.lineTo(hx + s * 0.22, hy + masticar * s * 0.02);
        ctx.lineTo(hx + s * 0.1, hy + s * 0.04);
        ctx.fill();
        ojo(ctx, hx + s * 0.04, hy - s * 0.02, s * 0.028, ojos);
    } else {
        const s = tam;
        const colores = {
            vaca: { cuerpo: ["#ffffff", "#e3e3e3"], patas: "#f2f2f2", pezunas: "#3a3a3a", cara: ["#ffffff", "#e6e6e6"] },
            oveja: { cuerpo: ["#ffffff", "#e8e4dc"], patas: "#3a3a3a", pezunas: "#1b1b1b", cara: ["#5a5a5a", "#2f2f2f"] },
            cerdo: { cuerpo: ["#ffc8dd", "#f497b6"], patas: "#f7a6c1", pezunas: "#c46b8a", cara: ["#ffd1e1", "#f4a2bf"] },
        }[tipo];
        // Patas (se mueven al caminar)
        for (const [dx, f] of [[-0.25, paso], [-0.12, -paso], [0.12, -paso], [0.25, paso]]) {
            const px = dx * s + f * s * 0.04;
            ctx.fillStyle = colores.patas;
            ctx.beginPath();
            ctx.roundRect(px - s * 0.04, s * 0.1, s * 0.08, s * 0.3, s * 0.03);
            ctx.fill();
            ctx.fillStyle = colores.pezunas;
            ctx.fillRect(px - s * 0.04, s * 0.37, s * 0.08, s * 0.06);
        }
        // Cola
        ctx.save();
        ctx.translate(-s * 0.37, -s * 0.06);
        ctx.rotate(0.9 - cola * 1.6 + Math.sin(performance.now() / 300 + x) * 0.15);
        ctx.strokeStyle = tipo === "cerdo" ? "#f497b6" : tipo === "oveja" ? "#f1ece2" : "#e0e0e0";
        ctx.lineWidth = Math.max(1.5, s * 0.04);
        ctx.lineCap = "round";
        ctx.beginPath();
        if (tipo === "cerdo") {
            ctx.moveTo(0, 0);
            ctx.bezierCurveTo(-s * 0.12, -s * 0.02, -s * 0.06, s * 0.1, -s * 0.12, s * 0.08);
        } else {
            ctx.moveTo(0, 0);
            ctx.quadraticCurveTo(-s * 0.04, s * 0.14, -s * 0.02, s * 0.24);
        }
        ctx.stroke();
        if (tipo === "vaca") {
            ctx.fillStyle = "#3a3a3a";
            elipse(ctx, -s * 0.02, s * 0.26, s * 0.03, s * 0.05);
        }
        ctx.restore();
        // Cuerpo
        if (tipo === "oveja") {
            ctx.fillStyle = degradado(ctx, 0, -s * 0.02, s * 0.36, colores.cuerpo[0], colores.cuerpo[1]);
            for (const [dx, dy, r] of [[-0.22, 0.02, 0.15], [-0.08, -0.1, 0.16], [0.08, -0.1, 0.16], [0.22, 0, 0.15], [-0.12, 0.09, 0.15], [0.1, 0.09, 0.15], [0, 0, 0.17]]) {
                elipse(ctx, dx * s, dy * s, r * s, r * s);
            }
        } else {
            ctx.fillStyle = degradado(ctx, 0, 0, s * 0.4, colores.cuerpo[0], colores.cuerpo[1]);
            elipse(ctx, 0, 0, s * 0.39, s * 0.25);
            if (tipo === "vaca") {
                ctx.fillStyle = "#2b2b2b";
                elipse(ctx, -s * 0.14, -s * 0.07, s * 0.11, s * 0.09, 0.4);
                elipse(ctx, s * 0.1, s * 0.06, s * 0.08, s * 0.06, -0.2);
                elipse(ctx, -s * 0.28, s * 0.06, s * 0.05, s * 0.05);
                // Ubre
                ctx.fillStyle = "#ffafcc";
                elipse(ctx, -s * 0.05, s * 0.22, s * 0.08, s * 0.05);
            }
        }
        // Cuello y cabeza (baja a comer)
        const hx = s * (0.38 + cabeza * 0.08);
        const hy = -s * 0.12 + cabeza * s * 0.3;
        ctx.save();
        ctx.translate(hx, hy);
        ctx.rotate(cabeza * 0.55);
        if (tipo !== "oveja") {
            ctx.fillStyle = colores.cuerpo[1];
            elipse(ctx, -s * 0.1, s * 0.04, s * 0.1, s * 0.11);
        }
        // Orejas
        ctx.fillStyle = tipo === "oveja" ? "#3a3a3a" : colores.cara[1];
        elipse(ctx, -s * 0.06, -s * 0.11, s * 0.07, s * 0.035, -0.6 + Math.sin(performance.now() / 500 + x) * 0.15);
        if (tipo === "vaca") {
            // Cuernitos
            ctx.fillStyle = "#e9d8a6";
            elipse(ctx, s * 0.01, -s * 0.14, s * 0.025, s * 0.05, 0.3);
        }
        ctx.fillStyle = degradado(ctx, 0, 0, s * 0.15, colores.cara[0], colores.cara[1]);
        elipse(ctx, 0, 0, s * 0.15, s * 0.13);
        if (tipo === "oveja") {
            ctx.fillStyle = "#ffffff";
            for (const dx of [-0.07, 0, 0.06]) elipse(ctx, dx * s, -s * 0.11, s * 0.06, s * 0.05);
        }
        // Hocico / nariz
        const boca = masticar * s * 0.02;
        if (tipo === "vaca") {
            ctx.fillStyle = "#ffb3c6";
            elipse(ctx, s * 0.1, s * 0.04 + boca, s * 0.075, s * 0.06);
            ctx.fillStyle = "#c9184a88";
            elipse(ctx, s * 0.08, s * 0.03 + boca, s * 0.012, s * 0.016);
            elipse(ctx, s * 0.13, s * 0.03 + boca, s * 0.012, s * 0.016);
        } else if (tipo === "cerdo") {
            ctx.fillStyle = "#ff8fab";
            elipse(ctx, s * 0.13, s * 0.02 + boca, s * 0.05, s * 0.06);
            ctx.fillStyle = "#c9184a";
            elipse(ctx, s * 0.13, s * 0.0 + boca, s * 0.012, s * 0.018);
            elipse(ctx, s * 0.13, s * 0.04 + boca, s * 0.012, s * 0.018);
        } else {
            ctx.fillStyle = "#1b1b1b";
            elipse(ctx, s * 0.12, s * 0.04 + boca, s * 0.02, s * 0.015);
        }
        ojo(ctx, s * 0.03, -s * 0.03, s * 0.025, ojos);
        ctx.restore();
    }
    ctx.restore();
}
