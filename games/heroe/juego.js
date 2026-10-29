// Héroe idle: tocá para pegarle al monstruo, contratá un equipo que pelea solo y avanzá de etapa.
// Cada 5 etapas hay un jefe con tiempo. Al renacer ganás almas: más daño para siempre y reliquias.
import { formatear, cargar, guardar, vibrar } from "../../js/comun3d.js";
import { crearLienzo, bucle, crearChispas } from "../../js/lienzo2d.js";
import { crearAudio, MUSICAS } from "../../js/sonido.js";
import { crearBase, calidadAutomatica } from "../../js/incremental.js";
import {
    RAREZAS, rareza, LUGARES, nuevoObjeto, bonusObjeto, costoForja, polvoAlDesarmar, MAX_FORJA, MAX_INVENTARIO,
    MASCOTAS, mascota, FORMAS_CARTA, NOMBRES_FORMA, BONUS_CARTA,
} from "./botin.js";

const audio = crearAudio({ musica: MUSICAS.aventura });
const { nota, golpe, efectos } = audio;
// Sonidos propios del héroe
const sonidos = {
    toque: () => {
        golpe({ dur: 0.07, vol: 0.18, filtro: 900, tipo: "lowpass" });
        nota({ f: 180 + Math.random() * 40, hasta: 90, dur: 0.09, vol: 0.12, onda: "square" });
    },
    critico: () => {
        golpe({ dur: 0.1, vol: 0.25, filtro: 700, tipo: "lowpass" });
        nota({ f: 1200, hasta: 1800, dur: 0.18, vol: 0.12, onda: "triangle" });
    },
    muerte: () => {
        nota({ f: 420, hasta: 120, dur: 0.22, vol: 0.14, onda: "sawtooth" });
        golpe({ t: 0.05, dur: 0.12, vol: 0.12, filtro: 1200, tipo: "lowpass" });
    },
    habilidad: () => {
        golpe({ dur: 0.35, vol: 0.18, filtro: 1500, tipo: "bandpass" });
        nota({ f: 300, hasta: 1200, dur: 0.35, vol: 0.12, onda: "sawtooth" });
    },
    renacer: () => [262, 330, 392, 523, 659, 784].forEach((f, k) => nota({ f, t: k * 0.12, dur: 0.6, vol: 0.14, onda: "sine" })),
};

const $ = (id) => document.getElementById(id);
const CLAVE = "heroe";
const POR_ETAPA = 10;
const HITOS = [10, 25, 50, 100, 150, 200, 300, 400, 500];

const EQUIPO = [
    { id: "arquera", nombre: "Arquera", costo: 50, dps: 5, color: "#52b788", disparo: "flecha" },
    { id: "mago", nombre: "Mago", costo: 600, dps: 40, color: "#4361ee", disparo: "orbe" },
    { id: "caballero", nombre: "Caballero", costo: 7000, dps: 300, color: "#adb5bd", disparo: "tajo" },
    { id: "druida", nombre: "Druida", costo: 9e4, dps: 2400, color: "#95d5b2", disparo: "hoja" },
    { id: "ninja", nombre: "Ninja", costo: 1.2e6, dps: 2e4, color: "#343a40", disparo: "estrella" },
    { id: "dragon", nombre: "Dragón", costo: 1.8e7, dps: 1.8e5, color: "#e85d04", disparo: "fuego" },
    { id: "angel", nombre: "Ángel", costo: 3e8, dps: 1.8e6, color: "#ffe066", disparo: "orbe" },
    { id: "titan", nombre: "Titán", costo: 6e9, dps: 2e7, color: "#9d4edd", disparo: "tajo" },
];

const RELIQUIAS = [
    { id: "espada", nombre: "Espada antigua", detalle: "+30% daño por toque", max: 50 },
    { id: "estandarte", nombre: "Estandarte", detalle: "+30% daño del equipo", max: 50 },
    { id: "bolsa", nombre: "Bolsa sin fondo", detalle: "+20% de oro", max: 50 },
    { id: "reloj", nombre: "Reloj de arena", detalle: "+4 s para vencer al jefe", max: 6 },
    { id: "ojo", nombre: "Ojo de halcón", detalle: "+2% de golpe crítico (×6)", max: 10 },
    { id: "atajo", nombre: "Mapa del atajo", detalle: "Al renacer empezás 3 etapas más adelante", max: 10 },
    { id: "cofre", nombre: "Cofre del viajero", detalle: "+1 hora de oro mientras no jugás", max: 8 },
];
const costoReliquia = (n) => Math.ceil(1.6 ** n);

const HABILIDADES = {
    furia: { boton: "hab-furia", dura: 15, recarga: 60, desde: 5, texto: "¡Toques ×3!" },
    oro: { boton: "hab-oro", dura: 20, recarga: 120, desde: 15, texto: "¡Oro ×3!" },
    tormenta: { boton: "hab-tormenta", dura: 15, recarga: 90, desde: 30, texto: "¡Equipo ×4!" },
};

const BIOMAS = [
    { nombre: "Bosque", cielo: ["#87c5ff", "#d7f0ff"], lomas: "#5c9e52", suelo: "#3e7b36", tierra: "#6b4a2b" },
    { nombre: "Cueva", cielo: ["#1d1b2f", "#3b3654"], lomas: "#2b2840", suelo: "#4a4560", tierra: "#2a2638" },
    { nombre: "Desierto", cielo: ["#ffb26b", "#ffe6b3"], lomas: "#e0a85a", suelo: "#e9c46a", tierra: "#b98352" },
    { nombre: "Nieve", cielo: ["#a8c7e8", "#eef6ff"], lomas: "#dfe9f3", suelo: "#f5f9ff", tierra: "#9db4c9" },
    { nombre: "Volcán", cielo: ["#2b0b0b", "#7a1f12"], lomas: "#3b1d1d", suelo: "#4b2a24", tierra: "#ff6b35" },
    { nombre: "Cielo", cielo: ["#5ec8ff", "#fff0fa"], lomas: "#ffffff", suelo: "#f1e9ff", tierra: "#c9b6ff" },
    { nombre: "Abismo", cielo: ["#05010f", "#240b3d"], lomas: "#14072a", suelo: "#2a1250", tierra: "#7b2cbf" },
];
const FORMAS = ["baba", "ojo", "hongo", "golem", "fantasma"];

// ---------- Estado ----------
const NUEVO = () => ({ oro: 0, etapa: 1, muertes: 0, heroe: 1, equipo: {}, avanzar: true });
const estado = cargar(CLAVE, { ...NUEVO(), almas: 0, almasTotales: 0, maxEtapa: 1, reliquias: {}, habilidades: {}, ultimaVez: Date.now() });
for (const e of EQUIPO) estado.equipo[e.id] ??= 0;
// Contadores para los logros (no se pierden al renacer)
estado.contadores ??= { jefes: 0, renacimientos: 0, criticos: 0, cofres: 0, oroTotal: 0, recordEtapa: estado.maxEtapa ?? 1, habilidades: 0 };
const cont = estado.contadores;
for (const r of RELIQUIAS) estado.reliquias[r.id] ??= 0;
const rel = (id) => estado.reliquias[id];

// Botín, mascotas, cartas y llaves de mazmorra (nada de esto se pierde al renacer)
estado.botin ??= { inventario: [], equipado: {}, polvo: 0 };
estado.mascotas ??= { tengo: {}, activa: null, huevos: 0 };
estado.cartas ??= {};
estado.llaves ??= 0;
const objetoPorId = (id) => estado.botin.inventario.find((o) => o.id === id);
const equipados = () => Object.values(estado.botin.equipado).map(objetoPorId).filter(Boolean);
const bonusLugar = (lugar) => equipados().filter((o) => o.lugar === lugar).reduce((t, o) => t + bonusObjeto(o), 0) / 100;
// ---------- Talentos: 3 ramas; los puntos salen del récord de etapa y de renacer (no se pierden) ----------
const TALENTOS = [
    { rama: "Guerrero", id: "fuerza", icono: "💪", nombre: "Fuerza", detalle: (n) => `+${n * 15}% de daño por toque` },
    { rama: "Guerrero", id: "doble", icono: "⚔️", nombre: "Golpe doble", detalle: (n) => `${n * 5}% de chance de pegar dos veces` },
    { rama: "Guerrero", id: "berserker", icono: "😤", nombre: "Berserker", detalle: (n) => `+${n * 20}% de daño a los jefes` },
    { rama: "Guerrero", id: "piel", icono: "🛡️", nombre: "Piel dura", detalle: (n) => `+${n * 2} s contra los jefes` },
    { rama: "Guerrero", id: "furiaEterna", icono: "🔥", nombre: "Furia eterna", detalle: (n) => `La furia dura ${n * 3} s más` },
    { rama: "Mago", id: "sabiduria", icono: "📘", nombre: "Sabiduría", detalle: (n) => `+${n * 12}% de daño del equipo` },
    { rama: "Mago", id: "tormentaMayor", icono: "⚡", nombre: "Tormenta mayor", detalle: (n) => `La tormenta pega +${n * 20}%` },
    { rama: "Mago", id: "recarga", icono: "⏳", nombre: "Recarga rápida", detalle: (n) => `Habilidades listas ${n * 8}% antes` },
    { rama: "Mago", id: "lluvia", icono: "💰", nombre: "Lluvia dorada", detalle: (n) => `La lluvia de oro da +${n * 20}%` },
    { rama: "Mago", id: "concentracion", icono: "🎯", nombre: "Concentración", detalle: (n) => `+${n * 3}% de golpe crítico` },
    { rama: "Cazador", id: "codicia", icono: "🪙", nombre: "Codicia", detalle: (n) => `+${n * 15}% de oro` },
    { rama: "Cazador", id: "aguila", icono: "🦅", nombre: "Ojo de águila", detalle: (n) => `+${n * 2}% de golpe crítico` },
    { rama: "Cazador", id: "cazatesoros", icono: "🧰", nombre: "Cazatesoros", detalle: (n) => `Cofres ${n * 20}% más seguido` },
    { rama: "Cazador", id: "domador", icono: "🐾", nombre: "Domador", detalle: (n) => `Tu mascota cuenta como ${n} nivel${n === 1 ? "" : "es"} más` },
    { rama: "Cazador", id: "llavero", icono: "🗝️", nombre: "Llavero", detalle: (n) => `Llaves de mazmorra ${n * 15}% más seguido` },
];
const MAX_TALENTO = 5;
estado.talentos ??= {};
const tal = (id) => estado.talentos[id] ?? 0;
const puntosTalento = () => Math.floor((cont.recordEtapa ?? 1) / 10) + (cont.renacimientos ?? 0) * 2;
const puntosUsados = () => Object.values(estado.talentos).reduce((a, b) => a + b, 0);

// Nivel de la mascota que llevás (-1 si no es esa); el talento Domador suma niveles
const conMascota = (id) => (estado.mascotas.activa === id ? (estado.mascotas.tengo[id] ?? 0) + tal("domador") : -1);
const multCartas = () => 1 + (Object.keys(estado.cartas).length * BONUS_CARTA) / 100;

