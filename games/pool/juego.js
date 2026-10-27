// Pool (bola 8) contra la computadora.
// Física simple en 2D sobre la mesa: rozamiento, choques entre bolas, bandas y troneras.
import { THREE, crearEscena, material, cargar, guardar, vibrar, fondoDegradado } from "../../js/comun3d.js";

const $ = (id) => document.getElementById(id);
const CLAVE = "pool";

// Medidas de la mesa (el largo va a lo alto de la pantalla)
const ANCHO = 4.4;
const LARGO = 8.8;
const R = 0.12;
const ROCE = 1.4; // frenado constante
const AMORTIGUACION = 0.35; // frenado proporcional a la velocidad
const REBOTE_BOLAS = 0.95;
const REBOTE_BANDA = 0.78;
const VELOCIDAD_MAX = 13;
const ERROR_CPU = [0.09, 0.045, 0.015];
const NOMBRES_DIFICULTAD = ["Fácil", "Normal", "Difícil"];

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
const esLisa = (n) => n >= 1 && n <= 7;
const esRayada = (n) => n >= 9 && n <= 15;
const deGrupo = (n, grupo) => (grupo === "lisas" ? esLisa(n) : grupo === "rayadas" ? esRayada(n) : false);

const estado = cargar(CLAVE, { dificultad: 1, victorias: [0, 0, 0], derrotas: [0, 0, 0] });

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

// Paño, bandas, madera y troneras
const pano = new THREE.Mesh(new THREE.PlaneGeometry(ANCHO + 0.5, LARGO + 0.5), material(0x1f8a4c, { roughness: 0.95 }));
pano.rotation.x = -Math.PI / 2;
pano.receiveShadow = true;
scene.add(pano);

const matBanda = material(0x177a40, { roughness: 0.8 });
const matMadera = material(0x6b3a1c, { roughness: 0.5, metalness: 0.1 });
const BOCA = 0.32;
const largoLateral = LARGO / 2 - BOCA * 1.4;
for (const lado of [-1, 1]) {
    for (const mitad of [-1, 1]) caja(0.14, 0.12, largoLateral, matBanda, lado * (ANCHO / 2 + 0.07), 0.06, (mitad * LARGO) / 4);
    caja(ANCHO - BOCA * 1.6, 0.12, 0.14, matBanda, 0, 0.06, lado * (LARGO / 2 + 0.07));
    caja(0.4, 0.2, LARGO + 1.05, matMadera, lado * (ANCHO / 2 + 0.33), 0.08, 0);
    caja(ANCHO + 1.05, 0.2, 0.4, matMadera, 0, 0.08, lado * (LARGO / 2 + 0.33));
}
const matTronera = new THREE.MeshBasicMaterial({ color: 0x050505 });
for (const t of TRONERAS) {
    const agujero = new THREE.Mesh(new THREE.CircleGeometry(t.r, 24), matTronera);
    agujero.rotation.x = -Math.PI / 2;
    agujero.position.set(t.x, 0.005, t.z);
    scene.add(agujero);
}
// Diamantes en la madera
const matDiamante = material(0xf5f0e0, { metalness: 0.4 });
for (let i = 1; i < 8; i++) {
    if (i === 4) continue;
    for (const lado of [-1, 1]) {
        const d = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), matDiamante);
        d.position.set(lado * (ANCHO / 2 + 0.33), 0.19, -LARGO / 2 + (i * LARGO) / 8);
        scene.add(d);
    }
}
// Marca del punto de salida
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
let bolas = [];

function crearBola(n, x, z) {
    const malla = new THREE.Mesh(geoBola, new THREE.MeshStandardMaterial({ map: texturaBola(n), roughness: 0.18, metalness: 0.05 }));
    malla.castShadow = true;
    malla.position.set(x, R, z);
    malla.rotation.set(Math.random() * 6, Math.random() * 6, Math.random() * 6);
    scene.add(malla);
    return { n, x, z, vx: 0, vz: 0, activa: true, malla, cayendo: 0 };
}

