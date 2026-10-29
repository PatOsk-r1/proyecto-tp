// Sonido compartido de los juegos: música en loop y efectos, hechos con Web Audio (sin archivos).
// El volumen se guarda para todos los juegos juntos. Cada juego elige su música con crearAudio({ musica }).
const CLAVE = "audio-juegos";
let ajustes = { musica: 0.5, efectos: 0.7 };
try {
    ajustes = { ...ajustes, ...JSON.parse(localStorage.getItem(CLAVE) || "{}") };
} catch {}

let ctx = null;
let salidaMusica = null;
let salidaEfectos = null;
let ruido = null;
let musica = null; // estilo de la música del juego actual

function aplicar() {
    if (!ctx) return;
    salidaMusica.gain.setTargetAtTime(ajustes.musica ** 2 * 0.6, ctx.currentTime, 0.1);
    salidaEfectos.gain.setTargetAtTime(ajustes.efectos ** 2, ctx.currentTime, 0.05);
}

// El audio arranca con el primer toque (los celulares lo exigen)
function iniciar() {
    if (ctx) return ctx.state === "suspended" && ctx.resume();
    const Clase = window.AudioContext || window.webkitAudioContext;
    if (!Clase) return;
    ctx = new Clase();
    const comp = ctx.createDynamicsCompressor();
    comp.connect(ctx.destination);
    salidaMusica = ctx.createGain();
    salidaEfectos = ctx.createGain();
    salidaMusica.connect(comp);
    salidaEfectos.connect(comp);
    aplicar();
    const datos = new Float32Array(ctx.sampleRate);
    for (let i = 0; i < datos.length; i++) datos[i] = Math.random() * 2 - 1;
    ruido = ctx.createBuffer(1, datos.length, ctx.sampleRate);
    ruido.copyToChannel(datos, 0);
    if (musica) arrancarMusica();
}
for (const ev of ["pointerdown", "keydown"]) addEventListener(ev, iniciar, { capture: true });
document.addEventListener("visibilitychange", () => {
    if (!ctx) return;
    document.visibilityState === "hidden" ? ctx.suspend() : ctx.resume();
});

export const volumen = () => ({ ...ajustes });
export function cambiarVolumen(tipo, valor) {
    ajustes[tipo] = Math.max(0, Math.min(1, valor));
    try {
        localStorage.setItem(CLAVE, JSON.stringify(ajustes));
    } catch {}
    aplicar();
}

// Nota suave: frecuencia, cuándo, duración, volumen, onda, hacia qué frecuencia se desliza, ataque
export function nota({ f, t = 0, dur = 0.3, vol = 0.3, onda = "triangle", hasta = null, ataque = 0.01, salida = null }) {
    if (!ctx) return;
    const inicio = ctx.currentTime + t;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = onda;
    o.frequency.setValueAtTime(f, inicio);
    if (hasta) o.frequency.exponentialRampToValueAtTime(hasta, inicio + dur);
    g.gain.setValueAtTime(0.0001, inicio);
    g.gain.exponentialRampToValueAtTime(vol, inicio + ataque);
    g.gain.exponentialRampToValueAtTime(0.0001, inicio + dur);
    o.connect(g).connect(salida ?? salidaEfectos);
    o.start(inicio);
    o.stop(inicio + dur + 0.05);
}

// Golpe de ruido filtrado (golpes, shaker, pasos)
export function golpe({ t = 0, dur = 0.08, vol = 0.2, filtro = 4000, tipo = "highpass", salida = null }) {
    if (!ctx) return;
    const inicio = ctx.currentTime + t;
    const s = ctx.createBufferSource();
    s.buffer = ruido;
    const f = ctx.createBiquadFilter();
    f.type = tipo;
    f.frequency.value = filtro;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, inicio);
    g.gain.exponentialRampToValueAtTime(0.0001, inicio + dur);
    s.connect(f).connect(g).connect(salida ?? salidaEfectos);
    s.start(inicio, Math.random() * 0.5);
    s.stop(inicio + dur + 0.05);
}

