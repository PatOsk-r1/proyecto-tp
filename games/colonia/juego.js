// Colonia espacial: tocá el planeta para juntar energía y construí cosas que orbitan y producen solas.
// Saltar de galaxia reinicia todo a cambio de materia oscura, que multiplica la producción.
import {
    THREE, crearEscena, material, formatear, cargar, guardar, textoFlotante, aPantalla, vibrar, crearParticulas,
} from "../../js/comun3d.js";
import { icono } from "../../js/iconos.js";
import { crearAudio, MUSICAS } from "../../js/sonido.js";
import { crearBase } from "../../js/incremental.js";
import { DESTINOS, destino, MAX_NAVES, costoNave, EVENTOS, ARTEFACTOS, artefactoAlAzar, TIPOS_CONTRATO } from "./aventura.js";

const audio = crearAudio({ musica: MUSICAS.misterio });
const { nota, golpe, efectos } = audio;
const sonidos = {
    toque: () => nota({ f: 600 + Math.random() * 300, hasta: 1200, dur: 0.08, vol: 0.05, onda: "sine" }),
    meteoro: () => {
        golpe({ dur: 0.4, vol: 0.2, filtro: 500, tipo: "lowpass" });
        nota({ f: 1200, hasta: 300, dur: 0.4, vol: 0.1, onda: "sawtooth" });
    },
    despegue: () => {
        golpe({ dur: 1.2, vol: 0.18, filtro: 300, tipo: "lowpass" });
        nota({ f: 120, hasta: 600, dur: 1.2, vol: 0.08, onda: "sawtooth" });
    },
    regreso: () => [523, 659, 784].forEach((f, k) => nota({ f, t: k * 0.1, dur: 0.3, vol: 0.12, onda: "sine" })),
};

const $ = (id) => document.getElementById(id);
const CLAVE = "colonia";
const CRECIMIENTO = 1.15;
const HITOS = [10, 25, 50, 100, 200]; // en cada uno ese edificio produce el doble
const MAX_HORAS_AUSENTE = 4; // + piloto automático
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
estado.cristales ??= 0;
estado.tec ??= {};
// Expediciones, artefactos y contratos (no se pierden al saltar de galaxia)
estado.naves ??= 1;
estado.viajes ??= []; // [{ destino, vuelve, evento }]
estado.artefactos ??= {}; // id → nivel
estado.contratos ??= [];
estado.contadores ??= { toques: 0, meteoros: 0, expediciones: 0, compras: 0, energiaHecha: 0, saltos: 0, eventos: 0, contratos: 0 };
const cont = estado.contadores;
const nivelArt = (efecto) => ARTEFACTOS.filter((a) => a.efecto === efecto).reduce((t, a) => t + (estado.artefactos[a.id] ?? 0) * a.valor, 0);

// Tecnologías: se compran con cristales de meteorito y no se pierden al saltar de galaxia
const TECNOLOGIAS = [
    { id: "reactores", ico: "⚛️", nombre: "Reactores", detalle: "Todo produce ×1.25", max: 10, costo: (n) => 2 + n * 2 },
    { id: "guantes", ico: "🧤", nombre: "Guantes cuánticos", detalle: "Toques ×2", max: 5, costo: (n) => 3 + n * 3 },
    { id: "piloto", ico: "🤖", nombre: "Piloto automático", detalle: "+2 h de producción sin jugar", max: 4, costo: (n) => 4 + n * 4 },
    { id: "radar", ico: "📡", nombre: "Radar", detalle: "Meteoritos más seguido y más valiosos", max: 3, costo: (n) => 5 + n * 5 },
];
const tec = (id) => estado.tec[id] ?? 0;

