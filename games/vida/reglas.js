// Vidas cruzadas: reglas y datos compartidos (los usa el juego y la página de amigos al crear la partida).

export const MOMENTOS = ["Mañana", "Tarde", "Noche"];

// Lugares del barrio. social: ahí se pueden cruzar los dos personajes.
export const LUGARES = {
    trabajo: { nombre: "Trabajo", detalle: "Ganás plata", energia: -20, animo: -5, social: false },
    facultad: { nombre: "Facultad", detalle: "Estudiás: mejores trabajos", energia: -15, animo: -2, plata: -5, social: true },
    gimnasio: { nombre: "Gimnasio", detalle: "Mejor estado físico", energia: -20, animo: 5, plata: -5, social: true },
    cafe: { nombre: "Café", detalle: "Un rato tranquilo", energia: -5, animo: 6, plata: -8, social: true },
    plaza: { nombre: "Plaza", detalle: "Gratis, siempre hay gente", energia: -5, animo: 5, social: true },
    bar: { nombre: "Bar", detalle: "Música y gente nueva", energia: -12, animo: 10, plata: -15, social: true, soloNoche: false },
    casa: { nombre: "Casa", detalle: "Descansás y recuperás energía", energia: 35, animo: 3, social: false },
};

// Lo que hace falta para cada paso de la relación (nivel de 0 a 100)
export const PASOS = {
    cita: { nombre: "Invitar a una cita", desde: ["conocidos", "amigos", "saliendo", "pareja", "convivencia", "casados"], nivel: 10 },
    salir: { nombre: "Proponer salir", desde: ["conocidos", "amigos"], nivel: 30, a: "saliendo" },
    pareja: { nombre: "Proponer ser pareja", desde: ["saliendo"], nivel: 50, a: "pareja" },
    noche: { nombre: "Pasar la noche juntos", desde: ["saliendo", "pareja", "convivencia", "casados"], nivel: 40 },
    mudarse: { nombre: "Proponer vivir juntos", desde: ["pareja"], nivel: 65, a: "convivencia" },
    casarse: { nombre: "Proponer casamiento", desde: ["convivencia"], nivel: 80, a: "casados" },
    adoptar: { nombre: "Proponer adoptar", desde: ["convivencia", "casados"], nivel: 75 },
};

export const ESTADOS = {
    desconocidos: "No se conocen",
    conocidos: "Conocidos",
    amigos: "Amigos",
    saliendo: "Saliendo",
    pareja: "Pareja",
    convivencia: "Viven juntos",
    casados: "Casados",
};

export const CITAS = {
    cafe: { nombre: "Un café", frase: "a tomar un café", costo: 15, base: 6 },
    cine: { nombre: "El cine", frase: "al cine", costo: 35, base: 9 },
    restaurante: { nombre: "Cenar afuera", frase: "a cenar afuera", costo: 70, base: 13 },
};

// Probabilidad de embarazo por noche: con protección baja un 99%
export const CHANCE_EMBARAZO = 0.2;
export const CHANCE_CON_PROTECCION = CHANCE_EMBARAZO * 0.01;
export const DIAS_EMBARAZO = 9;

export function datosIniciales() {
    return {
        vida: {
            personajes: {},
            relacion: { nivel: 0, estado: "desconocidos" },
            propuestas: {},
            historia: {},
            hijos: {},
            embarazo: null,
        },
    };
}
