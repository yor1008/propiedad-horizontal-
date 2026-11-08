# ENDPOINTS — API Propiedad Horizontal

Referencia para copiar a Postman/Insomnia/Bruno. Solo incluye lo implementado hoy; al agregar o cambiar un
endpoint, actualiza este archivo (regla en `CONTEXTO.md`).

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
