// Mina Profunda: picá la roca, juntá recursos y construí máquinas que consiguen más recursos.
// Cadena: piedra → carbón → hierro → oro → cristal.
import {
    THREE, crearEscena, material, formatear, cargar, guardar, textoFlotante, aPantalla, vibrar,
    fondoDegradado, geometriaRoca, crearParticulas,
} from "../../js/comun3d.js";
import { icono } from "../../js/iconos.js";

const $ = (id) => document.getElementById(id);
const CLAVE = "mina";
const MAX_HORAS_AUSENTE = 2;

const RECURSOS = {
    piedra: { nombre: "Piedra", color: "#b3b8c2", hex: 0x9aa0ab, porToque: 1 },
    carbon: { nombre: "Carbón", color: "#55555f", hex: 0x2c2c33, porToque: 0.5 },
    hierro: { nombre: "Hierro", color: "#e0956a", hex: 0xc97a4e, porToque: 0.3 },
    oro: { nombre: "Oro", color: "#ffcc33", hex: 0xffc12e, porToque: 0.15 },
    cristal: { nombre: "Cristal", color: "#7df9ff", hex: 0x55e6ff, porToque: 0.05 },
};
const IDS = Object.keys(RECURSOS);

// Nivel de pico necesario para picar cada veta
const VETA_REQUIERE = { piedra: 0, carbon: 1, hierro: 2, oro: 4, cristal: 6 };

const NIVELES_PICO = [
    { piedra: 15 },
    { piedra: 60, carbon: 15 },
    { piedra: 200, hierro: 20 },
    { hierro: 80, carbon: 120 },
    { hierro: 250, oro: 10 },
    { oro: 60, hierro: 600 },
    { oro: 250, cristal: 5 },
];

const MAQUINAS = [
    { id: "excavadora", nombre: "Excavadora", icono: "excavadora", costo: { piedra: 20 }, produce: { piedra: 1 }, pos: [-2.4, 1.7] },
    { id: "vagoneta", nombre: "Mina de carbón", icono: "pico", costo: { piedra: 80 }, produce: { carbon: 0.6 }, pos: [2.4, 1.7] },
    {
        id: "fundicion", nombre: "Fundición", icono: "fundicion",
        costo: { piedra: 150, carbon: 50 }, produce: { hierro: 0.5 }, consume: { carbon: 0.25 }, pos: [-2.6, -1.3],
    },
    { id: "taladro", nombre: "Taladro de oro", icono: "taladro", costo: { hierro: 120, carbon: 150 }, produce: { oro: 0.25 }, pos: [2.6, -1.3] },
    {
        id: "refineria", nombre: "Refinería", icono: "diamante",
        costo: { oro: 80, hierro: 400 }, produce: { cristal: 0.08 }, consume: { oro: 0.05 }, pos: [0, -3.1],
    },
];
const ESCALA_COSTO = 1.17;
const MAX_VISIBLES = 3;

const estado = cargar(CLAVE, { recursos: {}, vistos: {}, maquinas: {}, pico: 0, nucleo: 0, veta: "piedra", ultimaVez: Date.now() });
for (const id of IDS) {
    estado.recursos[id] ??= 0;
    estado.vistos[id] ??= false;
}
estado.vistos.piedra = true;
for (const m of MAQUINAS) estado.maquinas[m.id] ??= 0;

// ---------- Reglas ----------
const multiplicador = () => 1.5 ** estado.nucleo;
const porToque = (id) => RECURSOS[id].porToque * 1.6 ** estado.pico * multiplicador();
const costoMaquina = (m) =>
    Object.fromEntries(Object.entries(m.costo).map(([r, c]) => [r, Math.ceil(c * ESCALA_COSTO ** estado.maquinas[m.id])]));
const costoNucleo = () => ({ cristal: Math.ceil(10 * 4 ** estado.nucleo) });

function costoPico(nivel) {
    if (nivel < NIVELES_PICO.length) return NIVELES_PICO[nivel];
    const extra = 3 ** (nivel - NIVELES_PICO.length + 1);
    return { oro: 250 * extra, cristal: 5 * extra };
}

