// Reflejos: esperá a que la pantalla se ponga verde y tocá lo más rápido posible.
const zona = document.getElementById("zona");
const mensaje = document.getElementById("mensaje");
const detalle = document.getElementById("detalle");

const CLAVE_RECORD = "reflejos-record";
let estado = "esperando"; // esperando → preparado → ya → resultado
let temporizador = null;
let inicio = 0;

function leerRecord() {
    try {
        return Number(localStorage.getItem(CLAVE_RECORD)) || null;
    } catch {
        return null;
    }
}

function guardarRecord(ms) {
    try {
        localStorage.setItem(CLAVE_RECORD, ms);
    } catch {}
}

function cambiar(nuevoEstado, texto, sub = "") {
    estado = nuevoEstado;
    zona.className = `zona ${nuevoEstado}`;
    mensaje.textContent = texto;
    detalle.textContent = sub;
}

function mostrarInicio() {
    const record = leerRecord();
    cambiar("esperando", "Tocá para empezar", record ? `Récord: ${record} ms` : "");
}

zona.addEventListener("pointerdown", () => {
    if (estado === "esperando" || estado === "resultado") {
        cambiar("preparado", "Esperá el verde…");
        const espera = 1500 + Math.random() * 2500;
        temporizador = setTimeout(() => {
            inicio = performance.now();
            cambiar("ya", "¡YA!");
        }, espera);
    } else if (estado === "preparado") {
        clearTimeout(temporizador);
        cambiar("resultado", "¡Muy pronto!", "Tocá para intentar de nuevo");
    } else if (estado === "ya") {
        const tiempo = Math.round(performance.now() - inicio);
        const record = leerRecord();
        const esRecord = !record || tiempo < record;
        if (esRecord) guardarRecord(tiempo);
        cambiar(
            "resultado",
            `${tiempo} ms`,
            esRecord ? "¡Nuevo récord! Tocá para jugar otra vez" : `Récord: ${record} ms · Tocá para jugar otra vez`
        );
    }
});

mostrarInicio();
