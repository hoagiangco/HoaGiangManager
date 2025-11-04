Purpose
-------
This file helps AI coding agents become productive quickly in the HoaGiang Manager codebase. Focus on small, safe PRs that follow existing patterns (Next.js App Router + server route handlers, service layer in `lib/services`, raw SQL via `lib/db`).

Essential context (big picture)
--------------------------------
- Frontend: Next.js 14 (App Router). Pages and layouts live under `app/` (see `app/layout.tsx`, `(auth)/`, `(dashboard)/`).
- Backend/API: Route handlers are implemented as Next.js route handlers under `app/api/*` (e.g. `app/api/devices/route.ts`). These handlers use `NextRequest`/`NextResponse`.
- Business logic: Put shared logic in `lib/services/*` (example: `lib/services/deviceService.ts`).
- DB access: `lib/db/index.ts` exports `pool` and `query` which call PostgreSQL directly with raw SQL. Table/column names use double quotes and PascalCase (e.g. `"Device"`, `"DeviceCategory"`).
- Auth: JWT helper (`lib/auth/jwt.ts`) defines payload { userId, email, roles }. Route-level auth uses `lib/auth/middleware.ts` (functions `authenticate` and `requireAuth`).

Developer workflows & commands (explicit)
---------------------------------------
- Install deps: `npm install`
- Create .env from `.env.example` and set `DATABASE_URL`, `JWT_SECRET` (>=32 chars), `PORT`, `UPLOAD_DIR`.
- Create DB (if needed): `npm run db:create`
- Run migrations: `npm run db:migrate` (uses `node scripts/compile-migrations.js migrate`).
- Seed default data (roles + admin): `npm run db:seed`.
- Dev server: `npm run dev` (Next.js dev). App served at http://localhost:3000 by default.
- DB tests and helpers: `npm run db:test`, `npm run test:api`, `npm run test:api-auth` (scripts use `tsx`).
- Build & production run: `npm run build`, `npm run start`.

Project-specific patterns and conventions
---------------------------------------
- API handlers return JSON shaped like `{ status: boolean, data?: any, error?: string, details?: string }`.
- Error handling: log full error details with `console.error` and include `details` in responses only in development mode (see `app/api/*/route.ts`).
- Auth pattern: call `authenticate(request)` at top of a route to get `{ user, error }`. Use `requireAuth(['Admin'])` when you want an auto-response on failure.
- DB queries: use `pool.query(...)` or the exported `query` helper. Preserve the existing naming/casing and schema quoting to match migrations (e.g., `"ID"`, `"Name"`).
- Services: keep SQL and mapping logic in `lib/services/*`. Routes should remain thin and call service methods (see `lib/services/deviceService.ts` and `app/api/devices/route.ts`).
- Scripts: short Node/tsx CLI scripts live under `scripts/` (migrations/seed/test helpers) — prefer reusing them rather than adding ad-hoc DB commands.

Integration points & externals
------------------------------
- PostgreSQL connection via `DATABASE_URL` in `.env` (see `lib/db/index.ts`).
- JWT is central for auth. Token payload must include `userId` to map to `AspNetUsers` (see `lib/auth/middleware.ts`).
- File uploads use `public/uploads` and `multer` (look under `app/api/files/*`).
- Some dependencies (e.g. `express`) are present but primary API surface is Next.js route handlers — prefer using the existing route files.

How to implement common changes (examples)
-----------------------------------------
- Add new API route: create `app/api/<name>/route.ts` exporting `GET/POST/...` using `NextRequest`/`NextResponse`. Call a new method in `lib/services/<name>Service.ts` and use `pool.query` for DB.
- Add new DB column/table: add SQL in the migration system under `scripts/` and run `npm run db:migrate`; update service SQL to reference quoted names.
- Add role-protected route: use `const { user, error } = await authenticate(request); if (!user) return NextResponse.json(..., { status: 401 });` or `requireAuth(['Admin'])`.

Files to open first (quick tour)
--------------------------------
- `app/` — UI routes, layouts, and pages
- `app/api/*/route.ts` — server route handlers (auth + services examples)
- `lib/db/index.ts` — DB pool + query helper
- `lib/auth/jwt.ts`, `lib/auth/middleware.ts` — token shape and auth helpers
- `lib/services/*` — business logic and SQL mapping (e.g. `deviceService.ts`)
- `scripts/` — migration/seed/test helpers
- `package.json` — available npm scripts and dev commands

Do NOT change without review
---------------------------
- Do not change the database schema naming/casing without updating migrations and services. SQL names are quoted and case-sensitive.
- Do not leak secrets or print full JWT secrets in logs. Use `process.env.NODE_ENV === 'development'` to gate extra details.

If anything is missing or you need more examples, show the small patch or test you plan to add and I will expand these instructions with concrete file-level examples.
