// Tiro con arco por turnos: contra la computadora o contra un amigo (online).
import { THREE, crearEscena, material, cargar, guardar, textoFlotante, vibrar, fondoDegradado, crearParticulas } from "../../js/comun3d.js";
import { exigirSesion } from "../../js/sesion.js";
import {
    RONDAS, DISTANCIA, RADIO_DIANA, ALTURA_DIANA, ALTURA_TIRADOR, generarVientos, simular, puntos, turnoDe, rondaActual,
    terminada, totales,
} from "./reglas.js";
import { ejeX, ejeY, alAccion, alSoltarAccion, tocarSiVisible } from "../../js/teclado.js";

const $ = (id) => document.getElementById(id);
const CLAVE = "arco";
const ERROR_BOT = [0.0065, 0.0038, 0.002];
const SENSIBILIDAD = 0.0011;
const NOMBRES_DIFICULTAD = ["Fácil", "Normal", "Difícil"];
const AZUL = 0x3a86ff;
const ROJO = 0xe63946;

const estado = cargar(CLAVE, { dificultad: 1, victorias: 0, derrotas: 0 });
const usuario = await exigirSesion();
const idPartida = new URLSearchParams(location.search).get("partida");

// ---------- Escena ----------
const lienzo = $("lienzo");
const { scene, camera, renderer, sol, alAnimar } = crearEscena(lienzo, { fondo: 0x9fd3ff, fov: 20 });
scene.background = fondoDegradado("#3d8bd9", "#cfeaff");
scene.fog = new THREE.Fog(0xcfeaff, 40, 120);
camera.far = 300;
sol.position.set(10, 20, 5);
sol.shadow.camera.left = -6;
sol.shadow.camera.right = 6;
sol.shadow.camera.top = 6;
sol.shadow.camera.bottom = -6;
sol.target.position.set(0, 0, -DISTANCIA);
scene.add(sol.target);
const particulas = crearParticulas(scene);
alAnimar(particulas.actualizar);

const pasto = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), material(0x6cc24a, { roughness: 1 }));
pasto.rotation.x = -Math.PI / 2;
pasto.position.z = -40;
pasto.receiveShadow = true;
scene.add(pasto);

// Calle de tiro más clara
const calle = new THREE.Mesh(new THREE.PlaneGeometry(4, DISTANCIA + 4), material(0x8fd16a, { roughness: 1 }));
calle.rotation.x = -Math.PI / 2;
calle.position.set(0, 0.01, -DISTANCIA / 2);
calle.receiveShadow = true;
scene.add(calle);

// Árboles al fondo
const geoCopa = new THREE.ConeGeometry(1.6, 4.5, 7);
geoCopa.translate(0, 3.6, 0);
const geoTronco = new THREE.CylinderGeometry(0.25, 0.3, 1.5, 6);
geoTronco.translate(0, 0.75, 0);
const matCopa = material(0x2f8f46, { flatShading: true });
const matTronco = material(0x7a4b26);
for (let i = 0; i < 40; i++) {
    const lado = i % 2 ? 1 : -1;
    const x = lado * (6 + Math.random() * 25);
    const z = -10 - Math.random() * 60;
    const escala = 0.8 + Math.random() * 0.9;
    for (const [geo, mat] of [[geoTronco, matTronco], [geoCopa, matCopa]]) {
        const m = new THREE.Mesh(geo, mat);
        m.position.set(x, 0, z);
        m.scale.setScalar(escala);
        m.castShadow = true;
        scene.add(m);
    }
}

