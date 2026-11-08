# ENDPOINTS — API Propiedad Horizontal

Contrato entre el back-end y el front-end, también útil para Postman/Insomnia/Bruno. Solo incluye lo implementado
hoy. **Lo mantiene el back-end** (regla en `CLAUDE.md` del repo de la API): se actualiza en el mismo cambio que
agrega o modifica un endpoint.

- **Base URL:** `http://localhost:8080` (variable sugerida: `{{baseUrl}}`)
- **Formato:** JSON (`Content-Type: application/json`)
- **Autenticación:** `Authorization: Bearer {{token}}` en todo excepto el login
- **Orden recomendado:** login → copiar `accessToken` a la variable `{{token}}` → resto

**Script de Postman (pestaña *Tests* del login)** para guardar el token solo:
```js
pm.collectionVariables.set("token", pm.response.json().accessToken);
```

## Resumen

| Método | Ruta | Quién (etiqueta) | Éxito |
|---|---|---|---|
| POST | `/api/auth/login` | Público | 200 |
| GET | `/api/auth/me` | `@Autenticado` | 200 |
| POST | `/api/auth/cambiar-contrasena` | `@Autenticado` | 204 |
| POST | `/api/cuentas` | `@SoloAdministrador` | 201 |
| GET | `/api/cuentas` | `@SoloAdministrador` | 200 |
| GET | `/api/cuentas/{id}` | `@SoloAdministrador` | 200 |
| PATCH | `/api/cuentas/{id}/desactivar` | `@SoloAdministrador` | 200 |
| PATCH | `/api/cuentas/{id}/reactivar` | `@SoloAdministrador` | 200 |
| GET | `/api/catalogos/{tipo}` | `@Autenticado` | 200 (solo activos) |
| GET | `/api/catalogos/{tipo}/todos` | `@SoloAdministrador` | 200 (con inactivos) |
| POST | `/api/catalogos` | `@SoloAdministrador` | 201 |
| PUT | `/api/catalogos/{id}` | `@SoloAdministrador` | 200 |
| PATCH | `/api/catalogos/{id}/desactivar` | `@SoloAdministrador` | 200 |
| PATCH | `/api/catalogos/{id}/reactivar` | `@SoloAdministrador` | 200 |
| POST | `/api/personas` | `@SoloAdministrador` | 201 |
| GET | `/api/personas` · `/api/personas/{id}` | `@SoloAdministrador` | 200 |
| PUT | `/api/personas/{id}` | `@SoloAdministrador` | 200 |
| PATCH | `/api/personas/{id}/desactivar` · `/reactivar` | `@SoloAdministrador` | 200 |
| DELETE | `/api/personas/{id}` | `@SoloAdministrador` | 204 (solo sin historia; si no, 409) |
| PATCH | `/api/personas/{id}/finalizar-vinculo` | `@SoloAdministrador` | 200 |
| GET | `/api/perfil` | `@SoloPersonaVinculada` | 200 |
| PUT | `/api/perfil` | `@SoloPersonaVinculada` | 200 |
| POST | `/api/inmuebles` | `@SoloAdministrador` | 201 |
| GET | `/api/inmuebles` · `/api/inmuebles/{id}` · `/api/inmuebles/{id}/personas` | `@SoloAdministrador` | 200 |
| POST | `/api/inmuebles/{id}/vinculos` | `@SoloAdministrador` | 201 |
| POST | `/api/vehiculos` | `@SoloAdministrador` | 201 |
| GET | `/api/vehiculos` · `/api/vehiculos/{id}` | `@SoloAdministrador` | 200 |
| PUT | `/api/vehiculos/{id}` | `@SoloAdministrador` | 200 |
| PATCH | `/api/vehiculos/{id}/desactivar` | `@SoloAdministrador` | 200 |
| GET | `/api/vehiculos/placa/{placa}` | `@SoloVigilante` | 200 |
| POST | `/api/parqueaderos` | `@SoloAdministrador` | 201 |
| GET | `/api/parqueaderos` | `@SoloAdministrador` | 200 |
| PATCH | `/api/parqueaderos/{id}/asignar` · `/liberar` · `/desactivar` | `@SoloAdministrador` | 200 |
| POST | `/api/correspondencia` | `@SoloVigilante` | 201 |
| PATCH | `/api/correspondencia/{id}/entregar` | `@SoloVigilante` | 200 |
| GET | `/api/correspondencia?personaId=` | `@SoloVigilante` | 200 |
| GET | `/api/correspondencia/mias` | `@SoloPersonaVinculada` | 200 |
| POST | `/api/pqrs` | `@SoloPersonaVinculada` | 201 |
| GET | `/api/pqrs/mias` | `@SoloPersonaVinculada` | 200 |
| GET | `/api/pqrs` | `@SoloAdministrador` | 200 |
| PATCH | `/api/pqrs/{id}/atender` | `@SoloAdministrador` | 200 |
| GET | `/api/tipos-persona` | `@Autenticado` | 200 (solo activos) |
| POST | `/api/zonas-comunes` | `@SoloAdministrador` | 201 |
| GET | `/api/zonas-comunes` · `/api/zonas-comunes/{id}` · `/api/zonas-comunes/{id}/disponibilidad?fecha=` | `@Autenticado` | 200 (solo activas en el listado) |
| GET | `/api/zonas-comunes/todas` | `@SoloAdministrador` | 200 (con inactivas) |
| PUT | `/api/zonas-comunes/{id}` | `@SoloAdministrador` | 200 |
| PATCH | `/api/zonas-comunes/{id}/desactivar` · `/reactivar` | `@SoloAdministrador` | 200 |
| POST | `/api/reservas` | `@SoloResidente` | 201 |
| GET | `/api/reservas/mias` | `@SoloResidente` | 200 |
| PATCH | `/api/reservas/{id}/cancelar` | `@SoloResidente` | 200 |
| GET | `/api/reservas` | `@SoloAdministrador` | 200 |
| PATCH | `/api/reservas/{id}/aprobar` · `/rechazar` · `/anular` · `/finalizar` | `@SoloAdministrador` | 200 |
| POST | `/api/mantenimientos` | `@SoloAdministrador` | 201 |
| GET | `/api/mantenimientos` · `/api/mantenimientos/{id}` | `@SoloAdministrador` | 200 |
| PUT | `/api/mantenimientos/{id}` | `@SoloAdministrador` | 200 (solo si está Programado) |
| PATCH | `/api/mantenimientos/{id}/iniciar` · `/finalizar` · `/cancelar` | `@SoloAdministrador` | 200 |

