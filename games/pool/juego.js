// Pool (bola 8) contra la computadora o contra un amigo (online, por turnos).
// Física simple en 2D sobre la mesa: rozamiento, choques entre bolas, bandas y troneras.
import { THREE, crearEscena, material, cargar, guardar, vibrar, fondoDegradado } from "../../js/comun3d.js";
import { exigirSesion } from "../../js/sesion.js";
import { ANCHO, LARGO, R, esLisa, esRayada, armarTriangulo } from "./reglas.js";

const $ = (id) => document.getElementById(id);
const CLAVE = "pool";

const ROCE = 1.4; // frenado constante
const AMORTIGUACION = 0.35; // frenado proporcional a la velocidad
const REBOTE_BOLAS = 0.95;
const REBOTE_BANDA = 0.78;
const VELOCIDAD_MAX = 13;
const ERROR_CPU = [0.09, 0.045, 0.015];
const NOMBRES_DIFICULTAD = ["Fácil", "Normal", "Difícil"];
const GIRO_FINO = 0.0035;

const TRONERAS = [
    { x: -ANCHO / 2, z: -LARGO / 2, r: 0.27 },
    { x: ANCHO / 2, z: -LARGO / 2, r: 0.27 },
    { x: -ANCHO / 2, z: 0, r: 0.23 },
    { x: ANCHO / 2, z: 0, r: 0.23 },
    { x: -ANCHO / 2, z: LARGO / 2, r: 0.27 },
    { x: ANCHO / 2, z: LARGO / 2, r: 0.27 },
];

const COLORES = ["#ffffff", "#f5c400", "#1e4fd8", "#d62828", "#6a2c91", "#f77f00", "#2a9d3f", "#7a1f1f", "#111111"];
const colorBola = (n) => COLORES[n > 8 ? n - 8 : n];
const deGrupo = (n, grupo) => (grupo === "lisas" ? esLisa(n) : grupo === "rayadas" ? esRayada(n) : false);

const estado = cargar(CLAVE, { dificultad: 1, victorias: [0, 0, 0], derrotas: [0, 0, 0] });
const usuario = await exigirSesion();
const yo = usuario.uid ?? "yo";
const idPartida = new URLSearchParams(location.search).get("partida");

// ---------- Escena ----------
const lienzo = $("lienzo");
const { scene, camera, renderer, sol, alAnimar } = crearEscena(lienzo, { fondo: 0x140b05, fov: 50 });
scene.background = fondoDegradado("#2a170a", "#0a0503");
scene.fog = null;
sol.position.set(0, 14, 2);
sol.intensity = 1.2;
const foco = new THREE.SpotLight(0xfff1d6, 60, 30, 0.75, 0.5, 1.2);
foco.position.set(0, 9, 0);
foco.target.position.set(0, 0, 0);
scene.add(foco, foco.target);

function caja(w, h, d, mat, x, y, z) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    scene.add(m);
    return m;
}

// ---------- Skins (todas gratis) ----------
const SKINS = {
    pano: [
        { id: "verde", nombre: "Verde clásico", color: 0x1f8a4c },
        { id: "azul", nombre: "Azul torneo", color: 0x1d5fa8 },
        { id: "rojo", nombre: "Rojo", color: 0x9e1d2a },
        { id: "violeta", nombre: "Violeta", color: 0x5b2a8c },
        { id: "negro", nombre: "Negro", color: 0x23262b },
        { id: "arena", nombre: "Arena", color: 0xb08a55 },
    ],
    madera: [
        { id: "nogal", nombre: "Nogal", color: 0x6b3a1c },
        { id: "roble", nombre: "Roble claro", color: 0xa8743f },
        { id: "ebano", nombre: "Ébano", color: 0x1f1410 },
        { id: "blanco", nombre: "Laca blanca", color: 0xe9e4da },
    ],
    taco: [
        { id: "clasico", nombre: "Clásico", varilla: 0xe3c08d, mango: 0x3b1f0e, anillo: 0xd9d9d9 },
        { id: "fuego", nombre: "Fuego", varilla: 0xf0d2a0, mango: 0xd62828, anillo: 0xffb703 },
        { id: "oceano", nombre: "Océano", varilla: 0xe8dcc4, mango: 0x0077b6, anillo: 0x90e0ef },
        { id: "noche", nombre: "Noche", varilla: 0x3a3a44, mango: 0x0b0b10, anillo: 0x9d4edd },
        { id: "oro", nombre: "Oro", varilla: 0xf3e5c0, mango: 0x1a1a1a, anillo: 0xffd23f },
        { id: "rosa", nombre: "Chicle", varilla: 0xfde2e4, mango: 0xff4d8d, anillo: 0xffffff },
    ],
    fondo: [
        { id: "bar", nombre: "Bar", arriba: "#2a170a", abajo: "#0a0503" },
        { id: "noche", nombre: "Noche", arriba: "#0f2040", abajo: "#03060d" },
        { id: "neon", nombre: "Neón", arriba: "#3a0d5c", abajo: "#0b0216" },
        { id: "atardecer", nombre: "Atardecer", arriba: "#ff8a5b", abajo: "#4a1c3a" },
        { id: "bosque", nombre: "Bosque", arriba: "#1f4d2e", abajo: "#08140c" },
    ],
};
const skins = cargar("pool-skins", { pano: "verde", madera: "nogal", taco: "clasico", fondo: "bar" });
const skin = (tipo) => SKINS[tipo].find((s) => s.id === skins[tipo]) ?? SKINS[tipo][0];

// Textura del paño: un granulado suave para que no se vea plástico
function texturaPano() {
    const c = document.createElement("canvas");
    c.width = c.height = 256;
    const ctx = c.getContext("2d");
    const datos = ctx.createImageData(256, 256);
    for (let i = 0; i < datos.data.length; i += 4) {
        const v = 225 + Math.random() * 30;
        datos.data[i] = datos.data[i + 1] = datos.data[i + 2] = v;
        datos.data[i + 3] = 255;
    }
    ctx.putImageData(datos, 0, 0);
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(4, 8);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
}

