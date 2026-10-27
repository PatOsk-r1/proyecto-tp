// Fusión: comprá gemas, juntá dos iguales para crear una de nivel mayor que produce más.
import {
    THREE, crearEscena, material, formatear, cargar, guardar, textoFlotante, aPantalla, vibrar, MONEDA,
    fondoDegradado, crearParticulas,
} from "../../js/comun3d.js";

const $ = (id) => document.getElementById(id);
const CLAVE = "fusion";
const LADO = 4;
const SEPARACION = 1.45;
const MAX_HORAS_AUSENTE = 2;

const FORMAS = [
    () => new THREE.TetrahedronGeometry(0.5),
    () => new THREE.OctahedronGeometry(0.48),
    () => new THREE.BoxGeometry(0.62, 0.62, 0.62),
    () => new THREE.DodecahedronGeometry(0.45),
    () => new THREE.IcosahedronGeometry(0.48),
    () => new THREE.TorusGeometry(0.32, 0.14, 8, 18),
    () => new THREE.ConeGeometry(0.42, 0.85, 6),
    () => new THREE.CylinderGeometry(0.38, 0.38, 0.55, 6),
    () => new THREE.TorusKnotGeometry(0.26, 0.09, 64, 8),
];
const COLORES = [0xff4d6d, 0xff9f1c, 0xffe66d, 0x4cd964, 0x2ec4b6, 0x3a86ff, 0x8338ec, 0xff4fd8, 0xf1f1ff];

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
const colorNivel = (nivel) => COLORES[(nivel - 1) % COLORES.length];

// ---------- Escena ----------
const lienzo = $("lienzo");
const { scene, camera, renderer, alAnimar } = crearEscena(lienzo, { fondo: 0x0b0620 });
scene.background = fondoDegradado("#1a0b3d", "#05020f");
scene.fog = null;
const particulas = crearParticulas(scene);
alAnimar(particulas.actualizar);

// Estrellas
const posEstrellas = new Float32Array(600 * 3);
for (let i = 0; i < 600; i++) {
    const v = new THREE.Vector3().randomDirection().multiplyScalar(25 + Math.random() * 20);
    posEstrellas.set([v.x, Math.abs(v.y) * 0.8 - 4, v.z], i * 3);
}
const geoEstrellas = new THREE.BufferGeometry();
geoEstrellas.setAttribute("position", new THREE.BufferAttribute(posEstrellas, 3));
const estrellas = new THREE.Points(geoEstrellas, new THREE.PointsMaterial({ color: 0xffffff, size: 0.12, transparent: true, opacity: 0.8 }));
scene.add(estrellas);

// Plataforma con borde de neón
const anchoTablero = LADO * SEPARACION + 0.7;
const base = new THREE.Mesh(new THREE.BoxGeometry(anchoTablero, 0.4, anchoTablero), material(0x1d1240, { metalness: 0.5, roughness: 0.4 }));
base.position.y = -0.3;
base.receiveShadow = true;
scene.add(base);
const borde = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(anchoTablero + 0.02, 0.42, anchoTablero + 0.02)),
    new THREE.LineBasicMaterial({ color: 0xb56bff })
);
borde.position.y = -0.3;
scene.add(borde);

const centroCasilla = (i) =>
    new THREE.Vector3(((i % LADO) - (LADO - 1) / 2) * SEPARACION, 0, (Math.floor(i / LADO) - (LADO - 1) / 2) * SEPARACION);

// Pedestales con un anillo que se ilumina del color de la gema
const anillos = [];
for (let i = 0; i < LADO * LADO; i++) {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.56, 0.62, 0.16, 28), material(0x2c1d5e, { metalness: 0.6, roughness: 0.35 }));
    p.position.copy(centroCasilla(i)).setY(-0.02);
    p.receiveShadow = true;
    scene.add(p);
    const anillo = new THREE.Mesh(
        new THREE.TorusGeometry(0.56, 0.03, 8, 40),
        new THREE.MeshStandardMaterial({ color: 0x4b3a8a, emissive: 0x000000, emissiveIntensity: 1.5 })
    );
    anillo.rotation.x = Math.PI / 2;
    anillo.position.copy(centroCasilla(i)).setY(0.07);
    scene.add(anillo);
    anillos.push(anillo);
}

