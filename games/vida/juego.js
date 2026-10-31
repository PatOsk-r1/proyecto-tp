// Vidas cruzadas: dos personajes en el mismo barrio, con un reloj compartido. En cada momento del día
// (mañana, tarde, noche) los dos eligen a dónde ir; cuando eligieron los dos, el momento se juega a la
// vez y ambos ven lo mismo: una escena (partida al medio si están en lugares distintos, o juntos si
// coinciden), situaciones para decidir y la historia común. La relación avanza con momentos compartidos
// (cada uno elige qué hacer y el resultado depende de la combinación) y con propuestas que el otro
// acepta o rechaza: citas, salir, pareja, vivir juntos, casamiento e hijos.
// Online todo se guarda en la partida (campo "vida") con transacciones; para probar solo hay un
// personaje de la compu.
import { exigirSesion } from "../../js/sesion.js";
import { cargar, guardar, vibrar } from "../../js/comun3d.js";
import { MOMENTOS, LUGARES, PASOS, ESTADOS, CITAS, CHANCE_EMBARAZO, CHANCE_CON_PROTECCION, DIAS_EMBARAZO, datosIniciales } from "./reglas.js";
import { crearEscena, dibujarPersonaEn, POSES } from "./escena.js";

const $ = (id) => document.getElementById(id);
const usuario = await exigirSesion();
const yo = usuario.uid ?? "yo";
const idPartida = new URLSearchParams(location.search).get("partida");
const CLAVE_PRACTICA = "vida-practica-2";
const BOT = "bot";
const ESPERA_MAXIMA = 60000; // después de esto se puede seguir sin esperar al otro

const PIELES = ["#f3d2b3", "#e6b48f", "#c98e62", "#9a6440", "#6b4128", "#47291a"];
const PELOS = ["#1e1a19", "#4a2f22", "#8a5a32", "#d8b36a", "#b7472a", "#9ca3af"];
const ROPAS = ["#ff7a6b", "#5ad1c2", "#6c8cff", "#ffc86b", "#b07cff", "#2f3550", "#e9edf3"];
const PEINADOS = { corto: "Corto", largo: "Largo", rulos: "Rulos", recogido: "Recogido" };
const NOMBRES = {
    mujer: ["Lucía", "Martina", "Sofía", "Valentina", "Camila", "Julieta", "Agustina", "Florencia", "Carolina", "Paula"],
    hombre: ["Mateo", "Santiago", "Joaquín", "Tomás", "Nicolás", "Facundo", "Lucas", "Martín", "Franco", "Ignacio"],
};
const EN_LUGAR = { trabajo: "el trabajo", facultad: "la facultad", gimnasio: "el gimnasio", cafe: "el café", plaza: "la plaza", bar: "el bar", casa: "casa" };

let mundo = null;
let otro = null;
let nombresCuenta = {};
let refPartida = null;
let fs = null;
let db = null;

const azar = (lista) => lista[Math.floor(Math.random() * lista.length)];
const limitar = (n) => Math.max(0, Math.min(100, Math.round(n)));
const nuevoId = () => `i${Date.now().toString(36)}${Math.floor(Math.random() * 1e4).toString(36)}`;
const nombreEn = (v, uid) => v?.personajes?.[uid]?.nombre ?? nombresCuenta[uid] ?? "Alguien";
const nombre = (uid) => nombreEn(mundo, uid);
const yoP = () => mundo?.personajes?.[yo];
const otroP = () => (otro ? mundo?.personajes?.[otro] : null);
const juntosEn = (v) => ["convivencia", "casados"].includes(v.relacion.estado);
const enamoradosEn = (v) => ["saliendo", "pareja", "convivencia", "casados"].includes(v.relacion.estado);
const hijosEn = (v) => Object.values(v.hijos ?? {});
const edad = (v) => 18 + Math.floor((v.reloj.dia - 1) / 10);
const puesto = (p) => (p.estudio >= 20 ? "Profesional" : p.estudio >= 8 ? (p.genero === "mujer" ? "Administrativa" : "Administrativo") : p.genero === "mujer" ? "Cajera" : "Cajero");
const sueldo = (p) => (p.estudio >= 20 ? 100 : p.estudio >= 8 ? 60 : 35) + Math.min(40, Math.floor((p.trabajoXp ?? 0) / 4) * 2);

// Datos viejos (de la versión anterior) se completan con lo que falta
function normalizar(v) {
    v.personajes ??= {};
    v.relacion ??= { nivel: 0, estado: "desconocidos" };
    v.propuestas ??= {};
    v.historia ??= {};
    v.hijos ??= {};
    v.elecciones ??= {};
    v.pendientes ??= {};
    v.reloj ??= { dia: Math.max(1, ...Object.values(v.personajes).map((p) => p.dia ?? 1)), momento: 0, desde: Date.now() };
    for (const p of Object.values(v.personajes)) p.ultimo ??= "casa";
    return v;
}
function anotar(v, texto, especial = false) {
    v.historia[nuevoId()] = { t: texto, ts: Date.now(), dia: v.reloj.dia, especial };
    // Se guardan las últimas 60
    const claves = Object.entries(v.historia).sort((a, b) => b[1].ts - a[1].ts).map(([k]) => k);
    for (const k of claves.slice(60)) delete v.historia[k];
}

// ---------- Guardar: cada acción es una función que cambia la vida ----------
// Online se hace en una transacción (así nunca se pisan los dos), y después se juega el momento
// si ya eligieron los dos. En la práctica, el personaje de la compu actúa en el mismo paso.
let ocupado = false;
async function accion(fn) {
    if (ocupado) return;
    ocupado = true;
    try {
        if (refPartida) {
            await fs.runTransaction(db, async (tx) => {
                const d = await tx.get(refPartida);
                const v = normalizar(d.data().vida ?? datosIniciales().vida);
                fn(v);
                completar(v);
                tx.update(refPartida, { vida: v, turno: aQuienLeToca(v), actualizada: fs.serverTimestamp() });
            });
        } else {
            fn(mundo);
            completar(mundo);
            guardar(CLAVE_PRACTICA, mundo);
            pintar();
        }
    } catch (e) {
        console.error(e);
        avisar("No se pudo guardar: revisá la conexión");
    } finally {
        ocupado = false;
    }
}
function completar(v) {
    if (!refPartida) actuaBot(v);
    const uids = Object.keys(v.personajes);
    if (uids.length === 2 && uids.every((u) => v.elecciones[u])) jugarMomento(v);
}
const necesita = (v, u) => v.personajes[u] && (!v.elecciones[u] || v.pendientes[u] || (v.compartido && v.compartido.respuestas[u] === undefined));
const aQuienLeToca = (v) => (necesita(v, otro) && !necesita(v, yo) ? otro : null);

