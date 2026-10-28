// 4 en línea en 3D: contra la computadora o contra un amigo (online, por turnos).
import { THREE, crearEscena, material, cargar, guardar, vibrar, fondoDegradado, crearParticulas } from "../../js/comun3d.js";
import { exigirSesion } from "../../js/sesion.js";
import { COLUMNAS, FILAS, datosIniciales, filaLibre, lineaGanadora, lleno, jugadaCompu } from "./reglas.js";

const $ = (id) => document.getElementById(id);
const CLAVE = "cuatro";
const PROFUNDIDAD = [1, 3, 6];
const NOMBRES_DIFICULTAD = ["Fácil", "Normal", "Difícil"];
const COLOR = { 1: 0xe63946, 2: 0xffd23f };

const estado = cargar(CLAVE, { dificultad: 1, victorias: 0, derrotas: 0 });
const usuario = await exigirSesion();
const yo = usuario.uid ?? "yo";
const idPartida = new URLSearchParams(location.search).get("partida");

// ---------- Escena ----------
const lienzo = $("lienzo");
const { scene, camera, renderer, sol, alAnimar } = crearEscena(lienzo, { fondo: 0x1f3a93, fov: 45 });
scene.background = fondoDegradado("#2b4fc4", "#0d1b4d");
scene.fog = null;
sol.position.set(4, 10, 10);
const particulas = crearParticulas(scene);
alAnimar(particulas.actualizar);

const ALTO_BASE = 0.8;
const centroCasilla = (c, f) => new THREE.Vector3(c - (COLUMNAS - 1) / 2, ALTO_BASE + f + 0.5, 0);

// Tablero con agujeros
const forma = new THREE.Shape();
forma.moveTo(-COLUMNAS / 2 - 0.3, 0);
forma.lineTo(COLUMNAS / 2 + 0.3, 0);
forma.lineTo(COLUMNAS / 2 + 0.3, FILAS + 0.2);
forma.lineTo(-COLUMNAS / 2 - 0.3, FILAS + 0.2);
forma.closePath();
for (let f = 0; f < FILAS; f++) {
    for (let c = 0; c < COLUMNAS; c++) {
        const agujero = new THREE.Path();
        agujero.absarc(c - (COLUMNAS - 1) / 2, f + 0.5 + 0.1, 0.4, 0, Math.PI * 2, true);
        forma.holes.push(agujero);
    }
}
const geoTablero = new THREE.ExtrudeGeometry(forma, { depth: 0.36, bevelEnabled: true, bevelSize: 0.05, bevelThickness: 0.05, curveSegments: 24 });
geoTablero.translate(0, ALTO_BASE - 0.1, -0.18);
const tablero3d = new THREE.Mesh(geoTablero, material(0x1e5bff, { roughness: 0.35, metalness: 0.1 }));
tablero3d.castShadow = true;
tablero3d.receiveShadow = true;
scene.add(tablero3d);

// Patas y piso
const matPata = material(0x163f9e);
for (const lado of [-1, 1]) {
    const pata = new THREE.Mesh(new THREE.BoxGeometry(0.4, ALTO_BASE + 1, 1.6), matPata);
    pata.position.set(lado * (COLUMNAS / 2 + 0.35), (ALTO_BASE + 1) / 2, 0);
    pata.castShadow = true;
    scene.add(pata);
}
const piso = new THREE.Mesh(new THREE.CircleGeometry(12, 48), material(0x0a1640, { roughness: 1 }));
piso.rotation.x = -Math.PI / 2;
piso.receiveShadow = true;
scene.add(piso);

// Fichas
const geoFicha = new THREE.CylinderGeometry(0.42, 0.42, 0.18, 32);
geoFicha.rotateX(Math.PI / 2);
const materiales = {
    1: material(COLOR[1], { roughness: 0.3, emissive: 0x3a0008, emissiveIntensity: 0.4 }),
    2: material(COLOR[2], { roughness: 0.3, emissive: 0x3a2a00, emissiveIntensity: 0.4 }),
};
const fichas3d = [];
const cayendo = [];

function ponerFicha(c, f, jugador, animar) {
    const m = new THREE.Mesh(geoFicha, materiales[jugador].clone());
    const destino = centroCasilla(c, f).add(new THREE.Vector3(0, 0.1, 0));
    m.position.copy(destino);
    m.castShadow = true;
    if (animar) {
        m.position.y = ALTO_BASE + FILAS + 1.2;
        cayendo.push({ m, destino: destino.y, vel: 0, rebotes: 0 });
    }
    scene.add(m);
    fichas3d.push({ m, casilla: f * COLUMNAS + c });
}

// Ficha que se muestra arriba de la columna antes de soltar
const previa = new THREE.Mesh(geoFicha, materiales[1].clone());
previa.material.transparent = true;
previa.material.opacity = 0.7;
previa.position.y = ALTO_BASE + FILAS + 0.9;
previa.visible = false;
scene.add(previa);