// ---------- Mesa ----------
const matPano = new THREE.MeshStandardMaterial({ map: texturaPano(), roughness: 1, color: skin("pano").color });
const matBanda = new THREE.MeshStandardMaterial({ roughness: 0.85, color: skin("pano").color });
const matMadera = new THREE.MeshPhysicalMaterial({ color: skin("madera").color, roughness: 0.35, clearcoat: 1, clearcoatRoughness: 0.15 });
const matMetal = new THREE.MeshStandardMaterial({ color: 0xc9a227, metalness: 0.9, roughness: 0.25 });

// El paño tiene agujeros donde están las troneras, así las bolas caen adentro de verdad
const formaPano = new THREE.Shape();
formaPano.moveTo(-ANCHO / 2 - 0.3, -LARGO / 2 - 0.3);
formaPano.lineTo(ANCHO / 2 + 0.3, -LARGO / 2 - 0.3);
formaPano.lineTo(ANCHO / 2 + 0.3, LARGO / 2 + 0.3);
formaPano.lineTo(-ANCHO / 2 - 0.3, LARGO / 2 + 0.3);
formaPano.closePath();
for (const t of TRONERAS) {
    const agujero = new THREE.Path();
    agujero.absarc(t.x, -t.z, t.r, 0, Math.PI * 2, true);
    formaPano.holes.push(agujero);
}
const geoPano = new THREE.ShapeGeometry(formaPano, 24);
const uv = geoPano.attributes.uv;
for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / 2, uv.getY(i) / 2);
const pano = new THREE.Mesh(geoPano, matPano);
pano.rotation.x = -Math.PI / 2;
pano.receiveShadow = true;
scene.add(pano);

// Bandas con forma de cuña (como las reales), cortadas en las troneras
function banda(largo, x, z, giro) {
    const perfil = new THREE.Shape();
    perfil.moveTo(0, 0);
    perfil.lineTo(0.18, 0);
    perfil.lineTo(0.18, 0.14);
    perfil.lineTo(0.02, 0.12);
    perfil.closePath();
    const geo = new THREE.ExtrudeGeometry(perfil, { depth: largo, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.02, bevelSegments: 2 });
    geo.translate(0, 0, -largo / 2);
    const m = new THREE.Mesh(geo, matBanda);
    m.position.set(x, 0, z);
    m.rotation.y = giro;
    m.castShadow = true;
    m.receiveShadow = true;
    scene.add(m);
}
const BOCA_ESQUINA = 0.36;
const BOCA_MEDIO = 0.3;
const largoLateral = LARGO / 2 - BOCA_ESQUINA - BOCA_MEDIO / 2;
for (const lado of [-1, 1]) {
    for (const mitad of [-1, 1]) {
        const z = mitad * (BOCA_MEDIO / 2 + largoLateral / 2);
        banda(largoLateral, lado * (ANCHO / 2 + 0.02), z, lado > 0 ? 0 : Math.PI);
    }
    banda(ANCHO - BOCA_ESQUINA * 2, 0, lado * (LARGO / 2 + 0.02), lado > 0 ? -Math.PI / 2 : Math.PI / 2);
}

// Marco de madera barnizada con bordes redondeados
function marco(largo, x, z, horizontal) {
    const geo = new THREE.BoxGeometry(horizontal ? largo : 0.42, 0.22, horizontal ? 0.42 : largo);
    const m = new THREE.Mesh(geo, matMadera);
    m.position.set(x, 0.09, z);
    m.castShadow = true;
    m.receiveShadow = true;
    scene.add(m);
    const borde = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, largo, 12), matMadera);
    borde.rotation[horizontal ? "z" : "x"] = Math.PI / 2;
    borde.position.set(x + (horizontal ? 0 : Math.sign(x) * 0.2), 0.17, z + (horizontal ? Math.sign(z) * 0.2 : 0));
    scene.add(borde);
}
for (const lado of [-1, 1]) {
    marco(LARGO + 1.1, lado * (ANCHO / 2 + 0.36), 0, false);
    marco(ANCHO + 1.1, 0, lado * (LARGO / 2 + 0.36), true);
}

// Troneras: agujero con profundidad y una tapa de metal
const matHueco = new THREE.MeshBasicMaterial({ color: 0x020202, side: THREE.BackSide });
const matFondo = new THREE.MeshBasicMaterial({ color: 0x000000 });
for (const t of TRONERAS) {
    const hueco = new THREE.Mesh(new THREE.CylinderGeometry(t.r, t.r * 0.9, 0.5, 28, 1, true), matHueco);
    hueco.position.set(t.x, -0.24, t.z);
    scene.add(hueco);
    const fondo = new THREE.Mesh(new THREE.CircleGeometry(t.r, 28), matFondo);
    fondo.rotation.x = -Math.PI / 2;
    fondo.position.set(t.x, -0.48, t.z);
    scene.add(fondo);
    const tapa = new THREE.Mesh(new THREE.TorusGeometry(t.r + 0.04, 0.045, 10, 32, Math.PI), matMetal);
    tapa.rotation.x = -Math.PI / 2;
    tapa.rotation.z = Math.atan2(t.z === 0 ? 0 : -Math.sign(t.z), -Math.sign(t.x)) - Math.PI / 2;
    tapa.position.set(t.x, 0.12, t.z);
    scene.add(tapa);
}
const matDiamante = material(0xf5f0e0, { metalness: 0.4 });
for (let i = 1; i < 8; i++) {
    if (i === 4) continue;
    for (const lado of [-1, 1]) {
        const d = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), matDiamante);
        d.position.set(lado * (ANCHO / 2 + 0.33), 0.19, -LARGO / 2 + (i * LARGO) / 8);
        scene.add(d);
    }
}
const punto = new THREE.Mesh(new THREE.CircleGeometry(0.03, 12), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 }));
punto.rotation.x = -Math.PI / 2;
punto.position.set(0, 0.004, LARGO / 4);
scene.add(punto);

