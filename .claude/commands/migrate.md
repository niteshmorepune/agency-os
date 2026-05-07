Run a safe database migration:
1. Show the current Prisma schema diff with `npx prisma migrate diff`
2. Review the migration SQL before applying — flag any destructive changes
3. If safe: run `npx prisma migrate dev --name $ARGUMENTS`
4. Run `npx prisma generate` to update the client
5. Run the seed script if this is a new table: `npx prisma db seed`
6. Verify the migration applied correctly with `npx prisma studio`
