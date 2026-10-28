// Música y sonidos de la granja, hechos con Web Audio (sin archivos). El volumen de cada cosa se guarda.
const CLAVE = "granja-audio";
let ajustes = { musica: 0.5, efectos: 0.7 };
try {
    ajustes = { ...ajustes, ...JSON.parse(localStorage.getItem(CLAVE) || "{}") };
} catch {}

let ctx = null;
let salidaMusica = null;
let salidaEfectos = null;
let ruido = null;

// El audio arranca recién con el primer toque (los navegadores del celular lo exigen)
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
    arrancarMusica();
}
for (const ev of ["pointerdown", "keydown"]) addEventListener(ev, iniciar, { capture: true });
document.addEventListener("visibilitychange", () => {
    if (!ctx) return;
    document.visibilityState === "hidden" ? ctx.suspend() : ctx.resume();
});

function aplicar() {
    if (!ctx) return;
    // Curva al cuadrado: el control se siente parejo
    salidaMusica.gain.setTargetAtTime(ajustes.musica ** 2 * 0.6, ctx.currentTime, 0.1);
    salidaEfectos.gain.setTargetAtTime(ajustes.efectos ** 2, ctx.currentTime, 0.05);
}

export const volumen = () => ({ ...ajustes });
export function cambiarVolumen(tipo, valor) {
    ajustes[tipo] = Math.max(0, Math.min(1, valor));
    try {
        localStorage.setItem(CLAVE, JSON.stringify(ajustes));
    } catch {}
    aplicar();
}

// Una nota suave: tipo de onda, frecuencia, cuándo, cuánto dura, volumen
function nota(salida, { f, t = 0, dur = 0.3, vol = 0.3, onda = "triangle", hasta = null, ataque = 0.01 }) {
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
    o.connect(g).connect(salida);
    o.start(inicio);
    o.stop(inicio + dur + 0.05);
}

function golpeRuido(salida, { t = 0, dur = 0.08, vol = 0.2, filtro = 4000, tipo = "highpass" }) {
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
    s.connect(f).connect(g).connect(salida);
    s.start(inicio, Math.random() * 0.5);
    s.stop(inicio + dur + 0.05);
}

// ---------- Efectos ----------
const E = () => salidaEfectos;
export const sonidos = {
    plantar: () => {
        golpeRuido(E(), { dur: 0.06, vol: 0.25, filtro: 900, tipo: "lowpass" });
        nota(E(), { f: 300, hasta: 520, dur: 0.12, vol: 0.18, onda: "sine" });
    },
    cosechar: () => {
        const base = 660 + Math.random() * 60;
        nota(E(), { f: base, dur: 0.18, vol: 0.22 });
        nota(E(), { f: base * 1.5, t: 0.06, dur: 0.25, vol: 0.18 });
    },
    monedas: () => {
        nota(E(), { f: 1318, dur: 0.12, vol: 0.16, onda: "square" });
        nota(E(), { f: 1760, t: 0.07, dur: 0.3, vol: 0.14, onda: "square" });
    },
    gallina: () => {
        for (let k = 0; k < 3; k++) nota(E(), { f: 900 + k * 80, hasta: 600, t: k * 0.09, dur: 0.07, vol: 0.12, onda: "sawtooth" });
    },
    vaca: () => nota(E(), { f: 170, hasta: 120, dur: 0.6, vol: 0.2, onda: "sawtooth", ataque: 0.12 }),
    oveja: () => {
        for (let k = 0; k < 4; k++) nota(E(), { f: 420 + (k % 2) * 30, t: k * 0.07, dur: 0.09, vol: 0.12, onda: "sawtooth" });
    },
    cerdo: () => {
        nota(E(), { f: 260, hasta: 180, dur: 0.12, vol: 0.18, onda: "sawtooth" });
        nota(E(), { f: 240, hasta: 160, t: 0.15, dur: 0.12, vol: 0.16, onda: "sawtooth" });
    },
    nivel: () => [523, 659, 784, 1046].forEach((f, k) => nota(E(), { f, t: k * 0.1, dur: 0.4, vol: 0.2 })),
    comprar: () => {
        nota(E(), { f: 587, dur: 0.12, vol: 0.18 });
        nota(E(), { f: 880, t: 0.08, dur: 0.22, vol: 0.18 });
    },
    error: () => nota(E(), { f: 220, hasta: 160, dur: 0.18, vol: 0.15, onda: "square" }),
    plop: () => {
        golpeRuido(E(), { dur: 0.09, vol: 0.22, filtro: 500, tipo: "lowpass" });
        nota(E(), { f: 240, hasta: 90, dur: 0.14, vol: 0.2, onda: "sine" });
    },
    toque: () => nota(E(), { f: 900, dur: 0.05, vol: 0.08, onda: "sine" }),
    lluvia: (segundos) => {
        if (!ctx) return;
        const inicio = ctx.currentTime;
        const s = ctx.createBufferSource();
        s.buffer = ruido;
        s.loop = true;
        const f = ctx.createBiquadFilter();
        f.type = "bandpass";
        f.frequency.value = 2500;
        f.Q.value = 0.6;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, inicio);
        g.gain.exponentialRampToValueAtTime(0.22, inicio + 1);
        g.gain.setValueAtTime(0.22, inicio + segundos - 1);
        g.gain.exponentialRampToValueAtTime(0.0001, inicio + segundos);
        s.connect(f).connect(g).connect(E());
        s.start(inicio);
        s.stop(inicio + segundos + 0.1);
        nota(E(), { f: 90, hasta: 50, t: 0.2, dur: 1.4, vol: 0.12, onda: "sine", ataque: 0.3 }); // trueno lejano
    },
};