// ---------- Bolas ----------
function texturaBola(n) {
    const c = document.createElement("canvas");
    c.width = 256;
    c.height = 128;
    const ctx = c.getContext("2d");
    const color = colorBola(n);
    ctx.fillStyle = esRayada(n) ? "#f8f6ef" : color;
    ctx.fillRect(0, 0, 256, 128);
    if (esRayada(n)) {
        ctx.fillStyle = color;
        ctx.fillRect(0, 36, 256, 56);
    }
    if (n > 0) {
        for (const x of [64, 192]) {
            ctx.fillStyle = "#f8f6ef";
            ctx.beginPath();
            ctx.ellipse(x, 64, 22, 26, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = "#111";
            ctx.font = "bold 30px sans-serif";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(String(n), x, 66);
        }
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
}

const geoBola = new THREE.SphereGeometry(R, 28, 18);
const texturas = {};
let bolas = [];

function armarMesa(lista) {
    for (const b of bolas) scene.remove(b.malla);
    bolas = lista.map((d) => {
        texturas[d.n] ??= texturaBola(d.n);
        const malla = new THREE.Mesh(geoBola, new THREE.MeshStandardMaterial({ map: texturas[d.n], roughness: 0.18, metalness: 0.05 }));
        malla.castShadow = true;
        malla.position.set(d.x, R, d.z);
        malla.rotation.set(Math.random() * 6, Math.random() * 6, Math.random() * 6);
        malla.visible = d.activa;
        scene.add(malla);
        return { n: d.n, x: d.x, z: d.z, vx: 0, vz: 0, activa: d.activa, malla, cayendo: 0 };
    });
}

// Pone las bolas exactamente como dice la lista (para sincronizar con el amigo)
function ubicarBolas(lista) {
    for (const d of lista) {
        const b = bolas.find((x) => x.n === d.n);
        if (!b) continue;
        Object.assign(b, { x: d.x, z: d.z, vx: 0, vz: 0, activa: d.activa, cayendo: 0 });
        b.malla.visible = d.activa;
        b.malla.scale.setScalar(1);
        b.malla.position.set(d.x, R, d.z);
    }
}

const fotoBolas = () => bolas.map((b) => ({ n: b.n, x: b.x, z: b.z, activa: b.activa }));
const blanca = () => bolas.find((b) => b.n === 0);
const activas = () => bolas.filter((b) => b.activa);

// ---------- Física ----------
const ejeGiro = new THREE.Vector3();
const giro = new THREE.Quaternion();

function enBoca(b) {
    return TRONERAS.some((t) => Math.hypot(b.x - t.x, b.z - t.z) < t.r + 0.12);
}

function paso(dt) {
    for (const b of bolas) {
        if (!b.activa) continue;
        const v = Math.hypot(b.vx, b.vz);
        if (v > 0) {
            const nueva = Math.max(0, v - ROCE * dt - v * AMORTIGUACION * dt);
            const f = nueva / v;
            b.vx *= f;
            b.vz *= f;
            b.x += b.vx * dt;
            b.z += b.vz * dt;
            // Que ruede de verdad
            ejeGiro.set(b.vz, 0, -b.vx).normalize();
            b.malla.quaternion.premultiply(giro.setFromAxisAngle(ejeGiro, (nueva * dt) / R));
        }
    }

    // Choques entre bolas
    const lista = activas();
    for (let i = 0; i < lista.length; i++) {
        for (let j = i + 1; j < lista.length; j++) {
            const a = lista[i];
            const b = lista[j];
            const dx = b.x - a.x;
            const dz = b.z - a.z;
            const d = Math.hypot(dx, dz);
            if (d >= 2 * R || d === 0) continue;
            const nx = dx / d;
            const nz = dz / d;
            const solape = (2 * R - d) / 2;
            a.x -= nx * solape;
            a.z -= nz * solape;
            b.x += nx * solape;
            b.z += nz * solape;
            const relativa = (a.vx - b.vx) * nx + (a.vz - b.vz) * nz;
            if (relativa <= 0) continue;
            const impulso = (relativa * (1 + REBOTE_BOLAS)) / 2;
            a.vx -= nx * impulso;
            a.vz -= nz * impulso;
            b.vx += nx * impulso;
            b.vz += nz * impulso;
            if (juego.primerContacto === null) {
                if (a.n === 0) juego.primerContacto = b.n;
                else if (b.n === 0) juego.primerContacto = a.n;
            }
            if (relativa > 2) vibrar(Math.min(25, relativa * 3));
        }
    }

    // Bandas y troneras
    for (const b of lista) {
        const tronera = TRONERAS.find((t) => Math.hypot(b.x - t.x, b.z - t.z) < t.r);
        const afuera = Math.abs(b.x) > ANCHO / 2 + 0.25 || Math.abs(b.z) > LARGO / 2 + 0.25;
        if (tronera || afuera) {
            embocar(b);
            continue;
        }
        if (enBoca(b)) continue;
        const limX = ANCHO / 2 - R;
        const limZ = LARGO / 2 - R;
        if (b.x > limX) { b.x = limX; b.vx = -Math.abs(b.vx) * REBOTE_BANDA; }
        if (b.x < -limX) { b.x = -limX; b.vx = Math.abs(b.vx) * REBOTE_BANDA; }
        if (b.z > limZ) { b.z = limZ; b.vz = -Math.abs(b.vz) * REBOTE_BANDA; }
        if (b.z < -limZ) { b.z = -limZ; b.vz = Math.abs(b.vz) * REBOTE_BANDA; }
    }
}

function embocar(b) {
    b.activa = false;
    b.cayendo = 1;
    // Sigue rodando hacia el centro de la tronera más cercana y cae
    b.tronera = TRONERAS.reduce((a, t) => (Math.hypot(b.x - t.x, b.z - t.z) < Math.hypot(b.x - a.x, b.z - a.z) ? t : a));
    b.vx = b.vz = 0;
    juego.embocadasTiro.push(b.n);
    vibrar(30);
}

const enMovimiento = () => bolas.some((b) => b.activa && (b.vx !== 0 || b.vz !== 0));

// Recorre una línea desde (x, z) y devuelve la primera bola o banda que toca
function trazar(x, z, dx, dz, ignorar) {
    let tMin = Infinity;
    let golpe = null;
    for (const b of activas()) {
        if (b === ignorar) continue;
        const fx = x - b.x;
        const fz = z - b.z;
        const p = fx * dx + fz * dz;
        const c = fx * fx + fz * fz - 4 * R * R;
        const disc = p * p - c;
        if (disc < 0) continue;
        const t = -p - Math.sqrt(disc);
        if (t > 0 && t < tMin) {
            tMin = t;
            golpe = b;
        }
    }
    const tx = dx > 0 ? (ANCHO / 2 - R - x) / dx : dx < 0 ? (-ANCHO / 2 + R - x) / dx : Infinity;
    const tz = dz > 0 ? (LARGO / 2 - R - z) / dz : dz < 0 ? (-LARGO / 2 + R - z) / dz : Infinity;
    if (Math.min(tx, tz) < tMin) return { t: Math.min(tx, tz), golpe: null };
    return { t: tMin, golpe };
}

// ---------- Mira y taco ----------
const matLinea = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 });
const lineaTiro = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]), matLinea);
const lineaObjeto = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]), matLinea);
const fantasma = new THREE.Mesh(new THREE.RingGeometry(R * 0.85, R, 24), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7 }));
fantasma.rotation.x = -Math.PI / 2;
scene.add(lineaTiro, lineaObjeto, fantasma);

