// Colonia espacial: tocá el planeta para juntar energía y construí cosas que orbitan y producen solas.
// Saltar de galaxia reinicia todo a cambio de materia oscura, que multiplica la producción.
import {
    THREE, crearEscena, material, formatear, cargar, guardar, textoFlotante, aPantalla, vibrar, crearParticulas,
} from "../../js/comun3d.js";
import { icono } from "../../js/iconos.js";

const $ = (id) => document.getElementById(id);
const CLAVE = "colonia";
const CRECIMIENTO = 1.15;
const HITOS = [10, 25, 50, 100, 200]; // en cada uno ese edificio produce el doble
const MAX_HORAS_AUSENTE = 4;
const MAX_VISIBLES = 8;

const EDIFICIOS = [
    { id: "panel", nombre: "Panel solar", icono: "panel", costo: 15, produce: 0.3, radio: 2.5, velocidad: 0.9, color: 0x3a86ff },
    { id: "satelite", nombre: "Satélite", icono: "satelite", costo: 150, produce: 2.5, radio: 3.3, velocidad: 0.6, color: 0xe0e0e0 },
    { id: "estacion", nombre: "Estación", icono: "estacion", costo: 1800, produce: 20, radio: 4.2, velocidad: 0.42, color: 0xffb703 },
    { id: "luna", nombre: "Mina lunar", icono: "luna", costo: 22000, produce: 160, radio: 5.2, velocidad: 0.3, color: 0xbdbdbd },
    { id: "nave", nombre: "Carguero", icono: "cohete", costo: 280000, produce: 1300, radio: 6.2, velocidad: 0.22, color: 0xff4d6d },
    { id: "dyson", nombre: "Anillo Dyson", icono: "anillo", costo: 4e6, produce: 11000, radio: 7.3, velocidad: 0.12, color: 0xffd23f },
];

const estado = cargar(CLAVE, { energia: 0, total: 0, materia: 0, toque: 0, edificios: {}, ultimaVez: Date.now() });
for (const e of EDIFICIOS) estado.edificios[e.id] ??= 0;

const multiplicador = () => 1 + estado.materia * 0.1;
const cantidad = (e) => estado.edificios[e.id];
const bonoHitos = (e) => 2 ** HITOS.filter((h) => cantidad(e) >= h).length;
const produceDe = (e) => e.produce * cantidad(e) * bonoHitos(e) * multiplicador();
const porSegundo = () => EDIFICIOS.reduce((t, e) => t + produceDe(e), 0);
const costoDe = (e) => e.costo * CRECIMIENTO ** cantidad(e);
const porToque = () => (1 + porSegundo() * 0.05) * 2 ** estado.toque * multiplicador();
const costoToque = () => 50 * 6 ** estado.toque;
const materiaNueva = () => Math.floor(Math.sqrt(estado.total / 1e6));

function ganar(n) {
    estado.energia += n;
    estado.total += n;
}

// ---------- Escena ----------
const lienzo = $("lienzo");
const { scene, camera, renderer, sol, alAnimar } = crearEscena(lienzo, { fondo: 0x02010a, fov: 50 });
scene.fog = null;
scene.background = new THREE.Color(0x02010a);
sol.position.set(10, 6, 8);
const particulas = crearParticulas(scene);
alAnimar(particulas.actualizar);

// Estrellas de fondo
const posiciones = new Float32Array(1500 * 3);
for (let i = 0; i < 1500; i++) {
    const v = new THREE.Vector3().randomDirection().multiplyScalar(40 + Math.random() * 30);
    posiciones.set([v.x, v.y, v.z], i * 3);
}
const geoEstrellas = new THREE.BufferGeometry();
geoEstrellas.setAttribute("position", new THREE.BufferAttribute(posiciones, 3));
const estrellas = new THREE.Points(geoEstrellas, new THREE.PointsMaterial({ color: 0xffffff, size: 0.15 }));
scene.add(estrellas);

