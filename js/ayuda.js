// Botón "?" con el cómo jugar de cada juego. Se monta solo desde sesion.js en las páginas games/<id>/.
// La primera vez que se abre un juego, la ayuda aparece sola.

const COMPU_FLECHAS = "En la compu: flechas para moverte y espacio para la acción.";
const CASINO = "Usa las fichas del casino, que son las mismas en todos los juegos de casino.";

// objetivo · como: pasos para jugar · consejos
const AYUDA = {
    torres: { objetivo: "Que ningún enemigo llegue al castillo.", como: ["Elegí una torre abajo y tocá un lugar libre del mapa para ponerla.", "Tocá una torre puesta para mejorarla o venderla.", "Arrancá cada oleada cuando estés listo."], consejos: ["Mezclá torres: algunas pegan a muchos, otras frenan o pegan fuerte.", "Lo que ganás en el laboratorio sirve para siempre."] },
    magos: { objetivo: "Fusionar magos para que sean más fuertes y frenar a los monstruos antes del portal.", como: ["Tocá invocar para que aparezca un mago al azar.", "Arrastrá un mago encima de otro igual para fusionarlos y que suban de nivel.", "Los monstruos dan la vuelta a la grilla: los magos les tiran solos."], consejos: ["Fusioná seguido: un mago grande vale más que muchos chiquitos.", "Dejá lugar libre en la grilla para invocar."] },
    muralla: { objetivo: "Defender el castillo de los enemigos que bajan.", como: ["Mantené el dedo apretado donde querés apuntar: la ballesta dispara sola.", "Entre oleadas comprás mejoras con oro.", "En la compu: flechas para mover la mira y espacio para disparar."], consejos: ["Las gemas compran mejoras para siempre en la forja.", "Apuntá primero a los que están más cerca de la muralla."] },
    luna: { objetivo: "Que los aliens no lleguen al fondo de ningún carril.", como: ["Poné extractores: dan la energía para todo lo demás.", "Elegí una defensa y tocá una casilla del carril para ponerla.", "Ganá el nivel para destrabar defensas nuevas."], consejos: ["Empezá con 2 o 3 extractores antes de llenar de defensas.", "Los chips del taller mejoran todo para siempre."] },
    heroe: { objetivo: "Avanzar de etapa venciendo monstruos y jefes.", como: ["Tocá al monstruo para pegarle.", "Contratá al equipo: pelea solo aunque no toques.", "Cada 5 etapas hay un jefe con tiempo: si no llegás, entrená y volvé."], consejos: ["Al renacer ganás almas: más daño para siempre.", "Equipá el mejor botín, mejoralo en la forja y probá las mazmorras."] },
    isla: { objetivo: "Explorar la isla, armar el campamento y encontrar el gran tesoro.", como: ["Tocá las casillas que brillan para explorarlas (gastan energía, que se recarga sola).", "Con madera, piedra y monedas construís en el campamento.", "Juntá los 3 pedazos del mapa: aparece la X roja del tesoro.", "Con el muelle zarpás a una isla nueva más grande."], consejos: ["Comé cocos 🥥 para recuperar energía.", "Si desembarcan piratas, tocalos rápido; las tormentas dejan destellos ✨ y los barcos mercantes ofrecen tratos.", "En 🎒 Explorador comprás objetos con gemas que te quedan para siempre.", "Con la isla explorada aparecen destellos ✨ para seguir juntando.", "Cuanto más explores antes de zarpar, más brújulas ganás."] },
    granja: { objetivo: "Hacer crecer tu granja cumpliendo pedidos.", como: ["Elegí una semilla y tocá o deslizá sobre las parcelas vacías.", "Deslizá sobre lo maduro para cosechar.", "Tocá a los animales con burbuja para recoger lo que dan.", "Entregá los pedidos de los clientes para ganar monedas y experiencia."], consejos: ["Juntá la caca del corral 💩: sirve de abono.", "Tocá una nube para que llueva y todo crezca más rápido.", "Cada nivel te da un tiro en la garra de premios."] },
    acuario: { objetivo: "Tener peceras llenas de vida que atraigan visitas.", como: ["Tocá el agua para tirar comida (abajo elegís cuál).", "Comprá animales, plantas y equipo en las pestañas.", "Tocá 🗄️ para ver tus peceras o comprar otras (dulce, arrecife y abismo)."], consejos: ["Limpiá el agua cuando se pone verde.", "Los depredadores se comen a los chicos: dales krill 🦞 y no cazan.", "Peces felices y alimentados tienen crías."] },
    panaderia: { objetivo: "Armar la panadería más famosa.", como: ["Tocá un horno para hornear.", "Lo listo va a la vitrina.", "Tocá al cliente para venderle lo que pide antes de que se canse."], consejos: ["Los encargados hornean solos y la cajera vende sola.", "Abrir otra sucursal reinicia, pero las estrellas suben los precios para siempre."] },
    colonia: { objetivo: "Hacer crecer tu colonia en el espacio.", como: ["Tocá el planeta para juntar energía.", "Construí cosas que orbitan y producen solas.", "Mandá naves de expedición y elegí qué hacer en cada evento."], consejos: ["Los artefactos dan bonus para siempre.", "Saltar de galaxia reinicia, pero la materia oscura multiplica todo."] },
    espacial: { objetivo: "Sobrevivir a las oleadas y vencer al jefe de cada sector.", como: ["La nave sigue tu dedo y dispara sola.", "Agarrá los premios que caen: poder, escudo, bomba y vida.", "Tocá 💣 para usar una bomba.", COMPU_FLECHAS + " El espacio tira la bomba."], consejos: ["Los cristales se gastan en el hangar: naves nuevas y mejoras."] },
    ladrillos: { objetivo: "Romper todos los ladrillos sin que se te caiga la pelota.", como: ["Mové la paleta con el dedo.", "Tocá para lanzar la pelota.", COMPU_FLECHAS], consejos: ["Agarrá los poderes que caen.", "Con las monedas comprás mejoras en el taller."] },
    apilar: { objetivo: "Hacer la torre más alta.", como: ["El bloque va y viene: tocá para soltarlo encima del anterior.", "Lo que sobresale se cae y el bloque queda más chico.", "En la compu: espacio para soltar."], consejos: ["Si lo soltás justo encima, el bloque no se achica."] },
    espiral: { objetivo: "Bajar por la torre hasta el final.", como: ["Deslizá el dedo para girar la torre.", "La pelota cae por los huecos.", "Si toca lo rojo, perdés.", "En la compu: flechas para girar."], consejos: ["Si caés 3 pisos seguidos sin rebotar, la pelota se prende fuego y rompe el siguiente."] },
    pool: { objetivo: "Meter tus bolas (lisas o rayadas) y después la 8.", como: ["Tocá para apuntar y deslizá para girar el taco.", "Con ↺ ↻ hacés el ajuste fino.", "Bajá la barra de fuerza para tirar."], consejos: ["Si metés la 8 antes de tiempo, perdés."], online: true },
    arco: { objetivo: "Sumar más puntos que el rival en 5 rondas.", como: ["Mantené apretado, mové para apuntar y soltá para tirar.", "Mirá el viento: arriba a la derecha dice para dónde sopla.", "En la compu: flechas para apuntar, mantener espacio para tensar y soltar para tirar."], consejos: ["Apuntá un poco al lado contrario de donde sopla el viento."], online: true },
    damas: { objetivo: "Comerle todas las fichas al rival o dejarlo sin movimientos.", como: ["Tocá una ficha tuya y después adónde moverla (en diagonal).", "Saltando una ficha rival, te la comés.", "Si llegás al otro lado, se corona y mueve para atrás también."], consejos: ["Mantené las fichas juntas para que no te las coman."], online: true },
    reversi: { objetivo: "Terminar con más fichas de tu color.", como: ["Poné una ficha encerrando fichas del rival en línea.", "Las fichas encerradas se dan vuelta y pasan a ser tuyas."], consejos: ["Las esquinas nunca se pueden dar vuelta: son las mejores."], online: true },
    mancala: { objetivo: "Juntar más semillas en tu granero.", como: ["Tocá uno de tus hoyos para sembrar: las semillas se reparten de a una hacia la derecha.", "Si la última cae en tu granero, jugás otra vez."], consejos: ["Contá las semillas para terminar justo en tu granero."], online: true },
    naval: { objetivo: "Hundir todos los barcos del rival.", como: ["Tocá una casilla del mar enemigo para disparar.", "Si acertás, tirás otra vez."], consejos: ["Cuando pegás, probá las casillas de al lado para terminar de hundirlo."], online: true },
    cuatro: { objetivo: "Juntar 4 fichas en línea (horizontal, vertical o diagonal).", como: ["Tocá una columna para soltar tu ficha."], consejos: ["Fijate siempre si el rival está por hacer 4 y tapalo."], online: true },
    tateti: { objetivo: "Hacer 3 en línea.", como: ["Tocá una casilla libre para poner tu marca."], consejos: ["El centro es la mejor casilla para empezar."], online: true },
    cajas: { objetivo: "Cerrar más cajas que el rival.", como: ["Tocá entre dos puntos para trazar una línea.", "Si cerrás una caja, es tuya y jugás otra vez."], consejos: ["Evitá trazar la tercera línea de una caja: le regalás la caja al rival."], online: true },
    tragamonedas: { objetivo: "Hacer combinaciones en las líneas para ganar fichas.", como: ["Elegí la apuesta y tocá girar.", "Los símbolos iguales en una línea pagan.", "El comodín reemplaza a cualquiera."], consejos: ["Los giros gratis y la rueda del pozo pueden dar premios enormes."], casino: true },
    faraon: { objetivo: "Hacer combinaciones egipcias en las líneas para ganar fichas.", como: ["Elegí la apuesta y tocá girar.", "Los símbolos iguales en una línea pagan; la máscara del faraón es la que más paga.", "El WILD dorado reemplaza a cualquiera y 3 papiros dan giros gratis."], consejos: ["Tiene sus propios pozos y logros, aparte del tragamonedas clásico."], casino: true },
    pirata: { objetivo: "Hacer combinaciones piratas en las líneas para ganar fichas.", como: ["Elegí la apuesta y tocá girar.", "Los símbolos iguales en una línea pagan; la calavera es la que más paga.", "El WILD reemplaza a cualquiera y 3 cofres dan giros gratis."], consejos: ["Tiene sus propios pozos y logros, aparte del tragamonedas clásico."], casino: true },
    rueda: { objetivo: "Que la rueda caiga en un multiplicador alto.", como: ["Elegí el riesgo (más riesgo, premios más grandes pero más ceros).", "Elegí la apuesta y girá."], consejos: [], casino: true },
    raspadita: { objetivo: "Encontrar 3 símbolos iguales.", como: ["Comprá un boleto.", "Raspá las casillas con el dedo.", "Tres iguales pagan ese premio."], consejos: [], casino: true },
    bingo: { objetivo: "Completar líneas en tus cartones.", como: ["Elegí cuántos cartones (de 1 a 4) y jugá.", "Salen 32 bolillas y se marcan solas.", "Cada línea completa paga."], consejos: [], casino: true },
    keno: { objetivo: "Que salgan los números que elegiste.", como: ["Elegí de 1 a 10 números del 1 al 40 (o tocá 🎲 Al azar).", "Tocá Jugar: salen 10 bolillas.", "Cuantos más aciertos, más ganás."], consejos: [], casino: true },
    blackjack: { objetivo: "Llegar más cerca de 21 que la banca, sin pasarte.", como: ["Elegí la apuesta.", "Pedí carta o plantate.", "Las figuras valen 10 y el as 1 u 11."], consejos: ["La banca pide hasta tener 17 o más."], casino: true },
    baccarat: { objetivo: "Adivinar qué mano queda más cerca de 9.", como: ["Apostá a Jugador, Banca o Empate.", "Las cartas se reparten solas con las reglas oficiales."], consejos: ["Jugador paga 1 a 1, Banca 0.95 a 1 y Empate 8 a 1."], casino: true },
    videopoker: { objetivo: "Armar la mejor mano de póker.", como: ["Elegí la apuesta y repartí.", "Tocá las cartas que querés guardar.", "Cambiá las otras: la mano final paga según la tabla."], consejos: ["Con un par o mejor, guardalo."], casino: true },
    mayormenor: { objetivo: "Adivinar si la próxima carta es mayor o menor.", como: ["Elegí mayor o menor.", "Cada acierto multiplica tu premio.", "Cobrá cuando quieras o saltá la carta."], consejos: ["Cobrá antes de arriesgarte con cartas del medio."], casino: true },
    ruleta: { objetivo: "Que la bola caiga donde apostaste.", como: ["Elegí una ficha y tocá dónde apostar (número, color, docena…).", "Girá la ruleta."], consejos: ["Un número solo paga 35 a 1; rojo o negro paga 1 a 1."], casino: true },
    sicbo: { objetivo: "Adivinar el resultado de los 3 dados.", como: ["Poné fichas en una o varias apuestas del paño.", "Tirá los dados."], consejos: ["Chico y grande son las más seguras."], casino: true },
    dados: { objetivo: "Acertar la suma o la combinación de dos dados.", como: ["Elegí tu apuesta y tirá."], consejos: [], casino: true },
    crash: { objetivo: "Retirarte antes de que explote el cohete.", como: ["Elegí la apuesta y tocá 🚀 Despegar.", "El multiplicador sube mientras el cohete vuela.", "Retirate antes de que explote para cobrar."], consejos: ["Podés elegir un retiro automático (1.5×, 2×…).", "Puede explotar en cualquier momento: no te confíes."], casino: true },
    minas: { objetivo: "Encontrar gemas sin pisar una bomba.", como: ["Elegí cuántas bombas hay (más bombas, más paga) y la apuesta.", "Tocá 💎 Empezar y después las baldosas: cada gema sube el multiplicador.", "Cobrá antes de pisar una bomba."], consejos: [], casino: true },
    vida: { objetivo: "Vivir la vida de tu personaje y, si se da, armar una historia con el de tu amigo.", como: ["Creá tu personaje: nombre, si nace mujer u hombre y cómo se ve.", "Cada día tiene mañana, tarde y noche: elegí a dónde ir. Trabajar da plata, estudiar mejora el trabajo, salir levanta el ánimo.", "Si los dos van al mismo lugar con gente el mismo día y momento, se cruzan.", "Después, con más relación, se destraban citas, salir, ser pareja, vivir juntos y casarse. El otro acepta o rechaza."], consejos: ["Cada uno juega a su ritmo: lo que hiciste queda guardado y el otro lo encuentra cuando juega.", "Con protección la chance de embarazo baja un 99%."], online: true },
    dado: { objetivo: "Que el número que sale caiga en tu zona verde.", como: ["Mové la barra para elegir el objetivo y si tiene que salir más o menos.", "Menos chance = paga más. Tocá Tirar.", "Con Auto tira solo hasta que lo pares."], consejos: [], casino: true },
    limbo: { objetivo: "Que el número que sale sea igual o mayor que tu objetivo.", como: ["Elegí un multiplicador objetivo con − y + o los atajos.", "Tocá Jugar: si sale tu objetivo o más, cobrás la apuesta por ese multiplicador.", "Más alto el objetivo, menos chance."], consejos: [], casino: true },
    torre: { objetivo: "Subir lo más alto posible sin abrir una trampa.", como: ["Elegí la dificultad (cuántas puertas y trampas hay por piso) y tocá Empezar.", "En cada piso tocá una puerta: si es segura, subís y el multiplicador crece.", "Cobrá cuando quieras; si abrís una trampa, perdés la apuesta."], consejos: [], casino: true },
    calle: { objetivo: "Cruzar la mayor cantidad de carriles sin que te pise un auto.", como: ["Elegí la dificultad y tocá Empezar.", "Cada vez que tocás Avanzar cruzás un carril y el multiplicador sube.", "Cobrá cuando quieras; si te pisa un auto, perdés la apuesta."], consejos: [], casino: true },
    plinko: { objetivo: "Que la bola caiga en una casilla que multiplique mucho.", como: ["Elegí la apuesta y soltá la bola.", "Rebota entre los clavos y cae en una casilla."], consejos: [], casino: true },
};

