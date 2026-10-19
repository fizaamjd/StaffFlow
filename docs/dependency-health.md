# Dependency health

Snapshot: 2026-10-19. Compatible dependency patches were applied within Next.js 15 and existing package majors; no force upgrade or framework migration was performed. Registry findings are not independently verified application exploits.

| Component | Full npm audit | Production-only audit |
| --- | --- | --- |
| frontend | 8 high, 1 moderate | 1 high, 1 moderate |
| api | 3 high | 0 findings |

The frontend still has a Next/PostCSS advisory chain in the production dependency tree. The registry proposes a Next.js 16 migration for that chain; it requires separate compatibility review rather than a forced upgrade during repository maintenance. Remaining development findings include glob/pattern tooling in the ESLint chain. The API's remaining high findings are in nodemon/chokidar/braces development tooling; its production-only audit is clear at this snapshot.

Recheck with npm audit and npm audit --omit=dev in the root and server folders. Audit databases change; a zero count does not establish secure source behavior. Do not use npm audit fix --force merely to remove advisory counts. Review input handling, browser sessions, route authorization and employee-data retention separately.
