# Informe técnico del firmware adjunto

Fecha de inspección: 2026-10-18. Este documento registra **análisis estático**, no pruebas en una placa encendida ni en un iPhone.

## Identificación

- Archivo original recibido: `unknown(1).bin`.
- Longitud: **733,184 bytes**.
- SHA-256: `934c0d1ca02c8272457e0fa8ba0961c1f034065de1881f2fb96d3dd538c123d3`.
- Cabecera ASCII encontrada: `81958711`.
- Página HTML incorporada con título `RTL8720dn-Deauther` y encabezado `2.4G & 5G WIFI DEAUTHER`.
- Componentes/identificadores `RTL8721D` y `wlan0` visibles en cadenas. Por similitud con el código público, firmware destinado a hardware de la familia RTL8720DN, pero **la compatibilidad con un modelo de placa concreto no está validada**.

## Funciones detectadas en la interfaz incorporada

| Función observada | Evidencia estática | Usable solo con iPhone y sin placa |
|---|---|---|
| Lista de puntos de acceso y recuento | Texto `Access Points` | No a través de esta web; AirPort Utility ofrece un escaneo independiente |
| Escaneo de 2.4 GHz y 5 GHz | Secciones `2.4 GHz networks` / `5 GHz networks` | Solo usando otra app con capacidades propias |
| SSID (incluso redes ocultas), canal, BSSID y RSSI | Encabezados de tabla, marcador `**HIDDEN**` | AirPort Utility expone metadatos de escaneo, no todos los mismos datos garantizados |
| Reescanear y recargar página | Formularios de la interfaz web | No sin el dispositivo |
| Elegir objetivos y desautenticar clientes | Selección de redes y formulario de interrupción | **No**; función de emisión de tramas de la placa |
| Detener la emisión de tramas | Control de parada | No aplica si no hay hardware |
| Ver estado y contadores | Estado de emisión, LED, tramas enviadas, retraso, cantidad por ciclo | No sin la placa |
| Ajustar parámetros de emisión | Formularios de número de tramas e intervalo | No sin la placa |
| Encender y apagar LED | Formularios LED | No hay LED físico sin la placa |

La extracción de nombres y HTML permite afirmar que la interfaz **incluye** estas funciones; no demuestra que todas operen correctamente en una placa, ni certifica que el firmware recibido sea benigno. No se ha ejecutado el archivo.

## Limitaciones de iOS

El archivo es una imagen de firmware, **no un ejecutable de iOS ni una aplicación IPA**. Safari y GitHub Pages no pueden cargarla como si fueran una placa Realtek, ni convertir por software una radio iPhone en una radio con acceso a tramas Wi-Fi de bajo nivel. Apple indica que iOS no ofrece una API de propósito general para escanear y configurar redes Wi-Fi desde apps ordinarias.

Documentación: https://developer.apple.com/documentation/technotes/tn3111-ios-wifi-api-overview

## Solución práctica

**Sin comprar hardware:** abrir desde la pestaña «Sin placa» la app de Apple AirPort Utility para obtener una exploración real, parcial, de redes Wi-Fi cercanas. El resultado se muestra dentro de AirPort Utility.

**Para analizar y operar la parte de exploración del firmware:** conseguir una placa específicamente compatible con RTL8720DN, verificar revisión y procedimiento de flasheo, conectar el iPhone a la red creada por ella y abrir la dirección HTTP local. La web publicada aquí solo ofrece el acceso directo a dicho panel. Si se necesita un panel adicional personalizado, habría que probarlo con una placa física.

El portal no implementa ni ofrece interfaz de envío de tramas de desautenticación, ataques de denegación de servicio, o selección de objetivos para desconectarlos. Para diagnósticos y pruebas de conectividad, utiliza herramientas no disruptivas y equipos propios o expresamente autorizados.

## Repositorio público de referencia

Código del proyecto público relacionado: https://github.com/tesa-klebeband/RTL8720dn-Deauther. La similitud de identificadores no demuestra procedencia exacta del binario ni autorización/licencia de redistribución del binario enviado por un tercero.

**Estado de implementación:** portal iPhone publicado como archivos fuente; función «Sin placa» remite a una app real, «Módulo» abre una IP local configurable y las funciones de la placa se mantienen dependientes de hardware. No consta una prueba física ni verificación de que GitHub Pages esté activo.