const alcanza = (costo) => Object.entries(costo).every(([r, c]) => estado.recursos[r] >= c);

function pagar(costo) {
    for (const [r, c] of Object.entries(costo)) estado.recursos[r] -= c;
}

function sumar(id, cantidad) {
    estado.recursos[id] = Math.max(0, estado.recursos[id] + cantidad);
    if (cantidad > 0 && !estado.vistos[id]) {
        estado.vistos[id] = true;
        descubrir(id);
    }
}

// Ritmo neto por segundo de cada recurso. Si falta lo que una máquina consume, produce menos.
function ritmos(dt = 1) {
    const ritmo = Object.fromEntries(IDS.map((id) => [id, 0]));
    for (const m of MAQUINAS) {
        const n = estado.maquinas[m.id];
        if (!n) continue;
        let factor = 1;
        for (const [r, c] of Object.entries(m.consume ?? {})) {
            factor = Math.min(factor, estado.recursos[r] / (c * n * dt));
        }
        factor = THREE.MathUtils.clamp(factor, 0, 1);
        for (const [r, c] of Object.entries(m.consume ?? {})) ritmo[r] -= c * n * factor;
        for (const [r, c] of Object.entries(m.produce)) ritmo[r] += c * n * factor * multiplicador();
    }
    return ritmo;
}

function producir(dt) {
    const ritmo = ritmos(dt);
    for (const id of IDS) if (ritmo[id]) sumar(id, ritmo[id] * dt);
}

// ---------- Escena ----------
const lienzo = $("lienzo");
const { scene, camera, renderer, alAnimar } = crearEscena(lienzo, { fondo: 0x1c120a, fov: 55 });
scene.background = fondoDegradado("#4a2e16", "#0d0704");
scene.fog = new THREE.Fog(0x1c120a, 14, 30);
const particulas = crearParticulas(scene);
alAnimar(particulas.actualizar);

function caja(w, h, d, mat, x = 0, y = 0, z = 0, padre) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    padre?.add(m);
    return m;
}

const suelo = new THREE.Mesh(new THREE.CircleGeometry(16, 48), material(0x5c3f27, { roughness: 1 }));
suelo.rotation.x = -Math.PI / 2;
suelo.receiveShadow = true;
scene.add(suelo);

// Paredes de la cueva
const matPared = material(0x4b3322, { flatShading: true, roughness: 1 });
for (let i = 0; i < 16; i++) {
    const a = Math.PI * (-0.1 + (1.2 * i) / 15);
    const r = 7.5 + Math.random() * 2;
    const roca = new THREE.Mesh(geometriaRoca(1.6 + Math.random() * 1.6, 1, 0.3), matPared);
    roca.position.set(Math.cos(a) * r, 0.6 + Math.random() * 1.2, -Math.sin(a) * r);
    roca.rotation.set(Math.random(), Math.random() * 6, 0);
    roca.receiveShadow = true;
    scene.add(roca);
}

// Piedritas sueltas
const matPiedrita = material(0x7a6450, { flatShading: true });
for (let i = 0; i < 30; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = 3.5 + Math.random() * 4;
    const p = new THREE.Mesh(geometriaRoca(0.08 + Math.random() * 0.18, 0, 0.3), matPiedrita);
    p.position.set(Math.cos(a) * r, 0.05, Math.sin(a) * r);
    p.castShadow = true;
    scene.add(p);
}

// Faroles con luz cálida que titila
const faroles = [-4.3, 4.3].map((x) => {
    const poste = caja(0.1, 1.6, 0.1, material(0x4a2f1b), x, 0.8, 0.2);
    scene.add(poste);
    const vidrio = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 8), material(0xffc070, { emissive: 0xff9a2e, emissiveIntensity: 2 }));
    vidrio.position.set(x, 1.7, 0.2);
    scene.add(vidrio);
    const luz = new THREE.PointLight(0xff9a40, 18, 9, 1.6);
    luz.position.set(x, 1.8, 0.4);
    scene.add(luz);
    return luz;
});

