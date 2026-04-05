# Booking-web

Aplicacion de reservas con frontend estatico en `public/` y backend modular en `server/`. La rama `square` deja preparado el flujo para que una cita solo se reserve despues de pagar el importe obligatorio con Square.

## Ejecutar localmente

1. Instala dependencias:

```bash
npm install
```

2. Crea tu archivo `.env` a partir del ejemplo y completa las credenciales de Square:

```bash
copy .env.example .env
```

Variables importantes:

- `SQUARE_ENVIRONMENT`: `sandbox` o `production`
- `SQUARE_ACCESS_TOKEN`: access token de Square
- `SQUARE_APP_ID`: application id para Web Payments SDK
- `SQUARE_LOCATION_ID`: location id donde se registrara el cobro

Si no completas las variables de Square y el booking fee sigue activo en el panel admin, el sitio deshabilita la reserva online hasta que Square quede configurado.

3. Inicia el servidor:

```bash
npm start
```

4. Abre en tu navegador:

```text
http://localhost:3000
```

## Estructura

- `public/`: frontend publico, admin y assets
- `public/js/`: modulos del cliente
- `server/`: configuracion, base de datos y servicios del backend
- `server.js`: bootstrap del servidor
- `appointments.db`: base de datos SQLite local
- `.env` y `.env.example`: variables necesarias para entorno local

## Square

Cuando Square esta configurado:

- El frontend carga Square Web Payments SDK segun el entorno configurado.
- El formulario tokeniza la tarjeta en el navegador.
- El backend cobra el booking fee configurado y luego guarda la cita.
- El panel admin muestra estado de pago, monto y `square_payment_id`.

## Precios

- Los precios publicos se sirven desde la tabla `service_pricing`.
- El admin puede editar nombre, descripcion, precio, orden y visibilidad de cada servicio.
- Exactamente un servicio debe estar marcado como `Required booking fee`; ese importe es el que se cobra para reservar.
