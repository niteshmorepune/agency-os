Run the full pre-deployment checklist:
1. `npm run lint` — must pass with zero errors
2. `npm run test` — must pass with zero failures
3. `npm run build` — must compile without errors
4. Check .env.example is up to date with all new variables
5. Verify CLAUDE.md is up to date with any new commands or conventions
6. Check nginx.conf reflects any new routes
7. Remind to: run `npm audit`, update PM2 ecosystem.config.js if needed, run DB migration on prod
Report: ready to ship / not ready (with blockers listed)
