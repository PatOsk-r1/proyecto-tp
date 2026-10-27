// Marea: guiá a tu grupo por puertas que suman o multiplican y vencé al grupo rival al final.
import { THREE, crearEscena, material, formatear, cargar, guardar, aPantalla, vibrar, MONEDA } from "../../js/comun3d.js";

const CLAVE = "marea";
const ANCHO_PISTA = 8;
const VELOCIDAD = 11;
const SEPARACION_PUERTAS = 24;
const MAX_VISIBLES = 250;

const estado = cargar(CLAVE, { monedas: 0, nivel: 1, inicial: 0, ganancia: 0 });

const grupoInicial = () => 5 + estado.inicial * 3;
const multiplicador = () => 1 + estado.ganancia * 0.25;
const costoInicial = () => 20 * 1.6 ** estado.inicial;
const costoGanancia = () => 50 * 1.9 ** estado.ganancia;

// ---------- Escena ----------
const lienzo = document.getElementById("lienzo");
const { scene, camera, renderer, sol, alAnimar } = crearEscena(lienzo, { fondo: 0x7ec8f5, fov: 60 });
scene.fog.near = 40;
scene.fog.far = 110;

const pista = new THREE.Group();
scene.add(pista);

// Personas: una sola malla instanciada por grupo (rápido en celulares)
const geoPersona = new THREE.CapsuleGeometry(0.22, 0.4, 4, 8);
geoPersona.translate(0, 0.42, 0);
const mio = new THREE.InstancedMesh(geoPersona, material(0x2d6cdf), MAX_VISIBLES);
const rival = new THREE.InstancedMesh(geoPersona, material(0xc0392b), MAX_VISIBLES);
for (const g of [mio, rival]) {
    g.castShadow = true;
    g.count = 0;
    scene.add(g);
}

// Posiciones en espiral alrededor del centro del grupo
function acomodar(malla, cantidad, cx, cz, tiempo, rebote) {
    const visibles = Math.min(Math.ceil(cantidad), MAX_VISIBLES);
    const ayuda = new THREE.Object3D();
    for (let i = 0; i < visibles; i++) {
        const r = 0.38 * Math.sqrt(i);
        const a = i * 2.39996;
        ayuda.position.set(cx + Math.cos(a) * r, rebote ? Math.abs(Math.sin(tiempo * 12 + i)) * 0.15 : 0, cz + Math.sin(a) * r);
        ayuda.updateMatrix();
        malla.setMatrixAt(i, ayuda.matrix);
    }
    malla.count = visibles;
    malla.instanceMatrix.needsUpdate = true;
}

function textura(texto, color) {
    const c = document.createElement("canvas");
    c.width = 256;
    c.height = 128;
    const ctx = c.getContext("2d");
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, 256, 128);
    ctx.fillStyle = "#fff";
    ctx.font = "bold 72px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(texto, 128, 68);
    return new THREE.CanvasTexture(c);
}

// ---------- Carrera ----------
let carrera = null;

function crearPuerta(op, x, z) {
    const buena = op.tipo === "x" || op.valor > 0;
    const etiqueta = op.tipo === "x" ? `×${op.valor}` : op.valor > 0 ? `+${op.valor}` : `${op.valor}`;
    const malla = new THREE.Mesh(
        new THREE.PlaneGeometry(ANCHO_PISTA / 2 - 0.3, 2.2),
        new THREE.MeshBasicMaterial({ map: textura(etiqueta, buena ? "#2d9cdb" : "#e74c3c"), transparent: true, opacity: 0.85 })
    );
    malla.position.set(x, 1.6, z);
    pista.add(malla);
    return malla;
}

function opcionAleatoria(nivel, buena) {
    const escala = 1 + nivel * 0.15;
    if (buena) {
        return Math.random() < 0.35
            ? { tipo: "x", valor: Math.random() < 0.7 ? 2 : 3 }
            : { tipo: "+", valor: Math.round((5 + Math.random() * 15) * escala) };
    }
    return Math.random() < 0.5
        ? { tipo: "+", valor: -Math.round((3 + Math.random() * 10) * escala) }
        : { tipo: "+", valor: Math.round((1 + Math.random() * 4) * escala) };
}