function pintarAnillo(i, resaltado = false) {
    const n = estado.tablero[i];
    const a = anillos[i].material;
    if (resaltado) {
        a.color.setHex(0xffffff);
        a.emissive.setHex(0xffffff);
    } else if (n) {
        a.color.setHex(colorNivel(n));
        a.emissive.setHex(colorNivel(n));
    } else {
        a.color.setHex(0x4b3a8a);
        a.emissive.setHex(0x000000);
    }
}

// Gemas del tablero (una por casilla ocupada) con su cartel de nivel
const objetos = Array(LADO * LADO).fill(null);
const carteles = Array.from({ length: LADO * LADO }, () => {
    const e = document.createElement("div");
    e.className = "etiqueta-3d";
    e.hidden = true;
    lienzo.appendChild(e);
    return e;
});

function crearObjeto(i, nivel, como) {
    const color = colorNivel(nivel);
    const vuelta = Math.floor((nivel - 1) / FORMAS.length);
    const obj = new THREE.Mesh(
        FORMAS[(nivel - 1) % FORMAS.length](),
        material(color, {
            flatShading: true,
            metalness: Math.min(0.3 + vuelta * 0.25, 0.9),
            roughness: 0.15,
            emissive: color,
            emissiveIntensity: 0.25 + vuelta * 0.2,
        })
    );
    obj.castShadow = true;
    obj.position.copy(centroCasilla(i)).setY(como === "caer" ? 5 : 0.6);
    obj.userData = { indice: i, nivel, fase: Math.random() * 6, velY: 0 };
    if (como === "crecer") obj.scale.setScalar(0.01);
    scene.add(obj);
    objetos[i] = obj;
    pintarAnillo(i);
}

function quitarObjeto(i) {
    if (objetos[i]) scene.remove(objetos[i]);
    objetos[i] = null;
}

estado.tablero.forEach((n, i) => n && crearObjeto(i, n));

// Onda expansiva al fusionar
const ondas = [];
function onda(posicion, color) {
    const o = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.06, 8, 40), new THREE.MeshBasicMaterial({ color, transparent: true }));
    o.rotation.x = Math.PI / 2;
    o.position.copy(posicion);
    o.userData.vida = 0.5;
    scene.add(o);
    ondas.push(o);
}

// ---------- Arrastrar ----------
const raycaster = new THREE.Raycaster();
const plano = new THREE.Plane(new THREE.Vector3(0, 1, 0), -1);
const punto = new THREE.Vector3();
let arrastrado = null;
let resaltada = -1;

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

function resaltar(i) {
    if (resaltada === i) return;
    if (resaltada >= 0) pintarAnillo(resaltada);
    resaltada = i;
    if (i >= 0) pintarAnillo(i, true);
}

renderer.domElement.addEventListener("pointerdown", (e) => {
    apuntar(e);
    const toque = raycaster.intersectObjects(objetos.filter(Boolean))[0];
    if (!toque) return;
    arrastrado = toque.object;
    renderer.domElement.setPointerCapture(e.pointerId);
    vibrar(10);
});

renderer.domElement.addEventListener("pointermove", (e) => {
    if (!arrastrado) return;
    apuntar(e);
    if (raycaster.ray.intersectPlane(plano, punto)) arrastrado.position.set(punto.x, 1, punto.z);
    const destino = casillaEn(arrastrado.position);
    resaltar(destino !== arrastrado.userData.indice ? destino : -1);
});

