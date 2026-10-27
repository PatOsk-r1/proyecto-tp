// Marea: guiá a tu grupo por puertas que suman o multiplican y vencé al grupo rival al final.
import {
    THREE, crearEscena, material, formatear, cargar, guardar, aPantalla, textoFlotante, vibrar, MONEDA,
    fondoDegradado, crearParticulas,
} from "../../js/comun3d.js";

const $ = (id) => document.getElementById(id);
const CLAVE = "marea";
const ANCHO_PISTA = 8;
const VELOCIDAD = 11;
const SEPARACION_PUERTAS = 24;
const MAX_VISIBLES = 250;
const AZUL = 0x1f6fe0;
const ROJO = 0xe0392b;

const estado = cargar(CLAVE, { monedas: 0, nivel: 1, inicial: 0, ganancia: 0 });

const grupoInicial = () => 5 + estado.inicial * 3;
const multiplicador = () => 1 + estado.ganancia * 0.25;
const costoInicial = () => 20 * 1.6 ** estado.inicial;
const costoGanancia = () => 50 * 1.9 ** estado.ganancia;

// ---------- Escena ----------
const lienzo = $("lienzo");
const { scene, camera, renderer, sol, alAnimar } = crearEscena(lienzo, { fondo: 0xbfe6ff, fov: 60 });
scene.background = fondoDegradado("#3d9be9", "#d6f0ff");
scene.fog = new THREE.Fog(0xd6f0ff, 45, 120);
const particulas = crearParticulas(scene);
alAnimar(particulas.actualizar);

const pista = new THREE.Group();
scene.add(pista);

// Personas: cuerpo + cabeza, una malla instanciada por parte (rápido en celulares)
const geoCuerpo = new THREE.CapsuleGeometry(0.2, 0.36, 4, 10);
geoCuerpo.translate(0, 0.4, 0);
const geoCabeza = new THREE.SphereGeometry(0.17, 12, 10);
geoCabeza.translate(0, 0.88, 0);

function crearEquipo(color) {
    const cuerpo = new THREE.InstancedMesh(geoCuerpo, material(color, { roughness: 0.4 }), MAX_VISIBLES);
    const cabeza = new THREE.InstancedMesh(geoCabeza, material(0xffd7b0, { roughness: 0.5 }), MAX_VISIBLES);
    for (const m of [cuerpo, cabeza]) {
        m.castShadow = true;
        m.frustumCulled = false; // el grupo se mueve: no usar el volumen calculado al inicio
        m.count = 0;
        scene.add(m);
    }
    return { cuerpo, cabeza };
}
const mio = crearEquipo(AZUL);
const rival = crearEquipo(ROJO);

const ayuda = new THREE.Object3D();
function acomodar(equipo, cantidad, cx, cz, tiempo, corriendo, mirando = 0) {
    const visibles = Math.min(Math.ceil(cantidad), MAX_VISIBLES);
    for (let i = 0; i < visibles; i++) {
        const r = 0.36 * Math.sqrt(i);
        const a = i * 2.39996;
        const paso = tiempo * 14 + i * 1.7;
        ayuda.position.set(cx + Math.cos(a) * r, corriendo ? Math.abs(Math.sin(paso)) * 0.18 : 0, cz + Math.sin(a) * r);
        ayuda.rotation.set(corriendo ? -0.25 : 0, mirando, corriendo ? Math.sin(paso) * 0.12 : 0);
        ayuda.updateMatrix();
        equipo.cuerpo.setMatrixAt(i, ayuda.matrix);
        equipo.cabeza.setMatrixAt(i, ayuda.matrix);
    }
    for (const m of [equipo.cuerpo, equipo.cabeza]) {
        m.count = visibles;
        m.instanceMatrix.needsUpdate = true;
    }
}