// ---------- Decisiones personales (según el lugar) ----------
const PERSONALES = {
    trabajo: [
        { t: "Tu jefe te ofrece quedarte horas extra.", o: [["Quedarme", { plata: 25, energia: -15 }, "se quedó horas extra"], ["Irme a casa", { animo: 5 }, "se fue a horario"]] },
        { t: "Un compañero te pide que lo cubras en su turno.", o: [["Cubrirlo", { energia: -10, animo: 8, trabajoXp: 2 }, "cubrió a un compañero"], ["Decirle que no", { animo: -2 }, "no cubrió a su compañero"]] },
    ],
    facultad: [
        { t: "¡Examen sorpresa!", o: [["Repasar a último momento", { estudio: 1, energia: -10 }, "repasó para el examen y le fue bien"], ["Improvisar", { azar: [{ estudio: 2, animo: 6, txt: "improvisó y se sacó un 10" }, { animo: -10, txt: "improvisó y le fue mal" }] }, ""]] },
        { t: "Te invitan a un grupo de estudio.", o: [["Sumarme", { estudio: 1, animo: 4 }, "se sumó a un grupo de estudio"], ["Estudiar solo", { estudio: 1, energia: -5 }, "estudió solo"]] },
    ],
    gimnasio: [{ t: "El entrenador te propone una rutina más dura.", o: [["Dale", { fisico: 2, energia: -15 }, "hizo la rutina dura"], ["Tranqui", { animo: 3 }, "entrenó tranqui"]] }],
    cafe: [{ t: "Te traen el pedido equivocado.", o: [["Reclamar", { plata: 8 }, "reclamó y le regalaron el café"], ["Tomarlo igual", { animo: 3 }, "se tomó el café equivocado y le gustó"]] }],
    plaza: [{ t: "Un perro se te acerca a jugar.", o: [["Jugar un rato", { animo: 8, energia: -5 }, "jugó con un perro en la plaza"], ["Seguir caminando", {}, "siguió caminando"]] }],
    bar: [
        { t: "Alguien te invita un trago y te sonríe.", o: [["Charlar un rato", { animo: 8, coqueteo: true }, "charló con alguien en el bar"], ["Agradecer y seguir", { animo: 2, fiel: true }, "agradeció y siguió en lo suyo"]] },
        { t: "Suena tu canción favorita.", o: [["Salir a bailar", { animo: 10, energia: -8 }, "bailó su canción favorita"], ["Quedarme en la barra", { animo: 3 }, "se quedó en la barra"]] },
    ],
    casa: [{ t: "No podés dormir.", o: [["Mirar una serie", { animo: 5, energia: -5 }, "se quedó mirando una serie"], ["Leer un libro", { estudio: 1 }, "leyó hasta tarde"]] }],
};

function aplicarEfecto(v, u, ef) {
    const p = v.personajes[u];
    let texto = null;
    if (ef.azar) {
        const r = azar(ef.azar);
        texto = r.txt;
        ef = r;
    }
    for (const k of ["energia", "animo"]) if (ef[k]) p[k] = limitar(p[k] + ef[k]);
    for (const k of ["plata", "estudio", "fisico", "trabajoXp"]) if (ef[k]) p[k] = Math.max(0, (p[k] ?? 0) + ef[k]);
    if (ef.coqueteo && enamoradosEn(v) && Math.random() < 0.4) {
        v.relacion.nivel = limitar(v.relacion.nivel - 8);
        anotar(v, `A ${nombreEn(v, u === yo ? otro : yo)} le contaron que ${p.nombre} estuvo coqueteando en el bar. La relación bajó.`, true);
    }
    if (ef.fiel && enamoradosEn(v)) v.relacion.nivel = limitar(v.relacion.nivel + 2);
    return texto;
}
function responderPersonal(i) {
    accion((v) => {
        const pe = v.pendientes[yo];
        if (!pe) return;
        const ev = PERSONALES[pe.lugar][pe.i];
        const [, ef, txt] = ev.o[i];
        const extra = aplicarEfecto(v, yo, ef);
        anotar(v, `${v.personajes[yo].nombre} ${extra ?? txt}.`);
        delete v.pendientes[yo];
    });
}

// ---------- Momentos compartidos (cuando coinciden) ----------
// Cada opción tiene "calor": el resultado depende de la suma y de si alguno no puso nada
const COMPARTIDOS = {
    primerCruce: {
        t: (A, B, l) => `${A} y ${B} están en ${EN_LUGAR[l]} al mismo tiempo. Se miran.`,
        o: [["Acercarme a hablar", 2, "saludo"], ["Hacerme el distraído", 0, "parado"]],
        r: { genial: "se pusieron a charlar y se cayeron muy bien", bien: "se pusieron a charlar", tibio: "uno se animó a saludar", incomodo: "uno saludó y el otro se hizo el distraído", nada: "se miraron, pero ninguno se animó" },
    },
    charla: {
        t: (A, B, l) => `${A} y ${B} coinciden en ${EN_LUGAR[l]}.`,
        o: [["Charlar", 2, "saludo"], ["Invitarle algo ($10)", 3, "taza"], ["Seguir en lo mío", 0, "parado"]],
        r: { genial: "se quedaron hablando horas", bien: "charlaron un buen rato", tibio: "charlaron un poco", incomodo: "uno quiso charlar y el otro no le dio bola", nada: "cada uno siguió en lo suyo" },
    },
    romance: {
        t: (A, B, l) => `${A} y ${B} se encuentran en ${EN_LUGAR[l]}. Hay onda.`,
        o: [["Darle un beso", 3, "abrazo"], ["Charlar", 2, "saludo"], ["Hacerme el difícil", 0, "parado"]],
        r: { genial: "se dieron un beso largo", bien: "se dieron un beso tímido", tibio: "charlaron y se rieron", incomodo: "uno fue a darle un beso y el otro se corrió", nada: "estuvieron fríos" },
    },
    bar: {
        t: (A, B) => `${A} y ${B} están en el bar. Suena buena música.`,
        o: [["Bailar juntos", 3, "baile"], ["Tomar algo", 2, "taza"], ["Irme temprano", 0, "parado"]],
        r: { genial: "bailaron toda la noche", bien: "bailaron un rato", tibio: "tomaron algo en la barra", incomodo: "uno quería bailar y el otro se fue", nada: "cada uno se fue por su lado" },
    },
    cita: {
        t: (A, B, l) => `Cita: ${A} y ${B} ${CITAS[l].frase}.`,
        o: [["Contar algo personal", 3, "saludo"], ["Hacerle reír", 2, "baile"], ["Mirar el celular", 0, "parado"]],
        r: { genial: "la cita fue increíble", bien: "la pasaron muy bien", tibio: "la cita estuvo bien", incomodo: "uno estuvo con el celular toda la cita", nada: "la cita fue un desastre" },
    },
    casa: {
        t: (A, B) => `${A} y ${B} están en casa.`,
        o: [["Cocinar juntos", 3, "parado"], ["Mirar una serie", 2, "sentado"], ["Cada uno en lo suyo", 0, "sentado"]],
        r: { genial: "cocinaron juntos y se rieron un montón", bien: "pasaron un rato lindo", tibio: "miraron algo tranquilos", incomodo: "uno quería hacer algo juntos y el otro no", nada: "cada uno estuvo en lo suyo" },
    },
};
const SUMA = { genial: 10, bien: 6, tibio: 3, incomodo: -4, nada: 0 };