const ESTILO = `
.boton-ayuda{flex-shrink:0;width:36px;height:36px;display:grid;place-items:center;font:inherit;font-size:1.05rem;font-weight:900;color:#1b1440;background:linear-gradient(180deg,#ffe08a,#ffbf1f);border:none;border-radius:50%;box-shadow:0 3px 10px #0006;margin-left:6px}
.boton-ayuda:active{transform:scale(.92)}
.capa-ayuda{position:fixed;inset:0;z-index:60;display:flex;align-items:center;justify-content:center;padding:16px;background:#000a;animation:aparecer-ayuda .2s ease-out}
.caja-ayuda{width:min(440px,100%);max-height:100%;overflow-y:auto;padding:18px 18px 16px;border-radius:22px;background:linear-gradient(170deg,#3a2f7a,#1e1747);border:1px solid #ffffff2e;box-shadow:0 24px 60px #000c;color:#f4f2ff;font-family:inherit;text-align:left}
.caja-ayuda h2{display:flex;align-items:center;gap:10px;margin:0 0 4px;font-size:1.3rem}
.caja-ayuda h2 span{font-size:1.8rem}
.caja-ayuda .objetivo-ayuda{margin:10px 0 12px;padding:10px 12px;border-radius:12px;background:#ffcc3322;border:1px solid #ffcc3355;font-weight:700;font-size:.95rem}
.caja-ayuda h3{margin:12px 0 6px;font-size:.78rem;letter-spacing:.06em;text-transform:uppercase;color:#ffcc33}
.caja-ayuda ol,.caja-ayuda ul{margin:0;padding-left:20px;display:flex;flex-direction:column;gap:6px;font-size:.92rem;line-height:1.35}
.caja-ayuda .nota-ayuda{margin-top:12px;font-size:.8rem;color:#b9b3e0}
.caja-ayuda button.entendido{width:100%;margin-top:14px;padding:13px;font:inherit;font-weight:900;font-size:1rem;color:#1b1440;background:linear-gradient(180deg,#ffe08a,#ffbf1f);border:none;border-radius:14px}
@keyframes aparecer-ayuda{from{opacity:0}}
@media (max-width:430px){.barra-juego{gap:6px;padding-left:8px;padding-right:8px}.boton-ayuda{width:32px;height:32px;margin-left:0}.barra-juego .boton-base{width:34px;height:34px}.barra-juego>*{min-width:0}}
`;

