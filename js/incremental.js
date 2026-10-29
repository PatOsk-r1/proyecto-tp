// Base común de los juegos incrementales: logros, regalo diario con racha, resumen al volver,
// menú de ajustes (volumen, cuadros por segundo, versión) y medidor de rendimiento.
// Uso: const base = crearBase({ juego, barra, logros, regaloDiario, audio });
import { cambiarFichas } from "./fichas.js";

const CSS = `
.boton-base { flex-shrink: 0; width: 38px; height: 38px; display: flex; align-items: center; justify-content: center; font-size: 1.15rem; border-radius: 50%; border: 2px solid #ffffff33; background: #0005; color: #fff; position: relative; }
.boton-base b { position: absolute; top: -5px; right: -5px; min-width: 18px; height: 18px; padding: 0 4px; border-radius: 999px; background: #ff4d6d; color: #fff; font: 900 0.68rem system-ui, sans-serif; display: flex; align-items: center; justify-content: center; }
.fondo-base { position: fixed; inset: 0; z-index: 70; display: flex; align-items: center; justify-content: center; padding: 14px; background: #000b; animation: aparecer-base 0.2s ease-out; }
@keyframes aparecer-base { from { opacity: 0; } }
.caja-base { width: min(400px, 100%); max-height: 88vh; overflow-y: auto; display: flex; flex-direction: column; gap: 12px; padding: 18px; border-radius: 20px; background: linear-gradient(180deg, #2a2160, #17123a); color: #fff; border: 2px solid #ffd16655; box-shadow: 0 20px 50px #000c; font-family: system-ui, sans-serif; animation: subir-base 0.25s cubic-bezier(0.2, 1.3, 0.4, 1); }
@keyframes subir-base { from { transform: translateY(30px) scale(0.95); opacity: 0; } }
.caja-base h2 { margin: 0; text-align: center; font-size: 1.25rem; }
.caja-base p { margin: 0; text-align: center; opacity: 0.85; font-size: 0.9rem; }
.boton-base-grande { font: 900 1rem system-ui, sans-serif; padding: 12px; border-radius: 14px; border: none; color: #2a1400; background: linear-gradient(180deg, #ffe066, #f4a261); box-shadow: 0 4px 0 #a8661b; }
.boton-base-grande:active { transform: translateY(3px); box-shadow: 0 1px 0 #a8661b; }
.boton-base-grande:disabled { opacity: 0.5; }
.boton-base-gris { font: 800 0.9rem system-ui, sans-serif; padding: 10px; border-radius: 12px; border: none; background: #ffffff18; color: #fff; }
.dias-base { display: grid; grid-template-columns: repeat(7, 1fr); gap: 5px; }
.dia-base { display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 8px 2px; border-radius: 12px; background: #ffffff10; border: 2px solid transparent; font-size: 0.68rem; font-weight: 800; }
.dia-base span { font-size: 1.3rem; }
.dia-base.hecho { opacity: 0.5; }
.dia-base.hoy { border-color: #ffd166; background: #ffd16622; animation: latir-base 1.2s infinite; }
@keyframes latir-base { 50% { transform: scale(1.06); } }
.lineas-base { display: flex; flex-direction: column; gap: 6px; }
.linea-base { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 12px; background: #ffffff10; font-weight: 800; }
.linea-base span { font-size: 1.5rem; }
.linea-base b { margin-left: auto; color: #ffd166; }
.logro-base { display: flex; align-items: center; gap: 10px; padding: 10px; border-radius: 12px; background: #ffffff0c; }
.logro-base .ico { width: 40px; height: 40px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; font-size: 1.4rem; border-radius: 50%; background: #ffffff14; filter: grayscale(1); opacity: 0.6; }
.logro-base.hecho .ico { filter: none; opacity: 1; background: linear-gradient(135deg, #ffd166, #f4a261); }
.logro-base .txt { flex: 1; min-width: 0; font-weight: 800; font-size: 0.9rem; }
.logro-base .txt small { display: block; font-weight: 600; opacity: 0.7; font-size: 0.75rem; }
.logro-base .barra { height: 5px; border-radius: 3px; background: #ffffff1a; margin-top: 5px; overflow: hidden; }
.logro-base .barra i { display: block; height: 100%; background: linear-gradient(90deg, #7ee0ff, #b388ff); }
.logro-base .premio { font-size: 0.75rem; font-weight: 900; color: #ffd166; white-space: nowrap; }
.aviso-logro { position: fixed; left: 50%; top: calc(14px + env(safe-area-inset-top)); z-index: 80; transform: translateX(-50%); display: flex; align-items: center; gap: 10px; padding: 10px 16px; border-radius: 16px; background: linear-gradient(135deg, #2a2160, #3a0ca3); color: #fff; border: 2px solid #ffd166; box-shadow: 0 10px 30px #000a; font: 800 0.9rem system-ui, sans-serif; animation: bajar-logro 3.6s ease forwards; pointer-events: none; max-width: 92vw; }
.aviso-logro span { font-size: 1.7rem; }
.aviso-logro small { display: block; color: #ffd166; font-size: 0.75rem; }
@keyframes bajar-logro { 0% { transform: translate(-50%, -120%); } 10%, 85% { transform: translate(-50%, 0); } 100% { transform: translate(-50%, -140%); } }
.control-base { display: grid; grid-template-columns: 96px 1fr 44px; align-items: center; gap: 10px; font-weight: 800; font-size: 0.92rem; }
.control-base input[type=range] { width: 100%; accent-color: #ffd166; }
.control-base b { text-align: right; font-size: 0.85rem; }
.casilla-base { display: flex; align-items: center; gap: 8px; font-weight: 800; font-size: 0.88rem; }
.casilla-base input { width: 20px; height: 20px; accent-color: #ffd166; }
.version-base { text-align: center; font-size: 0.72rem; opacity: 0.6; }
.medidor-base { position: fixed; left: 50%; transform: translateX(-50%); bottom: calc(6px + env(safe-area-inset-bottom)); z-index: 60; white-space: nowrap; padding: 3px 7px; border-radius: 8px; background: #000b; font: 800 0.68rem ui-monospace, monospace; pointer-events: none; }
.medidor-base.bien { color: #8fff8f; } .medidor-base.justo { color: #ffd166; } .medidor-base.mal { color: #ff8a8a; }
`;

