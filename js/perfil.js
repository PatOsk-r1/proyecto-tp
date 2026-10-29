// Ajustes del perfil multijugador: foto y nombre de usuario único.
import { exigirSesion } from "./sesion.js";
import { miPerfil, elegirNombre, prepararFoto, guardarFoto, quitarFoto, htmlAvatar, NOMBRE_VALIDO } from "./multijugador.js";

const $ = (id) => document.getElementById(id);
const usuario = await exigirSesion();
let perfil = await miPerfil();

// Si se llegó desde amigos, al guardar el nombre se vuelve ahí
const volverA = new URLSearchParams(location.search).get("volver");
if (volverA === "amigos") $("volver").href = "amigos.html";

function avisar(id, texto, ok = false) {
    $(id).textContent = texto;
    $(id).className = `aviso-linea${ok ? " ok" : ""}`;
    $(id).hidden = !texto;
}

function pintar() {
    $("avatar").innerHTML = htmlAvatar(perfil, usuario.displayName || usuario.email || "?");
    $("quitar").hidden = !perfil?.foto;
    $("nombre").value = perfil?.nombre ?? "";
    $("email").textContent = usuario.isAnonymous ? "Jugás como invitado: creá tu cuenta desde el inicio para no perder nada" : `Entrás con ${usuario.email}`;
}

$("form-nombre").addEventListener("submit", async (e) => {
    e.preventDefault();
    const nombre = $("nombre").value.trim();
    if (!NOMBRE_VALIDO.test(nombre)) return avisar("aviso-nombre", "Usá de 3 a 20 letras, números o guion bajo, sin espacios.");
    if (nombre === perfil?.nombre) return avisar("aviso-nombre", "Ese ya es tu nombre.", true);
    try {
        const primeraVez = !perfil;
        await elegirNombre(nombre, perfil);
        perfil = await miPerfil();
        pintar();
        avisar("aviso-nombre", "¡Nombre guardado!", true);
        if (primeraVez && volverA === "amigos") location.href = "amigos.html";
    } catch (error) {
        avisar("aviso-nombre", error.code === "permission-denied" ? "Ese nombre ya lo tiene otra persona." : error.message);
    }
});

$("archivo").addEventListener("change", async () => {
    const archivo = $("archivo").files[0];
    $("archivo").value = "";
    if (!archivo) return;
    if (!perfil) return avisar("aviso-foto", "Primero elegí tu nombre de usuario.");
    try {
        avisar("aviso-foto", "Subiendo…", true);
        const foto = await prepararFoto(archivo);
        await guardarFoto(foto);
        perfil = await miPerfil();
        pintar();
        avisar("aviso-foto", "¡Foto actualizada!", true);
    } catch (error) {
        avisar("aviso-foto", error.message || "No se pudo guardar la foto.");
    }
});

$("quitar").addEventListener("click", async () => {
    await quitarFoto();
    perfil = await miPerfil();
    pintar();
    avisar("aviso-foto", "");
});

pintar();
