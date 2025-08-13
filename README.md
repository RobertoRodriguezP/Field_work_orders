# WorkOps - Field Work Orders

Aplicación completa para gestión de órdenes de trabajo, con autenticación vía **Keycloak**, API backend, frontend en **React + TypeScript** y base de datos **PostgreSQL** en contenedores Docker.

## 📦 Estructura del proyecto

```
.
├── api/                 # Backend (.NET o Node.js)
├── client/              # Frontend (React + Vite + TS)
├── docker-compose.yml   # Orquestación de servicios
├── Dockerfile           # Build del frontend
├── .env.example         # Variables de entorno de ejemplo
└── pg_data/             # Volumen persistente de Postgres (ignorado en git)
```

## 🚀 Servicios

- **PostgreSQL** — Base de datos persistente.
- **Keycloak** — Identity Provider para OIDC/OAuth2.
- **API** — Backend que expone endpoints protegidos.
- **Frontend** — SPA en React + Vite + TS.
- **Adminer** — Cliente SQL web para administrar Postgres.

## 🛠 Requisitos

- [Docker](https://www.docker.com/get-started) y Docker Compose
- Node.js 20+ (solo si quieres levantar el frontend localmente)
- .NET 8 SDK (si el backend es .NET y quieres correrlo local)

## ⚙️ Variables de entorno

Crea un archivo `.env` en la raíz siguiendo `.env.example` y ajusta:

```env
POSTGRES_DB=workops
POSTGRES_USER=workops
POSTGRES_PASSWORD=Passw0rd!
VITE_API_URL=http://localhost:8085
VITE_TOKEN_URL=http://localhost:8080/realms/workops/protocol/openid-connect/token
VITE_CLIENT_ID=workops-spa
```

## ▶️ Levantar el proyecto con Docker

```bash
docker compose up -d --build
```

Esto inicia:
- **workops-postgres** en `localhost:5432`
- **workops-keycloak** en `localhost:8080`
- **API** en `localhost:8085`
- **Frontend** en `localhost:8086`
- **Adminer** en `localhost:8081`

⚠️ La primera vez, espera a que `workops-postgres` esté `healthy` antes de que la API se conecte.

## 🖥 Acceso

- **Frontend**: http://localhost:8086
- **Keycloak Admin**: http://localhost:8080
- **Adminer**: http://localhost:8081

## 🔑 Credenciales iniciales

**Keycloak**:
- Usuario: `admin`
- Contraseña: `admin`

**API**:
- Realm: `workops`
- Client ID: `workops-spa`

## 🧪 Login desde Postman

1. Obtener token:
   ```
   POST http://localhost:8080/realms/workops/protocol/openid-connect/token
   Content-Type: application/x-www-form-urlencoded

   client_id=workops-spa
   grant_type=password
   username=admin1
   password=Passw0rd!
   ```

2. Usar el `access_token` para consumir API:
   ```
   GET http://localhost:8085/api/auth/me
   Authorization: Bearer <access_token>
   ```

## 🛑 Parar los servicios

```bash
docker compose down
```

Para borrar también los datos de Postgres:
```bash
docker compose down -v
```

## 📜 Licencia

Este proyecto está bajo licencia MIT.
