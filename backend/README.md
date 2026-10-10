# IELTS Graph – Backend

Spring Boot (Java 21+), PostgreSQL, Flyway. Source: `ielts-backend/ielts-backend/`.

## Requirements

- PostgreSQL running locally on port **5433** with an empty database **`ielts_graph`**.
  Flyway creates the schema and sample data (`src/main/resources/db/migration`) on startup.

## Database credentials

`application.yaml` reads the connection from environment variables. Nothing is committed:

| Variable | Required | Default |
|---|---|---|
| `DB_URL` | no | `jdbc:postgresql://localhost:5433/ielts_graph` |
| `DB_USERNAME` | yes | – |
| `DB_PASSWORD` | yes | – |

Without `DB_USERNAME` / `DB_PASSWORD` the app stops at startup.

Set them in one of these ways:

- IntelliJ: *Run/Debug Configurations → Environment variables*: `DB_USERNAME=postgres;DB_PASSWORD=...`
- PowerShell: `$env:DB_USERNAME="postgres"; $env:DB_PASSWORD="..."; ./mvnw spring-boot:run`
- Git Bash: `DB_USERNAME=postgres DB_PASSWORD=... ./mvnw spring-boot:run`

## Run

```bash
cd ielts-backend/ielts-backend
DB_USERNAME=postgres DB_PASSWORD=... ./mvnw spring-boot:run
```

- API: `http://localhost:8080/api`
- Swagger UI: `http://localhost:8080/swagger-ui.html`

## Test

```bash
DB_USERNAME=postgres DB_PASSWORD=... ./mvnw test
```

Tests use the same database. Most test classes run in a transaction that is rolled back;
the concurrency tests commit and clean up after themselves.

## Demo accounts

Authentication is HTTP Basic for now. Password for every account: `Demo@123`.

| Username | Role | Notes |
|---|---|---|
| `student_enrolled` | STUDENT | Enrolled in the Reading and Listening courses – use this one for the demo |
| `student_new` | STUDENT | No enrollment; used by tests |
| `teacher_demo` | TEACHER | Owns the sample courses |
| `teacher_other` | TEACHER | Owns nothing |
| `admin_demo` | ADMIN | |