// Efectos comunes a todos los juegos
export const efectos = {
    toque: () => nota({ f: 900, dur: 0.05, vol: 0.08, onda: "sine" }),
    monedas: () => {
        nota({ f: 1318, dur: 0.12, vol: 0.14, onda: "square" });
        nota({ f: 1760, t: 0.07, dur: 0.3, vol: 0.12, onda: "square" });
    },
    comprar: () => {
        nota({ f: 587, dur: 0.12, vol: 0.18 });
        nota({ f: 880, t: 0.08, dur: 0.22, vol: 0.18 });
    },
    error: () => nota({ f: 220, hasta: 160, dur: 0.18, vol: 0.15, onda: "square" }),
    logro: () => [784, 988, 1175, 1568].forEach((f, k) => nota({ f, t: k * 0.09, dur: 0.45, vol: 0.18 })),
    fanfarria: () => [523, 659, 784, 1046, 784, 1046].forEach((f, k) => nota({ f, t: k * 0.11, dur: 0.35, vol: 0.18, onda: k > 3 ? "square" : "triangle" })),
    abrir: () => nota({ f: 500, hasta: 800, dur: 0.12, vol: 0.1, onda: "sine" }),
};

// ---------- Música en loop ----------
// estilo: { bpm, acordes: [[f, f, f], ...], escala: [f...], onda, melodia: 0..1 (cuánto suena), bateria: true }
let compas = 0;
let proximo = 0;
let notaAnterior = 3;
let reloj = 0;
function programarCompas(t0) {
    const m = musica;
    const pulso = 60 / m.bpm;
    const acorde = m.acordes[compas % m.acordes.length];
    const S = salidaMusica;
    nota({ f: acorde[0] / 2, t: t0, dur: pulso * 3.8, vol: 0.18, onda: "sine", ataque: 0.05, salida: S });
    acorde.forEach((f, k) => nota({ f, t: t0 + k * 0.03, dur: pulso * 3.6, vol: 0.045, onda: m.ondaAcorde ?? "triangle", ataque: 0.25, salida: S }));
    for (let paso = 0; paso < 8; paso++) {
        if (Math.random() > (m.melodia ?? 0.6)) continue;
        notaAnterior = Math.max(0, Math.min(m.escala.length - 1, notaAnterior + Math.round((Math.random() - 0.5) * 3)));
        nota({ f: m.escala[notaAnterior], t: t0 + (paso * pulso) / 2, dur: pulso * 0.85, vol: 0.065, onda: m.onda ?? "triangle", ataque: 0.008, salida: S });
    }
    if (m.bateria) {
        for (let k = 0; k < 4; k++) {
            golpe({ t: t0 + k * pulso, dur: 0.12, vol: k % 2 ? 0.05 : 0.09, filtro: k % 2 ? 2500 : 140, tipo: k % 2 ? "highpass" : "lowpass", salida: S });
            golpe({ t: t0 + k * pulso + pulso / 2, dur: 0.04, vol: 0.03, filtro: 7000, salida: S });
        }
    } else {
        for (let k = 0; k < 4; k++) golpe({ t: t0 + k * pulso + pulso / 2, dur: 0.05, vol: 0.03, filtro: 6000, salida: S });
    }
    compas++;
}
function arrancarMusica() {
    if (reloj || !ctx) return;
    proximo = ctx.currentTime + 0.3;
    reloj = setInterval(() => {
        if (!ctx || ctx.state !== "running" || ajustes.musica === 0) {
            if (ctx) proximo = Math.max(proximo, ctx.currentTime + 0.1);
            return;
        }
        while (proximo < ctx.currentTime + 1.5) {
            programarCompas(proximo - ctx.currentTime);
            proximo += (60 / musica.bpm) * 4;
        }
    }, 300);
}

// Estilos de música listos para usar
export const MUSICAS = {
    aventura: {
        bpm: 104,
        acordes: [[220, 262, 330], [175, 220, 262], [196, 247, 294], [165, 208, 247]],
        escala: [440, 494, 523, 587, 659, 784, 880],
        onda: "square",
        melodia: 0.55,
        bateria: true,
    },
    tranquila: {
        bpm: 84,
        acordes: [[196, 247, 294], [165, 196, 247], [131, 165, 196], [147, 185, 220]],
        escala: [392, 440, 494, 587, 659, 784, 880],
        melodia: 0.6,
    },
    misterio: {
        bpm: 92,
        acordes: [[147, 175, 220], [131, 165, 196], [117, 147, 175], [131, 156, 196]],
        escala: [294, 349, 392, 440, 523, 587, 698],
        onda: "sine",
        melodia: 0.5,
        bateria: true,
    },
};

export function crearAudio({ musica: estilo } = {}) {
    musica = estilo ?? null;
    if (musica && ctx) arrancarMusica();
    return { nota, golpe, efectos, volumen, cambiarVolumen };
}
