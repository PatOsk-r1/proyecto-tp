// Pantalla de login: entrar, crear cuenta y recuperar contraseña
import { auth, configurado, usuarioActual, destinoDespuesDeEntrar } from "./sesion.js";
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    sendPasswordResetEmail,
    updateProfile,
    GoogleAuthProvider,
    signInWithPopup,
    signInAnonymously,
    linkWithCredential,
    linkWithPopup,
    EmailAuthProvider,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const $ = (id) => document.getElementById(id);
let creando = false;
// Si un invitado viene a crear su cuenta, se le "conecta" el email o Google a su mismo usuario:
// así conserva el mismo id y todo el progreso guardado en la nube.
let invitado = null;

const ERRORES = {
    "auth/invalid-credential": "Email o contraseña incorrectos.",
    "auth/wrong-password": "Email o contraseña incorrectos.",
    "auth/user-not-found": "Email o contraseña incorrectos.",
    "auth/invalid-email": "El email no es válido.",
    "auth/missing-password": "Escribí la contraseña.",
    "auth/email-already-in-use": "Ya hay una cuenta con ese email.",
    "auth/weak-password": "La contraseña tiene que tener al menos 6 caracteres.",
    "auth/too-many-requests": "Demasiados intentos. Esperá unos minutos.",
    "auth/network-request-failed": "Sin conexión. Revisá internet e intentá de nuevo.",
    "auth/unauthorized-domain": "Este sitio no está autorizado en Firebase.",
    "auth/popup-blocked": "El navegador bloqueó la ventana de Google. Permití ventanas emergentes e intentá de nuevo.",
    "auth/account-exists-with-different-credential": "Ese email ya tiene cuenta con contraseña. Entrá con tu email.",
    "auth/credential-already-in-use": "Esa cuenta ya existe. Entrá con ella (el progreso de invitado no se pasa).",
    "auth/provider-already-linked": "Ya conectaste esa cuenta.",
    "auth/operation-not-allowed": "El modo invitado todavía no está activado. Probá más tarde o creá una cuenta.",
    "auth/admin-restricted-operation": "El modo invitado todavía no está activado. Probá más tarde o creá una cuenta.",
};
const nombreDesdeEmail = (email) => email.split("@")[0].slice(0, 30);

function avisar(texto, tipo = "error") {
    $("aviso").textContent = texto;
    $("aviso").className = `aviso ${tipo}`;
    $("aviso").hidden = !texto;
}

function ocupado(si) {
    $("boton").disabled = si;
    $("boton").textContent = si ? "Un momento…" : creando ? "Crear cuenta" : "Entrar";
}

function cambiarModo() {
    creando = !creando;
    $("titulo").textContent = creando ? "Crear cuenta" : "Entrar";
    $("campo-nombre").hidden = !creando;
    $("campo-repetir").hidden = !creando;
    $("olvide").hidden = creando;
    $("invitado").hidden = creando || Boolean(invitado);
    $("nota-invitado").hidden = creando || Boolean(invitado);
    $("clave").autocomplete = creando ? "new-password" : "current-password";
    $("cambiar-modo").textContent = creando ? "¿Ya tenés cuenta? Entrá" : "¿No tenés cuenta? Creá una";
    $("modo-entrar").classList.toggle("activo", !creando);
    $("modo-crear").classList.toggle("activo", creando);
    $("modo-entrar").setAttribute("aria-selected", !creando);
    $("modo-crear").setAttribute("aria-selected", creando);
    document.querySelector(".selector-modo").classList.toggle("crear", creando);
    avisar("");
    ocupado(false);
}

$("cambiar-modo").addEventListener("click", cambiarModo);
$("modo-entrar").addEventListener("click", () => creando && cambiarModo());
$("modo-crear").addEventListener("click", () => !creando && cambiarModo());
$("ver-clave").addEventListener("click", () => {
    const ver = $("clave").type === "password";
    $("clave").type = ver ? "text" : "password";
    $("ver-clave").classList.toggle("viendo", ver);
    $("ver-clave").setAttribute("aria-label", ver ? "Ocultar contraseña" : "Mostrar contraseña");
});

