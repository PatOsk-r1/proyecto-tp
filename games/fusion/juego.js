// Fusión: comprá objetos, juntá dos iguales para crear uno de nivel mayor que produce más.
import { THREE, crearEscena, material, formatear, cargar, guardar, textoFlotante, aPantalla, vibrar, MONEDA } from "../../js/comun3d.js";

const CLAVE = "fusion";
const LADO = 4;
const SEPARACION = 1.45;
const MAX_HORAS_AUSENTE = 2;

const FORMAS = [
    () => new THREE.BoxGeometry(0.7, 0.7, 0.7),
    () => new THREE.SphereGeometry(0.42, 20, 14),
    () => new THREE.ConeGeometry(0.45, 0.85, 20),
    () => new THREE.CylinderGeometry(0.38, 0.38, 0.8, 20),
    () => new THREE.TorusGeometry(0.33, 0.14, 12, 24),
    () => new THREE.OctahedronGeometry(0.5),
    () => new THREE.DodecahedronGeometry(0.45),
    () => new THREE.IcosahedronGeometry(0.47),
    () => new THREE.TorusKnotGeometry(0.27, 0.1, 64, 10),
];
const COLORES = [0xe74c3c, 0xe67e22, 0xf1c40f, 0x2ecc71, 0x1abc9c, 0x3498db, 0x9b59b6, 0xe84393, 0xffffff];

const estado = cargar(CLAVE, {
    monedas: 30,
    tablero: Array(LADO * LADO).fill(0),
    compras: 0,
    mejorCompra: 0,
    ganancia: 0,
    maximo: 1,
    ultimaVez: Date.now(),
});

const produce = (nivel) => 1.2 * 2.7 ** (nivel - 1) * (1 + estado.ganancia * 0.5);
const porSegundo = () => estado.tablero.reduce((t, n) => t + (n ? produce(n) : 0), 0);
const costoCompra = () => 10 * 1.13 ** estado.compras * 2.2 ** estado.mejorCompra;
const costoMejorCompra = () => 400 * 18 ** estado.mejorCompra;
const costoGanancia = () => 150 * 3 ** estado.ganancia;
const nivelComprado = () => 1 + estado.mejorCompra;

// ---------- Escena ----------
const lienzo = document.getElementById("lienzo");
const { scene, camera, renderer, alAnimar } = crearEscena(lienzo, { fondo: 0x2a1f63 });
camera.position.set(0, 9.5, 6.5);
camera.lookAt(0, 0, 0.5);

const base = new THREE.Mesh(new THREE.BoxGeometry(LADO * SEPARACION + 0.6, 0.4, LADO * SEPARACION + 0.6), material(0x3d2f8a));
base.position.y = -0.3;
base.receiveShadow = true;
scene.add(base);

const centroCasilla = (i) =>
    new THREE.Vector3(((i % LADO) - (LADO - 1) / 2) * SEPARACION, 0, (Math.floor(i / LADO) - (LADO - 1) / 2) * SEPARACION);

const casillas = [];
for (let i = 0; i < LADO * LADO; i++) {
    const c = new THREE.Mesh(new THREE.BoxGeometry(SEPARACION - 0.12, 0.12, SEPARACION - 0.12), material(0x5a48b8));
    c.position.copy(centroCasilla(i)).setY(-0.04);
    c.receiveShadow = true;
    scene.add(c);
    casillas.push(c);
}

// Objetos del tablero (uno por casilla ocupada)
const objetos = Array(LADO * LADO).fill(null);

function crearObjeto(i, nivel, animar) {
    const forma = FORMAS[(nivel - 1) % FORMAS.length]();
    const vuelta = Math.floor((nivel - 1) / FORMAS.length);
    const obj = new THREE.Mesh(
        forma,
        material(COLORES[(nivel - 1) % COLORES.length], {
            emissive: vuelta > 0 ? 0x553300 : 0x000000,
            metalness: Math.min(0.2 + vuelta * 0.3, 0.9),
            roughness: 0.35,
        })
    );
    obj.castShadow = true;
    obj.position.copy(centroCasilla(i)).setY(0.5);
    obj.userData = { indice: i, nivel, fase: Math.random() * 6 };
    if (animar) obj.scale.setScalar(0.01);
    scene.add(obj);
    objetos[i] = obj;
}

