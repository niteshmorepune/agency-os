# Frontend conventions
- Use TanStack Query for all server data — no useState for server state
- Use Zustand only for UI state (sidebar open, modal state, selected client)
- All API calls go through client/src/api/client.ts — never fetch() directly in components
- Tailwind only — no inline styles, no CSS modules, no styled-components
- All AI-generated HTML rendered via <SafeAIOutput> component (DOMPurify wrapper)
- All forms use react-hook-form + Zod resolver — no uncontrolled inputs
- Run `npx tsc --noEmit` after every component to catch type errors early