function crearCompartido(v, lugar, cita, uids) {
    const clave = cita ? "cita" : v.relacion.estado === "desconocidos" ? "primerCruce" : lugar === "casa" ? "casa" : lugar === "bar" ? "bar" : enamoradosEn(v) ? "romance" : "charla";
    return { clave, lugar: cita ?? lugar, respuestas: {}, uids, ts: Date.now() };
}
function responderCompartido(i) {
    accion((v) => {
        if (!v.compartido || v.compartido.respuestas[yo] !== undefined) return;
        v.compartido.respuestas[yo] = i;
        resolverCompartido(v);
    });
}
function resolverCompartido(v, forzar = false) {
    const c = v.compartido;
    if (!c) return;
    const [a, b] = c.uids;
    if (forzar) for (const u of c.uids) c.respuestas[u] ??= 1;
    if (c.respuestas[a] === undefined || c.respuestas[b] === undefined) return;
    const def = COMPARTIDOS[c.clave];
    const [oa, ob] = [def.o[c.respuestas[a]], def.o[c.respuestas[b]]];
    const s = oa[1] + ob[1];
    const min = Math.min(oa[1], ob[1]);
    const res = min === 0 && s >= 2 ? "incomodo" : s >= 6 ? "genial" : s >= 4 ? "bien" : s >= 2 ? "tibio" : "nada";
    const A = nombreEn(v, a);
    const B = nombreEn(v, b);
    // Invitar algo cuesta
    c.respuestas[a] === 1 && c.clave === "charla" && (v.personajes[a].plata = Math.max(0, v.personajes[a].plata - 10));
    c.respuestas[b] === 1 && c.clave === "charla" && (v.personajes[b].plata = Math.max(0, v.personajes[b].plata - 10));
    let suma = SUMA[res];
    if (c.clave === "primerCruce") {
        if (res !== "nada") v.relacion.estado = "conocidos";
        suma = { genial: 9, bien: 7, tibio: 4, incomodo: 2, nada: 0 }[res];
    }
    if (c.clave === "cita") suma += CITAS[c.lugar].base - 6;
    v.relacion.nivel = limitar(v.relacion.nivel + suma);
    if (["conocidos"].includes(v.relacion.estado) && v.relacion.nivel >= 20) v.relacion.estado = "amigos";
    for (const u of c.uids) v.personajes[u].animo = limitar(v.personajes[u].animo + (suma > 0 ? 5 : suma < 0 ? -5 : 0));
    anotar(v, `${A} y ${B}: ${def.r[res]}.`, true);
    // Lo que se ve en la escena
    v.ultimo = { ...(v.ultimo ?? {}), reaccion: { poses: { [a]: oa[2], [b]: ob[2] }, texto: `${A} y ${B} ${def.r[res]}`, corazones: suma >= 6 } };
    v.compartido = null;
}

// ---------- Jugar el momento (cuando eligieron los dos) ----------
const QUE_HACE = {
    trabajo: (p) => `trabajó de ${puesto(p).toLowerCase()} (+$${sueldo(p)})`,
    facultad: () => "estudió en la facultad",
    gimnasio: () => "entrenó en el gimnasio",
    cafe: () => "tomó un café",
    plaza: () => "paseó por la plaza",
    bar: () => "salió al bar",
    casa: (p, m) => (m === 2 ? "durmió en casa" : "descansó en casa"),
};
function jugarMomento(v) {
    // Si quedó un momento compartido sin responder, se cierra solo
    if (v.compartido) resolverCompartido(v, true);
    const uids = Object.keys(v.personajes);
    const { dia, momento } = v.reloj;
    const lugares = { ...v.elecciones };
    const cita = v.cita && v.cita.dia === dia && v.cita.momento === momento ? v.cita.lugar : null;
    const partes = [];
    for (const u of uids) {
        const p = v.personajes[u];
        const l = cita ? "cita" : lugares[u];
        if (!cita) {
            const L = LUGARES[l];
            p.energia = limitar(p.energia + L.energia);
            p.animo = limitar(p.animo + L.animo);
            p.plata = Math.max(0, p.plata + (L.plata ?? 0));
            if (l === "trabajo") {
                p.plata += sueldo(p);
                p.trabajoXp = (p.trabajoXp ?? 0) + 1;
            }
            if (l === "facultad") p.estudio += 1;
            if (l === "gimnasio") p.fisico += 1;
            p.ultimo = l;
        }
        partes.push(cita ? null : `${p.nombre} ${QUE_HACE[l](p, momento)}`);
    }
    const [a, b] = uids;
    const juntos = cita || (lugares[a] === lugares[b] && (LUGARES[lugares[a]].social || (lugares[a] === "casa" && juntosEn(v))));
    anotar(v, cita ? `${MOMENTOS[momento]} del día ${dia}: ${nombreEn(v, a)} y ${nombreEn(v, b)} tienen una cita.` : `${MOMENTOS[momento]} del día ${dia}: ${partes.join("; ")}.`);
    v.ultimo = { dia, momento, lugares, cita, juntos: Boolean(juntos), reaccion: null };
    v.pendientes = {};
    if (juntos) v.compartido = crearCompartido(v, lugares[a], cita, uids);
    else {
        // Cada uno puede tener una situación para decidir
        for (const u of uids) {
            const lista = PERSONALES[lugares[u]];
            if (lista && Math.random() < 0.6) v.pendientes[u] = { lugar: lugares[u], i: Math.floor(Math.random() * lista.length) };
        }
    }
    if (cita) v.cita = null;
    v.elecciones = {};
    // Avanza el reloj para los dos
    if (momento < 2) v.reloj.momento = momento + 1;
    else terminarDia(v);
    v.reloj.desde = Date.now();
}

function terminarDia(v) {
    const gastos = (juntosEn(v) ? 12 : 20) + hijosEn(v).length * 10;
    for (const p of Object.values(v.personajes)) {
        p.plata -= gastos;
        if (p.plata < 0) {
            p.plata = 0;
            p.animo = limitar(p.animo - 12);
        }
        p.energia = limitar(p.energia + 30);
        p.animo = limitar(p.animo + hijosEn(v).length * 2 + (enamoradosEn(v) ? 3 : 0));
    }
    v.reloj.dia += 1;
    v.reloj.momento = 0;
    anotar(v, `Empieza el día ${v.reloj.dia}. Cada uno pagó $${gastos} de gastos${juntosEn(v) ? " (la casa se comparte)" : ""}.`);
    if (v.embarazo && v.reloj.dia >= v.embarazo.finDia) nacer(v);
    if (v.reloj.dia % 10 === 1) anotar(v, `Pasó un año: ahora tienen ${edad(v)} años.`, true);
}

function nacer(v) {
    const madre = v.embarazo.de;
    const papa = Object.keys(v.personajes).find((u) => u !== madre);
    const genero = Math.random() < 0.5 ? "mujer" : "hombre";
    const n = azar(NOMBRES[genero]);
    v.hijos[nuevoId()] = { nombre: n, genero, dia: v.reloj.dia, piel: azar([v.personajes[madre].piel, v.personajes[papa].piel]), pelo: azar([v.personajes[madre].pelo, v.personajes[papa].pelo]) };
    v.embarazo = null;
    v.nacimiento = { nombre: n, ts: Date.now() };
    anotar(v, `Nació ${n}. ${genero === "mujer" ? "Es una nena" : "Es un nene"} y tiene los ojos de los dos.`, true);
}