// Veta central: roca con gemas del recurso elegido
const veta = new THREE.Group();
veta.position.set(0, 0, 0.3);
scene.add(veta);
const rocaCentral = new THREE.Mesh(geometriaRoca(1.5, 1, 0.2), material(0x6f7178, { flatShading: true, roughness: 0.9 }));
rocaCentral.position.y = 1.2;
rocaCentral.castShadow = true;
veta.add(rocaCentral);

const matGema = material(0xffffff, { flatShading: true, metalness: 0.4, roughness: 0.25 });
for (let i = 0; i < 16; i++) {
    const dir = new THREE.Vector3(Math.random() - 0.5, Math.random() * 0.9 - 0.2, Math.random() - 0.5).normalize();
    const gema = new THREE.Mesh(new THREE.OctahedronGeometry(0.16 + Math.random() * 0.14), matGema);
    gema.position.copy(dir).multiplyScalar(1.4).add(rocaCentral.position);
    gema.lookAt(rocaCentral.position);
    gema.scale.set(1, 1, 1.6);
    veta.add(gema);
}

function pintarVeta() {
    const r = RECURSOS[estado.veta];
    matGema.color.setHex(r.hex);
    const brilla = ["oro", "cristal"].includes(estado.veta);
    matGema.emissive.setHex(brilla ? r.hex : 0x000000);
    matGema.emissiveIntensity = brilla ? 0.6 : 0;
}

// Pico que golpea la roca en cada toque
const pico = new THREE.Group();
pico.position.set(1.6, 2.5, 1.5);
pico.scale.setScalar(1.7);
scene.add(pico);
const mango = caja(0.08, 1.1, 0.08, material(0x8b5a2b), 0, -0.4, 0, pico);
const cabeza = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.9, 6), material(0xcfd6e0, { metalness: 0.8, roughness: 0.3 }));
cabeza.rotation.z = Math.PI / 2;
cabeza.position.set(-0.05, 0.12, 0);
pico.add(cabeza);
mango.castShadow = true;

