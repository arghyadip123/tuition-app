# Tuition Management App

This repository contains the first build of a full-stack tuition management app using:

- React for the frontend
- Node.js + Express for the backend
- PostgreSQL for persistence

The current milestone includes:

- JWT authentication for `teacher` and `student` roles
- Teacher-owned batch creation
- Student enrollment in multiple batches
- Batch schedule management
- Attendance management for teachers and students
- Fees management for teachers and students
- Teacher and student batch dashboards
- Database foundations for future attendance tracking

## Project structure

```text
.
|-- backend
|-- frontend
|-- docker-compose.yml
```

## 1. Start PostgreSQL

Use Docker if you want a quick local database:

```bash
docker compose up -d
```

This starts PostgreSQL on `localhost:5432` with:

- database: `tuition_manager`
- user: `postgres`
- password: `postgres`

## 2. Install dependencies

From the project root:

```bash
npm install
```

This installs:

- the root helper scripts
- backend dependencies
- frontend dependencies

## 3. Environment files

Default local `.env` files are already included for development:

- `backend/.env`
- `frontend/.env`

You can edit them if your PostgreSQL credentials or ports differ.

## 4. Run the database migration

```bash
npm run migrate
```

## 5. Start the app

Run both apps together:

```bash
npm run dev
```

Or run them separately:

```bash
npm run dev:backend
npm run dev:frontend
```

The frontend runs on `http://localhost:5173` and the backend runs on `http://localhost:4000`.

## Current API surface

### Auth

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`

### Batches

- `POST /api/batches` (teacher only)
- `GET /api/batches`
- `GET /api/batches/discover` (student only)
- `GET /api/batches/:batchId`
- `POST /api/batches/:batchId/enrollments` (teacher only)
- `POST /api/batches/:batchId/enroll-self` (student only)

### Schedules

- `POST /api/schedules` (teacher only)
- `GET /api/schedules/:batchId`

### Attendance

- `POST /api/attendance` (teacher only)
- `GET /api/attendance/:batchId`

### Fees

- `POST /api/fees` (teacher only)
- `GET /api/fees/batch/:batchId` (teacher only)
- `GET /api/fees/student` (student only)
- `PATCH /api/fees/:id/pay` (teacher only)

## What is ready for the next milestone

The database now includes:

- `schedules`
- `attendance`
- `fees`

That makes it straightforward to add schedule management and attendance tracking next.
