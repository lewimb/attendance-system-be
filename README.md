# WFH Attendance System (Backend)

NestJS + MySQL backend for the Dexa Group fullstack test, built as a gateway (main service) and two microservices.

| App | What it does | Port |
|---|---|---|
| `attendance-system` | Gateway (main service): the HTTP API and Swagger | 3000 (HTTP) |
| `employee-service` | Microservice: employees and departments | 3001 (TCP) |
| `attendance-service` | Microservice: check-in, check-out and attendance history | 3002 (TCP) |

## Requirements

- Node.js 22.18 or later
- MySQL 8.0.16 or later

## Setup (first time only)

```bash
npm install
cp .env.example .env
cp database.example.json database.json
```

1. In `.env`, fill in `DB_PASSWORD`, and set `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` to random values of at least 32 characters. To generate one:

   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
   ```

2. In `database.json`, use the same database settings:

   ```json
   {
     "dev": {
       "driver": "mysql",
       "user": "root",
       "password": "your-password",
       "host": "localhost",
       "database": "attendance_system",
       "port": "3306"
     }
   }
   ```

3. Create the database, then the tables and the seed data:

   ```sql
   CREATE DATABASE attendance_system CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```

   ```bash
   npx db-migrate up
   npm run seed
   ```

## Run

Start each app in its own terminal, from the project root:

| Terminal | App | Command | Ready when it prints |
|---|---|---|---|
| 1 | employee-service | `npx nest start employee-service --watch` | `Employee service is listening on TCP port 3001` |
| 2 | attendance-service | `npx nest start attendance-service --watch` | `Attendance service is listening on TCP port 3002` |
| 3 | gateway | `npm run start:dev` | `Gateway is listening on HTTP port 3000` |

Check that everything is up at http://localhost:3000/health. It should show `"status": "ok"`. If a service shows `down`, check its terminal.

## Accounts

`npm run seed` creates these accounts. They all use the password `Password123!` (or `SEED_PASSWORD` from `.env`).

| Role | Email | Can |
|---|---|---|
| HR admin | `hr.admin@example.com` | Add, update and deactivate employees, view everyone's attendance (view only), and check in and out for themselves |
| Employee | `employee001@example.com` to `employee100@example.com` | Check in with a photo, check out, and view their own attendance |

## Swagger

Open http://localhost:3000/docs while the three apps are running.

1. Open **auth → POST /auth/login**, click **Try it out**, then **Execute**. The body is prefilled with the HR admin account.
2. You are now logged in, so the other routes work directly, for example **GET /employees** or **GET /attendance**.
3. On `POST` and `PATCH` routes, keep the prefilled `X-Requested-With` field, or the request is rejected with `403`.
4. To try check-in as an employee, log in as `employee001@example.com` and use **POST /attendance/check-in**, which has a file picker for the photo.

Each route shows its parameters, request body and possible responses. Swagger is turned off when `NODE_ENV=production`.
