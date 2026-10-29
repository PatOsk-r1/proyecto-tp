// Colonia espacial: expediciones, eventos con decisiones, artefactos y contratos (solo datos y reglas).

// ---------- Expediciones ----------
// dur en minutos · energia: segundos de producción que trae · cristales [min, max] · artefacto: chance
export const DESTINOS = [
    { id: "luna", nombre: "Luna", icono: "🌙", dur: 2, energia: 120, cristales: [0, 1], artefacto: 0.03, detalle: "Viaje corto para empezar" },
    { id: "marte", nombre: "Marte", icono: "🔴", dur: 10, energia: 700, cristales: [1, 2], artefacto: 0.1, detalle: "Polvo rojo y algo de cristal" },
    { id: "cinturon", nombre: "Cinturón de asteroides", icono: "☄️", dur: 30, energia: 1200, cristales: [3, 6], artefacto: 0.18, detalle: "Lleno de cristales" },
    { id: "jupiter", nombre: "Júpiter", icono: "🪐", dur: 60, energia: 4000, cristales: [2, 4], artefacto: 0.25, detalle: "Muchísima energía en sus tormentas" },
    { id: "nebulosa", nombre: "Nebulosa", icono: "🌌", dur: 180, energia: 9000, cristales: [6, 10], artefacto: 1, detalle: "Siempre trae un artefacto" },
    { id: "agujero", nombre: "Agujero negro", icono: "🕳️", dur: 480, energia: 25000, cristales: [10, 16], artefacto: 1, materia: 1, detalle: "Peligroso: trae materia oscura", requiere: 3 },
];
export const destino = (id) => DESTINOS.find((d) => d.id === id);
export const MAX_NAVES = 4;
export const costoNave = (n) => [0, 25, 80, 250][n] ?? 999; // en cristales

// Eventos que pueden pasar al volver una nave (el jugador elige qué hacer)
export const EVENTOS = [
    {
        id: "senal", titulo: "📡 Señal misteriosa", texto: "La nave captó una señal rara en el camino de vuelta.",
        opciones: [
            { texto: "Investigar", riesgo: "60%: el doble · 40%: pierde la mitad", resolver: (r) => (Math.random() < 0.6 ? { mult: 2, msg: "¡Era una sonda antigua llena de energía!" } : { mult: 0.5, msg: "Era una trampa de chatarra… se perdió parte de la carga" }) },
            { texto: "Ignorarla", riesgo: "Vuelve tranquila", resolver: () => ({ mult: 1, msg: "La nave volvió sin problemas" }) },
        ],
    },
    {
        id: "piratas", titulo: "🏴‍☠️ Piratas espaciales", texto: "Una nave pirata exige parte de la carga.",
        opciones: [
            { texto: "Pagarles", riesgo: "Perdés 25%", resolver: () => ({ mult: 0.75, msg: "Les diste una parte y te dejaron pasar" }) },
            { texto: "Escapar", riesgo: "55%: +50% (botín pirata) · 45%: perdés 60%", resolver: () => (Math.random() < 0.55 ? { mult: 1.5, msg: "¡Escapaste y encima les robaste combustible!" } : { mult: 0.4, msg: "Te alcanzaron y se llevaron mucho" }) },
        ],
    },
    {
        id: "cometa", titulo: "☄️ Un cometa brillante", texto: "Pasa un cometa lleno de cristales muy cerca.",
        opciones: [
            { texto: "Perseguirlo", riesgo: "+4 cristales seguros", resolver: () => ({ mult: 1, cristales: 4, msg: "¡Juntaste cristales de la cola del cometa!" }) },
            { texto: "Seguir viaje", riesgo: "Nada cambia", resolver: () => ({ mult: 1, msg: "Lo miraste pasar… qué lindo" }) },
        ],
    },
    {
        id: "nave", titulo: "🛸 Nave abandonada", texto: "Hay una nave flotando sin tripulación.",
        opciones: [
            { texto: "Revisarla", riesgo: "50%: artefacto · 50%: nada", resolver: () => (Math.random() < 0.5 ? { mult: 1, artefacto: true, msg: "¡Adentro había un artefacto!" } : { mult: 1, msg: "Estaba vacía" }) },
            { texto: "Remolcarla", riesgo: "+30% de energía", resolver: () => ({ mult: 1.3, msg: "La vendiste como chatarra" }) },
        ],
    },
];

// ---------- Artefactos (no se pierden al saltar de galaxia; los repetidos suben de nivel) ----------
export const ARTEFACTOS = [
    { id: "cristal", icono: "💎", nombre: "Cristal cantor", efecto: "prod", valor: 0.08, texto: (n) => `+${Math.round(n * 8)}% de producción` },
    { id: "motor", icono: "🚀", nombre: "Motor antiguo", efecto: "rapidez", valor: 0.07, texto: (n) => `Expediciones ${Math.round((1 - 0.93 ** n) * 100)}% más rápidas` },
    { id: "mapa", icono: "🗺️", nombre: "Mapa estelar", efecto: "botin", valor: 0.12, texto: (n) => `Expediciones traen +${Math.round(n * 12)}%` },
    { id: "guante", icono: "🧤", nombre: "Guante de energía", efecto: "toque", valor: 0.2, texto: (n) => `Toques +${Math.round(n * 20)}%` },
    { id: "iman", icono: "🧲", nombre: "Imán de meteoritos", efecto: "meteoros", valor: 0.15, texto: (n) => `Meteoritos +${Math.round(n * 15)}% más seguido` },
    { id: "prisma", icono: "🔷", nombre: "Prisma", efecto: "cristales", valor: 0.1, texto: (n) => `+${Math.round(n * 10)}% de cristales` },
    { id: "huevo", icono: "🥚", nombre: "Huevo alienígena", efecto: "prod", valor: 0.12, texto: (n) => `+${Math.round(n * 12)}% de producción` },
    { id: "brujula", icono: "🧭", nombre: "Brújula cuántica", efecto: "rapidez", valor: 0.05, texto: (n) => `Expediciones ${Math.round((1 - 0.95 ** n) * 100)}% más rápidas` },
    { id: "reloj", icono: "⌛", nombre: "Reloj de arena estelar", efecto: "ausente", valor: 1, texto: (n) => `+${n} h de producción sin jugar` },
    { id: "corona", icono: "👑", nombre: "Corona del emperador", efecto: "prod", valor: 0.2, texto: (n) => `+${Math.round(n * 20)}% de producción` },
];
export const artefactoAlAzar = () => ARTEFACTOS[Math.floor(Math.random() * ARTEFACTOS.length)];

// ---------- Contratos ----------
// medida: qué contador se mira (sube desde que aceptás el contrato) · meta crece con la galaxia
export const TIPOS_CONTRATO = [
    { medida: "toques", texto: (n) => `Tocá el planeta ${n} veces`, base: 150 },
    { medida: "meteoros", texto: (n) => `Atrapá ${n} meteorito${n > 1 ? "s" : ""}`, base: 3 },
    { medida: "expediciones", texto: (n) => `Mandá ${n} expedicion${n > 1 ? "es" : ""}`, base: 2 },
    { medida: "compras", texto: (n) => `Construí ${n} cosas`, base: 15 },
    { medida: "energiaHecha", texto: (n) => `Producí ⚡${n}`, base: 0, energia: true },
];
