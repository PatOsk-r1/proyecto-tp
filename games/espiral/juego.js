// Espiral: girá la torre para que la pelota caiga por los huecos. Lo rojo te hace perder.
// Si caés 3 pisos seguidos sin rebotar, la pelota se prende fuego y rompe el siguiente piso.
import {
    THREE, crearEscena, material, formatear, cargar, guardar, textoFlotante, vibrar, MONEDA,
    fondoDegradado, crearParticulas,
} from "../../js/comun3d.js";

const $ = (id) => document.getElementById(id);
const CLAVE = "espiral";
const SEGMENTOS = 12;
const SEPARACION = 2.2;
const ALTO = 0.32;
const RADIO_INTERNO = 0.62;
const RADIO_EXTERNO = 2.35;
const RADIO_BOLA = 0.27;
const Z_BOLA = 1.55;
const GRAVEDAD = 22;
const SALTO = 7.2;
const PISOS_PARA_FUEGO = 3;

const estado = cargar(CLAVE, { monedas: 0, nivel: 1, escudo: 0, ganancia: 0 });
estado.bolas ??= ["clasica"];
estado.bola ??= "clasica";
estado.fuegoRapido ??= 0;
const pisosParaFuego = () => PISOS_PARA_FUEGO - estado.fuegoRapido;

// Estilos de pelota: color, brillo y color de la estela
const BOLAS = [
    { id: "clasica", nombre: "Clásica", costo: 0, color: 0xffffff, estela: null },
    { id: "chicle", nombre: "Chicle", costo: 100, color: 0xff70a6, estela: 0xff70a6 },
    { id: "hielo", nombre: "Hielo", costo: 200, color: 0xa0e7ff, estela: 0x7df9ff, brillo: 0.4 },
    { id: "neon", nombre: "Neón", costo: 350, color: 0x39ff14, estela: 0x39ff14, brillo: 0.9 },
    { id: "oro", nombre: "Oro", costo: 600, color: 0xffd166, estela: 0xffd166, metal: true },
    { id: "fantasma", nombre: "Fantasma", costo: 900, color: 0xe0e0ff, estela: 0xc8b6ff, opacidad: 0.55, brillo: 0.3 },
    { id: "arcoiris", nombre: "Arcoíris", costo: 1500, color: 0xffffff, estela: "arcoiris", brillo: 0.5 },
];
const bolaActual = () => BOLAS.find((b) => b.id === estado.bola) ?? BOLAS[0];

const multiplicador = () => 1 + estado.ganancia * 0.3;
const costoEscudo = () => 60 * 3 ** estado.escudo;
const costoGanancia = () => 40 * 2 ** estado.ganancia;
const MAX_ESCUDO = 3;

// ---------- Escena ----------
const lienzo = $("lienzo");
const { scene, camera, renderer, sol, alAnimar } = crearEscena(lienzo, { fondo: 0xffb36b, fov: 55 });
scene.fog = null;
const particulas = crearParticulas(scene);
alAnimar(particulas.actualizar);

// Geometría de cada porción del anillo (se comparte entre todos los pisos)
const geoPorciones = Array.from({ length: SEGMENTOS }, (_, k) => {
    const a0 = (k / SEGMENTOS) * Math.PI * 2;
    const a1 = ((k + 1) / SEGMENTOS) * Math.PI * 2;
    const forma = new THREE.Shape();
    forma.absarc(0, 0, RADIO_EXTERNO, a0, a1, false);
    forma.absarc(0, 0, RADIO_INTERNO, a1, a0, true);
    forma.closePath();
    const g = new THREE.ExtrudeGeometry(forma, {
        depth: ALTO, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.03, bevelSegments: 2, curveSegments: 6,
    });
    g.rotateX(-Math.PI / 2);
    g.translate(0, -ALTO / 2, 0);
    return g;
});

const matPeligro = material(0xff1f4b, { emissive: 0x8a0018, emissiveIntensity: 0.5, roughness: 0.3 });
const matMeta = material(0xffd23f, { metalness: 0.5, roughness: 0.25, emissive: 0x7a5200, emissiveIntensity: 0.4 });
let matPiso = material(0xffffff);

const torre = new THREE.Group();
scene.add(torre);

