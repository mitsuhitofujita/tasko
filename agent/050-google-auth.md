# Implement Google Sign-In (OIDC): Home & Dashboard + Firestore-backed Sessions (Agent-friendly)

## Overview

Implement backend-driven Google authentication using OIDC (Authorization Code + PKCE). The browser stores only an opaque session ID (`sid`) in an HttpOnly cookie. Session records live in Firestore with TTL-based automatic deletion. Do not store long-lived JWTs in client cookies.

UI and routes

- Pages:
  - `/` (public): app name. If unauthenticated, show "Sign in with Google". If authenticated, show link to the dashboard.
  - `/dashboard` (protected): show authenticated user's name, email, and profile picture, plus a logout button.

- Routes:
  - `GET /`
  - `GET /dashboard`
  - `GET /api/auth/google/login`
  - `GET /api/auth/google/callback`
  - `POST /api/auth/logout`

## Scope

The implementation must include:

- Google OIDC login flow: state, nonce, and PKCE generation and verification; ID token validation.
- Firestore-based session store for server sessions: supports TTL and delayed `lastSeen` updates.
- Authentication middleware: resolve `sid` → user and inject into request `context.Context`.
- CSRF protection: verify token for state-changing POST requests.
- Minimal audit logging for `login`, `logout`, and `error` events.

Not in scope: role/permission management, external API integrations, or complex UI work.

## Design decisions (key points)

- Cookie: set `sid=<random>` with attributes `HttpOnly; Secure` (in production); `SameSite=Lax; Path=/`.
- Session document: `sessions/{sid}` in Firestore. Fields: `userId`, `createdAt`, `expiresAt` (TTL), `lastSeenAt`, `csrfSecret`, `ipHash`, and optional `uaHash`.
- User document: `users/{userId}` (use Google's `sub` as `userId`). Fields: `name`, `email`, `emailVerified`, `picture`, `createdAt`, `updatedAt`, `lastLoginAt`.
- Performance: keep an in-process LRU cache keyed by `sid` with a TTL (e.g., 60–120s). Update `lastSeenAt` in Firestore only at a fixed interval (e.g., once every 5 minutes) to avoid high write rates.
- Security: validate ID token signature, `aud`, `iss`, and `nonce`. Rotate `sid` immediately after login to mitigate fixation. Require CSRF token on state-changing POSTs via `X-CSRF-Token` header.
- Error handling patterns:
  - Protected pages for unauthenticated requests → return `401`.
  - Validation errors → return `400`.
  - Server errors → return `500`.

## Environment variables (injected into container)

```
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback
GOOGLE_CLOUD_PROJECT_ID=
```

## Implementation notes

- Use `SameSite=Lax` to allow OAuth redirect flows and normal navigations to work together.
- Rotate `sid` immediately after successful login.
- LRU cache uses key=`sid`, value=`session{userId,...}`, TTL around 60–120s.
- Only write `lastSeenAt` to Firestore at a fixed interval (e.g., every 5 minutes) to reduce write volume.

---

If you want, I can also:
- Produce a minimal API design (request/response shapes) for each route.
- Generate a Fastify + TypeScript skeleton (routes, middleware, Firestore client) to implement this.