// Diana con anillos de colores
function texturaDiana() {
    const c = document.createElement("canvas");
    c.width = c.height = 512;
    const ctx = c.getContext("2d");
    const colores = ["#f4f4f4", "#f4f4f4", "#222", "#222", "#2b7bd8", "#2b7bd8", "#e63946", "#e63946", "#ffd23f", "#ffd23f"];
    for (let i = 0; i < 10; i++) {
        const r = 256 * (1 - i / 10);
        ctx.beginPath();
        ctx.arc(256, 256, r, 0, Math.PI * 2);
        ctx.fillStyle = colores[i];
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = i === 2 || i === 3 ? "#666" : "#0006";
        ctx.stroke();
    }
    ctx.fillStyle = "#0008";
    ctx.fillRect(254, 250, 4, 12);
    ctx.fillRect(250, 254, 12, 4);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
}
const diana = new THREE.Group();
diana.position.set(0, ALTURA_DIANA, -DISTANCIA);
scene.add(diana);
const paja = new THREE.Mesh(new THREE.CylinderGeometry(RADIO_DIANA * 1.15, RADIO_DIANA * 1.15, 0.35, 40), material(0xd9b46a, { roughness: 1 }));
paja.rotation.x = Math.PI / 2;
paja.position.z = -0.18;
paja.castShadow = true;
diana.add(paja);
const cara = new THREE.Mesh(new THREE.CircleGeometry(RADIO_DIANA, 64), new THREE.MeshStandardMaterial({ map: texturaDiana(), roughness: 0.8 }));
cara.position.z = 0.001;
diana.add(cara);
const matPata = material(0x7a4b26);
for (const lado of [-1, 1]) {
    const pata = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.6, 0.12), matPata);
    pata.position.set(lado * 0.7, ALTURA_DIANA - 1.2, -DISTANCIA - 0.4);
    pata.rotation.z = lado * 0.12;
    pata.castShadow = true;
    scene.add(pata);
}

// Banderas que muestran el viento
function crearBandera(z) {
    const g = new THREE.Group();
    g.position.set(-2.6, 0, z);
    const palo = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 3.2, 8), material(0xeeeeee));
    palo.position.y = 1.6;
    g.add(palo);
    const tela = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.5, 8, 1), material(0xff6b35, { side: THREE.DoubleSide }));
    tela.geometry.translate(0.45, 0, 0);
    tela.position.y = 2.9;
    g.add(tela);
    scene.add(g);
    return tela;
}
const banderas = [crearBandera(-7), crearBandera(-16)];

// Arco en primera persona (va pegado a la cámara)
scene.add(camera);
const arcoVisible = new THREE.Group();
arcoVisible.position.set(0.12, -0.12, -0.75);
camera.add(arcoVisible);
// El palo es un arco de circunferencia vertical que se curva hacia la diana
const RADIO_ARCO = 0.33;
const APERTURA = Math.PI * 0.4;
const giroArco = new THREE.Group();
giroArco.rotation.y = Math.PI / 2;
arcoVisible.add(giroArco);
const palo = new THREE.Mesh(new THREE.TorusGeometry(RADIO_ARCO, 0.012, 8, 32, APERTURA * 2), material(0x5a3418, { roughness: 0.5 }));
palo.rotation.z = -APERTURA;
giroArco.add(palo);
const ALTO_PUNTA = RADIO_ARCO * Math.sin(APERTURA);
const Z_PUNTA = -RADIO_ARCO * Math.cos(APERTURA);
const cuerda = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0xffffff }));
arcoVisible.add(cuerda);
const flechaMano = crearFlecha(AZUL);
arcoVisible.add(flechaMano);

function pintarArco(tension) {
    const culata = Z_PUNTA + 0.02 + tension * 0.25;
    cuerda.geometry.setFromPoints([
        new THREE.Vector3(0, ALTO_PUNTA, Z_PUNTA),
        new THREE.Vector3(0, 0, culata),
        new THREE.Vector3(0, -ALTO_PUNTA, Z_PUNTA),
    ]);
    flechaMano.position.set(0, 0, culata - 0.72);
}

// ---------- Flechas ----------
function crearFlecha(color) {
    const g = new THREE.Group();
    const astil = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.75, 6), material(0xd9b38c));
    astil.rotation.x = Math.PI / 2;
    astil.position.z = 0.375;
    g.add(astil);
    const punta = new THREE.Mesh(new THREE.ConeGeometry(0.016, 0.06, 6), material(0x888888, { metalness: 0.8 }));
    punta.rotation.x = -Math.PI / 2;
    punta.position.z = -0.02;
    g.add(punta);
    const matPluma = material(color, { side: THREE.DoubleSide });
    for (let i = 0; i < 3; i++) {
        const pluma = new THREE.Mesh(new THREE.PlaneGeometry(0.035, 0.12), matPluma);
        pluma.position.z = 0.68;
        pluma.rotation.set(Math.PI / 2, 0, (i * Math.PI * 2) / 3);
        pluma.translateX(0.02);
        g.add(pluma);
    }
    return g;
}