const bola = new THREE.Mesh(
    new THREE.SphereGeometry(RADIO_BOLA, 24, 16),
    material(0xffffff, { roughness: 0.2, emissive: 0xff5f00, emissiveIntensity: 0 })
);
bola.castShadow = true;
scene.add(bola);
function vestirBola() {
    const b = bolaActual();
    Object.assign(bola.material, { metalness: b.metal ? 0.85 : 0, roughness: b.metal ? 0.15 : 0.2, transparent: Boolean(b.opacidad), opacity: b.opacidad ?? 1 });
    bola.material.needsUpdate = true;
}
vestirBola();

// Gemas: flotan en algunos huecos y se juntan al caer por ese hueco
const geoGema = new THREE.OctahedronGeometry(0.22);
const matGema = material(0x7df9ff, { emissive: 0x00b4d8, emissiveIntensity: 0.8, metalness: 0.3, roughness: 0.1 });

let anillos = [];
let poste = null;
let partida = null;
let camaraY = 0;
const voladores = [];
const raycaster = new THREE.Raycaster();
const abajo = new THREE.Vector3(0, -1, 0);
const origenRayo = new THREE.Vector3();

function construirNivel() {
    torre.clear();
    torre.rotation.y = 0;
    anillos = [];
    const nivel = estado.nivel;
    const total = Math.min(10 + nivel * 2, 40);
    const tono = (nivel * 0.13) % 1;

    scene.background = fondoDegradado(
        `#${new THREE.Color().setHSL(tono, 0.75, 0.68).getHexString()}`,
        `#${new THREE.Color().setHSL((tono + 0.08) % 1, 0.85, 0.78).getHexString()}`
    );
    matPiso = material(new THREE.Color().setHSL((tono + 0.5) % 1, 0.55, 0.62), { roughness: 0.45 });

    poste = new THREE.Mesh(
        new THREE.CylinderGeometry(RADIO_INTERNO, RADIO_INTERNO, total * SEPARACION + 8, 24),
        material(0xfff6f0, { roughness: 0.4 })
    );
    poste.position.y = (-total * SEPARACION) / 2 + 2;
    poste.receiveShadow = true;
    torre.add(poste);

    // La pelota cae sobre la porción que mira a la cámara (índice 9 con la torre sin girar)
    const debajoBola = 9;
    for (let i = 0; i <= total; i++) {
        const piso = new THREE.Group();
        piso.position.y = -i * SEPARACION;
        torre.add(piso);
        const tipos = Array(SEGMENTOS).fill("piso");
        if (i === total) {
            tipos.fill("meta");
        } else {
            const largoHueco = nivel < 4 ? 3 : 2;
            let inicio = Math.floor(Math.random() * SEGMENTOS);
            if (i === 0) inicio = (debajoBola + 4) % SEGMENTOS;
            for (let k = 0; k < largoHueco; k++) tipos[(inicio + k) % SEGMENTOS] = "hueco";
            if (i > 0 && Math.random() < 0.35) {
                const a = ((inicio + largoHueco / 2) / SEGMENTOS) * Math.PI * 2;
                const gema = new THREE.Mesh(geoGema, matGema);
                const r = (RADIO_INTERNO + RADIO_EXTERNO) / 2;
                // Las porciones se rotan con rotateX(-90°): el ángulo a en el plano XY queda en XZ con z = -sin(a)
                gema.position.set(Math.cos(a) * r, 0.55, -Math.sin(a) * r);
                gema.userData.gema = true;
                piso.add(gema);
            }
            const peligros = i === 0 ? 0 : Math.min(5, Math.floor(nivel / 2) + Math.floor(Math.random() * 3));
            for (let p = 0; p < peligros; p++) {
                const k = Math.floor(Math.random() * SEGMENTOS);
                if (tipos[k] === "piso") tipos[k] = "peligro";
            }
        }
        tipos.forEach((tipo, k) => {
            if (tipo === "hueco") return;
            const porcion = new THREE.Mesh(geoPorciones[k], tipo === "peligro" ? matPeligro : tipo === "meta" ? matMeta : matPiso);
            porcion.userData.tipo = tipo;
            porcion.castShadow = true;
            porcion.receiveShadow = true;
            piso.add(porcion);
        });
        anillos.push(piso);
    }
}