const multiplicador = () => (1 + estado.materia * 0.1) * 1.25 ** tec("reactores") * (1 + nivelArt("prod"));
const cantidad = (e) => estado.edificios[e.id];
const bonoHitos = (e) => 2 ** HITOS.filter((h) => cantidad(e) >= h).length;
const produceDe = (e) => e.produce * cantidad(e) * bonoHitos(e) * multiplicador();
const porSegundo = () => EDIFICIOS.reduce((t, e) => t + produceDe(e), 0);
const costoDe = (e) => e.costo * CRECIMIENTO ** cantidad(e);
const porToque = () => (1 + porSegundo() * 0.05) * 2 ** estado.toque * 2 ** tec("guantes") * multiplicador() * (1 + nivelArt("toque"));
const costoToque = () => 50 * 6 ** estado.toque;
const materiaNueva = () => Math.floor(Math.sqrt(estado.total / 1e6));

function ganar(n) {
    estado.energia += n;
    estado.total += n;
    cont.energiaHecha += n;
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

// Textura hecha a mano en un canvas
function texturaCanvas(ancho, alto, pintar) {
    const c = document.createElement("canvas");
    c.width = ancho;
    c.height = alto;
    pintar(c.getContext("2d"), ancho, alto);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
}

// Nubes que giran un poco más rápido que el planeta
const nubesPlaneta = new THREE.Mesh(
    new THREE.SphereGeometry(1.56, 32, 24),
    new THREE.MeshStandardMaterial({
        map: texturaCanvas(512, 256, (x, w, h) => {
            // Nubes más finas y separadas: que se vean los continentes
            for (let k = 0; k < 55; k++) {
                const cx = Math.random() * w;
                const cy = h * 0.15 + Math.random() * h * 0.7;
                const r = 6 + Math.random() * 18;
                const g = x.createRadialGradient(cx, cy, 0, cx, cy, r);
                g.addColorStop(0, "rgba(255,255,255,0.55)");
                g.addColorStop(1, "rgba(255,255,255,0)");
                x.fillStyle = g;
                x.fillRect(cx - r * 2, cy - r, r * 4, r * 2);
            }
        }),
        transparent: true,
        depthWrite: false,
        roughness: 1,
    })
);
scene.add(nubesPlaneta);

// Nebulosas de fondo
for (const [color, x, y, z, s] of [["#c77dff", -30, 10, -45, 60], ["#4cc9f0", 35, -12, -50, 55], ["#ff4d6d", 5, 25, -55, 40]]) {
    const neb = new THREE.Sprite(
        new THREE.SpriteMaterial({
            map: texturaCanvas(128, 128, (x2, w, h) => {
                const g = x2.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
                g.addColorStop(0, color + "88");
                g.addColorStop(1, color + "00");
                x2.fillStyle = g;
                x2.fillRect(0, 0, w, h);
            }),
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            opacity: 0.6,
        })
    );
    neb.position.set(x, y, z);
    neb.scale.setScalar(s);
    scene.add(neb);
}

// Estrellas fugaces
const fugaces = [];
function crearFugaz() {
    const linea = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.0, 2.5, 4), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true }));
    const desde = new THREE.Vector3((Math.random() - 0.5) * 40, 10 + Math.random() * 10, -20 - Math.random() * 10);
    linea.position.copy(desde);
    linea.rotation.z = Math.PI / 3;
    linea.userData = { vida: 1.2, vel: new THREE.Vector3(-14, -8, 0) };
    scene.add(linea);
    fugaces.push(linea);
}