// ---------- Elegir a dónde ir ----------
function elegir(lugar) {
    const p = yoP();
    const L = LUGARES[lugar];
    if (L.energia < 0 && p.energia + L.energia < 0) return avisar("Estás sin energía: elegí casa para descansar");
    if ((L.plata ?? 0) < 0 && p.plata + L.plata < 0) return avisar("No te alcanza la plata para eso");
    vibrar(10);
    accion((v) => {
        if (v.elecciones[yo] || v.pendientes[yo]) return;
        v.elecciones[yo] = lugar;
        v.eligio = { ...(v.eligio ?? {}), [yo]: Date.now() };
    });
}
function seguirSinEsperar() {
    accion((v) => {
        if (!v.elecciones[yo] || v.elecciones[otro]) return;
        v.elecciones[otro] = rutina(v, otro);
        if (v.compartido?.respuestas[otro] === undefined && v.compartido) v.compartido.respuestas[otro] = 1;
        delete v.pendientes[otro];
        anotar(v, `${nombreEn(v, otro)} no estaba: hizo lo de siempre.`);
    });
}
// Lo que hace alguien que no eligió: lo mismo que la vez anterior, si puede
function rutina(v, u) {
    const p = v.personajes[u];
    const l = p.ultimo ?? "casa";
    const L = LUGARES[l];
    if (p.energia + L.energia < 0 || p.plata + (L.plata ?? 0) < 0) return "casa";
    return l;
}

// ---------- Personaje de la compu ----------
function crearBot(mio) {
    const genero = mio.genero === "mujer" ? "hombre" : "mujer";
    const social = Object.keys(LUGARES).filter((l) => LUGARES[l].social);
    return {
        nombre: azar(NOMBRES[genero]), genero, piel: azar(PIELES), pelo: azar(PELOS.slice(0, 5)), peinado: genero === "mujer" ? azar(["largo", "recogido", "rulos"]) : azar(["corto", "rulos"]),
        ropa: azar(ROPAS), energia: 100, animo: 70, plata: 150, estudio: 0, fisico: 0, trabajoXp: 0, ultimo: "casa",
        favorito: { lugar: azar(social), momento: Math.floor(Math.random() * 3) },
    };
}
function actuaBot(v) {
    const b = v.personajes[BOT];
    if (!b) return;
    if (!v.elecciones[BOT] && v.elecciones[yo]) {
        // Va a su lugar favorito, a veces adonde fuiste vos la última vez, o trabaja / descansa
        const m = v.reloj.momento;
        const social = Object.keys(LUGARES).filter((l) => LUGARES[l].social);
        let l = m === b.favorito.momento && Math.random() < 0.55 ? b.favorito.lugar : Math.random() < 0.25 ? v.personajes[yo].ultimo : Math.random() < 0.4 ? "trabajo" : azar(social);
        if (b.energia < 30) l = "casa";
        if (LUGARES[l].plata && b.plata + LUGARES[l].plata < 0) l = "trabajo";
        v.elecciones[BOT] = l;
    }
    delete v.pendientes[BOT];
    if (v.compartido && v.compartido.respuestas[BOT] === undefined) {
        const nivel = v.relacion.nivel;
        v.compartido.respuestas[BOT] = Math.random() < 0.15 ? v.compartido.clave === "primerCruce" ? 1 : 2 : nivel > 40 && Math.random() < 0.6 ? 0 : v.compartido.clave === "primerCruce" ? 0 : Math.random() < 0.5 ? 0 : 1;
        resolverCompartido(v);
    }
}
function botResponde() {
    accion((v) => {
        for (const [id, pr] of Object.entries(v.propuestas)) {
            if (pr.de !== yo) continue;
            const chance = { cita: 0.85, salir: 0.75, pareja: 0.75, noche: 0.7, mudarse: 0.8, casarse: 0.85, adoptar: 0.8 }[pr.tipo] ?? 0.7;
            resolverPropuesta(v, id, Math.random() < chance, BOT);
        }
    });
}

