import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { headers } from 'next/headers';

export async function GET(req: Request) {
  const reqHeaders = await headers();
  // Vercel Cron sends a Bearer token matching CRON_SECRET
  const authHeader = reqHeaders.get('authorization');
  
  // For local testing, we might want to bypass or mock this
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const todayStr = new Date().toISOString().split('T')[0];
    
    // 1. Process Queue Messages
    const pendingMessages = await prisma.queueMessage.findMany({
      where: { status: 'queued' },
      take: 10,
    });

    for (const msg of pendingMessages) {
      await prisma.queueMessage.update({
        where: { id: msg.id },
        data: { status: 'processing', lockedAt: new Date(), attempts: msg.attempts + 1 },
      });
      
      try {
        // Here we would dispatch based on msg.queueName
        // For example: if (msg.queueName === 'send_email') await sendEmail(JSON.parse(msg.payload));
        
        await prisma.queueMessage.update({
          where: { id: msg.id },
          data: { status: 'completed' },
        });
      } catch (err: any) {
        console.error('Queue processing error:', err);
        await prisma.queueMessage.update({
          where: { id: msg.id },
          data: { status: msg.attempts >= 3 ? 'failed' : 'queued', lockedAt: null },
        });
      }
    }

    // 2. Scheduled Jobs (e.g., Daily Digests)
    // Check if daily digest has run for today
    const jobName = 'daily_client_digest';
    const hasRun = await prisma.jobRun.findFirst({
      where: { jobType: jobName, localDate: todayStr },
    });

    if (!hasRun) {
      // It hasn't run today, so let's run it.
      // E.g., Queue up digests for all projects
      const projects = await prisma.project.findMany({ where: { status: 'active' } });
      
      for (const p of projects) {
        await prisma.queueMessage.create({
          data: {
            queueName: 'daily_digest',
            payload: JSON.stringify({ projectId: p.id, date: todayStr }),
          }
        });
      }

      await prisma.jobRun.create({
        data: {
          jobType: jobName,
          localDate: todayStr,
          status: 'success',
        }
      });
    }

    return NextResponse.json({ 
      success: true, 
      processedQueueCount: pendingMessages.length,
      ranDailyJobs: !hasRun
    });
  } catch (error: any) {
    console.error('Cron dispatch error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
