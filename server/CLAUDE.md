# Backend conventions
- Controller functions must be async and wrapped in try/catch via asyncHandler
- Always pass `agencyId: req.user!.agencyId` as first filter in every Prisma query
- Service functions must not import from Express (req/res) — keep them pure
- All errors thrown as: throw Object.assign(new Error(message), { statusCode: 400 })
- Use `logger.info/warn/error` from src/lib/logger.ts — never console.log
- Run `npx prisma format` after editing schema.prisma
- All user input sanitised with isomorphic-dompurify before DB storage
- AI calls must go through src/services/ai/client.ts only
