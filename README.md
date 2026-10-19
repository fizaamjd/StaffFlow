# StaffFlow

![CI](https://github.com/fizaamjd/StaffFlow/actions/workflows/ci.yml/badge.svg?branch=main)

StaffFlow is a workforce-management application with manager and employee dashboards, shift assignment, explainable scheduling recommendations, payroll estimates, reports and notifications. Its scheduling engine is a deterministic weighted heuristic, not a trained machine-learning model.

## Live demo video

https://github.com/user-attachments/assets/b07edb3f-dc78-4230-a0f3-2187874fa91e

[Open StaffFlow](https://staff-flow-silk.vercel.app/) · [Download video](docs/media/staffflow-demo.mp4) · [HTML presentation source](docs/media/staffflow-demo.html)

The walkthrough uses sample staff, schedule and payroll states. It is not a record of real employment data, measured scheduling performance or payroll/legal compliance.

## Architecture and repository layout

| Path | Role |
| --- | --- |
| app/, components/, lib/ | Next.js UI, API client and session state |
| server/src/routes, controllers | Express REST API and application operations |
| server/src/models | Mongoose users, shifts, time entries and notifications |
| server/src/services/recommendation.js | Pure scoring, ranking, slot generation and greedy scheduling |
| server/src/seed.js | Optional disposable demonstration data |

See [architecture](docs/architecture.md). Planning records and the presentation are in [Staff-Flow-Documentation](https://github.com/fizaamjd/Staff-Flow-Documentation).

## Run locally

Use Node.js 22 and a dedicated development MongoDB database.

```sh
npm ci
npm ci --prefix server
cp .env.example .env.local
cp server/.env.example server/.env
# Configure a disposable database, JWT secret, PORT=5050 and browser origin.
npm run dev --prefix server
# In another terminal, from this repository root:
npm run dev
```

Frontend: http://localhost:3000. API: http://localhost:5050 when configured as above; code defaults to 5000 without PORT. NEXT_PUBLIC_API_URL is public build-time configuration. Set it to the Express origin, and configure CLIENT_ORIGINS to allow the frontend.

Seeding is optional. Run npm run seed inside server only against a disposable database; it creates known demo accounts and schedules. Never use the demo account for private employee data. See [configuration](docs/configuration.md).

## Scheduling behavior

| Rule | Actual behavior |
| --- | --- |
| Existing overlap on the same date | Employee excluded |
| Inactive employee | Employee excluded |
| Department, availability and preferred days | Score adjustments |
| Weekly hours, overtime and consecutive days | Penalties/incentives, not mandatory caps |
| Skill | Optional score adjustment |
| Assignment | Greedy selection with running assignment/hour tracking |

Scores are bounded from 0 to 100 and carry human-readable reasons. The engine can leave slots unfilled when all candidates are excluded. It does not establish global optimality, overnight-shift support, cross-time-zone correctness or labor-law compliance. A manager must review proposed schedules.

## Verification and maintenance

CI runs focused offline scheduler regressions, frontend TypeScript/build checks and documentation links. These checks do not start the API, contact MongoDB, seed data or publish a schedule. See [testing](docs/testing.md), [verification](docs/verification.md) and [dependency health](docs/dependency-health.md) for evidence and limits.

[Contributing](CONTRIBUTING.md) · [Security](SECURITY.md) · [Support](SUPPORT.md) · [Code of conduct](CODE_OF_CONDUCT.md) · [Changelog](CHANGELOG.md)

## License

[MIT](LICENSE) for original contributions the maintainer is authorized to license. Preserve collaborator and dependency rights; see [license scope](docs/license-scope.md).