function aplicar(op, cantidad) {
    return op.tipo === "x" ? cantidad * op.valor : Math.max(0, cantidad + op.valor);
}

function nuevaCarrera() {
    pista.clear();
    const nivel = estado.nivel;
    const filas = 5 + Math.min(nivel, 10);
    const largo = (filas + 1) * SEPARACION_PUERTAS;

    const suelo = new THREE.Mesh(new THREE.BoxGeometry(ANCHO_PISTA, 0.5, largo + 40), material(0xf0e6d2));
    suelo.position.set(0, -0.25, -largo / 2 + 10);
    suelo.receiveShadow = true;
    pista.add(suelo);
    for (const lado of [-1, 1]) {
        const borde = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.6, largo + 40), material(0xff8a3d));
        borde.position.set(lado * (ANCHO_PISTA / 2 + 0.2), 0, -largo / 2 + 10);
        pista.add(borde);
    }
    const meta = new THREE.Mesh(new THREE.BoxGeometry(ANCHO_PISTA, 0.05, 1), material(0xffffff));
    meta.position.set(0, 0.03, -largo);
    pista.add(meta);

    // Puertas: en cada fila, un lado conviene más que el otro
    const puertas = [];
    let esperado = grupoInicial();
    for (let i = 1; i <= filas; i++) {
        const z = -i * SEPARACION_PUERTAS;
        const izquierdaBuena = Math.random() < 0.5;
        const izq = opcionAleatoria(nivel, izquierdaBuena);
        const der = opcionAleatoria(nivel, !izquierdaBuena);
        crearPuerta(izq, -ANCHO_PISTA / 4, z);
        crearPuerta(der, ANCHO_PISTA / 4, z);
        puertas.push({ z, izq, der, pasada: false });
        esperado = Math.max(aplicar(izq, esperado), aplicar(der, esperado));
    }

    // El rival es un poco menos que el mejor camino posible
    const rivalCantidad = Math.max(3, Math.round(esperado * (0.45 + Math.min(nivel, 20) * 0.02)));

    carrera = {
        fase: "espera",
        z: 0,
        x: 0,
        cantidad: grupoInicial(),
        largo,
        puertas,
        rival: rivalCantidad,
        rivalInicial: rivalCantidad,
    };
}

// ---------- Controles ----------
let arrastrando = false;
let ultimoX = 0;
renderer.domElement.addEventListener("pointerdown", (e) => {
    arrastrando = true;
    ultimoX = e.clientX;
});
addEventListener("pointermove", (e) => {
    if (!arrastrando || carrera?.fase !== "corriendo") return;
    const ancho = renderer.domElement.clientWidth;
    carrera.x += ((e.clientX - ultimoX) / ancho) * ANCHO_PISTA * 1.3;
    carrera.x = THREE.MathUtils.clamp(carrera.x, -ANCHO_PISTA / 2 + 0.8, ANCHO_PISTA / 2 - 0.8);
    ultimoX = e.clientX;
});
addEventListener("pointerup", () => (arrastrando = false));

// ---------- Ciclo ----------
const $ = (id) => document.getElementById(id);

function mostrarCartel(id, texto, x, y, z) {
    const p = aPantalla(new THREE.Vector3(x, y, z), camera, renderer.domElement);
    const caja = lienzo.getBoundingClientRect();
    $(id).hidden = false;
    $(id).textContent = texto;
    $(id).style.left = `${p.x - caja.left}px`;
    $(id).style.top = `${p.y - caja.top}px`;
}

function terminar(gano) {
    carrera.fase = "resultado";
    let premio;
    if (gano) {
        premio = Math.round((carrera.cantidad * 2 + estado.nivel * 10) * multiplicador());
        estado.nivel++;
        $("titulo-centro").innerHTML = `¡Ganaste!<br>+${MONEDA}${formatear(premio)}`;
    } else {
        premio = Math.round(estado.nivel * 3 * multiplicador());
        $("titulo-centro").innerHTML = `Perdiste<br>+${MONEDA}${formatear(premio)}`;
    }
    estado.monedas += premio;
    guardar(CLAVE, estado);
    vibrar(gano ? 60 : 120);
    $("jugar").textContent = gano ? "Siguiente nivel" : "Reintentar";
    $("centro").hidden = false;
    $("mejoras").hidden = false;
    actualizar();
}

