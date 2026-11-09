# WFH Attendance System (Backend)

Backend for the Dexa Group fullstack technical test:

1. **Aplikasi Absensi WFH Karyawan**: employees log in and check in with the date and time captured by the server and a photo as proof of working from home.
2. **Aplikasi Monitoring Karyawan**: HR admins add and update employee master data and view submitted attendance (view only).

Built with **NestJS 12 + TypeScript** and **MySQL 8**, as an API gateway in front of two microservices that talk over TCP.

## Architecture

```
React frontend (http://localhost:5173)
        │  HTTP, JSON / multipart, cookies
        ▼
Gateway  (apps/attendance-system, HTTP :3000)
  auth and refresh tokens, JWT / role / CSRF guards, rate limiting,
  photo upload and streaming, helmet, CORS, health check
        │  TCP (@nestjs/microservices, request/response message patterns)
        ├──────────────────────────────┐
        ▼                              ▼
employee-service (TCP :3001)     attendance-service (TCP :3002)
  employees, roles, departments    check-in, check-out, history,
                                   HR attendance list, photo lookup
        │                              │
        └──────────────┬───────────────┘
                       ▼
                     MySQL
```

- Only the gateway is meant to be reachable from outside. The services have no HTTP surface.
- The gateway and services share the message pattern names, payload types and DTOs through `libs/common`, so they cannot drift apart.
- Photos are not sent over TCP. The gateway validates and stores the file, then sends only its relative path to `attendance-service`.

### Project structure

```
apps/
  attendance-system/      gateway (HTTP)
    src/auth/             login, refresh, logout, me, JWT and CSRF guards
    src/employee/         /employees routes -> employee-service
    src/department/       /departments route -> employee-service
    src/attendance/       /attendance routes, photo upload and storage
    src/health/           /health
  employee-service/       employees and departments (TCP)
  attendance-service/     attendance records (TCP)
libs/common/              message patterns, payload types, DTOs, shared entities
migrations/               db-migrate migrations
seeders/seeder.ts         development seed data
storage/photos/           uploaded photos (ignored by git)
```

## Requirements