// Planeta con continentes de colores (vértices pintados) y atmósfera
const geoPlaneta = new THREE.IcosahedronGeometry(1.5, 5);
const colores = [];
const v = new THREE.Vector3();
for (let i = 0; i < geoPlaneta.attributes.position.count; i++) {
    v.fromBufferAttribute(geoPlaneta.attributes.position, i);
    const ruido = Math.sin(v.x * 3.1) * Math.cos(v.y * 2.7) + Math.sin(v.z * 3.7 + v.x);
    // Hielo solo en los polos; tierra y mar según el ruido
    const c = Math.abs(v.y) > 1.32 ? new THREE.Color(0xe9f5ff) : ruido > 0.75 ? new THREE.Color(0xc9a55a) : ruido > 0.15 ? new THREE.Color(0x3fbf6a) : new THREE.Color(0x1f5fd6);
    colores.push(c.r, c.g, c.b);
}
geoPlaneta.setAttribute("color", new THREE.Float32BufferAttribute(colores, 3));
const planeta = new THREE.Mesh(geoPlaneta, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7, flatShading: true }));
scene.add(planeta);
const atmosfera = new THREE.Mesh(
    new THREE.SphereGeometry(1.75, 32, 24),
    new THREE.MeshBasicMaterial({ color: 0x7df9ff, transparent: true, opacity: 0.12, side: THREE.BackSide, blending: THREE.AdditiveBlending, depthWrite: false })
);
scene.add(atmosfera);

// Modelos de cada edificio
const MODELOS = {
    panel: () => {
        const g = new THREE.Group();
        g.add(new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.02, 0.22), material(0x1d4fd8, { metalness: 0.6, roughness: 0.2, emissive: 0x0a2a8a })));
        return g;
    },
    satelite: () => {
        const g = new THREE.Group();
        g.add(new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 0.16), material(0xd9d9d9, { metalness: 0.8 })));
        for (const lado of [-1, 1]) {
            const ala = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.01, 0.12), material(0x3a86ff, { emissive: 0x0a2a8a }));
            ala.position.x = lado * 0.24;
            g.add(ala);
        }
        return g;
    },
    estacion: () => {
        const g = new THREE.Group();
        const anillo = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.04, 8, 24), material(0xffb703, { metalness: 0.6 }));
        anillo.rotation.x = Math.PI / 2;
        g.add(anillo);
        g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.4, 8), material(0xeeeeee)));
        return g;
    },
    luna: () => new THREE.Mesh(new THREE.IcosahedronGeometry(0.28, 1), material(0xbdbdbd, { flatShading: true })),
    nave: () => {
        const g = new THREE.Group();
        const cuerpo = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.4, 8), material(0xff4d6d, { metalness: 0.4 }));
        cuerpo.rotation.z = -Math.PI / 2;
        g.add(cuerpo);
        const fuego = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.18, 8), new THREE.MeshBasicMaterial({ color: 0xffb703 }));
        fuego.rotation.z = Math.PI / 2;
        fuego.position.x = -0.26;
        g.add(fuego);
        return g;
    },
    dyson: () => new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.05, 6, 16, Math.PI * 0.6), material(0xffd23f, { emissive: 0x7a5a00, metalness: 0.7 })),
};

// Cada tipo de edificio gira en su propia órbita
const orbitas = EDIFICIOS.map((e, k) => {
    const grupo = new THREE.Group();
    grupo.rotation.x = 0.25 - k * 0.08;
    grupo.rotation.z = (k % 2 ? 1 : -1) * 0.12;
    scene.add(grupo);
    const linea = new THREE.Mesh(
        new THREE.RingGeometry(e.radio - 0.01, e.radio + 0.01, 96),
        new THREE.MeshBasicMaterial({ color: e.color, transparent: true, opacity: 0.18, side: THREE.DoubleSide })
    );
    linea.rotation.x = Math.PI / 2;
    linea.visible = false;
    grupo.add(linea);
    return { e, grupo, linea, piezas: [] };
});