// ---------- Propuestas (citas, salir, pareja, vivir juntos, casarse, noche, adoptar) ----------
function proponer(tipo, datos = {}) {
    cerrarVentana();
    accion((v) => {
        v.propuestas[nuevoId()] = { de: yo, tipo, ...datos, ts: Date.now() };
    });
    avisar(`Le llegó tu propuesta a ${nombre(otro)}`);
    if (!refPartida) setTimeout(botResponde, 1400);
}
function responder(id, acepta) {
    accion((v) => resolverPropuesta(v, id, acepta, yo));
}
function resolverPropuesta(v, id, acepta, quien) {
    const pr = v.propuestas[id];
    if (!pr) return;
    delete v.propuestas[id];
    const de = pr.de;
    const A = nombreEn(v, de);
    const B = nombreEn(v, quien);
    if (!acepta) {
        v.relacion.nivel = limitar(v.relacion.nivel - 3);
        anotar(v, `${B} le dijo que no a ${A} (${PASOS[pr.tipo].nombre.toLowerCase()}).`, true);
        return;
    }
    const pA = v.personajes[de];
    const pB = v.personajes[quien];
    if (pr.tipo === "cita") {
        // La cita se juega en el próximo momento: los dos van ahí
        const c = CITAS[pr.lugar];
        pA.plata = Math.max(0, pA.plata - c.costo);
        v.cita = { lugar: pr.lugar, dia: v.reloj.dia, momento: v.reloj.momento };
        anotar(v, `${B} aceptó la cita: ${A} y ${B} van ${c.frase} ${MOMENTOS[v.reloj.momento] === "Noche" ? "esta noche" : `a la ${MOMENTOS[v.reloj.momento].toLowerCase()}`}.`, true);
        return;
    }
    if (pr.tipo === "noche") {
        v.relacion.nivel = limitar(v.relacion.nivel + 6);
        anotar(v, `${A} y ${B} pasaron la noche juntos.`, true);
        const madre = pA.genero === "mujer" && pB.genero === "hombre" ? de : pB.genero === "mujer" && pA.genero === "hombre" ? quien : null;
        const chance = pr.proteccion ? CHANCE_CON_PROTECCION : CHANCE_EMBARAZO;
        if (madre && !v.embarazo && Math.random() < chance) {
            v.embarazo = { de: madre, finDia: v.reloj.dia + DIAS_EMBARAZO };
            anotar(v, `¡${nombreEn(v, madre)} está embarazada! El bebé llega el día ${v.reloj.dia + DIAS_EMBARAZO}.`, true);
        }
        v.ultimo = { ...(v.ultimo ?? {}), especial: { tipo: "noche", ts: Date.now() } };
        return;
    }
    if (pr.tipo === "adoptar") {
        const genero = Math.random() < 0.5 ? "mujer" : "hombre";
        const n = azar(NOMBRES[genero]);
        v.hijos[nuevoId()] = { nombre: n, genero, dia: v.reloj.dia, piel: azar(PIELES), pelo: azar(PELOS.slice(0, 5)) };
        v.relacion.nivel = limitar(v.relacion.nivel + 5);
        v.nacimiento = { nombre: n, ts: Date.now() };
        anotar(v, `${A} y ${B} adoptaron a ${n}.`, true);
        return;
    }
    v.relacion.estado = PASOS[pr.tipo].a;
    v.relacion.nivel = limitar(v.relacion.nivel + (pr.tipo === "casarse" ? 8 : 5));
    anotar(v, { salir: `${A} y ${B} empezaron a salir.`, pareja: `${A} y ${B} son pareja.`, mudarse: `${A} y ${B} se mudaron juntos.`, casarse: `${A} y ${B} se casaron.` }[pr.tipo], true);
    v.ultimo = { ...(v.ultimo ?? {}), especial: { tipo: pr.tipo, ts: Date.now() } };
}
function terminarRelacion() {
    ventana(`<h3>Terminar la relación</h3><p>Vuelven a ser amigos y la relación baja bastante. Si vivían juntos, cada uno vuelve a su casa.</p>
        <div class="botones-v"><button type="button" data-cerrar>No</button><button class="si" type="button" data-ok>Terminar</button></div>`, (w) => {
        w.querySelector("[data-cerrar]").addEventListener("click", cerrarVentana);
        w.querySelector("[data-ok]").addEventListener("click", () => {
            cerrarVentana();
            accion((v) => {
                v.relacion.estado = "amigos";
                v.relacion.nivel = limitar(v.relacion.nivel - 30);
                anotar(v, `${nombreEn(v, yo)} y ${nombreEn(v, otro)} terminaron.`, true);
            });
        });
    });
}
function mandarMensaje() {
    accion((v) => {
        const p = v.personajes[yo];
        if (p.mensaje === v.reloj.dia) return;
        p.mensaje = v.reloj.dia;
        v.relacion.nivel = limitar(v.relacion.nivel + 2);
        if (v.relacion.estado === "conocidos" && v.relacion.nivel >= 20) v.relacion.estado = "amigos";
        anotar(v, `${p.nombre} le escribió a ${nombreEn(v, otro)}.`);
    });
}
function pedirPaso(tipo) {
    const o = otroP();
    if (tipo === "cita") {
        return ventana(`<h3>Invitar a ${o.nombre} a una cita</h3><p>Paga el que invita. Si acepta, la cita es en el próximo momento del día y los dos van ahí.</p>
            <div class="opciones-v">${Object.entries(CITAS).map(([id, c]) => `<button type="button" data-c="${id}" ${yoP().plata < c.costo ? "disabled" : ""}>${c.nombre}<span>$${c.costo}</span></button>`).join("")}</div>
            <button class="boton-v" type="button" data-cerrar>Mejor no</button>`, (w) => {
            for (const b of w.querySelectorAll("[data-c]")) b.addEventListener("click", () => proponer("cita", { lugar: b.dataset.c }));
            w.querySelector("[data-cerrar]").addEventListener("click", cerrarVentana);
        });
    }
    if (tipo === "noche") {
        return ventana(`<h3>Pasar la noche con ${o.nombre}</h3><p>¿Usan protección? Con protección la chance de embarazo baja un 99%.</p>
            <div class="opciones-v">
                <button type="button" data-p="1">Con protección <span>casi sin chance</span></button>
                <button type="button" data-p="0">Sin protección <span>puede haber bebé</span></button>
            </div>
            <button class="boton-v" type="button" data-cerrar>Mejor otro día</button>`, (w) => {
            for (const b of w.querySelectorAll("[data-p]")) b.addEventListener("click", () => proponer("noche", { proteccion: b.dataset.p === "1" }));
            w.querySelector("[data-cerrar]").addEventListener("click", cerrarVentana);
        });
    }
    const textos = {
        salir: `Le vas a proponer a ${o.nombre} empezar a salir.`,
        pareja: `Le vas a pedir a ${o.nombre} que sean pareja.`,
        mudarse: `Le vas a proponer a ${o.nombre} vivir juntos. Comparten la casa y los gastos bajan.`,
        casarse: `Le vas a proponer casamiento a ${o.nombre}.`,
        adoptar: `Le vas a proponer a ${o.nombre} adoptar un hijo.`,
    };
    ventana(`<h3>${PASOS[tipo].nombre}</h3><p>${textos[tipo]} Puede decir que sí o que no.</p>
        <div class="botones-v"><button type="button" data-cerrar>Todavía no</button><button class="si" type="button" data-ok>Proponer</button></div>`, (w) => {
        w.querySelector("[data-ok]").addEventListener("click", () => proponer(tipo));
        w.querySelector("[data-cerrar]").addEventListener("click", cerrarVentana);
    });
}
const textoPropuesta = (pr) => {
    const de = nombre(pr.de);
    if (pr.tipo === "cita") return `${de} te invita ${CITAS[pr.lugar].frase}`;
    if (pr.tipo === "noche") return `${de} quiere pasar la noche con vos${pr.proteccion ? " (con protección)" : " (sin protección)"}`;
    return { salir: `${de} te propone empezar a salir`, pareja: `${de} te pregunta si querés ser su pareja`, mudarse: `${de} te propone vivir juntos`, casarse: `${de} te pide casamiento`, adoptar: `${de} te propone adoptar un hijo` }[pr.tipo];
};

// ---------- Ventanas y avisos ----------
function avisar(texto, ms = 2600) {
    $("aviso").textContent = texto;
    $("aviso").hidden = false;
    clearTimeout(avisar.t);
    avisar.t = setTimeout(() => ($("aviso").hidden = true), ms);
}
function ventana(html, alArmar) {
    $("ventana").innerHTML = html;
    $("capa").hidden = false;
    alArmar?.($("ventana"));
}
const cerrarVentana = () => ($("capa").hidden = true);
$("capa").addEventListener("click", (e) => e.target === $("capa") && cerrarVentana());
function fundido(texto) {
    $("fundido-texto").textContent = texto;
    $("fundido").hidden = false;
    setTimeout(() => ($("fundido").hidden = true), 3300);
}

// ---------- Dibujo ----------
function dibujarPersona(cv, p, { escala = 1, x = 0.5 } = {}) {
    if (!p) return;
    const s = Math.min(cv.width / 100, cv.height / 135) * escala;
    dibujarPersonaEn(cv.getContext("2d"), cv.width * x, cv.height - 2, s, p, "parado");
}
const limpiar = (cv) => cv.getContext("2d").clearRect(0, 0, cv.width, cv.height);
const escena = crearEscena($("escena"), (t) => ($("texto-escena").textContent = t));
const conChicos = (v) => hijosEn(v).map((h) => ({ ...h, ropa: h.genero === "mujer" ? "#ff8fab" : "#6c8cff", peinado: h.genero === "mujer" ? "largo" : "corto" }));