const activa = (h) => (estado.habilidades[h]?.hasta ?? 0) > Date.now();
const multAlmas = () => 1 + estado.almasTotales * 0.1;
const hitos = (n) => HITOS.filter((h) => n >= h).length;

const danoToque = () =>
    (1 + estado.heroe) * 2 ** hitos(estado.heroe) * multAlmas() * (1 + rel("espada") * 0.3) * (activa("furia") ? 3 : 1) * (1 + bonusLugar("arma")) * multCartas() * (1 + tal("fuerza") * 0.15);
const dpsDe = (e) => e.dps * estado.equipo[e.id] * 2 ** hitos(estado.equipo[e.id]);
const dpsEquipo = () =>
    EQUIPO.reduce((t, e) => t + dpsDe(e), 0) * multAlmas() * (1 + rel("estandarte") * 0.3) * (activa("tormenta") ? 4 * (1 + tal("tormentaMayor") * 0.2) : 1) *
    (1 + bonusLugar("armadura")) * multCartas() * (conMascota("dragon") >= 0 ? 1.4 + conMascota("dragon") * 0.15 : 1) * (1 + tal("sabiduria") * 0.12);
const probCritico = () =>
    0.05 + rel("ojo") * 0.02 + equipados().reduce((t, o) => t + o.critico, 0) / 100 + (conMascota("hada") >= 0 ? 0.04 + conMascota("hada") * 0.01 : 0) + tal("aguila") * 0.02 + tal("concentracion") * 0.03;
const multCritico = () => (conMascota("hada") >= 0 ? 8 : 6);

const esJefe = (s) => s % 5 === 0;
const vidaEn = (s) => 10 * 1.5 ** (Math.min(s, 120) - 1) * 1.16 ** Math.max(0, s - 120) * (esJefe(s) ? 8 : 1);
const oroEn = (s) =>
    Math.ceil((vidaEn(s) / 5) * (esJefe(s) ? 0.6 : 1) * (1 + rel("bolsa") * 0.2) * (1 + bonusLugar("amuleto")) * (conMascota("buho") >= 0 ? 1.25 + conMascota("buho") * 0.1 : 1) * (1 + tal("codicia") * 0.15));
const tiempoJefe = () => 30 + rel("reloj") * 4 + (conMascota("grifo") >= 0 ? 8 + conMascota("grifo") * 2 : 0) + tal("piel") * 2;
const probCofre = () => 0.03 * (conMascota("gato") >= 0 ? 2 + conMascota("gato") * 0.3 : 1) * (1 + tal("cazatesoros") * 0.2);
const CRECE_HEROE = 1.075;
const CRECE_EQUIPO = 1.08;
const costoSerie = (base, crece, nivel, n) => (base * crece ** nivel * (crece ** n - 1)) / (crece - 1);
const costoHeroe = (n) => costoSerie(5, CRECE_HEROE, estado.heroe, n);
const costoEquipo = (e, n) => costoSerie(e.costo, CRECE_EQUIPO, estado.equipo[e.id], n);

let compraDe = "1";
function cuantas(base, crece, nivel) {
    if (compraDe !== "max") return Number(compraDe);
    return Math.max(1, Math.floor(Math.log((estado.oro * (crece - 1)) / (base * crece ** nivel) + 1) / Math.log(crece)));
}

// ---------- Monstruo ----------
let monstruo = null;
let jefeRestante = 0;
// Mazmorra: 3 monstruos fuertes seguidos con tiempo; si ganás, botín seguro
let mazmorra = null; // { oleada, restante }
const OLEADAS_MAZMORRA = 3;
const tiempoMazmorra = () => 45 + rel("reloj") * 4;
// ---------- Jefe de la semana: un jefe gigante; el daño se acumula toda la semana (3 intentos de 30 s por día) ----------
const INTENTOS_DIA = 3;
const UMBRALES = [0.25, 0.5, 0.75, 1];
let semanal = null; // { restante } mientras peleás
const hoyTexto = () => new Date().toLocaleDateString("sv");
function semanaActual() {
    const d = new Date();
    const jueves = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 3 - ((d.getDay() + 6) % 7));
    const primero = new Date(jueves.getFullYear(), 0, 4);
    return `${jueves.getFullYear()}-S${1 + Math.round(((jueves - primero) / 86400000 - 3 + ((primero.getDay() + 6) % 7)) / 7)}`;
}
function datosSemana() {
    if (estado.semanal?.semana !== semanaActual()) {
        estado.semanal = { semana: semanaActual(), dano: 0, premios: 0, dia: "", usados: 0, vida: vidaEn(Math.max(10, cont.recordEtapa)) * 150 };
    }
    if (estado.semanal.dia !== hoyTexto()) {
        estado.semanal.dia = hoyTexto();
        estado.semanal.usados = 0;
    }
    return estado.semanal;
}
const intentosHoy = () => INTENTOS_DIA - datosSemana().usados;
function empezarSemanal() {
    const w = datosSemana();
    if (semanal || mazmorra || monstruo?.jefe || intentosHoy() < 1 || w.dano >= w.vida) return;
    w.usados++;
    semanal = { restante: 30 };
    avisar("👹 ¡El jefe de la semana! Pegale todo lo que puedas en 30 segundos");
    efectos.abrir();
    nuevoMonstruo();
    actualizar();
}
function premioSemanal(i) {
    const nivel = cont.recordEtapa;
    if (i === 0) {
        const oro = oroEn(nivel) * 40;
        estado.oro += oro;
        estado.botin.polvo += 20;
        avisar(`👹 25%: +${formatear(oro)} de oro y ✨20 de polvo`);
    } else if (i === 1) {
        darObjeto(nuevoObjeto(nivel + 5, 2));
        estado.mascotas.huevos++;
        avisar("👹 50%: ¡objeto épico y un huevo de mascota!");
    } else if (i === 2) {
        estado.almas += 5;
        estado.almasTotales += 5;
        darObjeto(nuevoObjeto(nivel + 8, 2));
        avisar("👹 75%: 5 almas y otro objeto épico");
    } else {
        darObjeto(nuevoObjeto(nivel + 10, 3));
        estado.almas += 10;
        estado.almasTotales += 10;
        estado.llaves += 2;
        cont.semanales = (cont.semanales ?? 0) + 1;
        avisar("🏆 ¡Venciste al jefe de la semana! Legendario, 10 almas y 2 llaves");
    }
    efectos.fanfarria();
}
function sumarDanoSemanal(cantidad) {
    const w = datosSemana();
    w.dano = Math.min(w.vida, w.dano + cantidad);
    while (w.premios < UMBRALES.length && w.dano >= w.vida * UMBRALES[w.premios]) {
        premioSemanal(w.premios);
        w.premios++;
    }
}
function terminarSemanal(gano) {
    semanal = null;
    if (!gano) avisar(`⏱ ¡Tiempo! Llevás ${Math.floor((datosSemana().dano / datosSemana().vida) * 100)}% del jefe de la semana`);
    nuevoMonstruo();
    actualizar();
}

function nuevoMonstruo() {
    const s = estado.etapa;
    const bioma = Math.floor((s - 1) / 10) % BIOMAS.length;
    if (semanal) {
        const w = datosSemana();
        monstruo = { vida: w.vida - w.dano, max: w.vida, jefe: true, semanal: true, bioma, forma: "golem", tono: 350, golpe: 0, entrada: 1, muerte: 0 };
        return;
    }
    if (mazmorra) {
        const vida = vidaEn(Math.max(5, cont.recordEtapa)) * 2.5 * (1 + mazmorra.oleada * 0.6);
        monstruo = {
            vida, max: vida, jefe: true, mazmorra: true, bioma,
            forma: FORMAS[(mazmorra.oleada * 2 + 1) % FORMAS.length],
            tono: 270 + mazmorra.oleada * 20, golpe: 0, entrada: 1, muerte: 0,
        };
        return;
    }
    const vida = vidaEn(s);
    monstruo = {
        vida,
        max: vida,
        jefe: esJefe(s),
        bioma,
        forma: FORMAS[(s * 7 + estado.muertes * 3) % FORMAS.length],
        tono: (bioma * 53 + s * 37 + estado.muertes * 71) % 360,
        golpe: 0,
        entrada: 1,
        muerte: 0,
    };
    jefeRestante = monstruo.jefe ? tiempoJefe() : 0;
}

function danar(cantidad, critico = false, desdeToque = false) {
    if (!monstruo || monstruo.muerte > 0) return;
    if (monstruo.semanal) sumarDanoSemanal(Math.min(cantidad, Math.max(0, monstruo.vida)));
    monstruo.vida -= cantidad;
    if (desdeToque) monstruo.golpe = 0.12;
    if (desdeToque || critico) numero(cantidad, critico);
    if (monstruo.vida <= 0) matar();
}

// Botín: un objeto nuevo va al inventario (si está lleno se desarma solo en polvo)
function darObjeto(obj) {
    const r = rareza(obj.rareza);
    if (estado.botin.inventario.length >= MAX_INVENTARIO) {
        estado.botin.polvo += polvoAlDesarmar(obj);
        avisar(`🎒 Mochila llena: ${obj.nombre} se convirtió en ✨ polvo`);
        return;
    }
    estado.botin.inventario.push(obj);
    // Si el lugar está vacío, se equipa solo
    if (!estado.botin.equipado[obj.lugar]) estado.botin.equipado[obj.lugar] = obj.id;
    const { x, y } = posMonstruo();
    flotantes.push({ x, y: y - 80, texto: `${LUGARES[obj.lugar].icono} ${r.nombre}!`, color: r.color, vida: 1.6, total: 1.6, tam: obj.rareza === "comun" ? 15 : 20 });
    if (obj.rareza !== "comun") efectos.logro();
    pestanaConNovedad("botin");
}
function soltarBotin(jefe, cofre) {
    const { x, y } = posMonstruo();
    if ((jefe && Math.random() < 0.6) || (cofre && Math.random() < 0.35)) darObjeto(nuevoObjeto(cont.recordEtapa));
    if (jefe && Math.random() < 0.15) {
        estado.mascotas.huevos++;
        flotantes.push({ x: x - 30, y: y - 110, texto: "🥚 ¡Huevo de mascota!", color: "#fff", vida: 1.8, total: 1.8, tam: 17 });
        pestanaConNovedad("mascotas");
    }
    if (jefe && Math.random() < 0.2 * (1 + tal("llavero") * 0.15)) {
        estado.llaves++;
        flotantes.push({ x: x + 30, y: y - 130, texto: "🗝️ ¡Llave de mazmorra!", color: "#ffd166", vida: 1.8, total: 1.8, tam: 17 });
    }
    // Carta del monstruo (una por forma y bioma)
    const clave = `${monstruo.bioma}-${monstruo.forma}`;
    if (!estado.cartas[clave] && Math.random() < (jefe ? 0.12 : 0.015)) {
        estado.cartas[clave] = true;
        avisar(`🃏 ¡Carta nueva: ${NOMBRES_FORMA[monstruo.forma]} de ${BIOMAS[monstruo.bioma].nombre}! +${BONUS_CARTA}% de daño`);
        efectos.logro();
        pestanaConNovedad("cartas");
    }
}