// Taco armado por partes: punta, virola, varilla, anillo y mango (los colores salen del skin)
const taco = new THREE.Group();
const cuerpoTaco = new THREE.Group();
taco.add(cuerpoTaco);
const matVarilla = new THREE.MeshPhysicalMaterial({ roughness: 0.35, clearcoat: 0.6 });
const matMango = new THREE.MeshPhysicalMaterial({ roughness: 0.3, clearcoat: 1 });
const matAnillo = new THREE.MeshStandardMaterial({ metalness: 0.9, roughness: 0.2 });
let zTaco = 0;
function tramo(largo, r1, r2, mat) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, largo, 16), mat);
    m.rotation.x = Math.PI / 2;
    m.position.z = zTaco + largo / 2;
    m.castShadow = true;
    cuerpoTaco.add(m);
    zTaco += largo;
}
tramo(0.03, 0.027, 0.027, new THREE.MeshStandardMaterial({ color: 0x2f6fd8, roughness: 0.9 }));
tramo(0.07, 0.028, 0.028, new THREE.MeshStandardMaterial({ color: 0xf4f1e8, roughness: 0.4 }));
tramo(1.9, 0.028, 0.042, matVarilla);
tramo(0.05, 0.043, 0.043, matAnillo);
tramo(1.35, 0.043, 0.06, matMango);
tramo(0.05, 0.06, 0.06, new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.6 }));
taco.position.y = R + 0.06;
scene.add(taco);

function aplicarSkins() {
    matPano.color.setHex(skin("pano").color);
    matBanda.color.setHex(new THREE.Color(skin("pano").color).multiplyScalar(0.85).getHex());
    matMadera.color.setHex(skin("madera").color);
    const t = skin("taco");
    matVarilla.color.setHex(t.varilla);
    matMango.color.setHex(t.mango);
    matAnillo.color.setHex(t.anillo);
    const f = skin("fondo");
    scene.background = fondoDegradado(f.arriba, f.abajo);
}
aplicarSkins();

function mostrarMira(visible) {
    lineaTiro.visible = lineaObjeto.visible = fantasma.visible = taco.visible = visible;
}

function dibujarMira(dx, dz, potencia) {
    const b = blanca();
    if (!b?.activa) return mostrarMira(false);
    const { t, golpe } = trazar(b.x, b.z, dx, dz, b);
    const fx = b.x + dx * t;
    const fz = b.z + dz * t;
    lineaTiro.geometry.setFromPoints([new THREE.Vector3(b.x, R, b.z), new THREE.Vector3(fx, R, fz)]);
    fantasma.position.set(fx, 0.01, fz);
    if (golpe) {
        const nx = golpe.x - fx;
        const nz = golpe.z - fz;
        const l = Math.hypot(nx, nz);
        lineaObjeto.visible = true;
        lineaObjeto.geometry.setFromPoints([
            new THREE.Vector3(golpe.x, R, golpe.z),
            new THREE.Vector3(golpe.x + (nx / l) * 0.9, R, golpe.z + (nz / l) * 0.9),
        ]);
    } else {
        lineaObjeto.visible = false;
    }
    // El taco se ubica detrás de la blanca, más lejos cuanto más fuerza
    taco.position.set(b.x, R + 0.06, b.z);
    taco.rotation.y = Math.atan2(-dx, -dz);
    cuerpoTaco.position.z = R + 0.04 + potencia * 1.1;
}

// Animación del golpe: el taco avanza rápido hasta la blanca y recién ahí sale la bola
let golpe = null;
function golpear(dx, dz, fuerza, alPegar) {
    golpe = { dx, dz, desde: fuerza, t: 0, alPegar };
    mostrarMira(true);
}
function animarGolpe(dt) {
    if (!golpe) return;
    golpe.t += dt;
    const duracion = 0.12;
    const avance = Math.min(1, golpe.t / duracion);
    dibujarMira(golpe.dx, golpe.dz, golpe.desde * (1 - avance * avance) - avance * 0.08);
    lineaTiro.visible = lineaObjeto.visible = fantasma.visible = false;
    if (avance >= 1) {
        const fin = golpe.alPegar;
        golpe = null;
        fin();
        // El taco queda un instante y desaparece
        setTimeout(() => juego.fase !== "apuntando" && (taco.visible = false), 250);
    }
}

// ---------- Turnos y reglas ----------
// El índice 0 siempre soy yo; el 1 es la compu o el amigo
let jugadores = [yo, "cpu"];
let nombres = ["Vos", "Compu"];
let juego = { fase: "inicio", turno: 0, grupos: [null, null], primerContacto: null, embocadasTiro: [], restantesAntes: 0 };
let apunte = { dx: 0, dz: -1 };
let potencia = 0;
let ultimoTiro = null;
let online = null;
let partida = null;
let tiroN = 0;
let misTiros = 0;

const restantes = (grupo) => bolas.filter((b) => b.activa && deGrupo(b.n, grupo)).length;

function tirar(dx, dz, fuerza) {
    const b = blanca();
    ultimoTiro = { dx, dz, potencia: fuerza, antes: fotoBolas() };
    if (juego.turno === 0) misTiros++;
    juego.primerContacto = null;
    juego.embocadasTiro = [];
    juego.restantesAntes = juego.grupos[juego.turno] ? restantes(juego.grupos[juego.turno]) : 7;
    juego.fase = "golpe";
    pintarControles();
    golpear(dx, dz, fuerza, () => {
        b.vx = dx * fuerza * VELOCIDAD_MAX;
        b.vz = dz * fuerza * VELOCIDAD_MAX;
        juego.fase = "moviendo";
        vibrar(20);
    });
}

