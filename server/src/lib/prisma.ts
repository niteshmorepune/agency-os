import { PrismaClient } from '@prisma/client';
import { logger } from './logger';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient({
  log: [
    { emit: 'event', level: 'query' },
    { emit: 'event', level: 'error' },
  ],
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(prisma as any).$on('error', (e: { message: string; target: string }) => {
  logger.error({ msg: 'Prisma error', message: e.message, target: e.target });
});

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