export function montarAyuda(id) {
    const datos = AYUDA[id];
    const barra = document.querySelector(".barra-juego");
    if (!datos || !barra || barra.querySelector(".boton-ayuda")) return;
    const estilo = document.createElement("style");
    estilo.textContent = ESTILO;
    document.head.appendChild(estilo);

    const boton = document.createElement("button");
    boton.type = "button";
    boton.className = "boton-ayuda";
    boton.textContent = "?";
    boton.setAttribute("aria-label", "Cómo jugar");
    boton.addEventListener("click", () => abrir(id));
    barra.appendChild(boton);

    // La primera vez, la ayuda aparece sola
    let vista = true;
    try {
        vista = localStorage.getItem(`ayuda-vista-${id}`) === "1";
    } catch {}
    if (!vista) esperarYAbrir(id, 0);
}
// Espera a que se cierren otras ventanas (regalo diario, "¡Volviste!") para no encimarse
function esperarYAbrir(id, intentos) {
    setTimeout(() => {
        if (document.querySelector(".capa-ayuda")) return;
        if (document.querySelector(".fondo-base") && intentos < 120) return esperarYAbrir(id, intentos + 1);
        abrir(id);
    }, 700);
}

function abrir(id) {
    const d = AYUDA[id];
    const juego = (window.JUEGOS ?? []).find((j) => j.carpeta === `games/${id}/`);
    const titulo = juego?.nombre ?? document.querySelector(".barra-juego h1")?.textContent ?? "Cómo jugar";
    const emoji = juego?.emoji ?? "🎮";
    const capa = document.createElement("div");
    capa.className = "capa-ayuda";
    capa.innerHTML = `<div class="caja-ayuda" role="dialog" aria-label="Cómo jugar">
        <h2><span>${emoji}</span>Cómo jugar · ${titulo}</h2>
        <p class="objetivo-ayuda">🎯 ${d.objetivo}</p>
        <h3>Paso a paso</h3><ol>${d.como.map((p) => `<li>${p}</li>`).join("")}</ol>
        ${d.consejos.length ? `<h3>Consejos</h3><ul>${d.consejos.map((p) => `<li>${p}</li>`).join("")}</ul>` : ""}
        ${d.online ? `<p class="nota-ayuda">👥 Podés jugar contra la compu o tocar «Jugar con un amigo» y elegir a quién desafiar: cada uno juega desde su celular.</p>` : ""}
        ${d.casino ? `<p class="nota-ayuda">🪙 ${CASINO}</p>` : ""}
        <button type="button" class="entendido">¡Entendido!</button></div>`;
    const cerrar = () => {
        capa.remove();
        try {
            localStorage.setItem(`ayuda-vista-${id}`, "1");
        } catch {}
    };
    capa.addEventListener("click", (e) => {
        if (e.target === capa || e.target.closest(".entendido")) cerrar();
    });
    addEventListener("keydown", function teclas(e) {
        if (!capa.isConnected) return removeEventListener("keydown", teclas);
        if (e.key === "Escape") cerrar();
    });
    document.body.appendChild(capa);
}
