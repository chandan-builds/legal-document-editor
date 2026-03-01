/**
 * Warm up the Neon serverless database before Prisma migrations.
 * Neon suspends compute after 5 minutes of inactivity and takes
 * ~3-5 seconds to wake up. Prisma migrate deploy has a 10s advisory
 * lock timeout that fails during cold starts. This script sends a
 * simple query to wake the compute before migrations run.
 */
const { PrismaClient } = require('@prisma/client');

async function warmup() {
    const prisma = new PrismaClient();
    try {
        await prisma.$queryRawUnsafe('SELECT 1');
        console.log('[WARMUP] Database is awake and ready');
    } catch (err) {
        console.warn('[WARMUP] Could not reach database, proceeding anyway:', err.message);
    } finally {
        await prisma.$disconnect();
    }
}

warmup();
