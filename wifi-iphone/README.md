# DEXTER WiFi Portal — iPhone

Panel web independiente adaptado al iPhone. Abre la interfaz de exploración Wi-Fi de un módulo Realtek compatible, desde Safari y sin jailbreak.

## Archivo binario examinado

- Archivo recibido de 733184 bytes, SHA-256: `934c0d1ca02c8272457e0fa8ba0961c1f034065de1881f2fb96d3dd538c123d3`.
- Firma de cabecera `81958711`, empleada en imágenes Realtek Ameba. El archivo incluye texto `RTL8720dn-Deauther` y una interfaz HTML para 2.4 y 5 GHz.
- No se publica el binario, no se replica su funcionalidad disruptiva y no se ha probado en hardware físico. No debe instalarse en placas de modelo desconocido.

## Usar en iPhone

1. Utiliza una placa Realtek RTL8720DN con firmware compatible ya instalado. El iPhone por sí solo no hace el escaneo.
2. Conecta Ajustes → Wi-Fi a la red que emite el módulo. Introduce la contraseña real configurada en él.
3. Desde el portal pulsa «Abrir escáner Wi-Fi real». Se abrirá `http://192.168.1.1/`, o la IPv4 privada elegida, en Safari.
4. El listado de redes y los botones de exploración están en la web del **dispositivo**, no en GitHub Pages.
5. Para añadir el portal al iPhone: Safari → Compartir → Añadir a pantalla de inicio.

## Detalles técnicos

Archivos estáticos aptos para GitHub Pages, instalables como aplicación web. La dirección IPv4 privada se valida y almacena solamente en `localStorage` del navegador. No se capturan ni envían contraseñas. La PWA usa un service worker para acceso offline al portal, no para escaneo offline.

El firmware utiliza un servidor HTTP local. Un sitio HTTPS de GitHub Pages no puede leer de forma universal su respuesta HTTP por CORS, seguridad de contenido mixto y restricciones de acceso a redes privadas de los navegadores; por eso se usa navegación directa y no se simulan resultados.

La app no puede programar el chip ni instalar el `.bin` en un iPhone. Para instalar firmware en hardware compatible se necesita un método de flasheo apropiado al modelo, independiente de esta app. No se incluyen deautenticación, desconexión forzada ni ataques de red. Usa solo redes y equipos propios o expresamente autorizados.

## Desarrollo

Todo el portal está en `index.html` sin dependencias, con `manifest.webmanifest`, `sw.js` e `icon.svg`.

URL esperada al tener GitHub Pages activo en el repositorio:
`https://h4cklaboratory.github.io/dexter-ai-web/wifi-iphone/`
