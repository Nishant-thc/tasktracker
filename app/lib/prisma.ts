import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

// On Vercel serverless environment, copy bundled dev.db to /tmp if using SQLite
if (process.env.VERCEL) {
  const tmpDbPath = '/tmp/dev.db';
  const src = path.join(process.cwd(), 'prisma', 'dev.db');

  if (fs.existsSync(src)) {
    try {
      if (!fs.existsSync(tmpDbPath)) {
        fs.copyFileSync(src, tmpDbPath);
      }
      process.env.DATABASE_URL = `file:${tmpDbPath}`;
    } catch (err) {
      console.error('[Prisma] Error copying SQLite db to /tmp:', err);
    }
  }
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
