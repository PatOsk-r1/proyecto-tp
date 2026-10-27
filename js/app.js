// Arma la lista de juegos en la página principal
const lista = document.getElementById("lista-juegos");

for (const juego of JUEGOS) {
    const item = document.createElement("li");
    item.innerHTML = `
        <a class="tarjeta-juego" href="${juego.carpeta}">
            <span class="emoji">${juego.emoji}</span>
            <span class="nombre">${juego.nombre}</span>
            <span class="descripcion">${juego.descripcion}</span>
        </a>`;
    lista.appendChild(item);
}

// Registra el service worker para que funcione sin internet
if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js");
}
