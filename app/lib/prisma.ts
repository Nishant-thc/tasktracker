import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

function initPrisma(): PrismaClient {
  if (process.env.VERCEL) {
    const tmpDbPath = '/tmp/dev.db';

    const possibleSources = [
      path.join(process.cwd(), 'prisma', 'dev.db'),
      path.join(process.cwd(), '.next', 'server', 'prisma', 'dev.db'),
      path.join(__dirname, '..', '..', 'prisma', 'dev.db'),
      path.join(__dirname, '..', '..', '..', 'prisma', 'dev.db'),
    ];

    const foundSource = possibleSources.find(p => fs.existsSync(p));

    if (foundSource) {
      try {
        // Always overwrite /tmp/dev.db with the latest database file from build
        fs.copyFileSync(foundSource, tmpDbPath);
        try {
          fs.chmodSync(tmpDbPath, 0o666);
        } catch (e) {}
      } catch (err) {
        console.error('[Prisma] Error copying SQLite db to /tmp:', err);
      }
    }

    const targetUrl = fs.existsSync(tmpDbPath)
      ? `file:${tmpDbPath}`
      : `file:${path.join(process.cwd(), 'prisma', 'dev.db')}`;

    return new PrismaClient({
      datasources: {
        db: {
          url: targetUrl,
        },
      },
    });
  }

  return new PrismaClient();
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma ?? initPrisma();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