function reponerBlanca() {
    const b = blanca();
    Object.assign(b, { activa: true, cayendo: 0, x: 0, z: LARGO / 4, vx: 0, vz: 0 });
    b.malla.visible = true;
    b.malla.scale.setScalar(1);
    // Si hay una bola en el lugar, la corre a un costado
    while (bolas.some((o) => o !== b && o.activa && Math.hypot(o.x - b.x, o.z - b.z) < 2.2 * R)) b.x += 2.2 * R;
}

// Decide qué pasó con el tiro: faltas, grupos, si sigue el mismo jugador o si terminó
function evaluarTiro() {
    const quien = juego.turno;
    const otro = 1 - quien;
    const emb = juego.embocadasTiro;
    const grupo = juego.grupos[quien];
    const blancaAdentro = emb.includes(0);

    let motivo = "";
    if (blancaAdentro) motivo = "Falta: entró la blanca";
    else if (juego.primerContacto === null) motivo = "Falta: no tocó ninguna bola";
    else if (grupo && juego.restantesAntes === 0 && juego.primerContacto !== 8) motivo = "Falta: tenía que tocar la 8";
    else if (grupo && juego.restantesAntes > 0 && !deGrupo(juego.primerContacto, grupo)) motivo = "Falta: tocó primero una bola del rival";
    else if (!grupo && juego.primerContacto === 8) motivo = "Falta: tocó primero la 8";
    const falta = motivo !== "";

    if (emb.includes(8)) {
        const gana = !falta && grupo && juego.restantesAntes === 0;
        return { fin: { ganador: gana ? quien : otro, motivo: gana ? "Embocó la 8" : "La 8 entró antes de tiempo o con falta" } };
    }

    let mensaje = motivo;
    if (!grupo && !falta) {
        const primera = emb.find((n) => n !== 0);
        if (primera) {
            juego.grupos[quien] = esLisa(primera) ? "lisas" : "rayadas";
            juego.grupos[otro] = esLisa(primera) ? "rayadas" : "lisas";
            mensaje = `${nombres[quien]}: ${juego.grupos[quien]}`;
        }
    }
    const propias = emb.filter((n) => deGrupo(n, juego.grupos[quien]));
    if (blancaAdentro) reponerBlanca();
    return { siguiente: falta || propias.length === 0 ? otro : quien, mensaje };
}

function aplicarResultado(r) {
    const quien = juego.turno;
    if (online && quien === 0) publicar(r);
    if (r.mensaje) avisar(r.mensaje);
    if (r.fin) return terminar(r.fin.ganador, r.fin.motivo);
    juego.turno = r.siguiente;
    empezarTurno();
}

function empezarTurno() {
    pintarJugadores();
    if (juego.turno === 0) {
        juego.fase = "apuntando";
        potencia = 0;
        // Apunta de entrada a la bola más cercana
        const b = blanca();
        const cercana = activas().filter((o) => o.n !== 0).sort((a, c) => Math.hypot(a.x - b.x, a.z - b.z) - Math.hypot(c.x - b.x, c.z - b.z))[0];
        if (cercana) {
            const l = Math.hypot(cercana.x - b.x, cercana.z - b.z);
            apunte = { dx: (cercana.x - b.x) / l, dz: (cercana.z - b.z) / l };
        }
    } else if (!online) {
        juego.fase = "cpu";
        setTimeout(turnoCPU, 700);
    } else {
        juego.fase = "esperando";
    }
    pintarControles();
    guardarPartida();
}

function terminar(ganador, motivo) {
    juego.fase = "fin";
    mostrarMira(false);
    borrarPartidaGuardada();
    $("continuar").hidden = true;
    if (!online) {
        const d = estado.dificultad;
        if (ganador === 0) estado.victorias[d]++;
        else estado.derrotas[d]++;
        guardar(CLAVE, estado);
    }
    vibrar(ganador === 0 ? 80 : 150);
    $("titulo-centro").innerHTML = `${ganador === 0 ? "¡Ganaste!" : `Ganó ${nombres[ganador]}`}<div class="chico">${motivo}</div>`;
    $("jugar").textContent = online ? online.textoRevancha(partida, yo) : "Otra partida";
    $("opciones").hidden = Boolean(online);
    $("centro").hidden = false;
    pintarControles();
    pintarJugadores();
    pintarRecord();
}

// ---------- Online ----------
async function publicar(r) {
    tiroN++;
    const fin = r.fin;
    await online.actualizarPartida(idPartida, {
        pool: {
            bolas: fotoBolas(),
            grupos: { [jugadores[0]]: juego.grupos[0], [jugadores[1]]: juego.grupos[1] },
            ultimo: { uid: yo, ...ultimoTiro, mensaje: r.mensaje ?? "" },
            tiroN,
        },
        turno: fin ? null : jugadores[r.siguiente],
        estado: fin ? "terminada" : "jugando",
        ganador: fin ? jugadores[fin.ganador] : null,
    });
}

let repeticion = null; // datos de la partida a aplicar cuando termine de verse el tiro del amigo

