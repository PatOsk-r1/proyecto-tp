// Página principal: pestañas Solo / Multijugador / Casino con la lista de juegos de cada una
const lista = document.getElementById("lista-juegos");
const pestanas = document.querySelectorAll(".pestana");
const NUEVOS = ["games/colonia/", "games/panaderia/", "games/acuario/", "games/isla/"];

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

function tarjeta(juego, indice) {
    const item = document.createElement("li");
    item.style.setProperty("--retraso", `${indice * 45}ms`);
    const clave = juego.carpeta.split("/")[1];
    const nivel = nivelJuego(clave);
    item.innerHTML = `
        <a class="tarjeta-juego" href="${juego.carpeta}">
            <canvas class="portada"></canvas>
            ${NUEVOS.includes(juego.carpeta) ? '<span class="nuevo">Nuevo</span>' : ""}
            ${nivel ? `<span class="nivel-juego">Nv ${nivel}</span>` : ""}
            <span class="textos">
                <span class="nombre">${juego.nombre}</span>
                <span class="descripcion">${juego.descripcion}</span>
            </span>
        </a>`;
    item.querySelector("a").addEventListener("click", () => escribir("ultimo-juego", juego.carpeta));
    requestAnimationFrame(() => window.dibujarPortada?.(item.querySelector("canvas"), clave));
    return item;
}

function mostrar(seccion) {
    escribir("pestana", seccion);
    for (const p of pestanas) p.classList.toggle("activa", p.dataset.seccion === seccion);
    for (const s of document.querySelectorAll(".seccion")) s.hidden = s.id !== `seccion-${seccion}`;

    lista.innerHTML = "";
    let grupoActual = null;
    JUEGOS.filter((j) => j.categoria === seccion).forEach((juego, i) => {
        // Subtítulo cada vez que empieza un grupo nuevo
        if (juego.grupo && juego.grupo !== grupoActual) {
            grupoActual = juego.grupo;
            const titulo = document.createElement("li");
            titulo.className = "grupo-juegos";
            titulo.textContent = juego.grupo;
            lista.appendChild(titulo);
        }
        lista.appendChild(tarjeta(juego, i));
    });

    // "Seguir jugando" con el último juego abierto de esta pestaña
    const ultimo = JUEGOS.find((j) => j.carpeta === leer("ultimo-juego", "") && j.categoria === seccion);
    const seguir = document.getElementById("seguir");
    seguir.hidden = !ultimo;
    if (ultimo) {
        seguir.href = ultimo.carpeta;
        seguir.querySelector("strong").textContent = ultimo.nombre;
        requestAnimationFrame(() => window.dibujarPortada?.(seguir.querySelector("canvas"), ultimo.carpeta.split("/")[1]));
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
