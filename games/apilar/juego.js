// Apilar: soltá cada bloque justo encima del anterior. Lo que sobresale se cae.
import { THREE, crearEscena, material, formatear, cargar, guardar, textoFlotante, vibrar, MONEDA } from "../../js/comun3d.js";

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

// ---------- Escena ----------
const lienzo = document.getElementById("lienzo");
const { scene, camera, renderer, sol, alAnimar } = crearEscena(lienzo, { fondo: 0x1e1650 });
scene.fog.near = 25;
scene.fog.far = 60;

const geoCaja = new THREE.BoxGeometry(1, 1, 1);
const colorDe = (nivel) => new THREE.Color().setHSL((0.62 + nivel * 0.035) % 1, 0.65, 0.55);

function caja(x, y, z, ancho, fondo, nivel) {
    const m = new THREE.Mesh(geoCaja, material(colorDe(nivel)));
    m.scale.set(ancho, ALTO, fondo);
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    scene.add(m);
    return m;
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
    base.malla.scale.y = ALTO * 6;
    base.malla.position.y = -ALTO * 2.5;
    pila.push(base);
}

function siguienteBloque() {
    const arriba = pila[pila.length - 1];
    const eje = pila.length % 2 ? "x" : "z";
    const y = pila.length * ALTO;
    movil = { ...arriba, eje, y, pos: -RECORRIDO, dir: 1 };
    delete movil.malla;
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
        cayendo.push({ malla: movil.malla, vel: 0 });
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
        const pedazo = { ...movil };
        pedazo[medida] = sobra;
        pedazo[eje] = arriba[eje] + delta / 2 + signo * (solapa / 2 + sobra / 2);
        cayendo.push({ malla: caja(pedazo.x, movil.y, pedazo.z, pedazo.ancho, pedazo.fondo, pila.length), vel: 0 });
    }

    const nuevo = { x: movil.x, z: movil.z, ancho: movil.ancho, fondo: movil.fondo, y: movil.y, malla: movil.malla };
    nuevo[medida] = perfecto ? arriba[medida] : solapa;
    nuevo[eje] = arriba[eje] + delta / 2;
    nuevo.malla.scale.set(nuevo.ancho, ALTO, nuevo.fondo);
    nuevo.malla.position.set(nuevo.x, nuevo.y, nuevo.z);
    pila.push(nuevo);

    partida.altura++;
    const premio = (1 + (perfecto ? partida.combo : 0)) * multiplicador();
    partida.ganado += premio;
    const caja2d = renderer.domElement.getBoundingClientRect();
    textoFlotante(
        caja2d.left + caja2d.width / 2,
        caja2d.top + caja2d.height * 0.35,
        perfecto ? `¡Perfecto! +${formatear(premio)}` : `+${formatear(premio)}`,
        perfecto ? "#7df9ff" : "#ffcc33"
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
    $("titulo-centro").innerHTML = `${record ? "¡Nuevo récord!" : "Fin"}<br>${partida.altura} bloques · +${MONEDA}${formatear(total)}`;
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
        c.malla.rotation.x += dt * 1.5;
        if (c.malla.position.y < alturaCamara - 20) {
            scene.remove(c.malla);
            cayendo.splice(i, 1);
        }
    }

    const objetivo = pila.length * ALTO;
    alturaCamara += (objetivo - alturaCamara) * Math.min(1, dt * 3);
    camera.position.set(7, alturaCamara + 7, 7);
    camera.lookAt(0, alturaCamara - 1, 0);
    sol.position.set(6, alturaCamara + 14, 8);
    sol.target.position.set(0, alturaCamara, 0);
    sol.target.updateMatrixWorld();
});

// ---------- Mejoras ----------
const $ = (id) => document.getElementById(id);

function crearBoton(titulo, alComprar) {
    const boton = document.createElement("button");
    boton.className = "mejora";
    boton.innerHTML = `<span class="titulo">${titulo}</span><span class="detalle"></span><span class="precio"></span>`;
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

const botonLento = crearBoton("Más lento", () => comprar(costoLento(), () => estado.lento++));
const botonPrecision = crearBoton("Más precisión", () => comprar(costoPrecision(), () => estado.precision++));
const botonGanancia = crearBoton("Más monedas", () => comprar(costoGanancia(), () => estado.ganancia++));

function pintarBoton(boton, detalle, costo, alMaximo) {
    boton.querySelector(".detalle").textContent = detalle;
    boton.querySelector(".precio").innerHTML = alMaximo ? "Máximo" : `${MONEDA}${formatear(costo)}`;
    boton.disabled = alMaximo || estado.monedas < costo;
}

function actualizar() {
    $("altura").textContent = partida ? partida.altura : estado.mejor ? `Récord: ${estado.mejor}` : "0";
    const enJuego = partida?.jugando ? ` (+${formatear(partida.ganado)})` : "";
    $("monedas").innerHTML = `${MONEDA}${formatear(estado.monedas)}${enJuego}`;
    pintarBoton(botonLento, `Nivel ${estado.lento}/${MAX_LENTO}`, costoLento(), estado.lento >= MAX_LENTO);
    pintarBoton(botonPrecision, `Nivel ${estado.precision}/${MAX_PRECISION}`, costoPrecision(), estado.precision >= MAX_PRECISION);
    pintarBoton(botonGanancia, `×${multiplicador().toFixed(1)} monedas`, costoGanancia(), false);
}

$("jugar").addEventListener("click", empezar);

reiniciar();
actualizar();
