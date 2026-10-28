// Lista de juegos que aparecen en la página principal.
// categoria: "solo" (de a uno), "multi" (con amigos online, también contra la compu) o "casino" (usan las fichas).
// grupo: subtítulo bajo el que aparece dentro de su pestaña (se muestran en el orden de esta lista).
// Para agregar uno nuevo: copiá la carpeta games/_plantilla, renombrala y sumá una entrada acá.
const JUEGOS = [
    { categoria: "solo", grupo: "Defensa", nombre: "Defensa de torres", descripcion: "Poné torres y frená las oleadas", emoji: "🏰", carpeta: "games/torres/" },
    { categoria: "solo", grupo: "Defensa", nombre: "Fusión mágica", descripcion: "Fusioná magos y frená a los monstruos", emoji: "🧙", carpeta: "games/magos/" },
    { categoria: "solo", grupo: "Defensa", nombre: "Muralla", descripcion: "Apuntá la ballesta y defendé el castillo", emoji: "🏹", carpeta: "games/muralla/" },
    { categoria: "solo", grupo: "Defensa", nombre: "Defensa lunar", descripcion: "Frená a los aliens en 5 carriles", emoji: "👽", carpeta: "games/luna/" },
    { categoria: "solo", grupo: "Incrementales", nombre: "Héroe idle", descripcion: "Pegale a monstruos, armá tu equipo y vencé jefes", emoji: "🗡️", carpeta: "games/heroe/" },
    { categoria: "solo", grupo: "Incrementales", nombre: "Ciudad", descripcion: "Construí edificios que crecen y producen solos", emoji: "🏙️", carpeta: "games/ciudad/" },
    { categoria: "solo", grupo: "Incrementales", nombre: "Granja", descripcion: "Plantá, criá animales y cumplí pedidos", emoji: "🌾", carpeta: "games/granja/" },
    { categoria: "solo", grupo: "Incrementales", nombre: "Acuario", descripcion: "Criá peces que juntan monedas solos", emoji: "🐠", carpeta: "games/acuario/" },
    { categoria: "solo", grupo: "Incrementales", nombre: "Panadería", descripcion: "Horneá, contratá encargados y abrí sucursales", emoji: "🥐", carpeta: "games/panaderia/" },
    { categoria: "solo", grupo: "Incrementales", nombre: "Colonia espacial", descripcion: "Construí satélites y estaciones en órbita", emoji: "🪐", carpeta: "games/colonia/" },
    { categoria: "solo", grupo: "Arcade", nombre: "Corredor espacial", descripcion: "Esquivá y destruí oleadas de naves", emoji: "🚀", carpeta: "games/espacial/" },
    { categoria: "solo", grupo: "Arcade", nombre: "Rompeladrillos", descripcion: "Rompé todos los ladrillos con la pelota", emoji: "🧱", carpeta: "games/ladrillos/" },
    { categoria: "solo", grupo: "Arcade", nombre: "Apilar", descripcion: "Soltá cada bloque justo encima del anterior", emoji: "🧱", carpeta: "games/apilar/" },
    { categoria: "solo", grupo: "Arcade", nombre: "Espiral", descripcion: "Girá la torre y hacé caer la pelota", emoji: "🌀", carpeta: "games/espiral/" },

    { categoria: "multi", grupo: "Habilidad", nombre: "Pool", descripcion: "Bola 8 contra un amigo o la compu", emoji: "🎱", carpeta: "games/pool/" },
    { categoria: "multi", grupo: "Habilidad", nombre: "Tiro con arco", descripcion: "Duelo de 5 rondas con viento", emoji: "🏹", carpeta: "games/arco/" },
    { categoria: "multi", grupo: "Tablero", nombre: "Damas", descripcion: "Comé todas las fichas del rival", emoji: "⚫", carpeta: "games/damas/" },
    { categoria: "multi", grupo: "Tablero", nombre: "Reversi", descripcion: "Encerrá y dá vuelta las fichas del rival", emoji: "⚪", carpeta: "games/reversi/" },
    { categoria: "multi", grupo: "Tablero", nombre: "Mancala", descripcion: "Sembrá semillas y llená tu granero", emoji: "🥥", carpeta: "games/mancala/" },
    { categoria: "multi", grupo: "Tablero", nombre: "Batalla naval", descripcion: "Hundí la flota enemiga", emoji: "🚢", carpeta: "games/naval/" },
    { categoria: "multi", grupo: "Rápidos", nombre: "4 en línea", descripcion: "Juntá cuatro fichas antes que tu rival", emoji: "🔴", carpeta: "games/cuatro/" },
    { categoria: "multi", grupo: "Rápidos", nombre: "Ta-te-tí", descripcion: "Tres en línea, rápido y clásico", emoji: "❌", carpeta: "games/tateti/" },
    { categoria: "multi", grupo: "Rápidos", nombre: "Puntos y cajas", descripcion: "Cerrá cajas y jugá de nuevo", emoji: "🟦", carpeta: "games/cajas/" },

    { categoria: "casino", grupo: "Tragamonedas y premios", nombre: "Tragamonedas", descripcion: "Pozos acumulados, giros gratis y logros", emoji: "🎰", carpeta: "games/tragamonedas/" },
    { categoria: "casino", grupo: "Tragamonedas y premios", nombre: "Rueda de la fortuna", descripcion: "Girá y multiplicá con tres niveles de riesgo", emoji: "🎡", carpeta: "games/rueda/" },
    { categoria: "casino", grupo: "Tragamonedas y premios", nombre: "Raspadita", descripcion: "Raspá con el dedo y buscá tres iguales", emoji: "🎟️", carpeta: "games/raspadita/" },
    { categoria: "casino", grupo: "Tragamonedas y premios", nombre: "Keno", descripcion: "Elegí números y mirá cuántos salen", emoji: "🔢", carpeta: "games/keno/" },
    { categoria: "casino", grupo: "Cartas", nombre: "Blackjack", descripcion: "Llegá a 21 sin pasarte", emoji: "🃏", carpeta: "games/blackjack/" },
    { categoria: "casino", grupo: "Cartas", nombre: "Baccarat", descripcion: "Jugador, banca o empate: el clásico de los casinos", emoji: "🎴", carpeta: "games/baccarat/" },
    { categoria: "casino", grupo: "Cartas", nombre: "Mayor o menor", descripcion: "Adiviná la próxima carta y multiplicá", emoji: "🃏", carpeta: "games/mayormenor/" },
    { categoria: "casino", grupo: "Mesa", nombre: "Ruleta", descripcion: "Apostá a números, colores o docenas", emoji: "🎡", carpeta: "games/ruleta/" },
    { categoria: "casino", grupo: "Mesa", nombre: "Sic Bo", descripcion: "Tres dados y un paño lleno de apuestas", emoji: "🀄", carpeta: "games/sicbo/" },
    { categoria: "casino", grupo: "Mesa", nombre: "Dados", descripcion: "Seis apuestas con dos dados", emoji: "🎲", carpeta: "games/dados/" },
    { categoria: "casino", grupo: "Rápidos", nombre: "Crash", descripcion: "Retirate antes de que explote el cohete", emoji: "🚀", carpeta: "games/crash/" },
    { categoria: "casino", grupo: "Rápidos", nombre: "Minas", descripcion: "Encontrá gemas sin pisar una bomba", emoji: "💎", carpeta: "games/minas/" },
    { categoria: "casino", grupo: "Rápidos", nombre: "Plinko", descripcion: "Soltá bolas entre clavos y multiplicá", emoji: "🔮", carpeta: "games/plinko/" },
];