// ---------- Modelos de máquinas ----------
const MODELOS = {
    excavadora() {
        const g = new THREE.Group();
        const amarillo = material(0xf6b800);
        const negro = material(0x26262b);
        caja(1, 0.25, 0.22, negro, 0, 0.13, -0.32, g);
        caja(1, 0.25, 0.22, negro, 0, 0.13, 0.32, g);
        caja(0.85, 0.4, 0.62, amarillo, 0, 0.45, 0, g);
        caja(0.38, 0.38, 0.5, material(0x9fdcff, { metalness: 0.3, roughness: 0.1 }), -0.18, 0.84, 0, g);
        const brazo = new THREE.Group();
        brazo.position.set(0.32, 0.62, 0);
        g.add(brazo);
        caja(0.85, 0.12, 0.12, amarillo, 0.42, 0, 0, brazo);
        caja(0.28, 0.26, 0.42, negro, 0.88, -0.12, 0, brazo);
        g.userData.animar = (t) => (brazo.rotation.z = -0.35 + Math.sin(t * 2.2) * 0.4);
        return g;
    },
    vagoneta() {
        const g = new THREE.Group();
        const madera = material(0x8b5a2b);
        caja(0.14, 1.15, 0.14, madera, -0.5, 0.58, -0.45, g);
        caja(0.14, 1.15, 0.14, madera, 0.5, 0.58, -0.45, g);
        caja(1.2, 0.16, 0.2, madera, 0, 1.2, -0.45, g);
        const hueco = new THREE.Mesh(new THREE.PlaneGeometry(0.86, 1.1), new THREE.MeshBasicMaterial({ color: 0x050302 }));
        hueco.position.set(0, 0.55, -0.52);
        g.add(hueco);
        const metal = material(0x9aa0ab, { metalness: 0.7, roughness: 0.4 });
        caja(0.05, 0.05, 1.6, metal, -0.18, 0.03, 0.2, g);
        caja(0.05, 0.05, 1.6, metal, 0.18, 0.03, 0.2, g);
        const carrito = new THREE.Group();
        g.add(carrito);
        caja(0.46, 0.28, 0.42, material(0x6b6f78, { metalness: 0.6 }), 0, 0.22, 0, carrito);
        for (let i = 0; i < 4; i++) {
            const carbon = new THREE.Mesh(geometriaRoca(0.09, 0, 0.3), material(0x1d1d22, { flatShading: true }));
            carbon.position.set((i % 2) * 0.16 - 0.08, 0.4, Math.floor(i / 2) * 0.16 - 0.08);
            carrito.add(carbon);
        }
        g.userData.animar = (t) => (carrito.position.z = 0.25 + Math.sin(t * 1.4) * 0.55);
        g.rotation.y = Math.PI / 2;
        return g;
    },
    fundicion() {
        const g = new THREE.Group();
        caja(0.95, 0.85, 0.85, material(0xa4452d, { roughness: 0.95 }), 0, 0.43, 0, g);
        caja(1.05, 0.12, 0.95, material(0x5b2a1c), 0, 0.9, 0, g);
        const chimenea = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 0.85, 10), material(0x3a2a24));
        chimenea.position.set(-0.25, 1.35, -0.2);
        chimenea.castShadow = true;
        g.add(chimenea);
        const boca = new THREE.Mesh(
            new THREE.PlaneGeometry(0.42, 0.3),
            new THREE.MeshStandardMaterial({ color: 0xff7a1a, emissive: 0xff5a00, emissiveIntensity: 2 })
        );
        boca.position.set(0.48, 0.35, 0);
        boca.rotation.y = Math.PI / 2;
        g.add(boca);
        const salida = new THREE.Vector3(-0.25, 1.85, -0.2);
        let humo = Math.random();
        g.userData.animar = (t, dt) => {
            boca.material.emissiveIntensity = 1.6 + Math.sin(t * 7) * 0.5;
            humo -= dt;
            if (humo <= 0) {
                humo = 0.5;
                particulas.emitir(g.localToWorld(salida.clone()), 0x555055, 1, {
                    velocidad: 0.25, arriba: 1.2, tamano: 0.3, gravedad: -0.6, vida: 1.6,
                });
            }
        };
        return g;
    },
    taladro() {
        const g = new THREE.Group();
        const gris = material(0x5d6470, { metalness: 0.6 });
        caja(0.9, 0.18, 0.9, gris, 0, 0.09, 0, g);
        for (const [x, z] of [[-0.38, -0.38], [0.38, -0.38], [-0.38, 0.38], [0.38, 0.38]]) caja(0.08, 1.4, 0.08, gris, x, 0.8, z, g);
        caja(0.95, 0.16, 0.95, material(0xff8a1f), 0, 1.5, 0, g);
        const broca = new THREE.Group();
        g.add(broca);
        const eje = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.7, 8), gris);
        eje.position.y = 1.1;
        broca.add(eje);
        const punta = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.55, 8), material(0xffd54a, { metalness: 0.8, roughness: 0.3 }));
        punta.rotation.x = Math.PI;
        punta.position.y = 0.55;
        broca.add(punta);
        const base = new THREE.Vector3(0, 0.25, 0);
        let chispa = Math.random();
        g.userData.animar = (t, dt) => {
            broca.rotation.y += dt * 12;
            broca.position.y = Math.sin(t * 3) * 0.12 - 0.05;
            chispa -= dt;
            if (chispa <= 0) {
                chispa = 0.35;
                particulas.emitir(g.localToWorld(base.clone()), 0xffcc33, 2, { velocidad: 1.5, arriba: 2, tamano: 0.06, vida: 0.5, brillo: true });
            }
        };
        return g;
    },
    refineria() {
        const g = new THREE.Group();
        const base = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.68, 0.32, 24), material(0x8a8f99, { metalness: 0.75, roughness: 0.3 }));
        base.position.y = 0.16;
        base.castShadow = true;
        g.add(base);
        const cupula = new THREE.Mesh(
            new THREE.SphereGeometry(0.55, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2),
            new THREE.MeshStandardMaterial({ color: 0xaef6ff, transparent: true, opacity: 0.28, roughness: 0.05 })
        );
        cupula.position.y = 0.32;
        g.add(cupula);
        const cristal = new THREE.Mesh(
            new THREE.OctahedronGeometry(0.2),
            material(0x7df9ff, { emissive: 0x2bd8ff, emissiveIntensity: 1.4, flatShading: true })
        );
        g.add(cristal);
        const anillo = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.035, 8, 40), material(0xffcc33, { metalness: 0.9, roughness: 0.2 }));
        anillo.position.y = 0.5;
        g.add(anillo);
        g.userData.animar = (t) => {
            cristal.position.y = 0.6 + Math.sin(t * 2) * 0.06;
            cristal.rotation.y = t * 1.5;
            anillo.rotation.x = Math.PI / 2 + Math.sin(t) * 0.3;
            anillo.rotation.z = t;
        };
        return g;
    },
};