function empezar() {
    construirNivel();
    partida = { jugando: true, siguiente: 0, vy: 0, seguidos: 0, escudos: estado.escudo, pasados: 0, ganado: 0, aplastar: 0 };
    bola.position.set(0, 2.5, Z_BOLA);
    camaraY = bola.position.y;
    $("centro").hidden = true;
    $("mejoras").hidden = true;
    actualizar();
}

// ---------- Controles ----------
let arrastrando = false;
let ultimoX = 0;
renderer.domElement.addEventListener("pointerdown", (e) => {
    arrastrando = true;
    ultimoX = e.clientX;
});
addEventListener("pointermove", (e) => {
    if (!arrastrando || !partida?.jugando) return;
    torre.rotation.y += (e.clientX - ultimoX) * 0.012;
    ultimoX = e.clientX;
});
addEventListener("pointerup", () => (arrastrando = false));

// ---------- Juego ----------
function romperPiso(piso, conFuego) {
    const gema = piso.children.find((c) => c.userData.gema);
    if (gema) {
        piso.remove(gema);
        if (!conFuego) {
            const extra = 5 * multiplicador();
            partida.ganado += extra;
            particulas.emitir(bola.position, 0x7df9ff, 18, { velocidad: 3, arriba: 3, tamano: 0.12, brillo: true });
            const caja = renderer.domElement.getBoundingClientRect();
            textoFlotante(caja.left + caja.width / 2, caja.top + caja.height * 0.3, `💎 +${formatear(extra)}`, "#7df9ff");
        }
    }
    for (const porcion of [...piso.children]) {
        scene.attach(porcion);
        const centro = new THREE.Box3().setFromObject(porcion).getCenter(new THREE.Vector3());
        const salida = centro.clone().setY(0).normalize();
        porcion.userData.vel = salida.multiplyScalar(5 + Math.random() * 3).setY(2 + Math.random() * 2);
        porcion.userData.giro = (Math.random() - 0.5) * 8;
        porcion.userData.vida = 0.8;
        voladores.push(porcion);
    }
    torre.remove(piso);
    partida.pasados++;
    partida.siguiente++;
    const premio = (conFuego ? 3 : 1) * multiplicador();
    partida.ganado += premio;
    const caja = renderer.domElement.getBoundingClientRect();
    textoFlotante(caja.left + caja.width / 2, caja.top + caja.height * 0.4, conFuego ? `¡Fuego! +${formatear(premio)}` : `+${formatear(premio)}`, "#ffffff");
    vibrar(conFuego ? 40 : 15);
    actualizar();
}

function mancha(toque) {
    const m = new THREE.Mesh(
        new THREE.CircleGeometry(0.22 + Math.random() * 0.1, 16),
        new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.75, polygonOffset: true, polygonOffsetFactor: -2 })
    );
    m.rotation.x = -Math.PI / 2;
    m.position.copy(toque.object.worldToLocal(toque.point.clone())).setY(ALTO / 2 + 0.045);
    toque.object.add(m);
}

function rebotar(alto) {
    bola.position.y = alto + RADIO_BOLA;
    partida.vy = SALTO;
    partida.seguidos = 0;
    partida.aplastar = 1;
}

function terminar(gano) {
    partida.jugando = false;
    let total = Math.round(partida.ganado);
    if (gano) {
        total += estado.nivel * 5;
        estado.nivel++;
        particulas.emitir(bola.position, 0xffd23f, 30, { velocidad: 5, arriba: 6, tamano: 0.15, brillo: true });
        $("titulo-centro").innerHTML = `¡Nivel superado!<div>+${MONEDA}${formatear(total)}</div>`;
        $("jugar").textContent = "Siguiente nivel";
    } else {
        const porcentaje = Math.round((partida.pasados / (anillos.length - 1)) * 100);
        particulas.emitir(bola.position, 0xffffff, 20, { velocidad: 4, arriba: 4, tamano: 0.12 });
        bola.visible = false;
        $("titulo-centro").innerHTML = `¡Chocaste!<div class="chico">Llegaste al ${porcentaje}%</div><div>+${MONEDA}${formatear(total)}</div>`;
        $("jugar").textContent = "Reintentar";
    }
    estado.monedas += total;
    guardar(CLAVE, estado);
    vibrar(gano ? 60 : 150);
    $("centro").hidden = false;
    $("mejoras").hidden = false;
    actualizar();
}

