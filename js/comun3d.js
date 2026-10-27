// Herramientas compartidas por los juegos 3D: escena, guardado, números y efectos.
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

export { THREE };

// Crea renderer, escena, cámara y luces dentro de `contenedor`.
// `alAnimar(fn)` registra una función que recibe los segundos transcurridos en cada cuadro.
export function crearEscena(contenedor, { fondo = 0x1b1440, fov = 50 } = {}) {
    THREE.ColorManagement.enabled = true;
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    contenedor.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(fondo);
    scene.fog = new THREE.Fog(fondo, 30, 80);

    const camera = new THREE.PerspectiveCamera(fov, 1, 0.1, 200);

    scene.add(new THREE.HemisphereLight(0xffffff, 0x3a2f80, 1.1));
    const sol = new THREE.DirectionalLight(0xffffff, 1.6);
    sol.position.set(8, 16, 10);
    sol.castShadow = true;
    sol.shadow.mapSize.set(1024, 1024);
    Object.assign(sol.shadow.camera, { left: -15, right: 15, top: 15, bottom: -15 });
    scene.add(sol);

    function ajustar() {
        const { clientWidth: ancho, clientHeight: alto } = contenedor;
        renderer.setSize(ancho, alto, false);
        camera.aspect = ancho / alto;
        camera.updateProjectionMatrix();
    }
    new ResizeObserver(ajustar).observe(contenedor);
    ajustar();

    const tareas = [];
    const reloj = new THREE.Clock();
    renderer.setAnimationLoop(() => {
        const dt = Math.min(reloj.getDelta(), 0.1);
        for (const tarea of tareas) tarea(dt);
        renderer.render(scene, camera);
    });

    return { renderer, scene, camera, sol, alAnimar: (fn) => tareas.push(fn) };
}

// Fondo con degradado vertical (se usa como scene.background)
export function fondoDegradado(arriba, abajo) {
    const c = document.createElement("canvas");
    c.width = 2;
    c.height = 256;
    const ctx = c.getContext("2d");
    const g = ctx.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, arriba);
    g.addColorStop(1, abajo);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 2, 256);
    const textura = new THREE.CanvasTexture(c);
    textura.colorSpace = THREE.SRGBColorSpace;
    return textura;
}

// Roca irregular de caras planas
export function geometriaRoca(radio, detalle = 1, irregularidad = 0.25) {
    const geo = new THREE.IcosahedronGeometry(radio, detalle);
    const pos = geo.attributes.position;
    const v = new THREE.Vector3();
    const desplazados = new Map();
    for (let i = 0; i < pos.count; i++) {
        v.fromBufferAttribute(pos, i);
        // Los vértices repetidos se mueven igual para que no queden agujeros
        const clave = `${v.x.toFixed(3)},${v.y.toFixed(3)},${v.z.toFixed(3)}`;
        if (!desplazados.has(clave)) desplazados.set(clave, 1 + (Math.random() - 0.5) * 2 * irregularidad);
        v.multiplyScalar(desplazados.get(clave));
        pos.setXYZ(i, v.x, v.y, v.z);
    }
    geo.computeVertexNormals();
    return geo;
}

// Sistema de partículas simple: cubitos que saltan, caen y se achican
export function crearParticulas(scene) {
    const geo = new THREE.BoxGeometry(1, 1, 1);
    const materiales = new Map();
    const vivas = [];

    function emitir(posicion, color, cantidad = 8, { velocidad = 3, arriba = 4, tamano = 0.15, gravedad = 12, vida = 0.9, brillo = false } = {}) {
        const clave = `${color}-${brillo}`;
        if (!materiales.has(clave)) {
            materiales.set(clave, material(color, brillo ? { emissive: color, emissiveIntensity: 0.8 } : {}));
        }
        for (let i = 0; i < cantidad; i++) {
            const p = new THREE.Mesh(geo, materiales.get(clave));
            p.position.copy(posicion);
            const a = Math.random() * Math.PI * 2;
            const v = velocidad * (0.4 + Math.random() * 0.6);
            p.userData = {
                vel: new THREE.Vector3(Math.cos(a) * v, arriba * (0.5 + Math.random() * 0.7), Math.sin(a) * v),
                vida,
                total: vida,
                tamano: tamano * (0.6 + Math.random() * 0.8),
                gravedad,
            };
            p.scale.setScalar(p.userData.tamano);
            p.rotation.set(Math.random() * 3, Math.random() * 3, 0);
            scene.add(p);
            vivas.push(p);
        }
    }

    function actualizar(dt) {
        for (let i = vivas.length - 1; i >= 0; i--) {
            const p = vivas[i];
            const d = p.userData;
            d.vida -= dt;
            if (d.vida <= 0) {
                scene.remove(p);
                vivas.splice(i, 1);
                continue;
            }
            d.vel.y -= d.gravedad * dt;
            p.position.addScaledVector(d.vel, dt);
            p.rotation.x += dt * 6;
            p.scale.setScalar(d.tamano * (d.vida / d.total));
        }
    }

    return { emitir, actualizar };
}

// Material simple con un color
export function material(color, extra = {}) {
    return new THREE.MeshStandardMaterial({ color, roughness: 0.6, ...extra });
}

// 1234 → "1.2K", 5600000 → "5.6M"
const SUFIJOS = ["", "K", "M", "B", "T", "Qa", "Qi", "Sx", "Sp", "Oc"];
export function formatear(n) {
    if (n < 1 && n % 1 !== 0) return (Math.floor(n * 100) / 100).toString();
    if (n < 10 && n % 1 !== 0) return (Math.floor(n * 10) / 10).toString();
    if (n < 1000) return Math.floor(n).toString();
    const nivel = Math.min(Math.floor(Math.log10(n) / 3), SUFIJOS.length - 1);
    const valor = n / 10 ** (nivel * 3);
    return `${valor < 10 ? valor.toFixed(2) : valor < 100 ? valor.toFixed(1) : Math.floor(valor)}${SUFIJOS[nivel]}`;
}

// Ícono de moneda dibujado con CSS (el emoji 🪙 no existe en todos los dispositivos)
export const MONEDA = '<i class="moneda"></i>';

// Guardado local del progreso de cada juego
export function cargar(clave, porDefecto) {
    try {
        return { ...porDefecto, ...JSON.parse(localStorage.getItem(clave)) };
    } catch {
        return { ...porDefecto };
    }
}

export function guardar(clave, datos) {
    try {
        localStorage.setItem(clave, JSON.stringify(datos));
    } catch {}
}

// Texto que sube y se desvanece en la posición (x, y) de la pantalla
export function textoFlotante(x, y, texto, color = "#ffcc33") {
    const el = document.createElement("div");
    el.className = "texto-flotante";
    el.textContent = texto;
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    el.style.color = color;
    document.body.appendChild(el);
    el.addEventListener("animationend", () => el.remove());
}

// Posición en pantalla (px) de un punto 3D
export function aPantalla(vector, camera, lienzo) {
    const p = vector.clone().project(camera);
    const caja = lienzo.getBoundingClientRect();
    return { x: caja.left + ((p.x + 1) / 2) * caja.width, y: caja.top + ((1 - p.y) / 2) * caja.height };
}

// Vibración corta si el dispositivo la permite
export function vibrar(ms = 15) {
    if (navigator.userActivation?.hasBeenActive) navigator.vibrate?.(ms);
}