const DESPLAZAMIENTOS = [[0, 0], [0.75, 0.75], [-0.75, 0.75]];
const instaladas = Object.fromEntries(MAQUINAS.map((m) => [m.id, []]));
const etiquetas = {};

function instalar(m, animar) {
    const lista = instaladas[m.id];
    if (lista.length >= MAX_VISIBLES) return;
    const g = MODELOS[m.id]();
    const [dx, dz] = DESPLAZAMIENTOS[lista.length];
    const lado = Math.sign(m.pos[0]) || 1;
    g.position.set(m.pos[0] + dx * lado, 0, m.pos[1] + dz);
    // Mira hacia la veta central
    const giro = Math.atan2(-(veta.position.z - g.position.z), veta.position.x - g.position.x);
    g.rotation.y += giro;
    g.traverse((o) => o.isMesh && (o.castShadow = true));
    g.userData.crecer = animar ? 0 : 1;
    g.scale.setScalar(animar ? 0.01 : 1);
    scene.add(g);
    lista.push(g);
    if (animar) particulas.emitir(g.position.clone().setY(0.3), 0x9c7a55, 14, { velocidad: 2.5, arriba: 3, tamano: 0.14 });
}

for (const m of MAQUINAS) {
    for (let i = 0; i < Math.min(estado.maquinas[m.id], MAX_VISIBLES); i++) instalar(m, false);
    const e = document.createElement("div");
    e.className = "etiqueta-3d";
    e.hidden = true;
    lienzo.appendChild(e);
    etiquetas[m.id] = e;
}

// ---------- Animación ----------
let golpe = 0;
let tiempo = 0;
const ayuda = new THREE.Vector3();

alAnimar((dt) => {
    tiempo += dt;
    // Cámara: se aleja en pantallas angostas para que entre todo
    const lejos = Math.max(1, 0.8 / camera.aspect);
    camera.position.set(0, 7.2 * lejos, 9.5 * lejos);
    camera.lookAt(0, 0.6, -0.4);

    golpe = Math.max(0, golpe - dt * 5);
    rocaCentral.scale.set(1 + golpe * 0.08, 1 - golpe * 0.1, 1 + golpe * 0.08);
    pico.rotation.z = -0.2 + Math.sin(golpe * Math.PI) * 1.2;
    veta.rotation.y += dt * 0.15;

    faroles.forEach((luz, i) => (luz.intensity = 16 + Math.sin(tiempo * 9 + i * 2) * 2 + Math.random() * 1.5));

    const caja2d = lienzo.getBoundingClientRect();
    for (const m of MAQUINAS) {
        for (const g of instaladas[m.id]) {
            if (g.userData.crecer < 1) {
                g.userData.crecer = Math.min(1, g.userData.crecer + dt * 3);
                const c = g.userData.crecer;
                g.scale.setScalar(c < 0.7 ? c * 1.6 : 1.12 - (c - 0.7) * 0.4);
            }
            g.userData.animar?.(tiempo, dt);
        }
        const n = estado.maquinas[m.id];
        const e = etiquetas[m.id];
        e.hidden = n === 0;
        if (n) {
            const p = aPantalla(ayuda.set(m.pos[0], 2.1, m.pos[1]), camera, renderer.domElement);
            e.style.left = `${p.x - caja2d.left}px`;
            e.style.top = `${p.y - caja2d.top}px`;
            e.innerHTML = `${icono(m.icono)} ×${n}`;
        }
    }
});

