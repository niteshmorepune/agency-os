# Agency OS

Premium full-stack digital marketing platform for agencies. Covers audit, platform optimization, AI content studio, analytics, client portal, and team management.

## Architecture

```
agencyos/
├── client/        React 18 + Vite + Tailwind CSS (port 5173)
├── server/        Node.js + Express + Prisma + PostgreSQL (port 3001)
├── shared/        TypeScript types shared between client and server
├── scripts/       Backup and maintenance scripts
├── nginx.conf     Production Nginx config
└── ecosystem.config.js  PM2 config
```

## Prerequisites

- Node.js 20+
- PostgreSQL 15+
- npm 10+

## Setup

### 1. Clone and install
```bash
git clone <repo>
cd agencyos
npm install
```

### 2. Environment variables
```bash
cp .env.example .env.development
```
Edit `.env.development` with your values. Required:
- `DATABASE_URL` — PostgreSQL connection string
- `JWT_SECRET` — min 32 chars
- `JWT_REFRESH_SECRET` — min 32 chars
- `ENCRYPTION_KEY` — 32 chars for API key encryption
- `ANTHROPIC_API_KEY` — from console.anthropic.com

### 3. Database setup
```bash
# Create dedicated DB user (recommended)
psql -U postgres -c "CREATE USER agencyos_user WITH PASSWORD 'your-password';"
psql -U postgres -c "CREATE DATABASE agencyos OWNER agencyos_user;"
psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE agencyos TO agencyos_user;"

# Run migrations
cd server
npx prisma migrate dev --name init

# Seed with demo data
npx prisma db seed
```

### 4. Start development
```bash
cd ..
npm run dev
```

Frontend: http://localhost:5173  
API: http://localhost:3001/api/health

### Demo accounts (after seeding)
| Email | Password | Role |
|-------|----------|------|
| owner@apex.agency | Owner1234! | Owner |
| manager@apex.agency | Manager1234! | Account Manager |
| creator@apex.agency | Creator1234! | Content Creator |
| analyst@apex.agency | Analyst1234! | SEO Analyst |

## Development commands

```bash
npm run dev          # Start both client + server
npm run build        # Build for production
npm run lint         # ESLint + TypeScript check
npm run test         # Run all tests
npm run audit        # npm security audit

# Database
cd server
npx prisma migrate dev     # Run new migrations
npx prisma db seed         # Re-seed data
npx prisma studio          # Visual DB browser
npx prisma generate        # Regenerate client after schema change
```

## Production deployment

### PM2
```bash
npm run build
pm2 start ecosystem.config.js --env production
pm2 startup        # Auto-start on reboot
pm2 save
```

### Nginx
```bash
cp nginx.conf /etc/nginx/sites-available/agencyos
# Edit server_name and SSL cert paths
ln -s /etc/nginx/sites-available/agencyos /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
```

### Database backup cron
```bash
chmod +x scripts/backup.sh
crontab -e
# Add: 0 2 * * * /path/to/agencyos/scripts/backup.sh >> /var/log/agencyos-backup.log 2>&1
```

### PostgreSQL least-privilege setup
```sql
CREATE USER agencyos_user WITH PASSWORD 'strong-random-password';
GRANT CONNECT ON DATABASE agencyos TO agencyos_user;
GRANT USAGE ON SCHEMA public TO agencyos_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO agencyos_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO agencyos_user;
```

## Security features

- JWT stored in httpOnly Secure SameSite=Strict cookies
- Refresh tokens rotated on each use, hashed in DB
- Login rate limited: 5 attempts / 15 minutes
- AI rate limited: 20 requests / minute per user
- All API keys AES-256 encrypted in DB
- Helmet.js security headers on all responses
- DOMPurify sanitization of all user input and AI output
- Tenant isolation: every query scoped to agencyId from JWT
- File uploads: MIME whitelist, UUID rename, EXIF strip via Sharp

## Build sessions (for continuing development)

This project is designed to be built across 10 sessions:
1. ✅ Scaffold + DB schema + auth system
2. Agency settings + client CRUD + team management
3. Audit module (7 asset modules, checks, scoring)
4. Platform optimizer (LinkedIn + Instagram + GBP)
5. Platform optimizer (remaining 7 platforms)
6. AI Studio (all 10 tools + caching + budget system)
7. Content Studio (composer + calendar + ideas engine)
8. Research tools (hashtags + keywords + personas + competitors)
9. Reporting (PDF generator + monthly report)
10. Client portal + admin dashboard + polish
