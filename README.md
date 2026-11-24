# JobTracker

A full-stack web app for tracking job applications. Add every job you apply for, move it through your hiring pipeline on a Kanban board, get reminders for interviews and follow-ups, and see how your job hunt is going.

**Live demo:** https://jobtracker-webapp.vercel.app/
**API:** https://jobtracker-api-gc38.onrender.com

> The app runs on free hosting. If nobody has used it for a while, the first request can take up to a minute while the server wakes up.

## Features

- **Kanban board:** drag applications between Wishlist, Applied, Interview, Offer and Rejected, or use the List view
- **Reminders:** a "Needs your attention" panel shows interviews in the next 7 days and follow-ups that are due or overdue
- **Insights:** applications sent, response rate, interview rate, offer rate, applications per week, and a status breakdown
- **Job details:** company, role, location, job type (Remote, Hybrid, On-site), salary, recruiter name and email, job link and notes
- **Search** across company, role, location and recruiter
- **Export to CSV** (opens in Excel or Google Sheets)
- **Accounts:** sign up with email verification, log in, and reset a forgotten password with an emailed code
- **Private by design:** every user only ever sees their own applications
- **Dark mode**, a zoom control for the board and list, and a layout that works on phones

## Tech Stack

| Part | Technology |
| ---- | ---------- |
| Front end | React 18, Vite, plain CSS |
| Back end | Node.js, Express |
| Database | PostgreSQL (hosted on Neon) with the `pg` library |
| Auth | JWT (`jsonwebtoken`), bcrypt (`bcryptjs`) |
| Email | Nodemailer with Brevo SMTP |
| Hosting | Vercel (website), Render (API), Neon (database), all on free plans |

## How It Works

```
Browser (React)  →  Express API  →  PostgreSQL
                      │
                      └→ Brevo SMTP (verification and reset codes)
```

The React site never talks to the database. It calls the API, the API checks the user's JWT, and every query is limited to that user's rows.

## Project Structure

```
├── server.js              # App setup, CORS, rate limiting
├── db.js                  # PostgreSQL connection pool
├── emailCodes.js          # Creates and checks 6-digit email codes
├── mailer.js              # Sends the emails through SMTP
├── middleware/
│   └── auth.js            # Checks the JWT on protected routes
├── routes/
│   ├── auth.js            # Register, verify, login, forgot / reset password
│   └── applications.js    # CRUD for job applications
└── frontend/              # React app (Vite)
    └── src/
        ├── App.jsx, AuthPage.jsx, Dashboard.jsx
        ├── Board.jsx, ListView.jsx, Insights.jsx, Reminders.jsx
        └── ApplicationForm.jsx, api.js, utils.js, styles.css
```

## Run It Locally

### 1. Clone and install

```bash
git clone https://github.com/shafeekH-Developer/jobtracker-api.git
cd jobtracker-api
npm install
cd frontend
npm install
```

### 2. Create the database

Create a PostgreSQL database (for example a free one on [Neon](https://neon.tech)) and run this SQL:

```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE email_codes (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  purpose VARCHAR(10) NOT NULL CHECK (purpose IN ('verify', 'reset')),
  code_hash VARCHAR(64) NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, purpose)
);

CREATE TABLE applications (
  id SERIAL PRIMARY KEY,
  company VARCHAR(150) NOT NULL,
  role VARCHAR(150) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'Applied',
  applied_date DATE NOT NULL DEFAULT CURRENT_DATE,
  interview_date DATE,
  follow_up_date DATE,
  salary VARCHAR(80) NOT NULL DEFAULT '',
  location VARCHAR(120) NOT NULL DEFAULT '',
  job_type VARCHAR(20) NOT NULL DEFAULT 'On-site',
  contact_name VARCHAR(120) NOT NULL DEFAULT '',
  contact_email VARCHAR(160) NOT NULL DEFAULT '',
  job_link TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT status_valid CHECK (status IN ('Wishlist', 'Applied', 'Interview', 'Offer', 'Rejected')),
  CONSTRAINT job_type_valid CHECK (job_type IN ('Remote', 'Hybrid', 'On-site'))
);
```

### 3. Configure the environment

Copy `.env.example` to `.env` in the project root and fill in your values:

| Variable | What it is |
| -------- | ---------- |
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | A long random string (generate one with `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`) |
| `FRONTEND_URL` | Website address allowed to call the API (leave empty locally) |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` | Your Brevo SMTP details |
| `MAIL_FROM` | A sender address verified in Brevo, for example `JobTracker <you@example.com>` |
| `DEV_LOG_CODES` | Set to `true` (and leave `SMTP_HOST` empty) to print codes in the terminal instead of sending emails |

For the front end, `frontend/.env` can set `VITE_API_URL` (it defaults to `http://localhost:3000`).

Never commit your `.env` files. They are listed in `.gitignore`.

### 4. Start both servers

```bash
# in the project root
node server.js

# in a second terminal
cd frontend
npm run dev
```

Open http://localhost:5173.

## API Endpoints

### Auth (`/auth`)

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| POST | `/auth/register` | Create an account and email a 6-digit code |
| POST | `/auth/verify-email` | Verify the email with the code, then log in |
| POST | `/auth/resend-code` | Send a new verification or reset code |
| POST | `/auth/login` | Log in and receive a token (the email must be verified) |
| POST | `/auth/forgot-password` | Email a password reset code |
| POST | `/auth/reset-password` | Set a new password using the code |

### Applications (`/applications`, login required)

Send the header `Authorization: Bearer <token>`.

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| GET | `/applications` | List my applications (optional `?status=Interview`) |
| GET | `/applications/stats` | Count of applications per status |
| GET | `/applications/:id` | Get one application |
| POST | `/applications` | Create an application (`company` and `role` are required) |
| PUT | `/applications/:id` | Update one or more fields |
| DELETE | `/applications/:id` | Delete an application |

## Security

- Passwords are hashed with bcrypt, and logins give the same error for a wrong email or a wrong password
- JWT tokens expire after 1 hour
- Email codes are stored as HMAC hashes, expire after 10 minutes, allow 5 wrong attempts, and can be re-sent once a minute
- Forgot-password answers are the same whether or not the account exists
- Rate limiting on the `/auth` routes
- All SQL uses parameters, never string concatenation
- Each user can only read and change their own rows
- CORS only allows the configured website address in production
- Secrets live in environment variables, not in the code

## Deployment

- **Database:** Neon (free PostgreSQL)
- **API:** Render web service. Build command `npm install`, start command `node server.js`, with the environment variables above. Render's free plan blocks the common SMTP ports (25, 465, 587), so `SMTP_PORT` is set to `2525`, which Brevo also supports.
- **Website:** Vercel, with the root directory set to `frontend` and `VITE_API_URL` set to the API address.

## Possible Improvements

- Automated tests (Jest and Supertest)
- Refresh tokens, so a password reset also ends other sessions straight away
- Delete account and change email
- Email reminders for upcoming interviews

## Author

Shafeek H, entry-level Full-Stack Developer. [GitHub](https://github.com/shafeekH-Developer) · [LinkedIn](https://www.linkedin.com/in/shafeek-h67)
