// Pestaña Amigos del inicio: lista de chats con cada amigo (último mensaje, sin leer, en línea).
import {
    escucharAmistades, escucharUsuario, escucharChat, rutaChatAmigo, sinLeer, idAmistad, panelChat,
    htmlAvatar, enLinea, textoConexion,
} from "./multijugador.js";

const escapar = (t) => String(t).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

function horaCorta(ts) {
    const d = ts?.toDate?.();
    if (!d) return "";
    const hoy = new Date();
    return d.toDateString() === hoy.toDateString()
        ? d.toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" })
        : d.toLocaleDateString("es", { day: "numeric", month: "short" });
}

// alCambiar(totalSinLeer, solicitudes) para las insignias de la pestaña
export function montarChats({ lista, vacio, yo, miNombre, alCambiar }) {
    const amigos = new Map(); // uid → { nombre, datos, mensajes }
    const escuchados = new Set();
    let solicitudes = 0;
    const clave = (uid) => `amigo-${idAmistad(yo, uid)}`;

    function pintar() {
        const filas = [...amigos.entries()].map(([uid, a]) => ({ uid, ...a, ultimo: a.mensajes?.at(-1), n: sinLeer(clave(uid), a.mensajes ?? []) }));
        filas.sort((a, b) => (b.ultimo?.creado?.toMillis?.() ?? 0) - (a.ultimo?.creado?.toMillis?.() ?? 0) || enLinea(b.datos) - enLinea(a.datos));
        vacio.hidden = filas.length > 0;
        lista.replaceChildren(
            ...filas.map((f) => {
                const li = document.createElement("li");
                li.className = `fila-chat${f.n ? " sin-leer" : ""}`;
                const nombre = f.datos?.nombre ?? f.nombre;
                const vista = f.ultimo ? `${f.ultimo.de === yo ? "Vos: " : ""}${f.ultimo.texto}` : textoConexion(f.datos);
                li.innerHTML = `
                    <span class="avatar-chat">${htmlAvatar(f.datos, escapar(nombre))}<i class="punto${enLinea(f.datos) ? " si" : ""}"></i></span>
                    <span class="textos-chat"><strong>${escapar(nombre)}</strong><span>${escapar(vista.slice(0, 60))}</span></span>
                    <span class="lado-chat"><small>${horaCorta(f.ultimo?.creado)}</small>${f.n ? `<b>${f.n}</b>` : ""}</span>`;
                li.addEventListener("click", () =>
                    panelChat({
                        titulo: `💬 ${nombre}`,
                        ruta: rutaChatAmigo(f.uid),
                        nombres: { [f.uid]: nombre },
                        clave: clave(f.uid),
                        amigo: { uid: f.uid, nombre },
                        miNombre,
                        alCerrar: pintar,
                    })
                );
                return li;
            })
        );
        alCambiar?.(filas.reduce((s, f) => s + f.n, 0), solicitudes);
    }

    escucharAmistades((lista) => {
        solicitudes = lista.filter((a) => a.estado === "pendiente" && a.para === yo).length;
        for (const a of lista.filter((x) => x.estado === "aceptada")) {
            const uid = a.uids.find((u) => u !== yo);
            if (!amigos.has(uid)) amigos.set(uid, { nombre: a.nombres[uid] ?? "Amigo" });
            if (escuchados.has(uid)) continue;
            escuchados.add(uid);
            escucharUsuario(uid, (datos) => {
                amigos.get(uid).datos = datos;
                pintar();
            });
            escucharChat(rutaChatAmigo(uid), (mensajes) => {
                amigos.get(uid).mensajes = mensajes;
                pintar();
            }, 30);
        }
        pintar();
    });
    setInterval(pintar, 60000);
}
