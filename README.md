# Control de Stock — app Android nativa de escaneo

App Android real (no una página web) que usa la cámara del móvil para leer
códigos de barras/QR mediante ML Kit y registra cada entrada/salida en el
mismo backend de Google Apps Script que ya montamos antes
(`Code.gs` / `Scan.html`, en la carpeta `apps_script/` del entregable
principal). El Excel `control_stock.xlsx` sigue leyendo de ese mismo
backend vía Power Query — no hay que tocar nada de eso.

No requiere Play Store ni cuenta de desarrollador: el `.apk` que se genera
es instalable directamente en tu móvil ("origen desconocido").

## Qué necesitas

- Una cuenta de GitHub (gratis).
- El backend de Apps Script ya desplegado (guía `Guia_Despliegue_Escaner_Movil.md`),
  con su URL `.../exec` y tu token.
- Un móvil Android. (iOS no está incluido en esta app — ver nota al final.)

## Paso 1 — Sube este proyecto a un repositorio en GitHub

1. Crea un repositorio nuevo en [github.com/new](https://github.com/new)
   (puede ser privado).
2. Sube el contenido de esta carpeta (`stock-scanner-app/`) tal cual a ese
   repositorio — por ejemplo, arrastrando los archivos en la web de GitHub
   ("Add file → Upload files"), o con git:

   ```bash
   cd stock-scanner-app
   git init
   git add .
   git commit -m "App de escaneo de stock"
   git branch -M main
   git remote add origin https://github.com/TU_USUARIO/TU_REPO.git
   git push -u origin main
   ```

## Paso 2 — Deja que GitHub compile el APK

En cuanto subas (`push`) a la rama `main`, el workflow
`.github/workflows/build-apk.yml` se dispara solo y compila la app en la
nube de GitHub (que sí tiene acceso completo a los repositorios de Android
y npm, a diferencia de este entorno donde preparé el proyecto).

1. Ve a la pestaña **Actions** de tu repositorio.
2. Verás la ejecución "Compilar APK Android" en marcha (tarda unos 3-6
   minutos la primera vez).
3. Si termina en verde ✅, entra en esa ejecución y descarga el artefacto
   **control-stock-apk** (es un .zip que contiene `app-debug.apk`).
4. Si termina en rojo ❌, abre el log del paso que falló — normalmente es
   algún nombre de paquete desactualizado; pégame el error y lo arreglamos.

Puedes volver a lanzarlo cuando quieras desde la pestaña Actions
("Run workflow"), sin necesidad de otro `push`.

## Paso 3 — Instala el APK en tu móvil

1. Descarga el `.zip` del artefacto en tu móvil (o pásalo por cable/Drive)
   y extrae `app-debug.apk`.
2. Ábrelo. Android te pedirá activar "Instalar apps de origen desconocido"
   para esa fuente (el gestor de archivos o el navegador) — actívalo solo
   para esta instalación si te preocupa.
3. Instala y abre la app **Control de Stock**.

## Paso 4 — Configura la app

1. Toca el icono ⚙️ arriba a la derecha.
2. Pega la misma **API_URL** y **API_TOKEN** que usaste en la hoja Config
   del Excel (tu backend de Apps Script). Guarda.
3. Toca "📷 Escanear producto", concede el permiso de cámara cuando lo
   pida el sistema (permiso nativo de Android, no del navegador), y
   escanea. Elige "+ Entrada" o "− Salida" con la cantidad.

Cada escaneo llega al instante a la Google Sheet del backend; el Excel lo
recoge en su siguiente actualización de Power Query, tal como configuramos.

## Limitaciones que debes conocer

- **CORS al confirmar el envío:** la app llama al backend de Apps Script
  igual que lo haría un navegador, y Apps Script no siempre incluye las
  cabeceras CORS necesarias para que la app pueda *leer* la respuesta. Si
  ves el mensaje "Enviado, pero sin confirmación del servidor", es
  probable que el dato SÍ se haya guardado (revisa la pestaña
  "Movimientos" de tu Google Sheet) — simplemente la app no pudo confirmar
  el resultado en pantalla. No he podido probar este punto en un
  dispositivo real desde donde estoy montando esto; si te da problemas de
  forma constante, dímelo y lo resolvemos (normalmente añadiendo una
  cabecera de respuesta en `Code.gs`).
- **Nombre exacto de paquetes npm:** dejé las dependencias de Capacitor en
  `"latest"` para que siempre se instale la versión más reciente y
  compatible entre sí en el momento de compilar. Si algún paquete cambia
  de nombre en el futuro, la compilación en Actions fallará con un error
  claro de "paquete no encontrado" — avísame y actualizo el proyecto.
- **Solo Android.** Una versión para iPhone real necesita un Mac con
  Xcode y, para instalarla sin cable, una cuenta de Apple Developer (99
  $/año) o un servicio de compilación en la nube de pago (Codemagic,
  EAS Build...). El código de `www/` (HTML/JS) es reutilizable para eso
  si en algún momento quieres dar ese paso — dímelo y lo preparamos.
- **Icono de la app:** usará el icono genérico de Capacitor por defecto.
  Si quieres un icono propio, dime y te lo genero.
