# Proyecto TP

Página web con una colección de juegos que se puede instalar en el iPhone como si fuera una app (PWA). Funciona sin internet una vez abierta.

Está hecha con HTML, CSS y JavaScript puros: no hace falta instalar nada para programarla.

## Estructura

```
Proyecto TP/
├── index.html            # Pantalla principal (lista de juegos)
├── manifest.webmanifest  # Nombre, colores e íconos de la app instalada
├── sw.js                 # Service worker: guarda archivos para usar sin internet
├── servidor.ps1          # Servidor para probar en la PC
├── css/estilos.css       # Estilos compartidos
├── js/
│   ├── juegos.js         # ← LISTA DE JUEGOS (acá se agregan los nuevos)
│   └── app.js            # Arma la pantalla principal
├── icons/                # Íconos de la app (180, 192 y 512 px)
├── games/
│   ├── _plantilla/       # Copiá esta carpeta para empezar un juego nuevo
│   └── reflejos/         # Juego de ejemplo
└── docs/notas.md         # Ideas y pendientes
```

## Agregar un juego nuevo

1. Copiá `games/_plantilla` y renombrá la copia (por ejemplo `games/memoria`).
2. Programá el juego en `index.html`, `estilo.css` y `juego.js` de esa carpeta.
3. Sumalo a la lista en `js/juegos.js`:
   ```js
   { nombre: "Memoria", descripcion: "Encontrá las parejas", emoji: "🧠", carpeta: "games/memoria/" },
   ```
4. En `sw.js`, subí el número de `VERSION` (v1 → v2) para que el iPhone baje los cambios.

## Probar en la PC

Ejecutá en la carpeta del proyecto y abrí http://localhost:8080:

```bash
powershell -ExecutionPolicy Bypass -File servidor.ps1
```

## Instalar en el iPhone

El iPhone solo instala la app si la página está publicada con **https**. Opciones gratuitas: GitHub Pages, Netlify o Cloudflare Pages (en Netlify alcanza con arrastrar la carpeta a su web).

Después, en el iPhone:

1. Abrí la dirección en **Safari**.
2. Tocá **Compartir** → **Agregar a inicio**.
3. Aparece el ícono "TP" en la pantalla de inicio y se abre a pantalla completa.

## Autor

- Patricio
