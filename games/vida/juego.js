// Vidas cruzadas: cada jugador crea su personaje y vive su vida por días (mañana, tarde y noche),
// a su propio ritmo. Si los dos van al mismo lugar en el mismo día y momento, se cruzan. Desde ahí
// la relación avanza con propuestas que el otro acepta o rechaza: citas, salir, pareja, vivir juntos,
// casamiento e hijos. Online se guarda en la partida de Firestore (campo "vida"); para probar sin un
// amigo hay un modo con un personaje de la compu que vive en el mismo barrio.
import { exigirSesion } from "../../js/sesion.js";
import { cargar, guardar, vibrar } from "../../js/comun3d.js";
import { MOMENTOS, LUGARES, PASOS, ESTADOS, CITAS, CHANCE_EMBARAZO, CHANCE_CON_PROTECCION, DIAS_EMBARAZO, datosIniciales } from "./reglas.js";

const $ = (id) => document.getElementById(id);
const usuario = await exigirSesion();
const yo = usuario.uid ?? "yo";
const idPartida = new URLSearchParams(location.search).get("partida");
const CLAVE_PRACTICA = "vida-practica";
const BOT = "bot";

const PIELES = ["#f3d2b3", "#e6b48f", "#c98e62", "#9a6440", "#6b4128", "#47291a"];
const PELOS = ["#1e1a19", "#4a2f22", "#8a5a32", "#d8b36a", "#b7472a", "#9ca3af"];
const ROPAS = ["#ff7a6b", "#5ad1c2", "#6c8cff", "#ffc86b", "#b07cff", "#2f3550", "#e9edf3"];
const PEINADOS = { corto: "Corto", largo: "Largo", rulos: "Rulos", recogido: "Recogido" };
const NOMBRES = {
    mujer: ["Lucía", "Martina", "Sofía", "Valentina", "Camila", "Julieta", "Agustina", "Florencia", "Carolina", "Paula"],
    hombre: ["Mateo", "Santiago", "Joaquín", "Tomás", "Nicolás", "Facundo", "Lucas", "Martín", "Franco", "Ignacio"],
};

let mundo = null; // los datos de la vida compartida
let otro = null; // uid del otro jugador (o "bot")
let nombresCuenta = {};
let refPartida = null;
let fs = null; // funciones de Firestore (solo online)

const azar = (lista) => lista[Math.floor(Math.random() * lista.length)];
const limitar = (n) => Math.max(0, Math.min(100, Math.round(n)));
const yoP = () => mundo?.personajes?.[yo];
const otroP = () => (otro ? mundo?.personajes?.[otro] : null);
const nombre = (uid) => mundo?.personajes?.[uid]?.nombre ?? nombresCuenta[uid] ?? "Alguien";
const nivelRel = () => limitar(mundo.relacion.nivel);
const nuevoId = () => `i${Date.now().toString(36)}${Math.floor(Math.random() * 1e4).toString(36)}`;

// ---------- Guardar cambios ----------
// cambios: { "ruta.con.puntos": valor | inc(n) | BORRAR }. Se aplican ya en pantalla y después se guardan.
const inc = (n) => ({ __inc: n });
const BORRAR = { __borrar: true };
function aplicarLocal(obj, ruta, valor) {
    const partes = ruta.split(".");
    let o = obj;
    for (let i = 0; i < partes.length - 1; i++) {
        if (o[partes[i]] == null || typeof o[partes[i]] !== "object") o[partes[i]] = {};
        o = o[partes[i]];
    }
    const k = partes.at(-1);
    if (valor?.__inc !== undefined) o[k] = (o[k] ?? 0) + valor.__inc;
    else if (valor?.__borrar) delete o[k];
    else o[k] = valor;
}
function cambiar(cambios, extra = {}) {
    for (const [r, v] of Object.entries(cambios)) aplicarLocal(mundo, r, v);
    if (refPartida) {
        const datos = { actualizada: fs.serverTimestamp(), ...extra };
        for (const [r, v] of Object.entries(cambios)) {
            datos[`vida.${r}`] = v?.__inc !== undefined ? fs.increment(v.__inc) : v?.__borrar ? fs.deleteField() : v;
        }
        fs.updateDoc(refPartida, datos).catch(() => avisar("No se pudo guardar: revisá la conexión"));
    } else {
        guardar(CLAVE_PRACTICA, mundo);
    }
    pintar();
}

