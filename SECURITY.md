# Security policy

## Reporting

Use [GitHub private reporting](https://github.com/fizaamjd/StaffFlow/security/advisories/new). Include the affected branch/commit, reproduction with synthetic data, impact and suggested mitigation. Do not post credentials, customer data, private repository contents, or real email in an issue. If a credential was exposed, revoke it through its provider; removing a file does not invalidate a token or erase earlier commits.

The maintained branch is `main`; there is no separate security support promise for old phase branches or tags. Dependency updates and CI checks do not establish a completed security audit.

## Known boundaries

- Employee profiles, schedules and payroll data are sensitive. Use synthetic demo accounts and disposable databases for development; do not put real staff information in the public demo.
- JWT is required in production, while development has an insecure fallback. The frontend keeps bearer tokens in localStorage; review XSS, session expiry and authorization before handling private data.
- The scheduler is a weighted, greedy heuristic. Availability, hours, consecutive days and department are soft scoring inputs, not legal-compliance guarantees. Inactive employees and same-date overlapping shifts are hard exclusions.
- Same-day time strings and server-local dates are used; overnight shifts, time zones, statutory payroll and globally optimal scheduling are not established by the current implementation or tests.
- Error responses and database validation details need review for sensitive-data exposure. Helmet/CORS/rate limiting do not prove complete production hardening.

Use dedicated development services and explicit secrets. Review provider permissions, public network exposure, data retention, and deployment access before using private data. No penetration test or production-readiness certification is claimed.
