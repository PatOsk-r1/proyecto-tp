// Apilar: soltá cada bloque justo encima del anterior. Lo que sobresale se cae.
import {
    THREE, crearEscena, material, formatear, cargar, guardar, textoFlotante, vibrar, MONEDA,
    fondoDegradado, crearParticulas,
} from "../../js/comun3d.js";

const $ = (id) => document.getElementById(id);
const CLAVE = "apilar";
const ALTO = 0.5;
const TAMANO = 3;
const RECORRIDO = 5;

const estado = cargar(CLAVE, { monedas: 0, mejor: 0, lento: 0, precision: 0, ganancia: 0 });

const velocidadBase = () => 4.5 * 0.93 ** estado.lento;
const tolerancia = () => 0.08 + estado.precision * 0.04;
const multiplicador = () => 1 + estado.ganancia * 0.3;
const costoLento = () => 40 * 2.1 ** estado.lento;
const costoPrecision = () => 60 * 2.3 ** estado.precision;
const costoGanancia = () => 80 * 2 ** estado.ganancia;
const MAX_LENTO = 12;
const MAX_PRECISION = 6;

// El cielo cambia de color a medida que la torre sube
const CIELOS = [
    ["#ff9ab8", "#ffd9a8"],
    ["#8ec5ff", "#ffc2dc"],
    ["#6a8dff", "#9fe3ff"],
    ["#5b3fd1", "#ff7ac0"],
    ["#1d1452", "#5b3fd1"],
    ["#05030f", "#2a1866"],
];

// ---------- Escena ----------
const lienzo = $("lienzo");
const { scene, camera, renderer, sol, alAnimar } = crearEscena(lienzo, { fondo: 0xffc2dc });
scene.fog = null;
const particulas = crearParticulas(scene);
alAnimar(particulas.actualizar);

let cieloActual = -1;
function pintarCielo(altura) {
    const i = Math.min(Math.floor(altura / 12), CIELOS.length - 1);
    if (i === cieloActual) return;
    cieloActual = i;
    scene.background = fondoDegradado(...CIELOS[i]);
}
pintarCielo(0);

// Nubes que se cruzan al subir
const matNube = material(0xffffff, { roughness: 1, transparent: true, opacity: 0.9 });
const nubes = [];
function crearNube(y) {
    const n = new THREE.Group();
    for (let i = 0; i < 4; i++) {
        const bola = new THREE.Mesh(new THREE.SphereGeometry(0.6 + Math.random() * 0.5, 10, 8), matNube);
        bola.position.set(i * 0.8 - 1.2, Math.random() * 0.3, Math.random() * 0.4);
        n.add(bola);
    }
    const lado = Math.random() < 0.5 ? -1 : 1;
    n.position.set(lado * (6 + Math.random() * 5), y, -4 - Math.random() * 6);
    n.userData.vel = (Math.random() * 0.4 + 0.2) * -lado;
    scene.add(n);
    nubes.push(n);
}
for (let y = 3; y < 30; y += 4 + Math.random() * 3) crearNube(y);
let nubeMasAlta = 30;

// Pedestal
const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 3, 0.6, 32), material(0xffffff, { roughness: 0.5 }));
pedestal.position.y = -1.6;
pedestal.receiveShadow = true;
scene.add(pedestal);

const geoCaja = new THREE.BoxGeometry(1, 1, 1);
const geoBordes = new THREE.EdgesGeometry(geoCaja);
const matBordes = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55 });
const colorDe = (nivel) => new THREE.Color().setHSL((0.92 + nivel * 0.03) % 1, 0.75, 0.62);

function caja(x, y, z, ancho, fondo, nivel) {
    const m = new THREE.Mesh(geoCaja, material(colorDe(nivel), { roughness: 0.35 }));
    m.add(new THREE.LineSegments(geoBordes, matBordes));
    m.scale.set(ancho, ALTO, fondo);
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    scene.add(m);
    return m;
}

// Marco que se expande cuando el bloque cae perfecto
const destellos = [];
function destello(bloque) {
    const d = new THREE.LineSegments(geoBordes, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true }));
    d.position.copy(bloque.malla.position);
    d.scale.set(bloque.ancho, ALTO * 0.2, bloque.fondo);
    d.userData = { vida: 0.5, ancho: bloque.ancho, fondo: bloque.fondo };
    scene.add(d);
    destellos.push(d);
}

let pila = [];
let movil = null;
let cayendo = [];
let partida = null;
let alturaCamara = 0;