**Valores de enums**
- `rol` (`ERolCuenta`): `ADMINISTRADOR`, `VIGILANTE`, `PERSONA_VINCULADA`
- `tipo` (`ETipoCatalogo`): `TIPO_DOCUMENTO`, `TIPO_INMUEBLE`, `TIPO_VEHICULO`, `TIPO_CORRESPONDENCIA`, `TIPO_PQRS`, `TIPO_MANTENIMIENTO`

---

## Autenticación

### POST `/api/auth/login` — público
Body:
```json
{
  "correo": "admin@ph.com",
  "contrasena": "Admin-12345"
}
```
200:
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiJ9...",
  "tokenType": "Bearer",
  "expiresIn": 3600
}
```
401 (clave incorrecta, cuenta inexistente o inactiva; el mensaje es siempre el mismo):
```json
{ "estado": 401, "error": "Unauthorized", "mensaje": "Credenciales invalidas", "ruta": "/api/auth/login", "fecha": "2026-11-07T21:00:00Z", "detalles": [] }
```

### GET `/api/auth/me` — `@Autenticado`
Sin body. Devuelve la identidad que afirma el token (no consulta la BD).
```json
{
  "cuentaId": 1,
  "correo": "admin@ph.com",
  "rol": "ADMINISTRADOR",
  "personaId": null,
  "autoridades": ["ROLE_ADMINISTRADOR"]
}
```
Una persona vinculada con vínculo vigente recibe además `ROLE_PROPIETARIO` y/o `ROLE_RESIDENTE` según su `TipoPersona`.

### POST `/api/auth/cambiar-contrasena` — `@Autenticado`
Body (`nueva`: 8–72 caracteres):
```json
{
  "actual": "Admin-12345",
  "nueva": "NuevaClave-456"
}
```
204 sin cuerpo. 422 si `actual` es incorrecta o `nueva` es igual a la actual.
Los tokens ya emitidos siguen válidos hasta expirar; haz login de nuevo.

---

## Cuentas (CU-005) — `@SoloAdministrador`

### POST `/api/cuentas`
Body para un vigilante o administrador (`personaId` opcional):
```json
{
  "correo": "vigilante@ph.com",
  "contrasena": "Clave-segura-1",
  "rol": "VIGILANTE"
}
```
Body para una persona vinculada (`personaId` **obligatorio**; la persona debe existir y no tener cuenta):
```json
{
  "correo": "ana@ph.com",
  "contrasena": "Clave-segura-1",
  "rol": "PERSONA_VINCULADA",
  "personaId": 1
}
```
201:
```json
{
  "id": 2,
  "correo": "vigilante@ph.com",
  "rol": "VIGILANTE",
  "activa": true,
  "personaId": null,
  "fechaUltimoAcceso": null
}
```
Errores: 400 (correo vacío o `contrasena` < 8 o > 72), 404 (`personaId` no existe), 409 (correo duplicado o persona ya con cuenta), 422 (`PERSONA_VINCULADA` sin `personaId`).

### GET `/api/cuentas`
Sin body. Devuelve un arreglo de objetos con la forma de la respuesta anterior.

### GET `/api/cuentas/{id}`
Sin body. 200 con la cuenta; 404 si no existe.

### PATCH `/api/cuentas/{id}/desactivar` · PATCH `/api/cuentas/{id}/reactivar`
Sin body. 200 con la cuenta actualizada (`activa` true/false). 422 si intentas desactivar tu propia cuenta.

---

## Catálogos (CU-006)

Los nombres son únicos por tipo, sin distinguir mayúsculas.

**Valores sembrados al arrancar** (el administrador puede renombrarlos, desactivarlos o agregar más; los `id` los da `GET /api/catalogos/{tipo}`; los desactivados no se reactivan solos):

| `tipo` | Valores iniciales | Se usa en |
|---|---|---|
| `TIPO_INMUEBLE` | Apartamento, Casa, Local comercial, Parqueadero | `tipoId` de `POST /api/inmuebles` y `/api/parqueaderos` |
| `TIPO_DOCUMENTO` | Cédula de ciudadanía, Cédula de extranjería, Pasaporte, NIT | `tipoDocumentoId` de `POST /api/personas` |
| `TIPO_VEHICULO` | Carro, Moto, Bicicleta | `tipoId` de `/api/vehiculos` |
| `TIPO_CORRESPONDENCIA` | Paquete, Carta, Documento | `tipoId` de `POST /api/correspondencia` |
| `TIPO_PQRS` | Petición, Queja, Reclamo, Sugerencia | `tipoId` de `POST /api/pqrs` |
| `TIPO_MANTENIMIENTO` | Preventivo, Correctivo | mantenimientos (aún sin endpoint) |

Para llenar un `<select>` pide siempre la lista al API (`GET /api/catalogos/{tipo}`), no escribas los `id` en el front.

### GET `/api/catalogos/{tipo}` — `@Autenticado`
Ejemplo: `GET /api/catalogos/TIPO_VEHICULO`. Solo valores activos. 400 si `{tipo}` no es un valor válido del enum.
```json
[
  { "id": 1, "tipo": "TIPO_VEHICULO", "nombre": "Moto", "activo": true }
]
```

### GET `/api/catalogos/{tipo}/todos` — `@SoloAdministrador`
Igual que el anterior pero incluye inactivos.

### POST `/api/catalogos` — `@SoloAdministrador`
Body:
```json
{
  "tipo": "TIPO_VEHICULO",
  "nombre": "Moto"
}
```
201 con el valor creado (`{ "id": 1, "tipo": "TIPO_VEHICULO", "nombre": "Moto", "activo": true }`). 409 si ya existe ese nombre en el tipo.

### PUT `/api/catalogos/{id}` — `@SoloAdministrador`
Renombra (el tipo no cambia). Body:
```json
{
  "nombre": "Motocicleta"
}
```
200 con el valor actualizado. 404 si no existe; 409 si el nombre ya existe en ese tipo.

### PATCH `/api/catalogos/{id}/desactivar` · PATCH `/api/catalogos/{id}/reactivar` — `@SoloAdministrador`
Sin body. 200 con el valor actualizado (`activo` true/false).

---

## Personas, inmuebles y vehículos (CU-008, 009, 010, 012, 013)

**Origen de los ids de tipo** (no uses ids fijos en el front; cada base de datos asigna los suyos):
- `tipoPersonaId` → `GET /api/tipos-persona`
- `tipoDocumentoId` y el `tipoId` de inmuebles, parqueaderos, vehículos, correspondencia y PQRS → `GET /api/catalogos/{tipo}`

### GET `/api/tipos-persona` — `@Autenticado`
Sin body. Solo tipos activos, ordenados por nombre. Sirve para cargar el selector del formulario de personas y de vinculaciones.
```json
[
  { "id": 4, "nombre": "Propietario", "descripcion": "Dueno del inmueble que no lo habita", "esPropietario": true, "esResidente": false },
  { "id": 5, "nombre": "Propietario residente", "descripcion": "Dueno que ademas habita el inmueble", "esPropietario": true, "esResidente": true },
  { "id": 6, "nombre": "Residente", "descripcion": "Habita el inmueble sin ser propietario", "esPropietario": false, "esResidente": true }
]
```
Los ids del ejemplo son ilustrativos. Un `tipoPersonaId` inexistente en `POST /api/personas` responde 404 («Tipo de persona con id N no existe»).

**POST `/api/personas`**
```json
{ "tipoPersonaId": 1, "tipoDocumentoId": 1, "numeroDocumento": "1001", "nombres": "Ana", "apellidos": "Ruiz",
  "telefono": "3000000000", "correo": "ana@ph.com", "autorizaTratamientoDatos": true }
