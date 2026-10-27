// Isla Fábrica: tocá el cristal para ganar monedas y comprá máquinas que producen solas.
import { THREE, crearEscena, material, formatear, cargar, guardar, textoFlotante, vibrar, MONEDA } from "../../js/comun3d.js";

const CLAVE = "isla-fabrica";
const MAX_HORAS_AUSENTE = 2;

const MAQUINAS = [
    { id: "pico", nombre: "Pico", costo: 15, produce: 0.5, color: 0x9aa4b5, radio: 3.2 },
    { id: "taladro", nombre: "Taladro", costo: 120, produce: 4, color: 0xe67e22, radio: 4.1 },
    { id: "fundidora", nombre: "Fundidora", costo: 1300, produce: 30, color: 0xc0392b, radio: 5.0 },
    { id: "laboratorio", nombre: "Laboratorio", costo: 14000, produce: 220, color: 0x27ae60, radio: 5.9 },
    { id: "portal", nombre: "Portal", costo: 160000, produce: 1800, color: 0x8e44ad, radio: 6.8 },
];
const VISIBLES_POR_TIPO = 12;

const estado = cargar(CLAVE, { monedas: 0, golpe: 0, maquinas: {}, ultimaVez: Date.now() });
for (const m of MAQUINAS) estado.maquinas[m.id] ??= 0;

const costoMaquina = (m) => m.costo * 1.15 ** estado.maquinas[m.id];
const costoGolpe = () => 30 * 3.2 ** estado.golpe;
const porToque = () => 2 ** estado.golpe;
const porSegundo = () => MAQUINAS.reduce((total, m) => total + m.produce * estado.maquinas[m.id], 0);

// ---------- Escena ----------
const lienzo = document.getElementById("lienzo");
const { scene, camera, renderer, alAnimar } = crearEscena(lienzo, { fondo: 0x241a5c });
camera.position.set(0, 13, 20);
camera.lookAt(0, 1, 0);

const isla = new THREE.Group();
scene.add(isla);

const pasto = new THREE.Mesh(new THREE.CylinderGeometry(8, 8, 1, 48), material(0x4caf50));
pasto.receiveShadow = true;
isla.add(pasto);
const roca = new THREE.Mesh(new THREE.ConeGeometry(8, 6, 48), material(0x6d4c41));
roca.rotation.x = Math.PI;
roca.position.y = -3.5;
isla.add(roca);

const cristal = new THREE.Mesh(
    new THREE.OctahedronGeometry(1.4),
    material(0x5ce1ff, { emissive: 0x1a6b8a, roughness: 0.2, metalness: 0.3 })
);
cristal.position.y = 2.5;
cristal.castShadow = true;
isla.add(cristal);

const FORMAS = {
    pico: () => new THREE.ConeGeometry(0.35, 0.9, 6),
    taladro: () => new THREE.CylinderGeometry(0.3, 0.45, 1, 8),
    fundidora: () => new THREE.BoxGeometry(0.8, 0.8, 0.8),
    laboratorio: () => new THREE.SphereGeometry(0.45, 16, 12),
    portal: () => new THREE.TorusGeometry(0.4, 0.13, 8, 20),
};
const piezas = Object.fromEntries(MAQUINAS.map((m) => [m.id, []]));

function agregarPieza(m, animar) {
    const lista = piezas[m.id];
    if (lista.length >= VISIBLES_POR_TIPO) return;
    const pieza = new THREE.Mesh(FORMAS[m.id](), material(m.color));
    const angulo = (lista.length / VISIBLES_POR_TIPO) * Math.PI * 2 + m.radio;
    pieza.position.set(Math.cos(angulo) * m.radio, 0.9, Math.sin(angulo) * m.radio);
    pieza.castShadow = true;
    pieza.userData.fase = Math.random() * Math.PI * 2;
    if (animar) pieza.scale.setScalar(0.01);
    isla.add(pieza);
    lista.push(pieza);
}

for (const m of MAQUINAS) {
    for (let i = 0; i < Math.min(estado.maquinas[m.id], VISIBLES_POR_TIPO); i++) agregarPieza(m, false);
}

// Monedas que saltan del cristal al tocar
const geoMoneda = new THREE.CylinderGeometry(0.25, 0.25, 0.08, 16);
const matMoneda = material(0xffcc33, { metalness: 0.6, roughness: 0.3 });
const monedasVolando = [];