let tiempo = 0;
alAnimar((dt) => {
    tiempo += dt;
    if (partida?.jugando) {
        bola.visible = true;
        const antes = bola.position.y;
        partida.vy -= GRAVEDAD * dt;
        bola.position.y += partida.vy * dt;

        const piso = anillos[partida.siguiente];
        if (piso) {
            const tope = piso.position.y + ALTO / 2;
            if (antes - RADIO_BOLA > tope && bola.position.y - RADIO_BOLA <= tope) {
                origenRayo.set(0, tope + 0.5, Z_BOLA);
                raycaster.set(origenRayo, abajo);
                const toque = raycaster.intersectObjects(piso.children, false)[0];
                const enFuego = partida.seguidos >= pisosParaFuego();
                if (!toque) {
                    romperPiso(piso, false);
                    partida.seguidos++;
                    if (partida.seguidos === pisosParaFuego()) {
                        const caja = renderer.domElement.getBoundingClientRect();
                        textoFlotante(caja.left + caja.width / 2, caja.top + caja.height * 0.5, "🔥 ¡EN LLAMAS!", "#ff9f1c");
                    }
                } else if (toque.object.userData.tipo === "meta") {
                    rebotar(tope);
                    terminar(true);
                } else if (enFuego) {
                    romperPiso(piso, true);
                    rebotar(tope);
                } else if (toque.object.userData.tipo === "peligro") {
                    if (partida.escudos > 0) {
                        partida.escudos--;
                        rebotar(tope);
                        particulas.emitir(bola.position, 0x7df9ff, 16, { velocidad: 3, arriba: 3, tamano: 0.1, brillo: true });
                        actualizar();
                    } else {
                        terminar(false);
                    }
                } else {
                    rebotar(tope);
                    mancha(toque);
                    particulas.emitir(bola.position.clone().setY(tope), 0xffffff, 5, { velocidad: 1.5, arriba: 2, tamano: 0.07 });
                    vibrar(8);
                }
            }
        }

        // Fuego: brilla y deja estela
        const fuego = partida.seguidos >= pisosParaFuego();
        const estilo = bolaActual();
        bola.material.emissiveIntensity += ((fuego ? 1.5 : estilo.brillo ?? 0) - bola.material.emissiveIntensity) * Math.min(1, dt * 8);
        const colorBola = estilo.estela === "arcoiris" ? new THREE.Color().setHSL((tiempo * 0.5) % 1, 0.9, 0.6).getHex() : estilo.color;
        bola.material.color.setHex(fuego ? 0xffa040 : colorBola);
        bola.material.emissive.setHex(fuego ? 0xff5f00 : colorBola);
        // Estela del estilo de pelota
        if (!fuego && estilo.estela && Math.random() < 0.5) {
            particulas.emitir(bola.position, estilo.estela === "arcoiris" ? colorBola : estilo.estela, 1, { velocidad: 0.2, arriba: 0.3, tamano: 0.12, gravedad: 0, vida: 0.35, brillo: true });
        }
        if (fuego && Math.random() < 0.6) {
            particulas.emitir(bola.position, 0xff6a00, 1, { velocidad: 0.4, arriba: 1, tamano: 0.16, gravedad: -2, vida: 0.4, brillo: true });
        }
    }

    // Pelota se aplasta al rebotar
    if (partida) {
        partida.aplastar = Math.max(0, partida.aplastar - dt * 6);
        const a = partida.aplastar;
        bola.scale.set(1 + a * 0.25, 1 - a * 0.3, 1 + a * 0.25);
    }

    for (let i = voladores.length - 1; i >= 0; i--) {
        const v = voladores[i];
        const d = v.userData;
        d.vida -= dt;
        d.vel.y -= 15 * dt;
        v.position.addScaledVector(d.vel, dt);
        v.rotation.x += d.giro * dt;
        v.scale.setScalar(Math.max(0.01, d.vida / 0.8));
        if (d.vida <= 0) {
            scene.remove(v);
            voladores.splice(i, 1);
        }
    }

    // La cámara solo baja, siguiendo a la pelota
    camaraY = Math.min(camaraY, bola.position.y);
    const lejos = Math.max(1, 0.62 / camera.aspect);
    camera.position.set(0, camaraY + 3.2 * lejos, 8.5 * lejos);
    camera.lookAt(0, camaraY - 1.2, 0);
    sol.position.set(4, camaraY + 10, 8);
    sol.target.position.set(0, camaraY - 2, 0);
    sol.target.updateMatrixWorld();

    if (!partida) torre.rotation.y += dt * 0.3;
    for (const piso of anillos) for (const c of piso.children) if (c.userData.gema) {
        c.rotation.y += dt * 2;
        c.position.y = 0.55 + Math.sin(tiempo * 3 + piso.position.y) * 0.08;
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

const botonEscudo = crearBoton("🛡️ Escudo", () => comprar(costoEscudo(), () => estado.escudo++));
const botonGanancia = crearBoton("💰 Más monedas", () => comprar(costoGanancia(), () => estado.ganancia++));
const botonFuego = crearBoton("🔥 Fuego rápido", () => comprar(500, () => (estado.fuegoRapido = 1)));
const tituloBolas = document.createElement("div");
tituloBolas.className = "titulo-estilos";
tituloBolas.textContent = "Pelotas";
$("mejoras").appendChild(tituloBolas);
const botonesBola = BOLAS.map((b) => {
    const hex = `#${b.color.toString(16).padStart(6, "0")}`;
    const fondo = b.estela === "arcoiris" ? "conic-gradient(#ff006e,#ffbe0b,#8ac926,#3a86ff,#ff006e)" : `radial-gradient(circle at 35% 30%, #fff, ${hex} 60%, #0006)`;
    const boton = crearBoton(`<span class="muestra" style="background:${fondo}"></span>${b.nombre}`, () => {
        if (!estado.bolas.includes(b.id)) {
            if (estado.monedas < b.costo) return;
            estado.monedas -= b.costo;
            estado.bolas.push(b.id);
        }
        estado.bola = b.id;
        vestirBola();
        guardar(CLAVE, estado);
        vibrar(25);
        actualizar();
    });
    return { boton, b };
});

function pintarBoton(boton, nivel, detalle, costo, alMaximo = false) {
    boton.querySelector(".nivel").textContent = nivel;
    boton.querySelector(".detalle").textContent = detalle;
    boton.querySelector(".precio").innerHTML = alMaximo ? "Máximo" : `${MONEDA}${formatear(costo)}`;
    boton.disabled = alMaximo || estado.monedas < costo;
    boton.classList.toggle("se-puede", !boton.disabled);
}

function actualizar() {
    $("nivel").textContent = `Nivel ${estado.nivel}`;
    const total = Math.max(1, anillos.length - 1);
    $("progreso").style.width = `${partida ? (partida.pasados / total) * 100 : 0}%`;
    const escudos = partida?.jugando && partida.escudos ? ` · 🛡️${partida.escudos}` : "";
    $("monedas").innerHTML = `${MONEDA}${formatear(estado.monedas)}${escudos}`;
    pintarBoton(botonEscudo, `${estado.escudo}/${MAX_ESCUDO}`, "Te salva de un golpe rojo por partida", costoEscudo(), estado.escudo >= MAX_ESCUDO);
    pintarBoton(botonGanancia, `Nv ${estado.ganancia}`, `×${multiplicador().toFixed(1)} monedas`, costoGanancia());
    pintarBoton(botonFuego, `${estado.fuegoRapido}/1`, "La pelota se prende con 2 pisos en vez de 3", 500, estado.fuegoRapido >= 1);
    for (const { boton, b } of botonesBola) {
        const tiene = estado.bolas.includes(b.id);
        const puesta = estado.bola === b.id;
        boton.querySelector(".nivel").textContent = puesta ? "En uso" : "";
        boton.querySelector(".detalle").textContent = "";
        boton.querySelector(".precio").innerHTML = puesta ? "✓" : tiene ? "Usar" : `${MONEDA}${formatear(b.costo)}`;
        boton.disabled = !tiene && estado.monedas < b.costo;
        boton.classList.toggle("se-puede", puesta);
    }
}

$("jugar").addEventListener("click", empezar);

construirNivel();
bola.position.set(0, 2.5, Z_BOLA);
camaraY = 2.5;
actualizar();