// ---------- Dibujo de personas ----------
function dibujarPersona(cv, p, { escala = 1, x = 0.5 } = {}) {
    const ctx = cv.getContext("2d");
    if (!p) return;
    const s = Math.min(cv.width / 100, cv.height / 130) * escala;
    ctx.save();
    ctx.translate(cv.width * x, cv.height);
    ctx.scale(s, s);
    // Pelo de atrás (largo)
    ctx.fillStyle = p.pelo;
    if (p.peinado === "largo") {
        ctx.beginPath();
        ctx.roundRect(-28, -120, 56, 70, 26);
        ctx.fill();
    }
    // Cuerpo
    ctx.fillStyle = p.ropa;
    ctx.beginPath();
    ctx.roundRect(-34, -58, 68, 62, [26, 26, 6, 6]);
    ctx.fill();
    ctx.fillStyle = "#00000022";
    ctx.beginPath();
    ctx.roundRect(-34, -20, 68, 24, 6);
    ctx.fill();
    // Cuello y cabeza
    ctx.fillStyle = p.piel;
    ctx.beginPath();
    ctx.roundRect(-8, -70, 16, 16, 4);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(0, -92, 23, 26, 0, 0, Math.PI * 2);
    ctx.fill();
    // Pelo de adelante
    ctx.fillStyle = p.pelo;
    if (p.peinado === "rulos") {
        for (const [dx, dy, r] of [[-18, -104, 10], [-6, -114, 11], [8, -113, 11], [19, -103, 10], [-22, -92, 8], [23, -92, 8]]) {
            ctx.beginPath();
            ctx.arc(dx, dy, r, 0, Math.PI * 2);
            ctx.fill();
        }
    } else {
        ctx.beginPath();
        ctx.ellipse(0, -100, 25, 20, 0, Math.PI, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(-25, -100);
        ctx.quadraticCurveTo(-8, p.peinado === "corto" ? -96 : -92, 6, -101);
        ctx.quadraticCurveTo(16, -95, 25, -100);
        ctx.lineTo(25, -104);
        ctx.lineTo(-25, -104);
        ctx.fill();
        if (p.peinado === "recogido") {
            ctx.beginPath();
            ctx.arc(0, -123, 10, 0, Math.PI * 2);
            ctx.fill();
        }
        if (p.peinado === "largo") {
            ctx.beginPath();
            ctx.roundRect(-26, -100, 7, 34, 4);
            ctx.roundRect(19, -100, 7, 34, 4);
            ctx.fill();
        }
    }
    // Cara
    ctx.fillStyle = "#1d1d2b";
    for (const dx of [-8, 8]) {
        ctx.beginPath();
        ctx.ellipse(dx, -90, 2.4, 3, 0, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.strokeStyle = "#00000070";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.arc(0, -84, 6, 0.2 * Math.PI, 0.8 * Math.PI);
    ctx.stroke();
    ctx.restore();
}
function limpiar(cv) {
    cv.getContext("2d").clearRect(0, 0, cv.width, cv.height);
}

// ---------- Íconos de los lugares (líneas simples) ----------
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

// ---------- Vida diaria ----------
const edad = (p) => 18 + Math.floor((p.dia - 1) / 10);
const puesto = (p) => (p.estudio >= 20 ? "Profesional" : p.estudio >= 8 ? (p.genero === "mujer" ? "Administrativa" : "Administrativo") : p.genero === "mujer" ? "Cajera" : "Cajero");
const sueldo = (p) => (p.estudio >= 20 ? 100 : p.estudio >= 8 ? 60 : 35) + Math.min(40, Math.floor((p.trabajoXp ?? 0) / 4) * 2);
const hijos = () => Object.values(mundo.hijos ?? {});
const juntos = () => ["convivencia", "casados"].includes(mundo.relacion.estado);

function anotar(cambios, p, texto) {
    const diario = [{ t: texto, dia: p.dia, ts: Date.now() }, ...(p.diario ?? [])].slice(0, 40);
    p.diario = diario;
    cambios[`personajes.${yo}.diario`] = diario;
}
function historia(cambios, texto) {
    cambios[`historia.${nuevoId()}`] = { t: texto, ts: Date.now() };
}

function hacer(id) {
    const p = yoP();
    const L = LUGARES[id];
    if (L.energia < 0 && p.energia + L.energia < 0) return avisar("Estás sin energía: andá a casa a descansar");
    if ((L.plata ?? 0) < 0 && p.plata + L.plata < 0) return avisar("No te alcanza la plata para eso");
    vibrar(10);
    const b = `personajes.${yo}`;
    const cambios = {};
    let plata = p.plata + (L.plata ?? 0);
    let texto = `${MOMENTOS[p.momento]}: ${L.nombre.toLowerCase()}.`;
    if (id === "trabajo") {
        const s = sueldo(p);
        plata += s;
        cambios[`${b}.trabajoXp`] = (p.trabajoXp ?? 0) + 1;
        texto = `${MOMENTOS[p.momento]}: trabajaste de ${puesto(p).toLowerCase()} y ganaste $${s}.`;
    } else if (id === "facultad") {
        cambios[`${b}.estudio`] = p.estudio + 1;
        if (p.estudio + 1 === 8 || p.estudio + 1 === 20) texto += " Ya podés trabajar de algo mejor.";
    } else if (id === "gimnasio") cambios[`${b}.fisico`] = p.fisico + 1;
    cambios[`${b}.plata`] = plata;
    cambios[`${b}.energia`] = limitar(p.energia + L.energia);
    cambios[`${b}.animo`] = limitar(p.animo + L.animo);
    const clave = `d${p.dia}m${p.momento}`;
    cambios[`${b}.agenda.${clave}`] = id;
    anotar(cambios, p, texto);

    // ¿Se cruzaron? Los dos en el mismo lugar, el mismo día y momento
    const o = otroP();
    const cruce = L.social && o?.agenda?.[clave] === id;
    avanzarMomento(cambios, p);
    cambiar(cambios);
    if (cruce) encuentro(id);
}

function avanzarMomento(cambios, p) {
    const b = `personajes.${yo}`;
    if (p.momento < 2) {
        cambios[`${b}.momento`] = p.momento + 1;
        return;
    }
    // Fin del día: gastos, descanso, hijos, embarazo y algo que puede pasar
    const gastos = (juntos() ? 12 : 20) + hijos().length * 10;
    const tras = { ...p, ...Object.fromEntries(Object.entries(cambios).filter(([k]) => k.startsWith(b + ".")).map(([k, v]) => [k.slice(b.length + 1), v])) };
    let plata = tras.plata - gastos;
    let animo = tras.animo + hijos().length * 2 + (["pareja", "convivencia", "casados"].includes(mundo.relacion.estado) ? 3 : 0);
    let energia = tras.energia + 30;
    let nota = `Terminó el día ${p.dia}. Gastos: $${gastos}${juntos() ? " (la casa se comparte)" : ""}.`;
    if (plata < 0) {
        plata = 0;
        animo -= 12;
        nota += " No te alcanzó para todo.";
    }
    // Algo que pasa cada tanto
    const r = Math.random();
    if (r < 0.08) {
        plata += 25;
        nota += " Encontraste $25 en una campera vieja.";
    } else if (r < 0.15) {
        energia -= 20;
        nota += " Te resfriaste un poco.";
    } else if (r < 0.22) {
        animo += 10;
        nota += " Un amigo te invitó a comer.";
    } else if (r < 0.27 && (p.trabajoXp ?? 0) > 8) {
        cambios[`${b}.trabajoXp`] = (tras.trabajoXp ?? 0) + 6;
        nota += " En el trabajo te felicitaron: te suben el sueldo.";
    } else if (r < 0.32) {
        plata = Math.max(0, plata - 30);
        nota += " Se te rompió el celular: $30.";
    }
    cambios[`${b}.plata`] = plata;
    cambios[`${b}.animo`] = limitar(animo);
    cambios[`${b}.energia`] = limitar(energia);
    cambios[`${b}.momento`] = 0;
    cambios[`${b}.dia`] = p.dia + 1;
    anotar(cambios, p, nota);
    // Embarazo: nace a los 9 días de la mamá
    const emb = mundo.embarazo;
    if (emb && emb.de === yo && p.dia + 1 >= emb.finDia) nacer(cambios, yo);
    if (!refPartida) setTimeout(avanzarBot, 400);
}

function nacer(cambios, madre) {
    const genero = Math.random() < 0.5 ? "mujer" : "hombre";
    const nombreHijo = azar(NOMBRES[genero]);
    const id = nuevoId();
    cambios[`hijos.${id}`] = { nombre: nombreHijo, genero, dia: mundo.personajes[madre].dia + 1, piel: azar([mundo.personajes[madre].piel, otroDe(madre)?.piel ?? PIELES[1]]), pelo: azar([mundo.personajes[madre].pelo, otroDe(madre)?.pelo ?? PELOS[0]]) };
    cambios.embarazo = null;
    historia(cambios, `Nació ${nombreHijo}. ${genero === "mujer" ? "Es una nena" : "Es un nene"} y tiene los ojos de los dos.`);
    if (madre === yo || !refPartida) setTimeout(() => {
        ventana(`<h3>¡Nació ${nombreHijo}!</h3><p>${genero === "mujer" ? "Es una nena" : "Es un nene"}. A partir de ahora suma alegría cada día, y también gastos.</p>
            <button class="boton-v principal" type="button">Bienvenido al mundo</button>`, (v) => v.querySelector("button").addEventListener("click", cerrarVentana));
    }, 600);
}
const otroDe = (uid) => mundo.personajes[uid === yo ? otro : yo];

const EN_LUGAR = { facultad: "la facultad", gimnasio: "el gimnasio", cafe: "el café", plaza: "la plaza", bar: "el bar" };
function encuentro(lugar) {
    const o = otroP();
    const primera = mundo.relacion.estado === "desconocidos";
    vibrar([20, 40, 20]);
    ventana(`<h3>${primera ? `Conociste a ${o.nombre}` : `Te cruzaste con ${o.nombre}`}</h3>
        <p>${primera ? `Estaban los dos en ${EN_LUGAR[lugar]} y se pusieron a hablar.` : `Coincidieron otra vez en ${EN_LUGAR[lugar]}.`}</p>
        <canvas id="cruce" width="240" height="130" style="width:100%;max-width:300px;height:auto;margin:0 auto;border-radius:14px;background:linear-gradient(180deg,#252c4c,#171b2e)"></canvas>
        <div class="opciones-v">
            <button type="button" data-r="charlar">Quedarte charlando <span>+relación</span></button>
            <button type="button" data-r="saludar">Saludar y seguir <span>poquito</span></button>
        </div>`, (v) => {
        const cv = v.querySelector("#cruce");
        dibujarPersona(cv, yoP(), { escala: 0.95, x: 0.3 });
        dibujarPersona(cv, o, { escala: 0.95, x: 0.7 });
        for (const b of v.querySelectorAll("[data-r]")) {
            b.addEventListener("click", () => {
                const charla = b.dataset.r === "charlar";
                const cambios = {};
                if (primera) cambios["relacion.estado"] = "conocidos";
                cambios["relacion.nivel"] = inc((primera ? 5 : 2) + (charla ? 4 + Math.floor(Math.random() * 3) : 0));
                historia(cambios, primera ? `${yoP().nombre} y ${o.nombre} se conocieron en ${EN_LUGAR[lugar]}.` : `${yoP().nombre} y ${o.nombre} se cruzaron en ${EN_LUGAR[lugar]}${charla ? " y se quedaron charlando" : ""}.`);
                revisarAmistad(cambios);
                cerrarVentana();
                cambiar(cambios);
            });
        }
    });
}
function revisarAmistad(cambios) {
    const nivel = mundo.relacion.nivel + (cambios["relacion.nivel"]?.__inc ?? 0);
    if (["conocidos"].includes(cambios["relacion.estado"] ?? mundo.relacion.estado) && nivel >= 20) cambios["relacion.estado"] = "amigos";
}

// ---------- Relación ----------
function mandarMensaje() {
    const p = yoP();
    if (p.mensaje === p.dia) return avisar("Ya le escribiste hoy");
    const cambios = { [`personajes.${yo}.mensaje`]: p.dia, "relacion.nivel": inc(2 + (p.animo > 60 ? 1 : 0)) };
    historia(cambios, `${p.nombre} le escribió a ${otroP().nombre}.`);
    revisarAmistad(cambios);
    cambiar(cambios);
    avisar("Mensaje enviado");
}

function proponer(tipo, datos = {}) {
    const cambios = { [`propuestas.${nuevoId()}`]: { de: yo, tipo, ...datos, ts: Date.now() } };
    cerrarVentana();
    cambiar(cambios, { turno: otro });
    avisar(`Le llegó tu propuesta a ${otroP().nombre}`);
    if (!refPartida) setTimeout(responderBot, 1500);
}

function pedirPaso(tipo) {
    const o = otroP();
    if (tipo === "cita") {
        return ventana(`<h3>Invitar a ${o.nombre} a una cita</h3><p>Paga el que invita. Cuanto mejor la salida, más suma.</p>
            <div class="opciones-v">${Object.entries(CITAS).map(([id, c]) => `<button type="button" data-c="${id}" ${yoP().plata < c.costo ? "disabled" : ""}>${c.nombre}<span>$${c.costo}</span></button>`).join("")}</div>
            <button class="boton-v" type="button" data-cerrar>Mejor no</button>`, (v) => {
            for (const b of v.querySelectorAll("[data-c]")) b.addEventListener("click", () => proponer("cita", { lugar: b.dataset.c }));
            v.querySelector("[data-cerrar]").addEventListener("click", cerrarVentana);
        });
    }
    if (tipo === "noche") {
        return ventana(`<h3>Pasar la noche con ${o.nombre}</h3><p>¿Usan protección? Con protección la chance de embarazo baja un 99%.</p>
            <div class="opciones-v">
                <button type="button" data-p="1">Con protección <span>casi sin chance</span></button>
                <button type="button" data-p="0">Sin protección <span>puede haber bebé</span></button>
            </div>
            <button class="boton-v" type="button" data-cerrar>Mejor otro día</button>`, (v) => {
            for (const b of v.querySelectorAll("[data-p]")) b.addEventListener("click", () => proponer("noche", { proteccion: b.dataset.p === "1" }));
            v.querySelector("[data-cerrar]").addEventListener("click", cerrarVentana);
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
        <div class="botones-v"><button type="button" data-cerrar>Todavía no</button><button class="si" type="button" data-si>Proponer</button></div>`, (v) => {
        v.querySelector("[data-si]").addEventListener("click", () => proponer(tipo));
        v.querySelector("[data-cerrar]").addEventListener("click", cerrarVentana);
    });
}

function terminarRelacion() {
    ventana(`<h3>Terminar la relación</h3><p>Vuelven a ser amigos y la relación baja bastante. Si vivían juntos, cada uno vuelve a su casa.</p>
        <div class="botones-v"><button type="button" data-cerrar>No</button><button class="si" type="button" data-si>Terminar</button></div>`, (v) => {
        v.querySelector("[data-cerrar]").addEventListener("click", cerrarVentana);
        v.querySelector("[data-si]").addEventListener("click", () => {
            const cambios = { "relacion.estado": "amigos", "relacion.nivel": inc(-30) };
            historia(cambios, `${yoP().nombre} y ${otroP().nombre} terminaron.`);
            cerrarVentana();
            cambiar(cambios);
        });
    });
}

const textoPropuesta = (pr) => {
    const de = nombre(pr.de);
    if (pr.tipo === "cita") return `${de} te invita ${CITAS[pr.lugar].frase}`;
    if (pr.tipo === "noche") return `${de} quiere pasar la noche con vos${pr.proteccion ? " (con protección)" : " (sin protección)"}`;
    return { salir: `${de} te propone empezar a salir`, pareja: `${de} te pregunta si querés ser su pareja`, mudarse: `${de} te propone vivir juntos`, casarse: `${de} te pide casamiento`, adoptar: `${de} te propone adoptar un hijo` }[pr.tipo];
};

// quien: el que responde (yo, o el bot en la práctica)
function responder(id, acepta, quien = yo) {
    const pr = mundo.propuestas[id];
    if (!pr) return;
    const de = pr.de;
    const A = nombre(de);
    const B = nombre(quien);
    const cambios = { [`propuestas.${id}`]: BORRAR };
    if (!acepta) {
        cambios["relacion.nivel"] = inc(-3);
        historia(cambios, `${B} le dijo que no a ${A}.`);
        cambiar(cambios, { turno: null });
        return;
    }
    if (pr.tipo === "cita") {
        const c = CITAS[pr.lugar];
        const fisico = Math.min(4, Math.floor(((mundo.personajes[de]?.fisico ?? 0) + (mundo.personajes[quien]?.fisico ?? 0)) / 6));
        const suma = c.base + fisico + Math.floor(Math.random() * 6) - 2;
        cambios["relacion.nivel"] = inc(suma);
        cambios[`personajes.${de}.plata`] = inc(-c.costo);
        cambios[`personajes.${de}.animo`] = inc(8);
        cambios[`personajes.${quien}.animo`] = inc(8);
        historia(cambios, `${A} y ${B} fueron ${c.frase}. ${suma >= 12 ? "La pasaron bárbaro." : suma >= 7 ? "La pasaron bien." : "Estuvo un poco incómodo."}`);
        revisarAmistad(cambios);
    } else if (pr.tipo === "noche") {
        cambios["relacion.nivel"] = inc(6);
        historia(cambios, `${A} y ${B} pasaron la noche juntos.`);
        const pA = mundo.personajes[de];
        const pB = mundo.personajes[quien];
        const madre = pA.genero === "mujer" && pB.genero === "hombre" ? de : pB.genero === "mujer" && pA.genero === "hombre" ? quien : null;
        const chance = pr.proteccion ? CHANCE_CON_PROTECCION : CHANCE_EMBARAZO;
        if (madre && !mundo.embarazo && Math.random() < chance) {
            cambios.embarazo = { de: madre, finDia: mundo.personajes[madre].dia + DIAS_EMBARAZO };
            historia(cambios, `¡${nombre(madre)} está embarazada! El bebé llega en ${DIAS_EMBARAZO} días.`);
        }
        if (quien === yo || de === yo) setTimeout(() => fundido(`${A} y ${B} pasaron la noche juntos.`), 150);
    } else if (pr.tipo === "adoptar") {
        const genero = Math.random() < 0.5 ? "mujer" : "hombre";
        const n = azar(NOMBRES[genero]);
        cambios[`hijos.${nuevoId()}`] = { nombre: n, genero, dia: mundo.personajes[quien].dia, piel: azar(PIELES), pelo: azar(PELOS) };
        cambios["relacion.nivel"] = inc(5);
        historia(cambios, `${A} y ${B} adoptaron a ${n}.`);
    } else {
        cambios["relacion.estado"] = PASOS[pr.tipo].a;
        cambios["relacion.nivel"] = inc(pr.tipo === "casarse" ? 8 : 5);
        historia(cambios, {
            salir: `${A} y ${B} empezaron a salir.`,
            pareja: `${A} y ${B} son pareja.`,
            mudarse: `${A} y ${B} se mudaron juntos.`,
            casarse: `${A} y ${B} se casaron.`,
        }[pr.tipo]);
        if (pr.tipo === "casarse" && (quien === yo || de === yo)) setTimeout(() => fundido(`${A} y ${B} se casaron. Fue una fiesta hermosa.`), 150);
    }
    cambiar(cambios, { turno: null });
}

// ---------- Personaje de la compu (modo práctica) ----------
function crearBot(mio) {
    const genero = mio.genero === "mujer" ? "hombre" : "mujer";
    const social = Object.keys(LUGARES).filter((l) => LUGARES[l].social);
    return {
        nombre: azar(NOMBRES[genero]), genero, piel: azar(PIELES), pelo: azar(PELOS.slice(0, 5)), peinado: genero === "mujer" ? azar(["largo", "recogido", "rulos"]) : azar(["corto", "rulos"]),
        ropa: azar(ROPAS), dia: 1, momento: 0, energia: 100, animo: 70, plata: 150, estudio: 0, fisico: 0, trabajoXp: 0, agenda: {}, diario: [],
        favorito: { lugar: azar(social), momento: Math.floor(Math.random() * 3) },
    };
}
// El bot arma su día por adelantado: así, si vas al mismo lugar, se cruzan
function avanzarBot() {
    const b = mundo.personajes[BOT];
    const p = yoP();
    if (!b || !p) return;
    const social = Object.keys(LUGARES).filter((l) => LUGARES[l].social);
    for (let dia = b.dia; dia <= p.dia; dia++) {
        for (let m = 0; m < 3; m++) {
            const k = `d${dia}m${m}`;
            if (b.agenda[k]) continue;
            b.agenda[k] = m === b.favorito.momento && Math.random() < 0.6 ? b.favorito.lugar : Math.random() < 0.35 ? "trabajo" : azar(social);
        }
    }
    const nuevoDia = b.dia < p.dia;
    b.dia = p.dia;
    // Cada día nuevo, si ya se conocen, a veces propone algo
    const yaPropuso = Object.values(mundo.propuestas).some((pr) => pr.de === BOT);
    if (nuevoDia && !yaPropuso && mundo.relacion.estado !== "desconocidos" && Math.random() < 0.35) {
        const posibles = Object.entries(PASOS).filter(([tipo, paso]) => paso.desde.includes(mundo.relacion.estado) && nivelRel() >= paso.nivel && tipo !== "adoptar");
        if (posibles.length) {
            const [tipo] = posibles.at(-1)[1].a && Math.random() < 0.5 ? posibles.at(-1) : azar(posibles);
            const datos = tipo === "cita" ? { lugar: azar(Object.keys(CITAS)) } : tipo === "noche" ? { proteccion: Math.random() < 0.7 } : {};
            mundo.propuestas[nuevoId()] = { de: BOT, tipo, ...datos, ts: Date.now() };
        }
    }
    // Si la mamá es el bot, también cuenta sus días de embarazo
    if (mundo.embarazo?.de === BOT && b.dia >= mundo.embarazo.finDia) {
        const cambios = {};
        nacer(cambios, BOT);
        for (const [r, v] of Object.entries(cambios)) aplicarLocal(mundo, r, v);
    }
    guardar(CLAVE_PRACTICA, mundo);
    pintar();
}
function responderBot() {
    for (const [id, pr] of Object.entries(mundo.propuestas)) {
        if (pr.de !== yo) continue;
        const chance = { cita: 0.85, salir: 0.75, pareja: 0.75, noche: 0.7, mudarse: 0.8, casarse: 0.85, adoptar: 0.8 }[pr.tipo] ?? 0.7;
        const animoBot = mundo.personajes[BOT].animo;
        responder(id, Math.random() < chance + (animoBot > 70 ? 0.05 : 0), BOT);
    }
}

// ---------- Pintar ----------
function pintar() {
    const p = yoP();
    $("inicio").hidden = Boolean(mundo);
    $("crear").hidden = !mundo || Boolean(p);
    $("juego").hidden = !p;
    $("reloj").textContent = p ? `Día ${p.dia} · ${MOMENTOS[p.momento]}` : "";
    if (!mundo) return pintarInicio();
    if (!p) return pintarCrear();
    pintarJuego();
}

function pintarInicio() {
    const cv = $("portada");
    const ctx = cv.getContext("2d");
    const g = ctx.createLinearGradient(0, 0, 0, cv.height);
    g.addColorStop(0, "#252c4c");
    g.addColorStop(1, "#141829");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, cv.width, cv.height);
    // Dos caminos que se cruzan
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

// Borrador del personaje que se está creando
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
    dibujarPersona(cv, borrador, { escala: 1 });
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
    const personaje = { ...borrador, nombre: n, dia: 1, momento: 0, energia: 100, animo: 70, plata: 150, estudio: 0, fisico: 0, trabajoXp: 0, agenda: {}, diario: [{ t: `Empieza la vida de ${n}, ${edad({ dia: 1 })} años.`, dia: 1, ts: Date.now() }] };
    const cambios = { [`personajes.${yo}`]: personaje };
    if (!refPartida && !mundo.personajes[BOT]) cambios[`personajes.${BOT}`] = crearBot(personaje);
    cambiar(cambios);
    if (!refPartida) avanzarBot();
});

let firmaAvatares = "";
function pintarJuego() {
    const p = yoP();
    const o = otroP();
    const firma = JSON.stringify([p.piel, p.pelo, p.peinado, p.ropa, o?.piel, o?.pelo, o?.peinado, o?.ropa, mundo.relacion.estado]);
    if (firma !== firmaAvatares) {
        firmaAvatares = firma;
        limpiar($("avatar-yo"));
        dibujarPersona($("avatar-yo"), p);
    }
    $("nombre-yo").textContent = p.nombre;
    $("detalle-yo").textContent = `${edad(p)} años · ${puesto(p)} ($${sueldo(p)} por turno)`;
    $("b-energia").style.width = `${limitar(p.energia)}%`;
    $("b-animo").style.width = `${limitar(p.animo)}%`;
    $("plata").textContent = `$${Math.max(0, Math.round(p.plata))}`;
    $("estudio").textContent = p.estudio;
    $("fisico").textContent = p.fisico;
    pintarRelacion();
    pintarPropuestas();
    pintarLugares();
    pintarDiario();
}

// Rumor: el lugar y momento al que más va el otro (ayuda a cruzarse)
function rumor() {
    const o = otroP();
    if (!o?.agenda) return null;
    const cuenta = {};
    for (const [k, l] of Object.entries(o.agenda)) {
        if (!LUGARES[l]?.social) continue;
        const m = Number(k.split("m")[1]);
        cuenta[`${l}|${m}`] = (cuenta[`${l}|${m}`] ?? 0) + 1;
    }
    const mejor = Object.entries(cuenta).sort((a, b) => b[1] - a[1])[0];
    if (!mejor || mejor[1] < 2) return null;
    const [lugar, m] = mejor[0].split("|");
    return { lugar, momento: Number(m) };
}

function pintarRelacion() {
    const o = otroP();
    const t = $("tarjeta-relacion");
    const rel = mundo.relacion;
    if (!o) {
        t.innerHTML = `<p class="nota-rel">${otro ? `${nombresCuenta[otro] ?? "Tu amigo"} todavía no creó su personaje. Mientras tanto, viví tu vida: cuando empiece, van a poder cruzarse.` : "Esperando al otro jugador."}</p>`;
        return;
    }
    if (rel.estado === "desconocidos") {
        const r = rumor();
        t.innerHTML = `<p class="nota-rel"><b>Todavía no conocés a nadie especial.</b> Salí a lugares con gente (facultad, gimnasio, café, plaza, bar): si los dos van al mismo lugar el mismo día y momento, se cruzan.${r ? `<br>Dicen que hay alguien que va seguido ${{ facultad: "a la facultad", gimnasio: "al gimnasio", cafe: "al café", plaza: "a la plaza", bar: "al bar" }[r.lugar]} a la ${MOMENTOS[r.momento].toLowerCase()}.` : ""}</p>`;
        return;
    }
    const nivel = nivelRel();
    const pendienteMia = (tipo) => Object.values(mundo.propuestas ?? {}).some((pr) => pr.de === yo && pr.tipo === tipo);
    const pasos = Object.entries(PASOS).filter(([, paso]) => paso.desde.includes(rel.estado));
    const lista = hijos();
    t.innerHTML = `<div class="cabeza-rel"><canvas id="avatar-otro" class="avatar-v" width="96" height="120"></canvas>
            <div><strong>${o.nombre}</strong><span class="etiqueta-rel">${ESTADOS[rel.estado]}</span>
            <div class="medidor-rel"><i><b style="width:${nivel}%"></b></i>${nivel}</div></div></div>
        ${mundo.embarazo ? `<p class="nota-rel">${nombre(mundo.embarazo.de)} está embarazada: el bebé llega el día ${mundo.embarazo.finDia} de ${nombre(mundo.embarazo.de)}.</p>` : ""}
        ${lista.length ? `<div class="hijos-v">${lista.map((h) => `<span>${h.nombre}</span>`).join("")}</div>` : ""}
        <div class="acciones-rel">
            <button type="button" data-accion="mensaje" ${yoP().mensaje === yoP().dia ? "disabled" : ""}>Mandar un mensaje<small>${yoP().mensaje === yoP().dia ? "Ya le escribiste hoy" : "Suma un poco, una vez por día"}</small></button>
            ${pasos.map(([tipo, paso]) => {
                const falta = nivel < paso.nivel;
                const espera = pendienteMia(tipo);
                return `<button type="button" data-paso="${tipo}" ${falta || espera ? "disabled" : ""}>${paso.nombre}<small>${espera ? "Esperando respuesta" : falta ? `Hace falta relación ${paso.nivel}` : "Disponible"}</small></button>`;
            }).join("")}
            ${["saliendo", "pareja", "convivencia", "casados"].includes(rel.estado) ? `<button type="button" data-accion="terminar">Terminar<small>Vuelven a ser amigos</small></button>` : ""}
        </div>`;
    dibujarPersona(t.querySelector("#avatar-otro"), o);
}
$("tarjeta-relacion").addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b || b.disabled) return;
    if (b.dataset.accion === "mensaje") return mandarMensaje();
    if (b.dataset.accion === "terminar") return terminarRelacion();
    if (b.dataset.paso) pedirPaso(b.dataset.paso);
});

function pintarPropuestas() {
    const lista = Object.entries(mundo.propuestas ?? {}).sort((a, b) => a[1].ts - b[1].ts);
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

function pintarLugares() {
    const p = yoP();
    const r = mundo.relacion.estado === "desconocidos" ? rumor() : null;
    $("momento-texto").textContent = `${MOMENTOS[p.momento]} del día ${p.dia}`;
    $("lugares").innerHTML = Object.entries(LUGARES)
        .map(([id, L]) => {
            const sinEnergia = L.energia < 0 && p.energia + L.energia < 0;
            const sinPlata = (L.plata ?? 0) < 0 && p.plata + L.plata < 0;
            const efectos = [id === "trabajo" ? `+$${sueldo(p)}` : L.plata ? `-$${-L.plata}` : "", L.energia > 0 ? `+${L.energia} energía` : `${L.energia} energía`, L.animo > 0 ? `+${L.animo} ánimo` : ""].filter(Boolean).join(" · ");
            const marca = r && r.lugar === id && r.momento === p.momento ? '<i class="rumor-v"></i>' : "";
            return `<button class="lugar-v" type="button" data-lugar="${id}" ${sinEnergia || sinPlata ? "disabled" : ""}>${marca}${icono(id)}<strong>${L.nombre}</strong><small>${L.detalle}</small><span class="efectos-v">${efectos}</span></button>`;
        })
        .join("");
}
$("lugares").addEventListener("click", (e) => {
    const b = e.target.closest("[data-lugar]");
    if (b && !b.disabled) hacer(b.dataset.lugar);
});

function pintarDiario() {
    const p = yoP();
    const items = [...(p.diario ?? []).map((d) => ({ ...d, especial: false })), ...Object.values(mundo.historia ?? {}).map((h) => ({ ...h, especial: true }))]
        .sort((a, b) => b.ts - a.ts)
        .slice(0, 30);
    $("diario").innerHTML = items.map((d) => `<li class="${d.especial ? "especial" : ""}">${d.especial ? "" : `<b>Día ${d.dia}.</b> `}${d.t}</li>`).join("");
}

// ---------- Arranque ----------
$("practica").addEventListener("click", () => {
    const guardada = cargar(CLAVE_PRACTICA, null);
    mundo = guardada?.personajes ? guardada : datosIniciales().vida;
    otro = BOT;
    pintar();
    if (yoP()) avanzarBot();
});

if (idPartida) {
    const online = await import("../../js/multijugador.js");
    fs = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js");
    refPartida = fs.doc(online.db, "partidas", idPartida);
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
            mundo = p.vida ?? datosIniciales().vida;
            mundo.personajes ??= {};
            mundo.relacion ??= { nivel: 0, estado: "desconocidos" };
            mundo.propuestas ??= {};
            mundo.historia ??= {};
            mundo.hijos ??= {};
            pintar();
        },
        () => avisar("No tenés acceso a esta partida")
    );
} else {
    pintar();
    if (usuario.uid) {
        // Vidas online que ya están en curso
        import("../../js/multijugador.js").then((m) =>
            m.escucharPartidas((lista) => {
                const vidas = lista.filter((p) => p.juego === "vida");
                $("en-curso").innerHTML = vidas.map((p) => `<a href="?partida=${p.id}">Seguir la vida con ${p.nombres[p.jugadores.find((j) => j !== yo)]}</a>`).join("");
            })
        );
    }
}