function alCambiarPartida(p) {
    if (!p) {
        $("titulo-centro").innerHTML = "La partida ya no existe";
        $("jugar").hidden = true;
        $("opciones").hidden = true;
        $("centro").hidden = false;
        return;
    }
    const primera = !partida;
    partida = p;
    // Si la partida ya terminó y el amigo pidió la revancha, el botón cambia a "Aceptar revancha"
    if (!primera && p.estado === "terminada" && juego.fase === "fin") $("jugar").textContent = online.textoRevancha(p, yo);
    if (primera) {
        const rival = p.jugadores.find((j) => j !== yo);
        jugadores = [yo, rival];
        nombres = ["Vos", p.nombres[rival]];
        armarMesa(p.pool.bolas);
        tiroN = p.pool.tiroN;
        juego.grupos = [p.pool.grupos?.[yo] ?? null, p.pool.grupos?.[rival] ?? null];
        $("centro").hidden = true;
        if (p.estado === "invitada" && p.creador !== yo) online.actualizarPartida(idPartida, { estado: "jugando" });
        return seguirSegunPartida();
    }
    if (p.pool.tiroN > tiroN) {
        tiroN = p.pool.tiroN;
        const u = p.pool.ultimo;
        if (u.uid === yo) return; // fue mi tiro: ya lo vi
        // Repetir el tiro del amigo desde la misma posición
        ubicarBolas(u.antes);
        repeticion = p;
        juego.primerContacto = null;
        juego.embocadasTiro = [];
        const b = blanca();
        juego.fase = "preparando";
        mostrarMira(true);
        dibujarMira(u.dx, u.dz, u.potencia);
        setTimeout(() => {
            golpear(u.dx, u.dz, u.potencia, () => {
                b.vx = u.dx * u.potencia * VELOCIDAD_MAX;
                b.vz = u.dz * u.potencia * VELOCIDAD_MAX;
                juego.fase = "repeticion";
            });
        }, 700);
        pintarControles();
    }
}

function seguirSegunPartida() {
    const p = partida;
    juego.grupos = [p.pool.grupos?.[jugadores[0]] ?? null, p.pool.grupos?.[jugadores[1]] ?? null];
    if (p.pool.ultimo?.mensaje && p.pool.ultimo.uid !== yo) avisar(p.pool.ultimo.mensaje);
    if (p.estado === "terminada") return terminar(p.ganador === yo ? 0 : 1, p.ganador === yo ? "¡Bien jugado!" : "Pedí la revancha");
    juego.turno = p.turno === yo ? 0 : 1;
    empezarTurno();
}

// ---------- Computadora ----------
function elegirTiroCPU() {
    const b = blanca();
    const grupo = juego.grupos[1];
    let objetivos = activas().filter((o) => o.n !== 0);
    if (!grupo) objetivos = objetivos.filter((o) => o.n !== 8);
    else if (restantes(grupo) === 0) objetivos = objetivos.filter((o) => o.n === 8);
    else objetivos = objetivos.filter((o) => deGrupo(o.n, grupo));

    let mejor = null;
    for (const o of objetivos) {
        for (const t of TRONERAS) {
            let ux = t.x - o.x;
            let uz = t.z - o.z;
            const d2 = Math.hypot(ux, uz);
            ux /= d2;
            uz /= d2;
            const gx = o.x - ux * 2 * R;
            const gz = o.z - uz * 2 * R;
            let dx = gx - b.x;
            let dz = gz - b.z;
            const d1 = Math.hypot(dx, dz);
            dx /= d1;
            dz /= d1;
            const corte = dx * ux + dz * uz;
            if (corte < 0.3) continue;
            if (trazar(b.x, b.z, dx, dz, b).golpe !== o) continue;
            const camino = trazar(o.x, o.z, ux, uz, o);
            if (camino.golpe && camino.t < d2 - 0.1) continue;
            const puntaje = corte * 2 - (d1 + d2) * 0.08;
            if (!mejor || puntaje > mejor.puntaje) mejor = { dx, dz, puntaje, distancia: d1 + d2 };
        }
    }
    if (!mejor) {
        const o = objetivos.sort((a, c) => Math.hypot(a.x - b.x, a.z - b.z) - Math.hypot(c.x - b.x, c.z - b.z))[0];
        const d = Math.hypot(o.x - b.x, o.z - b.z);
        mejor = { dx: (o.x - b.x) / d, dz: (o.z - b.z) / d, distancia: d + 2 };
    }
    const error = (Math.random() - 0.5) * 2 * ERROR_CPU[estado.dificultad];
    const angulo = Math.atan2(mejor.dz, mejor.dx) + error;
    const fuerza = THREE.MathUtils.clamp(0.32 + mejor.distancia * 0.055 + (Math.random() - 0.5) * 0.08, 0.3, 0.95);
    return { dx: Math.cos(angulo), dz: Math.sin(angulo), potencia: fuerza };
}

function turnoCPU() {
    if (juego.fase !== "cpu") return;
    const tiro = elegirTiroCPU();
    const inicio = performance.now();
    const anguloFinal = Math.atan2(tiro.dz, tiro.dx);
    const anguloInicio = anguloFinal + (Math.random() < 0.5 ? -0.6 : 0.6);
    mostrarMira(true);
    function animar() {
        if (juego.fase !== "cpu") return;
        const t = Math.min(1, (performance.now() - inicio) / 900);
        const a = anguloInicio + (anguloFinal - anguloInicio) * (1 - (1 - t) ** 3);
        dibujarMira(Math.cos(a), Math.sin(a), tiro.potencia * Math.min(1, t * 1.4));
        if (t < 1) requestAnimationFrame(animar);
        else setTimeout(() => tirar(tiro.dx, tiro.dz, tiro.potencia), 250);
    }
    animar();
}

// ---------- Controles ----------
const raycaster = new THREE.Raycaster();
const planoMesa = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
function puntoEnMesa(e) {
    const caja2d = renderer.domElement.getBoundingClientRect();
    raycaster.setFromCamera(
        new THREE.Vector2(((e.clientX - caja2d.left) / caja2d.width) * 2 - 1, -((e.clientY - caja2d.top) / caja2d.height) * 2 + 1),
        camera
    );
    return raycaster.ray.intersectPlane(planoMesa, new THREE.Vector3());
}

