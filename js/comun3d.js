// Herramientas compartidas por los juegos 3D: escena, guardado, números y efectos.
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

export { THREE };

// Crea renderer, escena, cámara y luces dentro de `contenedor`.
// `alAnimar(fn)` registra una función que recibe los segundos transcurridos en cada cuadro.
export function crearEscena(contenedor, { fondo = 0x1b1440, fov = 50 } = {}) {
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
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

// Material simple con un color
export function material(color, extra = {}) {
    return new THREE.MeshStandardMaterial({ color, roughness: 0.6, ...extra });
}

// 1234 → "1.2K", 5600000 → "5.6M"
const SUFIJOS = ["", "K", "M", "B", "T", "Qa", "Qi", "Sx", "Sp", "Oc"];
export function formatear(n) {
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
