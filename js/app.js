// Página principal: pestañas Solo / Multijugador / Casino con la lista de juegos de cada una
const lista = document.getElementById("lista-juegos");
const pestanas = document.querySelectorAll(".pestana");

function leerPestana() {
    try {
        return localStorage.getItem("pestana") || "solo";
    } catch {
        return "solo";
    }
}

function mostrar(seccion) {
    try {
        localStorage.setItem("pestana", seccion);
    } catch {}
    for (const p of pestanas) p.classList.toggle("activa", p.dataset.seccion === seccion);
    for (const s of document.querySelectorAll(".seccion")) s.hidden = s.id !== `seccion-${seccion}`;

    lista.innerHTML = "";
    for (const juego of JUEGOS.filter((j) => j.categoria === seccion)) {
        const item = document.createElement("li");
        item.innerHTML = `
            <a class="tarjeta-juego" href="${juego.carpeta}">
                <span class="emoji">${juego.emoji}</span>
                <span class="nombre">${juego.nombre}</span>
                <span class="descripcion">${juego.descripcion}</span>
            </a>`;
        lista.appendChild(item);
    }
}

for (const p of pestanas) p.addEventListener("click", () => mostrar(p.dataset.seccion));
mostrar(leerPestana());

// Registra el service worker para que funcione sin internet
if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js");
}