// Tocar la mesa: el taco apunta hacia ese punto.
// Deslizar: gira el taco desde donde está (de a poco), sin saltar al dedo.
const SENSIBILIDAD_GIRO = 0.0035; // radianes por píxel
let toque = null;
function apuntarHacia(e) {
    const p = puntoEnMesa(e);
    const b = blanca();
    if (!p || !b) return;
    const vx = p.x - b.x;
    const vz = p.z - b.z;
    const l = Math.hypot(vx, vz);
    if (l > 0.08) apunte = { dx: vx / l, dz: vz / l };
}
renderer.domElement.addEventListener("pointerdown", (e) => {
    if (juego.fase !== "apuntando") return;
    toque = { x: e.clientX, y: e.clientY, ultimoX: e.clientX, ultimoY: e.clientY, deslizo: false };
});
renderer.domElement.addEventListener("pointermove", (e) => {
    if (!toque || juego.fase !== "apuntando") return;
    if (!toque.deslizo && Math.hypot(e.clientX - toque.x, e.clientY - toque.y) < 10) return;
    toque.deslizo = true;
    // El movimiento del dedo (horizontal o vertical) se suma al ángulo actual
    const delta = e.clientX - toque.ultimoX - (e.clientY - toque.ultimoY) * 0.6;
    const a = Math.atan2(apunte.dz, apunte.dx) + delta * SENSIBILIDAD_GIRO;
    apunte = { dx: Math.cos(a), dz: Math.sin(a) };
    toque.ultimoX = e.clientX;
    toque.ultimoY = e.clientY;
});
renderer.domElement.addEventListener("pointerup", (e) => {
    if (toque && !toque.deslizo && juego.fase === "apuntando") apuntarHacia(e);
    toque = null;
});
renderer.domElement.addEventListener("pointercancel", () => (toque = null));

// Ajuste fino: mantener apretado gira de a poquito
function girar(sentido) {
    const a = Math.atan2(apunte.dz, apunte.dx) + sentido * GIRO_FINO;
    apunte = { dx: Math.cos(a), dz: Math.sin(a) };
}
for (const [id, sentido] of [["girar-izq", -1], ["girar-der", 1]]) {
    let repetir = null;
    const parar = () => clearInterval(repetir);
    $(id).addEventListener("pointerdown", (e) => {
        e.preventDefault();
        if (juego.fase !== "apuntando") return;
        girar(sentido);
        let veces = 0;
        repetir = setInterval(() => girar(sentido * (++veces > 15 ? 3 : 1)), 45);
    });
    $(id).addEventListener("pointerup", parar);
    $(id).addEventListener("pointerleave", parar);
    $(id).addEventListener("pointercancel", parar);
}

// Barra del taco: se desliza hacia abajo para cargar fuerza y se suelta para tirar
const riel = document.querySelector(".riel");
let cargando = false;
function fuerzaDesde(e) {
    const caja2d = riel.getBoundingClientRect();
    potencia = THREE.MathUtils.clamp((e.clientY - caja2d.top - 10) / (caja2d.height - 20), 0, 1);
    pintarBarra();
}
$("barra").addEventListener("pointerdown", (e) => {
    if (juego.fase !== "apuntando") return;
    cargando = true;
    try {
        $("barra").setPointerCapture(e.pointerId);
    } catch {}
    fuerzaDesde(e);
});
$("barra").addEventListener("pointermove", (e) => cargando && fuerzaDesde(e));
$("barra").addEventListener("pointerup", () => {
    if (!cargando) return;
    cargando = false;
    if (potencia < 0.04) {
        potencia = 0;
        return pintarBarra();
    }
    const fuerza = potencia;
    potencia = 0;
    pintarBarra();
    tirar(apunte.dx, apunte.dz, fuerza);
});

function pintarBarra() {
    const caja2d = riel.getBoundingClientRect();
    $("taco-barra").style.transform = `translate(-50%, ${potencia * caja2d.height * 0.55}px)`;
    $("relleno").style.height = `${potencia * 100}%`;
    $("porcentaje").textContent = potencia > 0 ? `${Math.round(potencia * 100)}%` : "Fuerza";
}

function pintarControles() {
    const mio = juego.fase === "apuntando";
    $("barra").hidden = !mio;
    $("ajuste").hidden = !mio;
    $("ayuda").hidden = !mio || misTiros > 1;
    $("esperando").hidden = juego.fase !== "esperando";
    $("esperando").textContent = `Esperando que tire ${nombres[1]}…`;
}

// ---------- Ciclo ----------
alAnimar((dt) => {
    // Cámara cenital que encuadra la mesa según la forma de la pantalla
    const tan = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const distancia = Math.max((LARGO / 2 + 0.75) / tan, (ANCHO / 2 + 0.6) / (tan * camera.aspect));
    camera.position.set(0, distancia * 0.97, distancia * 0.22);
    camera.lookAt(0, 0, 0.1);

    animarGolpe(dt);
    if (juego.fase === "moviendo" || juego.fase === "repeticion") {
        const pasos = Math.ceil(dt / (1 / 240));
        for (let i = 0; i < pasos; i++) paso(dt / pasos);
        const quieto = !enMovimiento() && !bolas.some((b) => b.cayendo > 0);
        if (quieto && juego.fase === "moviendo") {
            aplicarResultado(evaluarTiro());
        } else if (quieto && juego.fase === "repeticion" && repeticion) {
            // Al terminar de verse el tiro del amigo, queda todo como lo dejó en su celular
            const p = repeticion;
            repeticion = null;
            ubicarBolas(p.pool.bolas);
            seguirSegunPartida();
        }
    }

    // La mira y el taco se ven siempre que es mi turno
    if (juego.fase === "apuntando") {
        mostrarMira(true);
        dibujarMira(apunte.dx, apunte.dz, potencia);
    }

    for (const b of bolas) {
        if (b.cayendo > 0) {
            b.cayendo = Math.max(0, b.cayendo - dt * 2.2);
            const avance = 1 - b.cayendo;
            const t = b.tronera ?? { x: b.x, z: b.z };
            b.malla.position.x += (t.x - b.malla.position.x) * Math.min(1, dt * 14);
            b.malla.position.z += (t.z - b.malla.position.z) * Math.min(1, dt * 14);
            b.malla.position.y = R - avance * avance * 0.55;
            b.malla.rotation.x += dt * 8;
            if (b.cayendo === 0) b.malla.visible = false;
        } else if (b.activa) {
            b.malla.position.set(b.x, R, b.z);
        }
    }
});

// ---------- Interfaz ----------
function avisar(texto) {
    $("aviso").innerHTML = `<div class="chico">${texto}</div>`;
    $("aviso").hidden = false;
    clearTimeout(avisar.t);
    avisar.t = setTimeout(() => ($("aviso").hidden = true), 1800);
}