function armarMesa() {
    for (const b of bolas) scene.remove(b.malla);
    bolas = [crearBola(0, 0, LARGO / 4)];
    // Triángulo: la 1 adelante, la 8 en el centro, una lisa y una rayada en las esquinas de atrás
    const posiciones = [];
    for (let fila = 0; fila < 5; fila++) {
        for (let k = 0; k <= fila; k++) {
            posiciones.push({ x: (k - fila / 2) * 2 * R * 1.01, z: -LARGO / 4 - fila * Math.sqrt(3) * R * 1.01, fila, k });
        }
    }
    const resto = [2, 3, 4, 5, 6, 7, 9, 10, 11, 12, 13, 14, 15].sort(() => Math.random() - 0.5);
    const lisa = resto.splice(resto.findIndex(esLisa), 1)[0];
    const rayada = resto.splice(resto.findIndex(esRayada), 1)[0];
    for (const p of posiciones) {
        let n;
        if (p.fila === 0) n = 1;
        else if (p.fila === 2 && p.k === 1) n = 8;
        else if (p.fila === 4 && p.k === 0) n = lisa;
        else if (p.fila === 4 && p.k === 4) n = rayada;
        else n = resto.pop();
        bolas.push(crearBola(n, p.x, p.z));
    }
}

const blanca = () => bolas[0];
const activas = () => bolas.filter((b) => b.activa);

// ---------- Física ----------
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
            const eje = new THREE.Vector3(b.vz, 0, -b.vx).normalize();
            b.malla.quaternion.premultiply(new THREE.Quaternion().setFromAxisAngle(eje, (nueva * dt) / R));
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
const matLinea = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 });
const lineaTiro = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]), matLinea);
const lineaObjeto = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]), matLinea);
const fantasma = new THREE.Mesh(new THREE.RingGeometry(R * 0.85, R, 24), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7 }));
fantasma.rotation.x = -Math.PI / 2;
scene.add(lineaTiro, lineaObjeto, fantasma);

const taco = new THREE.Group();
const varilla = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.055, 3.4, 12), material(0xd9a066, { roughness: 0.4 }));
varilla.rotation.x = Math.PI / 2;
varilla.position.z = 1.7;
taco.add(varilla);
const punta = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.06, 12), material(0x3a6fd8));
punta.rotation.x = Math.PI / 2;
punta.position.z = 0.03;
taco.add(punta);
taco.position.y = R + 0.05;
scene.add(taco);

function mostrarMira(visible) {
    lineaTiro.visible = lineaObjeto.visible = fantasma.visible = taco.visible = visible;
}

function dibujarMira(dx, dz, potencia) {
    const b = blanca();
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
    taco.position.set(b.x, R + 0.05, b.z);
    taco.rotation.y = Math.atan2(-dx, -dz);
    taco.children.forEach((c) => (c.position.z = (c === varilla ? 1.7 : 0.03) + 0.16 + potencia * 0.9));
    $("potencia").style.height = `${potencia * 100}%`;
}

// ---------- Turnos y reglas ----------
let juego = { fase: "inicio", turno: 0, grupos: [null, null], primerContacto: null, embocadasTiro: [], restantesAntes: 0 };

const restantes = (grupo) => bolas.filter((b) => b.activa && deGrupo(b.n, grupo)).length;

function tirar(dx, dz, potencia) {
    const b = blanca();
    juego.primerContacto = null;
    juego.embocadasTiro = [];
    juego.restantesAntes = juego.grupos[juego.turno] ? restantes(juego.grupos[juego.turno]) : 7;
    b.vx = dx * potencia * VELOCIDAD_MAX;
    b.vz = dz * potencia * VELOCIDAD_MAX;
    juego.fase = "moviendo";
    mostrarMira(false);
    $("potencia").style.height = "0";
    vibrar(20);
}

function reponerBlanca() {
    const b = blanca();
    b.activa = true;
    b.cayendo = 0;
    b.malla.visible = true;
    b.malla.scale.setScalar(1);
    b.x = 0;
    b.z = LARGO / 4;
    // Si hay una bola en el lugar, la corre a un costado
    while (bolas.some((o) => o !== b && o.activa && Math.hypot(o.x - b.x, o.z - b.z) < 2.2 * R)) b.x += 2.2 * R;
}

