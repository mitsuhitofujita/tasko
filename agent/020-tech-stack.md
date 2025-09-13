# Task Management Web Application — Technical Stack (Agent-friendly)

## Summary

- Frontend: React (Vite + TypeScript) + UnoCSS (utility-first CSS framework)
- Backend: Fastify (Node.js + TypeScript)
- Package manager: pnpm (monorepo/workspace with `packages/*`)
- Cloud: Google Cloud (Cloud Run, Cloud Firestore, Artifact Registry / Container Registry)
- CI/CD: GitHub Actions
- Database: Cloud Firestore
- Authentication: Google OAuth (OIDC) with PKCE + Firestore session management

## Architecture and responsibilities

Frontend (React + UnoCSS)
- Serve the built static assets from the backend's static directory (e.g. `/public`) when deployed as a single container.
- Use UnoCSS utility classes for responsive, maintainable styling instead of custom CSS.
- Provide UI features: drag-and-drop ordering, inline editing, and Markdown copy of task lists.
- Handle Google OAuth authentication flow with PKCE; use HttpOnly cookies for session management.
- Do not access Firestore directly from the client; use backend API for all CRUD operations.

Backend (Fastify / Node.js + TypeScript)
- Single-container service that serves static frontend assets and exposes API endpoints (e.g. `/api/*`).
- Implement administrative endpoints and bulk operations (reindexing, imports/exports, server-side transactions).
- Handle Google OAuth OIDC flow with PKCE verification and session management.
- Manage Firestore-backed sessions with LRU caching for performance optimization.
- Provide CSRF protection and audit logging for authentication events.
- Access Cloud Firestore from the server using a service account.

## Routes (UI routes and API examples)

UI routes
- `/` — landing page with app title, brief description, and Google Sign-In button. On successful sign-in the client navigates to `/dashboard`.
- `/dashboard` — protected task management UI (requires authentication). Shows task and subtask lists with drag-and-drop ordering, inline editing, due-date calendar, and actions to add/complete/delete.

API examples provided by the backend
- `GET /api/user` — returns authenticated user profile (requires session cookie)
- `GET /api/auth/google/login` — initiate Google OAuth flow
- `GET /api/auth/google/callback` — handle OAuth callback
- `POST /api/auth/logout` — logout and clear session (requires CSRF token)
- `GET /api/tasks` — list tasks for the authenticated user
- `POST /api/tasks` — create a task
- `PUT /api/tasks/:id` — update a task
- `DELETE /api/tasks/:id` — delete a task
- `POST /api/tasks/:id/subtasks` — create a subtask

(Real-time updates via SSE or WebSocket can be added later; base behavior is API-driven.)

## Authentication

- Client: initiate Google OAuth flow with PKCE (Proof Key for Code Exchange) for enhanced security.
- Session management: server-side sessions stored in Firestore with HttpOnly cookies containing session IDs.
- Session storage: Firestore collections for users and sessions with TTL-based automatic cleanup.
- Performance optimization: LRU cache (60s TTL) for session lookups with throttled `lastSeenAt` updates.
- Security features: session rotation on login, CSRF protection for state-changing operations, audit logging.
- Server: uses `google-auth-library` for OAuth token verification and Firestore service account for data access.

## Database and access pattern

- Use Cloud Firestore as the primary data store with collections for users, sessions, tasks, and audit logs.
- Session management: `sessions/{sessionId}` and `users/{userId}` collections with automatic TTL cleanup.
- Typical flow: client -> Fastify API -> server Firestore client / REST -> Firestore. The server enforces authorization and business rules rather than relying on Firestore security rules for client access.
- Administrative/bulk operations are implemented server-side using the same Firestore access method.

## Security

- Manage service account credentials securely (Cloud Run secrets, Workload Identity recommended).
- OAuth security: PKCE implementation prevents authorization code interception attacks.
- Session security: HttpOnly cookies, secure flags in production, SameSite=Lax for OAuth compatibility.
- CSRF protection: require X-CSRF-Token header for state-changing POST requests.
- Audit logging: track login/logout/error events with IP hashing for privacy.
- Enforce per-user data isolation on the server (queries must be scoped to the authenticated userId).

## Deployment strategy

- Build frontend (Vite) and place the build output into the backend's static directory. Serve both frontend and API from a single Fastify-based container image.
- Containerize the backend (with static assets included) and deploy to Cloud Run.
- CI/CD: GitHub Actions builds the frontend (`pnpm build`), copies static artifacts into the backend folder, runs TypeScript compilation (`tsc` or `pnpm --filter backend run build`), builds a multi-stage Docker image, pushes to Artifact Registry / GCR, and deploys to Cloud Run.

## CI/CD

- Frontend: `pnpm build` -> copy build artifacts into backend static directory
- Backend: `tsc -p packages/backend/tsconfig.json` (or `pnpm --filter backend run build`) -> build Docker image (multi-stage) -> push -> deploy to Cloud Run

(Use a multi-stage Dockerfile that copies frontend build output into the final runtime image.)

## Non-functional considerations

- Cost: aim for minimal cost but expect Firestore reads/writes and Cloud Run invocations to incur charges; model expected user counts and frequencies.
- Logging & monitoring: rely on Cloud Run logs and Firestore audit logs.
- Backups: schedule exports and consider soft-delete flags (e.g. `archived`) for recoverability.

## Notes for implementers

- The repository uses `pnpm` workspaces (root `pnpm-workspace.yaml` including `packages/*`).
- Frontend dependencies: `react`, `react-dom`, `vite`, `typescript`, `unocss`, `@unocss/preset-mini` for styling.
- Backend dependencies: `fastify`, `@fastify/static`, `@fastify/cookie`, `@fastify/cors`, `google-auth-library`, `@google-cloud/firestore`, `lru-cache`.
- Development tools: `tsx` for backend watch mode, `biome` for linting and formatting.
- Example `package.json` scripts: `dev: "tsx watch src/index.ts"`, `build: "tsc -p tsconfig.json"`, `check: "biome check src --write && tsc --noEmit"`.


*End of agent-facing technical stack summary.*