function ponerCss() {
    if (document.getElementById("css-base")) return;
    const s = document.createElement("style");
    s.id = "css-base";
    s.textContent = CSS;
    document.head.appendChild(s);
}

function leer(clave, porDefecto) {
    try {
        return JSON.parse(localStorage.getItem(clave)) ?? porDefecto;
    } catch {
        return porDefecto;
    }
}
function escribir(clave, valor) {
    try {
        localStorage.setItem(clave, JSON.stringify(valor));
    } catch {}
}
const hoy = () => new Date().toLocaleDateString("sv");
const ayer = () => new Date(Date.now() - 86400000).toLocaleDateString("sv");
const formato = (n) => (n >= 1e6 ? `${+(n / 1e6).toFixed(2)}M` : n >= 1e3 ? `${+(n / 1e3).toFixed(1)}K` : String(Math.floor(n)));

function ventana(html, alCerrar) {
    ponerCss();
    const fondo = document.createElement("div");
    fondo.className = "fondo-base";
    fondo.innerHTML = `<div class="caja-base">${html}</div>`;
    const cerrar = () => {
        fondo.remove();
        alCerrar?.();
    };
    fondo.addEventListener("click", (e) => e.target === fondo && cerrar());
    document.body.appendChild(fondo);
    return { fondo, cerrar };
}