function evaluarTiro() {
    const yo = juego.turno;
    const otro = 1 - yo;
    const emb = juego.embocadasTiro;
    const grupo = juego.grupos[yo];
    const blancaAdentro = emb.includes(0);

    let motivo = "";
    if (blancaAdentro) motivo = "Falta: embocaste la blanca";
    else if (juego.primerContacto === null) motivo = "Falta: no tocaste ninguna bola";
    else if (grupo && juego.restantesAntes === 0 && juego.primerContacto !== 8) motivo = "Falta: tenías que tocar la 8";
    else if (grupo && juego.restantesAntes > 0 && !deGrupo(juego.primerContacto, grupo)) motivo = "Falta: tocaste primero una bola del rival";
    else if (!grupo && juego.primerContacto === 8) motivo = "Falta: tocaste primero la 8";
    const falta = motivo !== "";

    if (emb.includes(8)) {
        const gana = !falta && grupo && juego.restantesAntes === 0;
        return terminar(gana ? yo : otro, gana ? "Embocaste la 8" : "La 8 entró antes de tiempo o con falta");
    }

    if (!grupo && !falta) {
        const primera = emb.find((n) => n !== 0);
        if (primera) {
            juego.grupos[yo] = esLisa(primera) ? "lisas" : "rayadas";
            juego.grupos[otro] = esLisa(primera) ? "rayadas" : "lisas";
            avisar(`${yo === 0 ? "Vos tenés" : "La compu tiene"} las ${juego.grupos[yo]}`);
        }
    }
    const propias = emb.filter((n) => deGrupo(n, juego.grupos[yo]));
    if (blancaAdentro) reponerBlanca();
    if (falta) avisar(motivo);
    if (falta || propias.length === 0) juego.turno = otro;
    empezarTurno();
}

function empezarTurno() {
    pintarJugadores();
    if (juego.turno === 0) {
        juego.fase = "apuntando";
        $("ayuda").hidden = false;
    } else {
        juego.fase = "cpu";
        $("ayuda").hidden = true;
        setTimeout(turnoCPU, 700);
    }
}

function terminar(ganador, motivo) {
    juego.fase = "fin";
    mostrarMira(false);
    const d = estado.dificultad;
    if (ganador === 0) estado.victorias[d]++;
    else estado.derrotas[d]++;
    guardar(CLAVE, estado);
    vibrar(ganador === 0 ? 80 : 150);
    $("titulo-centro").innerHTML = `${ganador === 0 ? "¡Ganaste!" : "Perdiste"}<div class="chico">${motivo}</div>`;
    $("jugar").textContent = "Otra partida";
    $("centro").hidden = false;
    pintarRecord();
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
        // Sin tiro claro: pegarle a la bola propia más cercana
        const o = objetivos.sort((a, c) => Math.hypot(a.x - b.x, a.z - b.z) - Math.hypot(c.x - b.x, c.z - b.z))[0];
        const d = Math.hypot(o.x - b.x, o.z - b.z);
        mejor = { dx: (o.x - b.x) / d, dz: (o.z - b.z) / d, distancia: d + 2 };
    }
    const error = (Math.random() - 0.5) * 2 * ERROR_CPU[estado.dificultad];
    const angulo = Math.atan2(mejor.dz, mejor.dx) + error;
    const potencia = THREE.MathUtils.clamp(0.32 + mejor.distancia * 0.055 + (Math.random() - 0.5) * 0.08, 0.3, 0.95);
    return { dx: Math.cos(angulo), dz: Math.sin(angulo), potencia };
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

// ---------- Control del jugador ----------
const raycaster = new THREE.Raycaster();
const planoMesa = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
function puntoEnMesa(e) {
    const caja = renderer.domElement.getBoundingClientRect();
    raycaster.setFromCamera(
        new THREE.Vector2(((e.clientX - caja.left) / caja.width) * 2 - 1, -((e.clientY - caja.top) / caja.height) * 2 + 1),
        camera
    );
    return raycaster.ray.intersectPlane(planoMesa, new THREE.Vector3());
}