// ---------- Música: loop tranquilo de granja (acordes suaves, melodía pentatónica y un shaker) ----------
const PULSO = 60 / 84; // 84 por minuto
const ACORDES = [
    [196, 247, 294], // Sol
    [165, 196, 247], // Mi menor
    [131, 165, 196], // Do
    [147, 185, 220], // Re
];
const ESCALA = [392, 440, 494, 587, 659, 784, 880]; // Sol pentatónica
let compas = 0;
let proximo = 0;
let notaAnterior = 3;

function programarCompas(t0) {
    const acorde = ACORDES[compas % ACORDES.length];
    const M = salidaMusica;
    // Bajo y acorde con ataque suave
    nota(M, { f: acorde[0] / 2, t: t0, dur: PULSO * 3.8, vol: 0.18, onda: "sine", ataque: 0.05 });
    acorde.forEach((f, k) => nota(M, { f, t: t0 + k * 0.03, dur: PULSO * 3.6, vol: 0.05, onda: "triangle", ataque: 0.25 }));
    // Melodía: pasos cortos por la escala, con silencios
    for (let paso = 0; paso < 8; paso++) {
        if (Math.random() < 0.38) continue;
        notaAnterior = Math.max(0, Math.min(ESCALA.length - 1, notaAnterior + Math.round((Math.random() - 0.5) * 3)));
        nota(M, { f: ESCALA[notaAnterior], t: t0 + paso * PULSO / 2, dur: PULSO * 0.9, vol: 0.07, onda: "triangle", ataque: 0.008 });
    }
    // Shaker suave en los contratiempos
    for (let k = 0; k < 4; k++) golpeRuido(M, { t: t0 + k * PULSO + PULSO / 2, dur: 0.05, vol: 0.035, filtro: 6000 });
    compas++;
}

function arrancarMusica() {
    proximo = ctx.currentTime + 0.3;
    setInterval(() => {
        if (!ctx || ctx.state !== "running" || ajustes.musica === 0) {
            if (ctx) proximo = Math.max(proximo, ctx.currentTime + 0.1);
            return;
        }
        // Se programa un poquito por adelantado para que no se corte
        while (proximo < ctx.currentTime + 1.5) {
            programarCompas(proximo - ctx.currentTime);
            proximo += PULSO * 4;
        }
    }, 300);
}