// Arma la escena compartida a partir de lo último que pasó
let vistos = { especial: 0, nacimiento: 0 };
function pintarEscena() {
    const v = mundo;
    const u = v.ultimo;
    const p = yoP();
    const o = otroP();
    const esp = u?.especial;
    // Algo especial recién pasado (noche, casamiento, salir, pareja, mudanza)
    if (esp && Date.now() - esp.ts < 15 * 60000) {
        if (esp.ts > vistos.especial && esp.tipo === "noche") fundido(`${p.nombre} y ${o.nombre} pasaron la noche juntos.`);
        if (esp.ts > vistos.especial && esp.tipo === "casarse") fundido(`${p.nombre} y ${o.nombre} se casaron. Fue una fiesta hermosa.`);
        vistos.especial = Math.max(vistos.especial, esp.ts);
        const e = {
            noche: { lugar: "casa", momento: 2, personas: [{ p, pose: "dormir" }, { p: o, pose: "dormir" }], texto: `${p.nombre} y ${o.nombre} duermen juntos`, corazones: true },
            casarse: { lugar: "boda", momento: 1, personas: [{ p, pose: "parado" }, { p: o, pose: "parado" }], texto: `${p.nombre} y ${o.nombre} se casan`, corazones: true, festejo: true },
            salir: { lugar: "plaza", momento: 1, personas: [{ p, pose: "abrazo" }, { p: o, pose: "saludo" }], texto: `${p.nombre} y ${o.nombre} empiezan a salir`, corazones: true },
            pareja: { lugar: "plaza", momento: 2, personas: [{ p, pose: "abrazo" }, { p: o, pose: "abrazo" }], texto: `${p.nombre} y ${o.nombre} son pareja`, corazones: true },
            mudarse: { lugar: "casa", momento: 1, personas: [{ p, pose: "parado" }, { p: o, pose: "parado" }], hijos: conChicos(v), texto: `${p.nombre} y ${o.nombre} viven juntos`, corazones: true },
        }[esp.tipo];
        if (e) return escena.mostrar(e);
    }
    if (v.nacimiento && Date.now() - v.nacimiento.ts < 15 * 60000) {
        return escena.mostrar({ lugar: "casa", momento: 1, personas: [{ p, pose: "parado" }, ...(o ? [{ p: o, pose: "parado" }] : [])], hijos: conChicos(v), texto: `Llegó ${v.nacimiento.nombre} a la familia`, festejo: true, corazones: true });
    }
    if (!o) return escena.mostrar({ lugar: "casa", momento: v.reloj.momento, personas: [{ p, pose: "sentado" }], texto: `${p.nombre} está en casa` });
    if (!u) {
        // Antes del primer momento: cada uno en su casa
        const enCasa = (per) => ({ lugar: "casa", momento: v.reloj.momento, personas: [{ p: per, pose: "sentado" }], etiqueta: per.nombre });
        return escena.mostrar({ dividida: [enCasa(p), enCasa(o)], texto: `Empieza el día ${v.reloj.dia}. Cada uno en su casa.` });
    }
    const pose = (uid, l) => u.reaccion?.poses?.[uid] ?? (l === "casa" && u.momento === 2 ? "dormir" : POSES[l] ?? "parado");
    if (u.juntos) {
        const l = u.cita ?? u.lugares[yo];
        const cita = Boolean(u.cita);
        const poseCita = { cafe: "taza", cine: "sentado", restaurante: "comer" }[u.cita];
        return escena.mostrar({
            lugar: l, momento: u.momento,
            personas: [{ p, pose: u.reaccion?.poses?.[yo] ?? (cita ? poseCita : pose(yo, l)) }, { p: o, pose: u.reaccion?.poses?.[otro] ?? (cita ? poseCita : pose(otro, l)) }],
            hijos: l === "casa" ? conChicos(v) : [],
            texto: u.reaccion?.texto ?? (cita ? `${p.nombre} y ${o.nombre} tienen una cita` : `${p.nombre} y ${o.nombre} están en ${EN_LUGAR[l]}`),
            corazones: u.reaccion?.corazones ?? enamoradosEn(v),
        });
    }
    // Cada uno en su lugar: pantalla partida
    const parte = (uid, per) => {
        const l = u.lugares[uid];
        const enCasaJuntos = l === "casa" && juntosEn(v);
        return { lugar: l, momento: u.momento, personas: [{ p: per, pose: pose(uid, l) }], hijos: l === "casa" ? conChicos(v).slice(0, enCasaJuntos ? 2 : 1) : [], etiqueta: per.nombre };
    };
    escena.mostrar({
        dividida: [parte(yo, p), parte(otro, o)],
        texto: `${MOMENTOS[u.momento]}: ${p.nombre} en ${EN_LUGAR[u.lugares[yo]]}, ${o.nombre} en ${EN_LUGAR[u.lugares[otro]]}`,
    });
}

// ---------- Pintar ----------
function pintar() {
    const p = yoP();
    $("inicio").hidden = Boolean(mundo);
    $("crear").hidden = !mundo || Boolean(p);
    $("juego").hidden = !p;
    $("reloj").textContent = mundo?.reloj && p ? `Día ${mundo.reloj.dia} · ${MOMENTOS[mundo.reloj.momento]}` : "";
    if (!mundo) return pintarInicio();
    if (!p) return pintarCrear();
    pintarEscena();
    pintarTurno();
    pintarDecisiones();
    pintarFichas();
    pintarRelacion();
    pintarPropuestas();
    pintarLugares();
    pintarHistoria();
}

function pintarTurno() {
    const v = mundo;
    const o = otroP();
    const mia = v.elecciones[yo];
    let html = "";
    if (!o) html = `<span>${otro === BOT ? "" : `${nombresCuenta[otro] ?? "Tu amigo"} todavía no creó su personaje. Cuando entre, empiezan a vivir el mismo día.`}</span>`;
    else if (mia) {
        const espera = Date.now() - (v.eligio?.[yo] ?? Date.now());
        html = `<span>Elegiste ${EN_LUGAR[mia]}. Esperando que ${o.nombre} elija…</span>${espera > ESPERA_MAXIMA ? '<button type="button" id="sin-esperar">Seguir sin esperar</button>' : ""}`;
    } else html = `<span><b>${MOMENTOS[v.reloj.momento]} del día ${v.reloj.dia}.</b> ${v.elecciones[otro] ? `${o.nombre} ya eligió.` : `${o.nombre} está eligiendo.`} ¿A dónde vas vos?</span>`;
    if (v.cita && v.cita.dia === v.reloj.dia && v.cita.momento === v.reloj.momento) html += `<span class="cita-turno">Ahora tienen la cita: elijan cualquier lugar y van los dos ${CITAS[v.cita.lugar].frase}.</span>`;
    $("turno").innerHTML = html;
    $("sin-esperar")?.addEventListener("click", seguirSinEsperar);
}
// Revisa cada tanto si ya se puede seguir sin esperar
setInterval(() => mundo && yoP() && mundo.elecciones?.[yo] && pintarTurno(), 5000);

