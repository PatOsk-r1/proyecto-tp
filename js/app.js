// Página principal: pestañas Solo / Multijugador / Casino. Cada pestaña tiene un juego destacado
// que rota, la fila "Seguir jugando" y los juegos en filas deslizables por grupo.
const lista = document.getElementById("lista-juegos");
const pestanas = document.querySelectorAll(".pestana");
const NUEVOS = ["games/dado/", "games/limbo/", "games/torre/", "games/calle/"];

function leer(clave, porDefecto) {
    try {
        return localStorage.getItem(clave) || porDefecto;
    } catch {
        return porDefecto;
    }
}
function escribir(clave, valor) {
    try {
        localStorage.setItem(clave, valor);
    } catch {}
}
const claveDe = (juego) => juego.carpeta.split("/")[1];

// Nivel de cada juego (lo guarda js/experiencia.js con lo que viene de la nube)
function nivelJuego(clave) {
    let xp = 0;
    try {
        const guardada = JSON.parse(leer("xp-juegos", "{}"));
        const pendiente = JSON.parse(leer("xp-pendiente", "{}"));
        xp = (guardada[clave] ?? 0) + (pendiente[clave] ?? 0);
    } catch {}
    return xp > 0 ? Math.floor(Math.sqrt(xp / 40)) + 1 : 0;
}

// Etiquetas que cuentan de un vistazo qué tipo de juego es
function etiquetas(juego) {
    if (juego.categoria === "multi") return ["🌐 Online", "🤖 vs compu"];
    if (juego.categoria === "casino") return ["🪙 Fichas"];
    return { Defensa: ["🛡️ Estrategia"], Incrementales: ["♾️ Avanza sin vos"], Arcade: ["⚡ Rápido"] }[juego.grupo] ?? [];
}

// Últimos juegos abiertos (el primero es el más reciente)
function recientes() {
    try {
        const viejo = leer("ultimo-juego", ""); // antes se guardaba solo el último
        return JSON.parse(leer("ultimos-juegos", JSON.stringify(viejo ? [viejo] : []))).filter((c) => JUEGOS.some((j) => j.carpeta === c));
    } catch {
        return [];
    }
}
function anotarAbierto(carpeta) {
    escribir("ultimo-juego", carpeta);
    escribir("ultimos-juegos", JSON.stringify([carpeta, ...recientes().filter((c) => c !== carpeta)].slice(0, 8)));
}
// Al abrir cualquier juego desde esta página se anota como reciente
document.addEventListener("click", (e) => {
    const enlace = e.target.closest("a[data-juego]");
    if (enlace) anotarAbierto(enlace.dataset.juego);
});

// Las portadas "respiran" (zoom lento) solo mientras se ven en pantalla
const vigia = "IntersectionObserver" in window
    ? new IntersectionObserver((entradas) => {
        for (const e of entradas) e.target.classList.toggle("en-vista", e.isIntersecting);
    }, { rootMargin: "40px" })
    : null;

function tarjeta(juego, indice) {
    const item = document.createElement("li");
    item.style.setProperty("--retraso", `${Math.min(indice, 8) * 40}ms`);
    const clave = claveDe(juego);
    const nivel = nivelJuego(clave);
    item.innerHTML = `
        <a class="tarjeta-juego" href="${juego.carpeta}" data-juego="${juego.carpeta}">
            <span class="marco-portada"><canvas class="portada"></canvas></span>
            ${NUEVOS.includes(juego.carpeta) ? '<span class="nuevo">Nuevo</span>' : ""}
            ${nivel ? `<span class="nivel-juego">Nv ${nivel}</span>` : ""}
            <span class="textos">
                <span class="emoji-juego">${juego.emoji}</span>
                <span class="nombre">${juego.nombre}</span>
                <span class="descripcion">${juego.descripcion}</span>
                <span class="etiquetas">${etiquetas(juego).map((t) => `<i>${t}</i>`).join("")}</span>
            </span>
        </a>`;
    requestAnimationFrame(() => window.dibujarPortada?.(item.querySelector("canvas"), clave));
    vigia?.observe(item.querySelector(".tarjeta-juego"));
    return item;
}

function tarjetaChica(juego) {
    const item = document.createElement("li");
    const nivel = nivelJuego(claveDe(juego));
    item.innerHTML = `<a class="tarjeta-chica" href="${juego.carpeta}" data-juego="${juego.carpeta}">
        <canvas class="portada"></canvas>
        <span class="nombre">${juego.nombre}</span>
        ${nivel ? `<span class="nivel-juego">Nv ${nivel}</span>` : ""}
        <span class="jugar-ya">▶</span></a>`;
    requestAnimationFrame(() => window.dibujarPortada?.(item.querySelector("canvas"), claveDe(juego)));
    return item;
}