- Node.js 22.18 or later (the seeder runs a `.ts` file directly with Node's built-in type stripping)
- MySQL 8.0.16 or later (the `attendances` table uses a `CHECK` constraint)

## Getting started

### 1. Install

```bash
npm install
```

### 2. Configure

```bash
cp .env.example .env
cp database.example.json database.json
```

Fill in `.env` (see [Environment variables](#environment-variables)). The JWT secrets must be at least 32 characters, or the gateway refuses to start. To generate one:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

Fill in `database.json` for the migrations, with the same database as `.env`:

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

### 3. Create the database, migrate and seed

```sql
CREATE DATABASE attendance_system CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

```bash
npx db-migrate up
npm run seed
```

The seeder creates the roles, five departments, one HR admin and 100 employees. It refuses to run when `NODE_ENV=production`.

| Account | Email | Password |
|---|---|---|
| HR admin | `hr.admin@example.com` | `Password123!` (or `SEED_PASSWORD`) |
| Employees | `employee001@example.com` to `employee100@example.com` | same as above |

### 4. Run

Run each app in its own terminal, from the project root so they all read the same `.env`:

```bash
npx nest start employee-service --watch
npx nest start attendance-service --watch
npm run start:dev
```

`npm run start:dev` starts the gateway on http://localhost:3000. Check that everything is up:

```bash
curl http://localhost:3000/health
```

For a production build:

```bash
npx nest build employee-service
npx nest build attendance-service
npx nest build attendance-system
node dist/apps/employee-service/main
node dist/apps/attendance-service/main
node dist/apps/attendance-system/main
```

## Environment variables

| Variable | Default | Used by | Description |
|---|---|---|---|
| `NODE_ENV` | | seeder | `production` blocks the seeder |
| `PORT` | `3000` | gateway | HTTP port |
| `CORS_ORIGIN` | `http://localhost:5173` | gateway | Allowed frontend origins, comma separated |
| `EMPLOYEE_SERVICE_HOST` / `_PORT` | `localhost` / `3001` | gateway, employee-service | Where employee-service listens |
| `ATTENDANCE_SERVICE_HOST` / `_PORT` | `localhost` / `3002` | gateway, attendance-service | Where attendance-service listens |
| `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_DATABASE` | port `3306` | all apps, seeder | MySQL connection |
| `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` | required | gateway | At least 32 characters each |
| `JWT_ISSUER` / `JWT_AUDIENCE` | `attendance-app` / `attendance-web` | gateway | `iss` and `aud` claims, checked on every token |
| `BUSINESS_TZ` | `Asia/Jakarta` | attendance-service | Time zone for the work date and the late rule |
| `WORK_START_TIME` | `09:00` | attendance-service | Check-ins after this local time are `LATE` |
| `STORAGE_ROOT` | `./storage/photos` | gateway | Where check-in photos are stored |
| `SEED_PASSWORD` | `Password123!` | seeder | Password for every seeded account |

## Authentication

- `POST /auth/login` sets two HTTP-only cookies: `accessToken` (15 minutes) and `refreshToken` (7 days, sent only to `/auth`). Both are `Secure` and `SameSite=Strict`. The access token is also returned in the body, so API clients can send `Authorization: Bearer <token>` instead (except on `/auth/me`, which reads the cookie).
- `POST /auth/refresh` rotates the refresh token. Presenting an already rotated refresh token again is treated as theft: every refresh token of that employee is revoked and they must log in again.
- **Every `POST`, `PUT`, `PATCH` and `DELETE` request must send `X-Requested-With`** (for example `X-Requested-With: XMLHttpRequest`), including login. Requests without it get `403 CSRF_HEADER_MISSING`.
- Browser clients must send cookies with `credentials: 'include'` (fetch) or `withCredentials: true` (axios).
- Each route allows 60 requests per minute per client, and `POST /auth/login` and `POST /auth/refresh` allow 10, to slow down password guessing. Over the limit returns `429` with a `Retry-After` header. `/health` is not limited.

## API

Base URL: `http://localhost:3000`. Successful responses are wrapped:

```json
{ "data": { }, "statusCode": 200, "message": "Employees retrieved" }
```

Errors return the status code, a message and, where the client may need to react, a `code`:

```json
{ "statusCode": 409, "code": "ALREADY_CHECKED_IN", "message": "Already checked in today" }
```

List endpoints return `data: { items, total, page, limit }`, with `limit` capped at 100.

### Auth

| Method | Route | Access | Notes |
|---|---|---|---|
| POST | `/auth/login` | public | Body `{ email, password }` |
| POST | `/auth/refresh` | public (refresh cookie) | Rotates both tokens |
| POST | `/auth/logout` | public | Revokes the refresh token and clears the cookies |
| GET | `/auth/me` | logged in | Current employee |

### Employees and departments (HR admin)

| Method | Route | Notes |
|---|---|---|
| GET | `/employees` | Query: `page`, `limit`, `departmentId`, `isActive`, `sortBy` (`id`, `employeeCode`, `fullName`, `email`, `createdAt`), `order` (`asc`, `desc`) |
| POST | `/employees` | Body: `employeeCode`, `fullName`, `email`, `password` (min 8), `roleId`, `departmentId`, `phone` (optional) |
| GET | `/employees/:id` | |
| PATCH | `/employees/:id` | Any of `fullName`, `email`, `roleId`, `departmentId`, `phone`. The employee code and password cannot be changed here. |
| PATCH | `/employees/:id/deactivate` | Blocks login and revokes the employee's refresh tokens |
| GET | `/departments` | For the employee form |

Duplicate emails or employee codes return `409`. Emails are trimmed and lowercased.

### Attendance

| Method | Route | Access | Notes |
|---|---|---|---|
| POST | `/attendance/check-in` | logged in | `multipart/form-data` with field `photo` (JPEG or PNG, max 3 MB) |
| POST | `/attendance/check-out` | logged in | No body |
| GET | `/attendance/me` | logged in | Own history. Query: `from`, `to` (`YYYY-MM-DD`, together), `page`, `limit`. Defaults to the current month. |
| GET | `/attendance` | HR admin | View only. Query: `from`, `to` (max 31 days), `employeeId`, `departmentId`, `status` (`PRESENT`, `LATE`), `page`, `limit`. Each row includes the employee's code, name and department. |
| GET | `/attendance/:id/photo` | owner or HR admin | Streams the photo. Other employees get `404`. |

| Status | Code | When |
|---|---|---|
| 400 | `PHOTO_REQUIRED` | No photo or an empty file |
| 409 | `ALREADY_CHECKED_IN` | Already checked in today |
| 409 | `NOT_CHECKED_IN` | Check-out without a check-in today |
| 409 | `ALREADY_CHECKED_OUT` | Already checked out today |
| 413 | `PHOTO_TOO_LARGE` | Photo over 3 MB |
| 415 | `UNSUPPORTED_PHOTO_TYPE` | Not a real JPEG or PNG, whatever the file name says |
| 404 | `NOT_FOUND` | Unknown attendance, or not the caller's own |

### Health

`GET /health` (public, not rate limited) checks the gateway database and both services, each of which checks its own database. It returns `200` when everything is up and `503` with the failing checks otherwise.

## Design decisions

- **Server time only.** The check-in and check-out times come from the server clock, never from the client. The work date is computed in `BUSINESS_TZ`, and times are stored in UTC.
- **One attendance row per employee per day.** A unique key on `(employee_id, work_date)` is the final guard against double check-ins, so parallel requests give one success and one `409`. Check-out is a single conditional update, so it is safe against double or parallel requests too.
- **HR is view only for attendance.** There are no routes to create, edit or delete someone else's attendance. HR admins are employees too and check in for themselves.
- **Deactivate instead of delete.** Employees are never hard deleted, so their attendance history stays intact. Deactivation blocks login and revokes their refresh tokens.
- **Photos on local disk, never public.** Files get random names, their real type is checked from the file content, and they are only served through the authorized photo route.
- **One database for the scope of the test.** Each service owns its own tables (`employee-service`: `employees`, `roles`, `departments`; `attendance-service`: `attendances`), but they live in one MySQL database, so `attendances.employee_id` can keep a foreign key to `employees`. Splitting into a database per service would mean dropping that key and relying on the gateway, which only ever passes the employee id from the JWT. The gateway also connects to MySQL for authentication: it owns `refresh_tokens` and reads `employees` to check credentials.

## Scripts

| Command | Description |
|---|---|
| `npm run start:dev` | Gateway in watch mode |
| `npx nest start <app> --watch` | Any app in watch mode (`employee-service`, `attendance-service`, `attendance-system`) |
| `npm test` | Unit tests (Vitest) |
| `npm run lint` | Lint with oxlint |
| `npm run format` | Format with Prettier |
| `npm run seed` | Seed development data |