const clavadas = [];
function clavar(tiro, color) {
    const f = crearFlecha(color);
    if (tiro.enDiana) {
        f.position.set(tiro.x, ALTURA_DIANA + tiro.y, -DISTANCIA - 0.05);
    } else {
        f.position.set(THREE.MathUtils.clamp(tiro.x, -20, 20), 0.15, tiro.suelo ?? -DISTANCIA + 2);
        f.rotation.x = 0.5;
    }
    f.scale.setScalar(1.3);
    scene.add(f);
    clavadas.push(f);
    return f;
}

// ---------- Partida ----------
let partida = null; // misma forma que en Firestore, también contra la compu
let online = null; // módulo multijugador cuando se juega con un amigo
const yo = usuario.uid ?? "yo";
const ganadorArco = (p) => {
    const t = totales(p);
    const [a, b] = p.jugadores;
    return (t[a] ?? 0) === (t[b] ?? 0) ? "empate" : (t[a] ?? 0) > (t[b] ?? 0) ? a : b;
};
let mostrados = 0; // tiros ya dibujados en la diana
let animando = false;

function partidaContraBot() {
    return {
        jugadores: [yo, "bot"],
        creador: yo,
        nombres: { [yo]: "Vos", bot: `Compu · ${NOMBRES_DIFICULTAD[estado.dificultad]}` },
        rondas: RONDAS,
        vientos: generarVientos(),
        tiros: [],
        estado: "jugando",
    };
}

const rival = () => partida.jugadores.find((j) => j !== yo);
const esMiTurno = () => partida && !terminada(partida) && turnoDe(partida) === yo && !animando;

function pintarMarcador() {
    if (!partida) return;
    const t = totales(partida);
    const lados = [yo, rival()];
    lados.forEach((uid, i) => {
        const el = $(`p${i}`);
        el.querySelector(".nombre").textContent = i === 0 ? (online ? "Vos" : partida.nombres[uid]) : partida.nombres[uid];
        el.querySelector(".total").textContent = t[uid];
        el.classList.toggle("turno", !terminada(partida) && turnoDe(partida) === uid);
        const suyos = partida.tiros.filter((x) => x.uid === uid);
        el.querySelector(".flechitas").innerHTML = Array.from({ length: partida.rondas }, (_, r) =>
            suyos[r] ? `<span class="hecho">${suyos[r].puntos}</span>` : "<span>·</span>"
        ).join("");
    });
    const ronda = Math.min(rondaActual(partida) + 1, partida.rondas);
    $("ronda").textContent = `Ronda ${ronda}/${partida.rondas}`;
    $("estado-turno").textContent = terminada(partida)
        ? "Terminada"
        : turnoDe(partida) === yo
          ? "Tu turno"
          : `Turno de ${partida.nombres[rival()]}`;
    const viento = partida.vientos[Math.min(rondaActual(partida), partida.rondas - 1)];
    $("valor-viento").textContent = `${Math.abs(viento.x).toFixed(1)}${viento.y ? ` ${viento.y > 0 ? "↑" : "↓"}${Math.abs(viento.y).toFixed(1)}` : ""}`;
    $("flecha-viento").style.transform = `scaleX(${viento.x < 0 ? -1 : 1})`;
    $("mira").hidden = !esMiTurno();
    $("ayuda").hidden = !esMiTurno() || partida.tiros.length > 1;
    arcoVisible.visible = esMiTurno() || apuntando;
}

// ---------- Apuntar ----------
let yaw = 0;
let pitch = 0;
let apuntando = false;
let tension = 0;
let ultimo = null;
let tiempo = 0;

