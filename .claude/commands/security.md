Perform a security review of recent changes:
1. Scan for hardcoded secrets, API keys, or passwords in any file
2. Check all new API routes have auth middleware and role checks
3. Verify JWT is stored in httpOnly cookies — not localStorage or response body
4. Check all file upload handlers validate MIME type and apply size limits
5. Verify no raw SQL queries that could enable injection
6. Check all user input is sanitised before DB storage
7. Confirm no stack traces are returned in production error responses
8. List any issues found with severity: CRITICAL / HIGH / MEDIUM / LOW
