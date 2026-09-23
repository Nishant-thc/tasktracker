'use server';

import { prisma } from '../lib/prisma';
import { connectGoogleOAuth, disconnectGoogleOAuth } from '../lib/api-stubs';
import { revalidatePath } from 'next/cache';

async function writeMessageLog(projectId: string, accountId: string, body: string, fromName = 'System') {
  try {
    await prisma.messageLog.create({
      data: {
        projectId,
        accountId,
        channel: 'system',
        direction: 'system',
        fromName,
        toName: 'All',
        body,
      },
    });
  } catch (e) {
    console.error('Failed to write message log:', e);
  }
}

export async function executeTaskAction(taskId: string, action: string, note?: string) {
  const task = await prisma.dependency.findUnique({
    where: { id: taskId },
    include: { project: { select: { id: true, accountId: true, clientName: true } } }
  });
  if (!task) throw new Error('Task not found');

  const now = new Date();
  const shortId = taskId.slice(0, 5).toUpperCase();

  switch (action) {
    case 'start':
      if (task.status !== 'pending') throw new Error('Invalid state transition');
      await prisma.dependency.update({ where: { id: taskId }, data: { status: 'in_progress', startedAt: now } });
      await writeMessageLog(task.project.id, task.project.accountId, `Task [${shortId}] "${task.title}" moved to In Progress.`);
      break;
    case 'implement':
      if (task.status !== 'in_progress') throw new Error('Invalid state transition');
      await prisma.dependency.update({ where: { id: taskId }, data: { status: 'qc', qcAt: now } });
      await writeMessageLog(task.project.id, task.project.accountId, `Task [${shortId}] "${task.title}" submitted for QC.`);
      break;
    case 'approve':
      if (task.status !== 'qc') throw new Error('Invalid state transition');
      await prisma.dependency.update({ where: { id: taskId }, data: { status: 'closed', closedAt: now } });
      await writeMessageLog(task.project.id, task.project.accountId, `Task [${shortId}] "${task.title}" approved and closed.`);
      break;
    case 'sendback':
      if (task.status !== 'qc') throw new Error('Invalid state transition');
      if (!note) throw new Error('Send back note is required');
      await prisma.dependency.update({
        where: { id: taskId },
        data: { status: 'in_progress', reworkCount: { increment: 1 }, sentBackNote: note, qcAt: null },
      });
      await writeMessageLog(task.project.id, task.project.accountId, `Task [${shortId}] "${task.title}" sent back for rework. Note: ${note}`);
      break;
    case 'reopen':
      if (task.status !== 'closed') throw new Error('Invalid state transition');
      await prisma.dependency.update({
        where: { id: taskId },
        data: { status: 'in_progress', closedAt: null, qcAt: null, reworkCount: { increment: 1 }, sentBackNote: 'Reopened by agency' },
      });
      await writeMessageLog(task.project.id, task.project.accountId, `Task [${shortId}] "${task.title}" was reopened.`);
      break;
    case 'remove':
      await prisma.dependency.delete({ where: { id: taskId } });
      await writeMessageLog(task.project.id, task.project.accountId, `Task [${shortId}] "${task.title}" was deleted.`);
      break;
    default:
      throw new Error('Unknown action');
  }

  revalidatePath('/', 'layout');
}

export async function createDependency(data: {
  projectId: string;
  title: string;
  category?: string | null;
  priority: string;
  impactScore: number;
  estimatedUpliftPct: number;
  description: string;
  impactIfDelayed: string;
  links: string[];
  dueDate?: string | null;
}) {
  const project = await prisma.project.findUnique({ where: { id: data.projectId }, select: { accountId: true } });
  const dep = await prisma.dependency.create({
    data: {
      projectId: data.projectId,
      title: data.title,
      category: data.category || null,
      priority: data.priority,
      impactScore: data.impactScore,
      estimatedUpliftPct: data.estimatedUpliftPct,
      description: data.description || null,
      impactIfDelayed: data.impactIfDelayed || null,
      links: JSON.stringify(data.links),
      status: 'pending',
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
    },
  });

  if (project) {
    await writeMessageLog(data.projectId, project.accountId, `New task created: "${data.title}" (${data.priority} priority, category: ${data.category || 'General'}).`);
  }

  revalidatePath('/', 'layout');
  return dep;
}