function reiniciar() {
    for (const b of pila) scene.remove(b.malla);
    for (const c of cayendo) scene.remove(c.malla);
    if (movil) scene.remove(movil.malla);
    pila = [];
    cayendo = [];
    movil = null;
    const base = { x: 0, z: 0, ancho: TAMANO, fondo: TAMANO, y: 0 };
    base.malla = caja(0, 0, 0, TAMANO, TAMANO, 0);
    base.malla.scale.y = ALTO * 5;
    base.malla.position.y = -ALTO * 2;
    pila.push(base);
    pintarCielo(0);
}

function siguienteBloque() {
    const arriba = pila[pila.length - 1];
    const eje = pila.length % 2 ? "x" : "z";
    const y = pila.length * ALTO;
    movil = { x: arriba.x, z: arriba.z, ancho: arriba.ancho, fondo: arriba.fondo, eje, y, dir: 1 };
    movil[eje] = -RECORRIDO;
    movil.malla = caja(movil.x, y, movil.z, movil.ancho, movil.fondo, pila.length);
}

function empezar() {
    reiniciar();
    partida = { altura: 0, ganado: 0, combo: 0, jugando: true };
    siguienteBloque();
    $("centro").hidden = true;
    $("mejoras").hidden = true;
    actualizar();
}

function soltar() {
    const arriba = pila[pila.length - 1];
    const eje = movil.eje;
    const medida = eje === "x" ? "ancho" : "fondo";
    let delta = movil[eje] - arriba[eje];
    const solapa = arriba[medida] - Math.abs(delta);

    if (solapa <= 0) {
        // Se cayó entero
        cayendo.push({ malla: movil.malla, vel: 0, giro: (Math.random() - 0.5) * 4 });
        movil = null;
        return terminar();
    }

    const perfecto = Math.abs(delta) <= tolerancia();
    if (perfecto) {
        delta = 0;
        partida.combo++;
    } else {
        partida.combo = 0;
        // Pedazo que sobresale y cae
        const sobra = Math.abs(delta);
        const signo = Math.sign(delta);
        const pedazo = { x: movil.x, z: movil.z, ancho: movil.ancho, fondo: movil.fondo };
        pedazo[medida] = sobra;
        pedazo[eje] = arriba[eje] + delta / 2 + signo * (solapa / 2 + sobra / 2);
        cayendo.push({
            malla: caja(pedazo.x, movil.y, pedazo.z, pedazo.ancho, pedazo.fondo, pila.length),
            vel: 0,
            giro: signo * 3,
        });
    }

    const nuevo = { x: movil.x, z: movil.z, ancho: movil.ancho, fondo: movil.fondo, y: movil.y, malla: movil.malla };
    nuevo[medida] = perfecto ? arriba[medida] : solapa;
    nuevo[eje] = arriba[eje] + delta / 2;
    nuevo.malla.scale.set(nuevo.ancho, ALTO, nuevo.fondo);
    nuevo.malla.position.set(nuevo.x, nuevo.y, nuevo.z);
    pila.push(nuevo);

    partida.altura++;
    pintarCielo(partida.altura);
    const premio = (1 + (perfecto ? partida.combo : 0)) * multiplicador();
    partida.ganado += premio;
    const caja2d = renderer.domElement.getBoundingClientRect();
    if (perfecto) {
        destello(nuevo);
        particulas.emitir(nuevo.malla.position, 0xffffff, 10 + partida.combo * 2, { velocidad: 3, arriba: 3, tamano: 0.1, brillo: true });
    }
    textoFlotante(
        caja2d.left + caja2d.width / 2,
        caja2d.top + caja2d.height * 0.32,
        perfecto ? `¡Perfecto${partida.combo > 1 ? ` ×${partida.combo}` : ""}! +${formatear(premio)}` : `+${formatear(premio)}`,
        perfecto ? "#ffffff" : "#fff3a8"
    );
    vibrar(perfecto ? 35 : 15);
    siguienteBloque();
    actualizar();
}

function terminar() {
    partida.jugando = false;
    const total = Math.round(partida.ganado);
    estado.monedas += total;
    const record = partida.altura > estado.mejor;
    if (record) estado.mejor = partida.altura;
    guardar(CLAVE, estado);
    vibrar(120);
    $("titulo-centro").innerHTML = `${record ? "¡Nuevo récord!" : "¡Se cayó!"}<div class="chico">${partida.altura} bloques</div><div>+${MONEDA}${formatear(total)}</div>`;
    $("jugar").textContent = "Otra vez";
    $("centro").hidden = false;
    $("mejoras").hidden = false;
    actualizar();
}

renderer.domElement.addEventListener("pointerdown", () => {
    if (partida?.jugando && movil) soltar();
});

