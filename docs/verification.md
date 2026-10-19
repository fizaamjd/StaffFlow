# Verification

Snapshot: 2026-10-19. The maintenance checks use synthetic data and do not access the production API or database.

- 20 scheduler regressions passed in UTC and again in Asia/Karachi. They cover overlap/inactive exclusions, adjacent boundaries, ranking, bounded scores, soft availability/preferences/overtime/consecutive-day behavior, existing assignments, department filters, unfilled/empty schedules, weekend/date boundaries and input immutability.
- Frontend TypeScript checking and production build passed with Next.js 15.5.28 after compatible dependency updates.
- Strict frontend ESLint reports 77 errors and 89 warnings. npm run lint remains a strict diagnostic. CI does not label that legacy debt as passing; it gates scheduler tests, types, build and docs.
- The existing next.config.js skips build-time lint; explicit type checking remains mandatory. No lint rules were muted to manufacture a clean result.
- Local validation used Node.js 24.15.0; the API declares Node.js 22 and CI provisions that supported runtime. CI logs establish the result for each pushed revision.
- No MongoDB, sign-in, schedule publication, payroll operation, notification delivery or real staff record was exercised. Tests do not establish statutory compliance or end-to-end production correctness.

[Dependency health](dependency-health.md) records the remaining advisory findings.