function quitarObjeto(i) {
    if (objetos[i]) scene.remove(objetos[i]);
    objetos[i] = null;
}

estado.tablero.forEach((n, i) => n && crearObjeto(i, n, false));

// ---------- Arrastrar ----------
const raycaster = new THREE.Raycaster();
const plano = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.9);
const punto = new THREE.Vector3();
let arrastrado = null;

function apuntar(e) {
    const caja = renderer.domElement.getBoundingClientRect();
    raycaster.setFromCamera(
        new THREE.Vector2(((e.clientX - caja.left) / caja.width) * 2 - 1, -((e.clientY - caja.top) / caja.height) * 2 + 1),
        camera
    );
}

function casillaEn(posicion) {
    const col = Math.round(posicion.x / SEPARACION + (LADO - 1) / 2);
    const fila = Math.round(posicion.z / SEPARACION + (LADO - 1) / 2);
    return col >= 0 && col < LADO && fila >= 0 && fila < LADO ? fila * LADO + col : -1;
}

renderer.domElement.addEventListener("pointerdown", (e) => {
    apuntar(e);
    const toque = raycaster.intersectObjects(objetos.filter(Boolean))[0];
    if (!toque) return;
    arrastrado = toque.object;
    renderer.domElement.setPointerCapture(e.pointerId);
});

renderer.domElement.addEventListener("pointermove", (e) => {
    if (!arrastrado) return;
    apuntar(e);
    if (raycaster.ray.intersectPlane(plano, punto)) arrastrado.position.set(punto.x, 0.9, punto.z);
});

renderer.domElement.addEventListener("pointerup", (e) => {
    if (!arrastrado) return;
    const origen = arrastrado.userData.indice;
    const destino = casillaEn(arrastrado.position);
    const nivel = arrastrado.userData.nivel;
    arrastrado = null;

    if (destino === -1 || destino === origen) return volver(origen);

    if (estado.tablero[destino] === nivel) {
        // Fusión
        quitarObjeto(origen);
        quitarObjeto(destino);
        estado.tablero[origen] = 0;
        estado.tablero[destino] = nivel + 1;
        crearObjeto(destino, nivel + 1, true);
        vibrar(40);
        const p = aPantalla(centroCasilla(destino).setY(1), camera, renderer.domElement);
        textoFlotante(p.x, p.y, `Nivel ${nivel + 1}`, "#7df9ff");
        if (nivel + 1 > estado.maximo) {
            estado.maximo = nivel + 1;
            avisar(`¡Nuevo nivel ${estado.maximo}!`);
        }
    } else if (estado.tablero[destino] === 0) {
        // Mover a casilla vacía
        estado.tablero[destino] = nivel;
        estado.tablero[origen] = 0;
        objetos[destino] = objetos[origen];
        objetos[origen] = null;
        objetos[destino].userData.indice = destino;
    } else {
        // Intercambiar con otro objeto
        [estado.tablero[origen], estado.tablero[destino]] = [estado.tablero[destino], nivel];
        [objetos[origen], objetos[destino]] = [objetos[destino], objetos[origen]];
        objetos[origen].userData.indice = origen;
        objetos[destino].userData.indice = destino;
    }
    guardarProgreso();
    actualizar();
});

function volver(i) {
    objetos[i]?.position.copy(centroCasilla(i)).setY(0.5);
}

// ---------- Animación ----------
alAnimar((dt) => {
    const t = performance.now() / 1000;
    for (const obj of objetos) {
        if (!obj || obj === arrastrado) continue;
        if (obj.scale.x < 1) obj.scale.setScalar(Math.min(1, obj.scale.x + dt * 4));
        const destino = centroCasilla(obj.userData.indice);
        obj.position.x += (destino.x - obj.position.x) * Math.min(1, dt * 12);
        obj.position.z += (destino.z - obj.position.z) * Math.min(1, dt * 12);
        obj.position.y = 0.5 + Math.sin(t * 2 + obj.userData.fase) * 0.08;
        obj.rotation.y += dt * 0.8;
    }
});

