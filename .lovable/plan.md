Actualizaré solo el favicon del navegador usando la imagen subida `Icon-2.jpg`.

Plan:
1. Copiar la imagen subida a un archivo temporal para procesarla.
2. Recortar el contenido útil del logo eliminando márgenes blancos exteriores.
3. Crear un favicon PNG cuadrado de 512x512 con fondo negro sólido, centrando el icono para que no aparezcan bordes blancos.
4. Conservar las partes blancas internas del símbolo, porque forman parte del logo.
5. Guardar el resultado como `public/favicon.png` y actualizar el enlace de `index.html` con una nueva versión para evitar caché del navegador.
6. Verificar por script que las esquinas y bordes del favicon sean negros, no blancos.