function ubicarPiezas(o, animar) {
    const visibles = Math.min(cantidad(o.e), MAX_VISIBLES);
    while (o.piezas.length < visibles) {
        const m = MODELOS[o.e.id]();
        m.userData.crecer = animar ? 0 : 1;
        if (animar) m.scale.setScalar(0.01);
        o.grupo.add(m);
        o.piezas.push(m);
    }
    while (o.piezas.length > visibles) o.grupo.remove(o.piezas.pop());
    o.piezas.forEach((m, i) => {
        const a = (i / visibles) * Math.PI * 2;
        m.position.set(Math.cos(a) * o.e.radio, 0, Math.sin(a) * o.e.radio);
        m.rotation.y = -a;
    });
    o.linea.visible = cantidad(o.e) > 0;
}
for (const o of orbitas) ubicarPiezas(o, false);

// ---------- Animación ----------
let pulso = 0;
alAnimar((dt) => {
    // La cámara se aleja a medida que hay órbitas más grandes
    const masLejana = Math.max(3, ...orbitas.filter((o) => cantidad(o.e) > 0).map((o) => o.e.radio));
    const distancia = (masLejana + 2.5) * Math.max(1.3, 1.25 / camera.aspect);
    camera.position.lerp(new THREE.Vector3(0, distancia * 0.45, distancia), Math.min(1, dt * 2));
    camera.lookAt(0, 0, 0);

    planeta.rotation.y += dt * 0.15;
    estrellas.rotation.y += dt * 0.005;
    pulso = Math.max(0, pulso - dt * 4);
    planeta.scale.setScalar(1 + pulso * 0.06);
    atmosfera.material.opacity = 0.12 + pulso * 0.2;

    for (const o of orbitas) {
        o.grupo.rotation.y += dt * o.e.velocidad;
        for (const m of o.piezas) {
            if (m.userData.crecer < 1) {
                m.userData.crecer = Math.min(1, m.userData.crecer + dt * 2.5);
                m.scale.setScalar(m.userData.crecer);
            }
        }
    }
});

// ---------- Tocar el planeta ----------
renderer.domElement.addEventListener("pointerdown", (e) => {
    const n = porToque();
    ganar(n);
    pulso = 1;
    vibrar(8);
    particulas.emitir(new THREE.Vector3((Math.random() - 0.5) * 1.5, (Math.random() - 0.5) * 1.5, 1.4), 0x7df9ff, 5, {
        velocidad: 2, arriba: 1.5, tamano: 0.06, gravedad: 0, vida: 0.6, brillo: true,
    });
    textoFlotante(e.clientX, e.clientY, `+${formatear(n)}`, "#7df9ff");
    actualizar();
});

// ---------- Tarjetas de compra ----------
function crearTarjeta(alComprar) {
    const b = document.createElement("button");
    b.className = "mejora";
    b.innerHTML = `<span class="titulo"></span><span class="nivel"></span><span class="detalle"></span><span class="precio"></span>`;
    b.addEventListener("click", alComprar);
    $("mejoras").appendChild(b);
    return b;
}

const tarjetaToque = crearTarjeta(() => {
    if (estado.energia < costoToque()) return;
    estado.energia -= costoToque();
    estado.toque++;
    vibrar(25);
    actualizar();
});

const tarjetas = EDIFICIOS.map((e) => ({
    e,
    b: crearTarjeta(() => {
        const costo = costoDe(e);
        if (estado.energia < costo) return;
        estado.energia -= costo;
        estado.edificios[e.id]++;
        if (HITOS.includes(cantidad(e))) avisar(`¡${e.nombre} ahora produce el doble!`);
        ubicarPiezas(orbitas.find((o) => o.e === e), true);
        const p = aPantalla(new THREE.Vector3(e.radio, 0, 0), camera, renderer.domElement);
        textoFlotante(p.x, p.y, `+1 ${e.nombre}`, "#ffffff");
        vibrar(25);
        actualizar();
    }),
}));