const balanceo = () => ({ yaw: Math.sin(tiempo * 1.3) * 0.0012 + Math.sin(tiempo * 2.9) * 0.0006, pitch: Math.sin(tiempo * 1.7) * 0.0011 });

renderer.domElement.addEventListener("pointerdown", (e) => {
    if (!esMiTurno()) return;
    apuntando = true;
    ultimo = { x: e.clientX, y: e.clientY };
    try {
        renderer.domElement.setPointerCapture(e.pointerId);
    } catch {}
});
renderer.domElement.addEventListener("pointermove", (e) => {
    if (!apuntando) return;
    yaw += (e.clientX - ultimo.x) * SENSIBILIDAD * (camera.fov / 20);
    pitch -= (e.clientY - ultimo.y) * SENSIBILIDAD * (camera.fov / 20);
    yaw = THREE.MathUtils.clamp(yaw, -0.25, 0.25);
    pitch = THREE.MathUtils.clamp(pitch, -0.1, 0.25);
    ultimo = { x: e.clientX, y: e.clientY };
});
renderer.domElement.addEventListener("pointerup", () => {
    if (!apuntando) return;
    apuntando = false;
    if (tension < 0.5) return; // soltó antes de tensar: no tira
    const b = balanceo();
    disparar(yo, yaw + b.yaw, pitch + b.pitch);
});

// En la compu: flechas para apuntar, mantener espacio para tensar y soltarlo para tirar
alAccion(() => {
    if (tocarSiVisible($("jugar"))) return;
    if (esMiTurno()) apuntando = true;
});
alSoltarAccion(() => {
    if (!apuntando) return;
    apuntando = false;
    if (tension < 0.5) return;
    const b = balanceo();
    disparar(yo, yaw + b.yaw, pitch + b.pitch);
});
function apuntarConTeclado(dt) {
    if (!esMiTurno() || (!ejeX() && !ejeY())) return;
    const paso = 0.09 * dt * (camera.fov / 20);
    yaw = THREE.MathUtils.clamp(yaw + ejeX() * paso, -0.25, 0.25);
    pitch = THREE.MathUtils.clamp(pitch - ejeY() * paso, -0.1, 0.25);
}

// Ángulos que hacen pegar en el centro (los usa la compu)
function tiroIdeal(viento) {
    let y = 0;
    let p = 0.03;
    for (let i = 0; i < 6; i++) {
        const r = simular(y, p, viento);
        y -= r.x / DISTANCIA;
        p -= r.y / DISTANCIA;
    }
    return { yaw: y, pitch: p };
}

// ---------- Tirar ----------
async function disparar(uid, yawTiro, pitchTiro) {
    const viento = partida.vientos[rondaActual(partida)];
    const impacto = simular(yawTiro, pitchTiro, viento);
    const tiro = {
        uid,
        ronda: rondaActual(partida),
        yaw: yawTiro,
        pitch: pitchTiro,
        x: impacto.x,
        y: impacto.y,
        enDiana: impacto.enDiana,
        suelo: impacto.suelo ?? null,
        puntos: impacto.enDiana ? puntos(impacto) : 0,
    };
    const nuevos = [...partida.tiros, tiro];
    vibrar(25);

    if (online) {
        const fin = nuevos.length >= partida.rondas * 2;
        const proxima = { ...partida, tiros: nuevos };
        await online.actualizarPartida(idPartida, {
            tiros: nuevos,
            turno: fin ? null : turnoDe(proxima),
            estado: fin ? "terminada" : "jugando",
            ganador: fin ? ganadorArco(proxima) : null,
        });
        // La animación arranca cuando llega el cambio desde Firestore
    } else {
        partida.tiros = nuevos;
        await animarTiro(tiro);
        siguiente();
    }
}

