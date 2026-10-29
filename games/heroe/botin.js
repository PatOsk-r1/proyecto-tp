// Botín, mascotas y cartas del Héroe: datos y reglas (sin dibujo ni pantalla).

// ---------- Objetos ----------
export const RAREZAS = [
    { id: "comun", nombre: "Común", color: "#adb5bd", mult: 1, peso: 60 },
    { id: "rara", nombre: "Rara", color: "#4dabf7", mult: 2.2, peso: 27 },
    { id: "epica", nombre: "Épica", color: "#b388ff", mult: 4.5, peso: 10 },
    { id: "legendaria", nombre: "Legendaria", color: "#ffb703", mult: 9, peso: 3 },
];
export const rareza = (id) => RAREZAS.find((r) => r.id === id) ?? RAREZAS[0];

// Cada lugar del equipo mejora algo distinto
export const LUGARES = {
    arma: { nombre: "Arma", icono: "⚔️", stat: "toque", texto: "daño por toque", nombres: ["Espada", "Hacha", "Lanza", "Maza", "Katana"] },
    armadura: { nombre: "Armadura", icono: "🛡️", stat: "equipo", texto: "daño del equipo", nombres: ["Coraza", "Cota", "Peto", "Escudo", "Manto"] },
    amuleto: { nombre: "Amuleto", icono: "📿", stat: "oro", texto: "oro", nombres: ["Amuleto", "Anillo", "Colgante", "Talismán", "Medallón"] },
};
const ADJETIVOS = {
    comun: ["de madera", "oxidado", "simple", "del aldeano"],
    rara: ["de acero", "del guardia", "templado", "brillante"],
    epica: ["rúnico", "del dragón", "encantado", "de cristal"],
    legendaria: ["del titán", "celestial", "del abismo", "eterno"],
};
const azar = (lista) => lista[Math.floor(Math.random() * lista.length)];

// Tira una rareza; minimo sube la base (las mazmorras dan al menos raras)
export function tirarRareza(minimo = 0, suerte = 1) {
    const opciones = RAREZAS.slice(minimo);
    const pesos = opciones.map((r, i) => r.peso * (i > 0 ? suerte : 1));
    let t = Math.random() * pesos.reduce((a, b) => a + b, 0);
    for (let i = 0; i < opciones.length; i++) if ((t -= pesos[i]) < 0) return opciones[i];
    return opciones[0];
}

let contador = Date.now();
export function nuevoObjeto(etapa, minimo = 0, suerte = 1) {
    const lugar = azar(Object.keys(LUGARES));
    const r = tirarRareza(minimo, suerte);
    const L = LUGARES[lugar];
    // Bonus base en %: crece con la etapa donde se encontró
    const base = Math.round(r.mult * 6 * (1 + etapa / 25));
    return {
        id: `o${(contador++).toString(36)}`,
        lugar,
        rareza: r.id,
        nombre: `${azar(L.nombres)} ${azar(ADJETIVOS[r.id])}`,
        base,
        nivel: 0,
        critico: lugar === "amuleto" && r.mult >= 4.5 ? Math.round(r.mult / 2) : 0,
    };
}
// Bonus actual del objeto (cada nivel de forja suma 15% del base)
export const bonusObjeto = (o) => Math.round(o.base * (1 + o.nivel * 0.15));
export const costoForja = (o) => Math.ceil(4 * (o.nivel + 1) ** 1.35 * rareza(o.rareza).mult);
export const polvoAlDesarmar = (o) => Math.ceil(3 * rareza(o.rareza).mult * (1 + o.nivel * 0.6));
export const MAX_FORJA = 20;
export const MAX_INVENTARIO = 30;

// ---------- Mascotas ----------
export const MASCOTAS = [
    { id: "buho", nombre: "Búho", icono: "🦉", detalle: (n) => `+${25 + n * 10}% de oro` },
    { id: "lobo", nombre: "Lobo", icono: "🐺", detalle: (n) => `Muerde cada 2 s: ${5 + n * 2}× tu toque` },
    { id: "hada", nombre: "Hada", icono: "🧚", detalle: (n) => `+${4 + n}% de crítico y críticos más fuertes` },
    { id: "dragon", nombre: "Dragoncito", icono: "🐲", detalle: (n) => `+${40 + n * 15}% de daño del equipo` },
    { id: "gato", nombre: "Gato", icono: "🐱", detalle: (n) => `Cofres ${2 + n * 0.3}× más seguido` },
    { id: "grifo", nombre: "Grifo", icono: "🦅", detalle: (n) => `Jefes con +${8 + n * 2} s de tiempo` },
];
export const mascota = (id) => MASCOTAS.find((m) => m.id === id);

// ---------- Cartas de monstruos (una por forma y por bioma) ----------
export const FORMAS_CARTA = ["baba", "ojo", "hongo", "golem", "fantasma"];
export const NOMBRES_FORMA = { baba: "Baba", ojo: "Ojo volador", hongo: "Hongo", golem: "Gólem", fantasma: "Fantasma" };
export const BONUS_CARTA = 2; // % de daño por carta distinta