// ---------- Destacado ----------
const destacado = {
    seccion: document.getElementById("destacado"),
    juegos: [],
    indice: 0,
    lienzo: 0,
    reloj: null,
};
function elegirDestacados(seccion) {
    const juegos = JUEGOS.filter((j) => j.categoria === seccion);
    // Primero los nuevos, después los que nunca jugaste, después el resto
    const puntaje = (j) => (NUEVOS.includes(j.carpeta) ? 0 : nivelJuego(claveDe(j)) ? 2 : 1);
    return [...juegos].sort((a, b) => puntaje(a) - puntaje(b) || Math.random() - 0.5).slice(0, 6);
}
function mostrarDestacado(i) {
    const d = destacado;
    if (!d.juegos.length) return;
    d.indice = (i + d.juegos.length) % d.juegos.length;
    const juego = d.juegos[d.indice];
    const enlace = d.seccion.querySelector(".destacado-tarjeta");
    enlace.href = juego.carpeta;
    enlace.dataset.juego = juego.carpeta;
    enlace.querySelector(".destacado-nombre").textContent = `${juego.emoji} ${juego.nombre}`;
    enlace.querySelector(".destacado-descripcion").textContent = juego.descripcion;
    enlace.querySelector(".destacado-etiqueta").textContent = NUEVOS.includes(juego.carpeta) ? "✨ Nuevo" : nivelJuego(claveDe(juego)) ? "⭐ Destacado" : "🎁 Probalo";
    // Dos lienzos que se cruzan: el nuevo aparece encima del anterior
    const lienzos = d.seccion.querySelectorAll(".destacado-lienzo");
    d.lienzo = 1 - d.lienzo;
    const nuevo = lienzos[d.lienzo];
    window.dibujarPortada?.(nuevo, claveDe(juego));
    nuevo.classList.add("visible");
    lienzos[1 - d.lienzo].classList.remove("visible");
    d.seccion.querySelectorAll(".destacado-puntos button").forEach((b, k) => b.classList.toggle("activo", k === d.indice));
}
function iniciarDestacado(seccion) {
    const d = destacado;
    clearInterval(d.reloj);
    d.juegos = elegirDestacados(seccion);
    d.seccion.hidden = !d.juegos.length;
    d.seccion.querySelector(".destacado-puntos").innerHTML = d.juegos.map((j, k) => `<button type="button" aria-label="${j.nombre}" data-punto="${k}"></button>`).join("");
    mostrarDestacado(0);
    d.reloj = setInterval(() => !document.hidden && mostrarDestacado(d.indice + 1), 6000);
}
destacado.seccion.querySelector(".destacado-puntos").addEventListener("click", (e) => {
    const b = e.target.closest("[data-punto]");
    if (!b) return;
    mostrarDestacado(+b.dataset.punto);
    clearInterval(destacado.reloj);
    destacado.reloj = setInterval(() => !document.hidden && mostrarDestacado(destacado.indice + 1), 6000);
});
// Deslizar el destacado con el dedo cambia de juego
{
    let x0 = null;
    const tarjetaD = destacado.seccion.querySelector(".destacado-tarjeta");
    tarjetaD.addEventListener("touchstart", (e) => (x0 = e.touches[0].clientX), { passive: true });
    tarjetaD.addEventListener("touchend", (e) => {
        if (x0 === null) return;
        const dx = e.changedTouches[0].clientX - x0;
        x0 = null;
        if (Math.abs(dx) > 50) {
            mostrarDestacado(destacado.indice + (dx < 0 ? 1 : -1));
            tarjetaD.dataset.deslizo = "1";
        }
    });
    // Si fue un deslizamiento, no abrir el juego
    tarjetaD.addEventListener("click", (e) => {
        if (tarjetaD.dataset.deslizo) {
            e.preventDefault();
            delete tarjetaD.dataset.deslizo;
        }
    });
}

// ---------- Pestañas ----------
function mostrar(seccion) {
    escribir("pestana", seccion);
    for (const p of pestanas) p.classList.toggle("activa", p.dataset.seccion === seccion);
    for (const s of document.querySelectorAll(".seccion")) s.hidden = s.id !== `seccion-${seccion}`;
    const conJuegos = seccion !== "amigos";

    if (conJuegos) iniciarDestacado(seccion);
    else {
        clearInterval(destacado.reloj);
        destacado.seccion.hidden = true;
    }

    // Seguir jugando: los últimos juegos de esta pestaña
    const ultimos = recientes().map((c) => JUEGOS.find((j) => j.carpeta === c)).filter((j) => j && j.categoria === seccion);
    const filaRecientes = document.getElementById("recientes");
    filaRecientes.hidden = !conJuegos || !ultimos.length;
    const carruselR = filaRecientes.querySelector(".carrusel");
    carruselR.innerHTML = "";
    for (const j of ultimos) carruselR.appendChild(tarjetaChica(j));

    // Una fila por grupo
    lista.innerHTML = "";
    const grupos = new Map();
    for (const j of JUEGOS.filter((j) => j.categoria === seccion)) {
        if (!grupos.has(j.grupo)) grupos.set(j.grupo, []);
        grupos.get(j.grupo).push(j);
    }
    let indice = 0;
    for (const [grupo, juegos] of grupos) {
        const fila = document.createElement("li");
        fila.className = "fila-grupo";
        fila.innerHTML = `<h2 class="grupo-juegos">${grupo}<small>${juegos.length}</small></h2><ul class="carrusel"></ul>`;
        const carrusel = fila.querySelector(".carrusel");
        for (const j of juegos) carrusel.appendChild(tarjeta(j, indice++));
        lista.appendChild(fila);
    }
}

for (const p of pestanas) p.addEventListener("click", () => mostrar(p.dataset.seccion));
mostrar(leer("pestana", "solo"));

// Cuando llegan los niveles de la nube se actualizan las insignias
addEventListener("experiencia", () => {
    for (const a of lista.querySelectorAll(".tarjeta-juego")) {
        const nivel = nivelJuego(a.getAttribute("href").split("/")[1]);
        let insignia = a.querySelector(".nivel-juego");
        if (!nivel) continue;
        if (!insignia) {
            insignia = document.createElement("span");
            insignia.className = "nivel-juego";
            a.appendChild(insignia);
        }
        insignia.textContent = `Nv ${nivel}`;
    }
});

// Registra el service worker para que funcione sin internet
if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js");
}