// Meteoritos: cruzan cerca del planeta; si los tocás dan energía y un cristal
const raycaster = new THREE.Raycaster();
const puntero = new THREE.Vector2();
let meteorito = null;
let proximoMeteorito = 25;
function crearMeteorito() {
    // Cruza por lo que se ve en pantalla (según dónde esté la cámara), tardando unos 7 segundos
    const z = 1.5;
    const distancia = camera.position.length() - z;
    const medioAlto = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * distancia;
    const medioAncho = medioAlto * camera.aspect;
    const roca = new THREE.Mesh(new THREE.IcosahedronGeometry(Math.max(0.35, medioAncho * 0.12), 0), material(0x8d6e63, { flatShading: true, emissive: 0xff5f00, emissiveIntensity: 0.35 }));
    const lado = Math.random() < 0.5 ? -1 : 1;
    roca.position.set(lado * (medioAncho + 0.6), (Math.random() * 0.8 - 0.2) * medioAlto, z);
    const velocidad = (medioAncho * 2 + 1.2) / 7;
    roca.userData = { vel: new THREE.Vector3(-lado * velocidad, (Math.random() - 0.5) * velocidad * 0.3, 0), giro: new THREE.Vector3(Math.random(), Math.random(), Math.random()), limite: medioAncho + 1, radio: Math.max(0.9, medioAncho * 0.25) };
    scene.add(roca);
    meteorito = roca;
}

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
    nubesPlaneta.rotation.y += dt * 0.22;
    nubesPlaneta.scale.setScalar(1 + pulso * 0.06);
    if (Math.random() < dt * 0.15) crearFugaz();
    for (let i = fugaces.length - 1; i >= 0; i--) {
        const f = fugaces[i];
        f.userData.vida -= dt;
        f.position.addScaledVector(f.userData.vel, dt);
        f.material.opacity = Math.max(0, f.userData.vida);
        if (f.userData.vida <= 0) {
            scene.remove(f);
            fugaces.splice(i, 1);
        }
    }
    if (meteorito) {
        const d = meteorito.userData;
        meteorito.position.addScaledVector(d.vel, dt);
        meteorito.rotation.x += d.giro.x * dt * 2;
        meteorito.rotation.y += d.giro.y * dt * 2;
        if (Math.random() < 0.7) particulas.emitir(meteorito.position, 0xff7a1a, 1, { velocidad: 0.3, arriba: 0, tamano: 0.12, gravedad: 0, vida: 0.5, brillo: true });
        if (Math.abs(meteorito.position.x) > d.limite) {
            scene.remove(meteorito);
            meteorito = null;
            proximoMeteorito = (40 + Math.random() * 40) / (1 + tec("radar") * 0.5) / (1 + nivelArt("meteoros"));
        }
    } else {
        proximoMeteorito -= dt;
        if (proximoMeteorito <= 0) crearMeteorito();
    }
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
    if (meteorito) {
        const caja = renderer.domElement.getBoundingClientRect();
        puntero.set(((e.clientX - caja.left) / caja.width) * 2 - 1, -((e.clientY - caja.top) / caja.height) * 2 + 1);
        raycaster.setFromCamera(puntero, camera);
        // Zona de toque generosa: una esfera invisible un poco más grande que la roca
        const cerca = raycaster.ray.distanceToPoint(meteorito.position) < meteorito.userData.radio;
        if (cerca) {
            const premio = Math.max(50, porSegundo() * 45) * (1 + tec("radar") * 0.5);
            const cristales = Math.round((1 + (Math.random() < 0.3 + tec("radar") * 0.1 ? 1 : 0)) * (1 + nivelArt("cristales")));
            cont.meteoros++;
            sonidos.meteoro();
            ganar(premio);
            estado.cristales += cristales;
            particulas.emitir(meteorito.position, 0xff9f1c, 30, { velocidad: 4, arriba: 2, tamano: 0.12, gravedad: 0, vida: 0.8, brillo: true });
            particulas.emitir(meteorito.position, 0x7df9ff, 12, { velocidad: 3, arriba: 2, tamano: 0.1, gravedad: 0, vida: 0.8, brillo: true });
            scene.remove(meteorito);
            meteorito = null;
            proximoMeteorito = (40 + Math.random() * 40) / (1 + tec("radar") * 0.5);
            textoFlotante(e.clientX, e.clientY, `☄️ +${formatear(premio)} · 💠${cristales}`, "#ff9f1c");
            vibrar([30, 30, 60]);
            guardarProgreso();
            actualizar();
            return;
        }
    }
    const n = porToque();
    ganar(n);
    cont.toques++;
    if (cont.toques % 2 === 0) sonidos.toque();
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
        cont.compras++;
        efectos.comprar();
        if (HITOS.includes(cantidad(e))) avisar(`¡${e.nombre} ahora produce el doble!`);
        ubicarPiezas(orbitas.find((o) => o.e === e), true);
        const p = aPantalla(new THREE.Vector3(e.radio, 0, 0), camera, renderer.domElement);
        textoFlotante(p.x, p.y, `+1 ${e.nombre}`, "#ffffff");
        vibrar(25);
        actualizar();
    }),
}));