renderer.domElement.addEventListener("pointerup", () => {
    if (!arrastrado) return;
    const origen = arrastrado.userData.indice;
    const destino = casillaEn(arrastrado.position);
    const nivel = arrastrado.userData.nivel;
    arrastrado = null;
    resaltar(-1);

    if (destino === -1 || destino === origen) return;

    if (estado.tablero[destino] === nivel) {
        // Fusión
        quitarObjeto(origen);
        quitarObjeto(destino);
        estado.tablero[origen] = 0;
        estado.tablero[destino] = nivel + 1;
        pintarAnillo(origen);
        crearObjeto(destino, nivel + 1, "crecer");
        const centro = centroCasilla(destino).setY(0.6);
        particulas.emitir(centro, colorNivel(nivel + 1), 22, { velocidad: 4, arriba: 5, tamano: 0.14, brillo: true });
        onda(centro.clone().setY(0.1), colorNivel(nivel + 1));
        vibrar(45);
        const p = aPantalla(centro.clone().setY(1.3), camera, renderer.domElement);
        textoFlotante(p.x, p.y, `Nivel ${nivel + 1}!`, "#ffffff");
        if (nivel + 1 > estado.maximo) {
            estado.maximo = nivel + 1;
            avisar(`<div>¡Nueva gema!</div><div class="chico">Nivel ${estado.maximo}</div>`);
        }
    } else if (estado.tablero[destino] === 0) {
        // Mover a un pedestal vacío
        estado.tablero[destino] = nivel;
        estado.tablero[origen] = 0;
        objetos[destino] = objetos[origen];
        objetos[origen] = null;
        objetos[destino].userData.indice = destino;
    } else {
        // Intercambiar con otra gema
        [estado.tablero[origen], estado.tablero[destino]] = [estado.tablero[destino], nivel];
        [objetos[origen], objetos[destino]] = [objetos[destino], objetos[origen]];
        objetos[origen].userData.indice = origen;
        objetos[destino].userData.indice = destino;
    }
    pintarAnillo(origen);
    pintarAnillo(destino);
    guardarProgreso();
    actualizar();
});

// ---------- Animación ----------
let tiempo = 0;
let brillo = 0;
const posCartel = new THREE.Vector3();

alAnimar((dt) => {
    tiempo += dt;
    const lejos = Math.max(1, 0.75 / camera.aspect);
    camera.position.set(0, 9.5 * lejos, 6.5 * lejos);
    camera.lookAt(0, 0, 0.5);
    estrellas.rotation.y += dt * 0.02;

    const caja2d = lienzo.getBoundingClientRect();
    objetos.forEach((obj, i) => {
        const cartel = carteles[i];
        cartel.hidden = !obj;
        if (!obj) return;
        const d = obj.userData;
        if (obj !== arrastrado) {
            if (obj.scale.x < 1) obj.scale.setScalar(Math.min(1, obj.scale.x + dt * 4));
            const destino = centroCasilla(d.indice);
            obj.position.x += (destino.x - obj.position.x) * Math.min(1, dt * 12);
            obj.position.z += (destino.z - obj.position.z) * Math.min(1, dt * 12);
            const flotar = 0.6 + Math.sin(tiempo * 2 + d.fase) * 0.08;
            if (obj.position.y > flotar + 0.05) {
                // Cayendo desde arriba (compra) con un pequeño rebote
                d.velY -= 25 * dt;
                obj.position.y = Math.max(flotar, obj.position.y + d.velY * dt);
                if (obj.position.y === flotar) {
                    d.velY = 0;
                    particulas.emitir(obj.position.clone().setY(0.1), colorNivel(d.nivel), 8, { velocidad: 2, arriba: 2, tamano: 0.08, brillo: true });
                }
            } else {
                obj.position.y = flotar;
            }
            obj.rotation.y += dt * 0.9;
        } else {
            obj.rotation.y += dt * 4;
        }
        const p = aPantalla(posCartel.copy(obj.position).setY(obj.position.y + 0.65), camera, renderer.domElement);
        cartel.style.left = `${p.x - caja2d.left}px`;
        cartel.style.top = `${p.y - caja2d.top}px`;
        cartel.textContent = `Nv ${d.nivel}`;
    });

    for (let i = ondas.length - 1; i >= 0; i--) {
        const o = ondas[i];
        o.userData.vida -= dt;
        const avance = 1 - o.userData.vida / 0.5;
        o.scale.setScalar(1 + avance * 2.5);
        o.material.opacity = 1 - avance;
        if (o.userData.vida <= 0) {
            scene.remove(o);
            ondas.splice(i, 1);
        }
    }

    // Chispas doradas que muestran que las gemas producen
    brillo -= dt;
    if (brillo <= 0) {
        brillo = 0.4;
        const llenas = objetos.filter(Boolean);
        if (llenas.length) {
            const o = llenas[Math.floor(Math.random() * llenas.length)];
            particulas.emitir(o.position.clone(), 0xffcc33, 2, { velocidad: 0.5, arriba: 2.5, tamano: 0.07, gravedad: 2, brillo: true });
        }
    }
});