function pintarTarjeta(b, titulo, nivel, detalle, costo, visible = true) {
    b.hidden = !visible;
    b.querySelector(".titulo").innerHTML = titulo;
    b.querySelector(".nivel").textContent = nivel;
    b.querySelector(".detalle").textContent = detalle;
    b.querySelector(".precio").textContent = `⚡ ${formatear(costo)}`;
    b.disabled = estado.energia < costo;
    b.classList.toggle("se-puede", !b.disabled);
}

function avisar(texto) {
    $("aviso").innerHTML = `<div class="chico">${texto}</div>`;
    $("aviso").hidden = false;
    clearTimeout(avisar.t);
    avisar.t = setTimeout(() => ($("aviso").hidden = true), 1800);
}

function actualizar() {
    $("energia").textContent = `⚡ ${formatear(estado.energia)}`;
    $("por-segundo").textContent = `${formatear(porSegundo())} por segundo · tocá el planeta`;
    $("materia").textContent = estado.materia;
    pintarTarjeta(tarjetaToque, `${icono("toque")}Toque potente`, `Nv ${estado.toque}`, `+${formatear(porToque())} por toque`, costoToque());
    tarjetas.forEach(({ e, b }, k) => {
        const hito = HITOS.find((h) => cantidad(e) < h);
        // Se muestra cada edificio cuando ya tenés alguno del anterior
        const visible = k === 0 || cantidad(EDIFICIOS[k - 1]) > 0 || cantidad(e) > 0;
        pintarTarjeta(b, `${icono(e.icono)}${e.nombre}`, `×${cantidad(e)}`, `+${formatear(e.produce * bonoHitos(e) * multiplicador())}/s c/u${hito ? ` · ×2 al ${hito}` : ""}`, costoDe(e), visible);
    });
}

// Producción automática
let acumulado = 0;
alAnimar((dt) => {
    ganar(porSegundo() * dt);
    acumulado += dt;
    if (acumulado > 0.2) {
        acumulado = 0;
        actualizar();
    }
});

// ---------- Salto de galaxia ----------
$("abrir-salto").addEventListener("click", () => {
    $("materia-nueva").textContent = materiaNueva();
    $("confirmar-salto").disabled = materiaNueva() < 1;
    $("salto").hidden = false;
});
$("cancelar-salto").addEventListener("click", () => ($("salto").hidden = true));
$("confirmar-salto").addEventListener("click", () => {
    const nueva = materiaNueva();
    if (nueva < 1) return;
    estado.materia += nueva;
    Object.assign(estado, { energia: 0, total: 0, toque: 0 });
    for (const e of EDIFICIOS) estado.edificios[e.id] = 0;
    for (const o of orbitas) ubicarPiezas(o, false);
    $("salto").hidden = true;
    avisar(`🌌 ¡Nueva galaxia! Todo produce ×${multiplicador().toFixed(1)}`);
    guardarProgreso();
    actualizar();
});

// ---------- Guardado ----------
function guardarProgreso() {
    estado.ultimaVez = Date.now();
    guardar(CLAVE, estado);
}
setInterval(guardarProgreso, 5000);
document.addEventListener("visibilitychange", guardarProgreso);
addEventListener("pagehide", guardarProgreso);

const ausente = Math.min((Date.now() - estado.ultimaVez) / 1000, MAX_HORAS_AUSENTE * 3600);
const ganadoAusente = porSegundo() * ausente;
if (ganadoAusente >= 1) {
    ganar(ganadoAusente);
    setTimeout(() => avisar(`Mientras no estabas la colonia juntó ⚡ ${formatear(ganadoAusente)}`), 400);
}

actualizar();