// ---------- Animación ----------
alAnimar((dt) => {
    if (movil && partida?.jugando) {
        const velocidad = velocidadBase() + partida.altura * 0.05;
        movil[movil.eje] += movil.dir * velocidad * dt;
        if (Math.abs(movil[movil.eje]) > RECORRIDO) {
            movil[movil.eje] = Math.sign(movil[movil.eje]) * RECORRIDO;
            movil.dir *= -1;
        }
        movil.malla.position.set(movil.x, movil.y, movil.z);
    }

    for (let i = cayendo.length - 1; i >= 0; i--) {
        const c = cayendo[i];
        c.vel += 20 * dt;
        c.malla.position.y -= c.vel * dt;
        c.malla.rotation.z += c.giro * dt;
        c.malla.rotation.x += dt;
        if (c.malla.position.y < alturaCamara - 20) {
            scene.remove(c.malla);
            cayendo.splice(i, 1);
        }
    }

    for (let i = destellos.length - 1; i >= 0; i--) {
        const d = destellos[i];
        d.userData.vida -= dt;
        const avance = 1 - d.userData.vida / 0.5;
        d.scale.set(d.userData.ancho * (1 + avance * 0.6), ALTO * 0.2, d.userData.fondo * (1 + avance * 0.6));
        d.material.opacity = 1 - avance;
        if (d.userData.vida <= 0) {
            scene.remove(d);
            destellos.splice(i, 1);
        }
    }

    for (const n of nubes) {
        n.position.x += n.userData.vel * dt;
        if (Math.abs(n.position.x) > 14) n.position.x = -Math.sign(n.position.x) * 13;
    }
    while (nubeMasAlta < alturaCamara + 20) {
        nubeMasAlta += 4 + Math.random() * 3;
        crearNube(nubeMasAlta);
    }

    const objetivo = pila.length * ALTO;
    alturaCamara += (objetivo - alturaCamara) * Math.min(1, dt * 3);
    const lejos = Math.max(1, 0.7 / camera.aspect);
    camera.position.set(7 * lejos, alturaCamara + 7 * lejos, 7 * lejos);
    camera.lookAt(0, alturaCamara - 1, 0);
    sol.position.set(6, alturaCamara + 14, 8);
    sol.target.position.set(0, alturaCamara, 0);
    sol.target.updateMatrixWorld();
});

// ---------- Mejoras ----------
function crearBoton(titulo, alComprar) {
    const boton = document.createElement("button");
    boton.className = "mejora";
    boton.innerHTML = `<span class="titulo">${titulo}</span><span class="nivel"></span><span class="detalle"></span><span class="precio"></span>`;
    boton.addEventListener("click", alComprar);
    $("mejoras").appendChild(boton);
    return boton;
}

function comprar(costo, aplicarMejora) {
    if (estado.monedas < costo) return;
    estado.monedas -= costo;
    aplicarMejora();
    guardar(CLAVE, estado);
    vibrar(25);
    actualizar();
}

const botonLento = crearBoton("🐢 Más lento", () => comprar(costoLento(), () => estado.lento++));
const botonPrecision = crearBoton("🎯 Más precisión", () => comprar(costoPrecision(), () => estado.precision++));
const botonGanancia = crearBoton("💰 Más monedas", () => comprar(costoGanancia(), () => estado.ganancia++));

function pintarBoton(boton, nivel, detalle, costo, alMaximo) {
    boton.querySelector(".nivel").textContent = nivel;
    boton.querySelector(".detalle").textContent = detalle;
    boton.querySelector(".precio").innerHTML = alMaximo ? "Máximo" : `${MONEDA}${formatear(costo)}`;
    boton.disabled = alMaximo || estado.monedas < costo;
    boton.classList.toggle("se-puede", !boton.disabled);
}

function actualizar() {
    $("altura").textContent = partida ? partida.altura : estado.mejor ? `Récord: ${estado.mejor}` : "0";
    const enJuego = partida?.jugando ? ` (+${formatear(partida.ganado)})` : "";
    $("monedas").innerHTML = `${MONEDA}${formatear(estado.monedas)}${enJuego}`;
    pintarBoton(botonLento, `${estado.lento}/${MAX_LENTO}`, "El bloque se mueve más despacio", costoLento(), estado.lento >= MAX_LENTO);
    pintarBoton(botonPrecision, `${estado.precision}/${MAX_PRECISION}`, "Más fácil lograr un perfecto", costoPrecision(), estado.precision >= MAX_PRECISION);
    pintarBoton(botonGanancia, `Nv ${estado.ganancia}`, `×${multiplicador().toFixed(1)} monedas`, costoGanancia(), false);
}

$("jugar").addEventListener("click", empezar);

reiniciar();
actualizar();