$("formulario").addEventListener("submit", async (evento) => {
    evento.preventDefault();
    const email = $("email").value.trim();
    const clave = $("clave").value;

    if (!email || !clave) return avisar("Completá email y contraseña.");
    if (creando && clave !== $("repetir").value) return avisar("Las contraseñas no coinciden.");

    if (invitado && !creando && !confirm("Si entrás con otra cuenta, tu progreso de invitado no se pasa a esa cuenta. ¿Seguir?")) return;

    ocupado(true);
    avisar("");
    try {
        if (creando) {
            const { user } = invitado
                ? await linkWithCredential(invitado, EmailAuthProvider.credential(email, clave))
                : await createUserWithEmailAndPassword(auth, email, clave);
            const nombre = $("nombre").value.trim();
            if (nombre || invitado) await updateProfile(user, { displayName: nombre || nombreDesdeEmail(email) });
        } else {
            await signInWithEmailAndPassword(auth, email, clave);
        }
        location.replace(destinoDespuesDeEntrar());
    } catch (error) {
        avisar(ERRORES[error.code] || "No se pudo completar. Intentá de nuevo.");
        ocupado(false);
    }
});

$("con-google").addEventListener("click", async () => {
    avisar("");
    $("con-google").disabled = true;
    try {
        if (invitado) {
            const { user } = await linkWithPopup(invitado, new GoogleAuthProvider());
            const google = user.providerData.find((p) => p.providerId === "google.com");
            await updateProfile(user, { displayName: google?.displayName || nombreDesdeEmail(google?.email ?? "jugador"), photoURL: google?.photoURL ?? null });
        } else await signInWithPopup(auth, new GoogleAuthProvider());
        location.replace(destinoDespuesDeEntrar());
    } catch (error) {
        // Cerrar la ventana de Google no es un error
        if (invitado && error.code === "auth/credential-already-in-use") {
            // Esa cuenta de Google ya existe: el próximo toque entra directo con ella
            invitado = null;
            avisar("Esa cuenta de Google ya existe. Tocá de nuevo para entrar con ella (el progreso de invitado no se pasa).");
        } else if (error.code !== "auth/popup-closed-by-user" && error.code !== "auth/cancelled-popup-request") {
            avisar(ERRORES[error.code] || "No se pudo entrar con Google. Intentá de nuevo.");
        }
        $("con-google").disabled = false;
    }
});

$("invitado").addEventListener("click", async () => {
    avisar("");
    $("invitado").disabled = true;
    $("invitado").textContent = "Un momento…";
    try {
        const { user } = await signInAnonymously(auth);
        await updateProfile(user, { displayName: "Invitado" });
        location.replace(destinoDespuesDeEntrar());
    } catch (error) {
        avisar(ERRORES[error.code] || "No se pudo entrar como invitado. Intentá de nuevo.");
        $("invitado").disabled = false;
        $("invitado").textContent = "🎮 Jugar como invitado";
    }
});

$("olvide").addEventListener("click", async () => {
    const email = $("email").value.trim();
    if (!email) return avisar("Escribí tu email arriba y tocá de nuevo.");
    try {
        await sendPasswordResetEmail(auth, email);
        avisar("Si hay una cuenta con ese email, te llegó un mensaje para cambiar la contraseña.", "ok");
    } catch (error) {
        avisar(ERRORES[error.code] || "No se pudo enviar el email.");
    }
});

if (!configurado) {
    avisar("El login todavía no está configurado (falta js/firebase-config.js).");
    $("boton").disabled = true;
    $("con-google").disabled = true;
    $("olvide").disabled = true;
    $("cambiar-modo").disabled = true;
    $("modo-entrar").disabled = true;
    $("modo-crear").disabled = true;
    $("invitado").disabled = true;
} else {
    const usuario = await usuarioActual();
    if (usuario?.isAnonymous) {
        // Invitado que viene a guardar su progreso: arranca en "Crear cuenta"
        invitado = usuario;
        $("banner-invitado").hidden = false;
        if (!creando) cambiarModo();
    } else if (usuario) {
        // Ya tenía la sesión abierta
        location.replace(destinoDespuesDeEntrar());
    } else if (new URLSearchParams(location.search).has("crear")) cambiarModo();
}