function pintarDecisiones() {
    const v = mundo;
    let html = "";
    const c = v.compartido;
    if (c && c.uids.includes(yo)) {
        const def = COMPARTIDOS[c.clave];
        const ya = c.respuestas[yo];
        html += `<div class="decision-v juntos"><span class="marca-v">Juntos</span><p>${def.t(nombre(c.uids[0]), nombre(c.uids[1]), c.lugar)}</p>
            ${ya === undefined ? `<p class="sub-v">¿Qué hacés? ${nombre(otro)} también elige.</p><div class="opciones-dec">${def.o.map(([t], i) => `<button type="button" data-comp="${i}">${t}</button>`).join("")}</div>` : `<p class="sub-v">Elegiste: ${def.o[ya][0]}. Esperando a ${nombre(otro)}…</p>`}</div>`;
    }
    const pe = v.pendientes[yo];
    if (pe) {
        const ev = PERSONALES[pe.lugar][pe.i];
        html += `<div class="decision-v"><span class="marca-v">Decidí</span><p>${ev.t}</p><div class="opciones-dec">${ev.o.map(([t], i) => `<button type="button" data-pers="${i}">${t}</button>`).join("")}</div></div>`;
    }
    $("decisiones").innerHTML = html;
}
$("decisiones").addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    if (b.dataset.comp !== undefined) responderCompartido(Number(b.dataset.comp));
    if (b.dataset.pers !== undefined) responderPersonal(Number(b.dataset.pers));
});

function ficha(uid, p) {
    const v = mundo;
    const listo = v.elecciones[uid] ? "Ya eligió" : "Eligiendo";
    return `<div class="ficha-v${uid === yo ? " mia" : ""}"><canvas data-avatar="${uid}" class="avatar-v" width="96" height="120"></canvas>
        <div><strong>${p.nombre}</strong><span>${edad(v)} años · ${puesto(p)}</span>
        <div class="barra-v"><span>Energía</span><i><b style="width:${limitar(p.energia)}%"></b></i></div>
        <div class="barra-v animo"><span>Ánimo</span><i><b style="width:${limitar(p.animo)}%"></b></i></div>
        <span class="plata-v">$${Math.round(p.plata)} · Est. ${p.estudio} · Fís. ${p.fisico}</span>
        <span class="estado-turno ${v.elecciones[uid] ? "listo" : ""}">${listo}</span></div></div>`;
}
let firmaFichas = "";
function pintarFichas() {
    const p = yoP();
    const o = otroP();
    const html = ficha(yo, p) + (o ? ficha(otro, o) : "");
    if (html === firmaFichas) return;
    firmaFichas = html;
    $("fichas-v").innerHTML = html;
    for (const cv of $("fichas-v").querySelectorAll("[data-avatar]")) dibujarPersona(cv, mundo.personajes[cv.dataset.avatar]);
}

function pintarRelacion() {
    const v = mundo;
    const o = otroP();
    const t = $("tarjeta-relacion");
    const rel = v.relacion;
    if (!o) {
        t.hidden = true;
        return;
    }
    t.hidden = false;
    if (rel.estado === "desconocidos") {
        t.innerHTML = `<p class="nota-rel"><b>${o.nombre} y vos todavía no se conocen.</b> Si eligen el mismo lugar con gente (facultad, gimnasio, café, plaza o bar) en el mismo momento, se cruzan. Pueden ponerse de acuerdo por el chat.</p>`;
        return;
    }
    const nivel = limitar(rel.nivel);
    const pendienteMia = (tipo) => Object.values(v.propuestas).some((pr) => pr.de === yo && pr.tipo === tipo);
    const pasos = Object.entries(PASOS).filter(([, paso]) => paso.desde.includes(rel.estado));
    const lista = hijosEn(v);
    t.innerHTML = `<div class="cabeza-rel"><div><strong>${yoP().nombre} y ${o.nombre}</strong><span class="etiqueta-rel">${ESTADOS[rel.estado]}</span>
            <div class="medidor-rel"><i><b style="width:${nivel}%"></b></i>${nivel}</div></div></div>
        ${v.embarazo ? `<p class="nota-rel">${nombre(v.embarazo.de)} está embarazada: el bebé llega el día ${v.embarazo.finDia}.</p>` : ""}
        ${lista.length ? `<div class="hijos-v">${lista.map((h) => `<span>${h.nombre}, ${Math.floor((v.reloj.dia - h.dia) / 10)} años</span>`).join("")}</div>` : ""}
        <div class="acciones-rel">
            <button type="button" data-accion="mensaje" ${yoP().mensaje === v.reloj.dia ? "disabled" : ""}>Mandar un mensaje<small>${yoP().mensaje === v.reloj.dia ? "Ya le escribiste hoy" : "Suma un poco, una vez por día"}</small></button>
            ${pasos.map(([tipo, paso]) => {
                const falta = nivel < paso.nivel;
                const espera = pendienteMia(tipo);
                return `<button type="button" data-paso="${tipo}" ${falta || espera ? "disabled" : ""}>${paso.nombre}<small>${espera ? "Esperando respuesta" : falta ? `Hace falta relación ${paso.nivel}` : "Disponible"}</small></button>`;
            }).join("")}
            ${enamoradosEn(v) ? `<button type="button" data-accion="terminar">Terminar<small>Vuelven a ser amigos</small></button>` : ""}
        </div>`;
}
$("tarjeta-relacion").addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b || b.disabled) return;
    if (b.dataset.accion === "mensaje") return mandarMensaje();
    if (b.dataset.accion === "terminar") return terminarRelacion();
    if (b.dataset.paso) pedirPaso(b.dataset.paso);
});

function pintarPropuestas() {
    const lista = Object.entries(mundo.propuestas).sort((a, b) => a[1].ts - b[1].ts);
    $("propuestas").innerHTML = lista
        .map(([id, pr]) => (pr.de === yo
            ? `<div class="propuesta-v mia"><p>Esperando que ${nombre(otro)} responda: ${PASOS[pr.tipo].nombre.toLowerCase()}${pr.tipo === "cita" ? ` (${CITAS[pr.lugar].frase})` : ""}.</p></div>`
            : `<div class="propuesta-v"><p>${textoPropuesta(pr)}</p><div class="botones-v"><button type="button" data-no="${id}">No</button><button class="si" type="button" data-si="${id}">Sí</button></div></div>`))
        .join("");
}
$("propuestas").addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    if (b.dataset.si) responder(b.dataset.si, true);
    if (b.dataset.no) responder(b.dataset.no, false);
});

