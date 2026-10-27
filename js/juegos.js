// Lista de juegos que aparecen en la página principal.
// categoria: "solo" (de a uno), "multi" (con amigos online, también contra la compu) o "casino" (usan las fichas).
// Para agregar uno nuevo: copiá la carpeta games/_plantilla, renombrala y sumá una entrada acá.
const JUEGOS = [
    { categoria: "solo", nombre: "Reflejos", descripcion: "Tocá apenas la pantalla se ponga verde", emoji: "⚡", carpeta: "games/reflejos/" },
    { categoria: "solo", nombre: "Mina Profunda", descripcion: "Picá, juntá recursos y construí máquinas", emoji: "⛏️", carpeta: "games/mina/" },
    { categoria: "solo", nombre: "Marea", descripcion: "Elegí puertas que suman y multiplican tu grupo", emoji: "🏃", carpeta: "games/marea/" },
    { categoria: "solo", nombre: "Fusión", descripcion: "Juntá dos iguales para crear algo mejor", emoji: "🧩", carpeta: "games/fusion/" },
    { categoria: "solo", nombre: "Apilar", descripcion: "Soltá cada bloque justo encima del anterior", emoji: "🧱", carpeta: "games/apilar/" },
    { categoria: "solo", nombre: "Espiral", descripcion: "Girá la torre y hacé caer la pelota", emoji: "🌀", carpeta: "games/espiral/" },

    { categoria: "multi", nombre: "Pool", descripcion: "Bola 8 contra un amigo o la compu", emoji: "🎱", carpeta: "games/pool/" },
    { categoria: "multi", nombre: "Tiro con arco", descripcion: "Duelo de 5 rondas con viento", emoji: "🏹", carpeta: "games/arco/" },

    { categoria: "casino", nombre: "Blackjack", descripcion: "Llegá a 21 sin pasarte", emoji: "🃏", carpeta: "games/blackjack/" },
    { categoria: "casino", nombre: "Ruleta", descripcion: "Apostá a números, colores o docenas", emoji: "🎡", carpeta: "games/ruleta/" },
    { categoria: "casino", nombre: "Tragamonedas", descripcion: "Tres iguales y te llevás el premio", emoji: "🎰", carpeta: "games/tragamonedas/" },
];