```
201: `{ id, nombres, apellidos, tipoDocumento, numeroDocumento, tipoPersonaId, tipoPersona, telefono, correo, activa, inmuebleId, vinculoVigente }`. 409 documento duplicado.

**PUT `/api/personas/{id}`** (admin) y **PUT `/api/perfil`** (la propia persona) usan el mismo cuerpo; el documento y su tipo no cambian:
```json
{ "nombres": "Ana María", "apellidos": "Ruiz", "telefono": "3000000000", "correo": "ana@ph.com" }
```
200 con la persona (mismo cuerpo que `POST`). 400 si faltan `nombres`/`apellidos` o el correo es inválido; 404 si la persona no existe. El `correo` es el de **contacto** de la persona; no cambia el correo de acceso de la cuenta.
**GET `/api/perfil`**: devuelve la persona del token (solo cuentas `PERSONA_VINCULADA`; admin y vigilante reciben 403).
**PATCH `/api/personas/{id}/desactivar`** → `{ "motivo": "…" }` · **`/reactivar`** sin body. Una persona inactiva deja de tener vínculo vigente (el inmueble puede pasar a no ocupado).
**DELETE `/api/personas/{id}`**: borrado físico **solo si la persona no tiene historia** (nunca fue vinculada a un inmueble ni tiene cuenta, vehículos, PQRS, reservas, correspondencia, pre-registros, notificaciones o visitas). Con historia responde 409: usa `desactivar`.

**POST `/api/inmuebles`** → `{ "torreBloque": "A", "numero": "101", "piso": 1, "tipoId": 2 }`.
201: `{ id, torreBloque, numero, piso, tipo, propietario, ocupado, activo }`. 409 si (torre, número) existe.

**POST `/api/inmuebles/{id}/vinculos`** → `{ "personaId": 1, "tipoPersonaId": 1, "fechaInicio": "2026-11-07" }` (`fechaInicio` opcional = hoy).
201 con la persona. 409 si ya tiene un vínculo vigente.
**PATCH `/api/personas/{id}/finalizar-vinculo`** → `{ "motivo": "Se mudó" }`. 422 si no hay vínculo vigente.

**POST `/api/vehiculos`** → `{ "personaId": 1, "inmuebleId": 1, "placa": "abc123", "tipoId": 3, "marca": "Yamaha", "color": "Negro" }`.
201: `{ id, placa, tipo, marca, color, activo, personaId, responsable, inmuebleId, inmueble }`. 409 placa duplicada;
422 sin vínculo vigente o inmueble en el máximo. **PUT** `/{id}` → `{ tipoId, marca, color }`. **PATCH** `/{id}/desactivar` → `{ "motivo": "..." }`.
**GET `/api/vehiculos/placa/{placa}`** (vigilante) → mismo cuerpo; 404 si no existe.

---

## Parqueaderos, correspondencia y PQRS (CU-014, 022, 023, 029, 030, 031)

**POST `/api/parqueaderos`** → `{ "torreBloque": "P", "numero": "1", "piso": 0, "tipoId": 2 }` (`tipoId` de `TIPO_INMUEBLE`).
201: `{ id, torreBloque, numero, piso, tipo, inmuebleAsociadoId, inmuebleAsociado, activo, disponible }`.
**PATCH** `/{id}/asignar` → `{ "inmuebleId": 1 }` (409 si ya está asignado) · `/liberar` (sin body) · `/desactivar` → `{ "motivo": "..." }`.
Los parqueaderos **no** salen en `GET /api/inmuebles` ni se les vinculan personas.

**POST `/api/correspondencia`** (vigilante) → `{ "inmuebleId": 1, "personaId": 1, "tipoId": 4, "remitente": "Amazon", "descripcion": "Caja" }`
(`personaId` opcional: sin él va al inmueble; si viene, debe tener vínculo vigente con ese inmueble).
201: `{ id, remitente, destinatario, personaId, inmuebleId, inmueble, tipo, descripcion, fechaRecepcion, fechaEntrega, estado, nombreRecibe }`.
**PATCH** `/{id}/entregar` → `{ "nombreRecibe": "Ana Ruiz", "documentoRecibe": "1001" }`; 422 si ya está entregada.
**GET `/mias`**: las dirigidas a la persona del token y las dirigidas a su inmueble vigente.

**POST `/api/pqrs`** (persona con vínculo vigente) → `{ "tipoId": 5, "asunto": "Ruido", "descripcion": "...", "adjunto": "foto.png" }`
(`adjunto` es solo una referencia; la API no guarda el archivo). 201: `{ id, tipo, asunto, descripcion, adjunto, fechaRadicacion, estado, respuesta, fechaRespuesta, vencida, personaId, solicitante, inmueble }`.
**PATCH `/api/pqrs/{id}/atender`** (admin) → `{ "respuesta": "..." }`; 422 si ya fue respondida.

**Estados sembrados:** correspondencia Pendiente→Entregada · PQRS Radicada→En tramite→Respondida · reserva Pendiente→Aprobada/Rechazada/Cancelada, Aprobada→Cancelada/Finalizada · mantenimiento Programado→En curso→Completado (Cancelado desde ambos).

**Tipos de persona sembrados** (`tipoPersonaId` de `POST /api/personas` y de los vínculos): `Propietario`, `Residente`, `Propietario residente`. "Persona vinculada" no es un tipo: es el rol de cuenta (`PERSONA_VINCULADA`). Se listan con `GET /api/tipos-persona`.

---

## Zonas comunes y reservas (CU-024, 025, 026, 027)

Formatos: fecha `yyyy-MM-dd`, hora `HH:mm`. `diaSemana` (`EDiaSemana`): `LUNES` … `DOMINGO`. `tipoUso` (`ETipoUsoZona`): `EXCLUSIVO`, `COMPARTIDO`. `periodoLimite` (`EPeriodoLimite`): `DIA`, `SEMANA`, `MES`.

**POST `/api/zonas-comunes`** (admin; **PUT** `/{id}` usa el mismo cuerpo y reemplaza los horarios)
```json
{ "nombre": "Salón social", "descripcion": "…", "capacidadMaxima": 40, "tipoUso": "EXCLUSIVO",
  "requiereAprobacion": true, "duracionMaximaMinutos": 240, "anticipacionMinimaHoras": 24,
  "anticipacionMaximaDias": 30, "limiteCancelacionHoras": 12, "maxReservasPorInmueble": 2, "periodoLimite": "MES",
  "horarios": [ { "diaSemana": "SABADO", "horaInicio": "08:00", "horaFin": "22:00" } ] }
