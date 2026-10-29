// Misiones en cadena de la Granja: capítulos con una historia corta. Se hacen de a una, en orden.
// tipo: cosechar | entregar | construir | fabricar | animal | recoger | nivel | mejora | lotes
// premio: { monedas, abono, garra, xp }
export const CAPITULOS = [
    {
        titulo: "Doña Rosa y la feria",
        misiones: [
            { quien: "Doña Rosa", texto: "¡Hola, granjero! Para la feria del sábado necesito trigo. ¿Me cosechás 10?", tipo: "cosechar", id: "trigo", meta: 10, premio: { monedas: 60, xp: 10 } },
            { quien: "Doña Rosa", texto: "La gente del pueblo tiene hambre. Entregá 2 pedidos y van a hablar bien de tu granja.", tipo: "entregar", meta: 2, premio: { monedas: 100, garra: 1 } },
            { quien: "Don Tito", texto: "Con más tierra vas a poder plantar más. Comprá un terreno nuevo.", tipo: "lotes", meta: 7, premio: { monedas: 120, abono: 1 } },
            { quien: "Doña Rosa", texto: "¡Quiero huevos frescos para las tortas! Juntá 5 huevos.", tipo: "recoger", id: "huevo", meta: 5, premio: { monedas: 200, xp: 20 } },
            { quien: "Don Tito", texto: "Para hacer harina hace falta un molino. ¡Construilo!", tipo: "construir", id: "molino", meta: 1, premio: { monedas: 300, garra: 1 } },
            { quien: "Doña Rosa", texto: "La feria fue un éxito gracias a vos. Hacé 3 bolsas de harina para la próxima.", tipo: "fabricar", id: "harina", meta: 3, premio: { monedas: 400, abono: 2, xp: 40 } },
        ],
    },
    {
        titulo: "La panadería del pueblo",
        misiones: [
            { quien: "El panadero", texto: "¡Qué bueno conocerte! Necesito zanahorias para un pan especial: cosechá 8.", tipo: "cosechar", id: "zanahoria", meta: 8, premio: { monedas: 300, xp: 30 } },
            { quien: "El panadero", texto: "Para hornear necesito mucha leche. Tené 2 vacas en el corral.", tipo: "animal", id: "vaca", meta: 2, premio: { monedas: 500, garra: 1 } },
            { quien: "El panadero", texto: "Construí la panadería de la granja y te enseño mi receta.", tipo: "construir", id: "panaderia", meta: 1, premio: { monedas: 800, abono: 2 } },
            { quien: "El panadero", texto: "¡Ahora hacé 3 panes caseros! Que se huela en todo el pueblo.", tipo: "fabricar", id: "pan", meta: 3, premio: { monedas: 1200, xp: 60, garra: 1 } },
            { quien: "Abuela Marta", texto: "Me contaron de tu pan… para regar mejor, mejorá la regadera 2 veces.", tipo: "mejora", id: "regadera", meta: 2, premio: { monedas: 1500, abono: 3 } },
        ],
    },
    {
        titulo: "El festival de otoño",
        misiones: [
            { quien: "La feria", texto: "¡Llega el festival! Cosechá 6 calabazas (crecen mejor en otoño 🍂).", tipo: "cosechar", id: "calabaza", meta: 6, premio: { monedas: 2000, xp: 80 } },
            { quien: "La feria", texto: "Para los quesos del festival construí la lechería.", tipo: "construir", id: "lecheria", meta: 1, premio: { monedas: 2500, garra: 1 } },
            { quien: "La feria", texto: "Hacé 4 quesos para el concurso.", tipo: "fabricar", id: "queso", meta: 4, premio: { monedas: 3500, abono: 3 } },
            { quien: "Abuela Marta", texto: "Hace frío… juntá 5 lanas para tejer bufandas.", tipo: "recoger", id: "lana", meta: 5, premio: { monedas: 4000, xp: 120 } },
            { quien: "El restaurante", texto: "Todos hablan de tu granja. Entregá 10 pedidos más.", tipo: "entregar", meta: 10, premio: { monedas: 6000, garra: 2 } },
        ],
    },
    {
        titulo: "La gran exposición",
        misiones: [
            { quien: "El restaurante", texto: "Quiero un postre de lujo: construí la dulcería.", tipo: "construir", id: "dulceria", meta: 1, premio: { monedas: 8000, abono: 4 } },
            { quien: "El restaurante", texto: "Hacé 3 frascos de mermelada de frutilla.", tipo: "fabricar", id: "mermelada", meta: 3, premio: { monedas: 12000, xp: 200 } },
            { quien: "Don Tito", texto: "Los cerdos encuentran trufas. Juntá 3.", tipo: "recoger", id: "trufa", meta: 3, premio: { monedas: 15000, garra: 2 } },
            { quien: "La escuela", texto: "Los chicos quieren visitar la granja más grande: llegá a nivel 12.", tipo: "nivel", meta: 12, premio: { monedas: 20000, abono: 5 } },
            { quien: "Doña Rosa", texto: "¡Lo lograste! Para la exposición, cosechá 5 racimos de uva.", tipo: "cosechar", id: "uva", meta: 5, premio: { monedas: 40000, garra: 3, xp: 400 } },
        ],
    },
];
