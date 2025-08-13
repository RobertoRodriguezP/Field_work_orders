# WorkOps - Field Work Orders

A complete application for managing field work orders, featuring authentication via **Keycloak**, a backend API, a **React + TypeScript** frontend, and a **PostgreSQL** database running in Docker containers.

## 📦 Project Structure

```
.
├── api/                 # Backend (.NET or Node.js)
├── client/              # Frontend (React + Vite + TS)
├── docker-compose.yml   # Service orchestration
├── Dockerfile           # Frontend build
├── .env.example         # Sample environment variables
└── pg_data/             # Persistent Postgres volume (gitignored)
```

## 🚀 Services

- **PostgreSQL** — Persistent database.
- **Keycloak** — Identity Provider for OIDC/OAuth2.
- **API** — Backend exposing protected endpoints.
- **Frontend** — React + Vite + TS SPA.
- **Adminer** — Web-based SQL client for managing Postgres.

## 🛠 Requirements

- Docker and Docker Compose
- Node.js 20+ (only if you want to run the frontend locally)
- .NET 8 SDK (if backend is .NET and you want to run it locally)

## ⚙️ Environment Variables

Create a `.env` file in the root directory based on `.env.example` and adjust:

```env
POSTGRES_DB=workops
POSTGRES_USER=workops
POSTGRES_PASSWORD=Passw0rd!
VITE_API_URL=http://localhost:8085
VITE_TOKEN_URL=http://localhost:8080/realms/workops/protocol/openid-connect/token
VITE_CLIENT_ID=workops-spa
```

## ▶️ Start the project with Docker

```bash
docker compose up -d --build
```

This starts:
- **workops-postgres** at `localhost:5432`
- **workops-keycloak** at `localhost:8080`
- **API** at `localhost:8085`
- **Frontend** at `localhost:8086`
- **Adminer** at `localhost:8081`

⚠️ On first run, wait for `workops-postgres` to be `healthy` before the API can connect.

## 🖥 Access

- **Frontend**: http://localhost:8086  
- **Keycloak Admin**: http://localhost:8080  
- **Adminer**: http://localhost:8081  

## 🔑 Initial Credentials

**Keycloak**:
- Username: `admin`
- Password: `admin`

**API**:
- Realm: `workops`
- Client ID: `workops-spa`

## 🧪 Login from Postman

1. Get a token:
   ```http
   POST http://localhost:8080/realms/workops/protocol/openid-connect/token
   Content-Type: application/x-www-form-urlencoded

   client_id=workops-spa
   grant_type=password
   username=admin1
   password=Passw0rd!
   ```

2. Use the `access_token` to call the API:
   ```http
   GET http://localhost:8085/api/auth/me
   Authorization: Bearer <access_token>
   ```

---

## 📚 API Docs with Swagger (OpenAPI)

The backend exposes interactive API documentation via **Swagger UI**.

- **Swagger UI:** http://localhost:8085/swagger  
- **OpenAPI JSON:** http://localhost:8085/swagger/v1/swagger.json

If you run locally (without Docker), Swagger is enabled by default in **Development**. In Docker, it is also available by default at the route above.

### How to add/verify Swagger (Swashbuckle) in .NET 8

> If your API already shows `/swagger`, you can skip this section.

1. Add the packages:
   ```bash
   dotnet add api package Swashbuckle.AspNetCore
   ```

2. In `Program.cs` add services and middleware:
   ```csharp
   // builder.Services
   builder.Services.AddEndpointsApiExplorer();
   builder.Services.AddSwaggerGen();

   var app = builder.Build();

   // App pipeline
   app.UseSwagger();
   app.UseSwaggerUI();
   ```

3. (Optional) Annotate your endpoints with XML comments or attributes to enrich the docs.

### Import into Postman

- In Postman: **File → Import → Link** and paste `http://localhost:8085/swagger/v1/swagger.json`, or import the downloaded `swagger.json` file directly.
- You can also generate client SDKs using tools like **NSwag** or **OpenAPI Generator** if needed.

---

## 🛑 Stop the services

```bash
docker compose down
```

To also remove Postgres data:
```bash
docker compose down -v
```

## 🧪 Testing & Coverage (optional)

If you set up unit tests with **xUnit + Moq**, you can validate coverage using **Coverlet**:

```bash
dotnet test   /p:CollectCoverage=true   /p:CoverletOutput=TestResults/coverage.xml   /p:CoverletOutputFormat=cobertura   /p:Threshold=80   /p:ThresholdType=line   /p:ThresholdStat=total   /p:FailWhenThresholdNotMet=true
```

Generate a local HTML report:
```bash
dotnet tool install -g dotnet-reportgenerator-globaltool
reportgenerator -reports:"**/TestResults/coverage.xml" -targetdir:"CoverageReport" -reporttypes:"Html"
```

Open `CoverageReport/index.html`.

## 📜 License

This project is licensed under the MIT License.