function matar() {
    const s = estado.etapa;
    if (monstruo.mazmorra) return ganarOleada();
    if (monstruo.semanal) {
        monstruo.muerte = 0.45;
        sonidos.muerte();
        chispas.emitir(posMonstruo().x, posMonstruo().y, "#ff4d6d", 60, 300);
        return terminarSemanal(true);
    }
    let oro = oroEn(s) * (activa("oro") ? 3 * (1 + tal("lluvia") * 0.2) : 1);
    const cofre = !monstruo.jefe && Math.random() < probCofre();
    if (cofre) oro *= 10;
    estado.oro += oro;
    cont.oroTotal += oro;
    if (cofre) cont.cofres++;
    if (monstruo.jefe) cont.jefes++;
    sonidos.muerte();
    if (monstruo.jefe) efectos.fanfarria();
    else if (cofre) efectos.monedas();
    monstruo.muerte = 0.45;
    const { x, y } = posMonstruo();
    chispas.emitir(x, y, `hsl(${monstruo.tono},80%,60%)`, monstruo.jefe ? 40 : 16, monstruo.jefe ? 260 : 170);
    for (let i = 0; i < (monstruo.jefe ? 14 : cofre ? 10 : 4); i++) monedas.push({ x, y, vx: (Math.random() - 0.5) * 220, vy: -150 - Math.random() * 200, vida: 1.2 });
    flotantes.push({ x, y: y - 50, texto: `${cofre ? "¡COFRE! " : ""}+${formatear(oro)}`, color: "#ffd166", vida: 1.2, total: 1.2, tam: cofre ? 20 : 15 });
    soltarBotin(monstruo.jefe, cofre);
    if (monstruo.jefe) {
        vibrar(80);
        avisar(`¡Jefe derrotado! Etapa ${s + 1}`);
        estado.etapa++;
        estado.muertes = 0;
    } else if (estado.avanzar) {
        estado.muertes++;
        if (estado.muertes >= POR_ETAPA) {
            estado.etapa++;
            estado.muertes = 0;
        }
    }
    estado.maxEtapa = Math.max(estado.maxEtapa, estado.etapa);
    cont.recordEtapa = Math.max(cont.recordEtapa, estado.etapa);
    actualizar();
}

function fallarJefe() {
    estado.etapa--;
    estado.muertes = 0;
    estado.avanzar = false;
    avisar("Se acabó el tiempo. Mejorá el equipo y volvé a intentar.");
    vibrar(150);
    efectos.error();
    nuevoMonstruo();
    actualizar();
}

// ---------- Mazmorra ----------
function entrarMazmorra() {
    if (mazmorra || estado.llaves < 1 || monstruo?.jefe) return;
    estado.llaves--;
    mazmorra = { oleada: 0, restante: tiempoMazmorra() };
    avisar("🗝️ ¡Entraste a la mazmorra! Vencé 3 guardianes antes de que se acabe el tiempo");
    efectos.abrir();
    nuevoMonstruo();
    actualizar();
}
function ganarOleada() {
    const { x, y } = posMonstruo();
    monstruo.muerte = 0.45;
    sonidos.muerte();
    chispas.emitir(x, y, "#b388ff", 40, 260);
    mazmorra.oleada++;
    if (mazmorra.oleada < OLEADAS_MAZMORRA) {
        flotantes.push({ x, y: y - 60, texto: `Guardián ${mazmorra.oleada}/${OLEADAS_MAZMORRA}`, color: "#e0aaff", vida: 1.2, total: 1.2, tam: 18 });
        return;
    }
    // ¡Ganaste! Botín seguro: dos objetos (al menos raros), polvo y quizás un huevo
    mazmorra = null;
    efectos.fanfarria();
    vibrar([60, 40, 120]);
    for (let k = 0; k < 2; k++) darObjeto(nuevoObjeto(cont.recordEtapa + 5, 1, 1.6));
    const polvo = 10 + Math.floor(cont.recordEtapa / 3);
    estado.botin.polvo += polvo;
    if (Math.random() < 0.5) {
        estado.mascotas.huevos++;
        pestanaConNovedad("mascotas");
    }
    cont.mazmorras = (cont.mazmorras ?? 0) + 1;
    avisar(`🏆 ¡Mazmorra superada! 2 objetos y ✨ ${polvo} de polvo`);
    actualizar();
}
function fallarMazmorra() {
    mazmorra = null;
    avisar("⏱ Se acabó el tiempo en la mazmorra. ¡Mejorá el equipo y probá con otra llave!");
    efectos.error();
    nuevoMonstruo();
    actualizar();
}

// ---------- Hordas: cada tanto pasan bichitos corriendo; tocalos para ganar oro ----------
let horda = null; // { bichos: [{ x, y, v, fase, vivo }], hasta }
let proximaHorda = 60 + Math.random() * 60;
function lanzarHorda() {
    horda = { bichos: Array.from({ length: 10 }, (_, k) => ({ x: 1.05 + k * 0.09 + Math.random() * 0.05, y: 0.55 + Math.random() * 0.22, v: 0.16 + Math.random() * 0.08, fase: Math.random() * 6, vivo: true })), hasta: 9 };
    avisar("🐜 ¡Una horda! Tocá los bichitos antes de que se escapen");
    efectos.abrir();
}
function tocarHorda(px, py) {
    if (!horda) return false;
    for (const b of horda.bichos) {
        if (!b.vivo) continue;
        if (Math.hypot(b.x * ancho - px, b.y * alto - py) < 26) {
            b.vivo = false;
            const oro = oroEn(Math.max(1, estado.etapa - 1)) * 2;
            estado.oro += oro;
            cont.oroTotal += oro;
            cont.hordas = (cont.hordas ?? 0) + 1;
            chispas.emitir(b.x * ancho, b.y * alto, "#80ed99", 10, 120);
            flotantes.push({ x: b.x * ancho, y: b.y * alto - 20, texto: `+${formatear(oro)}`, color: "#ffd166", vida: 0.9, total: 0.9, tam: 14 });
            sonidos.toque();
            return true;
        }
    }
    return false;
}
// ---------- Dibujo ----------
const chispas = crearChispas();
const flotantes = [];
const monedas = [];
const disparos = [];
let ancho = 300;
let alto = 200;
let ataque = 0;
let tiempo = 0;
// Dibujos guardados (compañeros, cielo): se pintan una vez y se copian en cada cuadro
const sprites = new Map();
function sprite(clave, w, h, dibujarlo) {
    let s = sprites.get(clave);
    if (!s) {
        const escala = Math.min(devicePixelRatio, 1.5);
        const c = document.createElement("canvas");
        c.width = Math.max(1, Math.ceil(w * escala));
        c.height = Math.max(1, Math.ceil(h * escala));
        const cx = c.getContext("2d");
        cx.scale(escala, escala);
        dibujarlo(cx);
        s = { c, w, h };
        sprites.set(clave, s);
    }
    return s;
}
const lienzo = crearLienzo($("lienzo"), (d) => {
    ancho = d.ancho;
    alto = d.alto;
    sprites.clear();
}, 1.5);
// Si el teléfono no llega, baja la resolución (primero un poco, después más)
const vigilarCalidad = calidadAutomatica((nivel) => lienzo.cambiarEscala(nivel === 1 ? 1.15 : 1));
const suelo = () => alto * 0.8;
const posHeroe = () => ({ x: ancho * 0.3, y: suelo() });
const posMonstruo = () => ({ x: ancho * 0.72, y: suelo() - (monstruo?.forma === "ojo" || monstruo?.forma === "fantasma" ? alto * 0.18 : alto * 0.11) });

function numero(valor, critico) {
    const { x, y } = posMonstruo();
    flotantes.push({ x: x + (Math.random() - 0.5) * 50, y: y - 30, texto: formatear(valor), color: critico ? "#ffd166" : "#ffffff", vida: 0.8, total: 0.8, tam: critico ? 24 : 15 });
}

function dibujarFondo(ctx) {
    const b = BIOMAS[Math.floor((estado.etapa - 1) / 10) % BIOMAS.length];
    const cielo = sprite(`cielo-${b.nombre}`, ancho, suelo(), (c) => {
        const g = c.createLinearGradient(0, 0, 0, suelo());
        g.addColorStop(0, b.cielo[0]);
        g.addColorStop(1, b.cielo[1]);
        c.fillStyle = g;
        c.fillRect(0, 0, ancho, suelo());
    });
    ctx.drawImage(cielo.c, 0, 0, cielo.w, cielo.h);
    // Lomas lejanas que se mueven despacio
    ctx.fillStyle = b.lomas;
    ctx.globalAlpha = 0.7;
    ctx.beginPath();
    ctx.moveTo(0, suelo());
    for (let x = 0; x <= ancho; x += 10) ctx.lineTo(x, suelo() - alto * 0.12 - Math.sin((x + tiempo * 8) / 60) * alto * 0.05 - Math.sin((x + tiempo * 8) / 23) * alto * 0.02);
    ctx.lineTo(ancho, suelo());
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = b.suelo;
    ctx.fillRect(0, suelo(), ancho, alto - suelo());
    ctx.fillStyle = b.tierra;
    ctx.fillRect(0, suelo() + alto * 0.05, ancho, alto);
    ctx.fillStyle = "#0002";
    for (let x = (-tiempo * 20) % 40; x < ancho; x += 40) ctx.fillRect(x, suelo() + 3, 18, 3);
}