// logros: [{ id, icono, nombre, detalle, meta, valor: () => número, fichas }]
// regaloDiario(dia 1..7) → { icono, texto, dar() }
// audio: lo que devuelve crearAudio (para los sonidos de logros y menús)
// ajustes: false si el juego ya tiene su propio menú de ajustes (solo agrega el botón de logros)
export function crearBase({ juego, barra, logros = [], regaloDiario = null, audio = null, ajustes = true }) {
    ponerCss();
    const claveLogros = `${juego}-logros`;
    const claveDiario = `${juego}-diario`;
    const hechos = new Set(leer(claveLogros, []));
    const sonar = (n) => audio?.efectos?.[n]?.();

    // ---------- Botones en la barra de arriba ----------
    const botonLogros = document.createElement("button");
    botonLogros.type = "button";
    botonLogros.className = "boton-base";
    botonLogros.setAttribute("aria-label", "Logros");
    botonLogros.innerHTML = "🏆";
    const botonAjustes = document.createElement("button");
    botonAjustes.type = "button";
    botonAjustes.className = "boton-base";
    botonAjustes.setAttribute("aria-label", "Ajustes");
    botonAjustes.innerHTML = "⚙️";
    barra?.append(botonLogros);
    if (ajustes) barra?.append(botonAjustes);

    // ---------- Logros ----------
    const pendientesDeVer = () => logros.filter((l) => hechos.has(l.id) && !leer(`${claveLogros}-vistos`, []).includes(l.id)).length;
    function pintarInsignia() {
        const n = pendientesDeVer();
        botonLogros.innerHTML = `🏆${n ? `<b>${n}</b>` : ""}`;
    }
    function revisarLogros() {
        for (const l of logros) {
            if (hechos.has(l.id)) continue;
            let v = 0;
            try {
                v = l.valor();
            } catch {}
            if (v < l.meta) continue;
            hechos.add(l.id);
            escribir(claveLogros, [...hechos]);
            if (l.fichas) cambiarFichas(l.fichas);
            sonar("logro");
            navigator.vibrate?.([30, 40, 60]);
            ponerCss();
            const el = document.createElement("div");
            el.className = "aviso-logro";
            el.innerHTML = `<span>${l.icono}</span><div>¡Logro: ${l.nombre}!<small>${l.fichas ? `+${formato(l.fichas)} fichas del casino` : l.detalle}</small></div>`;
            document.body.appendChild(el);
            setTimeout(() => el.remove(), 3700);
            pintarInsignia();
            break; // de a uno, así se ven todos
        }
    }
    setInterval(revisarLogros, 1500);
    function abrirLogros() {
        sonar("abrir");
        const html = logros.map((l) => {
            const hecho = hechos.has(l.id);
            let v = 0;
            try {
                v = l.valor();
            } catch {}
            const p = Math.min(1, v / l.meta);
            return `<div class="logro-base${hecho ? " hecho" : ""}"><span class="ico">${l.icono}</span>
                <div class="txt">${l.nombre}<small>${l.detalle}</small>${hecho ? "" : `<div class="barra"><i style="width:${p * 100}%"></i></div>`}</div>
                <span class="premio">${hecho ? "✔" : l.fichas ? `🪙 ${formato(l.fichas)}` : ""}</span></div>`;
        }).join("");
        const { fondo, cerrar } = ventana(`<h2>🏆 Logros ${hechos.size}/${logros.length}</h2>
            <p>Cada logro da fichas para el casino.</p>${html}<button class="boton-base-gris" type="button">Cerrar</button>`);
        fondo.querySelector(".boton-base-gris").addEventListener("click", cerrar);
        escribir(`${claveLogros}-vistos`, [...hechos]);
        pintarInsignia();
    }
    botonLogros.addEventListener("click", abrirLogros);
    pintarInsignia();

    // ---------- Regalo diario con racha de 7 días ----------
    function revisarRegalo() {
        if (!regaloDiario) return false;
        const d = leer(claveDiario, { ultimo: "", racha: 0 });
        if (d.ultimo === hoy()) return false;
        const racha = d.ultimo === ayer() ? (d.racha % 7) + 1 : 1;
        const premios = Array.from({ length: 7 }, (_, i) => regaloDiario(i + 1));
        const { fondo, cerrar } = ventana(`<h2>🎁 Regalo del día</h2>
            <p>${racha > 1 ? `¡Racha de ${racha} días! Volvé mañana para el siguiente.` : "Entrá todos los días: el regalo crece hasta el día 7."}</p>
            <div class="dias-base">${premios.map((p, i) => `<div class="dia-base${i + 1 < racha ? " hecho" : ""}${i + 1 === racha ? " hoy" : ""}"><span>${p.icono}</span>Día ${i + 1}</div>`).join("")}</div>
            <div class="linea-base"><span>${premios[racha - 1].icono}</span>${premios[racha - 1].texto}</div>
            <button class="boton-base-grande" type="button">Reclamar</button>`);
        fondo.querySelector(".boton-base-grande").addEventListener("click", () => {
            premios[racha - 1].dar();
            escribir(claveDiario, { ultimo: hoy(), racha });
            sonar("fanfarria");
            cerrar();
        });
        return true;
    }

    // ---------- Resumen al volver ----------
    // lineas: [{ icono, texto, valor }]
    function resumenAlVolver(segundos, lineas) {
        const visibles = lineas.filter((l) => l.valor);
        if (segundos < 60 || !visibles.length) return;
        const h = Math.floor(segundos / 3600);
        const m = Math.floor((segundos % 3600) / 60);
        const { fondo, cerrar } = ventana(`<h2>👋 ¡Volviste!</h2>
            <p>Estuviste afuera ${h ? `${h} h ` : ""}${m} min. Mientras tanto:</p>
            <div class="lineas-base">${visibles.map((l) => `<div class="linea-base"><span>${l.icono}</span>${l.texto}<b>${l.valor}</b></div>`).join("")}</div>
            <button class="boton-base-grande" type="button">¡Genial!</button>`, () => revisarRegalo());
        fondo.querySelector(".boton-base-grande").addEventListener("click", () => {
            sonar("monedas");
            cerrar();
        });
        return true;
    }

    // ---------- Ajustes y medidor ----------
    const medidor = { prendido: leer(`${juego}-fps`, false), cuadros: 0, desde: performance.now(), suma: 0, max: 0, el: null };
    function pintarMedidor() {
        if (medidor.prendido && !medidor.el) {
            medidor.el = document.createElement("div");
            medidor.el.className = "medidor-base";
            document.body.appendChild(medidor.el);
        }
        if (!medidor.prendido && medidor.el) {
            medidor.el.remove();
            medidor.el = null;
        }
    }
    pintarMedidor();
    // El juego llama a medir(ms que tardó el cuadro) en cada cuadro
    function medir(ms) {
        if (!medidor.prendido) return;
        medidor.cuadros++;
        medidor.suma += ms;
        medidor.max = Math.max(medidor.max, ms);
        const ahora = performance.now();
        if (ahora - medidor.desde < 1000) return;
        const fps = Math.round((medidor.cuadros * 1000) / (ahora - medidor.desde));
        const prom = medidor.suma / medidor.cuadros;
        medidor.el.textContent = `${fps} fps · dibujo ${prom.toFixed(1)} ms (máx ${medidor.max.toFixed(1)})`;
        medidor.el.className = `medidor-base ${prom < 8 ? "bien" : prom < 11 ? "justo" : "mal"}`;
        Object.assign(medidor, { cuadros: 0, desde: ahora, suma: 0, max: 0 });
    }
    async function version() {
        try {
            const v = (await caches.keys()).filter((k) => k.startsWith("proyecto-tp-")).map((k) => k.slice(12)).sort((a, b) => parseInt(b.slice(1)) - parseInt(a.slice(1)))[0];
            if (v) return v;
        } catch {}
        try {
            return (await (await fetch(new URL("../sw.js", import.meta.url), { cache: "no-store" })).text()).match(/VERSION = "([^"]+)"/)?.[1] ?? "";
        } catch {
            return "";
        }
    }
    function abrirAjustes() {
        sonar("abrir");
        const v = audio?.volumen?.() ?? { musica: 0.5, efectos: 0.7 };
        const { fondo, cerrar } = ventana(`<h2>⚙️ Ajustes</h2>
            ${audio ? `<label class="control-base"><span>🎵 Música</span><input type="range" min="0" max="100" data-v="musica" value="${Math.round(v.musica * 100)}"><b>${Math.round(v.musica * 100)}%</b></label>
            <label class="control-base"><span>🔊 Sonidos</span><input type="range" min="0" max="100" data-v="efectos" value="${Math.round(v.efectos * 100)}"><b>${Math.round(v.efectos * 100)}%</b></label>` : ""}
            <label class="casilla-base"><input type="checkbox" ${medidor.prendido ? "checked" : ""}> Mostrar cuadros por segundo</label>
            <button class="boton-base-grande" type="button">Listo</button>
            <div class="version-base"></div>`);
        for (const r of fondo.querySelectorAll("input[type=range]")) {
            r.addEventListener("input", () => {
                audio.cambiarVolumen(r.dataset.v, Number(r.value) / 100);
                r.nextElementSibling.textContent = Number(r.value) ? `${r.value}%` : "🔇";
            });
            r.addEventListener("change", () => r.dataset.v === "efectos" && sonar("monedas"));
        }
        fondo.querySelector("input[type=checkbox]").addEventListener("change", (e) => {
            medidor.prendido = e.target.checked;
            escribir(`${juego}-fps`, medidor.prendido);
            pintarMedidor();
        });
        fondo.querySelector(".boton-base-grande").addEventListener("click", cerrar);
        version().then((x) => (fondo.querySelector(".version-base").textContent = x ? `Versión ${x}` : ""));
    }
    botonAjustes.addEventListener("click", abrirAjustes);

    return { revisarLogros, revisarRegalo, resumenAlVolver, medir, abrirLogros, abrirAjustes, logrosHechos: () => hechos.size };
}

// Calidad automática para juegos en canvas: si el promedio pasa de 8 ms por cuadro durante ~2 s, baja un nivel
// (alBajar(nivel) decide qué hacer: bajar resolución, sacar efectos…). Devuelve vigilar(ms) para llamar cada cuadro.
export function calidadAutomatica(alBajar, niveles = 2) {
    const c = { nivel: niveles, suma: 0, cuadros: 0, malos: 0 };
    return (ms) => {
        c.suma += ms;
        if (++c.cuadros < 60) return c.nivel;
        const prom = c.suma / c.cuadros;
        c.suma = c.cuadros = 0;
        c.malos = prom > 8 ? c.malos + 1 : 0;
        if (c.malos >= 2 && c.nivel > 0) {
            c.nivel--;
            c.malos = 0;
            alBajar(c.nivel);
        }
        return c.nivel;
    };
}
