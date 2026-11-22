# Task Manager REST API

A REST API for managing personal tasks, built with **Node.js**, **Express** and **PostgreSQL**. Users register and log in with **JWT** authentication, and each user can only see and change their own tasks.

## Features

- Register and log in with email and password
- Passwords are hashed with bcrypt and never stored in plain text
- JWT tokens that expire after 1 hour
- Create, read, update and delete tasks (full CRUD)
- Every task belongs to one user, and other users cannot read or change it
- Input validation with clear error messages and correct HTTP status codes
- Parameterised SQL queries, which protect against SQL injection

## Tech Stack

- Node.js and Express
- PostgreSQL (hosted on Neon) with the `pg` library
- `jsonwebtoken` for JWT, `bcryptjs` for password hashing
- `dotenv` for configuration

## Project Structure

```
task-api/
├── server.js            # App setup and route mounting
├── db.js                # PostgreSQL connection pool
├── middleware/
│   └── auth.js          # Checks the JWT before protected routes
├── routes/
│   ├── auth.js          # POST /auth/register, POST /auth/login
│   └── tasks.js         # CRUD routes for tasks (login required)
├── test-db.js           # Quick database connection check
└── .env.example         # Example environment variables
```

## Getting Started

### 1. Clone and install

```bash
git clone https://github.com/shafeekH-Developer/task-manager-api.git
cd task-manager-api
npm install
```

### 2. Create a PostgreSQL database

Create a database (for example a free one on [Neon](https://neon.tech)) and run this SQL:

```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE tasks (
  id SERIAL PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE
);
```

### 3. Configure environment variables

Copy `.env.example` to `.env` and fill in your values:

```
DATABASE_URL=postgresql://user:password@host/dbname?sslmode=require
JWT_SECRET=a-long-random-string
```

Generate a secret with:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Never commit your `.env` file. It is already listed in `.gitignore`.

### 4. Run the server

```bash
node server.js
```

The API runs at `http://localhost:3000`. To restart automatically when files change, use `node --watch server.js`.

## API Endpoints

| Method | Endpoint         | Auth | Description                  |
| ------ | ---------------- | ---- | ---------------------------- |
| GET    | `/`              | No   | Health check                 |
| POST   | `/auth/register` | No   | Create an account            |
| POST   | `/auth/login`    | No   | Log in and receive a token   |
| GET    | `/tasks`         | Yes  | List my tasks (newest first) |
| GET    | `/tasks/:id`     | Yes  | Get one of my tasks          |
| POST   | `/tasks`         | Yes  | Create a task                |
| PUT    | `/tasks/:id`     | Yes  | Update a task                |
| DELETE | `/tasks/:id`     | Yes  | Delete a task                |

Protected routes need this header:

```
Authorization: Bearer <your-token>
```

### Example requests

Register:

```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"me@example.com","password":"MyPassw0rd!"}'
```

Response (`201 Created`):

```json
{
  "user": { "id": 1, "email": "me@example.com" },
  "token": "eyJhbGciOi..."
}
```

Create a task:

```bash
curl -X POST http://localhost:3000/tasks \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"title":"Learn Express","description":"Build my first API"}'
```

Mark a task as completed:

```bash
curl -X PUT http://localhost:3000/tasks/1 \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"completed":true}'
```

### Status codes

| Code | Meaning                                   |
| ---- | ----------------------------------------- |
| 200  | Success                                   |
| 201  | Created                                   |
| 400  | Invalid input (for example a missing title) |
| 401  | Missing, invalid or expired token         |
| 404  | Task not found (or it belongs to another user) |
| 409  | Email is already registered               |
| 500  | Server error                              |

## Security Notes

- Passwords are hashed with bcrypt before they are stored.
- Login errors use the same message for a wrong email and a wrong password, so registered emails cannot be discovered.
- SQL queries use parameters (`$1`, `$2`), never string concatenation.
- A task from another user returns `404`, so its existence is not revealed.

## Possible Improvements

- Refresh tokens and logout
- Rate limiting on the login route
- Automated tests (Jest and Supertest)
- Pagination and filtering for the task list
- Deployment (for example on Render)

## Author

Shafeek H, entry-level Full-Stack Developer. [GitHub](https://github.com/shafeekH-Developer) · [LinkedIn](https://www.linkedin.com/in/shafeek-h67)