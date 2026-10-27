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
├── publicar.ps1          # Sube los cambios a GitHub Pages
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
4. Publicalo con `publicar.ps1` (ver abajo).

## Probar en la PC

Ejecutá en la carpeta del proyecto y abrí http://localhost:8080:

```bash
powershell -ExecutionPolicy Bypass -File servidor.ps1
```

## Publicar cambios

La app está publicada en **https://patosk-r1.github.io/proyecto-tp/** (repo `PatOsk-r1/proyecto-tp`).

Para subir lo que cambiaste, ejecutá en la carpeta del proyecto:

```bash
powershell -ExecutionPolicy Bypass -File publicar.ps1
```

El script sube solo los archivos nuevos o modificados y aumenta solo la `VERSION` de `sw.js`, para que el iPhone baje los cambios. Con `-Probar` muestra qué subiría sin subir nada. Necesita GitHub CLI con la sesión iniciada (`gh auth login`).

## Instalar en el iPhone

En el iPhone:

1. Abrí la dirección en **Safari**.
2. Tocá **Compartir** → **Agregar a inicio**.
3. Aparece el ícono "TP" en la pantalla de inicio y se abre a pantalla completa.

## Autor

- Patricio