function texturaTexto(texto, fondo) {
    const c = document.createElement("canvas");
    c.width = 256;
    c.height = 160;
    const ctx = c.getContext("2d");
    const g = ctx.createLinearGradient(0, 0, 0, 160);
    g.addColorStop(0, fondo[0]);
    g.addColorStop(1, fondo[1]);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 160);
    ctx.strokeStyle = "#ffffffaa";
    ctx.lineWidth = 8;
    ctx.strokeRect(4, 4, 248, 152);
    ctx.fillStyle = "#fff";
    ctx.font = "900 84px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.shadowColor = "#0006";
    ctx.shadowBlur = 8;
    ctx.fillText(texto, 128, 86);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
}

function texturaRayas() {
    const c = document.createElement("canvas");
    c.width = 64;
    c.height = 64;
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#f4ead8";
    ctx.fillRect(0, 0, 64, 64);
    ctx.fillStyle = "#eadcc2";
    ctx.fillRect(0, 0, 64, 32);
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
}

function texturaAjedrez() {
    const c = document.createElement("canvas");
    c.width = 128;
    c.height = 16;
    const ctx = c.getContext("2d");
    for (let x = 0; x < 16; x++) {
        for (let y = 0; y < 2; y++) {
            ctx.fillStyle = (x + y) % 2 ? "#111" : "#fff";
            ctx.fillRect(x * 8, y * 8, 8, 8);
        }
    }
    const t = new THREE.CanvasTexture(c);
    t.magFilter = THREE.NearestFilter;
    return t;
}
const rayas = texturaRayas();
const ajedrez = texturaAjedrez();

// ---------- Carrera ----------
let carrera = null;

function crearPuerta(op, x, z) {
    const buena = op.tipo === "x" || op.valor > 0;
    const etiqueta = op.tipo === "x" ? `×${op.valor}` : op.valor > 0 ? `+${op.valor}` : `${op.valor}`;
    const colores = buena ? ["#4fc3ff", "#1f6fe0"] : ["#ff7a6b", "#c62828"];
    const ancho = ANCHO_PISTA / 2 - 0.3;
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    const panel = new THREE.Mesh(
        new THREE.PlaneGeometry(ancho - 0.3, 1.9),
        new THREE.MeshBasicMaterial({ map: texturaTexto(etiqueta, colores), transparent: true, opacity: 0.82, side: THREE.DoubleSide })
    );
    panel.position.y = 1.5;
    g.add(panel);
    const matPoste = material(buena ? 0x1f6fe0 : 0xc62828, { roughness: 0.3, metalness: 0.2 });
    for (const lado of [-1, 1]) {
        const poste = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 2.7, 10), matPoste);
        poste.position.set((lado * ancho) / 2, 1.35, 0);
        poste.castShadow = true;
        g.add(poste);
    }
    const barra = new THREE.Mesh(new THREE.BoxGeometry(ancho + 0.2, 0.18, 0.18), matPoste);
    barra.position.y = 2.6;
    g.add(barra);
    pista.add(g);
    return { grupo: g, panel, buena, etiqueta };
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

// Árboles a los costados (dos mallas instanciadas)
const geoTronco = new THREE.CylinderGeometry(0.12, 0.16, 0.8, 6);
geoTronco.translate(0, 0.4, 0);
const geoCopa = new THREE.ConeGeometry(0.7, 1.6, 7);
geoCopa.translate(0, 1.5, 0);
const matTronco = material(0x8b5a2b);
const matCopa = material(0x3fbf5f, { flatShading: true });