// ---------- Mejoras ----------
const $ = (id) => document.getElementById(id);

function avisar(texto) {
    $("aviso").innerHTML = texto;
    $("aviso").hidden = false;
    clearTimeout(avisar.temporizador);
    avisar.temporizador = setTimeout(() => ($("aviso").hidden = true), 2200);
}

function crearBoton(titulo, alComprar) {
    const boton = document.createElement("button");
    boton.className = "mejora";
    boton.innerHTML = `<span class="titulo">${titulo}</span><span class="detalle"></span><span class="precio"></span>`;
    boton.addEventListener("click", alComprar);
    $("mejoras").appendChild(boton);
    return boton;
}

const botonComprar = crearBoton("Comprar objeto", () => {
    const libres = estado.tablero.flatMap((n, i) => (n ? [] : [i]));
    const costo = costoCompra();
    if (!libres.length || estado.monedas < costo) return;
    const i = libres[Math.floor(Math.random() * libres.length)];
    estado.monedas -= costo;
    estado.compras++;
    estado.tablero[i] = nivelComprado();
    crearObjeto(i, nivelComprado(), true);
    vibrar(20);
    guardarProgreso();
    actualizar();
});

const botonMejorCompra = crearBoton("Mejor compra", () => {
    const costo = costoMejorCompra();
    if (estado.monedas < costo) return;
    estado.monedas -= costo;
    estado.mejorCompra++;
    vibrar(25);
    guardarProgreso();
    actualizar();
});

const botonGanancia = crearBoton("Más ganancia", () => {
    const costo = costoGanancia();
    if (estado.monedas < costo) return;
    estado.monedas -= costo;
    estado.ganancia++;
    vibrar(25);
    guardarProgreso();
    actualizar();
});

function pintarBoton(boton, detalle, costo, habilitado = true) {
    boton.querySelector(".detalle").textContent = detalle;
    boton.querySelector(".precio").innerHTML = `${MONEDA}${formatear(costo)}`;
    boton.disabled = !habilitado || estado.monedas < costo;
}

function actualizar() {
    const libres = estado.tablero.filter((n) => !n).length;
    $("monedas").innerHTML = `${MONEDA}${formatear(estado.monedas)}`;
    $("por-segundo").textContent = `${formatear(porSegundo())} por segundo · mejor: nivel ${estado.maximo}`;
    pintarBoton(botonComprar, libres ? `Agrega un nivel ${nivelComprado()}` : "Tablero lleno: fusioná", costoCompra(), libres > 0);
    pintarBoton(botonMejorCompra, `Comprás nivel ${nivelComprado() + 1}`, costoMejorCompra());
    pintarBoton(botonGanancia, `×${(1 + estado.ganancia * 0.5).toFixed(1)} producción`, costoGanancia());
}

// Producción automática
let acumulado = 0;
alAnimar((dt) => {
    estado.monedas += porSegundo() * dt;
    acumulado += dt;
    if (acumulado > 0.25) {
        acumulado = 0;
        actualizar();
    }
});

const ausente = Math.min((Date.now() - estado.ultimaVez) / 1000, MAX_HORAS_AUSENTE * 3600);
const ganadoAusente = porSegundo() * ausente;
if (ganadoAusente >= 1) {
    estado.monedas += ganadoAusente;
    avisar(`<div>Mientras no estabas</div><div>+${MONEDA}${formatear(ganadoAusente)}</div>`);
}

function guardarProgreso() {
    estado.ultimaVez = Date.now();
    guardar(CLAVE, estado);
}
setInterval(guardarProgreso, 5000);
document.addEventListener("visibilitychange", guardarProgreso);
addEventListener("pagehide", guardarProgreso);

actualizar();