```
`horarios` exige al menos uno. Un `0` en una regla numérica = sin restricción; `periodoLimite` es obligatorio si `maxReservasPorInmueble > 0`. 201/200 devuelve el mismo cuerpo más `id` y `activa`. 400 sin horarios o campos inválidos; 409 nombre repetido; 422 regla incumplida (`horaFin` ≤ `horaInicio`, falta `periodoLimite`).
**PATCH** `/{id}/desactivar` → `{ "motivo": "…" }` · `/reactivar` (sin body).
**GET `/{id}/disponibilidad?fecha=2026-11-14`** → `{ "fecha", "horarios": [ {diaSemana, horaInicio, horaFin} ], "ocupadas": [ {horaInicio, horaFin, estado} ] }` (franjas reservables ese día y reservas vigentes).

**POST `/api/reservas`** (residente con vínculo vigente)
```json
{ "zonaId": 1, "fecha": "2026-11-14", "horaInicio": "10:00", "horaFin": "14:00", "numeroAsistentes": 25, "motivo": "Cumpleaños" }
```
`numeroAsistentes` = invitados que asisten (incluye a quien reserva). 201:
`{ id, zonaId, zona, personaId, solicitante, inmuebleId, inmueble, fecha, horaInicio, horaFin, numeroAsistentes, motivo, condicionesUso, motivoRechazoCancelacion, estado, fechaRegistro, puedeCancelar }`.
`estado` nace `Aprobada` si la zona no requiere aprobación, o `Pendiente` si la requiere. 409 si el horario se cruza con otra reserva vigente; 422 si incumple horario de la zona, capacidad, duración, anticipación o el máximo por inmueble y periodo.
**GET `/mias`**: reservas de la persona del token (`puedeCancelar` indica si aún está dentro del plazo de la zona).
**PATCH `/{id}/cancelar`** (residente, solo las suyas; ajenas = 404) → `{ "motivo": "…" }`. 422 fuera del plazo o ya final.

**Administrador:** **GET `/api/reservas`** (todas) · **PATCH** `/{id}/aprobar` → `{ "condiciones": "…" }` (body opcional) · `/rechazar` → `{ "motivo": "…" }` · `/anular` → `{ "motivo": "…" }` (cancela sin límite de horas) · `/finalizar` (sin body). 422 si la transición no es válida desde el estado actual (p. ej. aprobar una rechazada).

---

## Mantenimientos (CU-028) — `@SoloAdministrador`

Formato de fecha y hora: `yyyy-MM-ddTHH:mm` (hora local, igual que las reservas). `tipoId` de `GET /api/catalogos/TIPO_MANTENIMIENTO`.

**POST `/api/mantenimientos`** (programar)
```json
{ "zonaComunId": 1, "tipoId": 15, "elementoArea": "Piscina", "descripcion": "Cambio de filtros",
  "fechaHoraInicio": "2026-11-14T09:00", "fechaHoraFin": "2026-11-14T13:00", "responsable": "Aguas S.A." }
