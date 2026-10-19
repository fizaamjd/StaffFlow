# Configuration

Copy .env.example to .env.local for the frontend. NEXT_PUBLIC_API_URL is public build-time configuration; it should be the Express origin, for example http://localhost:5050, with no trailing /api. CORS on the server must allow the exact browser origin.

For the API, copy server/.env.example to server/.env. Set PORT=5050 for the documented local workflow, a disposable MONGODB_URI and a strong independent JWT_SECRET. The server's code default is port 5000 if PORT is omitted. CLIENT_ORIGINS is a comma-separated allowlist, and JWT_EXPIRES_IN controls token lifetime. Do not print or commit .env files or importable env text exports.

Seeding writes known demo accounts and records. It is optional and must only run against a disposable development database. Production health checks report process/database readiness at their documented route; they do not validate payroll or scheduler correctness.