function animarTiro(tiro) {
    animando = true;
    pintarMarcador();
    return new Promise((resolver) => {
        const recorrido = [];
        simular(tiro.yaw, tiro.pitch, partida.vientos[tiro.ronda], recorrido);
        const color = tiro.uid === yo ? AZUL : ROJO;
        const flecha = crearFlecha(color);
        flecha.scale.setScalar(1.3);
        scene.add(flecha);
        let i = 0;
        let pausa = 0;
        const objetivo = new THREE.Vector3();
        vuelo = (dt) => {
            if (i < recorrido.length - 1) {
                i = Math.min(recorrido.length - 1, i + dt * 60);
                const a = recorrido[Math.floor(i)];
                const b = recorrido[Math.min(Math.floor(i) + 1, recorrido.length - 1)];
                const f = i % 1;
                flecha.position.set(a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f);
                objetivo.set(b[0], b[1], b[2]);
                if (objetivo.distanceTo(flecha.position) > 0.001) {
                    flecha.lookAt(objetivo);
                    flecha.rotateY(Math.PI);
                }
                camaraObjetivo.set(flecha.position.x * 0.6, flecha.position.y + 0.25, flecha.position.z + 2.2);
                mirarA.copy(flecha.position);
                return;
            }
            if (pausa === 0) {
                scene.remove(flecha);
                clavar(tiro, color);
                mostrados++;
                const p = tiro.puntos;
                const caja = renderer.domElement.getBoundingClientRect();
                textoFlotante(caja.left + caja.width / 2, caja.top + caja.height * 0.3, p === 10 ? "¡10! 🎯" : p ? `+${p}` : "Afuera", p >= 9 ? "#ffd23f" : "#ffffff");
                particulas.emitir(new THREE.Vector3(tiro.x, ALTURA_DIANA + tiro.y, -DISTANCIA + 0.1), p >= 9 ? 0xffd23f : 0xd9b46a, p >= 9 ? 18 : 8, {
                    velocidad: 1.2, arriba: 1.5, tamano: 0.04, gravedad: 4, brillo: p >= 9,
                });
                vibrar(p >= 9 ? 60 : 20);
                camaraObjetivo.set(0, ALTURA_DIANA, -DISTANCIA + 3.4);
                mirarA.set(0, ALTURA_DIANA, -DISTANCIA);
            }
            pausa += dt;
            if (pausa > 1.6) {
                vuelo = null;
                animando = false;
                volverAlTirador();
                resolver();
            }
        };
    });
}

let vuelo = null;
const camaraObjetivo = new THREE.Vector3(0, ALTURA_TIRADOR, 0.4);
const mirarA = new THREE.Vector3(0, ALTURA_DIANA, -DISTANCIA);

function volverAlTirador() {
    yaw = 0;
    pitch = 0;
    camaraObjetivo.set(0, ALTURA_TIRADOR, 0.4);
    pintarMarcador();
}

function siguiente() {
    pintarMarcador();
    if (terminada(partida)) return finDePartida();
    if (!online && turnoDe(partida) === "bot") {
        setTimeout(() => {
            const ideal = tiroIdeal(partida.vientos[rondaActual(partida)]);
            const e = ERROR_BOT[estado.dificultad];
            const ruido = () => (Math.random() + Math.random() + Math.random() - 1.5) * e * 1.4;
            disparar("bot", ideal.yaw + ruido(), ideal.pitch + ruido());
        }, 900);
    }
}

function finDePartida() {
    const t = totales(partida);
    const mio = t[yo];
    const suyo = t[rival()];
    const texto = mio > suyo ? "¡Ganaste!" : mio < suyo ? "Perdiste" : "Empate";
    if (!online) {
        if (mio > suyo) estado.victorias++;
        else if (mio < suyo) estado.derrotas++;
        guardar(CLAVE, estado);
    }
    vibrar(mio > suyo ? 90 : 150);
    $("titulo-centro").innerHTML = `${texto}<div class="chico">${mio} a ${suyo}</div>`;
    $("opciones").hidden = Boolean(online);
    $("jugar").textContent = online ? online.textoRevancha(partida, yo) : "Otra vez";
    $("ir-amigos").textContent = online ? "👥 Volver a amigos" : "👥 Desafiar a un amigo";
    $("centro").hidden = false;
}