let arrastre = null;
renderer.domElement.addEventListener("pointerdown", (e) => {
    if (juego.fase !== "apuntando") return;
    const p = puntoEnMesa(e);
    if (!p) return;
    arrastre = { inicio: p, dx: 0, dz: -1, potencia: 0 };
    renderer.domElement.setPointerCapture(e.pointerId);
});
renderer.domElement.addEventListener("pointermove", (e) => {
    if (!arrastre) return;
    const p = puntoEnMesa(e);
    if (!p) return;
    const vx = arrastre.inicio.x - p.x;
    const vz = arrastre.inicio.z - p.z;
    const l = Math.hypot(vx, vz);
    if (l < 0.05) return;
    arrastre.dx = vx / l;
    arrastre.dz = vz / l;
    arrastre.potencia = Math.min(1, l / 2.4);
    mostrarMira(true);
    dibujarMira(arrastre.dx, arrastre.dz, arrastre.potencia);
});
renderer.domElement.addEventListener("pointerup", () => {
    if (!arrastre) return;
    const { dx, dz, potencia } = arrastre;
    arrastre = null;
    if (potencia < 0.05) {
        mostrarMira(false);
        $("potencia").style.height = "0";
        return;
    }
    $("ayuda").hidden = true;
    tirar(dx, dz, potencia);
});

// ---------- Ciclo ----------
alAnimar((dt) => {
    // Cámara cenital que encuadra la mesa según la forma de la pantalla
    const tan = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const distancia = Math.max((LARGO / 2 + 0.75) / tan, (ANCHO / 2 + 0.6) / (tan * camera.aspect));
    camera.position.set(0, distancia * 0.97, distancia * 0.22);
    camera.lookAt(0, 0, 0.1);

    if (juego.fase === "moviendo") {
        const pasos = Math.ceil(dt / (1 / 240));
        for (let i = 0; i < pasos; i++) paso(dt / pasos);
        if (!enMovimiento()) evaluarTiro();
    }

    for (const b of bolas) {
        if (b.cayendo > 0) {
            b.cayendo = Math.max(0, b.cayendo - dt * 3);
            b.malla.scale.setScalar(b.cayendo);
            b.malla.position.y = R - (1 - b.cayendo) * 0.2;
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
        el.classList.toggle("turno", juego.turno === i && juego.fase !== "fin");
        el.querySelector(".grupo").textContent = grupo ? (grupo === "lisas" ? "Lisas (1-7)" : "Rayadas (9-15)") : "Mesa abierta";
        const numeros = grupo === "lisas" ? [1, 2, 3, 4, 5, 6, 7] : grupo === "rayadas" ? [9, 10, 11, 12, 13, 14, 15] : [];
        const fuera = (n) => !bolas.find((b) => b.n === n)?.activa;
        el.querySelector(".bolitas").innerHTML = numeros
            .map((n) => `<span class="bolita${esRayada(n) ? " rayada" : ""}${fuera(n) ? " ya" : ""}" style="--c:${colorBola(n)}"></span>`)
            .join("");
    }
    $("j1").querySelector(".nombre").textContent = `Compu · ${NOMBRES_DIFICULTAD[estado.dificultad]}`;
}

function pintarRecord() {
    const d = estado.dificultad;
    $("record").textContent = `${NOMBRES_DIFICULTAD[d]}: ${estado.victorias[d]} ganadas · ${estado.derrotas[d]} perdidas`;
    for (const b of document.querySelectorAll(".dificultad button")) b.classList.toggle("activa", Number(b.dataset.nivel) === d);
}

for (const b of document.querySelectorAll(".dificultad button")) {
    b.addEventListener("click", () => {
        estado.dificultad = Number(b.dataset.nivel);
        guardar(CLAVE, estado);
        pintarRecord();
        pintarJugadores();
    });
}

$("jugar").addEventListener("click", () => {
    armarMesa();
    juego = { fase: "apuntando", turno: 0, grupos: [null, null], primerContacto: null, embocadasTiro: [], restantesAntes: 7 };
    $("centro").hidden = true;
    empezarTurno();
});

armarMesa();
mostrarMira(false);
pintarRecord();
pintarJugadores();