function dibujarPersonaje(ctx, x, y, tam, color, tipo, anim = 0) {
    // Cuerpo redondo con casco/sombrero distinto según el tipo
    const brinco = Math.abs(Math.sin(tiempo * 4 + x)) * tam * 0.05;
    y -= brinco;
    ctx.fillStyle = "#0004";
    ctx.beginPath();
    ctx.ellipse(x, y + brinco + tam * 0.02, tam * 0.35, tam * 0.08, 0, 0, Math.PI * 2);
    ctx.fill();
    // Piernas
    ctx.fillStyle = "#2b2d42";
    ctx.fillRect(x - tam * 0.17, y - tam * 0.2, tam * 0.12, tam * 0.2);
    ctx.fillRect(x + tam * 0.05, y - tam * 0.2, tam * 0.12, tam * 0.2);
    // Torso
    const g = ctx.createLinearGradient(x - tam * 0.3, 0, x + tam * 0.3, 0);
    g.addColorStop(0, color);
    g.addColorStop(1, "#00000088");
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(x - tam * 0.25, y - tam * 0.62, tam * 0.5, tam * 0.46, tam * 0.12);
    ctx.fill();
    ctx.fillStyle = g;
    ctx.globalAlpha = 0.4;
    ctx.fill();
    ctx.globalAlpha = 1;
    // Cabeza
    ctx.fillStyle = tipo === "titan" ? "#c77dff" : tipo === "dragon" ? "#e85d04" : "#ffd6a5";
    ctx.beginPath();
    ctx.arc(x, y - tam * 0.8, tam * 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#111";
    ctx.beginPath();
    ctx.arc(x + tam * 0.08, y - tam * 0.82, tam * 0.03, 0, Math.PI * 2);
    ctx.arc(x - tam * 0.04, y - tam * 0.82, tam * 0.03, 0, Math.PI * 2);
    ctx.fill();
    // Sombreros
    ctx.fillStyle = color;
    if (tipo === "heroe" || tipo === "caballero") {
        ctx.fillStyle = "#ced4da";
        ctx.beginPath();
        ctx.arc(x, y - tam * 0.84, tam * 0.22, Math.PI, 0);
        ctx.fill();
        ctx.fillStyle = "#e63946";
        ctx.fillRect(x - tam * 0.03, y - tam * 1.12, tam * 0.06, tam * 0.12);
    } else if (tipo === "mago" || tipo === "druida") {
        ctx.beginPath();
        ctx.moveTo(x - tam * 0.26, y - tam * 0.9);
        ctx.lineTo(x + tam * 0.05, y - tam * 1.35);
        ctx.lineTo(x + tam * 0.26, y - tam * 0.9);
        ctx.fill();
    } else if (tipo === "arquera") {
        ctx.beginPath();
        ctx.ellipse(x, y - tam * 0.95, tam * 0.24, tam * 0.08, -0.2, 0, Math.PI * 2);
        ctx.fill();
    } else if (tipo === "ninja") {
        ctx.fillStyle = "#111";
        ctx.fillRect(x - tam * 0.2, y - tam * 0.95, tam * 0.4, tam * 0.08);
        ctx.fillStyle = "#e63946";
        ctx.fillRect(x - tam * 0.3, y - tam * 0.93, tam * 0.1, tam * 0.04);
    } else if (tipo === "angel") {
        ctx.strokeStyle = "#ffe066";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(x, y - tam * 1.08, tam * 0.16, tam * 0.05, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = "#ffffffcc";
        for (const lado of [-1, 1]) {
            ctx.beginPath();
            ctx.ellipse(x - tam * 0.3, y - tam * 0.5, tam * 0.22, tam * 0.1, lado * 0.5, 0, Math.PI * 2);
            ctx.fill();
        }
    } else if (tipo === "dragon" || tipo === "titan") {
        ctx.fillStyle = "#fff3";
        for (const lado of [-1, 1]) {
            ctx.beginPath();
            ctx.moveTo(x + lado * tam * 0.12, y - tam * 0.95);
            ctx.lineTo(x + lado * tam * 0.2, y - tam * 1.15);
            ctx.lineTo(x + lado * tam * 0.04, y - tam * 0.98);
            ctx.fill();
        }
    }
    // Arma del héroe: espada que gira al atacar
    if (tipo === "heroe") {
        ctx.save();
        ctx.translate(x + tam * 0.25, y - tam * 0.45);
        ctx.rotate(-1.2 + anim * 2.4);
        ctx.fillStyle = "#6c584c";
        ctx.fillRect(-tam * 0.03, -tam * 0.08, tam * 0.06, tam * 0.16);
        ctx.fillStyle = "#ffd166";
        ctx.fillRect(-tam * 0.1, -tam * 0.1, tam * 0.2, tam * 0.04);
        const hoja = ctx.createLinearGradient(0, -tam * 0.7, 0, 0);
        hoja.addColorStop(0, "#ffffff");
        hoja.addColorStop(1, "#adb5bd");
        ctx.fillStyle = hoja;
        ctx.beginPath();
        ctx.moveTo(-tam * 0.05, -tam * 0.1);
        ctx.lineTo(0, -tam * 0.72);
        ctx.lineTo(tam * 0.05, -tam * 0.1);
        ctx.fill();
        ctx.restore();
    }
}

function dibujarMonstruo(ctx, m, x, y, tam, sinSombra = false) {
    const sx = 1 + m.golpe * 1.5;
    const sy = 1 - m.golpe * 1.5;
    const salto = Math.sin(tiempo * 3) * tam * 0.03;
    ctx.save();
    ctx.translate(x + m.entrada * ancho * 0.4, y + salto);
    if (m.muerte > 0) {
        ctx.globalAlpha = m.muerte / 0.45;
        ctx.scale(1 + (0.45 - m.muerte), 1 - (0.45 - m.muerte) * 1.5);
    }
    ctx.scale(sx, sy);
    const color = `hsl(${m.tono},65%,52%)`;
    const oscuro = `hsl(${m.tono},60%,25%)`;
    const claro = `hsl(${m.tono},80%,75%)`;
    const g = ctx.createRadialGradient(-tam * 0.15, -tam * 0.2, 2, 0, 0, tam * 0.6);
    g.addColorStop(0, claro);
    g.addColorStop(0.5, color);
    g.addColorStop(1, oscuro);
    ctx.fillStyle = m.golpe > 0 ? "#fff" : g;
    // Aura violeta de los guardianes de la mazmorra
    if (m.mazmorra && m.muerte <= 0) {
        ctx.save();
        ctx.globalAlpha = 0.25 + Math.sin(tiempo * 5) * 0.1;
        ctx.fillStyle = "#b388ff";
        ctx.beginPath();
        ctx.arc(0, -tam * 0.05, tam * 0.75, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
    // Sombra en el suelo
    ctx.save();
    if (sinSombra) ctx.globalAlpha = 0;
    ctx.fillStyle = "#0004";
    ctx.beginPath();
    ctx.ellipse(0, suelo() - y + 2, tam * 0.45, tam * 0.08, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.beginPath();
    if (m.forma === "baba") {
        ctx.moveTo(-tam * 0.5, tam * 0.3);
        ctx.quadraticCurveTo(-tam * 0.55, -tam * 0.45, 0, -tam * 0.45);
        ctx.quadraticCurveTo(tam * 0.55, -tam * 0.45, tam * 0.5, tam * 0.3);
        ctx.closePath();
    } else if (m.forma === "ojo") {
        ctx.arc(0, 0, tam * 0.38, 0, Math.PI * 2);
        const ala = Math.sin(tiempo * 14) * 0.4;
        for (const lado of [-1, 1]) {
            ctx.moveTo(lado * tam * 0.3, -tam * 0.05);
            ctx.lineTo(lado * tam * 0.85, -tam * (0.35 + ala));
            ctx.lineTo(lado * tam * 0.7, tam * 0.1);
            ctx.closePath();
        }
    } else if (m.forma === "hongo") {
        ctx.ellipse(0, -tam * 0.15, tam * 0.5, tam * 0.32, 0, Math.PI, 0);
        ctx.closePath();
        ctx.roundRect(-tam * 0.2, -tam * 0.15, tam * 0.4, tam * 0.45, tam * 0.1);
    } else if (m.forma === "golem") {
        ctx.roundRect(-tam * 0.42, -tam * 0.5, tam * 0.84, tam * 0.8, tam * 0.1);
        ctx.roundRect(-tam * 0.6, -tam * 0.35, tam * 0.2, tam * 0.5, tam * 0.06);
        ctx.roundRect(tam * 0.4, -tam * 0.35, tam * 0.2, tam * 0.5, tam * 0.06);
    } else {
        ctx.moveTo(-tam * 0.4, tam * 0.35);
        ctx.quadraticCurveTo(-tam * 0.45, -tam * 0.5, 0, -tam * 0.5);
        ctx.quadraticCurveTo(tam * 0.45, -tam * 0.5, tam * 0.4, tam * 0.35);
        for (let k = 3; k >= 0; k--) ctx.lineTo(-tam * 0.4 + k * tam * 0.2 + tam * 0.1, tam * (k % 2 ? 0.2 : 0.4) + Math.sin(tiempo * 6 + k) * 3);
        ctx.closePath();
        ctx.globalAlpha *= 0.9;
    }
    ctx.fill();
    // Detalles: manchas del hongo, grietas del golem
    if (m.forma === "hongo" && m.golpe <= 0) {
        ctx.fillStyle = "#ffffffcc";
        for (const [dx, dy, r] of [[-0.22, -0.3, 0.08], [0.12, -0.36, 0.06], [0.28, -0.2, 0.05]]) {
            ctx.beginPath();
            ctx.arc(dx * tam, dy * tam, r * tam, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    // Cara (mira hacia el héroe)
    const ojoY = m.forma === "hongo" ? tam * 0.05 : -tam * 0.1;
    if (m.forma === "ojo") {
        ctx.fillStyle = "#fff";
        ctx.beginPath();
        ctx.arc(-tam * 0.05, 0, tam * 0.22, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#d00000";
        ctx.beginPath();
        ctx.arc(-tam * 0.12, 0, tam * 0.11, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#000";
        ctx.beginPath();
        ctx.arc(-tam * 0.14, 0, tam * 0.05, 0, Math.PI * 2);
        ctx.fill();
    } else {
        for (const dx of [-0.18, 0.08]) {
            ctx.fillStyle = "#fff";
            ctx.beginPath();
            ctx.arc(dx * tam, ojoY, tam * 0.09, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = "#000";
            ctx.beginPath();
            ctx.arc(dx * tam - tam * 0.03, ojoY + tam * 0.01, tam * 0.045, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.strokeStyle = "#000a";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-tam * 0.18, ojoY + tam * 0.16);
        ctx.quadraticCurveTo(-tam * 0.05, ojoY + tam * (m.golpe > 0 ? 0.08 : 0.22), tam * 0.08, ojoY + tam * 0.16);
        ctx.stroke();
    }
    if (m.jefe) {
        // Cuernos y corona
        ctx.fillStyle = "#f1faee";
        for (const lado of [-1, 1]) {
            ctx.beginPath();
            ctx.moveTo(lado * tam * 0.25, -tam * 0.4);
            ctx.quadraticCurveTo(lado * tam * 0.55, -tam * 0.6, lado * tam * 0.45, -tam * 0.85);
            ctx.lineTo(lado * tam * 0.15, -tam * 0.45);
            ctx.fill();
        }
        ctx.fillStyle = "#ffd166";
        ctx.beginPath();
        ctx.moveTo(-tam * 0.2, -tam * 0.48);
        for (let k = 0; k <= 4; k++) ctx.lineTo(-tam * 0.2 + k * tam * 0.1, -tam * (k % 2 ? 0.58 : 0.72));
        ctx.lineTo(tam * 0.2, -tam * 0.48);
        ctx.fill();
    }
    ctx.restore();
}

function dibujarDisparo(ctx, d) {
    const p = d.t / d.duracion;
    const x = d.x0 + (d.x1 - d.x0) * p;
    const y = d.y0 + (d.y1 - d.y0) * p - Math.sin(p * Math.PI) * d.arco;
    ctx.save();
    ctx.translate(x, y);
    if (d.tipo === "flecha") {
        ctx.rotate(Math.atan2(d.y1 - d.y0, d.x1 - d.x0) - Math.cos(p * Math.PI) * 0.5);
        ctx.fillStyle = "#6b4226";
        ctx.fillRect(-10, -1, 16, 2);
        ctx.fillStyle = "#ddd";
        ctx.beginPath();
        ctx.moveTo(6, -3);
        ctx.lineTo(11, 0);
        ctx.lineTo(6, 3);
        ctx.fill();
    } else if (d.tipo === "estrella") {
        ctx.rotate(tiempo * 20);
        ctx.fillStyle = "#ced4da";
        ctx.beginPath();
        for (let k = 0; k < 8; k++) {
            const r = k % 2 ? 2 : 7;
            const a = (k / 8) * Math.PI * 2;
            ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
        }
        ctx.fill();
    } else if (d.tipo === "tajo") {
        ctx.strokeStyle = d.color;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, 10, -1, 1);
        ctx.stroke();
    } else if (d.tipo === "hoja") {
        ctx.rotate(tiempo * 8);
        ctx.fillStyle = "#52b788";
        ctx.beginPath();
        ctx.ellipse(0, 0, 7, 3, 0, 0, Math.PI * 2);
        ctx.fill();
    } else {
        ctx.fillStyle = d.color;
        ctx.globalAlpha = 0.3;
        ctx.beginPath();
        ctx.arc(0, 0, d.tipo === "fuego" ? 12 : 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.beginPath();
        ctx.arc(0, 0, d.tipo === "fuego" ? 7 : 5, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();
}

function lugarEquipo(i) {
    // Dos filas detrás del héroe
    const fila = i % 2;
    const col = Math.floor(i / 2);
    return { x: ancho * (0.17 - col * 0.045) + fila * ancho * 0.02, y: suelo() - fila * alto * 0.06 };
}

let siguienteDisparo = 0;
function dibujar(dt) {
    const { ctx } = lienzo;
    dibujarFondo(ctx);
    const tam = Math.min(alto * 0.42, ancho * 0.22);

    // Equipo
    const contratados = EQUIPO.filter((e) => estado.equipo[e.id] > 0);
    contratados.map((e, i) => ({ e, i })).reverse().forEach(({ e, i }) => {
        const { x, y } = lugarEquipo(i);
        // Cada compañero es un dibujo guardado; el saltito se aplica al copiarlo
        const t2 = tam * 0.55;
        const img = sprite(`pj-${e.id}-${Math.round(t2)}`, t2 * 1.4, t2 * 1.6, (c) => {
            const guardado = tiempo;
            tiempo = -(t2 * 0.7) / 4; // así el saltito queda en 0 dentro del dibujo
            dibujarPersonaje(c, t2 * 0.7, t2 * 1.45, t2, e.color, e.id);
            tiempo = guardado;
        });
        const brinco = Math.abs(Math.sin(tiempo * 4 + x)) * t2 * 0.05;
        ctx.drawImage(img.c, x - t2 * 0.7, y - t2 * 1.45 - brinco, img.w, img.h);
    });
    const h = posHeroe();
    dibujarPersonaje(ctx, h.x, h.y, tam, "#3a86ff", "heroe", ataque > 0 ? Math.sin((1 - ataque / 0.18) * Math.PI) : 0);

    // Disparos decorativos del equipo (el daño real es continuo)
    siguienteDisparo -= dt;
    if (contratados.length && siguienteDisparo <= 0 && monstruo && monstruo.muerte <= 0 && monstruo.entrada < 0.2) {
        siguienteDisparo = Math.max(0.12, 0.7 / contratados.length);
        const i = Math.floor(Math.random() * contratados.length);
        const e = contratados[i];
        const desde = lugarEquipo(i);
        const m = posMonstruo();
        disparos.push({ tipo: e.disparo, color: e.color, x0: desde.x + 10, y0: desde.y - tam * 0.35, x1: m.x - 10, y1: m.y, t: 0, duracion: 0.45, arco: e.disparo === "flecha" ? 40 : 15 });
    }

    if (monstruo) {
        const m = posMonstruo();
        dibujarMonstruo(ctx, monstruo, m.x, m.y, tam * (monstruo.jefe ? 1.25 : 0.9));
        // Barra de vida
        const bw = ancho * 0.36;
        const bx = ancho * 0.72 - bw / 2;
        const by = 12;
        ctx.fillStyle = "#000a";
        ctx.beginPath();
        ctx.roundRect(bx - 2, by - 2, bw + 4, 16, 8);
        ctx.fill();
        const frac = Math.max(0, monstruo.vida / monstruo.max);
        ctx.fillStyle = monstruo.jefe ? "#e63946" : "#7ee08f";
        ctx.beginPath();
        ctx.roundRect(bx, by, bw * frac, 12, 6);
        ctx.fill();
        ctx.fillStyle = "#fff";
        ctx.font = "800 10px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(formatear(Math.max(0, monstruo.vida)), bx + bw / 2, by + 10);
        ctx.font = "900 12px sans-serif";
        ctx.textAlign = "left";
        const b = BIOMAS[Math.floor((estado.etapa - 1) / 10) % BIOMAS.length];
        const sombra = (t, x, y) => {
            ctx.fillStyle = "#000a";
            ctx.fillText(t, x + 1, y + 1);
            ctx.fillStyle = "#fff";
            ctx.fillText(t, x, y);
        };
        sombra(`${b.nombre} · etapa ${estado.etapa}`, 10, 22);
        if (monstruo.semanal && semanal) {
            const w = datosSemana();
            sombra(`👹 JEFE SEMANAL ${Math.floor((w.dano / w.vida) * 100)}%  ⏱ ${Math.ceil(semanal.restante)}s`, 10, 40);
            ctx.fillStyle = "#ff4d6d";
            ctx.fillRect(10, 46, ancho * 0.3 * (semanal.restante / 30), 4);
        } else if (monstruo.mazmorra && mazmorra) {
            sombra(`🗝️ MAZMORRA ${mazmorra.oleada + 1}/${OLEADAS_MAZMORRA}  ⏱ ${Math.ceil(mazmorra.restante)}s`, 10, 40);
            ctx.fillStyle = "#b388ff";
            ctx.fillRect(10, 46, ancho * 0.3 * (mazmorra.restante / tiempoMazmorra()), 4);
        } else if (monstruo.jefe) {
            sombra(`👑 JEFE  ⏱ ${Math.ceil(jefeRestante)}s`, 10, 40);
            ctx.fillStyle = "#e63946";
            ctx.fillRect(10, 46, ancho * 0.3 * (jefeRestante / tiempoJefe()), 4);
        } else {
            sombra(estado.avanzar ? `${estado.muertes}/${POR_ETAPA}` : "Juntando oro", 10, 40);
        }
    }

    for (const d of disparos) {
        d.t += dt;
        dibujarDisparo(ctx, d);
    }
    for (let i = disparos.length - 1; i >= 0; i--) if (disparos[i].t >= disparos[i].duracion) disparos.splice(i, 1);

    chispas.dibujar(ctx, dt);

    for (let i = monedas.length - 1; i >= 0; i--) {
        const c = monedas[i];
        c.vida -= dt;
        c.vy += 500 * dt;
        c.x += c.vx * dt;
        c.y += c.vy * dt;
        if (c.y > suelo() + 4) {
            c.y = suelo() + 4;
            c.vy *= -0.4;
            c.vx *= 0.7;
        }
        ctx.globalAlpha = Math.min(1, c.vida * 2);
        ctx.fillStyle = "#ffd166";
        ctx.strokeStyle = "#b5838d";
        ctx.beginPath();
        ctx.ellipse(c.x, c.y, 5 * Math.abs(Math.cos(tiempo * 8 + i)), 5, 0, 0, Math.PI * 2);
        ctx.fill();
        if (c.vida <= 0) monedas.splice(i, 1);
    }
    ctx.globalAlpha = 1;

    for (let i = flotantes.length - 1; i >= 0; i--) {
        const f = flotantes[i];
        f.vida -= dt;
        f.y -= dt * 50;
        ctx.globalAlpha = Math.max(0, Math.min(1, (f.vida / f.total) * 2));
        ctx.font = `900 ${f.tam}px sans-serif`;
        ctx.textAlign = "center";
        ctx.lineWidth = 3;
        ctx.strokeStyle = "#000";
        ctx.strokeText(f.texto, f.x, f.y);
        ctx.fillStyle = f.color;
        ctx.fillText(f.texto, f.x, f.y);
        if (f.vida <= 0) flotantes.splice(i, 1);
    }
    ctx.globalAlpha = 1;

    // Bichitos de la horda
    if (horda) {
        for (const bi of horda.bichos) {
            if (!bi.vivo) continue;
            const bx = bi.x * ancho;
            const by = bi.y * alto - Math.abs(Math.sin(tiempo * 14 + bi.fase)) * 5;
            const img = sprite("bicho", 34, 30, (c) => {
                c.fillStyle = "#0004";
                c.beginPath();
                c.ellipse(17, 26, 11, 3, 0, 0, Math.PI * 2);
                c.fill();
                c.fillStyle = "#52b788";
                c.beginPath();
                c.ellipse(17, 16, 12, 9, 0, 0, Math.PI * 2);
                c.fill();
                c.fillStyle = "#2d6a4f";
                for (const dx of [-7, 0, 7]) c.fillRect(17 + dx - 1, 22, 2, 5);
                c.fillStyle = "#fff";
                c.beginPath();
                c.arc(10, 13, 3.4, 0, Math.PI * 2);
                c.arc(17, 12, 3.4, 0, Math.PI * 2);
                c.fill();
                c.fillStyle = "#000";
                c.beginPath();
                c.arc(9, 13, 1.6, 0, Math.PI * 2);
                c.arc(16, 12, 1.6, 0, Math.PI * 2);
                c.fill();
            });
            ctx.drawImage(img.c, bx - 17, by - 15, img.w, img.h);
        }
    }
    // Mascota al lado del héroe (flota; el lobo salta al morder)
    if (estado.mascotas.activa) {
        const ma = mascota(estado.mascotas.activa);
        const hp = posHeroe();
        const tm = Math.round(tam * 0.42);
        const img = sprite(`mascota-${ma.id}-${tm}`, tm * 1.3, tm * 1.3, (c) => {
            c.font = `${tm}px system-ui, "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;
            c.textAlign = "center";
            c.textBaseline = "middle";
            c.fillText(ma.icono, tm * 0.65, tm * 0.7);
        });
        const salto = ataqueMascota > 0 ? Math.sin((ataqueMascota / 0.3) * Math.PI) : 0;
        const mx = hp.x + tam * 0.45 + salto * (posMonstruo().x - hp.x - tam * 0.6);
        const my = hp.y - tam * 0.95 + Math.sin(tiempo * 2.5) * 4 - salto * 20;
        ctx.drawImage(img.c, mx - img.w / 2, my - img.h / 2, img.w, img.h);
    }
    // Tajo del último toque
    if (ataque > 0 && monstruo) {
        const m = posMonstruo();
        ctx.strokeStyle = `rgba(255,255,255,${ataque / 0.18})`;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(m.x - tam * 0.2, m.y, tam * 0.5, -1.1, 0.6);
        ctx.stroke();
    }
}

// ---------- Ciclo ----------
let acumulado = 0;
let mordida = 2;
let ataqueMascota = 0;
bucle((dt) => {
    const inicioCuadro = performance.now();
    tiempo += dt;
    ataque = Math.max(0, ataque - dt);
    if (!monstruo) nuevoMonstruo();
    const m = monstruo;
    m.golpe = Math.max(0, m.golpe - dt);
    m.entrada = Math.max(0, m.entrada - dt * 4);
    if (m.muerte > 0) {
        m.muerte -= dt;
        if (m.muerte <= 0) nuevoMonstruo();
    } else if (m.entrada <= 0) {
        danar(dpsEquipo() * dt);
        if (semanal && monstruo.muerte <= 0) {
            semanal.restante -= dt;
            if (semanal.restante <= 0) terminarSemanal(false);
        } else if (mazmorra && monstruo.muerte <= 0) {
            mazmorra.restante -= dt;
            if (mazmorra.restante <= 0) fallarMazmorra();
        } else if (monstruo.jefe && monstruo.muerte <= 0) {
            jefeRestante -= dt;
            if (jefeRestante <= 0) fallarJefe();
        }
        // El lobo muerde cada 2 segundos
        if (conMascota("lobo") >= 0) {
            mordida -= dt;
            if (mordida <= 0) {
                mordida = 2;
                ataqueMascota = 0.3;
                danar(danoToque() * (5 + conMascota("lobo") * 2), true);
            }
        }
    }
    // Hordas (no durante jefes ni mazmorras)
    if (horda) {
        horda.hasta -= dt;
        for (const b of horda.bichos) b.x -= b.v * dt;
        if (horda.hasta <= 0 || horda.bichos.every((b) => !b.vivo || b.x < -0.1)) horda = null;
    } else if (!monstruo.jefe && !mazmorra) {
        proximaHorda -= dt;
        if (proximaHorda <= 0) {
            proximaHorda = 90 + Math.random() * 90;
            lanzarHorda();
        }
    }
    ataqueMascota = Math.max(0, ataqueMascota - dt);
    dibujar(dt);
    acumulado += dt;
    if (acumulado > 0.2) {
        acumulado = 0;
        actualizar();
        pintarHabilidades();
    }
    const ms = performance.now() - inicioCuadro;
    base?.medir(ms);
    vigilarCalidad(ms);
});

$("lienzo").addEventListener("pointerdown", (e) => {
    const caja = $("lienzo").getBoundingClientRect();
    if (tocarHorda(e.clientX - caja.left, e.clientY - caja.top)) return;
    if (!monstruo || monstruo.muerte > 0 || monstruo.entrada > 0.2) return;
    const critico = Math.random() < probCritico();
    ataque = 0.18;
    // Berserker pega más a los jefes; Golpe doble a veces pega dos veces
    const vsJefe = monstruo.jefe ? 1 + tal("berserker") * 0.2 : 1;
    const veces = Math.random() < tal("doble") * 0.05 ? 2 : 1;
    danar(danoToque() * vsJefe * veces * (critico ? multCritico() : 1), critico, true);
    if (critico) {
        vibrar(25);
        cont.criticos++;
        sonidos.critico();
    } else sonidos.toque();
    const p = posMonstruo();
    chispas.emitir(p.x - 10, p.y, critico ? "#ffd166" : "#ffffff", critico ? 10 : 4, 140);
});

// ---------- Lista de compras ----------
function retrato(e, tipo, color) {
    const c = document.createElement("canvas");
    c.width = 92;
    c.height = 92;
    const ctx = c.getContext("2d");
    const guardado = tiempo;
    tiempo = 0;
    dibujarPersonaje(ctx, 46, 84, 70, color, tipo);
    tiempo = guardado;
    return c;
}

const filas = [];
function crearFila(datos) {
    const el = document.createElement("div");
    el.className = "fila";
    el.appendChild(retrato(null, datos.tipo, datos.color));
    el.insertAdjacentHTML("beforeend", `<div class="txt"><strong></strong><span></span></div><button type="button"></button>`);
    el.querySelector("button").addEventListener("click", datos.comprar);
    $("lista").appendChild(el);
    filas.push({ el, ...datos });
}

crearFila({
    tipo: "heroe",
    color: "#3a86ff",
    comprar() {
        const n = cuantas(5, CRECE_HEROE, estado.heroe);
        if (estado.oro < costoHeroe(n)) return;
        estado.oro -= costoHeroe(n);
        estado.heroe += n;
        vibrar(15);
        efectos.comprar();
        actualizar();
    },
    pintar(el) {
        const n = cuantas(5, CRECE_HEROE, estado.heroe);
        const hito = HITOS.find((h) => estado.heroe < h);
        el.querySelector("strong").innerHTML = `Héroe <em>Nv ${estado.heroe}</em>`;
        el.querySelector("span").textContent = `${formatear(danoToque())} por toque${hito ? ` · ×2 al nivel ${hito}` : ""}`;
        const b = el.querySelector("button");
        b.textContent = `+${n} · ${formatear(costoHeroe(n))}`;
        b.disabled = estado.oro < costoHeroe(n);
    },
});

for (const e of EQUIPO) {
    crearFila({
        tipo: e.id,
        color: e.color,
        comprar() {
            const n = cuantas(e.costo, CRECE_EQUIPO, estado.equipo[e.id]);
            if (estado.oro < costoEquipo(e, n)) return;
            estado.oro -= costoEquipo(e, n);
            if (!estado.equipo[e.id]) avisar(`¡${e.nombre} se unió al equipo!`);
            estado.equipo[e.id] += n;
            vibrar(15);
            efectos.comprar();
            actualizar();
        },
        pintar(el) {
            const nivel = estado.equipo[e.id];
            const n = cuantas(e.costo, CRECE_EQUIPO, nivel);
            const hito = HITOS.find((h) => nivel < h);
            const mult = multAlmas() * (1 + rel("estandarte") * 0.3);
            el.querySelector("strong").innerHTML = `${e.nombre} ${nivel ? `<em>Nv ${nivel}</em>` : ""}`;
            el.querySelector("span").textContent = nivel
                ? `${formatear(dpsDe(e) * mult)} de daño/s${hito ? ` · ×2 al nivel ${hito}` : ""}`
                : `Pega ${formatear(e.dps * mult)}/s`;
            const b = el.querySelector("button");
            b.textContent = `${nivel ? "+" + n : "Contratar"} · ${formatear(costoEquipo(e, n))}`;
            b.disabled = estado.oro < costoEquipo(e, n);
            // Solo se muestran los que ya se pueden ver venir
            const indice = EQUIPO.indexOf(e);
            el.hidden = indice > 0 && !estado.equipo[EQUIPO[indice - 1].id] && !nivel;
            el.classList.toggle("bloqueada", !nivel && estado.oro < costoEquipo(e, 1));
        },
    });
}

function actualizar() {
    $("etapa").textContent = estado.etapa;
    $("oro").textContent = formatear(Math.floor(estado.oro));
    $("por-toque").textContent = formatear(danoToque());
    $("dps").textContent = formatear(dpsEquipo());
    $("almas").textContent = estado.almas;
    $("llaves").textContent = estado.llaves;
    $("intentos").textContent = intentosHoy();
    $("boton-semanal").classList.toggle("sin-llaves", intentosHoy() < 1 || Boolean(semanal) || datosSemana().dano >= datosSemana().vida);
    const libresT = puntosTalento() - puntosUsados();
    if (libresT > 0 && panelActual !== "talentos") document.querySelector('.pestana[data-p="talentos"] .novedad')?.removeAttribute("hidden");
    $("boton-mazmorra").classList.toggle("sin-llaves", estado.llaves < 1 || Boolean(mazmorra));
    $("abrir-renacer").classList.toggle("listo", almasNuevas() >= Math.max(1, estado.almasTotales * 0.5));
    $("avanzar").hidden = estado.avanzar;
    for (const f of filas) f.pintar(f.el);
}

function avisar(texto) {
    $("aviso").innerHTML = `<div class="chico">${texto}</div>`;
    $("aviso").hidden = false;
    clearTimeout(avisar.t);
    avisar.t = setTimeout(() => ($("aviso").hidden = true), 1600);
}

$("avanzar").addEventListener("click", () => {
    estado.avanzar = true;
    estado.muertes = POR_ETAPA - 1;
    actualizar();
});

for (const b of document.querySelectorAll(".cantidad")) {
    b.addEventListener("click", () => {
        compraDe = b.dataset.cantidad;
        for (const x of document.querySelectorAll(".cantidad")) x.classList.toggle("activa", x === b);
        actualizar();
    });
}

const PANELES = ["lista", "botin", "mascotas", "cartas", "talentos", "reliquias"];
let panelActual = "lista";
function mostrarPanel(nombre) {
    panelActual = nombre;
    for (const x of document.querySelectorAll(".pestana")) {
        x.classList.toggle("activa", x.dataset.p === nombre);
        if (x.dataset.p === nombre) x.querySelector(".novedad")?.setAttribute("hidden", "");
    }
    for (const id of PANELES) $(id).hidden = id !== nombre;
    $("comprar-de").hidden = nombre !== "lista";
    if (nombre === "reliquias") pintarReliquias();
    if (nombre === "botin") pintarBotin();
    if (nombre === "mascotas") pintarMascotas();
    if (nombre === "cartas") pintarCartas();
    if (nombre === "talentos") pintarTalentos();
}
for (const p of document.querySelectorAll(".pestana")) {
    p.addEventListener("click", () => {
        efectos.toque();
        mostrarPanel(p.dataset.p);
    });
}
// Puntito en la pestaña cuando hay algo nuevo (objeto, huevo, carta)
function pestanaConNovedad(nombre) {
    if (panelActual === nombre) {
        if (nombre === "botin") pintarBotin();
        if (nombre === "mascotas") pintarMascotas();
        if (nombre === "cartas") pintarCartas();
        return;
    }
    document.querySelector(`.pestana[data-p="${nombre}"] .novedad`)?.removeAttribute("hidden");
}

// ---------- Botín y forja ----------
const htmlObjeto = (o, extra = "") => {
    const r = rareza(o.rareza);
    const L = LUGARES[o.lugar];
    return `<div class="objeto" style="--r:${r.color}"><span class="ico-objeto">${L.icono}</span>
        <div class="txt"><strong style="color:${r.color}">${o.nombre}${o.nivel ? ` +${o.nivel}` : ""}</strong>
        <span>${r.nombre} · +${bonusObjeto(o)}% ${L.texto}${o.critico ? ` · +${o.critico}% crítico` : ""}</span></div>${extra}</div>`;
};
function pintarBotin() {
    const b = estado.botin;
    const lugares = Object.keys(LUGARES).map((lugar) => {
        const o = objetoPorId(b.equipado[lugar]);
        if (!o) return `<div class="objeto vacio"><span class="ico-objeto">${LUGARES[lugar].icono}</span><div class="txt"><strong>${LUGARES[lugar].nombre}</strong><span>Vacío: vencé jefes para conseguir uno</span></div></div>`;
        const tope = o.nivel >= MAX_FORJA;
        return htmlObjeto(o, `<button type="button" data-forjar="${o.id}" ${tope || b.polvo < costoForja(o) ? "disabled" : ""}>${tope ? "Máx" : `🔨 ✨${costoForja(o)}`}</button>`);
    }).join("");
    const mochila = b.inventario.filter((o) => !Object.values(b.equipado).includes(o.id))
        .sort((x, y) => RAREZAS.findIndex((r) => r.id === y.rareza) - RAREZAS.findIndex((r) => r.id === x.rareza) || bonusObjeto(y) - bonusObjeto(x));
    $("botin").innerHTML = `
        <div class="cabeza-panel"><strong>Equipado</strong><span>✨ ${b.polvo} de polvo</span></div>
        ${lugares}
        <div class="cabeza-panel"><strong>Mochila ${b.inventario.length}/${MAX_INVENTARIO}</strong>
            ${mochila.some((o) => o.rareza === "comun") ? `<button type="button" class="chico" data-desarmar-comunes>Desarmar comunes</button>` : ""}</div>
        ${mochila.length ? mochila.map((o) => {
            const actual = objetoPorId(b.equipado[o.lugar]);
            const dif = bonusObjeto(o) - (actual ? bonusObjeto(actual) : 0);
            return htmlObjeto(o, `<div class="acciones-objeto"><button type="button" data-equipar="${o.id}">${dif > 0 ? `▲${dif}%` : "Usar"}</button>
                <button type="button" class="gris" data-desarmar="${o.id}">✨${polvoAlDesarmar(o)}</button></div>`);
        }).join("") : `<p class="vacio-panel">Los jefes, los cofres y las mazmorras sueltan armas, armaduras y amuletos.</p>`}`;
}
$("botin").addEventListener("click", (e) => {
    const bt = e.target.closest("button");
    if (!bt || bt.disabled) return;
    const b = estado.botin;
    const d = bt.dataset;
    if (d.forjar) {
        const o = objetoPorId(d.forjar);
        if (b.polvo < costoForja(o) || o.nivel >= MAX_FORJA) return;
        b.polvo -= costoForja(o);
        o.nivel++;
        efectos.comprar();
        sonidos.critico();
    } else if (d.equipar) {
        const o = objetoPorId(d.equipar);
        b.equipado[o.lugar] = o.id;
        efectos.comprar();
    } else if (d.desarmar) {
        const o = objetoPorId(d.desarmar);
        b.polvo += polvoAlDesarmar(o);
        b.inventario = b.inventario.filter((x) => x !== o);
        efectos.monedas();
    } else if (d.desarmarComunes !== undefined) {
        const comunes = b.inventario.filter((o) => o.rareza === "comun" && !Object.values(b.equipado).includes(o.id));
        b.polvo += comunes.reduce((t, o) => t + polvoAlDesarmar(o), 0);
        b.inventario = b.inventario.filter((o) => !comunes.includes(o));
        efectos.monedas();
    }
    pintarBotin();
    actualizar();
});

// ---------- Mascotas ----------
function pintarMascotas() {
    const m = estado.mascotas;
    $("mascotas").innerHTML = `
        <div class="objeto huevo"><span class="ico-objeto">🥚</span><div class="txt"><strong>Huevos: ${m.huevos}</strong>
            <span>Salen de jefes y mazmorras. Si sale una repetida, sube de nivel.</span></div>
            <button type="button" data-incubar ${m.huevos < 1 ? "disabled" : ""}>Abrir</button></div>
        ${MASCOTAS.map((ma) => {
            const nivel = m.tengo[ma.id];
            if (nivel === undefined) return `<div class="objeto vacio"><span class="ico-objeto sombra-mascota">${ma.icono}</span><div class="txt"><strong>???</strong><span>Todavía no la encontraste</span></div></div>`;
            const lleva = m.activa === ma.id;
            return `<div class="objeto${lleva ? " llevando" : ""}"><span class="ico-objeto">${ma.icono}</span><div class="txt"><strong>${ma.nombre} <em>Nv ${nivel + 1}</em></strong>
                <span>${ma.detalle(nivel)}</span></div><button type="button" data-llevar="${ma.id}" ${lleva ? "disabled" : ""}>${lleva ? "Contigo" : "Llevar"}</button></div>`;
        }).join("")}`;
}
$("mascotas").addEventListener("click", (e) => {
    const bt = e.target.closest("button");
    if (!bt || bt.disabled) return;
    const m = estado.mascotas;
    if (bt.dataset.incubar !== undefined && m.huevos > 0) {
        m.huevos--;
        const ma = MASCOTAS[Math.floor(Math.random() * MASCOTAS.length)];
        const repetida = m.tengo[ma.id] !== undefined;
        m.tengo[ma.id] = repetida ? m.tengo[ma.id] + 1 : 0;
        if (!m.activa) m.activa = ma.id;
        avisar(repetida ? `${ma.icono} ¡${ma.nombre} subió a nivel ${m.tengo[ma.id] + 1}!` : `${ma.icono} ¡Nació un ${ma.nombre}!`);
        efectos.fanfarria();
    } else if (bt.dataset.llevar) {
        m.activa = bt.dataset.llevar;
        mordida = 2;
        efectos.comprar();
    }
    pintarMascotas();
    actualizar();
});

// ---------- Cartas de monstruos ----------
function pintarCartas() {
    const total = BIOMAS.length * FORMAS_CARTA.length;
    const tengo = Object.keys(estado.cartas).length;
    let html = `<div class="cabeza-panel"><strong>🃏 ${tengo}/${total} cartas</strong><span>Todo pega +${tengo * BONUS_CARTA}%</span></div><div class="grilla-cartas">`;
    BIOMAS.forEach((b, i) => {
        for (const forma of FORMAS_CARTA) {
            const la = estado.cartas[`${i}-${forma}`];
            html += `<div class="carta${la ? "" : " oculta"}" title="${la ? `${NOMBRES_FORMA[forma]} de ${b.nombre}` : "???"}" style="--c1:${b.cielo[0]};--c2:${b.cielo[1]}">
                ${la ? `<canvas data-carta="${i}-${forma}" width="120" height="120"></canvas>` : "<span>?</span>"}<small>${la ? NOMBRES_FORMA[forma] : b.nombre}</small></div>`;
        }
    });
    $("cartas").innerHTML = `${html}</div><p class="vacio-panel">Cada monstruo puede soltar su carta (los jefes más seguido). Cada carta distinta suma +${BONUS_CARTA}% de daño para siempre.</p>`;
    for (const c of $("cartas").querySelectorAll("canvas[data-carta]")) {
        const [i, forma] = c.dataset.carta.split("-");
        const ctx = c.getContext("2d");
        const guardado = tiempo;
        tiempo = 0;
        dibujarMonstruo(ctx, { forma, tono: (Number(i) * 53 + 40) % 360, golpe: 0, entrada: 0, muerte: 0 }, 60, 70, 70, true);
        tiempo = guardado;
    }
}

// ---------- Talentos ----------
function pintarTalentos() {
    const libres = puntosTalento() - puntosUsados();
    const ramas = ["Guerrero", "Mago", "Cazador"];
    const iconosRama = { Guerrero: "⚔️", Mago: "🔮", Cazador: "🏹" };
    $("talentos").innerHTML = `<div class="cabeza-panel"><strong>🌳 ${libres} punto${libres === 1 ? "" : "s"} libre${libres === 1 ? "" : "s"}</strong>
        <span>1 cada 10 etapas de récord · 2 por renacer</span></div>
        ${ramas.map((rama) => {
            const lista = TALENTOS.filter((x) => x.rama === rama);
            return `<div class="rama"><h3>${iconosRama[rama]} ${rama}</h3>${lista.map((x, i) => {
                const n = tal(x.id);
                // Cada talento se destraba con al menos 1 punto en el anterior de su rama
                const bloqueado = i > 0 && tal(lista[i - 1].id) < 1;
                const tope = n >= MAX_TALENTO;
                return `<div class="objeto talento${bloqueado ? " vacio" : ""}"><span class="ico-objeto">${x.icono}</span><div class="txt"><strong>${x.nombre} <em>${n}/${MAX_TALENTO}</em></strong>
                    <span>${bloqueado ? "Subí el talento anterior" : x.detalle(Math.max(1, n))}</span></div>
                    <button type="button" data-talento="${x.id}" ${bloqueado || tope || libres < 1 ? "disabled" : ""}>${tope ? "Máx" : "+1"}</button></div>`;
            }).join("")}</div>`;
        }).join("")}
        ${puntosUsados() ? `<button type="button" class="reiniciar-talentos" data-reiniciar-talentos>Reiniciar talentos (gratis)</button>` : ""}`;
}
$("talentos").addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b || b.disabled) return;
    if (b.dataset.talento) {
        if (puntosTalento() - puntosUsados() < 1 || tal(b.dataset.talento) >= MAX_TALENTO) return;
        estado.talentos[b.dataset.talento] = tal(b.dataset.talento) + 1;
        efectos.comprar();
    } else if (b.dataset.reiniciarTalentos !== undefined) {
        estado.talentos = {};
        efectos.toque();
    }
    pintarTalentos();
    actualizar();
});

$("boton-semanal").addEventListener("click", () => {
    const w = datosSemana();
    if (w.dano >= w.vida) return avisar("🏆 Ya venciste al jefe de esta semana. ¡Vuelve el lunes!");
    if (intentosHoy() < 1) return avisar("👹 No te quedan intentos hoy: mañana hay 3 más");
    if (mazmorra || monstruo?.jefe) return avisar("Terminá primero con el jefe o la mazmorra");
    empezarSemanal();
});

$("boton-mazmorra").addEventListener("click", () => {
    if (estado.llaves < 1) return avisar("🗝️ Necesitás una llave: la sueltan los jefes a veces");
    if (monstruo?.jefe) return avisar("Terminá primero con el jefe");
    entrarMazmorra();
});

// ---------- Habilidades ----------
function pintarHabilidades() {
    const ahora = Date.now();
    for (const [id, h] of Object.entries(HABILIDADES)) {
        const b = $(h.boton);
        const d = estado.habilidades[id] ?? {};
        const bloqueada = estado.maxEtapa < h.desde;
        const espera = Math.max(0, ((d.listo ?? 0) - ahora) / 1000);
        b.disabled = bloqueada || espera > 0;
        b.classList.toggle("activa", activa(id));
        b.querySelector("small").textContent = bloqueada ? `Etapa ${h.desde}` : activa(id) ? `${Math.ceil((d.hasta - ahora) / 1000)}s` : espera > 0 ? `${Math.ceil(espera)}s` : b.dataset.nombre;
        b.querySelector("i").style.height = `${bloqueada ? 100 : (espera / h.recarga) * 100}%`;
    }
}
for (const [id, h] of Object.entries(HABILIDADES)) {
    const b = $(h.boton);
    b.dataset.nombre = b.querySelector("small").textContent;
    b.addEventListener("click", () => {
        const ahora = Date.now();
        if (estado.maxEtapa < h.desde || (estado.habilidades[id]?.listo ?? 0) > ahora) return;
        const dura = h.dura + (id === "furia" ? tal("furiaEterna") * 3 : 0);
        estado.habilidades[id] = { hasta: ahora + dura * 1000, listo: ahora + h.recarga * (1 - tal("recarga") * 0.08) * 1000 };
        avisar(h.texto);
        vibrar(40);
        cont.habilidades++;
        sonidos.habilidad();
        pintarHabilidades();
        actualizar();
    });
}

// ---------- Renacer y reliquias ----------
const almasNuevas = () => (estado.maxEtapa < 25 ? 0 : Math.floor(((estado.maxEtapa - 20) / 5) ** 1.4));

$("abrir-renacer").addEventListener("click", () => {
    $("almas-nuevas").textContent = almasNuevas();
    $("req-renacer").textContent = estado.maxEtapa < 25 ? `Se puede renacer desde la etapa 25 (llegaste a la ${estado.maxEtapa}).` : `Tu mejor etapa en esta vida: ${estado.maxEtapa}. Cuanto más lejos llegues, más almas.`;
    $("confirmar-renacer").disabled = almasNuevas() < 1;
    $("renacer").hidden = false;
});
$("cancelar-renacer").addEventListener("click", () => ($("renacer").hidden = true));
$("confirmar-renacer").addEventListener("click", () => {
    const nuevas = almasNuevas();
    if (nuevas < 1) return;
    estado.almas += nuevas;
    estado.almasTotales += nuevas;
    cont.renacimientos++;
    sonidos.renacer();
    Object.assign(estado, NUEVO());
    for (const e of EQUIPO) estado.equipo[e.id] = 0;
    estado.etapa = 1 + rel("atajo") * 3;
    estado.maxEtapa = estado.etapa;
    estado.habilidades = {};
    $("renacer").hidden = true;
    disparos.length = 0;
    nuevoMonstruo();
    avisar(`👻 Renaciste con ${estado.almasTotales} almas: daño ×${multAlmas().toFixed(1)}`);
    guardarProgreso();
    actualizar();
    pintarReliquias();
});

function pintarReliquias() {
    $("reliquias").innerHTML =
        `<div class="fila"><div class="txt"><strong>👻 ${estado.almas} almas para gastar</strong><span>Tenés ${estado.almasTotales} almas en total: todo pega ×${multAlmas().toFixed(1)}. Gastarlas no baja ese bono.</span></div></div>` +
        RELIQUIAS.map((r) => {
            const n = rel(r.id);
            const tope = n >= r.max;
            return `<div class="fila"><div class="txt"><strong>${r.nombre} <em>${n}/${r.max}</em></strong><span>${r.detalle}</span></div>
                <button class="alma" data-id="${r.id}" type="button" ${tope || estado.almas < costoReliquia(n) ? "disabled" : ""}>${tope ? "Máx" : `👻 ${costoReliquia(n)}`}</button></div>`;
        }).join("");
}
$("reliquias").addEventListener("click", (e) => {
    const b = e.target.closest("button[data-id]");
    if (!b) return;
    const r = RELIQUIAS.find((x) => x.id === b.dataset.id);
    const costo = costoReliquia(rel(r.id));
    if (rel(r.id) >= r.max || estado.almas < costo) return;
    estado.almas -= costo;
    estado.reliquias[r.id]++;
    vibrar(30);
    efectos.comprar();
    pintarReliquias();
    actualizar();
});

// ---------- Guardado y oro mientras no estabas ----------
function guardarProgreso() {
    estado.ultimaVez = Date.now();
    guardar(CLAVE, estado);
}
setInterval(guardarProgreso, 5000);
document.addEventListener("visibilitychange", guardarProgreso);
addEventListener("pagehide", guardarProgreso);

// ---------- Base común: logros, regalo diario, resumen al volver y ajustes ----------
const LOGROS = [
    { id: "etapa10", icono: "🌲", nombre: "Explorador", detalle: "Llegá a la etapa 10", meta: 10, valor: () => cont.recordEtapa, fichas: 200 },
    { id: "etapa25", icono: "🕳️", nombre: "Cazador de cuevas", detalle: "Llegá a la etapa 25", meta: 25, valor: () => cont.recordEtapa, fichas: 500 },
    { id: "etapa50", icono: "🏜️", nombre: "Caminante del desierto", detalle: "Llegá a la etapa 50", meta: 50, valor: () => cont.recordEtapa, fichas: 1500 },
    { id: "etapa100", icono: "🌋", nombre: "Domador de volcanes", detalle: "Llegá a la etapa 100", meta: 100, valor: () => cont.recordEtapa, fichas: 5000 },
    { id: "etapa200", icono: "🌌", nombre: "Leyenda del abismo", detalle: "Llegá a la etapa 200", meta: 200, valor: () => cont.recordEtapa, fichas: 20000 },
    { id: "jefe1", icono: "👑", nombre: "Primer jefe", detalle: "Vencé a un jefe", meta: 1, valor: () => cont.jefes, fichas: 150 },
    { id: "jefe25", icono: "⚔️", nombre: "Matajefes", detalle: "Vencé 25 jefes", meta: 25, valor: () => cont.jefes, fichas: 1000 },
    { id: "jefe100", icono: "🐉", nombre: "Pesadilla de los jefes", detalle: "Vencé 100 jefes", meta: 100, valor: () => cont.jefes, fichas: 4000 },
    { id: "renacer1", icono: "👻", nombre: "Nueva vida", detalle: "Renacé una vez", meta: 1, valor: () => cont.renacimientos, fichas: 800 },
    { id: "renacer10", icono: "♾️", nombre: "Alma eterna", detalle: "Renacé 10 veces", meta: 10, valor: () => cont.renacimientos, fichas: 6000 },
    { id: "equipo", icono: "🛡️", nombre: "Equipo completo", detalle: "Contratá a los 8 compañeros", meta: EQUIPO.length, valor: () => EQUIPO.filter((e) => estado.equipo[e.id] > 0).length, fichas: 3000 },
    { id: "heroe100", icono: "💪", nombre: "Héroe entrenado", detalle: "Subí al héroe a nivel 100", meta: 100, valor: () => estado.heroe, fichas: 1000 },
    { id: "criticos", icono: "🎯", nombre: "Ojo certero", detalle: "Hacé 200 golpes críticos", meta: 200, valor: () => cont.criticos, fichas: 800 },
    { id: "cofres", icono: "🧰", nombre: "Buscatesoros", detalle: "Encontrá 15 cofres", meta: 15, valor: () => cont.cofres, fichas: 1200 },
    { id: "oro", icono: "💰", nombre: "Millonario", detalle: "Juntá 1M de oro en total", meta: 1e6, valor: () => cont.oroTotal, fichas: 1500 },
    { id: "habilidades", icono: "⚡", nombre: "Mago de batalla", detalle: "Usá habilidades 50 veces", meta: 50, valor: () => cont.habilidades, fichas: 700 },
    { id: "mazmorra1", icono: "🗝️", nombre: "Explorador de mazmorras", detalle: "Superá una mazmorra", meta: 1, valor: () => cont.mazmorras ?? 0, fichas: 1500 },
    { id: "mazmorra10", icono: "🏰", nombre: "Señor de las mazmorras", detalle: "Superá 10 mazmorras", meta: 10, valor: () => cont.mazmorras ?? 0, fichas: 8000 },
    { id: "legendaria", icono: "🌟", nombre: "¡Legendario!", detalle: "Conseguí un objeto legendario", meta: 1, valor: () => estado.botin.inventario.filter((o) => o.rareza === "legendaria").length, fichas: 5000 },
    { id: "mascotas", icono: "🐾", nombre: "Amigo de los animales", detalle: "Tené 4 mascotas distintas", meta: 4, valor: () => Object.keys(estado.mascotas.tengo).length, fichas: 3000 },
    { id: "cartas10", icono: "🃏", nombre: "Coleccionista", detalle: "Juntá 10 cartas de monstruos", meta: 10, valor: () => Object.keys(estado.cartas).length, fichas: 2000 },
    { id: "cartas35", icono: "📚", nombre: "Bestiario completo", detalle: "Juntá las 35 cartas", meta: 35, valor: () => Object.keys(estado.cartas).length, fichas: 25000 },
    { id: "talentos10", icono: "🌳", nombre: "Maestro", detalle: "Poné 10 puntos de talento", meta: 10, valor: () => puntosUsados(), fichas: 2500 },
    { id: "semanal", icono: "👹", nombre: "Cazador de titanes", detalle: "Vencé a un jefe de la semana", meta: 1, valor: () => cont.semanales ?? 0, fichas: 10000 },
    { id: "hordas", icono: "🐜", nombre: "Cazabichos", detalle: "Atrapá 100 bichitos de horda", meta: 100, valor: () => cont.hordas ?? 0, fichas: 1200 },
];
const base = crearBase({
    juego: "heroe",
    barra: document.querySelector(".barra-juego"),
    logros: LOGROS,
    audio,
    // El regalo crece hasta el día 7, que además da almas
    regaloDiario: (dia) => {
        const oro = Math.ceil(oroEn(Math.max(1, cont.recordEtapa - 2)) * 15 * dia);
        return dia === 7
            ? { icono: "👻", texto: `${formatear(oro)} de oro y 3 almas`, dar: () => ((estado.oro += oro), (estado.almas += 3), (estado.almasTotales += 3), actualizar()) }
            : { icono: dia >= 4 ? "💎" : "💰", texto: `${formatear(oro)} de oro`, dar: () => ((estado.oro += oro), actualizar()) };
    },
});

// El equipo sigue juntando oro en la etapa actual (sin avanzar) mientras no jugás
const ausenteTotal = (Date.now() - estado.ultimaVez) / 1000;
const ausente = Math.min(ausenteTotal, (2 + rel("cofre")) * 3600);
const etapaGranja = esJefe(estado.etapa) ? estado.etapa - 1 : estado.etapa;
const ganadoAusente = Math.floor((dpsEquipo() / vidaEn(etapaGranja)) * oroEn(etapaGranja) * ausente * 0.5);
const monstruosAusente = Math.floor((dpsEquipo() / vidaEn(etapaGranja)) * ausente * 0.5);
if (ganadoAusente >= 1 && ausente > 60) {
    estado.oro += ganadoAusente;
    cont.oroTotal += ganadoAusente;
}
const mostroResumen = ausenteTotal > 60 && base.resumenAlVolver(ausenteTotal, [
    { icono: "💰", texto: "Oro que juntó el equipo", valor: ganadoAusente >= 1 ? formatear(ganadoAusente) : "" },
    { icono: "👾", texto: "Monstruos vencidos", valor: monstruosAusente >= 1 ? formatear(monstruosAusente) : "" },
    { icono: "⏳", texto: "Tope de tiempo", valor: ausenteTotal > ausente ? `${2 + rel("cofre")} h (subilo con el Cofre del viajero)` : "" },
]);
if (!mostroResumen) setTimeout(() => base.revisarRegalo(), 600);

nuevoMonstruo();
actualizar();
pintarHabilidades();