const ICONOS = {
    trabajo: '<path d="M4 8h16v11H4zM9 8V5h6v3M4 13h16"/>',
    facultad: '<path d="M2 9l10-5 10 5-10 5zM6 11v5c3 2 9 2 12 0v-5"/>',
    gimnasio: '<path d="M3 12h18M6 8v8M18 8v8M3 10v4M21 10v4"/>',
    cafe: '<path d="M4 9h12v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5zM16 11h2a2 2 0 0 1 0 4h-2M8 3v3M12 3v3"/>',
    plaza: '<path d="M12 3v6M8 9h8l-1 4H9zM12 13v8M6 21h12"/>',
    bar: '<path d="M6 4h12l-6 8zM12 12v7M8 20h8"/>',
    casa: '<path d="M3 11l9-7 9 7M5 10v10h14V10M10 20v-6h4v6"/>',
};
const icono = (id) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICONOS[id]}</svg>`;
function pintarLugares() {
    const v = mundo;
    const p = yoP();
    const bloqueado = Boolean(v.elecciones[yo] || v.pendientes[yo] || (v.compartido && v.compartido.respuestas[yo] === undefined) || !otroP());
    $("momento-texto").textContent = v.pendientes[yo] || (v.compartido && v.compartido.respuestas[yo] === undefined) ? "Primero decidí arriba" : `${MOMENTOS[v.reloj.momento]} del día ${v.reloj.dia}`;
    $("lugares").innerHTML = Object.entries(LUGARES)
        .map(([id, L]) => {
            const sinEnergia = L.energia < 0 && p.energia + L.energia < 0;
            const sinPlata = (L.plata ?? 0) < 0 && p.plata + L.plata < 0;
            const efectos = [id === "trabajo" ? `+$${sueldo(p)}` : L.plata ? `-$${-L.plata}` : "", L.energia > 0 ? `+${L.energia} energía` : `${L.energia} energía`, L.animo > 0 ? `+${L.animo} ánimo` : ""].filter(Boolean).join(" · ");
            const elegido = v.elecciones[yo] === id ? " elegido" : "";
            return `<button class="lugar-v${elegido}" type="button" data-lugar="${id}" ${bloqueado || sinEnergia || sinPlata ? "disabled" : ""}>${icono(id)}<strong>${L.nombre}</strong><small>${L.detalle}</small><span class="efectos-v">${efectos}</span></button>`;
        })
        .join("");
}
$("lugares").addEventListener("click", (e) => {
    const b = e.target.closest("[data-lugar]");
    if (b && !b.disabled) elegir(b.dataset.lugar);
});

function pintarHistoria() {
    const items = Object.values(mundo.historia).sort((a, b) => b.ts - a.ts).slice(0, 30);
    $("diario").innerHTML = items.map((d) => `<li class="${d.especial ? "especial" : ""}">${d.t}</li>`).join("");
}

// ---------- Inicio y crear personaje ----------
function pintarInicio() {
    const cv = $("portada");
    const ctx = cv.getContext("2d");
    const g = ctx.createLinearGradient(0, 0, 0, cv.height);
    g.addColorStop(0, "#252c4c");
    g.addColorStop(1, "#141829");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.strokeStyle = "#ffffff22";
    ctx.lineWidth = 3;
    ctx.setLineDash([6, 8]);
    ctx.beginPath();
    ctx.moveTo(20, 180);
    ctx.bezierCurveTo(120, 160, 140, 60, 300, 30);
    ctx.moveTo(300, 180);
    ctx.bezierCurveTo(200, 160, 180, 60, 20, 30);
    ctx.stroke();
    ctx.setLineDash([]);
    dibujarPersona(cv, { piel: PIELES[1], pelo: PELOS[1], peinado: "largo", ropa: ROPAS[0] }, { escala: 0.95, x: 0.33 });
    dibujarPersona(cv, { piel: PIELES[3], pelo: PELOS[0], peinado: "corto", ropa: ROPAS[2] }, { escala: 0.95, x: 0.67 });
    const guardada = cargar(CLAVE_PRACTICA, null);
    $("practica").textContent = guardada?.personajes?.[yo] ? "Seguir la vida de práctica" : "Probar con un personaje de la compu";
}

const borrador = { nombre: "", genero: null, piel: PIELES[1], pelo: PELOS[1], peinado: "corto", ropa: ROPAS[0] };
function pintarCrear() {
    const marcar = (id, valor) => {
        for (const b of $(id).querySelectorAll("button")) b.classList.toggle("activo", b.dataset.v === valor);
    };
    if (!$("piel").children.length) {
        $("piel").innerHTML = PIELES.map((c) => `<button type="button" data-v="${c}" style="--c:${c}" aria-label="Piel"></button>`).join("");
        $("pelo").innerHTML = PELOS.map((c) => `<button type="button" data-v="${c}" style="--c:${c}" aria-label="Pelo"></button>`).join("");
        $("ropa").innerHTML = ROPAS.map((c) => `<button type="button" data-v="${c}" style="--c:${c}" aria-label="Ropa"></button>`).join("");
        $("peinado").innerHTML = Object.entries(PEINADOS).map(([id, n]) => `<button type="button" data-v="${id}">${n}</button>`).join("");
    }
    for (const id of ["genero", "piel", "pelo", "peinado", "ropa"]) marcar(id, borrador[id]);
    const cv = $("vista-previa");
    limpiar(cv);
    dibujarPersona(cv, borrador);
    $("nacer").disabled = !borrador.genero || !$("nombre").value.trim();
}
for (const id of ["genero", "piel", "pelo", "peinado", "ropa"]) {
    $(id).addEventListener("click", (e) => {
        const b = e.target.closest("button");
        if (!b) return;
        borrador[id] = b.dataset.v;
        if (id === "genero" && !$("nombre").value.trim()) $("nombre").placeholder = `Por ejemplo, ${azar(NOMBRES[b.dataset.v])}`;
        pintarCrear();
    });
}
$("nombre").addEventListener("input", pintarCrear);
$("nacer").addEventListener("click", () => {
    const n = $("nombre").value.trim().slice(0, 16);
    if (!n || !borrador.genero) return;
    const personaje = { ...borrador, nombre: n, energia: 100, animo: 70, plata: 150, estudio: 0, fisico: 0, trabajoXp: 0, ultimo: "casa" };
    accion((v) => {
        v.personajes[yo] = personaje;
        if (!refPartida && !v.personajes[BOT]) v.personajes[BOT] = crearBot(personaje);
        anotar(v, `Empieza la vida de ${n}, ${edad(v)} años.`);
        v.reloj.desde = Date.now();
    });
});

// ---------- Arranque ----------
$("practica").addEventListener("click", () => {
    const guardada = cargar(CLAVE_PRACTICA, null);
    mundo = normalizar(guardada?.personajes ? guardada : datosIniciales().vida);
    otro = BOT;
    pintar();
});

if (idPartida) {
    const online = await import("../../js/multijugador.js");
    fs = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js");
    db = online.db;
    refPartida = fs.doc(db, "partidas", idPartida);
    online.iniciarPresencia("Vidas cruzadas");
    online.escucharPartida(
        idPartida,
        (p) => {
            if (!p) {
                mundo = null;
                return avisar("Esta partida ya no existe");
            }
            if (p.estado === "invitada" && p.creador !== yo) online.aceptarPartida(p);
            otro = p.jugadores.find((j) => j !== yo);
            nombresCuenta = p.nombres ?? {};
            mundo = normalizar(p.vida ?? datosIniciales().vida);
            pintar();
        },
        () => avisar("No tenés acceso a esta partida")
    );
} else {
    pintar();
    if (usuario.uid) {
        import("../../js/multijugador.js").then((m) =>
            m.escucharPartidas((lista) => {
                const vidas = lista.filter((p) => p.juego === "vida");
                $("en-curso").innerHTML = vidas.map((p) => `<a href="?partida=${p.id}">Seguir la vida con ${p.nombres[p.jugadores.find((j) => j !== yo)]}</a>`).join("");
            })
        );
    }
}
