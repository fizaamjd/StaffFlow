# Testing

```sh
npm ci
npm ci --prefix server
npm test --prefix server
npm run typecheck
npm run build
python3 scripts/check-docs.py
```

See [verification](verification.md) for checks actually performed. Strict lint is a separate diagnostic and is not silently labeled as passing. Offline tests do not exercise MongoDB, authorization, payroll or the deployed app.