// ---------- Mejoras ----------
function avisar(html) {
    $("aviso").innerHTML = html;
    $("aviso").hidden = false;
    clearTimeout(avisar.t);
    avisar.t = setTimeout(() => ($("aviso").hidden = true), 2200);
}

function crearBoton(titulo, alComprar) {
    const boton = document.createElement("button");
    boton.className = "mejora";
    boton.innerHTML = `<span class="titulo">${titulo}</span><span class="nivel"></span><span class="detalle"></span><span class="precio"></span>`;
    boton.addEventListener("click", alComprar);
    $("mejoras").appendChild(boton);
    return boton;
}

const botonComprar = crearBoton("💎 Nueva gema", () => {
    const libres = estado.tablero.flatMap((n, i) => (n ? [] : [i]));
    const costo = costoCompra();
    if (!libres.length || estado.monedas < costo) return;
    const i = libres[Math.floor(Math.random() * libres.length)];
    estado.monedas -= costo;
    estado.compras++;
    estado.tablero[i] = nivelComprado();
    crearObjeto(i, nivelComprado(), "caer");
    vibrar(20);
    guardarProgreso();
    actualizar();
});

const botonMejorCompra = crearBoton("⬆️ Mejor gema", () => {
    const costo = costoMejorCompra();
    if (estado.monedas < costo) return;
    estado.monedas -= costo;
    estado.mejorCompra++;
    vibrar(25);
    guardarProgreso();
    actualizar();
});

const botonGanancia = crearBoton("✨ Más brillo", () => {
    const costo = costoGanancia();
    if (estado.monedas < costo) return;
    estado.monedas -= costo;
    estado.ganancia++;
    vibrar(25);
    guardarProgreso();
    actualizar();
});

function pintarBoton(boton, nivel, detalle, costo, habilitado = true) {
    boton.querySelector(".nivel").textContent = nivel;
    boton.querySelector(".detalle").textContent = detalle;
    boton.querySelector(".precio").innerHTML = `${MONEDA}${formatear(costo)}`;
    boton.disabled = !habilitado || estado.monedas < costo;
    boton.classList.toggle("se-puede", !boton.disabled);
}

function actualizar() {
    const libres = estado.tablero.filter((n) => !n).length;
    $("monedas").innerHTML = `${MONEDA}${formatear(estado.monedas)}`;
    $("por-segundo").textContent = `${formatear(porSegundo())} por segundo · mejor gema: nivel ${estado.maximo}`;
    pintarBoton(botonComprar, `${LADO * LADO - libres}/${LADO * LADO}`, libres ? `Agrega una gema nivel ${nivelComprado()}` : "Tablero lleno: fusioná", costoCompra(), libres > 0);
    pintarBoton(botonMejorCompra, `Nv ${estado.mejorCompra}`, `Las nuevas salen nivel ${nivelComprado() + 1}`, costoMejorCompra());
    pintarBoton(botonGanancia, `Nv ${estado.ganancia}`, `×${(1 + estado.ganancia * 0.5).toFixed(1)} producción`, costoGanancia());
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