// ---------- Partida ----------
let partida = null;
let online = null;
let jugadores = [yo, "bot"];
let numeroDe = { [yo]: 1, bot: 2 };
let nombres = { [yo]: "Vos", bot: "Compu" };
let ganadora = null;
let ocupado = false;

const miNumero = () => numeroDe[yo];
const rival = () => jugadores.find((j) => j !== yo);
const turnoDe = (p) => p.turno;
const esMiTurno = () => partida && partida.estado !== "terminada" && turnoDe(partida) === yo && !ocupado;

function pintarMarcador() {
    if (!partida) return;
    const colores = { 1: "roja", 2: "amarilla" };
    $("p0").querySelector(".nombre").innerHTML = `<i class="ficha-color ${colores[miNumero()]}"></i>${nombres[yo]}`;
    $("p1").querySelector(".nombre").innerHTML = `<i class="ficha-color ${colores[numeroDe[rival()]]}"></i>${nombres[rival()]}`;
    const fin = partida.estado === "terminada";
    $("p0").classList.toggle("turno", !fin && partida.turno === yo);
    $("p1").classList.toggle("turno", !fin && partida.turno === rival());
    $("estado-turno").textContent = fin ? "Terminada" : partida.turno === yo ? "Tu turno" : `Turno de ${nombres[rival()]}`;
    $("ayuda").hidden = !esMiTurno() || partida.tablero.some(Boolean);
    previa.material.color.setHex(COLOR[miNumero()]);
}

async function jugar(col, quien) {
    const f = filaLibre(partida.tablero, col);
    if (f < 0) return;
    ocupado = true;
    previa.visible = false;
    const numero = numeroDe[quien];
    const tablero = [...partida.tablero];
    tablero[f * COLUMNAS + col] = numero;
    const g = lineaGanadora(tablero);
    const empate = !g && lleno(tablero);
    const cambios = {
        tablero,
        ultimo: { col, fila: f, jugador: numero },
        turno: g || empate ? null : jugadores.find((j) => j !== quien),
        estado: g || empate ? "terminada" : "jugando",
        ganador: g ? quien : empate ? "empate" : null,
    };
    if (online) {
        await online.actualizarPartida(idPartida, cambios);
        // El dibujo llega con el cambio desde Firestore
    } else {
        Object.assign(partida, cambios);
        await mostrarJugada(col, f, numero);
        despuesDeJugada();
    }
}

function mostrarJugada(col, fila, numero) {
    ponerFicha(col, fila, numero, true);
    vibrar(15);
    return new Promise((r) => setTimeout(r, 650));
}

function despuesDeJugada() {
    ocupado = false;
    pintarMarcador();
    if (partida.estado === "terminada") return finDePartida();
    if (!online && partida.turno === "bot") {
        ocupado = true;
        setTimeout(() => {
            ocupado = false;
            jugar(jugadaCompu(partida.tablero, 2, PROFUNDIDAD[estado.dificultad]), "bot");
        }, 450);
    }
}

function finDePartida() {
    const g = lineaGanadora(partida.tablero);
    if (g) {
        ganadora = g.casillas;
        for (const casilla of g.casillas) {
            const fila = Math.floor(casilla / COLUMNAS);
            particulas.emitir(centroCasilla(casilla % COLUMNAS, fila).setZ(0.3), COLOR[g.jugador], 10, {
                velocidad: 2, arriba: 3, tamano: 0.1, brillo: true,
            });
        }
    }
    const gane = partida.ganador === yo;
    const empate = partida.ganador === "empate";
    if (!online && !empate) {
        if (gane) estado.victorias++;
        else estado.derrotas++;
        guardar(CLAVE, estado);
    }
    vibrar(gane ? 90 : 150);
    $("titulo-centro").innerHTML = `${empate ? "Empate" : gane ? "¡Ganaste!" : `Ganó ${nombres[rival()]}`}<div class="chico">${
        online ? "" : `${estado.victorias} ganadas · ${estado.derrotas} perdidas`
    }</div>`;
    $("opciones").hidden = Boolean(online);
    $("jugar").textContent = online ? online.textoRevancha(partida, yo) : "Otra vez";
    $("ir-amigos").textContent = online ? "👥 Volver a amigos" : "👥 Jugar con un amigo";
    setTimeout(() => ($("centro").hidden = false), 900);
}

