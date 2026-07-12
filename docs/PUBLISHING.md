# Publishing

[Docs Home](README.md) | [V1 Validation Report](VALIDATION_REPORT.md)

Short guide for releasing Nodrica to npm.

## Release Flow

```mermaid
flowchart LR
    A[Code] --> B[Typecheck]
    B --> C[Test]
    C --> D[Build]
    D --> E[Pack Preview]
    E --> F[Login]
    F --> G[Publish]
    G --> H[Verify]
```

## Commands

```bash
npm install
npm run typecheck
npm test
npm run build
npm pack --dry-run
npm login
npm publish --access public
npm view nodrica
```

## What Each Step Means

```mermaid
flowchart TD
    A[npm install] --> A1[Install dev tools]
    B[typecheck] --> B1[Check TypeScript]
    C[test] --> C1[Check behavior]
    D[build] --> D1[Create dist files]
    E[pack dry-run] --> E1[Preview npm package]
    F[publish] --> F1[Upload to npm]
    G[npm view] --> G1[Confirm release]
```

## Version Flow

```mermaid
flowchart LR
    A[0.1.0] --> B[0.1.1 patch fix]
    B --> C[0.2.0 new feature]
    C --> D[1.0.0 stable API]
```

Use:

```bash
npm version patch
npm publish --access public
```

## 2FA / OTP

```mermaid
flowchart TD
    A[npm publish] --> B{2FA enabled?}
    B -->|No| C[Publish]
    B -->|Yes| D[Browser / OTP prompt]
    D --> E[Confirm]
    E --> C
```

If npm asks for OTP:

```bash
npm publish --access public --otp=123456
```

Replace `123456` with the current 2FA code.

## Current Release

```text
Package: nodrica
Version: 0.1.0
Status: published
Access: public
Install: npm install nodrica
```

## Checklist

- [x] package name available
- [x] tests pass
- [x] build passes
- [x] pack preview checked
- [x] npm public publish completed
- [x] `npm view nodrica` confirmed