export async function updateDependency(data: {
  taskId: string;
  title: string;
  category?: string | null;
  priority: string;
  impactScore: number;
  estimatedUpliftPct: number;
  description: string;
  impactIfDelayed: string;
  links: string[];
  dueDate?: string | null;
}) {
  const task = await prisma.dependency.findUnique({
    where: { id: data.taskId },
    select: { id: true, projectId: true, project: { select: { accountId: true } } }
  });
  if (!task) throw new Error('Task not found');

  const updated = await prisma.dependency.update({
    where: { id: data.taskId },
    data: {
      title: data.title,
      category: data.category || null,
      priority: data.priority,
      impactScore: data.impactScore,
      estimatedUpliftPct: data.estimatedUpliftPct,
      description: data.description || null,
      impactIfDelayed: data.impactIfDelayed || null,
      links: JSON.stringify(data.links),
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
    },
  });

  await writeMessageLog(task.projectId, task.project.accountId, `Task "${data.title}" was updated.`);
  revalidatePath('/', 'layout');
  return updated;
}

export async function createClientContact(data: {
  projectId: string;
  name: string;
  email: string;
  role: string;
}) {
  await prisma.clientContact.create({
    data: {
      projectId: data.projectId,
      name: data.name,
      email: data.email,
      role: data.role,
    },
  });
  revalidatePath('/', 'layout');
}

export async function updateProjectSettings(
  projectId: string,
  configJson: string,
  primaryColor: string | null,
  clientLogoUrl: string | null,
  agencyLogoUrl: string | null
) {
  const previous = await prisma.project.findUnique({
    where: { id: projectId },
    select: { integrationsConfig: true, accountId: true }
  });

  const updated = await prisma.project.update({
    where: { id: projectId },
    data: {
      integrationsConfig: configJson,
      primaryColor: primaryColor,
      clientLogoUrl: clientLogoUrl
    },
  });

  if (agencyLogoUrl !== undefined && previous) {
    await prisma.account.update({
      where: { id: previous.accountId },
      data: { agencyLogoUrl }
    });
  }

  try {
    const prevCfg = previous?.integrationsConfig ? JSON.parse(previous.integrationsConfig) : null;
    const nextCfg = JSON.parse(configJson);
    if (!prevCfg?.googleConnected && nextCfg.googleConnected) {
      await connectGoogleOAuth(projectId);
    } else if (prevCfg?.googleConnected && !nextCfg.googleConnected) {
      await disconnectGoogleOAuth(projectId);
    }
  } catch (e) {
    console.error('Failed to parse config json for api stubs', e);
  }

  revalidatePath('/', 'layout');
  return updated;
}

export async function updateCustomMetrics(projectId: string, customMetricsJson: string) {
  const updated = await prisma.project.update({
    where: { id: projectId },
    data: { customMetrics: customMetricsJson }
  });
  revalidatePath('/', 'layout');
  return updated;
}

export async function sendInsightNotification(projectId: string, metricTitle: string, message: string) {
  const project = await prisma.project.findUnique({ where: { id: projectId }, select: { accountId: true } });
  
  try {
    const { sendEmailAlert, sendSlackWebhook } = await import('../lib/api-stubs');
    await sendEmailAlert('client@example.com', `Insight: ${metricTitle}`, message);
    await sendSlackWebhook('#client-updates', `Insight on *${metricTitle}*:\n${message}`);
  } catch (e) {
    console.error('Failed to send insight', e);
  }

  if (project) {
    await prisma.messageLog.create({
      data: {
        projectId,
        accountId: project.accountId,
        channel: 'email',
        direction: 'outbound',
        fromName: 'Agency',
        toName: 'Client',
        subject: `Insight: ${metricTitle}`,
        body: message,
      }
    });
  }

  revalidatePath('/', 'layout');
  return { success: true };
}

export async function createProject(data: {
  accountId: string;
  clientName: string;
  name: string;
  type: string;
  category?: string;
  status?: string;
  accountManagerId?: string | null;
}) {
  if (!data.accountId || !data.clientName || !data.name) {
    throw new Error('Client name and project name are required.');
  }

  const token = crypto.randomUUID();

  // Safely auto-generate next unique project number
  const maxProject = await prisma.project.findFirst({
    orderBy: { projectNumber: 'desc' },
    select: { projectNumber: true },
  });

  const nextNumber = maxProject ? maxProject.projectNumber + 1 : 1000;

  const project = await prisma.project.create({
    data: {
      accountId: data.accountId,
      clientName: data.clientName.trim(),
      name: data.name.trim(),
      type: data.type || 'Retainer',
      category: data.category || 'SEO',
      status: data.status || 'active',
      accountManagerId: data.accountManagerId || null,
      projectToken: token,
      projectNumber: nextNumber,
      integrationsConfig: JSON.stringify({ importantLinks: [] }),
    },
  });

  await writeMessageLog(project.id, data.accountId, `Project "${data.name}" for ${data.clientName} created.`);

  revalidatePath('/', 'layout');
  return project;
}

export async function updateProjectCategory(projectId: string, category: string, status: string) {
  await prisma.project.update({
    where: { id: projectId },
    data: { category, status }
  });
  revalidatePath('/', 'layout');
}