let tiempo = 0;
alAnimar((dt) => {
    tiempo += dt;
    if (carrera.fase === "corriendo") {
        carrera.z -= VELOCIDAD * dt;
        for (const p of carrera.puertas) {
            if (!p.pasada && carrera.z <= p.z) {
                p.pasada = true;
                carrera.cantidad = aplicar(carrera.x < 0 ? p.izq : p.der, carrera.cantidad);
                vibrar(20);
                if (carrera.cantidad < 1) return terminar(false);
            }
        }
        if (carrera.z <= -carrera.largo + 4) carrera.fase = "pelea";
    } else if (carrera.fase === "pelea") {
        // Los dos grupos se restan de a poco
        const baja = Math.max(1, Math.min(carrera.cantidad, carrera.rival) * 1.5) * dt * 4;
        carrera.cantidad = Math.max(0, carrera.cantidad - baja);
        carrera.rival = Math.max(0, carrera.rival - baja);
        carrera.x *= 1 - dt * 3;
        if (carrera.rival < 1 || carrera.cantidad < 1) return terminar(carrera.rival < 1 && carrera.cantidad >= 1);
    }

    const corriendo = carrera.fase === "corriendo" || carrera.fase === "pelea";
    acomodar(mio, carrera.cantidad, carrera.x, carrera.z, tiempo, corriendo);
    acomodar(rival, carrera.rival, 0, -carrera.largo - 3, tiempo, carrera.fase === "pelea");

    camera.position.set(carrera.x * 0.3, 8, carrera.z + 10);
    camera.lookAt(carrera.x * 0.3, 0, carrera.z - 8);
    sol.position.set(8, 16, carrera.z + 10);
    sol.target.position.set(0, 0, carrera.z);
    sol.target.updateMatrixWorld();

    mostrarCartel("cartel", formatear(Math.ceil(carrera.cantidad)), carrera.x, 2.2, carrera.z);
    if (carrera.rival >= 1 && carrera.z < -carrera.largo + 40) {
        mostrarCartel("cartel-rival", formatear(Math.ceil(carrera.rival)), 0, 2.2, -carrera.largo - 3);
    } else {
        $("cartel-rival").hidden = true;
    }
});

// ---------- Mejoras ----------
function crearBoton(titulo, alComprar) {
    const boton = document.createElement("button");
    boton.className = "mejora";
    boton.innerHTML = `<span class="titulo">${titulo}</span><span class="detalle"></span><span class="precio"></span>`;
    boton.addEventListener("click", alComprar);
    $("mejoras").appendChild(boton);
    return boton;
}

function comprar(costo, aplicarMejora) {
    if (estado.monedas < costo) return;
    estado.monedas -= costo;
    aplicarMejora();
    guardar(CLAVE, estado);
    vibrar(25);
    actualizar();
}

const botonInicial = crearBoton("Grupo inicial", () => comprar(costoInicial(), () => estado.inicial++));
const botonGanancia = crearBoton("Más monedas", () => comprar(costoGanancia(), () => estado.ganancia++));

function pintarBoton(boton, detalle, costo) {
    boton.querySelector(".detalle").textContent = detalle;
    boton.querySelector(".precio").innerHTML = `${MONEDA}${formatear(costo)}`;
    boton.disabled = estado.monedas < costo;
}

function actualizar() {
    $("monedas").innerHTML = `${MONEDA}${formatear(estado.monedas)}`;
    $("nivel").textContent = `Nivel ${estado.nivel}`;
    pintarBoton(botonInicial, `Empezás con ${grupoInicial()}`, costoInicial());
    pintarBoton(botonGanancia, `×${multiplicador().toFixed(2)} monedas`, costoGanancia());
}

$("jugar").addEventListener("click", () => {
    $("cartel-rival").hidden = true;
    nuevaCarrera();
    carrera.fase = "corriendo";
    $("centro").hidden = true;
    $("mejoras").hidden = true;
});

nuevaCarrera();
actualizar();