// ---------- Picar ----------
renderer.domElement.addEventListener("pointerdown", (e) => {
    const id = estado.veta;
    const ganancia = porToque(id);
    sumar(id, ganancia);
    golpe = 1;
    vibrar();
    const r = RECURSOS[id];
    particulas.emitir(ayuda.set(0.9, 1.6, 1.2), r.hex, 6, { velocidad: 2.5, arriba: 4, tamano: 0.13, brillo: id === "cristal" });
    textoFlotante(e.clientX, e.clientY, `+${formatear(ganancia)} ${r.nombre}`, r.color);
    saltar(id);
    actualizar();
});

// ---------- Interfaz ----------
const punto = (id) => `<i class="punto" style="--c:${RECURSOS[id].color}"></i>`;

const chips = {};
for (const id of IDS) {
    const chip = document.createElement("div");
    chip.className = "recurso";
    chip.innerHTML = `<div class="cantidad">${punto(id)}<span></span></div><div class="ritmo"></div>`;
    chip.hidden = !estado.vistos[id];
    $("recursos").appendChild(chip);
    chips[id] = chip;
}

function saltar(id) {
    const chip = chips[id];
    chip.classList.remove("salto");
    void chip.offsetWidth;
    chip.classList.add("salto");
}

const botonesVeta = {};
for (const id of IDS) {
    const b = document.createElement("button");
    b.className = "veta";
    b.style.setProperty("--c", RECURSOS[id].color);
    b.addEventListener("click", () => {
        estado.veta = id;
        pintarVeta();
        actualizar();
    });
    $("vetas").appendChild(b);
    botonesVeta[id] = b;
}

function descubrir(id) {
    chips[id].hidden = false;
    avisar(`<div>¡Nuevo recurso!</div><div>${punto(id)}${RECURSOS[id].nombre}</div>`);
}

function avisar(html) {
    $("aviso").innerHTML = html;
    $("aviso").hidden = false;
    clearTimeout(avisar.t);
    avisar.t = setTimeout(() => ($("aviso").hidden = true), 2200);
}

const listaCosto = (costo) =>
    Object.entries(costo)
        .map(([r, c]) => `<span class="costo ${estado.recursos[r] >= c ? "" : "falta"}">${punto(r)}${formatear(c)}</span>`)
        .join("");

function crearTarjeta(alComprar) {
    const b = document.createElement("button");
    b.className = "mejora";
    b.innerHTML = `<span class="titulo"></span><span class="nivel"></span><span class="detalle"></span><span class="precio"></span>`;
    b.addEventListener("click", alComprar);
    $("mejoras").appendChild(b);
    return b;
}

function pintarTarjeta(b, { titulo, nivel, detalle, costo, visible = true }) {
    b.hidden = !visible;
    if (!visible) return;
    b.querySelector(".titulo").innerHTML = titulo;
    b.querySelector(".nivel").textContent = nivel;
    b.querySelector(".detalle").innerHTML = detalle;
    b.querySelector(".precio").innerHTML = listaCosto(costo);
    const puede = alcanza(costo);
    b.disabled = !puede;
    b.classList.toggle("se-puede", puede);
}

const tarjetaPico = crearTarjeta(() => {
    const costo = costoPico(estado.pico);
    if (!alcanza(costo)) return;
    pagar(costo);
    estado.pico++;
    vibrar(40);
    const nueva = IDS.find((id) => VETA_REQUIERE[id] === estado.pico);
    if (nueva) avisar(`<div>¡Veta desbloqueada!</div><div>${punto(nueva)}${RECURSOS[nueva].nombre}</div>`);
    particulas.emitir(pico.position.clone(), 0xffffff, 12, { velocidad: 2, arriba: 3, tamano: 0.1, brillo: true });
    actualizar();
});

const tarjetasMaquina = MAQUINAS.map((m) => ({
    m,
    b: crearTarjeta(() => {
        const costo = costoMaquina(m);
        if (!alcanza(costo)) return;
        pagar(costo);
        estado.maquinas[m.id]++;
        instalar(m, true);
        vibrar(40);
        actualizar();
    }),
}));

