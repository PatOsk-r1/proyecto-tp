// Sesión de usuario con Firebase Authentication.
// Las contraseñas nunca se guardan en esta app: viajan por https a Firebase,
// que las guarda cifradas en su servidor.
import { firebaseConfig } from "./firebase-config.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

export const configurado = Boolean(firebaseConfig);
export const auth = configurado ? getAuth(initializeApp(firebaseConfig)) : null;

const LOGIN = new URL("../login.html", import.meta.url).href;
const INICIO = new URL("../", import.meta.url).href;

// Devuelve el usuario conectado, o null. Espera a que Firebase restaure la sesión guardada.
export function usuarioActual() {
    if (!auth) return Promise.resolve(null);
    return new Promise((resolver) => {
        const parar = onAuthStateChanged(auth, (usuario) => {
            parar();
            resolver(usuario);
        });
    });
}

// Para páginas que requieren sesión: si no hay usuario, manda al login.
// La página arranca oculta (clase "verificando" en <html>) para que no se vea antes de chequear.
export async function exigirSesion() {
    const usuario = await usuarioActual();
    if (!usuario) {
        location.replace(`${LOGIN}?volver=${encodeURIComponent(location.pathname)}`);
        return new Promise(() => {}); // la página se va, no sigue
    }
    document.documentElement.classList.remove("verificando");
    return usuario;
}

export async function cerrarSesion() {
    if (auth) await signOut(auth);
    location.replace(LOGIN);
}

// Adónde ir después de entrar. Solo acepta rutas de este mismo sitio.
export function destinoDespuesDeEntrar() {
    const volver = new URLSearchParams(location.search).get("volver");
    if (volver) {
        const url = new URL(volver, location.origin);
        if (url.origin === location.origin) return url.href;
    }
    return INICIO;
}
