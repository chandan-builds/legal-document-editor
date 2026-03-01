/**
 * Warm up the Neon serverless database before Prisma migrations.
 *
 * Neon suspends compute after 5 minutes of inactivity and takes
 * ~3-5 seconds to wake up. Prisma migrate deploy has a 10s advisory
 * lock timeout that fails during cold starts.
 *
 * This script retries up to 10 times (30s total) to ensure the
 * database compute is fully awake before migrations run.
 */
const { PrismaClient } = require('@prisma/client');

async function warmup() {
    const MAX_RETRIES = 10;
    const RETRY_DELAY_MS = 3000;

    const prisma = new PrismaClient({
        datasources: {
            db: { url: process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL },
        },
    });

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            await prisma.$queryRawUnsafe('SELECT 1');
            console.log(`[WARMUP] Database is awake (attempt ${attempt}/${MAX_RETRIES})`);
            await prisma.$disconnect();
            process.exit(0);
        } catch (err) {
            console.warn(`[WARMUP] Attempt ${attempt}/${MAX_RETRIES} failed: ${err.message}`);
            if (attempt < MAX_RETRIES) {
                await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
            }
        }
    }

    console.error('[WARMUP] Could not wake database after all retries. Proceeding anyway...');
    await prisma.$disconnect();
    process.exit(0); // Exit 0 so migrations still attempt
}

warmup();