// ---------- Controles ----------
const raycaster = new THREE.Raycaster();
const plano = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
function columnaEn(e) {
    const caja = renderer.domElement.getBoundingClientRect();
    raycaster.setFromCamera(
        new THREE.Vector2(((e.clientX - caja.left) / caja.width) * 2 - 1, -((e.clientY - caja.top) / caja.height) * 2 + 1),
        camera
    );
    const p = raycaster.ray.intersectPlane(plano, new THREE.Vector3());
    if (!p) return -1;
    const c = Math.round(p.x + (COLUMNAS - 1) / 2);
    return c >= 0 && c < COLUMNAS ? c : -1;
}
function mostrarPrevia(c) {
    previa.visible = c >= 0 && esMiTurno() && filaLibre(partida.tablero, c) >= 0;
    if (previa.visible) previa.position.x = c - (COLUMNAS - 1) / 2;
}
renderer.domElement.addEventListener("pointermove", (e) => mostrarPrevia(columnaEn(e)));
renderer.domElement.addEventListener("pointerdown", (e) => mostrarPrevia(columnaEn(e)));
renderer.domElement.addEventListener("pointerup", (e) => {
    const c = columnaEn(e);
    if (c >= 0 && esMiTurno()) jugar(c, yo);
});

// ---------- Ciclo ----------
let tiempo = 0;
alAnimar((dt) => {
    tiempo += dt;
    // Distancia para que entre todo el tablero (ancho y alto) en cualquier pantalla
    const tan = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const distancia = Math.max((FILAS / 2 + 1.6) / tan, (COLUMNAS / 2 + 0.9) / (tan * camera.aspect));
    camera.position.set(Math.sin(tiempo * 0.2) * 0.6, ALTO_BASE + FILAS / 2 + 0.8, distancia);
    camera.lookAt(0, ALTO_BASE + FILAS / 2, 0);

    for (let i = cayendo.length - 1; i >= 0; i--) {
        const c = cayendo[i];
        c.vel -= 30 * dt;
        c.m.position.y += c.vel * dt;
        if (c.m.position.y <= c.destino) {
            c.m.position.y = c.destino;
            if (c.rebotes < 2 && Math.abs(c.vel) > 2) {
                c.vel = -c.vel * 0.3;
                c.rebotes++;
            } else {
                cayendo.splice(i, 1);
            }
        }
    }

    if (ganadora) {
        const brillo = 0.4 + Math.abs(Math.sin(tiempo * 5)) * 1.2;
        for (const f of fichas3d) if (ganadora.includes(f.casilla)) f.m.material.emissiveIntensity = brillo;
    }
});

// ---------- Inicio ----------
function limpiar() {
    for (const f of fichas3d) scene.remove(f.m);
    fichas3d.length = 0;
    cayendo.length = 0;
    ganadora = null;
}

function dibujarTodo() {
    limpiar();
    partida.tablero.forEach((j, i) => j && ponerFicha(i % COLUMNAS, Math.floor(i / COLUMNAS), j, false));
}

function empezarContraBot() {
    jugadores = [yo, "bot"];
    numeroDe = { [yo]: 1, bot: 2 };
    nombres = { [yo]: "Vos", bot: `Compu · ${NOMBRES_DIFICULTAD[estado.dificultad]}` };
    partida = { ...datosIniciales(), turno: yo, estado: "jugando", ganador: null };
    limpiar();
    $("centro").hidden = true;
    ocupado = false;
    pintarMarcador();
}

function pintarDificultad() {
    for (const b of document.querySelectorAll(".dificultad button")) b.classList.toggle("activa", Number(b.dataset.nivel) === estado.dificultad);
}
for (const b of document.querySelectorAll(".dificultad button")) {
    b.addEventListener("click", () => {
        estado.dificultad = Number(b.dataset.nivel);
        guardar(CLAVE, estado);
        pintarDificultad();
    });
}

$("jugar").addEventListener("click", async () => {
    if (!online) return empezarContraBot();
    await online.irARevancha(partida, datosIniciales);
});

async function iniciarOnline() {
    online = await import("../../js/multijugador.js");
    online.iniciarPresencia("4 en línea");
    $("centro").hidden = true;
    online.escucharPartida(
        idPartida,
        async (p) => {
            if (!p) {
                $("titulo-centro").innerHTML = "La partida ya no existe";
                $("opciones").hidden = true;
                $("jugar").hidden = true;
                $("centro").hidden = false;
                return;
            }
            const primera = !partida;
            const anterior = partida?.tablero;
            partida = p;
            if (primera) {
                jugadores = [...p.jugadores];
                numeroDe = { [p.creador]: 1, [p.jugadores.find((j) => j !== p.creador)]: 2 };
                nombres = { ...p.nombres, [yo]: "Vos" };
                dibujarTodo();
                if (p.estado === "invitada" && p.creador !== yo) online.actualizarPartida(idPartida, { estado: "jugando" });
            } else if (p.ultimo && anterior && !anterior[p.ultimo.fila * COLUMNAS + p.ultimo.col]) {
                await mostrarJugada(p.ultimo.col, p.ultimo.fila, p.ultimo.jugador);
            }
            ocupado = false;
            pintarMarcador();
            if (p.estado === "terminada") finDePartida();
        },
        () => {
            $("titulo-centro").innerHTML = "No tenés acceso a esta partida";
            $("jugar").hidden = true;
            $("centro").hidden = false;
        }
    );
}

pintarDificultad();
if (idPartida) iniciarOnline();