function nuevaCarrera() {
    pista.clear();
    const nivel = estado.nivel;
    const filas = 5 + Math.min(nivel, 10);
    const largo = (filas + 1) * SEPARACION_PUERTAS;
    const total = largo + 60;

    const pasto = new THREE.Mesh(new THREE.PlaneGeometry(80, total), material(0x7ed957, { roughness: 1 }));
    pasto.rotation.x = -Math.PI / 2;
    pasto.position.set(0, -0.3, -largo / 2 + 10);
    pasto.receiveShadow = true;
    pista.add(pasto);

    const texturaPista = rayas.clone();
    texturaPista.repeat.set(1, total / 4);
    texturaPista.needsUpdate = true;
    const suelo = new THREE.Mesh(new THREE.BoxGeometry(ANCHO_PISTA, 0.5, total), material(0xffffff, { map: texturaPista }));
    suelo.position.set(0, -0.25, -largo / 2 + 10);
    suelo.receiveShadow = true;
    pista.add(suelo);
    for (const lado of [-1, 1]) {
        const borde = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.6, total), material(0xff8a3d));
        borde.position.set(lado * (ANCHO_PISTA / 2 + 0.17), 0, -largo / 2 + 10);
        borde.castShadow = true;
        pista.add(borde);
    }

    const cantidadArboles = Math.floor(total / 5) * 2;
    const troncos = new THREE.InstancedMesh(geoTronco, matTronco, cantidadArboles);
    const copas = new THREE.InstancedMesh(geoCopa, matCopa, cantidadArboles);
    for (let i = 0; i < cantidadArboles; i++) {
        const lado = i % 2 ? 1 : -1;
        ayuda.position.set(lado * (ANCHO_PISTA / 2 + 2 + Math.random() * 6), -0.3, 15 - Math.floor(i / 2) * 5 - Math.random() * 3);
        ayuda.rotation.set(0, Math.random() * 6, 0);
        ayuda.scale.setScalar(0.8 + Math.random() * 0.8);
        ayuda.updateMatrix();
        troncos.setMatrixAt(i, ayuda.matrix);
        copas.setMatrixAt(i, ayuda.matrix);
    }
    ayuda.scale.setScalar(1);
    copas.castShadow = true;
    pista.add(troncos, copas);

    const meta = new THREE.Mesh(new THREE.BoxGeometry(ANCHO_PISTA, 0.06, 1.2), material(0xffffff, { map: ajedrez }));
    meta.position.set(0, 0.03, -largo);
    pista.add(meta);

    const plataforma = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 3.6, 0.3, 32), material(0xff6f61));
    plataforma.position.set(0, -0.05, -largo - 3);
    plataforma.receiveShadow = true;
    pista.add(plataforma);

    // Puertas: en cada fila, un lado conviene más que el otro
    const puertas = [];
    let esperado = grupoInicial();
    for (let i = 1; i <= filas; i++) {
        const z = -i * SEPARACION_PUERTAS;
        const izquierdaBuena = Math.random() < 0.5;
        const izq = opcionAleatoria(nivel, izquierdaBuena);
        const der = opcionAleatoria(nivel, !izquierdaBuena);
        puertas.push({
            z, izq, der, pasada: false,
            visualIzq: crearPuerta(izq, -ANCHO_PISTA / 4, z),
            visualDer: crearPuerta(der, ANCHO_PISTA / 4, z),
        });
        esperado = Math.max(aplicar(izq, esperado), aplicar(der, esperado));
    }

    // El rival es un poco menos que el mejor camino posible
    const rivalCantidad = Math.max(3, Math.round(esperado * (0.45 + Math.min(nivel, 20) * 0.02)));

    carrera = { fase: "espera", z: 0, x: 0, cantidad: grupoInicial(), largo, puertas, rival: rivalCantidad, choque: 0 };
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
const posCartel = new THREE.Vector3();
function mostrarCartel(id, texto, x, y, z) {
    const p = aPantalla(posCartel.set(x, y, z), camera, renderer.domElement);
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
        $("titulo-centro").innerHTML = `¡Victoria!<div class="chico">Nivel superado</div><div>+${MONEDA}${formatear(premio)}</div>`;
        particulas.emitir(new THREE.Vector3(carrera.x, 1, carrera.z), 0xffd23f, 30, { velocidad: 5, arriba: 7, tamano: 0.18, brillo: true });
    } else {
        premio = Math.round(estado.nivel * 3 * multiplicador());
        $("titulo-centro").innerHTML = `Perdiste<div class="chico">Elegí mejores puertas</div><div>+${MONEDA}${formatear(premio)}</div>`;
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
const camaraObjetivo = new THREE.Vector3();
alAnimar((dt) => {
    tiempo += dt;
    if (carrera.fase === "corriendo") {
        carrera.z -= VELOCIDAD * dt;
        for (const p of carrera.puertas) {
            if (!p.pasada && carrera.z <= p.z) {
                p.pasada = true;
                const izquierda = carrera.x < 0;
                const visual = izquierda ? p.visualIzq : p.visualDer;
                carrera.cantidad = aplicar(izquierda ? p.izq : p.der, carrera.cantidad);
                visual.panel.visible = false;
                particulas.emitir(visual.grupo.position.clone().setY(1.5), visual.buena ? 0x4fc3ff : 0xff5a4a, 18, {
                    velocidad: 4, arriba: 3, tamano: 0.16, brillo: true,
                });
                const caja = renderer.domElement.getBoundingClientRect();
                textoFlotante(caja.left + caja.width / 2, caja.top + caja.height * 0.45, visual.etiqueta, visual.buena ? "#7fe0ff" : "#ff8a80");
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
        carrera.choque -= dt;
        if (carrera.choque <= 0) {
            carrera.choque = 0.08;
            const punto = new THREE.Vector3((Math.random() - 0.5) * 3, 0.6, -carrera.largo + 1);
            particulas.emitir(punto, Math.random() < 0.5 ? AZUL : ROJO, 3, { velocidad: 3, arriba: 4, tamano: 0.12 });
        }
        if (carrera.rival < 1 || carrera.cantidad < 1) return terminar(carrera.rival < 1 && carrera.cantidad >= 1);
    }

    const corriendo = carrera.fase === "corriendo" || carrera.fase === "pelea";
    acomodar(mio, carrera.cantidad, carrera.x, carrera.z, tiempo, corriendo);
    acomodar(rival, carrera.rival, 0, -carrera.largo - 3, tiempo, carrera.fase === "pelea", Math.PI);

    camaraObjetivo.set(carrera.x * 0.35, 8, carrera.z + 10);
    camera.position.lerp(camaraObjetivo, Math.min(1, dt * 6));
    camera.lookAt(camera.position.x, 0, carrera.z - 8);
    sol.position.set(8, 16, carrera.z + 10);
    sol.target.position.set(0, 0, carrera.z);
    sol.target.updateMatrixWorld();

    mostrarCartel("cartel", formatear(Math.ceil(carrera.cantidad)), carrera.x, 2.4, carrera.z);
    if (carrera.rival >= 1 && carrera.z < -carrera.largo + 40) {
        mostrarCartel("cartel-rival", formatear(Math.ceil(carrera.rival)), 0, 2.4, -carrera.largo - 3);
    } else {
        $("cartel-rival").hidden = true;
    }
});

// ---------- Mejoras ----------
function crearBoton(titulo, alComprar) {
    const boton = document.createElement("button");
    boton.className = "mejora";
    boton.innerHTML = `<span class="titulo">${titulo}</span><span class="nivel"></span><span class="detalle"></span><span class="precio"></span>`;
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

const botonInicial = crearBoton("👥 Grupo inicial", () => comprar(costoInicial(), () => estado.inicial++));
const botonGanancia = crearBoton("💰 Más monedas", () => comprar(costoGanancia(), () => estado.ganancia++));

function pintarBoton(boton, nivel, detalle, costo) {
    boton.querySelector(".nivel").textContent = `Nv ${nivel}`;
    boton.querySelector(".detalle").textContent = detalle;
    boton.querySelector(".precio").innerHTML = `${MONEDA}${formatear(costo)}`;
    boton.disabled = estado.monedas < costo;
    boton.classList.toggle("se-puede", !boton.disabled);
}

function actualizar() {
    $("monedas").innerHTML = `${MONEDA}${formatear(estado.monedas)}`;
    $("nivel").textContent = `Nivel ${estado.nivel}`;
    pintarBoton(botonInicial, estado.inicial, `Empezás con ${grupoInicial()}`, costoInicial());
    pintarBoton(botonGanancia, estado.ganancia, `×${multiplicador().toFixed(2)} monedas`, costoGanancia());
}

$("jugar").addEventListener("click", () => {
    $("cartel-rival").hidden = true;
    nuevaCarrera();
    carrera.fase = "corriendo";
    $("centro").hidden = true;
    $("mejoras").hidden = true;
});

nuevaCarrera();
camera.position.set(0, 8, 10);
actualizar();