function pintarJugadores() {
    for (const i of [0, 1]) {
        const el = $(`j${i}`);
        const grupo = juego.grupos[i];
        el.classList.toggle("turno", juego.turno === i && juego.fase !== "fin" && juego.fase !== "inicio");
        el.querySelector(".nombre").textContent = nombres[i];
        el.querySelector(".grupo").textContent = grupo ? (grupo === "lisas" ? "Lisas (1-7)" : "Rayadas (9-15)") : "Mesa abierta";
        const numeros = grupo === "lisas" ? [1, 2, 3, 4, 5, 6, 7] : grupo === "rayadas" ? [9, 10, 11, 12, 13, 14, 15] : [];
        const fuera = (n) => !bolas.find((b) => b.n === n)?.activa;
        el.querySelector(".bolitas").innerHTML = numeros
            .map((n) => `<span class="bolita${esRayada(n) ? " rayada" : ""}${fuera(n) ? " ya" : ""}" style="--c:${colorBola(n)}"></span>`)
            .join("");
    }
}

function pintarRecord() {
    const d = estado.dificultad;
    $("record").textContent = online ? "" : `${NOMBRES_DIFICULTAD[d]}: ${estado.victorias[d]} ganadas · ${estado.derrotas[d]} perdidas`;
    for (const b of document.querySelectorAll(".dificultad button")) b.classList.toggle("activa", Number(b.dataset.nivel) === d);
    if (!online) nombres[1] = `Compu · ${NOMBRES_DIFICULTAD[d]}`;
}

for (const b of document.querySelectorAll(".dificultad button")) {
    b.addEventListener("click", () => {
        estado.dificultad = Number(b.dataset.nivel);
        guardar(CLAVE, estado);
        pintarRecord();
        pintarJugadores();
    });
}

$("jugar").addEventListener("click", async () => {
    if (online) {
        // Revancha: si el amigo ya la pidió, se entra a esa misma partida
        const { datosIniciales } = await import("./reglas.js");
        await online.irARevancha(partida, datosIniciales);
        return;
    }
    armarMesa(armarTriangulo());
    tiroN = 0;
    misTiros = 0;
    juego = { fase: "apuntando", turno: 0, grupos: [null, null], primerContacto: null, embocadasTiro: [], restantesAntes: 7 };
    $("centro").hidden = true;
    empezarTurno();
});

// ---------- Partida guardada (contra la compu) ----------
// Salir no borra la partida: se guarda al empezar cada turno y se puede continuar después.
const CLAVE_GUARDADA = "pool-guardada";
function guardarPartida() {
    if (online || juego.fase === "fin") return;
    guardar(CLAVE_GUARDADA, { bolas: fotoBolas(), grupos: juego.grupos, turno: juego.turno, misTiros, dificultad: estado.dificultad });
}
function borrarPartidaGuardada() {
    try {
        localStorage.removeItem(CLAVE_GUARDADA);
    } catch {}
}
const guardada = cargar(CLAVE_GUARDADA, {});
$("continuar").hidden = !guardada.bolas;
$("continuar").addEventListener("click", () => {
    armarMesa(guardada.bolas);
    estado.dificultad = guardada.dificultad ?? estado.dificultad;
    pintarRecord();
    misTiros = guardada.misTiros ?? 0;
    juego = { fase: "apuntando", turno: guardada.turno ?? 0, grupos: guardada.grupos ?? [null, null], primerContacto: null, embocadasTiro: [], restantesAntes: 7 };
    $("centro").hidden = true;
    empezarTurno();
});

// ---------- Menú de skins ----------
function muestraSkin(tipo, s) {
    if (tipo === "fondo") return `background: linear-gradient(${s.arriba}, ${s.abajo})`;
    if (tipo === "taco") {
        const c = (n) => `#${n.toString(16).padStart(6, "0")}`;
        return `background: linear-gradient(90deg, ${c(s.varilla)} 0 55%, ${c(s.anillo)} 55% 60%, ${c(s.mango)} 60%)`;
    }
    return `background: #${s.color.toString(16).padStart(6, "0")}`;
}
function pintarSkins() {
    const titulos = { taco: "Taco", pano: "Paño", madera: "Madera de la mesa", fondo: "Fondo" };
    $("lista-skins").innerHTML = Object.entries(titulos)
        .map(([tipo, titulo]) => `<div class="grupo-skins"><h3>${titulo}</h3><div class="opciones-skins">${SKINS[tipo]
            .map((s) => `<button class="opcion-skin${skins[tipo] === s.id ? " elegida" : ""}" data-tipo="${tipo}" data-id="${s.id}">
                <span class="muestra" style="${muestraSkin(tipo, s)}"></span>${s.nombre}</button>`)
            .join("")}</div></div>`)
        .join("");
}
$("lista-skins").addEventListener("click", (e) => {
    const b = e.target.closest(".opcion-skin");
    if (!b) return;
    skins[b.dataset.tipo] = b.dataset.id;
    guardar("pool-skins", skins);
    aplicarSkins();
    pintarSkins();
    vibrar(10);
});
$("abrir-skins").addEventListener("click", () => {
    pintarSkins();
    $("panel-skins").hidden = false;
});
$("cerrar-skins").addEventListener("click", () => ($("panel-skins").hidden = true));
$("listo-skins").addEventListener("click", () => ($("panel-skins").hidden = true));
$("panel-skins").addEventListener("click", (e) => e.target === $("panel-skins") && ($("panel-skins").hidden = true));

armarMesa(armarTriangulo());
mostrarMira(false);
pintarRecord();
pintarJugadores();

if (idPartida) {
    online = await import("../../js/multijugador.js");
    online.iniciarPresencia("Pool");
    $("centro").hidden = true;
    online.escucharPartida(idPartida, alCambiarPartida, () => {
        $("titulo-centro").innerHTML = "No tenés acceso a esta partida";
        $("jugar").hidden = true;
        $("centro").hidden = false;
    });
} else if (usuario.uid) {
    // Volver a conectarse: partidas online de pool que siguen en curso
    const m = await import("../../js/multijugador.js");
    m.escucharPartidas((lista) => {
        const activas = lista.filter((p) => p.juego === "pool" && p.estado !== "terminada");
        $("en-curso").innerHTML = activas
            .map((p) => {
                const otro = p.jugadores.find((j) => j !== yo);
                return `<a href="?partida=${p.id}">🎱 Seguir con ${p.nombres[otro]}${p.turno === yo ? " · tu turno" : ""}</a>`;
            })
            .join("");
    });
}
