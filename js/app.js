// Página principal: pestañas Solo / Multijugador / Casino con la lista de juegos de cada una
const lista = document.getElementById("lista-juegos");
const pestanas = document.querySelectorAll(".pestana");
const NUEVOS = ["games/heroe/", "games/luna/", "games/torres/"];

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

function tarjeta(juego, indice) {
    const item = document.createElement("li");
    item.style.setProperty("--retraso", `${indice * 45}ms`);
    const clave = juego.carpeta.split("/")[1];
    item.innerHTML = `
        <a class="tarjeta-juego" href="${juego.carpeta}">
            <canvas class="portada"></canvas>
            ${NUEVOS.includes(juego.carpeta) ? '<span class="nuevo">Nuevo</span>' : ""}
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
    JUEGOS.filter((j) => j.categoria === seccion).forEach((juego, i) => lista.appendChild(tarjeta(juego, i)));

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

// Registra el service worker para que funcione sin internet
if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js");
}