function lanzarMoneda() {
    const moneda = new THREE.Mesh(geoMoneda, matMoneda);
    moneda.position.copy(cristal.position);
    const angulo = Math.random() * Math.PI * 2;
    moneda.userData.vel = new THREE.Vector3(Math.cos(angulo) * 3, 6 + Math.random() * 2, Math.sin(angulo) * 3);
    moneda.userData.vida = 1;
    isla.add(moneda);
    monedasVolando.push(moneda);
}

let golpeVisual = 0;
alAnimar((dt) => {
    isla.rotation.y += dt * 0.12;
    cristal.rotation.y += dt * 1.2;
    golpeVisual = Math.max(0, golpeVisual - dt * 4);
    cristal.scale.setScalar(1 + golpeVisual * 0.25);
    cristal.position.y = 2.5 + Math.sin(performance.now() / 600) * 0.15;

    const t = performance.now() / 1000;
    for (const lista of Object.values(piezas)) {
        for (const p of lista) {
            if (p.scale.x < 1) p.scale.setScalar(Math.min(1, p.scale.x + dt * 3));
            p.position.y = 0.9 + Math.abs(Math.sin(t * 3 + p.userData.fase)) * 0.25;
            p.rotation.y += dt;
        }
    }

    for (let i = monedasVolando.length - 1; i >= 0; i--) {
        const m = monedasVolando[i];
        m.userData.vel.y -= 18 * dt;
        m.position.addScaledVector(m.userData.vel, dt);
        m.rotation.x += dt * 10;
        m.userData.vida -= dt;
        if (m.userData.vida <= 0) {
            isla.remove(m);
            monedasVolando.splice(i, 1);
        }
    }
});

// ---------- Juego ----------
const $ = (id) => document.getElementById(id);

renderer.domElement.addEventListener("pointerdown", (e) => {
    const ganancia = porToque();
    estado.monedas += ganancia;
    golpeVisual = 1;
    lanzarMoneda();
    vibrar();
    textoFlotante(e.clientX, e.clientY, `+${formatear(ganancia)}`);
    actualizar();
});

function crearBoton(titulo, alComprar) {
    const boton = document.createElement("button");
    boton.className = "mejora";
    boton.innerHTML = `<span class="titulo">${titulo}</span><span class="detalle"></span><span class="precio"></span>`;
    boton.addEventListener("click", alComprar);
    $("mejoras").appendChild(boton);
    return boton;
}

const botonGolpe = crearBoton("Golpe más fuerte", () => {
    const costo = costoGolpe();
    if (estado.monedas < costo) return;
    estado.monedas -= costo;
    estado.golpe++;
    vibrar(25);
    actualizar();
});

const botonesMaquina = MAQUINAS.map((m) => ({
    m,
    boton: crearBoton(m.nombre, () => {
        const costo = costoMaquina(m);
        if (estado.monedas < costo) return;
        estado.monedas -= costo;
        estado.maquinas[m.id]++;
        agregarPieza(m, true);
        vibrar(25);
        actualizar();
    }),
}));

function pintarBoton(boton, detalle, costo) {
    boton.querySelector(".detalle").textContent = detalle;
    boton.querySelector(".precio").innerHTML = `${MONEDA}${formatear(costo)}`;
    boton.disabled = estado.monedas < costo;
}

function actualizar() {
    $("monedas").innerHTML = `${MONEDA}${formatear(estado.monedas)}`;
    $("por-segundo").textContent = `${formatear(porSegundo())} por segundo · tocá el cristal`;
    pintarBoton(botonGolpe, `Nivel ${estado.golpe} · +${formatear(porToque())} por toque`, costoGolpe());
    for (const { m, boton } of botonesMaquina) {
        pintarBoton(boton, `Tenés ${estado.maquinas[m.id]} · +${formatear(m.produce)}/s c/u`, costoMaquina(m));
    }
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

// Ganancias mientras la app estuvo cerrada
const ausente = Math.min((Date.now() - estado.ultimaVez) / 1000, MAX_HORAS_AUSENTE * 3600);
const ganadoAusente = porSegundo() * ausente;
if (ganadoAusente >= 1) {
    estado.monedas += ganadoAusente;
    $("aviso").innerHTML = `<div>Mientras no estabas</div><div>+${MONEDA}${formatear(ganadoAusente)}</div>`;
    $("aviso").hidden = false;
    setTimeout(() => ($("aviso").hidden = true), 3000);
}

function guardarProgreso() {
    estado.ultimaVez = Date.now();
    guardar(CLAVE, estado);
}
setInterval(guardarProgreso, 5000);
document.addEventListener("visibilitychange", guardarProgreso);
addEventListener("pagehide", guardarProgreso);

actualizar();
