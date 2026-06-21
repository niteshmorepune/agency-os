# Agency OS — Claude Code Memory

## Project
Full-stack digital marketing platform. Monorepo: client/ (React+Vite), server/ (Node+Express), shared/ (types).

## Stack
- Frontend: React 18, TypeScript, Vite, Tailwind CSS v3, Zustand, TanStack Query v5
- Backend: Node.js 20, Express, TypeScript, Prisma ORM, PostgreSQL
- AI: Anthropic SDK (`claude-sonnet-4-20250514`), all calls via server/src/services/ai/
- PDF: Puppeteer (server-side only)
- Auth: JWT in httpOnly cookies, refresh token rotation, Zod validation on all routes

## Key commands
- Install: `npm install` (root runs workspaces install for client + server)
- Dev: `npm run dev` (starts both client:5173 and server:3001 concurrently)
- Build: `npm run build` (tsc + vite build)
- Lint: `npm run lint` (eslint + tsc --noEmit)
- Test: `npm run test` (vitest for client, jest for server)
- DB migrate: `cd server && npx prisma migrate dev`
- DB seed: `cd server && npx prisma db seed`
- DB studio: `cd server && npx prisma studio`

## File conventions
- All server routes: server/src/routes/<resource>.routes.ts
- All controllers: server/src/controllers/<resource>.controller.ts
- All services: server/src/services/<resource>.service.ts
- All AI tools: server/src/services/ai/<toolId>.ts
- Shared types: shared/types.ts (imported by both client and server)
- React pages: client/src/pages/<PageName>.tsx
- React components: client/src/components/<Module>/<Component>.tsx

## Non-negotiable rules
1. NEVER put business logic in route files. Routes → Controllers → Services → Models only.
2. ALWAYS run `npm run lint` after every file change. Fix all errors before moving on.
3. ALWAYS run `npm run test` after completing each module. Never leave failing tests.
4. ALL API keys are stored AES-256 encrypted. Never log, expose, or hardcode them.
5. JWT tokens go in httpOnly cookies ONLY. Never localStorage, never response body.
6. Every DB query MUST include `agencyId: requestingUser.agencyId` filter. No exceptions.
7. ALL Claude API calls must go through server/src/services/ai/client.ts — never call Anthropic directly from routes or controllers.
8. Max tokens per AI tool are defined in server/src/services/ai/budgets.ts — always import and apply them.
9. Zod schema validation on EVERY POST and PUT route — no exceptions.
10. NEVER expose stack traces to clients in production responses.

## Architecture decisions already made
- httpOnly cookies for JWT (not localStorage) — do not change this
- Refresh tokens stored hashed (SHA-256) in RefreshToken table — do not store plaintext
- Role checks are ALWAYS server-side from JWT payload — never trust client-supplied role
- AI output is cached by SHA-256 of inputs in Redis/LRU — never skip cache check
- All file uploads renamed to UUID, EXIF stripped via sharp — never use original filename
- PostgreSQL user is `agencyos_user` with least-privilege grants — never use postgres superuser
- PM2 cluster mode in production — see ecosystem.config.js

## Context window management
- Run /compact when context hits 70% — use: `/compact focus on current module and open TODOs`
- Run /clear when starting a completely new module from scratch
- Use /model opus for architecture decisions and security review
- Use /model sonnet for implementation (default)
- Each module should be built in a clean context: finish one, /clear, start next

## Prisma models added
- `ClientActionItem` — per-client action items with status (PENDING/IN_PROGRESS/COMPLETED/CANCELLED), dueDate, createdById
- `ClientMessage` — in-app messaging between agency and client; senderId/senderRole/senderName stored at write time
- `OnboardingToken` — UUID token (unique per client, 7-day expiry) for public onboarding questionnaire
- `ClientGoal` — monthly goals per client (agencyId, clientId, title, targetValue, currentValue, unit, month YYYY-MM, isArchived)
- `User.teamOnboardingAt DateTime?` — null until team member completes first-login onboarding modal

## New API routes
- `POST /api/onboarding/:token` / `GET /api/onboarding/:token` — public, no auth, token-based onboarding form
- `GET|POST /api/clients/:id/action-items` — CRUD for action items; POST fires email to client
- `PUT /api/clients/action-items/:itemId` — status update (any authenticated role)
- `DELETE /api/clients/action-items/:itemId` — OWNER/AM only
- `GET|POST /api/clients/:id/messages` — thread; POST fires email notification
- `PUT /api/clients/:id/messages/read` — mark all messages read
- `POST /api/clients/:id/onboarding/send-link` — generates token, emails branded link (OWNER/AM only)
- `POST /api/ai/posting-times` — posting schedule grid + optional AI custom advice
- `POST /api/ai/engagement-analyze` — engagement rate calculator + AI recommendations
- `POST /api/optimize/:clientId/ai-rewrite` — platform optimizer AI rewrite with 3 variants per checkId
- `GET|POST /api/clients/:id/goals` — monthly goal CRUD (routes in goals.routes.ts, merged into client.routes.ts)
- `PUT /api/clients/:id/goals/:goalId` — update goal (OWNER/AM only)
- `DELETE /api/clients/:id/goals/:goalId` — archive goal (OWNER/AM only)
- `GET /api/client-portal/goals?month=YYYY-MM` — client's goals for current month (CLIENT auth)
- `GET /api/client-portal/content/download` — streams ZIP of captions.csv + image-urls.txt + README.txt (CLIENT auth)
- `POST /api/digest/email-clients` — sends per-client AI weekly digest to all active clients with contactEmail (OWNER only)
- `POST /api/auth/complete-onboarding` — marks teamOnboardingAt in DB (any auth)

## New AI tools
- `posting_time` — deterministic schedule grid from `postingTimes.ts`, optional Claude custom advice
- `engagement` — benchmark calculator from `engagementBenchmarks.ts`, Claude recs when rating is average/below/poor
- `platform_rewrite` — per-checkId prompts in `platformRewrite.ts`, returns 3 JSON variants
- `client_digest` — per-client weekly digest; returns `{"highlights":"...","nextSteps":"..."}` JSON

## Dark mode
- `tailwind.config.js`: `darkMode: 'class'`
- `client/src/hooks/useDarkMode.ts`: `useDarkMode()` (init), `toggleDarkMode()` (returns new state), `isDarkMode()` (read)
- Moon/Sun toggle button in Layout header (every page). Secondary toggle in Profile page.
- Preference stored in `localStorage` key `darkMode`. Falls back to `prefers-color-scheme`.

## Scheduler (server/src/lib/scheduler.ts)
- Every 5 min: auto-publish due SCHEDULED posts via publisher.service.ts
- Daily 03:30 UTC: pending approval digest + overdue action items + overdue invoice alerts
- 1st of month 02:30 UTC: auto-email monthly PDF reports to clients with `reportSchedule: 'MONTHLY'`
- Sunday 14:30 UTC: `runWeeklyClientDigests()` — loops all agencies, generates AI digest per client, emails to contactEmail

## Content ZIP (archiver package)
- Use `new ZipArchive({ zlib: { level: 6 } })` NOT `archiver('zip', ...)` — the default export is not callable in TypeScript
- Import: `import { ZipArchive } from 'archiver'`

## What to do when stuck
1. Check shared/types.ts for interfaces before creating new ones
2. Check server/src/services/ for existing service patterns before writing new ones
3. Run `npx prisma studio` to inspect DB state when debugging data issues
4. Check .env.example for all required environment variables
