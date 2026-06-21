# StaffFlow — AI-Powered Shift Management

StaffFlow is a full-stack shift / workforce management system with role-based
dashboards for **managers** and **employees**, an algorithmic **scheduling &
recommendation engine**, payroll & reporting analytics, and notifications.

- **Frontend:** Next.js 15 (App Router) + MUI + Recharts → deploy to **Vercel**
- **Backend:** Node.js + Express + Mongoose REST API → deploy to **Render**
- **Database:** MongoDB Atlas

```
StaffFlow/
├── app/ components/ lib/      # Next.js frontend
│   └── lib/api.ts, lib/auth.tsx   # API client + auth context
└── server/                    # Express + MongoDB backend
    ├── src/models             # User, Shift, TimeEntry, Notification
    ├── src/controllers,routes # auth, employees, shifts, schedule, payroll, reports, notifications, dashboard
    ├── src/services/recommendation.js  # scheduling + recommendation engine
    └── src/seed.js            # demo data
```

---

## ✨ Features

- **Auth & RBAC** — JWT login, bcrypt-hashed passwords, manager/employee roles, route guards.
- **Employee management** — managers add/edit/deactivate staff (auto-generated temp passwords).
- **Shifts** — create/assign/edit/delete; employees confirm or decline their own shifts.
- **AI scheduling** — generate an optimized schedule across a date range, preview match
  scores + reasons, then publish (notifies affected employees).
- **Recommendation engine** — best-fit staff for any open slot, ranked by department match,
  availability, preferences, fairness, overtime and skill level (with human-readable reasons).
- **Payroll & reports** — department/monthly aggregations, regular vs overtime pay, charts.
- **Notifications** — per-user, mark read / delete, unread counts.
- **Production-grade API** — helmet, CORS allow-list, rate limiting, compression, centralized
  validation (zod) and error handling, indexed Mongo queries with pagination.

### How the recommendation engine works
`server/src/services/recommendation.js` is pure, dependency-free scoring logic:
- **Hard constraints** (never assigned): time conflicts, inactive employees.
- **Soft scoring (0–100):** department match, availability windows, preferred days,
  weekly-hours cap, overtime penalty, consecutive-days cap, fair distribution, skill level.
- `generateSchedule()` greedily fills slots day-by-day, tracking each employee's running
  hours and consecutive days so the result is balanced and conflict-free.

---

## 🖥️ Local development

**Prerequisites:** Node 20+, a MongoDB Atlas connection string.

### 1. Backend
```bash
cd server
cp .env.example .env        # then edit .env (see below)
npm install
npm run seed                # creates demo manager + employees + shifts
npm run dev                 # API on http://localhost:5050
```

`server/.env`:
```
PORT=5050
NODE_ENV=development
MONGODB_URI=mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/staffflow?retryWrites=true&w=majority
JWT_SECRET=<run: node -e "console.log(require('crypto').randomBytes(48).toString('hex'))">
JWT_EXPIRES_IN=7d
CLIENT_ORIGINS=http://localhost:3000
```
> Port 5000 is used by macOS AirPlay/ControlCenter, so local dev uses **5050**.

### 2. Frontend
```bash
# from the repo root
cp .env.example .env.local   # NEXT_PUBLIC_API_URL=http://localhost:5050
npm install
npm run dev                  # app on http://localhost:3000
```

### Demo logins (after seeding)
| Role | Email | Password |
|------|-------|----------|
| Manager | `manager@staffflow.com` | `Manager@123` |
| Employee | `employee@staffflow.com` | `Employee@123` |

---

## 🚀 Deployment

### Backend → Render
1. Push this repo to GitHub.
2. Render → **New + → Blueprint**, select the repo. It reads `server/render.yaml`
   (root dir `server`, health check `/health`, `JWT_SECRET` auto-generated).
3. Set the two `sync: false` env vars in the Render dashboard:
   - `MONGODB_URI` — your Atlas string (with `/staffflow` db name)
   - `CLIENT_ORIGINS` — your Vercel URL, e.g. `https://staffflow.vercel.app`
4. Deploy. Note the service URL, e.g. `https://staffflow-api.onrender.com`.
5. (Once) seed production data from the Render Shell: `npm run seed`.

### Frontend → Vercel
1. Vercel → **Add New Project** → import the repo (root = repo root; framework auto-detected).
2. Add env var **`NEXT_PUBLIC_API_URL`** = your Render API URL.
3. Deploy. After it's live, make sure that Vercel URL is in the backend's `CLIENT_ORIGINS`.

---

## 🔐 Security notes
- **Rotate your MongoDB password** — the original was shared in plain text. Change it in
  Atlas → Database Access, then update `MONGODB_URI` locally and in Render.
- Secrets live only in `.env` / host env vars — never committed (`.gitignore` covers them).
- Restrict Atlas network access to Render's egress IPs where possible (or `0.0.0.0/0` for the free tier with a strong password).

---

## 📚 API overview
All routes under `/api`. Auth via `Authorization: Bearer <token>`.

| Area | Endpoints |
|------|-----------|
| Auth | `POST /auth/register`, `POST /auth/login`, `GET /auth/me`, `PATCH /auth/password` |
| Employees | `GET/POST /employees`, `GET/PATCH/DELETE /employees/:id`, `PATCH /employees/me` |
| Shifts | `GET/POST /shifts`, `GET/PATCH/DELETE /shifts/:id`, `POST /shifts/:id/respond` |
| Scheduling | `POST /schedule/generate`, `POST /schedule/publish`, `GET /schedule/recommend` |
| Payroll | `GET /payroll`, `GET /payroll/trend` |
| Reports | `GET /reports` |
| Notifications | `GET /notifications`, `PATCH /notifications/:id/read`, `PATCH /notifications/read-all`, `DELETE /notifications/:id` |
| Dashboards | `GET /dashboard/manager`, `GET /dashboard/employee` |