```
`zonaComunId` es opcional: si viene, la zona queda **bloqueada para reservas** durante el mantenimiento; sin él es un mantenimiento general (ascensor, portería…). `fechaHoraFin` es opcional (periodo abierto). 201:
`{ id, zonaComunId, zonaComun, tipo, elementoArea, descripcion, fechaHoraInicio, fechaHoraFin, responsable, observaciones, motivoCancelacion, estado }` con `estado` = `Programado`.
Errores: 400 campos inválidos; 404 zona o tipo inexistente; 409 si la zona ya tiene **reservas vigentes** en ese periodo (anúlalas antes con `/api/reservas/{id}/anular`); 422 si `fechaHoraFin` ≤ inicio, el inicio está en el pasado (tolerancia 5 min) o el tipo está inactivo.

**GET** `/api/mantenimientos` (más recientes primero) · `/{id}`.
**PUT `/{id}`** → `{ "descripcion": "…", "fechaHoraInicio": "…", "fechaHoraFin": "…", "responsable": "…" }`. Solo mientras está `Programado` (422 si ya inició, terminó o se canceló); zona, tipo y elemento no cambian. Vuelve a validar fechas y reservas.
**PATCH `/{id}/iniciar`** (Programado → En curso, sin body) · **`/finalizar`** → `{ "observaciones": "…" }` (body opcional; En curso → Completado; si no tenía fin, se fija al momento de finalizar) · **`/cancelar`** → `{ "motivo": "…" }` (obligatorio; desde Programado o En curso). 422 si la transición no es válida.

**Efecto en reservas:** mientras un mantenimiento de una zona esté `Programado` o `En curso`, `POST /api/reservas` responde **409** para horarios que lo crucen, y `GET /api/zonas-comunes/{id}/disponibilidad` lo incluye en `ocupadas` con `"estado": "Mantenimiento"`. Al completarse o cancelarse, el horario se libera.

---

## Códigos de error comunes

Todos los errores usan el mismo cuerpo:
```json
{
  "estado": 400,
  "error": "Bad Request",
  "mensaje": "Solicitud invalida",
  "ruta": "/api/cuentas",
  "fecha": "2026-11-07T21:00:00Z",
  "detalles": ["contrasena: el tamaño debe estar entre 8 y 72"]
}
```

| Código | Cuándo |
|---|---|
| 400 | Validación del body, JSON mal formado o valor de enum desconocido |
| 401 | Sin token, token inválido/expirado/manipulado, o credenciales inválidas (login) |
| 403 | Token válido pero el rol no tiene permiso para ese endpoint |
| 404 | El recurso no existe |
| 409 | Duplicado o conflicto de integridad |
| 422 | Regla de negocio incumplida |