// ---------- Ciclo ----------
alAnimar((dt) => {
    tiempo += dt;
    apuntarConTeclado(dt);
    tension = apuntando ? Math.min(1, tension + dt * 2.5) : Math.max(0, tension - dt * 6);
    pintarArco(tension);
    // Al tensar se acerca un poco la vista
    camera.fov += ((apuntando ? 15 : 20) - camera.fov) * Math.min(1, dt * 5);
    camera.updateProjectionMatrix();

    if (vuelo) {
        vuelo(dt);
        camera.position.lerp(camaraObjetivo, Math.min(1, dt * 8));
        camera.lookAt(mirarA);
    } else {
        camera.position.lerp(camaraObjetivo, Math.min(1, dt * 4));
        const b = apuntando ? balanceo() : { yaw: 0, pitch: 0 };
        const y = yaw + b.yaw;
        const p = pitch + b.pitch;
        mirarA.set(camera.position.x + Math.sin(y) * 10, camera.position.y + Math.tan(p) * 10, camera.position.z - Math.cos(y) * 10);
        camera.lookAt(mirarA);
    }

    // Banderas flameando según el viento de la ronda
    if (partida) {
        const v = partida.vientos[Math.min(rondaActual(partida), partida.rondas - 1)];
        for (const tela of banderas) {
            tela.rotation.y = v.x >= 0 ? 0 : Math.PI;
            const pos = tela.geometry.attributes.position;
            for (let k = 0; k < pos.count; k++) {
                const x = pos.getX(k);
                pos.setZ(k, Math.sin(tiempo * (4 + Math.abs(v.x)) + x * 6) * 0.06 * (x / 0.9));
            }
            pos.needsUpdate = true;
            tela.scale.x = 0.4 + Math.min(Math.abs(v.x) / 4, 1) * 0.6;
        }
    }
});

// ---------- Inicio ----------
function empezarContraBot() {
    for (const f of clavadas) scene.remove(f);
    clavadas.length = 0;
    mostrados = 0;
    partida = partidaContraBot();
    $("centro").hidden = true;
    volverAlTirador();
}

function pintarDificultad() {
    for (const b of document.querySelectorAll(".dificultad button")) b.classList.toggle("activa", Number(b.dataset.nivel) === estado.dificultad);
}
for (const b of document.querySelectorAll(".dificultad button")) {
    b.addEventListener("click", () => {
        estado.dificultad = Number(b.dataset.nivel);
        guardar(CLAVE, estado);
        pintarDificultad();
    });
}

async function iniciarOnline() {
    online = await import("../../js/multijugador.js");
    online.iniciarPresencia("Tiro con arco");
    $("centro").hidden = true;
    online.escucharPartida(
        idPartida,
        async (p) => {
            if (!p) {
                $("titulo-centro").innerHTML = "La partida ya no existe";
                $("opciones").hidden = true;
                $("jugar").hidden = true;
                $("centro").hidden = false;
                return;
            }
            const primera = !partida;
            partida = p;
            if (primera) {
                // Al abrir: dibujar las flechas que ya se tiraron, sin animar
                for (const t of p.tiros) clavar(t, t.uid === yo ? AZUL : ROJO);
                mostrados = p.tiros.length;
                if (p.estado === "invitada" && p.creador !== yo) online.aceptarPartida(p);
            }
            // Animar los tiros nuevos (propios o del amigo) de a uno
            while (mostrados < partida.tiros.length && !animando) {
                await animarTiro(partida.tiros[mostrados]);
            }
            pintarMarcador();
            if (terminada(partida) && !animando) finDePartida();
        },
        () => {
            $("titulo-centro").innerHTML = "No tenés acceso a esta partida";
            $("jugar").hidden = true;
            $("centro").hidden = false;
        }
    );
}

$("jugar").addEventListener("click", async () => {
    if (!online) return empezarContraBot();
    // Revancha: si el amigo ya la pidió, se entra a esa misma partida
    const { datosIniciales } = await import("./reglas.js");
    await online.irARevancha(partida, datosIniciales);
});

pintarDificultad();
pintarArco(0);
if (idPartida) iniciarOnline();
