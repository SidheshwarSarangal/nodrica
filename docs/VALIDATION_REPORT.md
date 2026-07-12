# V1 Validation Report

[Docs Home](README.md) | [Implementation Checklist](IMPLEMENTATION_CHECKLIST.md) | [Publishing Guide](PUBLISHING.md)

## Status

**Passed**

Nodrica v1 was verified in a separate validation workspace:

```text
Node flow engine/nodrica-v1-validation
```

## Environment

```text
Docker image: node:22-bookworm
Node: v22.23.1
npm: 10.9.8
```

## Commands Run

```bash
npm install
npm run typecheck
npm test
npm run build
npm audit --omit=dev
```

## Results

```text
npm install           passed
npm run typecheck     passed
npm test              passed
npm run build         passed
npm audit --omit=dev  passed
```

Test summary:

```text
5 test files passed
24 tests passed
```

Build output:

```text
dist/index.js
dist/index.cjs
dist/index.d.ts
dist/index.d.cts
```

## Notes

`npm install` reported dev-dependency audit warnings. Production dependency audit passed with:

```text
0 vulnerabilities
```
