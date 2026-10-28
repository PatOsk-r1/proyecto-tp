// Partes comunes de los juegos por turnos de tablero (contra la compu o contra un amigo online).

// Número de cada jugador: 1 = el que creó la partida (empieza), 2 = el invitado
export const numerosDe = (p) => ({ [p.creador]: 1, [p.jugadores.find((j) => j !== p.creador)]: 2 });

// Se conecta a la partida online y avisa cada cambio. alCambiar(partida, esLaPrimeraVez)
export async function conectarOnline({ idPartida, yo, actividad, alCambiar, alFallar }) {
    const online = await import("./multijugador.js");
    online.iniciarPresencia(actividad);
    let primera = true;
    online.escucharPartida(
        idPartida,
        (p) => {
            if (!p) return alFallar("La partida ya no existe");
            if (primera && p.estado === "invitada" && p.creador !== yo) online.actualizarPartida(idPartida, { estado: "jugando" });
            alCambiar(p, primera);
            primera = false;
        },
        () => alFallar("No tenés acceso a esta partida")
    );
    return online;
}

// Nueva partida contra el mismo amigo
export async function pedirRevancha(online, juego, partida, yo, datosIniciales) {
    const rival = partida.jugadores.find((j) => j !== yo);
    const id = await online.crearPartida(juego, partida.nombres[yo], { uid: rival, nombre: partida.nombres[rival] }, datosIniciales());
    location.search = `?partida=${id}`;
}

// Botones de dificultad (data-nivel) guardados en el estado del juego
export function conectarDificultad(estado, guardar, clave) {
    const pintar = () => {
        for (const b of document.querySelectorAll(".dificultad button")) b.classList.toggle("activa", Number(b.dataset.nivel) === estado.dificultad);
    };
    for (const b of document.querySelectorAll(".dificultad button")) {
        b.addEventListener("click", () => {
            estado.dificultad = Number(b.dataset.nivel);
            guardar(clave, estado);
            pintar();
        });
    }
    pintar();
}

// Minimax genérico con poda alfa-beta.
// jugadas(estado) → lista; aplicar(estado, jugada) → {estado, mismoTurno}; valor(estado) → puntaje para "yo"
export function mejorJugada({ estado, profundidad, jugadas, aplicar, valor, terminado }) {
    function buscar(e, prof, alfa, beta, maximiza) {
        if (prof === 0 || terminado(e)) return valor(e);
        const lista = jugadas(e);
        if (!lista.length) return valor(e);
        let mejor = maximiza ? -Infinity : Infinity;
        for (const j of lista) {
            const r = aplicar(e, j);
            const v = buscar(r.estado, prof - 1, alfa, beta, r.mismoTurno ? maximiza : !maximiza);
            if (maximiza) {
                mejor = Math.max(mejor, v);
                alfa = Math.max(alfa, v);
            } else {
                mejor = Math.min(mejor, v);
                beta = Math.min(beta, v);
            }
            if (beta <= alfa) break;
        }
        return mejor;
    }
    let mejores = [];
    let mejorValor = -Infinity;
    for (const j of jugadas(estado)) {
        const r = aplicar(estado, j);
        const v = buscar(r.estado, profundidad - 1, -Infinity, Infinity, r.mismoTurno);
        if (v > mejorValor) {
            mejorValor = v;
            mejores = [j];
        } else if (v === mejorValor) {
            mejores.push(j);
        }
    }
    return mejores[Math.floor(Math.random() * mejores.length)];
}