const tarjetaNucleo = crearTarjeta(() => {
    const costo = costoNucleo();
    if (!alcanza(costo)) return;
    pagar(costo);
    estado.nucleo++;
    vibrar(60);
    avisar(`<div>Producción ×${multiplicador().toFixed(2)}</div>`);
    actualizar();
});

function actualizar() {
    const ritmo = ritmos();
    for (const id of IDS) {
        const chip = chips[id];
        if (chip.hidden) continue;
        chip.querySelector("span").textContent = formatear(estado.recursos[id]);
        const r = chip.querySelector(".ritmo");
        const v = ritmo[id];
        r.textContent = v ? `${v > 0 ? "+" : "−"}${formatear(Math.abs(v))}/s` : "—";
        r.classList.toggle("negativo", v < 0);
    }

    for (const id of IDS) {
        const b = botonesVeta[id];
        const bloqueada = estado.pico < VETA_REQUIERE[id];
        b.hidden = bloqueada && !estado.vistos[id] && VETA_REQUIERE[id] > estado.pico + 1;
        b.disabled = bloqueada;
        b.classList.toggle("activa", estado.veta === id);
        b.innerHTML = bloqueada ? `🔒 ${RECURSOS[id].nombre}` : `${punto(id)}${RECURSOS[id].nombre}`;
    }

    const proxima = IDS.find((id) => VETA_REQUIERE[id] === estado.pico + 1);
    pintarTarjeta(tarjetaPico, {
        titulo: `${icono("pico")}Mejorar pico`,
        nivel: `Nv ${estado.pico}`,
        detalle: proxima ? `Desbloquea la veta de ${RECURSOS[proxima].nombre}` : `+60% por golpe`,
        costo: costoPico(estado.pico),
    });

    for (const { m, b } of tarjetasMaquina) {
        const costo = costoMaquina(m);
        const produce = Object.entries(m.produce).map(([r, c]) => `+${formatear(c * multiplicador())} ${RECURSOS[r].nombre}/s`);
        const consume = Object.entries(m.consume ?? {}).map(([r, c]) => `usa ${formatear(c)} ${RECURSOS[r].nombre}/s`);
        pintarTarjeta(b, {
            titulo: `${icono(m.icono)}${m.nombre}`,
            nivel: `×${estado.maquinas[m.id]}`,
            detalle: [...produce, ...consume].join(" · "),
            costo,
            visible: Object.keys(costo).every((r) => estado.vistos[r]),
        });
    }

    pintarTarjeta(tarjetaNucleo, {
        titulo: `${icono("orbe")}Núcleo de cristal`,
        nivel: `Nv ${estado.nucleo}`,
        detalle: `Todo produce ×1.5 más`,
        costo: costoNucleo(),
        visible: estado.vistos.cristal,
    });
}

// Producción automática
let acumulado = 0;
alAnimar((dt) => {
    producir(dt);
    acumulado += dt;
    if (acumulado > 0.2) {
        acumulado = 0;
        actualizar();
    }
});

// Lo producido mientras la app estuvo cerrada (en pasos, para respetar lo que consume cada máquina)
const ausente = Math.min((Date.now() - estado.ultimaVez) / 1000, MAX_HORAS_AUSENTE * 3600);
if (ausente > 30 && MAQUINAS.some((m) => estado.maquinas[m.id])) {
    const antes = { ...estado.recursos };
    for (let t = 0; t < ausente; t += 10) producir(Math.min(10, ausente - t));
    const ganado = IDS.filter((id) => estado.recursos[id] - antes[id] >= 1)
        .map((id) => `<div class="chico">${punto(id)}+${formatear(estado.recursos[id] - antes[id])} ${RECURSOS[id].nombre}</div>`)
        .join("");
    if (ganado) avisar(`<div>Mientras no estabas</div>${ganado}`);
}

function guardarProgreso() {
    estado.ultimaVez = Date.now();
    guardar(CLAVE, estado);
}
setInterval(guardarProgreso, 5000);
document.addEventListener("visibilitychange", guardarProgreso);
addEventListener("pagehide", guardarProgreso);

pintarVeta();
actualizar();
