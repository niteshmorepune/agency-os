Run the full quality check pipeline for this project:
1. `npm run lint` — fix all ESLint + TypeScript errors
2. `npm run test` — run all tests, report failures
3. Check that no .env values are hardcoded anywhere in src/
4. Verify all new API routes have Zod validation middleware
5. Verify all new DB queries include agencyId scoping
Report a summary: what passed, what failed, what needs fixing.