const tituloTec = document.createElement("div");
tituloTec.className = "titulo-estilos";
tituloTec.textContent = "Tecnologías (💠 cristales de meteorito)";
$("mejoras").appendChild(tituloTec);
const tarjetasTec = TECNOLOGIAS.map((tecno) => ({
    tecno,
    b: crearTarjeta(() => {
        const costo = tecno.costo(tec(tecno.id));
        if (estado.cristales < costo || tec(tecno.id) >= tecno.max) return;
        estado.cristales -= costo;
        estado.tec[tecno.id] = tec(tecno.id) + 1;
        avisar(`${tecno.ico} ${tecno.nombre} mejorada`);
        vibrar(30);
        guardarProgreso();
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
    $("cristales").textContent = estado.cristales;
    for (const { tecno, b } of tarjetasTec) {
        const n = tec(tecno.id);
        const tope = n >= tecno.max;
        b.querySelector(".titulo").textContent = `${tecno.ico} ${tecno.nombre}`;
        b.querySelector(".nivel").textContent = `${n}/${tecno.max}`;
        b.querySelector(".detalle").textContent = tecno.detalle;
        b.querySelector(".precio").textContent = tope ? "Máximo" : `💠 ${tecno.costo(n)}`;
        b.disabled = tope || estado.cristales < tecno.costo(n);
        b.classList.toggle("se-puede", !b.disabled);
    }
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
    cont.saltos++;
    efectos.fanfarria();
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

// ---------- Pestañas del panel ----------
const PANELES = ["mejoras", "expediciones", "artefactos", "contratos"];
let panelActual = "mejoras";
for (const p of document.querySelectorAll(".pestana-col")) {
    p.addEventListener("click", () => {
        panelActual = p.dataset.p;
        for (const x of document.querySelectorAll(".pestana-col")) x.classList.toggle("activa", x === p);
        for (const id of PANELES) $(id).hidden = id !== panelActual;
        efectos.toque();
        pintarPaneles(true);
    });
}

// ---------- Expediciones ----------
const rapidez = () => (0.93 ** ((estado.artefactos.motor ?? 0)) * 0.95 ** ((estado.artefactos.brujula ?? 0)));
const duracion = (d) => d.dur * 60 * 1000 * rapidez();
const navesLibres = () => estado.naves - estado.viajes.length;
function mandarNave(id) {
    const d = destino(id);
    if (navesLibres() < 1 || (d.requiere && estado.materia < d.requiere)) return;
    estado.viajes.push({ destino: id, vuelve: Date.now() + duracion(d), evento: Math.random() < 0.3 ? EVENTOS[Math.floor(Math.random() * EVENTOS.length)].id : null });
    cont.expediciones++;
    sonidos.despegue();
    lanzarCohete();
    avisar(`🚀 Nave rumbo a ${d.nombre} (${formatearDuracion(duracion(d))})`);
    guardarProgreso();
}
function formatearDuracion(ms) {
    const s = Math.max(0, Math.ceil(ms / 1000));
    if (s >= 3600) return `${Math.floor(s / 3600)} h ${Math.floor((s % 3600) / 60)} min`;
    if (s >= 60) return `${Math.floor(s / 60)} min ${s % 60} s`;
    return `${s} s`;
}
// Recompensa de un viaje (según lo que produce la colonia ahora)
function recompensa(d) {
    const botin = 1 + nivelArt("botin");
    const [cmin, cmax] = d.cristales;
    return {
        energia: Math.max(100, porSegundo() * d.energia) * botin,
        cristales: Math.round((cmin + Math.floor(Math.random() * (cmax - cmin + 1))) * botin * (1 + nivelArt("cristales"))),
        artefacto: Math.random() < d.artefacto,
        materia: d.materia ?? 0,
    };
}
function juntarViaje(i) {
    const v = estado.viajes[i];
    if (!v || v.vuelve > Date.now()) return;
    const d = destino(v.destino);
    const r = recompensa(d);
    estado.viajes.splice(i, 1);
    const ev = EVENTOS.find((e) => e.id === v.evento);
    if (ev) return mostrarEvento(ev, d, r);
    entregar(d, r, null);
}
function entregar(d, r, mensaje) {
    ganar(r.energia);
    estado.cristales += r.cristales;
    estado.materia += r.materia;
    let art = null;
    if (r.artefacto) {
        art = artefactoAlAzar();
        estado.artefactos[art.id] = (estado.artefactos[art.id] ?? 0) + 1;
    }
    sonidos.regreso();
    vibrar([30, 30, 60]);
    avisar(`${mensaje ? `${mensaje} · ` : ""}${d.icono} +⚡${formatear(r.energia)}${r.cristales ? ` · 💠${r.cristales}` : ""}${r.materia ? ` · 🌌${r.materia}` : ""}${art ? ` · ${art.icono} ¡${art.nombre}!` : ""}`);
    if (art) efectos.logro();
    guardarProgreso();
    actualizar();
    pintarPaneles(true);
}
function mostrarEvento(ev, d, r) {
    cont.eventos++;
    $("evento-titulo").textContent = ev.titulo;
    $("evento-texto").textContent = `${ev.texto} (vuelve de ${d.nombre} con ⚡${formatear(r.energia)})`;
    $("evento-opciones").innerHTML = ev.opciones.map((o, k) => `<button type="button" data-k="${k}">${o.texto}<small>${o.riesgo}</small></button>`).join("");
    $("evento").hidden = false;
    efectos.abrir();
    $("evento-opciones").onclick = (e) => {
        const b = e.target.closest("button");
        if (!b) return;
        const res = ev.opciones[Number(b.dataset.k)].resolver(r);
        $("evento").hidden = true;
        entregar(d, { ...r, energia: r.energia * res.mult, cristales: Math.round(r.cristales * Math.min(1, res.mult)) + (res.cristales ?? 0), artefacto: r.artefacto || res.artefacto }, res.msg);
    };
}
// Cohete que sale del planeta (decorativo)
const cohetes = [];
function lanzarCohete() {
    const g = MODELOS.nave();
    g.scale.setScalar(1.2);
    g.position.set(0, 1.6, 0);
    g.rotation.z = Math.PI / 2;
    g.userData = { vida: 2.2, vel: new THREE.Vector3((Math.random() - 0.5) * 2, 3, -2) };
    scene.add(g);
    cohetes.push(g);
}
alAnimar((dt) => {
    for (let i = cohetes.length - 1; i >= 0; i--) {
        const c = cohetes[i];
        c.userData.vida -= dt;
        c.userData.vel.multiplyScalar(1 + dt * 1.2);
        c.position.addScaledVector(c.userData.vel, dt);
        particulas.emitir(c.position, 0xffb703, 1, { velocidad: 0.4, arriba: 0, tamano: 0.1, gravedad: 0, vida: 0.4, brillo: true });
        if (c.userData.vida <= 0) {
            scene.remove(c);
            cohetes.splice(i, 1);
        }
    }
});

function pintarExpediciones() {
    const ahora = Date.now();
    const viajes = estado.viajes.map((v, i) => {
        const d = destino(v.destino);
        const falta = v.vuelve - ahora;
        const total = duracion(d);
        const listo = falta <= 0;
        return `<div class="fila-col${listo ? " lista" : ""}"><span class="ico-col">${d.icono}</span><div class="txt">${listo ? "¡Volvió de" : "Viajando a"} ${d.nombre}${listo ? "!" : ""}
            <small>${listo ? (v.evento ? "Algo pasó en el viaje…" : "Tocá para descargar") : `Vuelve en ${formatearDuracion(falta)}`}</small>
            ${listo ? "" : `<div class="barra-col"><i style="width:${Math.round((1 - falta / total) * 100)}%"></i></div>`}</div>
            ${listo ? `<button type="button" class="juntar" data-juntar="${i}">Descargar</button>` : ""}</div>`;
    }).join("");
    const destinos = DESTINOS.map((d) => {
        const bloqueado = d.requiere && estado.materia < d.requiere;
        return `<div class="fila-col${bloqueado ? " bloqueada" : ""}"><span class="ico-col">${d.icono}</span><div class="txt">${d.nombre} <em>${formatearDuracion(duracion(d))}</em>
            <small>${bloqueado ? `🔒 Necesita 🌌 ${d.requiere} de materia oscura` : `${d.detalle} · ⚡${formatear(Math.max(100, porSegundo() * d.energia) * (1 + nivelArt("botin")))} · 💠${d.cristales[0]}-${d.cristales[1]}${d.artefacto >= 1 ? " · 💎 seguro" : d.artefacto >= 0.1 ? ` · 💎 ${Math.round(d.artefacto * 100)}%` : ""}`}</small></div>
            <button type="button" data-mandar="${d.id}" ${bloqueado || navesLibres() < 1 ? "disabled" : ""}>Mandar</button></div>`;
    }).join("");
    const comprar = estado.naves < MAX_NAVES
        ? `<div class="fila-col"><span class="ico-col">🛸</span><div class="txt">Nave nueva<small>Más naves = más viajes a la vez</small></div><button type="button" data-nave ${estado.cristales < costoNave(estado.naves) ? "disabled" : ""}>💠 ${costoNave(estado.naves)}</button></div>`
        : "";
    return `<div class="cabeza-col"><span>🚀 Naves: ${navesLibres()} libres de ${estado.naves}</span><span>Los viajes siguen aunque cierres la app</span></div>${viajes}${destinos}${comprar}`;
}
$("expediciones").addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b || b.disabled) return;
    if (b.dataset.mandar) mandarNave(b.dataset.mandar);
    else if (b.dataset.juntar !== undefined) juntarViaje(Number(b.dataset.juntar));
    else if (b.dataset.nave !== undefined && estado.cristales >= costoNave(estado.naves)) {
        estado.cristales -= costoNave(estado.naves);
        estado.naves++;
        efectos.comprar();
        avisar(`🛸 ¡Ya tenés ${estado.naves} naves!`);
    }
    actualizar();
    pintarPaneles(true);
});

// ---------- Artefactos ----------
function pintarArtefactos() {
    const tengo = ARTEFACTOS.filter((a) => estado.artefactos[a.id]).length;
    return `<div class="cabeza-col"><span>💎 ${tengo}/${ARTEFACTOS.length} artefactos</span><span>Se consiguen en expediciones · repetidos suben de nivel</span></div>
        <div class="grilla-artefactos">${ARTEFACTOS.map((a) => {
            const n = estado.artefactos[a.id] ?? 0;
            return n ? `<div class="artefacto"><span>${a.icono}</span>${a.nombre} <b>Nv ${n}</b><small>${a.texto(n)}</small></div>` : `<div class="artefacto oculto"><span>❔</span>???<small>Explorá para encontrarlo</small></div>`;
        }).join("")}</div>`;
}

// ---------- Contratos ----------
function nuevoContrato() {
    // Un tipo que no esté ya entre los contratos abiertos
    const usados = new Set(estado.contratos.map((c) => c.medida));
    const libres = TIPOS_CONTRATO.filter((x) => !usados.has(x.medida));
    const tipo = libres[Math.floor(Math.random() * libres.length)] ?? TIPOS_CONTRATO[0];
    const escala = 1 + estado.materia * 0.3;
    const meta = tipo.energia ? Math.max(1000, Math.round(porSegundo() * 600)) : Math.round(tipo.base * escala * (0.8 + Math.random() * 0.6));
    return { medida: tipo.medida, meta, desde: cont[tipo.medida], cristales: 2 + Math.floor(Math.random() * 3) + Math.floor(estado.materia / 2), energia: Math.round(Math.max(200, porSegundo() * 300)) };
}
estado.contratos = estado.contratos.filter((c, i, l) => l.findIndex((x) => x.medida === c.medida) === i);
while (estado.contratos.length < 3) estado.contratos.push(nuevoContrato());
const progresoContrato = (c) => Math.min(c.meta, cont[c.medida] - c.desde);
function pintarContratos() {
    return `<div class="cabeza-col"><span>📜 Contratos de la federación</span><span>Al cumplir uno aparece otro</span></div>` + estado.contratos.map((c, i) => {
        const tipo = TIPOS_CONTRATO.find((x) => x.medida === c.medida);
        const p = progresoContrato(c);
        const listo = p >= c.meta;
        return `<div class="fila-col${listo ? " lista" : ""}"><span class="ico-col">📜</span><div class="txt">${tipo.texto(tipo.energia ? formatear(c.meta) : c.meta)}
            <small>Premio: 💠${c.cristales} y ⚡${formatear(c.energia)}</small><div class="barra-col"><i style="width:${Math.round((p / c.meta) * 100)}%"></i></div></div>
            <button type="button" class="${listo ? "juntar" : ""}" data-contrato="${i}" ${listo ? "" : "disabled"}>${listo ? "Cobrar" : `${tipo.energia ? formatear(p) : p}/${tipo.energia ? formatear(c.meta) : c.meta}`}</button></div>`;
    }).join("");
}
$("contratos").addEventListener("click", (e) => {
    const b = e.target.closest("button[data-contrato]");
    if (!b || b.disabled) return;
    const i = Number(b.dataset.contrato);
    const c = estado.contratos[i];
    if (progresoContrato(c) < c.meta) return;
    estado.cristales += c.cristales;
    ganar(c.energia);
    cont.contratos++;
    estado.contratos.splice(i, 1);
    estado.contratos.splice(i, 0, nuevoContrato());
    efectos.monedas();
    avisar(`📜 ¡Contrato cumplido! +💠${c.cristales}`);
    actualizar();
    pintarPaneles(true);
});

// Solo se redibuja el panel abierto, y solo si cambió
const ultimos = {};
function pintarPaneles(forzar = false) {
    const html = { expediciones: pintarExpediciones, artefactos: pintarArtefactos, contratos: pintarContratos }[panelActual]?.();
    if (html !== undefined && (forzar || html !== ultimos[panelActual])) {
        ultimos[panelActual] = html;
        $(panelActual).innerHTML = html;
    }
    $("exp-lista").hidden = !estado.viajes.some((v) => v.vuelve <= Date.now());
    $("con-lista").hidden = !estado.contratos.some((c) => progresoContrato(c) >= c.meta);
}
setInterval(() => pintarPaneles(), 1000);

// ---------- Base común ----------
const LOGROS = [
    { id: "toques", icono: "👆", nombre: "Dedos de energía", detalle: "Tocá el planeta 1000 veces", meta: 1000, valor: () => cont.toques, fichas: 400 },
    { id: "meteoros", icono: "☄️", nombre: "Cazameteoritos", detalle: "Atrapá 25 meteoritos", meta: 25, valor: () => cont.meteoros, fichas: 1000 },
    { id: "exp1", icono: "🚀", nombre: "Primer viaje", detalle: "Mandá una expedición", meta: 1, valor: () => cont.expediciones, fichas: 200 },
    { id: "exp50", icono: "🛰️", nombre: "Flota estelar", detalle: "Mandá 50 expediciones", meta: 50, valor: () => cont.expediciones, fichas: 4000 },
    { id: "naves", icono: "🛸", nombre: "Escuadrón", detalle: "Tené 4 naves", meta: 4, valor: () => estado.naves, fichas: 2500 },
    { id: "artefactos5", icono: "💎", nombre: "Arqueólogo espacial", detalle: "Encontrá 5 artefactos distintos", meta: 5, valor: () => Object.keys(estado.artefactos).length, fichas: 2000 },
    { id: "artefactos10", icono: "👑", nombre: "Museo galáctico", detalle: "Encontrá los 10 artefactos", meta: 10, valor: () => Object.keys(estado.artefactos).length, fichas: 10000 },
    { id: "contratos10", icono: "📜", nombre: "Contratista", detalle: "Cumplí 10 contratos", meta: 10, valor: () => cont.contratos, fichas: 1500 },
    { id: "salto", icono: "🌌", nombre: "Viajero intergaláctico", detalle: "Saltá de galaxia", meta: 1, valor: () => cont.saltos, fichas: 2000 },
    { id: "dyson", icono: "☀️", nombre: "Anillo Dyson", detalle: "Construí un anillo Dyson", meta: 1, valor: () => estado.edificios.dyson ?? 0, fichas: 6000 },
    { id: "eventos", icono: "🏴‍☠️", nombre: "Aventurero", detalle: "Viví 10 eventos en el espacio", meta: 10, valor: () => cont.eventos, fichas: 1200 },
];
const base = crearBase({
    juego: "colonia",
    barra: document.querySelector(".barra-colonia"),
    logros: LOGROS,
    audio,
    regaloDiario: (dia) => {
        const e = Math.max(500, porSegundo() * 900 * dia);
        return dia === 7
            ? { icono: "💎", texto: `⚡${formatear(e)}, 💠10 y un artefacto`, dar: () => { ganar(e); estado.cristales += 10; const a = artefactoAlAzar(); estado.artefactos[a.id] = (estado.artefactos[a.id] ?? 0) + 1; actualizar(); } }
            : { icono: dia % 2 ? "⚡" : "💠", texto: dia % 2 ? `⚡${formatear(e)}` : `💠${2 + dia}`, dar: () => { if (dia % 2) ganar(e); else estado.cristales += 2 + dia; actualizar(); } };
    },
});
// Rendimiento: cuánto tarda cada cuadro (de la primera a la última animación registrada)
let inicioCuadro = performance.now();
alAnimar(() => {
    base.medir(performance.now() - inicioCuadro);
    requestAnimationFrame(() => (inicioCuadro = performance.now()));
});

// ---------- Mientras no estabas ----------
const ausenteTotal = (Date.now() - estado.ultimaVez) / 1000;
const ausente = Math.min(ausenteTotal, (MAX_HORAS_AUSENTE + tec("piloto") * 2 + nivelArt("ausente")) * 3600);
const ganadoAusente = porSegundo() * ausente;
if (ganadoAusente >= 1) ganar(ganadoAusente);
const navesListas = estado.viajes.filter((v) => v.vuelve <= Date.now()).length;
const mostro = ausenteTotal > 60 && base.resumenAlVolver(ausenteTotal, [
    { icono: "⚡", texto: "Energía que juntó la colonia", valor: ganadoAusente >= 1 ? formatear(ganadoAusente) : "" },
    { icono: "🚀", texto: "Naves que ya volvieron", valor: navesListas ? `${navesListas} (descargalas en Expediciones)` : "" },
    { icono: "⏳", texto: "Tope de horas", valor: ausenteTotal > ausente ? `${Math.round(ausente / 3600)} h (subilo con el piloto automático)` : "" },
]);
if (!mostro) setTimeout(() => base.revisarRegalo(), 600);

actualizar();
pintarPaneles(true);
